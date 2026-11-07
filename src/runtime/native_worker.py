"""Private persistent Blender 4.5.15 HTTP geometry worker, protocol 1.

Launch only in a dedicated process:
blender --background --factory-startup --python native_worker.py -- --root ABS --token RANDOM --port 0
No bpy calls leave the main thread. The Host owns canonical source and commits;
this process owns only a replaceable materialization inside its explicit root.
"""
from __future__ import annotations
import argparse
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import sys
import time
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, HTTPServer

# Runtime imports must not write generated files into the plugin checkout.
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
import bmesh
from mathutils import Vector
from native_geometry import (FEATURE_FIELDS, SOURCE_FIELDS, GeometryEngine, canonical,
    content_hash, export_mesh, mesh_bounds, mesh_counts, node_matrix)
from native_materials import (CHANNELS, MAX_BAKE_PIXELS, MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS,
    MaterialSystem, mesh_hashes, uv_info)
from native_orientation import orientation_query
from native_local import (MAX_GEOMETRY_ELEMENTS, MAX_GEOMETRY_FLOATS,
    MAX_RESULT_MEMBERSHIPS, frame_mesh, result_counts, validate_results)
from native_selection import (ID_ATTRIBUTES, MAX_ELEMENTS, MAX_LOOPS, MAX_QUERY,
    IdAllocator, NativeError, boolean, check_budget, fresh_ids, identifier, integer,
    keys, mapping, number, require, select_mesh, topology_stamp, validate_ids)

PROTOCOL = 1
WORKER_VERSION = 1
MAX_REQUEST = 64 * 1024 * 1024
MAX_OUTPUT = 256 * 1024 * 1024
MAX_NODES = 256
MAX_FEATURES = 64
MAX_STAGE_VERTICES = 2_000_000
MAX_STAGE_LOOPS = 12_000_000
MAX_ASSET_VERTICES = 1_000_000
MAX_ASSET_LOOPS = 6_000_000
MAX_REQUEST_CACHE = 128
MAX_STAGE_RESULT_MEMBERSHIPS = 4_000_000


def result_memberships(stage):
    return sum(len(ids) for sets in stage.get("resultSets", {}).values()
               for values in sets.values() for ids in values.values())


def safe_path(root, name, *, output=False):
    require(isinstance(name, str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,179}", name)
            and ".." not in name and ":" not in name, "File must be a safe basename", "UNSAFE_PATH")
    if output:
        require(name.lower().endswith(".json") and name.lower() not in
                {"ready.json", "state.json", "dirty.json"}, "Export requires a non-reserved JSON basename", "UNSAFE_PATH")
        stem = name.split(".", 1)[0].upper()
        require(stem not in {"CON", "PRN", "AUX", "NUL", *("COM"+str(i) for i in range(1,10)),
                             *("LPT"+str(i) for i in range(1,10))}, "Reserved Windows filename", "UNSAFE_PATH")
    result = root / name
    require(not result.is_symlink() and result.resolve().parent == root,
            "File escapes private root or is a symbolic link", "UNSAFE_PATH")
    return result


def atomic_json(root, name, value, *, output=False, max_bytes=MAX_OUTPUT):
    target = safe_path(root, name, output=output)
    temp = safe_path(root, "write-"+secrets.token_hex(12)+".tmp")
    written = 0
    try:
        encoder = json.JSONEncoder(ensure_ascii=False, allow_nan=False, separators=(",", ":"))
        with temp.open("xb") as stream:
            for text in encoder.iterencode(value):
                data = text.encode("utf-8")
                written += len(data)
                require(written <= max_bytes, "Serialized output exceeds byte budget", "OUTPUT_BUDGET")
                stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, target)
        return written
    finally:
        if temp.exists():
            temp.unlink()


def file_hash(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024*1024), b""):
            digest.update(block)
    return digest.hexdigest()


def acquire_root_lock(root):
    stream = safe_path(root, "worker.lock").open("a+b")
    try:
        stream.seek(0, os.SEEK_END)
        if stream.tell() == 0:
            stream.write(b"0")
            stream.flush()
        stream.seek(0)
        if os.name == "nt":
            import msvcrt
            msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        return stream
    except OSError:
        stream.close()
        raise NativeError("ROOT_IN_USE", "Another native worker owns this private asset root")


def remove_object(obj):
    if obj is not None and obj.name in bpy.data.objects:
        bpy.data.objects.remove(obj, do_unlink=True)


class Worker:
    def __init__(self, root):
        self.root = root
        self.scope = hashlib.sha256(os.path.normcase(str(root)).encode("utf-8")).hexdigest()
        self.backend = {"version": bpy.app.version_string, "pid": os.getpid()}
        implementation = hashlib.sha256()
        for module in ("native_worker.py", "native_geometry.py", "native_selection.py", "native_local.py", "native_materials.py", "native_orientation.py", "native_surface.py", "native_detail.py"):
            implementation_file = Path(__file__).resolve().parent / module
            if implementation_file.exists():
                implementation.update(module.encode("utf-8"))
                implementation.update(implementation_file.read_bytes())
        self.backend_key = {"blender": list(bpy.app.version), "worker": WORKER_VERSION,
                            "implementation": implementation.hexdigest()}
        self.backend.update(implementation=self.backend_key["implementation"], workerVersion=WORKER_VERSION)
        self.records, self.stages = {}, {}
        self.requests = OrderedDict()
        self.allocator = IdAllocator()
        self.dirty = False
        self.started = time.monotonic()
        self.recovery_warning = None
        self.materials = MaterialSystem(self.root, safe_path)
        self.initialize_scene()
        self.engine = GeometryEngine(self.scene, self.allocator, self.material)

    def initialize_scene(self):
        state = safe_path(self.root, "state.json")
        blend = safe_path(self.root, "current.blend")
        try:
            if state.exists() and blend.exists() and not safe_path(self.root, "dirty.json").exists():
                require(state.stat().st_size <= MAX_REQUEST, "Private state exceeds budget", "INVALID_CACHE")
                metadata = json.loads(state.read_text(encoding="utf-8"))
                require(metadata.get("scope") == self.scope and metadata.get("backend") == self.backend_key,
                        "Private cache scope/backend mismatch", "INVALID_CACHE")
                require(metadata.get("blendHash") == file_hash(blend), "Private blend hash mismatch", "INVALID_CACHE")
                bpy.ops.wm.open_mainfile(filepath=str(blend), load_ui=False, use_scripts=False)
                self.scene = bpy.context.scene
                manifest = json.loads(self.scene.get("modeler_state", "{}"))
                require(manifest.get("scope") == self.scope and manifest.get("backend") == self.backend_key,
                        "Private blend scope/backend mismatch", "INVALID_CACHE")
                self.restore_manifest(manifest)
                return
        except Exception as exc:
            self.recovery_warning = {"code": "CACHE_REBUILT", "message": "Private materialization was invalid; canonical graph must be rebuilt."}
            print("Native cache validation failed:", type(exc).__name__, flush=True)
        # These are exclusively factory-startup or worker-owned process datablocks.
        for obj in list(bpy.data.objects):
            remove_object(obj)
        for mesh in list(bpy.data.meshes):
            bpy.data.meshes.remove(mesh)
        self.records, self.stages = {}, {}
        self.scene = bpy.context.scene
        self.scene.name = "ModelerPrivateAsset"
        self.scene["modeler_scope"] = self.scope
        self.scene.unit_settings.system = "METRIC"
        self.scene.unit_settings.scale_length = 1

    def restore_manifest(self, manifest):
        rows = manifest.get("nodes", [])
        require(isinstance(rows, list) and len(rows) <= MAX_NODES, "Invalid cached graph", "INVALID_CACHE")
        stages, records, max_id = {}, {}, 0
        for row in manifest.get("stages", []):
            mesh = bpy.data.meshes.get(row["mesh"])
            require(mesh is not None and mesh.get("modeler_stage_key") == row["key"], "Missing scoped stage mesh", "INVALID_CACHE")
            check_budget(mesh)
            max_id = max(max_id, validate_ids(mesh))
            require(topology_stamp(mesh) == row["stamp"], "Cached topology identity mismatch", "INVALID_CACHE")
            require(all(all(__import__("math").isfinite(c) for c in v.co) for v in mesh.vertices),
                    "Cached geometry is non-finite", "INVALID_CACHE")
            results = validate_results(mesh, row.get("resultSets", {}))
            stages[row["key"]] = {"mesh": mesh, "stamp": row["stamp"], "warnings": row.get("warnings", []),
                                  "relations": row.get("relations", []), "resultSets": results}
        for row in rows:
            obj = bpy.data.objects.get(row["object"])
            require(obj is not None and obj.type == "MESH" and row["sourceHash"] in stages,
                    "Missing scoped node object", "INVALID_CACHE")
            stage_mesh = stages[row["sourceHash"]]["mesh"]
            if obj.data != stage_mesh:
                require(any(m and "modeler_material" in m and json.loads(m["modeler_material"]).get("detail") for m in obj.data.materials), "Cached derived mesh has no detail source", "INVALID_CACHE")
                require(validate_ids(obj.data) <= max_id and topology_stamp(obj.data) == row["topologyStamp"], "Cached detail mesh identity differs from stage", "INVALID_CACHE")
                require(len(obj.data.vertices)==len(stage_mesh.vertices) and all(a.co==b.co for a,b in zip(obj.data.vertices,stage_mesh.vertices)), "Cached detail mesh geometry differs from stage", "INVALID_CACHE")
                require(len(obj.data.polygons)==len(stage_mesh.polygons) and all(tuple(a.vertices)==tuple(b.vertices) and a.material_index==b.material_index for a,b in zip(obj.data.polygons,stage_mesh.polygons)), "Cached detail mesh faces differ from stage", "INVALID_CACHE")
                self.materials.ensure_detail_uv(obj)
            require(obj.get("modeler_scope") == self.scope and obj.get("modeler_node_id") == row["node"]["id"],
                    "Cached object scope mismatch", "INVALID_CACHE")
            records[row["node"]["id"]] = dict(row, object=obj, resultSets=stages[row["sourceHash"]]["resultSets"])
        _, plans = self.plan([row["node"] for row in rows])
        for node_id, row in records.items():
            require(row["stages"] == plans[node_id]["keys"] and row["sourceHash"] == plans[node_id]["keys"][-1],
                    "Cached source/dependency hash mismatch", "INVALID_CACHE")
            require(row["topologyStamp"] == stages[row["sourceHash"]]["stamp"], "Cached final stamp mismatch", "INVALID_CACHE")
        self.check_stage_budget(stages)
        self.records, self.stages = records, stages
        self.allocator.next_id = max(integer(manifest.get("nextId", 1), "cached next ID", 1), max_id + 1)
        self.requests = OrderedDict((item["id"], item["value"]) for item in manifest.get("requests", [])[-MAX_REQUEST_CACHE:])
        self.cleanup()

    def manifest(self, records, stages, requests):
        return {"protocol": PROTOCOL, "scope": self.scope, "backend": self.backend_key,
                "nextId": self.allocator.next_id,
                "nodes": [dict({key: value for key, value in row.items() if key != "resultSets"},
                               object=row["object"].name) for row in records.values()],
                "stages": [{"key": key, "mesh": stages[key]["mesh"].name,
                            "stamp": stages[key]["stamp"], "warnings": stages[key].get("warnings", []),
                            "relations": stages[key].get("relations", []),
                            "resultSets": stages[key].get("resultSets", {})} for key in stages],
                "requests": [{"id": rid, "value": value} for rid, value in requests.items()]}

    def persist(self, records, stages, requests):
        old_state = self.scene.get("modeler_state")
        temp = safe_path(self.root, "snapshot-"+secrets.token_hex(12)+".blend")
        try:
            self.scene["modeler_state"] = canonical(self.manifest(records, stages, requests))
            bpy.context.preferences.filepaths.save_version = 0
            status = bpy.ops.wm.save_as_mainfile(filepath=str(temp), check_existing=False, compress=True, copy=True)
            require("FINISHED" in status and temp.exists(), "Private blend save did not finish", "SAVE_FAILED")
            digest = file_hash(temp)
            os.replace(temp, safe_path(self.root, "current.blend"))
            atomic_json(self.root, "state.json", {"protocol": PROTOCOL, "scope": self.scope,
                        "backend": self.backend_key, "blendHash": digest}, max_bytes=65536)
            dirty = safe_path(self.root, "dirty.json")
            if dirty.exists():
                dirty.unlink()
            self.dirty = False
        except Exception:
            if old_state is None:
                if "modeler_state" in self.scene:
                    del self.scene["modeler_state"]
            else:
                self.scene["modeler_state"] = old_state
            self.dirty = True
            try:
                atomic_json(self.root, "dirty.json", {"protocol": PROTOCOL, "rebuild": True}, max_bytes=65536)
            except Exception:
                pass
            raise NativeError("SAVE_FAILED", "Private snapshot could not be persisted; prior in-memory graph is preserved",
                              {"materialization": "previous-preserved", "rebuildOnRestart": True})
        finally:
            if temp.exists():
                temp.unlink()

    def cleanup(self):
        live_objects = {row["object"].name for row in self.records.values()}
        live_meshes = {stage["mesh"].name for stage in self.stages.values()}
        for obj in list(bpy.data.objects):
            if obj.name not in live_objects:
                remove_object(obj)
        for mesh in list(bpy.data.meshes):
            if mesh.name not in live_meshes:
                mesh.use_fake_user = False
                if mesh.users == 0:
                    bpy.data.meshes.remove(mesh)
        for material in list(bpy.data.materials):
            if material.users == 0:
                bpy.data.materials.remove(material)
        for image in list(bpy.data.images):
            if image.get("modeler_image_key") and image.users == 0:
                bpy.data.images.remove(image)

    def check_stage_budget(self, stages):
        require(len(stages) <= 4096 and sum(len(s["mesh"].vertices) for s in stages.values()) <= MAX_STAGE_VERTICES
                and sum(len(s["mesh"].loops) for s in stages.values()) <= MAX_STAGE_LOOPS,
                "Source/feature prefix cache exceeds geometry budget", "STAGE_CACHE_BUDGET")
        require(sum(result_memberships(stage) for stage in stages.values()) <= MAX_STAGE_RESULT_MEMBERSHIPS,
                "Source/feature prefix cache exceeds result membership budget", "FEATURE_RESULT_BUDGET")

    def source_references(self, source, depth=0, path="source", count=None):
        if count is None:
            count = [0]
        count[0] += 1
        require(depth <= 8 and count[0] <= 16, "Declarative source recursion exceeds depth8/nodes16",
                "SOURCE_RECURSION_BUDGET", sourcePath=path)
        try:
            mapping(source, "source")
            kind = source.get("type")
            require(isinstance(kind, str) and len(kind) <= 64, "source.type must be a short string")
            require(kind in SOURCE_FIELDS, f"Unsupported source type: {kind}", "UNSUPPORTED_SOURCE")
            keys(source, {"type", *SOURCE_FIELDS[kind].split()}, "source")
            references = []
            if kind in {"copy", "attachment", "region"}:
                references.append({"target": identifier(source.get("target"), kind+".target"),
                                   "kind": kind, "sourcePath": path})
            if kind in {"attachment", "pathArray"}:
                references.extend(self.source_references(source.get("source"), depth+1, path+".source", count))
            return references
        except NativeError as exc:
            raise exc.at(sourcePath=path)

    @staticmethod
    def place_relation(relation, placement):
        for field in ("point","placedOrigin"):
            if field in relation:
                relation[field] = list(placement@Vector(relation[field]))
        if "normal" in relation:
            relation["normal"] = list((placement.to_3x3()@Vector(relation["normal"])).normalized())
        for sample in relation.get("samplePreview",[]):
            sample["point"] = list(placement@Vector(sample["point"]))
            sample["tangent"] = list((placement.to_3x3()@Vector(sample["tangent"])).normalized())

    def evaluate_source(self, source, matrix, targets, depth=0, path="source"):
        require(depth <= 8, "Declarative source depth exceeds8", "SOURCE_RECURSION_BUDGET", sourcePath=path)
        mesh = None
        try:
            kind = source["type"]
            if kind == "copy":
                mesh = self.engine.clone_with_provenance(targets[source["target"]]["object"].data)
                return mesh, []
            if kind == "region":
                mesh, state = self.engine.region_source(source, matrix, targets)
                state["sourcePath"] = path
                return mesh, [state]
            if kind == "pathArray":
                placements, state = self.engine.path_array_placements(source)
                state["sourcePath"] = path
                parts, relations = [], [state]
                vertex_count, corner_count = 0, 0
                try:
                    for instance, placement in enumerate(placements):
                        part, nested = self.evaluate_source(source["source"], matrix@placement, targets,
                                                           depth+1, path+".source")
                        parts.append((part,placement))
                        vertex_count += len(part.vertices)
                        corner_count += len(part.loops)
                        require(vertex_count<=MAX_ELEMENTS and corner_count<=MAX_LOOPS,
                                "Combined path array exceeds geometry budget", "GEOMETRY_BUDGET")
                        for relation in nested:
                            self.place_relation(relation,placement)
                            relation["instance"] = instance
                        relations.extend(nested)
                        require(len(relations)<=16,"Path array relational child exceeds16relation records",
                                "RELATION_BUDGET")
                    mesh = self.engine.combine_path_instances(parts)
                    return mesh, relations
                finally:
                    for part,_ in parts:
                        if part.users==0:
                            bpy.data.meshes.remove(part)
            if kind == "attachment":
                placement, state = self.engine.attachment_placement(source, matrix, targets)
                state["sourcePath"] = path
                mesh, nested = self.evaluate_source(source["source"], matrix @ placement, targets, depth+1, path+".source")
                mesh.transform(placement)
                mesh.update()
                for relation in nested:
                    self.place_relation(relation,placement)
                require(len(nested)<16,"Attachment nesting exceeds16relation records","RELATION_BUDGET")
                return mesh, [state]+nested
            return self.engine.source(source), []
        except NativeError as exc:
            if mesh is not None and mesh.users == 0:
                bpy.data.meshes.remove(mesh)
            raise exc.at(sourcePath=path)
        except Exception:
            if mesh is not None and mesh.users == 0:
                bpy.data.meshes.remove(mesh)
            raise

    def plan(self, nodes):
        require(isinstance(nodes, list) and len(nodes) <= MAX_NODES, f"nodes must contain at most {MAX_NODES} entries")
        by_id, dependencies, matrices, source_refs = {}, {}, {}, {}
        for node in nodes:
            keys(node, {"id", "source", "features", "transform", "material", "visible"}, "node")
            node_id = identifier(node.get("id"), "node.id")
            require(node_id not in by_id, "Duplicate node ID", nodeId=node_id)
            try:
                source_refs[node_id] = self.source_references(node.get("source"))
                features = node.get("features", [])
                require(isinstance(features, list) and len(features) <= MAX_FEATURES,
                        f"features must contain at most {MAX_FEATURES} entries")
                feature_ids = set()
                deps = [(ref["target"], None, ref["sourcePath"]) for ref in source_refs[node_id]]
                for index, feature in enumerate(features):
                    try:
                        mapping(feature, "feature")
                        fid = identifier(feature.get("id"), "feature.id")
                        require(fid not in feature_ids, "Duplicate feature ID")
                        feature_ids.add(fid)
                        require(isinstance(feature.get("type"), str) and len(feature["type"]) <= 64,
                                "feature.type must be a short string")
                        require(feature.get("type") in FEATURE_FIELDS, f"Unsupported feature type: {feature.get('type')}", "UNSUPPORTED_FEATURE")
                        keys(feature, {"id", "type", *FEATURE_FIELDS[feature["type"]].split()}, "feature")
                        if feature["type"] == "boolean":
                            deps.append((identifier(feature.get("target"), "boolean.target"), fid, None))
                        if "frame" in feature:
                            keys(feature["frame"], {"target", "selection", "up"}, "transform.frame")
                            require("selection" in feature["frame"], "transform.frame.selection is required", field="feature.frame.selection")
                            require("pivot" not in feature, "transform.frame and pivot are exclusive", field="feature.pivot")
                            if "target" in feature["frame"]:
                                deps.append((identifier(feature["frame"]["target"], "transform.frame.target"), fid, None))
                    except NativeError as exc:
                        raise exc.at(featureId=feature.get("id") if isinstance(feature, dict) else None, featureIndex=index)
                matrices[node_id] = node_matrix(node)
                if "visible" in node:
                    boolean(node["visible"], "visible")
                if "material" in node:
                    self.materials.validate(node["material"])
                for feature in features:
                    if feature["type"] == "material":
                        self.materials.validate(feature.get("material"))
                by_id[node_id], dependencies[node_id] = node, deps
            except NativeError as exc:
                raise exc.at(nodeId=node_id)
        order, visited, stack = [], set(), []
        def visit(node_id):
            require(node_id not in stack, "Native dependency cycle", "DEPENDENCY_CYCLE", nodeId=node_id, cycle=stack+[node_id])
            if node_id in visited:
                return
            stack.append(node_id)
            for target, feature_id, source_path in dependencies[node_id]:
                require(target in by_id, "Native target is absent from complete graph", "MISSING_DEPENDENCY",
                        nodeId=node_id, featureId=feature_id, targetId=target, sourcePath=source_path)
                visit(target)
            stack.pop()
            visited.add(node_id)
            order.append(node_id)
        for node_id in by_id:
            visit(node_id)
        plans = {}
        for node_id in order:
            node = by_id[node_id]
            base = {"backend": self.backend_key, "nodeId": node_id, "source": node["source"],
                    "materialOverride": {"provided": "material" in node, "value": node.get("material")}}
            if source_refs[node_id]:
                base["dependencies"] = []
                for reference in source_refs[node_id]:
                    target = reference["target"]
                    dependency = dict(reference, hash=plans[target]["keys"][-1])
                    if reference["kind"] in {"attachment", "region"}:
                        relative = matrices[node_id].inverted() @ matrices[target]
                        dependency["relativeMatrix"] = [c for row in relative for c in row]
                    base["dependencies"].append(dependency)
            stage_keys = [content_hash(base)]
            for feature in node.get("features", []):
                feature_input = {"prefix": stage_keys[-1], "feature": feature}
                if feature["type"] == "boolean":
                    target = feature["target"]
                    relative = matrices[node_id].inverted() @ matrices[target]
                    feature_input["dependency"] = plans[target]["keys"][-1]
                    feature_input["relativeMatrix"] = [c for row in relative for c in row]
                if "target" in feature.get("frame", {}):
                    target = feature["frame"]["target"]
                    relative = matrices[node_id].inverted() @ matrices[target]
                    feature_input["frameDependency"] = plans[target]["keys"][-1]
                    feature_input["frameRelativeMatrix"] = [c for row in relative for c in row]
                stage_keys.append(content_hash(feature_input))
            plans[node_id] = {"node": node, "keys": stage_keys, "matrix": matrices[node_id]}
        return order, plans

    def material(self, spec):
        return self.materials.material(spec)

    def stage(self, key, mesh, warnings, relations=None, results=None):
        require(all(__import__("math").isfinite(c) for v in mesh.vertices for c in v.co),
                "Native geometry contains non-finite coordinates", "INVALID_GEOMETRY")
        stamp = topology_stamp(mesh)
        mesh["modeler_stage_key"] = key
        mesh["modeler_scope"] = self.scope
        mesh.use_fake_user = True
        return {"mesh": mesh, "stamp": stamp, "warnings": warnings, "relations": relations or [], "resultSets": results or {}}

    def build(self, command):
        keys(command, {"op", "requestId", "nodes", "output", "exportIds"}, "build command")
        request_id = identifier(command.get("requestId"), "requestId")
        digest = content_hash(command)
        if request_id in self.requests:
            cached = self.requests[request_id]
            require(cached["digest"] == digest, "requestId was already used for different input", "REQUEST_ID_CONFLICT")
            reply = dict(cached["reply"], backend=self.backend, replayed=True)
            if reply.get("output") is not None:
                require(safe_path(self.root, reply["output"], output=True).is_file(),
                        "Idempotent result file has expired", "IDEMPOTENT_RESULT_EXPIRED")
            return reply
        output = command.get("output")
        if output is not None:
            path = safe_path(self.root, output, output=True)
            require(not path.exists(), "Export basename already exists; use a fresh named result", "OUTPUT_EXISTS")
        order, plans = self.plan(command.get("nodes"))
        export_ids = command.get("exportIds", order if output is not None else [])
        require(isinstance(export_ids, list) and len(export_ids) <= MAX_NODES and
                all(isinstance(i, str) and i in plans for i in export_ids) and len(set(export_ids)) == len(export_ids),
                "exportIds must contain distinct IDs present in this graph")
        require(output is not None or not export_ids, "Nonempty exportIds requires an output JSON basename")
        wanted_keys = {key for plan in plans.values() for key in plan["keys"]}
        stages = {key: value for key, value in self.stages.items() if key in wanted_keys}
        records, new_objects, created_meshes = {}, [], []
        started = time.monotonic()
        output_written, committed = False, False
        try:
            for node_id in order:
                plan = plans[node_id]
                node, stage_keys = plan["node"], plan["keys"]
                try:
                    if stage_keys[0] not in stages:
                        mesh, relations = self.evaluate_source(node["source"], plan["matrix"], records)
                        created_meshes.append(mesh)
                        if "material" in node or not mesh.materials:
                            mesh.materials.clear()
                            mesh.materials.append(self.material(node.get("material", {})))
                            for face in mesh.polygons:
                                face.material_index = 0
                        source_warnings = json.loads(mesh.get("modeler_orientation_warnings", "[]"))
                        stages[stage_keys[0]] = self.stage(stage_keys[0], mesh, source_warnings, relations)
                        self.check_stage_budget(stages)
                    feature_states = []
                    for index, feature in enumerate(node.get("features", [])):
                        previous = stages[stage_keys[index]]
                        try:
                            if stage_keys[index+1] not in stages:
                                mesh, warnings, results = self.engine.feature(previous["mesh"], feature, previous["stamp"],
                                                                              plan["matrix"], records, previous.get("resultSets", {}))
                                created_meshes.append(mesh)
                                stages[stage_keys[index+1]] = self.stage(stage_keys[index+1], mesh, previous["warnings"] + warnings,
                                                                        results=results)
                                self.check_stage_budget(stages)
                            final = stages[stage_keys[index+1]]
                            feature_states.append({"id": feature["id"], "type": feature["type"],
                                "inputTopologyStamp": previous["stamp"], "outputTopologyStamp": final["stamp"]})
                        except NativeError as exc:
                            raise exc.at(featureId=feature["id"], featureIndex=index)
                        except (TypeError, AttributeError) as exc:
                            raise NativeError("UNSUPPORTED_BACKEND_API", "Blender rejected the documented feature API",
                                {"featureId": feature["id"], "featureIndex": index, "nativeError": str(exc)[:1500],
                                 "documentation": "https://docs.blender.org/api/4.5/"})
                        except Exception as exc:
                            raise NativeError("NATIVE_OPERATION_FAILED", str(exc)[:1500],
                                              {"featureId": feature["id"], "featureIndex": index})
                    final = stages[stage_keys[-1]]
                    for state in feature_states:
                        state["results"] = result_counts(final.get("resultSets", {}).get(state["id"], {}))
                    old = self.records.get(node_id)
                    state_hash = content_hash(node)
                    if old and old["stateHash"] == state_hash and old["sourceHash"] == stage_keys[-1]:
                        records[node_id] = old
                        continue
                    obj = self.engine.object(final["mesh"], "NativeNode")
                    new_objects.append(obj)
                    obj.matrix_world = plan["matrix"]
                    if any(m and "modeler_material" in m and json.loads(m["modeler_material"]).get("detail") for m in obj.data.materials):
                        obj.data = obj.data.copy()
                        created_meshes.append(obj.data)
                        self.materials.ensure_detail_uv(obj)
                    # Visibility belongs to Host presentation. Hidden boolean operands still evaluate.
                    obj.hide_render = not node.get("visible", True)
                    obj["modeler_scope"], obj["modeler_node_id"] = self.scope, node_id
                    records[node_id] = {"node": node, "object": obj, "stateHash": state_hash,
                        "sourceHash": stage_keys[-1], "topologyStamp": final["stamp"], "stages": stage_keys,
                        "featureStates": feature_states, "warnings": final["warnings"], "resultSets": final.get("resultSets", {}),
                        "relations": stages[stage_keys[0]].get("relations", [])}
                except NativeError as exc:
                    raise exc.at(nodeId=node_id)
                except Exception as exc:
                    raise NativeError("NATIVE_OPERATION_FAILED", str(exc)[:1500], {"nodeId": node_id, "stage": "source"})
            require(sum(len(r["object"].data.vertices) for r in records.values()) <= MAX_ASSET_VERTICES and
                    sum(len(r["object"].data.loops) for r in records.values()) <= MAX_ASSET_LOOPS,
                    "Complete asset exceeds geometry budget", "ASSET_GEOMETRY_BUDGET")
            changed = [i for i in order if records[i] is not self.records.get(i)]
            unchanged = [i for i in order if i not in changed]
            removed = [i for i in self.records if i not in records]
            output_bytes = 0
            if output is not None:
                exported = {"protocol": PROTOCOL, "nodes": [export_mesh(records[i]) for i in export_ids]}
                output_bytes = atomic_json(self.root, output, exported, output=True)
                output_written = True
            # Keep recent immutable prefixes when capacity permits. This recovers
            # IDs when Host discards a speculative build and resends its document.
            vertices = sum(len(stage["mesh"].vertices) for stage in stages.values())
            corners = sum(len(stage["mesh"].loops) for stage in stages.values())
            memberships = sum(result_memberships(stage) for stage in stages.values())
            retained = {}
            for key in reversed(self.stages):
                if key in stages:
                    continue
                stage = self.stages[key]
                v, c = len(stage["mesh"].vertices), len(stage["mesh"].loops)
                members = result_memberships(stage)
                if (len(stages)+len(retained) < 4096 and vertices+v <= MAX_STAGE_VERTICES
                        and corners+c <= MAX_STAGE_LOOPS and memberships+members <= MAX_STAGE_RESULT_MEMBERSHIPS):
                    retained[key] = stage
                    vertices, corners = vertices+v, corners+c
                    memberships += members
            stages = {**dict(reversed(list(retained.items()))), **stages}
            reply = {"ok": True, "protocol": PROTOCOL, "requestId": request_id,
                     "changedIds": changed, "unchangedIds": unchanged, "removedIds": removed,
                     "output": output, "exportIds": export_ids, "backend": self.backend,
                     "nodeStates": [{"id": i, "sourceHash": records[i]["sourceHash"],
                                     "topologyStamp": records[i]["topologyStamp"], **mesh_hashes(records[i])} for i in order],
                     "stats": {"nodes": len(records), "stages": len(stages), "outputBytes": output_bytes,
                               "evaluationMs": round((time.monotonic()-started)*1000, 3)}}
            requests = OrderedDict(self.requests)
            requests[request_id] = {"digest": digest, "reply": reply}
            while len(requests) > MAX_REQUEST_CACHE:
                requests.popitem(last=False)
            if changed or removed or output is not None or self.dirty:
                self.persist(records, stages, requests)
            self.records, self.stages, self.requests = records, stages, requests
            committed = True
            try:
                self.cleanup()
            except Exception:
                # Cache collection is not part of geometry publication; failure
                # can leave only private unused datablocks, never a half feature.
                self.dirty = True
                reply["warnings"] = [{"code": "CACHE_CLEANUP_DEFERRED", "message": "Private unused cache cleanup will retry on the next build."}]
            return reply
        except NativeError as exc:
            exc.detail.setdefault("materialization", "previous-preserved")
            raise
        finally:
            if not committed:
                for obj in new_objects:
                    remove_object(obj)
                for mesh in created_meshes:
                    if mesh.name in bpy.data.meshes:
                        mesh.use_fake_user = False
                        if mesh.users == 0:
                            bpy.data.meshes.remove(mesh)
                if output_written:
                    safe_path(self.root, output, output=True).unlink(missing_ok=True)
                try:
                    self.cleanup()
                except Exception:
                    self.dirty = True

    def material_bake(self, command):
        keys(command, {"op", "requestId", "id", "channels", "resolution", "samples", "margin", "prefix", "uvName"}, "material_bake command")
        request_id = identifier(command.get("requestId"), "requestId")
        command_hash = content_hash(command)
        if request_id in self.requests:
            cached = self.requests[request_id]
            require(cached["digest"] == command_hash, "requestId was already used for different input", "REQUEST_ID_CONFLICT")
            reply = dict(cached["reply"], backend=self.backend, replayed=True)
            require(safe_path(self.root, reply["receipt"], output=True).is_file(), "Bake receipt has expired", "IDEMPOTENT_RESULT_EXPIRED")
            for output in reply["outputs"]:
                path = safe_path(self.root, output["file"])
                require(path.is_file() and file_hash(path) == output["sha256"], "Bake file expired or changed", "IDEMPOTENT_RESULT_EXPIRED")
            return reply
        node_id = identifier(command.get("id"), "id")
        require(node_id in self.records, "Native node is not materialized", "NODE_NOT_FOUND", nodeId=node_id)
        for mat in self.records[node_id]["object"].data.materials:
            if mat and "modeler_material" in mat:
                self.materials.validate(json.loads(mat["modeler_material"]))
        reply = self.materials.bake(command, self.records[node_id], atomic_json)
        requests = OrderedDict(self.requests)
        requests[request_id] = {"digest": command_hash, "reply": reply}
        while len(requests) > MAX_REQUEST_CACHE:
            requests.popitem(last=False)
        try:
            self.persist(self.records, self.stages, requests)
        except Exception:
            for output in reply["outputs"]:
                safe_path(self.root, output["file"]).unlink(missing_ok=True)
            safe_path(self.root, reply["receipt"], output=True).unlink(missing_ok=True)
            raise
        self.requests = requests
        return reply

    def capabilities(self):
        return {"ok": True, "protocol": PROTOCOL, "backend": self.backend,
            "operations": ["build", "select", "frame", "inspect", "orientation", "material_info", "uv_info", "material_bake", "material_tile", "capabilities", "save", "shutdown"],
            "materials": {"model": "Principled BSDF nodes; inline specs cached by canonical hash",
                "constants": ["color", "metalness", "roughness", "clearcoat", "clearcoatRoughness", "transmission", "ior", "opacity", "emissive", "emissiveIntensity", "normalScale"],
                "color": "hex RGB converts sRGB to linear; numeric RGB remains linear",
                "legacy": "extra JSON fields preserved as metadata; old type checker/carbon/noise/pixels is not procedural",
                "textures": {"channels": list(CHANNELS), "type": "image", "file": "owned root/image-<64lowerhexsha256>.png only", "colorSpace": ["srgb", "linear"], "channel": ["r", "g", "b"], "normalY": ["up", "down"], "scale": "two nonzero UV multipliers"},
                "procedural": ["noise", "stripes", "checker"]},
            "materialBake": {"engine": "CYCLES", "device": "CPU", "channels": list(CHANNELS),
                "resolution": [64,2048], "samples": [1,128], "margin": [0,64], "totalPixels": MAX_BAKE_PIXELS,
                "publication": "immutable PNGs and final atomic prefix.json receipt; no glob discovery",
                "baseColor": "native DIFFUSE color-only", "roughnessMetalnessEmissive": "temporary native EMIT surrogate",
                "normal": "native tangent +Y", "ao": "native AO isolated target only",
                "uv": "requires named UV with at least one nonzero-area face; overlap warns and is bounded"},
            "sources": {name: {"fields": fields.split()} for name, fields in SOURCE_FIELDS.items()},
            "sourceSemantics": {"box": "size is XYZ, centred on origin",
                "cylinder": "closed cylinder centred on origin; axis x/y/z, default z; positive Z geometry rotates +pi/2 around Y for x or -pi/2 around X for y",
                "sphere": "UV sphere centred on origin",
                "torus": "majorRadius is ring-centre radius; axis x/y/z, default z is normal to XY ring; exact cylinder-axis rotations",
                "extrude": "single closed XY profile; depth extends +/-depth/2 along axis x/y/z, default z; exact cylinder-axis rotations; no profile holes",
                "loft": "equal corresponding CCW profile point counts; increasing section z; caps default true; no holes",
                "curve": "XYZ auto-handle BEZIER (default) or POLY; bevelDepth 0 permits wire; caps default true",
                "controlGrid": "rows of corresponding XYZ points; quad control mesh; closedU/closedV optional; no implicit subdivision",
                "copy": "copy target final local geometry with fresh independent element IDs; target transform is not baked",
                "mesh": "flat XYZ and polygon indices; optional per-corner flat UV or UV pairs; smooth default false; optional orientation:{expected:'outward'|'inward'|'any',onConflict?:'error'|'warn'} checks source winding without rewriting it; error default; open/uncertified explicit intent rejects or warns",
                "sweep": "single closed profile; discrete XYZ path with averaged vertex tangents and parallel transport; closed residual twist distributed by arclength; caps default not closedPath; no reversal; UV perimeter/path arclength; up defaults +Z with deterministic parallel fallback; smooth defaults true, caps flat",
                "region": "select faces against target-local final geometry/stamp; extract selected incident geometry, transform by exact owner^-1*target; signed owner-local normal offset0default; native UV/material/sharp/crease retained; offset0 target corner normals preserved inverse-transpose; nonzero offset recalculates split normals; independent IDs with target provenance",
                "pathArray": "explicit persisted XYZ polyline only; equal-arclength samples; open offset..end includes endpoints (count1 at offset), closed samples exclude seam and wrap offset; +Z follows piecewise segment tangent with right-continuous corner choice, transported +Y/updefault+Z; alignfalse translates only; count1..1024; recursively evaluated child sources; one disjoint native combined mesh with UV/material/crease/sharp/split normals and instance/source provenance; no implicit pathTarget approximation",
                "attachment": "source origin attached to unique ray/nearest point on target final mesh, in owner-local metres; anchor required, direction optional, maxDistance default1, normal offset default0; alignNormal defaults true (+Z to target geometric normal, +Y toward projected up default +Y); misses and distinct tied/edge normals reject; nested local scopes depth8/nodes16; no implicit Host baking"},
            "features": {name: {"fields": fields.split()} for name, fields in FEATURE_FIELDS.items()},
            "featureSemantics": {"orient": "mode flip reverses any face selection; mode consistent(default) requires full connected components and keeps lowest persistent face-ID anchor winding; direction local vec3 chooses open component normal and is exclusive with outward/inward; outward/inward require one full checked closed isolated shell and reject nested/overlapping shell bounds; expected any(default)/outward/inward postcondition; expectedTopologyStamp guards input; pure reversal retains all IDs and corner UV/color/material/provenance, recalculates native split normals honoring sharp/smooth; no automatic legacy source rewrite",
                "bevel": "BMesh selected edges or vertices; OFFSET width; profile/clampOverlap supported",
                "inset": "selected faces, region or individual, thickness/depth/evenOffset",
                "extrude": "selected face region along area-weighted normal or explicit unit direction; edge extrusion requires direction",
                "subdivide": "selected edges or selected face edges; cuts 1..32; optional smooth",
                "smooth": "Laplacian vertex smoothing of vertices incident to selected domain, factor 0..1, iterations 1..100",
                "dissolve": "native selected vertices/edges/faces; useVerts/useFaceSplit where applicable",
                "delete": "native vertices/edges/faces; onlyFaces optionally preserves loose boundaries",
                "triangulate": "native selected faces, BEAUTY triangulation",
                "bridge": "exactly two disjoint complete closed boundary edge loops; twist offset supported",
                "fill": "one or more complete closed boundary edge loops; native holes_fill; sides=0 unlimited",
                "transform": "selected incident vertices; without frame unchanged owner-local translation/XYZ Euler rotation/scale about pivot; frame:{selection,up?,target?} derives a live input-mesh frame or other target final-mesh frame via owner^-1*target; frame exclusive with pivot; F*T*Rxyz*S*F^-1 (components in orthonormal frame basis about frame origin); target is a DAG dependency and relative affine hash input; same owner must omit target; no stored matrices accepted",
                "subdivision": "native SUBSURF; CATMULL_CLARK or SIMPLE; levels 0..5",
                "solidify": "native SOLIDIFY with rim; signed thickness, offset -1..1, evenOffset",
                "mirror": "native MIRROR around local pivot; axis X/Y/Z or distinct axis list; optional merge",
                "array": "native constant local offset array, fixed count 1..1024; optional merge",
                "boolean": "native Boolean EXACT, material TRANSFER; DIFFERENCE/UNION/INTERSECT; closed manifold nonzero-volume operands required",
                "uv": "native smart or cube projection; optional selected faces; angleLimit radians; smart islandMargin; cubeSize",
                "crease": "selected edges get native crease_edge FLOAT value 0..1; consumed by subsequent native subdivision; no topology or ID changes",
                "edgeSharp": "selected edges set native sharp barrier (sharp default true); incident face smooth flag set explicitly (smooth default true, false gives flat faces); exported corner normals reflect native smoothing; no topology or ID changes",
                "material": "selected faces assigned actual reused/appended Blender material slot using existing material spec; native triangle material indices/slot metadata exported; no topology or ID changes",
                "merge": "native pointmerge of >=2selected vertices to explicit point or centroid; merged vertex gets new identity; only surviving proven unchanged connectivity retains IDs",
                "split": "native split_edges disconnection of selected manifold edges (2adjacent faces); boundary/loose selections reject; cuts that leave vertex fans connected reject SPLIT_NO_DISCONNECTION (use a separating edge loop)",
                "bisect": "native owner-local plane cut on selected faces expanded to incident geometry; defaultall; clearInner removes negative signed side, clearOuter positive; fillrequires exactly1clear flag and complete nonbranching contours; nested contours/holes reject; cap normals and planar UV set explicitly; no-crossing rejects"},
            "selection": {"domains": list(ID_ATTRIBUTES), "predicates": ["bounds", "near", "normal", "boundary", "angle", "length"],
                "predicateCombination": "AND; ids OR where; absent where selects entire requested domain",
                "coordinates": "element centres and geometric normals in node-local space",
                "returnedAttributes": {"edges": ["crease", "sharp"], "faces": ["materialIndex", "smooth"],
                                       "provenanceWhenPresent": ["sourceId", "instance"]},
                "whereContract": {"bounds": {"min": "vec3", "max": "vec3; inclusive"},
                    "near": {"point": "vec3", "distance": "nonnegative metres"},
                    "normal": {"direction": "nonzero vec3, normalized by worker", "minDot": "[-1,1], default 0.9"},
                    "boundary": "boolean; edges with exactly one adjacent face; incident edges for vertices/faces",
                    "angle": {"min": "radians, default 0", "max": "radians, default pi"},
                    "length": {"min": "metres, default 0", "max": "metres, default 1e30"}},
                "pagination": "query limit 1..128 default 128; edit limit 1..500000 default all; offset 0..500000",
                "angle": "unsigned adjacent face-normal angle in radians, manifold edges only",
                "length": "edge length in metres, edges only", "queryLimit": MAX_QUERY,
                "explicitIds": "require selection.topologyStamp matching feature INPUT topology; missing IDs reject atomically",
                "persistence": "surviving BMesh elements retain IDs; modifiers retain only unique attribute+unchanged-geometry correspondences; all ambiguous/generated elements get new IDs",
                "rebuild": "unchanged source and feature prefixes reuse persisted IDs; recent unused prefixes retained within cache budget; arbitrary source/earlier topology changes or prefix eviction invalidate explicit IDs",
                "emptyEdits": "rejected", "ordering": "ascending persistent ID before offset/limit",
                "recursive": {"depth": 4, "totalSets": 8,
                    "forms": ["{domain,ids?,where?,topologyStamp?,limit?,offset?}",
                              "{domain,seed:Selection,expand:{type,steps?},limit?,offset?}",
                              "{domain,combine:'union'|'intersect'|'subtract',sets:[Selection],limit?,offset?}",
                              "{domain,fromFeature:{id,set:'created'|'affected'},limit?,offset?}"],
                    "exclusive": "one form per node; all nested selections independently apply pagination; combinations require equal domains; subtract is first minus all remaining",
                    "connected": "complete mesh adjacency component(s) containing seeds; vertices across edges, edges via shared vertices, faces via shared edges; steps absent or 1",
                    "grow": "include seeds plus steps graph-adjacent layers, steps 1..32 default1",
                    "boundary": "output domain edges; face seeds select region contour edges incident to exactly one selected face; edge seeds must be true mesh-boundary edges and expand to full shared-vertex boundary component(s); steps absent or1",
                    "loop": "edges only; include seed and steps unambiguous continuations across regular quad vertex fans; ends at boundary; extraordinary poles, non-quads, non-manifold or branching fans reject",
                    "ring": "edges only; include seed and steps opposite-edge hops across incident quad faces; boundary stops; non-quad/non-manifold rejects"},
                "featureResults": {"reference": "fromFeature:{id,set:'created'|'affected'} resolves the requested domain at current input stage; missing/forward feature rejects FEATURE_RESULT_NOT_FOUND",
                    "created": "output element identities absent from this feature input; includes replacement IDs where correspondence could not be proved",
                    "affected": "surviving IDs in selected vertex incidence plus created IDs; whole-mesh features scope all input elements",
                    "survival": "all earlier sets intersect current live persistent IDs each stage; recomputed with features on upstream reevaluation; persisted with immutable stage cache, no arbitrary rebuild mapping",
                    "inspect": "featureStates[].results gives current surviving per-set/per-domain counts, no ID buffers"},
                "geometry": {"request": "select/frame command geometry:true", "space": "local",
                    "fields": ["points:flatXYZ", "segments:flatXYZx2", "triangles:flatXYZx3", "showingCount", "pageCount", "total", "complete", "omitted"],
                    "elements": MAX_GEOMETRY_ELEMENTS, "floats": MAX_GEOMETRY_FLOATS,
                    "coverage": "actual current-page whole elements only; oversized elements omitted; complete means all query matches drawn, omitted=total-showingCount; select bounds cover all matches and showingCount outside geometry is page items"}},
            "orientation": {"request": "{op:'orientation',id,selection?:faces,expectedTopologyStamp?,count?:1..32(default8),offset?,probes?:[{origin:worldVec3,direction:worldVec3,expected?:'outward'|'inward'}](max32)}",
                "components": "persistent minimum face-ID component id, faceCount/manifold/boundary/windingConsistency/signedVolume/tolerance/orientation; paged components and whole-selection summary; complete input edge adjacency, never treats a face patch as a closed solid",
                "proof": "isolated closed consistently wound manifold plus completed bounded triangle intersection check; nested/overlapping shell bounds, non-manifold, degenerate, non-planar or budget-incomplete surfaces remain ambiguous; signed volume alone is not a certificate",
                "witness": "bounded persistent face/vertex/sourceFace IDs and actual world triangles/points; normal follows world triangle winding; worldNormal and cornerNormals use inverse-transpose and expose negative-scale reflection explicitly",
                "budget": "50000 triangles, 20000 triangle/shell pair checks, 120000 AABB visits; usage/completeness and warnings returned; no unbounded pair enumeration"},
            "materialSurface": "surface-v1 mapping/object/world/frame/uv/generated spaces and bounded literal signal DAG compile to native shader nodes; preview uses isolated existing material_bake clones",
            "frame": {"request": "{op:'frame',id,selection,up?:vec3,geometry?:boolean}",
                "fields": ["origin", "normal", "tangent", "bitangent", "matrix", "worldMatrix", "stamp", "topologyStamp", "selectedCount", "total", "offset", "bounds"],
                "basis": "right-handed +X tangent,+Y bitangent,+Z normal; matrices column-major; up projects to +Y and parallel/zero up rejects",
                "faces": "triangle-area centroid and area-weighted geometric face normal; absent up uses longest projected incident edge, ties lowest persistent edge ID, direction low-to-high persistent vertex ID",
                "edges": "length-weighted midpoint; one edge or common straight tangent chain; adjacent surface normals must all be coplanar and consistently oriented; loose/non-manifold/sharp-crease/two-sided ambiguity rejects",
                "world": "origin by full exact node affine matrix; normal by inverse-transpose; tangent by linear map then orthogonalization; worldMatrix is an orthonormal geometric frame",
                "freshness": "always derive from current materialization and supplied selection stamp; vertex-domain, empty/zero-area/cancelling normal/ambiguous edge frames reject"},
            "build": {"completeGraph": True, "outputNull": True, "exportIds": "optional subset; default all graph nodes; [] exports none",
                "transform": "position/rotationXYZ/scale OR exclusive 16-column-major affine matrix",
                "sourceHash": "backend implementation+node+recursive source+material+ordered features+dependency materialization hashes+relative affine boolean/attachment/region/feature-frame transforms",
                "idempotency": "last 128 successful build IDs retained; changing/exporting builds persist receipts; no-op sync receipts stay in memory until next save; changed input for same retained ID rejects; export basenames immutable",
                "transaction": "staged meshes and objects; failed command preserves prior graph; atomic private blend save on changed successful builds",
                "export": "indexed local geometry, triangle-order cornerNormals/cornerUV, face/material IDs; nodeStates return bounded id/hash/stamp metadata even with output:null; no geometry buffers on RPC response",
                "relationInspect": "relations(max16) expose attachment hits, region target/provenance summaries, and pathArray sample previews(max16); relational arrays exceeding16records reject",
                "provenance": "optional mesh.vertexSourceIds lengthvertices, triangleSourceFaceIds lengthtriangles, vertexInstanceIndices lengthvertices, triangleInstanceIndices lengthtriangles; select sourceId/instance; integer native point/edge/face attributes retained; source IDs are independent provenance, never selection IDs"},
            "limits": {"requestBytes": MAX_REQUEST, "outputBytes": MAX_OUTPUT, "nodes": MAX_NODES,
                "featuresPerNode": MAX_FEATURES, "verticesPerMesh": MAX_ELEMENTS, "cornersPerMesh": MAX_LOOPS,
                "assetVertices": MAX_ASSET_VERTICES, "assetCorners": MAX_ASSET_LOOPS,
                "stageVertices": MAX_STAGE_VERTICES, "stageCorners": MAX_STAGE_LOOPS,
                "featureResultMembershipsPerStage": MAX_RESULT_MEMBERSHIPS,
                "stageResultMemberships": MAX_STAGE_RESULT_MEMBERSHIPS},
            "gaps": ["No arbitrary Python, filesystem, import, render or eval endpoint",
                "No automatic topology correspondence through arbitrary rebuilds or native modifier interpolation",
                "No NURBS, profile holes, resampled loft/sweep paths or automatic attachment retargeting after ambiguous hits",
                "No in-process cancellation during native operators; Host may stop this dedicated process",
                "Legacy material extras remain metadata; new procedural/image graphs are evaluated by Cycles",
                 "Owned images are PNG only; emissive PNG output is LDR",
                 "sourceHash still includes materials; geometryHash independently hashes actual local coordinates/connectivity"]}

    def dispatch(self, command):
        mapping(command, "command")
        if "requestId" in command:
            identifier(command["requestId"], "requestId")
        op = command.get("op")
        if op == "build":
            return self.build(command)
        if op == "material_bake":
            return self.material_bake(command)
        if op == "material_tile":
            return self.materials.tile(command, atomic_json)
        if op in {"material_info", "uv_info"}:
            keys(command, {"op", "id", "requestId"}, op+" command")
            node_id = identifier(command.get("id"), "id")
            require(node_id in self.records, "Native node is not materialized", "NODE_NOT_FOUND", nodeId=node_id)
            record = self.records[node_id]
            info = self.materials.info(record) if op == "material_info" else uv_info(record)
            return dict(info, ok=True, id=node_id, sourceHash=record["sourceHash"],
                        topologyStamp=record["topologyStamp"], **mesh_hashes(record))
        if op == "orientation":
            node_id = identifier(command.get("id"), "id")
            require(node_id in self.records, "Native node is not materialized", "NODE_NOT_FOUND", nodeId=node_id)
            record = self.records[node_id]
            return orientation_query(record, command, node_matrix(record["node"]))
        if op == "capabilities":
            keys(command, {"op", "requestId"}, "capabilities command")
            return self.capabilities()
        if op in {"inspect", "select", "frame"}:
            allowed = {"op", "id", "requestId"} | ({"selection", "geometry"} if op in {"select", "frame"} else set())
            if op == "frame":
                allowed.add("up")
            keys(command, allowed, op+" command")
            node_id = identifier(command.get("id"), "id")
            require(node_id in self.records, "Native node is not materialized", "NODE_NOT_FOUND", nodeId=node_id)
            record = self.records[node_id]
            geometry = boolean(command.get("geometry", False), "geometry")
            if op == "select":
                return dict(select_mesh(record["object"].data, command.get("selection"), record["topologyStamp"],
                                        geometry=geometry, results=record.get("resultSets", {})), ok=True, id=node_id)
            if op == "frame":
                return dict(frame_mesh(record["object"].data, command.get("selection"), record["topologyStamp"],
                                       node_matrix(record["node"]), up=command.get("up"), geometry=geometry,
                                       results=record.get("resultSets", {})), ok=True, id=node_id)
            mesh = record["object"].data
            return {"ok": True, "id": node_id, "sourceHash": record["sourceHash"], "topologyStamp": record["topologyStamp"],
                "counts": mesh_counts(mesh), "bounds": mesh_bounds(mesh), **mesh_hashes(record),
                "attributes": [{"name": a.name, "domain": a.domain, "type": a.data_type} for a in list(mesh.attributes)[:64]],
                "fields": ["centre", "normal", "boundary", "length (edges)", "angle (manifold edges)",
                           "crease/sharp (edges)", "materialIndex/smooth (faces)"],
                "featureStates": record["featureStates"], "relations": record.get("relations", [])[:16],
                "warnings": record["warnings"][:64]}
        if op == "save":
            keys(command, {"op", "requestId"}, "save command")
            self.persist(self.records, self.stages, self.requests)
            return {"ok": True, "saved": "current.blend", "nodes": len(self.records)}
        if op == "shutdown":
            keys(command, {"op", "requestId"}, "shutdown command")
            return {"ok": True, "shutdown": True}
        raise NativeError("UNKNOWN_OPERATION", "Unknown native worker operation")

class PrivateHTTPServer(HTTPServer):
    allow_reuse_address = False
    request_queue_size = 8
    def __init__(self, address, worker, token):
        self.worker, self.token, self.stop_requested = worker, token, False
        super().__init__(address, Handler)
        self.timeout = 0.5


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "JSON object contains a duplicate key", "INVALID_JSON")
        result[key] = value
    return result


def invalid_constant(value):
    raise NativeError("INVALID_JSON", "JSON must contain only finite numbers")

def finite_float(value):
    result = float(value)
    require(__import__("math").isfinite(result), "JSON must contain only finite numbers", "INVALID_JSON")
    return result


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.0"
    server_version, sys_version = "ModelerNative/1", ""

    def setup(self):
        super().setup()
        self.connection.settimeout(30)

    def log_message(self, format, *args):
        # Do not log tokens, request bodies, paths or private-root information.
        pass

    def send_json(self, reply, status=200):
        reply.setdefault("protocol", PROTOCOL)
        reply.setdefault("backend", self.server.worker.backend)
        data = canonical(reply).encode("utf-8")
        require(len(data) <= 1024*1024, "RPC metadata exceeds response budget", "RESPONSE_BUDGET")
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(data)
            self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass  # A completed build remains idempotently retrievable after disconnect.
        self.close_connection = True

    def authenticated(self):
        tokens = self.headers.get_all("X-Modeler-Token", [])
        provided = tokens[0] if len(tokens) == 1 else ""
        if not hmac.compare_digest(provided.encode("utf-8"), self.server.token.encode("utf-8")):
            self.send_json({"ok": False, "code": "UNAUTHORIZED", "error": "Authentication required"}, 401)
            return False
        return True

    def do_GET(self):
        if not self.authenticated():
            return
        if self.path != "/health":
            self.send_json({"ok": False, "code": "NOT_FOUND", "error": "Unknown endpoint"}, 404)
            return
        worker = self.server.worker
        reply = {"ok": True, "protocol": PROTOCOL, "ready": True, "backend": worker.backend,
                 "nodes": len(worker.records), "dirty": worker.dirty,
                 "uptimeSeconds": round(time.monotonic()-worker.started, 3)}
        if worker.recovery_warning:
            reply["warning"] = worker.recovery_warning
        self.send_json(reply)

    def do_POST(self):
        if not self.authenticated():
            return
        if self.path != "/command":
            self.send_json({"ok": False, "code": "NOT_FOUND", "error": "Unknown endpoint"}, 404)
            return
        command = None
        try:
            lengths = self.headers.get_all("Content-Length", [])
            require(len(lengths) == 1 and lengths[0].isdigit(), "A single Content-Length is required", "INVALID_HTTP")
            length = int(lengths[0])
            require(0 < length <= MAX_REQUEST, "Request exceeds 64 MiB limit", "REQUEST_BUDGET")
            require(not self.headers.get("Transfer-Encoding"), "Transfer-Encoding is unsupported", "INVALID_HTTP")
            require(self.headers.get("Content-Encoding", "identity") == "identity", "Compressed bodies are unsupported", "INVALID_HTTP")
            data = self.rfile.read(length)
            require(len(data) == length, "Incomplete request body", "INVALID_HTTP")
            try:
                command = json.loads(data.decode("utf-8"), object_pairs_hook=unique_object,
                                     parse_constant=invalid_constant, parse_float=finite_float)
            except (ValueError, UnicodeError, RecursionError):
                raise NativeError("INVALID_JSON", "Request is not bounded valid UTF-8 JSON")
            reply = self.server.worker.dispatch(command)
            if isinstance(command.get("requestId"), str):
                reply.setdefault("requestId", command["requestId"])
            self.send_json(reply)
            if command.get("op") == "shutdown" and reply.get("ok"):
                self.server.stop_requested = True
        except NativeError as exc:
            reply = {"ok": False, "code": exc.code, "error": str(exc)[:2048]}
            if isinstance(command, dict) and isinstance(command.get("id"), str):
                exc.detail.setdefault("nodeId", command["id"])
            if exc.detail:
                reply["detail"] = exc.detail
            if isinstance(command, dict) and isinstance(command.get("requestId"), str):
                reply["requestId"] = command["requestId"][:256]
            status = 413 if exc.code == "REQUEST_BUDGET" else 409 if exc.code in {"STALE_SELECTION", "REQUEST_ID_CONFLICT"} else 400
            self.send_json(reply, status)
        except (TimeoutError, ConnectionError, OSError):
            self.close_connection = True
        except Exception as exc:
            print("Native request error:", type(exc).__name__, flush=True)
            self.send_json({"ok": False, "code": "INTERNAL_ERROR", "error": "Native worker rejected an invalid backend state"}, 500)


def main():
    require(bpy.app.background and "--factory-startup" in sys.argv,
            "Worker requires a dedicated --background --factory-startup process", "UNSAFE_LAUNCH")
    require(tuple(bpy.app.version) == (4, 5, 15), "Native worker requires Blender 4.5.15", "UNSUPPORTED_BACKEND_VERSION")
    parser = argparse.ArgumentParser(description="Private modeler geometry worker")
    parser.add_argument("--root", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--port", type=int, default=0)
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    require(Path(args.root).is_absolute(), "--root must be absolute", "UNSAFE_PATH")
    root = Path(args.root).resolve()
    root.mkdir(parents=True, exist_ok=True)
    require(16 <= len(args.token) <= 256 and args.token.isascii() and not any(c.isspace() for c in args.token),
            "--token must contain 16..256 non-whitespace ASCII characters", "INVALID_TOKEN")
    require(0 <= args.port <= 65535, "Invalid port")
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    with acquire_root_lock(root):
        worker = Worker(root)
        server = PrivateHTTPServer(("127.0.0.1", args.port), worker, args.token)
        atomic_json(root, "ready.json", {"protocol": PROTOCOL, "port": server.server_port,
                    "pid": os.getpid(), "blenderVersion": bpy.app.version_string}, max_bytes=65536)
        print("Modeler native worker ready", flush=True)
        try:
            while not server.stop_requested:
                server.handle_request()
        finally:
            server.server_close()
            ready = safe_path(root, "ready.json")
            if ready.exists():
                ready.unlink()


if __name__ == "__main__":
    try:
        main()
    except NativeError as exc:
        print("Modeler native startup failed:", exc.code, str(exc), flush=True)
        sys.exit(2)
