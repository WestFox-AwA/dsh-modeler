import {validateSpec,specError} from './spec-validation.js';
// High-level showpiece generators for DSH Modeler.
// Pure geometry: no three.js dependency. Output is the same scene document the editor uses.

import { smin, ssub, sphere as sdSphere, ellipsoid as sdEllipsoid, box as sdBox, capsule as sdCapsule, surfaceNets } from './sdf.js';

const TAU = Math.PI * 2;

const clone = (v) => JSON.parse(JSON.stringify(v));
const addVec = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const subVec = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mulVec = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

function tri(out, a, b, c) {
  // drop zero-area triangles: lathe caps over an open profile can emit them,
  // and they only ever show up as DEGENERATE_TRIANGLES noise downstream.
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  if (cx * cx + cy * cy + cz * cz < 1e-14) return;
  out.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
}

function box(w, h, d) {
  const x = w / 2, y = h / 2, z = d / 2;
  const p = [
    [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
    [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z],
  ];
  const faces = [
    [0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
  ];
  const out = [];
  for (const f of faces) {
    tri(out, p[f[0]], p[f[1]], p[f[2]]);
    tri(out, p[f[0]], p[f[2]], p[f[3]]);
  }
  return out;
}


// A closed shell must enclose positive volume. When a generator's winding comes
// out inverted this flips the whole mesh, which is always safe for a closed body.
function orientClosed(tris) {
  let vol = 0;
  for (let i = 0; i < tris.length; i += 9) {
    const ax = tris[i], ay = tris[i + 1], az = tris[i + 2];
    const bx = tris[i + 3], by = tris[i + 4], bz = tris[i + 5];
    const cx = tris[i + 6], cy = tris[i + 7], cz = tris[i + 8];
    vol += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
  }
  if (vol >= 0) return tris;
  const out = new Array(tris.length);
  for (let i = 0; i < tris.length; i += 9) {
    out[i] = tris[i]; out[i + 1] = tris[i + 1]; out[i + 2] = tris[i + 2];
    out[i + 3] = tris[i + 6]; out[i + 4] = tris[i + 7]; out[i + 5] = tris[i + 8];
    out[i + 6] = tris[i + 3]; out[i + 7] = tris[i + 4]; out[i + 8] = tris[i + 5];
  }
  return out;
}

function lathe(profile, segments = 40, caps = true) {
  const out = [];
  const rings = [];
  for (let i = 0; i <= segments; i++) {
    const a = TAU * i / segments;
    const ring = [];
    for (const [r, y] of profile) ring.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    rings.push(ring);
  }
  for (let i = 0; i < segments; i++) {
    const a = rings[i], b = rings[i + 1];
    for (let j = 0; j < profile.length - 1; j++) {
      // CCW around +Y: this order keeps the radial normal pointing outwards
      tri(out, a[j], a[j + 1], b[j]);
      tri(out, a[j + 1], b[j + 1], b[j]);
    }
  }
  if (caps) {
    // close the *circle* at each end of the profile. The old version fanned the
    // angle-0 outline instead, which is a sliver and leaves the body open.
    const last = profile.length - 1;
    const c0 = [0, profile[0][1], 0], c1 = [0, profile[last][1], 0];
    for (let i = 0; i < segments; i++) {
      tri(out, c0, rings[i][0], rings[i + 1][0]);
      tri(out, c1, rings[i + 1][last], rings[i][last]);
    }
    return orientClosed(out);
  }
  return out;
}

function torus(R = 1, r = 0.2, segments = 48, tube = 24) {
  const out = [];
  const rings = [];
  for (let i = 0; i <= segments; i++) {
    const u = TAU * i / segments;
    const ring = [];
    for (let j = 0; j <= tube; j++) {
      const v = TAU * j / tube;
      ring.push([(R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)]);
    }
    rings.push(ring);
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < tube; j++) {
      const a = rings[i][j], b = rings[i + 1][j], c = rings[i][j + 1], d = rings[i + 1][j + 1];
      // this arc lives in the XY plane, so the winding that is correct for the
      // XZ-plane torus comes out inverted here
      // the torus lies in the XZ plane, so this is the winding that faces outward
      tri(out, a, c, b);
      tri(out, c, d, b);
    }
  }
  return out;
}

function torusArc(R, r, u0, u1, segments = 48, tube = 16) {
  const out = [];
  const rings = [];
  for (let i = 0; i <= segments; i++) {
    const u = u0 + (u1 - u0) * i / segments;
    const ring = [];
    for (let j = 0; j <= tube; j++) {
      const v = TAU * j / tube;
      ring.push([(R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v)]);
    }
    rings.push(ring);
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < tube; j++) {
      const a = rings[i][j], b = rings[i + 1][j], c = rings[i][j + 1], d = rings[i + 1][j + 1];
      // this arc lives in the XY plane, so the winding that is correct for the
      // XZ-plane torus comes out inverted here
      tri(out, a, b, c);
      tri(out, c, b, d);
    }
  }
  // a partial torus is open at both ends unless the tube cross-section is capped
  const centreOf = (i) => {
    const u = u0 + (u1 - u0) * i / segments;
    return [R * Math.cos(u), R * Math.sin(u), 0];
  };
  const cap = (i, forward) => {
    const c = centreOf(i), ring = rings[i];
    for (let j = 0; j < tube; j++) {
      const j2 = (j + 1) % tube;
      if (forward) tri(out, c, ring[j2], ring[j]);
      else tri(out, c, ring[j], ring[j2]);
    }
  };
  cap(0, false);
  cap(segments, true);
  return out;
}

// ear-clipping triangulation: a fan breaks on any concave outline, which turns
// a hull profile into giant stray triangles across the model.
function earClip(poly) {
  const n = poly.length;
  if (n < 3) return [];
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += poly[i][0] * poly[j][1] - poly[j][0] * poly[i][1];
  }
  const ccw = area > 0;
  const idx = [];
  for (let i = 0; i < n; i++) idx.push(i);
  const out = [];
  const EPS = 1e-9;
  const inside = (p, a, b, c) => {
    const d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
    const d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]);
    const d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]);
    // strictly inside only: points on an edge must not block an ear, otherwise
    // nearly-collinear outlines (hull profiles) never produce a single ear.
    return d1 > EPS && d2 > EPS && d3 > EPS || d1 < -EPS && d2 < -EPS && d3 < -EPS;
  };
  let guard = 0;
  while (idx.length > 3 && guard++ < 4 * n * n) {
    let cut = -1;
    for (let k = 0; k < idx.length; k++) {
      const i0 = idx[(k - 1 + idx.length) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
      const a = poly[i0], b = poly[i1], c = poly[i2];
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (ccw ? cross <= 1e-12 : cross >= -1e-12) continue;
      let blocked = false;
      for (const q of idx) {
        if (q === i0 || q === i1 || q === i2) continue;
        if (inside(poly[q], a, b, c)) { blocked = true; break; }
      }
      if (!blocked) { cut = k; break; }
    }
    if (cut < 0) break;
    const i0 = idx[(cut - 1 + idx.length) % idx.length], i1 = idx[cut], i2 = idx[(cut + 1) % idx.length];
    out.push([i0, i1, i2]);
    idx.splice(cut, 1);
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  return out;
}

function extrude(poly, depth) {
  const out = [];
  // normalise winding to CCW so every generated face points outwards
  const pts = poly.map((q) => [q[0], q[1]]);
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  if (area < 0) pts.reverse();
  const n = pts.length;
  const z0 = -depth / 2, z1 = depth / 2;

  let faces = earClip(pts);
  if (faces.length !== n - 2) {
    faces = [];
    for (let i = 1; i < n - 1; i++) faces.push([0, i, i + 1]);
  }
  for (const [i0, i1, i2] of faces) {
    // +z cap keeps the CCW order, -z cap is reversed
    tri(out, [pts[i0][0], pts[i0][1], z1], [pts[i1][0], pts[i1][1], z1], [pts[i2][0], pts[i2][1], z1]);
    tri(out, [pts[i2][0], pts[i2][1], z0], [pts[i1][0], pts[i1][1], z0], [pts[i0][0], pts[i0][1], z0]);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = pts[i][0], ay = pts[i][1], bx = pts[j][0], by = pts[j][1];
    tri(out, [ax, ay, z0], [bx, by, z0], [bx, by, z1]);
    tri(out, [ax, ay, z0], [bx, by, z1], [ax, ay, z1]);
  }
  return out;
}

function sphere(rx, ry, rz, segments = 48, rings = 28) {
  const out = [];
  const grid = [];
  for (let i = 0; i <= rings; i++) {
    const v = Math.PI * i / rings;
    const row = [];
    for (let j = 0; j <= segments; j++) {
      const u = TAU * j / segments;
      row.push([rx * Math.sin(v) * Math.cos(u), ry * Math.cos(v), rz * Math.sin(v) * Math.sin(u)]);
    }
    grid.push(row);
  }
  const clean = [];
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = grid[i][j], b = grid[i + 1][j], c = grid[i][j + 1], d = grid[i + 1][j + 1];
      for (const [p0, p1, p2] of [[a, c, b], [c, d, b]]) {
        const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
        const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
        const area = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
        if (area > 1e-10) tri(clean, p0, p1, p2);
      }
    }
  }
  return clean;
}

function sphereCut(rx, ry, rz, segments, rings, cut) {
  const out = [];
  const grid = [];
  for (let i = 0; i <= rings; i++) {
    const v = Math.PI * i / rings;
    const row = [];
    for (let j = 0; j <= segments; j++) {
      const u = TAU * j / segments;
      row.push([rx * Math.sin(v) * Math.cos(u), ry * Math.cos(v), rz * Math.sin(v) * Math.sin(u)]);
    }
    grid.push(row);
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = grid[i][j], b = grid[i + 1][j], c = grid[i][j + 1], d = grid[i + 1][j + 1];
      const cx = (a[0] + b[0] + c[0] + d[0]) / 4;
      const cy = (a[1] + b[1] + c[1] + d[1]) / 4;
      const cz = (a[2] + b[2] + c[2] + d[2]) / 4;
      if (cut && cut(cx, cy, cz)) continue;
      tri(out, a, b, c);
      tri(out, c, b, d);
    }
  }
  return out;
}

function spherePatch(rx, ry, rz, u0, u1, v0, v1, segments = 28, rings = 16, scale = 1) {
  const out = [];
  const grid = [];
  for (let i = 0; i <= rings; i++) {
    const v = v0 + (v1 - v0) * i / rings;
    const row = [];
    for (let j = 0; j <= segments; j++) {
      const u = u0 + (u1 - u0) * j / segments;
      row.push([rx * scale * Math.sin(v) * Math.cos(u), ry * scale * Math.cos(v), rz * scale * Math.sin(v) * Math.sin(u)]);
    }
    grid.push(row);
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = grid[i][j], b = grid[i + 1][j], c = grid[i][j + 1], d = grid[i + 1][j + 1];
      tri(out, a, b, c);
      tri(out, c, b, d);
    }
  }
  return out;
}

function loftRings(rings, close = true, cap = false) {
  const out = [];
  const cols = rings[0].length;
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i], b = rings[i + 1];
    for (let j = 0; j < cols; j++) {
      const j2 = (j + 1) % cols;
      tri(out, a[j], a[j2], b[j]);
      tri(out, a[j2], b[j2], b[j]);
    }
  }
  if (cap) {
    for (const end of [0, rings.length - 1]) {
      const ring = rings[end];
      const c = [0, 0, 0];
      for (const p of ring) { c[0] += p[0] / ring.length; c[1] += p[1] / ring.length; c[2] += p[2] / ring.length; }
      for (let j = 0; j < ring.length; j++) {
        const a = ring[j], b = ring[(j + 1) % ring.length];
        // the cap at the low-z end must face -z and the high-z end +z; both were
        // reversed, which left every lofted hull with its two ends facing inward
        if (end === 0) tri(out, c, b, a); else tri(out, c, a, b);
      }
    }
  }
  return out;
}

function carRing(w, h, y0, z, cols = 32, expX = 0.66, expY = 0.78) {
  const ring = [];
  for (let j = 0; j < cols; j++) {
    const a = TAU * j / cols;
    const cx = Math.cos(a), sy = Math.sin(a);
    const x = w * Math.sign(cx) * Math.pow(Math.abs(cx), expX);
    const y = y0 + h * (0.5 + 0.5 * Math.sign(sy) * Math.pow(Math.abs(sy), expY));
    ring.push([x, y, z]);
  }
  return ring;
}

function material(color, metalness = 0.1, roughness = 0.5, extra = {}) {
  return { color, metalness, roughness, opacity: 1, emissive: '#000000', emissiveIntensity: 0, ...extra };
}

function createDoc(title, template) {
  return {
    version: 1,
    nextId: 1,
    meta: { title, template, autoFrame: true, createdAt: new Date().toISOString() },
    objects: [],
  };
}

function add(doc, name, positions, mat, at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const obj = {
    id: 'obj_' + doc.nextId++,
    name,
    kind: 'custom',
    position: at,
    rotation: rot,
    scale,
    params: {},
    geometryData: { positions },
    material: mat,
  };
  doc.objects.push(obj);
  return obj;
}

/* ------------------------------------------------------------------ */
/* Hypercar                                                           */
/* ------------------------------------------------------------------ */

function buildHypercar(palette = {}) {
  const paint = palette.paint || '#b31724';
  const accent = palette.accent || '#d7b15a';
  const carbon = '#08090b';
  const metal = '#aab3c0';
  const rubber = '#07080a';
  const glass = '#07131d';
  const doc = createDoc(palette.title || 'Apex GT · Concept', 'hypercar');

  // side silhouette, extruded across the car (profile is z,y)
  const profile = [
    [-2.28, 0.22], [-2.26, 0.38], [-2.02, 0.50], [-1.62, 0.56],
    [-1.10, 0.61], [-0.62, 0.66], [-0.20, 1.06], [0.42, 1.10],
    [0.96, 0.94], [1.42, 0.78], [1.88, 0.65], [2.18, 0.54],
    [2.22, 0.26], [2.18, 0.22],
  ];
  add(doc, 'Body · extruded silhouette', extrude(profile, 1.64), material(paint, 0.55, 0.15, { clearcoat: true }), [0, 0, 0], [0, Math.PI / 2, 0]);

  // dark greenhouse
  const sideWindow = [[-0.64, 0.70], [-0.52, 0.98], [0.38, 1.02], [0.78, 0.76], [0.55, 0.70]];
  for (const x of [-0.828, 0.828]) {
    add(doc, 'Side glass', extrude(sideWindow, 0.018), material(glass, 0.5, 0.04, { opacity: 0.62, transparent: true, doubleSided: true }), [x, 0, 0], [0, Math.PI / 2, 0]);
  }
  add(doc, 'Windshield', box(1.12, 0.02, 0.54), material(glass, 0.5, 0.04, { opacity: 0.58, transparent: true, doubleSided: true }), [0, 1.065, -0.18], [-0.44, 0, 0]);
  add(doc, 'Rear glass', box(1.0, 0.018, 0.3), material(glass, 0.5, 0.04, { opacity: 0.55, transparent: true, doubleSided: true }), [0, 1.0, 0.83], [0.36, 0, 0]);
  add(doc, 'Roof panel · carbon', box(1.12, 0.035, 0.72), material(carbon, 0.35, 0.3), [0, 1.105, 0.24]);
  for (const x of [-0.78, 0.78]) {
    add(doc, 'A-pillar', box(0.045, 0.05, 0.8), material(carbon, 0.3, 0.32), [x, 1.04, -0.35], [0.16, 0, 0]);
  }

  // fenders / arches
  for (const x of [-0.84, 0.84]) {
    for (const z of [-1.46, 1.46]) {
      add(doc, 'Fender · shoulder', box(0.2, 0.24, 1.04), material(paint, 0.55, 0.16), [x, 0.47, z]);
      add(doc, 'Fender lip', torus(0.47, 0.045, 48, 10), material(carbon, 0.4, 0.3), [x + Math.sign(x) * 0.01, 0.41, z], [0, 0, Math.PI / 2]);
    }
  }

  // wheels
  const tireProfile = [
    [0.19, -0.18], [0.29, -0.19], [0.37, -0.14], [0.395, 0],
    [0.37, 0.14], [0.29, 0.19], [0.19, 0.18],
  ];
  const rimProfile = [
    [0.21, -0.14], [0.25, -0.11], [0.25, 0.11], [0.21, 0.14],
    [0.18, 0.13], [0.17, 0.02], [0.17, -0.02], [0.18, -0.13],
  ];
  const tire = lathe(tireProfile, 48, true);
  const rim = lathe(rimProfile, 48, true);
  for (const x of [-0.9, 0.9]) {
    for (const z of [-1.46, 1.46]) {
      add(doc, 'Tire', tire, material(rubber, 0, 0.95), [x, 0.41, z], [0, 0, Math.PI / 2]);
      add(doc, 'Rim · forged', rim, material(metal, 0.95, 0.22), [x, 0.41, z], [0, 0, Math.PI / 2]);
      add(doc, 'Brake disc', lathe([[0.15, -0.025], [0.19, -0.02], [0.19, 0.02], [0.15, 0.025]], 40, true), material('#5b626e', 1, 0.35), [x, 0.41, z], [0, 0, Math.PI / 2]);
      add(doc, 'Caliper', box(0.055, 0.14, 0.11), material(accent, 0.3, 0.35), [x - 0.05, 0.37, z + 0.12]);
      for (let k = 0; k < 5; k++) {
        const a = TAU * k / 5;
        add(doc, 'Spoke', box(0.032, 0.205, 0.045), material('#aab4c2', 0.95, 0.24), [x + Math.sin(a) * 0.11, 0.41 + Math.cos(a) * 0.11, z], [0, 0, -a]);
      }
    }
  }

  // aero / skirts / underbody
  for (const x of [-0.83, 0.83]) {
    add(doc, 'Side skirt · carbon', box(0.1, 0.05, 2.3), material(carbon, 0.35, 0.32), [x, 0.22, 0.02]);
    add(doc, 'Side intake', box(0.035, 0.14, 0.58), material(carbon, 0.3, 0.3), [x, 0.53, 0.45], [0, 0, -0.1]);
  }
  add(doc, 'Front splitter', box(1.72, 0.05, 0.5), material(carbon, 0.3, 0.35), [0, 0.19, -2.1]);
  add(doc, 'Rear diffuser', box(1.55, 0.1, 0.4), material(carbon, 0.3, 0.35), [0, 0.2, 2.06]);
  for (let i = -2; i <= 2; i++) {
    add(doc, 'Diffuser fin', box(0.06, 0.15, 0.38), material(carbon, 0.25, 0.4), [i * 0.27, 0.12, 2.0]);
  }

  // rear wing
  const airfoil = [[-0.28, 0], [0.28, 0], [0.23, 0.045], [0, 0.075], [-0.23, 0.045]];
  add(doc, 'Rear wing · main', extrude(airfoil, 1.7), material(carbon, 0.4, 0.28), [0, 0.98, 2.02], [0, Math.PI / 2, 0]);
  add(doc, 'Rear wing · flap', extrude(airfoil, 1.64), material(carbon, 0.4, 0.28), [0, 1.08, 2.12], [0, Math.PI / 2, 0]);
  for (const x of [-0.72, 0.72]) {
    add(doc, 'Wing support', box(0.04, 0.28, 0.22), material(carbon, 0.3, 0.3), [x, 0.85, 2.02]);
  }

  // details
  for (const x of [-0.56, 0.56]) {
    add(doc, 'Headlight', box(0.24, 0.05, 0.03), material('#dff4ff', 0.3, 0.15, { emissive: '#dff4ff', emissiveIntensity: 4 }), [x, 0.44, -2.235]);
  }
  add(doc, 'Taillight bar', box(1.18, 0.045, 0.025), material('#ff2b18', 0.3, 0.2, { emissive: '#ff2b18', emissiveIntensity: 4 }), [0, 0.5, 2.19]);
  for (const x of [-0.2, 0.2]) {
    add(doc, 'Exhaust', lathe([[0.055, -0.08], [0.055, 0.08], [0.04, 0.08], [0.04, -0.08]], 24, false), material(metal, 1, 0.2), [x, 0.26, 2.2], [Math.PI / 2, 0, 0]);
  }
  add(doc, 'Hood vent', box(0.62, 0.018, 0.22), material(carbon, 0.3, 0.4), [0, 0.67, -1.2]);
  for (const x of [-0.97, 0.97]) {
    add(doc, 'Mirror stalk', box(0.06, 0.035, 0.17), material(carbon, 0.3, 0.3), [x * 0.86, 0.7, -0.5]);
    add(doc, 'Mirror shell', box(0.14, 0.065, 0.15), material(paint, 0.55, 0.18), [x, 0.72, -0.54]);
  }
  add(doc, 'Underbody', box(1.3, 0.06, 3.4), material(carbon, 0.2, 0.6), [0, 0.19, 0]);

  for (const o of doc.objects) {
    if (o.name === 'Body · extruded silhouette' || o.name === 'Canopy · dark glass') {
      o.modifiers = [{ type: 'subsurf', levels: 2 }];
      o.shading = 'smooth';
    }
    if (o.name === 'Fender · shoulder' || o.name === 'Fender lip') {
      o.modifiers = [{ type: 'subsurf', levels: 1 }];
      o.shading = 'smooth';
    }
  }
  doc.meta.palette = { paint, accent };
  return doc;
}

/* ------------------------------------------------------------------ */
/* Space interceptor                                                  */
/* ------------------------------------------------------------------ */

function buildInterceptor(palette = {}) {
  const hull = palette.hull || '#c7ccd6';
  const accent = palette.accent || '#ff6a2a';
  const glass = '#06121d';
  const dark = '#242a34';
  const doc = createDoc(palette.title || 'Vanta Interceptor', 'interceptor');

  const sections = [
    [-3.2, 0.06, 0.06, 0.24],
    [-2.75, 0.30, 0.16, 0.23],
    [-2.2, 0.56, 0.25, 0.22],
    [-1.5, 0.82, 0.34, 0.21],
    [-0.7, 0.95, 0.42, 0.22],
    [0.1, 0.92, 0.44, 0.23],
    [0.9, 0.78, 0.40, 0.25],
    [1.6, 0.60, 0.32, 0.27],
    [2.2, 0.40, 0.24, 0.29],
    [2.55, 0.22, 0.16, 0.3],
  ];
  const rings = sections.map(([z, w, h, y]) => carRing(w, h, y, z, 28, 0.5, 0.62));
  add(doc, 'Hull · faceted', loftRings(rings, true, true), material(hull, 0.75, 0.28, { clearcoat: true }), [0, 0, 0]);

  // canopy
  const canopy = loftRings([
    [-1.05, 0.34, 0.05, 0.42],
    [-0.75, 0.5, 0.12, 0.45],
    [-0.4, 0.52, 0.16, 0.47],
    [0, 0.44, 0.14, 0.46],
    [0.35, 0.3, 0.08, 0.44],
  ].map(([z, w, h, y]) => carRing(w, h, y, z, 24, 0.55, 0.7)), true, true);
  add(doc, 'Canopy · glass', canopy, material(glass, 0.35, 0.04, { opacity: 0.5, transparent: true, doubleSided: true }), [0, 0.14, 0]);

  // wings
  const wingPoly = [[-0.1, 0], [2.4, -0.45], [2.6, -0.28], [2.2, 0.1], [0.2, 0.18]];
  for (const side of [-1, 1]) {
    add(doc, 'Wing · port/starboard', extrude(wingPoly, 0.12), material(hull, 0.65, 0.3), [side * 0.0, 0.26, 0.45], [0, side > 0 ? Math.PI / 2 : -Math.PI / 2, side > 0 ? 0.06 : -0.06], [side * 1, 1, 1]);
  }
  for (const side of [-1, 1]) {
    add(doc, 'Wing edge light', box(2.2, 0.025, 0.025), material(accent, 0.3, 0.25, { emissive: accent, emissiveIntensity: 3 }), [side * 1.35, 0.55, 0.6], [0, 0, side * 0.06]);
  }

  // engines
  for (const side of [-1, 1]) {
    add(doc, 'Engine nacelle', lathe([[0.18, -0.5], [0.26, -0.3], [0.24, 0.35], [0.16, 0.5]], 32, true), material(dark, 0.85, 0.26), [side * 0.48, 0.24, 2.15], [Math.PI / 2, 0, 0]);
    add(doc, 'Engine glow', torus(0.18, 0.025, 32, 8), material(accent, 0.2, 0.2, { emissive: accent, emissiveIntensity: 6 }), [side * 0.48, 0.24, 2.66], [0, 0, 0]);
    add(doc, 'Engine intake', lathe([[0.05, -0.05], [0.16, -0.02], [0.16, 0.02], [0.05, 0.05]], 24, false), material('#050609', 0.2, 0.6), [side * 0.48, 0.24, 2.7], [Math.PI / 2, 0, 0]);
  }

  // cockpit frame / greebles
  add(doc, 'Dorsal spine', box(0.08, 0.04, 2.2), material('#0d1015', 0.4, 0.35), [0, 0.55, 0.3]);
  add(doc, 'Hull stripe · port', box(0.08, 0.012, 1.6), material(accent, 0.4, 0.25, { emissive: accent, emissiveIntensity: 0.8 }), [-0.48, 0.47, 0.45]);
  add(doc, 'Hull stripe · starboard', box(0.08, 0.012, 1.6), material(accent, 0.4, 0.25, { emissive: accent, emissiveIntensity: 0.8 }), [0.48, 0.47, 0.45]);
  for (let i = 0; i < 7; i++) {
    const z = -1.9 + i * 0.55;
    add(doc, 'Panel line', box(0.92, 0.008, 0.012), material('#050608', 0.2, 0.5), [0, 0.46 - i * 0.015, z]);
  }
  for (const side of [-1, 1]) {
    add(doc, 'Canard', extrude([[-0.55, 0], [0.3, -0.1], [0.45, 0.05], [-0.4, 0.1]], 0.05), material(hull, 0.7, 0.28), [side * 0.8, 0.28, -1.25], [0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0]);
    add(doc, 'Sensor', sphere(0.045, 0.045, 0.06, 20, 12), material('#dff8ff', 0.2, 0.2, { emissive: '#dff8ff', emissiveIntensity: 3 }), [side * 0.15, 0.25, -2.5]);
  }
  add(doc, 'Nose light', box(0.16, 0.025, 0.03), material(accent, 0.3, 0.2, { emissive: accent, emissiveIntensity: 5 }), [0, 0.26, -3.0]);

  // landing skids
  for (const side of [-1, 1]) {
    add(doc, 'Landing skid', box(0.08, 0.06, 1.5), material('#0d1015', 0.5, 0.4), [side * 0.34, -0.08, 0.35]);
  }

  doc.meta.palette = { hull, accent };
  return doc;
}

/* ------------------------------------------------------------------ */
/* Pilot helmet                                                       */
/* ------------------------------------------------------------------ */

function buildHelmet(palette = {}) {
  const shell = palette.shell || '#dfe3ea';
  const accent = palette.accent || '#e33b2e';
  const dark = '#0c1016';
  const doc = createDoc(palette.title || 'Apex Pilot Helmet · MK II', 'helmet');

  // one continuous shell with a visor opening
  add(doc, 'Shell', sphereCut(0.295, 0.325, 0.305, 64, 48,
    (x, y, z) => z < -0.095 && y > -0.155 && y < 0.145 && Math.abs(x) < 0.225),
    material(shell, 0.32, 0.28, { clearcoat: true }), [0, 1.22, 0]);
  add(doc, 'Visor glass', spherePatch(0.301, 0.332, 0.315, -Math.PI / 2 - 0.88, -Math.PI / 2 + 0.88, 0.34, 0.655, 36, 16),
    material('#02070b', 0.55, 0.03, { opacity: 0.88, transparent: true, doubleSided: true }), [0, 1.22, 0]);
  add(doc, 'Visor top trim', spherePatch(0.309, 0.34, 0.322, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9, 0.325, 0.345, 36, 4),
    material(accent, 0.35, 0.25, { emissive: accent, emissiveIntensity: 0.25, doubleSided: true }), [0, 1.22, 0]);
  add(doc, 'Visor bottom trim', spherePatch(0.309, 0.34, 0.322, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9, 0.648, 0.668, 36, 4),
    material('#1c222b', 0.55, 0.3, { doubleSided: true }), [0, 1.22, 0]);
  for (const side of [-1, 1]) {
    add(doc, 'Visor side trim', spherePatch(0.309, 0.34, 0.322, -Math.PI / 2 + side * 0.885 - 0.014, -Math.PI / 2 + side * 0.885 + 0.014, 0.34, 0.655, 6, 12),
      material('#1c222b', 0.55, 0.3, { doubleSided: true }), [0, 1.22, 0]);
  }

  // panel seams
  add(doc, 'Crown seam', torus(0.293, 0.006, 64, 8), material('#1c222b', 0.45, 0.38), [0, 1.22, 0], [0, 0, 0], [1, 0.18, 1]);
  add(doc, 'Crown accent', torus(0.300, 0.004, 64, 8), material(accent, 0.4, 0.25, { emissive: accent, emissiveIntensity: 0.45 }), [0, 1.22, 0], [0, 0, 0], [1, 0.52, 1]);
  for (const side of [-1, 1]) {
    add(doc, 'Shell seam', box(0.006, 0.3, 0.008), material('#1c222b', 0.4, 0.4), [side * 0.285, 1.24, 0.03], [0, side * 0.15, 0]);
  }

  // chin / mouth / neck
  add(doc, 'Chin guard', box(0.26, 0.11, 0.16), material('#252b34', 0.55, 0.32), [0, 1.0, -0.18], [0.15, 0, 0]);
  add(doc, 'Mouth vent', box(0.22, 0.075, 0.035), material(dark, 0.5, 0.35), [0, 1.02, -0.265]);
  for (let i = -2; i <= 2; i++) {
    add(doc, 'Vent slat', box(0.016, 0.05, 0.012), material(accent, 0.4, 0.3, { emissive: accent, emissiveIntensity: 0.55 }), [i * 0.034, 1.02, -0.287]);
  }
  add(doc, 'Neck seal', torus(0.225, 0.022, 48, 10), material('#11161e', 0.35, 0.55), [0, 0.955, 0], [Math.PI / 2, 0, 0]);

  // ear pods
  for (const side of [-1, 1]) {
    add(doc, 'Ear pod', lathe([[0.055, -0.035], [0.092, -0.018], [0.092, 0.055], [0.06, 0.075]], 32, true), material('#1a2029', 0.65, 0.28), [side * 0.285, 1.21, 0.02], [0, 0, Math.PI / 2]);
    add(doc, 'Ear ring', torus(0.075, 0.011, 32, 8), material(accent, 0.4, 0.3, { emissive: accent, emissiveIntensity: 0.4 }), [side * 0.325, 1.21, 0.02], [0, Math.PI / 2, 0]);
    add(doc, 'Antenna base', box(0.035, 0.035, 0.035), material('#1a2029', 0.6, 0.3), [side * 0.25, 1.42, 0.1]);
  }

  // crest / fin
  const crest = [[-0.32, 0], [-0.20, 0.11], [0.12, 0.14], [0.34, 0.0], [0.26, -0.025], [0, 0.015], [-0.28, -0.018]];
  add(doc, 'Aero crest', extrude(crest, 0.03), material(shell, 0.4, 0.22, { clearcoat: true }), [0, 1.53, 0.03], [0, Math.PI / 2, 0]);
  add(doc, 'Crest light', box(0.016, 0.01, 0.5), material(accent, 0.4, 0.25, { emissive: accent, emissiveIntensity: 0.9 }), [0.03, 1.54, 0.02], [0.04, 0, 0]);

  doc.meta.palette = { shell, accent };
  return doc;
}

function buildXenotype(palette = {}) {
  const shell = palette.shell || '#202731';
  const chrome = palette.chrome || '#aeb9c8';
  const accent = palette.accent || '#4de8ff';
  const doc = createDoc(palette.title || 'Xenotype · Warden Bust', 'xenotype');

  const head = (p) => {
    let d = sdEllipsoid(p, [0, 1.56, 0], [0.30, 0.38, 0.33]);
    d = smin(d, sdEllipsoid(p, [0, 1.64, 0.10], [0.34, 0.32, 0.36]), 0.10);
    d = smin(d, sdEllipsoid(p, [0, 1.28, -0.06], [0.24, 0.24, 0.29]), 0.08);
    d = smin(d, sdEllipsoid(p, [0, 1.40, -0.20], [0.22, 0.12, 0.16]), 0.05);
    // brow + cheek structure
    for (const side of [-1, 1]) {
      d = smin(d, sdBox(p, [side * 0.13, 1.58, -0.25], [0.115, 0.045, 0.06]), 0.035);
      d = smin(d, sdEllipsoid(p, [side * 0.20, 1.40, -0.17], [0.10, 0.07, 0.08]), 0.04);
      d = smin(d, sdEllipsoid(p, [side * 0.27, 1.50, 0.04], [0.12, 0.18, 0.18]), 0.06);
      // eye sockets
      d = ssub(d, sdSphere(p, [side * 0.145, 1.53, -0.285], 0.078), 0.018);
      // cheek vent grooves
      d = ssub(d, sdBox(p, [side * 0.235, 1.34, -0.16], [0.012, 0.055, 0.09]), 0.01);
    }
    // mouth slit
    d = ssub(d, sdBox(p, [0, 1.27, -0.30], [0.115, 0.012, 0.08]), 0.012);
    // cranial crest / fin
    d = smin(d, sdEllipsoid(p, [0, 1.94, 0.06], [0.045, 0.27, 0.21]), 0.07);
    // horns (two chain segments each side)
    for (const side of [-1, 1]) {
      d = smin(d, sdCapsule(p, [side * 0.17, 1.79, 0.02], [side * 0.42, 2.02, 0.20], 0.058), 0.05);
      d = smin(d, sdCapsule(p, [side * 0.42, 2.02, 0.20], [side * 0.47, 2.18, 0.41], 0.038), 0.04);
    }
    for (const side of [-1, 1]) {
      d = smin(d, sdCapsule(p, [side * 0.23, 1.33, -0.10], [side * 0.33, 1.13, 0.0], 0.026), 0.03);
    }

    // neck and shoulder bust
    d = smin(d, sdCapsule(p, [0, 1.24, 0.01], [0, 0.96, 0.02], 0.14), 0.08);
    d = smin(d, sdEllipsoid(p, [0, 0.87, 0.02], [0.52, 0.20, 0.28]), 0.08);
    d = smin(d, sdEllipsoid(p, [0, 0.78, 0.0], [0.34, 0.14, 0.24]), 0.1);
    return d;
  };
  const positions = surfaceNets(head, [-0.62, 0.58, -0.48], [0.62, 2.28, 0.58], 88, 134, 88);
  add(doc, 'Xenotype shell', positions, material(shell, 0.82, 0.27, { clearcoat: true }), [0, 0, 0]);

  // eyes
  for (const side of [-1, 1]) {
    add(doc, 'Eye · cold light', sphere(0.045, 0.038, 0.03, 28, 16), material(accent, 0.2, 0.15, { emissive: accent, emissiveIntensity: 6 }), [side * 0.145, 1.53, -0.30]);
  }

  for (const side of [-1, 1]) {
    add(doc, 'Eye rim', torus(0.072, 0.009, 32, 8), material(chrome, 0.9, 0.2), [side * 0.145, 1.53, -0.305], [0, 0, 0]);
  }
  for (let i = -2; i <= 2; i++) {
    add(doc, 'Tooth', box(0.018, 0.025, 0.01), material('#b9c4d0', 0.4, 0.35), [i * 0.037, 1.268, -0.30]);
  }
  add(doc, 'Crest edge', box(0.012, 0.01, 0.36), material(accent, 0.3, 0.25, { emissive: accent, emissiveIntensity: 1.2 }), [0.035, 2.0, 0.05], [0.12, 0, 0]);

  // shoulder armor plates
  for (const side of [-1, 1]) {
    add(doc, 'Collar plate', box(0.44, 0.08, 0.3), material('#10151c', 0.6, 0.3), [side * 0.29, 0.96, 0.0], [0, 0, side * 0.12]);
    add(doc, 'Shoulder blade', box(0.2, 0.07, 0.34), material(chrome, 0.9, 0.22), [side * 0.47, 0.9, 0.01], [0, side * 0.18, side * -0.16]);
    add(doc, 'Shoulder light', box(0.14, 0.012, 0.02), material(accent, 0.3, 0.2, { emissive: accent, emissiveIntensity: 3 }), [side * 0.47, 0.94, -0.16], [0, side * 0.18, 0]);
  }

  // chest emblem
  add(doc, 'Chest sigil', box(0.16, 0.02, 0.02), material(accent, 0.4, 0.25, { emissive: accent, emissiveIntensity: 2 }), [0, 0.84, -0.29]);
  add(doc, 'Chest plate', box(0.46, 0.11, 0.05), material('#10151c', 0.5, 0.35), [0, 0.78, -0.26], [0.05, 0, 0]);

  // pedestal
  add(doc, 'Base plate', lathe([[0.48, 0], [0.5, 0.04], [0.5, 0.1], [0.46, 0.12]], 72, true), material('#0b0f15', 0.55, 0.42), [0, 0, 0]);
  add(doc, 'Pedestal column', lathe([[0.31, 0.1], [0.36, 0.16], [0.36, 0.54], [0.32, 0.6]], 64, true), material('#11171f', 0.65, 0.34), [0, 0, 0]);
  add(doc, 'Pedestal ring', torus(0.365, 0.012, 64, 8), material(accent, 0.3, 0.25, { emissive: accent, emissiveIntensity: 2 }), [0, 0.53, 0], [Math.PI / 2, 0, 0]);
  add(doc, 'Plaque', box(0.24, 0.05, 0.012), material(chrome, 0.85, 0.22), [0, 0.31, -0.35]);
  add(doc, 'Plaque light', box(0.15, 0.008, 0.005), material(accent, 0.3, 0.25, { emissive: accent, emissiveIntensity: 1.6 }), [0, 0.31, -0.358]);

  doc.meta.palette = { shell, chrome, accent };
  doc.meta.fit = 1.55;
  return doc;
}

function buildNeonDistrict(palette = {}) {
  const doc = createDoc(palette.title || 'Neon District · Block 07', 'neon');
  const rnd = (() => { let seed = 0x2f6e2b1; return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; })();
  const concat = (...arrs) => { const out = []; for (const a of arrs) for (const v of a) out.push(v); return out; };
  const at = (arr, x, y, z) => { for (let i = 0; i < arr.length; i += 3) { arr[i] += x; arr[i + 1] += y; arr[i + 2] += z; } return arr; };
  const boxAt = (w, h, d, x, y, z) => at(box(w, h, d), x, y, z);

  // wet street + sidewalks
  add(doc, 'Wet asphalt', boxAt(11.2, 0.06, 52, 0, -0.06, 0), material('#080b11', 0.55, 0.12, { clearcoat: true }), [0, 0, 0]);
  for (const side of [-1, 1]) {
    add(doc, 'Sidewalk', boxAt(0.9, 0.12, 52, side * 4.55, -0.02, 0), material('#11161e', 0.35, 0.42), [0, 0, 0]);
    add(doc, 'Curb', boxAt(0.1, 0.18, 52, side * 5.15, 0.0, 0), material('#202733', 0.3, 0.5), [0, 0, 0]);
    add(doc, 'Lane marker', boxAt(0.05, 0.006, 3.0, side * 0.42, 0.005, 0), material('#4de8ff', 0.3, 0.25, { emissive: '#4de8ff', emissiveIntensity: 1.2 }), [0, 0, 0]);
  }

  // building blocks
  const bodyParts = [];
  const windowWarm = [];
  const windowCool = [];
  const neonBuckets = new Map();
  const shopGlow = [];
  const awnings = [];
  const shopSigns = [];
  const allNeonColors = ['#ff4d8d', '#4de8ff', '#ffb347', '#8a7dff', '#7dffb2'];
  for (const side of [-1, 1]) {
    let z = -22;
    while (z < 22) {
      const depth = 3.2 + rnd() * 2.0;
      const height = 5.5 + rnd() * 11.0;
      const width = 3.0 + rnd() * 1.2;
      const cx = side * (5.55 + width * 0.5);
      bodyParts.push(boxAt(width, height, depth, cx, height / 2, z + depth / 2));
      // facade window grid
      const facadeX = side * (5.47);
      const floors = Math.floor((height - 1.4) / 0.72);
      const cols = Math.max(2, Math.floor(depth / 0.55));
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
          if (rnd() < 0.28) continue;
          const boxW = box(0.02, 0.28, 0.22);
          at(boxW, facadeX, 1.05 + f * 0.72, z + 0.35 + c * (depth - 0.6) / cols);
          (rnd() > 0.35 ? windowWarm : windowCool).push(...boxW);
        }
      }
      // vertical neon strip
      const nc = allNeonColors[Math.floor(rnd() * allNeonColors.length)];
      if (!neonBuckets.has(nc)) neonBuckets.set(nc, []);
      const nb = neonBuckets.get(nc);
      nb.push(...at(box(0.05, height * 0.6, 0.06), side * 5.43, height * 0.5, z + 0.35));
      nb.push(...at(box(0.02, 0.05, depth * 0.65), side * 5.41, height * 0.62, z + depth * 0.5));

      // street-level storefronts / awnings / small signs
      const shopZ = z + depth * 0.5;
      shopGlow.push(...at(box(0.012, 1.5, Math.min(1.3, depth * 0.45)), side * 5.45, 0.9, shopZ));
      awnings.push(...at(box(0.9, 0.07, Math.min(1.9, depth * 0.7)), side * 4.55, 2.45, shopZ));
      shopSigns.push(...at(box(0.05, 0.32, Math.min(1.4, depth * 0.55)), side * 5.18, 2.15, shopZ));
      z += depth + 0.35;
    }
  }
  add(doc, 'Building mass', bodyParts.flat(), material('#1a2230', 0.42, 0.48), [0, 0, 0]);
  add(doc, 'Windows · warm', windowWarm, material('#ffc07a', 0.2, 0.3, { emissive: '#ffc07a', emissiveIntensity: 1.35 }), [0, 0, 0]);
  add(doc, 'Windows · cold', windowCool, material('#9ee8ff', 0.2, 0.3, { emissive: '#9ee8ff', emissiveIntensity: 1.2 }), [0, 0, 0]);
  for (const [color, parts] of neonBuckets) {
    add(doc, 'Neon strip', parts, material(color, 0.3, 0.25, { emissive: color, emissiveIntensity: 5 }), [0, 0, 0]);
  }
  add(doc, 'Shop windows', shopGlow, material('#ffbf78', 0.2, 0.35, { emissive: '#ffbf78', emissiveIntensity: 1.35 }), [0, 0, 0]);
  add(doc, 'Awnings', awnings, material('#3a2030', 0.4, 0.45), [0, 0, 0]);
  add(doc, 'Shop signs', shopSigns, material('#4de8ff', 0.3, 0.25, { emissive: '#4de8ff', emissiveIntensity: 3.5 }), [0, 0, 0]);

  // billboards / signs
  const signs = [
    { x: -5.32, y: 5.2, z: -7, w: 0.12, h: 2.6, d: 1.5, c: '#4de8ff' },
    { x: 5.32, y: 7.2, z: 2, w: 0.12, h: 3.4, d: 1.0, c: '#ff4d8d' },
    { x: -5.32, y: 9.4, z: 9, w: 0.12, h: 2.0, d: 2.2, c: '#ffb347' },
    { x: 5.32, y: 4.2, z: -13, w: 0.12, h: 1.8, d: 1.8, c: '#8a7dff' },
  ];
  for (const sg of signs) {
    add(doc, 'Billboard', boxAt(sg.w, sg.h, sg.d, sg.x, sg.y, sg.z), material('#10151d', 0.4, 0.35), [0, 0, 0]);
    add(doc, 'Billboard glow', boxAt(sg.w + 0.01, sg.h * 0.75, sg.d * 0.82, sg.x + (sg.x < 0 ? 0.06 : -0.06), sg.y, sg.z), material(sg.c, 0.3, 0.25, { emissive: sg.c, emissiveIntensity: 4.5 }), [0, 0, 0]);
  }

  // giant end billboard / hologram
  add(doc, 'End monolith', boxAt(12.0, 14, 1.2, 0, 7, -18.5), material('#05080d', 0.4, 0.5), [0, 0, 0]);
  add(doc, 'End screen', boxAt(10.4, 7.2, 0.05, 0, 5.2, -17.85), material('#06131e', 0.25, 0.22, { emissive: '#0a2b40', emissiveIntensity: 2.2 }), [0, 0, 0]);
  add(doc, 'End screen frame', boxAt(10.7, 0.12, 0.08, 0, 8.85, -17.82), material('#4de8ff', 0.3, 0.2, { emissive: '#4de8ff', emissiveIntensity: 4 }), [0, 0, 0]);
  add(doc, 'End screen frame 2', boxAt(10.7, 0.12, 0.08, 0, 1.55, -17.82), material('#ff4d8d', 0.3, 0.2, { emissive: '#ff4d8d', emissiveIntensity: 4 }), [0, 0, 0]);
  const glyph = [];
  const gx = -4.6, gy = 2.4;
  for (let i = 0; i < 14; i++) {
    const w = 0.25 + rnd() * 1.4, h = 0.05 + rnd() * 0.22;
    glyph.push(...boxAt(w, h, 0.02, gx + rnd() * 9.2, gy + i * 0.5, -17.78));
  }
  add(doc, 'Hologram glyphs', glyph, material('#4de8ff', 0.3, 0.2, { emissive: '#4de8ff', emissiveIntensity: 6 }), [0, 0, 0]);

  // street lamps / cables
  const lampMetal = [];
  const lamps = [];
  for (const side of [-1, 1]) {
    for (let z = -18; z <= 18; z += 7.5) {
      lampMetal.push(...boxAt(0.06, 4.2, 0.06, side * 4.85, 2.1, z));
      lampMetal.push(...boxAt(0.6, 0.05, 0.05, side * 5.1, 4.2, z));
      lamps.push(...boxAt(0.32, 0.025, 0.12, side * 5.4, 4.2, z));
    }
  }
  add(doc, 'Lamp posts', lampMetal, material('#1b222d', 0.6, 0.35), [0, 0, 0]);
  add(doc, 'Lamp bars', lamps, material('#ffd9a0', 0.2, 0.2, { emissive: '#ffd9a0', emissiveIntensity: 5 }), [0, 0, 0]);
  const cables = [];
  for (let z = -16; z <= 16; z += 6.5) {
    cables.push(...boxAt(10.9, 0.018, 0.018, 0, 5.4 + (z % 3) * 0.15, z));
  }
  add(doc, 'Cables', cables, material('#05070a', 0.2, 0.6), [0, 0, 0]);

  // hovering traffic
  add(doc, 'Hover car body', boxAt(1.45, 0.22, 0.62, 0.2, 4.6, -3.0), material('#1a2230', 0.65, 0.28), [0, 0, 0]);
  add(doc, 'Hover car canopy', boxAt(0.7, 0.18, 0.48, 0.2, 4.72, -3.0), material('#03090f', 0.4, 0.1, { opacity: 0.55, transparent: true }), [0, 0, 0]);
  add(doc, 'Hover car light', boxAt(0.05, 0.05, 0.5, 0.93, 4.58, -3.0), material('#4de8ff', 0.2, 0.2, { emissive: '#4de8ff', emissiveIntensity: 7 }), [0, 0, 0]);
  add(doc, 'Hover car rear light', boxAt(0.04, 0.05, 0.4, -0.52, 4.58, -3.0), material('#ff315f', 0.2, 0.2, { emissive: '#ff315f', emissiveIntensity: 7 }), [0, 0, 0]);

  for (let i = 0; i < 6; i++) {
    add(doc, 'Puddle', boxAt(1.2 + rnd() * 1.8, 0.004, 2.2 + rnd() * 3.0, (rnd() - 0.5) * 5.2, 0.012, -14 + i * 5.2), material('#0a1220', 0.75, 0.04, { opacity: 0.72, transparent: true }), [0, 0, 0]);
  }
  doc.meta.stage = 'street';
  doc.meta.autoFrame = false;
  doc.meta.camera = { position: [2.4, 2.35, 25], target: [0, 4.8, -9] };
  doc.meta.fog = { color: '#070b12', near: 12, far: 68 };
  doc.meta.fit = 1.0;
  doc.meta.palette = { neon: '#ff4d8d', cool: '#4de8ff' };
  return doc;
}

function materialFromSpec(input) {
  if (typeof input === 'string') {
    const presets = {
      paint: material('#b31724', 0.55, 0.16, { clearcoat: true }),
      carbon: material('#08090b', 0.35, 0.35),
      glass: material('#07131d', 0.5, 0.05, { opacity: 0.55, transparent: true, doubleSided: true }),
      metal: material('#aab3c0', 0.95, 0.22),
      chrome: material('#d7dee8', 1, 0.08),
      gold: material('#c89b48', 1, 0.16),
      rubber: material('#07080a', 0, 0.95),
      bone: material('#d8c8b2', 0.2, 0.42),
      ceramic: material('#e8e5df', 0.2, 0.25),
      emissive: material('#4de8ff', 0.3, 0.2, { emissive: '#4de8ff', emissiveIntensity: 5 }),
      light: material('#ffd9a0', 0.2, 0.2, { emissive: '#ffd9a0', emissiveIntensity: 3 }),
    };
    return { ...(presets[input] || presets.metal) };
  }
  const m = input && typeof input === 'object' ? input : {};
  return material(
    /^#[0-9a-f]{6}$/i.test(m.color || '') ? m.color : '#c0c7d4',
    Math.max(0, Math.min(1, Number(m.metalness ?? 0.1))),
    Math.max(0, Math.min(1, Number(m.roughness ?? 0.5))),
    {
      opacity: Math.max(0.02, Math.min(1, Number(m.opacity ?? 1))),
      emissive: /^#[0-9a-f]{6}$/i.test(m.emissive || '') ? m.emissive : '#000000',
      emissiveIntensity: Math.max(0, Math.min(20, Number(m.emissiveIntensity ?? 0))),
      clearcoat: Boolean(m.clearcoat),
      transparent: Number(m.opacity ?? 1) < 1 || Boolean(m.transparent),
      doubleSided: Boolean(m.doubleSided),
    },
  );
}

export function buildSpec(spec = {}) {
  validateSpec(spec);
  const doc = createDoc(spec.title || 'AI Sculpt', 'spec');
  const parts = Array.isArray(spec.parts) ? spec.parts : [];
  for (const [partIndex,part] of parts.entries()) {
    const type = part.type || 'box';
    const at = Array.isArray(part.position) ? part.position : [0, 0, 0];
    const rot = Array.isArray(part.rotation) ? part.rotation : [0, 0, 0];
    const scale = Array.isArray(part.scale) ? part.scale : [1, 1, 1];
    let positions = null;
    if (type === 'box') {
      const s = Array.isArray(part.size) ? part.size : [1, 1, 1];
      positions = box(Number(s[0]) || 1, Number(s[1]) || 1, Number(s[2]) || 1);
    } else if (type === 'sphere') {
      const r = Number(part.radius) || 0.5;
      const rr = Array.isArray(part.radii) ? part.radii : [r, r, r];
      positions = sphere(Number(rr[0]) || r, Number(rr[1]) || r, Number(rr[2]) || r, Number(part.segments) || 40, Number(part.rings) || 24);
    } else if (type === 'cylinder') {
      const rTop = Number(part.radiusTop ?? part.radius ?? 0.5);
      const rBot = Number(part.radiusBottom ?? part.radius ?? 0.5);
      const h = Number(part.height) || 1;
      positions = lathe([[rBot, -h / 2], [rTop, h / 2]], Number(part.segments) || 40, true);
    } else if (type === 'cone') {
      const r = Number(part.radius) || 0.5;
      const h = Number(part.height) || 1;
      positions = lathe([[r, -h / 2], [0, h / 2]], Number(part.segments) || 40, true);
    } else if (type === 'torus') {
      positions = torus(Number(part.radius) || 0.6, Number(part.tube) || 0.15, Number(part.segments) || 48, Number(part.tubeSegments) || 20);
    } else if (type === 'lathe') {
      const profile = Array.isArray(part.profile) ? part.profile.filter((p) => Array.isArray(p) && p.length >= 2) : [];
      if (profile.length >= 2) positions = lathe(profile.map(([r, y]) => [Number(r), Number(y)]), Number(part.segments) || 48, part.caps !== false);
    } else if (type === 'extrude') {
      const poly = Array.isArray(part.polygon) ? part.polygon.filter((p) => Array.isArray(p) && p.length >= 2) : [];
      if (poly.length >= 3) positions = extrude(poly.map(([x, y]) => [Number(x), Number(y)]), Number(part.depth) || 0.1);
    } else if (type === 'loft') {
      const sections = Array.isArray(part.sections) ? part.sections : [];
      const rings = sections.map((s) => carRing(Number(s.w) || 0.5, Number(s.h) || 0.3, Number(s.y) || 0, Number(s.z) || 0, Number(part.segments) || 32, Number(s.expX) || 0.66, Number(s.expY) || 0.78));
      if (rings.length >= 2) positions = loftRings(rings, true, part.caps !== false);
    } else if (type === 'spherePatch') {
      positions = spherePatch(Number(part.rx) || 0.5, Number(part.ry) || 0.5, Number(part.rz) || 0.5, Number(part.u0 ?? 0), Number(part.u1 ?? Math.PI * 2), Number(part.v0 ?? 0.1), Number(part.v1 ?? 1.5), Number(part.segments) || 28, Number(part.rings) || 16, Number(part.radiusScale) || 1);
    } else if (type === 'mesh' && Array.isArray(part.positions)) {
      positions = part.positions.map(Number);
    }
    if (!positions || positions.length < 9 || positions.length%9 || positions.some(x=>!Number.isFinite(x)))throw specError('parts['+partIndex+']','没有生成有效有限三角形',part);
    add(doc, String(part.name || type), positions, materialFromSpec(part.material), at, rot, scale);
  }
  doc.meta = {
    ...(spec.meta && typeof spec.meta === 'object' ? spec.meta : {}),
    title: spec.title || 'AI Sculpt',
    template: 'spec',
    autoFrame: spec.autoFrame !== false,
  };
  if (spec.camera) doc.meta.camera = spec.camera;
  if (spec.fit) doc.meta.fit = spec.fit;
  if (spec.stage) doc.meta.stage = spec.stage;
  return { doc, title: doc.meta.title, objects: doc.objects.length, triangles: doc.objects.reduce((n, o) => n + (o.geometryData?.positions?.length || 0) / 9, 0) };
}

function buildApexSdf(palette = {}) {
  const paint = palette.paint || '#b31724';
  const accent = palette.accent || '#d7b15a';
  const carbon = '#08090b';
  const metal = '#aab3c0';
  const rubber = '#07080a';
  const glass = '#07131d';
  const doc = createDoc(palette.title || 'Apex GT · SDF Concept', 'hypercar');

  const wheelWell = (p, x, z) => {
    const dx = Math.max(Math.abs(p[0] - x) - 0.22, 0);
    return Math.hypot(dx, p[1] - 0.43, p[2] - z) - 0.48;
  };
  const body = (p) => {
    let d = sdEllipsoid(p, [0, 0.57, 0], [0.88, 0.30, 2.15]);
    d = smin(d, sdEllipsoid(p, [0, 0.82, 0.18], [0.55, 0.32, 0.98]), 0.16);
    d = smin(d, sdEllipsoid(p, [0, 0.55, -1.58], [0.72, 0.18, 0.68]), 0.10);
    d = smin(d, sdEllipsoid(p, [0, 0.58, 1.38], [0.80, 0.22, 0.64]), 0.10);
    for (const x of [-0.73, 0.73]) for (const z of [-1.43, 1.43]) {
      d = smin(d, sdEllipsoid(p, [x, 0.45, z], [0.28, 0.30, 0.55]), 0.10);
      d = ssub(d, wheelWell(p, x + Math.sign(x) * 0.12, z), 0.035);
    }
    d = ssub(d, sdBox(p, [0, 0.14, 0], [0.92, 0.035, 1.75]), 0.03);
    return d;
  };
  const bodyPositions = surfaceNets(body, [-1.05, 0.17, -2.35], [1.05, 1.25, 2.35], 76, 42, 128);
  add(doc, 'Body · SDF surface', bodyPositions, material(paint, 0.55, 0.13, { clearcoat: true }), [0, 0, 0]);

  // canopy
  add(doc, 'Canopy · glass', sphere(0.47, 0.22, 0.72, 48, 28), material(glass, 0.5, 0.04, { opacity: 0.55, transparent: true }), [0, 0.9, 0.12]);
  add(doc, 'Roof spine', box(0.05, 0.025, 0.9), material(carbon, 0.3, 0.3), [0, 1.05, 0.28]);

  // wheels
  const tire = lathe([[0.22, -0.19], [0.33, -0.2], [0.4, -0.14], [0.42, 0], [0.4, 0.14], [0.33, 0.2], [0.22, 0.19]], 48, true);
  const rim = lathe([[0.22, -0.15], [0.27, -0.11], [0.27, 0.11], [0.22, 0.15], [0.19, 0.13], [0.18, 0.02], [0.18, -0.02], [0.19, -0.13]], 48, true);
  for (const x of [-0.92, 0.92]) for (const z of [-1.43, 1.43]) {
    add(doc, 'Tire', tire, material(rubber, 0, 0.95), [x, 0.43, z], [0, 0, Math.PI / 2]);
    add(doc, 'Rim · forged', rim, material(metal, 0.95, 0.2), [x, 0.43, z], [0, 0, Math.PI / 2]);
    add(doc, 'Brake disc', lathe([[0.15, -0.025], [0.2, -0.02], [0.2, 0.02], [0.15, 0.025]], 40, true), material('#5b626e', 1, 0.3), [x, 0.43, z], [0, 0, Math.PI / 2]);
    add(doc, 'Caliper', box(0.05, 0.14, 0.1), material(accent, 0.3, 0.3), [x - 0.05, 0.38, z + 0.12]);
    for (let k = 0; k < 5; k++) {
      const a = TAU * k / 5;
      add(doc, 'Spoke', box(0.03, 0.22, 0.04), material('#aab4c2', 0.95, 0.22), [x + Math.sin(a) * 0.11, 0.43 + Math.cos(a) * 0.11, z], [0, 0, -a]);
    }
  }

  // aero
  add(doc, 'Front splitter', box(1.72, 0.04, 0.5), material(carbon, 0.35, 0.32), [0, 0.21, -2.18]);
  add(doc, 'Rear diffuser', box(1.5, 0.08, 0.42), material(carbon, 0.35, 0.32), [0, 0.23, 2.14]);
  const airfoil = [[-0.28, 0], [0.28, 0], [0.23, 0.045], [0, 0.075], [-0.23, 0.045]];
  add(doc, 'Rear wing · main', extrude(airfoil, 1.65), material(carbon, 0.4, 0.26), [0, 1.02, 2.1], [0, Math.PI / 2, 0]);
  add(doc, 'Rear wing · flap', extrude(airfoil, 1.55), material(carbon, 0.4, 0.26), [0, 1.12, 2.2], [0, Math.PI / 2, 0]);
  for (const x of [-0.68, 0.68]) add(doc, 'Wing upright', box(0.04, 0.3, 0.18), material(carbon, 0.3, 0.3), [x, 0.9, 2.1]);

  // lights
  for (const x of [-0.54, 0.54]) add(doc, 'Headlight', box(0.22, 0.035, 0.02), material('#dff4ff', 0.3, 0.15, { emissive: '#dff4ff', emissiveIntensity: 4 }), [x, 0.57, -2.18]);
  add(doc, 'Taillight', box(1.1, 0.04, 0.02), material('#ff2b18', 0.3, 0.2, { emissive: '#ff2b18', emissiveIntensity: 4 }), [0, 0.62, 2.28]);

  // side glass / intakes
  for (const x of [-0.82, 0.82]) {
    add(doc, 'Side glass', box(0.015, 0.22, 0.85), material(glass, 0.5, 0.04, { opacity: 0.65, transparent: true }), [x, 0.84, 0.25], [0, 0, -0.08]);
    add(doc, 'Side intake', box(0.05, 0.16, 0.55), material(carbon, 0.35, 0.3), [x, 0.52, 0.55], [0, 0, -0.08]);
  }

  doc.meta.palette = { paint, accent };
  return doc;
}

function buildHeadphones(palette = {}) {
  const leather = palette.leather || '#241d1a';
  const metal = palette.metal || '#b8c0cb';
  const accent = palette.accent || '#c8a15a';
  const matte = '#101216';
  const doc = createDoc(palette.title || 'Auralis One · Reference Headphones', 'headphones');

  // headband: outer structural arc + leather inner pad
  const headband = torusArc(0.92, 0.045, 0.03, Math.PI - 0.03, 96, 14);
  add(doc, 'Headband · structural arc', headband, material('#1a1d23', 0.55, 0.32), [0, 1.48, 0]);
  add(doc, 'Headband · leather pad', torusArc(0.88, 0.075, 0.12, Math.PI - 0.12, 96, 18), material(leather, 0.05, 0.78), [0, 1.48, 0]);
  add(doc, 'Headband · accent seam', torusArc(0.925, 0.008, 0.05, Math.PI - 0.05, 96, 6), material(accent, 0.85, 0.25), [0, 1.48, 0]);

  // ear cups
  const cup = sphere(0.14, 0.42, 0.42, 56, 32);
  const plate = sphere(0.045, 0.36, 0.36, 56, 28);
  const cushion = torus(0.30, 0.075, 56, 14);
  for (const side of [-1, 1]) {
    const x = side * 1.0;
    add(doc, 'Ear cup · shell', cup, material(matte, 0.45, 0.38), [x, 0.98, 0], [0, 0, 0]);
    add(doc, 'Ear cup · outer plate', plate, material(metal, 0.95, 0.22), [side * 1.13, 0.98, 0], [0, 0, 0]);
    add(doc, 'Ear cushion', cushion, material(leather, 0.05, 0.82), [side * 0.85, 0.98, 0], [0, Math.PI / 2, 0]);
    add(doc, 'Ear cushion seam', torus(0.30, 0.006, 56, 8), material('#0a0b0d', 0.2, 0.6), [side * 0.845, 0.98, 0], [0, Math.PI / 2, 0]);
    add(doc, 'Logo ring', torus(0.115, 0.008, 48, 8), material(accent, 1, 0.18), [side * 1.145, 0.98, 0], [0, Math.PI / 2, 0]);
    add(doc, 'Logo dot', lathe([[0.035, -0.006], [0.038, 0.006], [0.03, 0.008]], 32, true), material(metal, 0.9, 0.2), [side * 1.148, 0.98, 0], [0, 0, Math.PI / 2]);
    // yoke
    add(doc, 'Yoke · vertical', box(0.065, 0.44, 0.10), material(metal, 0.95, 0.24), [side * 1.0, 1.2, 0]);
    add(doc, 'Yoke · top', box(0.12, 0.075, 0.16), material(metal, 0.95, 0.24), [side * 0.92, 1.46, 0]);
    add(doc, 'Hinge', lathe([[0.055, -0.06], [0.065, -0.04], [0.065, 0.04], [0.055, 0.06]], 40, true), material('#16181d', 0.7, 0.3), [side * 1.0, 1.4, 0], [0, 0, Math.PI / 2]);
    add(doc, 'Hinge cap', lathe([[0.03, -0.006], [0.034, 0.006]], 32, true), material(accent, 1, 0.2), [side * 1.0, 1.4, 0.09], [0, 0, 0]);
  }

  // headband ends / sliders
  for (const side of [-1, 1]) {
    add(doc, 'Slider', box(0.075, 0.3, 0.12), material(metal, 0.95, 0.24), [side * 0.94, 1.31, 0]);
    add(doc, 'Slider ring', torus(0.062, 0.01, 32, 8), material(accent, 1, 0.2), [side * 0.94, 1.2, 0], [0, Math.PI / 2, 0]);
  }

  // grille rings on inner cup surface
  for (const side of [-1, 1]) {
    for (const r of [0.17, 0.22, 0.27]) {
      add(doc, 'Grille ring', torus(r, 0.004, 56, 6), material('#050607', 0.3, 0.7), [side * 0.80, 0.98, 0], [0, Math.PI / 2, 0]);
    }
  }

  // low display base behind the product, leaving the silhouette clean
  add(doc, 'Display base', lathe([[0.5, 0], [0.54, 0.035], [0.54, 0.08], [0.48, 0.11]], 80, true), material('#0b0d11', 0.55, 0.4), [0, 0, -0.5]);
  add(doc, 'Display accent', torus(0.51, 0.006, 80, 8), material(accent, 0.8, 0.3), [0, 0.105, -0.5], [Math.PI / 2, 0, 0]);

  doc.meta.palette = { leather, metal, accent };
  doc.meta.fit = 1.55;
  return doc;
}

const TEMPLATES = {
  hypercar: buildApexSdf,
  headphones: buildHeadphones,
  neon: buildNeonDistrict,
  xenotype: buildXenotype,
  interceptor: buildInterceptor,
  helmet: buildHelmet,
};

export function generateShowpiece(template = 'hypercar', options = {}) {
  const fn = TEMPLATES[template] || buildHypercar;
  const doc = fn(options);
  if (options.title) doc.meta.title = options.title;
  return { doc, template: doc.meta.template, title: doc.meta.title, objects: doc.objects.length, triangles: doc.objects.reduce((n, o) => n + (o.geometryData?.positions?.length || 0) / 9, 0) };
}

export function templateCatalog() {
  return [
    { id: 'hypercar', name: 'Apex GT', brief: '低趴宽体超跑：loft 车壳、玻璃座舱、锻造轮毂、空力套件、灯带' },
    { id: 'interceptor', name: 'Vanta Interceptor', brief: '折面太空拦截机：主翼、双引擎辉光、座舱、装甲板' },
    { id: 'helmet', name: 'Apex Pilot Helmet', brief: '飞行员头盔：壳体、黑色面罩、通风口、耳罩、竞速条纹' },
    { id: 'xenotype', name: 'Xenotype Bust', brief: 'SDF 异形半身像：头冠、双角、冷光眼、肩甲、基座' },
    { id: 'headphones', name: 'Auralis One', brief: '旗舰头戴耳机：头梁、皮革耳罩、金属轭架、格栅、展示底座' },
    { id: 'neon', name: 'Neon District', brief: '赛博街区：湿地面、楼体窗格、霓虹招牌、悬浮车、体积雾' },
  ];
}


export { box, sphere, lathe, torus, torusArc, extrude, loftRings, carRing, spherePatch, material };
