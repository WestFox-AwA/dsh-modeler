import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Section dimensions must mean what a vehicle author expects: full width, full
// height, and y as the bottom face. Getting this wrong doubles every body.
const { runModelerScript } = await import(pathToFileURL(path.resolve('lib/script.js')).href);
const { worldBounds } = await import(pathToFileURL(path.resolve('lib/assembly.js')).href);
const { auditDoc } = await import(pathToFileURL(path.resolve('lib/audit.js')).href);

const tests = [];
const build = (code) => { const doc = runModelerScript(code); return { doc, box: worldBounds(doc)[0], audit: auditDoc(doc) }; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

tests.push((() => {
  const { box } = build(`return m.scene('h',[m.hull([{w:2,h:1,y:0,z:-2},{w:2,h:1,y:0,z:2}],{},'H')],{});`);
  return { name: 'width is full width, not half', passed: near(box.size[0], 2) && near(box.min[0], -1),
    size: box.size.map((v) => +v.toFixed(3)), min: box.min.map((v) => +v.toFixed(3)) };
})());

tests.push((() => {
  const { box } = build(`return m.scene('h',[m.hull([{w:2,h:1,y:0.5,z:-2},{w:2,h:1,y:0.5,z:2}],{},'H')],{});`);
  return { name: 'y is the bottom face', passed: near(box.min[1], 0.5) && near(box.max[1], 1.5),
    min: +box.min[1].toFixed(3), max: +box.max[1].toFixed(3) };
})());

tests.push((() => {
  const { audit } = build(`return m.scene('h',[m.hull([
    {w:2,h:1,y:0,z:-2},{w:1.2,h:0.8,y:0,z:0},{w:0.6,h:0.5,y:0,z:2}],{},'H')],{});`);
  return { name: 'a tapered body stays watertight', passed: audit.summary.openObjects === 0 && audit.summary.invertedObjects === 0, audit: audit.summary };
})());

tests.push((() => {
  const { doc } = build(`
    const hull = m.hull([{w:2,h:1,y:0,z:-2},{w:2,h:1,y:0,z:2}],{},'H');
    const win = m.rbox(0.4,0.3,0.03,0.01,'W').at(0,0,0);
    m.align(win, hull, { x: 'max', y: 'centre', xOffset: 0.02 });
    return m.scene('h',[hull, win],{});
  `);
  const win = doc.objects[1].position;
  // hull half width 1.0, so 'max' plus a 2 cm offset puts the centre at 1.02
  return { name: 'align puts a part on the surface', passed: near(win[0], 1.02) && near(win[1], 0.5),
    at: win.map((v) => +v.toFixed(3)) };
})());

const summary = { tests: tests.length, passed: tests.filter((t) => t.passed).length, failed: tests.filter((t) => !t.passed).length };
console.log(JSON.stringify({ summary, tests }, null, 2));
process.exitCode = summary.failed ? 1 : 0;
