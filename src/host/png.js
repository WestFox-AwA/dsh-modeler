import zlib from 'node:zlib';

// Minimal PNG reader for parity checks.
//
// The panel returns a canvas PNG; comparing it with the software path needs the
// pixels, and pulling a native image dependency into the plugin for that would be
// worse than sixty lines of unfiltering. Only what a canvas produces is accepted:
// 8-bit, non-interlaced, colour types 2 (RGB) and 6 (RGBA), optionally with a
// tRNS-free alpha channel.

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePng(buffer, {strict=false,maxPixels=16_777_216}={}) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colourType = 0, interlace = 0;
  const idat = [];
  let palette = null, trns = null, ended=false, headers=0;
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if(strict&&headers===0&&type!=='IHDR')throw new Error('PNG header must be first');
    if(strict&&/^[A-Z]/.test(type)&&!['IHDR','PLTE','IDAT','IEND'].includes(type))throw new Error('unknown critical PNG chunk');
    if(length>buf.length-offset-12)throw new Error('truncated PNG chunk');
    if(strict&&crc32(buf.subarray(offset+4,offset+8+length))!==buf.readUInt32BE(offset+8+length))throw new Error('PNG checksum mismatch');
    const data = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === 'IHDR') {
      if(++headers!==1||length!==13)throw new Error('invalid PNG header');
      if(data[10]!==0||data[11]!==0)throw new Error('unsupported PNG compression/filter method');
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colourType = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') palette = Buffer.from(data);
    else if (type === 'tRNS') trns = Buffer.from(data);
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') {if(length!==0)throw new Error('invalid PNG end');ended=true;break;}
  }
  if (!width || !height) throw new Error('PNG has no image header');
  if(!ended||!idat.length)throw new Error('PNG has no complete pixel stream');
  if(strict&&offset!==buf.length)throw new Error('PNG has trailing data');
  if(width*height>maxPixels)throw new Error('PNG pixel budget exceeded');
  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  if (interlace) throw new Error('interlaced PNG is not supported');
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colourType];
  if (!channels) throw new Error(`unsupported colour type ${colourType}`);

  const stride = width * channels;
  const expected=height*(stride+1);
  const raw = zlib.inflateSync(Buffer.concat(idat),{maxOutputLength:expected});
  if(raw.length!==expected)throw new Error('PNG pixel stream length mismatch');
  const out = Buffer.alloc(stride * height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      const v = line[x];
      cur[x] = filter === 0 ? v
        : filter === 1 ? (v + a) & 255
          : filter === 2 ? (v + b) & 255
            : filter === 3 ? (v + ((a + b) >> 1)) & 255
              : filter === 4 ? (v + paeth(a, b, c)) & 255
                : (() => { throw new Error(`bad PNG filter ${filter}`); })();
    }
  }

  // normalise to RGBA
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, p = 0; i < width * height; i++, p += channels) {
    let r, g, b, a = 255;
    if (colourType === 6) { r = out[p]; g = out[p + 1]; b = out[p + 2]; a = out[p + 3]; }
    else if (colourType === 2) { r = out[p]; g = out[p + 1]; b = out[p + 2]; }
    else if (colourType === 0) { r = g = b = out[p]; }
    else if (colourType === 4) { r = g = b = out[p]; a = out[p + 1]; }
    else { // palette
      const index = out[p];
      r = palette[index * 3]; g = palette[index * 3 + 1]; b = palette[index * 3 + 2];
      if (trns && index < trns.length) a = trns[index];
    }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a;
  }
  return { width, height, data: rgba };
}

// Background of the panel render is a vertical gradient, so "is this pixel the
// model" cannot be an exact colour test. It is decided by distance from the
// column's own background, which is sampled from the top row of that column.
function backgroundOf(image) {
  const { width, height, data } = image;
  const top = new Uint8Array(width * 3);
  for (let x = 0; x < width; x++) {
    const i = x * 4;
    top[x * 3] = data[i]; top[x * 3 + 1] = data[i + 1]; top[x * 3 + 2] = data[i + 2];
  }
  return { width, height, top };
}

export function silhouette(image, options = {}) {
  const threshold = Number(options.threshold ?? 28);
  const bg = backgroundOf(image);
  const mask = new Uint8Array(image.width * image.height);
  let count = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4;
      // compare against the column's background, and also require some brightness
      // difference from the median background so a shadow does not become a part
      const dx = Math.abs(image.data[i] - bg.top[x * 3]);
      const dy = Math.abs(image.data[i + 1] - bg.top[x * 3 + 1]);
      const dz = Math.abs(image.data[i + 2] - bg.top[x * 3 + 2]);
      if (Math.max(dx, dy, dz) > threshold) { mask[y * image.width + x] = 1; count++; }
    }
  }
  return { mask, count, ratio: count / (image.width * image.height) };
}

// Boundary agreement with a one-pixel tolerance.
//
// A rasteriser with anti-aliasing and a rasteriser without it disagree by roughly
// one pixel all the way round a silhouette; that is a rendering difference, not a
// difference about what the model looks like. A pixel counts as agreeing when the
// other mask has a matching pixel within `tol`. Strict IoU is still reported next
// to it, so the tolerance cannot hide a real shape error.
function dilate(mask, width, height, tol) {
  if (!tol) return mask;
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      for (let dy = -tol; dy <= tol; dy++) {
        for (let dx = -tol; dx <= tol; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) out[ny * width + nx] = 1;
        }
      }
    }
  }
  return out;
}

export function compareImages(a, b, options = {}) {
  if (a.width !== b.width || a.height !== b.height) throw new Error('size mismatch');
  // Each image has its own background and its own noise floor: the panel clears to
  // pure black, the software path to a near-black gradient. One shared threshold
  // would either admit the software's ambient floor or drop its darkest metal.
  const sa = silhouette(a, { ...options, threshold: Number(options.thresholdA ?? options.threshold ?? 28) });
  const sb = silhouette(b, { ...options, threshold: Number(options.thresholdB ?? options.threshold ?? 28) });
  let intersection = 0, union = 0;
  let colourSum = 0, colourCount = 0;
  for (let i = 0; i < sa.mask.length; i++) {
    const inA = sa.mask[i], inB = sb.mask[i];
    if (inA || inB) union++;
    if (inA && inB) {
      intersection++;
      const p = i * 4;
      colourSum += (Math.abs(a.data[p] - b.data[p]) + Math.abs(a.data[p + 1] - b.data[p + 1]) + Math.abs(a.data[p + 2] - b.data[p + 2])) / 3;
      colourCount++;
    }
  }
  // coarse regions so a single wrong area cannot hide in a global average
  const cols = 4, rows = 3;
  const regions = [];
  for (let ry = 0; ry < rows; ry++) for (let rx = 0; rx < cols; rx++) {
    let n = 0, inter = 0;
    for (let y = Math.floor(ry * a.height / rows); y < Math.floor((ry + 1) * a.height / rows); y++) {
      for (let x = Math.floor(rx * a.width / cols); x < Math.floor((rx + 1) * a.width / cols); x++) {
        const i = y * a.width + x;
        if (sa.mask[i] || sb.mask[i]) n++;
        if (sa.mask[i] && sb.mask[i]) inter++;
      }
    }
    if (n > 200) regions.push({ region: `r${ry}c${rx}`, iou: +(inter / n).toFixed(4), pixels: n });
  }
  // tolerance metric
  const tol = Number(options.tolerance ?? 1);
  const da = dilate(sa.mask, a.width, a.height, tol);
  const db = dilate(sb.mask, b.width, b.height, tol);
  let missingBeyond = 0, extraBeyond = 0;
  for (let i = 0; i < sa.mask.length; i++) {
    if (sa.mask[i] && !db[i]) missingBeyond++;
    if (sb.mask[i] && !da[i]) extraBeyond++;
  }
  const unionCount = union || 1;
  const boundaryAgreement = +(1 - (missingBeyond + extraBeyond) / unionCount).toFixed(4);

  return {
    iou: union ? +(intersection / union).toFixed(4) : 1,
    boundaryAgreement,
    tolerance: tol,
    missingBeyond, extraBeyond,
    coverageA: +sa.ratio.toFixed(4),
    coverageB: +sb.ratio.toFixed(4),
    meanChannelDelta: colourCount ? +(colourSum / colourCount).toFixed(2) : null,
    regions,
    worstRegion: regions.slice().sort((x, y) => x.iou - y.iou)[0] || null,
  };
}

/* ------------------------------------------------------------------ encode */
// Minimal RGBA PNG writer, so a reference silhouette can be produced (and a
// fixture built) without an image dependency. Filter 0 on every row.
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
export function encodePng({ width, height, data }) {
  if (!width || !height || data.length !== width * height * 4) throw new Error('encodePng needs RGBA data matching width*height');
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* --------------------------------------------------------------- colour */
// Colour parity cannot be pixel equality: the panel lights the scene with its own
// rig, environment map and tone mapping, and the software path has a different
// one. What must agree is the *material reading* - which region is warm or cool,
// which is lighter - after a single global exposure is factored out.
const srgbToLinear = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };

function hsvOf(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 1e-6) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: mx <= 0 ? 0 : d / mx, v: mx };
}

const medianOf = (list) => {
  if (!list.length) return null;
  const s = [...list].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function compareColour(client, software, { cols = 4, rows = 3, erode = 1, minPixels = 120 } = {}) {
  if (client.width !== software.width || client.height !== software.height) throw new Error('size mismatch');
  const W = client.width, H = client.height;
  const ma = silhouette(client).mask, mb = silhouette(software).mask;
  const inside = (mask, x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x] === 1;
  const interior = (mask, x, y) => {
    if (!inside(mask, x, y)) return false;
    for (let dy = -erode; dy <= erode; dy++) for (let dx = -erode; dx <= erode; dx++) if (!inside(mask, x + dx, y + dy)) return false;
    return true;
  };

  const sample = (img, x, y) => {
    const i = (y * W + x) * 4;
    return [srgbToLinear(img.data[i]), srgbToLinear(img.data[i + 1]), srgbToLinear(img.data[i + 2])];
  };
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

  // one global exposure, taken from the whole overlap, so a brighter panel does
  // not read as a material error
  const ratios = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!interior(ma, x, y) || !interior(mb, x, y)) continue;
    const la = lum(sample(client, x, y)), lb = lum(sample(software, x, y));
    if (la > 1e-4 && lb > 1e-4) ratios.push(lb / la);
  }
  const exposure = medianOf(ratios) || 1;

  const regions = [];
  for (let ry = 0; ry < rows; ry++) {
    for (let rx = 0; rx < cols; rx++) {
      const x0 = Math.floor(rx * W / cols), x1 = Math.floor((rx + 1) * W / cols);
      const y0 = Math.floor(ry * H / rows), y1 = Math.floor((ry + 1) * H / rows);
      let n = 0;
      const accA = [0, 0, 0], accB = [0, 0, 0];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        if (!interior(ma, x, y) || !interior(mb, x, y)) continue;
        const a = sample(client, x, y), b = sample(software, x, y);
        for (let k = 0; k < 3; k++) { accA[k] += a[k]; accB[k] += b[k]; }
        n++;
      }
      if (n < minPixels) continue;
      const meanA = accA.map((v) => v / n), meanB = accB.map((v) => v / n);
      const hsvA = hsvOf(...meanA), hsvB = hsvOf(...meanB);
      let hueDelta = Math.abs(hsvA.h - hsvB.h);
      if (hueDelta > 180) hueDelta = 360 - hueDelta;
      const lumA = lum(meanA), lumB = lum(meanB);
      regions.push({
        region: `r${ry}c${rx}`, pixels: n,
        hueA: +hsvA.h.toFixed(1), hueB: +hsvB.h.toFixed(1), hueDelta: +hueDelta.toFixed(1),
        satA: +hsvA.s.toFixed(3), satB: +hsvB.s.toFixed(3),
        lumError: lumA > 1e-6 ? +((lumB / exposure - lumA) / lumA).toFixed(3) : null,
        // hue only means something where the material is actually coloured
        hueMeaningful: hsvA.s > 0.12 && hsvA.v > 0.02,
      });
    }
  }

  const coloured = regions.filter((r) => r.hueMeaningful);
  const hueAgree = coloured.length ? coloured.filter((r) => r.hueDelta <= 20).length / coloured.length : null;
  // rank correlation of luminance: a warm highlight must stay the warm highlight
  const ranked = regions.filter((r) => r.lumError !== null).map((r) => [r.lumA ?? 0, r.lumError]);
  let lumCorrelation = null;
  if (regions.length >= 3) {
    const xs = regions.map((r) => r.satA + r.hueA / 360);
    const ys = regions.map((r) => r.satB + r.hueB / 360);
    const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
    const mx = mean(xs), my = mean(ys);
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < xs.length; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2;
    }
    lumCorrelation = dx > 1e-9 && dy > 1e-9 ? +(num / Math.sqrt(dx * dy)).toFixed(3) : null;
  }
  const errors = regions.map((r) => Math.abs(r.lumError)).filter((v) => Number.isFinite(v));
  void ranked;
  return {
    exposure: +exposure.toFixed(3),
    regions,
    hueAgree: hueAgree === null ? null : +hueAgree.toFixed(3),
    saturationCorrelation: lumCorrelation,
    medianLumError: errors.length ? +medianOf(errors).toFixed(3) : null,
  };
}
