// Generates the PWA / home-screen icons (no external deps).
// Draws a blue tile with a white "document" glyph and writes PNGs to public/.
// Run with: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// CRC32 (PNG chunk checksums).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeData), 0);
  return Buffer.concat([len, typeData, crc]);
};

const encodePng = (w, h, rgba) => {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  // raw scanlines with filter byte 0 per row
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
};

const BLUE = [0, 102, 204, 255];
const WHITE = [255, 255, 255, 255];

function draw(size) {
  const buf = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b, a]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const o = (y * size + x) * 4;
    buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = a;
  };
  // blue background (full bleed for maskable)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, BLUE);

  // white document with a folded top-right corner
  const px = Math.round(size * 0.26), pw = Math.round(size * 0.48);
  const py = Math.round(size * 0.20), ph = Math.round(size * 0.60);
  const fold = Math.round(size * 0.12);
  for (let y = py; y < py + ph; y++) {
    for (let x = px; x < px + pw; x++) {
      // cut the top-right corner to suggest a folded page
      if (x - (px + pw - fold) + (py + fold - y) > 0 && x > px + pw - fold && y < py + fold) continue;
      set(x, y, WHITE);
    }
  }
  // blue text lines on the page
  const lines = 3;
  for (let i = 0; i < lines; i++) {
    const ly = py + Math.round(ph * (0.42 + i * 0.16));
    const lx0 = px + Math.round(pw * 0.16);
    const lx1 = px + pw - Math.round(pw * 0.16);
    const th = Math.max(2, Math.round(size * 0.025));
    for (let y = ly; y < ly + th; y++) for (let x = lx0; x < lx1; x++) set(x, y, BLUE);
  }
  return encodePng(size, size, buf);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), draw(192));
writeFileSync(join(OUT, 'icon-512.png'), draw(512));
writeFileSync(join(OUT, 'apple-touch-icon.png'), draw(180));
console.log('Wrote icon-192.png, icon-512.png, apple-touch-icon.png to', OUT);
