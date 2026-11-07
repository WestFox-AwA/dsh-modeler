import fs from 'node:fs';
import { decodePng } from './png.js';
import { objectPositions } from './analyze.js';

// Reference-driven proportion.
//
// Every earlier quality claim compared the model to itself or to a statistic. The
// useful comparison is against something outside it: a silhouette. This module
// projects the model to a binary mask in the same view as a reference image,
// reports how far apart they are overall and per region, and says which way the
// difference points - "reference is taller here" is actionable, "IoU 0.81" is not.
//
// It deliberately measures the outline only. Colour, materials and detail belong
// to the panel; proportion is what a reference can settle.

const VIEWS = {
  front: { dir: [0, 0, 1], up: [0, 1, 0] },
  back: { dir: [0, 0, -1], up: [0, 1, 0] },
  side: { dir: [1, 0, 0], up: [0, 1, 0] },
  top: { dir: [0, 1, 0], up: [0, 0, -1] },
};

const norm = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Binary silhouette of the whole document in one orthographic view, fitted to the
// frame the same way for model and reference so the comparison is of shape.
export function silhouetteOf(doc, { view = 'front', width = 160, height = 120 } = {}) {
  const cfg = VIEWS[view];
  if (!cfg) throw new Error(`unknown view ${view}`);
  const right = norm(cross(cfg.up, cfg.dir));
  const up = cross(cfg.dir, right);
  const pts = [];
  for (const o of doc.objects || []) pts.push(objectPositions(o));
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (const p of pts) for (let i = 0; i + 2 < p.length; i += 3) {
    const u = p[i] * right[0] + p[i + 1] * right[1] + p[i + 2] * right[2];
    const v = p[i] * up[0] + p[i + 1] * up[1] + p[i + 2] * up[2];
    if (u < uMin) uMin = u; if (u > uMax) uMax = u;
    if (v < vMin) vMin = v; if (v > vMax) vMax = v;
  }
  if (!Number.isFinite(uMin)) return { mask: new Uint8Array(width * height), width, height, bounds: null };
  const margin = Math.max(1e-6, (uMax - uMin) * 0.06, (vMax - vMin) * 0.06);
  const spanU = (uMax - uMin) + margin * 2, spanV = (vMax - vMin) + margin * 2;
  const scale = Math.min(width / spanU, height / spanV);
  const cu = (uMin + uMax) / 2, cv = (vMin + vMax) / 2;
  const toX = (u) => (u - cu) * scale + width / 2;
  const toY = (v) => height / 2 - (v - cv) * scale;

  const mask = new Uint8Array(width * height);
  for (const p of pts) {
    for (let i = 0; i + 8 < p.length; i += 9) {
      const tri = [];
      for (let j = 0; j < 9; j += 3) {
        const x = p[i + j], y = p[i + j + 1], z = p[i + j + 2];
        tri.push([toX(x * right[0] + y * right[1] + z * right[2]), toY(x * up[0] + y * up[1] + z * up[2])]);
      }
      const [[ax, ay], [bx, by], [cx, cy]] = tri;
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(den) < 1e-9) continue;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den;
          const l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den;
          const l3 = 1 - l1 - l2;
          if (l1 >= -1e-9 && l2 >= -1e-9 && l3 >= -1e-9) mask[y * width + x] = 1;
        }
      }
    }
  }
  let count = 0;
  for (let i = 0; i < mask.length; i++) count += mask[i];
  return { mask, width, height, count, ratio: count / (width * height), bounds: { uMin, uMax, vMin, vMax } };
}

// A reference image becomes a mask by comparing each pixel with the dominant
// border colour, so a drawing on white paper and a render on a dark background
// both work without a special case.
export function silhouetteFromImage(file, { threshold = 32, width, height } = {}) {
  const img = decodePng(fs.readFileSync(file));
  const counts = new Map();
  const border = (x, y) => {
    const i = (y * img.width + x) * 4;
    return `${img.data[i]},${img.data[i + 1]},${img.data[i + 2]},${img.data[i + 3]}`;
  };
  for (let x = 0; x < img.width; x++) { counts.set(border(x, 0), (counts.get(border(x, 0)) || 0) + 1); counts.set(border(x, img.height - 1), (counts.get(border(x, img.height - 1)) || 0) + 1); }
  for (let y = 0; y < img.height; y++) { counts.set(border(0, y), (counts.get(border(0, y)) || 0) + 1); counts.set(border(img.width - 1, y), (counts.get(border(img.width - 1, y)) || 0) + 1); }
  const bgKey = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const bg = bgKey.split(',').map(Number);

  const W = width || img.width, H = height || img.height;
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const sy = Math.min(img.height - 1, Math.floor(y * img.height / H));
    for (let x = 0; x < W; x++) {
      const sx = Math.min(img.width - 1, Math.floor(x * img.width / W));
      const i = (sy * img.width + sx) * 4;
      const d = Math.max(
        Math.abs(img.data[i] - bg[0]),
        Math.abs(img.data[i + 1] - bg[1]),
        Math.abs(img.data[i + 2] - bg[2]),
      );
      const alpha = img.data[i + 3];
      if (alpha > 32 && d > threshold) mask[y * W + x] = 1;
    }
  }
  let count = 0;
  for (let i = 0; i < mask.length; i++) count += mask[i];
  return { mask, width: W, height: H, count, ratio: count / (W * H) };
}

// Compare two masks of the same size, and say where and which way.
export function compareSilhouettes(reference, model, { cols = 3, rows = 3, label = '' } = {}) {
  if (reference.width !== model.width || reference.height !== model.height) {
    throw new Error('masks must share a size');
  }
  const W = reference.width, H = reference.height;
  let inter = 0, union = 0, missing = 0, extra = 0;
  const regions = [];
  for (let ry = 0; ry < rows; ry++) {
    for (let rx = 0; rx < cols; rx++) {
      const x0 = Math.floor(rx * W / cols), x1 = Math.floor((rx + 1) * W / cols);
      const y0 = Math.floor(ry * H / rows), y1 = Math.floor((ry + 1) * H / rows);
      let rInter = 0, rUnion = 0, rMissing = 0, rExtra = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * W + x;
          const a = reference.mask[i], b = model.mask[i];
          if (a || b) rUnion++;
          if (a && b) rInter++;
          if (a && !b) rMissing++;
          if (!a && b) rExtra++;
        }
      }
      inter += rInter; union += rUnion; missing += rMissing; extra += rExtra;
      if (rUnion > 0) {
        regions.push({
          region: `r${ry}c${rx}`,
          box: { x0, y0, x1, y1 },
          iou: +(rInter / rUnion).toFixed(4),
          missing: rMissing, extra: rExtra,
          // which way the model has to move to match: the bounding box of the
          // reference in this region versus the model's
          direction: rMissing > rExtra * 1.2 ? 'reference extends further here (model is short)'
            : rExtra > rMissing * 1.2 ? 'model extends further here (model is oversized)'
              : 'shape mismatch inside the region',
        });
      }
    }
  }
  const worst = regions.slice().sort((a, b) => a.iou - b.iou)[0] || null;
  return {
    label,
    iou: union ? +(inter / union).toFixed(4) : 1,
    missing, extra,
    coverageReference: reference.count / (W * H),
    coverageModel: model.count / (W * H),
    regions,
    worst,
  };
}

// A compact text map: '#' agrees, '+' the reference has it and the model does not,
// '-' the model has it and the reference does not.
export function silhouetteMap(reference, model, { cols = 56, rows = 20 } = {}) {
  const lines = [];
  for (let ry = 0; ry < rows; ry++) {
    let line = '';
    for (let rx = 0; rx < cols; rx++) {
      let a = 0, b = 0, n = 0;
      const x0 = Math.floor(rx * reference.width / cols), x1 = Math.max(x0 + 1, Math.floor((rx + 1) * reference.width / cols));
      const y0 = Math.floor(ry * reference.height / rows), y1 = Math.max(y0 + 1, Math.floor((ry + 1) * reference.height / rows));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = y * reference.width + x;
        a += reference.mask[i]; b += model.mask[i]; n++;
      }
      const ra = a / n, rb = b / n;
      line += ra > 0.5 && rb > 0.5 ? '#' : ra > 0.5 ? '+' : rb > 0.5 ? '-' : ' ';
    }
    lines.push(line);
  }
  return { text: lines.join('\n'), legend: '# both | + reference only (missing) | - model only (extra)' };
}

// One transform for both sides.
//
// Normalising each mask to its own bounding box makes the comparison scale
// invariant, which sounds right and is wrong here: a model whose turret is too
// short gets stretched to the reference's total height, the missing volume
// disappears, and the report can even invert the direction. The anchor is
// physical instead - horizontal extent fixes the scale, the ground line fixes the
// vertical position - so a short turret stays short and the gap shows up at the
// top where it belongs.
export function alignByWidthAndGround(reference, model, { frame } = {}) {
  const refBox = bboxOf(reference), modelBox = bboxOf(model);
  const W = frame ? frame[0] : reference.width;
  const H = frame ? frame[1] : reference.height;
  const out = new Uint8Array(W * H);
  if (!refBox || !modelBox) return { mask: out, width: W, height: H, scale: null };
  const scale = (refBox.x1 - refBox.x0) / Math.max(1, modelBox.x1 - modelBox.x0);
  const refCx = (refBox.x0 + refBox.x1) / 2, modelCx = (modelBox.x0 + modelBox.x1) / 2;
  const refBase = refBox.y1, modelBase = modelBox.y1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = Math.round(modelCx + (x - refCx) / scale);
      const sy = Math.round(modelBase - (refBase - y) / scale);
      if (sx < 0 || sy < 0 || sx >= model.width || sy >= model.height) continue;
      // resample the reference into the same frame when one is given
      out[y * W + x] = model.mask[sy * model.width + sx];
    }
  }
  let count = 0;
  for (let i = 0; i < out.length; i++) count += out[i];
  return { mask: out, width: W, height: H, count, ratio: count / (W * H), scale: +scale.toFixed(4) };
}

export function bboxOf(mask) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) {
    if (!mask.mask[y * mask.width + x]) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return Number.isFinite(x0) ? { x0, y0, x1: x1 + 1, y1: y1 + 1 } : null;
}

// Normalise a mask to a common canvas: content width maps to the full width, the
// ground sits at the bottom. Resampling the model into the reference image's own
// frame clips it whenever the model is proportionally taller, and clipping reads as
// "the model is missing" - the opposite of the truth.
// A thin antenna must not set the height of a vehicle. Rows and columns whose
// filled share is far below the densest one are trimmed before the box is taken,
// the same idea as the trimmed extent used for proportion elsewhere.
export function robustBox(mask, share = 0.03) {
  const rows = new Array(mask.height).fill(0);
  const cols = new Array(mask.width).fill(0);
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (!mask.mask[y * mask.width + x]) continue;
      rows[y]++; cols[x]++;
    }
  }
  const maxRow = Math.max(...rows), maxCol = Math.max(...cols);
  if (!maxRow || !maxCol) return null;
  const minRow = Math.max(1, Math.round(maxRow * share));
  const minCol = Math.max(1, Math.round(maxCol * share));
  let y0 = 0, y1 = mask.height - 1, x0 = 0, x1 = mask.width - 1;
  while (y0 < y1 && rows[y0] < minRow) y0++;
  while (y1 > y0 && rows[y1] < minRow) y1--;
  while (x0 < x1 && cols[x0] < minCol) x0++;
  while (x1 > x0 && cols[x1] < minCol) x1--;
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

export function normalizeToWidth(mask, W, H) {
  const box = robustBox(mask) || bboxOf(mask);
  const out = new Uint8Array(W * H);
  if (!box) return { mask: out, width: W, height: H, count: 0, ratio: 0, scale: null };
  const scale = W / Math.max(1, box.x1 - box.x0);
  const baseY = box.y1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = Math.round(box.x0 + x / scale);
      const sy = Math.round(baseY - (H - 1 - y) / scale);
      if (sx < 0 || sy < 0 || sx >= mask.width || sy >= mask.height) continue;
      out[y * W + x] = mask.mask[sy * mask.width + sx];
    }
  }
  let count = 0;
  for (let i = 0; i < out.length; i++) count += out[i];
  return { mask: out, width: W, height: H, count, ratio: count / (W * H), scale: +scale.toFixed(4) };
}

// Full report: model against a reference image in one view, both normalised to the
// same canvas by width and ground line.
export function compareToReference(doc, referencePath, { view = 'front', threshold = 32, canvas = [300, 300] } = {}) {
  const [W, H] = canvas;
  const rawReference = silhouetteFromImage(referencePath, { threshold });
  const rawModel = silhouetteOf(doc, { view, width: rawReference.width, height: rawReference.height });
  const reference = normalizeToWidth(rawReference, W, H);
  const model = normalizeToWidth(rawModel, W, H);
  const comparison = compareSilhouettes(reference, model);
  const map = silhouetteMap(reference, model);
  // IoU can be raised by shrinking the model into the reference. Reporting the
  // height-to-length ratio next to it makes that visible instead of rewarding it.
  // The ratio must use the same robust box as the placement, otherwise a thin
  // antenna re-enters the number that was trimmed out two lines earlier.
  const ratio = (m) => {
    const b = robustBox(m) || bboxOf(m);
    return b ? (b.y1 - b.y0) / Math.max(1, b.x1 - b.x0) : null;
  };
  const refRatio = ratio(rawReference), modelRatio = ratio(rawModel);
  const proportion = refRatio && modelRatio
    ? {
      referenceHeightOverLength: +refRatio.toFixed(4),
      modelHeightOverLength: +modelRatio.toFixed(4),
      deltaPercent: +(((modelRatio - refRatio) / refRatio) * 100).toFixed(2),
      note: 'positive means the model is taller for its length than the reference',
    }
    : null;
  return {
    view,
    frame: [W, H],
    anchor: 'content width maps to the canvas width, the ground line sits at the bottom',
    reference: { path: referencePath, coverage: +(rawReference.count / (rawReference.width * rawReference.height)).toFixed(4), size: [rawReference.width, rawReference.height] },
    model: { coverage: model.ratio, scale: model.scale },
    comparison,
    proportion,
    map,
    masks: { reference, model },
  };
}
