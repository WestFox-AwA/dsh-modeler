"""Bounded local geometry, reproducible frames and live feature-result identities."""
from __future__ import annotations
import math
import bmesh
from mathutils import Matrix, Vector
from mathutils.geometry import tessellate_polygon
from native_selection import (ID_ATTRIBUTES, domains, identifier, integer,
    keys, layers, require, resolve, vector)

MAX_GEOMETRY_ELEMENTS = 512
MAX_GEOMETRY_FLOATS = 8192
MAX_RESULT_MEMBERSHIPS = 2_000_000


def flat_matrix(matrix):
    """The protocol uses column-major matrices, including frame matrices."""
    return [float(matrix[row][column]) for column in range(4) for row in range(4)]


def basis_matrix(origin, tangent, bitangent, normal):
    matrix = Matrix((tangent, bitangent, normal)).transposed().to_4x4()
    matrix.translation = origin
    return matrix


def selection_bounds(selected, domain):
    vertices = selected if domain == "vertices" else {v for element in selected for v in element.verts}
    if not vertices:
        return None
    lower, upper = [math.inf]*3, [-math.inf]*3
    for vertex in vertices:
        for axis, value in enumerate(vertex.co):
            lower[axis], upper[axis] = min(lower[axis], value), max(upper[axis], value)
    return {"min": lower, "max": upper}


def face_triangles(face):
    # Blender 4.5 returns indices into the concatenated polygon coordinates.
    coordinates = [vertex.co.copy() for vertex in face.verts]
    return [[coordinates[index] for index in triangle] for triangle in tessellate_polygon([coordinates])]


def selection_geometry(selected, domain, total=None):
    """Whole elements only; a large ngon is omitted rather than partially drawn."""
    total = len(selected) if total is None else total
    points, segments, triangles, shown = [], [], [], 0
    for element in selected[:MAX_GEOMETRY_ELEMENTS]:
        count = 3 if domain == "vertices" else 6 if domain == "edges" else 6*len(element.edges)+9*(len(element.verts)-2)
        if len(points)+len(segments)+len(triangles)+count > MAX_GEOMETRY_FLOATS:
            continue
        if domain == "vertices":
            points.extend(float(c) for c in element.co)
        elif domain == "edges":
            segments.extend(float(c) for vertex in element.verts for c in vertex.co)
        else:
            surface = face_triangles(element)
            actual = 6*len(element.edges)+9*len(surface)
            if len(points)+len(segments)+len(triangles)+actual > MAX_GEOMETRY_FLOATS:
                continue
            segments.extend(float(c) for edge in element.edges for vertex in edge.verts for c in vertex.co)
            triangles.extend(float(c) for triangle in surface for point in triangle for c in point)
        shown += 1
    return {"space": "local", "points": points, "segments": segments, "triangles": triangles,
            "showingCount": shown, "pageCount": len(selected), "total": total,
            "complete": shown == total, "omitted": total-shown}


def transform_basis(origin, tangent, normal, matrix):
    """Transport a geometric frame through affine coordinates, preserving normals."""
    linear = matrix.to_3x3()
    require(abs(linear.determinant()) > 1e-15, "Frame transform must be invertible", "DEGENERATE_FRAME")
    normal = linear.inverted().transposed() @ normal
    require(normal.length_squared > 1e-20, "Frame normal collapsed", "DEGENERATE_FRAME")
    normal.normalize()
    tangent = linear @ tangent
    tangent -= normal*tangent.dot(normal)
    require(tangent.length_squared > 1e-20, "Frame tangent collapsed", "DEGENERATE_FRAME")
    tangent.normalize()
    return matrix @ origin, tangent, normal.cross(tangent).normalized(), normal


def _face_centroid(face):
    weighted, area = Vector(), 0.0
    for triangle in face_triangles(face):
        a, b, c = triangle
        weight = (b-a).cross(c-a).length*0.5
        weighted += (a+b+c)*(weight/3)
        area += weight
    require(area > 1e-15, "Selected face has zero area", "DEGENERATE_FRAME")
    return weighted/area, area


def derive_frame(bm, selection, stamp, *, up=None, results=None):
    domain, selected, total, offset = resolve(bm, selection, stamp, results=results)
    require(selected, "Frame selection is empty", "EMPTY_SELECTION", selectedCount=0)
    require(domain in {"faces", "edges"}, "Frame selection must contain faces or edges", "UNSUPPORTED_FRAME_DOMAIN")
    persistent = layers(bm)
    if domain == "faces":
        origin, normal, area = Vector(), Vector(), 0.0
        for face in selected:
            centre, weight = _face_centroid(face)
            origin += centre*weight
            normal += face.normal*weight
            area += weight
        require(normal.length > area*1e-8, "Face region has no unique area-weighted normal", "DEGENERATE_FRAME")
        origin /= area
        normal.normalize()
        candidate_edges = {edge for face in selected for edge in face.edges}
    else:
        origin, normal, length = Vector(), Vector(), 0.0
        candidate_edges = set(selected)
        reference_normal = None
        for edge in selected:
            weight = edge.calc_length()
            require(weight > 1e-12, "Selected edge has zero length", "DEGENERATE_FRAME")
            require(1 <= len(edge.link_faces) <= 2,
                    "Edge frame needs one or two adjacent faces", "AMBIGUOUS_FRAME")
            for face in edge.link_faces:
                require(face.normal.length_squared > 1e-20, "Edge has a degenerate adjacent face", "DEGENERATE_FRAME")
                if reference_normal is None:
                    reference_normal = face.normal.copy()
                require(reference_normal.dot(face.normal) >= 1-1e-6,
                        "Edge frame is ambiguous between different adjacent surface normals", "AMBIGUOUS_FRAME")
            origin += (edge.verts[0].co+edge.verts[1].co)*(weight*0.5)
            normal += reference_normal*weight
            length += weight
        origin /= length
        normal.normalize()
    if up is not None:
        preferred = Vector(vector(up, "frame.up"))
        require(preferred.length_squared > 1e-20, "frame.up must be nonzero", "DEGENERATE_FRAME")
        bitangent = preferred-normal*preferred.dot(normal)
        require(bitangent.length_squared > preferred.length_squared*1e-12,
                "frame.up is parallel to the selected normal", "DEGENERATE_FRAME")
        bitangent.normalize()
        tangent = bitangent.cross(normal).normalized()
    else:
        candidates = []
        for edge in candidate_edges:
            a, b = sorted(edge.verts, key=lambda vertex: vertex[persistent["vertices"]])
            direction = b.co-a.co
            projected = direction-normal*direction.dot(normal)
            if projected.length_squared > 1e-20:
                candidates.append((projected.length_squared, edge[persistent["edges"]], projected))
        require(candidates, "Selection has no nondegenerate projected edge for its frame", "DEGENERATE_FRAME")
        maximum = max(item[0] for item in candidates)
        chosen = min((item for item in candidates if maximum-item[0] <= maximum*1e-10), key=lambda item: item[1])
        tangent = chosen[2].normalized()
        bitangent = normal.cross(tangent).normalized()
    if domain == "edges":
        for edge in selected:
            direction = (edge.verts[1].co-edge.verts[0].co).normalized()
            require(abs(direction.dot(tangent)) >= 1-1e-6,
                    "Edge frame requires a common edge tangent; use one edge or a straight chain", "AMBIGUOUS_FRAME")
    return {"domain": domain, "origin": origin, "tangent": tangent, "bitangent": bitangent,
            "normal": normal, "matrix": basis_matrix(origin, tangent, bitangent, normal),
            "selectedCount": len(selected), "total": total, "offset": offset,
            "bounds": selection_bounds(selected, domain), "selected": selected}


def frame_mesh(mesh, selection, stamp, matrix, *, up=None, geometry=False, results=None):
    bm = bmesh.new()
    try:
        bm.from_mesh(mesh)
        frame = derive_frame(bm, selection, stamp, up=up, results=results)
        world = transform_basis(frame["origin"], frame["tangent"], frame["normal"], matrix)
        reply = {key: frame[key] for key in ("domain", "selectedCount", "total", "offset", "bounds")}
        reply.update({key: list(frame[key]) for key in ("origin", "normal", "tangent", "bitangent")})
        reply.update(matrix=flat_matrix(frame["matrix"]), worldMatrix=flat_matrix(basis_matrix(*world)),
                     topologyStamp=stamp, stamp=stamp,
                     normalMethod="area-weighted-faces" if frame["domain"] == "faces" else "coplanar-adjacent-faces",
                     tangentMethod="projected-up" if up is not None else "longest-projected-edge-lowest-persistent-id")
        if geometry:
            reply["selectionGeometry"] = selection_geometry(frame["selected"], frame["domain"], frame["total"])
        return reply
    finally:
        bm.free()


def feature_scope(mesh, feature, stamp, results):
    """IDs in the operation's selected incidence, not transient collection indices."""
    bm = bmesh.new()
    try:
        bm.from_mesh(mesh)
        if "selection" in feature or feature["type"] in {"bisect", "uv"}:
            domain, selected, _, _ = resolve(bm, feature.get("selection", {"domain": "faces"}), stamp, results=results)
            vertices = set(selected) if domain == "vertices" else {v for element in selected for v in element.verts}
            edges = {e for vertex in vertices for e in vertex.link_edges}
            faces = {f for vertex in vertices for f in vertex.link_faces}
            sequences = {"vertices": vertices, "edges": edges, "faces": faces}
        else:
            sequences = domains(bm)
        ls = layers(bm)
        return {domain: {element[ls[domain]] for element in sequence} for domain, sequence in sequences.items()}
    finally:
        bm.free()


def mesh_id_sets(mesh):
    return {domain: {item.value for item in mesh.attributes[name].data}
            for domain, (name, _) in ID_ATTRIBUTES.items()}


def advance_results(before_mesh, after_mesh, feature, scope, prior):
    before, after = mesh_id_sets(before_mesh), mesh_id_sets(after_mesh)
    result = {fid: {name: {domain: sorted(set(values[domain]) & after[domain]) for domain in ID_ATTRIBUTES}
                    for name, values in sets.items()} for fid, sets in (prior or {}).items()}
    created = {domain: sorted(after[domain]-before[domain]) for domain in ID_ATTRIBUTES}
    affected = {domain: sorted((scope[domain] & after[domain]) | set(created[domain])) for domain in ID_ATTRIBUTES}
    result[feature["id"]] = {"created": created, "affected": affected}
    require(sum(len(ids) for sets in result.values() for values in sets.values() for ids in values.values()) <= MAX_RESULT_MEMBERSHIPS,
            "Feature result membership exceeds the stage budget", "FEATURE_RESULT_BUDGET")
    return result


def result_counts(result):
    return {name: {domain: len(values.get(domain, [])) for domain in ID_ATTRIBUTES}
            for name, values in result.items()}


def validate_results(mesh, result):
    require(isinstance(result, dict) and len(result) <= 64, "Invalid cached feature results", "INVALID_CACHE")
    live, members = mesh_id_sets(mesh), 0
    for fid, sets in result.items():
        identifier(fid, "cached feature result ID")
        keys(sets, {"created", "affected"}, "cached feature results")
        require(set(sets) == {"created", "affected"}, "Cached result sets are incomplete", "INVALID_CACHE")
        for values in sets.values():
            keys(values, ID_ATTRIBUTES, "cached feature result domains")
            require(set(values) == set(ID_ATTRIBUTES), "Cached result domains are incomplete", "INVALID_CACHE")
            for domain, ids in values.items():
                require(isinstance(ids, list) and len(ids) == len(set(ids)), "Invalid cached result IDs", "INVALID_CACHE")
                for pid in ids:
                    integer(pid, "cached result element ID", 1)
                require(set(ids) <= live[domain], "Cached result refers to non-surviving IDs", "INVALID_CACHE")
                members += len(ids)
    require(members <= MAX_RESULT_MEMBERSHIPS, "Cached feature results exceed budget", "INVALID_CACHE")
    return result
