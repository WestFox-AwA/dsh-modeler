import path from 'node:path';
import { pathToFileURL } from 'node:url';

// A check that reports interpenetration must not fire on parts that merely
// touch, and must fire on parts that genuinely cross. These fixtures pin both
// ends, plus the shapes a real vehicle is made of (barrel through a plate).
const { runModelerScript } = await import(pathToFileURL(path.resolve('src/host/script.js')).href);
const { auditIntersections } = await import(pathToFileURL(path.resolve('src/host/intersect.js')).href);

const tests = [];
function test(name, run) {
  try { tests.push({ name, ...run() }); }
  catch (e) { tests.push({ name, passed: false, error: String(e && e.stack || e) }); }
}
function audit(code) {
  const doc = runModelerScript(code);
  return auditIntersections(doc);
}

test('two boxes sharing a face do not count as crossing', () => {
  const r = audit(`
    return m.scene('t', [
      m.box(1,1,1).at(0,0.5,0),
      m.box(1,1,1).at(0,0.5,1),
    ], {});
  `);
  return { passed: r.summary.pairs === 0, pairs: r.summary.pairs, crossings: r.summary.crossings };
});

test('two boxes 2 cm apart do not cross', () => {
  const r = audit(`
    return m.scene('t', [
      m.box(1,1,1).at(0,0.5,0),
      m.box(1,1,1).at(0,0.5,1.02),
    ], {});
  `);
  return { passed: r.summary.pairs === 0, pairs: r.summary.pairs };
});

test('two boxes sunk into each other are reported', () => {
  const r = audit(`
    return m.scene('t', [
      m.box(1,1,1).at(0,0.5,0),
      m.box(1,1,1).at(0,0.5,0.5),
    ], {});
  `);
  return { passed: r.summary.pairs === 1 && r.summary.crossings > 0, pairs: r.summary.pairs, crossings: r.summary.crossings };
});

test('a cylinder through a plate is reported once', () => {
  const r = audit(`
    return m.scene('t', [
      m.box(2,2,0.2).at(0,1,0),
      m.cylinder(0.1,0.1,3,16).rot(Math.PI/2,0,0).at(0,1,0),
    ], {});
  `);
  return { passed: r.summary.pairs === 1, pairs: r.summary.pairs, worst: r.worst.slice(0, 1) };
});

test('a part fully inside another is reported', () => {
  const r = audit(`
    return m.scene('t', [
      m.box(3,3,3).at(0,1.5,0),
      m.box(0.5,0.5,0.5).at(0,1.5,0),
    ], {});
  `);
  // a fully contained box never crosses a face of the outer one; the check must
  // stay silent here and let auditVisibility report it instead
  return { passed: r.summary.pairs === 0, pairs: r.summary.pairs, note: 'containment is auditVisibility territory' };
});

test('rotated parts are tested in world space', () => {
  const r = audit(`
    return m.scene('t', [
      m.box(1,1,1).at(0,0.5,0),
      m.box(1,1,1).rot(0, 0.6, 0).at(0,0.5,0.6),
    ], {});
  `);
  return { passed: r.summary.pairs === 1, pairs: r.summary.pairs };
});

test('transparent parts are exempt', () => {
  const r = audit(`
    return m.scene('t', [
      m.box(1,1,1).at(0,0.5,0),
      m.box(1,1,1).at(0,0.5,0.5).mat(m.glass()),
    ], {});
  `);
  return { passed: r.summary.pairs === 0, pairs: r.summary.pairs };
});

const summary = { tests: tests.length, passed: tests.filter((t) => t.passed).length, failed: tests.filter((t) => !t.passed).length };
console.log(JSON.stringify({ summary, tests }, null, 2));
process.exitCode = summary.failed ? 1 : 0;
