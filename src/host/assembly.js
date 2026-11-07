import { evaluateObject, evaluateDoc } from './kernel.js';
import { identityMatrix, objectMatrix, multiplyMatrix, inverseMatrix, transformPoint, recipeDependencies } from './relations.js';
// Assembly audit: which parts are detached from everything else, and which are
// buried inside another part and therefore invisible.
//
// Both are silent quality killers: a floating bolt leaves a gap you cannot see
// from most angles, and a buried sub-part costs objects and triangles while
// contributing no pixels. Nothing else in the modeler reports them.

function rotateEuler(p, r) {
  // three.js Euler order 'XYZ' => R = Rx * Ry * Rz, Z applied first
  let [x, y, z] = p;
  let c = Math.cos(r[2]), s = Math.sin(r[2]);
  [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(r[1]); s = Math.sin(r[1]);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(r[0]); s = Math.sin(r[0]);
  [y, z] = [y * c - z * s, y * s + z * c];
  return [x, y, z];
}

const BUILTIN = {
  box: (s) => cuboid(s[0] ?? 1, s[1] ?? 1, s[2] ?? 1),
  sphere: (s) => spherePts(s[0] ?? 0.5, s[1] ?? s[0] ?? 0.5, s[2] ?? s[0] ?? 0.5),
  plane: (s) => [[-(s[0] ?? 1) / 2, 0, -(s[1] ?? 1) / 2], [(s[0] ?? 1) / 2, 0, (s[1] ?? 1) / 2]],
};
function cuboid(w, h, d) {
  const x = w / 2, y = h / 2, z = d / 2, out = [];
  for (const sx of [-x, x]) for (const sy of [-y, y]) for (const sz of [-z, z]) out.push([sx, sy, sz]);
  return out;
}
function spherePts(rx, ry, rz) {
  const out = [];
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 8; j++) {
    const u = (i / 6) * Math.PI, v = (j / 8) * Math.PI * 2;
    out.push([rx * Math.sin(u) * Math.cos(v), ry * Math.cos(u), rz * Math.sin(u) * Math.sin(v)]);
  }
  return out;
}

function localPoints(o) {
  const src = evaluateObject(o).positions;
  if (src && src.length) {
    const out = [];
    for (let i = 0; i + 2 < src.length; i += 3) out.push([src[i], src[i + 1], src[i + 2]]);
    return out;
  }
  const fn = BUILTIN[o.kind];
  if (fn) return fn(o.params ? Object.values(o.params) : []);
  return [];
}

export function worldBounds(doc) {
  return (doc.objects || []).map((o) => {
    const pts = localPoints(o);
    const pos = o.position || [0, 0, 0];
    const rot = o.rotation || [0, 0, 0];
    const sc = o.scale || [1, 1, 1];
    let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const p of pts) {
      const q = rotateEuler([p[0] * sc[0], p[1] * sc[1], p[2] * sc[2]], rot);
      for (let k = 0; k < 3; k++) {
        const v = q[k] + pos[k];
        if (v < min[k]) min[k] = v;
        if (v > max[k]) max[k] = v;
      }
    }
    if (!Number.isFinite(min[0])) { min = [pos[0], pos[1], pos[2]]; max = [...min]; }
    return { id: o.id, name: o.name, min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
  });
}

// Signed separation between two axis-aligned boxes: <= 0 means they overlap.
function separation(a, b) {
  let d = -Infinity;
  for (let k = 0; k < 3; k++) {
    d = Math.max(d, Math.max(b.min[k] - a.max[k], a.min[k] - b.max[k]));
  }
  return d;
}

// A part that contributes no pixel from any of six axis views is either fully
// enclosed or a duplicate left inside another part. AABB containment cannot
// decide this, so render counter-coloured ids and look for the id on screen.
export async function auditVisibility(doc, options = {}) {
  doc = evaluateDoc(doc);
  const { renderDoc } = await import('./softrender.js');
  const res = Number(options.res ?? 260);
  // six axes plus eight corners: a part visible only from an oblique angle must
  // not be reported as invisible
  const dirs = [];
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
    if (!x && !y && !z) continue;
    const l = Math.hypot(x, y, z);
    dirs.push([x / l, y / l, z / l]);
  }
  const ids = new Map();
  const objects = (doc.objects || []).map((o, i) => {
    const k = i + 1;
    ids.set([(k >> 16) & 255, (k >> 8) & 255, k & 255].join(','), k);
    const hex = '#' + [(k >> 16) & 255, (k >> 8) & 255, k & 255]
      .map((v) => v.toString(16).padStart(2, '0')).join('');
    return {
      ...o,
      material: { ...(o.material || {}), color: hex, emissive: '#000000', emissiveIntensity: 0, roughness: 1, metalness: 0, opacity: 1, transparent: false },
    };
  });
  const probe = { ...doc, objects, meta: { ...(doc.meta || {}), noDrift: true, unlitColors: true } };
  const seen = new Set();
  for (let i = 0; i < dirs.length; i++) {
    const info = renderDoc(probe, {
      mode: 'hero', width: res, height: Math.round(res * 0.75), ssaa: 1,
      unlit: true, noGround: true, noGrid: true, keepPixels: true,
      viewDir: dirs[i], viewKey: 'probe',
      path: options.path ? String(options.path).replace('.png', `-${i}.png`) : undefined,
    });
    const px = info.rgba;
    if (!px) continue;
    for (let q = 0; q < px.length; q += 4) {
      if (!px[q] && !px[q + 1] && !px[q + 2]) continue;
      const id = (px[q] << 16) | (px[q + 1] << 8) | px[q + 2];
      if (id) seen.add(id);
    }
  }
  const invisible = [];
  for (let k = 1; k <= objects.length; k++) {
    if (!seen.has(k)) invisible.push({ id: objects[k - 1].id, name: objects[k - 1].name });
  }
  const counts = {};
  for (const p of invisible) counts[p.name] = (counts[p.name] || 0) + 1;
  return {
    summary: { objects: objects.length, invisible: invisible.length, views: dirs.length, res },
    byName: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12),
    parts: invisible.slice(0, 40),
  };
}

// Raw bounds are dominated by thin appendages: an antenna decides the height
// and a tow cable decides the length. A trimmed percentile extent measures the
// mass of the model instead, which is what a proportion gate should judge.
export function robustBounds(doc, options = {}) {
  const trim = Number(options.trim ?? 0.01);
  const axes = [[], [], []];
  for (const o of doc.objects || []) {
    const pos = o.position || [0, 0, 0];
    const rot = o.rotation || [0, 0, 0];
    const sc = o.scale || [1, 1, 1];
    for (const q of localPoints(o)) {
      const w = rotateEuler([q[0] * sc[0], q[1] * sc[1], q[2] * sc[2]], rot);
      for (let k = 0; k < 3; k++) axes[k].push(w[k] + pos[k]);
    }
  }
  const pick = (arr) => {
    if (!arr.length) return [0, 0];
    const a = Float64Array.from(arr).sort();
    const lo = a[Math.min(a.length - 1, Math.floor(a.length * trim))];
    const hi = a[Math.max(0, Math.ceil(a.length * (1 - trim)) - 1)];
    return [lo, hi];
  };
  const out = axes.map(pick);
  return {
    min: out.map((e) => e[0]),
    max: out.map((e) => e[1]),
    size: out.map((e) => e[1] - e[0]),
    trim,
    vertices: axes[0].length,
  };
}

// How much of the picture each part actually occupies from the camera being
// used. auditVisibility answers "can this part ever be seen"; this answers "how
// much of it is in the shot", which is what tells you the running gear is
// buried behind an overhang.
export async function auditFraming(doc, options = {}) {
  doc = evaluateDoc(doc);
  const { renderDoc } = await import('./softrender.js');
  const res = Number(options.res ?? 320);
  const objects = (doc.objects || []).map((o, i) => {
    const k = i + 1;
    const hex = '#' + [(k >> 16) & 255, (k >> 8) & 255, k & 255]
      .map((v) => v.toString(16).padStart(2, '0')).join('');
    return {
      ...o,
      material: { ...(o.material || {}), color: hex, emissive: '#000000', emissiveIntensity: 0, roughness: 1, metalness: 0, opacity: 1, transparent: false },
    };
  });
  const info = renderDoc({ ...doc, objects, meta: { ...(doc.meta || {}), noDrift: true, unlitColors: true } }, {
    mode: 'hero', width: res, height: Math.round(res * 0.73), ssaa: 1,
    unlit: true, noGrid: true, keepPixels: true,
    ...(options.eye ? { eye: options.eye, target: options.target, fov: options.fov } : {}),
    path: options.path,
  });
  const px = info.rgba;
  const counts = new Map();
  let covered = 0;
  for (let q = 0; q < px.length; q += 4) {
    const id = (px[q] << 16) | (px[q + 1] << 8) | px[q + 2];
    // the unlit background keeps the scene colour, so only ids inside the object
    // range are geometry
    if (!id || id > objects.length) continue;
    covered++;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const names = new Map();
  for (let k = 1; k <= objects.length; k++) names.set(k, objects[k - 1].name);
  const byName = new Map();
  for (const [id, n] of counts) {
    const name = names.get(id) || '?';
    byName.set(name, (byName.get(name) || 0) + n);
  }
  const share = [...byName.entries()]
    .map(([name, n]) => ({ name, pixels: n, pct: +((100 * n) / Math.max(covered, 1)).toFixed(2) }))
    .sort((a, b) => b.pixels - a.pixels);
  const hidden = [];
  for (let k = 1; k <= objects.length; k++) if (!counts.has(k)) hidden.push(objects[k - 1].name);
  const hiddenCount = {};
  for (const n of hidden) hiddenCount[n] = (hiddenCount[n] || 0) + 1;
  return {
    summary: {
      objects: objects.length,
      coveredPixels: covered,
      resolution: `${res}x${Math.round(res * 0.73)}`,
      hiddenFromThisCamera: hidden.length,
      groups: byName.size,
    },
    share: share.slice(0, 20),
    hiddenByName: Object.entries(hiddenCount).sort((a, b) => b[1] - a[1]).slice(0, 12),
  };
}

// Tree editing works on the caller's transaction draft. It never evaluates or
// bakes recipes. workspace.execute owns the final normalize/commit boundary.
const assemblyRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const assemblyCopy = (v) => JSON.parse(JSON.stringify(v));
const assemblyOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function assemblyError(message, code = 'validation') { const e = new Error(message); e.code = code; return e; }
function assemblyText(v, name, max = 512) {
  if (typeof v !== 'string' || !v || v.length > max) throw assemblyError(`${name} must be a non-empty string (at most ${max} characters)`);
  return v;
}
function assemblyVector(v, fallback, name) {
  v = v === undefined ? fallback : v;
  if (!Array.isArray(v) || v.length !== 3 || v.some(n => typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > 1e12)) throw assemblyError(`${name} requires three finite coordinates within the geometry budget`);
  if (name === 'scale' && v.some(n => n === 0)) throw assemblyError('scale components must be non-zero');
  return v.slice();
}
function assemblyLocalTRS(object) {
  const legacy = object.recipe === undefined && object.topology === undefined && object.parts === undefined;
  return {position:assemblyVector(object.position,legacy?[0,.5,0]:[0,0,0],'position'),rotation:assemblyVector(object.rotation,[0,0,0],'rotation'),scale:assemblyVector(object.scale,[1,1,1],'scale')};
}
function assemblyIndex(doc) {
  if (!assemblyRecord(doc) || !Array.isArray(doc.objects)) throw assemblyError('assembly needs a document with objects[]');
  const entries = new Map();
  const walk = (objects, ancestors = []) => {
    if (ancestors.length > 64) throw assemblyError('object.parts depth budget exceeded');
    for (const object of objects) {
      if (!assemblyRecord(object)) throw assemblyError('assembly parts must be objects');
      assemblyText(object.id, 'object.id');
      if (entries.has(object.id)) throw assemblyError(`duplicate object id: ${object.id}`);
      if (entries.size >= 10_000) throw assemblyError('assembly object budget exceeded');
      const matrix = multiplyMatrix(ancestors.at(-1)?.matrix ?? identityMatrix(), objectMatrix(assemblyLocalTRS(object)));
      const entry = { object, siblings: objects, parent: ancestors.at(-1) ?? null, ancestors, matrix };
      entries.set(object.id, entry);
      if (object.parts !== undefined) {
        if (!Array.isArray(object.parts)) throw assemblyError('object.parts must be an array');
        walk(object.parts, [...ancestors, entry]);
      }
    }
  };
  walk(doc.objects); return entries;
}
function assemblyFind(entries, id) {
  assemblyText(id, 'id'); const found = entries.get(id);
  if (!found) throw assemblyError(`exact object ID does not exist: ${id}`, 'not_found');
  return found;
}
function assemblyParent(entries, id) {
  if (id === null) return null;
  const entry = assemblyFind(entries, id);
  if (!Array.isArray(entry.object.parts)) throw assemblyError('parentId must identify a compound with parts[]');
  return entry;
}
// Translation equality is exact: a relative tolerance against a large origin
// would erase legitimate small moves. TRS recomposition copies translation bits.
const matrixNear = (a, b, tolerance = 2e-9) => a.every((v, i) => i >= 12 && i <= 14 ? v === b[i] : Math.abs(v - b[i]) <= tolerance * Math.max(1, Math.abs(v), Math.abs(b[i])));
function assemblyTRS(matrix, previous) {
  if (previous && matrixNear(matrix, objectMatrix(assemblyLocalTRS(previous)), 2e-12)) return assemblyLocalTRS(previous);
  if (!matrix.every(Number.isFinite)) throw assemblyError('frame inversion overflow or singular transform', 'transformUnsupported');
  const scales = [0,4,8].map(i => Math.hypot(matrix[i], matrix[i+1], matrix[i+2]));
  if (scales.some(s => !s || !Number.isFinite(s))) throw assemblyError('singular frame cannot be represented by non-zero TRS', 'transformUnsupported');
  const determinant = matrix[0]*(matrix[5]*matrix[10]-matrix[9]*matrix[6]) - matrix[4]*(matrix[1]*matrix[10]-matrix[9]*matrix[2]) + matrix[8]*(matrix[1]*matrix[6]-matrix[5]*matrix[2]);
  if (determinant < 0) scales[0] *= -1;
  const r = matrix.slice(); for (let j=0;j<3;j++) for (let k=0;k<3;k++) r[j*4+k] /= scales[j];
  for (const [a,b] of [[0,4],[0,8],[4,8]]) if (Math.abs(r[a]*r[b]+r[a+1]*r[b+1]+r[a+2]*r[b+2]) > 2e-10) throw assemblyError('keepWorld requires shear that the document TRS format cannot represent', 'shearUnsupported');
  const cy = Math.hypot(r[0], r[4]), rotation = [0, Math.atan2(Math.max(-1,Math.min(1,r[8])), cy), 0];
  if (cy > 1e-12) { rotation[0] = Math.atan2(-r[9],r[10]); rotation[2] = Math.atan2(-r[4],r[0]); }
  else rotation[0] = Math.atan2(r[6],r[5]);
  const result = { position: matrix.slice(12,15), rotation, scale: scales };
  for (const key of ['position','rotation','scale']) assemblyVector(result[key], null, key);
  if (!matrixNear(matrix, objectMatrix(result), 2e-10)) throw assemblyError('keepWorld frame cannot be represented exactly as TRS', 'shearUnsupported');
  return result;
}
function assemblySetTRS(object, value) {
  Object.assign(object, value);
  if (assemblyRecord(object.module?.frame)) object.module.frame.origin = object.position.slice();
}

function assemblyMetadata(metadata, object) {
  if (!assemblyRecord(metadata)) throw assemblyError('module metadata must be an object');
  const out = assemblyCopy(metadata);
  if (out.role !== undefined) assemblyText(out.role, 'module.role');
  if (out.description !== undefined && (typeof out.description !== 'string' || out.description.length > 65536)) throw assemblyError('module.description must be a string within the text budget');
  for (const field of ['controls','interfaces']) if (out[field] !== undefined) {
    if (!Array.isArray(out[field]) || out[field].length > 256) throw assemblyError(`module.${field} must contain at most 256 entries`);
    const names = new Set();
    for (const value of out[field]) {
      if (!assemblyRecord(value)) throw assemblyError(`module.${field} entries must be objects`);
      assemblyText(value.name, `module.${field}.name`);
      if (names.has(value.name)) throw assemblyError(`duplicate module ${field} name: ${value.name}`);
      names.add(value.name);
      if (field === 'controls' || value.target !== undefined) assemblyText(value.target, `module.${field}.target`);
      if (value.parameter !== undefined) assemblyText(value.parameter, `module.${field}.parameter`, 4096);
    }
  }
  if (out.frame !== undefined && !assemblyRecord(out.frame)) throw assemblyError('module.frame must be an object');
  const frame = out.frame ?? {};
  if (frame.origin !== undefined) assemblyVector(frame.origin, null, 'frame.origin');
  if (frame.space !== undefined && frame.space !== 'parent') throw assemblyError('module.frame.space must be parent');
  if (frame.role !== undefined) assemblyText(frame.role, 'module.frame.role');
  out.frame = { ...frame, origin: assemblyVector(object.position, [0,0,0], 'position'), space: 'parent', role: frame.role ?? 'module-local' };
  return out;
}
const MODULE_PROVENANCE_FIELDS = ['sourceCode','script','sourceHash','sourceSpace','sourceId','frameMode','generator','generatorVersion','provenance'];
function assemblyDeclaredMetadata(metadata, object) {
  if (!assemblyRecord(metadata)) throw assemblyError('module metadata must be an object');
  const combined = assemblyCopy(metadata), previous = object.module;
  if (assemblyRecord(previous)) {
    for (const key of MODULE_PROVENANCE_FIELDS) if (!assemblyOwn(combined,key) && assemblyOwn(previous,key)) combined[key] = assemblyCopy(previous[key]);
    if (assemblyRecord(previous.meta) && assemblyOwn(previous.meta,'script')) {
      if (!assemblyOwn(combined,'meta')) combined.meta = {script:assemblyCopy(previous.meta.script)};
      else if (assemblyRecord(combined.meta) && !assemblyOwn(combined.meta,'script')) combined.meta.script = assemblyCopy(previous.meta.script);
    }
  }
  return assemblyMetadata(combined,object);
}
/** Metadata only: normalize frames and validate exact object references. */
export function validateAssemblyMetadata(doc) {
  const entries = assemblyIndex(doc);
  for (const { object } of entries.values()) {
    if (object.module === undefined) continue;
    object.module = assemblyMetadata(object.module, object);
    for (const field of ['controls','interfaces']) for (const reference of object.module[field] ?? []) {
      if (reference.target !== undefined && !entries.has(reference.target)) throw assemblyError(`module ${object.id} ${field} target does not exist: ${reference.target}`, 'not_found');
    }
  }
  return doc;
}
function assemblyEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v,i) => assemblyEqual(v,b[i]));
  if (!assemblyRecord(a) || !assemblyRecord(b)) return false;
  const keys = Object.keys(a); return keys.length === Object.keys(b).length && keys.every(k => assemblyOwn(b,k) && assemblyEqual(a[k],b[k]));
}
const activeModifiers = object => (object.modifiers ?? []).some(m => m.enabled !== false);
function assemblyLeafState(ancestors, leaf) {
  const override = ancestors.find(o => o.materialOverride !== undefined && o.materialOverride !== false);
  return { visible: leaf.visible !== false && ancestors.every(o => o.visible !== false), material: override ? (override.materialOverride === true ? override.material : override.materialOverride) : leaf.material };
}
function assemblyCheckInheritance(entry, nextAncestors) {
  const oldAncestors = entry.ancestors.map(e => e.object), newAncestors = nextAncestors.map(e => e.object);
  const modifiers = objects => objects.filter(activeModifiers).map(o => o.id);
  if (!assemblyEqual(modifiers(oldAncestors),modifiers(newAncestors))) throw assemblyError('keepWorld would change ancestor modifier application; use keepWorld:false to accept the change', 'modifierDependency');
  const walk = (object, path = []) => {
    if (object.parts !== undefined) { for (const part of object.parts) walk(part,[...path,object]); return; }
    const oldPath = [...oldAncestors,...path], newPath = [...newAncestors,...path];
    // Relation metadata can replace the raw leaf material (mirrorOf follows
    // its source). Equal raw defaults do not prove equal effective materials.
    const override = objects => { const owner=objects.find(o=>o.materialOverride!==undefined&&o.materialOverride!==false); return owner ? {material:owner.materialOverride===true?owner.material:owner.materialOverride} : null; };
    if (object.recipe && recipeDependencies(object.recipe).length && !assemblyEqual(override(oldPath),override(newPath))) throw assemblyError('keepWorld cannot prove dynamic relation material inheritance after changing materialOverride ancestry; use keepWorld:false to accept the change', 'inheritedStateUnsupported');
    if (!assemblyEqual(assemblyLeafState(oldPath,object),assemblyLeafState(newPath,object))) throw assemblyError('keepWorld would change inherited visibility or materialOverride; use keepWorld:false to accept the change', 'inheritedStateUnsupported');
  };
  walk(entry.object);
}
function assemblyNoDescendant(entry, parent) {
  if (parent && (parent === entry || parent.ancestors.includes(entry))) throw assemblyError('cannot move an object into itself or its descendants', 'hierarchyCycle');
}
function assemblyRecipeReferences(entries, id) {
  const references = [];
  for (const { object } of entries.values()) if (object.recipe && recipeDependencies(object.recipe).includes(id)) references.push(object.id);
  return references;
}
function assemblyDetach(entry) { entry.siblings.splice(entry.siblings.indexOf(entry.object), 1); }
function assemblyKeepWorld(operation) {
  if (operation.keepWorld !== undefined && typeof operation.keepWorld !== 'boolean') throw assemblyError('keepWorld must be boolean');
  return operation.keepWorld !== false;
}
const ASSEMBLY_KEYS = {
  group: ['op','id','name','ids','parentId','position','rotation','scale','pivot','module','keepWorld'],
  ungroup: ['op','id','keepWorld'], reparent: ['op','id','parentId','keepWorld'],
  pivot: ['op','id','position','space','keepWorld'], module: ['op','id','metadata'], replace_module: ['op','id','object'],
};
export const ASSEMBLY_OPERATIONS = Object.freeze(Object.keys(ASSEMBLY_KEYS));

/** Apply to a JSON transaction draft. Only the selected subtrees are changed. */
export function applyAssemblyOperation(doc, operation) {
  if (!assemblyRecord(operation) || !ASSEMBLY_KEYS[operation.op]) throw assemblyError(`unknown assembly operation: ${operation?.op}`);
  for (const key of Object.keys(operation)) if (!ASSEMBLY_KEYS[operation.op].includes(key)) throw assemblyError(`unknown field for ${operation.op}: ${key}`);
  const entries = assemblyIndex(doc), keepWorld = assemblyKeepWorld(operation);
  let object, result, structural = operation.op !== 'module';
  if (operation.op === 'group') {
    const id = assemblyText(operation.id,'group.id');
    if (entries.has(id)) throw assemblyError(`duplicate object id: ${id}`);
    if (!Array.isArray(operation.ids) || !operation.ids.length || operation.ids.length > 10_000) throw assemblyError('group.ids must contain 1..10000 exact object IDs');
    if (new Set(operation.ids).size !== operation.ids.length) throw assemblyError('group.ids cannot contain duplicate IDs');
    const selected = operation.ids.map(id => assemblyFind(entries,id)), selectedSet = new Set(selected);
    for (const entry of selected) if (entry.ancestors.some(a => selectedSet.has(a))) throw assemblyError('group.ids cannot contain overlapping ancestor and descendant selections', 'hierarchyOverlap');
    const parent = operation.parentId === undefined ? (selected.every(e => e.parent === selected[0].parent) ? selected[0].parent : null) : assemblyParent(entries,operation.parentId);
    for (const entry of selected) assemblyNoDescendant(entry,parent);
    if (operation.pivot !== undefined && operation.position !== undefined) throw assemblyError('group.pivot and group.position are mutually exclusive');
    const parentMatrix = parent?.matrix ?? identityMatrix();
    const position = operation.pivot !== undefined ? transformPoint(assemblyVector(operation.pivot,null,'pivot'),inverseMatrix(parentMatrix)) : assemblyVector(operation.position,[0,0,0],'position');
    object = { id, name: operation.name === undefined ? id : assemblyText(operation.name,'group.name',4096), kind: 'custom', position, rotation: assemblyVector(operation.rotation,[0,0,0],'rotation'), scale: assemblyVector(operation.scale,[1,1,1],'scale'), parts: [] };
    object.module = assemblyMetadata(operation.module ?? { role:'assembly',description:'',controls:[],interfaces:[] },object);
    const ancestors = parent ? [...parent.ancestors,parent] : [], frame = { object, ancestors, matrix: multiplyMatrix(parentMatrix,objectMatrix(assemblyLocalTRS(object))) };
    const patches = selected.map(entry => {
      if (!keepWorld) return null;
      assemblyCheckInheritance(entry,[...ancestors,frame]);
      return assemblyTRS(multiplyMatrix(inverseMatrix(frame.matrix),entry.matrix),entry.object);
    });
    const siblings = parent ? parent.object.parts : doc.objects;
    const insertion = Math.min(siblings.length,...selected.filter(e => e.siblings === siblings).map(e => siblings.indexOf(e.object)));
    selected.forEach(assemblyDetach);
    selected.forEach((entry,i) => { if (patches[i]) assemblySetTRS(entry.object,patches[i]); object.parts.push(entry.object); });
    siblings.splice(insertion,0,object);
    result = { op:operation.op,id,ids:operation.ids.slice(),parentId:parent?.object.id ?? null,keepWorld };
  } else if (operation.op === 'ungroup') {
    const entry = assemblyFind(entries,operation.id); object = entry.object;
    if (!Array.isArray(object.parts)) throw assemblyError('ungroup targets a compound with parts[]');
    const ancestors = entry.ancestors, parentMatrix = entry.parent?.matrix ?? identityMatrix();
    const patches = object.parts.map(child => {
      if (!keepWorld) return null;
      const childEntry = entries.get(child.id); assemblyCheckInheritance(childEntry,ancestors);
      return assemblyTRS(multiplyMatrix(inverseMatrix(parentMatrix),childEntry.matrix),child);
    });
    const children = object.parts.slice(); children.forEach((child,i) => { if (patches[i]) assemblySetTRS(child,patches[i]); });
    entry.siblings.splice(entry.siblings.indexOf(object),1,...children);
    result = { op:operation.op,id:object.id,ids:children.map(child => child.id),parentId:entry.parent?.object.id ?? null,keepWorld };
  } else if (operation.op === 'reparent') {
    const entry = assemblyFind(entries,operation.id), parent = assemblyParent(entries,operation.parentId); object = entry.object;
    assemblyNoDescendant(entry,parent);
    const ancestors = parent ? [...parent.ancestors,parent] : [];
    let patch;
    if (keepWorld) { assemblyCheckInheritance(entry,ancestors); patch = assemblyTRS(multiplyMatrix(inverseMatrix(parent?.matrix ?? identityMatrix()),entry.matrix),object); }
    if (entry.parent !== parent) { assemblyDetach(entry); (parent ? parent.object.parts : doc.objects).push(object); }
    if (patch) assemblySetTRS(object,patch);
    result = { op:operation.op,id:object.id,parentId:parent?.object.id ?? null,keepWorld };
  }
  else if (operation.op === 'pivot') {
    const entry = assemblyFind(entries,operation.id); object = entry.object;
    const space = operation.space ?? 'world';
    if (!['world','local'].includes(space)) throw assemblyError('pivot.space must be world or local (parent coordinates)');
    const requested = assemblyVector(operation.position,null,'pivot.position'), parentMatrix = entry.parent?.matrix ?? identityMatrix();
    const position = space === 'world' ? transformPoint(requested,inverseMatrix(parentMatrix)) : requested;
    const nextFrame = multiplyMatrix(parentMatrix,objectMatrix({ ...object,position })), changed = !matrixNear(nextFrame,entry.matrix,2e-12);
    let patches = [];
    if (keepWorld && changed) {
      if (!Array.isArray(object.parts)) throw assemblyError('keepWorld pivot needs a compound with parts[]; a leaf would require baking geometry', 'pivotUnsupported');
      if (activeModifiers(object)) throw assemblyError('keepWorld pivot cannot move a frame with active modifiers', 'modifierDependency');
      const dependents = assemblyRecipeReferences(entries,object.id);
      if (dependents.length) throw assemblyError(`keepWorld pivot would change a referenced target frame: ${object.id}`, 'referenceDependency');
      patches = object.parts.map(child => assemblyTRS(multiplyMatrix(inverseMatrix(nextFrame),entries.get(child.id).matrix),child));
    }
    object.position = position;
    if (assemblyRecord(object.module?.frame)) object.module.frame.origin = position.slice();
    object.parts?.forEach((child,i) => { if (patches[i]) assemblySetTRS(child,patches[i]); });
    result = { op:operation.op,id:object.id,position:position.slice(),space:'local',keepWorld };
  } else if (operation.op === 'module') {
    object = assemblyFind(entries,operation.id).object;
    object.module = assemblyDeclaredMetadata(operation.metadata,object);
    result = { op:operation.op,id:object.id };
  } else if (operation.op === 'replace_module') {
    const entry = assemblyFind(entries,operation.id); object = entry.object;
    if (!Array.isArray(object.parts)) throw assemblyError('replace_module targets a compound with parts[]');
    if (!assemblyRecord(operation.object) || operation.object.id !== object.id) throw assemblyError('replace_module.object.id must preserve the target root ID');
    if (!Array.isArray(operation.object.parts)) throw assemblyError('replace_module.object must remain a compound with parts[]');
    if (object.semanticId !== undefined && operation.object.semanticId !== object.semanticId) throw assemblyError('replace_module must preserve the root semanticId');
    const replacement = assemblyCopy(operation.object), removed = assemblyIndex({objects:[object]}), incoming = assemblyIndex({objects:[replacement]}), semanticIds = new Set();
    for (const [id,item] of entries) if (!removed.has(id)) { if (incoming.has(id)) throw assemblyError(`duplicate object id outside replaced subtree: ${id}`); if (item.object.semanticId !== undefined) semanticIds.add(item.object.semanticId); }
    for (const {object:part} of incoming.values()) if (part.semanticId !== undefined) { if (semanticIds.has(part.semanticId)) throw assemblyError(`duplicate semanticId: ${part.semanticId}`); semanticIds.add(part.semanticId); }
    entry.siblings[entry.siblings.indexOf(object)] = replacement; object = replacement;
    result = { op:operation.op,id:object.id,replacedIds:[...removed.keys()],ids:[...incoming.keys()],parentId:entry.parent?.object.id ?? null };
  }
  return { object,result,structural };
}

function assemblySummary(object) {
  const metadata = object.module;
  if (!assemblyRecord(metadata)) return undefined;
  const frame = metadata.frame ? {origin:assemblyVector(object.position,[0,0,0],'position'),space:'parent',role:metadata.frame.role ?? 'module-local'} : undefined;
  const out = { ...(metadata.role !== undefined ? {role:metadata.role} : {}), ...(metadata.description !== undefined ? {description:metadata.description.slice(0,4096)} : {}), ...(frame ? {frame} : {}), hasSourceCode: typeof metadata.sourceCode === 'string' && metadata.sourceCode.length > 0, hasScript: metadata.script !== undefined || metadata.meta?.script !== undefined };
  for(const key of ['className','instanceId','definitionId','paramsState'])if(typeof metadata[key]==='string')out[key]=metadata[key].slice(0,200);
  if(metadata.params&&JSON.stringify(metadata.params).length<2000)out.constructionParams=JSON.parse(JSON.stringify(metadata.params));
  for (const field of ['controls','interfaces']) if (Array.isArray(metadata[field])) {
    out[field] = metadata[field].slice(0,32).map(value => Object.fromEntries(['name','target','parameter','role','description'].filter(key => typeof value[key] === 'string').map(key => [key,value[key].slice(0,4096)])));
    out[`${field}Count`] = metadata[field].length;
  }
  return out;
}
/** No geometry evaluation, source body, storage access or document mutation. */
export function inspectAssembly(doc, options = {}) {
  if (!assemblyRecord(options)) throw assemblyError('inspectAssembly options must be an object');
  for (const key of Object.keys(options)) if (!['id','depth','offset','limit'].includes(key)) throw assemblyError(`unknown assembly inspect option: ${key}`);
  const {id,depth=3,offset=0,limit=100} = options;
  if (!Number.isSafeInteger(depth) || depth < 0 || depth > 64 || !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 500) throw assemblyError('inspect depth must be 0..64, offset >= 0, limit 1..500');
  const entries = assemblyIndex(doc), root = id === undefined ? null : assemblyFind(entries,id), candidates = [], refs = new Map();
  for (const [objectId,{object}] of entries) if (object.recipe) for (const target of recipeDependencies(object.recipe)) { if (!refs.has(target)) refs.set(target,[]); refs.get(target).push(objectId); }
  const walk = (objects,level=0) => { for (const object of objects) { candidates.push({object,level}); if (level < depth && object.parts) walk(object.parts,level+1); } };
  walk(root ? [root.object] : doc.objects);
  const nodes = candidates.slice(offset,offset+limit).map(({object,level}) => {
    const entry = entries.get(object.id), dependencies = object.recipe ? recipeDependencies(object.recipe) : [], metadata = assemblySummary(object);
    return { id:object.id, ...(object.semanticId ? {semanticId:object.semanticId} : {}), name:object.name ?? object.kind ?? object.id, parentId:entry.parent?.object.id ?? null, parents:entry.ancestors.map(e => e.object.id), depth:level, children:(object.parts ?? []).slice(0,100).map(o => o.id), childCount:object.parts?.length ?? 0, role:object.module?.role ?? (object.parts ? 'assembly' : 'part'), localTRS:{position:assemblyVector(object.position,[0,0,0],'position'),rotation:assemblyVector(object.rotation,[0,0,0],'rotation'),scale:assemblyVector(object.scale,[1,1,1],'scale')}, visible:object.visible !== false, dependencies:dependencies.slice(0,64), dependencyCount:dependencies.length, dependents:(refs.get(object.id) ?? []).slice(0,64), dependentCount:refs.get(object.id)?.length ?? 0, ...(metadata ? {module:metadata} : {}) };
  });
  return {rootId:root?.object.id ?? null,parents:root?.ancestors.map(e => e.object.id) ?? [],total:candidates.length,totalObjects:entries.size,depth,offset,limit,nextOffset:offset+nodes.length<candidates.length ? offset+nodes.length : null,nodes};
}

export function auditAssembly(doc, options = {}) {
  doc = evaluateDoc(doc);
  const touch = Number(options.touch ?? 0.02);      // metres of allowed clearance
  const boxes = worldBounds(doc);
  const floating = [];
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    let nearest = Infinity;
    for (let j = 0; j < boxes.length; j++) {
      if (i === j) continue;
      const d = separation(a, boxes[j]);
      if (d < nearest) nearest = d;
    }
    if (boxes.length > 1 && nearest > touch) {
      floating.push({ id: a.id, name: a.name, gap: Number(nearest.toFixed(3)) });
    }
  }
  return {
    summary: {
      objects: boxes.length,
      floating: floating.length,
      touch,
    },
    floating: floating.slice(0, 40),
  };
}
