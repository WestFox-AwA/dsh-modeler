import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Modelling telemetry, kept strictly OUTSIDE the modelling path.
//
// The point is retrospective: when an AI builds a model through this plugin, we
// want to read back what it actually did - in what order, how often it looked
// before it changed something, which checks it ran, where it got stuck. None of
// that may influence the asset, so every write here is best-effort: buffered,
// bounded, and swallowed on failure. A probe that can fail a modelling command
// would be worse than no probe.

const VERSION = 1;
const MAX_LINE = 12_000;        // one event never dominates the file
const MAX_QUEUE = 500;          // pending events before we start dropping
const FLUSH_BYTES = 32 * 1024;
const MAX_CODE_BYTES = 96 * 1024;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const KEEP_FILES = 12;
const OBSERVATIONS = new Set(['preview','inspect','capture','diagnose','tool:views','tool:probe']);
const PUTS = new Set(['edit','script','restore','apply_variant','accept_trial','tool:generate','tool:build','tool:scene']);

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const short = (value, n = 120) => {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return s.length > n ? s.slice(0, n) + '…' : s;
};
const day = (date) => date.toISOString().slice(0, 10);

// What the caller actually asked for, without the payload noise: an edit is
// described by the operations it ran, a script by the hash of the code it wrote.
export function summariseArgs(action, args = {}) {
  const out = { keys: Object.keys(args).sort() };
  if (Array.isArray(args.operations)) {
    out.operations = args.operations.slice(0, 40).map((op) => ({
      op: op?.op,
      id: op?.id ?? null,
      fields: Object.keys(op || {}).filter((k) => !['op', 'id'].includes(k)).sort(),
      ...(op?.parentId ? { parentId: op.parentId } : {}),
      ...(Array.isArray(op?.vertices) ? { vertices: op.vertices.length } : {}),
      ...(Array.isArray(op?.faces) ? { faces: op.faces.length } : {}),
    }));
    out.operationCount = args.operations.length;
  }
  if (typeof args.code === 'string') {
    out.code = { hash: sha(args.code).slice(0, 16), bytes: Buffer.byteLength(args.code), lines: args.code.split('\n').length };
    out.code.uses = {
      sectionLoft: (args.code.match(/m\.sectionLoft\(/g) || []).length,
      hull: (args.code.match(/m\.hull\(/g) || []).length,
      loft: (args.code.match(/m\.loft\(/g) || []).length,
      sdf: (args.code.match(/m\.sdf\(/g) || []).length,
      mesh: (args.code.match(/m\.mesh\(/g) || []).length,
      merge: (args.code.match(/m\.merge\(/g) || []).length,
      lathe: (args.code.match(/m\.lathe\(/g) || []).length,
      key: (args.code.match(/\.key\(/g) || []).length,
      modifiers: (args.code.match(/\.mods\(/g) || []).length,
      spec: /spec\s*:/.test(args.code),
    };
  }
  for (const key of ['id', 'project', 'file', 'parameter', 'label', 'mode', 'view', 'isolate', 'channel', 'section', 'ref', 'camera', 'source', 'sourceId', 'query', 'other', 'topic']) {
    if (args[key] !== undefined) out[key] = typeof args[key] === 'string' ? short(args[key], 160) : args[key];
  }
  for (const key of ['rebase', 'discardOverrides', 'mesh', 'preview', 'findings', 'includeScript']) {
    if (args[key] !== undefined) out[key] = Boolean(args[key]);
  }
  for (const key of ['limit', 'offset', 'count', 'cols', 'rows', 'width', 'height', 'samples', 'cellAspect']) {
    if (Number.isFinite(Number(args[key]))) out[key] = Number(args[key]);
  }
  if (Array.isArray(args.values)) out.valueCount = args.values.length;
  if (Array.isArray(args.views)) out.views = args.views.slice(0, 8);
  for (const key of ['expectedRevision', 'expectedHash']) {
    if (args[key] !== undefined) out[key] = key === 'expectedHash' ? short(args[key], 12) : args[key];
  }
  return out;
}

// Facts the command already computed and returned. Nothing is recomputed here:
// the probe must cost the modelling path nothing.
export function summariseResult(result) {
  if (!result || typeof result !== 'object') return null;
  const facts = {};
  const put = (k, v) => { if (v !== undefined && v !== null) facts[k] = v; };
  put('title', result.title || result.summary?.title);
   put('sourceId',result.sourceId);put('sourceCharacters',result.characters);put('validationValid',result.validation?.valid);put('validationMs',result.validation?.elapsedMs);put('candidateHash',result.candidateHash);put('baseHash',result.baseHash);put('changedCurrentAsset',result.changedCurrentAsset);put('query',result.query);put('coverageComplete',result.coverage?.complete);put('sameCameraComparison',result.comparison?.sameCamera);put('comparisonCaptured',!!result.comparison?.after?.captured);
  const s = result.summary;
  if (s) {
    put('objects', s.objects); put('triangles', s.triangles); put('materials', s.materials);
    if (Array.isArray(s.bounds?.size)) put('size', s.bounds.size.map((v) => +Number(v).toFixed(3)));
    put('warnings', Array.isArray(result.warnings) ? result.warnings.length : s.warnings);
  }
  // Tools that return a bare summary (views/scene) still describe the same asset.
  if (!s && Number.isFinite(result.triangles)) { put('triangles', result.triangles); put('objects', result.objects); }
  const v = result.verdict;
  if (v) {
    put('auditOk', v.audit?.ok);
    put('openObjects', v.audit?.openObjects);
    put('invertedObjects', v.audit?.invertedObjects);
    put('winding', v.audit?.windingConflicts);
    if (v.spec) put('spec', v.spec.declared ? (v.spec.passed ? 'pass' : 'fail') : 'none');
    if (v.spec?.failed) put('specFailed', v.spec.failed);
    if (v.findings) put('defects', v.findings.defects);
    if (v.detail) put('components', v.detail.components);
    if (v.scene) { put('rootObjects', v.scene.rootObjects); put('mergeAfter', v.scene.mergeAfter); }
    if (v.appearance) put('appearance', v.appearance.status || (v.appearance.verified ? 'verified' : 'unverified'));
  }
  if (Array.isArray(result.parts)) put('partsReturned', result.parts.length);
  if (Array.isArray(result.candidates)) {
    put('candidates', result.candidates.length);
    put('candidateErrors', result.candidates.filter((c) => c.error).length);
  }
  if (Array.isArray(result.captures)) {put('captures',result.captures.length);put('captured',result.captures.every(c=>c.captured));put('evidenceIds',result.captures.map(c=>c.id));}
  if (result.evidence) { put('evidenceId', String(result.evidence.id || '').slice(0, 12)); put('captured', result.evidence.captured === true); }
  if (result.delta) {
    const d = result.delta;
    put('deltaUpdated', Array.isArray(d.updated) ? d.updated.length : undefined);
    put('deltaAdded', Array.isArray(d.added) ? d.added.length : undefined);
    put('deltaRemoved', Array.isArray(d.removed) ? d.removed.length : undefined);
  }
  if (Array.isArray(result.history)) put('historyEntries', result.history.length);
  if (result.projects) put('projects', Array.isArray(result.projects) ? result.projects.length : undefined);
  if (result.changedCurrentAsset !== undefined) put('changedCurrentAsset', result.changedCurrentAsset);
  if (Number.isFinite(result.buildMs)) put('buildMs', +Number(result.buildMs).toFixed(1));
  return Object.keys(facts).length ? facts : null;
}

export function createProbeLog({ directory, sessionLabel = 'host', now = () => Date.now() } = {}) {
  const session = crypto.randomUUID();
  const startedAt = now();
  const state = { queued: 0, written: 0, dropped: 0, errors: 0, bytes: 0, file: null, stream: null };
  let buffer = [];
  let bufferBytes = 0;
  let flushTimer = null;
  let seq = 0;
  let closed = false;
  let codeDir = null;
  let index = null;   // in-memory ring for fast reads, bounded

  const ring = [];
  const RING_MAX = 2000;

  function remember(event) {
    ring.push(event);
    if (ring.length > RING_MAX) ring.splice(0, ring.length - RING_MAX);
  }

  function ensureDir() {
    if (!directory) return false;
    try { fs.mkdirSync(directory, { recursive: true }); return true; } catch { return false; }
  }

  function currentFile() {
    const date = day(new Date(now()));
    const base = path.join(directory, 'events-' + date + '.jsonl');
    let file = base, n = 1;
    try {
      while (fs.existsSync(file) && fs.statSync(file).size > MAX_FILE_BYTES) file = base.replace('.jsonl', '-' + (++n) + '.jsonl');
    } catch { /* keep base */ }
    return file;
  }

  // Code snapshots are content-addressed and capped: for a retrospective it is
  // worth knowing exactly what was written, but never at the cost of unbounded disk.
  function saveCode(code) {
    if (typeof code !== 'string' || !code.length) return null;
    if (!codeDir) {
      if (!ensureDir()) return null;
      codeDir = path.join(directory, 'code');
      try { fs.mkdirSync(codeDir, { recursive: true }); } catch { codeDir = null; return null; }
    }
    const bytes = Buffer.byteLength(code);
    if (bytes > MAX_CODE_BYTES) return { omitted: true, bytes };
    const hash = sha(code).slice(0, 16);
    const file = path.join(codeDir, hash + '.js');
    try { if (!fs.existsSync(file)) fs.writeFileSync(file, code); } catch { return null; }
    return { hash, bytes, file };
  }

  function flush() {
    flushTimer = null;
    if (!buffer.length || !ensureDir()) return;
    const lines = buffer;
    buffer = [];
    bufferBytes = 0;
    const file = currentFile();
    const payload = lines.join('\n') + '\n';
    state.queued = Math.max(0, state.queued - lines.length);
    try {
      fs.appendFile(file, payload, () => {});
      state.written += lines.length;
      state.bytes += Buffer.byteLength(payload);
      state.file = file;
    } catch {
      state.errors += 1;
    }
    // rotate: keep a bounded number of files
    try {
      const files = fs.readdirSync(directory).filter((f) => /^events-.*\.jsonl$/.test(f)).sort();
      while (files.length > KEEP_FILES) { fs.unlinkSync(path.join(directory, files.shift())); }
    } catch { /* rotation is cosmetic */ }
  }

  function schedule() {
    if (flushTimer || closed) return;
    flushTimer = setTimeout(flush, 250);
    if (typeof flushTimer.unref === 'function') flushTimer.unref();
  }

  /** Record one command. Never throws, never awaits, never touches the asset. */
  function record(entry) {
    if (closed) return null;
    try {
      const at = now();
      const event = {
        v: VERSION,
        seq: ++seq,
        at: new Date(at).toISOString(),
        session,
        label: sessionLabel,
        pid: process.pid,
        action: String(entry.action || 'unknown'),
        ...(entry.chatSessionId?{chatSessionId:entry.chatSessionId}:{}),
        ...(entry.callId?{callId:entry.callId}:{}),
        ...(entry.rootCallId?{rootCallId:entry.rootCallId}:{}),
        ms: Number.isFinite(entry.ms) ? +Number(entry.ms).toFixed(2) : null,
        ok: entry.ok !== false,
        ...(entry.code ? { code: short(entry.code, 60) } : {}),
        ...(entry.error ? { error: short(entry.error, 300) } : {}),
        ...(entry.before ? { before: entry.before } : {}),
        ...(entry.after ? { after: entry.after } : {}),
        ...(entry.args ? { args: entry.args } : {}),
        ...(entry.facts ? { facts: entry.facts } : {}),
        ...(entry.out ? { out: entry.out } : {}),
      };
      let line = JSON.stringify(event);
      if (line.length > MAX_LINE) {
        delete event.args;
        delete event.out;
        line = JSON.stringify({ ...event, truncated: true });
      }
      remember(event);
      if (state.queued >= MAX_QUEUE) {
        state.dropped += 1;              // bounded memory: drop, never block
        return event;
      }
      buffer.push(line);
      state.queued += 1;
      if (Buffer.byteLength(buffer.join('\n')) >= FLUSH_BYTES) flush(); else schedule();
      return event;
    } catch {
      state.errors += 1;
      return null;
    }
  }

  /** Record a script body once per distinct content, keyed by hash. */
  function recordCode(code) {
    try { return saveCode(code); } catch { return null; }
  }

  /** Read events back: from the ring first, then the files if asked for history. */
  function read({ since = 0, limit = 200, includeDisk = false,chatSessionId=null } = {}) {
    try { if (buffer.length) flush(); } catch { /* a failed flush must not fail a read */ }
    const max = Math.max(1, Math.min(5000, Number(limit) || 200));
    const fromRing = ring.filter((e) => e.seq > Number(since || 0)&&(!chatSessionId||e.chatSessionId===chatSessionId)).slice(-max);
    if (!includeDisk || !directory) return { events: fromRing, session, dropped: state.dropped };
    const events = [];
    try {
      const files = fs.readdirSync(directory).filter((f) => /^events-.*\.jsonl$/.test(f)).sort();
      for (const file of files) {
        const text = fs.readFileSync(path.join(directory, file), 'utf8');
        for (const line of text.split('\n')) {
          if (!line) continue;
          try {
            const e = JSON.parse(line);
            if (e.seq > Number(since || 0)&&(!chatSessionId||e.chatSessionId===chatSessionId)) events.push(e);
          } catch { /* a torn line is skipped, not fatal */ }
        }
      }
    } catch { /* fall back to ring */ }
    return { events: (events.length ? events : fromRing).slice(-max), session, dropped: state.dropped };
  }

  /** Aggregate a run into something a human can review afterwards. */
  function review({ includeDisk = true, sessionId = null,chatSessionId=null } = {}) {
    const { events } = read({ since: 0, limit: 5000, includeDisk,chatSessionId });
    const scoped = sessionId ? events.filter((e) => e.session === sessionId) : events;
    return analyse(scoped, { session, startedAt });
  }

  function close() {
    closed = true;
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    flush();
  }

  return { record, recordCode, read, review, close, session, state: () => ({ ...state, session, queued: state.queued }) };
}

/** Pure analysis so it is testable without any filesystem. */
export function analyse(events, { session = null, startedAt = null } = {}) {
  const list = (events || []).filter((e) => e && typeof e === 'object');
  const byAction = {}, byOutcome = { ok: 0, failed: 0 };
  const failures = new Map();
  const assets = new Map();
  const sessions = new Map();
  const usage = {};
  let observations = 0, puts = 0, blindEdits = 0, scriptRuns = 0, captures = 0;
  let editMs = [];
  let lastObservation = -Infinity;
  let specPass = 0, specFail = 0, specNone = 0, auditFail = 0;
  let trianglesFrom = null, trianglesTo = null, peakTriangles = 0;
  const repeats = new Map();
  let lastHashByAsset = new Map();

  for (const e of list) {
    byAction[e.action] = (byAction[e.action] || 0) + 1;
    if (e.session) {
      const s = sessions.get(e.session) || { id: e.session, events: 0, first: e.at, last: e.at };
      s.events += 1; s.last = e.at; sessions.set(e.session, s);
    }
    if (e.ok === false) {
      byOutcome.failed += 1;
      const key = e.code || 'error';
      const entry = failures.get(key) || { code: key, count: 0, examples: [] };
      entry.count += 1;
      if (entry.examples.length < 3) entry.examples.push({ at: e.at, action: e.action, error: e.error });
      failures.set(key, entry);
    } else byOutcome.ok += 1;

    const asset = e.after?.id || e.before?.id;
    if (asset) {
      const a = assets.get(asset) || { assetId: asset, events: 0, revisions: new Set(), first: e.at, last: e.at, title: null };
      a.events += 1; a.last = e.at;
      if (e.after?.revision !== undefined) a.revisions.add(e.after.revision);
      if (e.facts?.title) a.title = e.facts.title;
      assets.set(asset, a);
    }

    if (e.args?.code?.uses) for (const [k, n] of Object.entries(e.args.code.uses)) if (n > 0) usage[k] = (usage[k] || 0) + n;
    if (e.args?.operations) for (const op of e.args.operations) if (op?.op) usage['op:' + op.op] = (usage['op:' + op.op] || 0) + 1;

    if (OBSERVATIONS.has(e.action)) { observations += 1; lastObservation = e.seq; }
    if (PUTS.has(e.action) && e.ok !== false) {
      puts += 1;
      if (['edit','script','accept_trial','apply_variant'].includes(e.action) && e.seq - lastObservation > 6) blindEdits += 1;
      if (e.action === 'script') scriptRuns += 1;
      if (Number.isFinite(e.ms)) editMs.push(e.ms);
    }
    if (e.action === 'capture' && e.facts?.captured) captures += 1;

    if (e.facts) {
      if (e.facts.spec === 'pass') specPass += 1;
      else if (e.facts.spec === 'fail') specFail += 1;
      else if (e.facts.spec === 'none') specNone += 1;
      if (e.facts.auditOk === false) auditFail += 1;
      if (Number.isFinite(e.facts.triangles)) {
        if (e.action === 'script' || e.action === 'open') {
          if (trianglesFrom === null) trianglesFrom = e.facts.triangles;
          trianglesTo = e.facts.triangles;
        }
        peakTriangles = Math.max(peakTriangles, e.facts.triangles);
      }
    }

    // identical content submitted twice is wasted work, not iteration
    if (e.after?.hash && PUTS.has(e.action) && e.ok !== false) {
      const prev = lastHashByAsset.get(e.after.id);
      if (prev === e.after.hash) repeats.set(e.after.id, (repeats.get(e.after.id) || 0) + 1);
      lastHashByAsset.set(e.after.id, e.after.hash);
    }
  }

  editMs = editMs.sort((a, b) => a - b);
  const pct = (p) => (editMs.length ? editMs[Math.min(editMs.length - 1, Math.floor(editMs.length * p))] : null);
  const span = list.length >= 2 ? Date.parse(list.at(-1).at) - Date.parse(list[0].at) : 0;

  const issues = [];
  if (blindEdits > 0) issues.push({ code: 'edits-without-observation', count: blindEdits, note: '提交修改前 6 条事件内没有观察（preview/inspect/capture 等）' });
  const repeatTotal = [...repeats.values()].reduce((a, b) => a + b, 0);
  if (repeatTotal > 0) issues.push({ code: 'repeated-identical-writes', count: repeatTotal, note: '同一资产连续提交了内容哈希相同的版本' });
  if (specFail > 0 && specPass === 0) issues.push({ code: 'spec-never-passed', count: specFail, note: '声明的规格从未通过' });
  if (auditFail > 0) issues.push({ code: 'audit-open-or-inverted', count: auditFail, note: '出现开口/翻面，需定位到具体对象' });
  if (captures === 0 && (puts > 0 || scriptRuns > 0)) issues.push({ code: 'no-real-capture', count: 0, note: '有过建模提交但全程未取得绑定版本的视口图像：外观没有证据' });
  if (scriptRuns > 0 && puts > 0 && observations / Math.max(1, puts) < 0.5) issues.push({ code: 'observation-thin', count: observations, note: '观察次数少于提交次数的一半' });

  const timeline = list.slice(-200).map((e) => ({
    seq: e.seq, at: e.at, action: e.action, ms: e.ms, ok: e.ok !== false,
    ...(e.code ? { code: e.code } : {}),
    ...(e.after?.revision !== undefined ? { revision: e.after.revision } : {}),
    ...(e.facts?.triangles !== undefined ? { triangles: e.facts.triangles } : {}),
    ...(e.facts?.spec ? { spec: e.facts.spec } : {}),
    ...(e.args?.operations ? { ops: e.args.operations.map((op) => op.op + (op.id ? ' ' + op.id : '')) } : {}),
    ...(e.args?.code ? { codeBytes: e.args.code.bytes, codeHash: e.args.code.hash } : {}),
    ...(e.args?.project ? { project: e.args.project } : {}),
    ...(e.args?.id && !e.args?.operations ? { id: e.args.id } : {}),
    ...(e.out?.textChars ? { textChars: e.out.textChars } : {}),
  }));

  return {
    session,
    startedAt: startedAt === null ? null : new Date(startedAt).toISOString(),
    events: list.length,
    timeline,
    spanMs: span,
    sessions: [...sessions.values()],
    byAction,
    byOutcome,
    failures: [...failures.values()].sort((a, b) => b.count - a.count),
    assets: [...assets.values()].map((a) => ({ ...a, revisions: [...a.revisions] })),
    usage,
    metrics: {
      observations, puts, scriptRuns, captures,
      observeToPutRatio: puts ? +(observations / puts).toFixed(2) : null,
      blindEdits,
      medianPutMs: editMs.length ? +editMs[Math.floor(editMs.length / 2)].toFixed(1) : null,
      p95PutMs: editMs.length ? +pct(0.95).toFixed(1) : null,
      spec: { pass: specPass, fail: specFail, none: specNone },
      auditFailures: auditFail,
      triangles: { from: trianglesFrom, to: trianglesTo, peak: peakTriangles },
    },
    issues,
  };
}
