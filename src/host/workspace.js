import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { buildRecipe, evaluateDoc, evaluateObject, isContextRecipe } from './kernel.js';
import { moveVertices, extrudeFaces, validateMesh } from './topology.js';
import { createStorage, hashContent, canonicalByteLength, sceneSourceByteLength } from './storage.js';
import { ASSEMBLY_OPERATIONS, applyAssemblyOperation, validateAssemblyMetadata } from './assembly.js';
import { isNativeRecipe, nativeSourceParams, hasNativeCacheParams, NATIVE_CACHE_PARAMS, NATIVE_CACHE_OBJECT_FIELDS, nativeOverrideView, nativeManifestView } from './native-state.js';
import { isMetadataRef, validateEncodedFields, validateMetadataArray, metadataArrayLength } from './metadata-store.js';
import { checkEditingRelations } from './editing-relations.js';
import { validateMaterialLibrary } from './material-source.js';

const SCHEMA = 'dsh-modeler/workspace';
const MAX_SCENE_BYTES = 96 * 1024 * 1024;
const MAX_VALUES = 32_000_000; // Hydrated geometry is separately bounded by topology and total bytes.
const MAX_OPERATIONS = 1_000;
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
const BUILTINS = new Set(['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane']);
const EDIT_FIELDS = new Set(['name', 'position', 'rotation', 'scale', 'material', 'params', 'modifiers', 'visible', 'group', 'shading', 'recipe', 'topology', 'geometryData', 'parts', 'kind', 'meta', 'materialOverride', 'module']);
const REPLAY_FIELDS = new Set(['name', 'position', 'rotation', 'scale', 'visible', 'group', 'shading', 'modifiers', 'module']);
const moduleHasSource = value => record(value) && (own(value,'sourceCode') || own(value,'script') || own(value.meta ?? {},'script'));
const replayableField = (key,value) => REPLAY_FIELDS.has(key) && !(key === 'module' && moduleHasSource(value));
const CONTROLS = ['expectedRevision', 'expectedHash', 'label'];
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = (value) => JSON.parse(JSON.stringify(value));
const digest = (value) => createHash('sha256').update(value).digest('hex');
function fail(message, code = 'validation') { const error = new Error(message); error.code = code; return error; }

// Copy descriptors before stringify: getters/toJSON must not execute, nor NaN
// silently become null. Plain objects from the script VM are accepted too.
function dataCopy(input, { maxValues = MAX_VALUES, maxDepth = 80, optionalRootFields = [], copy = true } = {}) {
  let values = 0;
  const active = new Set();
  const visit = (value, depth) => {
    if (++values > maxValues || depth > maxDepth) throw fail('JSON size/depth budget exceeded');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') { if (!Number.isFinite(value)) throw fail('non-finite number in workspace data'); return value; }
    if (typeof value === 'string') { if (value.length > 2_000_000) throw fail('string budget exceeded'); return value; }
    if (typeof value !== 'object') throw fail('workspace data must contain JSON values only');
    if (active.has(value)) throw fail('cyclic workspace data');
    const isArray = Array.isArray(value), proto = Object.getPrototypeOf(value);
    if (!isArray && proto !== null && Object.getPrototypeOf(proto) !== null) throw fail('workspace data must use plain objects');
    active.add(value);
    if (isArray) {
      if (value.length > maxValues) throw fail('array budget exceeded');
      const out = copy ? new Array(value.length) : value;
      for (let index = 0; index < value.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !own(descriptor, 'value')) throw fail('sparse/accessor arrays are not workspace data');
        out[index] = visit(descriptor.value, depth + 1);
      }
      for (const key in value) {
        if (!own(value, key)) continue;
        if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) throw fail('arrays cannot carry custom fields');
      }
      if (Object.getOwnPropertySymbols(value).length) throw fail('symbol fields are not workspace data');
      active.delete(value);
      return out;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value), out = copy ? {} : value;
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string') throw fail('symbol fields are not workspace data');
      const descriptor = descriptors[key];
      if (!descriptor.enumerable) continue;
      if (FORBIDDEN.has(key)) throw fail(`unsafe field: ${key}`);
      if (!own(descriptor, 'value')) throw fail(`accessor field is not workspace data: ${key}`);
      if (depth === 0 && descriptor.value === undefined && optionalRootFields.includes(key)) continue;
      out[key] = visit(descriptor.value, depth + 1);
    }
    active.delete(value);
    return out;
  };
  return visit(input, 0);
}
export function canonicalContent(value) {
  return JSON.stringify(value, (_key, item) => record(item) ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
}
export const contentHash = hashContent;
const same = (a, b) => a === b || (a !== undefined && b !== undefined && hashContent(a) === hashContent(b));
function text(value, name, max = 512) { if (typeof value !== 'string' || !value || value.length > max) throw fail(`${name} must be a non-empty string (at most ${max} characters)`); return value; }
function vector(value, fallback, name) {
  if (value === undefined) return [...fallback];
  if (!Array.isArray(value) || value.length !== 3 || value.some((n) => typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > 1e12)) throw fail(`${name} must contain three finite coordinates within the geometry budget`);
  if (name === 'scale' && value.some((n) => n === 0)) throw fail('scale components must be non-zero');
  return [...value];
}
function merge(base, patch) {
  if (!record(patch)) return clone(patch);
  const out = record(base) ? clone(base) : {};
  for (const [key, value] of Object.entries(patch)) out[key] = record(value) ? merge(out[key], value) : clone(value);
  return out;
}
function visitObjects(objects, fn, parent = null, depth = 0) {
  if (depth > 64) throw fail('object.parts depth budget exceeded');
  for (const object of objects) { fn(object, objects, parent); if (Array.isArray(object.parts)) visitObjects(object.parts, fn, object, depth + 1); }
}
function locate(doc, id) {
  text(id, 'id');
  let byId = null, bySemantic = null;
  visitObjects(doc.objects, (object, siblings, parent) => { if (object.id === id) byId = { object, siblings, parent }; if (object.semanticId === id) bySemantic = { object, siblings, parent }; });
  const found = byId || bySemantic;
  if (!found) throw fail(`object does not exist: ${id}`, 'not_found');
  return found;
}
const targetOf = (object) => ({ id: object.id, ...(object.semanticId ? { semanticId: object.semanticId } : {}) });
function locateTarget(doc, target) {
  if (!target.semanticId) throw fail(`cannot prove stable identity for legacy id ${target.id}; add semanticId or explicitly discard overrides`, 'override_conflict');
  let found = null;
  visitObjects(doc.objects, (object) => { if (target.semanticId ? object.semanticId === target.semanticId : object.id === target.id) found = object; });
  if (!found) throw fail(`cannot rebase missing semantic object: ${target.semanticId || target.id}`, 'override_conflict');
  return found;
}

/** Keep source documents v1, retain legal fields and add only missing defaults. */
export function normalizeDoc(input, { evaluate = true, copy = true } = {}) {
  const doc = dataCopy(input, { copy });
  if (!record(doc) || doc.version !== 1 || !Array.isArray(doc.objects)) throw fail('scene must be {version:1, objects:[...]}');
  const ids = new Set(), semantics = new Set();
  let count = 0;
  visitObjects(doc.objects, (object) => {
    if (++count > 10_000 || !record(object)) throw fail('invalid object or object budget exceeded');
    text(object.id, 'object.id');
    if (ids.has(object.id)) throw fail(`duplicate object id: ${object.id}`);
    ids.add(object.id);
    if (object.semanticId !== undefined) { text(object.semanticId, 'object.semanticId'); if (semantics.has(object.semanticId)) throw fail(`duplicate semanticId: ${object.semanticId}`); semantics.add(object.semanticId); }
    if (object.parts !== undefined && !Array.isArray(object.parts)) throw fail('object.parts must be an array');
    if (object.recipe !== undefined && (!record(object.recipe) || typeof object.recipe.type !== 'string' || (object.recipe.params !== undefined && !record(object.recipe.params)))) throw fail('recipe must be {type,params}');
    if (object.topology !== undefined) validateMesh(object.topology);
    if (object.geometryData !== undefined && object.geometryData !== null && (!record(object.geometryData) || !Array.isArray(object.geometryData.positions) || object.geometryData.positions.length % 9 || object.geometryData.positions.length > 9_000_000)) throw fail('geometryData.positions must contain triangle coordinates within the geometry budget');
    if (object.recipe === undefined && object.topology === undefined && !object.geometryData && object.parts === undefined && !BUILTINS.has(object.kind)) throw fail(`unknown kind or missing geometry source: ${String(object.kind)}`);
    if (object.kind === undefined) object.kind = object.parts !== undefined ? 'custom' : (BUILTINS.has(object.recipe?.type) ? object.recipe.type : 'custom');
    if (object.name === undefined) object.name = object.kind;
    if (typeof object.name !== 'string' || object.name.length > 4096) throw fail('object.name must be a string within the text budget');
    const legacy = object.recipe === undefined && object.topology === undefined && object.parts === undefined;
    object.position = vector(object.position, legacy ? [0, .5, 0] : [0, 0, 0], 'position');
    object.rotation = vector(object.rotation, [0, 0, 0], 'rotation'); object.scale = vector(object.scale, [1, 1, 1], 'scale');
    if (object.params === undefined || object.params === null) object.params = {};
    if (!record(object.params)) throw fail('object.params must be an object');
    if (object.modifiers === undefined) object.modifiers = [];
    if (!Array.isArray(object.modifiers) || object.modifiers.length > 32) throw fail('object.modifiers must contain at most 32 modifiers');
    for (const modifier of object.modifiers) {
      if (!record(modifier) || !['mirror', 'array', 'subsurf', 'solidify', 'brush'].includes(modifier.type)) throw fail(`unknown modifier operator: ${modifier?.type}`);
    }
    if (object.shading === undefined) object.shading = 'smooth';
    if (!['flat', 'smooth'].includes(object.shading)) throw fail('unknown shading mode');
    if (object.visible === undefined) object.visible = true;
    if (typeof object.visible !== 'boolean') throw fail('visible must be boolean');
    if (object.material === undefined || object.material === null) object.material = { color: '#c0c7d4', metalness: .1, roughness: .5, opacity: 1 };
    if (!record(object.material)) throw fail('material must be an object');
    if (evaluate && object.recipe !== undefined && !isContextRecipe(object.recipe)) buildRecipe(object.recipe);
  });
  validateAssemblyMetadata(doc);
  if (!Number.isSafeInteger(doc.nextId) || doc.nextId < 1) doc.nextId = count + 1;
  if (sceneSourceByteLength(doc) > MAX_SCENE_BYTES) throw fail('source document byte budget exceeded');
  if (canonicalByteLength(doc) > 512 * 1024 * 1024) throw fail('hydrated geometry byte budget exceeded');
  if (evaluate) evaluateDoc(doc);
  return doc;
}
const projectKey = (doc) => typeof doc.meta?.project === 'string' && doc.meta.project ? doc.meta.project : null;
const titleOf = (doc) => typeof doc.meta?.title === 'string' ? doc.meta.title : typeof doc.title === 'string' ? doc.title : 'Untitled';
function uuidForLegacyStore(store) {
  const h = digest(`dsh-modeler-legacy-store\0${store}`).slice(0, 32).split(''); h[12] = '5'; h[16] = ((parseInt(h[16], 16) & 3) | 8).toString(16);
  const s = h.join(''); return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}
function historyOperation(operation) {
  // Full native objects are already durable under sceneRef. Operation audit
  // metadata must not embed another copy of backend buffers for local adds.
  if (operation.op === 'add') {
    let native = false; visitObjects([operation.object], object => { native ||= isNativeRecipe(object.recipe); });
    if (native) { const { object, ...fields } = operation; return { ...fields, objectHash: contentHash(object) }; }
  }
  if (operation.op === 'update' && (isNativeRecipe(operation.recipe) || Array.isArray(operation.parts))) {
    let nativeParts = false;
    if (Array.isArray(operation.parts)) visitObjects(operation.parts, object => { nativeParts ||= isNativeRecipe(object.recipe); });
    if (isNativeRecipe(operation.recipe) || nativeParts) {
      const { recipe, parts, module, ...fields } = operation;
      return { ...fields, ...(recipe === undefined ? {} : { recipeHash: contentHash(recipe) }), ...(parts === undefined ? {} : { partsHash: contentHash(parts) }), ...(module === undefined ? {} : { moduleHash: contentHash(module) }) };
    }
  }
  if (operation.op === 'replace_module') return { op:operation.op,id:operation.id,objectHash:contentHash(operation.object) };
  if (operation.op === 'group' && operation.module !== undefined) { const {module,...fields}=operation;return {...fields,moduleHash:contentHash(module)}; }
  if (operation.op === 'module') return {op:operation.op,id:operation.id,metadataHash:contentHash(operation.metadata)};
  if (operation.op === 'update' && operation.module !== undefined) { const {module,...fields}=operation;return {...fields,moduleHash:contentHash(module)}; }
  return operation;
}
function historyEntry(state, label, ops, parent, extra = {}) {
  return { id: randomUUID(), assetId: state.assetId, revision: state.revision, hash: state.contentHash, contentHash: state.contentHash, sceneRef: state.contentHash, title: titleOf(state.scene), parent, label: String(label || ''), ops: clone(ops.map(historyOperation)), createdAt: state.updatedAt, overrides: state.overrides, projectKey: state.projectKey, ...extra };
}
function headOf(state) {
  return { assetId: state.assetId, key: state.projectKey, revision: state.revision, contentHash: state.contentHash, sceneRef: state.contentHash, title: titleOf(state.scene), updatedAt: state.updatedAt, headId: state.headId, overrides: state.overrides };
}
function saveHead(state) { state.projectHeads[state.assetId] = headOf(state); }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
function validateEnvelope(raw, storage, legacyScenes) {
  if (raw.schema !== SCHEMA || ![2, 3].includes(raw.schemaVersion)) throw fail('unsupported workspace store schema', 'storage');
  if (!UUID.test(raw.assetId) || !Number.isSafeInteger(raw.revision) || raw.revision < 0 || typeof raw.initialized !== 'boolean' || (raw.updatedAt !== null && (typeof raw.updatedAt !== 'string' || !Number.isFinite(Date.parse(raw.updatedAt))))) throw fail('invalid persisted workspace metadata', 'storage');
  const encoded = validateEncodedFields(raw);
  if (!Array.isArray(raw.history) || !record(raw.projectHeads)) throw fail('invalid persisted history/project heads', 'storage');
  validateMetadataArray(raw.overrides, encoded);
  const legacy = raw.schemaVersion === 2;
  const { scene: inlineScene, history, projectHeads, ...header } = raw;
  const state = dataCopy(header, { copy: false });
  state.schemaVersion = 3;
  state.sceneRef = legacy ? raw.contentHash : raw.sceneRef;
  if (!HASH.test(state.sceneRef) || state.sceneRef !== state.contentHash) throw fail('persisted current sceneRef mismatch', 'storage');
  state.scene = normalizeDoc(legacy ? inlineScene : storage.readScene(state.sceneRef), { copy: false });
  if (contentHash(state.scene) !== state.contentHash) throw fail('persisted scene contentHash mismatch', 'storage');
  state.title = titleOf(state.scene);
  if (legacy) legacyScenes.set(state.sceneRef, state.scene);
  const ids = new Set();
  state.history = history.map((entry) => {
    if (!record(entry) || typeof entry.id !== 'string' || ids.has(entry.id) || !UUID.test(entry.assetId) || !Number.isSafeInteger(entry.revision) || entry.revision > state.revision || entry.revision < 0) throw fail('invalid persisted history entry', 'storage');
    validateMetadataArray(entry.ops, encoded); validateMetadataArray(entry.overrides, encoded);
    ids.add(entry.id);
    const { doc, ...metadata } = entry;
    const item = dataCopy(metadata, { copy: false });
    if (!HASH.test(item.hash) || item.hash !== item.contentHash) throw fail('persisted history contentHash mismatch', 'storage');
    if (legacy) {
      const source = normalizeDoc(doc, { evaluate: false, copy: false });
      if (contentHash(source) !== item.hash) throw fail('persisted history contentHash mismatch', 'storage');
      legacyScenes.set(item.hash, source); item.sceneRef = item.hash; item.title = titleOf(source);
    } else if (item.sceneRef !== item.hash) throw fail('persisted history sceneRef mismatch', 'storage');
    return item;
  });
  if (typeof state.headId !== 'string' || Object.keys(projectHeads).length > 1_000) throw fail('invalid persisted project heads', 'storage');
  const keys = new Set(); state.projectHeads = {};
  for (const [assetId, head] of Object.entries(projectHeads)) {
    if (!record(head) || head.assetId !== assetId || !UUID.test(assetId) || !Number.isSafeInteger(head.revision) || head.revision > state.revision) throw fail('invalid persisted project head', 'storage');
    validateMetadataArray(head.overrides, encoded);
    if (head.key !== null) { if (typeof head.key !== 'string' || keys.has(head.key)) throw fail('duplicate/invalid persisted project key', 'storage'); keys.add(head.key); }
    const { scene, ...metadata } = head;
    const item = dataCopy(metadata, { copy: false });
    if (!HASH.test(item.contentHash)) throw fail('persisted project head contentHash mismatch', 'storage');
    if (legacy) {
      const source = normalizeDoc(scene, { evaluate: false, copy: false });
      if (contentHash(source) !== item.contentHash) throw fail('persisted project head contentHash mismatch', 'storage');
      legacyScenes.set(item.contentHash, source); item.sceneRef = item.contentHash; item.title = titleOf(source);
    } else if (item.sceneRef !== item.contentHash) throw fail('persisted project head sceneRef mismatch', 'storage');
    state.projectHeads[assetId] = item;
  }
  const currentHead = state.projectHeads[state.assetId];
  if (!currentHead || currentHead.contentHash !== state.contentHash || currentHead.headId !== state.headId || currentHead.key !== state.projectKey || currentHead.revision !== state.revision || currentHead.updatedAt !== state.updatedAt || !same(currentHead.overrides, state.overrides)) throw fail('persisted current/project head mismatch', 'storage');
  const currentEntry = state.history.find((entry) => entry.id === state.headId);
  if (!currentEntry || currentEntry.assetId !== state.assetId || currentEntry.revision !== state.revision || currentEntry.hash !== state.contentHash || !same(currentEntry.overrides, state.overrides)) throw fail('persisted current/history head mismatch', 'storage');
  if (!legacy) {
    const refs = new Set([state.sceneRef, ...state.history.map((entry) => entry.sceneRef), ...Object.values(state.projectHeads).map((head) => head.sceneRef)]);
    for (const ref of refs) storage.assertRef(ref);
  }
  return state;
}
function operationKeys(operation, allowed) { for (const key of Object.keys(operation)) if (!allowed.includes(key)) throw fail(`unknown field for ${operation.op}: ${key}`); }
function allocator(doc, reserved = []) {
  const ids = new Set(reserved);
  visitObjects(doc.objects, (object) => ids.add(object.id));
  return () => {
    let id;
    do {
      if (!Number.isSafeInteger(doc.nextId) || doc.nextId >= Number.MAX_SAFE_INTEGER) throw fail('object id counter exhausted');
      id = `obj_${doc.nextId++}`;
    } while (ids.has(id));
    ids.add(id);
    return id;
  };
}
function addOverrides(overrides, additions) {
  const out = clone(nativeOverrideView(overrides));
  for (const addition of nativeOverrideView(additions)) {
    if (addition.op === 'blocked') { if (!out.some((item) => item.op === 'blocked')) out.push(clone(addition)); continue; }
    const keyOf = (item) => item.target ? (item.target.semanticId ? `semantic:${item.target.semanticId}` : `id:${item.target.id}`) : 'document';
    const old = out.find((item) => item.op === addition.op && keyOf(item) === keyOf(addition));
    if (old) old.patch = addition.op === 'fields' ? { ...old.patch, ...clone(addition.patch) } : merge(old.patch, addition.patch);
    else out.push(clone(addition));
  }
  if (out.length > MAX_OPERATIONS) throw fail('local override budget exceeded; explicitly discard overrides to establish a new source baseline'); return out;
}
function applyParameters(object, params, overrides) {
  if (!record(params)) throw fail('parameters.params must be an object');
  if (isNativeRecipe(object.recipe)) {
    if (hasNativeCacheParams(params)) throw fail('native materialization fields are read-only; edit source/features through native operations', 'native_cache_edit');
    const next = merge(nativeSourceParams(object.recipe.params), params);
    if (!same(nativeSourceParams(object.recipe.params), nativeSourceParams(next))) throw fail('native source changes require backend materialization before committing', 'native_evaluation_required');
    return;
  }
  if (!object.recipe) {
    if (!BUILTINS.has(object.kind) || object.topology || object.geometryData || object.parts) throw fail(`object is not parametric: ${object.id}`);
    const defaults = { sphere: { radius: .62, widthSegments: 32, heightSegments: 20 }, cylinder: { radiusTop: .42, radiusBottom: .42, height: 1.1, radialSegments: 32 }, cone: { radius: .55, height: 1.15, radialSegments: 32 }, torus: { radius: .58, tube: .2, radialSegments: 20, tubularSegments: 40 } };
    object.recipe = { type: object.kind, params: { ...defaults[object.kind], ...object.params } };
  }
  object.recipe.params = merge(object.recipe.params || {}, params); object.params = clone(object.recipe.params);
  overrides.push({ op: 'parameters', target: targetOf(object), recipeType: object.recipe.type, patch: clone(params) });
}
function applyFields(object, fields, overrides) {
  for (const [key, value] of Object.entries(fields)) {
    if (!EDIT_FIELDS.has(key)) throw fail(`unknown update field: ${key}`);
    if (key === 'material') { if (!record(value)) throw fail('material patch must be an object'); object.material = merge(object.material, value); overrides.push({ op: 'material', target: targetOf(object), patch: clone(value) }); }
    else if (key === 'params') applyParameters(object, value, overrides);
    else { object[key] = clone(value); overrides.push(replayableField(key,value) ? { op: 'fields', target: targetOf(object), patch: { [key]: clone(value) } } : { op: 'blocked', reason: `manual ${key} edit requires an explicit source merge or discard` }); }
  }
}
function execute(doc, operations) {
  const before = nativeEditBaseline(doc);
  const overrides = [], results = [];
  for (const operation of operations) {
    if (!record(operation) || typeof operation.op !== 'string') throw fail('each operation needs an op'); let object;
    if (ASSEMBLY_OPERATIONS.includes(operation.op)) {
      const assembly = applyAssemblyOperation(doc, operation);
      if (assembly.structural) overrides.push({ op: 'blocked', reason: `local ${operation.op} changes module structure or frame and requires an explicit source merge or discard` });
      else { const patch = { module: clone(assembly.object.module) }; overrides.push(moduleHasSource(patch.module) ? {op:'blocked',reason:'local module source requires an explicit source merge or discard'} : { op: 'fields', target: targetOf(assembly.object), patch }); }
      results.push(assembly.result);
      continue;
    }
    switch (operation.op) {
      case 'parameters': operationKeys(operation, ['op', 'id', 'params']); object = locate(doc, operation.id).object; applyParameters(object, operation.params, overrides); break;
      case 'transform': { operationKeys(operation, ['op', 'id', 'position', 'rotation', 'scale']); object = locate(doc, operation.id).object; const patch = Object.fromEntries(['position', 'rotation', 'scale'].filter((key) => own(operation, key)).map((key) => [key, operation[key]])); if (!Object.keys(patch).length) throw fail('transform needs position, rotation or scale'); applyFields(object, patch, overrides); break; }
      case 'material': operationKeys(operation, ['op', 'id', 'material']); object = locate(doc, operation.id).object; applyFields(object, { material: operation.material }, overrides); break;
      case 'modifiers': operationKeys(operation, ['op', 'id', 'modifiers']); object = locate(doc, operation.id).object; applyFields(object, { modifiers: operation.modifiers }, overrides); break;
      case 'visibility': operationKeys(operation, ['op', 'id', 'visible']); object = locate(doc, operation.id).object; applyFields(object, { visible: operation.visible }, overrides); break;
      case 'update': { operationKeys(operation, ['op', 'id', ...EDIT_FIELDS]); object = locate(doc, operation.id).object; const fields = Object.fromEntries(Object.entries(operation).filter(([key]) => key !== 'id' && key !== 'op')); if (!Object.keys(fields).length) throw fail('update needs an editable field'); applyFields(object, fields, overrides); break; }
      case 'mesh_move':
      case 'mesh_extrude': {
        const isMove = operation.op === 'mesh_move';
        operationKeys(operation, isMove ? ['op', 'id', 'vertices', 'delta', 'bake'] : ['op', 'id', 'faces', 'distance', 'bake']);
        if (operation.bake !== true) throw fail(`${operation.op} requires bake:true to convert the base mesh to manual topology`);
        object = locate(doc, operation.id).object;
        if (object.parts !== undefined) throw fail(`${operation.op} targets a leaf; choose a compound child to retain materials and identity`);
        // Both tools edit the local base, before this leaf's modifiers and TRS.
        const base = evaluateObject(object, { world: false, base: true });
        const moved = isMove ? moveVertices(base.topology, { vertices: operation.vertices, delta: operation.delta })
          : extrudeFaces(base.topology, { faces: operation.faces, distance: operation.distance });
        if (object.recipe && !object.originRecipe) object.originRecipe = clone(object.recipe);
        delete object.recipe; delete object.geometryData; object.topology = moved; object.kind = 'custom';
        overrides.push({ op: 'blocked', reason: `manual topology on ${object.semanticId || object.id} cannot be replayed across generated topology` });
        break;
      }
      case 'add': {
        operationKeys(operation, ['op', 'object', 'parentId']); if (!record(operation.object)) throw fail('add.object must be an object'); object = clone(operation.object);
        const reserved = [];
        visitObjects([object], (part) => { if (!record(part)) throw fail('add parts must be objects'); if (part.id) reserved.push(part.id); });
        const allocate = allocator(doc, reserved), assign = (part) => { if (!part.id) part.id = allocate(); if (part.parts !== undefined) { if (!Array.isArray(part.parts)) throw fail('parts must be an array'); for (const child of part.parts) assign(child); } }; assign(object);
        const knownIds = new Set(), knownSemanticIds = new Set();
        visitObjects(doc.objects, (part) => { knownIds.add(part.id); if (part.semanticId) knownSemanticIds.add(part.semanticId); });
        visitObjects([object], (part) => {
          text(part.id, 'object.id');
          if (knownIds.has(part.id)) throw fail(`duplicate object id: ${part.id}`);
          knownIds.add(part.id);
          if (part.semanticId !== undefined) { text(part.semanticId, 'object.semanticId'); if (knownSemanticIds.has(part.semanticId)) throw fail(`duplicate semanticId: ${part.semanticId}`); knownSemanticIds.add(part.semanticId); }
        });
        if (operation.parentId !== undefined) { const parent = locate(doc, operation.parentId).object; if (!Array.isArray(parent.parts)) throw fail('parentId must identify a compound with parts[]'); parent.parts.push(object); } else doc.objects.push(object); overrides.push({ op: 'blocked', reason: 'local added objects require an explicit source merge or discard' }); break;
      }
      case 'remove': { operationKeys(operation, ['op', 'id']); const found = locate(doc, operation.id); object = found.object; found.siblings.splice(found.siblings.indexOf(object), 1); overrides.push({ op: 'blocked', reason: 'local object removal requires an explicit source merge or discard' }); break; }
      case 'duplicate': {
        operationKeys(operation, ['op', 'id', 'newId', 'name', 'parentId']); const found = locate(doc, operation.id), allocate = allocator(doc, operation.newId === undefined ? [] : [operation.newId]); object = clone(found.object); const assign = (part, root = false) => { part.id = root && operation.newId !== undefined ? text(operation.newId, 'newId') : allocate(); if (part.semanticId) part.semanticId = `${part.semanticId}:copy:${part.id}`; for (const child of part.parts || []) assign(child); }; assign(object, true); object.name = operation.name !== undefined ? operation.name : `${object.name || object.kind} copy`;
        if (operation.parentId !== undefined) { const parent = locate(doc, operation.parentId).object; if (!Array.isArray(parent.parts)) throw fail('parentId must identify a compound with parts[]'); parent.parts.push(object); } else found.siblings.splice(found.siblings.indexOf(found.object) + 1, 0, object); overrides.push({ op: 'blocked', reason: 'local duplicated objects require an explicit source merge or discard' }); break;
      }
      default: throw fail(`unknown operation: ${operation.op}`);
    }
    results.push({ op: operation.op, id: object.id });
  }
  assertNativeEdits(before, doc);
  return { doc: normalizeDoc(doc, { copy: false }), overrides, results };
}
function replay(doc, overrides) {
  const out = clone(doc);
  for (const override of nativeOverrideView(overrides)) {
    if (override.op === 'blocked') throw fail(override.reason, 'override_conflict');
    if (override.op === 'document') { for (const [key, value] of Object.entries(override.patch)) { if (['version', 'objects', 'nextId'].includes(key)) throw fail('invalid document override', 'storage'); out[key] = record(value) ? merge(out[key], value) : clone(value); } continue; }
    const object = locateTarget(out, override.target);
    if (override.op === 'parameters') { if ((object.recipe?.type || object.kind) !== override.recipeType) throw fail(`recipe changed for ${object.id}; cannot replay parameters`, 'override_conflict'); applyParameters(object, override.patch, []); }
    else if (override.op === 'material') object.material = merge(object.material, override.patch);
    else if (override.op === 'fields') { for (const [key, value] of Object.entries(override.patch)) { if (!REPLAY_FIELDS.has(key)) throw fail(`unsupported persisted override: ${key}`, 'storage'); object[key] = clone(value); } }
    else throw fail(`unsupported persisted override: ${override.op}`, 'storage');
  }
  return normalizeDoc(out);
}
function difference(before, after) {
  if (!record(before) || !record(after)) return { patch: clone(after), deleted: false }; const patch = {}; let deleted = Object.keys(before).some((key) => !own(after, key));
  for (const [key, value] of Object.entries(after)) { if (same(before[key], value)) continue; const diff = record(value) && record(before[key]) ? difference(before[key], value) : { patch: clone(value), deleted: false }; patch[key] = diff.patch; deleted ||= diff.deleted; } return { patch, deleted };
}
// Snapshot native field references before synchronous operations replace them.
// Avoid copying materialized buffers merely to check a transform/material edit.
function nativeEditBaseline(doc) {
  const out = new Map();
  visitObjects(doc.objects, object => { if (isNativeRecipe(object.recipe)) out.set(object.id, { recipe: object.recipe, params: object.params, ...Object.fromEntries(NATIVE_CACHE_OBJECT_FIELDS.map(key => [key, object[key]])) }); });
  return out;
}
function assertNativeEdits(before, doc, materialized = false) {
  if (materialized) return; // Internal backend caller has validated all exports.
  visitObjects(doc.objects, object => {
    const previous = before.get(object.id);
    if (!previous || !isNativeRecipe(object.recipe)) return;
    const oldParams = previous.recipe.params, params = object.recipe.params;
    if (!same(nativeSourceParams(oldParams), nativeSourceParams(params))) { const field=Object.keys({...nativeSourceParams(oldParams),...nativeSourceParams(params)}).find(key=>!same(oldParams[key],params[key]));throw Object.assign(fail('native source changes require backend materialization before committing', 'native_evaluation_required'),{detail:{objectId:object.id,field:'recipe.params.'+field,next:{op:'update',id:object.id}}}); }
    const cacheField=NATIVE_CACHE_PARAMS.find(key=>!same(oldParams[key],params[key])),objectField=NATIVE_CACHE_OBJECT_FIELDS.find(key=>!same(previous[key],object[key])),mirrorField=NATIVE_CACHE_PARAMS.find(key=>!same(previous.params?.[key],object.params?.[key]));if(cacheField||objectField||mirrorField)throw Object.assign(fail('native materialization fields are read-only; edit source/features through native operations', 'native_cache_edit'),{detail:{objectId:object.id,field:cacheField?'recipe.params.'+cacheField:objectField||'params.'+mirrorField,next:{op:'inspect',id:object.id}}});
  });
}
function editOverrides(before, after) {
  const overrides = [], old = new Map(), fresh = new Map(); visitObjects(before.objects, (object, _siblings, parent) => old.set(object.id, { object, parent: parent?.id })); visitObjects(after.objects, (object, _siblings, parent) => fresh.set(object.id, { object, parent: parent?.id }));
  const order = (objects) => objects.map((object) => ({ id: object.id, ...(object.parts ? { parts: order(object.parts) } : {}) }));
  if (!same(order(before.objects), order(after.objects)) || old.size !== fresh.size || [...old].some(([id, item]) => !fresh.has(id) || fresh.get(id).parent !== item.parent)) overrides.push({ op: 'blocked', reason: 'local source tree structure or order changed' });
  for (const [id, item] of fresh) {
    const previous = old.get(id)?.object, object = item.object; if (!previous) continue;
    for (const key of new Set([...Object.keys(previous), ...Object.keys(object)])) {
      if (key === 'parts' || same(previous[key], object[key])) continue;
      const native = isNativeRecipe(previous.recipe) && isNativeRecipe(object.recipe);
      if (native && NATIVE_CACHE_OBJECT_FIELDS.includes(key)) continue;
      if (key === 'material' || key === 'recipe' || key === 'params') {
        if (key === 'recipe' && previous.recipe?.type !== object.recipe?.type) { overrides.push({ op: 'blocked', reason: 'local recipe type changed' }); continue; }
        if (key === 'recipe') {
          const descriptor = (recipe) => Object.fromEntries(Object.entries(recipe).filter(([field]) => field !== 'params'));
          if (!same(descriptor(previous.recipe), descriptor(object.recipe))) overrides.push({ op: 'blocked', reason: 'local recipe descriptor changed beyond parameters' });
        }
        if (key === 'params' && object.recipe) {
          // params is a compatibility mirror. A distinct edit is source data,
          // not permission to throw it away merely because a recipe also exists.
          if (!(native ? same(nativeSourceParams(object.params), nativeSourceParams(object.recipe.params || {})) : same(object.params, object.recipe.params || {}))) overrides.push({ op: 'blocked', reason: 'local compatibility params changed independently of recipe.params' });
          continue;
        }
        const base = key === 'recipe' ? (native ? nativeSourceParams(previous.recipe.params) : previous.recipe.params || {}) : previous[key] || {}, next = key === 'recipe' ? (native ? nativeSourceParams(object.recipe.params) : object.recipe.params || {}) : object[key] || {}, diff = difference(base, next);
        if (diff.deleted) overrides.push({ op: 'blocked', reason: `local ${key} field deletion cannot be replayed safely` }); else if (Object.keys(diff.patch).length) overrides.push({ op: key === 'material' ? 'material' : 'parameters', target: targetOf(object), patch: diff.patch, ...(key === 'material' ? {} : { recipeType: object.recipe?.type || object.kind }) });
      } else if (replayableField(key,object[key])) { if (!own(object, key)) overrides.push({ op: 'blocked', reason: `local ${key} field deletion cannot be replayed safely` }); else overrides.push({ op: 'fields', target: targetOf(object), patch: { [key]: clone(object[key]) } }); } else overrides.push({ op: 'blocked', reason: `local ${key} source edit cannot be replayed safely` });
    }
  }
  const root = (doc) => Object.fromEntries(Object.entries(doc).filter(([key]) => !['objects', 'nextId'].includes(key))), diff = difference(root(before), root(after)); if (diff.deleted) overrides.push({ op: 'blocked', reason: 'local document field deletion cannot be replayed safely' }); else if (Object.keys(diff.patch).length) overrides.push({ op: 'document', patch: diff.patch }); return overrides;
}

/** Synchronous source-of-truth. doc.meta.script is always inert metadata. */
export function createWorkspace({ storePath, assetsPath, fixedIdentity = false, initialDoc = { version: 1, nextId: 1, objects: [] }, historyLimit = 30 } = {}) {
  if (typeof storePath !== 'string' || !storePath) throw fail('createWorkspace requires an explicit storePath');
  if (typeof fixedIdentity !== 'boolean') throw fail('fixedIdentity must be boolean');
  if (!Number.isSafeInteger(historyLimit) || historyLimit < 1 || historyLimit > 200) throw fail('historyLimit must be an integer in [1,200]');
  const storage = createStorage(storePath, { assetsPath }), store = storage.store, listeners = new Set();
  const initial = () => normalizeDoc(typeof initialDoc === 'function' ? initialDoc() : initialDoc);
  const legacyScenes = new Map();
  let raw = storage.read(), storageWarnings = [], state;
  const existed = raw !== null;
  if (existed) {
    if (record(raw) && raw.schema !== undefined) state = validateEnvelope(raw, storage, legacyScenes);
    else {
      const scene = normalizeDoc(raw, { copy: false });
      state = { schema: SCHEMA, schemaVersion: 3, scene, sceneRef: contentHash(scene), title: titleOf(scene), revision: 1, assetId: uuidForLegacyStore(store), contentHash: contentHash(scene), initialized: true, updatedAt: fs.statSync(store).mtime.toISOString(), history: [], overrides: [], projectHeads: {}, projectKey: projectKey(scene) };
      legacyScenes.set(state.contentHash, scene);
    }
  } else {
    const scene = initial(), hash = contentHash(scene);
    state = { schema: SCHEMA, schemaVersion: 3, scene, sceneRef: hash, title: titleOf(scene), revision: 0, assetId: randomUUID(), contentHash: hash, initialized: false, updatedAt: null, history: [], overrides: [], projectHeads: {}, projectKey: projectKey(scene) };
    legacyScenes.set(hash, scene);
  }
  raw = null;
  if (!state.headId) { const entry = historyEntry(state, existed ? 'migrated legacy scene' : 'initial', [], null); state.headId = entry.id; state.history = [entry]; saveHead(state); }
  // Only these lightweight containers are copied for a transaction. Existing
  // history/head entries and their overrides are immutable after publication.
  const copyState = () => ({ ...state, history: state.history.slice(), projectHeads: { ...state.projectHeads } });
  const rawMetadata = () => ({ assetId: state.assetId, revision: state.revision, contentHash: state.contentHash, initialized: state.initialized, updatedAt: state.updatedAt, title: state.title, project: state.projectKey });
  const rawSnapshot = () => ({ doc: clone(state.scene), revision: state.revision, contentHash: state.contentHash, assetId: state.assetId, initialized: state.initialized, updatedAt: state.updatedAt, ...(storageWarnings.length ? { storageWarnings: [...storageWarnings] } : {}) });
  const loadScene = (ref) => {
    if (ref === state.contentHash) return clone(state.scene);
    if (legacyScenes.has(ref)) return clone(legacyScenes.get(ref));
    return storage.readScene(ref);
  };
  const loadOverrides = value => {
    const overrides = isMetadataRef(value) ? storage.readMetadata(value) : value;
    if (!Array.isArray(overrides)) throw fail('persisted overrides must be an array', 'storage');
    return nativeOverrideView(overrides);
  };
  const publicEntry = (entry, includeDoc = false) => {
    const { overrides, ops, ...metadata } = entry;
    const out = clone(metadata);
    if (isMetadataRef(ops)) Object.defineProperty(out, 'ops', { enumerable: true, configurable: true, get: () => storage.readMetadata(ops) });
    else out.ops = clone(ops);
    if (includeDoc) Object.defineProperty(out, 'doc', { enumerable: true, configurable: true, get: () => loadScene(entry.sceneRef) });
    return out;
  };
  const optionsCopy = (value) => dataCopy(value, { optionalRootFields: [...CONTROLS, 'source', 'rebase', 'preserveOverrides', 'discardOverrides', 'newAsset', 'nativeMaterialized', 'includeDoc', 'allAssets', 'assetId', 'key', 'id'] });
  const guards = (input = {}) => {
    if (!record(input)) throw fail('options must be an object');
    const options = {};
    for (const key of ['expectedRevision', 'expectedHash']) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor) continue;
      if (!own(descriptor, 'value')) throw fail(`accessor field is not workspace data: ${key}`);
      if (descriptor.value !== undefined) options[key] = dataCopy(descriptor.value);
    }
    if (own(options, 'expectedRevision')) { if (!Number.isSafeInteger(options.expectedRevision) || options.expectedRevision < 0) throw fail('expectedRevision must be a non-negative integer'); if (options.expectedRevision !== state.revision) { const error = fail('revision conflict', 'conflict'); error.current = rawMetadata(); throw error; } }
    if (own(options, 'expectedHash')) { if (typeof options.expectedHash !== 'string' || !/^[0-9a-f]{64}$/.test(options.expectedHash)) throw fail('expectedHash must be a SHA256 hex string'); if (options.expectedHash !== state.contentHash) { const error = fail('contentHash conflict', 'conflict'); error.current = rawMetadata(); throw error; } }
  };
  const optionsOf = (value, extra = {}) => { if (value === undefined) return optionsCopy(extra); if (typeof value === 'number') return { ...optionsCopy(extra), expectedRevision: value }; if (!record(value)) throw fail('expectedRevision/options must be a revision number or object'); return { ...optionsCopy(value), ...optionsCopy(extra) }; };
  const notify = () => { for (const listener of [...listeners]) { try { listener(); } catch { /* subscribers cannot undo a committed transaction */ } } };
  const persist = (next) => {
    if (next.scene.meta?.materialLibrary !== undefined) validateMaterialLibrary(next.scene);
    if (next.scene.meta?.editingRelations?.length) {
      const result = checkEditingRelations(next.scene);
      if (!result.ok || !result.complete) throw Object.assign(fail('declared editing relations conflict or cannot be proven', 'relation_conflict'), { detail: result });
    }
    next = nativeManifestView(next);
    const { scene, ...manifest } = next;
    const pending = new Map(legacyScenes);
    if (scene !== state.scene || legacyScenes.size) pending.set(next.contentHash, scene);
    try { storageWarnings = storage.commit(manifest, pending); }
    catch (error) {
      if (error.code === 'conflict') { error.current = rawMetadata(); error.reason = 'store_changed'; }
      throw error;
    }
    state = { ...next, ...storage.metadataManifest(), scene: next.scene };
    legacyScenes.clear();
  };
  const commit = (next, { label, ops, parent = state.headId, extra = {} } = {}) => {
    if (state.revision >= Number.MAX_SAFE_INTEGER) throw fail('revision counter exhausted');
    next.revision = state.revision + 1; next.initialized = true; next.updatedAt = new Date().toISOString(); next.contentHash = contentHash(next.scene); next.sceneRef = next.contentHash; next.title = titleOf(next.scene);
    const entry = historyEntry(next, label, ops || [], parent, extra); next.headId = entry.id; next.history.push(entry); next.history = next.history.slice(-historyLimit); saveHead(next);
    if (Object.keys(next.projectHeads).length > 1_000) throw fail('project head budget exceeded');
    persist(next);
    const committedSnapshot = rawSnapshot();
    notify();
    return committedSnapshot;
  };
  const snapshot = (options = {}) => { guards(options); return rawSnapshot(); };
  const metadata = (options = {}) => { guards(options); return rawMetadata(); };
  const apply = (request = {}) => {
    request = dataCopy(request, { optionalRootFields: CONTROLS }); guards(request);
    if (!Array.isArray(request.operations) || !request.operations.length || request.operations.length > MAX_OPERATIONS) throw fail('operations must contain 1..1000 operations');
    const next = copyState(), result = execute(clone(state.scene), request.operations); next.scene = result.doc; next.overrides = addOverrides(loadOverrides(next.overrides), result.overrides);
    const snap = commit(next, { label: request.label || 'apply', ops: request.operations }); return { ...snap, results: result.results };
  };
  const candidate = (request = {}) => {
    request = dataCopy(request, { optionalRootFields: CONTROLS }); guards(request);
    if (!Array.isArray(request.operations) || !request.operations.length || request.operations.length > MAX_OPERATIONS) throw fail('operations must contain 1..1000 operations');
    const result = execute(clone(state.scene), request.operations); return { doc: result.doc, contentHash: contentHash(result.doc), assetId: state.assetId, revision: state.revision, baseRevision: state.revision, baseHash: state.contentHash, results: result.results, candidate: true };
  };
  const prepareReplace = (input, revisionOrOptions, extraOptions) => {
    const options = optionsOf(revisionOrOptions, extraOptions); guards(options);
    if (state.revision >= Number.MAX_SAFE_INTEGER) throw fail('revision counter exhausted');
    if (options.source !== undefined && !['edit', 'generated'].includes(options.source)) throw fail('source must be edit or generated');
    for (const key of ['rebase', 'preserveOverrides', 'discardOverrides', 'newAsset', 'nativeMaterialized']) if (options[key] !== undefined && typeof options[key] !== 'boolean') throw fail(`${key} must be boolean`);
    if (options.nativeMaterialized && options.source !== 'edit') throw fail('nativeMaterialized is only valid for a backend source:edit replacement');
    if (options.discardOverrides && (options.rebase || options.preserveOverrides)) throw fail('discardOverrides cannot be combined with rebase/preserveOverrides');
    if (fixedIdentity && options.newAsset === true) throw fail('fixed-identity workspace cannot create another asset; use the resource registry create/fork methods', 'fixed_identity');
    let scene = normalizeDoc(input); const next = copyState(), key = projectKey(scene), switching = !fixedIdentity && (options.newAsset === true || (key !== null && key !== state.projectKey)); let baseline = state;
    if (fixedIdentity) next.projectKey = key;
    if (options.newAsset && key !== null && Object.values(state.projectHeads).some((head) => head.key === key)) throw fail('newAsset needs a distinct project key', 'project_conflict');
    if (switching) {
      if (options.source === 'edit') throw fail('source:edit cannot switch project identity');
      const existing = options.newAsset ? null : Object.values(state.projectHeads).find((head) => head.key === key);
      if (existing) { next.assetId = existing.assetId; next.projectKey = existing.key; next.overrides = existing.overrides; baseline = { overrides: existing.overrides, headId: existing.headId, contentHash: existing.contentHash }; }
      else { next.assetId = randomUUID(); next.projectKey = key; next.overrides = []; baseline = { scene, overrides: [], headId: null, contentHash: contentHash(scene) }; }
    }
    if (options.source === 'edit') { assertNativeEdits(nativeEditBaseline(state.scene), scene, options.nativeMaterialized === true); next.overrides = addOverrides(loadOverrides(next.overrides), editOverrides(state.scene, scene)); }
    else if (options.discardOverrides) next.overrides = [];
    else if (metadataArrayLength(baseline.overrides) && contentHash(scene) !== baseline.contentHash) {
      const overrides = loadOverrides(baseline.overrides);
      if (options.rebase || options.preserveOverrides) scene = replay(scene, overrides);
      else {
        let lossless = false; try { lossless = contentHash(replay(scene, overrides)) === contentHash(scene); } catch (error) { if (!['override_conflict', 'native_evaluation_required'].includes(error.code)) throw error; }
        if (!lossless) { const error = fail('replace would discard local edits; use rebase/preserveOverrides or explicitly discardOverrides', 'override_conflict'); error.current = rawMetadata(); throw error; }
      }
    }
    next.scene = scene;
    if (Object.keys(next.projectHeads).length + (own(next.projectHeads, next.assetId) ? 0 : 1) > 1_000) throw fail('project head budget exceeded');
    return { next, options, baseline };
  };
  const replace = (input, revisionOrOptions, extraOptions) => {
    const { next, options, baseline } = prepareReplace(input, revisionOrOptions, extraOptions);
    return commit(next, { label: options.label || 'replace', ops: [{ op: 'replace', source: options.source || 'generated', rebase: Boolean(options.rebase || options.preserveOverrides), discardOverrides: Boolean(options.discardOverrides) }], parent: baseline.headId });
  };
  // Identical preparation/override checks to replace, without committing,
  // notifying, adding history, updating project heads or touching storage.
  const candidateReplace = (input, revisionOrOptions, extraOptions) => {
    const { next } = prepareReplace(input, revisionOrOptions, extraOptions);
    return { doc: clone(next.scene), contentHash: contentHash(next.scene), assetId: state.assetId, revision: state.revision, baseRevision: state.revision, baseHash: state.contentHash, candidate: true };
  };
  const wrapper = (op, args = {}, extra = {}) => {
    args = dataCopy(args, { optionalRootFields: CONTROLS }); extra = optionsCopy(extra); if (!record(args) || !record(extra)) throw fail('operation arguments/options must be objects');
    const controls = { ...Object.fromEntries(CONTROLS.filter((key) => own(args, key)).map((key) => [key, args[key]])), ...extra }, fields = Object.fromEntries(Object.entries(args).filter(([key]) => !CONTROLS.includes(key)));
    let operation;
    if (op === 'add') { const object = { kind: 'box', ...fields }; if (!own(object, 'position')) object.position = [0, object.kind === 'plane' ? .01 : .5, 0]; operation = { op, object }; }
    else operation = { ...fields, op };
    const result = apply({ ...controls, operations: [operation] }); if (op !== 'remove') result.object = clone(locate(result.doc, result.results[0].id).object); return result;
  };
  const history = (options = {}) => { options = optionsCopy(options); guards(options); const entries = options.allAssets ? state.history : state.history.filter((entry) => entry.assetId === (options.assetId || state.assetId)); return entries.map((entry) => publicEntry(entry, options.includeDoc === true)); };
  const checkpoint = (labelOrOptions = {}) => {
    const options = typeof labelOrOptions === 'string' ? { label: labelOrOptions } : optionsCopy(labelOrOptions); guards(options);
    const next = copyState(), index = next.history.findIndex((item) => item.id === state.headId);
    if (index < 0) throw fail('current history head is unavailable', 'storage');
    const entry = { ...next.history[index] }; next.history[index] = entry;
    if (options.label !== undefined) { if (typeof options.label !== 'string' || options.label.length > 4096) throw fail('checkpoint label must be a string within the text budget'); entry.label = options.label; }
    persist(next); notify(); return publicEntry(entry, options.includeDoc === true);
  };
  const restore = (id, revisionOrOptions, extraOptions) => {
    if (record(id)) { const request = optionsCopy(id); id = request.id; revisionOrOptions = { ...request, ...optionsOf(revisionOrOptions) }; }
    const options = optionsOf(revisionOrOptions, extraOptions); guards(options); text(id, 'history id'); const entry = state.history.find((item) => item.id === id); if (!entry) throw fail(`history snapshot is unavailable: ${id}`, 'not_found');
    if (fixedIdentity && entry.assetId !== state.assetId) throw fail('fixed-identity workspace cannot restore another asset; open or fork it through the resource registry', 'fixed_identity');
    const next = copyState(); next.overrides = loadOverrides(entry.overrides); next.scene = normalizeDoc(loadScene(entry.sceneRef), { copy: false }); next.assetId = entry.assetId; next.projectKey = entry.projectKey;
    return commit(next, { label: options.label || `restore: ${entry.label || id}`, ops: [{ op: 'restore', id }], extra: { restoredFrom: id } });
  };
  const projects = (options = {}) => { guards(options); return Object.values(state.projectHeads).map((head) => ({ key: head.key || head.assetId, assetId: head.assetId, title: typeof head.title === 'string' ? head.title : 'Untitled', revision: head.revision, contentHash: head.contentHash, updatedAt: head.updatedAt, current: head.assetId === state.assetId })); };
  const openProject = (key, options = {}) => {
    if (record(key)) { const request = optionsCopy(key); options = { ...request, ...optionsCopy(options) }; key = request.key || request.assetId; } options = optionsOf(options); guards(options); text(key, 'project key'); const head = (own(state.projectHeads, key) ? state.projectHeads[key] : null) || Object.values(state.projectHeads).find((item) => item.key === key); if (!head) throw fail(`saved project does not exist: ${key}`, 'not_found');
    if (head.assetId === state.assetId) return rawSnapshot();
    if (fixedIdentity) throw fail('fixed-identity workspace cannot switch assets; use the resource registry open method', 'fixed_identity');
    const next = copyState(); next.overrides = loadOverrides(head.overrides); next.scene = normalizeDoc(loadScene(head.sceneRef), { copy: false }); next.assetId = head.assetId; next.projectKey = head.key;
    return commit(next, { label: options.label || `open project: ${key}`, ops: [{ op: 'openProject', key }], parent: head.headId });
  };
  return { snapshot, metadata, replace, candidateReplace, add: (args, options) => wrapper('add', args, options), update: (args, options) => wrapper('update', args, options), remove: (args, options) => wrapper('remove', args, options), apply, candidate, checkpoint, history, restore, projects, openProject, initial: (options = {}) => { guards(options); return initial(); }, store, storageStats: () => storage.stats(), storageFingerprint: () => storage.fingerprint(), subscribe: (listener) => { if (typeof listener !== 'function') throw fail('subscribe expects a function'); listeners.add(listener); return () => listeners.delete(listener); } };
}
export default createWorkspace;
