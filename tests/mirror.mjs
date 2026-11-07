import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Mirroring is the operation most likely to leave inside-out geometry, and the
// naive route (a negative scale) is silently clamped away by the doc validator,
// which deletes the part instead of complaining.
const { runModelerScript } = await import(pathToFileURL(path.resolve('lib/script.js')).href);
const { auditDoc } = await import(pathToFileURL(path.resolve('lib/audit.js')).href);
const { worldBounds } = await import(pathToFileURL(path.resolve('lib/assembly.js')).href);

const tests = [];
function test(name, run) {
  try { tests.push({ name, ...run() }); }
  catch (e) { tests.push({ name, passed: false, error: String(e && e.stack || e) }); }
}
const build = (code) => { const doc = runModelerScript(code); return { doc, boxes: worldBounds(doc), audit: auditDoc(doc) }; };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

const SHAPE = `m.rbox(0.4,0.3,0.9,0.03).at(1.2,0.5,0.2).rot(0.3,0.4,0.1).mat(m.metal())`;

test('a mirrored copy lands at -x with identical y and z extents', () => {
  const { boxes } = build(`const p = ${SHAPE}; return m.scene('t',[p, m.mirror(p)],{});`);
  const [a, b] = boxes;
  const ok = near(a.min[1], b.min[1]) && near(a.max[1], b.max[1])
    && near(a.min[2], b.min[2]) && near(a.max[2], b.max[2])
    && near(a.min[0], -b.max[0]) && near(a.max[0], -b.min[0]);
  return { passed: ok, left: a.min.map((v) => +v.toFixed(2)), right: b.min.map((v) => +v.toFixed(2)) };
});

test('a mirrored copy is still outward-facing', () => {
  const { audit } = build(`const p = ${SHAPE}; return m.scene('t',[p, m.mirror(p)],{});`);
  return { passed: audit.summary.invertedObjects === 0 && audit.summary.openObjects === 0, summary: audit.summary };
});

test('mirroring about a pivot and about z', () => {
  const { boxes } = build(`
    const p = m.box(0.2,0.2,0.2).at(0,0,1);
    return m.scene('t',[m.mirror(p,'x',2), m.mirror(p,'z',0)],{});
  `);
  const ok = near(boxes[0].min[0], 3.9) && near(boxes[1].max[2], -0.9);
  return { passed: ok, a: boxes[0].min.map((v) => +v.toFixed(2)), b: boxes[1].max.map((v) => +v.toFixed(2)) };
});

test('bake keeps the world bounds of the part it bakes', () => {
  const raw = build(`const p = ${SHAPE}; return m.scene('t',[p],{});`);
  const baked = build(`const p = ${SHAPE}; return m.scene('t',[m.bake(p)],{});`);
  const ok = [0, 1, 2].every((k) => near(raw.boxes[0].min[k], baked.boxes[0].min[k]) && near(raw.boxes[0].max[k], baked.boxes[0].max[k]));
  return { passed: ok, raw: raw.boxes[0].size.map((v) => +v.toFixed(3)), baked: baked.boxes[0].size.map((v) => +v.toFixed(3)) };
});

test('a negative scale is rejected instead of silently collapsing the part', () => {
  let message = '';
  try { runModelerScript(`const p = m.box(1,1,1).scaleTo(-1,1,1); return m.scene('t',[p],{});`); }
  catch (e) { message = String(e && e.message || e); }
  return { passed: message.includes('m.mirror'), message: message.slice(0, 120) };
});

test('a zero scale is rejected too', () => {
  let threw = false;
  try { runModelerScript(`const p = m.box(1,1,1).scaleTo(1,0,1); return m.scene('t',[p],{});`); }
  catch (_) { threw = true; }
  return { passed: threw };
});

const summary = { tests: tests.length, passed: tests.filter((t) => t.passed).length, failed: tests.filter((t) => !t.passed).length };
console.log(JSON.stringify({ summary, tests }, null, 2));
process.exitCode = summary.failed ? 1 : 0;
