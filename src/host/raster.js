import { evaluateDoc } from './kernel.js';
import { objectPositions } from './analyze.js';
import { resolveCamera } from './camera.js';

// Character preview: a geometry instrument made of text.
//
// It replaces the old ASCII silhouette, which had three defects the user named:
// a square cell (so everything looked squeezed horizontally), one channel only,
// and no colour or depth. A camera-space z-buffer per view now feeds several
// channels at once: object identity, material colour, form shading and depth.
// Presets keep their legacy orthographic framing; explicit cameras also support
// perspective projection, faithful lookAt controls and view-frustum clipping.
//
// A glyph cell is not square. `cellAspect` is the cell's physical width divided
// by its line height (0.5 for the usual monospace font, i.e. roughly twice as
// tall as wide), and it is part of the projection, not a cosmetic afterthought.

// 62 distinguishable glyphs for object identity; palette letters are a separate
// alphabet-scale of material colours and are listed in their own legend.
const SYMBOLS = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
// Occupied surfaces must never render as a space, so the shade ramp starts at a
// dense dot rather than blank.
const RAMP = '.:-=+*#%@';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const n = Math.hypot(a[0], a[1], a[2]); return n ? [a[0] / n, a[1] / n, a[2] / n] : [0, 0, 1]; };
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const hexToRgb = (s) => (/^#[0-9a-f]{6}$/i.test(s || '')
  ? [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]
  : [192, 199, 212]);

// Compare colours in linear light: two materials of equal luminance must not be
// told apart by their symbol only because one is darker in sRGB.
const toLinear = (b) => { const c = b / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const luminance = (rgb) => 0.2126 * toLinear(rgb[0]) + 0.7152 * toLinear(rgb[1]) + 0.0722 * toLinear(rgb[2]);
const fromLinear = (c) => Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
const glyphFor = (t) => RAMP[Math.round(clamp(t, 0, 1) * (RAMP.length - 1))];

export const TEXT_PREVIEW_VERSION = 'text-preview/2';

export const VIEWS = {
  front: { dir: [0, 0, 1], up: [0, 1, 0], label: 'FRONT +Z' },
  back: { dir: [0, 0, -1], up: [0, 1, 0], label: 'BACK -Z' },
  side: { dir: [1, 0, 0], up: [0, 1, 0], label: 'RIGHT +X' },
  left: { dir: [-1, 0, 0], up: [0, 1, 0], label: 'LEFT -X' },
  top: { dir: [0, 1, 0], up: [0, 0, -1], label: 'TOP +Y' },
  bottom: { dir: [0, -1, 0], up: [0, 0, 1], label: 'BOTTOM -Y' },
  iso: { dir: [1, 0.72, 1], up: [0, 1, 0], label: 'ISOMETRIC' },
};

export const DEFAULT_TEXT_VIEWS = ['front', 'side', 'top', 'iso'];
export const TEXT_CHANNELS = ['part', 'color', 'shade', 'depth', 'facing'];

function readNumber(value, fallback, lo, hi, name, integer = false) {
  const n = value === undefined || value === null ? fallback : Number(value);
  if (!Number.isFinite(n) || n < lo || n > hi || (integer && !Number.isInteger(n))) {
    throw new Error(`${name} must be ${integer ? 'an integer ' : ''}in [${lo}, ${hi}] (got ${value})`);
  }
  return n;
}

function readOptions(opts = {}) {
  const cameraPresent = opts.camera !== undefined;
  if (cameraPresent && (!opts.camera || typeof opts.camera !== 'object' || Array.isArray(opts.camera))) throw new Error('camera must be an object');
  const list = opts.views === undefined
    ? (cameraPresent ? ['custom'] : [...DEFAULT_TEXT_VIEWS])
    : (Array.isArray(opts.views) ? opts.views : String(opts.views).split(','))
      .map((v) => String(v).trim()).filter(Boolean);
  if (!list.length || list.length > 7 || new Set(list).size !== list.length || list.some((v) => v !== 'custom' && !Object.hasOwn(VIEWS, v))) {
    throw new Error('views must be unique: front,back,side,left,top,bottom,iso,custom');
  }
  if (list.includes('custom') && (list.length !== 1 || !cameraPresent)) {
    throw new Error('custom must be the only view and requires camera');
  }
  const options = {
    views: list,
    camera: cameraPresent ? opts.camera : undefined,
    cols: readNumber(opts.cols, 80, 20, 1024, 'cols', true),
    rows: readNumber(opts.rows, 36, 10, 512, 'rows', true),
    samples: readNumber(opts.samples, 2, 1, 4, 'samples', true),
    cellAspect: readNumber(opts.cellAspect, 0.5, 0.15, 2, 'cellAspect'),
    faces: opts.faces === 'double' ? 'double' : 'front',
    ansi: opts.ansi === true,
    colorRuns: opts.colorRuns === true,
    keepBuffers: opts.keepBuffers === true,
  };
  // Bounded work, stated rather than silently truncated.
  if (options.cols * options.rows * options.samples * options.samples > 4_194_304) {
    throw new Error('preview exceeds 4,194,304 samples per view; lower cols/rows/samples instead of being silently capped');
  }
  return options;
}

function prepare(doc) {
  const objects = [];
  const warnings = [];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let triangles = 0;
  let skipped = 0;
  for (const [index, o] of (doc.objects || []).entries()) {
    const positions = objectPositions(o);
    const rgb = hexToRgb(o.material?.color);
    const scale = o.scale || [1, 1, 1];
    // A negative determinant flips winding; three compensates, so the preview
    // must too or a mirrored part would be culled the wrong way round.
    const parity = scale[0] * scale[1] * scale[2] < 0 ? -1 : 1;
    const triCount = Math.floor(positions.length / 9);
    const normals = new Float32Array(triCount * 3);
    const valid = new Uint8Array(triCount);
    for (let t = 0; t < triCount; t++) {
      const i = t * 9;
      const ax = positions[i], ay = positions[i + 1], az = positions[i + 2];
      const bx = positions[i + 3], by = positions[i + 4], bz = positions[i + 5];
      const cx = positions[i + 6], cy = positions[i + 7], cz = positions[i + 8];
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz);
      if (!Number.isFinite(len) || len < 1e-12) { skipped++; continue; }
      if (![ax, ay, az, bx, by, bz, cx, cy, cz].every(Number.isFinite)) { skipped++; continue; }
      nx /= len; ny /= len; nz /= len;
      normals[t * 3] = nx * parity; normals[t * 3 + 1] = ny * parity; normals[t * 3 + 2] = nz * parity;
      valid[t] = 1;
      triangles++;
      for (const p of [[ax, ay, az], [bx, by, bz], [cx, cy, cz]]) {
        for (let k = 0; k < 3; k++) { if (p[k] < min[k]) min[k] = p[k]; if (p[k] > max[k]) max[k] = p[k]; }
      }
    }
    if (o.modifiers?.length) warnings.push({ objectId: o.id, code: 'UNAPPLIED_MODIFIERS', message: 'Preview shows base geometry; modifiers are not evaluated.' });
    if (Number(o.material?.opacity ?? 1) < 1) warnings.push({ objectId: o.id, code: 'TRANSPARENCY_IS_SURFACE', message: 'The nearest glass surface is drawn; transmission is not simulated.' });
    objects.push({
      index, id: o.id || `object_${index + 1}`, name: o.name || `Object ${index + 1}`,
      positions, normals, valid, triangles: triCount,
      rgb, hex: '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join(''),
      double: Boolean(o.material?.doubleSided) || o.kind === 'plane',
    });
  }
  if (!Number.isFinite(min[0])) { min[0] = min[1] = min[2] = 0; max[0] = max[1] = max[2] = 0; }
  return { objects, bounds: { min, max }, triangles, skipped, warnings };
}

// Colour is quantised to a palette that fits one glyph. Two different colours
// must not collapse to "both are now letters", so every quantisation is listed.
function buildPalette(objects) {
  const byHex = new Map();
  for (const o of objects) {
    const e = byHex.get(o.hex) || { hex: o.hex, rgb: o.rgb, objects: 0, triangles: 0 };
    e.objects++;
    e.triangles += o.triangles;
    byHex.set(o.hex, e);
  }
  const all = [...byHex.values()].sort((a, b) => b.triangles - a.triangles || a.hex.localeCompare(b.hex));
  const chosen = all.slice(0, SYMBOLS.length).map((e, i) => ({ ...e, symbol: SYMBOLS[i] }));
  const symbolOf = new Map();
  for (const e of all) {
    let best = 0, bestDistance = Infinity;
    chosen.forEach((c, i) => {
      const d = (toLinear(e.rgb[0]) - toLinear(c.rgb[0])) ** 2
        + (toLinear(e.rgb[1]) - toLinear(c.rgb[1])) ** 2
        + (toLinear(e.rgb[2]) - toLinear(c.rgb[2])) ** 2;
      if (d < bestDistance) { bestDistance = d; best = i; }
    });
    symbolOf.set(e.hex, chosen[best]?.symbol || '?');
  }
  return { chosen, symbolOf, quantised: all.length > SYMBOLS.length, colours: all.length };
}

function renderView(prepared, palette, view, options) {
  const explicitCamera = view.camera;
  const dir = explicitCamera ? explicitCamera.eyeDir : norm(view.dir);
  const right = explicitCamera ? explicitCamera.right : norm(cross(view.up, dir));
  const up = explicitCamera ? explicitCamera.up : cross(dir, right);
  const { cols, rows, samples, cellAspect, faces } = options;

  // Keep the existing preset framing pixel-for-pixel. An explicit camera uses
  // its own target/span/fov and is never recentered on the geometry footprint.
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  if (!explicitCamera) for (const o of prepared.objects) {
    for (let t = 0; t < o.valid.length; t++) {
      if (!o.valid[t]) continue;
      for (let j = 0; j < 9; j += 3) {
        const i = t * 9 + j;
        const x = o.positions[i], y = o.positions[i + 1], z = o.positions[i + 2];
        const u = x * right[0] + y * right[1] + z * right[2];
        const v = x * up[0] + y * up[1] + z * up[2];
        if (u < uMin) uMin = u; if (u > uMax) uMax = u;
        if (v < vMin) vMin = v; if (v > vMax) vMax = v;
      }
    }
  }
  if (!Number.isFinite(uMin)) { uMin = uMax = vMin = vMax = 0; }
  const extentU = Math.max(1e-9, uMax - uMin);
  const extentV = Math.max(1e-9, vMax - vMin);
  // A cell is cellAspect wide relative to its height. The same physical
  // length therefore needs 1/cellAspect times as many columns as rows.
  // Fitting both axes with that relation keeps a sphere round.
  const legacyScaleX = Math.min((cols - 4) / extentU, (rows - 4) / (extentV * cellAspect));
  const legacyScaleY = legacyScaleX * cellAspect;
  const legacyU = (uMin + uMax) / 2, legacyV = (vMin + vMax) / 2;
  const aspect = cols * cellAspect / rows;
  let camera = explicitCamera;
  if (!camera) {
    const center = prepared.bounds.min.map((v, i) => v / 2 + prepared.bounds.max[i] / 2);
    const z = dot(center, dir);
    const target = right.map((v, i) => v * legacyU + up[i] * legacyV + dir[i] * z);
    const fitted = resolveCamera(prepared.bounds, { camera: { projection: 'orthographic', target, up }, aspect });
    camera = resolveCamera(prepared.bounds, { camera: {
      projection: 'orthographic', target, up, span: rows / legacyScaleY,
      eye: target.map((v, i) => v + dir[i] * fitted.distance),
    }, aspect });
  }
  const perspective = camera.projection === 'perspective';
  const tanV = Math.tan(camera.fov * Math.PI / 360), tanH = tanV * aspect;
  const scaleY = explicitCamera ? rows / (perspective ? 2 * tanV : camera.span) : legacyScaleY;
  const scaleX = explicitCamera ? scaleY / cellAspect : legacyScaleX;
  const uCenter = explicitCamera ? dot(camera.target, right) : legacyU;
  const vCenter = explicitCamera ? dot(camera.target, up) : legacyV;
  const W = cols * samples, H = rows * samples;
  const eyeAxis = (x, y, z) => x * dir[0] + y * dir[1] + z * dir[2];
  const toCamera = (x, y, z) => {
    const r = [x - camera.eye[0], y - camera.eye[1], z - camera.eye[2]];
    return [dot(r, right), dot(r, up), -dot(r, dir)];
  };
  const clipPlanes = perspective
    ? [(p) => p[2] - camera.near, (p) => camera.far - p[2], (p) => p[0] + p[2] * tanH, (p) => p[2] * tanH - p[0], (p) => p[1] + p[2] * tanV, (p) => p[2] * tanV - p[1]]
    : [(p) => p[2] - camera.near, (p) => camera.far - p[2], (p) => p[0] + camera.span * aspect / 2, (p) => camera.span * aspect / 2 - p[0], (p) => p[1] + camera.span / 2, (p) => camera.span / 2 - p[1]];
  const clip = (vertices) => {
    let polygon = vertices;
    for (const plane of clipPlanes) {
      if (!polygon.length) break;
      const output = [];
      let previous = polygon[polygon.length - 1], previousDistance = plane(previous);
      for (const current of polygon) {
        const currentDistance = plane(current);
        if ((previousDistance >= 0) !== (currentDistance >= 0)) {
          const t = clamp(previousDistance / (previousDistance - currentDistance), 0, 1);
          output.push(previous.map((v, i) => v + (current[i] - v) * t));
        }
        if (currentDistance >= 0) output.push(current);
        previous = current; previousDistance = currentDistance;
      }
      polygon = output;
    }
    return polygon;
  };
  const toScreen = (p) => [
    (cols / 2 + p[0] * scaleX / (perspective ? p[2] : 1)) * samples,
    (rows / 2 - p[1] * scaleY / (perspective ? p[2] : 1)) * samples,
    p[2],
  ];

  const nearest = new Float64Array(W * H).fill(-Infinity);      // culled draw
  const nearestId = new Int32Array(W * H).fill(-1);
  const nearestShade = new Float32Array(W * H);
  // Two buffers instead of one flag: at a coincident double wall the depth tie
  // decides nothing, and only a back face that is strictly closer is a defect.
  const anyFront = new Float64Array(W * H).fill(-Infinity);
  const anyBack = new Float64Array(W * H).fill(-Infinity);

  const light = norm([dir[0] + up[0] * 0.85 - right[0] * 0.45, dir[1] + up[1] * 0.85 - right[1] * 0.45, dir[2] + up[2] * 0.85 - right[2] * 0.45]);
  let culled = 0;

  for (const o of prepared.objects) {
    const p = o.positions;
    for (let t = 0; t < o.valid.length; t++) {
      if (!o.valid[t]) continue;
      const i = t * 9;
      const nx = o.normals[t * 3], ny = o.normals[t * 3 + 1], nz = o.normals[t * 3 + 2];
      const ax = p[i], ay = p[i + 1], az = p[i + 2];
      const bx = p[i + 3], by = p[i + 4], bz = p[i + 5];
      const cx = p[i + 6], cy = p[i + 7], cz = p[i + 8];
      const front = explicitCamera && perspective
        ? nx * (camera.eye[0] - ax) + ny * (camera.eye[1] - ay) + nz * (camera.eye[2] - az) > 1e-9
        : nx * dir[0] + ny * dir[1] + nz * dir[2] > 1e-9;
      const draw = faces === 'double' || front || o.double;
      if (!draw) culled++;
      let shade = 0.24 + 0.76 * Math.abs(light[0] * nx + light[1] * ny + light[2] * nz);
      if (front) shade = 0.24 + 0.76 * Math.max(0, light[0] * nx + light[1] * ny + light[2] * nz);
      let polygon;
      if (explicitCamera) polygon = clip([toCamera(ax, ay, az), toCamera(bx, by, bz), toCamera(cx, cy, cz)]).map(toScreen);
      else {
        const projectLegacy = (x, y, z) => [
          (cols / 2 + (x * right[0] + y * right[1] + z * right[2] - uCenter) * scaleX) * samples - 0.5,
          (rows / 2 - (x * up[0] + y * up[1] + z * up[2] - vCenter) * scaleY) * samples - 0.5,
          eyeAxis(x, y, z),
        ];
        polygon = [projectLegacy(ax, ay, az), projectLegacy(bx, by, bz), projectLegacy(cx, cy, cz)];
      }
      for (let fan = 1; fan + 1 < polygon.length; fan++) {
        const [AX, AY, zA] = polygon[0], [BX, BY, zB] = polygon[fan], [CX, CY, zC] = polygon[fan + 1];
        const den = (BY - CY) * (AX - CX) + (CX - BX) * (AY - CY);
        if (!Number.isFinite(den) || Math.abs(den) < 1e-12) continue;
        const x0 = Math.max(0, Math.ceil(Math.min(AX, BX, CX) - 0.5));
        const x1 = Math.min(W - 1, Math.floor(Math.max(AX, BX, CX) + 0.5));
        const y0 = Math.max(0, Math.ceil(Math.min(AY, BY, CY) - 0.5));
        const y1 = Math.min(H - 1, Math.floor(Math.max(AY, BY, CY) + 0.5));
        if (x0 > x1 || y0 > y1) continue;
        const w1x = (BY - CY) / den, w1y = (CX - BX) / den;
        const w2x = (CY - AY) / den, w2y = (AX - CX) / den;
        for (let y = y0; y <= y1; y++) {
          const py = y + 0.5;
          let l1 = w1x * (x0 + 0.5 - CX) + w1y * (py - CY);
          let l2 = w2x * (x0 + 0.5 - CX) + w2y * (py - CY);
          const row = y * W;
          for (let x = x0; x <= x1; x++, l1 += w1x, l2 += w2x) {
            const l3 = 1 - l1 - l2;
            if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
            const z = explicitCamera
              ? (perspective ? -1 / (l1 / zA + l2 / zB + l3 / zC) : -(l1 * zA + l2 * zB + l3 * zC))
              : l1 * zA + l2 * zB + l3 * zC;
            if (!Number.isFinite(z)) continue;
            const q = row + x;
            if (front) { if (z > anyFront[q]) anyFront[q] = z; }
            else if (z > anyBack[q]) anyBack[q] = z;
            if (draw && z > nearest[q] + 1e-12) {
              nearest[q] = z; nearestId[q] = o.index; nearestShade[q] = shade;
            }
          }
        }
      }
    }
  }

  // --- cell aggregation -------------------------------------------------
  const cellId = new Int32Array(cols * rows).fill(-1);
  const cellDepth = new Float64Array(cols * rows).fill(-Infinity);
  const cellCoverage = new Float32Array(cols * rows);
  const cellShade = new Float32Array(cols * rows);
  const cellFacing = new Int8Array(cols * rows);
  const visibleCells = new Map();
  let depthNear = -Infinity, depthFar = Infinity;
  let filled = 0, border = 0, backfaces = 0;
  const footprint = { x: [cols, -1], y: [rows, -1] };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const q = y * cols + x;
      let covered = 0, shadeSum = 0, zBest = -Infinity, idBest = -1, frontBest = -Infinity, backBest = -Infinity;
      for (let oy = 0; oy < samples; oy++) {
        const row = (y * samples + oy) * W + x * samples;
        for (let ox = 0; ox < samples; ox++) {
          const s = row + ox;
          if (anyFront[s] > frontBest) frontBest = anyFront[s];
          if (anyBack[s] > backBest) backBest = anyBack[s];
          if (nearestId[s] >= 0) {
            covered++; shadeSum += nearestShade[s];
            if (nearest[s] > zBest) { zBest = nearest[s]; idBest = nearestId[s]; }
          }
        }
      }
      // strictly closer back face, beyond a small tolerance for coplanar walls
      const facingBest = backBest > frontBest + 1e-6 ? -1 : frontBest > -Infinity ? 1 : 0;
      cellFacing[q] = facingBest;
      if (facingBest < 0) backfaces++;
      if (idBest < 0) continue;
      cellId[q] = idBest; cellDepth[q] = zBest;
      cellCoverage[q] = covered / (samples * samples);
      cellShade[q] = shadeSum / Math.max(1, covered);
      visibleCells.set(idBest, (visibleCells.get(idBest) || 0) + 1);
      if (zBest > depthNear) depthNear = zBest;
      if (zBest < depthFar) depthFar = zBest;
      filled++;
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) border++;
      footprint.x[0] = Math.min(footprint.x[0], x); footprint.x[1] = Math.max(footprint.x[1], x);
      footprint.y[0] = Math.min(footprint.y[0], y); footprint.y[1] = Math.max(footprint.y[1], y);
    }
  }

  // --- channels ---------------------------------------------------------
  // Colour encodes material identity; shade encodes form; depth encodes range;
  // facing flags a nearest backface. One buffer, four readings of it.
  const span = depthNear - depthFar;
  const rowsOut = { part: [], color: [], shade: [], depth: [], facing: [] };
  const colorRuns = [];
  const ansiRows = [];
  for (let y = 0; y < rows; y++) {
    let part = '', color = '', shade = '', depth = '', facing = '';
    const runs = [];
    let ansi = '';
    let runHex = null, runText = '', ansiHex = null;
    for (let x = 0; x < cols; x++) {
      const q = y * cols + x;
      const id = cellId[q];
      if (id < 0) {
        part += ' '; color += ' '; shade += ' '; depth += ' '; facing += ' ';
        if (runHex !== null) { runs.push({ hex: runHex, text: runText }); runHex = null; runText = ''; }
        if (ansiHex !== null) { ansi += '\u001b[0m'; ansiHex = null; }
        ansi += ' ';
        continue;
      }
      const o = prepared.objects[id];
      // Depth cue: nearer is brighter, so relief is visible in the shade channel
      // even where the lighting is uniform.
      const depthT = span < 1e-9 ? 0.5 : (cellDepth[q] - depthFar) / span;
      const material = 0.35 + 0.65 * (fromLinear(luminance(o.rgb)) / 255);
      const brightness = cellShade[q] * material * (0.82 + 0.18 * depthT) * (0.45 + 0.55 * Math.sqrt(cellCoverage[q]));
      const ch = glyphFor(brightness);
      part += SYMBOLS[id % SYMBOLS.length];
      color += palette.symbolOf.get(o.hex) || '?';
      shade += ch;
      depth += glyphFor(depthT);
      facing += cellFacing[q] < 0 ? '!' : cellFacing[q] > 0 ? '+' : ' ';
      if (runHex !== o.hex) { if (runHex !== null) runs.push({ hex: runHex, text: runText }); runHex = o.hex; runText = ''; }
      runText += ch;
      if (ansiHex !== o.hex) {
        if (ansiHex !== null) ansi += '\u001b[0m';
        ansi += `\u001b[38;2;${o.rgb[0]};${o.rgb[1]};${o.rgb[2]}m`;
        ansiHex = o.hex;
      }
      ansi += ch;
    }
    if (runHex !== null) runs.push({ hex: runHex, text: runText });
    if (ansiHex !== null) ansi += '\u001b[0m';
    rowsOut.part.push(part); rowsOut.color.push(color); rowsOut.shade.push(shade);
    rowsOut.depth.push(depth); rowsOut.facing.push(facing);
    colorRuns.push(runs); ansiRows.push(ansi);
  }

  let same = 0, total = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const a = cellId[y * cols + x] >= 0, b = cellId[y * cols + (cols - 1 - x)] >= 0;
    if (a || b) { total++; if (a === b) same++; }
  }

  const result = {
    label: view.label,
    cols, rows, cellAspect,
    part: rowsOut.part.join('\n'),
    color: rowsOut.color.join('\n'),
    shade: rowsOut.shade.join('\n'),
    depth: rowsOut.depth.join('\n'),
    facing: rowsOut.facing.join('\n'),
    colorRuns,
    coverage: +(filled / (cols * rows)).toFixed(5),
    borderTouch: border,
    symmetry: total ? +(same / total).toFixed(4) : 1,
    visible: [...visibleCells.keys()].map((i) => prepared.objects[i].id),
    visibleCells: [...visibleCells.entries()].map(([i, cells]) => ({ id: prepared.objects[i].id, name: prepared.objects[i].name, cells })),
    diagnostics: {
      culledTriangles: culled,
      backfaceCells: backfaces,
      frontmostBackface: backfaces > 0,
      note: '! is a nearest back-facing surface found with culling disabled; it marks geometry to inspect, not a score.',
    },
    depthRange: filled ? { far: depthFar, near: depthNear, convention: explicitCamera ? 'negative eye-space distance; larger is nearer; @ near, . far' : 'larger dot(position, eyeDir) is nearer; @ near, . far' } : null,
    camera,
    projection: { type: camera.projection, eyeDir: dir, right, up, scaleX, scaleY, uCenter, vCenter, aspect, fov: camera.fov, span: camera.span, near: camera.near, far: camera.far },
    footprint: filled ? { x: footprint.x, y: footprint.y } : null,
  };
  if (options.ansi) result.ansi = ansiRows.join('\n');
  if (options.keepBuffers) {
    result.buffers = { cellId, cellDepth, cellCoverage, cellShade, cellFacing, W, H, nearest, nearestId };
  }
  return result;
}

export function rasterDoc(doc, opts = {}) {
  doc = evaluateDoc(doc);
  const options = readOptions(opts);
  const started = performance.now();
  const prepared = prepare(doc);
  const palette = buildPalette(prepared.objects);
  const frontSign = Array.isArray(doc?.meta?.front) && doc.meta.front[2] < 0 ? -1 : 1;
  const views = {};
  const perView = {};
  for (const key of options.views) {
    const base = VIEWS[key] || { dir: VIEWS.iso.dir, up: VIEWS.iso.up, label: 'CUSTOM' };
    const dir = [...base.dir];
    let label = base.label;
    // Front sign from the document flips the views that face along Z, so the
    // preview agrees with the panel about which end is the nose.
    if (frontSign < 0 && (key === 'front' || key === 'back' || key === 'iso')) {
      dir[2] *= -1;
      label += ' (front -Z)';
    }
    const t0 = performance.now();
    const camera = options.camera === undefined ? undefined : resolveCamera(prepared.bounds, {
      view: key, camera: options.camera, aspect: options.cols * options.cellAspect / options.rows,
      front: [0, 0, frontSign], projectionDefault: 'perspective',
    });
    views[key] = renderView(prepared, palette, { dir, up: base.up, label, camera }, options);
    perView[key] = +(performance.now() - t0).toFixed(3);
  }
  const visible = new Set(Object.values(views).flatMap((v) => v.visible));
  const totalMs = +(performance.now() - started).toFixed(3);
  return {
    version: TEXT_PREVIEW_VERSION,
    metrics: {
      objects: prepared.objects.length,
      triangles: prepared.triangles,
      skippedTriangles: prepared.skipped,
      bounds: prepared.bounds,
      cols: options.cols, rows: options.rows, samples: options.samples,
      cellAspect: options.cellAspect, faces: options.faces,
      hidden: prepared.objects.filter((o) => !visible.has(o.id)).map((o) => ({ id: o.id, name: o.name })),
      frontSymmetry: views.front?.symmetry ?? null,
      frontCoverage: views.front?.coverage ?? null,
      timings: { totalMs, perView },
      source: 'text-preview', diagnosticOnly: true,
    },
    palette: palette.chosen.map((c) => ({ symbol: c.symbol, hex: c.hex, objects: c.objects, triangles: c.triangles })),
    paletteQuantised: palette.quantised,
    colourCount: palette.colours,
    legend: palette.chosen.map((c) => `${c.symbol}=${c.hex} (${c.objects})`),
    objectLegend: prepared.objects.map((o, i) => ({ symbol: SYMBOLS[i % SYMBOLS.length], id: o.id, name: o.name, colour: o.hex })),
    warnings: prepared.warnings,
    conventions: {
      cellAspect: 'glyph width / line height; 0.5 means cells twice as tall as wide',
      colour: 'palette glyphs carry material hue; the ansi channel and the panel use real RGB',
      shade: 'form shading with a mild depth cue - not a PBR render',
      depth: '. far to @ near, within this view\'s visible depth range',
      facing: '+ front face, ! nearest back face (culling disabled for this diagnostic)',
      transparency: 'the nearest glass surface is drawn as a surface',
    },
    views,
  };
}

// A preview can be larger than a tool result may be: one real session received
// 16k characters truncated mid-figure, so it saw the tail of an image instead of
// the shape. The budget drops whole sections and names them, so what arrives is
// always a complete figure.
export function formatTextPreview(result, { channel = 'both', views: wanted, maxChars = 12000 } = {}) {
  const channels = channel === 'both' ? ['color', 'shade', 'depth']
    : channel === 'all' ? ['part', 'color', 'shade', 'depth', 'facing']
      : [channel];
  for (const c of channels) if (!TEXT_CHANNELS.includes(c)) throw new Error(`channel must be one of ${TEXT_CHANNELS.join(',')} or both/all`);
  const keys = (Array.isArray(wanted) ? wanted : wanted ? String(wanted).split(',') : Object.keys(result.views)).map((v) => v.trim()).filter(Boolean);
  const lines = [
    `TEXT PREVIEW ${result.version} | ${result.metrics.cols}x${result.metrics.rows} | cellAspect ${result.metrics.cellAspect} | samples ${result.metrics.samples} | ${result.metrics.timings.totalMs} ms`,
    ...result.legend.slice(0, 12),
    ...(result.legend.length > 12 ? [`… ${result.legend.length - 12} more colours`] : []),
    '. far <-> @ near | facing: + front, ! nearest back face',
  ];
  const dropped = [];
  const reduced = [];
  let budgetUsed = lines.reduce((n, line) => n + line.length + 1, 0);
  // Progressive fallback: if every requested channel does not fit, print the form
  // channel for that view instead of dropping the view entirely - a caller that
  // gets nothing learns nothing, which is how one session ended up reading a
  // truncated tail.
  const channelSets = channels.length > 1 ? [channels, ['shade'], ['part']] : [channels];
  for (const key of keys) {
    const v = result.views[key];
    if (!v) continue;
    let chosen = null;
    let chosenSet = null;
    for (const set of channelSets) {
      const section = [];
      if (v.camera) {
        const c = v.camera;
        const vectorText = (a) => `[${a.map((n) => +n.toPrecision(6)).join(',')}]`;
        section.push(`CAMERA ${c.projection} | eye ${vectorText(c.eye)} target ${vectorText(c.target)} up ${vectorText(c.up)} | fov ${+c.fov.toPrecision(6)} span ${+c.span.toPrecision(6)} near/far ${+c.near.toPrecision(6)}/${+c.far.toPrecision(6)}`);
      }
      for (const c of set) section.push(`
=== ${v.label} | ${c.toUpperCase()} ===`, v[c]);
      section.push(`visible ${v.visible.length} | backfaceCells ${v.diagnostics.backfaceCells} | depth ${v.depthRange ? `${v.depthRange.far.toFixed(3)}..${v.depthRange.near.toFixed(3)}` : 'none'}`);
      const size = section.reduce((n, line) => n + line.length + 1, 0);
      if (budgetUsed + size <= maxChars) { chosen = section; chosenSet = set; break; }
    }
    if (!chosen) { dropped.push(key); continue; }
    if (chosenSet.length < channels.length) reduced.push(`${key}:${chosenSet.join('+')}`);
    budgetUsed += chosen.reduce((n, line) => n + line.length + 1, 0);
    lines.push(...chosen);
  }
  if (dropped.length) lines.push(`
[preview budget ${maxChars} chars: omitted ${dropped.join(', ')} - narrow with --views]`);
  if (reduced.length) lines.push(`[channels reduced to fit: ${reduced.join(', ')} - narrow with --channel]`);
  if (result.warnings.length) lines.push('\nWARNINGS', ...result.warnings.map((w) => `${w.objectId}: ${w.code} - ${w.message}`));
  return lines.join('\n');
}

export function diffRaster(before, after, opts = {}) {
  const out = {};
  for (const key of opts.views || DEFAULT_TEXT_VIEWS) {
    const a = before?.views?.[key], b = after?.views?.[key];
    if (!a || !b) continue;
    // A refit camera is not a geometry change. Saying so is better than
    // reporting a silhouette difference caused by a newly added antenna.
    if (a.cols !== b.cols || a.rows !== b.rows || a.cellAspect !== b.cellAspect
      || (JSON.stringify(a.projection) !== JSON.stringify(b.projection) || JSON.stringify(a.camera) !== JSON.stringify(b.camera))) {
      out[key] = { comparable: false, reason: 'projection-or-cell-layout-changed' };
      continue;
    }
    const rowsA = a.part.split('\n'), rowsB = b.part.split('\n');
    let added = 0, removed = 0, changed = 0;
    const map = rowsA.map((row, y) => {
      let line = '';
      for (let x = 0; x < row.length; x++) {
        const ca = row[x] !== ' ', cb = rowsB[y][x] !== ' ';
        if (!ca && cb) { line += '+'; added++; changed++; }
        else if (ca && !cb) { line += '-'; removed++; changed++; }
        else line += ca ? '#' : ' ';
      }
      return line;
    }).join('\n');
    out[key] = { comparable: true, added, removed, changed, map };
  }
  return out;
}
