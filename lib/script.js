import {normalizeCurve} from './curves.js';
import {installPartClasses} from './part-classes.js';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import { buildRecipe, evaluateObject, isContextRecipe } from './kernel.js';
import {
  box, sphere, lathe, torus, torusArc, extrude, loftRings, carRing, spherePatch, material,
} from './generate.js';
import { surfaceNets, smin, ssub, sphere as sdSphere, box as sdBox, ellipsoid as sdEllipsoid, capsule as sdCapsule } from './sdf.js';

const clone = (v) => JSON.parse(JSON.stringify(v));
function tri(out, a, b, c) { out.push(a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2]); }


function orientRing(tris) {
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


// Sweep a rectangular section along a closed 2D path in the (z, y) plane and
// extrude it across x. Unlike a "ring" built from two outlines, every face here
// has a determined outward side, so the shell is watertight and oriented.
function bandSweep(path2d, width, thick) {
  const n = path2d.length;
  const out = [];
  let cx = 0, cy = 0;
  for (const q of path2d) { cx += q[0]; cy += q[1]; }
  cx /= n; cy /= n;
  const hw = width / 2, ht = thick / 2;
  const rings = [];
  for (let i = 0; i < n; i++) {
    const prev = path2d[(i - 1 + n) % n], next = path2d[(i + 1) % n];
    const tx = next[0] - prev[0], ty = next[1] - prev[1];
    const tl = Math.hypot(tx, ty) || 1;
    let nx = -ty / tl, ny = tx / tl;
    const ox = path2d[i][0] - cx, oy = path2d[i][1] - cy;
    if (nx * ox + ny * oy < 0) { nx = -nx; ny = -ny; }
    const px = path2d[i][0], py = path2d[i][1];
    rings.push([
      [px + nx * ht, py + ny * ht, hw],
      [px + nx * ht, py + ny * ht, -hw],
      [px - nx * ht, py - ny * ht, -hw],
      [px - nx * ht, py - ny * ht, hw],
    ]);
  }
  for (let i = 0; i < n; i++) {
    const a = rings[i], b = rings[(i + 1) % n];
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      tri(out, a[k], b[k], b[k2]);
      tri(out, a[k], b[k2], a[k2]);
    }
  }
  return orientRing(out);
}

function ringGeometry(outer, inner, depth) {
  const out = [];
  const z0 = -depth / 2, z1 = depth / 2;
  const n = Math.min(outer.length, inner.length);
  const P = (p, z) => [Number(p[0]), Number(p[1]), z];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const o0 = P(outer[i], z0), o1 = P(outer[j], z0), o2 = P(outer[j], z1), o3 = P(outer[i], z1);
    const i0 = P(inner[i], z0), i1 = P(inner[j], z0), i2 = P(inner[j], z1), i3 = P(inner[i], z1);
    // outer wall
    tri(out, o0, o1, o2); tri(out, o0, o2, o3);
    // inner wall (reverse)
    tri(out, i1, i0, i3); tri(out, i1, i3, i2);
    // top face (z1)
    tri(out, o3, o2, i2); tri(out, o3, i2, i3);
    // bottom face (z0)
    tri(out, o0, i0, i1); tri(out, o0, i1, o1);
  }
  return orientRing(out);
}

function tubeGeometry(points, radius, segments = 16, opts = {}) {
  const out = [];
  const pts = points.map((p) => [Number(p[0]), Number(p[1]), Number(p[2])]);
  if (pts.length < 2) return out;
  // one ring per point, shared by both neighbouring segments, so the tube is a
  // single closed surface instead of a chain of open cylinders
  const frameFor = (i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = Math.hypot(...d) || 1;
    const dir = d.map((v) => v / l);
    const up = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const right = [up[1] * dir[2] - up[2] * dir[1], up[2] * dir[0] - up[0] * dir[2], up[0] * dir[1] - up[1] * dir[0]];
    const rl = Math.hypot(...right) || 1;
    const R = right.map((v) => v / rl);
    const U = [dir[1] * R[2] - dir[2] * R[1], dir[2] * R[0] - dir[0] * R[2], dir[0] * R[1] - dir[1] * R[0]];
    return { R, U };
  };
  const rings = pts.map((c, i) => {
    const { R, U } = frameFor(i);
    const row = [];
    for (let k = 0; k < segments; k++) {
      const ang = Math.PI * 2 * k / segments;
      row.push([
        c[0] + (R[0] * Math.cos(ang) + U[0] * Math.sin(ang)) * radius,
        c[1] + (R[1] * Math.cos(ang) + U[1] * Math.sin(ang)) * radius,
        c[2] + (R[2] * Math.cos(ang) + U[2] * Math.sin(ang)) * radius,
      ]);
    }
    return row;
  });
  for (let i = 0; i + 1 < rings.length; i++) {
    const ra = rings[i], rb = rings[i + 1];
    for (let k = 0; k < segments; k++) {
      const k2 = (k + 1) % segments;
      tri(out, ra[k], ra[k2], rb[k]);
      tri(out, ra[k2], rb[k2], rb[k]);
    }
  }
  // caps: a fan from the ring centre closes each end
  const cap = (ring, centre, flip) => {
    for (let k = 0; k < segments; k++) {
      const k2 = (k + 1) % segments;
      if (flip) tri(out, centre, ring[k2], ring[k]);
      else tri(out, centre, ring[k], ring[k2]);
    }
  };
  if (opts.caps !== false) {
    cap(rings[0], pts[0], true);
    cap(rings[rings.length - 1], pts[pts.length - 1], false);
  }
  return out;
}

function chamferBox(w, h, d, c = 0.03) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  c = Math.max(0.001, Math.min(c, hw * 0.45, hh * 0.45, hd * 0.45));
  const out = [];
  // every corner becomes three points, one per adjoining face; the solid is
  // closed by 6 faces + 12 edge bevels + 8 corner triangles. The old version
  // emitted no corner triangles at all, so the box had eight holes.
  const P = (s, off) => {
    const p = [s[0] * hw, s[1] * hh, s[2] * hd];
    if (off === 0) { p[1] = s[1] * (hh - c); p[2] = s[2] * (hd - c); }
    else if (off === 1) { p[0] = s[0] * (hw - c); p[2] = s[2] * (hd - c); }
    else { p[0] = s[0] * (hw - c); p[1] = s[1] * (hh - c); }
    return p;
  };
  const corpus = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) corpus.push([sx, sy, sz]);
  const corner = (sx, sy, sz) => corpus.find((s) => s[0] === sx && s[1] === sy && s[2] === sz);
  // convex body around the origin: orient every triangle outwards
  const face = (a, b, cc) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = cc[0] - a[0], vy = cc[1] - a[1], vz = cc[2] - a[2];
    const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const m = [(a[0] + b[0] + cc[0]) / 3, (a[1] + b[1] + cc[1]) / 3, (a[2] + b[2] + cc[2]) / 3];
    if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) tri(out, a, cc, b);
    else tri(out, a, b, cc);
  };
  const quad = (a, b, cc, dd) => { face(a, b, cc); face(a, cc, dd); };
  // 6 inset faces
  for (const s of [-1, 1]) {
    quad(P(corner(s, -1, -1), 0), P(corner(s, -1, 1), 0), P(corner(s, 1, 1), 0), P(corner(s, 1, -1), 0));
    quad(P(corner(-1, s, -1), 1), P(corner(1, s, -1), 1), P(corner(1, s, 1), 1), P(corner(-1, s, 1), 1));
    quad(P(corner(-1, -1, s), 2), P(corner(1, -1, s), 2), P(corner(1, 1, s), 2), P(corner(-1, 1, s), 2));
  }
  // 12 edge bevels
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    quad(P(corner(1, sy, sz), 1), P(corner(-1, sy, sz), 1), P(corner(-1, sy, sz), 2), P(corner(1, sy, sz), 2));
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    quad(P(corner(sx, 1, sz), 0), P(corner(sx, -1, sz), 0), P(corner(sx, -1, sz), 2), P(corner(sx, 1, sz), 2));
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    quad(P(corner(sx, sy, 1), 0), P(corner(sx, sy, -1), 0), P(corner(sx, sy, -1), 1), P(corner(sx, sy, 1), 1));
  }
  // 8 corner triangles
  for (const s of corpus) face(P(s, 0), P(s, 1), P(s, 2));
  return out;
}

function positionsFingerprint(values){const data=new Float64Array(values);return createHash('sha256').update(new Uint8Array(data.buffer)).digest('hex');}
function editableRecipe(p){if(p.recipe&&p.recipeFingerprint!==undefined&&positionsFingerprint(p.positions)!==p.recipeFingerprint){p.originRecipe=clone(p.recipe);delete p.recipe;}return p.recipe;}
function partInput(p) {
  return { id:p.semanticKey || p.name, name:p.name, position:p.position, rotation:p.rotation, scale:p.scale,
    recipe:editableRecipe(p), topology:p.topology, geometryData:{positions:p.positions},
    modifiers:p.modifiers, material:p.material, shading:p.shading,
    ...(p.parts ? {parts:p.parts.map(partInput)} : {}),
    ...(p.module ? {module:clone(p.module)} : {}),
    ...(p.materialOverride ? {materialOverride:p.materialOverride} : {}) };
}
function bakePart(p, name) {
  const out = evaluateObject(partInput(p), {world:true}).positions;
  const baked = new Part(out, name || p.name);
  baked.material = clone(p.material);
  baked.modifiers = [];
  baked.shading = p.shading;
  return baked;
}

function rotatePointXYZ(p, r) {
  let [x, y, z] = p;
  let c = Math.cos(r[2]), s2 = Math.sin(r[2]);
  [x, y] = [x * c - y * s2, x * s2 + y * c];
  c = Math.cos(r[1]); s2 = Math.sin(r[1]);
  [x, z] = [x * c + z * s2, -x * s2 + z * c];
  c = Math.cos(r[0]); s2 = Math.sin(r[0]);
  [y, z] = [y * c - z * s2, y * s2 + z * c];
  return [x, y, z];
}

function boxPositions(w, h, d) {
  return box(w, h, d);
}

class Part {
  constructor(positions, name, {deferred=false} = {}) {
    // Empty geometry used to travel silently and only surface as "no objects were
    // generated", hiding the real cause: an argument in the wrong position, e.g.
    // m.sphere(rx, ry, rz, name) puts the name where the segment count belongs.
    if (!Array.isArray(positions) || (!positions.length && !deferred)) {
      throw new Error('部件「' + (name || 'Part') + '」生成了 0 个顶点：检查参数类型与顺序（数值位置是否传入了字符串？）');
    }
    for (let i = 0; i < positions.length; i += 3) {
      if (!Number.isFinite(positions[i]) || !Number.isFinite(positions[i + 1]) || !Number.isFinite(positions[i + 2])) {
        throw new Error('部件「' + (name || 'Part') + '」含非有限坐标（第 ' + (i / 3) + ' 个顶点）');
      }
    }
    this.positions = positions;
    if(deferred)this.deferred=true;
    this.name = name || 'Part';
    this.position = [0, 0, 0];
    this.rotation = [0, 0, 0];
    this.scale = [1, 1, 1];
    this.material = material('#c0c7d4', 0.1, 0.5);
    this.modifiers = [];
    this.shading = 'smooth';
  }
  at(x, y, z) { this.position = [Number(x) || 0, Number(y) || 0, Number(z) || 0]; return this; }
  rot(x, y, z) { this.rotation = [Number(x) || 0, Number(y) || 0, Number(z) || 0]; return this; }
  scaleTo(x, y = x, z = x) {
    const sc = [Number(x), Number(y), Number(z)];
    // a negative or zero scale would be clamped to a sliver by the doc validator,
    // silently deleting the part; rejecting it names the right tool instead
    if (sc.some((n) => !Number.isFinite(n) || n <= 0)) {
      throw new Error('scaleTo 需要非零数值；镜像请用 m.mirror(part)，不要用负缩放');
    }
    this.scale = sc;
    return this;
  }
  mat(m) { this.material = m && typeof m === 'object' ? clone(m) : material(String(m || '#c0c7d4')); if(this.recipe?.type==='mirrorOf')this.recipe.params.followMaterial=false; return this; }
  mods(list) { this.modifiers = Array.isArray(list) ? clone(list) : this.modifiers; return this; }
  shade(mode) { this.shading = mode === 'flat' ? 'flat' : 'smooth'; if(this.recipe?.type==='mirrorOf')this.recipe.params.followShading=false; return this; }
  roles(spec) { if(!spec||typeof spec!=='object'||Array.isArray(spec))throw new Error('roles needs a JSON role declaration');this.directionRoles=clone(spec);return this; }
  nameAs(name) { this.name = String(name); return this; }
  key(id) {
    if (typeof id !== 'string' || !id.trim()) throw new Error('key 需要非空语义标识');
    this.semanticKey = id.trim(); return this;
  }
  clone() {
    const p = new Part(this.positions.slice(), this.name, {deferred:this.deferred===true});
    p.position = [...this.position];
    p.rotation = [...this.rotation];
    p.scale = [...this.scale];
    p.material = clone(this.material);
    p.modifiers = clone(this.modifiers);
    p.shading = this.shading;
    if (editableRecipe(this)) p.recipe = clone(this.recipe);
    if (this.recipeFingerprint!==undefined) p.recipeFingerprint=this.recipeFingerprint;
    if (this.originRecipe) p.originRecipe=clone(this.originRecipe);
    if (this.intent) p.intent = clone(this.intent);
    if (this.directionRoles) p.directionRoles=clone(this.directionRoles);
    if (this.module) p.module=clone(this.module);
    if (this.visible!==undefined) p.visible=this.visible;
    if (this.topology) p.topology = clone(this.topology);
    if (this.semanticKey) p.semanticKey = this.semanticKey;
    if (this.parts) p.parts = this.parts.map(q => q.clone());
    if (this.materialOverride) p.materialOverride = clone(this.materialOverride);
    return p;
  }
}

function toObject(part, id, idFor) {
  if (!part || !Array.isArray(part.positions) || (part.positions.length < 9 && !part.deferred)) return null;
  const obj = {
    id, semanticId: id, name: part.name, kind: 'custom',
    position: clone(part.position), rotation: clone(part.rotation), scale: clone(part.scale),
    params: {}, modifiers: clone(part.modifiers), shading: part.shading,
    geometryData: { positions: part.positions }, material: clone(part.material),
  };
  if(part.deferred)delete obj.geometryData;
  if (editableRecipe(part)) obj.recipe = clone(part.recipe);
  if (part.originRecipe) obj.originRecipe=clone(part.originRecipe);
  if (part.intent) obj.intent = clone(part.intent);
  if (part.directionRoles) obj.directionRoles=clone(part.directionRoles);
  if (part.module) obj.module=clone(part.module);
  if (part.visible!==undefined) obj.visible=part.visible;
  if (part.topology) obj.topology = clone(part.topology);
  if (part.materialOverride) obj.materialOverride = clone(part.materialOverride);
  if (part.parts) obj.parts = part.parts.map(p => toObject(p, idFor(p, id), idFor)).filter(Boolean);
  return obj;
}

function scene(title, parts, meta = {}) {
  const used = new Set(), counts = new Map();
  const idFor = (p, parent = '') => {
    const slug = String(p.name || 'part').normalize('NFKC').replace(/[^\p{L}\p{N}_.:-]+/gu, '-').replace(/^-+|-+$/g, '') || 'part';
    const stem = parent ? parent + '/' + slug : slug;
    const n = (counts.get(stem) || 0) + 1; counts.set(stem, n);
    const id = p.semanticKey || (n === 1 ? stem : stem + ':' + n);
    if (used.has(id)) throw new Error('重复语义标识：' + id + '；重复件请分别 .key(...)');
    used.add(id); return id;
  };
  const doc = {
    version: 1, nextId: 1,
    meta: { title: title || 'Scripted Model', template: 'script', autoFrame: true,
      editableSchema: 2, ...(meta && typeof meta === 'object' ? meta : {}) }, objects: [],
  };
  for (const p of Array.isArray(parts) ? parts.flat(4) : []) {
    const o = toObject(p, idFor(p), idFor);
    if (o) doc.objects.push(o);
  }
  doc.nextId = used.size + 1;
  return doc;
}

const PRESETS = {
  paint: (color = '#b31724') => material(color, 0.55, 0.16, { clearcoat: true }),
  metal: (color = '#aab3c0') => material(color, 0.95, 0.22),
  chrome: () => material('#d7dee8', 1, 0.08),
  gold: () => material('#c89b48', 1, 0.16),
  carbon: () => material('#08090b', 0.35, 0.35),
  rubber: () => material('#07080a', 0, 0.95),
  glass: () => material('#07131d', 0.5, 0.05, { opacity: 0.55, transparent: true, doubleSided: true }),
  leather: () => material('#241d1a', 0.05, 0.8),
  bone: () => material('#d8c8b2', 0.2, 0.42),
  ceramic: () => material('#e8e5df', 0.2, 0.25),
  matte: (color = '#101216') => material(color, 0.2, 0.55),
  emitter: (color = '#4de8ff', intensity = 5) => material(color, 0.3, 0.2, { emissive: color, emissiveIntensity: intensity }),
};

function makeApi() {
  const part = (positions, name) => new Part(positions, name);
  const mat = (color = '#c0c7d4', opts = {}) => material(
    color,
    Math.max(0, Math.min(1, Number(opts.metalness ?? 0.1))),
    Math.max(0, Math.min(1, Number(opts.roughness ?? 0.5))),
    {
      opacity: Math.max(0.02, Math.min(1, Number(opts.opacity ?? 1))),
      clearcoat: Boolean(opts.clearcoat),
      transparent: Number(opts.opacity ?? 1) < 1 || Boolean(opts.transparent),
      doubleSided: Boolean(opts.doubleSided),
      emissive: opts.emissive || '#000000',
      emissiveIntensity: Number(opts.emissiveIntensity ?? 0),
    },
  );
  const api = {
    Part, scene, mat,
    paint: PRESETS.paint, metal: PRESETS.metal, chrome: PRESETS.chrome, gold: PRESETS.gold,
    carbon: PRESETS.carbon, rubber: PRESETS.rubber, glass: PRESETS.glass, leather: PRESETS.leather,
    bone: PRESETS.bone, ceramic: PRESETS.ceramic, matte: PRESETS.matte, emitter: PRESETS.emitter,
    box: (w = 1, h = 1, d = 1, name = 'Box') => part(box(w, h, d), name),
    rbox: (w = 1, h = 1, d = 1, c = 0.03, name = 'RBox') => part(chamferBox(w, h, d, c), name),
    sphere: (rx = 0.5, ry = rx, rz = rx, segments = 40, rings = 24, name = 'Sphere') => part(sphere(rx, ry, rz, segments, rings), name),
    cylinder: (radiusTop = 0.5, radiusBottom = radiusTop, height = 1, segments = 40, name = 'Cylinder') => part(lathe([[radiusBottom, -height / 2], [radiusTop, height / 2]], segments, true), name),
    cone: (radius = 0.5, height = 1, segments = 40, name = 'Cone') => part(lathe([[radius, -height / 2], [0, height / 2]], segments, true), name),
    torus: (R = 0.6, r = 0.15, segments = 48, tube = 20, name = 'Torus') => part(torus(R, r, segments, tube), name),
    torusArc: (R, r, u0, u1, segments = 48, tube = 16, name = 'Arc') => part(torusArc(R, r, u0, u1, segments, tube), name),
    lathe: (profile, segments = 48, caps = true, name = 'Lathe') => part(lathe(profile, segments, caps), name),
    extrude: (polygon, depth = 0.1, name = 'Extrude') => part(extrude(polygon, depth), name),
    // m.plate(points, depth, plane): a prism whose profile lives in the named
    // plane and whose thickness runs along the remaining axis, centred on the
    // local origin. 'zy' means points are [z, y] and thickness runs along x.
    plate: (points, depth = 0.1, plane = 'xy', name = 'Plate') => {
      // extrude already centres the thickness on the local origin
      const centred = extrude(points, depth);
      const ax = String(plane).toLowerCase();
      const out = [];
      for (let i = 0; i + 2 < centred.length; i += 3) {
        const x = centred[i], y = centred[i + 1], z = centred[i + 2];
        if (ax === 'zy') out.push(-z, y, x);        // profile x -> world z
        else if (ax === 'xz') out.push(x, -z, y);   // profile y -> world z
        else out.push(x, y, z);                     // 'xy': profile x -> world x
      }
      return part(out, name);
    },
    loft: (sections, opts = {}, name = 'Loft') => {
      const rings = sections.map((s) => carRing(
        Number(s.w) || 0.5, Number(s.h) || 0.3, Number(s.y) || 0, Number(s.z) || 0,
        Number(opts.segments) || 32, Number(s.expX) || 0.66, Number(s.expY) || 0.78,
      ));
      return part(loftRings(rings, true, opts.caps !== false), name);
    },
    // A closed, tapered body from rectangular sections: the primitive a vehicle
    // hull or turret actually needs. m.loft exists but defaults to a smooth car
    // body; here the shape is faceted and `y` is the section's bottom, because
    // that is how a hull is described.
    hull: (sections, opts = {}, name = 'Hull') => {
      const seg = Math.max(6, Math.round(Number(opts.segments) || 20));
      const expX = Number(opts.expX ?? 0.08);
      const expY = Number(opts.expY ?? 0.08);
      const list = (sections || []).map((s) => ({
        w: Math.max(0.02, Number(s.w) || 0.5),
        h: Math.max(0.02, Number(s.h) || 0.5),
        z: Number(s.z) || 0,
        y: Number(s.y) || 0,
        expX: Number(s.expX ?? expX),
        expY: Number(s.expY ?? expY),
      })).sort((a, b) => a.z - b.z);
      if (list.length < 2) throw new Error('m.hull 需要至少两个截面');
      // carRing takes the section's bottom and a HALF width; sections are written
      // as full width and full height, which is how a vehicle is measured
      const rings = list.map((s) => carRing(s.w / 2, s.h, s.y, s.z, seg, s.expX, s.expY));
      const built = part(loftRings(rings, true, opts.caps !== false), name);
      return built.shade(opts.shade === 'smooth' ? 'smooth' : 'flat');
    },
    patch: (rx, ry, rz, u0, u1, v0, v1, segments = 28, rings = 16, name = 'Patch') => part(spherePatch(rx, ry, rz, u0, u1, v0, v1, segments, rings), name),
    // mirror-friendly pair: build(side) is called with -1 and +1
    pair: (build) => {
      const out = [];
      for (const s of [-1, 1]) {
        const r = build(s);
        if (Array.isArray(r)) out.push(...r.filter(Boolean));
        else if (r) out.push(r);
      }
      return out;
    },
    // repeat a finished part: step may be [dx,dy,dz] or a function(i) -> [dx,dy,dz]
    repeat: (p, count, step) => {
      const out = [];
      for (let i = 0; i < Number(count); i++) {
        const d = typeof step === 'function' ? step(i) : [step[0] * i, step[1] * i, step[2] * i];
        const c = p.clone();
        c.position = [p.position[0] + (d[0] || 0), p.position[1] + (d[1] || 0), p.position[2] + (d[2] || 0)];
        out.push(c);
      }
      return out;
    },
    // A frame with evenly spaced bars: the common shape behind engine decks,
    // vents and radiators. Emitted as one closed mesh of boxes, so perforated
    // panels stop requiring a boolean or a pile of hand-placed objects.
    grille: (w = 1, h = 0.6, t = 0.05, opts = {}, name = 'Grille') => {
      const W = Math.max(0.02, Number(w)), H = Math.max(0.02, Number(h)), T = Math.max(0.004, Number(t));
      const bars = Math.max(1, Math.round(Number(opts.bars ?? 6)));
      const frame = Math.min(W, H) * Number(opts.frame ?? 0.10);
      const barW = Math.max(0.004, Number(opts.bar ?? 0.012));
      const out = [];
      const put = (cx, cy, sx, sy) => {
        const box = boxPositions(sx, sy, T);
        for (let i = 0; i < box.length; i += 3) out.push(box[i] + cx, box[i + 1] + cy, box[i + 2]);
      };
      // frame: two vertical rails and two horizontal rails, inner edges closed
      put(-W / 2 + frame / 2, 0, frame, H);
      put(W / 2 - frame / 2, 0, frame, H);
      put(0, H / 2 - frame / 2, W - frame * 2, frame);
      put(0, -H / 2 + frame / 2, W - frame * 2, frame);
      // bars span the opening, evenly spaced, thin in the bar direction
      const inner = H - frame * 2;
      const span = W - frame * 2;
      for (let i = 0; i < bars; i++) {
        const y = -inner / 2 + ((i + 0.5) * inner) / bars;
        put(0, y, span, barW);
      }
      return part(out, name);
    },
    // A plate with rectangular openings: a genuine hole, not a recess with a
    // dark panel behind it. The rectangle is cut into a grid at every opening
    // edge and the solid cells are emitted as closed boxes, so the result needs
    // no boolean and always closes.
    panel: (w = 1, h = 1, t = 0.05, holes = [], opts = {}, name = 'Panel') => {
      if (typeof opts === 'string') { name = opts; opts = {}; }
      const W = Math.max(0.02, Number(w)), H = Math.max(0.02, Number(h)), T = Math.max(0.004, Number(t));
      const list = (Array.isArray(holes) ? holes : [holes])
        .map((o) => ({ x: Number(o.x) || 0, y: Number(o.y) || 0, w: Math.abs(Number(o.w) || 0), h: Math.abs(Number(o.h) || 0) }))
        .filter((o) => o.w > 1e-4 && o.h > 1e-4);
      const xs = new Set([-W / 2, W / 2]);
      const ys = new Set([-H / 2, H / 2]);
      for (const o of list) {
        for (const x of [o.x - o.w / 2, o.x + o.w / 2]) if (x > -W / 2 + 1e-6 && x < W / 2 - 1e-6) xs.add(x);
        for (const y of [o.y - o.h / 2, o.y + o.h / 2]) if (y > -H / 2 + 1e-6 && y < H / 2 - 1e-6) ys.add(y);
      }
      const gx = [...xs].sort((a, b) => a - b);
      const gy = [...ys].sort((a, b) => a - b);
      const out = [];
      const put = (cx, cy, sx, sy) => {
        const b = boxPositions(sx, sy, T);
        for (let i = 0; i < b.length; i += 3) out.push(b[i] + cx, b[i + 1] + cy, b[i + 2]);
      };
      for (let i = 0; i + 1 < gx.length; i++) {
        for (let j = 0; j + 1 < gy.length; j++) {
          const cx = (gx[i] + gx[i + 1]) / 2, cy = (gy[j] + gy[j + 1]) / 2;
          if (list.some((o) => Math.abs(cx - o.x) < o.w / 2 - 1e-9 && Math.abs(cy - o.y) < o.h / 2 - 1e-9)) continue;
          put(cx, cy, gx[i + 1] - gx[i], gy[j + 1] - gy[j]);
        }
      }
      // same plane convention as m.plate: the profile lives in the named plane
      const ax = String(opts.plane || 'xy').toLowerCase();
      if (ax === 'zy' || ax === 'xz') {
        for (let i = 0; i + 2 < out.length; i += 3) {
          const x = out[i], y = out[i + 1], z = out[i + 2];
          if (ax === 'zy') { out[i] = -z; out[i + 2] = x; }
          else { out[i + 1] = -z; out[i + 2] = y; }
        }
      }
      return part(out, name);
    },
    // A hollow box: real interior volume, so an opening above it reads as a
    // cavity instead of showing the top face of a solid block.
    shell: (w = 1, h = 1, d = 1, t = 0.05, opts = {}, name = 'Shell') => {
      const W = Math.max(0.02, Number(w)), H = Math.max(0.02, Number(h)), D = Math.max(0.02, Number(d));
      const T = Math.min(Math.max(0.004, Number(t)), Math.min(W, H, D) / 2.5);
      const skip = new Set((opts.open || []).map(String));
      const out = [];
      const put = (cx, cy, cz, sx, sy, sz) => {
        const b = boxPositions(sx, sy, sz);
        for (let i = 0; i < b.length; i += 3) out.push(b[i] + cx, b[i + 1] + cy, b[i + 2] + cz);
      };
      // walls reach the full extent on whichever side is open, so an open top
      // leaves a rim at the requested height instead of a step
      const yTop = skip.has('top') ? H / 2 : H / 2 - T;
      const yBot = skip.has('bottom') ? -H / 2 : -H / 2 + T;
      const zF = skip.has('front') ? D / 2 : D / 2 - T;
      const zB = skip.has('back') ? -D / 2 : -D / 2 + T;
      const xL = skip.has('left') ? -W / 2 : -W / 2 + T;
      const xR = skip.has('right') ? W / 2 : W / 2 - T;
      const wallH = yTop - yBot, wallD = zF - zB, wallW = xR - xL;
      if (!skip.has('top')) put(0, H / 2 - T / 2, 0, W, T, wallD);
      if (!skip.has('bottom')) put(0, -H / 2 + T / 2, 0, W, T, wallD);
      if (!skip.has('left')) put(-W / 2 + T / 2, (yTop + yBot) / 2, (zF + zB) / 2, T, wallH, wallD);
      if (!skip.has('right')) put(W / 2 - T / 2, (yTop + yBot) / 2, (zF + zB) / 2, T, wallH, wallD);
      if (!skip.has('front')) put((xL + xR) / 2, (yTop + yBot) / 2, D / 2 - T / 2, wallW, wallH, T);
      if (!skip.has('back')) put((xL + xR) / 2, (yTop + yBot) / 2, -D / 2 + T / 2, wallW, wallH, T);
      return part(out, name);
    },
    // Bake a part's transform into its vertices. Useful before any operation
    // that is only correct in world space, such as mirroring.
    bake: (p, name) => bakePart(p, name),
    // A true mirror: the geometry is baked, one axis negated, and every triangle
    // re-wound. A negative scale would flip the winding and leave the copy
    // inside-out, which is the trap this removes.
    mirror: (p, axis = 'x', pivot = 0) => {
      const baked = bakePart(p);
      const k = axis === 'y' ? 1 : axis === 'z' ? 2 : 0;
      const pos = baked.positions;
      for (let i = 0; i + 2 < pos.length; i += 3) {
        pos[i + k] = 2 * Number(pivot) - pos[i + k];
      }
      for (let i = 0; i + 8 < pos.length; i += 9) {
        for (let c = 0; c < 3; c++) {
          const t = pos[i + 3 + c];
          pos[i + 3 + c] = pos[i + 6 + c];
          pos[i + 6 + c] = t;
        }
      }
      return baked;
    },
    // Place a part against another part's world bounds instead of by hand:
    // { x: 'max' } puts it on the +x face, { y: 'min', offset: 0.02 } just above
    // the bottom. Guessing these coordinates is how windows end up inside a hull.
    align: (piece, target, spec = {}, name) => {
      const baked = bakePart(target);
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i + 2 < baked.positions.length; i += 3) {
        for (let k = 0; k < 3; k++) {
          const v = baked.positions[i + k];
          if (v < min[k]) min[k] = v;
          if (v > max[k]) max[k] = v;
        }
      }
      const axes = ['x', 'y', 'z'];
      for (let k = 0; k < 3; k++) {
        const want = spec[axes[k]];
        if (want === undefined) continue;
        const off = Number(spec[axes[k] + 'Offset'] ?? spec.offset ?? 0);
        if (want === 'min') piece.position[k] = min[k] + off;
        else if (want === 'max') piece.position[k] = max[k] + off;
        else if (want === 'centre' || want === 'center') piece.position[k] = (min[k] + max[k]) / 2 + off;
        else if (typeof want === 'number') piece.position[k] = want + off;
      }
      if (name) piece.name = name;
      return piece;
    },
    // Collapse many parts into one object. Repeated detail (bolts, links, slats)
    // is the usual reason a scene reaches hundreds of objects; merging keeps the
    // geometry identical while making the scene cheap to hold and edit. Parts
    // must share a material, because the merged object has exactly one.
    merge: (list, name = 'Merged', materialOverride) => {
      const items = (Array.isArray(list) ? list : [list]).filter(Boolean);
      if (!items.length) throw new Error('m.merge 需要至少一个零件');
      const hasDeferred=p=>p.deferred||(p.parts??[]).some(hasDeferred);
      if(items.some(hasDeferred)){
        const merged=new Part([],name,{deferred:true});merged.parts=items.map(p=>p.clone());merged.material=clone(items[0].material);merged.shading=items[0].shading;
        if(materialOverride){merged.material=typeof materialOverride==='object'?clone(materialOverride):material(String(materialOverride));merged.materialOverride=clone(merged.material);}return merged;
      }
      const out = [];
      let tris = 0;
      for (const item of items) {
        const baked = bakePart(item);           // bake so transforms survive the merge
        for (let i = 0; i + 2 < baked.positions.length; i += 3) {
          out.push(baked.positions[i], baked.positions[i + 1], baked.positions[i + 2]);
        }
        tris += Math.floor(baked.positions.length / 9);
      }
      const merged = part(out, name);
      merged.material = materialOverride
        ? (typeof materialOverride === 'object' ? JSON.parse(JSON.stringify(materialOverride)) : material(String(materialOverride)))
        : JSON.parse(JSON.stringify(items[0].material));
      merged.shading = items[0].shading;
      merged.parts = items.map(p => p.clone());
      if (materialOverride) merged.materialOverride = clone(merged.material);
      merged.mergedFrom = items.length;
      merged.mergedTriangles = tris;
      return merged;
    },
    // Split a part by a plane and give each half its own material: two-tone
    // finishes and worn lower panels without a texture or a second authoring pass.
    // Split a part by a plane and give each half its own material. The triangles
    // are actually clipped, not just assigned by centroid: a hull side is a few
    // large faces, so assigning whole triangles would give a ragged edge.
    splitAt: (piece, axis, value, opts = {}) => {
      const k = axis === 'y' ? 1 : axis === 'z' ? 2 : 0;
      const cut = Number(value);
      const baked = bakePart(piece);
      const low = [], high = [];
      const P = baked.positions;
      for (let i = 0; i + 8 < P.length; i += 9) {
        const tri = [[P[i], P[i + 1], P[i + 2]], [P[i + 3], P[i + 4], P[i + 5]], [P[i + 6], P[i + 7], P[i + 8]]];
        const side = tri.map((q) => q[k] - cut);
        // clipping a triangle at a plane can leave slivers with zero area; they
        // cost triangles, break the closedness audit and render as seams
        const push = (dst, poly) => {
          const area = (p0, p1, p2) => {
            const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
            const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
            const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
            return Math.hypot(cx, cy, cz) * 0.5;
          };
          for (let j = 1; j + 1 < poly.length; j++) {
            if (area(poly[0], poly[j], poly[j + 1]) < 1e-10) continue;
            dst.push(
              poly[0][0], poly[0][1], poly[0][2],
              poly[j][0], poly[j][1], poly[j][2],
              poly[j + 1][0], poly[j + 1][1], poly[j + 1][2]);
          }
        };
        if (side.every((v) => v <= 0)) { push(low, tri); continue; }
        if (side.every((v) => v >= 0)) { push(high, tri); continue; }
        // clip the triangle by the plane into two convex polygons
        const clipHalf = (keepBelow) => {
          const out = [];
          for (let a = 0; a < 3; a++) {
            const b = (a + 1) % 3;
            const va = side[a], vb = side[b];
            const ina = keepBelow ? va <= 0 : va >= 0;
            const inb = keepBelow ? vb <= 0 : vb >= 0;
            if (ina) out.push(tri[a]);
            if (ina !== inb) {
              const t = va / (va - vb);
              out.push([tri[a][0] + (tri[b][0] - tri[a][0]) * t,
                tri[a][1] + (tri[b][1] - tri[a][1]) * t,
                tri[a][2] + (tri[b][2] - tri[a][2]) * t]);
            }
          }
          return out;
        };
        push(low, clipHalf(true));
        push(high, clipHalf(false));
      }
      // A plane outside the part legitimately leaves one half empty; that is a
      // no-op cut, not a modelling error, so only both-empty is rejected.
      if (!low.length && !high.length) throw new Error('splitAt: 切面完全在部件之外，两侧都没有几何');
      const a = low.length ? part(low, opts.nameLow || piece.name + ' lower') : null;
      const b = high.length ? part(high, opts.nameHigh || piece.name + ' upper') : null;
      const mat = (v, fallback) => (v ? (typeof v === 'string' ? material(v) : JSON.parse(JSON.stringify(v))) : JSON.parse(JSON.stringify(fallback)));
      if (a) { a.material = mat(opts.matLow, piece.material); a.shading = piece.shading; a.intent = { surface: 'paint-region', closedRequired: false }; }
      if (b) { b.material = mat(opts.matHigh, piece.material); b.shading = piece.shading; b.intent = { surface: 'paint-region', closedRequired: false }; }
      return [a, b].filter(Boolean);
    },
    // A 2D or 3D array of one part: ERA blocks, vents, ribs, rivet grids.
    // m.repeat walks a line; a grid is what armour and louvres actually need.
    grid: (piece, spec = {}) => {
      const nx = Math.max(1, Math.round(Number(spec.nx ?? 1)));
      const ny = Math.max(1, Math.round(Number(spec.ny ?? 1)));
      const nz = Math.max(1, Math.round(Number(spec.nz ?? 1)));
      const step = spec.step || [0.1, 0, 0];
      const out = [];
      for (let ix = 0; ix < nx; ix++) {
        for (let iy = 0; iy < ny; iy++) {
          for (let iz = 0; iz < nz; iz++) {
            const c = piece.clone();
            const f = (i, n) => (spec.centred === false ? i : i - (n - 1) / 2);
            c.position = [
              piece.position[0] + f(ix, nx) * Number(step[0] || 0) + (spec.offset ? Number(spec.offset[0] || 0) : 0),
              piece.position[1] + f(iy, ny) * Number(step[1] || 0) + (spec.offset ? Number(spec.offset[1] || 0) : 0),
              piece.position[2] + f(iz, nz) * Number(step[2] || 0) + (spec.offset ? Number(spec.offset[2] || 0) : 0),
            ];
            c.rotation = [...piece.rotation];
            c.scale = [...piece.scale];
            out.push(c);
          }
        }
      }
      return out;
    },
    mesh: (positions, name = 'Mesh') => part(positions, name),
    ring: (outer, inner, depth = 0.2, name = 'Ring') => {
      // radii or point lists, because a numeric call used to produce nothing
      const circle = (r, n = 40) => {
        const pts = [];
        for (let i = 0; i < n; i++) {
          const a = (Math.PI * 2 * i) / n;
          pts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
        return pts;
      };
      const o = Array.isArray(outer) ? outer : circle(Number(outer));
      const inn = Array.isArray(inner) ? inner : circle(Number(inner), o.length);
      return part(ringGeometry(o, inn, depth), name);
    },
    band: (path, width = 0.6, thick = 0.1, name = 'Band') => part(bandSweep(path, width, thick), name),
    tube: (points, radius = 0.03, segments = 14, name = 'Tube') => part(tubeGeometry(points, radius, segments), name),
    sdf: (fn, min, max, nx = 72, ny = 72, nz = 72, name = 'SDF') => part(surfaceNets(fn, min, max, nx, ny, nz), name),
    sdfKit: { smin, ssub, sphere: sdSphere, box: sdBox, ellipsoid: sdEllipsoid, capsule: sdCapsule },
  };
  const recipeArgs = {
    box: (w=1,h=1,d=1) => ({w,h,d}),
    rbox: (w=1,h=1,d=1,c=.03) => ({w,h,d,c}),
    sphere: (rx=.5,ry=rx,rz=rx,segments=40,rings=24) => ({rx,ry,rz,segments,rings}),
    cylinder: (radiusTop=.5,radiusBottom=radiusTop,height=1,segments=40) => ({radiusTop,radiusBottom,height,segments}),
    cone: (radius=.5,height=1,segments=40) => ({radius,height,segments}),
    torus: (R=.6,r=.15,segments=48,tubeSegments=20) => ({R,r,segments,tubeSegments}),
    lathe: (profile,segments=48,caps=true) => ({profile,segments,caps}),
    extrude: (polygon,depth=.1) => ({polygon,depth}),
    hull: (sections,opts={}) => ({sections,...opts}),
    loft: (sections,opts={}) => ({sections,...opts}),
  };
  for (const [type, argsFor] of Object.entries(recipeArgs)) {
    const original = api[type];
    api[type] = (...args) => {
      const p = original(...args);
      p.recipe = {type, params:clone(argsFor(...args))};
      p.recipeFingerprint=positionsFingerprint(p.positions);
      return p;
    };
  }
  api.sectionLoft = (sections, opts={}, name='Section loft') => {
    const recipe = {type:'sectionLoft', params:clone({sections,...opts})};
    const mesh = buildRecipe(recipe);
    const positions=[]; for(const i of mesh.indices) positions.push(...mesh.vertices.slice(i*3,i*3+3));
    const p=part(positions,name);p.recipe=recipe;p.recipeFingerprint=positionsFingerprint(p.positions);p.shading=opts.shade||'smooth';return p;
  };
  const ref=target=>{
    if(typeof target==='string'&&target)return target;
    if(target instanceof Part&&target.semanticKey)return target.semanticKey;
    throw new Error('relation target must be an exact object ID or a Part with .key(...)');
  };
  const descriptor=source=>{
    if(source instanceof Part){const recipe=editableRecipe(source);if(!recipe||source.parts)throw new Error('relation source Part must have an editable leaf recipe');return clone(recipe);}
    if(!source||typeof source!=='object'||typeof source.type!=='string')throw new Error('relation source must be a recipe descriptor');return clone(source);
  };
  const deferred=(recipe,name)=>{const p=new Part([],name,{deferred:true});p.recipe=recipe;return p;};
  api.tyre=(params={},name='Tyre')=>{const recipe={type:'tyre',params:clone(params)},mesh=buildRecipe(recipe),positions=[];for(const id of mesh.indices)positions.push(...mesh.vertices.slice(id*3,id*3+3));const p=part(positions,name);p.recipe=recipe;p.recipeFingerprint=positionsFingerprint(positions);return p;};
  api.recipe=(recipe,name='Recipe')=>{recipe=descriptor(recipe);if(isContextRecipe(recipe))return deferred(recipe,name);const mesh=buildRecipe(recipe),positions=[];for(const id of mesh.indices)positions.push(...mesh.vertices.slice(id*3,id*3+3));const p=part(positions,name);p.recipe=recipe;p.recipeFingerprint=positionsFingerprint(positions);return p;};
  api.surfacePath=(target,points,opts={},name='Surface path')=>deferred({type:'surfacePath',params:{...clone(opts),target:ref(target),points:clone(points)}},name);
  api.surfaceAttach=(target,source,opts={},name='Surface attachment')=>{
    if(source instanceof Part&&[...source.position,...source.rotation,...source.scale.map(x=>x-1)].some(x=>x!==0))throw new Error('surfaceAttach source Part must have identity TRS; put dimensions in its recipe');
    return deferred({type:'surfaceAttach',params:{...clone(opts),target:ref(target),source:descriptor(source)}},name);
  };
  api.clearance=(source,cutters,opts={},name='Clearance')=>{
    const recipe={type:'clearance',params:{...clone(opts),source:descriptor(source),cutters:cutters.map(c=>({...clone(Object.fromEntries(Object.entries(c).filter(([key])=>key!=='target'))),...(c.target!==undefined?{target:ref(c.target)}:{})}))}};
    if(source instanceof Part){const p=source.clone();p.positions=[];p.deferred=true;p.recipe=recipe;delete p.recipeFingerprint;if(name!=='Clearance')p.name=name;return p;}
    return deferred(recipe,name);
  };
  // Path descriptors stay JSON. Closed paths use winding, never per-link angles.
  api.wrapPath=(points,opts={})=>({closed:true,planeNormal:[1,0,0],...clone(opts),type:'points',points:clone(points)});
  api.beltPath=(wheels,opts={})=>({closed:true,...clone(opts),type:'belt',wheels:wheels.map(ref)});
  api.pathArray=(source,path,opts={},name='Path array')=>{
    if(source instanceof Part&&([...source.position,...source.rotation,...source.scale.map(x=>x-1)].some(x=>x!==0)||(source.modifiers??[]).some(m=>m.enabled!==false)))throw new Error('pathArray source Part needs identity TRS and no active modifiers; put dimensions in its base recipe');
    const base=descriptor(source);if(isContextRecipe(base))throw new Error('pathArray source must be a base leaf recipe');
    const p=deferred({type:'pathRepeat',params:{...clone(opts),source:base,path:clone(path)}},name);
    if(source instanceof Part){p.material=clone(source.material);p.shading=source.shading;}
    p.directionRoles={type:'path',forwardAxis:opts.forwardAxis??'z',outwardAxis:opts.outwardAxis??'y',references:path.type==='belt'?path.wheels.map(target=>({target,expectedSide:'outside'})):[]};return p;
  };
  api.mirrorOf=(target,opts={},name='Mirror')=>deferred({type:'mirrorOf',params:{...clone(opts),target:ref(target)}},name);
  api.symmetry=api.mirrorOf;
  api.solid=(operation,a,b,opts={},name='Solid result')=>deferred({type:'meshBoolean',params:{...clone(opts),operation,targets:[ref(a),ref(b)]}},name);
  api.curve=(points,opts={})=>normalizeCurve({...clone(opts),type:opts.type||'catmullrom',points:clone(points)});
  api.sweep=(profile,curve,opts={},name='Curve sweep')=>api.recipe({type:'curveSweep',params:{...clone(opts),profile:clone(profile),curve:clone(curve)}},name);
  api.curveTube=(curve,opts={},name='Curve tube')=>api.recipe({type:'curveTube',params:{radius:.1,...clone(opts),curve:clone(curve)}},name);
  api.formRim=(target,cut,opts={},name='Opening rim')=>deferred({type:'formRim',params:{...clone(opts),target:ref(target),cut}},name);
  api.form=(params,name='Section form')=>api.recipe({type:'formBody',params:clone(params)},name);
  api.surface=(params={},name='Design surface')=>api.recipe({type:'controlSurface',params:clone(params)},name);
  api.surfaceRegion=(target,uvBounds,opts={},name='Surface region')=>deferred({type:'surfaceRegion',params:{...clone(opts),target:ref(target),uvBounds:clone(uvBounds)}},name);
  api.onSurface=(target,source,opts={},name='Surface detail')=>{if(source instanceof Part&&([...source.position,...source.rotation,...source.scale.map(x=>x-1)].some(x=>x!==0)||(source.modifiers||[]).some(m=>m.enabled!==false)))throw Error('onSurface source needs identity TRS and no active modifiers; dimensions belong to its recipe');const out=deferred({type:'surfacePin',params:{...clone(opts),target:ref(target),source:descriptor(source)}},name);if(source instanceof Part){out.material=clone(source.material);out.shading=source.shading;}return out;};
  api.clayBox=(w=1,h=1,d=1,opts={},name='Plastic body')=>api.recipe({type:'clayBox',params:{...clone(opts),w,h,d}},name);
  api.bevelBox=(w=1,h=1,d=1,radius=.08,segments=4,name='Segmented bevel')=>api.recipe({type:'bevelBox',params:{w,h,d,radius,bevelSegments:segments,resolution:1}},name);
  api.sculpt=(source,stroke)=>{if(!(source instanceof Part))throw new Error('sculpt needs a Part');return source.clone().mods([...(source.modifiers||[]),{...clone(stroke),type:'brush'}]);};
  installPartClasses(api,{Part,clone});
  return api;
}

export function runModelerScript(code,{params={}}={}) {
  if (typeof code !== 'string' || !code.trim()) throw new Error('脚本为空');
  if (code.length > 200_000) throw new Error('脚本过长');
  const api = makeApi();
  const context = vm.createContext({ m: api, params:clone(params) });
  const wrapped = `"use strict";\n(function(m){\n${code}\n})(m);`;
  const doc = vm.runInNewContext(wrapped, context, { timeout: 8000, displayErrors: true });
  if (!doc || doc.version !== 1 || !Array.isArray(doc.objects)) throw new Error('脚本必须 return m.scene(...)');
  if (doc.objects.length === 0) throw new Error('脚本没有生成任何对象');
  doc.meta = { ...(doc.meta || {}), script: code, ...(Object.keys(params).length?{generatorParams:clone(params)}:{}) };
  return doc;
}

export const SAMPLE_SCRIPT = `// 直接用 m API 建场景；每次 Run 都会更新同一份 Scene。
// 每个 part 都可链式：.at(x,y,z).rot(x,y,z).scaleTo(...).mat(...).mods([...]).shade('smooth')
const body = m.box(1.4, 0.35, 0.7).at(0, 0.7, 0).mat(m.paint('#c22a32'));
const glass = m.sphere(0.45, 0.22, 0.35, 48, 28).at(0, 0.92, -0.02).mat(m.glass());
return m.scene('Scripted Concept', [body, glass], { fit: 1.7 });`;

export { makeApi };
