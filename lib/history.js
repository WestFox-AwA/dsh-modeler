import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// A run history turns "did my last change help?" from a memory question into a
// measurement. Two real sessions both lost that thread: one shipped a height error
// of 2.3 m without ever comparing against its own earlier run, because nothing in
// the response remembered the previous one.
const ROOT = path.join(os.homedir(), '.dsh', 'modeler-history');
const MAX_RUNS = 200;

const slug = (title) => String(title || 'untitled')
  .toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60) || 'untitled';

function fileFor(title) {
  return path.join(ROOT, slug(title) + '.jsonl');
}

export function readHistory(title) {
  const file = fileFor(title);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch (_) { return null; }
  }).filter(Boolean);
}

const pick = (v, extra) => ({
  time: Date.now(),
  triangles: v.audit?.triangles ?? null,
  objects: v.scene?.objects ?? null,
  open: v.audit?.openObjects ?? null,
  inverted: v.audit?.invertedObjects ?? null,
  winding: v.audit?.windingConflicts ?? null,
  defects: v.findings?.defects ?? null,
  components: v.detail?.components ?? null,
  componentsPerObject: v.detail?.componentsPerObject ?? null,
  specPassed: v.spec?.declared ? v.spec.passed : null,
  ...extra,
});

// Compare with the closest earlier run that differs, so a single repeated check
// does not report "no change" and hide the previous real step.
export function recordRun(title, verdict, extra = {}) {
  const entry = pick(verdict, extra);
  const history = readHistory(title);
  const previous = history.length ? history[history.length - 1] : null;
  const delta = previous ? {
    since: previous.time,
    runsAgo: 1,
    triangles: entry.triangles !== null && previous.triangles !== null ? entry.triangles - previous.triangles : null,
    objects: entry.objects !== null && previous.objects !== null ? entry.objects - previous.objects : null,
    defects: entry.defects !== null && previous.defects !== null ? entry.defects - previous.defects : null,
    open: entry.open !== null && previous.open !== null ? entry.open - previous.open : null,
    inverted: entry.inverted !== null && previous.inverted !== null ? entry.inverted - previous.inverted : null,
    componentsPerObject: entry.componentsPerObject !== null && previous.componentsPerObject !== null
      ? +(entry.componentsPerObject - previous.componentsPerObject).toFixed(2) : null,
  } : null;

  try {
    fs.mkdirSync(ROOT, { recursive: true });
    const lines = history.concat(entry).slice(-MAX_RUNS).map((r) => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(fileFor(title), lines);
  } catch (_) {
    // a read-only home must not break a build
  }

  const runs = Math.min(history.length + 1, MAX_RUNS);
  return {
    runs,
    previous: previous ? { time: previous.time, triangles: previous.triangles, defects: previous.defects } : null,
    delta,
    note: runs < 2
      ? 'first recorded run: later runs will report what changed'
      : 'delta is against the previous run of this model; a positive defects/open/inverted delta is worse',
  };
}
