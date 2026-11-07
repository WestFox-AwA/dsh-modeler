import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { splitScene, createGeometryCache, SCENE_SCHEMA, assertSafePath, regularStat, readBoundedBuffer } from './geometry-cache.js';
import { nativeManifestView } from './native-state.js';
import { createMetadataStore, metadataArrays, isMetadataRef, METADATA_OBJECT_LIMIT } from './metadata-store.js';

// Source document budget excludes the separately persisted geometry payloads.
// Logical scene identity remains hashContent(the fully hydrated document).
export function sceneSourceByteLength(doc) { return canonicalByteLength(splitScene(doc).sourceDoc); }

export const STORAGE_SCHEMA = 'dsh-modeler/workspace';
export const STORAGE_VERSION = 3;
export const SCENE_BYTE_LIMIT = 96 * 1024 * 1024;
export const METADATA_BYTE_LIMIT = 64 * 1024 * 1024;
// Large v2 files must be split offline before the plugin is enabled. Parsing a
// several-hundred-MiB JSON history inside the Host is the incident's root cause.
export const LEGACY_READ_LIMIT = 64 * 1024 * 1024;
const HASH = /^[0-9a-f]{64}$/;
const storageError = (message, code = 'storage') => Object.assign(new Error(message), { code });

// Same canonical bytes as JSON.stringify's recursively key-sorted object
// replacer, without constructing a second object tree or the entire JSON text.
// JSON enumerates integer property names first even after lexical insertion.
function orderedKeys(object) {
  const numeric = [], other = [];
  for (const key of Object.keys(object)) {
    const n = Number(key);
    if (String(n) === key && Number.isInteger(n) && n >= 0 && n < 4294967295) numeric.push(key);
    else other.push(key);
  }
  numeric.sort((a, b) => Number(a) - Number(b)); other.sort();
  return numeric.concat(other);
}
export function visitCanonical(value, consume) {
  let buffer = '';
  const append = (text) => {
    buffer += text;
    if (buffer.length >= 32768) { consume(buffer); buffer = ''; }
  };
  const visit = (item) => {
    if (item === null) { append('null'); return; }
    if (typeof item !== 'object') {
      const text = JSON.stringify(item);
      if (text === undefined) throw storageError('non-JSON canonical content', 'validation');
      append(text); return;
    }
    if (Array.isArray(item)) {
      append('[');
      for (let i = 0; i < item.length; i++) { if (i) append(','); visit(item[i]); }
      append(']'); return;
    }
    append('{'); let first = true;
    for (const key of orderedKeys(item)) {
      if (!first) append(','); first = false;
      append(JSON.stringify(key)); append(':'); visit(item[key]);
    }
    append('}');
  };
  visit(value);
  if (buffer) consume(buffer);
}
export function hashContent(value) {
  const hash = createHash('sha256'); visitCanonical(value, (chunk) => hash.update(chunk)); return hash.digest('hex');
}
export function canonicalByteLength(value) {
  let bytes = 0; visitCanonical(value, (chunk) => { bytes += Buffer.byteLength(chunk); }); return bytes;
}
export function fileFingerprint(file) {
  let fd;
  try { fd = fs.openSync(file, 'r'); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const hash = createHash('sha256'), buffer = Buffer.allocUnsafe(128 * 1024);
  try { let size; while ((size = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, size)); }
  finally { fs.closeSync(fd); }
  return hash.digest('hex');
}
function boundedJson(file, limit) {
  try { return JSON.parse(readBoundedBuffer(file, limit).toString('utf8')); }
  catch (error) { if (error instanceof SyntaxError) throw storageError(`cannot parse workspace data: ${error.message}`); throw error; }
}
const ENVELOPE_BYTE_LIMIT = SCENE_BYTE_LIMIT + 24 * 1024 * 1024;
const SPACE_RESERVE = 256 * 1024 * 1024;
// New envelopes start with schema. Legacy v1 scenes retain their stat-only
// assertRef fast path, so checkpoints never deserialize historical mesh arrays.
function isEnvelopeFile(file) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try { const probe = Buffer.alloc(512), n = fs.readSync(fd, probe, 0, probe.length, 0); return !/^\s*\{\s*"version"\s*:\s*1\s*[,}]/.test(probe.toString('utf8', 0, n)); }
  finally { fs.closeSync(fd); }
}

/** Content-addressed scenes and per-leaf payloads; metadata rename is commit. */
export function createStorage(storePath, { assetsPath } = {}) {
  if (assetsPath !== undefined && (typeof assetsPath !== 'string' || !assetsPath)) throw storageError('assetsPath must be a non-empty path', 'validation');
  const store = path.resolve(storePath), assets = assetsPath === undefined ? `${store}.assets` : path.resolve(assetsPath);
  assertSafePath(store); assertSafePath(assets);
  let observed = fileFingerprint(store), lastCommit = null, committedManifest = null;
  const geometry = createGeometryCache(assets, { hashContent, canonicalByteLength, visitCanonical, sourceLimit: SCENE_BYTE_LIMIT });
  const metadata = createMetadataStore(assets, { hashContent, canonicalByteLength, visitCanonical });
  const scenePath = (ref) => {
    if (typeof ref !== 'string' || !HASH.test(ref)) throw storageError('invalid sceneRef; expected canonical SHA256');
    return path.join(assets, `${ref}.json`);
  };
  const read = () => {
    if (observed === null) return null;
    const stat = regularStat(store, Infinity);
    if (stat.size > LEGACY_READ_LIMIT) throw storageError('large legacy workspace requires offline streaming migration before loading', 'storage_migration_required');
    return boundedJson(store, METADATA_BYTE_LIMIT);
  };
  const readScene = (ref, {verify = true} = {}) => {
    const stored = boundedJson(scenePath(ref), ENVELOPE_BYTE_LIMIT);
    const envelope = stored?.schema === SCENE_SCHEMA;
    if (!envelope && regularStat(scenePath(ref), SCENE_BYTE_LIMIT).size > SCENE_BYTE_LIMIT) throw storageError('legacy scene byte budget exceeded');
    const doc = envelope ? geometry.hydrate(stored, ref, {verify}) : stored;
    if (verify && hashContent(doc) !== ref) throw storageError(`scene blob contentHash mismatch: ${ref}`);
    return doc;
  };
  const assertRef = (ref) => {
    const file = scenePath(ref); regularStat(file, ENVELOPE_BYTE_LIMIT);
    if (isEnvelopeFile(file)) {
      const envelope = boundedJson(file, ENVELOPE_BYTE_LIMIT);
      if (envelope?.schema === SCENE_SCHEMA) geometry.validateEnvelope(envelope, ref);
      else regularStat(file, SCENE_BYTE_LIMIT);
    } else regularStat(file, SCENE_BYTE_LIMIT);
  };
  const commit = (manifest, scenes = []) => {
    // Only this new metadata write is cleaned. Referenced scene bytes/hashes
    // and all previous immutable source/cache payloads remain untouched.
    manifest = nativeManifestView(manifest);
    const metadataPlan = metadata.prepare(manifest);
    manifest = metadataPlan.manifest;
    const payload = JSON.stringify(manifest) + '\n';
    if (Buffer.byteLength(payload) > METADATA_BYTE_LIMIT) throw storageError('workspace metadata byte budget exceeded');
    assertSafePath(store); assertSafePath(assets);
    fs.mkdirSync(path.dirname(store), { recursive: true });
    const lock = `${store}.lock`, temp = `${store}.${process.pid}.${randomUUID()}.tmp`;
    const leftovers = new Set(); let locked = false, committed = false, thrown; const warnings = [];
    const checkDisk = () => {
      assertSafePath(store);
      if (fileFingerprint(store) !== observed) throw storageError('workspace store changed externally; reopen before writing', 'conflict');
    };
    const writeAtomic = (file, value, maximum, isMetadata = false) => {
      const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value) + '\n');
      if (bytes.length > maximum) throw storageError('workspace scene byte budget exceeded');
      assertSafePath(file);
      const temporary = isMetadata ? temp : `${file}.${process.pid}.${randomUUID()}.tmp`;
      const fd = fs.openSync(temporary, 'wx', 0o600); leftovers.add(temporary);
      try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      if (isMetadata) checkDisk();
      fs.renameSync(temporary, file); leftovers.delete(temporary);
    };
    const spaceCheck = (directory, bytes) => {
      if (typeof fs.statfsSync !== 'function') throw storageError('storage disk space check is unavailable', 'storage_space_check');
      const stat = fs.statfsSync(directory, { bigint: true });
      if (BigInt(stat.bavail) * BigInt(stat.bsize) < BigInt(bytes) + BigInt(SPACE_RESERVE)) throw storageError('insufficient storage space (256 MiB reserve plus new data required)', 'storage_no_space');
    };
    try {
      let fd;
      try { fd = fs.openSync(lock, 'wx', 0o600); locked = true; }
      catch (error) { if (error.code === 'EEXIST') throw storageError('workspace store is locked by another writer', 'store_locked'); throw error; }
      fs.closeSync(fd); checkDisk();
      for (const ref of metadataPlan.external.values()) metadata.verify(ref);
      const plans = new Map(), blobs = new Map();
      const summary = { sourceBytes: 0, envelopeBytes: 0, geometryBlobs: 0, geometryBytes: 0, geometryRawBytes: 0, newGeometryBytes: 0, newSceneBytes: 0, sources: { count: 0, bytes: 0, rawBytes: 0, newBytes: 0 }, caches: { count: 0, bytes: 0, rawBytes: 0, newBytes: 0 } };
      const byKind = { source: new Set(), cache: new Set() };
      for (const [ref, doc] of scenes) {
        const file = scenePath(ref);
        if (hashContent(doc) !== ref) throw storageError('scene to persist does not match sceneRef');
        if (regularStat(file, ENVELOPE_BYTE_LIMIT, true)) { readScene(ref); continue; }
        const plan = geometry.prepare(doc, ref);
        plan.file = file; plan.text = JSON.stringify(plan.envelope) + '\n';
        const bytes = Buffer.byteLength(plan.text);
        if (bytes > ENVELOPE_BYTE_LIMIT) throw storageError('scene envelope byte budget exceeded');
        if (plans.has(ref)) continue;
        plans.set(ref, plan); summary.sourceBytes += plan.sourceBytes; summary.envelopeBytes += bytes; summary.newSceneBytes += bytes;
        for (const [hash, blob] of plan.blobs) if (!blobs.has(hash)) blobs.set(hash, blob);
        for (const d of plan.envelope.payloads) {
          if (byKind[d.kind].has(d.hash)) continue; byKind[d.kind].add(d.hash);
          const group = summary[d.kind === 'source' ? 'sources' : 'caches'];
          group.count++; group.bytes += d.bytes; group.rawBytes += d.rawBytes;
          if (!plan.blobs.get(d.hash).existing) group.newBytes += d.bytes;
        }
      }
      for (const blob of blobs.values()) {
        summary.geometryBlobs++; summary.geometryBytes += blob.bytes; summary.geometryRawBytes += blob.rawBytes;
        if (!blob.existing) summary.newGeometryBytes += blob.bytes;
      }
      const metadataBytes = Buffer.byteLength(payload);
      if (plans.size || metadataPlan.blobs.size) {
        assertSafePath(assets); fs.mkdirSync(assets, { recursive: true }); assertSafePath(assets);
        // The store and explicit assetsPath may be on different filesystems.
        const assetsStat = fs.statSync(assets), storeStat = fs.statSync(path.dirname(store));
        spaceCheck(assets, summary.newSceneBytes + summary.newGeometryBytes + metadataPlan.summary.references.newBytes + (assetsStat.dev === storeStat.dev ? metadataBytes : 0));
        if (assetsStat.dev !== storeStat.dev) spaceCheck(path.dirname(store), metadataBytes);
      } else spaceCheck(path.dirname(store), metadataBytes);
      if (blobs.size) { assertSafePath(geometry.directory); fs.mkdirSync(geometry.directory, { recursive: true }); assertSafePath(geometry.directory); }
      for (const blob of blobs.values()) if (!blob.existing) {
        // An independently committed identical payload is immutable and reused.
        if (regularStat(blob.file, blob.bytes, true)) { geometry.verifyBlob({ ...blob, kind: 'source' }); continue; }
        writeAtomic(blob.file, blob.buffer, blob.bytes);
      }
      if (metadataPlan.blobs.size) { assertSafePath(metadata.directory); fs.mkdirSync(metadata.directory, { recursive: true }); assertSafePath(metadata.directory); }
      for (const blob of metadataPlan.blobs.values()) if (!blob.existing) {
        if (regularStat(blob.file, METADATA_OBJECT_LIMIT, true)) { metadata.verify(blob.ref); continue; }
        writeAtomic(blob.file, blob.buffer, METADATA_OBJECT_LIMIT);
      }
      for (const ref of metadataArrays(manifest)) if (isMetadataRef(ref)) metadata.verify(ref);
      for (const plan of plans.values()) writeAtomic(plan.file, plan.text, ENVELOPE_BYTE_LIMIT);
      const refs = new Set([manifest.sceneRef]);
      for (const entry of manifest.history) refs.add(entry.sceneRef);
      for (const head of Object.values(manifest.projectHeads)) refs.add(head.sceneRef);
      for (const ref of refs) assertRef(ref);
      writeAtomic(store, payload, METADATA_BYTE_LIMIT, true);
      committed = true;
      observed = createHash('sha256').update(payload).digest('hex');
      lastCommit = { ...summary, metadataBytes, metadata: metadataPlan.summary };
      committedManifest = manifest;
    } catch (error) { thrown = error; }
    finally {
      if (locked) leftovers.add(lock);
      for (const file of leftovers) {
        try { fs.unlinkSync(file); }
        catch (error) {
          if (error.code === 'ENOENT') continue;
          if (committed) warnings.push(`committed, but could not clean storage sidecar ${path.basename(file)}: ${error.message}`);
          else if (thrown) (thrown.cleanupErrors ||= []).push(error.message);
          else thrown = error;
        }
      }
    }
    if (thrown) throw thrown;
    return warnings;
  };
  const stats = () => ({ scope: 'this storage instance / last successful commit; not a store-wide scan', ...geometry.stats(), metadata: metadata.stats(), lastCommit: lastCommit ? structuredClone(lastCommit) : null });
  return { store, assets, read, readScene, scenePath, assertRef, commit, readMetadata: metadata.read, assertMetadataRef: metadata.assertRef, metadataFile: metadata.fileFor, metadataChildRefs: metadata.childRefs, metadataManifest: () => committedManifest, fingerprint: () => observed, stats, storageStats: stats };
}
