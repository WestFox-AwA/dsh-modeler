import { evaluateDoc } from './kernel.js';
import { objectPositions, trianglesOf } from './analyze.js';
import { rasterDoc } from './raster.js';

// Part-level probing.
//
// The document holds merged objects: a vehicle is five objects but hundreds of
// original parts, and every defect that matters lives inside one of them. Merging
// therefore destroys exactly the granularity a diagnosis needs.
//
// The mesh is recovered as connected components, so a merged blob is split back
// into the parts that were joined, each with its own closedness, orientation,
// size and neighbour distance. A finding names a component and can be isolated
// for a close look, which is the machine equivalent of selecting a part and
// pressing local view.

const roundKey = (v) => Math.round(v * 1e4);

function componentsOf(positions) {
  const triCount = Math.floor(positions.length / 9);
  if (!triCount) return [];
  // union-find over rounded vertex positions
  const parent = new Map();
  const find = (k) => {
    let root = k;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(k) !== root) { const next = parent.get(k); parent.set(k, root); k = next; }
    return root;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  const keyOf = (i) => `${roundKey(positions[i])},${roundKey(positions[i + 1])},${roundKey(positions[i + 2])}`;
  const triKeys = [];
  for (let t = 0; t < triCount; t++) {
    const base = t * 9;
    const k = [keyOf(base), keyOf(base + 3), keyOf(base + 6)];
    for (const key of k) if (!parent.has(key)) parent.set(key, key);
    union(k[0], k[1]); union(k[1], k[2]);
    triKeys.push(k);
  }
  const groups = new Map();
  for (let t = 0; t < triCount; t++) {
    const root = find(triKeys[t][0]);
    const list = groups.get(root) || [];
    list.push(t);
    groups.set(root, list);
  }
  return [...groups.values()];
}

function componentStats(positions, tris) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let volume = 0, degenerate = 0;
  const edges = new Map();
  const directed = new Map();
  const directedByEdge = new Map();
  const key = (x, y, z) => `${roundKey(x)},${roundKey(y)},${roundKey(z)}`;
  for (const t of tris) {
    const i = t * 9;
    const a = [positions[i], positions[i + 1], positions[i + 2]];
    const b = [positions[i + 3], positions[i + 4], positions[i + 5]];
    const c = [positions[i + 6], positions[i + 7], positions[i + 8]];
    for (const p of [a, b, c]) for (let k = 0; k < 3; k++) {
      if (p[k] < min[k]) min[k] = p[k];
      if (p[k] > max[k]) max[k] = p[k];
    }
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const nlen = Math.hypot(nx, ny, nz) || 1;
    const unit = [nx / nlen, ny / nlen, nz / nlen];
    if (Math.hypot(nx, ny, nz) / 2 < 1e-10) degenerate++;
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    const ka = key(...a), kb = key(...b), kc = key(...c);
    for (const [p, q] of [[ka, kb], [kb, kc], [kc, ka]]) {
      const und = p < q ? `${p}|${q}` : `${q}|${p}`;
      edges.set(und, (edges.get(und) || 0) + 1);
      const forward = p < q;
      const dir = forward ? 1 : -1;
      const dk = `${p}>${q}`;
      directed.set(dk, (directed.get(dk) || 0) + 1);
      const list = directedByEdge.get(und) || [];
      list.push({ dir, n: unit, forward });
      directedByEdge.set(und, list);
    }
  }
  let boundaryEdges = 0;
  for (const n of edges.values()) if (n === 1) boundaryEdges++;

  // Same-direction edge reuse has two very different causes, and conflating them
  // over-reported defects: two solids glued face to face share a wall whose two
  // faces run the same way round but point opposite ways (benign, and normal for a
  // model built from boxes), while a locally inverted face runs the same way and
  // points the same way (a real defect). The normal decides.
  // Exact duplicate faces: the same three vertices twice. Sharing vertices merges
  // the copies into one connected component, so component-level duplicate
  // detection cannot see them - this is the only place they show up.
  let duplicateFaces = 0;
  const faceSeen = new Map();
  for (const t of tris) {
    const i = t * 9;
    const a = key(positions[i], positions[i + 1], positions[i + 2]);
    const b = key(positions[i + 3], positions[i + 4], positions[i + 5]);
    const c = key(positions[i + 6], positions[i + 7], positions[i + 8]);
    const face = [a, b, c].sort().join('|');
    const seen = faceSeen.get(face) || 0;
    faceSeen.set(face, seen + 1);
    if (seen > 0) duplicateFaces++;
  }

  let doubleWalls = 0, inversionConflicts = 0;
  for (const [edge, list] of directedByEdge) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.dir !== b.dir) continue;
        const dot = a.n[0] * b.n[0] + a.n[1] * b.n[1] + a.n[2] * b.n[2];
        if (dot < -0.5) doubleWalls++; else inversionConflicts++;
      }
    }
  }
  const windingConflicts = doubleWalls + inversionConflicts;
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const centre = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  return {
    triangles: tris.length, min, max, size, centre, volume,
    boundaryEdges, windingConflicts, doubleWalls, inversionConflicts, duplicateFaces, degenerate,
    closed: boundaryEdges === 0,
    outward: boundaryEdges === 0 ? volume > 0 : null,
  };
}

// Axis-aligned gap between two boxes; negative means they overlap on every axis.
function boxGap(a, b) {
  let d = -Infinity;
  for (let k = 0; k < 3; k++) d = Math.max(d, Math.max(b.min[k] - a.max[k], a.min[k] - b.max[k]));
  return d;
}

export function analyseComponents(doc) {
  doc = evaluateDoc(doc);
  const out = [];
  for (const [oi, o] of (doc.objects || []).entries()) {
    const positions = objectPositions(o);
    const groups = componentsOf(positions);
    for (const [ci, tris] of groups.entries()) {
      const stats = componentStats(positions, tris);
      out.push({
        objectIndex: oi, objectId: o.id, objectName: o.name || `Object ${oi + 1}`, intent:o.intent || null,
        componentIndex: ci, objectComponents: groups.length,
        firstTriangle: tris[0], triangles: tris.length,
        ...stats,
        material: o.material?.color || null,
        // a stable signature lets a diff follow one component across revisions
        signature: [stats.size.map((v) => v.toFixed(4)).join(':'), stats.volume.toFixed(5), tris.length].join('/'),
      });
    }
  }
  return out;
}

export function nearestGaps(components) {
  for (const a of components) {
    let best = Infinity, bestIndex = -1;
    for (let j = 0; j < components.length; j++) {
      if (components[j] === a) continue;
      const d = boxGap(a, components[j]);
      if (d < best) { best = d; bestIndex = j; }
    }
    a.nearestGap = Number.isFinite(best) ? +best.toFixed(4) : null;
    a.nearestComponent = bestIndex >= 0 ? components[bestIndex].componentIndex : null;
    a.nearestObject = bestIndex >= 0 ? components[bestIndex].objectName : null;
  }
  return components;
}

const median = (list) => {
  if (!list.length) return null;
  const s = [...list].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Ranked, addressable findings. Every one names an object and a component, so a
// caller can isolate exactly that piece and look at it.
export function findAnomalies(doc, options = {}) {
  const components = nearestGaps(analyseComponents(doc));
  const findings = [];
  const push = (code, severity, target, detail) => findings.push({ code, severity, ...target, ...detail });

  const bySize = new Map();
  for (const c of components) {
    const k = c.size.map((v) => v.toFixed(3)).join(':');
    const list = bySize.get(k) || [];
    list.push(c);
    bySize.set(k, list);
  }

  for (const c of components) {
    const target = {
      objectId: c.objectId, objectName: c.objectName,
      componentIndex: c.componentIndex, firstTriangle: c.firstTriangle,
      bounds: { min: c.min.map((v) => +v.toFixed(4)), max: c.max.map((v) => +v.toFixed(4)) },
      triangles: c.triangles,
    };
    if (c.closed && c.outward === false) {
      push('INVERTED_COMPONENT', 'high', target, {
        message: `封闭但体积为负（${c.volume.toFixed(5)}）：整块翻面，正面剔除后会看见它的内壁`,
        volume: +c.volume.toFixed(6),
      });
    }
    if (!c.closed) {
      const declaredSurface = c.intent?.closedRequired === false;
      push(declaredSurface ? 'OPEN_SURFACE' : 'OPEN_COMPONENT', declaredSurface ? 'low' : 'high', target, {message:`${declaredSurface?'已声明开放表面':'开口'}：${c.boundaryEdges} 条边界边`,boundaryEdges:c.boundaryEdges,intent:c.intent});
    }
    if (c.duplicateFaces > 0) {
      push('DUPLICATE_FACE', 'high', target, {
        message: `${c.duplicateFaces} 个面被完全重复绘制（同一组顶点画了两次）：几何重合，会加倍三角数并让朝向审计失真`,
        duplicateFaces: c.duplicateFaces,
      });
    }
    if (c.windingConflicts > 0) {
      // Internal double walls are proof that the component is several solids glued
      // together (a perforated panel, a grille, a shell). Those constructions
      // produce the same signature as a local inversion, so the finding is
      // reported but marked ambiguous instead of being counted as a defect.
      const compound = c.doubleWalls > 0;
      push('WINDING_CONFLICT', compound ? 'low' : 'medium', target, {
        message: compound
          ? `${c.windingConflicts} 条边被同向使用，但该块含 ${c.doubleWalls} 处内部双墙：这是多个实体拼接（复合原语）的正常特征，不是缺陷`
          : `${c.windingConflicts} 条边被同向使用且法线一致：该块内部面朝向不一致`,
        windingConflicts: c.windingConflicts,
        doubleWalls: c.doubleWalls,
        inversionConflicts: c.inversionConflicts,
        compound,
      });
    }
    if (c.degenerate > 0) {
      push('DEGENERATE_TRIANGLES', 'low', target, { message: `${c.degenerate} 个零面积三角`, degenerate: c.degenerate });
    }
    // Identical parts at different places are repetition (a row of wheels), not
    // duplication. Only a copy sitting on top of another is a defect.
    const twins = (bySize.get(c.size.map((v) => v.toFixed(3)).join(':')) || []).filter((o) => o !== c);
    for (const twin of twins) {
      if (twin.objectId === c.objectId && twin.componentIndex <= c.componentIndex) continue;
      if (c.volume.toFixed(6) !== twin.volume.toFixed(6) || c.triangles !== twin.triangles) continue;
      const distance = Math.hypot(
        c.centre[0] - twin.centre[0], c.centre[1] - twin.centre[1], c.centre[2] - twin.centre[2],
      );
      if (distance > 1e-3) continue;
      push('DUPLICATE_COMPONENT', 'high', target, {
        message: `与 ${twin.objectName}#${twin.componentIndex} 完全重合：重复几何`,
        duplicateOf: { objectId: twin.objectId, componentIndex: twin.componentIndex },
        distance: +distance.toFixed(5),
      });
    }
  }

  // Deliberately no statistical findings. A gap, a size or an aspect ratio only
  // means something against a declared intent, and guessing that intent produced
  // 1200 false duplicates on the first run. Those numbers are returned as data
  // per component; only defects that can be proven become findings.

  const order = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.code.localeCompare(b.code));
  return {
    summary: {
      objects: (doc.objects || []).length,
      components: components.length,
      findings: findings.length,
      byCode: findings.reduce((acc, f) => { acc[f.code] = (acc[f.code] || 0) + 1; return acc; }, {}),
      bySeverity: findings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {}),
      // what is actually a defect, as opposed to an ambiguous construction
      defects: findings.filter((f) => f.severity !== 'low').length,
      ambiguous: findings.filter((f) => f.severity === 'low').length,
    },
    findings: findings.slice(0, Number(options.limit ?? 60)),
    components: components.map((c) => ({
      objectId: c.objectId, objectName: c.objectName, componentIndex: c.componentIndex,
      triangles: c.triangles, closed: c.closed, outward: c.outward,
      size: c.size.map((v) => +v.toFixed(4)),
      centre: c.centre.map((v) => +v.toFixed(4)),
      nearestGap: c.nearestGap,
    })),
  };
}

// Isolate one component: the parts are merged, so it is rebuilt as its own mesh,
// framed to itself, and rendered at a resolution high enough to read.
export function isolateComponent(doc, { objectId, componentIndex = 0 }, renderOptions = {}) {
  const oi = (doc.objects || []).findIndex((o) => o.id === objectId || o.name === objectId);
  if (oi < 0) throw new Error(`没有这个对象：${objectId}`);
  const o = doc.objects[oi];
  const positions = objectPositions(o);
  const groups = componentsOf(positions);
  const tris = groups[Number(componentIndex)];
  if (!tris) throw new Error(`对象 ${o.name} 只有 ${groups.length} 个分量，没有 #${componentIndex}`);
  const out = [];
  for (const t of tris) {
    for (let j = 0; j < 9; j++) out.push(positions[t * 9 + j]);
  }
  const isolated = {
    version: 1,
    nextId: 2,
    meta: { title: `${o.name} #${componentIndex}`, autoFrame: true, front: doc.meta?.front },
    objects: [{
      id: 'probe_part', name: `${o.name} #${componentIndex}`, kind: 'custom',
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      shading: 'flat', params: {}, geometryData: { positions: out },
      material: o.material,
    }],
  };
  const stats = componentStats(positions, tris);
  const preview = rasterDoc(isolated, {
    cols: renderOptions.cols ?? 76, rows: renderOptions.rows ?? 30,
    samples: renderOptions.samples ?? 2, views: renderOptions.views ?? ['front', 'side', 'top', 'iso'],
  });
  return {
    objectId: o.id, objectName: o.name, componentIndex: Number(componentIndex),
    triangles: tris.length, ...stats,
    bounds: { min: stats.min, max: stats.max },
    preview,
  };
}

// Which components moved, resized, appeared or vanished between two revisions.
export function diffComponents(before, after) {
  const a = nearestGaps(analyseComponents(before));
  const b = nearestGaps(analyseComponents(after));
  // Greedy one-to-one matching over the shortest distances first. Pairing by
  // "each part's nearest neighbour" let a moved part steal its neighbour's match;
  // a global ordering keeps a small move paired while genuine additions still
  // surface. The radius is generous because a part that moved 3 mm must still be
  // recognised as the same part, not as a deletion plus an insertion.
  const match = (from, to, radius = 0.15) => {
    const candidates = [];
    from.forEach((x, i) => to.forEach((y, j) => {
      const d = Math.hypot(x.centre[0] - y.centre[0], x.centre[1] - y.centre[1], x.centre[2] - y.centre[2]);
      if (d <= radius) candidates.push({ i, j, d });
    }));
    candidates.sort((a, b) => a.d - b.d);
    const usedFrom = new Set(), usedTo = new Set(), pairs = [];
    for (const c of candidates) {
      if (usedFrom.has(c.i) || usedTo.has(c.j)) continue;
      usedFrom.add(c.i); usedTo.add(c.j);
      pairs.push([from[c.i], to[c.j]]);
    }
    return pairs;
  };
  const pairs = match(a, b);
  const moved = [], resized = [], changed = [];
  for (const [x, y] of pairs) {
    const d = Math.hypot(x.centre[0] - y.centre[0], x.centre[1] - y.centre[1], x.centre[2] - y.centre[2]);
    if (d > 1e-4) moved.push({ objectName: y.objectName, componentIndex: y.componentIndex, mm: +(d * 1000).toFixed(2) });
    const grow = Math.max(...y.size.map((v, i) => Math.abs(v - x.size[i])));
    if (grow > 1e-4) resized.push({ objectName: y.objectName, componentIndex: y.componentIndex, mm: +(grow * 1000).toFixed(2) });
    if (x.triangles !== y.triangles || x.outward !== y.outward || x.closed !== y.closed) {
      changed.push({ objectName: y.objectName, componentIndex: y.componentIndex, triangles: [x.triangles, y.triangles], closed: [x.closed, y.closed] });
    }
  }
  const matchedA = new Set(pairs.map((p) => p[0])), matchedB = new Set(pairs.map((p) => p[1]));
  const addedList = b.filter((c) => !matchedB.has(c));
  const removedList = a.filter((c) => !matchedA.has(c));

  // A part that jumped to the opposite side keeps its size exactly. Pairing a
  // removal with an equal-sized insertion across the centre line is provable,
  // and it is the signature of a mirror that landed on the wrong side rather
  // than two unrelated parts appearing and vanishing.
  const mirrorPairs = [];
  const usedAdded = new Set();
  for (const gone of removedList) {
    const key = gone.size.map((v) => v.toFixed(3)).join(':');
    let best = -1, bestScore = Infinity;
    addedList.forEach((came, i) => {
      if (usedAdded.has(i)) return;
      if (came.size.map((v) => v.toFixed(3)).join(':') !== key) return;
      // score: how well the pair reflects through a plane, plus how far apart it is
      let bestAxis = -1, bestResidual = Infinity;
      for (let axis = 0; axis < 3; axis++) {
        const residual = Math.abs(gone.centre[axis] + came.centre[axis]);
        const other = [0, 1, 2].filter((k) => k !== axis)
          .reduce((n, k) => n + Math.abs(gone.centre[k] - came.centre[k]), 0);
        if (other < 0.01 && residual < bestResidual) { bestResidual = residual; bestAxis = axis; }
      }
      if (bestAxis >= 0 && bestResidual < 0.02) {
        const distance = Math.hypot(gone.centre[0] - came.centre[0], gone.centre[1] - came.centre[1], gone.centre[2] - came.centre[2]);
        if (distance < bestScore) { bestScore = distance; best = i; }
      }
    });
    if (best >= 0) {
      usedAdded.add(best);
      const came = addedList[best];
      mirrorPairs.push({
        objectName: came.objectName,
        from: gone.centre.map((v) => +v.toFixed(3)),
        to: came.centre.map((v) => +v.toFixed(3)),
        mm: +(bestScore * 1000).toFixed(1),
        message: `${gone.objectName} 从 (${gone.centre.map((v) => v.toFixed(2)).join(', ')}) 换到了对侧 (${came.centre.map((v) => v.toFixed(2)).join(', ')})：同尺寸、跨中心面成镜像`,
      });
    }
  }
  // A part can move further than the matching radius - a turret shifted 340 mm is
  // still the same turret, and reporting it as a deletion plus an insertion hides
  // exactly the change a repair needs to confirm. Same size and same triangle
  // count is proof enough to call it a move.
  const movedFar = [];
  const usedFarAdded = new Set();
  for (const gone of removedList) {
    if (matchedA.has(gone)) continue;
    if (mirrorPairs.some((m) => m.from.join(',') === gone.centre.map((v) => +v.toFixed(3)).join(','))) continue;
    const key = gone.size.map((v) => v.toFixed(3)).join(':');
    let best = -1, bestDistance = Infinity;
    addedList.forEach((came, i) => {
      if (usedFarAdded.has(i)) return;
      if (came.size.map((v) => v.toFixed(3)).join(':') !== key) return;
      if (came.triangles !== gone.triangles) return;
      const d = Math.hypot(gone.centre[0] - came.centre[0], gone.centre[1] - came.centre[1], gone.centre[2] - came.centre[2]);
      if (d < bestDistance) { bestDistance = d; best = i; }
    });
    if (best >= 0) {
      usedFarAdded.add(best);
      const came = addedList[best];
      movedFar.push({
        objectName: came.objectName,
        from: gone.centre.map((v) => +v.toFixed(3)),
        to: came.centre.map((v) => +v.toFixed(3)),
        mm: +(bestDistance * 1000).toFixed(1),
      });
    }
  }

  const mirrorAdded = new Set(mirrorPairs.map((m) => m.objectName + '|' + m.to.join(',')));

  return {
    movedFar: movedFar.slice(0, 12),
    mirrorPairs: mirrorPairs.slice(0, 12),
    summary: {
      before: a.length, after: b.length,
      moved: moved.length, resized: resized.length, changed: changed.length,
      added: addedList.length - mirrorPairs.length - movedFar.length,
      removed: removedList.length - mirrorPairs.length - movedFar.length,
      movedFar: movedFar.length,
      mirrorPairs: mirrorPairs.length,
    },
    moved: moved.sort((p, q) => q.mm - p.mm).slice(0, 20),
    resized: resized.sort((p, q) => q.mm - p.mm).slice(0, 20),
    changed: changed.slice(0, 20),
    added: addedList.filter((c) => !mirrorAdded.has(c.objectName + '|' + c.centre.map((v) => +v.toFixed(3)).join(','))
      && !movedFar.some((m) => m.to.join(',') === c.centre.map((v) => +v.toFixed(3)).join(',')))
      .map((c) => ({ objectName: c.objectName, centre: c.centre.map((v) => +v.toFixed(3)), size: c.size.map((v) => +v.toFixed(3)) })),
    removed: removedList.filter((c) => !mirrorPairs.some((m) => m.from.join(',') === c.centre.map((v) => +v.toFixed(3)).join(',')))
      .map((c) => ({ objectName: c.objectName, centre: c.centre.map((v) => +v.toFixed(3)), size: c.size.map((v) => +v.toFixed(3)) })),
  };
}

// The whole model with one component highlighted.
//
// Isolation answers "what shape is this part"; it loses where the part sits. The
// full preview answers "where", but every part looks alike. Selecting a component
// in the panel solves this by drawing it bright and the rest dim, and that is what
// this does in text: the target becomes its own object in a second document, so
// the existing colour and shade channels do the work with no renderer change.
export function probeInContext(doc, { objectId, componentIndex = 0 }, renderOptions = {}) {
  const oi = (doc.objects || []).findIndex((o) => o.id === objectId || o.name === objectId);
  if (oi < 0) throw new Error(`没有这个对象：${objectId}`);
  const o = doc.objects[oi];
  const positions = objectPositions(o);
  const groups = componentsOf(positions);
  const target = groups[Number(componentIndex)];
  if (!target) throw new Error(`对象 ${o.name} 只有 ${groups.length} 个分量，没有 #${componentIndex}`);

  const picked = new Set(target);
  const keep = [], dim = [];
  const triCount = Math.floor(positions.length / 9);
  for (let t = 0; t < triCount; t++) {
    const bucket = picked.has(t) ? keep : dim;
    for (let j = 0; j < 9; j++) bucket.push(positions[t * 9 + j]);
  }
  const stats = componentStats(positions, target);

  const objects = [];
  // everything else first, so the target draws over it when depths tie
  for (const [oi2, other] of (doc.objects || []).entries()) {
    if (oi2 === oi) {
      if (dim.length) objects.push({
        id: 'context_' + o.id, name: 'context', kind: 'custom', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
        shading: 'flat', params: {}, geometryData: { positions: dim },
        material: { color: '#2a2f38', metalness: 0, roughness: 1, opacity: 1 },
      });
      continue;
    }
    objects.push({ ...other, material: { ...(other.material || {}), color: '#2a2f38' } });
  }
  objects.push({
    id: 'target', name: `${o.name} #${componentIndex}`, kind: 'custom', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
    shading: 'flat', params: {}, geometryData: { positions: keep },
    material: { color: '#ff3b30', metalness: 0, roughness: 0.6, opacity: 1 },
  });

  const preview = rasterDoc({ version: 1, nextId: 1, meta: { ...(doc.meta || {}) }, objects }, {
    cols: renderOptions.cols ?? 88, rows: renderOptions.rows ?? 34,
    samples: renderOptions.samples ?? 2, views: renderOptions.views ?? ['front', 'side', 'top', 'iso'],
  });
  return {
    objectId: o.id, objectName: o.name, componentIndex: Number(componentIndex),
    triangles: target.length,
    centre: stats.centre.map((v) => +v.toFixed(4)),
    size: stats.size.map((v) => +v.toFixed(4)),
    bounds: { min: stats.min.map((v) => +v.toFixed(4)), max: stats.max.map((v) => +v.toFixed(4)) },
    legend: 'red = the selected component, grey = everything else',
    preview,
  };
}
