import fs from 'node:fs';
import zlib from 'node:zlib';
import { builtinPositions } from './analyze.js';

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

const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
const add = (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const mul = (a, s) => [a[0]*s, a[1]*s, a[2]*s];

function rotate(p, r) {
  let [x, y, z] = p;
  const [rx, ry, rz] = r;
  let c = Math.cos(rx), s = Math.sin(rx);
  [y, z] = [y*c - z*s, y*s + z*c];
  c = Math.cos(ry); s = Math.sin(ry);
  [x, z] = [x*c + z*s, -x*s + z*c];
  c = Math.cos(rz); s = Math.sin(rz);
  [x, y] = [x*c - y*s, x*s + y*c];
  return [x, y, z];
}
function hexColor(hex) {
  const h = String(hex || '#aab2c0').replace('#', '');
  return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
}
function buildTriangles(doc) {
  const tris = [];
  for (const o of doc.objects || []) {
    const src = Array.isArray(o.geometryData?.positions) ? o.geometryData.positions : builtinPositions(o);
    if (!src || !src.length) continue;
    const color = hexColor(o.material?.color);
    const metal = Number(o.material?.metalness ?? 0.1), rough = Number(o.material?.roughness ?? 0.5);
    const pos = o.position || [0,0,0], rot = o.rotation || [0,0,0], sc = o.scale || [1,1,1];
    const tp = (i) => {
      const p = [src[i], src[i+1], src[i+2]].map((v, k) => v * sc[k]);
      const r = rotate(p, rot);
      return [r[0]+pos[0], r[1]+pos[1], r[2]+pos[2]];
    };
    const smooth = /hull|turret|wheel|barrel|gun|cupola|ring|cylinder|tube|sphere|lathe|sprocket|idler/i.test(o.name || '') && !/era|skirt|track link|panel|rail|hook|light|antenna|cable|roof plate|seam/i.test(o.name || '');
    const local = [];
    for (let i = 0; i + 8 < src.length; i += 9) {
      const a = tp(i), b = tp(i+3), c = tp(i+6);
      const n = norm(cross(sub(b,a), sub(c,a)));
      if (!Number.isFinite(n[0])) continue;
      local.push({ a, b, c, n });
    }
    if (smooth) {
      const acc = new Map();
      const key = (p) => p.map((v) => v.toFixed(4)).join(',');
      for (const t of local) for (const p of [t.a,t.b,t.c]) {
        const k = key(p); const e = acc.get(k) || [0,0,0];
        e[0]+=t.n[0]; e[1]+=t.n[1]; e[2]+=t.n[2]; acc.set(k,e);
      }
      for (const t of local) {
        const na = norm(acc.get(key(t.a))), nb = norm(acc.get(key(t.b))), nc = norm(acc.get(key(t.c)));
        tris.push({ ...t, na, nb, nc, color, metal, rough });
      }
    } else {
      for (const t of local) tris.push({ ...t, na: t.n, nb: t.n, nc: t.n, color, metal, rough });
    }
  }
  return tris;
}

function renderView(tris, opts, eye, target, W, H, bgTop, bgBottom) {
  const fov = (opts.fov || 32) * Math.PI / 180;
  const f = 1 / Math.tan(fov / 2);
  const aspect = W / H;
  const forward = norm(sub(target, eye));
  const upRef = Math.abs(forward[1]) > 0.9 ? [0, 0, -1] : [0, 1, 0];
  const right = norm(cross(upRef, forward));
  const up = cross(forward, right);
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    const t = y / Math.max(1, H-1);
    const r = Math.round(bgTop[0]*(1-t) + bgBottom[0]*t);
    const g = Math.round(bgTop[1]*(1-t) + bgBottom[1]*t);
    const b = Math.round(bgTop[2]*(1-t) + bgBottom[2]*t);
    for (let x = 0; x < W; x++) {
      const i = (y*W+x)*4; buf[i]=r; buf[i+1]=g; buf[i+2]=b; buf[i+3]=255;
    }
  }
  const zb = new Float32Array(W * H).fill(Infinity);
  const key = norm([-0.45, 0.85, 0.55]);
  const fill = norm([0.6, 0.25, -0.5]);
  const view = norm(sub(eye, target));
  const project = (p) => {
    const d = sub(p, eye);
    const vz = dot(d, forward);
    if (vz <= 0.02) return null;
    const sx = (dot(d, right) * f / aspect) / vz;
    const sy = (dot(d, up) * f) / vz;
    return [ (sx*0.5+0.5)*W, (0.5-sy*0.5)*H, vz ];
  };
  for (const t of tris) {
    const A = project(t.a), B = project(t.b), C = project(t.c);
    if (!A || !B || !C) continue;
    const minX = Math.max(0, Math.floor(Math.min(A[0],B[0],C[0])));
    const maxX = Math.min(W-1, Math.ceil(Math.max(A[0],B[0],C[0])));
    const minY = Math.max(0, Math.floor(Math.min(A[1],B[1],C[1])));
    const maxY = Math.min(H-1, Math.ceil(Math.max(A[1],B[1],C[1])));
    const den = (B[1]-C[1])*(A[0]-C[0]) + (C[0]-B[0])*(A[1]-C[1]);
    if (Math.abs(den) < 1e-9) continue;
    const diffFlat = Math.max(0, dot(t.n, key));
    const ambFlat = 0.28 + 0.18 * Math.max(0, dot(t.n, fill));
    const specFlat = Math.pow(Math.max(0, dot(t.n, view)), 8 + (1-t.rough)*32) * (1 - t.rough) * 0.16;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const l1 = ((B[1]-C[1])*(x-C[0]) + (C[0]-B[0])*(y-C[1])) / den;
      const l2 = ((C[1]-A[1])*(x-C[0]) + (A[0]-C[0])*(y-C[1])) / den;
      const l3 = 1 - l1 - l2;
      if (l1 < -0.001 || l2 < -0.001 || l3 < -0.001) continue;
      const z = A[2]*l1 + B[2]*l2 + C[2]*l3;
      const idx = y*W+x;
      if (z >= zb[idx]) continue;
      zb[idx] = z;
      const na = t.na || t.n, nb = t.nb || t.n, nc = t.nc || t.n;
      let nx = na[0]*l1 + nb[0]*l2 + nc[0]*l3;
      let ny = na[1]*l1 + nb[1]*l2 + nc[1]*l3;
      let nz = na[2]*l1 + nb[2]*l2 + nc[2]*l3;
      const nl = Math.hypot(nx,ny,nz) || 1; nx/=nl; ny/=nl; nz/=nl;
      const diff = Math.max(0, nx*key[0] + ny*key[1] + nz*key[2]);
      const amb = 0.28 + 0.18 * Math.max(0, nx*fill[0] + ny*fill[1] + nz*fill[2]);
      const spec = Math.pow(Math.max(0, nx*view[0] + ny*view[1] + nz*view[2]), 8 + (1-t.rough)*32) * (1 - t.rough) * 0.16;
      const i = idx*4;
      for (let k = 0; k < 3; k++) {
        const v = Math.min(1, t.color[k] * (amb + diff * 0.95));
        const sp = spec * (0.25 + t.metal * 0.15);
        const lit = Math.max(0, (v + sp) * (opts.exposure || 1.6));
        buf[i+k] = Math.max(0, Math.min(255, Math.round((lit / (0.72 + lit)) * 255)));
      }
      buf[i+3] = 255;
    }
  }
  return buf;
}

export function renderDoc(doc, opts = {}) {
  const W = Number(opts.width || 1200), H = Number(opts.height || 900);
  const hero = opts.mode === 'hero';
  const ssaa = Math.max(1, Math.min(2, Number(opts.ssaa ?? (hero ? 2 : 1))));
  const IW = W * ssaa, IH = H * ssaa;
  const tris = buildTriangles(doc);
  if (!tris.length) throw new Error('no geometry to render');
  let min = [Infinity,Infinity,Infinity], max = [-Infinity,-Infinity,-Infinity];
  for (const t of tris) for (const p of [t.a,t.b,t.c]) for (let k=0;k<3;k++) { min[k]=Math.min(min[k],p[k]); max[k]=Math.max(max[k],p[k]); }
  const center = [(min[0]+max[0])/2, (min[1]+max[1])/2, (min[2]+max[2])/2];
  const size = [max[0]-min[0], max[1]-min[1], max[2]-min[2]];
  const maxDim = Math.max(...size, 0.5);
  const dist = maxDim * (Number(opts.fit) || (hero ? 1.35 : 1.75));
  const frontSign = Array.isArray(doc.meta?.front) && doc.meta.front[2] < 0 ? -1 : 1;
  const allViews = [
    { key: 'front', eye: [center[0], center[1] + dist*0.12, center[2] + frontSign*dist] },
    { key: 'front34', eye: [center[0] + dist*0.68, center[1] + dist*0.22, center[2] + frontSign*dist*0.78] },
    { key: 'side', eye: [center[0] + dist, center[1] + dist*0.08, center[2]] },
    { key: 'top', eye: [center[0], center[1] + dist, center[2] + 0.001] },
  ];
  if (hero) {
    const y = min[1] - 0.02;
    const R = maxDim * 8;
    const g = { color: [0.23, 0.185, 0.14], metal: 0, rough: 1, n: [0,1,0] };
    tris.push({ ...g, a: [center[0]-R, y, center[2]-R], b: [center[0]+R, y, center[2]-R], c: [center[0]+R, y, center[2]+R] });
    tris.push({ ...g, a: [center[0]-R, y, center[2]-R], b: [center[0]+R, y, center[2]+R], c: [center[0]-R, y, center[2]+R] });
    // soft contact patch: a fan slightly above the ground
    const shadow = { color: [0.16, 0.13, 0.10], metal: 0, rough: 1, n: [0,1,0] };
    const sy = y + 0.002, rad = maxDim * 0.33, seg = 24;
    for (let i = 0; i < seg; i++) {
      const a0 = Math.PI * 2 * i / seg, a1 = Math.PI * 2 * (i + 1) / seg;
      tris.push({ ...shadow, a: [center[0], sy, center[2]], b: [center[0]+Math.cos(a0)*rad, sy, center[2]+Math.sin(a0)*rad], c: [center[0]+Math.cos(a1)*rad, sy, center[2]+Math.sin(a1)*rad] });
    }
  }
  const views = hero ? [allViews[1]] : allViews;
  const vw = hero ? IW : IW/2, vh = hero ? IH : IH/2;
  const big = Buffer.alloc(IW*IH*4);
  const bgTop = hero ? [26, 38, 55] : [16,22,31], bgBottom = hero ? [126, 92, 62] : [44,54,68];
  for (let i = 0; i < views.length; i++) {
    const buf = renderView(tris, opts, views[i].eye, center, vw, vh, bgTop, bgBottom);
    const ox = hero ? 0 : (i % 2) * vw, oy = hero ? 0 : Math.floor(i / 2) * vh;
    for (let y = 0; y < vh; y++) buf.copy(big, ((oy + y) * IW + ox) * 4, y * vw * 4, (y + 1) * vw * 4);
  }
  // subtle vignette on the supersampled buffer
  for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
    const dx = (x / IW - .5) * 2, dy = (y / IH - .5) * 2;
    const f = 1 - Math.min(0.28, (dx*dx + dy*dy) * 0.08);
    const i = (y*IW+x)*4;
    big[i] = Math.round(big[i] * f); big[i+1] = Math.round(big[i+1] * f); big[i+2] = Math.round(big[i+2] * f);
  }
  let out = big;
  if (ssaa > 1) {
    out = Buffer.alloc(W*H*4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let r=0,g=0,b=0;
      for (let sy=0; sy<ssaa; sy++) for (let sx=0; sx<ssaa; sx++) {
        const i = (((y*ssaa+sy)*IW + (x*ssaa+sx))*4);
        r+=big[i]; g+=big[i+1]; b+=big[i+2];
      }
      const n=ssaa*ssaa, i=(y*W+x)*4;
      out[i]=Math.round(r/n); out[i+1]=Math.round(g/n); out[i+2]=Math.round(b/n); out[i+3]=255;
    }
  }
  const file = opts.path || 'modeler-render.png';
  const bytes = writePng(file, W, H, out);
  return { path: file, bytes, triangles: tris.length, views: views.map((v) => v.key), mode: hero ? 'hero' : 'contact', ssaa };
}
