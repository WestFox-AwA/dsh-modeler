// Browser/Node shared indexed topology. No renderer or host dependencies.
// Welding uses a Euclidean distance (world units), never decimal rounding.
export const WELD_TOLERANCE = 1e-7;
export const DEFAULT_BUDGET = Object.freeze({ maxVertices: 1000000, maxTriangles: 1000000, maxObjects: 10000, maxCoordinate: 1e12 });

export function geometryError(operator, message) { return new Error(`${operator}: ${message}`); }
export function resolveBudget(...sources) {
  const out = { ...DEFAULT_BUDGET };
  for (const source of sources) {
    if (source == null) continue;
    if (typeof source !== 'object' || Array.isArray(source)) throw geometryError('budget', 'expected an object');
    for (const key of Object.keys(source)) {
      if (!(key in out)) throw geometryError('budget', `unknown limit ${key}`);
      const value = source[key];
      if (!Number.isFinite(value) || value <= 0 || (key !== 'maxCoordinate' && !Number.isSafeInteger(value))) throw geometryError('budget', `${key} must be a positive ${key === 'maxCoordinate' ? 'number' : 'integer'}`);
      out[key] = Math.min(out[key], value);
    }
  }
  return out;
}
export function checkBudget(vertexCount, triangleCount, budget, operator = 'mesh') {
  if (!Number.isSafeInteger(vertexCount) || !Number.isSafeInteger(triangleCount) || vertexCount > budget.maxVertices || triangleCount > budget.maxTriangles) {
    throw geometryError(operator, `budget exceeded (vertices ${vertexCount}/${budget.maxVertices}, triangles ${triangleCount}/${budget.maxTriangles})`);
  }
}
const arrayLike = (v) => Array.isArray(v) || (ArrayBuffer.isView(v) && !(v instanceof DataView));
export function validateMesh(mesh, { budget, operator = 'topology' } = {}) {
  const limits = resolveBudget(budget);
  if (!mesh || !arrayLike(mesh.vertices) || !arrayLike(mesh.indices)) throw geometryError(operator, 'expected {vertices: flat xyz, indices: flat triangle indices}');
  if (mesh.vertices.length % 3 || mesh.indices.length % 3) throw geometryError(operator, 'vertices and indices lengths must be multiples of three');
  const n = mesh.vertices.length / 3;
  checkBudget(n, mesh.indices.length / 3, limits, operator);
  for (let i = 0; i < mesh.vertices.length; i++) if (!Number.isFinite(mesh.vertices[i]) || Math.abs(mesh.vertices[i]) > limits.maxCoordinate) throw geometryError(operator, `invalid/non-finite coordinate at ${i}`);
  for (let i = 0; i < mesh.indices.length; i++) if (!Number.isSafeInteger(mesh.indices[i]) || mesh.indices[i] < 0 || mesh.indices[i] >= n) throw geometryError(operator, `invalid vertex index at ${i}`);
  return { vertices: Array.from(mesh.vertices), indices: Array.from(mesh.indices) };
}

export function indexMesh(positions, tolerance = WELD_TOLERANCE, options = {}) {
  if (typeof tolerance === 'object' && tolerance !== null) { options = tolerance; tolerance = options.tolerance ?? WELD_TOLERANCE; }
  const operator = 'indexMesh', budget = resolveBudget(options.budget);
  if (!arrayLike(positions) || positions.length % 9) throw geometryError(operator, 'positions must be flat unindexed triangles (length multiple of nine)');
  if (!Number.isFinite(tolerance) || tolerance < 0) throw geometryError(operator, 'tolerance must be finite and non-negative');
  checkBudget(0, positions.length / 9, budget, operator);
  const vertices = [], indices = [], buckets = new Map();
  const key = (x, y, z) => `${x}|${y}|${z}`;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (![x, y, z].every((v) => Number.isFinite(v) && Math.abs(v) <= budget.maxCoordinate)) throw geometryError(operator, `invalid/non-finite coordinate at ${i}`);
    let found = -1;
    if (tolerance === 0) {
      const k = key(x, y, z);
      if (buckets.has(k)) found = buckets.get(k);
      else { found = vertices.length / 3; vertices.push(x, y, z); buckets.set(k, found); }
    } else {
      const bx = Math.floor(x / tolerance), by = Math.floor(y / tolerance), bz = Math.floor(z / tolerance);
      if (![bx, by, bz].every(Number.isSafeInteger)) throw geometryError(operator, 'coordinate/tolerance ratio exceeds safe welding precision; increase tolerance or use zero for exact welding');
      search: for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const list = buckets.get(key(bx + dx, by + dy, bz + dz));
        if (!list) continue;
        for (const id of list) if (Math.hypot(vertices[id * 3] - x, vertices[id * 3 + 1] - y, vertices[id * 3 + 2] - z) <= tolerance) { found = id; break search; }
      }
      if (found < 0) {
        found = vertices.length / 3; vertices.push(x, y, z);
        const k = key(bx, by, bz), list = buckets.get(k);
        if (list) list.push(found); else buckets.set(k, [found]);
      }
    }
    if (vertices.length / 3 > budget.maxVertices) checkBudget(vertices.length / 3, positions.length / 9, budget, operator);
    indices.push(found);
  }
  // Repeated/zero-area triangles are retained, so legacy face slots do not shift.
  return { vertices, indices };
}

export function meshPositions(mesh) {
  const out = new Array(mesh.indices.length * 3);
  for (let i = 0; i < mesh.indices.length; i++) for (let axis = 0; axis < 3; axis++) out[i * 3 + axis] = mesh.vertices[mesh.indices[i] * 3 + axis];
  return out;
}
export function faceVector(vertices, a, b, c) {
  const ux = vertices[b * 3] - vertices[a * 3], uy = vertices[b * 3 + 1] - vertices[a * 3 + 1], uz = vertices[b * 3 + 2] - vertices[a * 3 + 2];
  const vx = vertices[c * 3] - vertices[a * 3], vy = vertices[c * 3 + 1] - vertices[a * 3 + 1], vz = vertices[c * 3 + 2] - vertices[a * 3 + 2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}
export function meshEdges(mesh, operator = 'topology', faces = null) {
  const edges = new Map();
  for (let f = 0; f < mesh.indices.length / 3; f++) {
    if (faces && !faces.has(f)) continue;
    const t = mesh.indices.slice(f * 3, f * 3 + 3);
    for (let j = 0; j < 3; j++) {
      const a = t[j], b = t[(j + 1) % 3], opposite = t[(j + 2) % 3];
      if (a === b) throw geometryError(operator, `degenerate edge on face ${f}`);
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (!edges.has(key)) edges.set(key, []);
      const list = edges.get(key);
      list.push({ a, b, opposite, face: f });
      if (list.length > 2) throw geometryError(operator, `non-manifold edge ${key}`);
      if (list.length === 2 && list[0].a === a) throw geometryError(operator, `inconsistent winding on edge ${key}`);
    }
  }
  return edges;
}
export function vertexNormals(mesh, operator = 'normals', rejectZero = false) {
  const out = new Array(mesh.vertices.length).fill(0);
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const ids = mesh.indices.slice(i, i + 3), n = faceVector(mesh.vertices, ...ids);
    if (!n.every(Number.isFinite)) throw geometryError(operator, 'normal overflow');
    if (rejectZero && Math.hypot(...n) === 0) throw geometryError(operator, `zero-area face ${i / 3}`);
    for (const id of ids) for (let k = 0; k < 3; k++) out[id * 3 + k] += n[k];
  }
  for (let i = 0; i < out.length; i += 3) {
    const l = Math.hypot(out[i], out[i + 1], out[i + 2]);
    if (!Number.isFinite(l)) throw geometryError(operator, 'normal overflow');
    if (rejectZero && l === 0) throw geometryError(operator, `undefined normal at vertex ${i / 3}`);
    if (l) for (let k = 0; k < 3; k++) out[i + k] /= l;
  }
  return out;
}
function selection(ids, count, operator, noun) {
  if (!arrayLike(ids) || ids.length === 0) throw geometryError(operator, `${noun} must be a non-empty array`);
  const set = new Set();
  for (const id of ids) { if (!Number.isSafeInteger(id) || id < 0 || id >= count) throw geometryError(operator, `invalid ${noun} id ${id}`); set.add(id); }
  return set;
}
export function moveVertices(mesh, { vertices, delta, budget } = {}) {
  const operator = 'moveVertices', limits = resolveBudget(budget), out = validateMesh(mesh, { budget: limits, operator });
  const ids = selection(vertices, out.vertices.length / 3, operator, 'vertices');
  if (!arrayLike(delta) || delta.length !== 3 || !Array.from(delta).every(Number.isFinite)) throw geometryError(operator, 'delta must be three finite numbers');
  for (const id of ids) for (let k = 0; k < 3; k++) out.vertices[id * 3 + k] += delta[k];
  return validateMesh(out, { budget: limits, operator });
}
export function extrudeFaces(mesh, { faces, distance, budget } = {}) {
  const operator = 'extrudeFaces', limits = resolveBudget(budget), src = validateMesh(mesh, { budget: limits, operator });
  if (!Number.isFinite(distance) || distance === 0) throw geometryError(operator, 'distance must be finite and non-zero');
  const selected = selection(faces, src.indices.length / 3, operator, 'faces');
  meshEdges(src, operator);
  const regionEdges = meshEdges(src, operator, selected), boundary = [...regionEdges.values()].filter((list) => list.length === 1).map((list) => list[0]);
  const used = new Set(), acc = new Array(src.vertices.length).fill(0);
  for (const f of selected) {
    const ids = src.indices.slice(f * 3, f * 3 + 3), n = faceVector(src.vertices, ...ids);
    if (Math.hypot(...n) === 0) throw geometryError(operator, `zero-area selected face ${f}`);
    for (const id of ids) { used.add(id); for (let k = 0; k < 3; k++) acc[id * 3 + k] += n[k]; }
  }
  checkBudget(src.vertices.length / 3 + used.size, src.indices.length / 3 + boundary.length * 2, limits, operator);
  const vertices = src.vertices.slice(), remap = new Map();
  for (const id of used) {
    const n = acc.slice(id * 3, id * 3 + 3), len = Math.hypot(...n);
    if (!len) throw geometryError(operator, `cancelling normals at selected vertex ${id}`);
    remap.set(id, vertices.length / 3);
    for (let k = 0; k < 3; k++) vertices.push(src.vertices[id * 3 + k] + n[k] / len * distance);
  }
  const indices = [];
  for (let f = 0; f < src.indices.length / 3; f++) for (let j = 0; j < 3; j++) { const id = src.indices[f * 3 + j]; indices.push(selected.has(f) ? remap.get(id) : id); }
  // The region's internal diagonals have two selected uses and produce no walls.
  for (const { a, b } of boundary) indices.push(a, b, remap.get(b), a, remap.get(b), remap.get(a));
  return validateMesh({ vertices, indices }, { budget: limits, operator });
}
