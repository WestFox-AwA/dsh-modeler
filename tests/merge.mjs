import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Merging must be a pure object-count win: same triangles, same bounds, same
// watertightness, and it must carry baked transforms with it.
const { runModelerScript } = await import(pathToFileURL(path.resolve('lib/script.js')).href);
const { worldBounds } = await import(pathToFileURL(path.resolve('lib/assembly.js')).href);
const { auditDoc } = await import(pathToFileURL(path.resolve('lib/audit.js')).href);

const tests = [];
const build = (code) => {
  const doc = runModelerScript(code);
  const boxes = worldBounds(doc);
  // union over every object: comparing only the first one is not a scene bound
  const union = {
    min: [0, 1, 2].map((k) => Math.min(...boxes.map((b) => b.min[k]))),
    max: [0, 1, 2].map((k) => Math.max(...boxes.map((b) => b.max[k]))),
  };
  return { doc, box: boxes[0], union, audit: auditDoc(doc) };
};
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

tests.push((() => {
  const many = build(`
    const parts = [];
    for (let i = 0; i < 8; i++) parts.push(m.rbox(0.1,0.1,0.1,0.01,'Bolt').at(i * 0.3, 0.5, 0).mat(m.metal()));
    return m.scene('m', parts, {});
  `);
  const one = build(`
    const parts = [];
    for (let i = 0; i < 8; i++) parts.push(m.rbox(0.1,0.1,0.1,0.01,'Bolt').at(i * 0.3, 0.5, 0).mat(m.metal()));
    return m.scene('m', [m.merge(parts, 'Bolts')], {});
  `);
  return {
    name: 'merging 8 bolts gives 1 object and the same triangles',
    passed: one.doc.objects.length === 1 && many.audit.summary.triangles === one.audit.summary.triangles
      && near(one.union.min[0], many.union.min[0]) && near(one.union.max[0], many.union.max[0]),
    objects: [many.doc.objects.length, one.doc.objects.length],
    triangles: [many.audit.summary.triangles, one.audit.summary.triangles],
  };
})());

tests.push((() => {
  const { audit } = build(`
    const parts = [0, 1, 2, 3].map((i) => m.rbox(0.4,0.2,0.4,0.02).at(i * 0.5, 0.5, 0).mat(m.mat('#888888')));
    return m.scene('m', [m.merge(parts, 'Run')], {});
  `);
  return { name: 'a merged run stays watertight', passed: audit.summary.openObjects === 0 && audit.summary.invertedObjects === 0, audit: audit.summary };
})());

tests.push((() => {
  const { box } = build(`
    const a = m.box(0.4,0.4,0.4).at(0,0.5,0).rot(0.3, 0.4, 0.2);
    const b = m.box(0.4,0.4,0.4).at(1.5,0.5,0);
    return m.scene('m', [m.merge([a, b], 'Two')], {});
  `);
  // rotated part keeps its footprint after baking
  const solo = build(`return m.scene('m', [m.box(0.4,0.4,0.4).at(0,0.5,0).rot(0.3, 0.4, 0.2)], {});`);
  return {
    name: 'bake inside merge preserves a rotated footprint',
    passed: near(box.size[1], solo.box.size[1], 1e-6) && box.size[0] > 1.4,
    size: box.size.map((v) => +v.toFixed(3)),
  };
})());

const summary = { tests: tests.length, passed: tests.filter((t) => t.passed).length, failed: tests.filter((t) => !t.passed).length };
console.log(JSON.stringify({ summary, tests }, null, 2));
process.exitCode = summary.failed ? 1 : 0;
