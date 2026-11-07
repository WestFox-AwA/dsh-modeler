// Internal, bounded storage for versioned delivery packages. Tool results carry
// only a small ticket; consumers read the digest-fixed file from this directory.
// Publication is temp-file + rename, file names are constrained, and pruning
// only touches files that match both our fixed name and our schema marker.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {DELIVERY_SCHEMA, DELIVERY_SCHEMA_VERSION, DELIVERY_LIMITS, deliveryDigest} from './delivery-package.js';

export const DELIVERY_STORE_DIRECTORY = 'modeler-deliveries';
export const DELIVERY_STORE_LIMIT = 32;
export const DELIVERY_FILE_PATTERN = /^modeler-delivery-[A-Za-z0-9_-]{1,40}-[a-f0-9]{16}-[a-f0-9]{16}\.json$/;
const DELIVERY_TEMP_PATTERN = /^modeler-delivery-[A-Za-z0-9_-]{1,40}-[a-f0-9]{16}-[a-f0-9]{16}\.json\.[a-f0-9-]{36}\.tmp$/;
const HASH = /^[a-f0-9]{64}$/;
const marker = '"schema":"' + DELIVERY_SCHEMA + '"';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (code, message) => Object.assign(new Error(message), {code});
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function deliveryStoreRoot(home = os.homedir()) {
  return path.join(path.resolve(home), '.dsh', DELIVERY_STORE_DIRECTORY);
}

const samePath = (a, b) => process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b);
// Reject a link/junction at any existing segment before creating/writing. Windows
// junctions are not always reported by lstat, so native realpath is the proof.
function assertNoLinkedSegments(absolute) {
  const resolved = path.resolve(absolute);
  let current = path.parse(resolved).root;
  for (const segment of resolved.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) { if (error.code === 'ENOENT') return; throw fail('MODELER_DELIVERY_STORE', 'Delivery store path is not readable: ' + error.message); }
    let native;
    try { native = fs.realpathSync.native(current); } catch (error) { throw fail('MODELER_DELIVERY_STORE', 'Delivery store path is not resolvable: ' + error.message); }
    if (stat.isSymbolicLink() || !samePath(native, current)) throw fail('MODELER_DELIVERY_STORE', 'Delivery store path contains a symbolic link/junction: ' + current);
  }
}

function safeRoot(directory) {
  const root = path.resolve(directory);
  assertNoLinkedSegments(root);
  fs.mkdirSync(root, {recursive: true});
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw fail('MODELER_DELIVERY_STORE', 'Delivery store must be a real directory, not a link: ' + root);
  return root;
}

function safeName(pkg) {
  const asset = String(pkg.source.assetId).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40) || 'asset';
  const name = `modeler-delivery-${asset}-${pkg.source.contentHash.slice(0, 16)}-${pkg.digest.slice(0, 16)}.json`;
  if (!DELIVERY_FILE_PATTERN.test(name)) throw fail('MODELER_DELIVERY_STORE', 'Delivery file name is outside the fixed naming contract');
  return name;
}

function validateForPublish(pkg) {
  if (!record(pkg) || pkg.schema !== DELIVERY_SCHEMA || pkg.schemaVersion !== DELIVERY_SCHEMA_VERSION) throw fail('MODELER_DELIVERY_STORE', 'Only a versioned Modeler delivery package can be published');
  if (!HASH.test(String(pkg.digest || '')) || !record(pkg.source) || typeof pkg.source.assetId !== 'string' || !pkg.source.assetId || !HASH.test(String(pkg.source.contentHash || ''))) throw fail('MODELER_DELIVERY_STORE', 'Delivery package identity or digest is invalid');
  if (!Array.isArray(pkg.nodes) || !Array.isArray(pkg.leaves) || !record(pkg.images) || !Number.isSafeInteger(pkg.triangles) || pkg.triangles < 0) throw fail('MODELER_DELIVERY_STORE', 'Delivery package shape is incomplete');
  const {digest, ...unsigned} = pkg;
  if (deliveryDigest(unsigned) !== digest) throw fail('MODELER_DELIVERY_STORE', 'Delivery package digest does not match its content');
}

function ownedFile(root, name) {
  if (!DELIVERY_FILE_PATTERN.test(name)) return null;
  const file = path.join(root, name);
  if (path.dirname(file) !== root) return null;
  let stat;
  try { stat = fs.lstatSync(file) } catch { return null }
  if (!stat.isFile() || stat.isSymbolicLink()) return null;
  try {
    const head = Buffer.alloc(Math.min(512, stat.size));
    const fd = fs.openSync(file, 'r');
    try { fs.readSync(fd, head, 0, head.length, 0) } finally { fs.closeSync(fd) }
    return head.toString('utf8').includes(marker) ? {file, mtime: stat.mtimeMs} : null;
  } catch { return null }
}

function writeAtomic(file, bytes) {
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temp, bytes, {flag: 'wx'});
    try {
      fs.renameSync(temp, file);
    } catch (error) {
      // Windows rename does not always replace an existing target. This branch
      // only replaces a file with our exact fixed name and verified marker.
      if (!fs.existsSync(file)) throw error;
      fs.unlinkSync(file);
      fs.renameSync(temp, file);
    }
  } finally {
    try { if (fs.existsSync(temp)) fs.unlinkSync(temp) } catch {}
  }
}

function prune(root, keep) {
  const owned = [];
  for (const name of fs.readdirSync(root)) {
    if (DELIVERY_TEMP_PATTERN.test(name)) {
      const file = path.join(root, name);
      try {
        const stat = fs.lstatSync(file);
        if (stat.isFile() && !stat.isSymbolicLink() && path.dirname(file) === root) fs.unlinkSync(file);
      } catch {}
      continue;
    }
    const entry = ownedFile(root, name);
    if (entry) owned.push(entry);
  }
  owned.sort((a, b) => b.mtime - a.mtime);
  for (const entry of owned.slice(Math.max(1, keep))) {
    try { fs.unlinkSync(entry.file) } catch {}
  }
}

export function publishDeliveryPackage(pkg, {directory = deliveryStoreRoot(), keep = DELIVERY_STORE_LIMIT} = {}) {
  validateForPublish(pkg);
  if (!Number.isSafeInteger(keep) || keep < 1 || keep > 256) throw fail('MODELER_DELIVERY_STORE', 'Delivery store keep must be an integer in 1..256');
  const root = safeRoot(directory);
  const name = safeName(pkg);
  const file = path.join(root, name);
  if (path.dirname(file) !== root) throw fail('MODELER_DELIVERY_STORE', 'Delivery path escaped its fixed store directory');
  const bytes = Buffer.from(JSON.stringify(pkg));
  if (bytes.length > DELIVERY_LIMITS.maxPackageBytes) throw fail('MODELER_BUDGET', 'Delivery package exceeds ' + DELIVERY_LIMITS.maxPackageBytes + ' bytes');
  let reused = false;
  try {
    const existing = fs.readFileSync(file);
    reused = existing.length === bytes.length && sha(existing) === sha(bytes);
  } catch {}
  if (!reused) writeAtomic(file, bytes);
  prune(root, keep);
  return {
    schema: pkg.schema,
    schemaVersion: pkg.schemaVersion,
    digest: pkg.digest,
    bytes: bytes.length,
    path: file,
    nodes: pkg.nodes.length,
    leaves: pkg.leaves.length,
    images: Object.keys(pkg.images).length,
    triangles: pkg.triangles,
    materialScope: pkg.materialScope,
  };
}
