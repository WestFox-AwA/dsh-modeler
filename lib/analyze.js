import { evaluateObject, evaluateDoc } from './kernel.js';
// Immediate scene diagnostics and ASCII silhouettes. No rendering, no screenshots.
import { box as primBox, sphere as primSphere, lathe as primLathe, torus as primTorus } from './generate.js';

const DEFAULT_PARAMS = {
  box: { width: 1, height: 1, depth: 1 },
  sphere: { radius: 0.62, widthSegments: 32, heightSegments: 20 },
  cylinder: { radiusTop: 0.42, radiusBottom: 0.42, height: 1.1, radialSegments: 32 },
  cone: { radius: 0.55, height: 1.15, radialSegments: 32 },
  torus: { radius: 0.58, tube: 0.2, radialSegments: 20, tubularSegments: 40 },
  plane: { width: 1.8, height: 1.8 },
};

export function builtinPositions(obj) {
  const p = { ...(DEFAULT_PARAMS[obj.kind] || {}), ...(obj.params || {}) };
  if (obj.kind === 'box') return primBox(Number(p.width) || 1, Number(p.height) || 1, Number(p.depth) || 1);
  if (obj.kind === 'sphere') return primSphere(Number(p.radius) || 0.62, Number(p.radius) || 0.62, Number(p.radius) || 0.62, Number(p.widthSegments) || 32, Number(p.heightSegments) || 20);
  if (obj.kind === 'cylinder') return primLathe([[Number(p.radiusBottom) || 0.42, -(Number(p.height) || 1.1) / 2], [Number(p.radiusTop) || 0.42, (Number(p.height) || 1.1) / 2]], Number(p.radialSegments) || 32, true);
  if (obj.kind === 'cone') return primLathe([[Number(p.radius) || 0.55, -(Number(p.height) || 1.15) / 2], [0, (Number(p.height) || 1.15) / 2]], Number(p.radialSegments) || 32, true);
  if (obj.kind === 'torus') return primTorus(Number(p.radius) || 0.58, Number(p.tube) || 0.2, Number(p.radialSegments) || 20, Number(p.tubularSegments) || 40);
  if (obj.kind === 'plane') return primBox(Number(p.width) || 1.8, 0.002, Number(p.height) || 1.8);
  return [];
}

const clone = (v) => JSON.parse(JSON.stringify(v));

// three.js Euler order 'XYZ' composes R = Rx * Ry * Rz, so with column vectors Z
// is applied first. The previous implementation applied X first, which made any
// multi-axis part disagree with what the panel shows.
function rotPoint(p, r) {
  let [x, y, z] = p;
  const [rx, ry, rz] = r || [0, 0, 0];
  let c = Math.cos(rz), s = Math.sin(rz);
  [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(ry); s = Math.sin(ry);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rx); s = Math.sin(rx);
  [y, z] = [y * c - z * s, y * s + z * c];
  return [x, y, z];
}

export function objectPositions(obj) {
  return evaluateObject(obj, {world:true}).positions;
}

export function trianglesOf(obj) {
  const p = objectPositions(obj);
  const tris = [];
  for (let i = 0; i + 8 < p.length; i += 9) tris.push([p[i], p[i + 1], p[i + 2], p[i + 3], p[i + 4], p[i + 5], p[i + 6], p[i + 7], p[i + 8]]);
  return tris;
}

export function boundsOf(positions) {
  if (!positions.length) return null;
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]); maxX = Math.max(maxX, positions[i]);
    minY = Math.min(minY, positions[i + 1]); maxY = Math.max(maxY, positions[i + 1]);
    minZ = Math.min(minZ, positions[i + 2]); maxZ = Math.max(maxZ, positions[i + 2]);
  }
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ], size: [maxX - minX, maxY - minY, maxZ - minZ], center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2] };
}

function area(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
}

function asciiView(tris, axis, width = 48, height = 22, allBounds) {
  const b = allBounds || boundsOf(tris.flat(2));
  if (!b) return Array.from({ length: height }, () => ' '.repeat(width)).join('\n');
  const [ax, ay] = axis === 'front' ? [0, 1] : axis === 'side' ? [2, 1] : [0, 2];
  const minX = b.min[ax], maxX = b.max[ax], minY = b.min[ay], maxY = b.max[ay];
  const sx = Math.max(1e-6, maxX - minX), sy = Math.max(1e-6, maxY - minY);
  const scaleX = (width - 2) / sx, scaleY = (height - 2) / sy;
  const s = Math.min(scaleX, scaleY);
  const ox = (width - sx * s) / 2, oy = (height - sy * s) / 2;
  const grid = Array.from({ length: height }, () => Array(width).fill(' '));
  const project = (p) => [ox + (p[ax] - minX) * s, height - 1 - (oy + (p[ay] - minY) * s)];
  for (const t of tris) {
    const A = project([t[0], t[1], t[2]]);
    const B = project([t[3], t[4], t[5]]);
    const C = project([t[6], t[7], t[8]]);
    const minPX = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0])));
    const maxPX = Math.min(width - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
    const minPY = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1])));
    const maxPY = Math.min(height - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
    const den = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
    if (Math.abs(den) < 1e-6) continue;
    for (let y = minPY; y <= maxPY; y++) {
      for (let x = minPX; x <= maxPX; x++) {
        const l1 = ((B[1] - C[1]) * (x - C[0]) + (C[0] - B[0]) * (y - C[1])) / den;
        const l2 = ((C[1] - A[1]) * (x - C[0]) + (A[0] - C[0]) * (y - C[1])) / den;
        const l3 = 1 - l1 - l2;
        if (l1 >= -0.02 && l2 >= -0.02 && l3 >= -0.02) grid[y][x] = '#';
      }
    }
  }
  return grid.map((row) => row.join('')).join('\n');
}

export function analyzeDoc(doc) {
  doc = evaluateDoc(doc);
  const objects = [];
  const warnings = [];
  let triangles = 0;
  const allPositions = [];
  for (const obj of doc.objects || []) {
    const tris = trianglesOf(obj);
    const positions = tris.flat();
    const bounds = boundsOf(positions);
    triangles += tris.length;
    // push one by one: spreading a large array here overflows the stack once a
    // model reaches six figures of floats, which killed the analysis outright
    for (let i = 0; i < positions.length; i++) allPositions.push(positions[i]);
    const own = [];
    if (tris.length === 0) own.push('EMPTY_GEOMETRY');
    const badScale = (obj.scale || [1, 1, 1]).some((v) => Math.abs(v) < 1e-4);
    if (badScale) own.push('ZERO_SCALE');
    let degenerate = 0;
    for (const t of tris) if (area([t[0], t[1], t[2]], [t[3], t[4], t[5]], [t[6], t[7], t[8]]) < 1e-9) degenerate++;
    if (degenerate) own.push('DEGENERATE_TRIANGLES:' + degenerate);
    if (!obj.material?.color) own.push('MISSING_MATERIAL');
    if (bounds && bounds.min[1] < -0.02) own.push('BELOW_FLOOR');
    if (bounds) {
      const size = bounds.size;
      if (Math.max(...size) > 100) own.push('HUGE_OBJECT');
    }
    if (own.length) warnings.push({ objectId: obj.id, name: obj.name, codes: own });
    objects.push({ id: obj.id, name: obj.name, triangles: tris.length, bounds, warnings: own, material: obj.material?.color, modifiers: obj.modifiers });
  }
  const bounds = boundsOf(allPositions);
  if (!doc.objects?.length) warnings.push({ objectId: null, name: 'scene', codes: ['EMPTY_SCENE'] });
  if (triangles > 250000) warnings.push({ objectId: null, name: 'scene', codes: ['HIGH_TRIANGLE_COUNT'] });
  // AABB overlaps are expected for layered hard-surface parts; report as info, not warnings.
  const overlaps = [];
  const bbs = objects.filter((o) => o.bounds).map((o) => ({ id: o.id, name: o.name, b: o.bounds }));
  for (let i = 0; i < bbs.length && overlaps.length < 12; i++) {
    for (let j = i + 1; j < bbs.length && overlaps.length < 12; j++) {
      const A = bbs[i].b, B = bbs[j].b;
      const ox = Math.min(A.max[0], B.max[0]) - Math.max(A.min[0], B.min[0]);
      const oy = Math.min(A.max[1], B.max[1]) - Math.max(A.min[1], B.min[1]);
      const oz = Math.min(A.max[2], B.max[2]) - Math.max(A.min[2], B.min[2]);
      if (ox <= 0 || oy <= 0 || oz <= 0) continue;
      const v = ox * oy * oz;
      const minVol = Math.min(A.size[0] * A.size[1] * A.size[2], B.size[0] * B.size[1] * B.size[2]);
      if (minVol > 0 && v / minVol > 0.85) overlaps.push(bbs[i].name + ' ↔ ' + bbs[j].name);
    }
  }
  const tris = [];
  for (const obj of doc.objects || []) for (const triangle of trianglesOf(obj)) tris.push(triangle);
  const views = {
    front: asciiView(tris, 'front', 52, 22, bounds),
    side: asciiView(tris, 'side', 52, 22, bounds),
    top: asciiView(tris, 'top', 52, 22, bounds),
  };
  return {
    summary: {
      title: doc.meta?.title || null,
      objects: doc.objects?.length || 0,
      triangles,
      materials: new Set((doc.objects || []).map((o) => JSON.stringify(o.material || {}))).size,
      bounds,
      warnings: warnings.length,
    },
    objects,
    warnings,
    views,
  };
}

export function diffDocs(before, after) {
  const map = (doc) => new Map((doc?.objects || []).map((o) => [o.id, o]));
  const a = map(before), b = map(after);
  const added = [], removed = [], updated = [];
  for (const [id, o] of b) {
    if (!a.has(id)) { added.push(o.name); continue; }
    const prev = a.get(id);
    const same = JSON.stringify(prev.geometryData) === JSON.stringify(o.geometryData)
      && JSON.stringify(prev.recipe) === JSON.stringify(o.recipe)
      && JSON.stringify(prev.topology) === JSON.stringify(o.topology)
      && JSON.stringify(prev.parts) === JSON.stringify(o.parts)
      && prev.visible === o.visible
      && JSON.stringify(prev.position) === JSON.stringify(o.position)
      && JSON.stringify(prev.rotation) === JSON.stringify(o.rotation)
      && JSON.stringify(prev.scale) === JSON.stringify(o.scale)
      && JSON.stringify(prev.material) === JSON.stringify(o.material)
      && JSON.stringify(prev.modifiers) === JSON.stringify(o.modifiers);
    if (!same) updated.push(o.name);
  }
  for (const [id, o] of a) if (!b.has(id)) removed.push(o.name);
  return { added, removed, updated, counts: { added: added.length, removed: removed.length, updated: updated.length } };
}
