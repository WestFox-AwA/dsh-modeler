// Focused checks for the pure guide reader and the generated guide docs.
// No modeler tools, resources, assets or production bindings are touched.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {
  getModelerGuide,
  guideRef,
  MODELER_GUIDE_IDS,
  MODELER_GUIDE_PROMPT,
  renderGuideMarkdown,
} from '../src/host/guide-system.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ids = [...MODELER_GUIDE_IDS];
const subjects = ids.filter((id) => id !== 'main');
const expectedRef = (id) => ({ tool: 'modeler_workbench', args: { action: 'guide', args: { id } } });
const jsonLength = (value) => JSON.stringify(value).length;
const docsFile = (id) => (id === 'main' ? path.join(root, 'docs', 'AGENT-GUIDE.md') : path.join(root, 'docs', 'guides', `${id}.md`));
const readDoc = (id) => fs.readFileSync(docsFile(id), 'utf8').replace(/\r\n/g, '\n');

assert.deepEqual(ids, ['main', 'resources', 'explore', 'construct', 'assembly', 'edit', 'materials', 'delivery', 'legacy']);
assert.deepEqual(guideRef(), expectedRef('main'));
assert.deepEqual(guideRef('edit'), expectedRef('edit'));

for (const id of ids) {
  const guide = getModelerGuide({ id });
  const isMain = id === 'main';
  assert.equal(guide.ok, true, `${id}: ok`);
  assert.equal(guide.schema, 'dsh-modeler.guide', `${id}: schema`);
  assert.equal(guide.schemaVersion, 1, `${id}: schemaVersion`);
  assert.equal(guide.id, id, `${id}: id`);
  assert.deepEqual(guide.retrieval, expectedRef(id), `${id}: canonical retrieval`);
  assert.equal(typeof guide.purpose, 'string', `${id}: purpose`);
  assert.ok(guide.purpose.length > 40, `${id}: meaningful purpose`);
  assert.ok(Array.isArray(guide.contracts) && guide.contracts.length >= 2, `${id}: contract refs`);
  if (isMain) {
    assert.ok(guide.mentalModel && Object.keys(guide.mentalModel).length >= 5, `${id}: mental model`);
    assert.ok(Array.isArray(guide.directory) && guide.directory.length === subjects.length, `${id}: directory`);
    assert.ok(Array.isArray(guide.capabilities) && guide.capabilities.length >= 3, `${id}: capabilities`);
  } else {
    assert.ok(Array.isArray(guide.when) && guide.when.length >= 3, `${id}: when`);
    assert.ok(Array.isArray(guide.loop) && guide.loop.length >= 4, `${id}: usable loop`);
    assert.ok(Array.isArray(guide.sideEffects) && guide.sideEffects.length >= 3, `${id}: side effects`);
    assert.ok(Array.isArray(guide.evidence) && guide.evidence.length >= 3, `${id}: evidence`);
    assert.ok(Array.isArray(guide.recovery) && guide.recovery.length >= 3, `${id}: recovery`);
    assert.ok(guide.example && (guide.example.call || guide.example.code), `${id}: usable example`);
  }
  assert.ok(jsonLength(guide) <= (isMain ? 5500 : 10000), `${id}: JSON size budget`);
  assert.deepEqual(JSON.parse(JSON.stringify(guide)), guide, `${id}: plain JSON`);
  assert.deepEqual(getModelerGuide({ id }), guide, `${id}: stable repeat`);

  // Each call returns an independent deep clone.
  const original = JSON.stringify(guide);
  const mutated = getModelerGuide({ id });
  if (mutated.loop?.[0]) {
    mutated.loop[0].goal = 'mutated';
    if (mutated.loop[0].call?.args) mutated.loop[0].call.args.injected = true;
  }
  if (mutated.directory?.[0]) mutated.directory[0].when = 'mutated';
  mutated.purpose = 'mutated';
  assert.equal(JSON.stringify(getModelerGuide({ id })), original, `${id}: clone isolation`);
}

const main = getModelerGuide({ id: 'main' });
assert.equal(main.directory.length, subjects.length, 'main: full directory');
for (const item of main.directory) {
  assert.ok(subjects.includes(item.id), `main: directory id ${item.id}`);
  assert.equal(typeof item.when, 'string', `main: directory when ${item.id}`);
  assert.deepEqual(item.call, expectedRef(item.id), `main: directory call ${item.id}`);
}
assert.ok(main.capabilities.some((line) => line.includes('modeler_geometry')), 'main: geometry capability');
assert.ok(main.contracts.some((item) => item.need.includes('API3')), 'main: exact API contract pointer');

const unknown = getModelerGuide({ id: 'not-a-guide' });
assert.equal(unknown.ok, false);
assert.equal(unknown.code, 'unknown_guide');
assert.equal(unknown.schema, 'dsh-modeler.guide');
assert.equal(unknown.requestedId, 'not-a-guide');
assert.equal(unknown.directory.length, ids.length);
assert.deepEqual(unknown.next, expectedRef('main'));
assert.ok(jsonLength(unknown) <= 4000, 'unknown: bounded reply');
assert.equal(getModelerGuide({ id: 'x'.repeat(1000) }).requestedId.length, 80, 'unknown: bounded id echo');
assert.equal(getModelerGuide(null).id, 'main', 'null options: default main');
assert.equal(getModelerGuide({ id: 42 }).id, 'main', 'non-string id: default main');

assert.equal(typeof MODELER_GUIDE_PROMPT, 'string');
assert.ok(MODELER_GUIDE_PROMPT.length <= 700, 'prompt: brief');
assert.ok(MODELER_GUIDE_PROMPT.includes('action:"guide"'), 'prompt: canonical pointer');
assert.ok(MODELER_GUIDE_PROMPT.includes('assetId/contentHash'), 'prompt: version essential');
assert.ok(MODELER_GUIDE_PROMPT.includes('automatic display preparation'), 'prompt: material prep essential');

// The reader is pure: no imports, fs, resource registry, backend or service.
const source = fs.readFileSync(path.join(root, 'src', 'host', 'guide-system.js'), 'utf8');
assert.ok(!/^\s*import\s/m.test(source), 'reader: no imports');
assert.ok(!/\b(readFile|writeFile|readdirSync|createResources|backend\.request)\b/.test(source), 'reader: no I/O or service calls');

// Docs are generated from the same data; a stale hand edit must fail this test.
for (const id of ids) {
  assert.equal(readDoc(id), renderGuideMarkdown(id), `${id}: docs match guide data`);
  assert.ok(readDoc(id).includes('Generated from `src/host/guide-system.js`'), `${id}: generated notice`);
  assert.ok(readDoc(id).includes(JSON.stringify(expectedRef(id))), `${id}: canonical call in docs`);
}

console.log(`guide-content: ${ids.length} guides, main ${jsonLength(main)} chars, max subject ${Math.max(...subjects.map((id) => jsonLength(getModelerGuide({ id }))))} chars, docs in sync`);
