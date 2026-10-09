// kit/core/audio.js
// WebAudio-only synthesized sound: every SFX is a short recipe (oscillator envelopes, sweeps,
// filtered noise) and music tracks are simple generative loops scheduled with lookahead.
// No asset files. Everything no-ops safely when AudioContext is unavailable.

const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;

const midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12);

// ---- SFX recipes: (a: Audio, t: start time, v: volume, p: pitch multiplier) ----
const RECIPES = {
  click: (a, t, v, p) => a._osc({ type: 'square', freq: 900 * p, to: 500 * p, dur: 0.05, vol: 0.12 * v, t }),
  tick: (a, t, v, p) => a._osc({ type: 'square', freq: 1400 * p, dur: 0.03, vol: 0.08 * v, t }),
  correct: (a, t, v, p) => {
    a._osc({ type: 'sine', freq: 660 * p, dur: 0.11, vol: 0.25 * v, t });
    a._osc({ type: 'triangle', freq: 660 * p, dur: 0.11, vol: 0.12 * v, t });
    a._osc({ type: 'sine', freq: 990 * p, dur: 0.22, vol: 0.28 * v, t: t + 0.1 });
    a._osc({ type: 'triangle', freq: 990 * p, dur: 0.22, vol: 0.12 * v, t: t + 0.1 });
  },
  wrong: (a, t, v, p) => {
    a._osc({ type: 'sawtooth', freq: 320 * p, to: 110 * p, dur: 0.38, vol: 0.16 * v, t, attack: 0.01 });
    a._osc({ type: 'square', freq: 160 * p, to: 70 * p, dur: 0.38, vol: 0.08 * v, t: t + 0.02 });
  },
  pop: (a, t, v, p) => {
    a._osc({ type: 'sine', freq: 420 * p, to: 1000 * p, dur: 0.09, vol: 0.3 * v, t });
    a._noise({ t, dur: 0.06, vol: 0.18 * v, freq: 2500, type: 'bandpass' });
  },
  coin: (a, t, v, p) => {
    a._osc({ type: 'square', freq: 988 * p, dur: 0.07, vol: 0.14 * v, t });
    a._osc({ type: 'square', freq: 1319 * p, dur: 0.28, vol: 0.14 * v, t: t + 0.07, release: 0.2 });
  },
  hit: (a, t, v, p) => {
    a._noise({ t, dur: 0.16, vol: 0.5 * v, freq: 700 * p, type: 'lowpass' });
    a._osc({ type: 'triangle', freq: 160 * p, to: 50 * p, dur: 0.16, vol: 0.3 * v, t });
  },
  explode: (a, t, v, p) => {
    a._noise({ t, dur: 0.65, vol: 0.8 * v, freq: 500 * p, type: 'lowpass' });
    a._noise({ t, dur: 0.25, vol: 0.4 * v, freq: 1800, type: 'bandpass' });
    a._osc({ type: 'sine', freq: 110 * p, to: 30, dur: 0.55, vol: 0.4 * v, t });
  },
  levelup: (a, t, v, p) => {
    [523, 659, 784, 1047].forEach((f, i) => {
      a._osc({ type: 'triangle', freq: f * p, dur: 0.28, vol: 0.2 * v, t: t + i * 0.09, release: 0.18 });
      a._osc({ type: 'sine', freq: f * p * 2, dur: 0.2, vol: 0.06 * v, t: t + i * 0.09 });
    });
  },
  fanfare: (a, t, v, p) => {
    const seq = [[523, 0, 0.12], [523, 0.13, 0.12], [659, 0.26, 0.12], [784, 0.39, 0.22], [1047, 0.64, 0.7]];
    for (const [f, off, d] of seq) {
      a._osc({ type: 'triangle', freq: f * p, dur: d, vol: 0.22 * v, t: t + off, release: d * 0.5 });
      a._osc({ type: 'square', freq: f * p / 2, dur: d, vol: 0.06 * v, t: t + off, release: d * 0.5 });
    }
    a._noise({ t: t + 0.64, dur: 0.5, vol: 0.12 * v, freq: 4000, type: 'highpass' });
  },
  whoosh: (a, t, v) => a._noise({ t, dur: 0.35, vol: 0.3 * v, freq: 400, to: 2600, type: 'bandpass' }),
  swoosh: (a, t, v) => a._noise({ t, dur: 0.3, vol: 0.3 * v, freq: 2600, to: 300, type: 'bandpass' }),
  buzz: (a, t, v, p) => {
    a._osc({ type: 'sawtooth', freq: 92 * p, dur: 0.3, vol: 0.12 * v, t, attack: 0.01 });
    a._osc({ type: 'square', freq: 95 * p, dur: 0.3, vol: 0.08 * v, t, attack: 0.01 });
  },
  powerup: (a, t, v, p) => {
    a._osc({ type: 'sine', freq: 300 * p, to: 1400 * p, dur: 0.45, vol: 0.2 * v, t, release: 0.2 });
    [880, 1100, 1320].forEach((f, i) => a._osc({ type: 'square', freq: f * p, dur: 0.1, vol: 0.08 * v, t: t + 0.2 + i * 0.08 }));
  },
  jump: (a, t, v, p) => a._osc({ type: 'square', freq: 280 * p, to: 760 * p, dur: 0.16, vol: 0.14 * v, t }),
  combo: (a, t, v, p) => [784, 988, 1175, 1568].forEach((f, i) => a._osc({ type: 'square', freq: f * p, dur: 0.09, vol: 0.1 * v, t: t + i * 0.06 })),
};

// ---- music tracks: bass pulse + pentatonic arpeggio, intensity adds layers ----
const TRACKS = {
  calm:   { bpm: 92,  root: 48, scale: [0, 2, 4, 7, 9],  bass: [0, 0, 7, 0, 5, 5, 7, 0], arp: [0, 2, 4, 2, 1, 3, 4, 3], chords: [0, 0, 5, 7], type: 'sine', arpType: 'triangle' },
  upbeat: { bpm: 126, root: 50, scale: [0, 2, 4, 7, 9],  bass: [0, 0, 0, 7, 5, 5, 3, 3], arp: [0, 4, 2, 4, 1, 4, 3, 4], chords: [0, 5, 7, 5], type: 'triangle', arpType: 'square' },
  tense:  { bpm: 140, root: 45, scale: [0, 3, 5, 7, 10], bass: [0, 0, 3, 0, 5, 5, 3, 0], arp: [0, 1, 2, 1, 4, 3, 2, 3], chords: [0, 0, 3, 5], type: 'sawtooth', arpType: 'square' },
  boss:   { bpm: 150, root: 43, scale: [0, 1, 5, 7, 8],  bass: [0, 0, 0, 1, 0, 0, 5, 1], arp: [0, 2, 4, 2, 1, 4, 2, 4], chords: [0, 1, 0, 5], type: 'sawtooth', arpType: 'sawtooth' },
};
const LOOKAHEAD = 0.3;      // seconds scheduled ahead
const TICK_MS = 90;

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.muted = false;
    this._noiseBuf = null;
    this._m = { track: null, timer: null, nextTime: 0, step: 0, intensity: 0.5 };
    this.music = {
      start: (name) => this._musicStart(name),
      stop: () => this._musicStop(),
      setIntensity: (v) => { this._m.intensity = Math.max(0, Math.min(1, Number(v) || 0)); },
    };
    Object.defineProperty(this.music, 'track', { get: () => this._m.track });
  }

  get available() { return !!AC; }
  get unlocked() { return !!this.ctx; }

  /** Creates/resumes the AudioContext. Call from a user gesture. */
  unlock() {
    if (!AC) return false;
    if (!this.ctx) {
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 1;
        this.master.connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.9;
        this.sfxGain.connect(this.master);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.32;
        this.musicGain.connect(this.master);
      } catch { this.ctx = null; return false; }
    }
    if (this.ctx.state === 'suspended') { try { this.ctx.resume().catch(() => {}); } catch { /* ignore */ } }
    if (this._m.track && !this._m.timer) this._musicStart(this._m.track);
    return true;
  }

  setMuted(bool) {
    this.muted = !!bool;
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.02);
    }
  }

  // ---- primitives ----
  _osc({ type = 'sine', freq, to, dur = 0.2, vol = 0.3, t, attack = 0.005, release = 0.05 }) {
    const ctx = this.ctx;
    if (!ctx || !(freq > 0)) return;
    t = t ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to > 0) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const sustainEnd = Math.max(t + attack, t + dur - release);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, sustainEnd);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.01);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  _noiseBuffer() {
    if (this._noiseBuf) return this._noiseBuf;
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * 1.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let s = 7;
    for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x7fffffff) * 2 - 1; }
    this._noiseBuf = buf;
    return buf;
  }
  _noise({ t, dur = 0.2, vol = 0.3, freq = 1000, to, type = 'lowpass', q = 0.8, dest }) {
    const ctx = this.ctx;
    if (!ctx) return;
    t = t ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to > 0) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  // ---- public API ----
  play(name, { volume = 1, pitch = 1 } = {}) {
    const r = RECIPES[name];
    if (!r || !this.ctx || this.muted) return;
    try { r(this, this.ctx.currentTime + 0.001, volume, pitch); } catch { /* never let audio break the game */ }
  }
  tone({ freq, duration = 0.2, type = 'sine', volume = 0.3, attack = 0.005, release = 0.05 } = {}) {
    if (!this.ctx || this.muted) return;
    try { this._osc({ type, freq, dur: duration, vol: volume, attack, release }); } catch { /* ignore */ }
  }
  playNote(midi, duration = 0.3, { type = 'triangle', volume = 0.25 } = {}) {
    this.tone({ freq: midiToFreq(midi), duration, type, volume, release: Math.min(0.2, duration * 0.4) });
  }

  // ---- music ----
  _musicStart(name) {
    const track = TRACKS[name] || TRACKS.calm;
    this._m.track = TRACKS[name] ? name : 'calm';
    if (!this.ctx) return;                // starts once unlocked
    this._musicStop(true);
    this._m.track = TRACKS[name] ? name : 'calm';
    this._m.step = 0;
    this._m.nextTime = this.ctx.currentTime + 0.05;
    this._m.def = track;
    this._m.timer = setInterval(() => this._schedule(), TICK_MS);
    this._schedule();
  }
  _musicStop(keepTrack = false) {
    if (this._m.timer) clearInterval(this._m.timer);
    this._m.timer = null;
    if (!keepTrack) this._m.track = null;
  }
  _schedule() {
    const ctx = this.ctx, m = this._m, d = m.def;
    if (!ctx || !d) return;
    const stepDur = 60 / d.bpm / 2;   // eighth notes
    while (m.nextTime < ctx.currentTime + LOOKAHEAD) {
      if (!this.muted) this._playStep(m.step, m.nextTime, stepDur, d, m.intensity);
      m.nextTime += stepDur;
      m.step++;
    }
  }
  _playStep(step, t, stepDur, d, intensity) {
    const bar = Math.floor(step / 8);
    const chord = d.chords[bar % d.chords.length];
    const i8 = step % 8;
    // bass pulse (always)
    const bassNote = d.root + chord + d.bass[i8];
    this._mOsc({ type: d.type, freq: midiToFreq(bassNote), dur: stepDur * 0.85, vol: 0.22, t, attack: 0.01, release: stepDur * 0.3 });
    // arpeggio
    if (intensity > 0.25) {
      const deg = d.arp[(i8 + bar) % 8];
      const oct = intensity > 0.7 && bar % 2 === 1 ? 24 : 12;
      const note = d.root + chord + oct + d.scale[deg % d.scale.length];
      this._mOsc({ type: d.arpType, freq: midiToFreq(note), dur: stepDur * 0.6, vol: 0.07 + intensity * 0.05, t, attack: 0.005, release: stepDur * 0.3 });
    }
    // hats
    if (intensity > 0.55 && (i8 % 2 === 1 || intensity > 0.85)) {
      this._noise({ t, dur: 0.04, vol: 0.05, freq: 7000, type: 'highpass', dest: this.musicGain });
    }
    // kick
    if (intensity > 0.4 && (i8 === 0 || i8 === 4 || (intensity > 0.8 && i8 === 6))) {
      this._mOsc({ type: 'sine', freq: 150, to: 40, dur: 0.18, vol: 0.35, t, attack: 0.002, release: 0.1 });
    }
  }
  _mOsc({ type, freq, to, dur, vol, t, attack = 0.005, release = 0.05 }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to > 0) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, Math.max(t + attack, t + dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.01);
    osc.connect(g); g.connect(this.musicGain);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  destroy() {
    this._musicStop();
    if (this.ctx) { try { this.ctx.close(); } catch { /* ignore */ } }
    this.ctx = null;
  }
}

export const SFX_NAMES = Object.keys(RECIPES);
export const MUSIC_TRACKS = Object.keys(TRACKS);
