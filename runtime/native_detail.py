"""Strict detail-v1 contract and per-face, per-material repeat coordinates."""
from __future__ import annotations
import math
from mathutils import Matrix, Vector
from native_selection import require, keys, number, vector
from native_surface import validate_surface, resolved_mapping, IMAGE

DETAIL_UV = 'ModelerDetailUV'


def validate_detail(spec):
    """Return a SurfaceV1 plan or None; private resolved images stay separate."""
    detail = spec.get('detail')
    if 'detail' not in spec:
        require('detailTextures' not in spec, 'detailTextures requires detail', 'INVALID_DETAIL')
        return None
    keys(detail, {'version','size','channelSizes','projection','space','origin','rotation','surface'}, 'material.detail')
    require(type(detail.get('version')) is int and detail['version']==1, 'detail.version must be 1', 'INVALID_DETAIL')
    size = number(detail.get('size'), 'detail.size')
    require(size>0 and math.isfinite(1/size), 'detail.size must have a positive finite reciprocal', 'INVALID_DETAIL')
    require(detail.get('projection') in {'box','xy','xz','yz'}, 'Invalid detail.projection', 'INVALID_DETAIL')
    require(detail.get('space') in {'object','world'}, 'Invalid detail.space', 'INVALID_DETAIL')
    for name in ('origin','rotation'):
        if name in detail:
            vector(detail[name], 'detail.'+name)
    surface = detail.get('surface')
    plan = validate_surface(surface, 'material.detail.surface')
    require(set(plan['channels'])<= {'baseColor','roughness','normal'} and plan['channels'], 'Detail supports only color, roughness and height outputs', 'UNSUPPORTED_DETAIL_CHANNEL')
    if 'channelSizes' in detail:
        keys(detail['channelSizes'], set(plan['channels']), 'material.detail.channelSizes')
        for channel,value in detail['channelSizes'].items():
            field = 'material.detail.channelSizes.'+channel
            channel_size = number(value,field)
            require(channel_size>0 and math.isfinite(1/channel_size), field+' requires a positive finite reciprocal', 'INVALID_DETAIL')
            ratio = size/channel_size
            require(math.isfinite(ratio) and 1e-6<=ratio<=1024, field+' requires portable UV scale 1e-6..1024', 'INVALID_DETAIL')
    for name, signal in surface['signals'].items():
        require(resolved_mapping(surface,signal)['space']=='object', 'Detail signals require object mapping', 'UNSUPPORTED_DETAIL_MAPPING', signal=name)
    require(surface.get('mapping',{}).get('space','object')=='object', 'Detail root mapping requires object space', 'UNSUPPORTED_DETAIL_MAPPING')
    macro = validate_surface(spec['surface']) if 'surface' in spec else None
    require(not macro or 'roughness' not in plan['channels'] or 'roughness' not in macro['channels'], 'Macro surface roughness conflicts with detail replacement', 'DETAIL_CHANNEL_CONFLICT')
    require(not macro or not ('normal' in macro['channels'] and 'normal' in plan['channels']), 'Macro height conflicts with detail height', 'DETAIL_CHANNEL_CONFLICT')
    textures = spec.get('textures',{})
    if 'baseColor' in plan['channels']:
        require(not macro or 'baseColor' not in macro['channels'], 'Macro color conflicts with detail color ownership', 'DETAIL_CHANNEL_CONFLICT')
        require('baseColor' not in textures, 'Base color texture conflicts with detail color ownership', 'DETAIL_CHANNEL_CONFLICT')
        require(not spec.get('procedural'), 'Procedural color conflicts with detail color ownership', 'DETAIL_CHANNEL_CONFLICT')
    require('roughness' not in textures or 'roughness' not in plan['channels'], 'Base roughness texture conflicts with detail replacement', 'DETAIL_CHANNEL_CONFLICT')
    require('normal' not in textures or 'normal' not in plan['channels'], 'Base normal texture conflicts with detail height', 'DETAIL_CHANNEL_CONFLICT')
    require('metalness' not in textures or 'roughness' not in plan['channels'], 'Metalness texture conflicts with portable detail roughness', 'DETAIL_CHANNEL_CONFLICT')
    if macro and 'roughness' in plan['channels']:
        require('metalness' not in macro['channels'], 'Variable macro metalness cannot be isolated from detail roughness', 'DETAIL_CHANNEL_CONFLICT')
    procedural = spec.get('procedural') or {}
    require(not procedural.get('roughnessVariation',0) or 'roughness' not in plan['channels'], 'Procedural roughness conflicts with detail replacement', 'DETAIL_CHANNEL_CONFLICT')
    require(not (procedural.get('bumpDistance',0) and 'normal' in plan['channels']), 'Procedural bump conflicts with detail height', 'DETAIL_CHANNEL_CONFLICT')
    if 'detailTextures' in spec:
        entries = spec['detailTextures']
        keys(entries, set(plan['channels']), 'material.detailTextures')
        require(set(entries)==set(plan['channels']), 'detailTextures must contain exactly declared channels', 'INVALID_DETAIL_TEXTURE')
        for channel,entry in entries.items():
            keys(entry, {'type','file','colorSpace','scale'}, 'detailTextures.'+channel)
            if 'scale' in entry:
                scale = vector(entry['scale'], 'detailTextures.'+channel+'.scale', 2)
                require(scale[0]==scale[1] and all(1e-6<=v<=1024 for v in scale), 'Detail texture scale requires a positive uniform pair within 1e-6..1024', 'INVALID_DETAIL_TEXTURE')
            expected_space='srgb' if channel=='baseColor' else 'linear'
            require(entry.get('type')=='image' and entry.get('colorSpace')==expected_space, 'Detail color requires sRGB; detail normal/scalar maps require linear owned images', 'INVALID_DETAIL_TEXTURE')
            require(isinstance(entry.get('file'),str) and IMAGE.fullmatch(entry['file']), 'Detail image must be an owned PNG basename', 'UNSAFE_PATH')
    return plan


def inverse_rotation(rotation):
    result = Matrix.Identity(3)
    for index,axis in ((2,'Z'),(1,'Y'),(0,'X')):
        result = Matrix.Rotation(-rotation[index],3,axis) @ result
    return result


def ensure_detail_uv(mesh, matrix_world, material_specs):
    """Mutates caller-owned mesh only. Preserve base active and render UV."""
    plans = [validate_detail(spec) if spec else None for spec in material_specs]
    if not any(plans):
        return None
    active = mesh.uv_layers.active.name if mesh.uv_layers.active else None
    rendered = [layer.name for layer in mesh.uv_layers if layer.active_render]
    transforms = []
    for spec,plan in zip(material_specs,plans):
        if plan is None:
            transforms.append(None)
            continue
        detail = spec['detail']
        rot = inverse_rotation(detail.get('rotation',[0,0,0]))
        origin = Vector(detail.get('origin',[0,0,0]))
        base = matrix_world if detail['space']=='world' else Matrix.Identity(4)
        linear = rot @ base.to_3x3()
        require(abs(linear.determinant())>1e-20, 'Detail projection requires an invertible object transform', 'INVALID_DETAIL_TRANSFORM')
        transforms.append((detail,rot,origin,base,linear.inverted().transposed()))
    layer = mesh.uv_layers.get(DETAIL_UV) or mesh.uv_layers.new(name=DETAIL_UV,do_init=False)
    faces = 0
    for face in mesh.polygons:
        require(face.material_index<len(transforms), 'Face material slot is invalid', 'INVALID_DETAIL_SLOT')
        item = transforms[face.material_index]
        if item is None:
            for loop_index in face.loop_indices:
                layer.data[loop_index].uv=(0,0)
            continue
        detail,rot,origin,base,normal_matrix = item
        normal = normal_matrix @ face.normal
        projection = detail['projection']
        axis = max(range(3),key=lambda i:abs(normal[i])) if projection=='box' else {'xy':2,'xz':1,'yz':0}[projection]
        sign = 1 if normal[axis]>=0 else -1
        # Positive right-handed frames: XY=(X,Y), XZ=(X,-Z), YZ=(Y,Z).
        u_axis,v_axis,v_sign = {2:(0,1,1),1:(0,2,-1),0:(1,2,1)}[axis]
        for loop_index in face.loop_indices:
            point = rot @ ((base @ mesh.vertices[mesh.loops[loop_index].vertex_index].co)-origin)
            layer.data[loop_index].uv=(point[u_axis]/detail['size'],point[v_axis]*v_sign*sign/detail['size'])
        faces += 1
    if active is not None:
        mesh.uv_layers.active_index=next(i for i,l in enumerate(mesh.uv_layers) if l.name==active)
    for old in mesh.uv_layers:
        old.active_render=old.name in rendered
    return {'name':DETAIL_UV,'loops':len(mesh.loops),'faces':faces,'active':active}
