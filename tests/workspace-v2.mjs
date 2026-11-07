import {createStorage} from '../src/host/storage.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createWorkspace, canonicalContent, contentHash } from '../src/host/workspace.js';
import { buildRecipe, evaluateDoc, evaluateObject } from '../src/host/kernel.js';
import { meshEdges } from '../src/host/topology.js';

// All disk mutations, including failure injection, are confined to this test-owned
// directory. Never import the plugin entry or the old home-directory run history.
const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = fs.mkdtempSync(path.join(testsDir, '.workspace-v2-'));
const results = [];
let sequence = 0;
const copy = (v) => JSON.parse(JSON.stringify(v));
const box = (id = 'body', extra = {}) => ({ id, semanticId: `part:${id}`, kind: 'custom', name: id, recipe: { type: 'box', params: { width: 2, height: 1, depth: 3 } }, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], material: { color: '#123456', roughness: .4, metalness: .7, opacity: 1, transmission: .8, ior: 1.45, clearcoat: .6, userData: { finish: 'satin' } }, ...extra });
const scene = (extra = {}) => ({ version: 1, nextId: 1, meta: { title: 'Same title' }, objects: [box()], ...extra });
const make = (initialDoc = scene(), more = {}) => createWorkspace({ storePath: path.join(root, `store-${sequence++}.json`), initialDoc, ...more });
const bytes = (ws) => fs.existsSync(ws.store) ? fs.readFileSync(ws.store, 'utf8') : null;
const capture = (ws) => ({ snap: ws.snapshot(), history: ws.history({ allAssets: true, includeDoc: true }), projects: ws.projects(), bytes: bytes(ws) });
const unchanged = (ws, before) => assert.deepEqual(capture(ws), before);
const rejects = (fn, code) => assert.throws(fn, code ? (error) => error.code === code : undefined);
const check = (name, fn) => { try { fn(); results.push({ name, passed: true }); } catch (error) { results.push({ name, passed: false, error: error.stack || String(error) }); } };

try {
  check('legacy scene migrates without writing, dropping IDs, geometry, material attributes or inert metadata', () => {
    const file = path.join(root, 'legacy.json');
    const legacy = { version: 1, nextId: 42, customRoot: { owner: 'human' }, meta: { title: 'Old project', project: 'old.js', script: 'globalThis.__workspaceExecuted = true', arbitrary: { a: [1, true, null] } }, objects: [{ id: 'obj_41', kind: 'custom', name: 'Old triangles', position: [0, 0, 0], rotation: [0, .5, 0], scale: [1, 1, 1], geometryData: { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], normals: [0,0,1,0,0,1,0,0,1], custom: 'retained' }, material: box().material, visible: false, group: 'legacy-group', customObject: { keep: 1 } }] };
    fs.writeFileSync(file, JSON.stringify(legacy)); const original = fs.readFileSync(file, 'utf8');
    const ws = createWorkspace({ storePath: file, initialDoc: () => { throw new Error('must not invoke fallback'); } }), snap = ws.snapshot();
    assert.equal(snap.initialized, true); assert.equal(snap.revision, 1); assert.equal(snap.doc.version, 1); assert.deepEqual(snap.doc.objects[0].geometryData, legacy.objects[0].geometryData);
    for (const key of ['material', 'group', 'visible', 'id', 'customObject']) assert.deepEqual(snap.doc.objects[0][key], legacy.objects[0][key]);
    assert.deepEqual(snap.doc.meta, legacy.meta); assert.deepEqual(snap.doc.customRoot, legacy.customRoot); assert.equal(globalThis.__workspaceExecuted, undefined);
    assert.equal(fs.readFileSync(file, 'utf8'), original); assert.equal(createWorkspace({ storePath: file }).snapshot().assetId, snap.assetId);
    ws.update({ id: 'obj_41', name: 'Edited old triangles' });
    const envelope = JSON.parse(bytes(ws)); assert.equal(envelope.schemaVersion, 3); assert.equal(envelope.scene, undefined); assert.equal(envelope.sceneRef, ws.metadata().contentHash);
    const persisted = createStorage(ws.store).readScene(envelope.sceneRef); assert.equal(persisted.objects[0].geometryData.custom, 'retained'); assert.deepEqual(persisted.meta, legacy.meta);
  });

  check('old service surface is synchronous, isolated and notifies only after successful persistence', () => {
    const ws = make(), original = ws.snapshot(); let notifications = 0;
    assert.equal(fs.existsSync(ws.store), false); assert.equal(original.initialized, false); assert.equal(original.revision, 0);
    const unsub = ws.subscribe(() => { notifications++; assert.equal(JSON.parse(bytes(ws)).revision, ws.snapshot().revision); });
    const extraUnsub = ws.subscribe(() => { throw new Error('subscriber cannot undo a commit'); });
    const first = ws.add({ name: 'New primitive', expectedRevision: 0, expectedHash: original.contentHash });
    assert.equal(first.object.kind, 'box'); assert.equal(first.initialized, true); assert.equal(notifications, 1);
    ws.update({ id: first.object.id, position: [2, 3, 4] }); assert.equal(notifications, 2); ws.remove({ id: first.object.id }); assert.equal(notifications, 3);
    const before = capture(ws); rejects(() => ws.remove({ id: 'missing' }), 'not_found'); unchanged(ws, before); assert.equal(notifications, 3);
    unsub(); extraUnsub(); ws.replace(ws.snapshot().doc, ws.snapshot().revision); assert.equal(notifications, 3);
    const initial = ws.initial(); initial.objects.length = 0; assert.equal(ws.initial().objects.length, 1);
    const snap = ws.snapshot(); snap.doc.objects[0].name = 'mutation outside service'; assert.notEqual(ws.snapshot().doc.objects[0].name, snap.doc.objects[0].name);
  });

  check('revision/hash guards reject every mutation and candidate without memory, history or file changes', () => {
    const ws = make(); ws.replace(scene()); const h = ws.checkpoint('baseline');
    for (const guard of [{ expectedRevision: 0 }, { expectedHash: '0'.repeat(64) }]) {
      const before = capture(ws), calls = [() => ws.replace(scene(), guard), () => ws.add({ ...guard }), () => ws.update({ id: 'body', name: 'bad', ...guard }), () => ws.remove({ id: 'body', ...guard }), () => ws.apply({ operations: [{ op: 'visibility', id: 'body', visible: false }], ...guard }), () => ws.candidate({ operations: [{ op: 'visibility', id: 'body', visible: false }], ...guard }), () => ws.checkpoint({ label: 'bad', ...guard }), () => ws.restore(h.id, guard), () => ws.openProject(ws.snapshot().assetId, guard)];
      for (const call of calls) { rejects(call, 'conflict'); unchanged(ws, before); }
    }
    rejects(() => ws.replace(scene(), { expectedRevision: NaN })); rejects(() => ws.apply({ operations: [], expectedRevision: '1' }));
  });

  check('batch failure after add does not leak nextId, partial objects or listeners', () => {
    const ws = make(); ws.replace(scene()); let count = 0; ws.subscribe(() => count++); const before = capture(ws);
    rejects(() => ws.apply({ operations: [{ op: 'add', object: { kind: 'box', name: 'must roll back' } }, { op: 'transform', id: 'missing', position: [1, 2, 3] }] }), 'not_found'); unchanged(ws, before);
    rejects(() => ws.apply({ operations: [{ op: 'add', object: { kind: 'box' } }, { op: 'parameters', id: 'body', params: { width: -1 } }] })); unchanged(ws, before); assert.equal(count, 0);
  });

  check('global IDs and semantic IDs include every compound child', () => {
    const ws = make(scene({ objects: [{ id: 'parent', kind: 'custom', parts: [box('child')] }] }));
    const before = capture(ws);
    rejects(() => ws.apply({ operations: [{ op: 'add', object: box('child') }] })); unchanged(ws, before);
    rejects(() => ws.apply({ operations: [{ op: 'add', object: box('other', { semanticId: 'part:child' }) }] })); unchanged(ws, before);
    rejects(() => ws.apply({ operations: [{ op: 'duplicate', id: 'child', newId: 'parent' }] })); unchanged(ws, before);
  });

  check('revision, hash, UUID, label and recoverable snapshots persist across restarts', () => {
    const ws = make(); ws.replace(scene()); ws.update({ id: 'body', name: 'Persistent body' }); const checkpoint = ws.checkpoint('human accepted baseline'), before = capture(ws);
    const restarted = createWorkspace({ storePath: ws.store, initialDoc: scene({ objects: [] }) }); unchanged(restarted, before);
    assert.equal(restarted.history().at(-1).id, checkpoint.id); assert.equal(restarted.history().at(-1).label, 'human accepted baseline');
    restarted.update({ id: 'body', position: [3, 0, 0], expectedRevision: before.snap.revision }); assert.equal(restarted.snapshot().revision, before.snap.revision + 1);
  });

  check('canonical SHA256 ignores property order and all observation counts', () => {
    const ws = make(), snap = ws.snapshot(), reordered = JSON.parse(JSON.stringify(snap.doc, Object.keys(snap.doc).reverse()));
    const reverse = (value) => Array.isArray(value) ? value.map(reverse) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).reverse().map((key) => [key, reverse(value[key])])) : value;
    assert.equal(contentHash(reverse(snap.doc)), snap.contentHash); assert.equal(createHash('sha256').update(canonicalContent(snap.doc)).digest('hex'), snap.contentHash);
    for (let i = 0; i < 8; i++) { ws.snapshot(); ws.history({ includeDoc: true }); ws.projects(); evaluateDoc(ws.snapshot().doc); }
    assert.equal(ws.snapshot().contentHash, snap.contentHash); assert.equal(ws.snapshot().revision, snap.revision); assert.equal(bytes(ws), null); assert.equal(typeof reordered, 'object');
  });

  check('parameter edits deeply merge recipe params and keep source IDs, untouched dimensions and materials', () => {
    const ws = make(scene({ objects: [box('body', { recipe: { type: 'box', params: { width: 2, height: 1, depth: 3, design: { shoulder: 1, sill: 2 } } } })] }));
    const result = ws.apply({ operations: [{ op: 'parameters', id: 'body', params: { width: 4, design: { shoulder: 5 } } }] });
    assert.equal(result.doc.objects[0].id, 'body'); assert.equal(result.doc.objects[0].semanticId, 'part:body'); assert.deepEqual(result.doc.objects[0].recipe.params, { width: 4, height: 1, depth: 3, design: { shoulder: 5, sill: 2 } }); assert.deepEqual(result.doc.objects[0].material, box().material);
    const vertices = evaluateObject(result.doc.objects[0], { base: true }).topology.vertices; assert.equal(Math.max(...vertices.filter((_v, index) => index % 3 === 0)), 2);
  });

  check('compound child operations retain parent TRS, siblings and distinct material properties', () => {
    const parent = { id: 'assembly', kind: 'custom', position: [5, 0, 0], rotation: [0, 0, 0], scale: [2, 2, 2], group: 'car', parts: [box('left'), box('right', { position: [2, 0, 0], material: { color: '#abcdef', roughness: .9, transmission: .1 } })] };
    const ws = make(scene({ objects: [parent] }));
    const snap = ws.apply({ operations: [{ op: 'parameters', id: 'left', params: { width: 3 } }, { op: 'transform', id: 'left', position: [1, 0, 0] }, { op: 'material', id: 'left', material: { userData: { edited: true }, ior: 1.7 } }, { op: 'visibility', id: 'right', visible: false }, { op: 'modifiers', id: 'left', modifiers: [{ type: 'array', count: 2, offset: [4, 0, 0] }] }] });
    assert.deepEqual(snap.doc.objects[0].position, [5, 0, 0]); assert.deepEqual(snap.doc.objects[0].scale, [2, 2, 2]); const [left, right] = snap.doc.objects[0].parts;
    assert.equal(left.material.ior, 1.7); assert.deepEqual(left.material.userData, { finish: 'satin', edited: true }); assert.equal(right.material.roughness, .9); assert.equal(right.visible, false);
    const draw = evaluateDoc(snap.doc); assert.equal(draw.objects[0].sourceId, 'left'); assert.equal(draw.objects[0].geometryData.positions.length, buildRecipe(box().recipe).indices.length * 3 * 2); assert.equal(draw.objects[1].visible, false);
    const duplicated = ws.apply({ operations: [{ op: 'duplicate', id: 'assembly' }] }), ids = [];
    const gather = (objects) => objects.forEach((object) => { ids.push(object.id); if (object.parts) gather(object.parts); }); gather(duplicated.doc.objects); assert.equal(ids.length, new Set(ids).size);
    ws.remove({ id: 'left' }); assert.equal(ws.snapshot().doc.objects[0].parts[0].id, 'right'); assert.equal(ws.snapshot().doc.objects[1].parts.length, 2);
  });

  check('mesh_move edits shared base topology once, retains modifiers/TRS and originRecipe, and requires bake', () => {
    const source = box('body', { position: [10, 2, 0], scale: [2, 2, 2], modifiers: [{ type: 'array', count: 2, offset: [8, 0, 0] }] }); const ws = make(scene({ objects: [source] })), before = capture(ws), base = evaluateObject(source, { base: true, world: false }).topology;
    rejects(() => ws.apply({ operations: [{ op: 'mesh_move', id: 'body', vertices: [0], delta: [.25, 0, 0] }] })); unchanged(ws, before);
    const moved = ws.apply({ operations: [{ op: 'mesh_move', id: 'body', vertices: [0, 0], delta: [.25, 0, 0], bake: true }] }).doc.objects[0];
    assert.equal(moved.recipe, undefined); assert.deepEqual(moved.originRecipe, source.recipe); assert.equal(moved.topology.vertices.length, base.vertices.length); assert.equal(moved.topology.vertices[0], base.vertices[0] + .25); assert.deepEqual(moved.topology.indices, base.indices); assert.deepEqual(moved.modifiers, source.modifiers); assert.deepEqual(moved.position, source.position); assert.deepEqual(moved.scale, source.scale);
    const baked = capture(ws); rejects(() => ws.replace(scene({ objects: [source] }), { rebase: true }), 'override_conflict'); unchanged(ws, baked);
    ws.replace(scene({ objects: [source] }), { discardOverrides: true }); assert.ok(ws.snapshot().doc.objects[0].recipe);
  });

  check('candidate and repeated inspect/history reads cannot alter current, history, nextId or bytes', () => {
    const ws = make(); ws.replace(scene()); const before = capture(ws);
    const operations = [{ op: 'parameters', id: 'body', params: { depth: 4 } }, { op: 'add', object: { kind: 'box', name: 'candidate only' } }];
    const candidate = ws.candidate({ operations, expectedRevision: before.snap.revision, expectedHash: before.snap.contentHash }); assert.equal(candidate.baseHash, before.snap.contentHash); assert.notEqual(candidate.contentHash, before.snap.contentHash); unchanged(ws, before);
    for (let i = 0; i < 10; i++) { evaluateDoc(ws.snapshot().doc); const history = ws.history({ includeDoc: true }); history[0].doc.objects.length = 0; ws.projects()[0].title = 'outside'; } unchanged(ws, before);
    const applied = ws.apply({ operations }); assert.equal(applied.contentHash, candidate.contentHash); candidate.doc.objects.length = 0; assert.equal(ws.snapshot().doc.objects.length, 2);
  });

  check('checkpoint labels current version, restore appends a revision and lineage, never rolls back counters', () => {
    const ws = make(); ws.replace(scene()); const start = ws.snapshot(), h0 = ws.history(), checkpoint = ws.checkpoint('before stretch');
    assert.equal(checkpoint.id, h0.at(-1).id); assert.equal(checkpoint.hash, start.contentHash); assert.equal(ws.snapshot().revision, start.revision); assert.equal(ws.snapshot().updatedAt, start.updatedAt); assert.equal(ws.history().length, h0.length);
    ws.apply({ operations: [{ op: 'parameters', id: 'body', params: { width: 7 } }] }); const changed = ws.snapshot(), parent = ws.history().at(-1).id;
    const restored = ws.restore(checkpoint.id, changed.revision); assert.equal(restored.revision, changed.revision + 1); assert.equal(restored.contentHash, start.contentHash); assert.deepEqual(restored.doc, start.doc); assert.equal(ws.history().at(-1).parent, parent); assert.equal(ws.history().at(-1).restoredFrom, checkpoint.id);
    const before = capture(ws); rejects(() => ws.restore('unknown'), 'not_found'); unchanged(ws, before);
  });

  check('history retention is bounded across reloads and evicted restore fails explicitly', () => {
    const ws = make(scene(), { historyLimit: 3 }), initialId = ws.history()[0].id;
    for (let i = 0; i < 7; i++) ws.update({ id: 'body', name: `version ${i}` });
    assert.equal(ws.history().length, 3); assert.equal(JSON.parse(bytes(ws)).history.length, 3); const before = capture(ws); rejects(() => ws.restore(initialId), 'not_found'); unchanged(ws, before);
    const reload = createWorkspace({ storePath: ws.store, historyLimit: 3 }); assert.deepEqual(reload.history({ includeDoc: true }), ws.history({ includeDoc: true }));
    assert.equal(reload.history()[0].doc, undefined); assert.ok(reload.history({ includeDoc: true })[0].doc);
  });

  check('same titles never merge independent asset UUIDs', () => {
    const a = make(), b = make(); a.replace(scene()); b.replace(scene()); assert.notEqual(a.snapshot().assetId, b.snapshot().assetId); assert.equal(a.snapshot().contentHash, b.snapshot().contentHash);
    a.update({ id: 'body', name: 'edited only a' }); assert.notEqual(a.snapshot().contentHash, b.snapshot().contentHash); assert.equal(b.history().length, 2);
  });

  check('project heads retain edits and UUIDs when switching, restarting and reopening by key/assetId', () => {
    const ws = make(), aDoc = scene({ meta: { title: 'Same title', project: 'a.js' } }), bDoc = scene({ meta: { title: 'Same title', project: 'b.js' } });
    ws.replace(aDoc, { discardOverrides: true }); ws.update({ id: 'body', name: 'A edit' }); const a = ws.snapshot();
    ws.replace(bDoc, { discardOverrides: true }); ws.update({ id: 'body', name: 'B edit' }); const b = ws.snapshot(); assert.notEqual(a.assetId, b.assetId);
    const saved = createWorkspace({ storePath: ws.store }); const opened = saved.openProject('a.js', { expectedHash: b.contentHash, expectedRevision: b.revision }); assert.equal(opened.assetId, a.assetId); assert.equal(opened.contentHash, a.contentHash); assert.equal(opened.doc.objects[0].name, 'A edit'); assert.equal(opened.revision, b.revision + 1);
    saved.openProject(b.assetId); assert.equal(saved.snapshot().doc.objects[0].name, 'B edit'); const projects = saved.projects().filter((p) => ['a.js','b.js'].includes(p.key)); assert.equal(projects.length, 2); assert.ok(projects.every((p) => !p.scene && !p.doc));
    const before = capture(saved); rejects(() => saved.openProject('missing.js'), 'not_found'); unchanged(saved, before);
    const reopened = createWorkspace({ storePath: saved.store }); reopened.openProject('a.js'); assert.equal(reopened.snapshot().doc.objects[0].name, 'A edit');
  });

  check('generated scripts without meta.project keep the current saved project association', () => {
    const ws = make(); ws.replace(scene({ meta: { project: 'car.js', title: 'Car' } }), { discardOverrides: true }); const asset = ws.snapshot().assetId;
    ws.replace(scene(), { discardOverrides: true }); assert.equal(ws.snapshot().assetId, asset); assert.equal(ws.projects().find((p) => p.assetId === asset).key, 'car.js');
    const reload = createWorkspace({ storePath: ws.store }); assert.equal(reload.projects().find((p) => p.assetId === asset).key, 'car.js');
  });

  check('rebase preserves only edited fields by semantic ID, including across regenerated object IDs', () => {
    const ws = make(), original = scene(); ws.replace(original);
    ws.apply({ operations: [{ op: 'parameters', id: 'body', params: { width: 5 } }, { op: 'transform', id: 'body', position: [3, 1, 0] }, { op: 'material', id: 'body', material: { roughness: .2, userData: { hand: true } } }] });
    const generated = scene({ objects: [box('regenerated', { semanticId: 'part:body', recipe: { type: 'box', params: { width: 2, height: 4, depth: 6 } }, rotation: [0, .2, 0], material: { color: '#ffffff', roughness: .8, transmission: .4, userData: { newGenerator: true } } })] });
    const before = capture(ws); rejects(() => ws.replace(generated), 'override_conflict'); unchanged(ws, before);
    const result = ws.replace(generated, { rebase: true }), body = result.doc.objects[0]; assert.equal(body.id, 'regenerated'); assert.deepEqual(body.recipe.params, { width: 5, height: 4, depth: 6 }); assert.deepEqual(body.position, [3, 1, 0]); assert.deepEqual(body.rotation, [0, .2, 0]); assert.equal(body.material.color, '#ffffff'); assert.equal(body.material.roughness, .2); assert.deepEqual(body.material.userData, { newGenerator: true, hand: true });
    const reload = createWorkspace({ storePath: ws.store }); const again = reload.replace(generated, { preserveOverrides: true }); assert.equal(again.doc.objects[0].recipe.params.width, 5);
  });

  check('missing semantic identities, incompatible recipes and structural overrides fail explicitly', () => {
    const ws = make(); ws.update({ id: 'body', params: { width: 5 } }); const before = capture(ws);
    rejects(() => ws.replace(scene({ objects: [box('different')] }), { rebase: true }), 'override_conflict'); unchanged(ws, before);
    rejects(() => ws.replace(scene({ objects: [box('body', { recipe: { type: 'sphere', params: { radius: 1 } } })] }), { rebase: true }), 'override_conflict'); unchanged(ws, before);
    ws.add({ kind: 'box' }); const structural = capture(ws); rejects(() => ws.replace(scene(), { rebase: true }), 'override_conflict'); unchanged(ws, structural);
    ws.replace(scene(), { discardOverrides: true }); ws.replace(scene({ objects: [box('changed')] })); assert.equal(ws.snapshot().doc.objects[0].id, 'changed');
  });

  check('source:edit full-scene UI writes become granular rebasable overrides', () => {
    const ws = make(); ws.replace(scene()); const edit = ws.snapshot().doc; edit.objects[0].position = [4, 2, 1]; edit.objects[0].material.userData.finish = 'brushed'; edit.objects[0].recipe.params.width = 7; edit.meta.view = { kind: 'orthographic' };
    ws.replace(edit, { source: 'edit' });
    const generated = scene(); generated.objects[0].recipe.params.height = 6; generated.objects[0].material.userData.generator = true;
    const rebased = ws.replace(generated, { rebase: true }).doc; assert.equal(rebased.objects[0].recipe.params.width, 7); assert.equal(rebased.objects[0].recipe.params.height, 6); assert.deepEqual(rebased.objects[0].position, [4, 2, 1]); assert.deepEqual(rebased.objects[0].material.userData, { finish: 'brushed', generator: true }); assert.deepEqual(rebased.meta.view, { kind: 'orthographic' });
  });

  check('rename failure rolls back disk, current, history and temporary sidecars', () => {
    const ws = make(); ws.replace(scene()); const before = capture(ws), original = fs.renameSync;
    try { fs.renameSync = () => { const error = new Error('injected atomic rename failure'); error.code = 'EACCES'; throw error; }; rejects(() => ws.update({ id: 'body', name: 'must not commit' }), 'EACCES'); }
    finally { fs.renameSync = original; }
    unchanged(ws, before); assert.ok(!fs.readdirSync(root).some((name) => name.startsWith(path.basename(ws.store) + '.') && (name.endsWith('.tmp') || name.endsWith('.lock'))));
    ws.update({ id: 'body', name: 'after recoverable failure' }); assert.equal(ws.snapshot().revision, before.snap.revision + 1);
  });

  check('partial temp write failure is visible and leaves original store intact', () => {
    const ws = make(); ws.replace(scene()); const before = capture(ws), original = fs.writeFileSync;
    try { fs.writeFileSync = (target, value, ...rest) => { if (typeof target === 'number') { original(target, String(value).slice(0, 20), ...rest); const error = new Error('injected ENOSPC'); error.code = 'ENOSPC'; throw error; } return original(target, value, ...rest); }; rejects(() => ws.add({ kind: 'box' }), 'ENOSPC'); }
    finally { fs.writeFileSync = original; }
    unchanged(ws, before); assert.equal(fs.existsSync(ws.store + '.lock'), false);
  });

  check('existing corrupt, unsupported and hash-tampered stores never become fallback scenes', () => {
    const file = path.join(root, 'corrupt.json'); const raw = '{this is the user scene'; fs.writeFileSync(file, raw); let called = 0;
    rejects(() => createWorkspace({ storePath: file, initialDoc: () => { called++; return scene(); } }), 'storage'); assert.equal(called, 0); assert.equal(fs.readFileSync(file, 'utf8'), raw);
    fs.writeFileSync(file, JSON.stringify({ schema: 'unknown', version: 1, objects: [] })); const unsupported = fs.readFileSync(file, 'utf8'); rejects(() => createWorkspace({ storePath: file }), 'storage'); assert.equal(fs.readFileSync(file, 'utf8'), unsupported);
    const ws = make(); ws.replace(scene()); const stored = JSON.parse(bytes(ws)); const blob = path.join(ws.store + '.assets', stored.sceneRef + '.json'); const doc = JSON.parse(fs.readFileSync(blob, 'utf8')); (doc.sourceDoc || doc).objects[0].name = 'external tamper'; fs.writeFileSync(blob, JSON.stringify(doc)); const tampered = fs.readFileSync(blob, 'utf8'), metadataBefore = bytes(ws); rejects(() => createWorkspace({ storePath: ws.store }), 'storage'); assert.equal(fs.readFileSync(blob, 'utf8'), tampered); assert.equal(bytes(ws), metadataBefore);
  });

  check('external file changes and competing service instances cannot overwrite newer user scenes', () => {
    const ws = make(); ws.replace(scene()); const before = ws.snapshot(), other = createWorkspace({ storePath: ws.store });
    ws.update({ id: 'body', name: 'first writer' }); const written = bytes(ws), stale = capture(other); rejects(() => other.update({ id: 'body', name: 'stale second writer' }), 'conflict'); assert.deepEqual(other.snapshot(), stale.snap); assert.equal(bytes(ws), written);
    const external = scene({ meta: { title: 'External human project' } }); fs.writeFileSync(ws.store, JSON.stringify(external)); const externalBytes = bytes(ws), current = ws.snapshot(); rejects(() => ws.replace(scene(), { expectedRevision: current.revision, expectedHash: current.contentHash, discardOverrides: true }), 'conflict'); assert.deepEqual(ws.snapshot(), current); assert.equal(bytes(ws), externalBytes); assert.equal(createWorkspace({ storePath: ws.store }).snapshot().doc.meta.title, external.meta.title); assert.ok(before.revision < current.revision);
  });

  check('an existing writer lock is preserved, and no in-memory success is reported', () => {
    const ws = make(); ws.replace(scene()); const before = capture(ws), lock = ws.store + '.lock'; fs.writeFileSync(lock, 'another writer');
    rejects(() => ws.update({ id: 'body', name: 'blocked' }), 'store_locked'); unchanged(ws, before); assert.equal(fs.readFileSync(lock, 'utf8'), 'another writer');
  });

  check('malicious fields, executable values, non-finite data, unknown changes and geometry budgets are rejected', () => {
    const ws = make(), before = capture(ws); let invoked = 0;
    const getter = scene(); Object.defineProperty(getter.meta, 'evil', { enumerable: true, get() { invoked++; return 1; } }); rejects(() => ws.replace(getter)); assert.equal(invoked, 0);
    const executable = scene(); executable.meta.toJSON = () => { invoked++; return {}; }; rejects(() => ws.replace(executable)); assert.equal(invoked, 0);
    const polluted = scene(); polluted.meta = JSON.parse('{"__proto__":{"polluted":true}}'); rejects(() => ws.replace(polluted)); assert.equal({}.polluted, undefined);
    const cycle = scene(); cycle.meta.self = cycle.meta; rejects(() => ws.replace(cycle));
    const invalids = [() => ws.apply({ operations: [{ op: 'unknown', id: 'body' }] }), () => ws.apply({ operations: [{ op: 'transform', id: 'body', position: [0, NaN, 0] }] }), () => ws.apply({ operations: [{ op: 'transform', id: 'body', position: [0, 0, 0], surprise: 1 }] }), () => ws.apply({ operations: [{ op: 'material', id: 'body', material: { ior: Infinity } }] }), () => ws.apply({ operations: [{ op: 'modifiers', id: 'body', modifiers: [{ type: 'unimplemented' }] }] }), () => ws.replace(scene({ objects: [box('body', { recipe: { type: 'sphere', params: { segments: 4096, rings: 4096 } } })] })), () => ws.apply({ operations: [{ op: 'modifiers', id: 'body', modifiers: [{ type: 'array', count: 10001 }] }] }), () => ws.replace(scene({ objects: [box('body', { topology: { vertices: [0,0,0], indices: [0,1,2] } })] }))];
    for (const call of invalids) { rejects(call); unchanged(ws, before); }
  });
  check('explicit root IDs never collide with generated IDs inside added or duplicated compounds', () => {
    const ws = make(), child = { kind: 'box', name: 'automatic child' };
    const added = ws.apply({ operations: [{ op: 'add', object: { id: 'obj_1', kind: 'custom', parts: [child] } }] });
    assert.equal(added.doc.objects[1].id, 'obj_1'); assert.equal(added.doc.objects[1].parts[0].id, 'obj_2');
    const duplicate = ws.apply({ operations: [{ op: 'duplicate', id: 'obj_1', newId: 'obj_3' }] });
    assert.equal(duplicate.doc.objects[2].id, 'obj_3'); assert.equal(duplicate.doc.objects[2].parts[0].id, 'obj_4');
  });

  check('full-scene UI tree reordering is preserved or explicitly conflicts on regeneration', () => {
    const initial = scene({ objects: [box('a'), box('b')] }), ws = make(initial), edited = ws.snapshot().doc;
    edited.objects.reverse(); ws.replace(edited, { source: 'edit' }); const before = capture(ws);
    rejects(() => ws.replace(initial, { rebase: true }), 'override_conflict'); unchanged(ws, before);
    ws.replace(initial, { discardOverrides: true }); assert.equal(ws.snapshot().doc.objects[0].id, 'a');
  });

  check('repeated group assignments rebase the last value without resurrecting deleted group fields', () => {
    const ws = make(); ws.update({ id: 'body', group: { a: 1, b: 2 } }); ws.update({ id: 'body', group: { a: 2 } });
    const rebased = ws.replace(scene(), { rebase: true }); assert.deepEqual(rebased.doc.objects[0].group, { a: 2 });
  });

  check('a reentrant subscriber cannot replace the receipt of the transaction that triggered it', () => {
    const ws = make(); let nested = false;
    ws.subscribe(() => { if (!nested) { nested = true; ws.update({ id: 'body', name: 'nested' }); } });
    const outer = ws.update({ id: 'body', name: 'outer' });
    assert.equal(outer.object.name, 'outer'); assert.equal(outer.revision, 1); assert.equal(ws.snapshot().doc.objects[0].name, 'nested'); assert.equal(ws.snapshot().revision, 2);
  });

  check('project heads outlive bounded history and remain available after a restart', () => {
    const ws = make(scene(), { historyLimit: 2 });
    ws.replace(scene({ meta: { title: 'A', project: 'a-head.js' } }), { discardOverrides: true }); ws.update({ id: 'body', name: 'must survive history eviction' }); const a = ws.snapshot();
    ws.replace(scene({ meta: { title: 'B', project: 'b-head.js' } }), { discardOverrides: true });
    for (let i = 0; i < 5; i++) ws.update({ id: 'body', name: `B ${i}` });
    assert.equal(ws.history({ allAssets: true }).some((entry) => entry.assetId === a.assetId), false);
    const reload = createWorkspace({ storePath: ws.store, historyLimit: 2 }), opened = reload.openProject('a-head.js'); assert.equal(opened.assetId, a.assetId); assert.equal(opened.contentHash, a.contentHash); assert.equal(opened.doc.objects[0].name, 'must survive history eviction');
  });

  check('project identity collisions and prototype names fail without changing saved state', () => {
    const ws = make(); const project = scene({ meta: { project: 'unique.js' } }); ws.replace(project); const before = capture(ws);
    rejects(() => ws.replace(project, { newAsset: true, discardOverrides: true }), 'project_conflict'); unchanged(ws, before);
    for (const name of ['__proto__', 'constructor', 'toString']) { rejects(() => ws.openProject(name), 'not_found'); unchanged(ws, before); }
  });

  check('read-only guard options cannot execute accessors', () => {
    const ws = make(); let invoked = 0;
    const options = {}; Object.defineProperty(options, 'expectedRevision', { enumerable: true, get() { invoked++; return 0; } });
    for (const read of [() => ws.snapshot(options), () => ws.history(options), () => ws.projects(options), () => ws.initial(options)]) rejects(read);
    assert.equal(invoked, 0); assert.equal(bytes(ws), null);
  });
  check('source intent, provenance and arbitrary descriptive fields survive save, restart and restore', () => {
    const descriptive = box('body', { intent: { surface: 'paint-region', closedRequired: false }, source: { generator: 'splitAt', input: 'shell', nested: { arbitrary: true } }, originRecipe: { type: 'box', params: { width: 2 } }, customDescriptor: ['keep', 3] });
    const ws = make(scene({ objects: [descriptive] })); ws.replace(ws.snapshot().doc); const entry = ws.checkpoint('descriptive source');
    ws.update({ id: 'body', name: 'edited' }); const reload = createWorkspace({ storePath: ws.store }); reload.restore(entry.id, reload.snapshot().revision);
    const object = reload.snapshot().doc.objects[0];
    for (const field of ['intent', 'source', 'originRecipe', 'customDescriptor', 'semanticId', 'recipe', 'material']) assert.deepEqual(object[field], descriptive[field]);
  });
  check('mesh_extrude keeps a closed connected shell and retains leaf identity, TRS and modifiers', () => {
    const source = box('body', { position: [8, 2, 0], scale: [2, 1, 1], modifiers: [{ type: 'array', count: 2, offset: [6, 0, 0] }] });
    const ws = make(scene({ objects: [source] }));
    const object = ws.apply({ operations: [{ op: 'mesh_extrude', id: 'body', faces: [0, 1], distance: .25, bake: true }] }).doc.objects[0], mesh = object.topology;
    assert.equal(object.recipe, undefined); assert.deepEqual(object.originRecipe, source.recipe); assert.deepEqual(object.material, source.material); assert.deepEqual(object.modifiers, source.modifiers); assert.deepEqual(object.position, source.position); assert.deepEqual(object.scale, source.scale); assert.equal(object.semanticId, source.semanticId);
    const edges = meshEdges(mesh); assert.ok([...edges.values()].every((uses) => uses.length === 2), 'extrusion created an open or non-manifold edge');
    const neighbors = new Map();
    for (const uses of edges.values()) { const { a, b } = uses[0]; if (!neighbors.has(a)) neighbors.set(a, new Set()); if (!neighbors.has(b)) neighbors.set(b, new Set()); neighbors.get(a).add(b); neighbors.get(b).add(a); }
    const reached = new Set([0]), pending = [0]; while (pending.length) for (const id of neighbors.get(pending.pop()) || []) if (!reached.has(id)) { reached.add(id); pending.push(id); }
    assert.equal(reached.size, mesh.vertices.length / 3, 'extrusion disconnected the shell'); assert.ok(mesh.indices.length > buildRecipe(source.recipe).indices.length);
    assert.equal(evaluateObject(object).positions.length, mesh.indices.length * 3 * 2);
  });

  check('invalid face extrusion rolls back earlier batch additions and candidate remains read-only', () => {
    const ws = make(); ws.replace(scene()); const before = capture(ws);
    for (const invalid of [{ faces: [0], distance: .2 }, { faces: [9999], distance: .2, bake: true }, { faces: [0], distance: 0, bake: true }]) {
      rejects(() => ws.apply({ operations: [{ op: 'add', object: { kind: 'box', name: 'must roll back' } }, { op: 'mesh_extrude', id: 'body', ...invalid }] })); unchanged(ws, before);
    }
    const candidate = ws.candidate({ operations: [{ op: 'mesh_extrude', id: 'body', faces: [0, 1], distance: .2, bake: true }] }); assert.ok(candidate.doc.objects[0].topology); unchanged(ws, before);
  });
  check('legacy sequential IDs cannot falsely rebase an edit onto a newly inserted object', () => {
    const original = scene({ objects: [{ id: 'obj_1', kind: 'box', name: 'old body', position: [0,0,0] }] }), ws = make(original);
    ws.update({ id: 'obj_1', material: { roughness: .1 } }); const before = capture(ws);
    const regenerated = scene({ objects: [{ id: 'obj_1', kind: 'box', name: 'inserted unrelated object' }, { id: 'obj_2', kind: 'box', name: 'old body' }] });
    rejects(() => ws.replace(regenerated, { rebase: true }), 'override_conflict'); unchanged(ws, before);
  });

  check('exhausted ID counters and unknown modifiers on empty compounds fail atomically', () => {
    const ws = make(scene({ nextId: Number.MAX_SAFE_INTEGER })), before = capture(ws);
    rejects(() => ws.add({ kind: 'box' })); unchanged(ws, before);
    rejects(() => ws.apply({ operations: [{ op: 'add', object: { id: 'empty', kind: 'custom', parts: [], modifiers: [{ type: 'unknown' }] } }] })); unchanged(ws, before);
    rejects(() => ws.apply({ operations: [{ op: 'add', object: box('body') }, { op: 'remove', id: 'body' }] })); unchanged(ws, before);
  });

  check('source UI recipe descriptors cannot be silently discarded and unrelated root fields merge narrowly', () => {
    const ws = make(scene({ camera: { azimuth: 1, elevation: 2 } })), edited = ws.snapshot().doc;
    edited.camera.azimuth = 3; ws.replace(edited, { source: 'edit' });
    const generated = scene({ camera: { azimuth: 4, elevation: 5, fov: 35 } }); const rebased = ws.replace(generated, { rebase: true }); assert.deepEqual(rebased.doc.camera, { azimuth: 3, elevation: 5, fov: 35 });
    const descriptorEdit = ws.snapshot().doc; descriptorEdit.objects[0].recipe.provenance = { kind: 'hand' }; ws.replace(descriptorEdit, { source: 'edit' }); const before = capture(ws);
    rejects(() => ws.replace(generated, { rebase: true }), 'override_conflict'); unchanged(ws, before);
  });
  check('undefined optional guards are omitted without admitting undefined scene values', () => {
    const ws = make(), optional = { expectedRevision: undefined, expectedHash: undefined, label: undefined };
    ws.replace(scene(), optional); ws.update({ id: 'body', name: 'optional controls', ...optional });
    const candidate = ws.candidate({ operations: [{ op: 'visibility', id: 'body', visible: false }], ...optional }); assert.equal(candidate.doc.objects[0].visible, false);
    ws.checkpoint({ ...optional }); ws.history({ includeDoc: undefined, ...optional }); ws.snapshot(optional);
    const before = capture(ws), invalid = scene(); invalid.meta.bad = undefined;
    rejects(() => ws.replace(invalid, optional)); unchanged(ws, before); rejects(() => ws.replace(scene(), { expectedRevision: null })); unchanged(ws, before);
  });
} finally {
  // Verify the resolved cleanup target is exactly this run's test-owned subtree.
  assert.equal(path.dirname(root), testsDir); assert.ok(path.basename(root).startsWith('.workspace-v2-'));
  fs.rmSync(root, { recursive: true, force: true });
}
const failed = results.filter((result) => !result.passed);
console.log(JSON.stringify({ summary: { tests: results.length, passed: results.length - failed.length, failed: failed.length }, tests: results }, null, 2));
process.exitCode = failed.length ? 1 : 0;
