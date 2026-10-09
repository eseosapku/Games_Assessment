// mechanics/deduction/mechanic.js
// "Deduction": crack a lock pin by pin. Every pin is one item shown in-canvas: either a sentence whose
// words are tappable tiles (choice items whose choices are the words) or a set of option cards
// (choice items with 2-6 options), or a typed "fix it" field (text items, via the kit question panel).
// A laser timer sweeps across the puzzle; a correct tap clicks the pin into place and turns the dial,
// a wrong tap adds an alarm tick (N ticks = guards arrive and you lose a tool) and the correct element is
// annotated before the explanation card. Buildings (stages) escalate the sweep speed and pins per lock,
// an evidence board between buildings shows per-skill progress, and the finale is a manuscript with
// planted errors fixed under one shared timer.
//
// Content-agnostic: everything subject specific (names, colours, sprite styles, labels, pacing) comes
// from config. Only ctx.nextItem() supplies items and only ctx.answer() grades them.
import { drawText, wrapText, measureText, roundRect, clamp, lerp, hexToRgba, shade, Easing } from '../../kit/kit.js';

export const meta = {
  id: 'deduction',
  name: 'Deduction',
  description: 'Crack a lock pin by pin: tap the one word, option or clue that answers the puzzle while the laser timer sweeps. Three buildings, an evidence board and a manuscript finale.',
  itemTypes: ['choice', 'text'],
  choices: 4,
  configSchema: {
    buildings: 'Stages, array of { name, style, sky: [top, bottom], glow } (museum / bank / mansion)',
    locksPerBuilding: 'Locks per building (2)',
    pinsPerLock: 'Pins per lock; a number or an array per building ([3, 4, 5])',
    sweepSec: 'Laser timer per pin in building 1, seconds (14)',
    sweepPerBuilding: 'Multiplier applied to the sweep per building (0.85)',
    minSweepSec: 'Floor for the per-pin timer (7)',
    alarmTicks: 'Wrong answers before the guards arrive and a tool is lost (3)',
    tools: 'Lives (3)',
    textChance: 'Chance that a pin is a typed text item, per building, for skills that support text ([0, 0.25, 0.4])',
    difficultyFloor: 'Minimum item difficulty per building, ignored for a skill the player is struggling on ([1, 2, 3])',
    finale: 'Manuscript finale: { enabled, title, intro, errors, timeMul, textChance, difficultyFloor, bonus, bonusXP }',
    scoring: '{ pin, perDifficulty, speedMax, lockBonus, buildingBonus, finaleFix, toolBonusXP }',
    labels: 'All UI strings (tool, pin, lock, alarm, hints, banners, stamps)',
    palette: 'Colours: accent, laser, good, bad, tile, tileText, paper, ink, metal, metalDark, text, dim',
    heroStyle: "Player sprite: 'thief' | 'detective' | 'agent'",
    guardStyle: "Guard sprite: 'guard' | 'robot' | 'dog'",
    rain: 'Draw rain streaks in the background (true)',
    skyline: 'Draw a distant city skyline (true)',
  },
};

export const defaultConfig = {
  buildings: [
    { name: 'Museum', style: 'museum', sky: ['#0b1020', '#1d2b4f'], glow: '#f5c04a' },
    { name: 'Bank', style: 'bank', sky: ['#120a1e', '#3a1f55'], glow: '#9ad7ff' },
    { name: 'Mansion', style: 'mansion', sky: ['#1a0a10', '#4a1f2e'], glow: '#ff9c6b' },
  ],
  locksPerBuilding: 2,
  pinsPerLock: [3, 4, 5],
  sweepSec: 14,
  sweepPerBuilding: 0.85,
  minSweepSec: 7,
  alarmTicks: 3,
  tools: 3,
  textChance: [0, 0.25, 0.4],
  difficultyFloor: [1, 2, 3],
  finale: { enabled: true, title: 'The Manuscript', intro: 'Five planted errors. One timer. Fix them all before the sweep ends.', errors: 5, timeMul: 1.0, textChance: 0.3, difficultyFloor: 3, bonus: 500, bonusXP: 60 },
  scoring: { pin: 100, perDifficulty: 25, speedMax: 60, lockBonus: 250, buildingBonus: 400, finaleFix: 200, toolBonusXP: 25 },
  labels: {
    tool: 'tool', tools: 'TOOLS', pin: 'Pin', lock: 'Lock', alarm: 'ALARM', building: 'Building',
    tapHint: 'Tap an option, or press 1-4', sentenceHint: 'Tap a word, or use arrows + Enter', typeHint: 'Type the fix in the panel',
    guards: 'Guards! You lost a tool.', lockOpen: 'LOCK OPEN', cleared: 'CLEARED', evidence: 'Evidence board', continueHint: 'Tap or press Enter to continue',
    corrected: 'CORRECTED', jammed: 'JAMMED', busted: 'Busted!', cleanGetaway: 'Clean getaway!', getaway: 'Getaway!', pinSet: 'Click!', timeUp: 'Laser!',
    heroName: 'You', lootName: 'loot',
  },
  palette: {
    accent: '#f5c04a', laser: '#ff3b4a', good: '#3ddc84', bad: '#ff5d6c',
    tile: '#1f2a44', tileText: '#f6f1e6', paper: '#f1e6cc', ink: '#2a2118',
    metal: '#6f7a90', metalDark: '#262d3d', text: '#f6f1e6', dim: 'rgba(246,241,230,0.62)', panel: 'rgba(12,16,30,0.86)',
  },
  heroStyle: 'thief',
  guardStyle: 'guard',
  rain: true,
  skyline: true,
};

// ---- layout (logical pixels) ----
const PANEL_X = 248, PANEL_W = 688, PANEL_R = PANEL_X + PANEL_W;
const PROMPT_Y = 92, PROMPT_H = 94;
const LASER_Y = 197;
const TILE_Y = 212, TILE_H = 214;
const FOOT_Y = 440, FOOT_H = 84;
const VAULT = { x: 24, y: 92, w: 204, h: 336, cx: 126, cy: 246, r: 78 };
const FONT = (w, s) => `${w} ${s}px Nunito, "Segoe UI", system-ui, sans-serif`;
const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];
const NUMPAD = ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6'];
const arrAt = (v, i, def) => (Array.isArray(v) ? (v[Math.min(i, v.length - 1)] ?? def) : (v ?? def));

export class Mechanic {
  constructor(ctx) {
    this.ctx = ctx;
    const c = ctx.config || {};
    this.cfg = {
      ...defaultConfig, ...c,
      finale: { ...defaultConfig.finale, ...(c.finale || {}) },
      scoring: { ...defaultConfig.scoring, ...(c.scoring || {}) },
      labels: { ...defaultConfig.labels, ...(c.labels || {}) },
      palette: { ...defaultConfig.palette, ...(c.palette || {}) },
      buildings: Array.isArray(c.buildings) && c.buildings.length ? c.buildings.map((b, i) => ({ ...defaultConfig.buildings[Math.min(i, 2)], ...b })) : defaultConfig.buildings,
    };
  }

  // ------------------------------------------------------------------ lifecycle ----
  init() {
    const { ctx, cfg } = this;
    const skills = ctx.content.skills || {};
    const ids = Object.keys(skills);
    const supported = ids.filter(s => (skills[s].types || ['choice']).some(t => meta.itemTypes.includes(t)));
    if (!supported.length) throw new Error('Deduction needs a content pack whose skills supply "choice" or "text" items');
    if (!ids.some(s => (skills[s].types || ['choice']).includes('choice'))) throw new Error('Deduction needs at least one skill of type "choice" (tap pins)');
    const unsupported = ids.filter(s => !supported.includes(s));
    if (unsupported.length) throw new Error('Deduction cannot present skills: ' + unsupported.join(', '));

    this.phase = 'intro';
    this.ended = false;
    this.inFinale = false;
    this.building = 0;
    this.lockIndex = 0;
    this.pinIndex = 0;
    this.pinsThisLock = 0;
    this.pinStates = [];
    this.pinsDoneTotal = 0;
    this.locksOpened = 0;
    this.cleanPins = 0;
    this.jammedPins = 0;
    this.guardVisits = 0;
    this.tools = cfg.tools;
    this.alarm = 0;
    this.correct = 0;
    this.total = 0;
    this.item = null;
    this.tiles = [];
    this.layout = 'cards';
    this.cursor = -1;
    this.hover = -1;
    this.sweep = 0;
    this.sweepSecNow = cfg.sweepSec;
    this.lastBuzzSec = -1;
    this.pinStart = 0;
    this.annot = null;
    this.dial = { a: 0 };
    this.door = { open: 0 };
    this.lootGlow = { v: 0 };
    this.skyMix = { v: 1 };
    this.skyFrom = 0;
    this.banner = { x: -1200, alpha: 0, title: '', sub: '', eyebrow: '' };
    this.board = { t: 0, rows: [] };
    this.countdown = 0;
    this.finaleLines = [];
    this.finaleLeft = 0;
    this.finaleTotal = 1;
    this.finaleFixed = 0;
    this.guard = { x: 1100, t: 0, active: false };
    this.hero = { bob: 0, arm: 0, blink: 0 };
    this.alarmPulse = 0;
    this.flash = { v: 0, color: '#ff3b4a' };
    this.sack = { s: 0 };
    this.lowBeam = 0;
    this.t = 0;
    this._grads = {};
    this.unsubs = [];

    const totalPins = this.totalPinCount();
    this.totalPins = totalPins;

    // deterministic decoration from the run seed
    const rng = ctx.rng;
    this.stars = [];
    for (let i = 0; i < 46; i++) this.stars.push({ x: rng.float(0, ctx.width), y: rng.float(0, 140), r: rng.float(0.6, 1.8), p: rng.float(0, 6.28) });
    this.skyline = [];
    let x = -20;
    while (x < ctx.width + 40) { const w = rng.int(28, 70), h = rng.int(60, 190); this.skyline.push({ x, w, h, win: rng.int(2, 5) }); x += w + rng.int(4, 14); }
    this.rain = [];
    for (let i = 0; i < 70; i++) this.rain.push({ x: rng.float(0, ctx.width), y: rng.float(0, ctx.height), l: rng.float(10, 26), v: rng.float(420, 640) });

    ctx.hud.set({ score: 0, streak: 0, level: 1, levelLabel: this.cfg.buildings[0].name, progress: 0 });
    if (ctx.input.isTouchDevice) {
      ctx.input.addTouchButton({ id: 'left', x: 640, y: FOOT_Y + 14, w: 64, h: 56, label: '◀', code: 'ArrowLeft' });
      ctx.input.addTouchButton({ id: 'right', x: 712, y: FOOT_Y + 14, w: 64, h: 56, label: '▶', code: 'ArrowRight' });
      ctx.input.addTouchButton({ id: 'pick', x: 784, y: FOOT_Y + 14, w: 86, h: 56, label: 'Pick', code: 'Enter' });
    }
    this.unsubs.push(ctx.input.onPointerDown((x, y) => this.onTap(x, y)));
    this.unsubs.push(ctx.on('answer', d => { this.total++; if (d.correct) this.correct++; }));
    this.unsubs.push(ctx.on('pause', () => ctx.audio.music.setIntensity(0.15)));
    this.unsubs.push(ctx.on('resume', () => ctx.audio.music.setIntensity(this.musicIntensity())));
    ctx.audio.music.start('calm');
    ctx.audio.music.setIntensity(0.5);
    this.startBuilding(0);
  }

  destroy() {
    for (const off of this.unsubs) { try { off(); } catch { /* ignore */ } }
    this.unsubs.length = 0;
    const { ctx } = this;
    ctx.tweens.killAll();
    ctx.particles.clear();
    ctx.floatingText.clear();
    ctx.input.clearTouchButtons();
    ctx.audio.music.stop();
    ctx.overlay.hideHint();
    this.tiles.length = 0;
  }

  onPause() {}
  onResume() {}
  onResize() {}

  // ------------------------------------------------------------------ helpers ----
  wait(s) { return new Promise(r => this.ctx.tweens.delay(s, r)); }
  n(count) { return this.ctx.reducedMotion ? Math.ceil(count / 2) : count; }
  pinsFor(b) { return Math.max(1, Math.round(arrAt(this.cfg.pinsPerLock, b, 4))); }
  totalPinCount() {
    let n = 0;
    for (let b = 0; b < this.cfg.buildings.length; b++) n += this.cfg.locksPerBuilding * this.pinsFor(b);
    if (this.cfg.finale.enabled) n += this.cfg.finale.errors;
    return n;
  }
  musicIntensity() { return this.inFinale ? 1 : 0.45 + 0.25 * this.building; }
  sweepFor(b) { return Math.max(this.cfg.minSweepSec, this.cfg.sweepSec * Math.pow(this.cfg.sweepPerBuilding, b)); }
  timerFrac() {
    if (this.inFinale) return this.finaleTotal > 0 ? 1 - this.finaleLeft / this.finaleTotal : 1;
    return this.sweepSecNow > 0 ? this.sweep / this.sweepSecNow : 1;
  }
  timeLeft() { return this.inFinale ? this.finaleLeft : Math.max(0, this.sweepSecNow - this.sweep); }
  skillName(id) { const s = this.ctx.content.skills[id]; return (s && s.name) || id; }

  pickDifficulty(skill, floor) {
    const a = this.ctx.adaptive;
    const d = a.difficultyFor(skill);
    if (a.missesInRow(skill) > 0) return d;           // struggling: trust the adaptive controller fully
    return clamp(Math.max(d, floor || 1), 1, 5);
  }
  pickType(skill, textChance) {
    const types = this.ctx.content.skills[skill].types || ['choice'];
    const hasChoice = types.includes('choice'), hasText = types.includes('text');
    if (hasChoice && hasText) return this.ctx.rng.chance(textChance) ? 'text' : 'choice';
    return hasChoice ? 'choice' : 'text';
  }

  // ------------------------------------------------------------------ flow: buildings and locks ----
  startBuilding(b) {
    const { ctx, cfg } = this;
    this.skyFrom = this.building;
    this.building = b;
    this.lockIndex = 0;
    this.skyMix.v = 0;
    ctx.tweens.add(this.skyMix, { v: 1 }, 1.4);
    this.sweepSecNow = this.sweepFor(b);
    this.phase = 'intro';
    const bd = cfg.buildings[b];
    ctx.hud.set({ level: b + 1, levelLabel: bd.name });
    ctx.hud.pulse('level');
    if (b === 0) { ctx.audio.music.start('calm'); } else { ctx.audio.music.start('tense'); ctx.audio.play('levelup'); }
    ctx.audio.music.setIntensity(this.musicIntensity());
    this.showBanner({
      eyebrow: `${cfg.labels.building} ${b + 1} ${String.fromCharCode(0x2022)} ${cfg.locksPerBuilding} ${cfg.labels.lock.toLowerCase()}s`,
      title: bd.name.toUpperCase(),
      sub: `${this.pinsFor(b)} ${cfg.labels.pin.toLowerCase()}s per ${cfg.labels.lock.toLowerCase()} ${String.fromCharCode(0x2022)} laser ${Math.round(this.sweepSecNow)}s`,
    }, 1.9, () => this.startLock());
  }

  showBanner({ eyebrow, title, sub }, hold, then) {
    const { ctx } = this;
    const bn = this.banner;
    ctx.tweens.killTarget(bn);
    bn.eyebrow = eyebrow || ''; bn.title = title || ''; bn.sub = sub || '';
    bn.x = -1200; bn.alpha = 0;
    ctx.tweens.add(bn, { x: 0, alpha: 1 }, 0.55, { ease: Easing.easeOutBack });
    ctx.audio.play('whoosh', { volume: 0.6 });
    ctx.tweens.add(bn, { x: 1200, alpha: 0 }, 0.45, { delay: hold, ease: Easing.easeInQuad, onComplete: () => { if (!this.ended && then) then(); } });
  }

  startLock() {
    if (this.ended) return;
    const { ctx } = this;
    this.pinsThisLock = this.pinsFor(this.building);
    this.pinIndex = 0;
    this.pinStates = new Array(this.pinsThisLock).fill('pending');
    this.alarm = 0;
    this.dial.a = 0;
    this.door.open = 0;
    this.lootGlow.v = 0;
    ctx.audio.play('tick', { volume: 0.5 });
    this.nextPin();
  }

  nextPin() {
    if (this.ended) return;
    const { ctx, cfg } = this;
    const skill = ctx.adaptive.nextSkill();
    const floor = this.inFinale ? cfg.finale.difficultyFloor : arrAt(cfg.difficultyFloor, this.building, 1);
    const difficulty = this.pickDifficulty(skill, floor);
    const type = this.pickType(skill, this.inFinale ? cfg.finale.textChance : arrAt(cfg.textChance, this.building, 0));
    const item = ctx.nextItem({ skill, type, difficulty, choices: meta.choices });
    this.item = item;
    this.annot = null;
    this.cursor = -1;
    this.hover = -1;
    this.sweep = 0;
    this.lastBuzzSec = -1;
    this.pinStart = performance.now();
    if (ctx.adaptive.needsHint(item.skill) && item.hint) ctx.overlay.showHint(item.hint);
    if (ctx.gradeBand === 'early') ctx.speak(item.speech || item.prompt);
    if (item.type === 'text') { this.textPin(item); return; }
    if (item.type !== 'choice') throw new Error('Deduction: content returned unsupported item type ' + item.type);
    this.buildTiles(item);
    this.phase = 'pin';
    ctx.audio.play('swoosh', { volume: 0.35 });
  }

  // ------------------------------------------------------------------ tiles ----
  tileArea() {
    if (!this.inFinale) return { x: PANEL_X + 12, y: TILE_Y + 6, w: PANEL_W - 24, h: TILE_H - 12 };
    const top = this.finaleLinesBottom() + 8;
    return { x: PANEL_X + 24, y: top, w: PANEL_W - 48, h: Math.max(90, TILE_Y + TILE_H + 2 - top) };
  }
  finaleLinesBottom() { return PROMPT_Y + 58 + this.finaleLines.length * 24 + 34; }

  buildTiles(item) {
    const { ctx } = this;
    const g = ctx.engine.g;
    const area = this.tileArea();
    const sentence = (item.visual && item.visual.kind === 'sentence') || item.choices.length > 6;
    this.layout = sentence ? 'sentence' : 'cards';
    this.tiles.length = 0;
    if (sentence) {
      let size = 24;
      let rows;
      for (;;) {
        const font = FONT(800, size);
        const h = size + 22, gap = 10, rowGap = 12;
        rows = [[]];
        let rowW = 0;
        for (let i = 0; i < item.choices.length; i++) {
          const w = Math.ceil(measureText(g, item.choices[i], font)) + 26;
          if (rowW + w + (rows[rows.length - 1].length ? gap : 0) > area.w && rows[rows.length - 1].length) { rows.push([]); rowW = 0; }
          rows[rows.length - 1].push({ i, w });
          rowW += w + (rows[rows.length - 1].length > 1 ? gap : 0);
        }
        const totalH = rows.length * h + (rows.length - 1) * rowGap;
        if (totalH <= area.h || size <= 17) {
          const y0 = area.y + (area.h - totalH) / 2;
          rows.forEach((row, r) => {
            const rw = row.reduce((s, t) => s + t.w, 0) + gap * (row.length - 1);
            let x = area.x + (area.w - rw) / 2;
            for (const t of row) {
              this.tiles.push(this.makeTile(item.choices[t.i], t.i, x, y0 + r * (h + rowGap), t.w, h, font));
              x += t.w + gap;
            }
          });
          break;
        }
        size -= 1;
      }
    } else {
      const n = item.choices.length;
      const cols = n <= 2 ? 1 : 2;
      const rows = Math.ceil(n / cols);
      const gap = 12;
      const w = (area.w - gap * (cols - 1)) / cols;
      const h = Math.min(110, (area.h - gap * (rows - 1)) / rows);
      const y0 = area.y + (area.h - (rows * h + (rows - 1) * gap)) / 2;
      for (let i = 0; i < n; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        const text = item.choices[i];
        let size = 20, lines;
        for (;;) {
          lines = wrapText(g, text, w - 64, FONT(700, size));
          if (lines.length * (size + 6) <= h - 14 || size <= 16) break;
          size -= 1;
        }
        const tile = this.makeTile(text, i, area.x + c * (w + gap), y0 + r * (h + gap), w, h, FONT(700, size));
        tile.lines = lines; tile.lineH = size + 6; tile.key = i + 1;
        this.tiles.push(tile);
      }
    }
    this.tiles.forEach((t, k) => { t.scale = 0; ctx.tweens.add(t, { scale: 1 }, 0.4, { ease: Easing.easeOutBack, delay: 0.03 * k }); });
  }
  makeTile(label, index, x, y, w, h, font) { return { label, index, x, y, w, h, font, scale: 1, flash: 0, good: 0, reveal: 0, lines: null, lineH: 0, key: 0 }; }
  tileAt(x, y) {
    for (let i = 0; i < this.tiles.length; i++) { const t = this.tiles[i]; if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) return i; }
    return -1;
  }

  // ------------------------------------------------------------------ answering ----
  onTap(x, y) {
    if (this.ended) return;
    if (this.phase === 'pin') {
      const i = this.tileAt(x, y);
      if (i >= 0) this.choose(this.tiles[i].index);
    } else if (this.phase === 'board') {
      this.leaveBoard();
    }
  }

  choose(index) {
    if (this.phase !== 'pin' || this.ended) return;
    const responseMs = Math.round(performance.now() - this.pinStart);
    const res = this.ctx.answer(this.item, index, { responseMs });
    const tile = index === null ? null : this.tiles.find(t => t.index === index);
    if (res.correct) this.onPinCorrect(tile, responseMs); else this.onPinWrong(tile, index);
  }

  async onPinCorrect(tile, responseMs) {
    const { ctx, cfg } = this;
    const sc = cfg.scoring;
    this.phase = 'resolve';
    ctx.overlay.hideHint();
    const limit = (this.inFinale ? this.finaleTotal / Math.max(1, cfg.finale.errors) : this.sweepSecNow) * 1000;
    const speed = clamp(Math.round(sc.speedMax * (1 - responseMs / Math.max(1000, limit))), 0, sc.speedMax);
    let pts = sc.pin + sc.perDifficulty * this.item.difficulty + speed + (this.inFinale ? sc.finaleFix : 0);
    if (ctx.streak >= 5) pts *= 2;
    pts = Math.round(pts / 5) * 5;
    const cx = tile ? tile.x + tile.w / 2 : PANEL_X + PANEL_W / 2;
    const cy = tile ? tile.y + tile.h / 2 : TILE_Y + TILE_H / 2;
    if (tile) { tile.good = 1; ctx.tweens.add(tile, { scale: 1.12 }, 0.12, { ease: Easing.easeOutQuad, onComplete: () => ctx.tweens.add(tile, { scale: 1 }, 0.25, { ease: Easing.easeOutBack }) }); }
    ctx.audio.play('click', { volume: 0.9 });
    ctx.audio.play('coin', { pitch: 1 + Math.min(0.6, ctx.streak * 0.06), volume: 0.7 });
    ctx.particles.burst({ x: cx, y: cy, count: this.n(26), colors: [cfg.palette.accent, '#ffffff', shade(cfg.palette.accent, 0.4)], speed: 260, life: 0.7, size: 7, gravity: 300, friction: 0.9 });
    ctx.particles.burst({ x: cx, y: cy, count: this.n(8), colors: ['#fff', cfg.palette.accent], speed: 180, life: 0.8, size: 10, shape: 'star', gravity: 160 });
    ctx.addScore(pts, { x: cx, y: cy - 30 });
    ctx.floatingText.add(ctx.streak >= 5 ? 'x2 ' + cfg.labels.pinSet : cfg.labels.pinSet, cx, cy + 26, { color: cfg.palette.good, size: 20, duration: 0.8, vy: -40 });
    this.hero.arm = 1; ctx.tweens.add(this.hero, { arm: 0 }, 0.5, { delay: 0.2 });
    this.cleanPins++;
    // dial and pin
    if (!this.inFinale) {
      this.pinStates[this.pinIndex] = 'set';
      ctx.tweens.add(this.dial, { a: this.dial.a + (Math.PI * 2) / this.pinsThisLock }, 0.45, { ease: Easing.easeOutBack });
      ctx.audio.play('tick', { volume: 0.8, pitch: 0.7 });
    } else {
      this.finaleFixed++;
      const line = this.finaleLines[this.finaleLines.length - 1];
      if (line) { line.fixed = true; line.stamp = 0; ctx.tweens.add(line, { stamp: 1 }, 0.35, { ease: Easing.easeOutBack, delay: 0.15 }); }
      ctx.tweens.delay(0.2, () => { ctx.audio.play('hit', { volume: 0.7, pitch: 0.8 }); ctx.shake.shake(4, 0.15); });
    }
    const streak = ctx.streak;
    ctx.hud.set({ combo: streak >= 2 ? streak : 0 });
    if (streak === 5) { ctx.audio.play('powerup'); ctx.overlay.toast('Streak of 5: double points and XP!', { type: 'good', duration: 1.8 }); }
    else if (streak >= 3 && streak % 3 === 0) { ctx.audio.play('combo'); ctx.overlay.toast(`${streak} in a row. Smooth.`, { type: 'good', duration: 1.1 }); }
    await this.wait(0.65);
    if (this.ended) return;
    this.afterPin(true);
  }

  async onPinWrong(tile, chosen) {
    const { ctx, cfg } = this;
    this.phase = 'resolve';
    ctx.overlay.hideHint();
    if (tile) { tile.flash = 1; ctx.tweens.add(tile, { flash: 0 }, 0.7); }
    const ct = this.tiles.find(t => t.index === this.item.correct);
    if (ct) {
      ct.reveal = 0;
      ctx.tweens.add(ct, { reveal: 1 }, 0.4, { ease: Easing.easeOutBack, delay: 0.15 });
      this.annot = { tile: ct, label: (this.item.visual && this.item.visual.label) || null };
    }
    const cx = tile ? tile.x + tile.w / 2 : PANEL_X + PANEL_W / 2;
    const cy = tile ? tile.y + tile.h / 2 : TILE_Y + 40;
    ctx.floatingText.add(chosen === null ? cfg.labels.timeUp : 'Alarm!', cx, cy - 26, { color: cfg.palette.bad, size: 22, duration: 0.9 });
    ctx.shake.shake(6, 0.25);
    this.flash.v = 0.55; this.flash.color = cfg.palette.laser; ctx.tweens.add(this.flash, { v: 0 }, 0.6);
    ctx.hud.set({ combo: 0 });
    this.jammedPins++;
    if (!this.inFinale) this.pinStates[this.pinIndex] = 'jammed';
    else { const line = this.finaleLines[this.finaleLines.length - 1]; if (line) { line.fixed = false; line.jam = 1; } }
    const guards = this.alarmTick();
    await this.wait(guards ? 1.3 : 0.8);
    if (this.ended) return;
    await ctx.feedback(this.item, chosen, false, { blocking: true });
    if (this.ended) return;
    this.annot = null;
    if (this.tools <= 0) { this.finish('busted'); return; }
    this.afterPin(false);
  }

  alarmTick() {
    const { ctx, cfg } = this;
    this.alarm++;
    this.alarmPulse = 1;
    ctx.audio.play('buzz', { volume: 0.8, pitch: 1 + 0.15 * this.alarm });
    if (this.alarm >= cfg.alarmTicks) { this.guardsArrive(); return true; }
    return false;
  }

  guardsArrive() {
    const { ctx, cfg } = this;
    this.alarm = 0;
    this.guardVisits++;
    this.tools = Math.max(0, this.tools - 1);
    ctx.audio.play('explode', { volume: 0.6 });
    ctx.audio.play('wrong', { volume: 0.5, pitch: 0.7 });
    ctx.shake.shake(12, 0.45);
    this.flash.v = 0.8; this.flash.color = cfg.palette.laser; ctx.tweens.add(this.flash, { v: 0 }, 0.9);
    ctx.overlay.toast(cfg.labels.guards, { type: 'bad', duration: 2 });
    const gd = this.guard;
    ctx.tweens.killTarget(gd);
    gd.active = true; gd.x = 1080; gd.t = 0;
    ctx.tweens.add(gd, { x: 880 }, 0.5, { ease: Easing.easeOutQuad });
    ctx.tweens.add(gd, { x: 1080 }, 0.5, { delay: 2.6, ease: Easing.easeInQuad, onComplete: () => { gd.active = false; } });
    ctx.particles.burst({ x: 400 + 30 * (cfg.tools - this.tools), y: FOOT_Y + 36, count: this.n(14), colors: [cfg.palette.metal, '#fff'], speed: 160, life: 0.6, size: 5, gravity: 300, shape: 'square' });
  }

  afterPin(correct) {
    const { ctx } = this;
    this.pinsDoneTotal++;
    ctx.hud.set({ progress: clamp(this.pinsDoneTotal / this.totalPins, 0, 1) });
    this.tiles.length = 0;
    if (this.inFinale) {
      if (this.finaleLines.length >= this.cfg.finale.errors || this.finaleLeft <= 0) this.finaleEnd(); else this.nextPin();
      return;
    }
    this.pinIndex++;
    if (this.pinIndex >= this.pinsThisLock) this.openLock(correct); else this.nextPin();
  }

  async textPin(item) {
    const { ctx, cfg } = this;
    this.phase = 'textpin';
    this.tiles.length = 0;
    const limit = Math.max(4, Math.round(this.inFinale ? Math.min(this.finaleLeft, this.sweepSecNow * 1.4) : this.sweepSecNow * 1.3));
    const t0 = performance.now();
    const res = await ctx.overlay.showQuestion(item, { timeLimit: limit, allowHint: ctx.adaptive.needsHint(item.skill) && !!item.hint });
    if (this.ended) return;
    if (this.inFinale) this.finaleLeft = Math.max(0, this.finaleLeft - (performance.now() - t0) / 1000);
    const graded = ctx.answer(item, res.chosen, { responseMs: res.responseMs });
    if (graded.correct) {
      this.phase = 'resolve';
      await ctx.feedback(item, res.chosen, true, { blocking: false, duration: 0.9 });
      if (this.ended) return;
      this.phase = 'pin';   // onPinCorrect expects the pin to be live
      this.onPinCorrect(null, res.responseMs);
    } else {
      this.phase = 'pin';
      this.onPinWrong(null, res.chosen);
    }
    void cfg;
  }

  // ------------------------------------------------------------------ lock open, building clear, board ----
  async openLock(lastCorrect) {
    const { ctx, cfg } = this;
    this.phase = 'lockopen';
    this.locksOpened++;
    const clean = this.pinStates.filter(s => s === 'set').length;
    const bonus = Math.round(cfg.scoring.lockBonus * (clean / this.pinsThisLock) / 10) * 10;
    ctx.audio.play('levelup', { volume: 0.8 });
    ctx.tweens.add(this.dial, { a: this.dial.a + Math.PI }, 0.6, { ease: Easing.easeInOutCubic });
    await this.wait(0.35);
    if (this.ended) return;
    ctx.audio.play('whoosh');
    ctx.tweens.add(this.door, { open: 1 }, 0.7, { ease: Easing.easeInOutCubic });
    ctx.tweens.add(this.lootGlow, { v: 1 }, 0.5, { delay: 0.4 });
    ctx.shake.shake(7, 0.3);
    ctx.particles.burst({ x: VAULT.cx, y: VAULT.cy, count: this.n(40), colors: [cfg.palette.accent, '#fff', '#ffe9a8'], speed: 300, life: 1, size: 8, gravity: 240, shape: 'star' });
    if (bonus > 0) ctx.addScore(bonus, { x: VAULT.cx, y: VAULT.cy - 60, label: `+${bonus} ${cfg.labels.lootName}` });
    ctx.floatingText.add(cfg.labels.lockOpen, PANEL_X + PANEL_W / 2, TILE_Y + 70, { color: cfg.palette.accent, size: 40, duration: 1.3, vy: -25 });
    ctx.tweens.add(this.sack, { s: this.locksOpened }, 0.5, { ease: Easing.easeOutBack, delay: 0.6 });
    await this.wait(1.7);
    if (this.ended) return;
    this.lockIndex++;
    if (this.lockIndex >= cfg.locksPerBuilding) this.buildingClear(); else this.startLock();
    void lastCorrect;
  }

  buildingClear() {
    const { ctx, cfg } = this;
    ctx.audio.play('fanfare', { volume: 0.7 });
    ctx.addScore(cfg.scoring.buildingBonus, { x: ctx.width / 2, y: 300 });
    ctx.shake.shake(8, 0.3);
    ctx.particles.burst({ x: ctx.width / 2, y: 200, count: this.n(60), colors: [cfg.palette.accent, '#fff', cfg.palette.good], speed: 380, life: 1.2, size: 9, gravity: 260, shape: 'square' });
    this.showBanner({ eyebrow: cfg.buildings[this.building].name, title: cfg.labels.cleared, sub: `+${cfg.scoring.buildingBonus}` }, 1.3, () => this.showBoard());
  }

  showBoard() {
    const { ctx } = this;
    this.phase = 'board';
    const sum = ctx.adaptive.summary();
    this.board.rows = Object.keys(sum).map(s => ({ skill: s, name: this.skillName(s), seen: sum[s].seen, correct: sum[s].correct, difficulty: sum[s].difficulty, acc: sum[s].seen ? sum[s].correct / sum[s].seen : 0, mastery: ctx.progress.mastery(s), pin: 0, bar: 0 }));
    this.board.t = 0;
    ctx.tweens.add(this.board, { t: 1 }, 0.5, { ease: Easing.easeOutBack });
    this.board.rows.forEach((r, i) => {
      ctx.tweens.add(r, { pin: 1 }, 0.35, { delay: 0.3 + i * 0.1, ease: Easing.easeOutBack, onComplete: () => ctx.audio.play('tick', { volume: 0.5, pitch: 1.2 }) });
      ctx.tweens.add(r, { bar: 1 }, 0.6, { delay: 0.5 + i * 0.1, ease: Easing.easeOutCubic });
    });
  }
  leaveBoard() {
    if (this.phase !== 'board') return;
    this.phase = 'resolve';
    this.ctx.audio.play('click');
    this.ctx.tweens.add(this.board, { t: 0 }, 0.25, { ease: Easing.easeInQuad, onComplete: () => {
      if (this.ended) return;
      if (this.building + 1 < this.cfg.buildings.length) this.startBuilding(this.building + 1);
      else if (this.cfg.finale.enabled) this.startFinale();
      else this.finish('done');
    } });
  }

  // ------------------------------------------------------------------ finale ----
  startFinale() {
    const { ctx, cfg } = this;
    this.inFinale = true;
    this.phase = 'finaleIntro';
    this.finaleLines = [];
    this.finaleFixed = 0;
    this.alarm = 0;
    this.pinStates = new Array(cfg.finale.errors).fill('pending');
    this.pinsThisLock = cfg.finale.errors;
    this.pinIndex = 0;
    this.dial.a = 0; this.door.open = 0; this.lootGlow.v = 0;
    this.sweepSecNow = this.sweepFor(this.building);
    this.finaleTotal = Math.max(10, cfg.finale.errors * this.sweepSecNow * cfg.finale.timeMul);
    this.finaleLeft = this.finaleTotal;
    ctx.hud.set({ levelLabel: cfg.finale.title });
    ctx.audio.music.start('boss');
    ctx.audio.music.setIntensity(1);
    this.showBanner({ eyebrow: 'FINALE', title: cfg.finale.title.toUpperCase(), sub: cfg.finale.intro }, 2.4, () => {
      this.countdown = 3;
      ctx.audio.play('tick');
      const step = () => {
        if (this.ended) return;
        this.countdown--;
        if (this.countdown > 0) { ctx.audio.play('tick'); ctx.tweens.delay(0.8, step); }
        else { ctx.audio.play('whoosh'); this.countdown = 0; this.nextFinalePin(); }
      };
      ctx.tweens.delay(0.8, step);
    });
  }
  nextFinalePin() {
    this.nextPin();
    const it = this.item;
    const text = it.visual && Array.isArray(it.visual.words) ? it.visual.words.join(' ') + (it.visual.end || '') : (it.type === 'choice' ? it.choices[it.correct] : String(it.answer && it.answer[0] !== undefined && Array.isArray(it.answer) ? it.answer[0] : it.answer));
    this.finaleLines.push({ text, fixed: false, stamp: 0, jam: 0 });
    if (it.type === 'choice') { this.tiles.length = 0; this.buildTiles(it); }
  }
  finaleEnd() {
    const { ctx, cfg } = this;
    this.phase = 'resolve';
    const all = this.finaleFixed >= cfg.finale.errors;
    if (all) {
      ctx.audio.play('fanfare');
      ctx.addScore(cfg.finale.bonus, { x: ctx.width / 2, y: 280, label: `+${cfg.finale.bonus} ${cfg.labels.cleanGetaway}` });
      ctx.shake.shake(10, 0.4);
      ctx.particles.burst({ x: ctx.width / 2, y: 240, count: this.n(80), colors: [cfg.palette.accent, '#fff', cfg.palette.good], speed: 420, life: 1.3, size: 9, gravity: 220, shape: 'star' });
    } else {
      ctx.audio.play('levelup', { volume: 0.6 });
    }
    ctx.tweens.add(this.door, { open: 1 }, 0.7, { ease: Easing.easeInOutCubic });
    ctx.tweens.add(this.lootGlow, { v: 1 }, 0.5, { delay: 0.3 });
    this.ctx.tweens.delay(1.6, () => this.finish(all ? 'clean' : 'done'));
  }

  // ------------------------------------------------------------------ end ----
  finish(reason) {
    if (this.ended) return;
    this.ended = true;
    this.phase = 'done';
    const { ctx, cfg } = this;
    ctx.overlay.hideHint();
    const bonusXP = this.tools * cfg.scoring.toolBonusXP + (reason === 'clean' ? cfg.finale.bonusXP : 0);
    const title = reason === 'busted' ? cfg.labels.busted : reason === 'clean' ? cfg.labels.cleanGetaway : undefined;
    const stats = [
      { label: `${cfg.labels.lock}s opened`, value: this.locksOpened },
      { label: `Clean ${cfg.labels.pin.toLowerCase()}s`, value: `${this.cleanPins}/${this.cleanPins + this.jammedPins}` },
      { label: 'Guard visits', value: this.guardVisits },
    ];
    if (cfg.finale.enabled) stats.push({ label: `${cfg.finale.title}`, value: `${this.finaleFixed}/${cfg.finale.errors} fixed` });
    stats.push({ label: `${cfg.labels.tool}s left`, value: this.tools });
    ctx.endGame({ title, score: ctx.score, correct: this.correct, total: this.total, bonusXP, stats });
  }

  /** Test hook: jump straight to a later phase. 'board' | 'finale' */
  debugJump(where) {
    if (this.ended) return;
    this.ctx.tweens.killTarget(this.banner);
    this.banner.alpha = 0;
    this.tiles.length = 0;
    if (where === 'board') { this.building = Math.min(this.building, this.cfg.buildings.length - 2); this.buildingClear(); }
    else if (where === 'finale') { this.building = this.cfg.buildings.length - 1; this.startFinale(); }
  }

  // ------------------------------------------------------------------ frame ----
  update(dt) {
    if (this.ended) return;
    const { ctx, cfg } = this;
    const inp = ctx.input;
    this.t += dt;
    this.hero.bob = Math.sin(this.t * 2.2) * 2;
    if (this.alarmPulse > 0) this.alarmPulse = Math.max(0, this.alarmPulse - dt * 1.6);
    if (this.guard.active) this.guard.t += dt;
    if (cfg.rain) for (const r of this.rain) { r.y += r.v * dt; r.x -= r.v * 0.18 * dt; if (r.y > ctx.height + 20) { r.y = -30; r.x = ctx.rng.float(0, ctx.width + 120); } }

    // timers
    if (this.phase === 'pin') {
      if (this.inFinale) {
        this.finaleLeft = Math.max(0, this.finaleLeft - dt);
        const left = Math.ceil(this.finaleLeft);
        if (left <= 5 && left !== this.lastBuzzSec) { this.lastBuzzSec = left; ctx.audio.play('tick', { volume: 0.7, pitch: 1.6 }); }
        if (this.finaleLeft <= 0) { this.choose(null); return; }
      } else {
        this.sweep += dt;
        const left = Math.ceil(this.sweepSecNow - this.sweep);
        if (left <= 3 && left > 0 && left !== this.lastBuzzSec) { this.lastBuzzSec = left; ctx.audio.play('tick', { volume: 0.7, pitch: 1.6 }); }
        if (this.sweep >= this.sweepSecNow) { this.choose(null); return; }
      }
      this.lowBeam += dt * 9;
      // hover
      const p = inp.pointer;
      this.hover = p.active ? this.tileAt(p.x, p.y) : -1;
      // keyboard
      if (this.layout === 'cards') {
        for (let k = 0; k < this.tiles.length && k < 6; k++) if (inp.wasPressed(DIGITS[k]) || inp.wasPressed(NUMPAD[k])) { this.choose(this.tiles[k].index); return; }
      }
      const n = this.tiles.length;
      if (n) {
        if (inp.wasPressed('ArrowLeft') || inp.wasPressed('KeyA') || inp.wasPressed('ArrowUp') || inp.wasPressed('KeyW')) { this.cursor = (this.cursor <= 0 ? n : this.cursor) - 1; ctx.audio.play('tick', { volume: 0.4 }); }
        if (inp.wasPressed('ArrowRight') || inp.wasPressed('KeyD') || inp.wasPressed('ArrowDown') || inp.wasPressed('KeyS')) { this.cursor = (this.cursor + 1) % n; ctx.audio.play('tick', { volume: 0.4 }); }
        if (inp.wasPressed('Enter') || inp.wasPressed('Space') || inp.wasPressed('NumpadEnter')) {
          if (this.cursor < 0) this.cursor = 0;
          this.choose(this.tiles[this.cursor].index);
          return;
        }
      }
    } else if (this.phase === 'board') {
      if (inp.wasPressed('Enter') || inp.wasPressed('Space') || inp.wasPressed('NumpadEnter')) this.leaveBoard();
    }
  }

  // ------------------------------------------------------------------ render ----
  _grad(g, key, make) { let gr = this._grads[key]; if (!gr) { gr = make(); this._grads[key] = gr; } return gr; }
  _sky(g, idx) {
    const b = this.cfg.buildings[Math.min(idx, this.cfg.buildings.length - 1)];
    return this._grad(g, 'sky' + idx, () => { const gr = g.createLinearGradient(0, 0, 0, this.ctx.height); gr.addColorStop(0, b.sky[0]); gr.addColorStop(1, b.sky[1]); return gr; });
  }

  render(g) {
    const { ctx, cfg } = this;
    const W = ctx.width, H = ctx.height;
    const P = cfg.palette;
    const bd = cfg.buildings[this.building];
    // ---- sky ----
    g.fillStyle = this._sky(g, this.building);
    g.fillRect(0, 0, W, H);
    if (this.skyMix.v < 1) { g.globalAlpha = 1 - this.skyMix.v; g.fillStyle = this._sky(g, this.skyFrom); g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    // stars
    for (const s of this.stars) { g.globalAlpha = 0.35 + 0.35 * Math.sin(this.t * 1.5 + s.p); g.fillStyle = '#fff'; g.fillRect(s.x, s.y, s.r, s.r); }
    g.globalAlpha = 1;
    // moon
    g.fillStyle = 'rgba(255,245,220,0.85)'; g.beginPath(); g.arc(880, 72, 16, 0, Math.PI * 2); g.fill();
    g.fillStyle = bd.sky[0]; g.beginPath(); g.arc(872, 66, 13, 0, Math.PI * 2); g.fill();
    // searchlight
    g.save(); g.globalAlpha = 0.07; g.fillStyle = bd.glow;
    const ang = Math.sin(this.t * 0.35) * 0.5;
    g.beginPath(); g.moveTo(W - 60, H + 40); g.lineTo(W - 60 + Math.sin(ang - 0.18) * 900, H + 40 - Math.cos(ang - 0.18) * 900); g.lineTo(W - 60 + Math.sin(ang + 0.18) * 900, H + 40 - Math.cos(ang + 0.18) * 900); g.closePath(); g.fill();
    g.restore();
    // skyline
    if (cfg.skyline) {
      g.fillStyle = 'rgba(6,8,18,0.75)';
      for (const b of this.skyline) g.fillRect(b.x, 230 - b.h, b.w, b.h + 320);
      g.fillStyle = hexToRgba(bd.glow, 0.35);
      let k = 0;
      for (const b of this.skyline) for (let w = 0; w < b.win; w++) { k++; if (((k * 7 + this.building) % 3) === 0) continue; g.fillRect(b.x + 6 + (w % 2) * 12, 240 - b.h + Math.floor(w / 2) * 16, 5, 7); }
    }
    this.drawFacade(g, bd);
    // rain
    if (cfg.rain) { g.strokeStyle = 'rgba(200,215,255,0.16)'; g.lineWidth = 1.2; g.beginPath(); for (const r of this.rain) { g.moveTo(r.x, r.y); g.lineTo(r.x - r.l * 0.18, r.y + r.l); } g.stroke(); }
    // floor
    g.fillStyle = 'rgba(4,6,12,0.55)'; g.fillRect(0, FOOT_Y - 8, W, H - FOOT_Y + 8);
    g.fillStyle = hexToRgba(bd.glow, 0.08); g.fillRect(0, FOOT_Y - 8, W, 2);

    // ---- vault + hero ----
    this.drawVault(g);
    this.drawHero(g, 74, FOOT_Y + 78);
    this.drawSack(g, 160, FOOT_Y + 78);

    // ---- main panel or manuscript ----
    if (this.inFinale) this.drawManuscript(g); else this.drawPanel(g);
    if (this.phase === 'pin' || this.phase === 'resolve') this.drawTiles(g);
    if (this.phase === 'pin') this.drawLaser(g);

    // ---- footer ----
    this.drawFooter(g);
    if (this.guard.active) this.drawGuard(g, this.guard.x, FOOT_Y + 80);

    // ---- overlays ----
    if (this.flash.v > 0) { g.fillStyle = hexToRgba(this.flash.color, this.flash.v * 0.35); g.fillRect(0, 0, W, H); }
    if (this.phase === 'board' || (this.board.t > 0 && this.board.t < 1)) this.drawBoard(g);
    if (this.banner.alpha > 0.01) this.drawBanner(g);
    if (this.countdown > 0) drawText(g, String(this.countdown), W / 2, 300, { font: FONT(900, 96), color: P.accent, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 8, shadow: true });
    // vignette
    g.fillStyle = this._grad(g, 'vig', () => { const gr = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)'); return gr; });
    g.fillRect(0, 0, W, H);
  }

  drawFacade(g, bd) {
    // near-layer building behind the panels: style-specific silhouette with lit windows
    const glow = hexToRgba(bd.glow, 0.22);
    g.fillStyle = 'rgba(10,12,24,0.78)';
    switch (bd.style) {
      case 'bank':
        g.fillRect(300, 70, 420, 400);
        g.fillStyle = 'rgba(16,18,34,0.9)'; g.fillRect(320, 56, 380, 18);
        g.fillStyle = glow; g.beginPath(); g.arc(510, 110, 16, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(10,12,24,0.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(510, 110); g.lineTo(510, 99); g.moveTo(510, 110); g.lineTo(518, 114); g.stroke();
        for (let i = 0; i < 6; i++) { g.fillStyle = glow; g.fillRect(340 + i * 60, 140, 26, 40); }
        break;
      case 'mansion':
        g.beginPath(); g.moveTo(280, 200); g.lineTo(400, 90); g.lineTo(520, 200); g.lineTo(520, 480); g.lineTo(280, 480); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(500, 220); g.lineTo(610, 120); g.lineTo(720, 220); g.lineTo(720, 480); g.lineTo(500, 480); g.closePath(); g.fill();
        g.fillRect(350, 60, 16, 60); g.fillRect(640, 90, 16, 60);
        g.fillStyle = glow; g.fillRect(380, 160, 22, 30); g.fillRect(440, 160, 22, 30); g.fillRect(590, 190, 22, 30); g.fillRect(650, 190, 22, 30);
        break;
      case 'tower':
        g.fillRect(420, 40, 160, 440); g.fillRect(380, 160, 240, 320);
        g.fillStyle = glow; for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) if ((r + c) % 2) g.fillRect(445 + c * 40, 70 + r * 40, 14, 20);
        break;
      case 'lab':
        g.beginPath(); g.arc(520, 200, 150, Math.PI, 0); g.lineTo(670, 480); g.lineTo(370, 480); g.closePath(); g.fill();
        g.fillRect(515, 20, 10, 60); g.fillStyle = glow; g.beginPath(); g.arc(520, 18, 6, 0, Math.PI * 2); g.fill();
        break;
      default: // museum: pediment + columns
        g.beginPath(); g.moveTo(280, 150); g.lineTo(520, 60); g.lineTo(760, 150); g.closePath(); g.fill();
        g.fillRect(280, 150, 480, 24);
        for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(18,20,38,0.9)'; g.fillRect(300 + i * 72, 174, 28, 300); }
        g.fillStyle = glow; g.fillRect(500, 320, 40, 150);
    }
  }

  drawVault(g) {
    const { cfg } = this;
    const P = cfg.palette;
    const V = VAULT;
    // housing
    roundRect(g, V.x, V.y, V.w, V.h, 18, { fill: this._grad(g, 'metal', () => { const gr = g.createLinearGradient(V.x, V.y, V.x + V.w, V.y + V.h); gr.addColorStop(0, shade(P.metalDark, 0.15)); gr.addColorStop(0.5, P.metalDark); gr.addColorStop(1, shade(P.metalDark, -0.4)); return gr; }), stroke: 'rgba(255,255,255,0.12)', lineWidth: 2 });
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (const [rx, ry] of [[V.x + 12, V.y + 12], [V.x + V.w - 12, V.y + 12], [V.x + 12, V.y + V.h - 12], [V.x + V.w - 12, V.y + V.h - 12]]) { g.beginPath(); g.arc(rx, ry, 4, 0, Math.PI * 2); g.fill(); }
    // interior + loot (revealed as door opens)
    g.save();
    g.beginPath(); g.arc(V.cx, V.cy, V.r, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#07080f'; g.fillRect(V.cx - V.r, V.cy - V.r, V.r * 2, V.r * 2);
    if (this.lootGlow.v > 0) {
      g.globalAlpha = this.lootGlow.v;
      g.fillStyle = hexToRgba(P.accent, 0.25); g.beginPath(); g.arc(V.cx, V.cy, V.r, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 4; i++) { roundRect(g, V.cx - 46 + (i % 2) * 44, V.cy + 10 - Math.floor(i / 2) * 22, 40, 18, 4, { fill: this._grad(g, 'gold', () => { const gr = g.createLinearGradient(0, V.cy - 20, 0, V.cy + 30); gr.addColorStop(0, '#ffe9a8'); gr.addColorStop(1, '#c48a1a'); return gr; }), stroke: 'rgba(0,0,0,0.3)', lineWidth: 1 }); }
      g.fillStyle = '#9ad7ff'; g.beginPath(); g.moveTo(V.cx, V.cy - 40); g.lineTo(V.cx + 14, V.cy - 26); g.lineTo(V.cx, V.cy - 8); g.lineTo(V.cx - 14, V.cy - 26); g.closePath(); g.fill();
      g.globalAlpha = 1;
    }
    g.restore();
    // door (swings: horizontal squash anchored at the hinge on the left)
    const open = this.door.open;
    g.save();
    g.translate(V.cx - V.r, 0); g.scale(Math.max(0.02, 1 - open * 0.98), 1); g.translate(-(V.cx - V.r), 0);
    g.fillStyle = this._grad(g, 'door', () => { const gr = g.createRadialGradient(V.cx - 20, V.cy - 24, 10, V.cx, V.cy, V.r); gr.addColorStop(0, shade(P.metal, 0.25)); gr.addColorStop(1, shade(P.metal, -0.45)); return gr; });
    g.beginPath(); g.arc(V.cx, V.cy, V.r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3; g.beginPath(); g.arc(V.cx, V.cy, V.r - 6, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.beginPath(); g.arc(V.cx, V.cy, V.r - 16, 0, Math.PI * 2); g.stroke();
    // dial
    g.save(); g.translate(V.cx, V.cy); g.rotate(this.dial.a);
    g.fillStyle = shade(P.metalDark, -0.2); g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill();
    g.strokeStyle = P.accent; g.lineWidth = 3;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const r1 = i % 3 === 0 ? 28 : 33; g.beginPath(); g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a) * 38, Math.sin(a) * 38); g.stroke(); }
    g.strokeStyle = shade(P.metal, 0.3); g.lineWidth = 7; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); g.stroke(); }
    g.fillStyle = P.accent; g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill();
    g.restore();
    g.restore();
    // pin indicators
    const n = this.pinStates.length || 1;
    const pw = 16, gap = 8;
    const total = n * pw + (n - 1) * gap;
    let px = V.cx - total / 2;
    const py = V.y + V.h - 62;
    for (let i = 0; i < n; i++) {
      const st = this.pinStates[i];
      const active = (this.phase === 'pin' || this.phase === 'textpin') && (this.inFinale ? this.finaleLines.length - 1 === i : this.pinIndex === i);
      let fill = 'rgba(255,255,255,0.1)', stroke = 'rgba(255,255,255,0.25)';
      if (st === 'set') { fill = P.accent; stroke = shade(P.accent, 0.4); }
      else if (st === 'jammed') { fill = 'rgba(120,60,60,0.9)'; stroke = P.bad; }
      if (active) { stroke = P.accent; g.shadowColor = P.accent; g.shadowBlur = 8 + 6 * Math.sin(this.t * 6); }
      roundRect(g, px, py - (st === 'set' ? 6 : 0), pw, 30, 6, { fill, stroke, lineWidth: 2 });
      g.shadowBlur = 0;
      if (st === 'jammed') { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 4, py + 10); g.lineTo(px + 12, py + 20); g.moveTo(px + 12, py + 10); g.lineTo(px + 4, py + 20); g.stroke(); }
      px += pw + gap;
    }
    const lbl = this.inFinale ? cfg.finale.title : `${cfg.labels.lock} ${Math.min(this.lockIndex + 1, cfg.locksPerBuilding)} of ${cfg.locksPerBuilding}`;
    drawText(g, lbl, V.cx, V.y + V.h - 18, { font: FONT(700, 16), color: P.dim, maxWidth: V.w - 20 });
  }

  drawHero(g, x, baseY) {
    const { cfg } = this;
    const P = cfg.palette;
    const bob = this.hero.bob;
    const style = cfg.heroStyle;
    g.save();
    g.translate(x, baseY + bob);
    // legs
    g.fillStyle = '#0b0d16'; g.fillRect(-14, -30, 11, 30); g.fillRect(3, -30, 11, 30);
    // body
    const bodyColor = style === 'detective' ? '#5b4a3a' : style === 'agent' ? '#1a1f33' : '#111523';
    roundRect(g, -20, -72, 40, 46, 10, { fill: bodyColor });
    if (style === 'detective') { g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-6, -70); g.lineTo(-6, -30); g.stroke(); }
    if (style === 'agent') { g.fillStyle = '#f6f1e6'; g.beginPath(); g.moveTo(-6, -72); g.lineTo(0, -56); g.lineTo(6, -72); g.closePath(); g.fill(); g.fillStyle = '#b3261e'; g.fillRect(-2, -66, 4, 14); }
    // arm (raised on success) holding a flashlight
    g.save(); g.translate(16, -62); g.rotate(-0.4 - this.hero.arm * 1.1);
    g.fillStyle = bodyColor; roundRect(g, -5, 0, 10, 30, 5, { fill: bodyColor });
    g.fillStyle = P.metal; roundRect(g, -6, 26, 12, 10, 3, { fill: P.metal });
    g.fillStyle = hexToRgba('#fff7c2', 0.25 + 0.15 * Math.sin(this.t * 7)); g.beginPath(); g.moveTo(-5, 36); g.lineTo(5, 36); g.lineTo(26, 90); g.lineTo(-26, 90); g.closePath(); g.fill();
    g.restore();
    // head
    g.fillStyle = '#e8c39e'; g.beginPath(); g.arc(0, -86, 15, 0, Math.PI * 2); g.fill();
    if (style === 'thief') { g.fillStyle = '#111523'; roundRect(g, -15, -92, 30, 10, 4, { fill: '#111523' }); }
    if (style === 'agent') { g.fillStyle = '#0b0d16'; roundRect(g, -14, -91, 28, 8, 3, { fill: '#0b0d16' }); }
    // eyes
    const blink = Math.sin(this.t * 1.3) > 0.97 ? 0.2 : 1;
    g.fillStyle = style === 'thief' ? '#fff' : '#1a1a1a';
    g.fillRect(-8, -89, 5, 4 * blink); g.fillRect(3, -89, 5, 4 * blink);
    // hat
    g.fillStyle = style === 'agent' ? '#1a1f33' : '#0b0d16';
    g.beginPath(); g.ellipse(0, -98, style === 'detective' ? 26 : 22, 5, 0, 0, Math.PI * 2); g.fill();
    roundRect(g, -14, -116, 28, 20, 6, { fill: style === 'agent' ? '#1a1f33' : '#0b0d16' });
    g.fillStyle = P.accent; g.fillRect(-14, -102, 28, 3);
    g.restore();
  }

  drawSack(g, x, baseY) {
    const s = this.sack.s;
    if (s <= 0) return;
    const { cfg } = this;
    const r = 14 + Math.min(5, s) * 5;
    g.save(); g.translate(x, baseY);
    g.fillStyle = '#6b4a2b'; g.beginPath(); g.ellipse(0, -r * 0.8, r, r * 0.8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4e3620'; g.fillRect(-6, -r * 1.7, 12, 10);
    g.fillStyle = cfg.palette.accent; g.beginPath(); g.arc(-r * 0.3, -r * 0.9, 4, 0, Math.PI * 2); g.arc(r * 0.25, -r * 0.7, 3, 0, Math.PI * 2); g.fill();
    drawText(g, `${cfg.labels.lootName} x${Math.round(s)}`, 0, 6, { font: FONT(700, 16), color: cfg.palette.dim, baseline: 'top' });
    g.restore();
  }

  drawGuard(g, x, baseY) {
    const { cfg } = this;
    const style = cfg.guardStyle;
    g.save(); g.translate(x, baseY);
    // flashlight cone towards the vault
    g.fillStyle = `rgba(255,240,180,${0.1 + 0.06 * Math.sin(this.guard.t * 10)})`;
    g.beginPath(); g.moveTo(-20, -64); g.lineTo(-520, -150 + Math.sin(this.guard.t * 2) * 60); g.lineTo(-520, 20 + Math.sin(this.guard.t * 2) * 60); g.closePath(); g.fill();
    if (style === 'robot') {
      g.fillStyle = '#4a5468'; roundRect(g, -24, -80, 48, 56, 8, { fill: '#4a5468' }); g.fillRect(-18, -24, 12, 24); g.fillRect(6, -24, 12, 24);
      g.fillStyle = cfg.palette.laser; g.beginPath(); g.arc(-8, -62, 5, 0, Math.PI * 2); g.arc(8, -62, 5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#8b96ad'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -80); g.lineTo(0, -96); g.stroke(); g.fillStyle = cfg.palette.laser; g.beginPath(); g.arc(0, -98, 4, 0, Math.PI * 2); g.fill();
    } else if (style === 'dog') {
      g.fillStyle = '#2b2b33'; roundRect(g, -36, -46, 64, 30, 12, { fill: '#2b2b33' }); g.fillRect(-30, -18, 9, 18); g.fillRect(14, -18, 9, 18);
      g.beginPath(); g.arc(-40, -48, 14, 0, Math.PI * 2); g.fill(); g.fillStyle = cfg.palette.laser; g.fillRect(-48, -52, 4, 4);
    } else {
      g.fillStyle = '#243b6b'; g.fillRect(-12, -30, 10, 30); g.fillRect(2, -30, 10, 30);
      roundRect(g, -20, -74, 40, 46, 8, { fill: '#2f4f8f' });
      g.fillStyle = '#e8c39e'; g.beginPath(); g.arc(0, -88, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1b2a4a'; roundRect(g, -16, -104, 32, 12, 4, { fill: '#1b2a4a' }); g.fillRect(-20, -94, 40, 4);
      g.fillStyle = cfg.palette.accent; g.beginPath(); g.arc(0, -98, 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1a1a1a'; g.fillRect(-7, -90, 4, 3); g.fillRect(3, -90, 4, 3);
    }
    g.restore();
  }

  drawPanel(g) {
    const { cfg } = this;
    const P = cfg.palette;
    roundRect(g, PANEL_X, PROMPT_Y, PANEL_W, PROMPT_H + TILE_H + (TILE_Y - PROMPT_Y - PROMPT_H), 16, { fill: P.panel, stroke: 'rgba(255,255,255,0.12)', lineWidth: 2 });
    // header strip
    const it = this.item;
    const eyebrow = it ? `${cfg.labels.pin.toUpperCase()} ${Math.min(this.pinIndex + 1, this.pinsThisLock)} OF ${this.pinsThisLock}  ${String.fromCharCode(0x2022)}  ${this.skillName(it.skill).toUpperCase()}` : '';
    drawText(g, eyebrow, PANEL_X + 20, PROMPT_Y + 20, { font: FONT(800, 16), color: hexToRgba(P.accent, 0.95), align: 'left', maxWidth: PANEL_W - 150 });
    drawText(g, `d${it ? it.difficulty : 1}`, PANEL_R - 20, PROMPT_Y + 20, { font: FONT(800, 16), color: P.dim, align: 'right' });
    if (it && (this.phase === 'pin' || this.phase === 'resolve')) {
      const lines = wrapText(g, it.prompt, PANEL_W - 48, FONT(800, 22));
      const size = lines.length > 2 ? 18 : 22;
      const ls = lines.length > 2 ? wrapText(g, it.prompt, PANEL_W - 48, FONT(800, size)) : lines;
      const y0 = PROMPT_Y + 54 - ((Math.min(ls.length, 3) - 1) * (size + 4)) / 2;
      ls.slice(0, 3).forEach((ln, i) => drawText(g, ln, PANEL_X + PANEL_W / 2, y0 + i * (size + 4), { font: FONT(800, size), color: P.text, maxWidth: PANEL_W - 48 }));
    } else if (this.phase === 'textpin') {
      drawText(g, cfg.labels.typeHint, PANEL_X + PANEL_W / 2, PROMPT_Y + 54, { font: FONT(800, 22), color: P.dim });
    } else if (this.phase === 'lockopen') {
      drawText(g, cfg.labels.lockOpen, PANEL_X + PANEL_W / 2, PROMPT_Y + 54, { font: FONT(900, 26), color: P.accent });
    }
    // divider / laser track
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(PANEL_X + 16, LASER_Y, PANEL_W - 32, 3);
  }

  drawManuscript(g) {
    const { cfg } = this;
    const P = cfg.palette;
    const x = PANEL_X, y = PROMPT_Y, w = PANEL_W, h = TILE_Y + TILE_H - PROMPT_Y;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
    roundRect(g, x, y, w, h, 6, { fill: P.paper });
    g.restore();
    g.fillStyle = 'rgba(42,33,24,0.06)';
    for (let ly = y + 58; ly < y + h - 10; ly += 24) g.fillRect(x + 24, ly + 11, w - 48, 1);
    drawText(g, cfg.finale.title.toUpperCase(), x + 24, y + 22, { font: FONT(900, 18), color: P.ink, align: 'left' });
    drawText(g, `${this.finaleFixed}/${cfg.finale.errors} ${cfg.labels.corrected.toLowerCase()}`, x + w - 24, y + 22, { font: FONT(800, 16), color: hexToRgba(P.ink, 0.65), align: 'right' });
    // fuse / timer
    const frac = this.timerFrac();
    g.fillStyle = 'rgba(42,33,24,0.15)'; g.fillRect(x + 24, y + 40, w - 48, 4);
    g.fillStyle = frac > 0.75 ? P.laser : P.accent; g.fillRect(x + 24, y + 40, (w - 48) * (1 - frac), 4);
    g.fillStyle = P.laser; g.beginPath(); g.arc(x + 24 + (w - 48) * (1 - frac), y + 42, 5 + 2 * Math.sin(this.t * 12), 0, Math.PI * 2); g.fill();
    // lines
    const it = this.item;
    this.finaleLines.forEach((ln, i) => {
      const ly = y + 58 + i * 24 + 12;
      const isCurrent = i === this.finaleLines.length - 1 && !ln.fixed && !ln.jam;
      drawText(g, (isCurrent && it ? it.prompt : ln.text), x + 28, ly, { font: FONT(isCurrent ? 800 : 600, 17), color: isCurrent ? P.ink : hexToRgba(P.ink, 0.75), align: 'left', maxWidth: w - 200 });
      if (ln.fixed && ln.stamp > 0) {
        g.save(); g.translate(x + w - 110, ly); g.rotate(-0.12); g.scale(ln.stamp, ln.stamp);
        roundRect(g, -56, -11, 112, 22, 4, { stroke: P.good, lineWidth: 2.5 });
        drawText(g, cfg.labels.corrected, 0, 1, { font: FONT(900, 14), color: P.good });
        g.restore();
      } else if (ln.jam) {
        g.save(); g.translate(x + w - 110, ly); g.rotate(0.1);
        roundRect(g, -46, -11, 92, 22, 4, { stroke: P.bad, lineWidth: 2.5 });
        drawText(g, cfg.labels.jammed, 0, 1, { font: FONT(900, 14), color: P.bad });
        g.restore();
      }
    });
  }

  drawTiles(g) {
    const { cfg } = this;
    const P = cfg.palette;
    const paper = this.inFinale;
    const base = paper ? 'rgba(42,33,24,0.08)' : P.tile;
    const textColor = paper ? P.ink : P.tileText;
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      if (t.scale <= 0.01) continue;
      const hot = this.phase === 'pin' && (i === this.hover || i === this.cursor);
      g.save();
      g.translate(t.x + t.w / 2, t.y + t.h / 2);
      g.scale(t.scale, t.scale);
      g.translate(-t.w / 2, -t.h / 2);
      let fill = base;
      if (t.good > 0) fill = hexToRgba(P.good, 0.9);
      else if (t.reveal > 0) fill = hexToRgba(P.good, 0.25 + 0.55 * t.reveal);
      else if (hot) fill = paper ? 'rgba(42,33,24,0.18)' : shade(P.tile, 0.18);
      const stroke = t.good > 0 || t.reveal > 0 ? P.good : hot ? P.accent : paper ? 'rgba(42,33,24,0.4)' : 'rgba(255,255,255,0.16)';
      if (hot && !paper) { g.shadowColor = hexToRgba(P.accent, 0.6); g.shadowBlur = 14; }
      roundRect(g, 0, 0, t.w, t.h, this.layout === 'sentence' ? 10 : 14, { fill, stroke, lineWidth: hot || t.reveal > 0 ? 3 : 2 });
      g.shadowBlur = 0;
      if (t.flash > 0) roundRect(g, 0, 0, t.w, t.h, 12, { fill: hexToRgba(P.bad, t.flash * 0.8) });
      const col = t.good > 0 || t.flash > 0.3 ? '#fff' : textColor;
      if (t.lines) {
        const y0 = t.h / 2 - ((t.lines.length - 1) * t.lineH) / 2;
        t.lines.forEach((ln, k) => drawText(g, ln, 36 + (t.w - 48) / 2, y0 + k * t.lineH, { font: t.font, color: col, maxWidth: t.w - 60 }));
        roundRect(g, 10, t.h / 2 - 13, 26, 26, 8, { fill: paper ? 'rgba(42,33,24,0.12)' : 'rgba(255,255,255,0.12)', stroke: paper ? 'rgba(42,33,24,0.4)' : 'rgba(255,255,255,0.3)', lineWidth: 1.5 });
        drawText(g, String(t.key), 23, t.h / 2 + 1, { font: FONT(800, 16), color: col });
      } else {
        drawText(g, t.label, t.w / 2, t.h / 2 + 1, { font: t.font, color: col, maxWidth: t.w - 12 });
      }
      g.restore();
    }
    // annotation label above the revealed correct tile
    if (this.annot && this.annot.tile && this.annot.tile.reveal > 0) {
      const t = this.annot.tile;
      const label = this.annot.label || (this.item && this.item.type === 'choice' ? 'correct' : '');
      if (label) {
        const font = FONT(800, 16);
        const w = Math.ceil(measureText(g, label, font)) + 22;
        const cx = clamp(t.x + t.w / 2, PANEL_X + w / 2 + 8, PANEL_R - w / 2 - 8);
        const above = t.y - 34 > (this.inFinale ? PROMPT_Y + 50 : TILE_Y - 10);
        const ly = above ? t.y - 22 : t.y + t.h + 22;
        g.globalAlpha = t.reveal;
        roundRect(g, cx - w / 2, ly - 14, w, 28, 8, { fill: P.good });
        g.fillStyle = P.good; g.beginPath();
        if (above) { g.moveTo(cx - 7, ly + 14); g.lineTo(cx + 7, ly + 14); g.lineTo(cx, ly + 22); } else { g.moveTo(cx - 7, ly - 14); g.lineTo(cx + 7, ly - 14); g.lineTo(cx, ly - 22); }
        g.closePath(); g.fill();
        drawText(g, label, cx, ly + 1, { font, color: '#0b1a12' });
        g.globalAlpha = 1;
      }
    }
    // period after the last sentence tile
    if (this.layout === 'sentence' && this.item && this.item.visual && this.item.visual.end && this.tiles.length) {
      const last = this.tiles[this.tiles.length - 1];
      drawText(g, this.item.visual.end, last.x + last.w + 8, last.y + last.h / 2 + 6, { font: FONT(800, 24), color: paper ? P.ink : P.tileText, align: 'left' });
    }
  }

  drawLaser(g) {
    const { cfg } = this;
    const P = cfg.palette;
    if (this.inFinale) return; // the manuscript has its own fuse
    const frac = clamp(this.timerFrac(), 0, 1);
    const left = this.timeLeft();
    const x = PANEL_X + 16 + (PANEL_W - 32) * frac;
    const urgent = left <= 3;
    const alpha = urgent ? 0.55 + 0.45 * Math.abs(Math.sin(this.lowBeam)) : 0.9;
    // track fill
    g.fillStyle = hexToRgba(P.laser, 0.55); g.fillRect(PANEL_X + 16, LASER_Y, x - PANEL_X - 16, 3);
    // beam
    g.save();
    g.globalAlpha = alpha;
    g.shadowColor = P.laser; g.shadowBlur = 18;
    g.strokeStyle = P.laser; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x, LASER_Y - 2); g.lineTo(x, TILE_Y + TILE_H - 4); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, LASER_Y - 2); g.lineTo(x, TILE_Y + TILE_H - 4); g.stroke();
    g.fillStyle = P.laser; g.beginPath(); g.moveTo(x - 7, LASER_Y + 1); g.lineTo(x + 7, LASER_Y + 1); g.lineTo(x, LASER_Y + 10); g.closePath(); g.fill();
    g.restore();
    drawText(g, `${Math.ceil(left)}s`, x, LASER_Y - 12, { font: FONT(800, 16), color: urgent ? P.laser : P.dim });
  }

  drawFooter(g) {
    const { cfg, ctx } = this;
    const P = cfg.palette;
    // alarm lamps
    drawText(g, cfg.labels.alarm, 262, FOOT_Y + 16, { font: FONT(800, 16), color: P.dim, align: 'left' });
    for (let i = 0; i < cfg.alarmTicks; i++) {
      const on = i < this.alarm;
      const cx = 274 + i * 30, cy = FOOT_Y + 46;
      if (on) { g.shadowColor = P.laser; g.shadowBlur = 10 + 8 * this.alarmPulse; }
      g.fillStyle = on ? P.laser : 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(cx, cy, 10, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = on ? shade(P.laser, 0.4) : 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 10, 0, Math.PI * 2); g.stroke();
    }
    // tools
    const tx = 290 + cfg.alarmTicks * 30 + 20;
    drawText(g, cfg.labels.tools, tx, FOOT_Y + 16, { font: FONT(800, 16), color: P.dim, align: 'left' });
    for (let i = 0; i < cfg.tools; i++) {
      const have = i < this.tools;
      const x = tx + 10 + i * 28, y = FOOT_Y + 46;
      g.save(); g.translate(x, y); g.rotate(-0.6); g.globalAlpha = have ? 1 : 0.22;
      roundRect(g, -3, -14, 6, 28, 3, { fill: have ? P.metal : 'rgba(255,255,255,0.3)' });
      g.fillStyle = have ? P.accent : 'rgba(255,255,255,0.3)'; g.beginPath(); g.arc(0, -15, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = have ? shade(P.metal, -0.5) : '#000'; g.beginPath(); g.arc(0, -15, 2.5, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    // control hint
    const hintX = tx + 10 + cfg.tools * 28 + 24;
    const hintW = (ctx.input.isTouchDevice ? 630 : PANEL_R) - hintX;
    let hint = '';
    if (this.phase === 'pin') hint = this.layout === 'sentence' ? cfg.labels.sentenceHint : cfg.labels.tapHint;
    else if (this.phase === 'textpin') hint = cfg.labels.typeHint;
    else if (this.phase === 'board') hint = cfg.labels.continueHint;
    if (hint && hintW > 120) drawText(g, hint, hintX + hintW / 2, FOOT_Y + 46, { font: FONT(700, 16), color: P.dim, maxWidth: hintW - 8 });
  }

  drawBanner(g) {
    const { ctx, cfg } = this;
    const P = cfg.palette;
    const bn = this.banner;
    g.save();
    g.globalAlpha = bn.alpha;
    g.translate(bn.x, 0);
    g.fillStyle = 'rgba(5,7,14,0.82)'; g.fillRect(-10, 196, ctx.width + 20, 150);
    g.fillStyle = P.accent; g.fillRect(-10, 196, ctx.width + 20, 3); g.fillRect(-10, 343, ctx.width + 20, 3);
    drawText(g, bn.eyebrow, ctx.width / 2, 222, { font: FONT(800, 16), color: hexToRgba(P.accent, 0.95), maxWidth: ctx.width - 80 });
    drawText(g, bn.title, ctx.width / 2, 268, { font: FONT(900, 52), color: '#fff', maxWidth: ctx.width - 80, shadow: true });
    drawText(g, bn.sub, ctx.width / 2, 318, { font: FONT(700, 18), color: P.dim, maxWidth: ctx.width - 80 });
    g.restore();
  }

  drawBoard(g) {
    const { ctx, cfg } = this;
    const P = cfg.palette;
    const t = clamp(this.board.t, 0, 1);
    g.fillStyle = `rgba(0,0,0,${0.55 * t})`; g.fillRect(0, 0, ctx.width, ctx.height);
    const bw = 680, bh = 420, bx = (ctx.width - bw) / 2, by = 70 + (1 - t) * 60;
    g.save();
    g.globalAlpha = t;
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
    roundRect(g, bx, by, bw, bh, 10, { fill: '#6b4a2b' });
    g.shadowBlur = 0; g.shadowOffsetY = 0;
    roundRect(g, bx + 10, by + 10, bw - 20, bh - 20, 6, { fill: '#8a6238', stroke: 'rgba(0,0,0,0.25)', lineWidth: 2 });
    // header card
    roundRect(g, bx + bw / 2 - 170, by + 22, 340, 46, 4, { fill: P.paper });
    drawText(g, `${cfg.labels.evidence}  ${String.fromCharCode(0x2022)}  ${cfg.buildings[this.building].name} ${cfg.labels.cleared.toLowerCase()}`, bx + bw / 2, by + 45, { font: FONT(900, 18), color: P.ink, maxWidth: 320 });
    g.fillStyle = P.laser; g.beginPath(); g.arc(bx + bw / 2, by + 24, 5, 0, Math.PI * 2); g.fill();
    const rows = this.board.rows;
    const rowH = Math.min(50, (bh - 150) / Math.max(1, rows.length));
    rows.forEach((r, i) => {
      const ry = by + 90 + i * rowH;
      const cardX = bx + 40, cardW = bw - 80;
      roundRect(g, cardX, ry, cardW, rowH - 8, 4, { fill: P.paper });
      // string from header to pin
      g.strokeStyle = 'rgba(200,40,40,0.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx + bw / 2, by + 24); g.lineTo(cardX + 14, ry + 6); g.stroke();
      // pin
      g.save(); g.translate(cardX + 14, ry + 6); g.scale(r.pin, r.pin);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(2, 3, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = P.laser; g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-2, -2, 2, 0, Math.PI * 2); g.fill();
      g.restore();
      drawText(g, r.name, cardX + 30, ry + (rowH - 8) / 2, { font: FONT(800, 17), color: P.ink, align: 'left', maxWidth: 230 });
      // bar
      const barX = cardX + 280, barW = cardW - 280 - 120;
      roundRect(g, barX, ry + (rowH - 8) / 2 - 7, barW, 14, 7, { fill: 'rgba(42,33,24,0.15)' });
      const acc = r.seen ? r.acc : 0;
      if (acc > 0) roundRect(g, barX, ry + (rowH - 8) / 2 - 7, Math.max(14, barW * acc * r.bar), 14, 7, { fill: acc >= 0.7 ? P.good : acc >= 0.4 ? P.accent : P.bad });
      drawText(g, r.seen ? `${r.correct}/${r.seen}  ${String.fromCharCode(0x2022)}  lvl ${r.difficulty}` : 'not yet seen', cardX + cardW - 12, ry + (rowH - 8) / 2, { font: FONT(700, 15), color: hexToRgba(P.ink, 0.75), align: 'right' });
    });
    drawText(g, cfg.labels.continueHint, bx + bw / 2, by + bh - 28, { font: FONT(800, 17), color: '#fff', shadow: true });
    g.restore();
  }
}
