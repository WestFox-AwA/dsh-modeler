import { evaluateObject, evaluateDoc } from './kernel.js';
// Part-to-part interpenetration.
//
// `auditAssembly` only sees parts that are too far apart. The opposite failure —
// parts sunk into each other — is invisible to every existing check, yet it
// produces hidden surfaces, coplanar faces that shimmer, and geometry nobody
// can see. This reports pairs whose surfaces actually cross, counted in
// triangle pairs so a light touch and a deep intrusion are distinguishable.

function rotateEuler(p, r) {
  let [x, y, z] = p;
  let c = Math.cos(r[2]), s = Math.sin(r[2]);
  [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(r[1]); s = Math.sin(r[1]);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(r[0]); s = Math.sin(r[0]);
  [y, z] = [y * c - z * s, y * s + z * c];
  return [x, y, z];
}

function worldTriangles(o) {
  const src = evaluateObject(o).positions;
  if (!Array.isArray(src) || src.length < 9) return null;
  const pos = o.position || [0, 0, 0];
  const rot = o.rotation || [0, 0, 0];
  const sc = o.scale || [1, 1, 1];
  const out = [];
  for (let i = 0; i + 8 < src.length; i += 9) {
    const tri = [];
    for (let k = 0; k < 3; k++) {
      const q = rotateEuler([src[i + k * 3] * sc[0], src[i + k * 3 + 1] * sc[1], src[i + k * 3 + 2] * sc[2]], rot);
      tri.push([q[0] + pos[0], q[1] + pos[1], q[2] + pos[2]]);
    }
    out.push(tri);
  }
  return out;
}

function boundsOf(tris) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (const p of t) for (let k = 0; k < 3; k++) {
    if (p[k] < min[k]) min[k] = p[k];
    if (p[k] > max[k]) max[k] = p[k];
  }
  return { min, max };
}

const overlap = (a, b, eps) => [0, 1, 2].every((k) => a.min[k] < b.max[k] - eps && b.min[k] < a.max[k] - eps);

/* Moller-Trumbore: does segment p0->p1 cross triangle (a,b,c)? */
function segmentHitsTriangle(p0, p1, tri) {
  const [a, b, c] = tri;
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
  const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
  if (Math.abs(det) < 1e-10) return false;           // parallel or coplanar
  const inv = 1 / det;
  const s = [p0[0] - a[0], p0[1] - a[1], p0[2] - a[2]];
  const u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) * inv;
  if (u < -1e-6 || u > 1 + 1e-6) return false;
  const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
  const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv;
  if (v < -1e-6 || u + v > 1 + 1e-6) return false;
  const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
  return t > 1e-5 && t < 1 - 1e-5;                    // crossing, not just touching
}

function trianglesCross(t1, t2) {
  for (let i = 0; i < 3; i++) {
    const a = t1[i], b = t1[(i + 1) % 3];
    if (segmentHitsTriangle(a, b, t2)) return true;
  }
  for (let i = 0; i < 3; i++) {
    const a = t2[i], b = t2[(i + 1) % 3];
    if (segmentHitsTriangle(a, b, t1)) return true;
  }
  return false;
}

/* ------------------------------------------------------- coplanar faces ---- */

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len3 = (a) => Math.hypot(a[0], a[1], a[2]);

function planeOf(tri) {
  const n = cross3(sub3(tri[1], tri[0]), sub3(tri[2], tri[0]));
  const l = len3(n);
  if (l < 1e-12) return null;
  const u = [n[0] / l, n[1] / l, n[2] / l];
  return { n: u, d: dot3(u, tri[0]), area: l / 2 };
}

// 2D convex overlap by separating axes, on the shared plane
function facesOverlap(t1, t2, n) {
  const helper = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const e1 = cross3(n, helper);
  const l1 = len3(e1);
  const ax = [e1[0] / l1, e1[1] / l1, e1[2] / l1];
  const ay = cross3(n, ax);
  const proj = (tri) => tri.map((p) => [dot3(p, ax), dot3(p, ay)]);
  const A = proj(t1), B = proj(t2);
  const axes = [];
  for (const poly of [A, B]) {
    for (let i = 0; i < 3; i++) {
      const p = poly[i], q = poly[(i + 1) % 3];
      const ex = q[0] - p[0], ey = q[1] - p[1];
      const l = Math.hypot(ex, ey) || 1;
      axes.push([-ey / l, ex / l]);
    }
  }
  for (const [ux, uy] of axes) {
    let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
    for (const [x, y] of A) { const v = x * ux + y * uy; if (v < aMin) aMin = v; if (v > aMax) aMax = v; }
    for (const [x, y] of B) { const v = x * ux + y * uy; if (v < bMin) bMin = v; if (v > bMax) bMax = v; }
    if (aMax <= bMin + 1e-5 || bMax <= aMin + 1e-5) return false;
  }
  return true;
}

// Two faces sitting in the same plane over the same area shimmer as the camera
// moves: the depth test has no way to prefer one. Mechanical joins rarely land
// exactly coplanar, so a hit here is almost always a real modelling slip.
export function auditCoplanar(doc, options = {}) {
  doc = evaluateDoc(doc);
  const planeEps = Number(options.planeEps ?? 5e-4);
  const normalEps = Number(options.normalEps ?? 1e-4); // ~0.8 degrees
  const parts = [];
  for (const o of doc.objects || []) {
    const tris = worldTriangles(o);
    if (!tris || !tris.length) continue;
    parts.push({ id: o.id, name: o.name, tris, box: boundsOf(tris) });
  }
  const hits = [];
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const A = parts[i], B = parts[j];
      // touching boxes share a plane, so the box test must tolerate contact
      if (!overlap(A.box, B.box, -planeEps)) continue;
      let count = 0;
      for (const ta of A.tris) {
        const pa = planeOf(ta);
        if (!pa || pa.area < 1e-6) continue;
        for (const tb of B.tris) {
          const pb = planeOf(tb);
          if (!pb || pb.area < 1e-6) continue;
          if (Math.abs(Math.abs(dot3(pa.n, pb.n)) - 1) > normalEps) continue;
          if (Math.abs(dot3(pa.n, tb[0]) - pa.d) > planeEps) continue;
          if (!facesOverlap(ta, tb, pa.n)) continue;
          count++;
          if (count > 32) break;
        }
        if (count > 32) break;
      }
      if (count) hits.push({ a: A.name, b: B.name, faces: count });
    }
  }
  hits.sort((x, y) => y.faces - x.faces);
  return {
    summary: {
      objects: parts.length,
      pairs: hits.length,
      faces: hits.reduce((n, h) => n + h.faces, 0),
      planeEps, normalEps,
    },
    pairs: hits.slice(0, 20),
  };
}

export function auditIntersections(doc, options = {}) {
  doc = evaluateDoc(doc);
  const eps = Number(options.eps ?? 1e-4);
  const pairLimit = Number(options.pairLimit ?? 400);
  const parts = [];
  for (const o of doc.objects || []) {
    if (o.material && Number(o.material.opacity) < 0.98) continue; // transparent parts are meant to overlap
    const tris = worldTriangles(o);
    if (!tris || !tris.length) continue;
    parts.push({ id: o.id, name: o.name, tris, box: boundsOf(tris) });
  }
  const hits = [];
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const A = parts[i], B = parts[j];
      if (!overlap(A.box, B.box, eps)) continue;
      let count = 0;
      for (const ta of A.tris) {
        for (const tb of B.tris) {
          if (trianglesCross(ta, tb)) { count++; if (count > 64) break; }
        }
        if (count > 64) break;
      }
      if (count) hits.push({ a: A.name, b: B.name, crossings: count });
    }
  }
  hits.sort((x, y) => y.crossings - x.crossings);
  const byPair = new Map();
  for (const h of hits) {
    const key = [h.a, h.b].sort().join(' | ');
    byPair.set(key, (byPair.get(key) || 0) + h.crossings);
  }
  return {
    summary: {
      objects: parts.length,
      pairs: hits.length,
      crossings: hits.reduce((n, h) => n + h.crossings, 0),
      eps,
    },
    worst: [...byPair.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, 20)
      .map(([pair, crossings]) => ({ pair, crossings })),
    pairs: hits.slice(0, pairLimit),
  };
}
