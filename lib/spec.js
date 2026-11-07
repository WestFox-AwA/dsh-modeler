// Declared intent, checked in millimetres.
//
// Every previous quality check compared the model to a statistic. A modelled
// vehicle has an *intent* - it is 7.2 m long, 2.4 m wide, its turret sits on the
// centre line, its road wheels are 0.62 m across - and the only meaningful
// question is whether the geometry matches that intent. Guessing intent from the
// geometry (median gaps, size outliers) produced 1200 false findings, so this
// module makes the intent explicit instead.
//
// A spec lives in `doc.meta.spec` and is declared where the model is authored:
//
//   return m.scene('MBT', parts, { spec: {
//     length: 7.2, width: 2.4, height: 2.35, tolerance: 0.01,
//     symmetric: true, centreOnX: ['Turret', 'Gun'],
//     parts: [{ name: 'Road wheel', size: [0.62, 0.62, 0.32] }],
//   }});
//
// Violations are errors with a signed millimetre figure, not a score.

import { objectPositions } from './analyze.js';
import { analyseComponents } from './probe.js';

const AXES = ['x', 'y', 'z'];

function boundsOfPositions(positions) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 2 < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = positions[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  return Number.isFinite(min[0]) ? { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] } : null;
}

function partBounds(doc) {
  const out = [];
  for (const o of doc.objects || []) {
    const b = boundsOfPositions(objectPositions(o));
    if (b) out.push({ id: o.id, name: o.name || o.id, ...b });
  }
  return out;
}

export function verifySpec(doc, options = {}) {
  const spec = doc?.meta?.spec;
  if (!spec || typeof spec !== 'object') {
    return { declared: false, passed: null, checks: [], note: 'doc.meta.spec 未声明：不做比例核对（这是唯一诚实的默认值）' };
  }
  const tol = Number(spec.tolerance ?? options.tolerance ?? 0.01);
  const parts = partBounds(doc);
  const all = boundsOfPositions((doc.objects || []).flatMap((o) => objectPositions(o)));
  const checks = [];
  const add = (id, label, expected, actual, tolerance = tol) => {
    const delta = actual - expected;
    const ok = Math.abs(delta) <= tolerance;
    checks.push({
      id, label, expected: +expected.toFixed(4), actual: +actual.toFixed(4),
      deltaMm: +(delta * 1000).toFixed(1), toleranceMm: +(tolerance * 1000).toFixed(1),
      passed: ok,
    });
  };

  // Overall size: length runs along z, width along x, height along y.
  if (Number.isFinite(Number(spec.length)) && all) add('length', '总长 (z)', Number(spec.length), all.size[2], Number(spec.lengthTolerance ?? tol));
  if (Number.isFinite(Number(spec.width)) && all) add('width', '总宽 (x)', Number(spec.width), all.size[0], Number(spec.widthTolerance ?? tol));
  if (Number.isFinite(Number(spec.height)) && all) add('height', '总高 (y)', Number(spec.height), all.size[1], Number(spec.heightTolerance ?? tol));

  // Mirror symmetry about x = 0 is a geometric fact, not an impression.
  if (spec.symmetric === true && all) {
    const offset = (all.min[0] + all.max[0]) / 2;
    checks.push({
      id: 'symmetric',
      label: '左右对称（包围盒中线应在 x=0）',
      expected: 0, actual: +offset.toFixed(4),
      deltaMm: +(offset * 1000).toFixed(1), toleranceMm: +(Number(spec.symmetryTolerance ?? tol) * 1000).toFixed(1),
      passed: Math.abs(offset) <= Number(spec.symmetryTolerance ?? tol),
    });
  }

  // Centring: a turret or gun that is 40 mm off the centre line is a defect you
  // otherwise only notice when the model is flipped.
  const centreList = []
    .concat(Array.isArray(spec.centreOnX) ? spec.centreOnX : spec.centreOnX ? [spec.centreOnX] : [])
    .concat(Array.isArray(spec.centerOnX) ? spec.centerOnX : spec.centerOnX ? [spec.centerOnX] : []);
  for (const wanted of centreList) {
    const hit = parts.filter((p) => p.name === wanted || p.id === wanted);
    if (!hit.length) {
      checks.push({ id: 'centreOnX:' + wanted, label: `${wanted} 居中 (x=0)`, expected: 0, actual: null, deltaMm: null, toleranceMm: +(tol * 1000).toFixed(1), passed: false, error: '找不到该对象' });
      continue;
    }
    const b = hit[0];
    const centre = (b.min[0] + b.max[0]) / 2;
    checks.push({
      id: 'centreOnX:' + wanted,
      label: `${wanted} 居中 (x=0)`,
      expected: 0, actual: +centre.toFixed(4),
      deltaMm: +(centre * 1000).toFixed(1), toleranceMm: +(Number(spec.centreTolerance ?? tol) * 1000).toFixed(1),
      passed: Math.abs(centre) <= Number(spec.centreTolerance ?? tol),
    });
  }

  // Per-part dimensions: wheels, hatches, hatches, anything repeated.
  for (const wanted of Array.isArray(spec.parts) ? spec.parts : []) {
    if (!wanted || !wanted.name) continue;
    const hit = parts.filter((p) => p.name === wanted.name);
    if (!hit.length) {
      checks.push({ id: 'part:' + wanted.name, label: `${wanted.name} 尺寸`, expected: wanted.size || null, actual: null, passed: false, error: '找不到该对象' });
      continue;
    }
    // Measure the largest COMPONENT, not the merged object: after m.merge the
    // object called "Tyres" spans all four wheels, so an object-level box would
    // report 1.6 x 3.0 m for a single 0.30 x 0.66 x 0.66 tyre.
    // hit holds bounds records; the components have to come from the real objects
    const realObjects = (doc.objects || []).filter((o) => (o.name || o.id) === wanted.name);
    const comps = realObjects.flatMap((obj) => analyseComponents({ objects: [obj] }));
    const biggest = (comps.length ? comps : hit).reduce((a, b) => {
      const va = a.size[0] * a.size[1] * a.size[2];
      const vb = b.size[0] * b.size[1] * b.size[2];
      return vb > va ? b : a;
    });
    const sizes = Array.isArray(wanted.size) ? wanted.size : [];
    for (let k = 0; k < 3; k++) {
      if (!Number.isFinite(Number(sizes[k]))) continue;
      add(`part:${wanted.name}:${AXES[k]}`, `${wanted.name} ${AXES[k]} 尺寸`, Number(sizes[k]), biggest.size[k], Number(wanted.tolerance ?? tol));
    }
  }

  // Mirror pairing: every part off the centre line needs an equal part at the
  // reflected position. This is the defect a builder cannot see - one of a pair
  // nudged, resized or left behind - and it is provable rather than statistical.
  if (spec.mirror === true) {
    const comps = analyseComponents(doc);
    const mirrorTol = Number(spec.mirrorTolerance ?? tol);
    // A part that is one-sided on purpose must be declared, otherwise "no twin"
    // would flag a deliberate antenna as a defect.
    // Exceptions have to be addressable at component level: these models merge
    // hundreds of parts into five objects, so an exception by object name would
    // silence a whole class of parts instead of the one that is meant.
    const excepted = (Array.isArray(spec.mirrorExcept) ? spec.mirrorExcept : [])
      .concat(Array.isArray(spec.asymmetric) ? spec.asymmetric : []);
    const isExcepted = (c) => excepted.some((rule) => {
      if (!rule) return false;
      if (typeof rule === 'string') return c.objectName === rule || c.objectName.includes(rule);
      const near = Array.isArray(rule.near) ? rule.near : null;
      if (near) {
        const tol = Number(rule.tolerance ?? 0.05);
        return (rule.objectName ? c.objectName === rule.objectName : true)
          && Math.abs(c.centre[0] - near[0]) <= tol
          && Math.abs(c.centre[1] - near[1]) <= tol
          && Math.abs(c.centre[2] - near[2]) <= tol;
      }
      return rule.objectName ? c.objectName === rule.objectName : false;
    });
    const unmatched = [];
    for (const c of comps) {
      if (Math.abs(c.centre[0]) <= mirrorTol) continue;          // on the centre line
      if (isExcepted(c)) continue;
      const twin = comps.find((o) => o !== c
        && Math.abs(o.centre[0] + c.centre[0]) <= mirrorTol
        && Math.abs(o.centre[1] - c.centre[1]) <= mirrorTol
        && Math.abs(o.centre[2] - c.centre[2]) <= mirrorTol
        && o.size.every((v, k) => Math.abs(v - c.size[k]) <= mirrorTol));
      if (!twin) {
        unmatched.push({
          objectName: c.objectName, componentIndex: c.componentIndex,
          centre: c.centre.map((v) => +v.toFixed(3)), size: c.size.map((v) => +v.toFixed(3)),
        });
      }
    }
    // A guard against passing this check by silencing it: declaring a large share
    // of parts as intentional makes the check true by construction, so the share is
    // reported and flagged.
    const offCentre = comps.filter((c) => Math.abs(c.centre[0]) > mirrorTol);
    const exceptedCount = offCentre.filter((c) => isExcepted(c)).length;
    const exceptedShare = offCentre.length ? exceptedCount / offCentre.length : 0;
    checks.push({
      id: 'mirrorExceptions',
      label: '单侧例外占比（过高说明在用例外掩盖不对称）',
      expected: 0,
      actual: +exceptedShare.toFixed(3),
      deltaMm: null,
      toleranceMm: null,
      passed: exceptedShare <= Number(spec.maxMirrorExceptions ?? 0.15),
      exceptedCount, offCentre: offCentre.length,
      note: 'exceptions are legitimate for hatches and masts, but a high share means the check is being satisfied by declaration rather than by symmetry',
    });
    checks.push({
      id: 'mirror',
      label: '左右零件成对（每个偏离中线的零件都要有镜像对应件）',
      expected: comps.filter((c) => Math.abs(c.centre[0]) > mirrorTol).length,
      actual: comps.filter((c) => Math.abs(c.centre[0]) > mirrorTol).length - unmatched.length,
      deltaMm: null,
      toleranceMm: +(mirrorTol * 1000).toFixed(1),
      passed: unmatched.length === 0,
      unmatched: unmatched.slice(0, 12),
      unmatchedCount: unmatched.length,
    });
  }

  const failed = checks.filter((c) => !c.passed);
  return {
    declared: true,
    passed: failed.length === 0,
    toleranceMm: +(tol * 1000).toFixed(1),
    summary: { checks: checks.length, failed: failed.length },
    checks,
    failures: failed,
    bounds: all ? { min: all.min.map((v) => +v.toFixed(4)), max: all.max.map((v) => +v.toFixed(4)), size: all.size.map((v) => +v.toFixed(4)) } : null,
  };
}

// Mirror audit: for every part off the centre line, say whether it has a mirror
// counterpart, and if not, why that might be.
//
// "No twin" alone cannot be acted on: a part can be missing its counterpart, can
// be 12 mm off, or can be one-sided on purpose. The nearest same-size component
// and its reflection error separate those cases, and the caller decides - the tool
// does not guess intent.
export function mirrorAudit(doc, options = {}) {
  const tol = Number(options.tolerance ?? 0.002);
  const search = Number(options.search ?? 0.25);
  const comps = analyseComponents(doc);
  const key = (c) => c.size.map((v) => v.toFixed(3)).join(':');
  const rows = [];
  for (const c of comps) {
    if (Math.abs(c.centre[0]) <= tol) continue;
    const exact = comps.find((o) => o !== c
      && Math.abs(o.centre[0] + c.centre[0]) <= tol
      && Math.abs(o.centre[1] - c.centre[1]) <= tol
      && Math.abs(o.centre[2] - c.centre[2]) <= tol
      && o.size.every((v, k) => Math.abs(v - c.size[k]) <= tol));
    if (exact) continue;

    let sameSize = null, sameSizeMirrorError = null;
    for (const o of comps) {
      if (o === c || key(o) !== key(c)) continue;
      const d = Math.hypot(o.centre[0] - c.centre[0], o.centre[1] - c.centre[1], o.centre[2] - c.centre[2]);
      if (!sameSize || d < sameSize.d) {
        sameSize = { d, o };
        sameSizeMirrorError = Math.hypot(o.centre[0] + c.centre[0], o.centre[1] - c.centre[1], o.centre[2] - c.centre[2]);
      }
    }
    let near = null;
    for (const o of comps) {
      if (o === c) continue;
      const err = Math.hypot(o.centre[0] + c.centre[0], o.centre[1] - c.centre[1], o.centre[2] - c.centre[2]);
      if (!near || err < near.error) near = { error: err, o, sameSize: key(o) === key(c) };
    }
    const verdict = near && near.error <= search && near.sameSize
      ? 'near-mirror: same size, reflection error ' + (near.error * 1000).toFixed(0) + ' mm - likely a defect'
      : sameSize
        ? 'same-size twin exists but is not its mirror (error ' + ((sameSizeMirrorError || 0) * 1000).toFixed(0) + ' mm) - the pair sits on one side'
        : 'no same-size part anywhere - one-sided by design, or the counterpart is missing';
    rows.push({
      objectName: c.objectName, componentIndex: c.componentIndex,
      centre: c.centre.map((v) => +v.toFixed(4)),
      size: c.size.map((v) => +v.toFixed(4)),
      triangles: c.triangles,
      nearestMirror: near ? {
        objectName: near.o.objectName, componentIndex: near.o.componentIndex,
        errorMm: +(near.error * 1000).toFixed(1), sameSize: near.sameSize,
      } : null,
      verdict,
    });
  }
  return {
    summary: { components: comps.length, offCentre: comps.filter((c) => Math.abs(c.centre[0]) > tol).length, unmatched: rows.length, toleranceMm: +(tol * 1000).toFixed(1) },
    rows,
  };
}
