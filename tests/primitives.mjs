import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { worldBounds } from '../lib/assembly.js';

// The failure this must catch: an extruded profile placed with a hand-derived
// Euler rotation ends up lying in the wrong plane and still passes every other
// check, because a flat slab is perfectly valid geometry.
const { runModelerScript } = await import(pathToFileURL(path.resolve('lib/script.js')).href);

const tests = [];
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
function test(name, run) {
  try { tests.push({ name, ...run() }); }
  catch (e) { tests.push({ name, passed: false, error: String(e && e.stack || e) }); }
}
function build(code) {
  const doc = runModelerScript(code);
  return { doc, box: worldBounds(doc)[0] };
}
// a profile 1.2 wide in its first axis, 0.8 tall, extruded 0.2 thick
const PROFILE = [[-0.6, 0], [0.6, 0], [0.6, 0.8], [-0.6, 0.8]];

test("plate 'xy' puts the thickness on z", () => {
  const { box } = build(`return m.scene('t',[m.plate(${JSON.stringify(PROFILE)},0.2,'xy')],{});`);
  const ok = near(box.size[0], 1.2) && near(box.size[1], 0.8) && near(box.size[2], 0.2)
    && near(box.min[2], -0.1); // centred
  return { passed: ok, size: box.size.map((v) => +v.toFixed(3)), min: box.min.map((v) => +v.toFixed(3)) };
});

test("plate 'zy' puts the thickness on x and the profile x on z", () => {
  const { box } = build(`return m.scene('t',[m.plate(${JSON.stringify(PROFILE)},0.2,'zy')],{});`);
  const ok = near(box.size[0], 0.2) && near(box.size[1], 0.8) && near(box.size[2], 1.2)
    && near(box.min[0], -0.1);
  return { passed: ok, size: box.size.map((v) => +v.toFixed(3)), min: box.min.map((v) => +v.toFixed(3)) };
});

test("plate 'xz' puts the thickness on y and the profile y on z", () => {
  const { box } = build(`return m.scene('t',[m.plate(${JSON.stringify(PROFILE)},0.2,'xz')],{});`);
  const ok = near(box.size[0], 1.2) && near(box.size[1], 0.2) && near(box.size[2], 0.8);
  return { passed: ok, size: box.size.map((v) => +v.toFixed(3)) };
});

test('the old hand-rotated pattern is the bug plate removes', () => {
  // extrude a side profile then rotate about X: the slab ends up horizontal,
  // which is exactly what happened twice while building the specimen
  const { box } = build(`return m.scene('t',[m.extrude(${JSON.stringify(PROFILE)},0.2).rot(-Math.PI/2,0,0)],{});`);
  const flat = near(box.size[1], 0.2) && near(box.size[2], 0.8);
  return { passed: flat, size: box.size.map((v) => +v.toFixed(3)), note: 'documents the trap' };
});

test('pair builds both sides from one callback', () => {
  const { doc } = build(`
    const p = m.pair((s) => m.box(0.2,0.2,0.2).at(s*2, 0.1, 0));
    return m.scene('t', p, {});
  `);
  const xs = doc.objects.map((o) => o.position[0]).sort((a, b) => a - b);
  return { passed: doc.objects.length === 2 && near(xs[0], -2) && near(xs[1], 2), xs };
});

test('repeat places copies along a step', () => {
  const { doc } = build(`
    const one = m.box(0.1,0.1,0.1).at(0,0.5,0);
    return m.scene('t', m.repeat(one, 4, [0,0,0.5]), {});
  `);
  const zs = doc.objects.map((o) => o.position[2]).sort((a, b) => a - b);
  const ok = doc.objects.length === 4 && zs.every((z, i) => near(z, i * 0.5));
  return { passed: ok, zs };
});

test('repeat with a callback and a cloned name keeps parts distinct', () => {
  const { doc } = build(`
    const one = m.rbox(0.1,0.1,0.1,0.01,'Bolt').at(0,0.5,0);
    return m.scene('t', m.repeat(one, 3, (i) => [0, 0, i * 0.3]), {});
  `);
  const ids = new Set(doc.objects.map((o) => o.id));
  return { passed: doc.objects.length === 3 && ids.size === 3 && doc.objects.every((o) => o.name === 'Bolt') };
});

const summary = { tests: tests.length, passed: tests.filter((t) => t.passed).length, failed: tests.filter((t) => !t.passed).length };
console.log(JSON.stringify({ summary, tests }, null, 2));
process.exitCode = summary.failed ? 1 : 0;
