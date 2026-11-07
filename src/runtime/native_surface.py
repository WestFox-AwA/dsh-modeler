"""Bounded surface-v1 validation and literal Blender shader-node compilation.

Pattern rotations apply X, then Y, then Z; sampling applies inverse Z/Y/X.
Authored material data is never evaluated as source code.
"""
from __future__ import annotations
import math
import hashlib
import re
from native_selection import NativeError

SPACES = {'object', 'world', 'frame', 'uv', 'generated'}
SIGNAL_FIELDS = {
    'noise': {'wavelength', 'detail', 'seed', 'stretch'},
    'voronoi': {'wavelength', 'seed', 'stretch'},
    'wave': {'wavelength', 'direction', 'profile', 'seed'},
    'weave': {'wavelength', 'ratio', 'seed'},
    'constant': {'value'}, 'mix': {'a', 'b', 'factor'},
    'ramp': {'input', 'min', 'max', 'invert'},
    'image': {'file', 'channel', 'colorSpace'},
}
LAYER_CHANNELS = {'color': 'baseColor', 'roughness': 'roughness', 'metalness': 'metalness',
                  'clearcoat': 'clearcoat', 'clearcoatRoughness': 'clearcoatRoughness'}
NAME = re.compile(r'^[A-Za-z][A-Za-z0-9_-]{0,79}$')
IMAGE = re.compile(r'^image-[a-f0-9]{64}\.png$')
HEX = re.compile(r'^#(?:[a-fA-F0-9]{3}|[a-fA-F0-9]{6})$')


def _require(ok, field, message, code='INVALID_SURFACE', **detail):
    if not ok:
        raise NativeError(code, field + ': ' + message, {'field': field, **detail})


def _keys(value, allowed, field):
    _require(isinstance(value, dict), field, 'must be an object')
    unknown = sorted(set(value) - set(allowed))
    _require(not unknown, field + ('.' + str(unknown[0]) if unknown else ''), 'unknown field', unknown=unknown[:16])


def _number(value, field, low=None, high=None):
    _require(isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value), field, 'must be a finite number')
    _require(low is None or value >= low, field, 'must be >= ' + str(low))
    _require(high is None or value <= high, field, 'must be <= ' + str(high))
    return float(value)


def _positive(value, field):
    result = _number(value, field)
    _require(result > 0 and math.isfinite(1 / result), field, 'must be positive with a finite reciprocal')
    return result


def _vector(value, field, positive=False):
    _require(isinstance(value, list) and len(value) == 3, field, 'requires three numbers')
    return [(_positive if positive else _number)(c, field + '[' + str(i) + ']') for i, c in enumerate(value)]


def _boolean(value, field):
    _require(isinstance(value, bool), field, 'must be boolean')
    return value


def _name(value, field):
    _require(isinstance(value, str) and NAME.fullmatch(value), field, 'requires a 1..80 character identifier')
    return value


def _color(value, field):
    _require(isinstance(value, str) and HEX.fullmatch(value), field, 'requires #rgb or #rrggbb')
    return '#' + ''.join(c * 2 for c in value[1:]) if len(value) == 4 else value


def _mapping(value, field):
    _keys(value, {'space', 'origin', 'rotation', 'scale', 'frame'}, field)
    if 'space' in value:
        _require(isinstance(value['space'], str) and value['space'] in SPACES, field + '.space', 'unknown coordinate space')
    for name in ('origin', 'rotation', 'scale'):
        if name in value:
            _vector(value[name], field + '.' + name, name == 'scale')
    if 'frame' in value:
        _require(value.get('space', 'frame') == 'frame', field + '.frame', 'frame only applies to frame space')
        frame = value['frame']
        _keys(frame, {'origin', 'tangent', 'bitangent', 'normal'}, field + '.frame')
        vectors = {}
        for name in ('origin', 'tangent', 'bitangent', 'normal'):
            _require(name in frame, field + '.frame.' + name, 'is required')
            vectors[name] = _vector(frame[name], field + '.frame.' + name)
        axes = [vectors[n] for n in ('tangent', 'bitangent', 'normal')]
        dot = lambda a, b: sum(x * y for x, y in zip(a, b))
        _require(all(abs(dot(a, a) - 1) <= 1e-6 for a in axes) and all(abs(dot(axes[i], axes[j])) <= 1e-6 for i, j in ((0, 1), (0, 2), (1, 2))), field + '.frame', 'basis must be unit and orthogonal')
        t, b, n = axes
        cross = [t[1]*b[2]-t[2]*b[1], t[2]*b[0]-t[0]*b[2], t[0]*b[1]-t[1]*b[0]]
        _require(dot(cross, n) >= 1 - 1e-6, field + '.frame', 'basis must be right-handed')
    return dict(value)


def resolved_mapping(surface, signal):
    """Partial signal mapping overrides surface mapping; image defaults to UV."""
    result = {'space': 'uv' if signal['type'] == 'image' and 'mapping' not in surface else 'object', 'rotation': [0, 0, 0], 'scale': [1, 1, 1]}
    result.update(surface.get('mapping', {}))
    result.update(signal.get('mapping', {}))
    if signal.get('mapping', {}).get('space') not in {None, 'frame'}:
        result.pop('frame', None)
    result.setdefault('origin', result.get('frame', {}).get('origin', [0, 0, 0]) if result['space'] == 'frame' else [0, 0, 0])
    return result


def validate_surface(surface, field='material.surface'):
    """Validate before allocating nodes/images. Return a bounded DAG plan."""
    _keys(surface, {'version', 'mapping', 'signals', 'layers'}, field)
    _require(type(surface.get('version')) is int and surface['version'] == 1, field + '.version', 'must be 1')
    if 'mapping' in surface:
        _mapping(surface['mapping'], field + '.mapping')
        _require(surface['mapping'].get('space', 'object') != 'frame' or 'frame' in surface['mapping'], field + '.mapping.frame', 'frame space requires a frame')
    signals, layers = surface.get('signals'), surface.get('layers')
    _require(isinstance(signals, dict) and len(signals) <= 16, field + '.signals', 'requires at most 16 named signals')
    _require(isinstance(layers, list) and 1 <= len(layers) <= 8, field + '.layers', 'requires 1..8 layers')
    dependencies = {name: [] for name in signals}

    def reference(value, path, deps, named=False):
        if isinstance(value, str):
            _require(value in signals, path, 'missing signal ' + value[:96], 'SURFACE_MISSING_SIGNAL', signal=value[:96])
            deps.append(value)
        else:
            _require(not named, path, 'requires a signal name')
            _number(value, path, 0, 1)

    def remap(value, path, deps):
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            _number(value, path, 0, 1)
            return
        _keys(value, {'signal', 'min', 'max', 'invert'}, path)
        reference(value.get('signal'), path + '.signal', deps, True)
        lo, hi = _number(value.get('min', 0), path + '.min', 0, 1), _number(value.get('max', 1), path + '.max', 0, 1)
        _require(lo < hi, path + '.max', 'must exceed min')
        if 'invert' in value:
            _boolean(value['invert'], path + '.invert')

    for name, signal in signals.items():
        _name(name, field + '.signals.' + str(name))
        path = field + '.signals.' + name
        _require(isinstance(signal, dict), path, 'must be an object')
        kind = signal.get('type')
        _require(isinstance(kind, str) and kind in SIGNAL_FIELDS, path + '.type', 'unknown signal type')
        _keys(signal, {'type', 'mapping', *SIGNAL_FIELDS[kind]}, path)
        if 'mapping' in signal:
            _mapping(signal['mapping'], path + '.mapping')
        resolved = resolved_mapping(surface, signal)
        _mapping(resolved, path + '.mapping')
        _require(resolved['space'] != 'frame' or 'frame' in resolved, path + '.mapping.frame', 'frame space requires a frame')
        deps = dependencies[name]
        if kind in {'noise', 'voronoi', 'wave', 'weave'}:
            _positive(signal.get('wavelength'), path + '.wavelength')
            seed = signal.get('seed', 0)
            _require(type(seed) is int and 0 <= seed <= 1_000_000, path + '.seed', 'requires an integer in [0, 1000000]')
        if kind in {'noise', 'voronoi'}:
            if 'stretch' in signal:
                _vector(signal['stretch'], path + '.stretch', True)
            if kind == 'noise':
                _number(signal.get('detail', 2), path + '.detail', 0, 8)
        elif kind == 'wave':
            direction = _vector(signal.get('direction', [1, 0, 0]), path + '.direction')
            _require(math.hypot(*direction) > 0, path + '.direction', 'must be nonzero')
            _require(isinstance(signal.get('profile', 'sine'), str) and signal.get('profile', 'sine') in {'sine', 'saw', 'triangle'}, path + '.profile', 'requires sine, saw or triangle')
        elif kind == 'weave':
            _number(signal.get('ratio', .5), path + '.ratio', 0, 1)
        elif kind == 'constant':
            _number(signal.get('value'), path + '.value', 0, 1)
        elif kind == 'mix':
            reference(signal.get('a'), path + '.a', deps)
            reference(signal.get('b'), path + '.b', deps)
            remap(signal.get('factor'), path + '.factor', deps)
        elif kind == 'ramp':
            reference(signal.get('input'), path + '.input', deps)
            lo, hi = _number(signal.get('min', 0), path + '.min', 0, 1), _number(signal.get('max', 1), path + '.max', 0, 1)
            _require(lo < hi, path + '.max', 'must exceed min')
            if 'invert' in signal:
                _boolean(signal['invert'], path + '.invert')
        elif kind == 'image':
            _require(isinstance(signal.get('file'), str) and IMAGE.fullmatch(signal['file']), path + '.file', 'requires an owned image-<sha256>.png basename', 'UNSAFE_PATH')
            _require(signal.get('colorSpace') == 'linear', path + '.colorSpace', 'scalar images require linear colorSpace')
            _require(isinstance(signal.get('channel', 'r'), str) and signal.get('channel', 'r') in {'r', 'g', 'b'}, path + '.channel', 'requires r, g or b')
    ids, channels = set(), set()
    for index, layer in enumerate(layers):
        path, deps = field + '.layers[' + str(index) + ']', []
        _keys(layer, {'id', 'mask', *LAYER_CHANNELS, 'height'}, path)
        name = _name(layer.get('id'), path + '.id')
        _require(name not in ids, path + '.id', 'duplicate layer id')
        ids.add(name)
        remap(layer.get('mask', 1), path + '.mask', deps)
        for name, channel in LAYER_CHANNELS.items():
            if name not in layer:
                continue
            channels.add(channel)
            value, loc = layer[name], path + '.' + name
            if name == 'color':
                if isinstance(value, str):
                    _color(value, loc)
                else:
                    _keys(value, {'a', 'b', 'signal'}, loc)
                    _color(value.get('a'), loc + '.a')
                    _color(value.get('b'), loc + '.b')
                    reference(value.get('signal'), loc + '.signal', deps, True)
            elif isinstance(value, dict):
                _require(name not in {'clearcoat', 'clearcoatRoughness'}, loc, 'requires a scalar')
                _keys(value, {'min', 'max', 'signal'}, loc)
                lo, hi = _number(value.get('min'), loc + '.min', 0, 1), _number(value.get('max'), loc + '.max', 0, 1)
                _require(lo <= hi, loc + '.max', 'must be >= min')
                reference(value.get('signal'), loc + '.signal', deps, True)
            else:
                _number(value, loc, 0, 1)
        if 'height' in layer:
            height, loc = layer['height'], path + '.height'
            _keys(height, {'signal', 'amplitude', 'midlevel'}, loc)
            reference(height.get('signal'), loc + '.signal', deps, True)
            _number(height.get('amplitude'), loc + '.amplitude', 0, .05)
            _number(height.get('midlevel', .5), loc + '.midlevel', 0, 1)
            channels.add('normal')
    order, visiting, visited = [], [], set()

    def visit(name):
        _require(name not in visiting, field + '.signals.' + name, 'signal dependency cycle', 'SURFACE_SIGNAL_CYCLE', cycle=visiting + [name])
        if name in visited:
            return
        visiting.append(name)
        for other in dependencies[name]:
            visit(other)
        visiting.pop()
        visited.add(name)
        order.append(name)
    for name in signals:
        visit(name)
    return {'surface': surface, 'order': order, 'channels': sorted(channels), 'images': [dict(s, signal=n) for n, s in signals.items() if s['type'] == 'image']}


def surface_node_name(label):
    # Blender node names are bounded; full author identifiers remain in labels.
    return label if len(label) <= 63 else label[:40] + '_' + hashlib.sha256(label.encode('utf-8')).hexdigest()[:20]


def build_surface(tree, node, coordinates, surface, principled, constants, maps, image_loader, rgba, periodic_size=None):
    """Append literal nodes, updating only explicitly layered channels in maps."""
    plan = validate_surface(surface)
    raw_node = node
    def node(kind, label):
        item = raw_node(kind, surface_node_name(label))
        item.label = surface_node_name(label)
        item['modeler_surface_label'] = label
        return item
    outputs, mapping_rows, layer_rows = {}, [], []
    geometry = None
    sockets = {'baseColor': 'Base Color', 'roughness': 'Roughness', 'metalness': 'Metallic', 'clearcoat': 'Coat Weight', 'clearcoatRoughness': 'Coat Roughness'}

    def connect(value, socket):
        if isinstance(value, (int, float)):
            socket.default_value = value
        else:
            tree.links.new(value, socket)

    def math_node(operation, name, a, b=None, clamp=False):
        item = node('ShaderNodeMath', name)
        item.operation, item.use_clamp = operation, clamp
        connect(a, item.inputs[0])
        if b is not None:
            connect(b, item.inputs[1])
        return item.outputs[0]

    def vector_node(operation, name, a, b):
        item = node('ShaderNodeVectorMath', name)
        item.operation = operation
        if isinstance(a, (list, tuple)):
            item.inputs[0].default_value = a
        else:
            tree.links.new(a, item.inputs[0])
        if isinstance(b, (list, tuple)):
            item.inputs[1].default_value = b
        else:
            tree.links.new(b, item.inputs[1])
        return item.outputs['Value' if operation == 'DOT_PRODUCT' else 'Vector']

    def mix_scalar(name, a, b, factor, clamp=False):
        delta = math_node('SUBTRACT', name + '_Delta', b, a)
        weighted = math_node('MULTIPLY', name + '_Weighted', delta, factor)
        return math_node('ADD', name, a, weighted, clamp)

    def ref(value):
        return outputs[value] if isinstance(value, str) else value

    def remap(signal, spec, name):
        item = node('ShaderNodeMapRange', name)
        item.clamp, item.interpolation_type = True, 'LINEAR'
        item.inputs['From Min'].default_value = spec.get('min', 0)
        item.inputs['From Max'].default_value = spec.get('max', 1)
        item.inputs['To Min'].default_value, item.inputs['To Max'].default_value = (1, 0) if spec.get('invert', False) else (0, 1)
        connect(signal, item.inputs['Value'])
        return item.outputs['Result']

    def mask(spec, name):
        return spec if isinstance(spec, (int, float)) else remap(ref(spec['signal']), spec, name)

    def coordinate(signal, name, raw=None):
        nonlocal geometry
        spec = resolved_mapping(surface, signal)
        space = spec['space']
        if raw is not None:
            value = raw
        elif space in {'world', 'frame'}:
            if geometry is None:
                geometry = node('ShaderNodeNewGeometry', 'SurfaceWorldGeometry')
            value = geometry.outputs['Position']
        else:
            value = coordinates().outputs[{'object': 'Object', 'uv': 'UV', 'generated': 'Generated'}[space]]
        value = vector_node('SUBTRACT', name + '_Origin', value, spec['origin'])
        if space == 'frame':
            combine = node('ShaderNodeCombineXYZ', name + '_Frame')
            for axis, basis in zip(('X', 'Y', 'Z'), ('tangent', 'bitangent', 'normal')):
                dot = vector_node('DOT_PRODUCT', name + '_Frame' + axis, value, spec['frame'][basis])
                tree.links.new(dot, combine.inputs[axis])
            value = combine.outputs['Vector']
        for index, axis in ((2, (0, 0, 1)), (1, (0, 1, 0)), (0, (1, 0, 0))):
            angle = spec['rotation'][index]
            if angle:
                item = node('ShaderNodeVectorRotate', name + '_InverseRotate' + 'XYZ'[index])
                item.rotation_type, item.invert = 'AXIS_ANGLE', False
                item.inputs['Axis'].default_value, item.inputs['Angle'].default_value = axis, -angle
                tree.links.new(value, item.inputs['Vector'])
                value = item.outputs['Vector']
        value = vector_node('DIVIDE', name + '_Scale', value, spec['scale'])
        if signal['type'] in {'noise', 'voronoi', 'wave', 'weave'}:
            if 'stretch' in signal:
                value = vector_node('DIVIDE', name + '_Stretch', value, signal['stretch'])
            wavelength = signal['wavelength']
            value = vector_node('DIVIDE', name + '_Wavelength', value, (wavelength,) * 3)
        if raw is None or name.endswith('_PeriodicSample0'):
            signal_name=name.removeprefix('SurfaceSignal_')
            if raw is not None:
                signal_name=signal_name.removesuffix('_PeriodicSample0')
            mapping_rows.append({'signal': signal_name, **spec, 'units': 'metres' if space in {'object', 'world', 'frame'} else 'UV-units' if space == 'uv' else 'normalized', 'wavelength': signal.get('wavelength'), 'stretch': signal.get('stretch', [1, 1, 1])})
        return value

    def ridge(value, ratio, name):
        fraction = math_node('FRACT', name + '_Fraction', value)
        centered = math_node('MULTIPLY', name + '_Twice', fraction, 2)
        centered = math_node('SUBTRACT', name + '_Center', centered, 1)
        distance = math_node('ABSOLUTE', name + '_Distance', centered)
        width = math_node('DIVIDE', name + '_Width', distance, max(ratio, 1e-6))
        return math_node('SUBTRACT', name, 1, width, True)

    def primitive(signal,prefix,value):
        kind=signal['type']
        seed = signal.get('seed', 0)
        if kind in {'noise', 'voronoi'}:
            value = vector_node('ADD', prefix + '_Seed', value, (seed % 997 / 31., seed % 991 / 37., seed % 983 / 41.))
            texture = node('ShaderNodeTexNoise' if kind == 'noise' else 'ShaderNodeTexVoronoi', prefix + '_Texture')
            texture.inputs['Scale'].default_value = 1
            if kind == 'noise':
                texture.noise_dimensions = '3D'
                texture.inputs['Detail'].default_value = signal.get('detail', 2)
                texture.inputs['Roughness'].default_value = .5
                if hasattr(texture, 'normalize'):
                    texture.normalize = True
            else:
                texture.voronoi_dimensions, texture.feature, texture.distance = '3D', 'F1', 'EUCLIDEAN'
            tree.links.new(value, texture.inputs['Vector'])
            value = texture.outputs['Fac' if kind == 'noise' else 'Distance']
        elif kind == 'wave':
            direction = signal.get('direction', [1, 0, 0])
            length = math.hypot(*direction)
            phase = vector_node('DOT_PRODUCT', prefix + '_Direction', value, [c / length for c in direction])
            phase = math_node('ADD', prefix + '_Phase', phase, (seed * .6180339887498949) % 1)
            profile = signal.get('profile', 'sine')
            if profile == 'sine':
                phase = math_node('MULTIPLY', prefix + '_Radians', phase, 2 * math.pi)
                wave = math_node('SINE', prefix + '_Sine', phase)
                wave = math_node('MULTIPLY', prefix + '_Half', wave, .5)
                value = math_node('ADD', prefix + '_Profile', wave, .5)
            elif profile == 'saw':
                value = math_node('FRACT', prefix + '_Profile', phase)
            else:
                value = ridge(phase, 1, prefix + '_Profile')
        elif kind == 'weave':
            value = vector_node('ADD', prefix + '_Seed', value, ((seed * .6180339887498949) % 1, (seed * .414213562373095) % 1, 0))
            separate = node('ShaderNodeSeparateXYZ', prefix + '_Axes')
            tree.links.new(value, separate.inputs['Vector'])
            x, y = separate.outputs['X'], separate.outputs['Y']
            cell_x, cell_y = math_node('FLOOR', prefix + '_CellX', x), math_node('FLOOR', prefix + '_CellY', y)
            total = math_node('ADD', prefix + '_Cells', cell_x, cell_y)
            parity = math_node('FLOORED_MODULO', prefix + '_Interlace', total, 2)
            warp, weft = ridge(x, signal.get('ratio', .5), prefix + '_Warp'), ridge(y, signal.get('ratio', .5), prefix + '_Weft')
            value = mix_scalar(prefix + '_Woven', warp, weft, parity)
        elif kind == 'image':
            texture = node('ShaderNodeTexImage', prefix + '_Image')
            texture.image = image_loader(signal)
            texture.interpolation, texture.extension = 'Linear', 'REPEAT'
            tree.links.new(value, texture.inputs['Vector'])
            separate = node('ShaderNodeSeparateColor', prefix + '_Channel')
            tree.links.new(texture.outputs['Color'], separate.inputs['Color'])
            value = separate.outputs[{'r': 'Red', 'g': 'Green', 'b': 'Blue'}[signal.get('channel', 'r')]]
        return value

    periodic_samples,periodic_weights=None,None
    if periodic_size is not None:
        _require(isinstance(periodic_size,(int,float)) and math.isfinite(periodic_size) and periodic_size>0,'detail.size','requires a positive tile size')
        _require(all(resolved_mapping(surface,signal)['space']=='object' for signal in surface['signals'].values()),'detail.surface','periodic evaluation requires object mapping','UNSUPPORTED_DETAIL_MAPPING')
        axes=node('ShaderNodeSeparateXYZ','SurfaceTileAxes')
        tree.links.new(coordinates().outputs['Object'],axes.inputs['Vector'])
        wrapped=node('ShaderNodeCombineXYZ','SurfaceTileWrappedMetres')
        weights=[]
        for axis in ('X','Y'):
            phase=math_node('DIVIDE','SurfaceTilePhase'+axis,axes.outputs[axis],periodic_size)
            fraction=math_node('FRACT','SurfaceTileFraction'+axis,phase)
            metres=math_node('MULTIPLY','SurfaceTileMetres'+axis,fraction,periodic_size)
            tree.links.new(metres,wrapped.inputs[axis])
            squared=math_node('MULTIPLY','SurfaceTileSmoothSquare'+axis,fraction,fraction)
            twice=math_node('MULTIPLY','SurfaceTileSmoothTwice'+axis,fraction,2)
            curve=math_node('SUBTRACT','SurfaceTileSmoothCurve'+axis,3,twice)
            weights.append(math_node('MULTIPLY','SurfaceTileSmooth'+axis,squared,curve))
        tree.links.new(axes.outputs['Z'],wrapped.inputs['Z'])
        periodic_samples=[wrapped.outputs['Vector']]
        for label,offset in (('X',(-periodic_size,0,0)),('Y',(0,-periodic_size,0)),('XY',(-periodic_size,-periodic_size,0))):
            periodic_samples.append(vector_node('ADD','SurfaceTileSample'+label,wrapped.outputs['Vector'],offset))
        periodic_weights=weights
    for name in plan['order']:
        signal,prefix=surface['signals'][name],'SurfaceSignal_'+name
        kind=signal['type']
        if kind=='constant':
            value=signal['value']
        elif kind=='mix':
            value=mix_scalar(prefix+'_Mix',ref(signal['a']),ref(signal['b']),mask(signal['factor'],prefix+'_Factor'))
        elif kind=='ramp':
            value=remap(ref(signal['input']),signal,prefix+'_Ramp')
        elif periodic_samples is not None:
            samples=[]
            for index,raw in enumerate(periodic_samples):
                sample_prefix=prefix+'_PeriodicSample'+str(index)
                samples.append(primitive(signal,sample_prefix,coordinate(signal,sample_prefix,raw)))
            sx,sy=periodic_weights
            row0=mix_scalar(prefix+'_PeriodicRow0',samples[0],samples[1],sx)
            row1=mix_scalar(prefix+'_PeriodicRow1',samples[2],samples[3],sx)
            value=mix_scalar(prefix+'_Periodic',row0,row1,sy)
        else:
            value=primitive(signal,prefix,coordinate(signal,prefix))
        outputs[name]=math_node('MULTIPLY',prefix,value,1,True)
    height, has_height = 0., False
    for index, layer in enumerate(surface['layers']):
        prefix = 'SurfaceLayer_' + layer['id']
        weight = mask(layer.get('mask', 1), prefix + '_Mask')
        written = []
        for name, channel in LAYER_CHANNELS.items():
            if name not in layer:
                continue
            written.append(channel)
            spec = layer[name]
            old = maps.get(channel, constants[sockets[channel]])
            if name == 'color':
                if isinstance(spec, dict):
                    color_mix = node('ShaderNodeMixRGB', prefix + '_ColorSignal')
                    tree.links.new(outputs[spec['signal']], color_mix.inputs[0])
                    color_mix.inputs[1].default_value, color_mix.inputs[2].default_value = rgba(_color(spec['a'], 'color')), rgba(_color(spec['b'], 'color'))
                    target = color_mix.outputs['Color']
                else:
                    target = rgba(_color(spec, 'color'))
                item = node('ShaderNodeMixRGB', prefix + '_baseColor')
                connect(weight, item.inputs[0])
                for value, socket in ((old, item.inputs[1]), (target, item.inputs[2])):
                    if isinstance(value, (list, tuple)):
                        socket.default_value = value
                    else:
                        tree.links.new(value, socket)
                maps[channel] = item.outputs['Color']
            else:
                target = mix_scalar(prefix + '_' + channel + '_Range', spec['min'], spec['max'], outputs[spec['signal']]) if isinstance(spec, dict) else spec
                maps[channel] = mix_scalar(prefix + '_' + channel, old, target, weight, True)
        if 'height' in layer:
            spec = layer['height']
            centered = math_node('SUBTRACT', prefix + '_HeightCentered', outputs[spec['signal']], spec.get('midlevel', .5))
            target = math_node('MULTIPLY', prefix + '_HeightMetres', centered, spec['amplitude'])
            height = mix_scalar(prefix + '_Height', height, target, weight)
            has_height = True
            written.append('height')
        layer_rows.append({'id': layer['id'], 'index': index, 'channels': written, 'mask': layer.get('mask', 1), 'height': layer.get('height'), 'nodePrefix': prefix})
    if has_height:
        bump = node('ShaderNodeBump', 'SurfaceHeightBumpMetres')
        bump.inputs['Distance'].default_value, bump.inputs['Strength'].default_value = 1, 1
        tree.links.new(height, bump.inputs['Height'])
        if 'normal' in maps:
            tree.links.new(maps['normal'], bump.inputs['Normal'])
        maps['normal'] = bump.outputs['Normal']
    return {'version': 1, 'rotationOrder': 'pattern X then Y then Z; sample inverse Z then Y then X', 'coordinateFormula': 'inverseEulerXYZ(basisInverse(position-origin))/scale/stretch/wavelength', 'signalNodes': [{'name': name, 'type': surface['signals'][name]['type'], 'node': outputs[name].node.name} for name in plan['order']], 'mappings': mapping_rows, 'layers': layer_rows, 'channels': plan['channels'], 'channelNodes': {c: {'node': v.node.name, 'socket': v.name} for c, v in maps.items()}, 'height': {'units': 'metres', 'composition': 'layer-mask-linear-mix', 'distance': 1, 'strength': 1, 'normalNode': 'SurfaceHeightBumpMetres'} if has_height else None}
