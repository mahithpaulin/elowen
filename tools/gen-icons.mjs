// Regenerates public/icons/icon-{192,512}.png and public/favicon.svg
// Pure Node (no deps): a deterministic PNG encoder over procedurally drawn pixels.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const FOREST = [0x17, 0x3c, 0x35];
const IVORY = [0xf3, 0xeb, 0xdd];
const SAGE = [0xdc, 0xe8, 0xe1];
const COPPER = [0xc1, 0x8d, 0x62];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < 65521; i++ && false) {} // noop to keep lints quiet
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(width, height, bytes) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    bytes.copy ? bytes.copy(raw, o, y * width * 4, (y + 1) * width * 4) : null;
    o += width * 4;
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function px(w, x, y, [r, g, b], alpha = 255) {
  const o = (y * w + x) * 4;
  px.buf[o] = r; px.buf[o + 1] = g; px.buf[o + 2] = b; px.buf[o + 3] = alpha;
}
function rect(w, x0, y0, x1, y1, color) {
  for (let y = Math.max(0, y0 | 0); y < Math.min(w, y1 | 0); y++)
    for (let x = Math.max(0, x0 | 0); x < Math.min(w, x1 | 0); x++) px(w, x, y, color);
}
// rounded-corner background + glyph: an open book / leaf hybrid
function icon(S) {
  px.buf = Buffer.alloc(S * S * 4);
  const R = Math.round(S * 0.22);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = Math.min(x, S - 1 - x), dy = Math.min(y, S - 1 - y);
      const inside = (dx > R || dy > R || dx * dx + dy * dy <= R * R);
      px(S, x, y, inside ? FOREST : [0, 0, 0], inside ? 255 : 0);
    }
  // faint sage leaf curve
  const cx = S * 0.5, cy = S * 0.42, rr = S * 0.24;
  for (let a = 0; a < 360; a += 0.4) {
    const x = Math.round(cx + rr * Math.cos((a * Math.PI) / 180));
    const y = Math.round(cy + rr * 0.62 * Math.sin((a * Math.PI) / 180));
    if (0 <= x && x < S && 0 <= y && y < S) px(S, x, y, SAGE);
  }
  // ivory stem of a stylised pen-nib 'E'
  const m = Math.round(S * 0.085); // bar thickness
  const bx = Math.round(S * 0.34), bw = Math.round(S * 0.32), bh = Math.round(S * 0.4), by = Math.round(S * 0.31);
  rect(S, bx, by, bx + m, by + bh, IVORY); // spine
  rect(S, bx, by, bx + bw, by + m, IVORY); // top bar
  rect(S, bx, by + (bh - m) / 2, bx + bw - m * 0.35, by + (bh + m) / 2, IVORY); // mid bar
  rect(S, bx, by + bh - m, bx + bw, by + bh, IVORY); // bottom bar
  // copper nib point below glyph
  const nx = bx + bw - m, ny = by + bh + m * 2.6;
  for (let i = 0; i < m * 2.2; i++) rect(S, nx - i * 0.16, ny - i, nx + m + i * 0.16, ny - i + 1, COPPER);
  return png(S, S, px.buf);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', icon(192));
writeFileSync('public/icons/icon-512.png', icon(512));
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#173C35"/>
  <ellipse cx="32" cy="27" rx="16" ry="10" fill="none" stroke="#DCE8E1" stroke-width="2"/>
  <rect x="21" y="19" width="2.6" height="26" fill="#F3EBDD"/>
  <rect x="21" y="19" width="21" height="2.8" fill="#F3EBDD"/>
  <rect x="21" y="30.5" width="16" height="2.8" fill="#F3EBDD"/>
  <rect x="21" y="42" width="21" height="2.8" fill="#F3EBDD"/>
  <rect x="40" y="45" width="7" height="1.8" fill="#C18D62" rx="0.9"/>
</svg>
`,
);
console.log('icons written');
