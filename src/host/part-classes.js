import {createHash} from 'node:crypto';
import {recipeDependencies} from './relations.js';

// Compose ordinary Parts. Geometry, recipes and transforms keep using one kernel.
const referenceKeys = new Set(['target', 'targetId', 'part', 'partId', 'objectId', 'sourceId', 'ownerId', 'parentId', 'instanceId', 'editableId', 'ref', 'reference']);
const referenceLists = new Set(['targets', 'ids', 'wheels', 'pairs', 'references', 'memberIds']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const slug = value => String(value || 'part').normalize('NFKC').replace(/[^\p{L}\p{N}_:-]+/gu, '-').replace(/^-+|-+$/g, '') || 'part';
function identifier(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.startsWith('@')) throw new Error(`${label} needs a nonempty ID without an @ prefix`);
  return value.trim();
}
function assertJson(value, label, active = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return;
  if (!value || typeof value !== 'object' || Object.prototype.toString.call(value) !== (Array.isArray(value) ? '[object Array]' : '[object Object]')) throw new Error(`${label} must contain only serializable JSON values`);
  if (active.has(value)) throw new Error(`${label} must not contain cycles`);
  active.add(value);
  for (const item of Object.values(value)) assertJson(item, label, active);
  active.delete(value);
}
function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  assertJson(value, label);
  return value;
}
function controls(value = []) {
  const list = Array.isArray(value) ? value : Object.entries(object(value, 'controls')).map(([name, spec]) => ({...spec, name}));
  const names = new Set();
  for (const control of list) {
    if (!control || typeof control !== 'object' || typeof control.name !== 'string' || !control.name || typeof control.target !== 'string' || !control.target || typeof control.parameter !== 'string' || !control.parameter) throw new Error('controls need {name,target,parameter} declarations');
    if (names.has(control.name)) throw new Error(`duplicate control name ${control.name}`);
    names.add(control.name);
  }
  return list;
}
// Rewrite reference fields, not descriptions, parameter strings or local names.
function remapReferences(value, resolve, key = '') {
  if (typeof value === 'string') return referenceKeys.has(key) || referenceLists.has(key) || key === 'localIds' ? resolve(value) : value;
  if (Array.isArray(value)) return value.map(item => remapReferences(item, resolve, key));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([field, item]) => [field,
    key === 'localIds' && typeof item === 'string' ? resolve(item) :
    key === 'members' && field === 'id' && typeof item === 'string' ? resolve(item) :
    remapReferences(item, resolve, field)]));
}
function remapRecipe(recipe, resolve) {
  if (!recipe) return;
  recipeDependencies(recipe);
  const p = recipe.params || {};
  if (['surfacePath', 'surfaceAttach', 'mirrorOf','surfaceRegion','surfacePin','formRim'].includes(recipe.type)) p.target = resolve(p.target);
  if (recipe.type === 'clearance') for (const cutter of p.cutters) if (cutter.target !== undefined) cutter.target = resolve(cutter.target);
  if (recipe.type === 'meshBoolean') p.targets = p.targets.map(resolve);
   if (recipe.type === 'pathRepeat' && p.path?.type === 'belt') p.path.wheels = p.path.wheels.map(resolve);
  if (['surfaceAttach', 'clearance', 'pathRepeat','surfacePin'].includes(recipe.type)) remapRecipe(p.source, resolve);
}

/**
 * Install after the ordinary m API has been assembled.
 * defineClass(name, {defaults, role, description, controls, interfaces}, build):
 *   build(effectiveParams, m) returns Parts or an existing module Part. Defaults
 *   merge shallowly; every invocation receives its own JSON copy.
 * instance(name, params, instanceId, {name?, metadata?}) returns a normal Part.
 * module(name, parts, metadata) keeps a responsibility collection's actual tree.
 * Missing local references remain exact external IDs. @id forces external even
 * when a local ID exists; the marker survives nesting until scene export.
 * Controls target leaf recipe fields, never class defaults/parameter snapshots.
 */
export function installPartClasses(api, {Part = api.Part, clone = value => JSON.parse(JSON.stringify(value))} = {}) {
  if (!api || typeof api.merge !== 'function' || typeof api.scene !== 'function' || typeof Part !== 'function') throw new Error('installPartClasses needs the existing Part, merge and scene API');
  if (own(api, '__partClassDefinitions')) return api;
  const registry = new Map();
  const json = (value, label) => { assertJson(value, label); return clone(value); };
  // Retain metadata even with older Part.clone implementations. There is still
  // only the ordinary .parts hierarchy and ordinary geometry evaluation.
  const restoreMetadata = (source, copy) => {
    if (source.module) copy.module = json(source.module, 'module metadata');
    for (let i = 0; i < (source.parts || []).length; i++) restoreMetadata(source.parts[i], copy.parts[i]);
    return copy;
  };
  const copyPart = source => restoreMetadata(source, source.clone());
  api.module = (name, parts, metadata = {}) => {
    object(metadata, 'module metadata');
    const list = (Array.isArray(parts) ? parts.flat(Infinity) : [parts]).filter(Boolean);
    if (!list.length || list.some(part => !(part instanceof Part))) throw new Error('m.module needs one or more existing Parts');
    const root = api.merge(list, String(name || 'Module'));
    for (let i = 0; i < list.length; i++) restoreMetadata(list[i], root.parts[i]);
    root.module = json(metadata, 'module metadata');
    if (root.module.controls !== undefined) root.module.controls = json(controls(root.module.controls), 'controls');
    return root;
  };
  const definitions = () => [...registry.values()].map(entry => clone(entry.descriptor));
  Object.defineProperty(api, '__partClassDefinitions', {value: definitions});
  api.defineClass = (name, spec = {}, buildFn) => {
    name = identifier(name, 'class name');
    if (registry.has(name)) throw new Error(`class already defined in this run: ${name}`);
    object(spec, 'class definition');
    if (typeof buildFn !== 'function') throw new Error('defineClass needs a build function');
    const defaults = json(object(spec.defaults || {}, 'class defaults'), 'class defaults');
    const descriptor = {schema: 1, className: name, defaults, role: spec.role || '', description: spec.description || '', controls: json(controls(spec.controls), 'controls'), interfaces: json(spec.interfaces || [], 'interfaces'), buildSource: Function.prototype.toString.call(buildFn)};
    descriptor.definitionId = `${name}:${createHash('sha256').update(JSON.stringify(descriptor)).digest('hex').slice(0, 16)}`;
    registry.set(name, {descriptor, buildFn});
    return Object.freeze({name, definitionId: descriptor.definitionId, descriptor: clone(descriptor), asFactory: () => (params = {}, instanceId, opts) => api.instance(name, params, instanceId, opts)});
  };
  api.instance = (name, params = {}, instanceId, opts = {}) => {
    const entry = registry.get(name);
    if (!entry) throw new Error(`class is not defined in this run: ${name}`);
    instanceId = identifier(instanceId, 'instanceId');
    object(params, 'instance params'); object(opts, 'instance options');
    const descriptor = entry.descriptor, effective = json({...descriptor.defaults, ...params}, 'effective params');
    const built = entry.buildFn(clone(effective), api);
    const root = built instanceof Part && built.parts && !built.module?.className ? copyPart(built) : api.module(opts.name || name, built);
    if (opts.name !== undefined) root.nameAs(opts.name);
    const previous = root.module || {}, extra = opts.metadata || {};
    object(extra, 'instance metadata');
    root.module = {...previous, ...json(extra, 'instance metadata'), className: name, instanceId, localInstanceId: instanceId, definitionId: descriptor.definitionId, params: effective, paramsState: 'construction-snapshot', role: extra.role ?? descriptor.role ?? previous.role, description: extra.description ?? descriptor.description ?? previous.description,
      controls: json(controls(extra.controls ?? (descriptor.controls.length ? descriptor.controls : previous.controls)), 'controls'), interfaces: json(extra.interfaces ?? (Object.keys(descriptor.interfaces).length ? descriptor.interfaces : previous.interfaces || []), 'interfaces')};
    const entries = [], aliases = new Map(), ids = new Set();
    const alias = (key, id) => {
      if (!key) return;
      if (!aliases.has(key)) aliases.set(key, id);
      else if (aliases.get(key) !== id) aliases.set(key, null);
    };
    const visit = (part, localId, parent, oldId = part.semanticKey) => {
      const id = localId ? `${instanceId}.${localId}` : instanceId;
      if (ids.has(id)) throw new Error(`duplicate local part ID ${localId}; give sibling copies distinct .key(...) values`);
      ids.add(id); alias(oldId, id); alias(localId || '$root', id);
      const record = {part, localId, id, parentId: parent?.id || null, oldId}; entries.push(record);
      const counts = new Map();
      for (const child of part.parts || []) {
        const old = child.semanticKey;
        let segment = old;
        if (old && oldId && old.startsWith(`${oldId}.`)) segment = old.slice(oldId.length + 1);
        if (!segment) { const stem = slug(child.name), n = (counts.get(stem) || 0) + 1; counts.set(stem, n); segment = n === 1 ? stem : `${stem}:${n}`; }
        visit(child, localId ? `${localId}.${segment}` : segment, record, old);
      }
    };
    visit(root, '', null);
    const resolve = id => {
      if (id.startsWith('@')) return id;
      if (aliases.has(id)) { const mapped = aliases.get(id); if (mapped === null) throw new Error(`ambiguous local reference ${id}; use its full local path or @${id} for an external ID`); return mapped; }
      return id;
    };
    for (const record of entries) {
      const part = record.part;
      part.semanticKey = record.id;
      remapRecipe(part.recipe, resolve);
      remapRecipe(part.originRecipe, resolve);
      if (part.directionRoles) part.directionRoles = remapReferences(part.directionRoles, resolve);
      if (part.module) {
        const {params: snapshot, ...metadata} = part.module;
        part.module = remapReferences(metadata, resolve);
        if (snapshot !== undefined) part.module.params = snapshot;
        if (part.module.className) part.module.instanceId = record.id;
      }
    }
    root.module.instanceId = instanceId;
    root.module.localIds = Object.fromEntries(entries.slice(1).map(record => [record.localId, record.id]));
    root.module.members = entries.slice(1).map(({localId, id, parentId}) => ({localId, id, parentId}));
    const descendants = new Map(entries.slice(1).map(({id, part}) => [id, part]));
    for (const control of root.module.controls) {
      const target = descendants.get(control.target);
      if (!target?.recipe || target.parts || !own(target.recipe.params || {}, control.parameter) || ['__proto__', 'prototype', 'constructor'].includes(control.parameter)) throw new Error(`control ${control.name} must target an existing leaf recipe parameter in this instance`);
    }
    return root;
  };
  const originalScene = api.scene;
  api.scene = (title, parts, meta = {}) => {
    const doc = originalScene(title, parts, meta);
    const external = id => id.startsWith('@') ? identifier(id.slice(1), 'external reference') : id;
    const walk = objects => { for (const part of objects || []) {
      remapRecipe(part.recipe, external); remapRecipe(part.originRecipe, external);
      if (part.directionRoles) part.directionRoles = remapReferences(part.directionRoles, external);
      if (part.module) { const {params, ...metadata} = part.module; part.module = remapReferences(metadata, external); if (params !== undefined) part.module.params = params; }
      walk(part.parts);
    }};
    walk(doc.objects);
    if (registry.size) doc.meta = {...doc.meta, classDefinitions: definitions()};
    return doc;
  };
  return api;
}
