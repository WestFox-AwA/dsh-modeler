// First-use help routing: every docs entrypoint must stay pure on an unbound
// session, then route the same calls to exact contracts without inferring the
// asset kind from a snapshot. Uses the real guide system and real resources in
// an isolated temp home, with a wrapper that records every resource access.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {assertToolValue} from '../src/host/tool-value.js';
import {getModelerGuide, MODELER_GUIDE_IDS} from '../src/host/guide-system.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(root, 'tests/.help-routing-'));
const bundle = path.join(root, '.test-help-routing-' + path.basename(temp) + '.mjs');
const wrapper = path.join(temp, 'resources-wrapper.mjs');
const callLog = path.join(temp, 'resource-calls.log');
const tests = [], disposers = [];
async function test(name, fn) { try { await fn(); tests.push({name, passed: true}); } catch (error) { tests.push({name, passed: false, error: error.stack}); } }
const store = () => path.join(temp, '.dsh');
const listing = () => fs.existsSync(store()) ? fs.readdirSync(store(), {recursive: true}).map(String).sort() : [];
const catalogBytes = () => { const file = path.join(store(), 'modeler-resources', 'catalog.json'); return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null; };
const takeCalls = () => { const value = fs.existsSync(callLog) ? fs.readFileSync(callLog, 'utf8').split(/\r?\n/).filter(Boolean) : []; if (fs.existsSync(callLog)) fs.rmSync(callLog); return [...new Set(value)]; };
try {
  fs.writeFileSync(wrapper, `import fs from 'node:fs';
import * as real from ${JSON.stringify(path.join(root, 'src/host/resources.js'))};
export * from ${JSON.stringify(path.join(root, 'src/host/resources.js'))};
export function createResources(options){
 const log = name => fs.appendFileSync(${JSON.stringify(callLog)}, name + '\\n');
 const r = real.createResources(options);
 for (const name of ['getSession','forAsset','create','open','fork','binding','metadataForSession','list']) {
  const original = r[name]?.bind(r); if (!original) continue;
  r[name] = (...args) => { log(name); return original(...args); };
 }
 return r;
}
`);
  await build({
    entryPoints: [path.join(root, 'index.js')], outfile: bundle, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent',
    plugins: [{name: 'help-routing-fixture', setup(b) {
      b.onResolve({filter: /^\.\/lib\/resources\.js$/}, args => args.importer === path.join(root, 'index.js') ? {path: wrapper} : undefined);
      b.onResolve({filter: /^@deepseek-ai\/dsh-tools$/}, () => ({path: 'definition', namespace: 'fixture'}));
      b.onResolve({filter: /^node:os$/}, () => ({path: 'home', namespace: 'fixture'}));
      b.onLoad({filter: /.*/, namespace: 'fixture'}, args => ({contents: args.path === 'definition' ? 'export const defineTool=value=>value;' : 'export default {homedir:()=>' + JSON.stringify(temp) + '};', loader: 'js'}));
    }}],
  });
  const plugin = await import(pathToFileURL(bundle).href);
  const tools = new Map(), sections = [], routes = new Map();
  const ctx = {
    tools: {register: tool => { assert(!tools.has(tool.name)); tools.set(tool.name, tool); return () => tools.delete(tool.name); }},
    get: () => undefined,
    effect: (fn, label) => { assert.equal(label, 'modeler scoped live bridge'); try { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose); } catch {} return () => {}; },
    inject: (dependencies, fn) => fn({systemPrompt: {section: value => sections.push(value)}, connection: {fetch: {register: route => { routes.set(route.path, route); return () => routes.delete(route.path); }}}}),
  };
  plugin.apply(ctx);
  const baseline = listing();
  const A = 'session-help-routing-A', B = 'session-help-routing-B';
  const exec = id => ({agent: {id}, callId: 'help-' + id, rootCallId: 'help-root'});
  const invoke = async (name, args, sid = A) => { const result = await tools.get(name).execute(args, exec(sid)); assertToolValue(result); return result; };
  const work = (action, args = {}, sid = A) => invoke('modeler_workbench', {action, args}, sid);

  await test('one brief guide prompt section carries the material autoprep essentials', async () => {
    const guides = sections.filter(s => s.name === 'modeler:guide');
    assert.equal(guides.length, 1);
    assert.equal(guides[0].order, 1530);
    assert(/modeler_workbench|guide/.test(guides[0].text));
    assert(/automatic display preparation|automatic material preparation|no extra bake/i.test(guides[0].text));
    assert.equal(sections.some(s => s.name === 'modeler:material-delivery'), false);
  });

  await test('every help entrypoint on an unbound session leaves catalog, manifest and bindings untouched', async () => {
    const before = listing();
    const probes = [
      ['modeler_workbench', {}],
      ['modeler_workbench', {action: 'help'}],
      ['modeler_workbench', {action: 'help', args: {topic: 'start'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'resources'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'explore'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'construct'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'assembly'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'edit'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'materials'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'delivery'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'legacy'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'api', query: 'm.cylinder'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'legacy_api', query: 'm.cylinder'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'actions', query: 'edit'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'tree'}}],
      ['modeler_workbench', {action: 'help', args: {query: 'm.mesh'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'geometry'}}],
      ['modeler_workbench', {action: 'help', args: {topic: 'editing'}}],
      ['modeler_workbench', {action: 'guide', args: {id: 'main'}}],
      ['modeler_workbench', {action: 'guide', args: {id: 'construct'}}],
      ['modeler_workbench', {action: 'guide', args: {id: 'materials'}}],
      ['modeler_workbench', {action: 'guide', args: {id: 'unknown-id'}}],
      ['modeler_geometry', {op: 'help'}],
      ['modeler_geometry', {op: 'help', topic: 'start'}],
      ['modeler_geometry', {op: 'help', topic: 'construct'}],
      ['modeler_geometry', {op: 'help', query: 'm.mesh'}],
      ['modeler_geometry', {op: 'help', query: 'm.cylinder'}],
      ['modeler_material', {op: 'help'}],
      ['modeler_material', {op: 'help', topic: 'surface'}],
      ['modeler_material', {op: 'help', topic: 'delivery'}],
      ['modeler_material', {op: 'help', topic: 'task'}],
      ['modeler_workbench', {action: 'catalog'}],
      ['modeler_workbench', {action: 'status'}],
      ['modeler_workbench', {action: 'begin'}],
    ];
    for (const [name, args] of probes) {
      const sid = 'fresh-' + Math.random().toString(36).slice(2);
      takeCalls();
      const value = await invoke(name, args, sid);
      const calls = takeCalls();
      const label = name + ' ' + JSON.stringify(args);
      if (value.ok === false) assert.equal(value.code, 'unknown_guide', label);
      else assert.equal(value.ok, true, label);
      assert.equal(calls.filter(c => c !== 'metadataForSession').length, 0, label + ' accessed ' + calls.join(','));
      if (name === 'modeler_workbench' && args.action !== 'status' && args.action !== 'begin') assert.deepEqual(calls, [], label + ' accessed ' + calls.join(','));
      assert.deepEqual(listing(), before, label + ' wrote resource files');
      assert.equal(catalogBytes(), null, label + ' created a catalog');
    }
  });

  await test('a fresh viewId HTTP POST for pure help/guide/status/begin does not initialize a panel resource', async () => {
    const route = routes.get('/api/modeler/workbench'); assert(route);
    const sid = 'fresh-http-' + Math.random().toString(36).slice(2), viewId = 'view-http-' + Math.random().toString(36).slice(2);
    const call = async (action, args = {}) => {
      const url = 'http://local/api/modeler/workbench?sessionId=' + encodeURIComponent(sid) + '&viewId=' + encodeURIComponent(viewId);
      const response = await route.fetch(new Request(url, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({sessionId: sid, viewId, action, args})}));
      return {status: response.status, body: await response.json()};
    };
    const before = listing();
    const help = await call('help'); assert.equal(help.status, 200); assert.equal(help.body.id, 'main');
    const guide = await call('guide', {id: 'construct'}); assert.equal(guide.status, 200); assert.equal(guide.body.id, 'construct');
    const status = await call('status'); assert.equal(status.status, 200); assert.equal(status.body.bound, false); assert.equal(status.body.assetId, null);
    const begin = await call('begin'); assert.equal(begin.status, 200); assert.equal(begin.body.bound, false); assert.equal(begin.body.assetId, null);
    const material = await call('materials', {op: 'help'}); assert.equal(material.status, 200); assert.equal(material.body.guide.id, 'materials');
    const geometry = await call('geometry', {op: 'help'}); assert.equal(geometry.status, 200); assert.equal(geometry.body.apiVersion, 3); assert.equal(geometry.body.guide.id, 'construct');
    const projects = await call('projects'); assert.equal(projects.status, 200); assert(Array.isArray(projects.body.projects));
    const catalog = await call('catalog'); assert.equal(catalog.status, 200); assert(catalog.body.commands && catalog.body.guide);
    assert.deepEqual(listing(), before); assert.equal(catalogBytes(), null);
    const bound = await invoke('modeler_workbench', {action: 'status'}, sid);
    assert.equal(bound.bound, false); assert.equal(bound.assetId, null);
  });

  await test('unbound status and begin report no resource, null identity and explicit new/open/fork next', async () => {
    const status = await work('status'), begin = await work('begin');
    for (const value of [status, begin]) {
      assert.equal(value.ok, true); assert.equal(value.bound, false);
      assert.equal(value.assetId, null); assert.equal(value.revision, null); assert.equal(value.contentHash, null);
      assert.equal(value.resourceId, null);
      assert.equal(Object.hasOwn(value, 'expectedHash'), false);
    }
    assert.equal(begin.next.action, 'guide'); assert.equal(begin.next.args.id, 'resources');
    const actions = begin.calls.map(step => step.action);
    assert(actions.includes('new')); assert(actions.includes('open')); assert(actions.includes('fork')); assert(actions.includes('status'));
    assert.deepEqual(listing(), baseline);
  });

  await test('inspect on an unbound session errors with new/open/fork guidance instead of creating a resource', async () => {
    const value = await invoke('modeler_inspect', {});
    assert.equal(value.ok, false); assert.equal(value.code, 'unbound_resource');
    assert(value.next.some(step => step.action === 'new'));
    assert.deepEqual(listing(), baseline); assert.equal(catalogBytes(), null);
  });

  await test('default execute opens the main guide, not begin or a resource', async () => {
    const value = await work('help');
    assert.equal(value.ok, true); assert.equal(value.id, 'main');
    assert.equal(value.next.tool, 'modeler_workbench'); assert.equal(value.next.args.action, 'guide');
    assert.equal(value.next.args.args.id, 'resources');
    assert(value.purpose || value.mentalModel); assert(value.directory.some(entry => entry.id === 'construct'));
    const direct = await invoke('modeler_workbench', {});
    assert.equal(direct.id, 'main'); assert.equal(direct.assetId, undefined);
    assert.deepEqual(listing(), baseline);
  });

  await test('guide ids route to the real subject guides and unknown ids recover', async () => {
    const construct = await work('guide', {id: 'construct'});
    assert.equal(construct.id, 'construct'); assert.equal(construct.schema, 'dsh-modeler.guide');
    assert.equal(construct.schemaVersion, 1); assert.equal(construct.ok, true); assert(construct.purpose);
    const materials = await work('guide', {id: 'materials'});
    assert.equal(materials.id, 'materials'); assert.equal(materials.schema, 'dsh-modeler.guide');
    assert.equal(materials.schemaVersion, 1); assert(materials.contracts.some(c => c.call.args.op === 'help'));
    const edit = await work('help', {topic: 'edit'});
    assert.equal(edit.id, 'edit'); assert.equal(edit.schema, 'dsh-modeler.guide'); assert.equal(edit.schemaVersion, 1);
    const materialTopic = await work('help', {topic: 'materials'});
    assert.equal(materialTopic.id, 'materials'); assert.equal(materialTopic.schemaVersion, 1);
    const actionEdit = await work('help', {topic: 'actions', query: 'edit'});
    assert.equal(actionEdit.topic, 'actions'); assert.equal(actionEdit.items[0].action, 'edit');
    const unknown = await work('guide', {id: 'unknown-id'});
    assert.equal(unknown.ok, false); assert.equal(unknown.code, 'unknown_guide');
    assert(unknown.directory.length >= 5); const recovery = unknown.recovery || unknown.next;
    assert.equal(recovery.tool, 'modeler_workbench'); assert.equal(recovery.args.action, 'guide');
    const longId = await work('guide', {id: 'x'.repeat(1000)});
    assert.equal(longId.code, 'unknown_guide'); assert.equal(longId.requestedId.length, 80);
    assert(longId.directory.length >= 5);
  });

  await test('native and legacy exact help stay on their own API branches without an asset', async () => {
    const nativeCylinder = await invoke('modeler_geometry', {op: 'help', query: 'm.cylinder'});
    assert.equal(nativeCylinder.apiVersion, 3); assert(nativeCylinder.signature.includes('radius'));
    const legacyCylinder = await work('help', {topic: 'legacy_api', query: 'm.cylinder'});
    assert.equal(legacyCylinder.topic, 'api'); assert.equal(legacyCylinder.items[0].id, 'm.cylinder');
    assert.notEqual(nativeCylinder.signature, legacyCylinder.items[0].signature);
    assert(legacyCylinder.items[0].signature.includes('radiusTop'));
    const nativeMesh = await invoke('modeler_geometry', {op: 'help', query: 'm.mesh'});
    assert(nativeMesh.signature.includes('polygonFaces'));
    const legacyMesh = await work('help', {topic: 'legacy_api', query: 'm.mesh'});
    assert.equal(legacyMesh.items[0].id, 'm.mesh'); assert.notEqual(nativeMesh.signature, legacyMesh.items[0].signature);
    const workbenchMesh = await work('help', {query: 'm.mesh'});
    assert.equal(workbenchMesh.signature, nativeMesh.signature);
    const actionHelp = await work('help', {topic: 'actions', query: 'edit'});
    assert(actionHelp.items[0].action === 'edit');
    const tree = await work('help', {topic: 'tree'});
    assert.equal(tree.node.id, 'root');
    for (const legacyTopic of ['modeling', 'observe', 'relations', 'source']) {
      const named = await work('help', {topic: legacyTopic});
      assert.equal(named.ok, true, legacyTopic); assert(Array.isArray(named.items));
      assert(named.guide.tool === 'modeler_workbench');
    }
    const unknown = await work('help', {topic: 'not-a-topic'});
    assert.equal(unknown.ok, false); assert.equal(unknown.code, 'unknown_topic');
    assert(unknown.topics.some(entry => entry.id === 'start'));
  });

  await test('geometry and material help return subject guides plus exact contracts with the requested version', async () => {
    const geometry = await invoke('modeler_geometry', {op: 'help'});
    assert.equal(geometry.apiVersion, 3); assert.equal(geometry.guide.id, 'construct');
    assert.equal(geometry.topic, 'start'); assert(geometry.example);
    const v2 = await invoke('modeler_geometry', {op: 'help', apiVersion: 2});
    assert.equal(v2.apiVersion, 2); assert.equal(v2.guide.id, 'construct');
    const exact = await invoke('modeler_geometry', {op: 'help', topic: 'construct'});
    assert.equal(exact.guide.args.args.id, 'construct'); assert(exact.functions);
    const material = await invoke('modeler_material', {op: 'help'});
    assert.equal(material.guide.id, 'materials'); assert(material.purpose);
    const surface = await invoke('modeler_material', {op: 'help', topic: 'surface'});
    assert.equal(surface.guideRef.args.args.id, 'materials'); assert(surface.version);
  });

  await test('a bound session keeps its identity while help stays asset-free', async () => {
    const created = await work('new', {title: 'Routing A'});
    assert(created.assetId);
    const script = await invoke('modeler_script', {code: "return m.scene('Routing A',[m.box(2,.4,.7,'Body').key('body')]);", expectedRevision: created.revision});
    assert.equal(script.ok, true, JSON.stringify(script));
    const status = await work('status');
    assert.equal(status.bound, true); assert.equal(status.assetId, script.assetId);
    assert.equal(status.revision, script.revision); assert.equal(status.contentHash, script.contentHash);
    const begin = await work('begin');
    assert.equal(begin.guard.assetId, script.assetId); assert.equal(begin.guard.expectedRevision, script.revision);
    assert.equal(begin.guard.expectedHash, script.contentHash);
    const before = listing(); const catalog = catalogBytes();
    takeCalls();
    for (const [name, args] of [
      ['modeler_workbench', {action: 'help'}],
      ['modeler_workbench', {action: 'help', args: {topic: 'legacy_api', query: 'm.mesh'}}],
      ['modeler_geometry', {op: 'help', query: 'm.mesh'}],
      ['modeler_material', {op: 'help'}],
    ]) await invoke(name, args);
    assert.deepEqual(takeCalls(), []);
    assert.deepEqual(listing(), before);
    assert.equal(catalogBytes(), catalog);
    assert.equal((await work('status')).assetId, script.assetId);
  });

  await test('every documented guide contract resolves a non-empty exact contract without mutating examples', async () => {
    const seen = new Set();
    for (const id of MODELER_GUIDE_IDS) {
      const guide = getModelerGuide({id});
      assert.equal(guide.ok, true, id);
      for (const entry of guide.contracts || []) {
        const call = entry.call; const key = JSON.stringify(call); if (seen.has(key)) continue; seen.add(key);
        const value = await invoke(call.tool, call.args);
        assert(value && typeof value === 'object', key + ' returned nothing');
        const args = call.args;
        if (call.tool === 'modeler_workbench' && args.action === 'help') {
          if (args.args.topic === 'actions') {
            assert(value.items.length > 0, key); assert.equal(value.items[0].action, args.args.query, key);
            assert(value.items[0].arguments && typeof value.items[0].arguments === 'object', key);
          } else if (args.args.topic === 'legacy_api') {
            assert(value.items.length > 0, key); assert(value.items[0].id, key);
          } else if (args.args.topic === 'start') {
            assert.equal(value.id, 'main', key); assert.equal(value.schema, 'dsh-modeler.guide', key);
          } else if (args.args.topic === 'source') {
            assert(value.items.length > 0, key);
          } else assert.fail(key + ' unexpected guide contract');
        } else if (call.tool === 'modeler_geometry' && args.op === 'help') {
          assert.equal(value.ok, true, key); assert.equal(value.apiVersion, 3, key);
          assert(value.topic, key); assert(value.guide && (value.guide.schema === 'dsh-modeler.guide' || value.guide.tool === 'modeler_workbench'), key);
        } else if (call.tool === 'modeler_geometry' && args.op === 'capabilities') {
          assert(value.code || value.ok !== undefined, key);
        } else if (call.tool === 'modeler_material' && args.op === 'help') {
          assert.equal(value.ok, true, key); assert(value.purpose, key);
        } else if (call.tool === 'modeler_workbench' && args.action === 'status') {
          assert.equal(value.ok, true, key); assert.equal(typeof value.bound, 'boolean', key);
        } else assert.fail(key + ' unexpected guide contract');
      }
    }
    assert(seen.size >= 20);
  });

  await test('resource lifecycle actions have bounded exact action contracts', async () => {
    for (const query of ['new', 'open', 'fork', 'status', 'begin', 'projects', 'history', 'checkpoint', 'restore', 'delivery']) {
      const value = await work('help', {topic: 'actions', query});
      assert.equal(value.ok, true, query); assert.equal(value.items.length, 1, query);
      assert.equal(value.items[0].action, query, query);
      assert(value.items[0].summary, query); assert(value.items[0].returns.length > 0, query);
    }
  });

  await test('new, open and fork remain explicit and independent', async () => {
    const a = await work('status');
    const b = await work('new', {title: 'Routing B'}, B);
    assert(b.assetId); assert.notEqual(b.assetId, a.assetId);
    const opened = await work('open', {project: a.assetId, expectedBindingAssetId: a.assetId});
    assert.equal(opened.assetId, a.assetId);
    const fork = await work('fork', {assetId: a.assetId, title: 'Forked A'});
    assert(fork.assetId); assert.notEqual(fork.assetId, a.assetId);
    assert.equal((await work('status')).assetId, fork.assetId);
    assert.equal((await work('status', {}, B)).assetId, b.assetId);
  });
} finally {
  for (const dispose of disposers.reverse()) { try { await dispose(); } catch {} }
  try { fs.rmSync(temp, {recursive: true, force: true}); } catch {}
  try { if (path.dirname(bundle) === root && path.basename(bundle).startsWith('.test-help-routing-')) fs.rmSync(bundle, {force: true}); } catch {}
}
const failed = tests.filter(t => !t.passed);
const report = {summary: {tests: tests.length, passed: tests.length - failed.length, failed: failed.length}, tests};
fs.mkdirSync(path.join(root, 'verification/refactor-tests'), {recursive: true});
fs.writeFileSync(path.join(root, 'verification/refactor-tests/help-routing.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = failed.length ? 1 : 0;
