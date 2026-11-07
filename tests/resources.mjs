import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createResources } from '../lib/resources.js';
import { createWorkspace } from '../lib/workspace.js';
import { createStorage, fileFingerprint } from '../lib/storage.js';

// Every fixture, including legacy imports and disk-fault injection, is owned by
// this test. Do not import index.js or access a profile's live resource files.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = fs.mkdtempSync(path.join(here, '.resources-'));
const results = [];
let sequence = 0;
const folder = (label) => path.join(root, `${sequence++}-${label}`);
const registry = (label, options = {}) => createResources({ directory: folder(label), ...options });
const doc = (title = 'Fixture', project, name = 'body') => ({ version: 1, meta: { title, ...(project ? { project } : {}) }, objects: [{ id: 'body', semanticId: 'body', kind: 'box', name, position: [0, 0, 0] }] });
const base = (ws) => { const m = ws.metadata(); return { expectedRevision: m.revision, expectedHash: m.contentHash }; };
const json = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const check = (name, fn) => { try { const details = fn(); results.push({ name, passed: true, ...(details ? { details } : {}) }); } catch (error) { results.push({ name, passed: false, error: error.stack || String(error) }); } };
const rejects = (fn, code) => assert.throws(fn, (error) => error.code === code);

try {
  check('listing and optional lookup do not create a session; first model persists a valid empty UUID resource', () => {
    const r = registry('empty');
    assert.deepEqual(r.list(), { items: [], total: 0, nextOffset: null });
    assert.equal(r.binding('one'), null); assert.equal(r.metadataForSession('one'), null); assert.equal(r.getSession('one', { create: false }), null);
    assert.equal(r.list().total, 0); assert.equal(r.cacheInfo().size, 0);
    const ws = r.getSession('one'), m = ws.metadata();
    assert.match(m.assetId, /^[0-9a-f-]{36}$/); assert.equal(m.revision, 0); assert.equal(m.initialized, false);
    assert.deepEqual(ws.snapshot().doc.objects, []); assert.equal(ws.snapshot().doc.meta.title, '新建模型');
    assert.equal(json(ws.store).schemaVersion, 3); assert.equal(json(ws.store).scene, undefined);
    assert.equal(json(r.catalogPath).resources[m.assetId].storePath, `resources/${m.assetId}.json`);
    assert.equal(r.list().items[0].ownerSessionId, 'one'); assert.equal(ws.history().length, 1);
    ws.replace(doc('First script'), base(ws)); assert.equal(ws.metadata().revision, 1); assert.equal(ws.metadata().assetId, m.assetId);
  });

  check('two sessions and equal titles never merge IDs, histories or native mutations', () => {
    const r = registry('sessions'), a = r.getSession('native-agent-a'), b = r.getSession('native-agent-b');
    assert.notEqual(a.assetId, b.assetId); a.replace(doc('Same')); b.replace(doc('Same'));
    const beforeB = b.snapshot(), idA = a.assetId;
    a.apply({ ...base(a), operations: [{ op: 'transform', id: 'body', position: [1, 2, 3] }] });
    assert.deepEqual(b.snapshot(), beforeB); assert.equal(b.history().length, 2);
    a.replace(doc('New title', 'a.js'), { ...base(a), discardOverrides: true });
    a.replace(doc('Another title', 'b.js'), { ...base(a), discardOverrides: true });
    assert.equal(a.metadata().assetId, idA); assert.equal(a.metadata().project, 'b.js'); assert.equal(a.snapshot().doc.meta.project, 'b.js');
    a.replace(doc('No project'), { discardOverrides: true }); assert.equal(a.metadata().project, null);
    rejects(() => a.replace(doc(), { newAsset: true }), 'fixed_identity');
    assert.equal(r.list().total, 2); assert.equal(r.list({ query: 'same' }).total, 1);
  });

  check('pinned facades survive binding switches and open changes only that session without adding revisions', () => {
    const r = registry('switch'), a = r.getSession('a'), b = r.getSession('b'); a.replace(doc('A')); b.replace(doc('B'));
    const aBefore = a.metadata(), bBefore = b.metadata();
    const opened = r.open('a', b.assetId, { expectedBindingAssetId: a.assetId });
    assert.equal(opened.revision, bBefore.revision); assert.equal(r.binding('b'), b.assetId); assert.equal(r.binding('a'), b.assetId);
    assert.equal(a.assetId, aBefore.assetId); a.update({ id: 'body', name: 'original A', ...base(a) });
    assert.equal(r.getSession('a').snapshot().doc.objects[0].name, 'body'); assert.equal(b.metadata().revision, bBefore.revision);
    assert.equal(a.snapshot().doc.objects[0].name, 'original A');
    rejects(() => r.open('a', a.assetId, { expectedBindingAssetId: a.assetId }), 'conflict'); assert.equal(r.binding('a'), b.assetId);
    assert.throws(() => { a.assetId = b.assetId; }, TypeError);
  });

  check('explicit sharing sees current writes; fork creates an independent branch with recoverable history', () => {
    const r = registry('share'), a = r.getSession('a'); a.replace(doc('Shared')); const checkpoint = a.checkpoint('before edit');
    a.update({ id: 'body', name: 'source edit' }); r.open('b', a.assetId);
    const b = r.getSession('b'); b.update({ id: 'body', name: 'shared edit' }); assert.equal(a.snapshot().doc.objects[0].name, 'shared edit');
    const fork = r.fork('c', a.assetId, { title: 'Branch' }), c = r.getSession('c');
    assert.notEqual(fork.assetId, a.assetId); assert.equal(fork.doc.meta.title, 'Branch'); assert.equal(c.history().length, a.history().length + 1);
    assert.ok(c.history().every((entry) => entry.assetId === c.assetId));
    c.restore(checkpoint.id, base(c)); assert.equal(c.snapshot().doc.objects[0].name, 'body'); assert.equal(a.snapshot().doc.objects[0].name, 'shared edit');
    assert.equal(r.list({ query: 'branch' }).total, 0); // Restoring updates catalog title too.
  });

  check('global search and pagination return lightweight copies and update after every mutation', () => {
    const r = registry('search');
    for (const title of ['Recent car', '近期坦克', 'Recent car']) r.create(`agent-${title === '近期坦克' ? 'tank' : r.list().total}`, { title, doc: doc(title) });
    const first = r.list({ limit: 2 }); assert.equal(first.total, 3); assert.equal(first.items.length, 2); assert.equal(first.nextOffset, 2);
    assert.equal(r.list({ offset: first.nextOffset, limit: 2 }).items.length, 1); assert.equal(r.list({ offset: 99 }).nextOffset, null);
    assert.equal(r.list({ query: 'RECENT CAR' }).total, 2); assert.equal(r.list({ query: '坦克' }).total, 1);
    first.items[0].title = 'outside mutation'; assert.equal(r.list({ query: 'outside mutation' }).total, 0);
    const ws = r.getSession('agent-tank'); ws.replace(doc('坦克改进版', 'tank.js'), { discardOverrides: true });
    assert.equal(r.list({ query: 'tank.js' }).total, 1); assert.equal(r.list({ query: '改进版' }).items[0].contentHash, ws.metadata().contentHash);
  });

  check('startup, session metadata, history metadata and all-resource lists never decode blobs', () => {
    const r = registry('metadata'), car = doc('Car'); car.objects[0].geometryData = {positions:[0,0,0,1,0,0,0,1,0]}; const first = r.create('a', { doc: car }); r.create('b', { doc: doc('Tank') }); r.open('viewer', first.assetId);
    const original = fs.openSync; let blobReads = 0;
    fs.openSync = (file, ...args) => { if (typeof file === 'string' && file.startsWith(path.join(r.assetsPath,'.geometry') + path.sep)) blobReads++; return original(file, ...args); };
    try {
      const restart = createResources({ directory: r.directory });
      assert.equal(restart.cacheInfo().size, 0); assert.equal(restart.metadataForSession('viewer').assetId, first.assetId);
      assert.equal(restart.getSession('a', { create: false }).metadata().title, 'Car');
      restart.forAsset(first.assetId).history(); restart.forAsset(first.assetId).projects();
      for (let i = 0; i < 20; i++) { restart.metadataForSession('a'); restart.list(); }
      assert.equal(blobReads, 0); assert.equal(restart.cacheInfo().size, 0);
      restart.getSession('viewer').snapshot(); assert.equal(blobReads, 1);
    } finally { fs.openSync = original; }
  });

  check('bindings and shared references restart; missing index rows repair using resource metadata', () => {
    const r = registry('restart'), a = r.create('a', { doc: doc('Persistent A') }), b = r.create('b', { doc: doc('Persistent B') }); r.open('viewer', a.assetId);
    const raw = json(r.catalogPath); delete raw.resources[a.assetId]; fs.writeFileSync(r.catalogPath, JSON.stringify(raw));
    const restart = createResources({ directory: r.directory });
    assert.equal(restart.binding('viewer'), a.assetId); assert.equal(restart.binding('b'), b.assetId); assert.equal(restart.list().total, 2);
    assert.equal(restart.getSession('viewer').snapshot().contentHash, a.contentHash);
    assert.equal(fs.existsSync(path.join(r.assetsPath, a.contentHash + '.json')), true);
    assert.equal(fs.existsSync(restart.forAsset(a.assetId).store + '.assets'), false);
  });

  check('40-entry per-resource history and restores survive LRU eviction and restart', () => {
    const r = registry('history'), ws = r.getSession('a'); ws.replace(doc('History'));
    for (let i = 0; i < 43; i++) ws.update({ id: 'body', name: `history ${i}` });
    const entry = ws.history()[5], before = ws.metadata(); assert.equal(ws.history().length, 40);
    r.create('b'); r.create('c');
    const restart = createResources({ directory: r.directory }), recovered = restart.getSession('a');
    assert.equal(recovered.history().length, 40); assert.equal(recovered.metadata().contentHash, before.contentHash);
    const receipt = recovered.restore(entry.id, base(recovered)); assert.equal(receipt.contentHash, entry.hash); assert.equal(receipt.revision, before.revision + 1);
    assert.equal(recovered.history().length, 40); assert.equal(json(recovered.store).history.length, 40);
  });

  check('LRU retains at most two workspaces and old pinned scopes re-resolve the newest instance', () => {
    const r = registry('lru'), first = r.getSession('first'); first.replace(doc('First'));
    for (let i = 0; i < 6; i++) { r.create(`agent-${i}`, { doc: doc(`Resource ${i}`) }); assert.ok(r.cacheInfo().size <= 2); }
    assert.equal(r.cacheInfo().assetIds.includes(first.assetId), false);
    const other = createResources({ directory: r.directory }); other.forAsset(first.assetId).update({ id: 'body', name: 'external latest' });
    assert.equal(first.snapshot().doc.objects[0].name, 'external latest'); first.update({ id: 'body', position: [2, 0, 0], ...base(first) });
    assert.equal(other.forAsset(first.assetId).snapshot().doc.objects[0].position[0], 2); assert.equal(r.cacheInfo().size, 2);
    return { cacheLimit: r.cacheInfo().limit };
  });

  check('two manager instances merge independent resources and enforce shared-resource revision guards', () => {
    const r = registry('managers'), other = createResources({ directory: r.directory });
    const a = r.create('a', { doc: doc('A') }), b = other.create('b', { doc: doc('B') });
    const first = r.forAsset(a.assetId), second = other.forAsset(a.assetId), stale = base(second);
    first.update({ id: 'body', name: 'first writer' }); rejects(() => second.update({ id: 'body', name: 'stale', ...stale }), 'conflict');
    second.update({ id: 'body', name: 'latest writer', ...base(second) }); other.forAsset(b.assetId).update({ id: 'body', name: 'independent writer' });
    const restart = createResources({ directory: r.directory }); assert.equal(restart.list().total, 2); assert.equal(restart.binding('a'), a.assetId); assert.equal(restart.binding('b'), b.assetId);
    assert.equal(restart.forAsset(a.assetId).snapshot().doc.objects[0].name, 'latest writer'); assert.equal(restart.forAsset(b.assetId).snapshot().doc.objects[0].name, 'independent writer');
  });

  check('a write racing between workspace resolution and metadata commit is rejected by storage CAS', () => {
    const r = registry('cas'), first = r.getSession('a'); first.replace(doc('CAS'));
    const other = createResources({ directory: r.directory }), second = other.forAsset(first.assetId), original = fs.openSync; let inject = true;
    fs.openSync = (file, ...args) => { if (inject && file === first.store + '.lock') { inject = false; second.update({ id: 'body', name: 'racing winner' }); } return original(file, ...args); };
    try { rejects(() => first.update({ id: 'body', name: 'must lose', ...base(first) }), 'conflict'); }
    finally { fs.openSync = original; }
    assert.equal(first.snapshot().doc.objects[0].name, 'racing winner'); assert.equal(r.list().items[0].contentHash, first.metadata().contentHash);
  });

  check('a writer committing immediately after another commit cannot make the first cache appear current', () => {
    const r = registry('post-commit-race'), first = r.getSession('a'); first.replace(doc('Commit race'));
    const other = createResources({ directory: r.directory }), second = other.forAsset(first.assetId), original = fs.unlinkSync;
    let inject = true, receipt;
    fs.unlinkSync = (file) => {
      const result = original(file);
      if (inject && file === first.store + '.lock') { inject = false; second.update({ id: 'body', name: 'later writer' }); }
      return result;
    };
    try { receipt = first.update({ id: 'body', name: 'first committed writer' }); }
    finally { fs.unlinkSync = original; }
    assert.equal(receipt.doc.objects[0].name, 'first committed writer');
    assert.equal(first.metadata().revision, receipt.revision + 1);
    assert.equal(first.snapshot().doc.objects[0].name, 'later writer');
    assert.equal(first.snapshot().revision, second.metadata().revision);
  });

  check('unsafe session IDs, asset paths and poisoned catalog paths are rejected', () => {
    const r = registry('unsafe');
    for (const id of ['', '../other', 'a/b', 'a\\b', '__proto__', 'constructor', '.', '..', 'bad\nname', ' bad', 'x'.repeat(201), null]) rejects(() => r.getSession(id), 'validation');
    for (const id of ['../../outside', 'model.js', '', null]) rejects(() => r.forAsset(id), 'validation');
    assert.equal(r.list().total, 0); const good = r.create('valid');
    const raw = json(r.catalogPath); raw.resources[good.assetId].storePath = '../outside.json'; fs.writeFileSync(r.catalogPath, JSON.stringify(raw));
    rejects(() => createResources({ directory: r.directory }), 'storage');
  });

  check('resource metadata failure rolls back memory, history, binding and catalog; real blob failures propagate', () => {
    const r = registry('resource-fault'), ws = r.getSession('a'); ws.replace(doc('Before'));
    const before = ws.snapshot(), history = ws.history(), catalog = fs.readFileSync(r.catalogPath, 'utf8'), original = fs.renameSync;
    try {
      fs.renameSync = (from, to) => { if (to === ws.store) throw Object.assign(new Error('injected metadata write fault'), { code: 'EACCES' }); return original(from, to); };
      rejects(() => ws.update({ id: 'body', name: 'must roll back', ...base(ws) }), 'EACCES');
    } finally { fs.renameSync = original; }
    assert.deepEqual(ws.snapshot(), before); assert.deepEqual(ws.history(), history); assert.equal(fs.readFileSync(r.catalogPath, 'utf8'), catalog); assert.equal(r.binding('a'), ws.assetId);
    try {
      fs.renameSync = (from, to) => { if (typeof to === 'string' && to.startsWith(r.assetsPath + path.sep)) throw Object.assign(new Error('injected object write fault'), { code: 'ENOSPC' }); return original(from, to); };
      rejects(() => ws.update({ id: 'body', name: 'new unique blob', ...base(ws) }), 'ENOSPC');
    } finally { fs.renameSync = original; }
    assert.deepEqual(ws.snapshot(), before); assert.equal(fs.existsSync(ws.store + '.lock'), false); assert.equal(fs.existsSync(r.catalogPath + '.lock'), false);
  });

  check('new-resource persistence failure preserves the existing binding without creating an index row', () => {
    const r = registry('create-fault'), previous = r.create('a'), original = fs.renameSync;
    try {
      fs.renameSync = (from, to) => { if (path.dirname(String(to)) === path.join(r.directory, 'resources')) throw Object.assign(new Error('injected create fault'), { code: 'ENOSPC' }); return original(from, to); };
      rejects(() => r.create('a', { title: 'Uncommitted' }), 'ENOSPC');
    } finally { fs.renameSync = original; }
    assert.equal(r.binding('a'), previous.assetId); assert.equal(r.list().total, 1);
  });

  check('catalog failure after a successful resource commit returns its receipt and repairs on restart', () => {
    const r = registry('index-fault'), ws = r.getSession('a'); ws.replace(doc('Before'));
    const previous = ws.metadata(), catalog = fs.readFileSync(r.catalogPath, 'utf8'), original = fs.renameSync; let receipt;
    try {
      fs.renameSync = (from, to) => { if (to === r.catalogPath) throw Object.assign(new Error('injected catalog failure'), { code: 'EACCES' }); return original(from, to); };
      receipt = ws.replace(doc('Committed while index offline'), { ...base(ws), discardOverrides: true });
    } finally { fs.renameSync = original; }
    assert.equal(receipt.revision, previous.revision + 1); assert.ok(receipt.storageWarnings.length); assert.equal(fs.readFileSync(r.catalogPath, 'utf8'), catalog);
    assert.equal(json(ws.store).contentHash, receipt.contentHash);
    const restart = createResources({ directory: r.directory }); assert.equal(restart.list({ query: 'index offline' }).items[0].contentHash, receipt.contentHash); assert.equal(restart.binding('a'), ws.assetId);
  });

  check('catalog create failure retains the committed resource and retries its pending session binding', () => {
    const r = registry('create-index-fault'), original = fs.renameSync; let receipt;
    try {
      fs.renameSync = (from, to) => { if (to === r.catalogPath) throw Object.assign(new Error('injected catalog failure'), { code: 'EACCES' }); return original(from, to); };
      receipt = r.create('new-agent', { title: 'Committed new resource' });
    } finally { fs.renameSync = original; }
    assert.ok(receipt.storageWarnings.length); assert.equal(r.binding('new-agent'), receipt.assetId); assert.equal(r.list().total, 1);
    assert.equal(createResources({ directory: r.directory }).binding('new-agent'), receipt.assetId);
  });

  check('an existing catalog lock survives and cannot turn an already committed mutation into failure', () => {
    const r = registry('lock'), ws = r.getSession('a'); ws.replace(doc('Lock'));
    const lock = r.catalogPath + '.lock'; fs.writeFileSync(lock, 'other writer');
    const receipt = ws.update({ id: 'body', name: 'committed' }); assert.ok(receipt.storageWarnings.length); assert.equal(fs.readFileSync(lock, 'utf8'), 'other writer');
    assert.equal(r.list().items[0].contentHash, receipt.contentHash); fs.unlinkSync(lock);
    assert.equal(r.list().items[0].contentHash, json(r.catalogPath).resources[ws.assetId].contentHash);
  });

  check('schema3 legacy import preserves heads, hashes, histories and latest overwritten titles without decoding geometry', () => {
    const legacyDirectory = folder('legacy'); fs.mkdirSync(legacyDirectory); const legacyPath = path.join(legacyDirectory, 'legacy.json');
    const legacy = createWorkspace({ storePath: legacyPath, initialDoc: doc('Archive car', 'car.js'), historyLimit: 40 });
    legacy.replace(doc('Archive car', 'car.js')); const carCheckpoint = legacy.checkpoint('car baseline'); legacy.update({ id: 'body', name: 'archive car detail' }); const car = legacy.metadata();
    legacy.replace(doc('Tank source', 'tank.js'), { discardOverrides: true }); const tankId = legacy.metadata().assetId;
    legacy.replace(doc('Recent car', undefined, 'first car version'), { discardOverrides: true });
    legacy.replace(doc('Recent tank', undefined, 'recent tank final'), { discardOverrides: true });
    legacy.replace(doc('Recent car', undefined, 'last car version'), { discardOverrides: true }); const recentCar = legacy.metadata();
    legacy.replace(doc('Current head'), { discardOverrides: true }); const current = legacy.metadata();
    const originalManifest = fs.readFileSync(legacyPath, 'utf8'), originalHash = fileFingerprint(legacyPath), originalRead = fs.readFileSync;
    const directory = folder('legacy-target'); let blobReads = 0;
    fs.readFileSync = (file, ...args) => { if (typeof file === 'string' && (file.startsWith(legacyPath + '.assets' + path.sep) || file.startsWith(path.join(directory, 'objects') + path.sep))) blobReads++; return originalRead(file, ...args); };
    let r;
    try { r = createResources({ directory, legacyStorePath: legacyPath }); r.list(); assert.equal(r.cacheInfo().size, 0); assert.equal(blobReads, 0); }
    finally { fs.readFileSync = originalRead; }
    assert.equal(fileFingerprint(legacyPath), originalHash); assert.equal(fs.readFileSync(legacyPath, 'utf8'), originalManifest);
    assert.equal(r.forAsset(car.assetId).metadata().contentHash, car.contentHash); assert.equal(r.forAsset(tankId).metadata().contentHash, current.contentHash);
    const recoveredCars = r.list({ query: 'Recent car' }).items; assert.equal(recoveredCars.length, 1); const recoveredCar = recoveredCars[0];
    assert.notEqual(recoveredCar.assetId, tankId); assert.equal(recoveredCar.contentHash, recentCar.contentHash); assert.equal(recoveredCar.origin.type, 'recovered'); assert.equal(recoveredCar.origin.legacyAssetId, tankId); assert.equal(recoveredCar.origin.hash, recentCar.contentHash);
    assert.equal(r.list({ query: 'Recent tank' }).total, 1); assert.equal(r.forAsset(recoveredCar.assetId).snapshot().doc.objects[0].name, 'last car version');
    const importedCar = r.forAsset(car.assetId); const before = importedCar.metadata(); importedCar.restore(carCheckpoint.id, base(importedCar)); assert.equal(importedCar.metadata().revision, before.revision + 1); assert.equal(importedCar.metadata().contentHash, carCheckpoint.hash);
    assert.equal(r.forAsset(tankId).metadata().contentHash, current.contentHash); assert.equal(fs.readFileSync(legacyPath, 'utf8'), originalManifest);
    r.open('recover-car', recoveredCar.assetId); const restart = createResources({ directory, legacyStorePath: legacyPath });
    assert.equal(restart.binding('recover-car'), recoveredCar.assetId); assert.equal(restart.list({ query: 'Recent car' }).total, 1); assert.equal(restart.getSession('recover-car').snapshot().contentHash, recentCar.contentHash);
    return { importedResources: r.list().total, eagerBlobReads: blobReads };
  });

  check('legacy project heads outside the retained history get independently restorable resource heads', () => {
    const dir = folder('old-heads'); fs.mkdirSync(dir); const store = path.join(dir, 'legacy.json');
    const legacy = createWorkspace({ storePath: store, initialDoc: doc('Old car', 'old.js'), historyLimit: 3 });
    legacy.replace(doc('Old car', 'old.js')); legacy.update({ id: 'body', name: 'kept old car' }); const old = legacy.metadata();
    legacy.replace(doc('New tank', 'new.js'), { discardOverrides: true }); for (let i = 0; i < 6; i++) legacy.update({ id: 'body', name: `tank ${i}` });
    assert.equal(legacy.history({ allAssets: true }).some((entry) => entry.assetId === old.assetId), false);
    const r = createResources({ directory: folder('old-heads-target'), legacyStorePath: store }), recovered = r.forAsset(old.assetId);
    assert.equal(recovered.metadata().revision, old.revision); assert.equal(recovered.snapshot().doc.objects[0].name, 'kept old car'); assert.equal(recovered.history().length, 1);
    recovered.restore(recovered.history()[0].id, base(recovered)); assert.equal(recovered.metadata().revision, old.revision + 1);
  });

  check('fixedIdentity defaults remain compatible and rejects cross-asset restore/open only when requested', () => {
    const file = path.join(folder('fixed'), 'workspace.json'), plain = createWorkspace({ storePath: file, initialDoc: doc('A', 'a.js') });
    plain.replace(doc('A', 'a.js')); const old = plain.checkpoint('old A'), aId = plain.metadata().assetId;
    plain.replace(doc('B', 'b.js'), { discardOverrides: true }); const bId = plain.metadata().assetId; assert.notEqual(aId, bId);
    const fixed = createWorkspace({ storePath: file, fixedIdentity: true });
    rejects(() => fixed.restore(old.id), 'fixed_identity'); rejects(() => fixed.openProject(aId), 'fixed_identity');
    fixed.replace(doc('C', 'c.js'), { discardOverrides: true }); assert.equal(fixed.metadata().assetId, bId);
    const defaults = createWorkspace({ storePath: file }); defaults.openProject(aId); assert.equal(defaults.metadata().assetId, aId);
    const shared = createStorage(path.join(root, 'shared-option.json'), { assetsPath: path.join(root, 'shared-objects') }); assert.equal(shared.assets, path.join(root, 'shared-objects'));
  });
} finally {
  assert.equal(path.dirname(root), here); assert.ok(path.basename(root).startsWith('.resources-')); fs.rmSync(root, { recursive: true, force: true });
}
const failed = results.filter((item) => !item.passed);
console.log(JSON.stringify({ summary: { tests: results.length, passed: results.length - failed.length, failed: failed.length }, tests: results }, null, 2));
process.exitCode = failed.length ? 1 : 0;
