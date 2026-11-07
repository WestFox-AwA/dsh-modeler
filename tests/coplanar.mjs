import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Faces that share a plane over the same area cannot be depth-ordered: they
// shimmer as the camera moves. The fixtures pin the exact case and the two
// near-misses that must stay silent.
const { runModelerScript } = await import(pathToFileURL(path.resolve('lib/script.js')).href);
const { auditCoplanar } = await import(pathToFileURL(path.resolve('lib/intersect.js')).href);

const tests = [];
function test(name, code, expectPairs) {
  try {
    const doc = runModelerScript(code);
    const r = auditCoplanar(doc);
    tests.push({ name, passed: r.summary.pairs === expectPairs, pairs: r.summary.pairs, faces: r.summary.faces, expected: expectPairs });
  } catch (e) { tests.push({ name, passed: false, error: String(e && e.stack || e) }); }
}

test('two boxes sharing a face shimmer', `
  return m.scene('t',[m.box(1,1,1).at(0,0.5,0), m.box(1,1,1).at(0,0.5,1)],{});`, 1);

test('a 2 mm offset is enough to separate them', `
  return m.scene('t',[m.box(1,1,1).at(0,0.5,0), m.box(1,1,1).at(0,0.5,1.002)],{});`, 0);

test('faces in the same plane but side by side do not overlap', `
  return m.scene('t',[m.box(1,1,1).at(0,0.5,0), m.box(1,1,1).at(3,0.5,0)],{});`, 0);

// a tilt about one axis leaves the other two face pairs in their planes, and
// neighbouring boxes still overlap there by a sliver: that is why the check is
// per face pair, not per part
test('a tilt about one axis still leaves a coplanar sliver', `
  return m.scene('t',[m.box(1,1,1).at(0,0.5,0), m.box(1,1,1).rot(0,0.02,0).at(0,0.5,1)],{});`, 1);

test('a plate flush on a bigger plate is reported', `
  return m.scene('t',[m.box(3,0.2,3).at(0,0.1,0), m.box(1,0.2,1).at(0,0.3,0)],{});`, 1);

test('transparent panels are not depth-ordered either, and are still reported', `
  return m.scene('t',[m.box(1,1,1).at(0,0.5,0), m.box(1,1,1).at(0,0.5,1).mat(m.glass())],{});`, 1);

const summary = { tests: tests.length, passed: tests.filter((t) => t.passed).length, failed: tests.filter((t) => !t.passed).length };
console.log(JSON.stringify({ summary, tests }, null, 2));
process.exitCode = summary.failed ? 1 : 0;
