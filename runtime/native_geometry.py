"""Original Blender 4.5 native sources/features and lossless local mesh export."""
from __future__ import annotations
import hashlib
import json
import math
from contextlib import contextmanager
from collections import OrderedDict
import bmesh
import bpy
from mathutils import Euler, Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree
from native_selection import (NativeError, ID_ATTRIBUTES, MAX_ELEMENTS, MAX_LOOPS,
    MAX_TRIANGLES, boolean, check_budget, fresh_ids, identifier, integer, keys,
    layers, mapping, mesh_identity, number, reconcile_bmesh_ids,
    reconcile_evaluated_ids, require, resolve, snapshot_ids, topology_stamp, vector)

from native_materials import mesh_hashes
from native_orientation import orient_mesh, source_orientation
from native_local import (advance_results, basis_matrix, derive_frame, feature_scope,
    transform_basis)

SOURCE_FIELDS = {
    "box": "size", "cylinder": "radius depth segments axis",
    "sphere": "radius segments rings", "torus": "majorRadius minorRadius segments tubeSegments axis",
    "mesh": "vertices faces uvs smooth orientation", "extrude": "profile depth axis",
    "loft": "sections caps", "curve": "points bevelDepth bevelResolution resolution closed splineType caps",
    "controlGrid": "rows closedU closedV smooth", "copy": "target",
    "sweep": "profile path closedPath caps up smooth",
    "attachment": "target source anchor direction maxDistance offset alignNormal up",
    "region": "target selection offset",
    "pathArray": "source path count closedPath align up offset"}
FEATURE_FIELDS = {
    "bevel": "width segments selection profile clampOverlap affect",
    "inset": "thickness depth selection individual evenOffset boundary",
    "extrude": "distance selection direction", "subdivide": "cuts selection smooth",
    "subdivision": "levels subdivisionType", "solidify": "thickness offset evenOffset",
    "boolean": "operation target selfIntersection holeTolerant",
    "mirror": "axis pivot merge mergeThreshold", "array": "count offset merge mergeThreshold",
    "smooth": "factor iterations selection", "dissolve": "selection useVerts useFaceSplit",
    "delete": "selection onlyFaces", "triangulate": "selection",
    "bridge": "selection twist", "fill": "selection sides",
    "transform": "translation rotation scale pivot selection frame", "uv": "method selection angleLimit islandMargin cubeSize",
    "crease": "selection value", "edgeSharp": "selection sharp smooth", "material": "selection material",
    "merge": "selection point", "split": "selection",
    "bisect": "planePoint planeNormal selection clearInner clearOuter fill",
    "orient": "mode selection direction expected expectedTopologyStamp"}
LOCAL_FEATURES = {"bevel", "inset", "extrude", "subdivide", "smooth", "dissolve",
                  "delete", "triangulate", "bridge", "fill", "transform", "crease", "edgeSharp", "material", "merge", "split", "bisect"}

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)

def content_hash(value):
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()

def node_matrix(node):
    transform = node.get("transform", {})
    keys(transform, {"position", "rotation", "scale", "matrix"}, "transform")
    if "matrix" in transform:
        require(len(transform) == 1, "transform.matrix is exclusive with TRS")
        flat = vector(transform["matrix"], "transform.matrix", 16)
        mat = Matrix([flat[i:i+4] for i in range(0, 16, 4)]).transposed()
        require(all(abs(mat[3][i]) < 1e-9 for i in range(3)) and abs(mat[3][3]-1) < 1e-9,
                "transform.matrix must be affine")
        require(abs(mat.determinant()) > 1e-15, "transform.matrix must be invertible")
        return mat
    position = vector(transform.get("position", [0, 0, 0]), "position")
    rotation = vector(transform.get("rotation", [0, 0, 0]), "rotation")
    scale = vector(transform.get("scale", [1, 1, 1]), "scale")
    require(all(abs(s) > 1e-12 for s in scale), "Object transform scale cannot be zero")
    return Matrix.Translation(position) @ Euler(rotation, "XYZ").to_matrix().to_4x4() @ Matrix.Diagonal((*scale, 1))

def bounded_points(points, name, dimensions=2, minimum=3):
    require(isinstance(points, list) and minimum <= len(points) <= MAX_ELEMENTS,
            f"{name} must be a bounded array of at least {minimum} points")
    result = [vector(p, name, dimensions) for p in points]
    if dimensions == 2 and result[0] == result[-1]:
        result.pop()
    require(len(result) >= minimum, f"{name} has too few distinct points")
    require(all(a != b for a, b in zip(result, result[1:])), f"{name} contains consecutive duplicate points")
    return result

def profile_points(points, name="profile"):
    result = bounded_points(points, name)
    area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(result, result[1:] + result[:1]))
    require(abs(area) > 1e-14, f"{name} has zero signed area")
    return result if area > 0 else list(reversed(result))

def oriented_frame(tangent, up, field="up"):
    tangent = Vector(tangent).normalized()
    preferred = Vector(up)
    require(preferred.length_squared > 1e-20, f"{field} must be nonzero")
    y = preferred - tangent * preferred.dot(tangent)
    if y.length_squared <= 1e-12 * preferred.length_squared:
        preferred = min((Vector((0, 1, 0)), Vector((1, 0, 0)), Vector((0, 0, 1))),
                        key=lambda axis: abs(axis.dot(tangent)))
        y = preferred - tangent * preferred.dot(tangent)
    y.normalize()
    x = y.cross(tangent).normalized()
    return x, tangent.cross(x).normalized(), tangent


def remove_mesh(mesh):
    if mesh is not None and mesh.name in bpy.data.meshes and mesh.users == 0:
        bpy.data.meshes.remove(mesh)

@contextmanager
def active_object(obj):
    scene = bpy.context.scene
    view_layer = bpy.context.view_layer
    old_active = view_layer.objects.active
    old_selected = list(bpy.context.selected_objects)
    require(bpy.context.mode == "OBJECT", "Private worker lost object mode", "BACKEND_STATE")
    for item in old_selected:
        item.select_set(False)
    obj.hide_viewport = False
    obj.hide_set(False)
    obj.select_set(True)
    view_layer.objects.active = obj
    try:
        with bpy.context.temp_override(scene=scene, view_layer=view_layer, object=obj,
                                       active_object=obj, selected_objects=[obj], selected_editable_objects=[obj]):
            yield
    finally:
        if obj.name in bpy.data.objects and obj.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        if obj.name in bpy.data.objects:
            obj.select_set(False)
        for item in old_selected:
            if item.name in view_layer.objects:
                item.select_set(True)
        if old_active is not None and old_active.name in view_layer.objects:
            view_layer.objects.active = old_active
        else:
            view_layer.objects.active = None

class GeometryEngine:
    def __init__(self, scene, allocator, material_factory=None):
        self.scene, self.allocator = scene, allocator
        self.material_factory = material_factory
        self.bvhs = OrderedDict()

    def object(self, mesh, name="NativeStaging"):
        obj = bpy.data.objects.new(name, mesh)
        self.scene.collection.objects.link(obj)
        return obj

    def from_data(self, vertices, faces, edges=(), *, smooth=False, uvs=None):
        require(len(vertices) <= MAX_ELEMENTS and sum(map(len, faces)) <= MAX_LOOPS,
                "Source exceeds mesh budget", "GEOMETRY_BUDGET")
        mesh = bpy.data.meshes.new("NativeSource")
        try:
            mesh.from_pydata(vertices, edges, faces)
            # validate() repairs corrupt input; silently repairing source would lie.
            require(not mesh.validate(verbose=False, clean_customdata=False),
                    "Source mesh is invalid (duplicate/degenerate faces or edges)", "INVALID_GEOMETRY")
            for polygon in mesh.polygons:
                polygon.use_smooth = smooth
            if uvs is not None:
                if uvs and isinstance(uvs[0], list):
                    uvs = [n for pair in uvs for n in vector(pair, "uv", 2)]
                require(isinstance(uvs, list) and len(uvs) == len(mesh.loops) * 2,
                        "mesh.uvs must contain one UV pair per polygon corner")
                uv_layer = mesh.uv_layers.new(name="UVMap")
                for i, loop in enumerate(uv_layer.data):
                    loop.uv = (number(uvs[2*i], "uv.u"), number(uvs[2*i+1], "uv.v"))
            if uvs is None and mesh.polygons:
                uv_layer = mesh.uv_layers.new(name="UVMap")
                for face in mesh.polygons:
                    axis = max(range(3), key=lambda i: abs(face.normal[i]))
                    axes = ((1, 2), (0, 2), (0, 1))[axis]
                    for loop_index in face.loop_indices:
                        co = mesh.vertices[mesh.loops[loop_index].vertex_index].co
                        uv_layer.data[loop_index].uv = (co[axes[0]] + 0.5, co[axes[1]] + 0.5)
            bm = bmesh.new()
            try:
                bm.from_mesh(mesh)
                fresh_ids(bm, self.allocator)
                bm.to_mesh(mesh)
            finally:
                bm.free()
            mesh.update()
            check_budget(mesh)
            return mesh
        except Exception:
            remove_mesh(mesh)
            raise

    def source(self, source):
        mapping(source, "source")
        axis = source.get("axis", "z")
        if source.get("type") in {"cylinder", "torus", "extrude"}:
            require(isinstance(axis, str) and axis in {"x", "y", "z"},
                    "source.axis must be x, y or z", field="source.axis")
        mesh = self.source_z(source)
        try:
            if source.get("type") in {"cylinder", "torus", "extrude"} and axis != "z":
                rotation = Matrix.Rotation(math.pi/2 if axis == "x" else -math.pi/2, 4, "Y" if axis == "x" else "X")
                mesh.transform(rotation)
                mesh.update()
            if source.get("type") == "mesh" and "orientation" in source:
                warnings = source_orientation(mesh, source["orientation"])
                if warnings:
                    mesh["modeler_orientation_warnings"] = canonical(warnings)
            return mesh
        except Exception:
            remove_mesh(mesh)
            raise

    def source_z(self, source):
        mapping(source, "source")
        kind = source.get("type")
        require(kind in SOURCE_FIELDS, f"Unsupported source type: {kind}", "UNSUPPORTED_SOURCE")
        keys(source, {"type", *SOURCE_FIELDS[kind].split()}, "source")
        if kind in {"box", "cylinder", "sphere"}:
            bm = bmesh.new()
            bm.loops.layers.uv.new("UVMap")
            mesh = None
            try:
                if kind == "box":
                    raw_size = source.get("size", [1, 1, 1])
                    require(isinstance(raw_size, list) and len(raw_size) == 3,
                            "source.size must contain three positive dimensions", field="source.size")
                    size = []
                    for index, value in enumerate(raw_size):
                        field = f"source.size[{index}]"
                        try:
                            dimension = number(value, field)
                            require(dimension > 0, f"{field} must be positive", field=field, value=value)
                            size.append(dimension)
                        except NativeError as exc:
                            raise exc.at(field=field)
                    bmesh.ops.create_cube(bm, size=1, calc_uvs=True)
                    for v in bm.verts:
                        v.co = tuple(v.co[i] * size[i] for i in range(3))
                elif kind == "cylinder":
                    radius = number(source.get("radius", 0.5), "radius", 1e-9)
                    depth = number(source.get("depth", 1), "depth", 1e-9)
                    segments = integer(source.get("segments", 32), "segments", 3, 1024)
                    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments,
                                          radius1=radius, radius2=radius, depth=depth, calc_uvs=True)
                    bm.normal_update()
                    for f in bm.faces:
                        f.smooth = abs(f.normal.z) < 0.9
                else:
                    radius = number(source.get("radius", 0.5), "radius", 1e-9)
                    segments = integer(source.get("segments", 32), "segments", 3, 1024)
                    rings = integer(source.get("rings", 16), "rings", 3, 512)
                    require(segments * rings <= MAX_ELEMENTS, "Sphere exceeds source budget", "GEOMETRY_BUDGET")
                    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=radius, calc_uvs=True)
                    for f in bm.faces:
                        f.smooth = True
                fresh_ids(bm, self.allocator)
                check_budget(bm)
                mesh = bpy.data.meshes.new("NativeSource")
                bm.to_mesh(mesh)
                mesh.update()
                return mesh
            except Exception:
                remove_mesh(mesh)
                raise
            finally:
                bm.free()
        if kind == "torus":
            major = number(source.get("majorRadius", 1), "majorRadius", 1e-9)
            minor = number(source.get("minorRadius", 0.25), "minorRadius", 1e-9)
            n = integer(source.get("segments", 48), "segments", 3, 1024)
            m = integer(source.get("tubeSegments", 16), "tubeSegments", 3, 512)
            require(n * m <= MAX_ELEMENTS, "Torus exceeds source budget", "GEOMETRY_BUDGET")
            vertices = [((major + minor * math.cos(2*math.pi*j/m)) * math.cos(2*math.pi*i/n),
                         (major + minor * math.cos(2*math.pi*j/m)) * math.sin(2*math.pi*i/n),
                         minor * math.sin(2*math.pi*j/m)) for i in range(n) for j in range(m)]
            faces, uvs = [], []
            for i in range(n):
                for j in range(m):
                    faces.append((i*m+j, ((i+1)%n)*m+j, ((i+1)%n)*m+(j+1)%m, i*m+(j+1)%m))
                    uvs.extend([i/n, j/m, (i+1)/n, j/m, (i+1)/n, (j+1)/m, i/n, (j+1)/m])
            return self.from_data(vertices, faces, smooth=True, uvs=uvs)
        if kind == "mesh":
            values = source.get("vertices")
            require(isinstance(values, list) and len(values) % 3 == 0 and len(values) <= MAX_ELEMENTS * 3,
                    "mesh.vertices must be flat XYZ within budget")
            vertices = [vector(values[i:i+3], "vertex") for i in range(0, len(values), 3)]
            faces = source.get("faces")
            require(isinstance(faces, list) and len(faces) <= MAX_ELEMENTS, "mesh.faces must be a bounded array")
            for face in faces:
                require(isinstance(face, list) and 3 <= len(face) <= MAX_ELEMENTS, "Each face requires >=3 indices")
                for i in face:
                    integer(i, "face vertex index", 0, len(vertices)-1)
                require(len(set(face)) == len(face), "Face repeats a vertex index")
            return self.from_data(vertices, faces, smooth=boolean(source.get("smooth", False), "smooth"), uvs=source.get("uvs"))
        if kind in {"extrude", "loft"}:
            if kind == "extrude":
                points = profile_points(source.get("profile"))
                depth = number(source.get("depth", 1), "depth", 1e-9)
                sections = [(-depth/2, points), (depth/2, points)]
                caps = True
            else:
                raw = source.get("sections")
                require(isinstance(raw, list) and 2 <= len(raw) <= 4096, "loft.sections requires 2..4096 sections")
                sections = []
                for section in raw:
                    keys(section, {"z", "points"}, "loft section")
                    sections.append((number(section.get("z"), "section.z"), profile_points(section.get("points"), "section.points")))
                caps = boolean(source.get("caps", True), "caps")
                require(all(a[0] < b[0] for a, b in zip(sections, sections[1:])), "Loft section z must strictly increase")
            n = len(sections[0][1])
            require(all(len(p) == n for _, p in sections), "Loft sections require equal corresponding point counts")
            require(n * len(sections) <= MAX_ELEMENTS, "Loft exceeds source budget", "GEOMETRY_BUDGET")
            vertices = [(x, y, z) for z, pts in sections for x, y in pts]
            faces = [(i*n+j, i*n+(j+1)%n, (i+1)*n+(j+1)%n, (i+1)*n+j)
                     for i in range(len(sections)-1) for j in range(n)]
            if caps:
                faces.extend([tuple(reversed(range(n))), tuple(range((len(sections)-1)*n, len(sections)*n))])
            return self.from_data(vertices, faces)
        if kind == "controlGrid":
            rows = source.get("rows")
            require(isinstance(rows, list) and 2 <= len(rows) <= 4096, "controlGrid.rows requires >=2 rows")
            rows = [bounded_points(row, "grid row", 3, 2) for row in rows]
            n, m = len(rows[0]), len(rows)
            require(all(len(row) == n for row in rows) and n*m <= MAX_ELEMENTS, "Control grid rows must have equal lengths within budget")
            u = boolean(source.get("closedU", False), "closedU")
            v = boolean(source.get("closedV", False), "closedV")
            require(not u or n >= 3, "closedU requires >=3 columns")
            require(not v or m >= 3, "closedV requires >=3 rows")
            faces = [(r*n+c, r*n+(c+1)%n, ((r+1)%m)*n+(c+1)%n, ((r+1)%m)*n+c)
                     for r in range(m if v else m-1) for c in range(n if u else n-1)]
            return self.from_data([p for row in rows for p in row], faces,
                                  smooth=boolean(source.get("smooth", True), "smooth"))
        if kind == "sweep":
            return self.sweep_source(source)
        require(kind == "curve", "Relational sources must be evaluated by the graph", "BACKEND_STATE")
        return self.curve_source(source)

    def sweep_source(self, source):
        profile = profile_points(source.get("profile"))
        closed = boolean(source.get("closedPath", False), "closedPath")
        caps = boolean(source.get("caps", not closed), "caps")
        require(not closed or not caps, "A closed sweep cannot have end caps")
        raw_path = source.get("path")
        require(isinstance(raw_path, list), "sweep.path must be an array")
        if closed and len(raw_path) > 1 and raw_path[0] == raw_path[-1]:
            raw_path = raw_path[:-1]
        path = [Vector(p) for p in bounded_points(raw_path, "sweep.path", 3, 3 if closed else 2)]
        n, count = len(profile), len(path)
        steps = count if closed else count-1
        require(n*count <= MAX_ELEMENTS and n*steps+2 <= MAX_ELEMENTS and 4*n*steps+2*n <= MAX_LOOPS,
                "Sweep exceeds geometry budget", "GEOMETRY_BUDGET")
        segments = [path[(i+1)%count]-path[i] for i in range(steps)]
        lengths = [v.length for v in segments]
        require(all(length > 1e-10 for length in lengths), "Sweep path contains a zero-length segment", "DEGENERATE_PATH")
        directions = [v.normalized() for v in segments]
        tangents = []
        for i in range(count):
            if not closed and i == 0:
                tangent = directions[0]
            elif not closed and i == count-1:
                tangent = directions[-1]
            else:
                tangent = directions[(i-1)%steps] + directions[i%steps]
                require(tangent.length_squared > 1e-12,
                        "Sweep contains a 180-degree reversal with no unique frame", "DEGENERATE_PATH", pathIndex=i)
                tangent.normalize()
            tangents.append(tangent)
        up = vector(source.get("up", [0, 0, 1]), "sweep.up")
        x, y, _ = oriented_frame(tangents[0], up, "sweep.up")
        frames = [(x, y)]
        for i in range(1, count):
            require(tangents[i-1].dot(tangents[i]) > -1+1e-8,
                    "Parallel transport frame is undefined at path reversal", "DEGENERATE_PATH", pathIndex=i)
            y = tangents[i-1].rotation_difference(tangents[i]) @ frames[-1][1]
            x, y, _ = oriented_frame(tangents[i], y)
            frames.append((x, y))
        distances = [0.0]
        for length in lengths:
            distances.append(distances[-1]+length)
        total = distances[-1]
        if closed:
            require(tangents[-1].dot(tangents[0]) > -1+1e-8,
                    "Closed sweep has an undefined closing frame", "DEGENERATE_PATH")
            returned = tangents[-1].rotation_difference(tangents[0]) @ frames[-1][1]
            correction = math.atan2(tangents[0].dot(returned.cross(frames[0][1])), returned.dot(frames[0][1]))
            for i in range(count):
                roll = Quaternion(tangents[i], correction*distances[i]/total)
                frames[i] = roll @ frames[i][0], roll @ frames[i][1]
        vertices = [tuple(path[i] + frames[i][0]*px + frames[i][1]*py)
                    for i in range(count) for px, py in profile]
        perimeter = [0.0]
        for a, b in zip(profile, profile[1:]+profile[:1]):
            perimeter.append(perimeter[-1]+math.hypot(b[0]-a[0], b[1]-a[1]))
        faces, uvs = [], []
        for i in range(steps):
            nxt = (i+1)%count
            v0, v1 = distances[i]/total, distances[i+1]/total
            for j in range(n):
                j1 = (j+1)%n
                faces.append((i*n+j, i*n+j1, nxt*n+j1, nxt*n+j))
                u0, u1 = perimeter[j]/perimeter[-1], perimeter[j+1]/perimeter[-1]
                uvs.extend([u0,v0,u1,v0,u1,v1,u0,v1])
        side_count = len(faces)
        if caps:
            for ring, order in ((0, list(reversed(range(n)))), (count-1, list(range(n)))):
                faces.append(tuple(ring*n+j for j in order))
                for j in order:
                    uvs.extend(profile[j])
        mesh = self.from_data(vertices, faces, smooth=boolean(source.get("smooth", True), "smooth"), uvs=uvs)
        for polygon in list(mesh.polygons)[side_count:]:
            polygon.use_smooth = False
        mesh.update()
        return mesh

    def attachment_placement(self, source, matrix, targets):
        target_id = identifier(source.get("target"), "attachment.target")
        require(target_id in targets, "Attachment target is absent", "MISSING_DEPENDENCY", targetId=target_id)
        record = targets[target_id]
        mesh = record["object"].data
        relative = matrix.inverted() @ node_matrix(record["node"])
        # A rebuilt/evicted source may have identical geometry hash but new
        # persistent face IDs. Never reuse an older relation's ID table then.
        cache_key = content_hash({"target": record["sourceHash"], "topology": record["topologyStamp"],
                                  "matrix": [c for row in relative for c in row]})
        if cache_key not in self.bvhs:
            mesh.calc_loop_triangles()
            require(mesh.loop_triangles, "Attachment target has no surface", "ATTACHMENT_TARGET_EMPTY", targetId=target_id)
            vertices = [relative @ v.co for v in mesh.vertices]
            require(all(math.isfinite(c) for v in vertices for c in v), "Attachment target transform is not finite")
            triangles = [tuple(triangle.vertices) for triangle in mesh.loop_triangles]
            tree = BVHTree.FromPolygons(vertices, triangles, all_triangles=True)
            face_ids = mesh.attributes[ID_ATTRIBUTES["faces"][0]].data
            triangle_ids = [face_ids[t.polygon_index].value for t in mesh.loop_triangles]
            extent = max(max(v[i] for v in vertices)-min(v[i] for v in vertices) for i in range(3))
            entry = {"tree": tree, "faceIds": triangle_ids, "tolerance": max(1e-7, extent*1e-7),
                     "orientation": -1 if relative.to_3x3().determinant() < 0 else 1}
            while self.bvhs and (len(self.bvhs) >= 8 or sum(len(e["faceIds"]) for e in self.bvhs.values())+len(triangle_ids) > MAX_TRIANGLES):
                self.bvhs.popitem(last=False)
            self.bvhs[cache_key] = entry
        entry = self.bvhs[cache_key]
        self.bvhs.move_to_end(cache_key)
        tree, epsilon = entry["tree"], entry["tolerance"]
        anchor = Vector(vector(source.get("anchor"), "attachment.anchor"))
        maximum = number(source.get("maxDistance", 1), "attachment.maxDistance", 1e-9, 1e12)
        if "direction" in source:
            direction = Vector(vector(source["direction"], "attachment.direction"))
            require(direction.length_squared > 1e-20, "attachment.direction must be nonzero")
            direction.normalize()
            point, normal, triangle_index, distance = tree.ray_cast(anchor, direction, maximum)
            method = "ray"
        else:
            point, normal, triangle_index, distance = tree.find_nearest(anchor, maximum)
            method = "nearest"
        require(point is not None and normal is not None and normal.length_squared > 1e-20,
                "Attachment query missed the target surface within maxDistance", "ATTACHMENT_MISS", targetId=target_id, method=method)
        require(distance <= maximum+epsilon, "Attachment target is beyond maxDistance", "ATTACHMENT_MISS", targetId=target_id)
        if method == "ray":
            candidates = tree.find_nearest_range(point, epsilon)
        else:
            candidates = tree.find_nearest_range(anchor, distance+epsilon)
        require(len(candidates) <= 4096, "Attachment has too many equally near surface candidates", "AMBIGUOUS_ATTACHMENT", targetId=target_id)
        normal.normalize()
        for location, candidate_normal, candidate_index, candidate_distance in candidates:
            if method == "nearest" and abs(candidate_distance-distance) > epsilon:
                continue
            if candidate_normal.length_squared <= 1e-20:
                continue
            candidate_normal.normalize()
            require((location-point).length <= epsilon and candidate_normal.dot(normal) >= 1-1e-5,
                    "Attachment query is ambiguous between surfaces or incident face normals", "AMBIGUOUS_ATTACHMENT",
                    targetId=target_id, method=method, tolerance=epsilon,
                    candidateFaceIds=[entry["faceIds"][triangle_index], entry["faceIds"][candidate_index]])
        normal *= entry["orientation"]
        offset = number(source.get("offset", 0), "attachment.offset")
        origin = point + normal*offset
        align = boolean(source.get("alignNormal", True), "attachment.alignNormal")
        if align:
            up = vector(source.get("up", [0, 1, 0]), "attachment.up")
            x, y, z = oriented_frame(normal, up, "attachment.up")
            rotation = Matrix((x, y, z)).transposed().to_4x4()
        else:
            require("up" not in source, "attachment.up requires alignNormal=true")
            rotation = Matrix.Identity(4)
        placement = Matrix.Translation(origin) @ rotation
        state = {"type": "attachment", "targetId": target_id,
                 "targetTopologyStamp": record["topologyStamp"], "targetSourceHash": record["sourceHash"],
                 "targetFaceId": entry["faceIds"][triangle_index],
                 "point": list(point), "normal": list(normal), "placedOrigin": list(origin),
                 "distance": distance, "method": method, "offset": offset, "tolerance": epsilon}
        return placement, state

    def path_array_placements(self, source):
        count = integer(source.get("count"), "pathArray.count", 1, 1024)
        closed = boolean(source.get("closedPath", False), "closedPath")
        align = boolean(source.get("align", True), "align")
        up = vector(source.get("up", [0, 0, 1]), "pathArray.up")
        require(align or "up" not in source, "pathArray.up requires align=true")
        raw = source.get("path")
        require(isinstance(raw, list), "pathArray.path must be an explicit XYZ polyline")
        if closed and len(raw)>1 and raw[0] == raw[-1]:
            raw = raw[:-1]
        path = [Vector(p) for p in bounded_points(raw, "pathArray.path", 3, 3 if closed else 2)]
        steps = len(path) if closed else len(path)-1
        segments = [path[(i+1)%len(path)]-path[i] for i in range(steps)]
        require(all(v.length>1e-10 for v in segments), "Path contains a zero-length segment", "DEGENERATE_PATH")
        lengths = [v.length for v in segments]
        tangents = [v.normalized() for v in segments]
        distances = [0.0]
        for length in lengths:
            distances.append(distances[-1]+length)
        total = distances[-1]
        offset = number(source.get("offset", 0), "pathArray.offset")
        require(closed or 0<=offset<=total and (count==1 or offset<total),
                "Open pathArray offset must leave a nonempty interval to the path end")
        frames = []
        if align:
            x, y, _ = oriented_frame(tangents[0], up, "pathArray.up")
            frames.append((x,y))
            for i in range(1, steps):
                require(tangents[i-1].dot(tangents[i]) > -1+1e-8,
                        "Path has an undefined 180-degree frame reversal", "DEGENERATE_PATH", pathIndex=i)
                y = tangents[i-1].rotation_difference(tangents[i]) @ frames[-1][1]
                x, y, _ = oriented_frame(tangents[i], y)
                frames.append((x,y))
        correction = 0.0
        if align and closed:
            require(tangents[-1].dot(tangents[0]) > -1+1e-8, "Closed path has undefined closing frame", "DEGENERATE_PATH")
            returned = tangents[-1].rotation_difference(tangents[0]) @ frames[-1][1]
            correction = math.atan2(tangents[0].dot(returned.cross(frames[0][1])), returned.dot(frames[0][1]))
        placements, samples = [], []
        for instance in range(count):
            distance = (offset+total*instance/count)%total if closed else offset+(total-offset)*instance/(count-1) if count>1 else offset
            segment = next((i for i in range(steps) if distance<distances[i+1]-1e-10), steps-1)
            ratio = max(0.0,min(1.0,(distance-distances[segment])/lengths[segment]))
            point = path[segment]+segments[segment]*ratio
            rotation = Matrix.Identity(4)
            if align:
                x,y = frames[segment]
                if closed and correction:
                    roll = Quaternion(tangents[segment], correction*distance/total)
                    x,y = roll@x,roll@y
                rotation = Matrix((x,y,tangents[segment])).transposed().to_4x4()
            placements.append(Matrix.Translation(point)@rotation)
            samples.append({"instance":instance,"distance":distance,"point":list(point),
                            "tangent":list(tangents[segment])})
        return placements, {"type":"pathArray","count":count,"closedPath":closed,"align":align,
                            "pathLength":total,"offset":offset,"samplePreview":samples[:16],
                            "samplePreviewTruncated":count>16}

    def combine_path_instances(self, parts):
        bm, result = bmesh.new(), None
        normals, materials, next_loop = {}, [], 1
        for domain, sequence in (("vertices",bm.verts),("edges",bm.edges),("faces",bm.faces)):
            sequence.layers.int.new("modeler_instance_index" if domain=="vertices" else "modeler_instance_index_"+{"edges":"edge","faces":"face"}[domain])
            sequence.layers.int.new("modeler_source_"+{"vertices":"vertex","edges":"edge","faces":"face"}[domain]+"_id")
        bm.loops.layers.int.new("modeler_internal_loop_id")
        try:
            for instance, (mesh, placement) in enumerate(parts):
                normal_matrix = placement.to_3x3().inverted().transposed()
                corner_normals = [(normal_matrix@n.vector).normalized() for n in mesh.corner_normals]
                marker = mesh.attributes.get("modeler_internal_loop_id") or mesh.attributes.new(
                    name="modeler_internal_loop_id",type="INT",domain="CORNER")
                for item, normal in zip(marker.data,corner_normals):
                    item.value = next_loop
                    normals[next_loop] = normal
                    next_loop += 1
                mesh.transform(placement)
                mesh.update()
                before = {domain:len(sequence) for domain,sequence in (("vertices",bm.verts),("edges",bm.edges),("faces",bm.faces))}
                slot_map = []
                for material in mesh.materials:
                    if material not in materials:
                        materials.append(material)
                    slot_map.append(materials.index(material))
                bm.from_mesh(mesh)
                persistent = layers(bm)
                for domain,sequence in (("vertices",bm.verts),("edges",bm.edges),("faces",bm.faces)):
                    origin = sequence.layers.int["modeler_source_"+{"vertices":"vertex","edges":"edge","faces":"face"}[domain]+"_id"]
                    instance_layer = sequence.layers.int["modeler_instance_index" if domain=="vertices" else "modeler_instance_index_"+{"edges":"edge","faces":"face"}[domain]]
                    # from_mesh appends; transient slices only locate this batch,
                    # while all persistent identity remains stored INT attributes.
                    sequence.ensure_lookup_table()
                    for index in range(before[domain], len(sequence)):
                        element = sequence[index]
                        if not element[origin]:
                            element[origin] = element[persistent[domain]]
                        element[persistent[domain]] = self.allocator.take()
                        element[instance_layer] = instance
                        if domain=="faces":
                            element.material_index = slot_map[element.material_index] if slot_map else 0
                check_budget(bm)
            result = bpy.data.meshes.new("NativePathArray")
            bm.to_mesh(result)
            for material in materials:
                result.materials.append(material)
            result.update()
            marker = result.attributes.get("modeler_internal_loop_id")
            if result.loops:
                require(marker is not None, "Path array lost corner normal provenance", "NATIVE_OPERATION_FAILED")
                result.normals_split_custom_set([normals[x.value] for x in marker.data])
            if marker is not None:
                result.attributes.remove(marker)
            check_budget(result)
            return result
        except Exception:
            remove_mesh(result)
            raise
        finally:
            bm.free()

    def clone_with_provenance(self, original):
        mesh = original.copy()
        try:
            for domain, (name, native_domain) in ID_ATTRIBUTES.items():
                values = [x.value for x in original.attributes[name].data]
                provenance_name = "modeler_source_"+domain.rstrip("s").replace("vertice", "vertex")+"_id"
                attribute = mesh.attributes.get(provenance_name) or mesh.attributes.new(name=provenance_name, type="INT", domain=native_domain)
                for item, pid in zip(attribute.data, values):
                    item.value = pid
                for item in mesh.attributes[name].data:
                    item.value = self.allocator.take()
            return mesh
        except Exception:
            remove_mesh(mesh)
            raise

    def region_source(self, source, matrix, targets):
        target_id = source["target"]
        record = targets[target_id]
        original = record["object"].data
        relative = matrix.inverted() @ node_matrix(record["node"])
        offset = number(source.get("offset", 0), "region.offset")
        ids = {domain: [x.value for x in original.attributes[name].data]
               for domain, (name, _) in ID_ATTRIBUTES.items()}
        normal_matrix = relative.to_3x3().inverted().transposed()
        original_normals = {}
        for face in original.polygons:
            for loop in face.loop_indices:
                key = ids["faces"][face.index], ids["vertices"][original.loops[loop].vertex_index]
                original_normals[key] = normal_matrix @ original.corner_normals[loop].vector
        bm, mesh = bmesh.new(), None
        try:
            bm.from_mesh(original)
            for domain, sequence in (("vertices", bm.verts), ("edges", bm.edges), ("faces", bm.faces)):
                name = "modeler_source_"+{"vertices":"vertex", "edges":"edge", "faces":"face"}[domain]+"_id"
                if sequence.layers.int.get(name) is None:
                    sequence.layers.int.new(name)
            domain, selected, total, _ = resolve(bm, source.get("selection"), record["topologyStamp"], results=record.get("resultSets", {}))
            require(domain == "faces" and selected, "Region requires a nonempty target-local face selection", "EMPTY_SELECTION", targetId=target_id)
            persistent = layers(bm)
            selected_ids = [face[persistent["faces"]] for face in selected]
            for domain, sequence in (("vertices", bm.verts), ("edges", bm.edges), ("faces", bm.faces)):
                name = "modeler_source_"+{"vertices":"vertex", "edges":"edge", "faces":"face"}[domain]+"_id"
                provenance = sequence.layers.int[name]
                for item in sequence:
                    item[provenance] = item[persistent[domain]]
            selected_set = set(selected)
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in selected_set], context="FACES_ONLY")
            loose_edges = [e for e in bm.edges if not e.link_faces]
            if loose_edges:
                bmesh.ops.delete(bm, geom=loose_edges, context="EDGES")
            loose_vertices = [v for v in bm.verts if not v.link_faces]
            if loose_vertices:
                bmesh.ops.delete(bm, geom=loose_vertices, context="VERTS")
            bmesh.ops.transform(bm, matrix=relative, verts=list(bm.verts))
            if relative.to_3x3().determinant() < 0:
                bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
            bm.normal_update()
            if offset:
                positions = {v: v.co+v.normal*offset for v in bm.verts}
                for vertex, point in positions.items():
                    vertex.co = point
                bm.normal_update()
            fresh_ids(bm, self.allocator)
            mesh = original.copy()
            bm.to_mesh(mesh)
            mesh.update()
            if not offset and mesh.loops:
                face_ids = mesh.attributes["modeler_source_face_id"].data
                vertex_ids = mesh.attributes["modeler_source_vertex_id"].data
                normals = []
                for face in mesh.polygons:
                    for loop in face.loop_indices:
                        key = face_ids[face.index].value, vertex_ids[mesh.loops[loop].vertex_index].value
                        normal = original_normals[key]
                        normals.append(normal.normalized())
                mesh.normals_split_custom_set(normals)
            check_budget(mesh)
            state = {"type": "region", "targetId": target_id, "targetSourceHash": record["sourceHash"],
                     "targetTopologyStamp": record["topologyStamp"], "selectedFaceCount": len(selected_ids),
                     "matchingFaceCount": total, "selectedFaceIds": selected_ids[:128],
                     "selectedFaceIdsTruncated": len(selected_ids)>128, "offset": offset,
                     "normalMode": "preserved-target-corners" if not offset else "recalculated-offset-surface"}
            return mesh, state
        except Exception:
            remove_mesh(mesh)
            raise
        finally:
            bm.free()

    def curve_source(self, source):
        points = bounded_points(source.get("points"), "curve.points", 3, 2)
        depth = number(source.get("bevelDepth", 0), "bevelDepth", 0)
        bevel_res = integer(source.get("bevelResolution", 3), "bevelResolution", 0, 8)
        resolution = integer(source.get("resolution", 12), "resolution", 1, 128)
        closed = boolean(source.get("closed", False), "closed")
        kind = source.get("splineType", "BEZIER")
        require(kind in {"BEZIER", "POLY"}, "curve.splineType must be BEZIER or POLY")
        require(len(points) * resolution * max(4, bevel_res*4+4) <= MAX_ELEMENTS,
                "Curve tessellation exceeds source budget", "GEOMETRY_BUDGET")
        curve = bpy.data.curves.new("NativeCurveSource", "CURVE")
        obj = mesh = None
        try:
            curve.dimensions = "3D"
            curve.resolution_u = resolution
            curve.bevel_depth = depth
            curve.bevel_resolution = bevel_res
            curve.use_fill_caps = boolean(source.get("caps", True), "caps")
            spline = curve.splines.new(kind)
            spline.use_cyclic_u = closed
            if kind == "BEZIER":
                spline.bezier_points.add(len(points)-1)
                for point, co in zip(spline.bezier_points, points):
                    point.co = co
                    point.handle_left_type = point.handle_right_type = "AUTO"
            else:
                spline.points.add(len(points)-1)
                for point, co in zip(spline.points, points):
                    point.co = (*co, 1)
            obj = self.object(curve)
            bpy.context.view_layer.update()
            depsgraph = bpy.context.evaluated_depsgraph_get()
            mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph),
                        preserve_all_data_layers=True, depsgraph=depsgraph)
            require(mesh is not None, "Blender could not materialize curve", "NATIVE_OPERATION_FAILED")
            bm = bmesh.new()
            try:
                bm.from_mesh(mesh)
                fresh_ids(bm, self.allocator)
                bm.to_mesh(mesh)
            finally:
                bm.free()
            check_budget(mesh)
            return mesh
        except Exception:
            remove_mesh(mesh)
            raise
        finally:
            if obj is not None:
                bpy.data.objects.remove(obj, do_unlink=True)
            if curve.users == 0:
                bpy.data.curves.remove(curve)

    def feature(self, mesh, feature, stamp, matrix, targets, results=None):
        mapping(feature, "feature")
        kind = feature.get("type")
        require(kind in FEATURE_FIELDS, f"Unsupported feature type: {kind}", "UNSUPPORTED_FEATURE")
        keys(feature, {"id", "type", *FEATURE_FIELDS[kind].split()}, "feature")
        identifier(feature.get("id"), "feature.id")
        scope = feature_scope(mesh, feature, stamp, results)
        result = None
        try:
            if kind in LOCAL_FEATURES:
                frame = self.feature_frame(mesh, feature["frame"], stamp, matrix, targets, results) if "frame" in feature else None
                result, warnings = self.local_feature(mesh, feature, stamp, results=results, frame=frame), []
            elif kind == "orient":
                result, warnings = orient_mesh(mesh, feature, stamp, results), []
            elif kind == "uv":
                result, warnings = self.uv_feature(mesh, feature, stamp, results=results), []
            else:
                result, warnings = self.modifier_feature(mesh, feature, matrix, targets)
            return result, warnings, advance_results(mesh, result, feature, scope, results)
        except Exception:
            remove_mesh(result)
            raise

    def feature_frame(self, mesh, definition, stamp, matrix, targets, results):
        keys(definition, {"target", "selection", "up"}, "transform.frame")
        source_mesh, source_stamp, source_results = mesh, stamp, results
        relative = None
        if "target" in definition:
            target_id = identifier(definition["target"], "transform.frame.target")
            require(target_id in targets, "Frame target is absent", "MISSING_DEPENDENCY", targetId=target_id)
            target = targets[target_id]
            source_mesh, source_stamp = target["object"].data, target["topologyStamp"]
            source_results = target.get("resultSets", {})
            relative = matrix.inverted() @ node_matrix(target["node"])
        bm = bmesh.new()
        try:
            bm.from_mesh(source_mesh)
            frame = derive_frame(bm, definition.get("selection"), source_stamp,
                                 up=definition.get("up"), results=source_results)
            if relative is not None:
                return basis_matrix(*transform_basis(frame["origin"], frame["tangent"], frame["normal"], relative))
            return frame["matrix"]
        finally:
            bm.free()

    def local_feature(self, mesh, feature, stamp, *, results=None, frame=None):
        bm = bmesh.new()
        result, added_material = None, None
        try:
            bm.from_mesh(mesh)
            # Adding a CustomData layer may invalidate existing Python element
            # wrappers. Allocate it before resolving/snapshotting any elements.
            if feature["type"] == "crease" and bm.edges.layers.float.get("crease_edge") is None:
                bm.edges.layers.float.new("crease_edge")
            default_selection = {"domain": "faces"} if feature["type"] == "bisect" else None
            domain, selected, total, offset = resolve(bm, feature.get("selection", default_selection), stamp, results=results)
            require(selected, "Feature selection is empty", "EMPTY_SELECTION", selectedCount=0)
            before = snapshot_ids(bm)
            kind = feature["type"]
            if kind == "merge":
                require(domain == "vertices" and len(selected) >= 2, "Merge requires at least two vertices")
                point = Vector(vector(feature["point"], "merge.point")) if "point" in feature else sum((v.co for v in selected), Vector())/len(selected)
                for vertex in selected:
                    before["vertices"].pop(vertex, None)
                bmesh.ops.pointmerge(bm, verts=selected, merge_co=point)
            elif kind == "split":
                require(domain == "edges" and all(e.is_manifold for e in selected),
                        "Split requires manifold edges with two adjacent faces", "INVALID_SELECTION_TOPOLOGY")
                old_count = len(bm.edges), len(bm.verts)
                bmesh.ops.split_edges(bm, edges=selected)
                require((len(bm.edges), len(bm.verts)) != old_count, "Selected edges do not separate the connected vertex fans", "SPLIT_NO_DISCONNECTION")
            elif kind == "bisect":
                require(domain == "faces", "Bisect selection must be faces")
                self.bisect(bm, selected, feature)
            elif kind == "crease":
                require(domain == "edges", "Crease requires edges")
                value = number(feature.get("value"), "crease.value", 0, 1)
                layer = bm.edges.layers.float.get("crease_edge")
                for edge in selected:
                    edge[layer] = value
            elif kind == "edgeSharp":
                require(domain == "edges", "edgeSharp requires edges")
                sharp = boolean(feature.get("sharp", True), "edgeSharp.sharp")
                smooth = boolean(feature.get("smooth", True), "edgeSharp.smooth")
                for edge in selected:
                    edge.smooth = not sharp
                    for face in edge.link_faces:
                        face.smooth = smooth
            elif kind == "material":
                require(domain == "faces", "Material assignment requires faces")
                require(self.material_factory is not None, "Material factory is unavailable", "BACKEND_STATE")
                material = self.material_factory(mapping(feature.get("material"), "feature.material"))
                slot = next((i for i, mat in enumerate(mesh.materials) if mat == material), len(mesh.materials))
                require(slot < 32767, "Blender material slot limit exceeded", "MATERIAL_BUDGET")
                if slot == len(mesh.materials):
                    added_material = material
                for face in selected:
                    face.material_index = slot
            elif kind == "bevel":
                require(domain in {"vertices", "edges"}, "Bevel selection must contain vertices or edges")
                width = number(feature.get("width", 0.1), "bevel.width", 1e-9)
                segments = integer(feature.get("segments", 1), "bevel.segments", 1, 32)
                affect = feature.get("affect", "VERTICES" if domain == "vertices" else "EDGES")
                require(affect == ("VERTICES" if domain == "vertices" else "EDGES"), "bevel.affect must match selection domain")
                require(len(bm.verts) + len(selected)*segments*16 <= MAX_ELEMENTS, "Bevel exceeds conservative budget", "GEOMETRY_BUDGET")
                bmesh.ops.bevel(bm, geom=selected, offset=width, offset_type="OFFSET", segments=segments,
                    profile=number(feature.get("profile", 0.5), "bevel.profile", 0, 1), affect=affect,
                    clamp_overlap=boolean(feature.get("clampOverlap", True), "clampOverlap"))
            elif kind == "inset":
                require(domain == "faces", "Inset requires faces")
                kwargs = {"faces": selected,
                    "thickness": number(feature.get("thickness", 0.1), "inset.thickness", 0),
                    "depth": number(feature.get("depth", 0), "inset.depth"),
                    "use_even_offset": boolean(feature.get("evenOffset", True), "evenOffset")}
                if boolean(feature.get("individual", False), "individual"):
                    require("boundary" not in feature, "boundary applies only to region inset")
                    bmesh.ops.inset_individual(bm, **kwargs)
                else:
                    bmesh.ops.inset_region(bm, use_boundary=boolean(feature.get("boundary", True), "boundary"), **kwargs)
            elif kind == "extrude":
                require(domain in {"faces", "edges"}, "Extrude requires faces or edges")
                distance = number(feature.get("distance", 0.1), "extrude.distance")
                if "direction" in feature:
                    direction = Vector(vector(feature["direction"], "extrude.direction"))
                else:
                    require(domain == "faces", "Edge extrusion requires explicit direction")
                    direction = sum((f.normal * f.calc_area() for f in selected), Vector((0, 0, 0)))
                require(direction.length_squared > 1e-20, "Extrusion has no unique direction; supply direction")
                direction.normalize()
                if domain == "faces":
                    region = set(selected)
                    geom = list(region | {e for f in selected for e in f.edges} | {v for f in selected for v in f.verts})
                    result_geom = bmesh.ops.extrude_face_region(bm, geom=geom, use_keep_orig=False)["geom"]
                else:
                    result_geom = bmesh.ops.extrude_edge_only(bm, edges=selected)["geom"]
                verts = [v for v in result_geom if isinstance(v, bmesh.types.BMVert)]
                require(verts, "Blender extrusion created no vertices", "NATIVE_OPERATION_FAILED")
                bmesh.ops.translate(bm, vec=direction*distance, verts=verts)
            elif kind == "subdivide":
                require(domain in {"edges", "faces"}, "Subdivide requires edges or faces")
                edges = selected if domain == "edges" else list({e for f in selected for e in f.edges})
                cuts = integer(feature.get("cuts", 1), "subdivide.cuts", 1, 32)
                require(len(bm.verts) + len(edges)*(cuts+1)**2 <= MAX_ELEMENTS, "Subdivide exceeds budget", "GEOMETRY_BUDGET")
                bmesh.ops.subdivide_edges(bm, edges=edges, cuts=cuts, use_grid_fill=True,
                    smooth=number(feature.get("smooth", 0), "subdivide.smooth", 0, 1))
            elif kind == "smooth":
                verts = selected if domain == "vertices" else list({v for el in selected for v in el.verts})
                factor = number(feature.get("factor", 0.5), "smooth.factor", 0, 1)
                for _ in range(integer(feature.get("iterations", 1), "smooth.iterations", 1, 100)):
                    bmesh.ops.smooth_vert(bm, verts=verts, factor=factor, use_axis_x=True, use_axis_y=True, use_axis_z=True)
            elif kind == "dissolve":
                if domain == "vertices":
                    require("useVerts" not in feature, "useVerts does not apply to vertex dissolve")
                    bmesh.ops.dissolve_verts(bm, verts=selected,
                        use_face_split=boolean(feature.get("useFaceSplit", False), "useFaceSplit"))
                elif domain == "edges":
                    bmesh.ops.dissolve_edges(bm, edges=selected,
                        use_verts=boolean(feature.get("useVerts", False), "useVerts"),
                        use_face_split=boolean(feature.get("useFaceSplit", False), "useFaceSplit"))
                else:
                    require("useFaceSplit" not in feature, "useFaceSplit does not apply to face dissolve")
                    bmesh.ops.dissolve_faces(bm, faces=selected, use_verts=boolean(feature.get("useVerts", False), "useVerts"))
            elif kind == "delete":
                only_faces = boolean(feature.get("onlyFaces", False), "onlyFaces")
                require(not only_faces or domain == "faces", "onlyFaces requires face selection")
                context = {"vertices": "VERTS", "edges": "EDGES", "faces": "FACES_ONLY" if only_faces else "FACES"}[domain]
                bmesh.ops.delete(bm, geom=selected, context=context)
            elif kind == "triangulate":
                require(domain == "faces", "Triangulate requires faces")
                bmesh.ops.triangulate(bm, faces=selected, quad_method="BEAUTY", ngon_method="BEAUTY")
            elif kind in {"bridge", "fill"}:
                require(domain == "edges" and all(e.is_boundary for e in selected),
                        f"{kind} requires boundary edges")
                adjacency = {}
                for edge in selected:
                    for v in edge.verts:
                        adjacency.setdefault(v, []).append(edge)
                require(all(len(es) == 2 for es in adjacency.values()),
                        f"{kind} requires complete, disjoint closed boundary loops", "INVALID_SELECTION_TOPOLOGY")
                remaining, loops = set(adjacency), 0
                while remaining:
                    stack = [remaining.pop()]
                    while stack:
                        v = stack.pop()
                        for edge in adjacency[v]:
                            other = edge.other_vert(v)
                            if other in remaining:
                                remaining.remove(other)
                                stack.append(other)
                    loops += 1
                if kind == "bridge":
                    require(loops == 2, "Bridge requires exactly two boundary loops", "AMBIGUOUS_SELECTION", loopCount=loops)
                    created = bmesh.ops.bridge_loops(bm, edges=selected,
                        twist_offset=integer(feature.get("twist", 0), "twist", 0, MAX_ELEMENTS))["faces"]
                else:
                    created = bmesh.ops.holes_fill(bm, edges=selected,
                        sides=integer(feature.get("sides", 0), "sides", 0, MAX_ELEMENTS))["faces"]
                require(created, f"Blender {kind} created no faces", "NATIVE_OPERATION_FAILED")
            elif kind == "transform":
                require(any(k in feature for k in ("translation", "rotation", "scale")), "Transform requires translation, rotation or scale")
                verts = selected if domain == "vertices" else list({v for el in selected for v in el.verts})
                translation = vector(feature.get("translation", [0, 0, 0]), "translation")
                rotation = vector(feature.get("rotation", [0, 0, 0]), "rotation")
                scale = vector(feature.get("scale", [1, 1, 1]), "scale")
                require(all(abs(s) > 1e-12 for s in scale), "Transform scale must be nonzero")
                if frame is not None:
                    require("pivot" not in feature, "transform.frame and pivot are exclusive", field="feature.pivot")
                    operation = Matrix.Translation(translation) @ Euler(rotation, "XYZ").to_matrix().to_4x4() @ Matrix.Diagonal((*scale, 1))
                    mat = frame @ operation @ frame.inverted()
                else:
                    pivot = Vector(vector(feature.get("pivot", [0, 0, 0]), "pivot"))
                    mat = Matrix.Translation(translation) @ Matrix.Translation(pivot) @ Euler(rotation, "XYZ").to_matrix().to_4x4()
                    mat = mat @ Matrix.Diagonal((*scale, 1)) @ Matrix.Translation(-pivot)
                bmesh.ops.transform(bm, matrix=mat, verts=verts)
            reconcile_bmesh_ids(bm, before, self.allocator)
            bm.normal_update()
            result = mesh.copy()
            if added_material is not None:
                result.materials.append(added_material)
            bm.to_mesh(result)
            result.update()
            return result
        except Exception:
            remove_mesh(result)
            raise
        finally:
            bm.free()

    def bisect(self, bm, selected, feature):
        point = Vector(vector(feature.get("planePoint"), "bisect.planePoint"))
        normal = Vector(vector(feature.get("planeNormal"), "bisect.planeNormal"))
        require(normal.length_squared>1e-20, "Bisect planeNormal must be nonzero")
        normal.normalize()
        inner = boolean(feature.get("clearInner", False), "clearInner")
        outer = boolean(feature.get("clearOuter", False), "clearOuter")
        fill = boolean(feature.get("fill", False), "fill")
        require(not (inner and outer), "Bisect cannot clear both half spaces")
        require(not fill or inner!=outer, "Filled bisect requires exactly one clear side")
        vertices = {v for face in selected for v in face.verts}
        distances = [(v.co-point).dot(normal) for v in vertices]
        extent = max((v.co-point).length for v in vertices)
        epsilon = max(1e-8,extent*1e-7)
        require(min(distances)<-epsilon and max(distances)>epsilon,
                "Selected region does not cross the bisect plane", "BISECT_NO_CROSSING")
        geometry = list(set(selected)|{e for f in selected for e in f.edges}|vertices)
        result = bmesh.ops.bisect_plane(bm,geom=geometry,dist=epsilon,plane_co=point,plane_no=normal,
                                       use_snap_center=False,clear_inner=inner,clear_outer=outer)
        cut = [e for e in result["geom_cut"] if isinstance(e,bmesh.types.BMEdge) and e.is_valid]
        require(cut, "Native bisect created no cut edges", "NATIVE_OPERATION_FAILED")
        if not fill:
            return
        cut = [edge for edge in cut if edge.is_boundary]
        require(cut, "Filled bisect has no exposed cut contour", "BISECT_FILL_FAILED")
        adjacency = {}
        for edge in cut:
            for vertex in edge.verts:
                adjacency.setdefault(vertex,[]).append(edge)
        require(all(len(es)==2 for es in adjacency.values()),
                "Bisect cap needs complete closed nonbranching contours", "BISECT_FILL_FAILED")
        remaining, loops = set(cut), []
        while remaining:
            first = remaining.pop()
            loop = [first.verts[0],first.verts[1]]
            current = first.verts[1]
            while current != loop[0]:
                edge = next((edge for edge in adjacency[current] if edge in remaining),None)
                require(edge is not None,"Bisect contour is not closed","BISECT_FILL_FAILED")
                remaining.remove(edge)
                current = edge.other_vert(current)
                if current != loop[0]:
                    loop.append(current)
            require(len(loop)>=3,"Bisect contour is degenerate","BISECT_FILL_FAILED")
            loops.append(loop)
        x,y,_ = oriented_frame(normal,(0,1,0))
        polygons = [[((v.co-point).dot(x),(v.co-point).dot(y)) for v in loop] for loop in loops]
        def inside(p, polygon):
            hit = False
            for a,b in zip(polygon,polygon[1:]+polygon[:1]):
                if (a[1]>p[1])!=(b[1]>p[1]) and p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]:
                    hit = not hit
            return hit
        for i, polygon in enumerate(polygons):
            require(not any(inside(polygon[0],other) for j,other in enumerate(polygons) if i!=j),
                    "Bisect nested cap contours require a hole-aware cap operation", "BISECT_FILL_AMBIGUOUS")
        faces = bmesh.ops.holes_fill(bm,edges=cut,sides=0)["faces"]
        require(faces and all(edge.is_manifold for edge in cut),
                "Native bisect cap did not seal all cut edges", "BISECT_FILL_FAILED")
        expected = -normal if inner else normal
        uv = bm.loops.layers.uv.active
        bm.normal_update()
        for face in faces:
            if face.normal.dot(expected)<0:
                bmesh.ops.reverse_faces(bm,faces=[face])
            face.smooth = False
            if uv is not None:
                for corner in face.loops:
                    delta = corner.vert.co-point
                    corner[uv].uv = delta.dot(x),delta.dot(y)
        bm.normal_update()

    def uv_feature(self, mesh, feature, stamp, *, results=None):
        method = feature.get("method")
        require(method in {"smart", "cube"}, "UV method must be smart or cube", "UNSUPPORTED_FEATURE")
        if method == "smart":
            require("cubeSize" not in feature, "cubeSize applies only to cube UV projection")
            kwargs = {"angle_limit": number(feature.get("angleLimit", math.radians(66)), "angleLimit", 0, math.pi/2),
                      "island_margin": number(feature.get("islandMargin", 0.02), "islandMargin", 0, 1)}
        else:
            require("angleLimit" not in feature and "islandMargin" not in feature,
                    "angleLimit/islandMargin apply only to smart UV projection")
            kwargs = {"cube_size": number(feature.get("cubeSize", 1), "cubeSize", 1e-9),
                      "correct_aspect": False, "clip_to_bounds": False, "scale_to_bounds": False}
        result, obj = mesh.copy(), None
        try:
            obj = self.object(result, "NativeUVStaging")
            with active_object(obj):
                bpy.ops.object.mode_set(mode="EDIT")
                bm = bmesh.from_edit_mesh(result)
                bm.select_mode = {"FACE"}
                for seq in (bm.faces, bm.edges, bm.verts):
                    for el in seq:
                        el.select_set(False)
                selection = feature.get("selection", {"domain": "faces"})
                domain, selected, _, _ = resolve(bm, selection, stamp, results=results)
                require(domain == "faces" and selected, "UV projection requires a nonempty face selection", "EMPTY_SELECTION")
                for face in selected:
                    face.select_set(True)
                bm.select_flush_mode()
                bmesh.update_edit_mesh(result, loop_triangles=False, destructive=False)
                status = bpy.ops.uv.smart_project(**kwargs) if method == "smart" else bpy.ops.uv.cube_project(**kwargs)
                require("FINISHED" in status, "Native UV operator did not finish", "NATIVE_OPERATION_FAILED")
                bpy.ops.object.mode_set(mode="OBJECT")
            return result
        except Exception:
            if obj is not None and obj.mode != "OBJECT":
                bpy.ops.object.mode_set(mode="OBJECT")
            if obj is not None:
                bpy.data.objects.remove(obj, do_unlink=True)
                obj = None
            remove_mesh(result)
            raise
        finally:
            if obj is not None:
                bpy.data.objects.remove(obj, do_unlink=True)

    def modifier_feature(self, mesh, feature, matrix, targets):
        kind = feature["type"]
        obj = helper = helper_mesh = result = None
        before = mesh_identity(mesh)
        try:
            obj = self.object(mesh, "NativeModifierStaging")
            obj.matrix_world = Matrix.Identity(4)
            if kind == "subdivision":
                levels = integer(feature.get("levels", 1), "subdivision.levels", 0, 5)
                require(len(mesh.polygons) * 4**levels <= MAX_ELEMENTS and len(mesh.loops) * 4**levels <= MAX_LOOPS,
                        "Subdivision exceeds conservative geometry budget", "GEOMETRY_BUDGET")
                mod = obj.modifiers.new("NativeSubdivision", "SUBSURF")
                subtype = feature.get("subdivisionType", "CATMULL_CLARK")
                require(subtype in {"CATMULL_CLARK", "SIMPLE"}, "subdivisionType must be CATMULL_CLARK or SIMPLE")
                mod.subdivision_type = subtype
                mod.levels = mod.render_levels = levels
            elif kind == "solidify":
                require(len(mesh.vertices)*2 <= MAX_ELEMENTS and len(mesh.loops)*3 <= MAX_LOOPS,
                        "Solidify exceeds conservative geometry budget", "GEOMETRY_BUDGET")
                mod = obj.modifiers.new("NativeSolidify", "SOLIDIFY")
                mod.thickness = number(feature.get("thickness", 0.1), "solidify.thickness")
                mod.offset = number(feature.get("offset", 0), "solidify.offset", -1, 1)
                mod.use_even_offset = boolean(feature.get("evenOffset", True), "evenOffset")
                mod.use_rim = True
            elif kind == "mirror":
                mod = obj.modifiers.new("NativeMirror", "MIRROR")
                axis = feature.get("axis", "X")
                axes = [axis] if isinstance(axis, str) else axis
                require(isinstance(axes, list) and axes and len(set(axes)) == len(axes)
                        and all(a in {"X", "Y", "Z"} for a in axes), "mirror.axis must be X/Y/Z or an array of distinct axis names")
                require(len(mesh.vertices)*2**len(axes) <= MAX_ELEMENTS and len(mesh.loops)*2**len(axes) <= MAX_LOOPS,
                        "Mirror exceeds geometry budget", "GEOMETRY_BUDGET")
                mod.use_axis = tuple(a in axes for a in ("X", "Y", "Z"))
                mod.use_mirror_merge = boolean(feature.get("merge", True), "merge")
                mod.merge_threshold = number(feature.get("mergeThreshold", 0.0001), "mergeThreshold", 0, 1)
                pivot = vector(feature.get("pivot", [0, 0, 0]), "mirror.pivot")
                helper = self.object(None, "NativeMirrorPivot")
                helper.matrix_world = Matrix.Translation(pivot)
                mod.mirror_object = helper
            elif kind == "array":
                count = integer(feature.get("count", 2), "array.count", 1, 1024)
                require(len(mesh.vertices)*count <= MAX_ELEMENTS and len(mesh.loops)*count <= MAX_LOOPS,
                        "Array exceeds geometry budget", "GEOMETRY_BUDGET")
                mod = obj.modifiers.new("NativeArray", "ARRAY")
                mod.fit_type = "FIXED_COUNT"
                mod.count = count
                mod.use_relative_offset = False
                mod.use_constant_offset = True
                mod.constant_offset_displace = vector(feature.get("offset", [1, 0, 0]), "array.offset")
                mod.use_merge_vertices = boolean(feature.get("merge", False), "merge")
                mod.merge_threshold = number(feature.get("mergeThreshold", 0.0001), "mergeThreshold", 0, 1)
            elif kind == "boolean":
                target_id = identifier(feature.get("target"), "boolean.target")
                require(target_id in targets, "Boolean target is absent", "MISSING_DEPENDENCY", targetId=target_id)
                target = targets[target_id]["object"]
                for operand, role in ((mesh, "owner"), (target.data, "target")):
                    bm = bmesh.new()
                    try:
                        bm.from_mesh(operand)
                        require(bm.faces and all(e.is_manifold for e in bm.edges) and
                                all(v.link_faces for v in bm.verts) and abs(bm.calc_volume(signed=True)) > 1e-15,
                                "EXACT boolean requires closed, nonzero-volume manifold operands",
                                "BOOLEAN_REQUIRES_SOLID", operand=role, targetId=target_id)
                    finally:
                        bm.free()
                require(len(mesh.vertices)+len(target.data.vertices) <= MAX_ELEMENTS,
                        "Boolean operands exceed geometry budget", "GEOMETRY_BUDGET")
                operation = feature.get("operation", "DIFFERENCE")
                require(operation in {"DIFFERENCE", "UNION", "INTERSECT"}, "Invalid boolean operation")
                # Keep exact affine geometry in owner-local mesh coordinates;
                # Blender Object transforms would decompose a sheared matrix.
                relative = matrix.inverted() @ node_matrix(targets[target_id]["node"])
                helper_mesh = target.data.copy()
                helper_mesh.use_fake_user = False
                helper_mesh.transform(relative)
                if relative.to_3x3().determinant() < 0:
                    bm = bmesh.new()
                    try:
                        bm.from_mesh(helper_mesh)
                        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
                        bm.to_mesh(helper_mesh)
                    finally:
                        bm.free()
                helper_mesh.update()
                helper = self.object(helper_mesh, "NativeBooleanTarget")
                mod = obj.modifiers.new("NativeExactBoolean", "BOOLEAN")
                mod.solver = "EXACT"
                mod.operation = operation
                mod.object = helper
                mod.use_self = boolean(feature.get("selfIntersection", False), "selfIntersection")
                mod.use_hole_tolerant = boolean(feature.get("holeTolerant", False), "holeTolerant")
                require(hasattr(mod, "material_mode"), "This Blender lacks Boolean material transfer API", "UNSUPPORTED_BACKEND_API")
                mod.material_mode = "TRANSFER"
            else:
                raise NativeError("UNSUPPORTED_FEATURE", f"Unsupported native modifier: {kind}")
            bpy.context.view_layer.update()
            depsgraph = bpy.context.evaluated_depsgraph_get()
            result = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph),
                        preserve_all_data_layers=True, depsgraph=depsgraph)
            require(result is not None, f"Blender failed to evaluate {kind}", "NATIVE_OPERATION_FAILED")
            check_budget(result)
            kept = reconcile_evaluated_ids(result, before, self.allocator)
            warnings = [{"code": "MODIFIER_ID_CORRESPONDENCE", "featureId": feature["id"],
                         "retained": kept, "message": "Only unchanged, unique element correspondences retain IDs; generated/interpolated elements have new IDs."}]
            result.update()
            return result, warnings
        except Exception:
            remove_mesh(result)
            raise
        finally:
            if obj is not None:
                bpy.data.objects.remove(obj, do_unlink=True)
            if helper is not None:
                bpy.data.objects.remove(helper, do_unlink=True)
            remove_mesh(helper_mesh)

def mesh_bounds(mesh):
    if not mesh.vertices:
        return {"min": [0, 0, 0], "max": [0, 0, 0]}
    coords = [tuple(v.co) for v in mesh.vertices]
    return {"min": [min(c[i] for c in coords) for i in range(3)],
            "max": [max(c[i] for c in coords) for i in range(3)]}

def mesh_counts(mesh):
    mesh.calc_loop_triangles()
    return {"vertices": len(mesh.vertices), "edges": len(mesh.edges),
            "faces": len(mesh.polygons), "triangles": len(mesh.loop_triangles)}

def export_mesh(record):
    mesh = record["object"].data
    check_budget(mesh)
    mesh.calc_loop_triangles()
    require(len(mesh.loop_triangles) <= MAX_TRIANGLES, "Export exceeds triangle budget", "GEOMETRY_BUDGET")
    require(hasattr(mesh, "corner_normals") and len(mesh.corner_normals) == len(mesh.loops),
            "Blender corner-normal API is unavailable", "UNSUPPORTED_BACKEND_API")
    face_ids = mesh.attributes[ID_ATTRIBUTES["faces"][0]].data
    vertex_ids = mesh.attributes[ID_ATTRIBUTES["vertices"][0]].data
    uv = mesh.uv_layers.active
    detail_uv = mesh.uv_layers.get("ModelerDetailUV")
    detail_uvs = []
    warnings = list(record.get("warnings", []))
    if uv is None and mesh.loops:
        warnings.append({"code": "NO_UV_LAYER", "message": "No UV layer; exported cornerUV is empty. Add a uv feature before texturing."})
    vertices = [number(c, "export vertex") for v in mesh.vertices for c in v.co]
    indices, normals, uvs, material_indices, triangle_ids = [], [], [], [], []
    for triangle in mesh.loop_triangles:
        indices.extend(triangle.vertices)
        material_indices.append(triangle.material_index)
        triangle_ids.append(face_ids[triangle.polygon_index].value)
        for loop in triangle.loops:
            normals.extend(number(c, "export normal") for c in mesh.corner_normals[loop].vector)
            if uv is not None:
                uvs.extend(number(c, "export UV") for c in uv.data[loop].uv)
            if detail_uv is not None:
                detail_uvs.extend(number(c, "export detail UV") for c in detail_uv.data[loop].uv)
    slots = []
    for material in mesh.materials:
        if material is None:
            slots.append(None)
        elif "modeler_material" in material:
            slots.append(json.loads(material["modeler_material"]))
        else:
            slots.append({"color": list(material.diffuse_color), "metalness": material.metallic,
                          "roughness": material.roughness})
    exported = {"vertices": vertices, "indices": indices, "cornerNormals": normals,
                "cornerUV": uvs, "triangleMaterialIndices": material_indices,
                "triangleFaceIds": triangle_ids, "vertexIds": [x.value for x in vertex_ids]}
    if detail_uv is not None:
        exported["cornerDetailUV"] = detail_uvs
    for name, domain, field in (("modeler_source_vertex_id","POINT","vertexSourceIds"),
                                ("modeler_source_face_id","FACE","triangleSourceFaceIds"),
                                ("modeler_instance_index","POINT","vertexInstanceIndices"),
                                ("modeler_instance_index_face","FACE","triangleInstanceIndices")):
        attribute = mesh.attributes.get(name)
        if attribute is not None and attribute.domain==domain and attribute.data_type=="INT":
            exported[field] = [attribute.data[t.polygon_index].value for t in mesh.loop_triangles] if domain=="FACE" else [x.value for x in attribute.data]
    return {"id": record["node"]["id"], "sourceHash": record["sourceHash"],
            "topologyStamp": record["topologyStamp"], **mesh_hashes(record), "mesh": exported,
            "counts": mesh_counts(mesh), "bounds": mesh_bounds(mesh), "materialSlots": slots,
            "relations": record.get("relations", [])[:16], "warnings": warnings}
