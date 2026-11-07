import { evaluateDoc } from './kernel.js';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { builtinPositions } from './analyze.js';

/* ------------------------------------------------------------------ png */
const CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function writePng(file, width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  return png.length;
}

/* ------------------------------------------------------------------ math */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;

function rotate(p, r) {
  // three.js Euler order 'XYZ' composes R = Rx * Ry * Rz, so with column
  // vectors Z is applied first, then Y, then X.
  let [x, y, z] = p;
  let c = Math.cos(r[2]), s = Math.sin(r[2]);
  [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(r[1]); s = Math.sin(r[1]);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(r[0]); s = Math.sin(r[0]);
  [y, z] = [y * c - z * s, y * s + z * c];
  return [x, y, z];
}
function hexColor(hex) {
  const h = String(hex || '#aab2c0').replace('#', '');
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}
const srgb = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const aces = (x) => {
  const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp01((x * (a * x + b)) / (x * (c * x + d) + e));
};

/* --------------------------------------------------------------- geometry */
function buildTriangles(doc) {
  doc = evaluateDoc(doc);
  const tris = [];
  for (const o of doc.objects || []) {
    const src = Array.isArray(o.geometryData?.positions) ? o.geometryData.positions : builtinPositions(o);
    if (!src || !src.length) continue;
    // slight per-part albedo drift, like plates painted at different times
    const hseed = ((o.name || '').split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7) + (o.id || '').length * 131) >>> 0;
    // id/debug passes need the exact material colour, so drift can be disabled
    const drift = doc.meta?.aestheticDrift === true ? ((hseed % 1000) / 1000 - 0.5) * 0.16 : 0;
    const baseColor = doc.meta?.unlitColors ? hexColor(o.material?.color) : hexColor(o.material?.color).map(srgb);
    const metal = Number(o.material?.metalness ?? 0.1);
    const rough = Math.max(0.06, Number(o.material?.roughness ?? 0.5));
    const emi = o.material?.emissive ? hexColor(o.material.emissive).map(srgb) : [0, 0, 0];
    const emiK = Number(o.material?.emissiveIntensity ?? (o.material?.emissive ? 1 : 0));
    const ds = Boolean(o.material?.doubleSided) || Number(o.material?.opacity ?? 1) < 1;
    // id passes need exact byte round-tripping, so they skip the srgb transfer
    const color = doc.meta?.unlitColors ? baseColor : baseColor.map((c) => clamp01(c * (1 + drift)));
    const pos = o.position || [0, 0, 0], rot = o.rotation || [0, 0, 0], sc = o.scale || [1, 1, 1];
    // A mirrored transform flips winding. three.js compensates by flipping
    // frontFaceCW, so the same faces stay visible; emulate that by swapping two
    // vertices before the normal is derived.
    const mirrored = sc[0] * sc[1] * sc[2] < 0;
    const tp = (i) => {
      const p = [src[i] * sc[0], src[i + 1] * sc[1], src[i + 2] * sc[2]];
      const r = rotate(p, rot);
      return [r[0] + pos[0], r[1] + pos[1], r[2] + pos[2]];
    };
    // only genuinely round primitives get welded normals; armor blocks stay
    // faceted so chamfers and plate edges keep their hard highlights.
    const nm = o.name || '';
    const round = /wheel|cylinder|tube|lathe|sphere|ring|barrel|drum|sprocket|idler|road|hub|rod|pipe|muzzle/i.test(nm);
    const flat = /hull|turret|era|skirt|link|panel|plate|deck|rail|hook|light|antenna|cable|seam|bolt|box|basket|fender|hatch/i.test(nm);
    // explicit per-object shading wins; otherwise guess from the name
    const smooth = o.shading === 'flat' ? false : o.shading === 'smooth' ? true : round && !flat;
    const local = [];
    for (let i = 0; i + 8 < src.length; i += 9) {
      const a = tp(i), b = tp(i + 3), c = tp(i + 6);
      const bb = mirrored ? c : b, cc = mirrored ? b : c;
      const n = norm(cross(sub(bb, a), sub(cc, a)));
      if (!Number.isFinite(n[0])) continue;
      local.push({ a, b: bb, c: cc, n, obj: o.name, id: o.id, alpha: clamp01(Number(o.material?.opacity ?? 1)) });
    }
    if (smooth) {
      const acc = new Map();
      const key = (p) => p.map((v) => v.toFixed(4)).join(',');
      for (const t of local) for (const p of [t.a, t.b, t.c]) {
        const k = key(p); const e = acc.get(k) || [0, 0, 0];
        e[0] += t.n[0]; e[1] += t.n[1]; e[2] += t.n[2]; acc.set(k, e);
      }
      for (const t of local) {
        tris.push({
          ...t, color, metal, rough, emi, emiK, ds,
          na: norm(acc.get(key(t.a))), nb: norm(acc.get(key(t.b))), nc: norm(acc.get(key(t.c))),
        });
      }
    } else {
      for (const t of local) tris.push({ ...t, color, metal, rough, emi, emiK, ds, na: t.n, nb: t.n, nc: t.n });
    }
  }
  return tris;
}

/* ----------------------------------------------------------- shadow pass */
function lightBasis(dir) {
  const L = norm(dir);
  const upRef = Math.abs(L[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
  const right = norm(cross(upRef, L));
  const up = cross(L, right);
  return { L, right, up };
}
function buildShadow(tris, center, ext, basis, S = 1024) {
  const depth = new Float32Array(S * S).fill(-1e9);
  const { L, right, up } = basis;
  const toS = (p) => {
    const d = sub(p, center);
    const x = dot(d, right) / ext, y = dot(d, up) / ext;
    return [(x * 0.5 + 0.5) * S, (0.5 - y * 0.5) * S, dot(d, L)];
  };
  for (const t of tris) {
    const A = toS(t.a), B = toS(t.b), C = toS(t.c);
    const minX = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0])));
    const maxX = Math.min(S - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
    const minY = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1])));
    const maxY = Math.min(S - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
    if (minX > maxX || minY > maxY) continue;
    const den = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
    if (Math.abs(den) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const l1 = ((B[1] - C[1]) * (x - C[0]) + (C[0] - B[0]) * (y - C[1])) / den;
      const l2 = ((C[1] - A[1]) * (x - C[0]) + (A[0] - C[0]) * (y - C[1])) / den;
      const l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      const z = A[2] * l1 + B[2] * l2 + C[2] * l3;
      const i = y * S + x;
      if (z > depth[i]) depth[i] = z;
    }
  }
  return { depth, S, ext, toS, bias: (2 * ext / S) * 2.6 };
}

/* ------------------------------------------------------------- one frame */
// Cheap screen-space ambient occlusion. Crevices are exactly where a hard-surface
// model stops looking like plastic, and nothing else in this renderer darkens
// them: the shadow map only knows the key light, and a contact point between two
// parts sees no shadow at all because the occluder is the part itself.
function applyAO(hdr, zb, posBuf, nrmBuf, W, H, eye, right, up, forward, f, aspect, opts) {
  const radius = Number(opts.aoRadius ?? 0.30);
  const strength = Number(opts.aoStrength ?? 0.95);
  const samples = Math.max(4, Math.round(Number(opts.aoSamples ?? 12)));
  const bias = Number(opts.aoBias ?? 0.02);
  const near = Number(opts.aoNear ?? 0.02);
  const dirs = [];
  // fixed low-discrepancy hemisphere; deterministic output matters for tests
  for (let i = 0; i < samples; i++) {
    const t = (i + 0.5) / samples;
    const a = i * 2.399963;                       // golden angle
    const r = Math.sqrt(t);
    dirs.push([Math.cos(a) * r, Math.sin(a) * r, Math.sqrt(Math.max(0, 1 - t))]);
  }
  const tanA = [0, 0, 0], tanB = [0, 0, 0];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const z = zb[idx];
      if (!(z < Infinity)) continue;
      const px = posBuf[idx * 3], py = posBuf[idx * 3 + 1], pz = posBuf[idx * 3 + 2];
      let nx = nrmBuf[idx * 3], ny = nrmBuf[idx * 3 + 1], nz = nrmBuf[idx * 3 + 2];
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;
      // build a tangent frame around the normal
      const helper = Math.abs(nx) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      tanA[0] = ny * helper[2] - nz * helper[1];
      tanA[1] = nz * helper[0] - nx * helper[2];
      tanA[2] = nx * helper[1] - ny * helper[0];
      const al = Math.hypot(tanA[0], tanA[1], tanA[2]) || 1;
      tanA[0] /= al; tanA[1] /= al; tanA[2] /= al;
      tanB[0] = ny * tanA[2] - nz * tanA[1];
      tanB[1] = nz * tanA[0] - nx * tanA[2];
      tanB[2] = nx * tanA[1] - ny * tanA[0];
      let occ = 0;
      for (const d of dirs) {
        const sx = px + (tanA[0] * d[0] + tanB[0] * d[1] + nx * d[2]) * radius;
        const sy = py + (tanA[1] * d[0] + tanB[1] * d[1] + ny * d[2]) * radius;
        const sz = pz + (tanA[2] * d[0] + tanB[2] * d[1] + nz * d[2]) * radius;
        const rx = sx - eye[0], ry = sy - eye[1], rz = sz - eye[2];
        const vz = rx * forward[0] + ry * forward[1] + rz * forward[2];
        if (vz <= near) { occ += 0; continue; }
        const ux = (rx * right[0] + ry * right[1] + rz * right[2]) * f / aspect / vz;
        const uy = (rx * up[0] + ry * up[1] + rz * up[2]) * f / vz;
        const qx = Math.round((ux * 0.5 + 0.5) * W);
        const qy = Math.round((0.5 - uy * 0.5) * H);
        if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
        const occl = zb[qy * W + qx];
        if (occl < vz - bias) occ += 1;             // something in front of the sample
      }
      const ao = 1 - strength * (occ / dirs.length);
      if (ao >= 0.999) continue;
      const o = idx * 3;
      hdr[o] *= ao; hdr[o + 1] *= ao; hdr[o + 2] *= ao;
    }
  }
}

function renderView(tris, shadow, opts, eye, target, W, H, fov, hero) {
  const f = 1 / Math.tan((fov * Math.PI / 180) / 2);
  const aspect = W / H;
  const forward = norm(sub(target, eye));
  const upRef = Math.abs(forward[1]) > 0.9 ? [0, 0, -1] : [0, 1, 0];
  const right = norm(cross(forward, upRef));
  const up = cross(right, forward);

  // ---- the client's rig, verbatim -------------------------------------
  // renderer: ACESFilmic, exposure 0.95, sRGB output
  // hemi(#b8ccff,#181b21,0.72) + key dir #fff2df @2.4 at (5.5,9,6)
  // + fill point #6b9dff @12 at (-4.5,3.4,-3.5) + rim point #ff9d6b @9 at (3.5,2.2,-5)
  const exposure = Number(opts.exposure ?? 0.95);
  const keyDir = norm([5.5, 9.0, 6.0]);
  const keyRad = [1.0, 0.949, 0.874].map((c) => c * 2.4);
  const hemiSky = [0.722, 0.800, 1.000].map(srgb);
  const hemiGround = [0.094, 0.106, 0.129].map(srgb);
  const hemiInt = 0.72;
  const fillPos = [-4.5, 3.4, -3.5], fillCol = [0.420, 0.616, 1.000].map(srgb), fillInt = 12, fillDist = 22;
  const rimPos = [3.5, 2.2, -5.0], rimCol = [1.000, 0.616, 0.420].map(srgb), rimInt = 9, rimDist = 18;
  const LIGHT_SCALE = Number(opts.lightScale ?? 1.0);

  const hdr = new Float32Array(W * H * 3);
  const bg = [0.067, 0.075, 0.094].map(srgb);
  for (let i = 0; i < hdr.length; i += 3) { hdr[i] = bg[0]; hdr[i + 1] = bg[1]; hdr[i + 2] = bg[2]; }

  const zb = new Float32Array(W * H).fill(Infinity);
  // kept for the ambient-occlusion pass below; without them the pass would have
  // to guess geometry from depth alone
  const posBuf = new Float32Array(W * H * 3);
  const nrmBuf = new Float32Array(W * H * 3);
  const view = norm(sub(eye, target));
  const epsV = 0.10;
  const toView = (p) => {
    const d = sub(p, eye);
    return [dot(d, right) * f / aspect, dot(d, up) * f, dot(d, forward)];
  };
  const mkVert = (p, n) => ({ v: toView(p), w: p, n });
  let halfH = 1, halfW = 1;
  if (opts.ortho) {
    let mUp = 0, mRight = 0;
    for (const t of tris) {
      if (!t.obj) continue;
      for (const q of [t.a, t.b, t.c]) {
        const d = sub(q, target);
        mUp = Math.max(mUp, Math.abs(dot(d, up)));
        mRight = Math.max(mRight, Math.abs(dot(d, right)));
      }
    }
    halfH = Math.max(mUp, mRight / aspect) * 1.06 || 1;
    halfW = halfH * aspect;
  }

  const pointLight = (pos, intensity, dist, p, n) => {
    const dx = pos[0] - p[0], dy = pos[1] - p[1], dz = pos[2] - p[2];
    const d2 = Math.max(dx * dx + dy * dy + dz * dz, 0.01);
    const d = Math.sqrt(d2);
    if (d > dist) return 0;
    const falloff = Math.pow(Math.max(0, 1 - Math.pow(d / dist, 4)), 2) / d2;
    const inv = 1 / d;
    const nl = Math.max(0, n[0] * dx * inv + n[1] * dy * inv + n[2] * dz * inv);
    return intensity * falloff * nl;
  };

  const rasterTri = (A, B, C, t) => {
    let SA, SB, SC;
    if (opts.ortho) {
      const ua = dot(sub(A.w, target), right), va = dot(sub(A.w, target), up);
      const ub = dot(sub(B.w, target), right), vb = dot(sub(B.w, target), up);
      const uc = dot(sub(C.w, target), right), vc = dot(sub(C.w, target), up);
      SA = [(ua / halfW * 0.5 + 0.5) * W, (0.5 - va / halfH * 0.5) * H, A.v[2]];
      SB = [(ub / halfW * 0.5 + 0.5) * W, (0.5 - vb / halfH * 0.5) * H, B.v[2]];
      SC = [(uc / halfW * 0.5 + 0.5) * W, (0.5 - vc / halfH * 0.5) * H, C.v[2]];
    } else {
      SA = [(A.v[0] / A.v[2] * 0.5 + 0.5) * W, (0.5 - A.v[1] / A.v[2] * 0.5) * H, A.v[2]];
      SB = [(B.v[0] / B.v[2] * 0.5 + 0.5) * W, (0.5 - B.v[1] / B.v[2] * 0.5) * H, B.v[2]];
      SC = [(C.v[0] / C.v[2] * 0.5 + 0.5) * W, (0.5 - C.v[1] / C.v[2] * 0.5) * H, C.v[2]];
    }
    const minX = Math.max(0, Math.floor(Math.min(SA[0], SB[0], SC[0])));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(SA[0], SB[0], SC[0])));
    const minY = Math.max(0, Math.floor(Math.min(SA[1], SB[1], SC[1])));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(SA[1], SB[1], SC[1])));
    if (minX > maxX || minY > maxY) return;
    const den = (SB[1] - SC[1]) * (SA[0] - SC[0]) + (SC[0] - SB[0]) * (SA[1] - SC[1]);
    if (Math.abs(den) < 1e-9) return;
    const iza = 1 / SA[2], izb = 1 / SB[2], izc = 1 / SC[2];
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const l1 = ((SB[1] - SC[1]) * (x - SC[0]) + (SC[0] - SB[0]) * (y - SC[1])) / den;
      const l2 = ((SC[1] - SA[1]) * (x - SC[0]) + (SA[0] - SC[0]) * (y - SC[1])) / den;
      const l3 = 1 - l1 - l2;
      if (l1 < -0.0001 || l2 < -0.0001 || l3 < -0.0001) continue;
      // Perspective interpolates attributes with lambda/depth and the true
      // depth is 1/sum; orthographic has clip w = 1, so its weights stay affine.
      let wa, wb, wc, inv, z;
      if (opts.ortho) {
        wa = l1; wb = l2; wc = l3; inv = 1;
        z = l1 * SA[2] + l2 * SB[2] + l3 * SC[2];
      } else {
        wa = l1 * iza; wb = l2 * izb; wc = l3 * izc;
        inv = 1 / (wa + wb + wc);
        z = inv;                       // nearest surface has the smallest z
      }
      const idx = y * W + x;
      if (z >= zb[idx]) continue;
      if (t.alpha >= 0.999) zb[idx] = z;   // glass tests depth without writing it
      const px = (A.w[0] * wa + B.w[0] * wb + C.w[0] * wc) * inv;
      const py = (A.w[1] * wa + B.w[1] * wb + C.w[1] * wc) * inv;
      const pz = (A.w[2] * wa + B.w[2] * wb + C.w[2] * wc) * inv;
      let nx = (A.n[0] * wa + B.n[0] * wb + C.n[0] * wc) * inv;
      let ny = (A.n[1] * wa + B.n[1] * wb + C.n[1] * wc) * inv;
      let nz = (A.n[2] * wa + B.n[2] * wb + C.n[2] * wc) * inv;
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;

      const S = shadow.toS([px, py, pz]);
      const sx = S[0] | 0, sy = S[1] | 0;
      let shadowV = 1;
      if (sx > 0 && sy > 0 && sx < shadow.S - 1 && sy < shadow.S - 1) {
        const b = shadow.bias;
        let lit = 0;
        for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) {
          const d = shadow.depth[(sy + oy) * shadow.S + (sx + ox)];
          lit += S[2] < d - b ? 0 : 1;
        }
        shadowV = lit / 4;
      }

      const n3 = [nx, ny, nz];
      const keyNl = Math.max(0, nx * keyDir[0] + ny * keyDir[1] + nz * keyDir[2]) * shadowV;
      const fillK = pointLight(fillPos, fillInt, fillDist, [px, py, pz], n3) * shadowV;
      const rimK = pointLight(rimPos, rimInt, rimDist, [px, py, pz], n3) * shadowV;
      const hemiMix = clamp01(ny * 0.5 + 0.5);
      const hemiR = (hemiGround[0] + (hemiSky[0] - hemiGround[0]) * hemiMix) * hemiInt;
      const hemiG = (hemiGround[1] + (hemiSky[1] - hemiGround[1]) * hemiMix) * hemiInt;
      const hemiB = (hemiGround[2] + (hemiSky[2] - hemiGround[2]) * hemiMix) * hemiInt;

      const irrR = keyNl * keyRad[0] + fillK * fillCol[0] + rimK * rimCol[0];
      const irrG = keyNl * keyRad[1] + fillK * fillCol[1] + rimK * rimCol[1];
      const irrB = keyNl * keyRad[2] + fillK * fillCol[2] + rimK * rimCol[2];

      const shin = Math.max(4, 2 / (t.rough * t.rough + 1e-4) - 2);
      const hx = keyDir[0] + view[0], hy = keyDir[1] + view[1], hz = keyDir[2] + view[2];
      const hl = Math.hypot(hx, hy, hz) || 1;
      const ndh = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl);
      const specN = Math.pow(ndh, shin) * (shin + 8) / (8 * Math.PI) * (1 - t.rough) * (1 - t.rough);
      const ndv = Math.max(0.001, nx * view[0] + ny * view[1] + nz * view[2]);
      const fres = Math.pow(1 - ndv, 5) * 0.7 + 0.04;

      const albR = t.color[0], albG = t.color[1], albB = t.color[2];
      const specTintR = t.metal * albR + (1 - t.metal);
      const specTintG = t.metal * albG + (1 - t.metal);
      const specTintB = t.metal * albB + (1 - t.metal);
      const specI = specN * (keyRad[0] + fillK + rimK) * 0.32;

      let r = (albR * irrR + hemiR * albR) / Math.PI * LIGHT_SCALE + specTintR * specI;
      let g = (albG * irrG + hemiG * albG) / Math.PI * LIGHT_SCALE + specTintG * specI;
      let b = (albB * irrB + hemiB * albB) / Math.PI * LIGHT_SCALE + specTintB * specI;
      r += fres * hemiR * 0.25; g += fres * hemiG * 0.25; b += fres * hemiB * 0.25;

      if (t.emiK > 0) { r += t.emi[0] * t.emiK; g += t.emi[1] * t.emiK; b += t.emi[2] * t.emiK; }

      // id/debug pass: write the material colour straight through, untouched by
      // lighting or exposure, so it can be decoded back to an object index
      if (opts.unlit) { r = t.color[0]; g = t.color[1]; b = t.color[2]; }
      if (!(r >= 0) || !(r < 1e6) || !Number.isFinite(g) || !Number.isFinite(b)) continue;
      const sc = opts.unlit ? 1 : exposure;
      const o = idx * 3;
      if (t.alpha < 0.999) {
        // glass: blend over what is already there and leave the depth buffer
        // alone, so surfaces behind it stay valid for anything drawn later
        const a = t.alpha;
        hdr[o] = hdr[o] * (1 - a) + r * sc * a;
        hdr[o + 1] = hdr[o + 1] * (1 - a) + g * sc * a;
        hdr[o + 2] = hdr[o + 2] * (1 - a) + b * sc * a;
      } else {
        hdr[o] = r * sc; hdr[o + 1] = g * sc; hdr[o + 2] = b * sc;
        posBuf[idx * 3] = px; posBuf[idx * 3 + 1] = py; posBuf[idx * 3 + 2] = pz;
        nrmBuf[idx * 3] = nx; nrmBuf[idx * 3 + 1] = ny; nrmBuf[idx * 3 + 2] = nz;
      }
    }
  };

  const glass = [];
  for (const t of tris) if (t.alpha < 0.999) glass.push(t);
  if (glass.length) {
    glass.sort((u, v) => {
      const du = (u.a[0] + u.b[0] + u.c[0] - 3 * eye[0]) ** 2 + (u.a[1] + u.b[1] + u.c[1] - 3 * eye[1]) ** 2 + (u.a[2] + u.b[2] + u.c[2] - 3 * eye[2]) ** 2;
      const dv = (v.a[0] + v.b[0] + v.c[0] - 3 * eye[0]) ** 2 + (v.a[1] + v.b[1] + v.c[1] - 3 * eye[1]) ** 2 + (v.a[2] + v.b[2] + v.c[2] - 3 * eye[2]) ** 2;
      return dv - du;
    });
  }
  const drawList = glass.length ? [...tris.filter((t) => t.alpha >= 0.999), ...glass] : tris;
  for (const t of drawList) {
    if (!t.ds) {
      // A front face's normal points back at the viewer, so a positive dot
      // with (centroid - eye) means the face is turned away and is dropped.
      // Orthographic rays are parallel, so facing there ignores lateral offset.
      let away;
      if (opts.ortho) {
        away = t.n[0] * forward[0] + t.n[1] * forward[1] + t.n[2] * forward[2];
      } else {
        const cx2 = (t.a[0] + t.b[0] + t.c[0]) / 3 - eye[0];
        const cy2 = (t.a[1] + t.b[1] + t.c[1]) / 3 - eye[1];
        const cz2 = (t.a[2] + t.b[2] + t.c[2]) / 3 - eye[2];
        away = t.n[0] * cx2 + t.n[1] * cy2 + t.n[2] * cz2;
      }
      if (away > 0) continue;
    }
    const P = [mkVert(t.a, t.na), mkVert(t.b, t.nb), mkVert(t.c, t.nc)];
    const poly = [];
    for (let i = 0; i < 3; i++) {
      const a = P[i], b = P[(i + 1) % 3];
      const ain = a.v[2] >= epsV, bin = b.v[2] >= epsV;
      if (ain) poly.push(a);
      if (ain !== bin) {
        const k = (epsV - a.v[2]) / (b.v[2] - a.v[2]);
        poly.push({
          v: [a.v[0] + (b.v[0] - a.v[0]) * k, a.v[1] + (b.v[1] - a.v[1]) * k, epsV],
          w: [a.w[0] + (b.w[0] - a.w[0]) * k, a.w[1] + (b.w[1] - a.w[1]) * k, a.w[2] + (b.w[2] - a.w[2]) * k],
          n: [a.n[0] + (b.n[0] - a.n[0]) * k, a.n[1] + (b.n[1] - a.n[1]) * k, a.n[2] + (b.n[2] - a.n[2]) * k],
        });
      }
    }
    for (let i = 1; i + 1 < poly.length; i++) rasterTri(poly[0], poly[i], poly[i + 1], t);
  }
  // an id pass encodes object indices in the colour, so shading must not touch it
  if (opts.ao !== false && !opts.unlit) applyAO(hdr, zb, posBuf, nrmBuf, W, H, eye, right, up, forward, f, aspect, opts);
  if (opts.ortho) hdr.orthoBounds = { left: -halfW, right: halfW, top: halfH, bottom: -halfH };
  return hdr;
}

/* ------------------------------------------------------------ post stack */
function bloom(hdr, W, H) {
  const dw = Math.max(1, W >> 2), dh = Math.max(1, H >> 2);
  const small = new Float32Array(dw * dh * 3);
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
      const px = Math.min(W - 1, x * 4 + sx), py = Math.min(H - 1, y * 4 + sy);
      const i = (py * W + px) * 3;
      r += hdr[i]; g += hdr[i + 1]; b += hdr[i + 2];
    }
    const i = (y * dw + x) * 3;
    small[i] = r / 16; small[i + 1] = g / 16; small[i + 2] = b / 16;
  }
  for (let i = 0; i < small.length; i += 3) {
    const l = 0.2126 * small[i] + 0.7152 * small[i + 1] + 0.0722 * small[i + 2];
    const k = Math.max(0, l - 0.55) / Math.max(l, 1e-4);
    small[i] *= k; small[i + 1] *= k; small[i + 2] *= k;
  }
  const tmp = new Float32Array(small.length);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = -2; k <= 2; k++) {
        const xx = Math.min(dw - 1, Math.max(0, x + k));
        const i = (y * dw + xx) * 3;
        r += small[i]; g += small[i + 1]; b += small[i + 2];
      }
      const i = (y * dw + x) * 3;
      tmp[i] = r / 5; tmp[i + 1] = g / 5; tmp[i + 2] = b / 5;
    }
    for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = -2; k <= 2; k++) {
        const yy = Math.min(dh - 1, Math.max(0, y + k));
        const i = (yy * dw + x) * 3;
        r += tmp[i]; g += tmp[i + 1]; b += tmp[i + 2];
      }
      const i = (y * dw + x) * 3;
      small[i] = r / 5; small[i + 1] = g / 5; small[i + 2] = b / 5;
    }
  }
  for (let y = 0; y < H; y++) {
    const sy = Math.min(dh - 1, y >> 2);
    for (let x = 0; x < W; x++) {
      const sx = Math.min(dw - 1, x >> 2);
      const si = (sy * dw + sx) * 3, i = (y * W + x) * 3;
      hdr[i] += small[si] * 0.6;
      hdr[i + 1] += small[si + 1] * 0.6;
      hdr[i + 2] += small[si + 2] * 0.6;
    }
  }
}

function finish(hdr, W, H, opts) {
  if (opts.unlit) {
    const rgba0 = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      rgba0[i * 4] = Math.round(clamp01(hdr[i * 3]) * 255);
      rgba0[i * 4 + 1] = Math.round(clamp01(hdr[i * 3 + 1]) * 255);
      rgba0[i * 4 + 2] = Math.round(clamp01(hdr[i * 3 + 2]) * 255);
      rgba0[i * 4 + 3] = 255;
    }
    return rgba0;
  }
  const exposure = Number(opts.exposure || 1.34);
  const rgba = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3, o = (y * W + x) * 4;
      const dx = (x / W - 0.5) * 2, dy = (y / H - 0.5) * 2;
      const vig = 1 - Math.min(0.5, (dx * dx + dy * dy) * 0.15);
      let r = aces(hdr[i] * exposure) * vig;
      let g = aces(hdr[i + 1] * exposure) * vig;
      let b = aces(hdr[i + 2] * exposure) * vig;
      r = Math.pow(r, 1 / 2.2); g = Math.pow(g, 1 / 2.2); b = Math.pow(b, 1 / 2.2);
      const n = Math.sin((x * 12.9898 + y * 78.233) * 43758.5453) * 0.011;
      rgba[o] = clamp01(r + n) * 255;
      rgba[o + 1] = clamp01(g + n) * 255;
      rgba[o + 2] = clamp01(b + n) * 255;
      rgba[o + 3] = 255;
    }
  }
  return rgba;
}

/* --------------------------------------------------------------- entry */
export function renderDoc(doc, opts = {}) {
  const W = Number(opts.width || 1200), H = Number(opts.height || 900);
  const hero = opts.mode === 'hero';
  const ssaa = Math.max(1, Math.min(2, Number(opts.ssaa ?? (hero ? 2 : 1))));
  const IW = Math.round(W * ssaa), IH = Math.round(H * ssaa);
  const tris = buildTriangles(doc);
  if (!tris.length) throw new Error('no geometry to render');

  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (const p of [t.a, t.b, t.c]) for (let k = 0; k < 3; k++) {
    if (p[k] < min[k]) min[k] = p[k];
    if (p[k] > max[k]) max[k] = p[k];
  }
  const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const maxDim = Math.max(size[0], size[1], size[2], 0.5);
  const radius = Math.hypot(size[0], size[1], size[2]) * 0.5 || 1;
  const frontSign = Array.isArray(doc.meta?.front) && doc.meta.front[2] < 0 ? -1 : 1;

  // shadow map sees only the model: a ground plane inside the light frustum
  // would occlude everything it crosses.
  const basis = lightBasis([5.5, 9.0, 6.0]);
  const shadow = buildShadow(tris, center, radius * 1.03, basis, 1024);

  // ground plane exactly at the model's lowest point
  const gy = min[1];
  const R = radius * 12;
  const gc = hexColor(opts.groundColor || '#171b23').map(srgb);
  const g0 = { color: gc, metal: 0.05, rough: 0.92, emi: [0, 0, 0], emiK: 0, n: [0, 1, 0], na: [0, 1, 0], nb: [0, 1, 0], nc: [0, 1, 0] };
  // grid instead of two huge triangles: a single triangle with one vertex
  // behind the camera would be dropped whole and the floor would vanish.
  const N = 24, step = (2 * R) / N;
  const gx = (i) => center[0] - R + i * step;
  const gz = (i) => center[2] - R + i * step;
  for (let i = 0; i < N && !opts.noGround; i++) for (let j = 0; j < N; j++) {
    const x0 = gx(i), x1 = gx(i + 1), z0 = gz(j), z1 = gz(j + 1);
    tris.push({ ...g0, a: [x0, gy, z0], b: [x1, gy, z0], c: [x1, gy, z1] });
    tris.push({ ...g0, a: [x0, gy, z0], b: [x1, gy, z1], c: [x0, gy, z1] });
  }
  // the client draws a 1 m GridHelper over 40 m; replicate it as unlit quads
  if (!opts.noGrid) {
    const half = 20, lw = 0.012, ly = gy + 0.002;
    const lineMat = (col) => ({ color: [0, 0, 0], metal: 0, rough: 1, emi: hexColor(col).map(srgb), emiK: 1, n: [0, 1, 0], na: [0, 1, 0], nb: [0, 1, 0], nc: [0, 1, 0] });
    const minor = lineMat('#242a36'), major = lineMat('#46506a');
    const quad = (m, x0, z0, x1, z1) => {
      tris.push({ ...m, a: [x0, ly, z0], b: [x1, ly, z0], c: [x1, ly, z1] });
      tris.push({ ...m, a: [x0, ly, z0], b: [x1, ly, z1], c: [x0, ly, z1] });
    };
    for (let k = -half; k <= half; k++) {
      if (!k) continue;
      const m = k % 10 === 0 ? major : minor;
      quad(m, center[0] - half, center[2] + k, center[0] + half, center[2] + k + lw);
      quad(m, center[0] + k, center[2] - half, center[0] + k + lw, center[2] + half);
    }
  }

  // match the client camera exactly: one source of truth for the hero shot
  // (46 deg, 1.32x maxDim, 45 deg azimuth) so software and panel agree.
  const fov = Number(opts.fov || (hero ? 45 : 32));
  const camDist = maxDim * (Number(opts.fit) || Number(doc.meta?.fit) || (hero ? 1.30 : 1.95));
  const mk = (key, dir) => {
    const d = norm([dir[0], dir[1], dir[2] * frontSign]);
    return { key, eye: [center[0] + d[0] * camDist, center[1] + d[1] * camDist, center[2] + d[2] * camDist] };
  };
  // a caller may pin the exact eye/target (e.g. the live client camera)
  const pinned = Array.isArray(opts.eye) && Array.isArray(opts.target)
    ? { key: opts.viewKey || 'client', eye: opts.eye, target: opts.target }
    : null;
  const forced = pinned || (Array.isArray(opts.viewDir) ? mk(opts.viewKey || 'ortho', opts.viewDir) : null);
  const views = forced ? [forced] : hero
    ? [mk('hero', [0.52, 0.174, 0.84])]
    : [
      mk('front', [0.03, 0.12, 1.0]),
      mk('front34', [0.76, 0.20, 0.86]),
      mk('side', [1.0, 0.08, 0.03]),
      mk('back34', [-0.68, 0.30, -0.72]),
    ];

  const single = forced || hero;
  const vw = single ? IW : Math.floor(IW / 2), vh = single ? IH : Math.floor(IH / 2);
  const big = new Float32Array(IW * IH * 3);
  for (let i = 0; i < big.length; i += 3) { big[i] = 0.012; big[i + 1] = 0.016; big[i + 2] = 0.022; }
  const targets = [{ x: 0, y: 0, w: vw, h: vh }];
  if (!single) targets.push({ x: vw, y: 0, w: vw, h: vh }, { x: 0, y: vh, w: vw, h: vh }, { x: vw, y: vh, w: vw, h: vh });

  let orthoBounds = null;
  for (let vi = 0; vi < views.length; vi++) {
    const v = views[vi];
    const frame = renderView(tris, shadow, opts, v.eye, v.target || center, vw, vh, fov, hero);
    if (frame.orthoBounds) orthoBounds = frame.orthoBounds;
    bloom(frame, vw, vh);
    const T = targets[vi];
    for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) {
      const si = (y * vw + x) * 3, di = ((y + T.y) * IW + (x + T.x)) * 3;
      big[di] = frame[si]; big[di + 1] = frame[si + 1]; big[di + 2] = frame[si + 2];
    }
  }

  let out = finish(big, IW, IH, opts);
  let w = IW, h = IH;
  if (ssaa > 1) {
    w = W; h = H;
    const small = Buffer.alloc(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ssaa; sy++) for (let sx = 0; sx < ssaa; sx++) {
        const i = (((y * ssaa + sy) * IW + (x * ssaa + sx)) * 4);
        r += out[i]; g += out[i + 1]; b += out[i + 2];
      }
      const n = ssaa * ssaa, i = (y * W + x) * 4;
      small[i] = Math.round(r / n); small[i + 1] = Math.round(g / n); small[i + 2] = Math.round(b / n); small[i + 3] = 255;
    }
    out = small;
  }

  const file = opts.path || 'modeler-render.png';
  const bytes = writePng(file, w, h, out);
  const keep = opts.keepPixels ? { rgba: out, width: w, height: h } : null;
  return { path: file, bytes, triangles: tris.length, views: views.map((v) => v.key), mode: hero ? 'hero' : 'contact', ssaa, eye: views[0].eye, center, fov, groundY: gy, orthoBounds, ...(keep || {}) };
}
