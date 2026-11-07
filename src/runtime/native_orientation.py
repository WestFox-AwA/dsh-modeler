"""Bounded winding/normal diagnostics and reversible native orientation features.

Volume is a certificate only for a complete closed, consistently wound manifold
with no detected intersections, completed geometric checks and isolated shell
bounds. Nested/overlapping shell bounds intentionally remain ambiguous.
"""
from __future__ import annotations
import math
from collections import Counter
import bmesh
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from native_selection import (ID_ATTRIBUTES, NativeError, integer, keys, layers,
    require, resolve, vector)

MAX_COMPONENT_PAGE = 32
MAX_PROBES = 32
MAX_TRIANGLE_CHECKS = 20000
MAX_TREE_VISITS = 120000
MAX_CHECK_TRIANGLES = 50000
MAX_WITNESSES = 32


def _bounds(points):
    return ([min(p[i] for p in points) for i in range(3)],
            [max(p[i] for p in points) for i in range(3)])


def _overlap(a, b, epsilon=0.0):
    return all(a[0][i] <= b[1][i]+epsilon and b[0][i] <= a[1][i]+epsilon for i in range(3))


def _triangle_overlap(a, b, epsilon, shared=False):
    # Blender coordinates are float32, but adjacency-boundary exclusion and SAT
    # must run in Python double precision: a float32 lerp can round a skinny
    # triangle's shrunken shared edge back onto its legal neighbouring edge.
    a, b = [tuple(p) for p in a], [tuple(p) for p in b]
    sub = lambda x, y: tuple(x[i]-y[i] for i in range(3))
    dot = lambda x, y: sum(x[i]*y[i] for i in range(3))
    def cross(x, y):
        return (x[1]*y[2]-x[2]*y[1], x[2]*y[0]-x[0]*y[2], x[0]*y[1]-x[1]*y[0])
    if shared:
        def shrink(points):
            centre = tuple(sum(p[i] for p in points)/3 for i in range(3))
            edges = [sub(points[(i+1)%3], points[i]) for i in range(3)]
            normal = cross(edges[0], edges[1])
            altitude = math.sqrt(dot(normal, normal))/max(1e-30, max(math.sqrt(dot(e, e)) for e in edges))
            fraction = min(1e-4, epsilon*8/max(altitude, 1e-30))
            return [tuple(p[i]+(centre[i]-p[i])*fraction for i in range(3)) for p in points]
        a, b = shrink(a), shrink(b)
        epsilon *= 0.01
    ea = [sub(a[(i+1)%3], a[i]) for i in range(3)]
    eb = [sub(b[(i+1)%3], b[i]) for i in range(3)]
    na, nb = cross(ea[0], ea[1]), cross(eb[0], eb[1])
    axes = [na, nb] + [cross(x, y) for x in ea for y in eb]
    axes += [cross(na, e) for e in ea] + [cross(nb, e) for e in eb]
    for axis in axes:
        length = math.sqrt(dot(axis, axis))
        if length <= 1e-24:
            continue
        av, bv = [dot(axis, p) for p in a], [dot(axis, p) for p in b]
        if max(av) < min(bv)-epsilon*length or max(bv) < min(av)-epsilon*length:
            return False
    return True


class Analysis:
    def __init__(self, mesh, selected=None):
        self.mesh = mesh
        self.vertices = [v.co.copy() for v in mesh.vertices]
        self.face_ids = [x.value for x in mesh.attributes[ID_ATTRIBUTES['faces'][0]].data]
        self.vertex_ids = [x.value for x in mesh.attributes[ID_ATTRIBUTES['vertices'][0]].data]
        provenance = mesh.attributes.get('modeler_source_face_id')
        self.source_ids = [x.value for x in provenance.data] if provenance is not None else self.face_ids
        mesh.calc_loop_triangles()
        self.triangles = [(tuple(t.vertices), t.polygon_index, tuple(t.loops)) for t in mesh.loop_triangles]
        self.components, self.face_component, self.warnings = [], {}, []
        self.usage = {'triangles': len(self.triangles), 'trianglePairChecks': 0,
                      'treeVisits': 0, 'shellPairChecks': 0, 'complete': True}
        bm = bmesh.new()
        try:
            bm.from_mesh(mesh)
            bm.normal_update()
            bm.faces.ensure_lookup_table()
            bm.faces.index_update()
            remaining = set(bm.faces)
            visited_edges = set()
            while remaining:
                root = remaining.pop()
                stack, faces = [root], []
                while stack:
                    face = stack.pop()
                    faces.append(face)
                    for edge in face.edges:
                        if edge in visited_edges:
                            continue
                        visited_edges.add(edge)
                        for neighbour in edge.link_faces:
                            if neighbour in remaining:
                                remaining.remove(neighbour)
                                stack.append(neighbour)
                indices = {f.index for f in faces}
                edges = {e for f in faces for e in f.edges}
                verts = {v for f in faces for v in f.verts}
                boundary = sum(len(e.link_faces) == 1 for e in edges)
                nonmanifold = sum(len(e.link_faces) > 2 for e in edges)
                conflicts = sum(len(e.link_faces) == 2 and not e.is_contiguous for e in edges)
                box = _bounds([v.co for v in verts])
                extent = (Vector(box[1])-Vector(box[0])).length
                comp = {'id': min(self.face_ids[i] for i in indices), 'faces': indices,
                        'faceCount': len(indices), 'boundary': boundary, 'nonManifoldEdges': nonmanifold,
                        'manifold': not nonmanifold, 'windingConsistency': not conflicts,
                        'windingConflicts': conflicts, 'bounds': box,
                        'tolerance': {'length': max(1e-12, extent*1e-7),
                                      'volume': max(1e-30, extent**3*1e-9)},
                        'signedVolume': 0.0, 'selfIntersection': False, 'shellAmbiguous': False,
                        'degenerateTriangles': 0, 'nonPlanarFaces': 0, 'cornerNormalsOpposed': 0, 'cornerNormalsDegenerate': 0, 'triangles': []}
                comp['selectedFaceCount'] = len(indices if selected is None else indices & selected)
                comp['completeSelection'] = comp['selectedFaceCount'] == len(indices)
                for index in indices:
                    self.face_component[index] = comp
                self.components.append(comp)
            # Vertex fans can be non-manifold even when all edges have <=2 faces.
            for vertex in bm.verts:
                incident = set(vertex.link_faces)
                if not incident:
                    continue
                adjacency = {face: [] for face in incident}
                for edge in vertex.link_edges:
                    linked = list(edge.link_faces)
                    if linked:
                        first = linked[0]
                        for face in linked[1:]:
                            adjacency[first].append(face)
                            adjacency[face].append(first)
                unseen, fans = set(incident), 0
                while unseen:
                    fans += 1
                    stack = [unseen.pop()]
                    while stack:
                        for face in adjacency[stack.pop()]:
                            if face in unseen:
                                unseen.remove(face)
                                stack.append(face)
                boundary_degree = sum(len(e.link_faces) == 1 for e in vertex.link_edges)
                if fans != 1 or boundary_degree not in {0, 2}:
                    for face in incident:
                        self.face_component[face.index]['manifold'] = False
        finally:
            bm.free()
        self.components.sort(key=lambda c: c['id'])
        terms = {c['id']: [] for c in self.components}
        for index, (ids, face_index, _) in enumerate(self.triangles):
            comp = self.face_component[face_index]
            comp['triangles'].append(index)
            a, b, c = [self.vertices[v] for v in ids]
            ref = Vector(comp['bounds'][0])
            terms[comp['id']].append((a-ref).dot((b-ref).cross(c-ref))/6)
            if (b-a).cross(c-a).length <= comp['tolerance']['length']**2:
                comp['degenerateTriangles'] += 1
        for comp in self.components:
            comp['signedVolume'] = math.fsum(terms[comp['id']])
        for polygon in mesh.polygons:
            if len(polygon.vertices) > 3:
                comp = self.face_component[polygon.index]
                origin = self.vertices[polygon.vertices[0]]
                if any(abs((self.vertices[i]-origin).dot(polygon.normal)) > comp['tolerance']['length'] for i in polygon.vertices):
                    comp['nonPlanarFaces'] += 1
        for polygon in mesh.polygons:
            comp = self.face_component[polygon.index]
            for loop in polygon.loop_indices:
                normal = mesh.corner_normals[loop].vector
                comp['cornerNormalsDegenerate'] += normal.length_squared <= 1e-20
                comp['cornerNormalsOpposed'] += normal.dot(polygon.normal) < -1e-5
        self.check_shell_bounds()
        self.check_intersections()
        for comp in self.components:
            safe = (comp['manifold'] and not comp['boundary'] and comp['windingConsistency']
                    and not comp['selfIntersection'] and not comp['shellAmbiguous']
                    and not comp['degenerateTriangles'] and not comp['nonPlanarFaces'] and self.usage['complete']
                    and abs(comp['signedVolume']) > comp['tolerance']['volume'])
            comp['orientation'] = ('outward' if comp['signedVolume'] > 0 else 'inward') if safe else (
                'open' if comp['manifold'] and comp['boundary'] and not comp['selfIntersection'] else 'ambiguous')
            comp['volumeCertified'] = safe
        suspects = [c for c in self.components if c['signedVolume'] < -c['tolerance']['volume']
                    and c['manifold'] and not c['boundary'] and c['windingConsistency'] and not c['shellAmbiguous']]
        for comp in suspects[:8]:
            self.warnings.append({'code': 'INWARD_SURFACE_SUSPECT', 'componentId': comp['id'],
                'faceId': comp['id'], 'signedVolume': comp['signedVolume'], 'certified': comp['volumeCertified'],
                'message': 'Isolated closed component has negative winding volume. Inspect face/normal witnesses before an explicit orient repair; uncompleted checks or non-planar faces are not certified.'})

    def incomplete(self, reason):
        self.usage['complete'] = False
        if not any(w['code'] == reason for w in self.warnings):
            self.warnings.append({'code': reason, 'message': 'Geometric orientation proof is incomplete; signed volume is diagnostic only.'})

    def check_shell_bounds(self):
        active = []
        for comp in sorted(self.components, key=lambda c: c['bounds'][0][0]):
            active = [other for other in active if other['bounds'][1][0] >= comp['bounds'][0][0]]
            for other in active:
                if self.usage['shellPairChecks'] >= MAX_TRIANGLE_CHECKS:
                    self.incomplete('ORIENTATION_SHELL_BUDGET')
                    return
                self.usage['shellPairChecks'] += 1
                if _overlap(comp['bounds'], other['bounds']):
                    comp['shellAmbiguous'] = other['shellAmbiguous'] = True
            active.append(comp)
        if any(c['shellAmbiguous'] for c in self.components):
            self.warnings.append({'code': 'ORIENTATION_SHELL_NESTING_UNKNOWN',
                'message': 'Component bounds overlap or nest; material-side shell parity is not certified. Consistent preserves each anchor; automatic outward/inward refuses these shells.'})

    def check_intersections(self):
        if len(self.triangles) > MAX_CHECK_TRIANGLES:
            self.incomplete('ORIENTATION_TRIANGLE_BUDGET')
            return
        if not self.triangles:
            return
        boxes = [_bounds([self.vertices[v] for v in t[0]]) for t in self.triangles]
        def build(ids):
            box = ([min(boxes[i][0][a] for i in ids) for a in range(3)],
                   [max(boxes[i][1][a] for i in ids) for a in range(3)])
            if len(ids) <= 8:
                return box, ids, None
            axis = max(range(3), key=lambda a: box[1][a]-box[0][a])
            ids.sort(key=lambda i: boxes[i][0][axis]+boxes[i][1][axis])
            mid = len(ids)//2
            return box, None, (build(ids[:mid]), build(ids[mid:]))
        root = build(list(range(len(self.triangles))))
        stack = [(root, root)]
        while stack:
            first, second = stack.pop()
            if self.usage['treeVisits'] >= MAX_TREE_VISITS:
                self.incomplete('ORIENTATION_INTERSECTION_BUDGET')
                return
            self.usage['treeVisits'] += 1
            if not _overlap(first[0], second[0]):
                continue
            if first[1] is not None and second[1] is not None:
                for i in first[1]:
                    for j in second[1]:
                        if first is second and i >= j:
                            continue
                        a, b = self.triangles[i], self.triangles[j]
                        if not _overlap(boxes[i], boxes[j]):
                            continue
                        if self.usage['trianglePairChecks'] >= MAX_TRIANGLE_CHECKS:
                            self.incomplete('ORIENTATION_INTERSECTION_BUDGET')
                            return
                        self.usage['trianglePairChecks'] += 1
                        ca, cb = self.face_component[a[1]], self.face_component[b[1]]
                        epsilon = min(ca['tolerance']['length'], cb['tolerance']['length'])*0.1
                        if _triangle_overlap([self.vertices[v] for v in a[0]], [self.vertices[v] for v in b[0]],
                                             epsilon, bool(set(a[0]) & set(b[0]))):
                            ca['selfIntersection'] = cb['selfIntersection'] = True
                            ca.setdefault('intersectionWitness', (i, j))
                            cb.setdefault('intersectionWitness', (i, j))
            elif first is second:
                left, right = first[2]
                stack.extend(((left, left), (left, right), (right, right)))
            elif first[1] is None and (second[1] is not None or
                    sum(first[0][1][a]-first[0][0][a] for a in range(3)) >= sum(second[0][1][a]-second[0][0][a] for a in range(3))):
                stack.extend((child, second) for child in first[2])
            else:
                stack.extend((first, child) for child in second[2])

    def witness(self, index, matrix):
        ids, face_index, loops = self.triangles[index]
        points = [self.vertices[v] for v in ids]
        world = [matrix @ p for p in points]
        cross = (points[1]-points[0]).cross(points[2]-points[0])
        local = cross.normalized() if cross.length_squared else Vector()
        normal_matrix = matrix.to_3x3().inverted().transposed()
        transported = normal_matrix @ local
        transported.normalize()
        world_geometric = (world[1]-world[0]).cross(world[2]-world[0]).normalized()
        corners = [(normal_matrix @ self.mesh.corner_normals[l].vector).normalized() for l in loops]
        return {'triangleIndex': index, 'faceId': self.face_ids[face_index],
                'sourceFaceId': self.source_ids[face_index], 'sourceFaceIDs': [self.source_ids[face_index]],
                'vertexIds': [self.vertex_ids[i] for i in ids],
                'faceVertexIds': [self.vertex_ids[i] for i in list(self.mesh.polygons[face_index].vertices)[:32]],
                'faceOrderTruncated': len(self.mesh.polygons[face_index].vertices) > 32,
                'triangle': [list(p) for p in world], 'worldPoint': list(sum(world, Vector())/3),
                'normal': list(world_geometric), 'localGeometricNormal': list(local),
                'worldNormal': list(transported), 'cornerNormals': [list(n) for n in corners],
                'cornerNormalMinDot': min((n.dot(transported) for n in corners), default=0),
                'normalSpace': 'normal=world triangle winding; worldNormal/cornerNormals=inverse-transpose local normals'}

    def report_component(self, comp, matrix):
        item = {k: v for k, v in comp.items() if k not in {'faces', 'triangles', 'intersectionWitness', 'bounds'}}
        item['bounds'] = {'min': comp['bounds'][0], 'max': comp['bounds'][1]}
        item['worldSignedVolume'] = comp['signedVolume']*matrix.to_3x3().determinant()
        item['worldWindingOrientation'] = ('outward' if item['worldSignedVolume'] > 0 else 'inward') if comp['volumeCertified'] else comp['orientation']
        indices = comp.get('intersectionWitness', comp['triangles'][:1])
        item['witnesses'] = [self.witness(i, matrix) for i in indices[:2]]
        item['proofScope'] = 'isolated closed manifold triangle surface; local winding; completed bounded intersection check' if comp['volumeCertified'] else 'uncertified; volume sign alone does not establish material exterior'
        return item

    def summary(self, components=None):
        comps = self.components if components is None else components
        counts = Counter(c['orientation'] for c in comps)
        return {'components': len(comps), 'outward': counts['outward'], 'inward': counts['inward'],
                'open': counts['open'], 'ambiguous': counts['ambiguous'], 'unknown': counts['ambiguous'],
                'candidateInward': sum(c['signedVolume'] < -c['tolerance']['volume'] for c in comps),
                'candidateOutward': sum(c['signedVolume'] > c['tolerance']['volume'] for c in comps),
                'faces': sum(c['faceCount'] for c in comps),
                'selectedFaces': sum(c['selectedFaceCount'] for c in comps),
                'manifold': sum(c['manifold'] for c in comps),
                'windingConflicts': sum(c['windingConflicts'] for c in comps),
                'selfIntersecting': sum(c['selfIntersection'] for c in comps),
                'cornerNormalsOpposed': sum(c['cornerNormalsOpposed'] for c in comps),
                'cornerNormalsDegenerate': sum(c['cornerNormalsDegenerate'] for c in comps),
                'proofScope': 'local winding; only isolated, checked closed manifold components certified; nested parity unknown'}


def _check_stamp(expected, stamp):
    if expected is not None:
        require(isinstance(expected, str) and expected == stamp,
                'Orientation topology stamp does not match this mesh', 'STALE_SELECTION',
                expectedTopologyStamp=stamp, suppliedTopologyStamp=expected)


def _selection(mesh, selection, stamp, results):
    bm = bmesh.new()
    try:
        bm.from_mesh(mesh)
        bm.faces.index_update()
        domain, selected, _, _ = resolve(bm, {'domain': 'faces'} if selection is None else selection, stamp, results=results)
        require(domain == 'faces', 'Orientation selection must use the faces domain')
        return {face.index for face in selected}
    finally:
        bm.free()


def orientation_query(record, command, matrix):
    keys(command, {'op', 'id', 'requestId', 'selection', 'expectedTopologyStamp', 'count', 'offset', 'probes'}, 'orientation command')
    mesh, stamp = record['object'].data, record['topologyStamp']
    _check_stamp(command.get('expectedTopologyStamp'), stamp)
    count = integer(command.get('count', 8), 'orientation.count', 1, MAX_COMPONENT_PAGE)
    offset = integer(command.get('offset', 0), 'orientation.offset', 0, 500000)
    selected = _selection(mesh, command.get('selection'), stamp, record.get('resultSets', {}))
    analysis = Analysis(mesh, selected)
    components = [c for c in analysis.components if c['selectedFaceCount']]
    reply = {'ok': True, 'id': record['node']['id'], 'sourceHash': record['sourceHash'],
             'topologyStamp': stamp, 'space': 'component counts/volume local; witnesses and probes world',
             'normalConvention': 'face order defines geometric normal; corner normals describe shading; reflection changes world triangle winding sign',
             'worldDeterminant': matrix.to_3x3().determinant(), 'summary': analysis.summary(components),
             'meshSummary': analysis.summary(), 'total': len(components), 'offset': offset,
             'components': [analysis.report_component(c, matrix) for c in components[offset:offset+count]],
             'nextOffset': offset+count if offset+count < len(components) else None,
             'budget': {'limits': {'triangles': MAX_CHECK_TRIANGLES, 'trianglePairChecks': MAX_TRIANGLE_CHECKS,
                                   'treeVisits': MAX_TREE_VISITS, 'shellPairChecks': MAX_TRIANGLE_CHECKS,
                                   'componentsPerPage': MAX_COMPONENT_PAGE, 'probes': MAX_PROBES},
                        'usage': analysis.usage}, 'warnings': analysis.warnings}
    probes = command.get('probes', [])
    require(isinstance(probes, list) and len(probes) <= MAX_PROBES, 'orientation.probes permits at most 32 rays')
    parsed = []
    for probe in probes:
        keys(probe, {'origin', 'direction', 'expected'}, 'orientation.probe')
        origin = Vector(vector(probe.get('origin'), 'probe.origin'))
        direction = Vector(vector(probe.get('direction'), 'probe.direction'))
        require(direction.length_squared > 1e-24, 'probe.direction must be nonzero')
        require(probe.get('expected') is None or (isinstance(probe.get('expected'), str) and probe['expected'] in {'outward', 'inward'}), 'probe.expected must be outward or inward')
        parsed.append((probe, origin, direction.normalized()))
    reply['probes'] = []
    if parsed and len(analysis.triangles) <= MAX_CHECK_TRIANGLES:
        world = [matrix @ v for v in analysis.vertices]
        tree = BVHTree.FromPolygons(world, [t[0] for t in analysis.triangles], all_triangles=True)
        selected_components = {c['id'] for c in components}
        for probe, origin, direction in parsed:
            point, normal, index, distance = tree.ray_cast(origin, direction)
            result = {'hit': point is not None, 'expected': probe.get('expected')}
            if point is not None:
                comp = analysis.face_component[analysis.triangles[index][1]]
                result.update(componentId=comp['id'], selected=comp['id'] in selected_components,
                              orientation=comp['orientation'], distance=distance,
                              worldPoint=list(point), normal=list(normal), normalDotRay=normal.dot(direction),
                              matchesExpected=(comp['orientation'] == probe['expected']) if probe.get('expected') and comp['volumeCertified'] else None,
                              witness=analysis.witness(index, matrix))
            reply['probes'].append(result)
    elif parsed:
        reply['probes'] = [{'hit': None, 'expected': p[0].get('expected'), 'reason': 'ORIENTATION_TRIANGLE_BUDGET'} for p in parsed]
    return reply


def source_orientation(mesh, definition):
    keys(definition, {'expected', 'onConflict'}, 'mesh.orientation')
    expected = definition.get('expected')
    policy = definition.get('onConflict', 'error')
    require(isinstance(expected, str) and expected in {'outward', 'inward', 'any'}, 'mesh.orientation.expected must be outward, inward or any')
    require(isinstance(policy, str) and policy in {'error', 'warn'}, 'mesh.orientation.onConflict must be error or warn')
    if expected == 'any':
        return []
    analysis = Analysis(mesh)
    mismatches = [c for c in analysis.components if c['orientation'] != expected]
    if not analysis.components:
        mismatches = [None]
    if not mismatches:
        return []
    first = mismatches[0]
    code = ('ORIENTATION_REQUIRES_CLOSED_COMPONENT' if first and first['boundary'] else
            'ORIENTATION_INTENT_CONFLICT' if first and first['volumeCertified'] else 'ORIENTATION_UNCERTIFIED')
    proof = {'expected': expected, 'summary': analysis.summary(), 'warnings': analysis.warnings,
             'component': analysis.report_component(first, Matrix.Identity(4)) if first else None}
    message = ('Explicit mesh orientation requires a closed checked component; use an orient direction for an open surface'
               if code == 'ORIENTATION_REQUIRES_CLOSED_COMPONENT' else 'Mesh orientation does not satisfy the explicit source intent')
    if policy == 'error':
        raise NativeError(code, message, proof)
    return [{'code': code, 'message': message, **proof}]


def _recompute_corner_normals(mesh):
    # BMesh preserves Blender's encoded custom normals as corner customdata;
    # setting zero vectors does not invalidate their old winding-dependent basis.
    # Remove that layer on this new feature result so Blender derives split
    # normals from geometry and the preserved smooth/sharp flags.
    custom = mesh.attributes.get('custom_normal')
    if custom is not None:
        mesh.attributes.remove(custom)
    mesh.update()
    require(not mesh.has_custom_normals, 'Native custom-normal layer could not be cleared for orientation', 'UNSUPPORTED_BACKEND_API')


def orient_mesh(mesh, feature, stamp, results=None):
    mode = feature.get('mode', 'consistent')
    require(isinstance(mode, str) and mode in {'flip', 'consistent', 'outward', 'inward'}, 'orient.mode must be flip, consistent, outward or inward')
    expected = feature.get('expected', 'any')
    require(isinstance(expected, str) and expected in {'any', 'outward', 'inward'}, 'orient.expected must be any, outward or inward')
    _check_stamp(feature.get('expectedTopologyStamp'), stamp)
    direction = Vector(vector(feature['direction'], 'orient.direction')) if 'direction' in feature else None
    require(direction is None or direction.length_squared > 1e-24, 'orient.direction must be nonzero')
    require(direction is None or (mode == 'consistent' and expected == 'any'),
            'orient.direction requires mode consistent and is exclusive with outward/inward intent')
    selected_indices = _selection(mesh, feature.get('selection'), stamp, results)
    require(selected_indices, 'Orientation selection is empty', 'EMPTY_SELECTION')
    bm, result = bmesh.new(), None
    try:
        bm.from_mesh(mesh)
        bm.faces.ensure_lookup_table()
        bm.faces.index_update()
        bm.normal_update()
        ls = layers(bm)
        selected = {bm.faces[i] for i in selected_indices}
        groups = []
        if mode != 'flip':
            remaining = set(selected)
            for root in sorted(selected, key=lambda f: f[ls['faces']]):
                if root not in remaining:
                    continue
                group, signs, stack = set(), {root: False}, [root]
                while stack:
                    face = stack.pop()
                    group.add(face)
                    for edge in face.edges:
                        require(len(edge.link_faces) <= 2, 'Consistent orientation requires manifold components', 'ORIENTATION_NON_MANIFOLD')
                        for neighbour in edge.link_faces:
                            require(neighbour in selected, 'Recalculation requires complete connected components', 'ORIENTATION_REQUIRES_COMPLETE_COMPONENT')
                            if neighbour is face:
                                continue
                            sign = signs[face] ^ (not edge.is_contiguous)
                            require(neighbour not in signs or signs[neighbour] == sign,
                                    'Component is not consistently orientable', 'ORIENTATION_NON_ORIENTABLE')
                            if neighbour not in signs:
                                signs[neighbour] = sign
                                stack.append(neighbour)
                remaining.difference_update(group)
                flipped = [face for face, sign in signs.items() if sign]
                if flipped:
                    bmesh.ops.reverse_faces(bm, faces=flipped)
                groups.append(group)
            if direction is not None:
                bm.normal_update()
                for group in groups:
                    normal = sum((f.normal*f.calc_area() for f in group), Vector())
                    area = sum(f.calc_area() for f in group)
                    require(normal.length > max(1e-20, area*1e-7) and abs(normal.normalized().dot(direction.normalized())) > 1e-7,
                            'Component has no unique normal aligned with direction', 'ORIENTATION_DIRECTION_AMBIGUOUS')
                    if normal.dot(direction) < 0:
                        bmesh.ops.reverse_faces(bm, faces=list(group))
        else:
            bmesh.ops.reverse_faces(bm, faces=list(selected))
        bm.normal_update()
        result = mesh.copy()
        bm.to_mesh(result)
        result.update()
        _recompute_corner_normals(result)
        if mode in {'outward', 'inward'}:
            analysis = Analysis(result, selected_indices)
            components = [c for c in analysis.components if c['selectedFaceCount']]
            require(all(not c['boundary'] for c in components), 'Automatic orientation requires a closed component', 'ORIENTATION_REQUIRES_CLOSED_COMPONENT')
            require(len(components) == 1, 'Automatic orientation requires one explicitly selected isolated shell; preserve cavity winding with consistent', 'ORIENTATION_AMBIGUOUS_SHELLS')
            comp = components[0]
            require(comp['volumeCertified'], 'Selected shell orientation cannot be certified safely', 'ORIENTATION_UNCERTIFIED',
                    summary=analysis.summary(), component=analysis.report_component(comp, Matrix.Identity(4)), warnings=analysis.warnings)
            if comp['orientation'] != mode:
                bmesh.ops.reverse_faces(bm, faces=list(selected))
                bm.normal_update()
                bm.to_mesh(result)
                result.update()
                _recompute_corner_normals(result)
        if expected != 'any':
            proof = Analysis(result, selected_indices)
            selected_components = [c for c in proof.components if c['selectedFaceCount']]
            require(selected_components and all(c['completeSelection'] and c['orientation'] == expected for c in selected_components),
                    'Orient feature does not satisfy expected orientation', 'ORIENTATION_INTENT_CONFLICT', summary=proof.summary(selected_components))
        return result
    except Exception:
        if result is not None and result.users == 0:
            __import__('bpy').data.meshes.remove(result)
        raise
    finally:
        bm.free()
