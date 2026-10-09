// kit/core/engine.js
// Canvas with a fixed logical resolution (960x540), letterboxed inside the container, DPR aware,
// requestAnimationFrame loop with a scene stack. The engine also drives the juice systems
// (tweens, particles, floating text, screen shake) and the input's touch buttons, so mechanics
// never render those themselves.

export class Engine {
  constructor({ container, width = 960, height = 540 }) {
    if (!container) throw new Error('Engine: container is required');
    this.container = container;
    this.width = width;
    this.height = height;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.dpr = 1;
    this.cssWidth = width;
    this.cssHeight = height;

    container.classList.add('eg-container');

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'eg-canvas';
    this.canvas.dataset.eg = 'canvas';
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('role', 'img');
    this.g = this.canvas.getContext('2d');

    // Box-aligned DOM layer (HUD, toasts, hint): same rectangle as the canvas.
    this.layer = document.createElement('div');
    this.layer.className = 'eg-layer';
    // Full-container layer for screens (start / pause / end / question / feedback). Centred on the same point.
    this.overlayRoot = document.createElement('div');
    this.overlayRoot.className = 'eg-overlay-root';

    container.appendChild(this.canvas);
    container.appendChild(this.layer);
    container.appendChild(this.overlayRoot);

    this.scenes = [];
    this.paused = false;
    this.running = false;
    this.time = { dt: 0, elapsed: 0, frame: 0 };
    this.systems = { input: null, tweens: null, particles: null, floatingText: null, shake: null };
    this._listeners = { pause: new Set(), resume: new Set(), resize: new Set(), frame: new Set() };
    this._raf = 0;
    this._last = 0;

    this._onVisibility = () => { if (document.hidden) this.pause('hidden'); };
    document.addEventListener('visibilitychange', this._onVisibility);
    this._onWinResize = () => this.resize();
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(container);
    } else {
      window.addEventListener('resize', this._onWinResize);
    }
    this.resize();
  }

  /** Lets createGame hand the juice systems to the engine. */
  attach(systems) { Object.assign(this.systems, systems); }

  // ---- scenes ----
  push(scene) {
    this.scenes.push(scene);
    if (scene && typeof scene.enter === 'function') scene.enter();
    return scene;
  }
  pop() {
    const s = this.scenes.pop();
    if (s && typeof s.exit === 'function') s.exit();
    return s;
  }
  replace(scene) {
    while (this.scenes.length) this.pop();
    return this.push(scene);
  }
  get scene() { return this.scenes[this.scenes.length - 1] || null; }

  // ---- loop ----
  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  }
  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }
  pause(reason = 'user') {
    if (this.paused) return;
    this.paused = true;
    this.pauseReason = reason;
    this._emit('pause', reason);
  }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    this._last = performance.now();
    this._emit('resume');
  }

  _tick = (now) => {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._tick);
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (!(dt > 0)) dt = 0;
    if (dt > 1 / 20) dt = 1 / 20;
    const s = this.systems;
    if (!this.paused) {
      this.time.dt = dt;
      this.time.elapsed += dt;
      this.time.frame++;
      const top = this.scenes[this.scenes.length - 1];
      if (top && typeof top.update === 'function') top.update(dt);
      if (s.tweens) s.tweens.update(dt);
      if (s.particles) s.particles.update(dt);
      if (s.floatingText) s.floatingText.update(dt);
      if (s.shake) s.shake.update(dt);
    }
    this.render();
    this._emit('frame', dt);
    if (s.input) s.input.endFrame();
  };

  render() {
    const g = this.g;
    const k = this.dpr * this.scale;
    g.setTransform(k, 0, 0, k, 0, 0);
    g.clearRect(0, 0, this.width, this.height);
    const s = this.systems;
    g.save();
    if (s.shake && (s.shake.offset.x || s.shake.offset.y)) g.translate(Math.round(s.shake.offset.x), Math.round(s.shake.offset.y));
    const scenes = this.scenes;
    let first = scenes.length - 1;
    while (first > 0 && scenes[first] && scenes[first].transparent) first--;
    for (let i = Math.max(0, first); i < scenes.length; i++) {
      const sc = scenes[i];
      if (sc && typeof sc.render === 'function') sc.render(g);
      if (i < scenes.length - 1) { g.fillStyle = 'rgba(8,10,24,0.45)'; g.fillRect(-20, -20, this.width + 40, this.height + 40); }
    }
    if (s.particles) s.particles.render(g);
    if (s.floatingText) s.floatingText.render(g);
    if (s.input) s.input.drawTouchButtons(g);
    g.restore();
  }

  // ---- sizing ----
  resize() {
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    if (!cw || !ch) return;
    const scale = Math.min(cw / this.width, ch / this.height);
    const w = Math.round(this.width * scale);
    const h = Math.round(this.height * scale);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const changed = w !== this.cssWidth || h !== this.cssHeight || dpr !== this.dpr || cw !== this._cw || ch !== this._ch;
    if (!changed) return;
    this._cw = cw; this._ch = ch;
    this.scale = w / this.width;
    this.dpr = dpr;
    this.cssWidth = w; this.cssHeight = h;
    this.offsetX = Math.floor((cw - w) / 2);
    this.offsetY = Math.floor((ch - h) / 2);
    const cs = this.canvas.style;
    cs.left = this.offsetX + 'px'; cs.top = this.offsetY + 'px'; cs.width = w + 'px'; cs.height = h + 'px';
    this.canvas.width = Math.max(1, Math.round(w * dpr));
    this.canvas.height = Math.max(1, Math.round(h * dpr));
    const ls = this.layer.style;
    ls.left = cs.left; ls.top = cs.top; ls.width = cs.width; ls.height = cs.height;
    this.container.style.setProperty('--eg-u', String(this.scale));
    this._emit('resize', { width: this.width, height: this.height, scale: this.scale, cssWidth: w, cssHeight: h });
    if (this.scenes.length) this.render();
  }

  /** CSS client coordinates -> logical canvas coordinates. */
  toLogical(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const sx = r.width ? this.width / r.width : 1;
    const sy = r.height ? this.height / r.height : 1;
    return { x: (clientX - r.left) * sx, y: (clientY - r.top) * sy };
  }

  // ---- events ----
  on(event, fn) {
    const set = this._listeners[event];
    if (!set) throw new Error('Engine.on: unknown event ' + event);
    set.add(fn);
    return () => set.delete(fn);
  }
  _emit(event, arg) {
    const set = this._listeners[event];
    if (!set) return;
    for (const fn of Array.from(set)) { try { fn(arg); } catch (e) { console.error(e); } }
  }

  destroy() {
    this.stop();
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.removeEventListener('resize', this._onWinResize);
    if (this._ro) this._ro.disconnect();
    while (this.scenes.length) this.pop();
    for (const k in this._listeners) this._listeners[k].clear();
    this.canvas.remove(); this.layer.remove(); this.overlayRoot.remove();
  }
}
