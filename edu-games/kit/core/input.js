// kit/core/input.js
// Keyboard state keyed by KeyboardEvent.code, unified pointer/touch in logical coordinates,
// swipe detection and virtual on-canvas touch buttons that feed the same key state.
import { roundRect, drawText } from './utils.js';

const PREVENT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);
const SWIPE_MIN = 30;   // logical px
const SWIPE_MS = 400;

function isEditable(el) {
  if (!el || !el.tagName) return false;
  const t = el.tagName;
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable;
}

export class Input {
  constructor(engine) {
    this.engine = engine;
    this.canvas = engine.canvas;
    this._down = new Set();
    this._pressed = new Set();
    this._released = new Set();
    this.pointer = { x: 0, y: 0, down: false, justDown: false, justUp: false, active: false };
    this._cbs = { down: new Set(), up: new Set(), move: new Set(), keydown: new Set(), keyup: new Set(), swipe: new Set() };
    this.touchButtons = [];
    this._pointerButtons = new Map();
    this._swipe = null;
    /** When true, arrow/space defaults are prevented even if the container is not focused (createGame sets it while playing). */
    this.capture = false;
    this.isTouchDevice = Input.detectTouch();

    this.canvas.style.touchAction = 'none';
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerCancel = this._onPointerCancel.bind(this);
    this._onBlur = this._onBlur.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerCancel);
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  static detectTouch() {
    try {
      if (typeof window === 'undefined') return false;
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
      return 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
    } catch { return false; }
  }

  // ---- keyboard ----
  isDown(code) { return this._down.has(code); }
  wasPressed(code) { return this._pressed.has(code); }
  wasReleased(code) { return this._released.has(code); }

  _shouldPrevent() {
    if (this.capture) return true;
    const a = document.activeElement;
    return !!(a && this.engine.container.contains(a));
  }
  _onKeyDown(e) {
    if (isEditable(e.target)) return;
    const code = e.code;
    if (!code) return;
    if (PREVENT.has(code) && this._shouldPrevent()) e.preventDefault();
    if (e.repeat) return;
    if (!this._down.has(code)) { this._down.add(code); this._pressed.add(code); }
    for (const fn of Array.from(this._cbs.keydown)) fn(code, e);
  }
  _onKeyUp(e) {
    const code = e.code;
    if (!code) return;
    if (this._down.has(code)) { this._down.delete(code); this._released.add(code); }
    if (isEditable(e.target)) return;
    for (const fn of Array.from(this._cbs.keyup)) fn(code, e);
  }
  _onBlur() {
    for (const code of this._down) this._released.add(code);
    this._down.clear();
    for (const b of this.touchButtons) b.pressed = false;
    this._pointerButtons.clear();
    this.pointer.down = false;
  }

  // ---- pointer ----
  _onPointerDown(e) {
    const p = this.engine.toLogical(e.clientX, e.clientY);
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    try { this.canvas.focus({ preventScroll: true }); } catch { /* ignore */ }
    const btn = this._hitButton(p.x, p.y);
    if (btn) {
      btn.pressed = true;
      this._pointerButtons.set(e.pointerId, btn);
      if (!this._down.has(btn.code)) { this._down.add(btn.code); this._pressed.add(btn.code); }
      for (const fn of Array.from(this._cbs.keydown)) fn(btn.code, e);
      e.preventDefault();
      return;
    }
    const pt = this.pointer;
    pt.x = p.x; pt.y = p.y; pt.down = true; pt.justDown = true; pt.active = true;
    this._swipe = { x: p.x, y: p.y, t: performance.now(), id: e.pointerId };
    for (const fn of Array.from(this._cbs.down)) fn(p.x, p.y, e);
    e.preventDefault();
  }
  _onPointerMove(e) {
    if (this._pointerButtons.has(e.pointerId)) return;
    const p = this.engine.toLogical(e.clientX, e.clientY);
    const pt = this.pointer;
    pt.x = p.x; pt.y = p.y; pt.active = true;
    for (const fn of Array.from(this._cbs.move)) fn(p.x, p.y, e);
  }
  _releaseButton(e) {
    const btn = this._pointerButtons.get(e.pointerId);
    if (!btn) return false;
    this._pointerButtons.delete(e.pointerId);
    btn.pressed = false;
    if (this._down.has(btn.code)) { this._down.delete(btn.code); this._released.add(btn.code); }
    for (const fn of Array.from(this._cbs.keyup)) fn(btn.code, e);
    return true;
  }
  _onPointerUp(e) {
    if (this._releaseButton(e)) return;
    const pt = this.pointer;
    if (!pt.down) return;
    const p = this.engine.toLogical(e.clientX, e.clientY);
    pt.x = p.x; pt.y = p.y; pt.down = false; pt.justUp = true;
    for (const fn of Array.from(this._cbs.up)) fn(p.x, p.y, e);
    const s = this._swipe;
    if (s && s.id === e.pointerId) {
      const dx = p.x - s.x, dy = p.y - s.y;
      const dt = performance.now() - s.t;
      if (dt <= SWIPE_MS && Math.hypot(dx, dy) >= SWIPE_MIN) {
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        for (const fn of Array.from(this._cbs.swipe)) fn(dir, { dx, dy, dt });
      }
    }
    this._swipe = null;
  }
  _onPointerCancel(e) {
    if (this._releaseButton(e)) return;
    const pt = this.pointer;
    if (pt.down) { pt.down = false; pt.justUp = true; }
    this._swipe = null;
  }

  onPointerDown(fn) { this._cbs.down.add(fn); return () => this._cbs.down.delete(fn); }
  onPointerUp(fn) { this._cbs.up.add(fn); return () => this._cbs.up.delete(fn); }
  onPointerMove(fn) { this._cbs.move.add(fn); return () => this._cbs.move.delete(fn); }
  onKeyDown(fn) { this._cbs.keydown.add(fn); return () => this._cbs.keydown.delete(fn); }
  onKeyUp(fn) { this._cbs.keyup.add(fn); return () => this._cbs.keyup.delete(fn); }
  onSwipe(fn) { this._cbs.swipe.add(fn); return () => this._cbs.swipe.delete(fn); }

  // ---- touch buttons ----
  addTouchButton({ id, x, y, w, h, label, code }) {
    this.removeTouchButton(id);
    const b = { id, x, y, w, h, label: label ?? '', code, pressed: false };
    this.touchButtons.push(b);
    return b;
  }
  removeTouchButton(id) {
    const i = this.touchButtons.findIndex(b => b.id === id);
    if (i >= 0) this.touchButtons.splice(i, 1);
  }
  clearTouchButtons() { this.touchButtons.length = 0; this._pointerButtons.clear(); }
  _hitButton(x, y) {
    for (let i = this.touchButtons.length - 1; i >= 0; i--) {
      const b = this.touchButtons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }
  drawTouchButtons(g) {
    if (!this.touchButtons.length) return;
    for (const b of this.touchButtons) {
      roundRect(g, b.x, b.y, b.w, b.h, Math.min(16, b.h / 2), {
        fill: b.pressed ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)',
        stroke: 'rgba(255,255,255,0.55)', lineWidth: 2,
      });
      drawText(g, b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, {
        font: '800 22px Nunito, "Segoe UI", system-ui, sans-serif', color: b.pressed ? '#1a1f3a' : '#fff', maxWidth: b.w - 12,
      });
    }
  }

  /** Clears per-frame edge state. The engine calls this at the END of every frame. */
  endFrame() {
    this._pressed.clear();
    this._released.clear();
    this.pointer.justDown = false;
    this.pointer.justUp = false;
  }
  /** Drops pending edge state (used when an overlay closes so its dismiss key is not read by the game). */
  flush() { this.endFrame(); }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerCancel);
    for (const k in this._cbs) this._cbs[k].clear();
    this.clearTouchButtons();
  }
}
