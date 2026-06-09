// Generate all app/web icons from a single source image (no external deps).
// Place your image at Frontend/public/app-icon.png (square, ideally >=512px),
// then run: node scripts/make-icons-from-source.mjs
//
// Outputs into public/: icon-192.png, icon-512.png, apple-touch-icon.png (180),
// favicon-32.png, favicon-16.png. Decodes 8-bit non-interlaced PNGs
// (grayscale / RGB / palette / RGBA) and bilinearly resamples to each size.
import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PUB = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SRC = join(PUB, 'app-icon.png');

// ---- CRC32 + PNG encode (RGBA) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
};
const encodePng = (w, h, rgba) => {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
};

// ---- PNG decode -> { width, height, rgba } ----
function decodePng(buf) {
  let p = 8; // skip signature
  let width, height, colorType, bitDepth, interlace;
  const idat = [];
  let plte = null, trns = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (bitDepth !== 8 || interlace !== 0) throw new Error(`Unsupported PNG (bitDepth=${bitDepth}, interlace=${interlace}). Re-export as 8-bit, non-interlaced.`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`Unsupported color type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  const out = Buffer.alloc(width * height * 4);
  let rp = 0;
  const paeth = (a, b, c) => { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    for (let i = 0; i < stride; i++) {
      const x = raw[rp++];
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v;
      if (filter === 0) v = x; else if (filter === 1) v = x + a; else if (filter === 2) v = x + b;
      else if (filter === 3) v = x + ((a + b) >> 1); else v = x + paeth(a, b, c);
      cur[i] = v & 0xff;
    }
    for (let xx = 0; xx < width; xx++) {
      const o = (y * width + xx) * 4; const s = xx * channels;
      let r, g, bl, al = 255;
      if (colorType === 0) { r = g = bl = cur[s]; }
      else if (colorType === 2) { r = cur[s]; g = cur[s + 1]; bl = cur[s + 2]; }
      else if (colorType === 4) { r = g = bl = cur[s]; al = cur[s + 1]; }
      else if (colorType === 6) { r = cur[s]; g = cur[s + 1]; bl = cur[s + 2]; al = cur[s + 3]; }
      else { const idx = cur[s]; r = plte[idx * 3]; g = plte[idx * 3 + 1]; bl = plte[idx * 3 + 2]; al = trns && idx < trns.length ? trns[idx] : 255; }
      out[o] = r; out[o + 1] = g; out[o + 2] = bl; out[o + 3] = al;
    }
    cur.copy(prev);
  }
  return { width, height, rgba: out };
}

// ---- bilinear resize ----
function resize(src, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy = ((y + 0.5) * sh) / dh - 0.5; const y0 = Math.max(0, Math.floor(sy)); const y1 = Math.min(sh - 1, y0 + 1); const fy = sy - y0;
    for (let x = 0; x < dw; x++) {
      const sx = ((x + 0.5) * sw) / dw - 0.5; const x0 = Math.max(0, Math.floor(sx)); const x1 = Math.min(sw - 1, x0 + 1); const fx = sx - x0;
      const o = (y * dw + x) * 4;
      for (let c = 0; c < 4; c++) {
        const p00 = src[(y0 * sw + x0) * 4 + c], p10 = src[(y0 * sw + x1) * 4 + c];
        const p01 = src[(y1 * sw + x0) * 4 + c], p11 = src[(y1 * sw + x1) * 4 + c];
        const top = p00 + (p10 - p00) * fx, bot = p01 + (p11 - p01) * fx;
        out[o + c] = Math.round(top + (bot - top) * fy);
      }
    }
  }
  return out;
}

const src = decodePng(readFileSync(SRC));
const targets = [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180], ['favicon-32.png', 32], ['favicon-16.png', 16]];
for (const [name, size] of targets) {
  const rgba = size === src.width && size === src.height ? src.rgba : resize(src.rgba, src.width, src.height, size, size);
  writeFileSync(join(PUB, name), encodePng(size, size, rgba));
  console.log('wrote', name);
}
console.log(`Done (source ${src.width}x${src.height}).`);
