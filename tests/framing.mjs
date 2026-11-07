import path from 'node:path';
import { pathToFileURL } from 'node:url';

// The framing metric must report what the camera sees, not what exists: a part
// behind another part has zero share, and the shares must partition the model.
const { runModelerScript } = await import(pathToFileURL(path.resolve('lib/script.js')).href);
const { auditFraming } = await import(pathToFileURL(path.resolve('lib/assembly.js')).href);

const opts = { res: 240, eye: [0, 1, 6], target: [0, 1, 0], fov: 45 };
// distinct names: share is grouped by name, so identical names collapse into one row
const scene = `return m.scene('f', [
  m.box(2, 2, 0.4).at(0, 1, 0).nameAs('Slab'),
  m.box(0.6, 0.6, 0.4).at(0, 1, -1.2).nameAs('Hidden'),
  m.box(0.5, 0.5, 0.4).at(3.0, 1, 0).nameAs('Bystander'),
], {});`;

const cases = [
  ['a part hidden behind another is listed as hidden', async () => {
    const f = await auditFraming(runModelerScript(scene), opts);
    const hidden = f.hiddenByName.map(([n]) => n);
    return { passed: hidden.includes('Hidden') && !f.share.some((s2) => s2.name === 'Hidden'), hidden };
  }],
  ['shares partition the visible pixels', async () => {
    const f = await auditFraming(runModelerScript(scene), opts);
    const total = f.share.reduce((n, s) => n + s.pct, 0);
    return { passed: Math.abs(total - 100) < 0.5, total: +total.toFixed(2) };
  }],
  ['a large near face outranks a small side object', async () => {
    const f = await auditFraming(runModelerScript(scene), opts);
    return { passed: f.share.length >= 2 && f.share[0].name === 'Slab' && f.share[0].pct > f.share[1].pct, share: f.share.slice(0, 2) };
  }],
  ['nothing is hidden in a single-part scene', async () => {
    const f = await auditFraming(runModelerScript(`return m.scene('g',[m.box(1,1,1).at(0,1,0)],{});`), opts);
    return { passed: f.summary.hiddenFromThisCamera === 0 && Math.abs(f.share[0].pct - 100) < 0.5, share: f.share };
  }],
];

const results = [];
for (const [name, fn] of cases) {
  try { results.push({ name, ...(await fn()) }); }
  catch (e) { results.push({ name, passed: false, error: String(e && e.stack || e) }); }
}
const summary = { tests: results.length, passed: results.filter((r) => r.passed).length, failed: results.filter((r) => !r.passed).length };
console.log(JSON.stringify({ summary, tests: results }, null, 2));
process.exitCode = summary.failed ? 1 : 0;
