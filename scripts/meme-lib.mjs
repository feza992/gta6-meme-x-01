// meme-lib.mjs — draws the gta6-meme-x-01 meme, deterministically.
//
// "Cheat Code: MAKEFUN": an in-game phone shows the GTA cheat code
// MAKEFUN typed in; the cheat activates — $500 — and make.fun's ghost
// (the real press-kit mark) is the emblem on the screen. The joke: the
// only GTA cheat code that pays real money — an AI agent already earned
// on make.fun while its owner played.
//
// Pure Node.js standard library only (node:fs, node:zlib). No network,
// no wall clock, no host fonts: the picture is drawn pixel by pixel with
// a hand-built 5x7 pixel font, and the ghost comes from make.fun's own
// press-kit mark (assets/mark-1024.png), composited in with bilinear
// resampling. main.ts imports buildMeme() from here and regenerates the
// meme into /output; scripts/make-meme.mjs is the thin wrapper that
// writes meme.png into the repository. 960x1200 (4:5, portrait for X).

import { readFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const W = 960;
const H = 1200;

// ------------------------------------------------------------------ RNG
// mulberry32, seeded: every random choice in the scene is reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261119);

// ------------------------------------------------------------------ PNG
// Minimal PNG decode (8-bit, non-interlaced; colour types 0/2/3/4/6) and
// encode (RGBA, filter 0). Enough for the press-kit mark and the output.
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a)
    throw new Error('not a PNG');
  let off = 8, width = 0, height = 0, bitDepth = 8, colorType = 6, interlace = 0;
  const idat = [], plte = []; let trns = null;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') { for (let i = 0; i < data.length; i += 3) plte.push([data[i], data[i + 1], data[i + 2]]); }
    else if (type === 'tRNS') trns = data;
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8 || interlace !== 0) throw new Error(`unsupported PNG: depth ${bitDepth} interlace ${interlace}`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported colour type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(width * height * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x], c = x >= channels ? prev[x - channels] : 0;
      const v = row[x];
      cur[x] = filter === 0 ? v
        : filter === 1 ? (v + a) & 0xff
        : filter === 2 ? (v + b) & 0xff
        : filter === 3 ? (v + ((a + b) >> 1)) & 0xff
        : filter === 4 ? (v + paeth(a, b, c)) & 0xff
        : (() => { throw new Error(`bad filter ${filter}`); })();
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4, s = x * channels;
      if (colorType === 6) { out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = cur[s + 3]; }
      else if (colorType === 2) { out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = 255; }
      else if (colorType === 3) { const p = plte[cur[s]] || [0, 0, 0]; out[o] = p[0]; out[o + 1] = p[1]; out[o + 2] = p[2]; out[o + 3] = trns ? trns[cur[s]] ?? 255 : 255; }
      else if (colorType === 4) { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = cur[s + 1]; }
      else { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = 255; }
    }
    prev = cur;
  }
  return { width, height, data: out };
}
function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- canvas
const img = new Uint8Array(W * H * 4); // RGBA, starts transparent black
function setPx(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 4;
  if (a >= 255) { img[o] = r; img[o + 1] = g; img[o + 2] = b; img[o + 3] = 255; return; }
  const sa = a / 255, da = 1 - sa;
  img[o] = Math.round(r * sa + img[o] * da);
  img[o + 1] = Math.round(g * sa + img[o + 1] * da);
  img[o + 2] = Math.round(b * sa + img[o + 2] * da);
  img[o + 3] = 255;
}
function fillRect(x, y, w, h, [r, g, b, a = 255]) {
  for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++)
    for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) setPx(xx, yy, r, g, b, a);
}
function lerp(a, b, t) { return a + (b - a) * t; }
function vgrad(y0, y1, stops) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / (y1 - y0);
    let i = 0;
    while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
    const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
    const f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    const c = [lerp(c0[0], c1[0], f), lerp(c0[1], c1[1], f), lerp(c0[2], c1[2], f)];
    for (let x = 0; x < W; x++) setPx(x, y, Math.round(c[0]), Math.round(c[1]), Math.round(c[2]));
  }
}
function fillCircle(cx, cy, r, col) {
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 1, Math.ceil(cy + r)); y++) {
    const dx = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    for (let x = Math.max(0, Math.floor(cx - dx)); x <= Math.min(W - 1, Math.ceil(cx + dx)); x++)
      setPx(x, y, ...col);
  }
}
function fillRoundRect(x, y, w, h, r, col) {
  fillRect(x + r, y, w - 2 * r, h, col);
  fillRect(x, y + r, w, h - 2 * r, col);
  fillCircle(x + r, y + r, r, col); fillCircle(x + w - r, y + r, r, col);
  fillCircle(x + r, y + h - r, r, col); fillCircle(x + w - r, y + h - r, r, col);
}
function thickLine(x0, y0, x1, y1, w, col) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillCircle(Math.round(lerp(x0, x1, t)), Math.round(lerp(y0, y1, t)), w / 2, col);
  }
}
function fillTriangle(x0, y0, x1, y1, x2, y2, col) {
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (const [ax, ay, bx, by] of [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]]) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
    }
    if (xs.length >= 2) {
      const a = Math.max(0, Math.floor(Math.min(...xs))), b = Math.min(W - 1, Math.ceil(Math.max(...xs)));
      for (let x = a; x <= b; x++) setPx(x, y, ...col);
    }
  }
}

// ------------------------------------------------------------------ font
// Hand-built 5x7 pixel font: '#' is on, '.' is off. Seven rows per glyph.
// Deliberately retro — a pixel face suits a Vice City sunset meme, and it
// needs no host font, so the picture rebuilds identically anywhere.
const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '...#.', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '.##..', '.#...'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['...##', '..#..', '.#...', '.#...', '.#...', '..#..', '...##'],
  ')': ['##...', '..#..', '...#.', '...#.', '...#.', '..#..', '##...'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '>': ['#....', '.#...', '..#..', '...#.', '..#..', '.#...', '#....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  // lowercase, for the make.fun wordmark (brand is lowercase)
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#...#', '#...#'],
  a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.###.'],
  k: ['.....', '.....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
  e: ['.....', '.....', '.##..', '#..#.', '####.', '#....', '.###.'],
  f: ['..##.', '.#...', '.#...', '####.', '.#...', '.#...', '.#...'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#.###', '.##.#'],
  n: ['.....', '.....', '##.#.', '#.#.#', '#...#', '#...#', '#...#'],
};
const GLYPH_W = 5, GLYPH_H = 7, ADVANCE = 6; // 1 cell gap between glyphs

function textWidth(text, scale) {
  return text.length * ADVANCE * scale - scale;
}
// Draw one glyph's mask at (x, y) in cell units scaled by `scale`.
function drawGlyph(ch, x, y, scale, col) {
  const g = GLYPHS[ch];
  if (!g) return;
  for (let r = 0; r < GLYPH_H; r++)
    for (let c = 0; c < GLYPH_W; c++)
      if (g[r][c] === '#') fillRect(x + c * scale, y + r * scale, scale, scale, col);
}
// Draw text; segments let one line mix colours: [{text, color}].
// outline: draw the mask shifted in 8 directions in outlineCol first.
function drawText(segments, cx, y, scale, outlineCol = null) {
  const full = segments.map((s) => s.text).join('');
  const w = textWidth(full, scale);
  let x = Math.round(cx - w / 2);
  if (outlineCol) {
    const u = scale; // 1-cell outline
    for (const [dx, dy] of [[-u, 0], [u, 0], [0, -u], [0, u], [-u, -u], [u, -u], [-u, u], [u, u]]) {
      let ox = x + dx;
      for (const s of segments) { for (const ch of s.text) { drawGlyph(ch, ox, y + dy, scale, outlineCol); ox += ADVANCE * scale; } }
    }
  }
  for (const s of segments) {
    for (const ch of s.text) { drawGlyph(ch, x, y, scale, s.color); x += ADVANCE * scale; }
  }
}
function drawTextLine(text, cx, y, scale, col, outlineCol = null) {
  drawText([{ text, color: col }], cx, y, scale, outlineCol);
}

// ------------------------------------------------------- image composite
// Bilinear resample of a decoded RGBA source onto the canvas, alpha-blended.
function composite(src, dx, dy, dw, dh) {
  const { width: sw, height: sh, data } = src;
  function sample(sx, sy) {
    const x0 = Math.max(0, Math.min(sw - 1, Math.floor(sx)));
    const y0 = Math.max(0, Math.min(sh - 1, Math.floor(sy)));
    const x1 = Math.max(0, Math.min(sw - 1, x0 + 1));
    const y1 = Math.max(0, Math.min(sh - 1, y0 + 1));
    const fx = Math.max(0, Math.min(1, sx - Math.floor(sx)));
    const fy = Math.max(0, Math.min(1, sy - Math.floor(sy)));
    const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
    let r = 0, g = 0, b = 0, a = 0;
    for (const [xx, yy, w] of [[x0, y0, w00], [x1, y0, w10], [x0, y1, w01], [x1, y1, w11]]) {
      const o = (yy * sw + xx) * 4;
      const sa = data[o + 3] / 255;
      r += data[o] * sa * w; g += data[o + 1] * sa * w; b += data[o + 2] * sa * w; a += sa * w;
    }
    return [r, g, b, a];
  }
  for (let y = Math.max(0, dy); y < Math.min(H, dy + dh); y++) {
    for (let x = Math.max(0, dx); x < Math.min(W, dx + dw); x++) {
      const sx = (x - dx + 0.5) * (sw / dw) - 0.5;
      const sy = (y - dy + 0.5) * (sh / dh) - 0.5;
      const [r, g, b, a] = sample(sx, sy);
      if (a > 0) setPx(x, y, Math.round(r / Math.max(a, 1e-6)), Math.round(g / Math.max(a, 1e-6)), Math.round(b / Math.max(a, 1e-6)), Math.round(a * 255));
    }
  }
}


// ------------------------------------------------------------------ scene
// A GTA cheat-code screen, portrait 960x1200 (4:5, for X). An in-game
// phone over a Vice City dusk: the code MAKEFUN typed in, the cheat
// activating for $500, and make.fun's ghost — the real press-kit mark —
// as the emblem on the screen. No play code in the picture: the code
// goes in the post's caption text only.
const WHITE = [255, 255, 255];
const BLACK = [16, 8, 24];
const INK = [20, 9, 43];       // skyline silhouette
const PINK = [255, 46, 136];   // make.fun magenta
const GOLD = [255, 201, 60];
const CHEAT_GREEN = [57, 255, 106];
const SCREEN = [16, 16, 24];
const BEZEL = [10, 10, 15];
const WINDOW_WARM = [255, 214, 120];
const WINDOW_CYAN = [0, 194, 255];

function scene() {
  // 1. Dusk sky over Vice City, full bleed.
  vgrad(0, H, [
    [0.00, [22, 10, 46]],
    [0.35, [75, 20, 89]],
    [0.65, [160, 30, 99]],
    [1.00, [232, 93, 61]],
  ]);

  // 2. Stars in the upper sky.
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rng() * W), y = Math.floor(rng() * 500);
    fillCircle(x, y, rng() < 0.8 ? 1 : 2, [255, 255, 255, Math.floor(100 + rng() * 155)]);
  }

  // 3. Skyline silhouette along the bottom, windows lit (shows at the
  //    sides of the phone and below it).
  const base = H;
  let x = 0;
  while (x < W) {
    const bw = 40 + Math.floor(rng() * 50);
    const bh = 90 + Math.floor(rng() * 110);
    fillRect(x, base - bh, bw, bh, INK);
    for (let wy = base - bh + 12; wy < base - 10; wy += 18)
      for (let wx = x + 8; wx < x + bw - 6; wx += 16)
        if (rng() < 0.45) fillRect(wx, wy, 6, 8, rng() < 0.7 ? WINDOW_WARM : WINDOW_CYAN);
    if (rng() < 0.5) fillCircle(x + Math.floor(bw / 2), base - bh - 6, 3, PINK);
    x += bw + 4 + Math.floor(rng() * 10);
  }

  // 4. Magenta halo behind the phone.
  fillCircle(480, 600, 430, [255, 46, 136, 10]);
  fillCircle(480, 600, 380, [255, 46, 136, 14]);
  fillCircle(480, 600, 340, [255, 46, 136, 18]);

  // 5. The phone: bezel, then screen.
  fillRoundRect(170, 70, 620, 1060, 44, BEZEL);
  fillRoundRect(184, 84, 592, 1032, 32, SCREEN);
  // status bar: date left, battery right
  drawTextLine('19 NOV 2026', 300, 104, 3, WHITE);
  fillRect(700, 106, 34, 16, [255, 255, 255]); // battery shell (outline via fill trick below)
  fillRect(702, 108, 30, 12, SCREEN);
  fillRect(704, 110, 22, 8, CHEAT_GREEN);
  fillRect(736, 110, 4, 8, [255, 255, 255]);
  // title
  drawTextLine('GRAND THEFT AUTO VI', 480, 160, 3, GOLD);
  drawTextLine('CHEAT CODE', 480, 196, 8, WHITE);
  fillRect(360, 262, 240, 6, PINK);

  // 6. The input field: "> MAKEFUN" typed in. (No cursor block: a solid
  //    block after the code reads as a letter I — "MAKEFUNI" — so the
  //    prompt alone carries the typed-in look.)
  fillRoundRect(204, 300, 552, 120, 16, CHEAT_GREEN);
  fillRoundRect(208, 304, 544, 112, 12, [10, 15, 10]);
  drawTextLine('> MAKEFUN', 480, 332, 8, CHEAT_GREEN);

  // 7. The activation: green confirmation, then the money.
  drawTextLine('CHEAT ACTIVATED', 480, 470, 6, CHEAT_GREEN);
  drawTextLine('$500', 480, 530, 13, GOLD);

  // 8. The ghost: make.fun's real press-kit mark, the emblem on screen.
  const mark = decodePNG(readFileSync(join(REPO, 'assets', 'mark-1024.png')));
  composite(mark, 330, 640, 300, 300);

  // 9. The punchline, then the wordmark, then the home indicator.
  drawTextLine('THE ONLY CHEAT THAT PAYS', 480, 962, 4, GOLD);
  drawText([
    { text: 'make', color: WHITE },
    { text: '.', color: PINK },
    { text: 'fun', color: WHITE },
  ], 480, 1012, 7);
  fillRoundRect(420, 1092, 120, 6, 3, [58, 58, 72]);
}

// Build the meme and return its PNG bytes. Deterministic: a fresh canvas,
// a seeded RNG, no clock, no network — two calls give identical bytes.
export function buildMeme() {
  img.fill(0);
  scene();
  return encodePNG(W, H, img);
}
