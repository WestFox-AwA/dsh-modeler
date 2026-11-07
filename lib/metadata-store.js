import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { regularStat, readBoundedBuffer, validateFiniteJson } from './geometry-cache.js';

export const METADATA_REF_SCHEMA = 'dsh-modeler/metadata-ref';
export const METADATA_OBJECT_SCHEMA = 'dsh-modeler/metadata-object';
export const METADATA_OBJECT_LIMIT = 256 * 1024 * 1024;
const TOTAL_LIMIT = 512 * 1024 * 1024, COUNT_LIMIT = 65536, CHUNK_BYTES = 16384;
const HASH = /^[0-9a-f]{64}$/, FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
const FIELDS = Object.freeze(['overrides', 'history[].overrides', 'history[].ops', 'projectHeads.*.overrides']);
export const METADATA_ENCODING = Object.freeze({ version: 1, codec: 'cas-json-gzip', fields: FIELDS });
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const fail = message => Object.assign(new Error(message), { code: 'storage' });
const stamp = st => [st.dev, st.ino, st.size, st.mtimeMs, st.ctimeMs].join(':');
export const isMetadataRef = value => record(value) && Object.getOwnPropertyDescriptor(value, 'schema')?.value === METADATA_REF_SCHEMA;
export function validateMetadataRef(ref, { array = false } = {}) {
  validateFiniteJson(ref);
  const keys = ['schema', 'version', 'hash', 'bytes', 'rawBytes', 'valueBytes', 'arrayLength'];
  if (!isMetadataRef(ref) || ref.version !== 1 || typeof ref.hash !== 'string' || !HASH.test(ref.hash) || Object.keys(ref).some(key => !keys.includes(key))) throw fail('invalid metadata reference schema/hash');
  for (const key of ['bytes', 'rawBytes', 'valueBytes']) if (!Number.isSafeInteger(ref[key]) || ref[key] < 1 || ref[key] > METADATA_OBJECT_LIMIT) throw fail('metadata reference byte budget exceeded');
  if ((array && !own(ref, 'arrayLength')) || (own(ref, 'arrayLength') && (!Number.isSafeInteger(ref.arrayLength) || ref.arrayLength < 0 || ref.arrayLength > 32000000))) throw fail('invalid metadata reference array length');
  return ref;
}
export function validateEncodedFields(manifest) {
  if (!own(manifest, 'encodedFields')) return false;
  const value = manifest.encodedFields;
  validateFiniteJson(value);
  if (!record(value) || value.version !== 1 || value.codec !== 'cas-json-gzip' || Object.keys(value).length !== 3 || !Array.isArray(value.fields) || value.fields.length !== FIELDS.length || FIELDS.some((key, index) => value.fields[index] !== key)) throw fail('unsupported metadata encodedFields');
  return true;
}
export function metadataArrayLength(value) {
  if (Array.isArray(value)) return value.length;
  return validateMetadataRef(value, { array: true }).arrayLength;
}
export function validateMetadataArray(value, encoded = false) {
  if (Array.isArray(value)) return value;
  if (!encoded) throw fail('metadata reference requires explicit encodedFields');
  return validateMetadataRef(value, { array: true });
}
export function metadataArrays(manifest) {
  return [manifest.overrides, ...manifest.history.flatMap(entry => [entry.overrides, entry.ops]), ...Object.values(manifest.projectHeads).map(head => head.overrides)];
}

/** Durable source/audit DAG. Neither reads nor preparation write or collect data. */
export function createMetadataStore(assets, { hashContent, canonicalByteLength, visitCanonical }) {
  const directory = path.join(assets, '.metadata'), verified = new Map();
  const counters = { reads: 0, readBytes: 0, rawReadBytes: 0, reuse: 0, prepared: 0 };
  const fileFor = ref => path.join(directory, validateMetadataRef(ref).hash + '.json.gz');
  const assertRef = ref => {
    const st = regularStat(fileFor(ref), METADATA_OBJECT_LIMIT);
    if (st.size !== ref.bytes) throw fail('metadata reference size mismatch: ' + ref.hash);
    return st;
  };
  const targetFor = (body, at) => {
    if (!Array.isArray(at) || !at.length || at.length > 80) throw fail('invalid metadata reference path');
    let parent = body;
    for (let i = 0; i < at.length; i++) {
      const key = at[i];
      if ((Array.isArray(parent) ? !Number.isSafeInteger(key) || key < 0 || key >= parent.length : !record(parent) || typeof key !== 'string' || FORBIDDEN.has(key)) || !own(parent, key)) throw fail('unsafe/missing metadata reference path');
      if (i === at.length - 1) { if (parent[key] !== null) throw fail('overlapping metadata reference path'); return { parent, key }; }
      parent = parent[key];
    }
  };
  const readEnvelope = ref => {
    const compressed = readBoundedBuffer(fileFor(ref), METADATA_OBJECT_LIMIT);
    if (compressed.length !== ref.bytes) throw fail('metadata reference size mismatch: ' + ref.hash);
    let raw, envelope;
    try { raw = gunzipSync(compressed, { maxOutputLength: ref.rawBytes }); }
    catch { throw fail('metadata decompression format/byte budget: ' + ref.hash); }
    if (raw.length !== ref.rawBytes) throw fail('metadata raw byte length mismatch: ' + ref.hash);
    try { envelope = JSON.parse(raw.toString('utf8')); } catch { throw fail('cannot parse metadata object: ' + ref.hash); }
    validateFiniteJson(envelope);
    if (!record(envelope) || envelope.schema !== METADATA_OBJECT_SCHEMA || envelope.version !== 1 || envelope.hash !== ref.hash || !own(envelope, 'body') || !Array.isArray(envelope.refs) || envelope.refs.length > COUNT_LIMIT || Object.keys(envelope).length !== 6 || envelope.bodyHash !== hashContent({ body: envelope.body, refs: envelope.refs })) throw fail('metadata object contentHash mismatch: ' + ref.hash);
    if (canonicalByteLength(envelope) !== raw.length) throw fail('noncanonical metadata object byte length');
    counters.reads++; counters.readBytes += compressed.length; counters.rawReadBytes += raw.length;
    return envelope;
  };
  const read = (ref, dependencies) => {
    const active = new Set(), decoded = new Map(), descriptors = new Map(), budget = { bytes: 0, count: 0 };
    const load = (descriptor, depth = 0) => {
      validateMetadataRef(descriptor);
      if (depth > 80 || ++budget.count > COUNT_LIMIT || active.has(descriptor.hash)) throw fail('metadata reference cycle/depth/count budget');
      budget.bytes += descriptor.rawBytes;
      if (budget.bytes > TOTAL_LIMIT) throw fail('metadata decompression total budget exceeded');
      const identity = hashContent(descriptor);
      if (descriptors.has(descriptor.hash) && descriptors.get(descriptor.hash) !== identity) throw fail('inconsistent metadata reference descriptors');
      descriptors.set(descriptor.hash, identity);
      if (decoded.has(descriptor.hash)) return decoded.get(descriptor.hash);
      if (dependencies) dependencies.push([descriptor, stamp(assertRef(descriptor))]);
      active.add(descriptor.hash);
      const envelope = readEnvelope(descriptor), body = envelope.body;
      const paths = new Set();
      for (const item of envelope.refs) {
        if (!record(item) || Object.keys(item).length !== 2 || !own(item, 'path') || !own(item, 'ref')) throw fail('invalid metadata child reference');
        const key = JSON.stringify(item.path);
        if (paths.has(key)) throw fail('duplicate metadata reference path');
        paths.add(key);
        const target = targetFor(body, item.path);
        Object.defineProperty(target.parent, target.key, { value: load(item.ref, depth + 1), enumerable: true, writable: true, configurable: true });
      }
      validateFiniteJson(body);
      if (hashContent(body) !== descriptor.hash || canonicalByteLength(body) !== descriptor.valueBytes || (own(descriptor, 'arrayLength') && (!Array.isArray(body) || body.length !== descriptor.arrayLength))) throw fail('metadata logical contentHash/length mismatch: ' + descriptor.hash);
      active.delete(descriptor.hash); decoded.set(descriptor.hash, body);
      return body;
    };
    return load(ref);
  };
  // Verify recursively on first publication/reuse. Stat stamps avoid decoding
  // every historical patch again at each checkpoint; reads still verify bytes.
  const verify = ref => {
    const st = assertRef(ref), key = JSON.stringify(ref), previous = verified.get(key);
    if (previous && previous.every(([descriptor, token]) => stamp(assertRef(descriptor)) === token)) { counters.reuse++; return; }
    const dependencies = [];
    read(ref, dependencies); verified.set(key, dependencies);
    return st;
  };
  const prepare = manifest => {
    const encoded = validateEncodedFields(manifest);
    for (const value of metadataArrays(manifest)) validateMetadataArray(value, encoded);
    const blobs = new Map(), values = new WeakMap(), sizes = new WeakMap(), external = new Map();
    const summary = { sources: { count: 0, bytes: 0, rawBytes: 0, newBytes: 0 }, overrides: { count: 0, bytes: 0 }, history: { count: 0, bytes: 0 }, references: { count: 0, bytes: 0, rawBytes: 0, newBytes: 0 }, reuse: 0 };
    const measured = value => {
      if (value && typeof value === 'object' && sizes.has(value)) return sizes.get(value);
      const bytes = canonicalByteLength(value);
      if (value && typeof value === 'object') sizes.set(value, bytes);
      return bytes;
    };
    const encode = value => {
      if (isMetadataRef(value)) { validateMetadataRef(value); external.set(value.hash, value); summary.reuse++; return value; }
      if (value && typeof value === 'object' && values.has(value)) { summary.reuse++; return values.get(value); }
      validateFiniteJson(value);
      const hash = hashContent(value), valueBytes = measured(value);
      if (valueBytes > METADATA_OBJECT_LIMIT) throw fail('metadata logical object byte budget exceeded');
      if (blobs.has(hash)) { summary.reuse++; return blobs.get(hash).ref; }
      const refs = [];
      const walk = (item, at = []) => {
        if (at.length && measured(item) >= CHUNK_BYTES) { refs.push({ path: at, ref: encode(item) }); return null; }
        if (Array.isArray(item)) return item.map((child, index) => walk(child, [...at, index]));
        if (record(item)) return Object.fromEntries(Object.keys(item).sort().map(key => [key, walk(item[key], [...at, key])]));
        return item;
      };
      const body = walk(value), envelope = { schema: METADATA_OBJECT_SCHEMA, version: 1, hash, body, refs, bodyHash: hashContent({ body, refs }) };
      const chunks = []; visitCanonical(envelope, chunk => chunks.push(chunk));
      const raw = Buffer.from(chunks.join(''));
      if (raw.length > METADATA_OBJECT_LIMIT) throw fail('metadata object byte budget exceeded');
      const buffer = gzipSync(raw, { level: 6 });
      let ref = { schema: METADATA_REF_SCHEMA, version: 1, hash, bytes: buffer.length, rawBytes: raw.length, valueBytes, ...(Array.isArray(value) ? { arrayLength: value.length } : {}) };
      validateMetadataRef(ref);
      const file = fileFor(ref), st = regularStat(file, METADATA_OBJECT_LIMIT, true);
      if (st) {
        // Logical canonical identity is independent of the gzip representation
        // and of object insertion order in a previously published DAG.
        const prior = readBoundedBuffer(file, METADATA_OBJECT_LIMIT); let priorRaw;
        try { priorRaw = gunzipSync(prior, { maxOutputLength: METADATA_OBJECT_LIMIT }); }
        catch { throw fail('metadata existing object decompression format/byte budget: ' + hash); }
        ref = { ...ref, bytes: prior.length, rawBytes: priorRaw.length };
        verify(ref); summary.reuse++;
      }
      const blob = { ref, hash, file, bytes: ref.bytes, rawBytes: ref.rawBytes, existing: Boolean(st), ...(st ? {} : { buffer }) };
      blobs.set(hash, blob); if (value && typeof value === 'object') values.set(value, ref);
      counters.prepared++;
      return ref;
    };
    const field = (value, kind) => {
      const ref = encode(value); validateMetadataRef(ref, { array: true });
      summary[kind].count++; summary[kind].bytes += ref.valueBytes;
      return ref;
    };
    const output = { ...manifest, encodedFields: METADATA_ENCODING, overrides: field(manifest.overrides, 'overrides'), history: manifest.history.map(entry => ({ ...entry, overrides: field(entry.overrides, 'overrides'), ops: field(entry.ops, 'history') })), projectHeads: Object.fromEntries(Object.entries(manifest.projectHeads).map(([id, head]) => [id, { ...head, overrides: field(head.overrides, 'overrides') }])) };
    for (const blob of blobs.values()) { summary.sources.count++; summary.sources.bytes += blob.bytes; summary.sources.rawBytes += blob.rawBytes; if (!blob.existing) summary.sources.newBytes += blob.bytes; }
    summary.references = { ...summary.sources };
    return { manifest: output, blobs, external, summary };
  };
  const childRefs = ref => {
    const envelope = readEnvelope(ref), paths = new Set();
    return envelope.refs.map(item => {
      if (!record(item) || Object.keys(item).length !== 2 || !own(item, 'path') || !own(item, 'ref')) throw fail('invalid metadata child reference');
      validateMetadataRef(item.ref); targetFor(envelope.body, item.path);
      const key = JSON.stringify(item.path);
      if (paths.has(key)) throw fail('duplicate metadata reference path');
      paths.add(key); return item.ref;
    });
  };
  return { directory, fileFor, prepare, read, assertRef, verify, childRefs, stats: () => ({ ...counters }) };
}
