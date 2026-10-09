// kit/core/tween.js
// Tweens + easing. The engine calls tweens.update(dt) once per frame.

export const Easing = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: t => { const u = t - 1; return u * u * u + 1; },
  easeInOutCubic: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeOutBack: t => { const c1 = 1.70158, c3 = c1 + 1; const u = t - 1; return 1 + c3 * u * u * u + c1 * u * u; },
  easeOutElastic: t => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  easeOutBounce: t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
    if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
    t -= 2.625 / d1; return n1 * t * t + 0.984375;
  },
};

export class Tweens {
  constructor() { this.list = []; }

  /**
   * Animates numeric properties of target to the values in props over duration seconds.
   * repeat: number of extra cycles (-1 = forever). yoyo: play back to the start each cycle.
   */
  add(target, props, duration, { ease = Easing.easeOutQuad, delay = 0, onComplete, onUpdate, yoyo = false, repeat = 0 } = {}) {
    const tw = {
      target, to: props, from: null, keys: Object.keys(props),
      duration: Math.max(0.0001, duration), elapsed: 0, delay, ease, onComplete, onUpdate,
      yoyo, repeat, reversed: false, done: false,
    };
    this.list.push(tw);
    return tw;
  }

  update(dt) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const tw = list[i];
      if (tw.done) { list.splice(i, 1); continue; }
      let step = dt;
      if (tw.delay > 0) {
        tw.delay -= step;
        if (tw.delay > 0) continue;
        step = -tw.delay; tw.delay = 0;
      }
      if (!tw.from) {
        tw.from = {};
        for (const k of tw.keys) tw.from[k] = Number(tw.target[k]) || 0;
      }
      tw.elapsed += step;
      const t = Math.min(1, tw.elapsed / tw.duration);
      const e = tw.ease(t);
      const p = tw.reversed ? 1 - e : e;
      for (const k of tw.keys) tw.target[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * p;
      if (tw.onUpdate) tw.onUpdate(t, tw.target);
      if (t >= 1) {
        if (tw.yoyo && !tw.reversed) { tw.reversed = true; tw.elapsed = 0; continue; }
        if (tw.repeat !== 0) {
          if (tw.repeat > 0) tw.repeat--;
          tw.reversed = false; tw.elapsed = 0;
          continue;
        }
        tw.done = true;
        list.splice(i, 1);
        if (tw.onComplete) tw.onComplete(tw.target);
      }
    }
  }

  kill(tween) {
    if (!tween) return;
    tween.done = true;
    const i = this.list.indexOf(tween);
    if (i >= 0) this.list.splice(i, 1);
  }
  killTarget(obj) {
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].target === obj) { this.list[i].done = true; this.list.splice(i, 1); }
  }
  killAll() { for (const tw of this.list) tw.done = true; this.list.length = 0; }
  /** Calls fn after seconds of (unpaused) game time. Returns a handle usable with kill(). */
  delay(seconds, fn) { return this.add({}, {}, Math.max(0.0001, seconds), { onComplete: fn }); }
  get count() { return this.list.length; }
}
