// Actual tool-registration path: modeler_workbench action delivery must return a
// bounded ticket and publish the package to the internal store, never inline the
// full package in the model-facing result.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {assertToolValue} from '../lib/tool-value.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(root, 'tests/.delivery-action-'));
const bundle = path.join(root, '.test-delivery-action-' + path.basename(temp) + '.mjs');
const tests = [];
async function test(name, fn) {
  try { await fn(); tests.push({name, passed: true}); }
  catch (error) { tests.push({name, passed: false, error: error.stack}); }
}
try {
  await build({
    entryPoints: [path.join(root, 'index.js')], outfile: bundle, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent',
    plugins: [{name: 'delivery-action-fixture', setup(b) {
      b.onResolve({filter: /^@deepseek-ai\/dsh-tools$/}, () => ({path: 'definition', namespace: 'fixture'}));
      b.onResolve({filter: /^node:os$/}, () => ({path: 'home', namespace: 'fixture'}));
      b.onLoad({filter: /.*/, namespace: 'fixture'}, args => ({
        contents: args.path === 'definition' ? 'export const defineTool=value=>value;' : 'export default {homedir:()=>' + JSON.stringify(temp) + '};',
        loader: 'js',
      }));
    }}],
  });
  const plugin = await import(pathToFileURL(bundle).href);
  const tools = new Map();
  const ctx = {
    tools: {register: tool => { assert(!tools.has(tool.name)); tools.set(tool.name, tool); return () => tools.delete(tool.name); }},
    get: () => undefined,
    effect: () => () => {},
    inject: (dependencies, fn) => fn({connection: {fetch: {register: () => () => {}}}}),
  };
  plugin.apply(ctx);
  const execution = {agent: {id: 'delivery-action-A'}, callId: 'delivery-call', rootCallId: 'delivery-root'};
  const invoke = async (name, args) => {
    const result = await tools.get(name).execute(args, execution);
    assertToolValue(result);
    return result;
  };
  const work = (action, args = {}) => invoke('modeler_workbench', {action, args});
  const status = await work('status');
  assert.equal(status.bound, false);
  const created = await work('new', {title: 'Delivery action'});
  const script = await invoke('modeler_script', {code: "return m.scene('Delivery',[m.box(1,2,1).key('part')]);", expectedRevision: created.revision});
  assert.equal(script.ok, true, JSON.stringify(script));

  await test('delivery returns a bounded ticket and publishes a digest-fixed package file', async () => {
    const result = await work('delivery', {assetId: script.assetId, expectedHash: script.contentHash});
    assert.equal(result.ok, true, JSON.stringify(result));
    const ticket = result.delivery;
    assert.equal(ticket.schema, 'dsh-modeler.delivery');
    assert.equal(ticket.schemaVersion, 1);
    assert.match(ticket.digest, /^[a-f0-9]{64}$/);
    assert.ok(ticket.bytes > 0);
    assert.ok(path.isAbsolute(ticket.path));
    assert.equal(path.dirname(ticket.path), path.join(temp, '.dsh', 'modeler-deliveries'));
    assert.equal(ticket.nodes, 1);
    assert.equal(ticket.leaves, 1);
    assert.equal(ticket.images, 0);
    assert.equal(ticket.triangles, 12);
    assert.ok(JSON.stringify(result).length < 2048, 'model-facing delivery receipt stays bounded');
    assert.equal(JSON.stringify(result).includes('"positions"'), false);
    const pkg = JSON.parse(fs.readFileSync(ticket.path, 'utf8'));
    assert.equal(pkg.schema, ticket.schema);
    assert.equal(pkg.schemaVersion, ticket.schemaVersion);
    assert.equal(pkg.digest, ticket.digest);
    assert.equal(pkg.leaves.length, 1);
    assert.equal(pkg.leaves[0].positions.length, 108);
    assert.equal(pkg.source.assetId, script.assetId);
    assert.equal(pkg.source.contentHash, script.contentHash);
  });

  await test('delivery requires both identity fields and a well-formed exact version', async () => {
    for (const [name, args] of Object.entries({
      'missing assetId': {expectedHash: script.contentHash},
      'empty assetId': {assetId: '   ', expectedHash: script.contentHash},
      'missing expectedHash': {assetId: script.assetId},
      'short expectedHash': {assetId: script.assetId, expectedHash: 'abc'},
      'uppercase expectedHash': {assetId: script.assetId, expectedHash: script.contentHash.toUpperCase()},
      'negative expectedRevision': {assetId: script.assetId, expectedHash: script.contentHash, expectedRevision: -1},
      'fractional expectedRevision': {assetId: script.assetId, expectedHash: script.contentHash, expectedRevision: 1.5},
      'string expectedRevision': {assetId: script.assetId, expectedHash: script.contentHash, expectedRevision: '1'},
    })) {
      const result = await work('delivery', args);
      assert.equal(result.ok, false, name);
      assert.equal(result.code, 'invalid_argument', name);
    }
  });

  await test('delivery guards its exact version and rejects unknown fields', async () => {
    const conflict = await work('delivery', {assetId: script.assetId, expectedHash: '0'.repeat(64)});
    assert.equal(conflict.ok, false);
    assert.equal(conflict.code, 'conflict');
    const unknown = await work('delivery', {assetId: script.assetId, expectedHash: script.contentHash, unexpected: true});
    assert.equal(unknown.ok, false);
    assert.equal(unknown.code, 'invalid_argument');
    const wrongType = await work('delivery', {assetId: script.assetId, expectedHash: script.contentHash, expectedRevision: '1'});
    assert.equal(wrongType.ok, false);
    assert.equal(wrongType.code, 'invalid_argument');
  });

  await test('delivery is discoverable from the workbench command catalogue', async () => {
    const catalog = await work('catalog');
    assert.equal(typeof catalog.commands.delivery, 'string');
    assert.match(catalog.commands.delivery, /交付包/);
    const tool = tools.get('modeler_workbench');
    assert.match(tool.description, /delivery/);
    assert.match(tool.parameters.action.description, /delivery/);
  });
} finally {
  for (const test of tests) {
    if (!test.passed) console.error(test.name, test.error);
  }
  if (path.dirname(bundle) === root && path.basename(bundle).startsWith('.test-delivery-action-')) fs.rmSync(bundle, {force: true});
  if (path.dirname(temp) === path.join(root, 'tests') && path.basename(temp).startsWith('.delivery-action-')) fs.rmSync(temp, {recursive: true, force: true});
}
const failed = tests.filter(test => !test.passed);
console.log(JSON.stringify({summary: {tests: tests.length, passed: tests.length - failed.length, failed: failed.length}, tests}, null, 2));
process.exitCode = failed.length ? 1 : 0;
