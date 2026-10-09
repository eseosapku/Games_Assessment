// kit/core/utils.js
// Seeded RNG, math helpers and canvas text helpers.
// This module is DOM-free: it is imported by Node tooling (content-check) as well as by the browser.

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic pseudo-random generator (mulberry32). All game randomness goes through this. */
export class RNG {
  constructor(seed = 1) {
    this.seed = seed;
    const s = typeof seed === 'string' ? hashString(seed) : Math.floor(Number(seed) || 0);
    this._s = (s >>> 0) || 0x9e3779b9;
  }
  /** Float in [0, 1). */
  next() {
    let t = (this._s = (this._s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Integer in [min, max] (inclusive). */
  int(min, max) {
    if (max < min) { const t = min; min = max; max = t; }
    return min + Math.floor(this.next() * (max - min + 1));
  }
  float(min = 0, max = 1) { return min + this.next() * (max - min); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  /** Fisher-Yates shuffle, in place. Returns the same array. */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  chance(p) { return this.next() < p; }
  weighted(items, weights) {
    let total = 0;
    for (let i = 0; i < weights.length; i++) total += Math.max(0, weights[i]);
    if (total <= 0) return this.pick(items);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= Math.max(0, weights[i]);
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  }
  /** n distinct elements of arr, in random order (does not mutate arr). */
  sample(arr, n) { return this.shuffle(arr.slice()).slice(0, Math.max(0, Math.min(n, arr.length))); }
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inverseLerp = (a, b, v) => (a === b ? 0 : (v - a) / (b - a));
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
export function wrap(v, min, max) {
  const range = max - min;
  if (range <= 0) return min;
  let r = (v - min) % range;
  if (r < 0) r += range;
  return r + min;
}
export function smoothstep(a, b, t) {
  const x = clamp(inverseLerp(a, b, t), 0, 1);
  return x * x * (3 - 2 * x);
}

/** Rounded rectangle path + optional fill/stroke. */
export function roundRect(g, x, y, w, h, r, { fill, stroke, lineWidth = 2 } = {}) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + rr, y);
  g.lineTo(x + w - rr, y);
  g.arcTo(x + w, y, x + w, y + rr, rr);
  g.lineTo(x + w, y + h - rr);
  g.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  g.lineTo(x + rr, y + h);
  g.arcTo(x, y + h, x, y + h - rr, rr);
  g.lineTo(x, y + rr);
  g.arcTo(x, y, x + rr, y, rr);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lineWidth; g.stroke(); }
}

const FONT_SIZE_RE = /(\d+(?:\.\d+)?)px/;
export function fontSize(font) {
  const m = FONT_SIZE_RE.exec(font);
  return m ? parseFloat(m[1]) : 20;
}
export function withFontSize(font, size) {
  return FONT_SIZE_RE.test(font) ? font.replace(FONT_SIZE_RE, size + 'px') : `${size}px ${font}`;
}

/**
 * Draws one line of text. If maxWidth is given, the font is shrunk (1px steps, down to 8px) until it fits.
 * Returns the font size actually used.
 */
export function drawText(g, text, x, y, {
  font = '20px system-ui', color = '#fff', align = 'center', baseline = 'middle',
  maxWidth, stroke, strokeWidth = 4, shadow,
} = {}) {
  const str = String(text);
  let size = fontSize(font);
  let f = font;
  g.save();
  g.font = f;
  if (maxWidth) {
    while (size > 8 && g.measureText(str).width > maxWidth) {
      size -= 1;
      f = withFontSize(font, size);
      g.font = f;
    }
  }
  g.textAlign = align;
  g.textBaseline = baseline;
  if (shadow) {
    g.shadowColor = typeof shadow === 'string' ? shadow : 'rgba(0,0,0,0.45)';
    g.shadowBlur = 8;
    g.shadowOffsetY = 2;
  }
  if (stroke) {
    g.lineJoin = 'round';
    g.strokeStyle = stroke;
    g.lineWidth = strokeWidth;
    g.strokeText(str, x, y);
  }
  g.fillStyle = color;
  g.fillText(str, x, y);
  g.restore();
  return size;
}

/** Splits text into lines that fit maxWidth using the given font. Honors explicit \n. */
export function wrapText(g, text, maxWidth, font) {
  g.save();
  if (font) g.font = font;
  const lines = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (g.measureText(test).width <= maxWidth || !line) line = test;
      else { lines.push(line); line = w; }
    }
    lines.push(line);
  }
  g.restore();
  return lines;
}

export function measureText(g, text, font) {
  g.save();
  if (font) g.font = font;
  const w = g.measureText(String(text)).width;
  g.restore();
  return w;
}

/** seconds -> 'm:ss' */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

function parseHex(hex) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function hexToRgba(hex, alpha = 1) {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
/** amount in -1..1: negative darkens toward black, positive lightens toward white. */
export function shade(hex, amount) {
  const [r, g, b] = parseHex(hex);
  const t = amount < 0 ? 0 : 255;
  const p = Math.min(1, Math.abs(amount));
  const f = v => Math.round(v + (t - v) * p);
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
