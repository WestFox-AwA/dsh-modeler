/**
 * Read-only execution of author-declared doc.meta.editingRelations (at most 64).
 * Exact object id is the only reference namespace; group ids aggregate all
 * evaluated descendants, including hidden geometry. No undeclared warnings.
 *
 * checkEditingRelations(doc,{maxTests=100000,budget?,mode='enforced'}={}) returns
 * {ok,complete,checks,conflicts,budget?}. Each check has id/relationId/type/path,
 * status pass|conflict|unknown, complete, and type-specific actual/witness data.
 * Every conflict and unknown appears in conflicts. Unknown always means
 * complete:false and ok:false, including unsupported outside-gap semantics.
 * mode='report' is observational metadata; it never masks a failed result.
 *
 * gap: {id,type,source,target,minimum,maximum?,tolerance?,side?:'outside'}.
 *   actual is unsigned world triangle surface minimum distance, crossing=0.
 *   closest contains worldPoints/sourceIDs/triangles. Not a solid collision or
 *   containment certificate; outside currently declines with unknown.
 * halfspace: {id,type,source,target?,plane:{point,normal},space?:'world'|
 *   'target-local',minimum?:0,tolerance?}. Every source world vertex is checked.
 *   Target-local normals use normalized inverse transpose of composed affine.
 *   actual/minimumSignedDistance, maximumSignedDistance, worst/best are exact
 *   extrema over evaluated triangle vertices, with worldPoint/sourceID.
 * wallThickness: {id,type,target,probes:[{origin,direction}],minimum,maximum?,
 *   maxDistance,tolerance?}. 1..64 explicit WORLD probes; target must be closed
 *   consistently wound. First two distinct ordered ray hits need entry dot<0,
 *   exit dot>0. reports probes[].actual/worldPoints/sourceIDs/probeIndex.
 *   Scope is declared-probes-only, never global minimum wall thickness.
 * envelope: {id,type,source,space?:'world'|'source-local',bounds:{min,max},
 *   tolerance?}. Every evaluated triangle vertex is tested in the named frame.
 *   Bounds are author-declared limits, never inferred intent.
 *
 * One sequential maxTests budget counts pair/ray triangle tests, triangles used
 * for wall topology proof, and vertex predicates. Kernel evaluation separately
 * uses existing doc/kernel budgets. Partial results never pass.
 *
 * placementTransform(doc,{id,frame,anchor=[0,0,0],offset=0,align=true}) returns
 * {op:'transform',id,position,rotation,scale,result}. Parent passes just ordinary
 * operation fields to its transform pipeline and keeps result as the receipt.
 * frame.worldMatrix (fallback frame.matrix) is authoritative column-major WORLD
 * affine; columns T/B/N map directly to +X/+Y/+Z. Vector fallback accepts
 * {origin,tangent,bitangent,normal}. Anchor is SOURCE LOCAL, lands exactly at
 * frame origin + normalized normal*offset. Preserve signed authored local scale;
 * decompose pure parent-relative rotation with THREE XYZ matching kernel.
 * Reject shear or incompatible reflection; never approximate local TRS.
 * align:false changes only position and preserves own rotation/scale exactly,
 * even through inherited affine shear. No source/asset writes occur here.
 */
import { Matrix4, Vector3, Quaternion, Euler } from "../vendor/three.js";
import { checkInterfaceRelations } from "./assembly-interfaces.js";
import { checkSolidRelation } from "./solid-relations.js";
import { evaluateDoc } from "./kernel.js";
import { identityMatrix, objectMatrix, multiplyMatrix, inverseMatrix, transformPoint, transformDirection } from "./relations.js";
import { trianglesFromPositions, pairSurfaces, raycastTriangles, meshTopology } from "./spatial-query.js";
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k), obj = (x) => x !== null && typeof x === "object" && !Array.isArray(x) && !ArrayBuffer.isView(x), finite = Number.isFinite;
const vec = (x) => (Array.isArray(x) || ArrayBuffer.isView(x)) && x.length === 3 && Array.from(x).every(finite), dot = (a, b) => a.reduce((s, v, k) => s + v * b[k], 0), sub = (a, b) => a.map((v, k) => v - b[k]), cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const err = (code, message, path) => Object.assign(new Error(message), { code, path });
function unit(a, path) {
  const l = Math.hypot(...a);
  if (!finite(l) || !l) throw err("invalid_vector", "direction must have a finite non-zero length", path);
  return Array.from(a, (v) => v / l);
}
function fields(o, allowed, path) {
  if (!obj(o)) throw err("invalid_object", `${path} must be an object`, path);
  for (const k of Object.keys(o)) if (!allowed.includes(k)) throw err("unknown_field", `unknown field ${k}`, `${path}.${k}`);
}
function vector(v, path) {
  if (!vec(v)) throw err("invalid_vector", `${path} needs three finite numbers`, path);
  return Array.from(v);
}
function num(n, path, min = -Infinity) {
  if (!finite(n) || n < min) throw err("invalid_number", `${path} must be finite and >= ${min}`, path);
  return n;
}
function exact(id, path) {
  if (typeof id !== "string" || !id) throw err("invalid_id", `${path} must be an exact ID`, path);
  return id;
}
function affine(m, path) {
  if (!(Array.isArray(m) || ArrayBuffer.isView(m)) || m.length !== 16 || !Array.from(m).every(finite)) throw err("invalid_matrix", "expected finite column-major affine matrix", path);
  m = Array.from(m);
  if (m[3] !== 0 || m[7] !== 0 || m[11] !== 0 || m[15] !== 1) throw err("invalid_matrix", "matrix must be affine", path);
  const c = [m.slice(0, 3), m.slice(4, 7), m.slice(8, 11)].map(unit);
  if (Math.abs(dot(c[0], cross(c[1], c[2]))) < 1e-12) throw err("singular_transform", "singular affine transform", path);
  return m;
}
function entriesFor(doc) {
  if (!obj(doc) || !Array.isArray(doc.objects)) throw err("invalid_document", "document needs objects[]", "doc");
  const entries = /* @__PURE__ */ new Map();
  function walk(xs, parent = identityMatrix(), parents = [], ancestors = []) {
    if (parents.length > 64) throw err("hierarchy_limit", "hierarchy exceeds 64 levels");
    for (const o of xs) {
      if (!obj(o)) throw err("invalid_hierarchy", "invalid object");
      exact(o.id, "object.id");
      if (entries.has(o.id)) throw err("duplicate_id", `duplicate object ID ${o.id}`);
      for (const k of ["position", "rotation", "scale"]) if (own(o, k)) vector(o[k], `${o.id}.${k}`);
      if (o.scale?.some((x) => x === 0)) throw err("singular_transform", "zero object scale");
      const matrix = affine(multiplyMatrix(parent, objectMatrix(o)), `${o.id}.matrix`);
      entries.set(o.id, { object: o, matrix, parentMatrix: parent, ancestors });
      if (own(o, "parts")) {
        if (!Array.isArray(o.parts)) throw err("invalid_hierarchy", "parts must be an array");
        walk(o.parts, matrix, [...parents, o.id], [...ancestors, o]);
      }
    }
  }
  walk(doc.objects);
  return entries;
}
function worldFrame(frame, align) {
  if (!obj(frame)) throw err("invalid_frame", "frame must be native world frame");
  const raw = frame.worldMatrix ?? frame.matrix;
  let origin, axes;
  if (raw !== void 0) {
    const m = affine(raw, "frame.worldMatrix");
    origin = m.slice(12, 15);
    axes = [m.slice(0, 3), m.slice(4, 7), m.slice(8, 11)].map(unit);
  } else {
    origin = vector(frame.origin, "frame.origin");
    axes = align ? [unit(vector(frame.tangent, "frame.tangent")), unit(vector(frame.bitangent, "frame.bitangent")), unit(vector(frame.normal, "frame.normal"))] : [null, null, unit(vector(frame.normal, "frame.normal"))];
  }
  if (align && (Math.max(Math.abs(dot(axes[0], axes[1])), Math.abs(dot(axes[0], axes[2])), Math.abs(dot(axes[1], axes[2]))) > 1e-9 || dot(axes[0], cross(axes[1], axes[2])) < 1 - 1e-9)) throw err("frame_shear", "frame needs orthogonal right-handed T/B/N columns");
  return { origin, axes, normal: axes[2] };
}
const matrixNear = (a, b) => a.every((v, k) => Math.abs(v - b[k]) <= 2e-9 * Math.max(1, Math.abs(v), Math.abs(b[k])));
function placementTransform(doc, args = {}) {
  fields(args, ["id", "frame", "anchor", "offset", "align"], "placement");
  const { id, frame, anchor = [0, 0, 0], offset = 0, align = true } = args;
  exact(id, "placement.id");
  vector(anchor, "placement.anchor");
  num(offset, "placement.offset");
  if (typeof align !== "boolean") throw err("invalid_align", "align must be boolean");
  const entry = entriesFor(doc).get(id);
  if (!entry) throw err("missing_target", `exact object ID ${id} does not exist`, "placement.id");
  if (entry.ancestors.some((o) => (o.modifiers ?? []).some((m) => m.enabled !== false))) throw err("ancestor_modifiers_unsupported", "placement through ancestor geometry modifiers unsupported");
  const f = worldFrame(frame, align), scale = Array.from(entry.object.scale ?? [1, 1, 1]), inverse = inverseMatrix(entry.parentMatrix), target = f.origin.map((v, k) => v + f.normal[k] * offset);
  let rotation = Array.from(entry.object.rotation ?? [0, 0, 0]);
  if (align) {
    const axes = f.axes.map((axis, k) => unit(transformDirection(axis, inverse)).map(v => v * Math.sign(scale[k]))), error = Math.max(Math.abs(dot(axes[0], axes[1])), Math.abs(dot(axes[0], axes[2])), Math.abs(dot(axes[1], axes[2])));
    if (error > 1e-9) throw Object.assign(err("shear_unsupported", "world frame requires local shear"), { orthogonalityError: error });
    if (dot(axes[0], cross(axes[1], axes[2])) < 0) throw err("reflection_unsupported", "frame orientation is incompatible with preserved local scale signs and parent reflection");
    const m = new Matrix4().makeBasis(...axes.map((a2) => new Vector3(...a2))), p = new Vector3(), q = new Quaternion(), s = new Vector3();
    m.decompose(p, q, s);
    const e = new Euler().setFromQuaternion(q, "XYZ");
    rotation = [e.x, e.y, e.z];
    if (!matrixNear(objectMatrix({ rotation }), m.elements)) throw err("shear_unsupported", "local frame cannot be represented exactly as XYZ TRS");
  }
  const localTarget = transformPoint(target, inverse), a = transformPoint(Array.from(anchor), objectMatrix({ rotation, scale })), position = localTarget.map((v, k) => v - a[k]), operation = { op: "transform", id, position, rotation, scale }, worldMatrix = multiplyMatrix(entry.parentMatrix, objectMatrix(operation)), worldAnchor = transformPoint(Array.from(anchor), worldMatrix);
  if (worldAnchor.some((v, k) => Math.abs(v - target[k]) > 2e-9 * Math.max(1, Math.abs(v), Math.abs(target[k])))) throw err("inexact_placement", "anchor placement cannot be represented exactly");
  return { ...operation, result: { aligned: align, anchor: Array.from(anchor), offset, targetWorld: target, worldAnchor, worldMatrix, frameOrigin: f.origin, frameNormal: f.normal, localScalePreserved: true, axisConvention: "+X=tangent,+Y=bitangent,+Z=normal", space: "world" } };
}
const DELEGATED_TYPES = ["join", "coaxial", "outside", "nonIntersection"];
const TYPES = ["gap", "halfspace", "wallThickness", "envelope", ...DELEGATED_TYPES], TOL = 1e-7;
const relationPath = (i) => `meta.editingRelations[${i}]`;
function check(r, i, status, extra = {}) {
  return { id: typeof r?.id === "string" ? r.id : null, relationId: typeof r?.id === "string" ? r.id : null, type: typeof r?.type === "string" ? r.type : null, path: relationPath(i), ...typeof r?.source === "string" ? { source: r.source } : {}, ...typeof r?.target === "string" ? { target: r.target } : {}, status, complete: status !== "unknown", ...extra };
}
const unknown = (r, i, code, reason, extra = {}) => check(r, i, "unknown", { code, reason, ...extra });
function validate(r, i) {
  const p = relationPath(i);
  if (!obj(r)) throw err("invalid_relation", "relation must be an object", p);
  exact(r.id, `${p}.id`);
  if (!TYPES.includes(r.type)) throw err("unknown_type", `unknown relation type ${r.type}`, `${p}.type`);
  if (DELEGATED_TYPES.includes(r.type)) return; // Dedicated validators own new contracts.
  fields(r, ["id", "type", "tolerance", "mode", ...{ gap: ["source", "target", "minimum", "maximum", "side"], halfspace: ["source", "target", "plane", "space", "minimum"], wallThickness: ["target", "probes", "minimum", "maximum", "maxDistance"], envelope: ["source", "space", "bounds"] }[r.type]], p);
  if (own(r, "tolerance") && num(r.tolerance, `${p}.tolerance`, 0) === 0) throw err("invalid_tolerance", "tolerance must be positive", `${p}.tolerance`);
  if (own(r, "mode") && !["enforced", "report"].includes(r.mode)) throw err("invalid_mode", "mode must be enforced or report", `${p}.mode`);
  if (r.type !== "wallThickness") exact(r.source, `${p}.source`);
  if (r.type === "gap" || r.type === "wallThickness" || own(r, "target")) exact(r.target, `${p}.target`);
  if (["gap", "wallThickness"].includes(r.type)) {
    num(r.minimum, `${p}.minimum`, 0);
    if (own(r, "maximum")) {
      num(r.maximum, `${p}.maximum`, 0);
      if (r.maximum < r.minimum) throw err("invalid_interval", "maximum must be >= minimum", `${p}.maximum`);
    }
  }
  if (r.type === "gap") {
    if (r.source === r.target) throw err("self_relation", "gap needs distinct source and target", `${p}.target`);
    if (own(r, "side") && r.side !== "outside") throw err("invalid_side", "side must be outside when supplied", `${p}.side`);
  } else if (r.type === "halfspace") {
    if (!["world", "target-local"].includes(r.space ?? "world")) throw err("invalid_space", "space must be world or target-local", `${p}.space`);
    if (r.space === "target-local") exact(r.target, `${p}.target`);
    fields(r.plane, ["point", "normal"], `${p}.plane`);
    vector(r.plane.point, `${p}.plane.point`);
    unit(vector(r.plane.normal, `${p}.plane.normal`), `${p}.plane.normal`);
    if (own(r, "minimum")) num(r.minimum, `${p}.minimum`);
  } else if (r.type === "wallThickness") {
    num(r.maxDistance, `${p}.maxDistance`, 0);
    if (!Array.isArray(r.probes) || !r.probes.length || r.probes.length > 64) throw err("invalid_probes", "probes needs 1..64 world rays", `${p}.probes`);
    r.probes.forEach((v, k) => {
      fields(v, ["origin", "direction"], `${p}.probes[${k}]`);
      vector(v.origin, `${p}.probes[${k}].origin`);
      unit(vector(v.direction, `${p}.probes[${k}].direction`), `${p}.probes[${k}].direction`);
    });
  } else {
    if (!["world", "source-local"].includes(r.space ?? "world")) throw err("invalid_space", "space must be world or source-local", `${p}.space`);
    fields(r.bounds, ["min", "max"], `${p}.bounds`);
    const a = vector(r.bounds.min, `${p}.bounds.min`), b = vector(r.bounds.max, `${p}.bounds.max`);
    if (a.some((v, k) => v > b[k])) throw err("invalid_bounds", "bounds.min must be <= bounds.max", `${p}.bounds`);
  }
}
function contextFor(doc, budget) {
  const entries = entriesFor(doc), cache = new Map();
  let draw, evaluationError;
  return { entries, geometry(id) {
    if (cache.has(id)) return cache.get(id);
    if (!draw) {
      if (evaluationError) throw evaluationError;
      try { draw = evaluateDoc(doc, { budget }); }
      catch (error) { evaluationError = error; throw error; }
    }
    const triangles = [], points = [];
    for (const o of draw.objects) if (o.editableId === id || o.parentIds?.includes(id)) {
      const ts = trianglesFromPositions(o.geometryData.positions, { id: o.id, editableId: o.editableId, semanticId: o.semanticId, path: [...o.parentIds ?? [], o.editableId].join("/") });
      for (const t of ts) {
        triangles.push(t);
        for (const point of [t.a, t.b, t.c]) points.push({ point, sourceID: o.editableId, triangle: t.index });
      }
    }
    const out = { triangles, points };
    cache.set(id, out);
    return out;
  } };
}
function workFor(limit) {
  let used = 0;
  return { get used() {
    return used;
  }, remaining: () => limit - used, take(n = 1) {
    if (n > limit - used) return false;
    used += n;
    return true;
  }, add(n) {
    if (!Number.isSafeInteger(n) || n < 0 || n > limit - used) throw err("budget_accounting", "spatial query exceeded shared budget");
    used += n;
  } };
}
function gapCheck(r, i, ctx, work) {
  const a = ctx.geometry(r.source), b = ctx.geometry(r.target), tolerance = r.tolerance ?? TOL;
  if (!a.triangles.length || !b.triangles.length) return unknown(r, i, "empty_surface", "source or target has no evaluated surface");
  if (!work.remaining()) return unknown(r, i, "test_limit", "shared budget exhausted before gap");
  const q = pairSurfaces(a.triangles, b.triangles, { maxTests: work.remaining(), tolerance });
  work.add(q.tests);
  const actual = q.crossing ? 0 : q.minimumDistance, closest = q.closest ? { worldPoints: [q.closest.a.point, q.closest.b.point], sourceIDs: [q.closest.a.triangle.editableId, q.closest.b.triangle.editableId], triangles: [q.closest.a.triangle, q.closest.b.triangle] } : null, data = { actual, closest, crossing: q.crossing, contact: q.contact, tests: q.tests, scope: "unsigned-surface-minimum-distance", definition: "Minimum Euclidean distance between evaluated world triangle surfaces; crossings have distance zero. This is not a solid collision or containment certificate." };
  if (!q.complete) return unknown(r, i, "test_limit", "surface pair query incomplete under shared test budget", data);
  if (r.side === "outside") return unknown(r, i, "unsupported_side", "outside requires a closed-target/component containment proof; unsigned surface gap does not certify that side", data);
  if (!finite(actual)) return unknown(r, i, "nonfinite_result", "surface distance could not be represented finitely", data);
  const conflict = actual < r.minimum - tolerance || r.maximum !== void 0 && actual > r.maximum + tolerance;
  return check(r, i, conflict ? "conflict" : "pass", { ...data, ...conflict ? { code: "gap_out_of_range", reason: "surface gap outside declared interval" } : {} });
}
function halfspaceCheck(r, i, ctx, work) {
  const g = ctx.geometry(r.source), tolerance = r.tolerance ?? TOL;
  if (!g.points.length) return unknown(r, i, "empty_surface", "source has no evaluated vertices");
  let point = Array.from(r.plane.point), normal = unit(r.plane.normal);
  if (r.space === "target-local") {
    const m = ctx.entries.get(r.target).matrix, inv = inverseMatrix(m);
    point = transformPoint(point, m);
    normal = unit([0, 1, 2].map((k) => inv[k * 4] * normal[0] + inv[k * 4 + 1] * normal[1] + inv[k * 4 + 2] * normal[2]));
  }
  let min = Infinity, max = -Infinity, worst = null, best = null, n = 0;
  for (const p of g.points) {
    if (!work.take()) return unknown(r, i, "test_limit", "halfspace scan incomplete under shared budget", { checkedVertices: n, observedMinimum: n ? min : null, observedMaximum: n ? max : null, worst, best });
    n++;
    const d = dot(sub(p.point, point), normal);
    if (!finite(d)) return unknown(r, i, "nonfinite_result", "signed distance overflowed finite arithmetic", {checkedVertices:n});
    if (d < min) {
      min = d;
      worst = { worldPoint: p.point, sourceID: p.sourceID, triangle: p.triangle, signedDistance: d };
    }
    if (d > max) {
      max = d;
      best = { worldPoint: p.point, sourceID: p.sourceID, triangle: p.triangle, signedDistance: d };
    }
  }
  const conflict = min < (r.minimum ?? 0) - tolerance;
  return check(r, i, conflict ? "conflict" : "pass", { actual: min, minimumSignedDistance: min, maximumSignedDistance: max, worst, best, plane: { point, normal, space: "world" }, checkedVertices: n, scope: "all-evaluated-source-vertices", ...conflict ? { code: "halfspace_violation", reason: "source crosses declared halfspace limit", witness: worst } : {} });
}
function wallCheck(r, i, ctx, work) {
  const tris = ctx.geometry(r.target).triangles, tolerance = r.tolerance ?? TOL;
  if (!tris.length) return unknown(r, i, "empty_surface", "target has no evaluated surface");
  if (!work.take(tris.length)) return unknown(r, i, "test_limit", "shared budget insufficient for target topology proof");
  const topology = meshTopology(tris, { tolerance });
  if (!topology.closed) return check(r, i, "conflict", { code: "open_or_invalid_wall", reason: "target is not a closed consistently wound manifold", topology, scope: "declared-probes-only", probes: [] });
  const probes = [];
  let complete = true, conflict = false;
  for (let k = 0; k < r.probes.length; k++) {
    const p = r.probes[k], direction = unit(p.direction);
    if (!work.remaining()) {
      complete = false;
      probes.push({ probeIndex: k, status: "unknown", complete: false, code: "test_limit" });
      continue;
    }
    const q = raycastTriangles(tris, Array.from(p.origin), direction, { maxTests: work.remaining(), maxDistance: r.maxDistance, maxHits: Math.max(1, tris.length), tolerance });
    work.add(q.tests);
    const groups = [];
    for (const h of q.hits) {
      const last = groups.at(-1);
      if (last && Math.abs(h.distance - last[0].distance) <= tolerance) last.push(h);
      else groups.push([h]);
    }
    const probe = { probeIndex: k, origin: Array.from(p.origin), direction, status: "pass", complete: q.complete, distinctHits: groups.length, tests: q.tests };
    if (!q.complete || q.truncatedHits) {
      complete = false;
      Object.assign(probe, { status: "unknown", complete: false, code: "test_limit" });
    } else if (groups.length < 2) {
      conflict = true;
      Object.assign(probe, { status: "conflict", code: "probe_miss_or_open", reason: "fewer than two distinct hits within maxDistance" });
    } else {
      const [a, b] = groups.slice(0, 2), first = a[0], second = b[0], distance = second.distance - first.distance, entryDots = a.map((h) => dot(h.normal, direction)), exitDots = b.map((h) => dot(h.normal, direction));
      Object.assign(probe, { actual: distance, worldPoints: [first.point, second.point], sourceIDs: [first.triangle.editableId, second.triangle.editableId], entry: { worldPoint: first.point, normal: first.normal, distance: first.distance, triangle: first.triangle }, exit: { worldPoint: second.point, normal: second.normal, distance: second.distance, triangle: second.triangle }, entryDots, exitDots });
      if (first.distance <= tolerance || entryDots.some((d) => d >= -1e-10) || exitDots.some((d) => d <= 1e-10)) {
        conflict = true;
        Object.assign(probe, { status: "conflict", code: "wrong_orientation", reason: "ray must start outside, then enter with negative normal dot and exit with positive normal dot" });
      } else if (distance < r.minimum - tolerance || r.maximum !== void 0 && distance > r.maximum + tolerance) {
        conflict = true;
        Object.assign(probe, { status: "conflict", code: "thickness_out_of_range", reason: "probe thickness outside declared interval" });
      }
    }
    probes.push(probe);
  }
  return check(r, i, !complete ? "unknown" : conflict ? "conflict" : "pass", { complete, probes, topology, scope: "declared-probes-only", definition: "Distance between first two distinct ordered world ray hits with opposing entry/exit winding; does not certify a global minimum wall thickness.", ...!complete ? { code: "test_limit", reason: "not every declared wall probe completed" } : conflict ? { code: "wall_probe_conflict", reason: "one or more wall probes failed", witness: probes.find((p) => p.status === "conflict") } : {} });
}
function envelopeCheck(r, i, ctx, work) {
  const g = ctx.geometry(r.source), tolerance = r.tolerance ?? TOL;
  if (!g.points.length) return unknown(r, i, "empty_surface", "source has no evaluated vertices");
  const inverse = r.space === "source-local" ? inverseMatrix(ctx.entries.get(r.source).matrix) : null, min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let n = 0, violations = 0, witness = null;
  for (const p of g.points) {
    if (!work.take()) return unknown(r, i, "test_limit", "envelope scan incomplete under shared budget", { checkedVertices: n, observedBounds: n ? { min, max } : null, violations, witness });
    n++;
    const point = inverse ? transformPoint(p.point, inverse) : p.point.slice();
    if (!point.every(finite)) return unknown(r, i, "nonfinite_result", "source-local vertex overflowed finite arithmetic", {checkedVertices:n});
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], point[k]);
      max[k] = Math.max(max[k], point[k]);
    }
    const axis = [0, 1, 2].find((k) => point[k] < r.bounds.min[k] - tolerance || point[k] > r.bounds.max[k] + tolerance);
    if (axis !== void 0) {
      violations++;
      witness ??= { worldPoint: p.point, point, sourceID: p.sourceID, triangle: p.triangle, axis, side: point[axis] < r.bounds.min[axis] - tolerance ? "min" : "max" };
    }
  }
  return check(r, i, violations ? "conflict" : "pass", { actual: { min, max }, space: r.space ?? "world", checkedVertices: n, violations, scope: "all-evaluated-source-vertices", ...violations ? { code: "outside_envelope", reason: "source vertices exceed declared bounds", witness } : {} });
}
function checkEditingRelations(doc, options = {}) {
  const checks = [], conflicts = [];
  let work;
  const done = () => ({ ok: checks.every((c) => c.complete) && conflicts.length === 0, complete: checks.every((c) => c.complete), checks, conflicts, ...work ? { budget: { maxTests: options.maxTests ?? 1e5, used: work.used } } : {} });
  try {
    fields(options, ["maxTests", "budget", "mode", "resolvedFrames"], "options");
    const limit = options.maxTests ?? 1e5;
    if (!Number.isSafeInteger(limit) || limit < 1) throw err("invalid_budget", "maxTests must be a positive safe integer", "options.maxTests");
    if (own(options, "mode") && !["enforced", "report"].includes(options.mode)) throw err("invalid_mode", "mode must be enforced or report", "options.mode");
    if (!obj(doc) || !Array.isArray(doc.objects)) throw err("invalid_document", "document needs objects[]", "doc");
    if (!own(doc.meta ?? {}, "editingRelations")) return done();
    const declarations = doc.meta.editingRelations;
    if (!Array.isArray(declarations)) throw err("invalid_declarations", "editingRelations must be an array", "meta.editingRelations");
    if (!declarations.length) return done();
    work = workFor(limit);
    let ctx, contextError;
    try {
      ctx = contextFor(doc, options.budget);
    } catch (e) {
      contextError = e;
    }
    const ids = /* @__PURE__ */ new Set();
    for (let i = 0; i < Math.min(64, declarations.length); i++) {
      const r = declarations[i];
      let result;
      try {
        validate(r, i);
        if (ids.has(r.id)) throw err("duplicate_relation_id", `duplicate relation ID ${r.id}`, `${relationPath(i)}.id`);
        ids.add(r.id);
        if (contextError) result = unknown(r, i, contextError.code ?? "evaluation_failed", contextError.message, { path: contextError.path ?? relationPath(i) });
        else {
          const missing = ["source", "target"].find((k) => own(r, k) && !ctx.entries.has(r[k]));
          if (missing) result = check(r, i, "conflict", { code: "missing_target", objectId: r[missing], path: `${relationPath(i)}.${missing}`, reason: `exact object ID ${r[missing]} does not exist` });
          else {
            try {
              if (DELEGATED_TYPES.includes(r.type)) {
                const optionsFor = { maxTests: work.remaining(), budget: options.budget };
                if (r.type === "join" || r.type === "coaxial") {
                  const delegated = checkInterfaceRelations(doc, [r], { ...optionsFor, ...(options.resolvedFrames ? { resolvedFrames: options.resolvedFrames } : {}) });
                  work.add(delegated.budget.used);
                  result = { ...delegated.checks[0], path: relationPath(i) };
                } else {
                  const delegated = checkSolidRelation(doc, r, optionsFor);
                  work.add(delegated.budget.used);
                  result = { ...delegated, path: relationPath(i) };
                }
              } else result = { gap: gapCheck, halfspace: halfspaceCheck, wallThickness: wallCheck, envelope: envelopeCheck }[r.type](r, i, ctx, work);
            }
            catch (error) { result = unknown(r, i, error.code ?? "evaluation_failed", error.message, { path: error.path ?? relationPath(i) }); }
          }
        }
      } catch (e) {
        result = check(r, i, "conflict", { code: e.code ?? "invalid_relation", path: e.path ?? relationPath(i), reason: e.message });
      }
      checks.push(result);
      if (result.status !== "pass") conflicts.push(result);
    }
    if (declarations.length > 64) {
      const result = { id: null, relationId: null, type: null, path: "meta.editingRelations", status: "unknown", complete: false, code: "relation_limit", reason: "more than 64 declared relations; excess declarations were not checked" };
      checks.push(result);
      conflicts.push(result);
    }
    return done();
  } catch (e) {
    const result = { id: null, relationId: null, type: null, path: e.path ?? "doc", status: "conflict", complete: true, code: e.code ?? "invalid_request", reason: e.message };
    checks.push(result);
    conflicts.push(result);
    return done();
  }
}
export {
  checkEditingRelations,
  placementTransform
};
