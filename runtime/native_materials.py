"""Owned Principled graphs, bounded UV diagnostics, genuine Cycles CPU baking."""
from __future__ import annotations
import array, hashlib, json, math, os, re, secrets, struct, time
import bpy
from native_selection import NativeError, integer, keys, mapping, number, require, vector
from native_surface import validate_surface, build_surface
from native_detail import validate_detail, ensure_detail_uv as _ensure_detail_uv, DETAIL_UV

CHANNELS = ('baseColor','roughness','metalness','normal','ao','emissive','clearcoat','clearcoatRoughness')
SCALAR_CHANNELS = {'roughness','metalness','ao','clearcoat','clearcoatRoughness'}
LEGACY_TEXTURE_TYPES = {'checker','carbon','noise','pixels','flatnormal'}
MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS = 32*1024*1024, 16_777_216
MAX_LOADED_PIXELS, MAX_LOADED_IMAGES, MAX_BAKE_PIXELS = 67_108_864, 64, 16_777_216
MAX_UV_TRIANGLES, MAX_UV_PAIRS = 4096, 32768
SOCKETS = {'baseColor':'Base Color','roughness':'Roughness','metalness':'Metallic','normal':'Normal','emissive':'Emission Color','clearcoat':'Coat Weight','clearcoatRoughness':'Coat Roughness'}
CONSTANT_FIELDS = set('color metalness roughness clearcoat clearcoatRoughness transmission ior opacity normalScale emissive emissiveIntensity doubleSided transparent thickness attenuationColor attenuationDistance type textures procedural surface properties detail detailTextures'.split())

def canonical(value):
    return json.dumps(value,sort_keys=True,ensure_ascii=False,allow_nan=False,separators=(',',':'))

def digest(value):
    return hashlib.sha256(canonical(value).encode('utf-8')).hexdigest()

def file_digest(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''):
            value.update(block)
    return value.hexdigest()

def rgba(value,field='material.color'):
    """Hex RGB is sRGB; numeric arrays/objects are scene-linear, like Three.Color."""
    is_hex = isinstance(value,str)
    if is_hex:
        require(re.fullmatch(r'#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?',value),field+' requires hex RGB/RGBA')
        value = [int(value[i:i+2],16)/255 for i in range(1,len(value),2)]
    elif isinstance(value,dict):
        value = [value.get(c,1 if c=='a' else 0) for c in 'rgba']
    require(isinstance(value,list) and len(value) in {3,4},field+' requires RGB/RGBA')
    value = [number(c,field,0,1) for c in value]
    if len(value)==3:
        value.append(1.0)
    if is_hex:
        value[:3] = [c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4 for c in value[:3]]
    return value

def validate_material(spec):
    mapping(spec,'material')
    # Historical extra metadata stays canonical JSON; new graph fields are strict.
    color = rgba(spec.get('color',[.7,.7,.7,1]))
    constants = {'Base Color':color,'Roughness':number(spec.get('roughness',.5),'material.roughness',0,1),
        'Metallic':number(spec.get('metalness',0),'material.metalness',0,1),
        'Coat Roughness':number(spec.get('clearcoatRoughness',0),'material.clearcoatRoughness',0,1),
        'Transmission Weight':number(spec.get('transmission',0),'material.transmission',0,1),
        'IOR':number(spec.get('ior',1.5),'material.ior',1,4),
        'Alpha':number(spec.get('opacity',color[3]),'material.opacity',0,1),
        'Emission Color':rgba(spec.get('emissive','#000000'),'material.emissive'),
        'Emission Strength':number(spec.get('emissiveIntensity',1 if 'emissive' in spec else 0),'material.emissiveIntensity',0,1000)}
    coat = spec.get('clearcoat',0)
    constants['Coat Weight'] = float(coat) if isinstance(coat,bool) else number(coat,'material.clearcoat',0,1)
    normal_scale = spec.get('normalScale',[1,1])
    if isinstance(normal_scale,(int,float)) and not isinstance(normal_scale,bool):
        normal_scale = [normal_scale,normal_scale]
    normal_scale = vector(normal_scale,'material.normalScale',2)
    require(all(abs(c)<=100 for c in normal_scale),'normalScale exceeds 100')
    textures = spec.get('textures',{})
    keys(textures,CHANNELS,'material.textures')
    for channel,entry in textures.items():
        mapping(entry,'texture')
        if entry.get('type') in LEGACY_TEXTURE_TYPES:
            # Existing Client DataTexture recipes remain untouched metadata.
            # They never enter the owned-image file loader or native node graph.
            continue
        keys(entry,{'type','file','colorSpace','channel','normalY','scale','texCoord'},'texture')
        require(entry.get('type')=='image','Texture type must be image','UNSUPPORTED_TEXTURE')
        integer(entry.get('texCoord',0),'texture.texCoord',0,1)
        require(isinstance(entry.get('file'),str) and re.fullmatch(r'image-[a-f0-9]{64}\.png',entry['file']),
            'Texture file must be an owned image-<sha256>.png basename','UNSAFE_PATH')
        require(entry.get('colorSpace') in {'srgb','linear'},'Texture colorSpace must be srgb or linear')
        require(entry.get('channel','r') in {'r','g','b'},'Texture channel must be r/g/b')
        require('channel' not in entry or channel in SCALAR_CHANNELS,'channel applies only to scalar textures')
        require(entry.get('normalY','up') in {'up','down'},'normalY must be up or down')
        require('normalY' not in entry or channel=='normal','normalY applies only to normal textures')
        scale = vector(entry.get('scale',[1,1]),'texture.scale',2)
        require(all(0<abs(s)<=10000 for s in scale),'Texture scale requires nonzero values within +/-10000')
        require(channel not in {'normal',*SCALAR_CHANNELS} or entry['colorSpace']=='linear','Normal and scalar textures require linear colorSpace')
    surface = spec.get('surface')
    if 'surface' in spec:
        require('procedural' not in spec,'material.surface and material.procedural are exclusive',field='material.surface')
        validate_surface(surface)
    if 'properties' in spec:
        require(isinstance(spec['properties'],dict),'material.properties must be an author-annotation object',field='material.properties')
        try:
            annotation = canonical(spec['properties'])
        except (TypeError,ValueError):
            raise NativeError('INVALID_ARGUMENT','material.properties requires finite JSON',{'field':'material.properties'})
        require(len(annotation.encode('utf-8'))<=32768,'material.properties exceeds 32KiB',field='material.properties')
    procedural = spec.get('procedural')
    if procedural is not None:
        keys(procedural,{'type','scale','detail','roughnessVariation','colorA','colorB','bumpDistance','seed'},'material.procedural')
        require(procedural.get('type') in {'noise','stripes','checker'},'Procedural type must be noise, stripes or checker','UNSUPPORTED_PROCEDURAL')
        number(procedural.get('scale',5),'procedural.scale',1e-6,10000)
        number(procedural.get('detail',2),'procedural.detail',0,15)
        number(procedural.get('roughnessVariation',0),'procedural.roughnessVariation',0,1)
        number(procedural.get('bumpDistance',0),'procedural.bumpDistance',0,1)
        integer(procedural.get('seed',0),'procedural.seed',0,2_147_483_647)
        rgba(procedural.get('colorA',spec.get('color','#555555')),'procedural.colorA')
        rgba(procedural.get('colorB','#dddddd'),'procedural.colorB')
    return constants,normal_scale,textures,procedural

def node_info(node):
    result = {'name':node.name,'label':node.label,'type':node.bl_idname}
    if hasattr(node,'uv_map'):
        result['uvMap']=node.uv_map
    if not node.name.startswith('Surface') and not node.name.startswith('DetailMapping_'):
        return result
    for key in ('operation','rotation_type','invert','noise_dimensions','voronoi_dimensions','space','interpolation_type','clamp','use_clamp','normalize','feature','distance'):
        if hasattr(node,key):
            value = getattr(node,key)
            if isinstance(value,(str,bool,int,float)):
                result[key] = value
    if 'modeler_surface_label' in node:
        result['surfaceLabel'] = node['modeler_surface_label']
    defaults = []
    for index,socket in enumerate(node.inputs):
        if socket.is_linked or not hasattr(socket,'default_value'):
            continue
        value = socket.default_value
        if isinstance(value,(bool,int,float)):
            defaults.append({'index':index,'socket':socket.name,'value':value})
        elif hasattr(value,'__len__') and len(value)<=4:
            defaults.append({'index':index,'socket':socket.name,'value':list(value)})
    result['defaults'] = defaults
    if hasattr(node,'image') and node.image is not None:
        result['image'] = node.image.get('modeler_owned_file')
        result['imageColorSpace'] = node.image.colorspace_settings.name
    return result


def material_spec(material):
    if material is None:
        return None
    if 'modeler_material' in material:
        return json.loads(material['modeler_material'])
    return {'color':list(material.diffuse_color),'metalness':material.metallic,'roughness':material.roughness}

def _buffer_hash(hasher,collection,prop,size,kind='f'):
    values = array.array(kind,[0])*(len(collection)*size)
    if values:
        collection.foreach_get(prop,values)
    hasher.update(struct.pack('<Q',len(values)))
    if __import__('sys').byteorder!='little':
        values.byteswap()
    hasher.update(values.tobytes())

def mesh_hashes(record):
    """Hash actual coordinates/connectivity, independently of IDs and material source keys."""
    mesh = record['object'].data
    geometry = hashlib.sha256(b'modeler-actual-geometry-v1\0')
    for collection,prop,size,kind in ((mesh.vertices,'co',3,'f'),(mesh.edges,'vertices',2,'i'),
        (mesh.loops,'vertex_index',1,'i'),(mesh.polygons,'loop_start',1,'i'),(mesh.polygons,'loop_total',1,'i')):
        _buffer_hash(geometry,collection,prop,size,kind)
    uv = hashlib.sha256(b'modeler-actual-uv-v1\0')
    uv.update(canonical({'active':mesh.uv_layers.active.name if mesh.uv_layers.active else None,'layers':[l.name for l in mesh.uv_layers]}).encode('utf-8'))
    for layer in mesh.uv_layers:
        _buffer_hash(uv,layer.data,'uv',2)
    material = hashlib.sha256(b'modeler-actual-material-v1\0')
    material.update(canonical([material_spec(mat) for mat in mesh.materials]).encode('utf-8'))
    _buffer_hash(material,mesh.polygons,'material_index',1,'i')
    geometry_hash,uv_hash,material_hash = geometry.hexdigest(),uv.hexdigest(),material.hexdigest()
    shading = hashlib.sha256(b'modeler-actual-shading-v1\0')
    _buffer_hash(shading,mesh.corner_normals,'vector',3)
    appearance = digest({'geometry':geometry_hash,'uv':uv_hash,'materials':material_hash,'normals':shading.hexdigest(),
        'world':[c for row in record['object'].matrix_world for c in row]})
    return {'geometryHash':geometry_hash,'uvHash':uv_hash,'materialHash':material_hash,'appearanceHash':appearance}

def _cross(a,b,c):
    return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])

def _triangle_overlap(a,b):
    """Positive-area convex clipping; shared edges and points do not count."""
    polygon,sign = list(a),1 if _cross(*b)>=0 else -1
    for start,end in zip(b,(*b[1:],b[0])):
        old,polygon = polygon,[]
        if not old:
            return False
        previous = old[-1]
        prev_d = sign*_cross(start,end,previous)
        for point in old:
            distance = sign*_cross(start,end,point)
            if (distance>=0)!=(prev_d>=0):
                ratio = prev_d/(prev_d-distance)
                polygon.append((previous[0]+ratio*(point[0]-previous[0]),previous[1]+ratio*(point[1]-previous[1])))
            if distance>=0:
                polygon.append(point)
            previous,prev_d = point,distance
    return len(polygon)>=3 and abs(sum(p[0]*q[1]-q[0]*p[1] for p,q in zip(polygon,polygon[1:]+polygon[:1])))>2e-12

def uv_info(record):
    mesh,obj = record['object'].data,record['object']
    mesh.calc_loop_triangles()
    warnings,layers = [],[]
    for layer in mesh.uv_layers:
        coords = [tuple(loop.uv) for loop in layer.data]
        require(all(math.isfinite(c) for pair in coords for c in pair),'UV coordinates are non-finite','INVALID_UV')
        face_areas = [0.0]*len(mesh.polygons)
        triangles,uv_area,world_area,zero_triangles,nonzero_triangles = [],0.0,0.0,0,0
        for triangle in mesh.loop_triangles:
            points = tuple(coords[i] for i in triangle.loops)
            area = abs(_cross(*points))*.5
            face_areas[triangle.polygon_index] += area
            uv_area += area
            a,b,c = (obj.matrix_world@mesh.vertices[i].co for i in triangle.vertices)
            world_area += (b-a).cross(c-a).length*.5
            if area<=1e-12:
                zero_triangles += 1
            else:
                nonzero_triangles += 1
                if len(triangles)<MAX_UV_TRIANGLES:
                    triangles.append((min(p[0] for p in points),max(p[0] for p in points),min(p[1] for p in points),max(p[1] for p in points),points))
        triangles.sort(key=lambda row:row[0])
        pairs,overlaps,visits = 0,0,0
        complete = nonzero_triangles<=MAX_UV_TRIANGLES
        reason,stopped = None if complete else 'triangle-budget',False
        for i,first in enumerate(triangles):
            if stopped:
                break
            for j in range(i+1,len(triangles)):
                second = triangles[j]
                visits += 1
                if visits>MAX_UV_PAIRS:
                    complete,reason,stopped = False,'pair-budget',True
                    break
                if second[0]>=first[1]-1e-12:
                    break
                if second[2]>=first[3]-1e-12 or first[2]>=second[3]-1e-12:
                    continue
                pairs += 1
                overlaps += int(_triangle_overlap(first[4],second[4]))
        overlap = {'count':overlaps,'checkedPairs':pairs,'complete':complete}
        if reason:
            overlap['reason'] = reason
        bounds = {'min':[min(p[i] for p in coords) for i in range(2)],'max':[max(p[i] for p in coords) for i in range(2)]} if coords else None
        nonzero_faces = sum(a>1e-12 for a in face_areas)
        layers.append({'name':layer.name,'active':layer==mesh.uv_layers.active,'loops':len(coords),'faceCount':len(mesh.polygons),
            'nonzeroFaces':nonzero_faces,'zeroAreaFaces':len(mesh.polygons)-nonzero_faces,'nonzeroTriangles':nonzero_triangles,
            'zeroAreaTriangles':zero_triangles,'uvArea':uv_area,'worldArea':world_area,'bounds':bounds,
            'density':math.sqrt(uv_area/world_area) if world_area>1e-20 else None,'densityUnits':'UV-units-per-world-metre','overlap':overlap})
        if overlaps:
            warnings.append({'code':'UV_OVERLAP','uvName':layer.name,'count':overlaps,'message':'Positive-area UV triangle overlaps; intentional tiled UVs remain allowed.'})
        if not complete:
            warnings.append({'code':'UV_OVERLAP_UNKNOWN','uvName':layer.name,'message':'Bounded checks are incomplete; count is a lower bound.'})
        if nonzero_faces!=len(mesh.polygons):
            warnings.append({'code':'UV_ZERO_AREA_FACES','uvName':layer.name,'count':len(mesh.polygons)-nonzero_faces})
    if not layers:
        warnings.append({'code':'NO_UV_LAYER','message':'A nonzero-area UV layer is required for baking.'})
    return {'active':mesh.uv_layers.active.name if mesh.uv_layers.active else None,'uvsets':layers,'warnings':warnings}

class MaterialSystem:
    def __init__(self,root,safe_path):
        self.root,self.safe_path = root,safe_path

    def image(self,entry,load=True):
        path = self.safe_path(self.root,entry['file'])
        require(path.is_file(),'Owned texture PNG is missing','IMAGE_NOT_FOUND',file=entry['file'])
        require(0<path.stat().st_size<=MAX_IMAGE_BYTES,'Owned texture exceeds 32MiB','IMAGE_BUDGET')
        with path.open('rb') as stream:
            header = stream.read(33)
        require(len(header)==33 and header[:8]==b'\x89PNG\r\n\x1a\n' and header[12:16]==b'IHDR','Owned texture must be a PNG','INVALID_IMAGE')
        width,height = struct.unpack('>II',header[16:24])
        require(width>0 and height>0 and width*height<=MAX_IMAGE_PIXELS,'Owned PNG exceeds 16M pixels','IMAGE_BUDGET')
        require(file_digest(path)==entry['file'][6:-4],'Owned PNG hash does not match its name','IMAGE_HASH_MISMATCH')
        if not load:
            return None
        image_key = entry['file']+':'+entry['colorSpace']
        for image in bpy.data.images:
            if image.get('modeler_image_key')==image_key:
                return image
        owned = [image for image in bpy.data.images if image.get('modeler_image_key')]
        require(len(owned)<MAX_LOADED_IMAGES and sum(i.size[0]*i.size[1] for i in owned)+width*height<=MAX_LOADED_PIXELS,
            'Worker image cache exceeds count/pixel budget','IMAGE_BUDGET')
        image = None
        try:
            image = bpy.data.images.load(str(path),check_existing=False)
            require(tuple(image.size)==(width,height) and image.has_data,'Blender could not decode PNG','INVALID_IMAGE')
            image.colorspace_settings.name = 'sRGB' if entry['colorSpace']=='srgb' else 'Non-Color'
            image['modeler_image_key'],image['modeler_owned_file'] = image_key,entry['file']
            return image
        except Exception:
            if image is not None and image.users==0:
                bpy.data.images.remove(image)
            raise

    def validate(self,spec):
        parsed = validate_material(spec)
        detail_plan = validate_detail(spec)
        for entry in parsed[2].values():
            if entry['type']=='image':
                self.image(entry,load=False)
        for channel,entry in spec.get('detailTextures',{}).items():
            try:
                self.image(entry,load=False)
            except NativeError as exc:
                raise exc.at(field='material.detailTextures.'+channel+'.file')
        if 'surface' in spec:
            for entry in validate_surface(spec['surface'])['images']:
                try:
                    self.image(entry,load=False)
                except NativeError as exc:
                    raise exc.at(field='material.surface.signals.'+entry['signal']+'.file')
        if detail_plan:
            for entry in detail_plan['images']:
                try:
                    self.image(entry,load=False)
                except NativeError as exc:
                    raise exc.at(field='material.detail.surface.signals.'+entry['signal']+'.file')
        return parsed

    def ensure_detail_uv(self,obj):
        specs=[material_spec(material) for material in obj.data.materials]
        return _ensure_detail_uv(obj.data,obj.matrix_world,specs)

    def material(self,spec,periodic_size=None):
        constants,normal_scale,textures,procedural = self.validate(spec)
        detail_plan = validate_detail(spec)
        material_hash = digest({'spec':spec,'periodicSize':periodic_size}) if periodic_size is not None else digest(spec)
        node_version=4 if detail_plan or periodic_size is not None else 3
        for material in bpy.data.materials:
            if material.get('modeler_material_hash')==material_hash and material.use_nodes and material.get('modeler_nodes_version')==node_version:
                return material
        material = bpy.data.materials.new('NativePrincipled')
        try:
            material.use_nodes = True
            tree = material.node_tree
            tree.nodes.clear()
            def node(kind,name):
                item = tree.nodes.new(kind)
                item.name,item.label = name,name
                return item
            principled,output = node('ShaderNodeBsdfPrincipled','Principled'),node('ShaderNodeOutputMaterial','MaterialOutput')
            tree.links.new(principled.outputs['BSDF'],output.inputs['Surface'])
            for socket,value in constants.items():
                principled.inputs[socket].default_value = value
            material.diffuse_color = (*constants['Base Color'][:3],constants['Alpha'])
            material.metallic,material.roughness = constants['Metallic'],constants['Roughness']
            material.use_backface_culling = not bool(spec.get('doubleSided',False))
            texcoords = None
            def coordinates():
                nonlocal texcoords
                if texcoords is None:
                    texcoords = node('ShaderNodeTexCoord','Coordinates')
                return texcoords
            maps = {}
            for channel,entry in textures.items():
                if entry['type']!='image':
                    continue
                image = node('ShaderNodeTexImage','Image_'+channel)
                image.image = self.image(entry)
                image.interpolation,image.extension = 'Linear','REPEAT'
                mapping_node = node('ShaderNodeMapping','Mapping_'+channel)
                mapping_node.inputs['Scale'].default_value = (*entry.get('scale',[1,1]),1)
                if entry.get('texCoord',0)==1:
                    uv=node('ShaderNodeUVMap','ImageDetailUV_'+channel)
                    uv.uv_map=DETAIL_UV
                    tree.links.new(uv.outputs['UV'],mapping_node.inputs['Vector'])
                else:
                    tree.links.new(coordinates().outputs['UV'],mapping_node.inputs['Vector'])
                tree.links.new(mapping_node.outputs['Vector'],image.inputs['Vector'])
                signal = image.outputs['Color']
                if channel in SCALAR_CHANNELS:
                    separate = node('ShaderNodeSeparateColor','Channel_'+channel)
                    tree.links.new(signal,separate.inputs['Color'])
                    signal = separate.outputs[{'r':'Red','g':'Green','b':'Blue'}[entry.get('channel','r')]]
                # Match standard PBR: image texels multiply the supplied channel
                # factor. Procedural recipes below retain their replacement rule.
                if channel in {'roughness','metalness','clearcoat','clearcoatRoughness'}:
                    factor = node('ShaderNodeMath','ImageFactor_'+channel)
                    factor.operation = 'MULTIPLY'
                    tree.links.new(signal,factor.inputs[0])
                    factor.inputs[1].default_value = constants[SOCKETS[channel]]
                    signal = factor.outputs[0]
                elif channel in {'baseColor','emissive'}:
                    factor = node('ShaderNodeMixRGB','ImageFactor_'+channel)
                    factor.blend_type,factor.inputs[0].default_value = 'MULTIPLY',1
                    factor.inputs[1].default_value = constants[SOCKETS[channel]]
                    tree.links.new(signal,factor.inputs[2])
                    signal = factor.outputs['Color']
                if channel=='normal':
                    factors = (normal_scale[0],normal_scale[1]*(-1 if entry.get('normalY','up')=='down' else 1),1)
                    multiply = node('ShaderNodeVectorMath','NormalScale')
                    multiply.operation,multiply.inputs[1].default_value = 'MULTIPLY',factors
                    tree.links.new(signal,multiply.inputs[0])
                    offset = node('ShaderNodeVectorMath','NormalOffset')
                    offset.operation,offset.inputs[1].default_value = 'ADD',tuple(.5*(1-f) for f in factors)
                    tree.links.new(multiply.outputs['Vector'],offset.inputs[0])
                    normal = node('ShaderNodeNormalMap','TangentNormal')
                    normal.space = 'TANGENT'
                    if entry.get('texCoord',0)==1:
                        normal.uv_map=DETAIL_UV
                    tree.links.new(offset.outputs['Vector'],normal.inputs['Color'])
                    signal = normal.outputs['Normal']
                maps[channel] = signal
            if procedural is not None:
                kind,seed = procedural['type'],procedural.get('seed',0)
                mapping_node = node('ShaderNodeMapping','ProceduralMapping')
                mapping_node.inputs['Location'].default_value = (seed%997/31.0,seed%991/37.0,seed%983/41.0)
                tree.links.new(coordinates().outputs['Generated'],mapping_node.inputs['Vector'])
                texture = node({'noise':'ShaderNodeTexNoise','stripes':'ShaderNodeTexWave','checker':'ShaderNodeTexChecker'}[kind],'Procedural_'+kind)
                tree.links.new(mapping_node.outputs['Vector'],texture.inputs['Vector'])
                texture.inputs['Scale'].default_value = procedural.get('scale',5)
                if kind=='noise':
                    texture.inputs['Detail'].default_value = procedural.get('detail',2)
                elif kind=='stripes':
                    texture.wave_type,texture.bands_direction = 'BANDS','X'
                    texture.inputs['Distortion'].default_value = 0
                factor = texture.outputs['Fac']
                ramp = node('ShaderNodeValToRGB','ProceduralColors')
                ramp.color_ramp.elements[0].color = rgba(procedural.get('colorA',spec.get('color','#555555')))
                ramp.color_ramp.elements[1].color = rgba(procedural.get('colorB','#dddddd'))
                tree.links.new(factor,ramp.inputs['Fac'])
                maps.setdefault('baseColor',ramp.outputs['Color'])
                variation = procedural.get('roughnessVariation',0)
                if variation>0 and 'roughness' not in maps:
                    remap = node('ShaderNodeMapRange','ProceduralRoughness')
                    remap.inputs['From Min'].default_value,remap.inputs['From Max'].default_value = 0,1
                    remap.inputs['To Min'].default_value = max(0,constants['Roughness']-variation/2)
                    remap.inputs['To Max'].default_value = min(1,constants['Roughness']+variation/2)
                    tree.links.new(factor,remap.inputs['Value'])
                    maps['roughness'] = remap.outputs['Result']
                if procedural.get('bumpDistance',0)>0:
                    bump = node('ShaderNodeBump','ProceduralBumpMetres')
                    bump.inputs['Distance'].default_value,bump.inputs['Strength'].default_value = procedural['bumpDistance'],1
                    tree.links.new(factor,bump.inputs['Height'])
                    if 'normal' in maps:
                        tree.links.new(maps['normal'],bump.inputs['Normal'])
                    maps['normal'] = bump.outputs['Normal']
            if 'ao' in maps:
                multiply = node('ShaderNodeMixRGB','AO_times_BaseColor')
                multiply.blend_type,multiply.inputs[0].default_value = 'MULTIPLY',1
                if 'baseColor' in maps:
                    tree.links.new(maps['baseColor'],multiply.inputs[1])
                else:
                    multiply.inputs[1].default_value = constants['Base Color']
                tree.links.new(maps['ao'],multiply.inputs[2])
                maps['baseColor'] = multiply.outputs['Color']
            if 'surface' in spec:
                compiled = build_surface(tree,node,coordinates,spec['surface'],principled,constants,maps,self.image,rgba,periodic_size=periodic_size)
                material['modeler_surface'] = canonical(compiled)
            for channel,signal in maps.items():
                if channel in SOCKETS:
                    tree.links.new(signal,principled.inputs[SOCKETS[channel]])
            detail_textures=spec.get('detailTextures',{})
            for channel,entry in detail_textures.items():
                image=node('ShaderNodeTexImage','DetailImage_'+channel)
                image.image=self.image(entry)
                image.interpolation,image.extension='Linear','REPEAT'
                uv=node('ShaderNodeUVMap','DetailUV_'+channel)
                uv.uv_map=DETAIL_UV
                if 'scale' in entry:
                    mapping_node=node('ShaderNodeMapping','DetailMapping_'+channel)
                    mapping_node.inputs['Scale'].default_value=(*entry['scale'],1)
                    tree.links.new(uv.outputs['UV'],mapping_node.inputs['Vector'])
                    tree.links.new(mapping_node.outputs['Vector'],image.inputs['Vector'])
                else:
                    tree.links.new(uv.outputs['UV'],image.inputs['Vector'])
                if channel=='baseColor':
                    tree.links.new(image.outputs['Color'],principled.inputs['Base Color'])
                elif channel=='roughness':
                    separate=node('ShaderNodeSeparateColor','DetailRoughnessChannel')
                    tree.links.new(image.outputs['Color'],separate.inputs['Color'])
                    tree.links.new(separate.outputs['Red'],principled.inputs['Roughness'])
                elif channel=='normal':
                    normal=node('ShaderNodeNormalMap','DetailTangentNormal')
                    normal.space='TANGENT'
                    normal.uv_map=DETAIL_UV
                    tree.links.new(image.outputs['Color'],normal.inputs['Color'])
                    tree.links.new(normal.outputs['Normal'],principled.inputs['Normal'])
            if detail_plan and not detail_textures:
                material['modeler_detail_pending']=canonical({'version':1,'channels':detail_plan['channels']})
            material['modeler_material'],material['modeler_material_hash'] = canonical(spec),material_hash
            material['modeler_nodes_version'] = node_version
            return material
        except Exception:
            if material.users==0:
                bpy.data.materials.remove(material)
            raise

    def info(self,record):
        rows,all_channels,warnings = [],set(),[]
        require(len(record['object'].data.materials)<=256,'material_info exceeds slot response budget','MATERIAL_BUDGET')
        for index,material in enumerate(record['object'].data.materials):
            if material is None:
                rows.append({'index':index,'hash':None,'spec':None,'nodes':[],'links':[],'channels':[],'imageMaps':[]})
                continue
            spec = material_spec(material)
            tree = material.node_tree if material.use_nodes else None
            nodes = [node_info(n) for n in tree.nodes] if tree else []
            links = [{'fromNode':l.from_node.name,'fromSocket':l.from_socket.name,'toNode':l.to_node.name,'toSocket':l.to_socket.name} for l in tree.links] if tree else []
            channels = list(CHANNELS)
            all_channels.update(channels)
            images = [dict(entry,channel=channel) for channel,entry in spec.get('textures',{}).items() if entry.get('type')=='image']
            rows.append({'index':index,'hash':material.get('modeler_material_hash',digest(spec)),'spec':spec,'nodes':nodes,'links':links,'channels':channels,'imageMaps':images,
                'surface':json.loads(material['modeler_surface']) if 'modeler_surface' in material else None,
                'properties':spec.get('properties'),
                'surfaceImages':[dict(entry,signal=name) for name,entry in spec.get('surface',{}).get('signals',{}).items() if entry.get('type')=='image'],
                'mapColors':{channel:entry.get('colorSpace','srgb' if channel in {'baseColor','emissive'} else 'linear') for channel,entry in spec.get('textures',{}).items()}})
            legacy = {channel:entry['type'] for channel,entry in spec.get('textures',{}).items() if entry.get('type') in LEGACY_TEXTURE_TYPES}
            if legacy:
                warnings.append({'code':'LEGACY_TEXTURE_METADATA','materialIndex':index,'channels':legacy,
                    'message':'Existing DataTexture descriptors are preserved for Client rendering; native graphs use their constant channels. Use owned images or procedural for Cycles evaluation.'})
            if 'properties' in spec:
                warnings.append({'code':'MATERIAL_PROPERTIES_ANNOTATION','materialIndex':index,
                    'message':'Material properties preserve author intent; evaluated appearance comes from PBR constants, images and surface nodes.'})
            extra = sorted(set(spec)-CONSTANT_FIELDS)
            if extra or spec.get('type') in LEGACY_TEXTURE_TYPES:
                warnings.append({'code':'LEGACY_MATERIAL_METADATA','materialIndex':index,'fields':extra,'message':'Legacy extras remain JSON; use procedural for evaluated texture nodes.'})
        return {'materials':rows,'channels':[c for c in CHANNELS if c in all_channels],'warnings':warnings,'uv':uv_info(record)}

    def bake(self,command,record,atomic_json):
        keys(command,{'op','requestId','id','channels','resolution','samples','margin','prefix','uvName'},'material_bake command')
        channels = command.get('channels')
        require(isinstance(channels,list) and 1<=len(channels)<=len(CHANNELS) and all(isinstance(c,str) and c in CHANNELS for c in channels) and len(set(channels))==len(channels),
            'channels requires 1..8 distinct supported channels','UNSUPPORTED_BAKE_CHANNEL')
        resolution = integer(command.get('resolution',512),'resolution',64,2048)
        samples = integer(command.get('samples',16),'samples',1,128)
        margin = integer(command.get('margin',8),'margin',0,64)
        require(resolution*resolution*len(channels)<=MAX_BAKE_PIXELS,'Bake exceeds 16M total pixels','BAKE_BUDGET')
        prefix = command.get('prefix')
        require(isinstance(prefix,str) and re.fullmatch(r'bake-[A-Za-z0-9_-]{1,96}',prefix),'prefix must be a safe bake-<unique-id> basename','UNSAFE_PATH')
        uv = uv_info(record)
        uv_name = command.get('uvName',uv['active'])
        require(isinstance(uv_name,str) and 0<len(uv_name)<=128,'Baking requires an existing nonzero-area UV layer','BAKE_UV_REQUIRED')
        selected_uv = next((layer for layer in uv['uvsets'] if layer['name']==uv_name),None)
        require(selected_uv is not None,'Requested UV layer does not exist','BAKE_UV_REQUIRED')
        require(selected_uv['nonzeroFaces']>0 and selected_uv['nonzeroTriangles']>0,'Baking requires at least one nonzero UV face','BAKE_UV_ZERO_AREA')
        source = record['object']
        require(0<len(source.data.materials)<=256 and all(m and m.use_nodes for m in source.data.materials),'Baking requires bounded node material slots','BAKE_MATERIAL_REQUIRED')
        require(all(f.material_index<len(source.data.materials) for f in source.data.polygons),'Face material slot is invalid','BAKE_MATERIAL_REQUIRED')
        hashes = mesh_hashes(record)
        stamp = {'sourceHash':record['sourceHash'],'topologyStamp':record['topologyStamp'],**hashes}
        settings = {'channels':channels,'resolution':resolution,'samples':samples,'margin':margin,'uvName':uv_name}
        bake_key = digest({'appearance':hashes['appearanceHash'],'settings':settings,'engine':'CYCLES-CPU-v1'})
        receipt = prefix+'.json'
        finals = [self.safe_path(self.root,prefix+'-'+c+'.png') for c in channels]
        receipt_path = self.safe_path(self.root,receipt,output=True)
        require(not receipt_path.exists() and all(not p.exists() for p in finals),'Bake output prefix is immutable and already exists','OUTPUT_EXISTS')
        nonce = secrets.token_hex(12)
        temps = [self.safe_path(self.root,'baking-'+nonce+'-'+c+'.png') for c in channels]
        published,scene,obj,mesh,materials,images = [],None,None,None,[],[]
        committed,outputs,started = False,[],time.monotonic()
        try:
            scene = bpy.data.scenes.new('OwnedBake_'+nonce)
            scene.render.engine = 'CYCLES'
            scene.cycles.device,scene.cycles.samples = 'CPU',samples
            scene.cycles.use_denoising,scene.cycles.use_adaptive_sampling,scene.cycles.seed = False,False,0
            scene.render.threads_mode,scene.render.threads = 'FIXED',min(8,os.cpu_count() or 1)
            scene.render.bake.use_selected_to_active,scene.render.bake.use_clear = False,True
            scene.render.bake.margin,scene.render.bake.margin_type = margin,'EXTEND'
            scene.render.bake.normal_space = 'TANGENT'
            scene.render.bake.normal_r,scene.render.bake.normal_g,scene.render.bake.normal_b = 'POS_X','POS_Y','POS_Z'
            scene.render.image_settings.file_format = 'PNG'
            scene.render.image_settings.color_mode,scene.render.image_settings.color_depth = 'RGBA','8'
            scene.view_settings.view_transform = 'Standard'
            mesh = source.data.copy()
            mesh.use_fake_user = False
            assignments = [f.material_index for f in source.data.polygons]
            mesh.uv_layers.active_index = next(i for i,l in enumerate(mesh.uv_layers) if l.name==uv_name)
            for layer in mesh.uv_layers:
                layer.active_render = layer.name==uv_name
            obj = bpy.data.objects.new('OwnedBakeTarget',mesh)
            obj.matrix_world = source.matrix_world.copy()
            scene.collection.objects.link(obj)
            view_layer = scene.view_layers[0]
            view_layer.objects.active = obj
            obj.select_set(True,view_layer=view_layer)
            for channel,temp in zip(channels,temps):
                mesh.materials.clear()
                channel_materials = []
                for original in source.data.materials:
                    mat = original.copy()
                    materials.append(mat)
                    channel_materials.append(mat)
                    mesh.materials.append(mat)
                for face,slot in zip(mesh.polygons,assignments):
                    face.material_index = slot
                image = bpy.data.images.new('OwnedBake_'+channel,width=resolution,height=resolution,alpha=True,float_buffer=False,is_data=channel not in {'baseColor','emissive'})
                images.append(image)
                image.colorspace_settings.name = 'sRGB' if channel in {'baseColor','emissive'} else 'Non-Color'
                for mat in channel_materials:
                    tree = mat.node_tree
                    principled = next((n for n in tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
                    require(principled is not None,'Material has no real Principled node','BAKE_MATERIAL_REQUIRED')
                    target = tree.nodes.new('ShaderNodeTexImage')
                    target.name,target.image = 'OwnedBakeTargetImage',image
                    for node in tree.nodes:
                        node.select = node==target
                    tree.nodes.active = target
                    if channel in {'roughness','metalness','emissive','clearcoat','clearcoatRoughness'}:
                        output = next((n for n in tree.nodes if n.type=='OUTPUT_MATERIAL' and n.is_active_output),None)
                        require(output is not None,'Material output is missing','BAKE_MATERIAL_REQUIRED')
                        emission = tree.nodes.new('ShaderNodeEmission')
                        socket = principled.inputs[SOCKETS[channel]]
                        if socket.is_linked:
                            tree.links.new(socket.links[0].from_socket,emission.inputs['Color'])
                        elif channel=='emissive':
                            emission.inputs['Color'].default_value = socket.default_value
                        else:
                            value = float(socket.default_value)
                            emission.inputs['Color'].default_value = (value,value,value,1)
                        if channel=='emissive':
                            strength = principled.inputs['Emission Strength']
                            if strength.is_linked:
                                tree.links.new(strength.links[0].from_socket,emission.inputs['Strength'])
                            else:
                                emission.inputs['Strength'].default_value = strength.default_value
                        tree.links.new(emission.outputs['Emission'],output.inputs['Surface'])
                    elif channel=='baseColor':
                        # A pure diffuse surrogate avoids Principled's Fresnel
                        # energy compensation altering the requested base color.
                        # Cycles still performs a real DIFFUSE color-only bake.
                        output = next((n for n in tree.nodes if n.type=='OUTPUT_MATERIAL' and n.is_active_output),None)
                        require(output is not None,'Material output is missing','BAKE_MATERIAL_REQUIRED')
                        diffuse = tree.nodes.new('ShaderNodeBsdfDiffuse')
                        socket = principled.inputs['Base Color']
                        if socket.is_linked:
                            tree.links.new(socket.links[0].from_socket,diffuse.inputs['Color'])
                        else:
                            diffuse.inputs['Color'].default_value = socket.default_value
                        tree.links.new(diffuse.outputs['BSDF'],output.inputs['Surface'])
                with bpy.context.temp_override(scene=scene,view_layer=view_layer,object=obj,active_object=obj,selected_objects=[obj],selected_editable_objects=[obj]):
                    view_layer.update()
                    bake_type = {'baseColor':'DIFFUSE','roughness':'EMIT','metalness':'EMIT','emissive':'EMIT','normal':'NORMAL','ao':'AO','clearcoat':'EMIT','clearcoatRoughness':'EMIT'}[channel]
                    kwargs = {'type':bake_type,'use_clear':True,'margin':margin,'uv_layer':uv_name}
                    if channel=='baseColor':
                        kwargs['pass_filter'] = {'COLOR'}
                    status = bpy.ops.object.bake(**kwargs)
                    require('FINISHED' in status,'Cycles bake did not finish','BAKE_FAILED',channel=channel)
                image.filepath_raw,image.file_format = str(temp),'PNG'
                image.save()
                require(temp.is_file() and 0<temp.stat().st_size<=MAX_IMAGE_BYTES,'Cycles PNG output missing or exceeds budget','BAKE_FAILED',channel=channel)
                outputs.append({'channel':channel,'file':prefix+'-'+channel+'.png','width':resolution,'height':resolution,
                    'colorSpace':'srgb' if channel in {'baseColor','emissive'} else 'linear','sha256':file_digest(temp),'bytes':temp.stat().st_size})
                mesh.materials.clear()
                for mat in channel_materials:
                    bpy.data.materials.remove(mat)
                    materials.remove(mat)
                bpy.data.images.remove(image)
                images.remove(image)
            # The atomic JSON receipt is the only publication marker; no glob discovery.
            for temp,target in zip(temps,finals):
                require(not target.exists(),'Bake output appeared during publication','OUTPUT_EXISTS')
                os.rename(temp,target)
                published.append(target)
            if record.get('detailKey'):
                for output,target in zip(outputs,finals):
                    require(target.is_file() and target.stat().st_size==output['bytes'] and file_digest(target)==output['sha256'],
                        'Published detail tile PNG failed integrity verification','IMAGE_HASH_MISMATCH',file=output['file'])
            reply = {'ok':True,'id':command['id'],'requestId':command['requestId'],**stamp,'bakeKey':bake_key,'uvName':uv_name,
                'engine':'CYCLES','device':'CPU','outputs':outputs,'receipt':receipt,'warnings':uv['warnings'],'settings':settings,
                'stats':{'bakeMs':round((time.monotonic()-started)*1000,3)}}
            if record.get('detailKey'):
                reply.update({'version':1,'detailKey':record['detailKey'],'resolution':resolution,'size':record['tileSize'],
                    'fidelity':{'engine':'CYCLES-CPU','periodicEvaluator':'smoothstep-four-samples','channels':channels}})
            if 'emissive' in channels:
                reply['warnings'] = [*reply['warnings'],{'code':'EMISSIVE_PNG_LDR','message':'Emission uses 8-bit sRGB PNG; values above 1 are clipped.'}]
            atomic_json(self.root,receipt,reply,output=True)
            committed = True
            return reply
        except NativeError:
            raise
        except Exception as exc:
            raise NativeError('BAKE_FAILED','Cycles rejected material baking',{'nativeError':str(exc)[:1500]})
        finally:
            if obj is not None and obj.name in bpy.data.objects:
                bpy.data.objects.remove(obj,do_unlink=True)
            if mesh is not None and mesh.name in bpy.data.meshes and mesh.users==0:
                bpy.data.meshes.remove(mesh)
            for mat in materials:
                if mat.name in bpy.data.materials and mat.users==0:
                    bpy.data.materials.remove(mat)
            for image in images:
                if image.name in bpy.data.images and image.users==0:
                    bpy.data.images.remove(image)
            if scene is not None and scene.name in bpy.data.scenes:
                bpy.data.scenes.remove(scene)
            for temp in temps:
                temp.unlink(missing_ok=True)
            if not committed:
                for path in published:
                    path.unlink(missing_ok=True)
                receipt_path.unlink(missing_ok=True)

    def tile(self,command,atomic_json):
        """Bake detail.surface over a private metre-sized XY plane via real Cycles."""
        keys(command,{'op','requestId','material','resolution','prefix','samples'},'material_tile command')
        require(command.get('op')=='material_tile','op must be material_tile')
        request_id=command.get('requestId')
        require(isinstance(request_id,str) and 0<len(request_id)<=128,'requestId is required')
        source=mapping(command.get('material'),'material')
        self.validate(source)
        plan=validate_detail(source)
        require(plan is not None,'material_tile requires material.detail','INVALID_DETAIL')
        channels=[c for c in ('baseColor','roughness','normal') if c in plan['channels']]
        resolution=integer(command.get('resolution',256),'resolution',64,1024)
        samples=integer(command.get('samples',16),'samples',1,128)
        require(resolution*resolution*len(channels)<=MAX_BAKE_PIXELS,'Detail tile exceeds 16M total pixels','BAKE_BUDGET')
        prefix=command.get('prefix')
        require(isinstance(prefix,str) and re.fullmatch(r'bake-[A-Za-z0-9_-]{1,96}',prefix),'prefix must be a safe bake-<unique-id> basename','UNSAFE_PATH')
        detail=source['detail']
        size=number(detail['size'],'material.detail.size')
        vertices=[(0,0,0),(size,0,0),(size,size,0),(0,size,0)]
        mesh=obj=material=None
        try:
            mesh=bpy.data.meshes.new('PrivateDetailTileMesh')
            mesh.from_pydata(vertices,[],[(0,1,2,3)])
            mesh.update()
            uv=mesh.uv_layers.new(name='ModelerTileUV')
            for polygon in mesh.polygons:
                for loop_index in polygon.loop_indices:
                    vertex_index=mesh.loops[loop_index].vertex_index
                    uv.data[loop_index].uv=((0,1,1,0)[vertex_index],(0,0,1,1)[vertex_index])
            mesh.uv_layers.active=uv
            uv.active_render=True
            obj=bpy.data.objects.new('PrivateDetailTile',mesh)
            tile_spec=dict(source)
            for key in ('detail','detailTextures','textures','procedural','surface'):
                tile_spec.pop(key,None)
            tile_spec['surface']=detail['surface']
            material=self.material(tile_spec,periodic_size=size)
            material['modeler_private_tile']=True
            mesh.materials.append(material)
            key_source={'detail':detail,'roughness':source.get('roughness',.5)}
            if 'baseColor' in channels:
                key_source['color']=source.get('color',[.7,.7,.7,1])
            detail_key=digest(key_source)
            record={'object':obj,'sourceHash':digest({'material':source,'tileSize':size}),
                'topologyStamp':digest({'tile':'xy-quad','size':size}),'detailKey':detail_key,'tileSize':size}
            inner={'op':'material_bake','id':'detail-tile','requestId':request_id,'channels':channels,
                'resolution':resolution,'samples':samples,'margin':0,'prefix':prefix,'uvName':'ModelerTileUV'}
            return self.bake(inner,record,atomic_json)
        finally:
            if obj is not None and obj.name in bpy.data.objects:
                bpy.data.objects.remove(obj,do_unlink=True)
            if mesh is not None and mesh.name in bpy.data.meshes and mesh.users==0:
                bpy.data.meshes.remove(mesh)
            if material is not None and material.name in bpy.data.materials and material.users==0 and material.get('modeler_private_tile'):
                bpy.data.materials.remove(material)

