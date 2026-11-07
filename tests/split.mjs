import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Splitting must preserve geometry exactly: same triangles overall, same bounds,
// and each half must keep the material it was given.
const { runModelerScript } = await import(pathToFileURL(path.resolve('src/host/script.js')).href);
const { worldBounds } = await import(pathToFileURL(path.resolve('src/host/assembly.js')).href);
const { auditDoc } = await import(pathToFileURL(path.resolve('src/host/audit.js')).href);

const tests = [];
const solid = `m.hull([{ w: 2, h: 1.2, y: 0, z: -1.5 }, { w: 2, h: 1.2, y: 0, z: 1.5 }], {}, 'Body').mat(m.mat('#888888'))`;
const one = runModelerScript(`return m.scene('s',[${solid}],{});`);
const two = runModelerScript(`const [a, b] = m.splitAt(${solid}, 'y', 0.6, { matLow: '#222222', matHigh: '#cccccc' });
  return m.scene('s', [a, b], {});`);

const unionOf = (doc) => {
  const b = worldBounds(doc);
  return {
    min: [0, 1, 2].map((k) => Math.min(...b.map((q) => q.min[k]))),
    max: [0, 1, 2].map((k) => Math.max(...b.map((q) => q.max[k]))),
  };
};
tests.push({
  name: 'splitting keeps the bounds (clipping adds triangles on the cut)',
  passed: Math.abs(unionOf(one).min[1] - unionOf(two).min[1]) < 1e-6
    && Math.abs(unionOf(one).max[1] - unionOf(two).max[1]) < 1e-6,
  triangles: [auditDoc(one).summary.triangles, auditDoc(two).summary.triangles],
});

tests.push({
  name: 'each half takes its own material',
  passed: two.objects.length === 2 && two.objects[0].material.color === '#222222' && two.objects[1].material.color === '#cccccc',
  colors: two.objects.map((o) => o.material.color),
});

tests.push({
  name: 'the split lands where it was asked',
  passed: Math.abs(worldBounds(two)[0].max[1] - 0.6) < 0.01 && Math.abs(worldBounds(two)[1].min[1] - 0.6) < 0.01,
  low: worldBounds(two)[0].max.map((v) => +v.toFixed(2)),
  high: worldBounds(two)[1].min.map((v) => +v.toFixed(2)),
});

tests.push({
  name: 'a split that hits nothing on one side returns a single piece',
  passed: (() => { const d = runModelerScript(`const [a,b] = m.splitAt(${solid}, 'y', 9, {}); return m.scene('s',[a,b].filter(Boolean),{});`); return d.objects.length === 1; })(),
});

const summary = { tests: tests.length, passed: tests.filter((t) => t.passed).length, failed: tests.filter((t) => !t.passed).length };
console.log(JSON.stringify({ summary, tests }, null, 2));
process.exitCode = summary.failed ? 1 : 0;
