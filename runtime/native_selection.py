"""Local predicates and honest persistent INT element identity (main thread only)."""
from __future__ import annotations
import hashlib
import math
import struct
from collections import Counter
import bmesh
from mathutils import Vector

ID_ATTRIBUTES = {"vertices": ("modeler_vertex_id", "POINT"),
                 "edges": ("modeler_edge_id", "EDGE"),
                 "faces": ("modeler_face_id", "FACE")}
MAX_QUERY = 128
MAX_ELEMENTS = 500_000
MAX_EDGES = 1_000_000
MAX_LOOPS = 3_000_000
MAX_TRIANGLES = 1_000_000

class NativeError(Exception):
    def __init__(self, code, message, detail=None):
        super().__init__(message)
        self.code, self.detail = code, dict(detail or {})
    def at(self, **detail):
        for key, value in detail.items():
            self.detail.setdefault(key, value)
        return self

def require(condition, message, code="INVALID_ARGUMENT", **detail):
    if not condition:
        raise NativeError(code, message, detail)

def mapping(value, field):
    require(isinstance(value, dict), f"{field} must be an object")
    return value

def keys(value, allowed, field):
    mapping(value, field)
    unknown = sorted(set(value) - set(allowed))
    bounded = ", ".join(str(name)[:96] for name in unknown[:16])
    require(not unknown, f"Unknown {field} fields: {bounded}")

def number(value, field, low=None, high=None):
    require(isinstance(value, (int, float)) and not isinstance(value, bool)
            and math.isfinite(value), f"{field} must be a finite number")
    require(low is None or value >= low, f"{field} must be >= {low}")
    require(high is None or value <= high, f"{field} must be <= {high}")
    return float(value)

def integer(value, field, low=0, high=2_147_483_647):
    require(isinstance(value, int) and not isinstance(value, bool)
            and low <= value <= high, f"{field} must be an integer in [{low}, {high}]")
    return value

def boolean(value, field):
    require(isinstance(value, bool), f"{field} must be boolean")
    return value

def vector(value, field, size=3):
    require(isinstance(value, list) and len(value) == size, f"{field} must contain {size} numbers")
    return tuple(number(x, f"{field}[{i}]") for i, x in enumerate(value))

def identifier(value, field):
    require(isinstance(value, str) and 0 < len(value) <= 256 and "\x00" not in value,
            f"{field} must be a nonempty string of at most 256 characters")
    return value

class IdAllocator:
    def __init__(self, next_id=1):
        self.next_id = integer(next_id, "next element ID", 1)
    def take(self):
        require(self.next_id < 2_147_483_647, "Element ID space exhausted; create a new asset", "ID_SPACE_EXHAUSTED")
        result = self.next_id
        self.next_id += 1
        return result

def domains(bm):
    return {"vertices": bm.verts, "edges": bm.edges, "faces": bm.faces}

def layers(bm):
    return {domain: seq.layers.int.get(ID_ATTRIBUTES[domain][0]) or seq.layers.int.new(ID_ATTRIBUTES[domain][0])
            for domain, seq in domains(bm).items()}

def check_budget(mesh_or_bm):
    if isinstance(mesh_or_bm, bmesh.types.BMesh):
        v, e, f = len(mesh_or_bm.verts), len(mesh_or_bm.edges), len(mesh_or_bm.faces)
        loops = sum(len(face.verts) for face in mesh_or_bm.faces)
    else:
        v, e, f = len(mesh_or_bm.vertices), len(mesh_or_bm.edges), len(mesh_or_bm.polygons)
        loops = len(mesh_or_bm.loops)
    require(v <= MAX_ELEMENTS and e <= MAX_EDGES and f <= MAX_ELEMENTS and loops <= MAX_LOOPS
            and loops - 2 * f <= MAX_TRIANGLES, "Geometry exceeds the worker mesh budget", "GEOMETRY_BUDGET",
            counts={"vertices": v, "edges": e, "faces": f, "corners": loops})

def fresh_ids(bm, allocator):
    ls = layers(bm)
    for domain, seq in domains(bm).items():
        for element in seq:
            element[ls[domain]] = allocator.take()

def snapshot_ids(bm):
    """Record actual BMesh objects, not collection indices, before an operation."""
    ls = layers(bm)
    result = {}
    for domain, seq in domains(bm).items():
        result[domain] = {el: (el[ls[domain]], None if domain == "vertices" else
                              tuple(v[ls["vertices"]] for v in el.verts)) for el in seq}
    return result

def reconcile_bmesh_ids(bm, previous, allocator):
    ls = layers(bm)
    for domain, seq in domains(bm).items():
        for element in seq:
            old = previous[domain].get(element)
            signature = None if domain == "vertices" else tuple(v[ls["vertices"]] for v in element.verts)
            element[ls[domain]] = old[0] if old and old[1] == signature else allocator.take()
    check_budget(bm)

def cyclic(values):
    if not values:
        return values
    start = values.index(min(values))
    return values[start:] + values[:start]

def mesh_identity(mesh):
    ids = {d: [x.value for x in mesh.attributes[n].data] for d, (n, _) in ID_ATTRIBUTES.items()}
    return {"vertices": {pid: tuple(v.co) for v, pid in zip(mesh.vertices, ids["vertices"])},
            "edges": {pid: tuple(sorted(ids["vertices"][i] for i in e.vertices)) for e, pid in zip(mesh.edges, ids["edges"])},
            "faces": {pid: cyclic(tuple(ids["vertices"][i] for i in p.vertices)) for p, pid in zip(mesh.polygons, ids["faces"])}}

def reconcile_evaluated_ids(mesh, before, allocator):
    """Keep unique, geometrically proven survivors; invalidate interpolated/copied IDs."""
    retained, kept_counts = {}, {}
    for domain, (name, native_domain) in ID_ATTRIBUTES.items():
        attr = mesh.attributes.get(name)
        if attr is None or attr.data_type != "INT" or attr.domain != native_domain:
            if attr is not None:
                mesh.attributes.remove(attr)
            attr = mesh.attributes.new(name=name, type="INT", domain=native_domain)
        old_values = [item.value for item in attr.data]
        counts, kept = Counter(old_values), 0
        seq = getattr(mesh, "polygons" if domain == "faces" else domain)
        for element, item, pid in zip(seq, attr.data, old_values):
            known = before[domain].get(pid)
            if domain == "vertices":
                match = known is not None and tuple(element.co) == known
            elif domain == "edges":
                match = known == tuple(sorted(retained["vertices"][i] for i in element.vertices))
            else:
                match = known == cyclic(tuple(retained["vertices"][i] for i in element.vertices))
            if pid > 0 and counts[pid] == 1 and match:
                item.value = pid
                kept += 1
            else:
                item.value = allocator.take()
        retained[domain] = [item.value for item in attr.data]
        kept_counts[domain] = kept
    return kept_counts

def topology_stamp(mesh):
    ids = {d: [x.value for x in mesh.attributes[n].data] for d, (n, _) in ID_ATTRIBUTES.items()}
    digest = hashlib.sha256(b"modeler-topology-v1\0")
    for domain, seq in (("vertices", mesh.vertices), ("edges", mesh.edges), ("faces", mesh.polygons)):
        digest.update(domain.encode("ascii"))
        for pid, element in sorted(zip(ids[domain], seq), key=lambda pair: pair[0]):
            digest.update(struct.pack("<I", pid))
            if domain != "vertices":
                verts = tuple(ids["vertices"][i] for i in element.vertices)
                verts = tuple(sorted(verts)) if domain == "edges" else cyclic(verts)
                digest.update(struct.pack("<I", len(verts)))
                digest.update(struct.pack("<" + "I" * len(verts), *verts))
    return digest.hexdigest()

def validate_ids(mesh):
    seen = set()
    for domain, (name, native_domain) in ID_ATTRIBUTES.items():
        attr = mesh.attributes.get(name)
        require(attr is not None and attr.domain == native_domain and attr.data_type == "INT",
                f"Missing {domain} identity attribute", "INVALID_CACHE")
        for item in attr.data:
            require(0 < item.value < 2_147_483_647 and item.value not in seen,
                    "Invalid or duplicate persistent element ID", "INVALID_CACHE")
            seen.add(item.value)
    return max(seen, default=0)

def properties(element, domain):
    if domain == "vertices":
        return element.co, element.normal, None, any(e.is_boundary for e in element.link_edges), None
    if domain == "edges":
        centre = (element.verts[0].co + element.verts[1].co) * 0.5
        normal = sum((f.normal for f in element.link_faces), Vector((0, 0, 0)))
        if normal.length_squared:
            normal.normalize()
        angle = element.calc_face_angle() if len(element.link_faces) == 2 else None
        return centre, normal, element.calc_length(), element.is_boundary, angle
    return element.calc_center_median(), element.normal, None, any(e.is_boundary for e in element.edges), None

def _resolve_predicate(bm, selection, stamp, *, query=False, paginate=True):
    keys(selection, {"domain", "ids", "where", "limit", "offset", "topologyStamp"}, "selection")
    domain = selection.get("domain")
    require(domain in ID_ATTRIBUTES, "selection.domain must be vertices, edges or faces")
    require(not ("ids" in selection and "where" in selection), "selection accepts ids OR where, not both")
    supplied_stamp = selection.get("topologyStamp")
    if supplied_stamp is not None:
        require(isinstance(supplied_stamp, str) and supplied_stamp == stamp,
                "Selection topologyStamp does not match this feature input", "STALE_SELECTION",
                expectedTopologyStamp=stamp, suppliedTopologyStamp=supplied_stamp)
    wanted = None
    if "ids" in selection:
        require(supplied_stamp is not None, "Explicit element IDs require topologyStamp", "TOPOLOGY_STAMP_REQUIRED")
        require(isinstance(selection["ids"], list) and len(selection["ids"]) <= MAX_ELEMENTS, "selection.ids must be a bounded array")
        wanted = set(integer(pid, "selection ID", 1) for pid in selection["ids"])
        require(len(wanted) == len(selection["ids"]), "selection.ids contains duplicates")
    where = selection.get("where", {})
    keys(where, {"bounds", "near", "normal", "boundary", "angle", "length"}, "selection.where")
    bounds = near = normal = length = angle = None
    if "bounds" in where:
        keys(where["bounds"], {"min", "max"}, "bounds")
        bounds = vector(where["bounds"].get("min"), "bounds.min"), vector(where["bounds"].get("max"), "bounds.max")
        require(all(a <= b for a, b in zip(*bounds)), "bounds.min must not exceed max")
    if "near" in where:
        keys(where["near"], {"point", "distance"}, "near")
        near = Vector(vector(where["near"].get("point"), "near.point")), number(where["near"].get("distance"), "near.distance", 0)
    if "normal" in where:
        keys(where["normal"], {"direction", "minDot"}, "normal")
        direction = Vector(vector(where["normal"].get("direction"), "normal.direction"))
        require(direction.length_squared > 0, "normal.direction must be nonzero")
        direction.normalize()
        normal = direction, number(where["normal"].get("minDot", 0.9), "normal.minDot", -1, 1)
    if "boundary" in where:
        boolean(where["boundary"], "boundary")
    for name in ("length", "angle"):
        if name in where:
            require(domain == "edges", f"{name} predicates are supported only for edges")
            keys(where[name], {"min", "max"}, name)
            lo = number(where[name].get("min", 0), name + ".min", 0)
            hi = number(where[name].get("max", math.pi if name == "angle" else 1e30), name + ".max", lo)
            if name == "length":
                length = lo, hi
            else:
                angle = lo, hi
    limit = integer(selection.get("limit", MAX_QUERY if query else MAX_ELEMENTS), "selection.limit", 1, MAX_QUERY if query else MAX_ELEMENTS)
    offset = integer(selection.get("offset", 0), "selection.offset", 0, MAX_ELEMENTS)
    bm.normal_update()
    layer = layers(bm)[domain]
    matches, found = [], set()
    for element in domains(bm)[domain]:
        pid = element[layer]
        if wanted is not None and pid not in wanted:
            continue
        found.add(pid)
        centre, nrm, edge_length, boundary, edge_angle = properties(element, domain)
        if bounds and not all(bounds[0][i] <= centre[i] <= bounds[1][i] for i in range(3)):
            continue
        if near and (centre - near[0]).length > near[1]:
            continue
        if normal and (not nrm.length_squared or nrm.dot(normal[0]) < normal[1]):
            continue
        if "boundary" in where and boundary != where["boundary"]:
            continue
        if length and not length[0] <= edge_length <= length[1]:
            continue
        if angle and (edge_angle is None or not angle[0] <= edge_angle <= angle[1]):
            continue
        matches.append((pid, element))
    if wanted is not None and wanted - found:
        missing = sorted(wanted - found)
        raise NativeError("MISSING_SELECTION_IDS", "Some explicit IDs no longer exist in this domain",
                          {"missingIds": missing[:MAX_QUERY], "missingCount": len(missing)})
    matches.sort(key=lambda pair: pair[0])
    return domain, [el for _, el in (matches[offset:offset + limit] if paginate else matches)], len(matches), offset


def _neighbours(element, domain):
    if domain == "vertices":
        return {edge.other_vert(element) for edge in element.link_edges}
    if domain == "edges":
        return {edge for vertex in element.verts for edge in vertex.link_edges if edge != element}
    return {face for edge in element.edges for face in edge.link_faces if face != element}


def _quad_neighbours(edge, mode):
    require(1 <= len(edge.link_faces) <= 2 and all(len(face.verts) == 4 for face in edge.link_faces),
            f"{mode} requires quad surface edges with one or two adjacent faces", "INVALID_SELECTION_TOPOLOGY")
    if mode == "ring":
        return {other for face in edge.link_faces for other in face.edges
                if not any(vertex in edge.verts for vertex in other.verts)}
    result = set()
    for vertex in edge.verts:
        incident = list(vertex.link_edges)
        require(all(1 <= len(item.link_faces) <= 2 for item in incident)
                and all(len(face.verts) == 4 for face in vertex.link_faces),
                "loop encountered a non-manifold or non-quad vertex fan", "INVALID_SELECTION_TOPOLOGY")
        boundary = any(item.is_boundary for item in incident)
        require((not boundary and len(incident) == 4 and len(vertex.link_faces) == 4)
                or (boundary and len(incident) in {2, 3} and len(vertex.link_faces) == len(incident)-1),
                "loop continuation is ambiguous at an extraordinary vertex", "AMBIGUOUS_SELECTION")
        candidates = [item for item in incident if item != edge
                      and not any(face in edge.link_faces for face in item.link_faces)]
        require(len(candidates) <= 1, "loop has more than one topological continuation", "AMBIGUOUS_SELECTION")
        if candidates:
            result.add(candidates[0])
    return result


def _expand(bm, domain, seed_domain, seed, expansion):
    keys(expansion, {"type", "steps"}, "selection.expand")
    mode = expansion.get("type")
    require(isinstance(mode, str) and mode in {"connected", "grow", "boundary", "loop", "ring"}, "Unsupported selection.expand.type")
    steps = integer(expansion.get("steps", 1), "selection.expand.steps", 1, 32)
    if mode in {"connected", "boundary"}:
        require(steps == 1, f"{mode} is a complete component/contour operation and accepts only steps=1")
    if mode == "boundary":
        require(domain == "edges" and seed_domain in {"faces", "edges"},
                "boundary outputs edges from a face region or boundary-edge seeds")
        if seed_domain == "faces":
            region = set(seed)
            return {edge for face in region for edge in face.edges
                    if sum(link in region for link in edge.link_faces) == 1}
        require(all(edge.is_boundary for edge in seed),
                "Edge boundary expansion requires seeds with exactly one incident face", "INVALID_SELECTION_TOPOLOGY")
        result, frontier = set(seed), set(seed)
        while frontier:
            adjacent = {other for edge in frontier for vertex in edge.verts
                        for other in vertex.link_edges if other.is_boundary}
            frontier = adjacent-result
            result.update(frontier)
        return result
    require(seed_domain == domain, "Expansion seed domain must match its output domain")
    require(mode not in {"loop", "ring"} or domain == "edges", f"{mode} supports only edge selections")
    result, frontier = set(seed), set(seed)
    remaining = None if mode == "connected" else steps
    while frontier and (remaining is None or remaining > 0):
        adjacent = set()
        for element in frontier:
            adjacent.update(_quad_neighbours(element, mode) if mode in {"loop", "ring"} else _neighbours(element, domain))
        frontier = adjacent-result
        if mode in {"loop", "ring"}:
            # Returning an edge also commits to its quad/manifold contract, even
            # when steps ends here and it will never become a traversal frontier.
            for element in frontier:
                _quad_neighbours(element, mode)
        result.update(frontier)
        if remaining is not None:
            remaining -= 1
    return result


def resolve(bm, selection, stamp, *, query=False, results=None, paginate=True, _depth=1, _count=None):
    """One resolver for queries, editing, frame definitions and feature result sets."""
    counter = [0] if _count is None else _count
    counter[0] += 1
    require(_depth <= 4 and counter[0] <= 8,
            "Selection recursion exceeds depth4/sets8", "SELECTION_RECURSION_BUDGET")
    keys(selection, {"domain", "ids", "where", "limit", "offset", "topologyStamp",
                     "seed", "expand", "combine", "sets", "fromFeature"}, "selection")
    domain = selection.get("domain")
    require(isinstance(domain, str) and domain in ID_ATTRIBUTES, "selection.domain must be vertices, edges or faces")
    supplied = selection.get("topologyStamp")
    if supplied is not None:
        require(isinstance(supplied, str) and supplied == stamp,
                "Selection topologyStamp does not match this feature input", "STALE_SELECTION",
                expectedTopologyStamp=stamp, suppliedTopologyStamp=supplied)
    base = "ids" in selection or "where" in selection
    expanded = "seed" in selection or "expand" in selection
    combined = "combine" in selection or "sets" in selection
    semantic = "fromFeature" in selection
    require(sum((base, expanded, combined, semantic)) <= 1,
            "Selection accepts only one of ids/where, seed+expand, combine+sets or fromFeature")
    if not (expanded or combined or semantic):
        return _resolve_predicate(bm, selection, stamp, query=query, paginate=paginate)
    limit = integer(selection.get("limit", MAX_QUERY if query else MAX_ELEMENTS), "selection.limit", 1, MAX_QUERY if query else MAX_ELEMENTS)
    offset = integer(selection.get("offset", 0), "selection.offset", 0, MAX_ELEMENTS)
    if expanded:
        require("seed" in selection and "expand" in selection, "Expansion requires selection.seed and selection.expand")
        seed_domain, seed, _, _ = resolve(bm, selection["seed"], stamp, results=results,
                                         _depth=_depth+1, _count=counter)
        matches = _expand(bm, domain, seed_domain, seed, selection["expand"])
    elif combined:
        mode, sets = selection.get("combine"), selection.get("sets")
        require(isinstance(mode, str) and mode in {"union", "intersect", "subtract"}, "selection.combine must be union, intersect or subtract")
        require(isinstance(sets, list) and 1 <= len(sets) <= 8, "selection.sets requires 1..8 selections")
        matches = None
        for child in sets:
            child_domain, selected, _, _ = resolve(bm, child, stamp, results=results,
                                                  _depth=_depth+1, _count=counter)
            require(child_domain == domain, "Combined selection domains must all match")
            values = set(selected)
            if matches is None:
                matches = values
            elif mode == "union":
                matches |= values
            elif mode == "intersect":
                matches &= values
            else:
                matches -= values
    else:
        reference = selection["fromFeature"]
        keys(reference, {"id", "set"}, "selection.fromFeature")
        feature_id = identifier(reference.get("id"), "selection.fromFeature.id")
        name = reference.get("set")
        require(isinstance(name, str) and name in {"created", "affected"}, "selection.fromFeature.set must be created or affected")
        require(results is not None and feature_id in results,
                "Referenced feature result is not available at this input stage", "FEATURE_RESULT_NOT_FOUND", featureId=feature_id)
        wanted = set(results[feature_id][name][domain])
        layer = layers(bm)[domain]
        matches = {element for element in domains(bm)[domain] if element[layer] in wanted}
    bm.normal_update()
    layer = layers(bm)[domain]
    ordered = sorted(matches, key=lambda element: element[layer])
    return domain, ordered[offset:offset+limit] if paginate else ordered, len(ordered), offset


def select_mesh(mesh, selection, stamp, *, geometry=False, results=None):
    bm = bmesh.new()
    try:
        bm.from_mesh(mesh)
        from native_local import selection_bounds, selection_geometry
        domain, matches, total, offset = resolve(bm, selection, stamp, query=True, results=results, paginate=False)
        limit = selection.get("limit", MAX_QUERY)
        selected = matches[offset:offset+limit]
        layer, items = layers(bm)[domain], []
        for element in selected:
            centre, normal, length, boundary, angle = properties(element, domain)
            item = {"id": element[layer], "centre": list(centre), "normal": list(normal), "boundary": boundary}
            if domain == "edges":
                crease = bm.edges.layers.float.get("crease_edge")
                item["crease"] = float(element[crease]) if crease is not None else 0.0
                item["sharp"] = not element.smooth
            elif domain == "faces":
                item["materialIndex"] = element.material_index
                item["smooth"] = element.smooth
            sequence = domains(bm)[domain]
            provenance = sequence.layers.int.get("modeler_source_"+{"vertices":"vertex","edges":"edge","faces":"face"}[domain]+"_id")
            if provenance is not None:
                item["sourceId"] = element[provenance]
            instance = sequence.layers.int.get("modeler_instance_index" if domain=="vertices" else "modeler_instance_index_"+{"edges":"edge","faces":"face"}[domain])
            if instance is not None:
                item["instance"] = element[instance]
            if length is not None:
                item["length"] = length
            if angle is not None:
                item["angle"] = angle
            items.append(item)
        reply = {"domain": domain, "topologyStamp": stamp, "items": items, "total": total,
                 "selectedCount": total, "showingCount": len(items), "bounds": selection_bounds(matches, domain),
                 "offset": offset, "nextOffset": offset + len(items) if offset + len(items) < total else None}
        if geometry:
            reply["selectionGeometry"] = selection_geometry(selected, domain, total)
        return reply
    finally:
        bm.free()
