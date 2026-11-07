import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createWorkspace, normalizeDoc } from './workspace.js';
import { createStorage, hashContent, fileFingerprint, METADATA_BYTE_LIMIT, SCENE_BYTE_LIMIT, STORAGE_SCHEMA } from './storage.js';
import { isMetadataRef, validateEncodedFields, validateMetadataArray, metadataArrays, METADATA_OBJECT_LIMIT } from './metadata-store.js';
import { assertSafePath, readBoundedBuffer, SCENE_SCHEMA, PAYLOAD_RAW_LIMIT } from './geometry-cache.js';

export const RESOURCE_SCHEMA = 'dsh-modeler/resources';
export const RESOURCE_VERSION = 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const copy = (value) => JSON.parse(JSON.stringify(value));
const fail = (message, code = 'validation') => Object.assign(new Error(message), { code });
const emptyDoc = () => ({ version: 1, objects: [], meta: { title: '新建模型' } });
const titleOf = (doc) => typeof doc.meta?.title === 'string' ? doc.meta.title : typeof doc.title === 'string' ? doc.title : 'Untitled';
const projectOf = (doc) => typeof doc.meta?.project === 'string' && doc.meta.project ? doc.meta.project : null;
const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const relativeStore = (id) => `resources/${id}.json`;
function sessionKey(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:@-]{0,199}$/.test(value) || value === '.' || value === '..' || FORBIDDEN.has(value)) throw fail('sessionId must be a safe, non-empty native session identifier');
  return value;
}
function assetKey(value) {
  if (typeof value !== 'string' || !UUID.test(value)) throw fail('assetId must be a resource UUID');
  return value;
}
function titleOption(value) {
  if (value !== undefined && (typeof value !== 'string' || !value.trim() || value.length > 4096)) throw fail('title must be a non-empty string of at most 4096 characters');
  return value;
}
function safeData(value, depth = 0) {
  if (depth > 80) throw fail('resource metadata is too deeply nested', 'storage');
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return;
  if (!record(value) && !Array.isArray(value)) throw fail('resource metadata must contain JSON values', 'storage');
  for (const [key, item] of Object.entries(value)) { if (FORBIDDEN.has(key)) throw fail('unsafe resource metadata field', 'storage'); safeData(item, depth + 1); }
}
function regularFile(file, maximum) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximum) throw fail(`invalid or oversized metadata/object file: ${path.basename(file)}`, 'storage');
  return stat;
}
function readJson(file) {
  regularFile(file, METADATA_BYTE_LIMIT);
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { if (error instanceof SyntaxError) throw fail(`cannot parse resource metadata: ${path.basename(file)}`, 'storage'); throw error; }
  safeData(value); return value;
}
function validateManifest(raw) {
  if (!record(raw) || raw.schema !== STORAGE_SCHEMA || raw.schemaVersion !== 3) throw fail('resource import/load requires schema3 workspace metadata', 'storage_migration_required');
  const encoded = validateEncodedFields(raw);
  if (!UUID.test(raw.assetId) || !Number.isSafeInteger(raw.revision) || raw.revision < 0 || !HASH.test(raw.contentHash) || raw.sceneRef !== raw.contentHash || typeof raw.initialized !== 'boolean' || (raw.updatedAt !== null && !validDate(raw.updatedAt)) || !Array.isArray(raw.history) || !record(raw.projectHeads) || typeof raw.headId !== 'string' || (raw.projectKey !== null && typeof raw.projectKey !== 'string')) throw fail('invalid resource workspace metadata', 'storage');
  validateMetadataArray(raw.overrides, encoded);
  const ids = new Set();
  for (const entry of raw.history) {
    if (!record(entry) || typeof entry.id !== 'string' || ids.has(entry.id) || !UUID.test(entry.assetId) || !Number.isSafeInteger(entry.revision) || entry.revision < 0 || entry.revision > raw.revision || !HASH.test(entry.hash) || entry.hash !== entry.contentHash || entry.sceneRef !== entry.hash || own(entry, 'doc')) throw fail('invalid resource history metadata', 'storage');
    validateMetadataArray(entry.ops, encoded); validateMetadataArray(entry.overrides, encoded);
    ids.add(entry.id);
  }
  for (const [id, head] of Object.entries(raw.projectHeads)) {
    if (!record(head) || !UUID.test(id) || head.assetId !== id || !Number.isSafeInteger(head.revision) || head.revision < 0 || head.revision > raw.revision || !HASH.test(head.contentHash) || head.sceneRef !== head.contentHash || typeof head.headId !== 'string' || (head.key !== null && typeof head.key !== 'string') || own(head, 'scene')) throw fail('invalid resource project head metadata', 'storage');
    validateMetadataArray(head.overrides, encoded);
  }
  const head = raw.projectHeads[raw.assetId], entry = raw.history.find((item) => item.id === raw.headId);
  if (!head || head.contentHash !== raw.contentHash || head.headId !== raw.headId || head.revision !== raw.revision || head.key !== raw.projectKey || !entry || entry.assetId !== raw.assetId || entry.hash !== raw.contentHash || entry.revision !== raw.revision) throw fail('resource current/history head mismatch', 'storage');
  if (raw.resource !== undefined) {
    if (!record(raw.resource) || !validDate(raw.resource.createdAt) || (raw.resource.ownerSessionId !== null && sessionKey(raw.resource.ownerSessionId) !== raw.resource.ownerSessionId) || (raw.resource.origin !== undefined && !record(raw.resource.origin))) throw fail('invalid resource ownership metadata', 'storage');
  }
  return raw;
}
function blankCatalog() { return { schema: RESOURCE_SCHEMA, schemaVersion: RESOURCE_VERSION, resources: {}, bindings: {} }; }
function validateCatalog(raw) {
  if (!record(raw) || raw.schema !== RESOURCE_SCHEMA || raw.schemaVersion !== RESOURCE_VERSION || !record(raw.resources) || !record(raw.bindings)) throw fail('unsupported resource catalog schema', 'storage');
  for (const [id, item] of Object.entries(raw.resources)) {
    if (!UUID.test(id) || !record(item) || item.assetId !== id || item.storePath !== relativeStore(id) || typeof item.title !== 'string' || !Number.isSafeInteger(item.revision) || item.revision < 0 || !HASH.test(item.contentHash) || !validDate(item.createdAt) || !validDate(item.updatedAt) || (item.ownerSessionId !== null && sessionKey(item.ownerSessionId) !== item.ownerSessionId) || (item.origin !== undefined && !record(item.origin))) throw fail('invalid resource catalog entry or unsafe storePath', 'storage');
  }
  for (const [session, id] of Object.entries(raw.bindings)) { sessionKey(session); assetKey(id); }
  return raw;
}
function guard(metadata, options = {}) {
  if (!record(options)) throw fail('options must be an object');
  if (options.expectedRevision !== undefined && (!Number.isSafeInteger(options.expectedRevision) || options.expectedRevision < 0)) throw fail('expectedRevision must be a non-negative integer');
  if (options.expectedHash !== undefined && (typeof options.expectedHash !== 'string' || !HASH.test(options.expectedHash))) throw fail('expectedHash must be a SHA256 hex string');
  if ((options.expectedRevision !== undefined && options.expectedRevision !== metadata.revision) || (options.expectedHash !== undefined && options.expectedHash !== metadata.contentHash)) throw Object.assign(fail('resource revision/contentHash conflict', 'conflict'), { current: metadata });
}

/**
 * Host-only metadata registry. Trusted Host routing supplies native execution
 * session IDs or an explicit UI session selection; model arguments must never
 * override a native caller. Facades capture an asset ID, while every method
 * resolves its current workspace through a two-entry LRU.
 */
export function createResources({ directory, legacyStorePath, initialDoc = emptyDoc } = {}) {
  if (typeof directory !== 'string' || !directory || directory.includes('\0')) throw fail('createResources requires an explicit directory');
  if (legacyStorePath !== undefined && (typeof legacyStorePath !== 'string' || !legacyStorePath || legacyStorePath.includes('\0'))) throw fail('legacyStorePath must be a non-empty path');
  const root = path.resolve(directory), catalogPath = path.join(root, 'catalog.json'), metadataPath = path.join(root, 'resources'), assetsPath = path.join(root, 'objects');
  const legacyPath = legacyStorePath === undefined ? null : path.resolve(legacyStorePath);
  if (legacyPath === catalogPath || legacyPath?.startsWith(metadataPath + path.sep) || legacyPath?.startsWith(assetsPath + path.sep)) throw fail('legacyStorePath must be separate from resource registry files');
  const cache = new Map(), listeners = new Map(), warnings = [], pendingBindings = new Map(), pendingResources=new Set(), manifests=new Map(), MAX_CACHED_MANIFEST=512*1024;let catalogMemo=null;
  const stamp=file=>{try{const s=fs.statSync(file);return [s.dev,s.ino,s.size,s.mtimeMs,s.ctimeMs].join(':');}catch(e){if(e.code==='ENOENT')return null;throw e;}};
  const warn = (error) => { const message = `resource committed; catalog refresh pending: ${error.message || error}`; if (warnings.at(-1) !== message) warnings.push(message); if (warnings.length > 32) warnings.shift(); return message; };
  const ensureDirectory = (target) => { fs.mkdirSync(target, { recursive: true }); const stat = fs.lstatSync(target); if (!stat.isDirectory() || stat.isSymbolicLink()) throw fail(`unsafe resource directory: ${path.basename(target)}`, 'storage'); };
  ensureDirectory(root); ensureDirectory(metadataPath); ensureDirectory(assetsPath);
  const storeFor = (id) => path.join(metadataPath, `${assetKey(id)}.json`);
  const readManifest = (id) => {
    const file=storeFor(id),key=stamp(file),cached=manifests.get(id);if(cached?.key===key)return cached.raw;let raw;
    try { raw = validateManifest(readJson(storeFor(id))); }
    catch (error) { if (error.code === 'ENOENT') throw fail(`resource does not exist: ${id}`, 'not_found'); throw error; }
    if (raw.assetId !== id || Object.keys(raw.projectHeads).length !== 1 || raw.history.some((entry) => entry.assetId !== id)) throw fail('registry workspace contains another resource identity', 'storage');
    if(Number(key.split(':')[2])<=MAX_CACHED_MANIFEST){manifests.delete(id);manifests.set(id,{key,raw});while(manifests.size>8)manifests.delete(manifests.keys().next().value);}return raw;
  };
  const entryFor = (raw, previous) => {
    const details = raw.resource, stat = details ? null : fs.statSync(storeFor(raw.assetId));
    const createdAt = details?.createdAt || previous?.createdAt || stat.birthtime.toISOString();
    return { assetId: raw.assetId, title: typeof raw.title === 'string' ? raw.title : raw.projectHeads[raw.assetId].title || 'Untitled', revision: raw.revision, contentHash: raw.contentHash, projectKey:raw.projectKey||null, storePath: relativeStore(raw.assetId), createdAt, updatedAt: raw.updatedAt || createdAt, ownerSessionId: details ? details.ownerSessionId : previous?.ownerSessionId || null, ...((details?.origin || previous?.origin) ? { origin: copy(details?.origin || previous.origin) } : {}) };
  };
  const scalar = (raw, previous) => ({ ...entryFor(raw, previous), initialized: raw.initialized, project: raw.projectKey, updatedAt: raw.updatedAt });
  const readCatalog = () => {const key=stamp(catalogPath);if(catalogMemo?.key===key)return catalogMemo.raw;try{const raw=validateCatalog(readJson(catalogPath));catalogMemo={key,raw};return raw;}catch(error){if(error.code==='ENOENT')return null;throw error;}};
  const writeCatalog = (next, observed) => {
    validateCatalog(next); next.stamp = indexStamp().stamp;
    const payload = JSON.stringify(next) + '\n', temporary = `${catalogPath}.${process.pid}.${randomUUID()}.tmp`;
    if (Buffer.byteLength(payload) > METADATA_BYTE_LIMIT) throw fail('resource catalog exceeds metadata byte budget', 'storage');
    let written = false, thrown;
    try {
      const fd = fs.openSync(temporary, 'wx', 0o600);
      try { fs.writeFileSync(fd, payload); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      if (fileFingerprint(catalogPath) !== observed) throw fail('resource catalog changed externally during commit', 'conflict');
      fs.renameSync(temporary, catalogPath); written = true;
    } catch (error) { error.catalogWrite = true; thrown = error; }
    finally { try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') { if (written) warn(error); else if (thrown) (thrown.cleanupErrors ||= []).push(error.message); else thrown = error; } } }
    if (thrown) throw thrown;
  };
  const locked = (fn) => {
    const lock = `${catalogPath}.lock`; let fd;
    try { fd = fs.openSync(lock, 'wx', 0o600); }
    catch (error) { if (error.code === 'EEXIST') error = fail('resource catalog is locked by another writer', 'store_locked'); error.catalogWrite = true; throw error; }
    fs.closeSync(fd); let result, thrown;
    try { const latest = copy(readCatalog() || blankCatalog()); result = fn(latest, fileFingerprint(catalogPath)); }
    catch (error) { thrown = error; }
    finally { try { fs.unlinkSync(lock); } catch (error) { if (error.code !== 'ENOENT') { if (thrown) (thrown.cleanupErrors ||= []).push(error.message); else warn(error); } } }
    if (thrown) throw thrown; return result;
  };
  const scan = (base) => {
    const next = { ...base, resources: { ...base.resources }, bindings: { ...base.bindings } }, manifests = new Map();
    for (const name of fs.readdirSync(metadataPath)) {
      if (!name.endsWith('.json')) continue;
      const id = name.slice(0, -5); if (!UUID.test(id)) throw fail('unsafe file in resource metadata directory', 'storage');
      const raw = readManifest(id); manifests.set(id, raw); next.resources[id] = entryFor(raw, base.resources[id]);
    }
    for (const id of Object.keys(next.resources)) if (!manifests.has(id)) throw fail(`catalog resource metadata is missing: ${id}`, 'storage');
    for (const id of Object.values(next.bindings)) if (!manifests.has(id)) throw fail(`session binding resource metadata is missing: ${id}`, 'storage');
    return { catalog: next, manifests };
  };
  const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
  const flushPending = (catalog) => {
    for(const id of pendingResources)catalog.resources[id]=entryFor(readManifest(id),catalog.resources[id]);
    for (const [session, pending] of pendingBindings) {
      catalog.resources[pending.assetId]=entryFor(readManifest(pending.assetId),catalog.resources[pending.assetId]);const current = catalog.bindings[session] || null;
      if (current === pending.previous || current === pending.assetId) catalog.bindings[session] = pending.assetId;
      else { pendingBindings.delete(session); warn(fail(`binding for ${session} changed in another registry; pending binding was not applied`, 'conflict')); }
    }
  };
  const indexStamp = () => {
    const hash = createHash('sha256'); let count = 0;
    for (const name of fs.readdirSync(metadataPath).sort()) {
      if (!name.endsWith('.json')) continue;
      const stat = fs.statSync(path.join(metadataPath, name)); count++;
      hash.update(name + ':' + stat.size + ':' + stat.mtimeMs + '|');
    }
    return { count, stamp: hash.digest('hex') };
  };
  const view = ({ repair = false } = {}) => {
    // The catalog is the read index. A full scan runs only for pending writes or
    // when a requested repair sees the manifest count drift; polling never scans.
    const base=readCatalog()||blankCatalog();let drift=false;
    if(repair){const index=indexStamp();drift=Object.keys(base.resources).length!==index.count||base.stamp!==index.stamp;}
    if(!pendingBindings.size&&!pendingResources.size&&!drift)return {catalog:base};
    const next=copy(base);flushPending(next);if(repair){try{return locked((latest,observed)=>{const current=scan(latest);flushPending(current.catalog);if(changed(latest,current.catalog))writeCatalog(current.catalog,observed);pendingBindings.clear();pendingResources.clear();return {catalog:current.catalog};});}catch(error){if(!error.catalogWrite)throw error;warn(error);}}
    return {catalog:next};
  };
  const refsOf = (raw) => new Set([raw.sceneRef, ...raw.history.map((entry) => entry.sceneRef), ...Object.values(raw.projectHeads).map((head) => head.sceneRef)]);
  const persistManifest = (raw, scenes = []) => createStorage(storeFor(raw.assetId), { assetsPath }).commit(raw, scenes);
  const branchManifest = (source, head, id, entries, resource) => {
    const selected = entries.filter((entry) => entry.revision <= head.revision).slice(-40).map((entry) => ({ ...copy(entry), assetId: id, projectKey: entry.projectKey === undefined ? head.key : entry.projectKey, sceneRef: entry.hash }));
    let current = selected.find((entry) => entry.id === head.headId);
    if (!current) {
      current = { id: head.headId, assetId: id, revision: head.revision, hash: head.contentHash, contentHash: head.contentHash, sceneRef: head.contentHash, title: head.title || 'Untitled', parent: selected.at(-1)?.id || null, label: 'imported legacy head', ops: [], createdAt: head.updatedAt, overrides: copy(head.overrides), projectKey: head.key };
      selected.push(current); if (selected.length > 40) selected.shift();
    }
    const ownHead = { ...copy(head), assetId: id };
    return { schema: STORAGE_SCHEMA, schemaVersion: 3, assetId: id, revision: head.revision, contentHash: head.contentHash, sceneRef: head.contentHash, title: head.title || current.title || 'Untitled', ...(source.encodedFields ? { encodedFields: copy(source.encodedFields) } : {}), initialized: source.initialized, updatedAt: head.updatedAt, headId: head.headId, projectKey: head.key, overrides: copy(head.overrides), history: selected, projectHeads: { [id]: ownHead }, resource };
  };
  const importLegacy = (catalog) => {
    if (!legacyPath || !fs.existsSync(legacyPath)) return catalog;
    const legacy = validateManifest(readJson(legacyPath)), imported = scan(catalog).catalog;
    const sourceAssets = `${legacyPath}.assets`, sourceStorage = createStorage(legacyPath), importedMetadata = new Set(), activeMetadata = new Set();
    let importedMetadataRawBytes = 0;
    const linkImmutable = (source, target, maximum) => {
      assertSafePath(source); assertSafePath(target); regularFile(source, maximum);
      ensureDirectory(path.dirname(target));
      if (fs.existsSync(target)) { regularFile(target, maximum); return; }
      try { fs.linkSync(source, target); }
      catch (error) {
        if (error.code === 'EEXIST') { regularFile(target, maximum); return; }
        if (!['EXDEV', 'EPERM', 'EACCES', 'ENOTSUP', 'EOPNOTSUPP', 'EMLINK'].includes(error.code)) throw error;
        try { fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL); } catch (copyError) { if (copyError.code !== 'EEXIST') throw copyError; regularFile(target, maximum); }
      }
    };
    const importMetadata = (ref, depth = 0) => {
      if (!isMetadataRef(ref) || importedMetadata.has(ref.hash)) return;
      if (depth > 80 || activeMetadata.has(ref.hash) || importedMetadata.size >= 65536) throw fail('metadata import cycle/depth/count budget', 'storage');
      importedMetadataRawBytes += ref.rawBytes;
      if (importedMetadataRawBytes > 512 * 1024 * 1024) throw fail('metadata import decompression total budget', 'storage');
      activeMetadata.add(ref.hash);
      const source = sourceStorage.metadataFile(ref), target = path.join(assetsPath, '.metadata', ref.hash + '.json.gz');
      // Enumerate only the immutable descriptor DAG, never hydrate its source.
      const children = sourceStorage.metadataChildRefs(ref);
      for (const child of children) importMetadata(child, depth + 1);
      linkImmutable(source, target, METADATA_OBJECT_LIMIT); importedMetadata.add(ref.hash); activeMetadata.delete(ref.hash);
    };
    const importBlob = ref => {
      if (!HASH.test(ref)) throw fail('invalid legacy sceneRef', 'storage');
      const source = path.join(sourceAssets, ref + '.json'), target = path.join(assetsPath, ref + '.json');
      linkImmutable(source, target, SCENE_BYTE_LIMIT);
      const fd = fs.openSync(source, 'r'), prefix = Buffer.alloc(512); let n;
      try { n = fs.readSync(fd, prefix, 0, prefix.length, 0); } finally { fs.closeSync(fd); }
      if (/^\s*\{\s*"schema"\s*:\s*"dsh-modeler\/scene"/.test(prefix.toString('utf8', 0, n))) {
        const envelope = JSON.parse(readBoundedBuffer(source, SCENE_BYTE_LIMIT).toString('utf8'));
        if (envelope.schema !== SCENE_SCHEMA || !Array.isArray(envelope.payloads)) throw fail('invalid imported scene envelope', 'storage');
        for (const payload of envelope.payloads) {
          if (!HASH.test(payload.hash)) throw fail('invalid imported geometry hash', 'storage');
          linkImmutable(path.join(sourceAssets, '.geometry', payload.hash + '.json.gz'), path.join(assetsPath, '.geometry', payload.hash + '.json.gz'), PAYLOAD_RAW_LIMIT);
        }
      }
    };
    const saveImport = manifest => {
      if (!fs.existsSync(storeFor(manifest.assetId))) {
        for (const value of metadataArrays(manifest)) importMetadata(value);
        for (const ref of refsOf(manifest)) importBlob(ref);
        persistManifest(manifest);
      }
      imported.resources[manifest.assetId] = entryFor(readManifest(manifest.assetId), imported.resources[manifest.assetId]);
    };
    const legacyCreated = fs.statSync(legacyPath).mtime.toISOString();
    for (const head of Object.values(legacy.projectHeads)) {
      const entries = legacy.history.filter((entry) => entry.assetId === head.assetId);
      saveImport(branchManifest(legacy, head, head.assetId, entries, { createdAt: entries[0]?.createdAt || head.updatedAt || legacyCreated, ownerSessionId: null, origin: { type: 'legacy', legacyAssetId: head.assetId } }));
    }
    const lastByTitle = new Map();
    for (const entry of legacy.history) if (typeof entry.title === 'string' && entry.title) lastByTitle.set(entry.title, entry);
    const headHashes = new Set(Object.values(legacy.projectHeads).map((head) => head.contentHash));
    for (const [title, entry] of lastByTitle) {
      if (headHashes.has(entry.hash)) continue;
      const prior = Object.values(imported.resources).find((item) => item.origin?.type === 'recovered' && item.origin.legacyAssetId === entry.assetId && item.origin.historyId === entry.id && item.origin.hash === entry.hash);
      if (prior) continue;
      const id = randomUUID(), related = legacy.history.filter((item) => item.assetId === entry.assetId && item.title === title && item.revision <= entry.revision);
      const head = { assetId: id, key: entry.projectKey ?? null, revision: entry.revision, contentHash: entry.hash, sceneRef: entry.hash, title, updatedAt: entry.createdAt, headId: entry.id, overrides: copy(entry.overrides) };
      saveImport(branchManifest(legacy, head, id, related, { createdAt: related[0]?.createdAt || entry.createdAt || legacyCreated, ownerSessionId: null, origin: { type: 'recovered', legacyAssetId: entry.assetId, historyId: entry.id, revision: entry.revision, hash: entry.hash } }));
    }
    return imported;
  };
  // Only an absent catalog triggers legacy import. It never edits the legacy
  // manifest or hydrates historical geometry. Envelope/reference descriptors
  // alone identify the immutable dependencies needed by the target registry.
  // Startup touches the index only. A present catalog is authoritative for reads;
  // a missing row is repaired on demand by view({repair:true}) or a metadata miss.
  locked((latest, observed) => {
    if (observed !== null) return;
    const imported = importLegacy(latest), repaired = scan(imported).catalog;
    if (changed(latest, repaired)) writeCatalog(repaired, observed);
  });
  manifests.clear();
  const metadataForAsset = (id, options = {}) => { const raw = readManifest(assetKey(id)), meta = scalar(raw); guard(meta, options); return meta; };
  const repairIndex = () => { try { view({ repair: true }); } catch (error) { if (!error.catalogWrite) throw error; warn(error); } };
  const refresh = (id) => {
    assetKey(id); readManifest(id);
    return locked((latest, observed) => { const raw = readManifest(id), item = entryFor(raw, latest.resources[id]); const next = { ...latest, resources: { ...latest.resources, [id]: item }, bindings: { ...latest.bindings } }; flushPending(next); if (changed(latest, next)) writeCatalog(next, observed); pendingBindings.clear(); return copy(item); });
  };
  const workspaceFor = (id) => {
    readManifest(id); const fingerprint = stamp(storeFor(id)), cached = cache.get(id);
    if (cached?.fingerprint === fingerprint) { cache.delete(id); cache.set(id, cached); return cached; }
    cache.delete(id);
    if (cache.size >= 2) cache.delete(cache.keys().next().value);
    const workspace = createWorkspace({ storePath: storeFor(id), assetsPath, fixedIdentity: true, historyLimit: 40, initialDoc });
    const loaded = { workspace, fingerprint: stamp(storeFor(id)) }; cache.set(id, loaded); return loaded;
  };
  const notify = (id) => { for (const listener of [...(listeners.get(id) || [])]) { try { listener(); } catch { /* A subscriber cannot undo a committed resource. */ } } };
  const forAsset = (id) => {
    assetKey(id); readManifest(id);
    const invoke = (method, args, mutation = false) => {
      const cached = workspaceFor(id), result = cached.workspace[method](...args);
      if (mutation) {
        // Capture the actual resource receipt before catalog maintenance or any
        // reentrant subscriber. An index failure is not a workspace rollback.
        const maintenanceWarnings = [];
        try { if(fileFingerprint(storeFor(id))===cached.workspace.storageFingerprint())cached.fingerprint=stamp(storeFor(id));else cache.delete(id);refresh(id); }
        catch (error) { pendingResources.add(id);maintenanceWarnings.push(warn(error)); }
        if (maintenanceWarnings.length && result && typeof result === 'object') result.storageWarnings = [...(result.storageWarnings || []), ...maintenanceWarnings];
        notify(id);
      }
      return result;
    };
    const facade = {
      assetId: id, store: storeFor(id), metadata: (options) => metadataForAsset(id, options),
      storageStats: () => invoke('storageStats', []), snapshot: (...args) => invoke('snapshot', args), initial: (...args) => invoke('initial', args),
      candidate: (...args) => invoke('candidate', args), candidateReplace:(...args)=>invoke('candidateReplace',args),
      history: (options = {}) => {
        const raw = readManifest(id); guard(scalar(raw), options);
        return raw.history.filter((entry) => options.allAssets || entry.assetId === (options.assetId || id)).map((entry) => {
          const { overrides, ops, ...metadata } = entry, out = copy(metadata);
          if (isMetadataRef(ops)) Object.defineProperty(out, 'ops', { enumerable: true, configurable: true, get: () => createStorage(storeFor(id), { assetsPath }).readMetadata(ops) });
          else out.ops = copy(ops);
          if (options.includeDoc === true) Object.defineProperty(out, 'doc', { enumerable: true, configurable: true, get: () => createStorage(storeFor(id), { assetsPath }).readScene(entry.sceneRef) });
          return out;
        });
      },
      projects: (options = {}) => { const meta = metadataForAsset(id, options); return [{ key: meta.project || id, assetId: id, title: meta.title, revision: meta.revision, contentHash: meta.contentHash, updatedAt: meta.updatedAt, current: true }]; },
      subscribe: (listener) => {
        if (typeof listener !== 'function') throw fail('subscribe expects a function');
        if (!listeners.has(id)) listeners.set(id, new Set()); listeners.get(id).add(listener);
        return () => { const set = listeners.get(id); set?.delete(listener); if (!set?.size) listeners.delete(id); };
      },
    };
    for (const method of ['replace', 'add', 'update', 'remove', 'apply', 'checkpoint', 'restore', 'openProject']) facade[method] = (...args) => invoke(method, args, true);
    return Object.freeze(facade);
  };
  const metadataForSession = (session) => { const id = binding(session); return id === null ? null : metadataForAsset(id); };
  const initialScene = (doc, title) => {
    const scene = normalizeDoc(doc === undefined ? (typeof initialDoc === 'function' ? initialDoc() : initialDoc) : doc);
    if (title !== undefined) { scene.meta = record(scene.meta) ? scene.meta : {}; scene.meta.title = title; }
    return scene;
  };
  const create = (session, { title, doc, bind=true } = {}, onlyIfMissing = false) => {
    if(typeof bind!=='boolean')throw fail('bind must be boolean');
    sessionKey(session); titleOption(title); let snapshot, committed = false, newId, previous = null;
    try {
      locked((latest, observed) => {
        flushPending(latest); previous = latest.bindings[session] || null;
        if (onlyIfMissing && previous) { newId = previous; return; }
        newId = randomUUID(); const scene = initialScene(doc, title), hash = hashContent(scene), now = new Date().toISOString(), historyId = randomUUID(), key = projectOf(scene);
        const entry = { id: historyId, assetId: newId, revision: 0, hash, contentHash: hash, sceneRef: hash, title: titleOf(scene), parent: null, label: 'initial', ops: [], createdAt: null, overrides: [], projectKey: key };
        const head = { assetId: newId, key, revision: 0, contentHash: hash, sceneRef: hash, title: titleOf(scene), updatedAt: null, headId: historyId, overrides: [] };
        const raw = { schema: STORAGE_SCHEMA, schemaVersion: 3, assetId: newId, revision: 0, contentHash: hash, sceneRef: hash, title: titleOf(scene), initialized: false, updatedAt: null, headId: historyId, projectKey: key, overrides: [], history: [entry], projectHeads: { [newId]: head }, resource: { createdAt: now, ownerSessionId: session } };
        persistManifest(raw, [[hash, scene]]); committed = true;
        latest.resources[newId] = entryFor(raw); if(bind)latest.bindings[session] = newId;
        try { writeCatalog(latest, observed); pendingBindings.clear(); }
        catch (error) { if(bind)pendingBindings.set(session, { assetId: newId, previous }); throw error; }
      });
    } catch (error) { if (!committed) throw error; warn(error); }
    snapshot = forAsset(newId).snapshot();
    if (pendingBindings.has(session)) snapshot.storageWarnings = [...(snapshot.storageWarnings || []), warnings.at(-1)];
    return snapshot;
  };
  const getSession = (session, { create: shouldCreate = true } = {}) => {
    sessionKey(session); if (typeof shouldCreate !== 'boolean') throw fail('create must be boolean');
    let id = binding(session);
    if (!id && shouldCreate) id = create(session, {}, true).assetId;
    return id ? forAsset(id) : null;
  };
  const open = (session, id, options = {}) => {
    sessionKey(session); assetKey(id); if (!record(options)) throw fail('open options must be an object');
    if (own(options, 'expectedBindingAssetId') && options.expectedBindingAssetId !== null) assetKey(options.expectedBindingAssetId);
    // Validate/renderability before publishing the binding. A failed resource
    // load must leave the previous session association intact.
    const snapshot = forAsset(id).snapshot();
    locked((latest, observed) => {
      const current = latest.bindings[session] || null;
      if (own(options, 'expectedBindingAssetId') && current !== options.expectedBindingAssetId) throw Object.assign(fail('session binding changed; reopen against the current binding', 'conflict'), { currentBindingAssetId: current });
      latest.resources[id] = entryFor(readManifest(id), latest.resources[id]); latest.bindings[session] = id;
      writeCatalog(latest, observed); pendingBindings.delete(session);
    });
    return snapshot;
  };
  const fork = (session, sourceId, { title } = {}) => {
    sessionKey(session); assetKey(sourceId); titleOption(title);
    const source = readManifest(sourceId), id = randomUUID(), now = new Date().toISOString();
    const raw = branchManifest(source, source.projectHeads[sourceId], id, source.history, { createdAt: now, ownerSessionId: session, origin: { type: 'fork', assetId: sourceId, revision: source.revision, hash: source.contentHash } });
    const scenes = [];
    if (title !== undefined && title !== raw.title) {
      if (raw.revision >= Number.MAX_SAFE_INTEGER) throw fail('resource revision counter exhausted');
      const doc = createStorage(storeFor(sourceId), { assetsPath }).readScene(source.sceneRef);
      doc.meta = record(doc.meta) ? doc.meta : {}; doc.meta.title = title;
      const hash = hashContent(doc), parent = raw.headId, historyId = randomUUID();
      raw.revision++; raw.initialized = true; raw.updatedAt = now; raw.title = title; raw.contentHash = hash; raw.sceneRef = hash; raw.headId = historyId;
      raw.history.push({ id: historyId, assetId: id, revision: raw.revision, hash, contentHash: hash, sceneRef: hash, title, parent, label: 'fork title', ops: [{ op: 'replace', source: 'generated' }], createdAt: now, overrides: copy(raw.overrides), projectKey: raw.projectKey });
      raw.history = raw.history.slice(-40);
      raw.projectHeads[id] = { ...raw.projectHeads[id], revision: raw.revision, contentHash: hash, sceneRef: hash, title, updatedAt: now, headId: historyId };
      scenes.push([hash, doc]);
    }
    persistManifest(raw, scenes); let maintenanceWarning;
    let previous = null;
    try {
      locked((latest, observed) => { previous = latest.bindings[session] || null; latest.resources[id] = entryFor(readManifest(id)); latest.bindings[session] = id; writeCatalog(latest, observed); pendingBindings.delete(session); });
    } catch (error) { pendingBindings.set(session, { assetId: id, previous }); maintenanceWarning = warn(error); }
    const snapshot = forAsset(id).snapshot(); if (maintenanceWarning) snapshot.storageWarnings = [...(snapshot.storageWarnings || []), maintenanceWarning]; return snapshot;
  };
  const binding = (session) => {
    sessionKey(session);
    let id = view({ repair: pendingBindings.size > 0 }).catalog.bindings[session] || null;
    if (id === null && pendingResources.size) { repairIndex(); id = view().catalog.bindings[session] || null; }
    return id;
  };
  const list = ({ query = '', offset = 0, limit = 50 } = {}) => {
    if (typeof query !== 'string' || query.length > 4096) throw fail('query must be a string of at most 4096 characters');
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw fail('offset/limit must be integers; offset >= 0 and limit in [1,1000]');
    const { catalog } = view({ repair: true }), needle = query.trim().toLocaleLowerCase();
    const all = Object.values(catalog.resources).filter((item) => !needle || [item.title, item.assetId, item.projectKey||''].some((value) => value.toLocaleLowerCase().includes(needle))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.assetId.localeCompare(b.assetId));
    const items = all.slice(offset, offset + limit).map(copy), nextOffset = offset + items.length < all.length ? offset + items.length : null;
    return { items, total: all.length, nextOffset };
  };
  return { getSession, forAsset, list, create, open, fork, binding, metadataForSession, refresh, cacheInfo: () => ({ limit: 2, size: cache.size, assetIds: [...cache.keys()] }), warnings: () => [...warnings], directory: root, catalogPath, assetsPath };
}
export default createResources;
