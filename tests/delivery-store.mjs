import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  publishDeliveryPackage,
  deliveryStoreRoot,
  DELIVERY_FILE_PATTERN,
  DELIVERY_STORE_LIMIT,
} from '../src/host/delivery-store.js';
import {buildDeliveryPackage, deliveryDigest} from '../src/host/delivery-package.js';

const tests = [];
async function run(name, fn) {
  try { await fn(); tests.push({name, passed: true}); }
  catch (error) { tests.push({name, passed: false, error: error.stack}); }
}
const base = path.resolve('tests/.tmp');
fs.mkdirSync(base, {recursive: true});
const roots = [];
function tempRoot(label) {
  const root = path.resolve(fs.mkdtempSync(path.join(base, label + '-')));
  roots.push(root);
  return root;
}
function makeDoc(revision) {
  return {version: 1, objects: [{id: 'part', name: 'Part', kind: 'box', params: {w: 1, h: revision, d: 1}, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], material: {color: '#aa6633', metalness: 0.1, roughness: 0.5, opacity: 1}}]};
}
function packageFor(assetId, revision) {
  return buildDeliveryPackage({assetId, revision, doc: makeDoc(revision)}, {producerVersion: '0.20.1'});
}
function files(root) {
  return fs.readdirSync(root).sort();
}
function parse(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

try {
  await run('publish writes a fixed-name package inside the dedicated store and returns a bounded ticket', () => {
    const root = path.join(tempRoot('store-publish'), 'deliveries');
    const pkg = packageFor('asset-1', 1);
    const ticket = publishDeliveryPackage(pkg, {directory: root});
    assert.equal(path.dirname(ticket.path), path.resolve(root));
    assert.match(path.basename(ticket.path), DELIVERY_FILE_PATTERN);
    assert.equal(ticket.schema, pkg.schema);
    assert.equal(ticket.schemaVersion, pkg.schemaVersion);
    assert.equal(ticket.digest, pkg.digest);
    assert.equal(ticket.bytes, Buffer.byteLength(JSON.stringify(pkg)));
    assert.equal(ticket.nodes, pkg.nodes.length);
    assert.equal(ticket.leaves, pkg.leaves.length);
    assert.equal(ticket.images, Object.keys(pkg.images).length);
    assert.equal(ticket.triangles, pkg.triangles);
    assert.deepEqual(parse(ticket.path), pkg);
    assert.equal(files(root).some(name => name.endsWith('.tmp')), false);
  });

  await run('asset ids cannot traverse outside the fixed delivery directory', () => {
    const root = path.join(tempRoot('store-traversal'), 'deliveries');
    const pkg = packageFor('../../escape/../../target', 2);
    const ticket = publishDeliveryPackage(pkg, {directory: root});
    assert.equal(path.dirname(ticket.path), path.resolve(root));
    assert.equal(path.basename(ticket.path).includes('..'), false);
    assert.equal(path.basename(ticket.path).includes('/'), false);
    assert.equal(path.basename(ticket.path).includes('\\'), false);
    assert.equal(fs.existsSync(path.join(root, '..', 'target')), false);
    assert.deepEqual(parse(ticket.path), pkg);
  });

  await run('a corrupted package file is replaced; a missing file is recreated', () => {
    const root = path.join(tempRoot('store-corrupt'), 'deliveries');
    const pkg = packageFor('asset-corrupt', 3);
    const first = publishDeliveryPackage(pkg, {directory: root});
    fs.writeFileSync(first.path, '{"schema":"not-ours"}\n');
    const second = publishDeliveryPackage(pkg, {directory: root});
    assert.equal(second.path, first.path);
    assert.deepEqual(parse(second.path), pkg);
    fs.rmSync(second.path);
    const third = publishDeliveryPackage(pkg, {directory: root});
    assert.equal(fs.existsSync(third.path), true);
    assert.deepEqual(parse(third.path), pkg);
  });

  await run('pruning only removes our fixed-name, schema-marked files and leaves other data alone', () => {
    const root = path.join(tempRoot('store-prune'), 'deliveries');
    fs.mkdirSync(root, {recursive: true});
    const unrelatedFile = path.join(root, 'notes.txt');
    const unrelatedJson = path.join(root, 'modeler-delivery-not-ours.json');
    const unrelatedDir = path.join(root, 'keep-dir');
    const ownedTemp = path.join(root, 'modeler-delivery-asset-prune-' + 'a'.repeat(16) + '-' + 'b'.repeat(16) + '.json.00000000-0000-0000-0000-000000000000.tmp');
    const foreignTemp = path.join(root, 'other.tmp');
    fs.writeFileSync(unrelatedFile, 'keep me');
    fs.writeFileSync(unrelatedJson, '{"schema":"not-ours"}');
    fs.writeFileSync(ownedTemp, 'stale');
    fs.writeFileSync(foreignTemp, 'leave me');
    fs.mkdirSync(unrelatedDir);
    const tickets = [];
    for (let revision = 1; revision <= 6; revision++) tickets.push(publishDeliveryPackage(packageFor('asset-prune', revision), {directory: root, keep: 2}));
    const owned = files(root).filter(name => DELIVERY_FILE_PATTERN.test(name));
    assert.equal(owned.length, 2);
    assert.equal(fs.existsSync(unrelatedFile), true);
    assert.equal(fs.existsSync(unrelatedJson), true);
    assert.equal(fs.existsSync(foreignTemp), true);
    assert.equal(fs.existsSync(ownedTemp), false, 'only our fixed-name temp files are cleaned');
    assert.equal(fs.statSync(unrelatedDir).isDirectory(), true);
    assert.equal(fs.existsSync(tickets[0].path), false, 'oldest owned delivery is pruned');
    assert.equal(fs.existsSync(tickets.at(-1).path), true, 'newest owned delivery is kept');
    assert.deepEqual(files(root).filter(name => name.endsWith('.tmp')), ['other.tmp']);
  });

  await run('digest-mismatched and non-delivery objects are refused before writing', () => {
    const root = path.join(tempRoot('store-invalid'), 'deliveries');
    const pkg = packageFor('asset-invalid', 4);
    const tampered = {...pkg, triangles: pkg.triangles + 1};
    assert.throws(() => publishDeliveryPackage(tampered, {directory: root}), error => error.code === 'MODELER_DELIVERY_STORE');
    assert.throws(() => publishDeliveryPackage({schema: 'other'}, {directory: root}), error => error.code === 'MODELER_DELIVERY_STORE');
    assert.equal(fs.existsSync(path.resolve(root)), false, 'invalid input never creates the store');
  });

  await run('a symlinked store parent is rejected instead of followed', () => {
    const parent = tempRoot('store-link');
    const real = path.join(parent, 'real');
    fs.mkdirSync(real);
    const linked = path.join(parent, 'linked');
    fs.symlinkSync(real, linked, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => publishDeliveryPackage(packageFor('asset-link', 1), {directory: path.join(linked, 'deliveries')}), error => error.code === 'MODELER_DELIVERY_STORE' && /symbolic link\/junction/i.test(error.message));
    assert.equal(fs.existsSync(path.join(real, 'deliveries')), false);
  });

  await run('default store root and keep limit are explicit', () => {
    assert.equal(deliveryStoreRoot('C:/fixture-home'), path.resolve('C:/fixture-home/.dsh/modeler-deliveries'));
    assert.equal(DELIVERY_STORE_LIMIT, 32);
    const root = path.join(tempRoot('store-limit'), 'deliveries');
    const pkg = packageFor('asset-limit', 5);
    const ticket = publishDeliveryPackage(pkg, {directory: root});
    assert.equal(ticket.digest, deliveryDigest(Object.fromEntries(Object.entries(pkg).filter(([key]) => key !== 'digest'))));
  });
} finally {
  for (const root of roots) {
    assert.ok(root.startsWith(base + path.sep), 'test fixture stays under tests/.tmp');
    fs.rmSync(root, {recursive: true, force: true});
  }
}

const failed = tests.filter(test => !test.passed);
console.log(JSON.stringify({summary: {tests: tests.length, passed: tests.length - failed.length, failed: failed.length}, tests}, null, 2));
process.exitCode = failed.length ? 1 : 0;
