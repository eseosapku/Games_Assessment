// kit/core/particles.js
// Particles, FloatingText and ScreenShake. The engine updates and renders these itself.
import { drawText } from './utils.js';

// Tiny internal LCG so juice does not disturb the game's seeded RNG.
let _s = 12345;
function rnd() { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; }

export class Particles {
  constructor({ max = 600 } = {}) {
    this.max = max;
    this.items = [];
    this.pool = [];
    this.count = 0;
  }

  burst({
    x, y, count = 20, colors = ['#fff'], speed = 200, spread = Math.PI * 2, angle = 0,
    life = 0.8, size = 6, gravity = 0, shape = 'circle', fade = true, friction = 0.9,
  } = {}) {
    for (let i = 0; i < count; i++) {
      if (this.count >= this.max) break;
      const p = this.pool.pop() || {};
      const a = angle + (rnd() - 0.5) * spread;
      const s = speed * (0.4 + rnd() * 0.8);
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
      p.life = p.maxLife = life * (0.7 + rnd() * 0.6);
      p.size = size * (0.6 + rnd() * 0.8);
      p.color = colors[Math.floor(rnd() * colors.length)];
      p.shape = shape; p.fade = fade; p.gravity = gravity; p.friction = friction;
      p.rot = rnd() * Math.PI * 2; p.vrot = (rnd() - 0.5) * 8;
      this.items.push(p);
      this.count++;
    }
  }

  update(dt) {
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const p = items[i];
      p.life -= dt;
      if (p.life <= 0) { items.splice(i, 1); this.pool.push(p); this.count--; continue; }
      const f = Math.pow(p.friction, dt * 60);
      p.vx *= f; p.vy *= f;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vrot * dt;
    }
  }

  render(g) {
    const items = this.items;
    if (!items.length) return;
    g.save();
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      const k = p.life / p.maxLife;
      g.globalAlpha = p.fade ? Math.min(1, k * 1.5) : 1;
      g.fillStyle = p.color;
      const sz = p.size * (p.fade ? 0.5 + 0.5 * k : 1);
      switch (p.shape) {
        case 'square':
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-sz / 2, -sz / 2, sz, sz); g.restore();
          break;
        case 'star': {
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
          g.beginPath();
          for (let j = 0; j < 10; j++) {
            const r = j % 2 === 0 ? sz : sz * 0.45;
            const a = (j / 10) * Math.PI * 2 - Math.PI / 2;
            if (j === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r); else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          g.closePath(); g.fill(); g.restore();
          break;
        }
        case 'spark': {
          const len = Math.max(2, Math.hypot(p.vx, p.vy) * 0.03);
          const nx = p.vx / (Math.hypot(p.vx, p.vy) || 1), ny = p.vy / (Math.hypot(p.vx, p.vy) || 1);
          g.strokeStyle = p.color; g.lineWidth = Math.max(1, sz * 0.4); g.lineCap = 'round';
          g.beginPath(); g.moveTo(p.x - nx * len, p.y - ny * len); g.lineTo(p.x + nx * len, p.y + ny * len); g.stroke();
          break;
        }
        default:
          g.beginPath(); g.arc(p.x, p.y, sz / 2, 0, Math.PI * 2); g.fill();
      }
    }
    g.globalAlpha = 1;
    g.restore();
  }

  clear() { for (const p of this.items) this.pool.push(p); this.items.length = 0; this.count = 0; }
}

const FT_FONT = '900 {size}px Nunito, "Segoe UI", system-ui, sans-serif';

export class FloatingText {
  constructor() { this.items = []; }
  add(text, x, y, { color = '#fff', size = 24, duration = 1, vy = -60, font, stroke = true } = {}) {
    this.items.push({ text: String(text), x, y, vy, color, size, font: font || FT_FONT.replace('{size}', size), stroke, life: duration, duration, age: 0 });
  }
  update(dt) {
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const t = items[i];
      t.life -= dt; t.age += dt;
      if (t.life <= 0) { items.splice(i, 1); continue; }
      t.y += t.vy * dt;
    }
  }
  render(g) {
    if (!this.items.length) return;
    g.save();
    for (const t of this.items) {
      const k = t.life / t.duration;
      g.globalAlpha = Math.min(1, k * 2.5);
      const popScale = 1 + 0.35 * Math.max(0, 1 - t.age / 0.18);
      const font = t.font.replace(/(\d+(?:\.\d+)?)px/, Math.round(t.size * popScale) + 'px');
      drawText(g, t.text, t.x, t.y, { font, color: t.color, stroke: t.stroke ? (typeof t.stroke === 'string' ? t.stroke : 'rgba(10,14,30,0.75)') : undefined, strokeWidth: 5 });
    }
    g.globalAlpha = 1;
    g.restore();
  }
  clear() { this.items.length = 0; }
}

export class ScreenShake {
  constructor() { this.offset = { x: 0, y: 0 }; this.intensity = 0; this.duration = 0; this.timeLeft = 0; this.enabled = true; }
  shake(intensity = 8, duration = 0.3) {
    if (!this.enabled) return;
    this.intensity = Math.max(this.intensity * (this.timeLeft / (this.duration || 1)), intensity);
    this.duration = this.timeLeft = Math.max(duration, this.timeLeft);
  }
  update(dt) {
    if (this.timeLeft > 0) {
      this.timeLeft -= dt;
      const k = Math.max(0, this.timeLeft / this.duration);
      this.offset.x = (rnd() * 2 - 1) * this.intensity * k;
      this.offset.y = (rnd() * 2 - 1) * this.intensity * k;
      if (this.timeLeft <= 0) { this.offset.x = 0; this.offset.y = 0; this.intensity = 0; }
    }
  }
  get active() { return this.timeLeft > 0; }
}
