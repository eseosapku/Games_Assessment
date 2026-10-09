// mechanics/lane-runner/mechanic.js
// "Lane Runner": a content-agnostic pseudo-3D lane runner. The hero auto-runs down a three-lane
// track; every few seconds a prompt appears in the banner and one gate per lane rolls toward the
// player, each carrying a candidate answer. Steering into a gate IS the answer. Correct: speed
// boost, coins, combo, confetti. Wrong: the run freezes, the chosen gate flashes red, the correct
// gate glows green and an in-canvas card shows the correct answer, the explanation and the item's
// visual (tenframe / numberline / baseten) until the player taps or presses a key.
// Session: N stages (biomes) of M gates each, a "stage cleared" breather between them, then a
// finale ("Bridge Builder"): K gates in a row build planks across a gap; a miss drops a plank and
// replays the item with its hint. Crossing the bridge ends the run.
// Everything subject-specific (names, colours, biomes, labels, speeds, counts, sprite styles)
// comes from config. The mechanic only sees items from ctx.nextItem() and grades via ctx.answer().
import { drawText, wrapText, roundRect, clamp, lerp, hexToRgba, shade, Easing } from '../../kit/kit.js';

const FONT = 'Nunito, "Segoe UI", system-ui, sans-serif';
const f = (weight, size) => `${weight} ${size}px ${FONT}`;

export const meta = {
  id: 'lane-runner',
  name: 'Lane Runner',
  description: 'Auto-running hero on a three-lane track. Steer through the gate that answers the prompt; every gate is a decision at speed.',
  itemTypes: ['choice'],
  choices: 3,
  configSchema: {
    lanes: 'Number of lanes, 2 or 3 (3). One gate per lane, so items need this many choices.',
    approachSec: 'Seconds a gate set takes to reach the hero at stage 1 (4.5)',
    approachPerStage: 'Multiplier applied to approachSec each new stage (0.84)',
    minDecisionSec: 'Floor for the gate approach time (2.5)',
    gapSec: 'Seconds between a gate set passing and the next one spawning (1.6)',
    lives: 'Hearts per stage; hearts refill at each stage (3)',
    livesOut: "'retry-stage' replays the stage once when hearts run out, then continues; 'end' ends the run ('retry-stage')",
    stages: 'Number of stages / biomes (3). Uses biomes[i % biomes.length].',
    gatesPerStage: 'Gate sets per stage (12)',
    biomes: 'Array of { name, sky:[top,bottom], far, farStyle, ground, groundDark, road, roadLine, water, props:[kinds], music, accent }',
    coinsBetweenGates: 'Coin trails between gate sets (true)',
    hazards: 'Rolling obstacles between gates; cost score, not hearts (false)',
    hazardsFromStage: 'First stage (1-based) that has hazards when hazards is true (2)',
    heroStyle: "Procedural hero look: 'critter' | 'robot' | 'blob' ('critter')",
    heroColor: 'Hero body colour (#ff9f43)',
    heroAccent: 'Hero belly / visor colour (#fff4e0)',
    gateStyle: "Gate look: 'arch' | 'flag' | 'ring' ('arch')",
    gateColors: 'One colour per lane for gates (3 candy colours)',
    coinColor: 'Coin colour (#ffd54a)',
    pointsPerGate: 'Base points for a correct gate (50)',
    pointsPerDifficulty: 'Extra points per item difficulty level (10)',
    coinPoints: 'Points per coin (5)',
    hazardPenalty: 'Points lost when hitting a hazard (20)',
    finale: '{ type:"bridge", gates:3, skills:null|[...ids], pointsPerPlank:150 } or null for no finale',
    lifeBonusXP: 'Bonus XP per heart left at the end (10)',
    finaleBonusXP: 'Bonus XP for completing the finale (50)',
    speak: "'auto' speaks prompts/hints for the early band only; true always; false never ('auto')",
    labels: 'All UI strings: getReady, go, stageClear, tryAgain, finaleTitle, finaleIntro, bridgeDone, notQuite, answerIs, tapToContinue, coins, hazard, gatesStat, coinsStat, bridgeStat, stageStat',
  },
};

export const defaultConfig = {
  lanes: 3,
  approachSec: 4.5,
  approachPerStage: 0.84,
  minDecisionSec: 2.5,
  gapSec: 1.6,
  lives: 3,
  livesOut: 'retry-stage',
  stages: 3,
  gatesPerStage: 12,
  biomes: [
    { name: 'Meadow', sky: ['#5fb8ff', '#dff4ff'], far: '#7cc96e', farStyle: 'hills', ground: '#86d46f', groundDark: '#5aae4e', road: '#e8c79c', roadLine: '#fff6dc', water: false, props: ['lollipop', 'bush', 'flower'], music: 'calm', accent: '#ff7fb0' },
    { name: 'River', sky: ['#3f8fe0', '#bfe9ff'], far: '#4f9c8a', farStyle: 'trees', ground: '#6cc3b4', groundDark: '#3e978d', road: '#d9b98f', roadLine: '#fff1cf', water: true, props: ['reed', 'rock', 'bush'], music: 'upbeat', accent: '#4fd1ff' },
    { name: 'Mountain', sky: ['#5a4fd6', '#ffb28a'], far: '#7d6fa8', farStyle: 'peaks', ground: '#9aa7c2', groundDark: '#6d7a99', road: '#c9b7a8', roadLine: '#fff6ea', water: false, props: ['pine', 'rock', 'pine'], music: 'tense', accent: '#ffd54a' },
  ],
  coinsBetweenGates: true,
  hazards: false,
  hazardsFromStage: 2,
  heroStyle: 'critter',
  heroColor: '#ff9f43',
  heroAccent: '#fff4e0',
  gateStyle: 'arch',
  gateColors: ['#ff6fa6', '#5b8cff', '#3ad29f'],
  coinColor: '#ffd54a',
  pointsPerGate: 50,
  pointsPerDifficulty: 10,
  coinPoints: 5,
  hazardPenalty: 20,
  finale: { type: 'bridge', gates: 3, skills: null, pointsPerPlank: 150 },
  lifeBonusXP: 10,
  finaleBonusXP: 50,
  speak: 'auto',
  labels: {
    getReady: 'Get ready!',
    go: 'Go!',
    stageClear: '{name} cleared!',
    nextStage: 'Next: {name}',
    tryAgain: 'Try this part again',
    finaleTitle: 'Bridge Builder',
    finaleIntro: 'Pick {n} gates in a row to build the bridge',
    bridgeDone: 'Bridge built!',
    notQuite: 'Not quite',
    answerIs: 'The answer is',
    tapToContinue: 'Tap or press any key to continue',
    tapToSkip: 'Tap to continue',
    hazard: 'Ouch!',
    gatesStat: 'Gates passed',
    coinsStat: 'Coins',
    bridgeStat: 'Bridge',
    stageStat: 'Stage reached',
  },
};

// ---- world geometry (logical pixels) ----
const W = 960, H = 540;
const CX = 480;
const HORIZON_Y = 212;
const PLAYER_Y = 452;
const SPAWN_D = 100;          // world units from spawn to the hero
const ROAD_HALF_FAR = 22;
const ROAD_HALF_NEAR = 400;
const BANNER_Y = 62;
const BANNER_H = 64;
const HINT_Y = 146;
const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'];

const depth = d => Math.pow(Math.max(0, 1 - d / SPAWN_D), 1.6);          // 0 at horizon, 1 at the hero, >1 behind
const screenY = t => HORIZON_Y + (PLAYER_Y - HORIZON_Y) * t;
const roadHalf = t => ROAD_HALF_FAR + (ROAD_HALF_NEAR - ROAD_HALF_FAR) * t;

export class Mechanic {
  constructor(ctx) {
    this.ctx = ctx;
    const cfg = { ...defaultConfig, ...ctx.config };
    cfg.labels = { ...defaultConfig.labels, ...(ctx.config.labels || {}) };
    cfg.finale = ctx.config.finale === null ? null : { ...defaultConfig.finale, ...(ctx.config.finale || {}) };
    cfg.biomes = Array.isArray(cfg.biomes) && cfg.biomes.length ? cfg.biomes.map((b, i) => ({ ...defaultConfig.biomes[i % defaultConfig.biomes.length], ...b })) : defaultConfig.biomes;
    cfg.lanes = clamp(Math.round(cfg.lanes) || 3, 2, 3);
    cfg.stages = Math.max(1, Math.round(cfg.stages) || 1);
    cfg.gatesPerStage = Math.max(1, Math.round(cfg.gatesPerStage) || 1);
    this.cfg = cfg;
  }

  // ---------- helpers ----------
  laneX(lane, t) { return CX + (lane - (this.cfg.lanes - 1) / 2) * (2 * roadHalf(t) / this.cfg.lanes); }
  laneW(t) { return 2 * roadHalf(t) / this.cfg.lanes; }
  biome() { return this.cfg.biomes[this.stageIndex % this.cfg.biomes.length]; }
  approachFor(stage) { return Math.max(this.cfg.minDecisionSec, this.cfg.approachSec * Math.pow(this.cfg.approachPerStage, stage)); }
  n(count) { return this.ctx.reducedMotion ? Math.ceil(count / 2) : count; }
  shouldSpeak() { return this.cfg.speak === true || (this.cfg.speak === 'auto' && this.ctx.gradeBand === 'early'); }
  totalGates() { return this.cfg.stages * this.cfg.gatesPerStage + (this.cfg.finale ? this.cfg.finale.gates : 0); }
  label(key, vars) {
    let s = String(this.cfg.labels[key] ?? defaultConfig.labels[key] ?? key);
    if (vars) for (const k in vars) s = s.replace('{' + k + '}', String(vars[k]));
    return s;
  }

  // ---------- lifecycle ----------
  init() {
    const { ctx, cfg } = this;
    const skills = ctx.content.skills || {};
    this.choiceSkills = Object.keys(skills).filter(s => (skills[s].types || ['choice']).includes('choice'));
    if (!this.choiceSkills.length) throw new Error('lane-runner: the content pack must declare at least one skill with type "choice"');
    this.finaleSkills = cfg.finale && Array.isArray(cfg.finale.skills) ? cfg.finale.skills.filter(s => this.choiceSkills.includes(s)) : [];

    this.time = 0;
    this.phase = 'intro';
    this.phaseT = 0;
    this.ended = false;
    this.stageIndex = 0;
    this.prevBiomeIndex = 0;
    this.biomeMix = 1;
    this.gatesDone = 0;
    this.totalPassed = 0;
    this.correctCount = 0;
    this.totalCount = 0;
    this.coinsTaken = 0;
    this.coinStreak = 0;
    this.lives = cfg.lives;
    this.retriedStage = false;
    this.inFinale = false;
    this.planks = 0;
    this.plankDrop = 0;
    this.plankSlam = 0;
    this.bridgeBuilt = false;
    this.replayItem = null;
    this.lane = Math.floor(cfg.lanes / 2);
    this.heroPos = this.lane;
    this.heroLean = 0;
    this.stumble = 0;
    this.boost = 0;
    this.speedMul = 1;
    this.speedTarget = 1;
    this.dist = 0;
    this.approach = this.approachFor(0);
    this.nextSpawn = 0;
    this.set = null;
    this.frozenSet = null;
    this.passedSets = [];
    this.coins = [];
    this.hazards = [];
    this.props = [];
    this.clouds = [];
    this.drawList = [];
    this.keyFlag = false;
    this.inputCooldown = 0;
    this.hintText = null;
    this.hintT = 0;
    this.card = null;
    this.flash = 0;
    this.bannerPop = 0;
    this.unsubs = [];
    this._grads = {};
    this.tapStart = null;
    this.musicIntensity = 0.5;

    const rng = ctx.rng;
    for (let i = 0; i < 34; i++) {
      this.props.push({ side: i % 2 === 0 ? -1 : 1, d: (i / 34) * SPAWN_D + rng.float(0, 3), variant: rng.int(0, 2), off: rng.float(0, 1), size: rng.float(0.8, 1.25), sway: rng.float(0, Math.PI * 2) });
    }
    for (let i = 0; i < 6; i++) this.clouds.push({ x: rng.float(0, W), y: rng.float(40, 160), s: rng.float(0.6, 1.3), v: rng.float(6, 14) });

    ctx.hud.set({ score: 0, streak: 0, lives: this.lives, maxLives: cfg.lives, level: 1, levelLabel: `${this.biome().name} 1/${cfg.stages}`, progress: 0, combo: 0 });
    if (ctx.input.isTouchDevice) {
      ctx.input.addTouchButton({ id: 'lane-left', x: 18, y: 452, w: 112, h: 72, label: '◀', code: 'ArrowLeft' });
      ctx.input.addTouchButton({ id: 'lane-right', x: W - 18 - 112, y: 452, w: 112, h: 72, label: '▶', code: 'ArrowRight' });
    }
    this.unsubs.push(ctx.input.onKeyDown(code => { if (code !== 'Escape' && code !== 'KeyP') this.keyFlag = true; }));
    this.unsubs.push(ctx.input.onSwipe(dir => {
      if (this.phase !== 'run' && this.phase !== 'intro') return;
      if (dir === 'left') this.setLane(this.lane - 1); else if (dir === 'right') this.setLane(this.lane + 1);
      this.tapStart = null;
    }));
    this.unsubs.push(ctx.input.onPointerDown((x, y) => { this.tapStart = { x, y }; }));
    this.unsubs.push(ctx.input.onPointerUp((x, y) => {
      const s = this.tapStart; this.tapStart = null;
      if (!s || Math.hypot(x - s.x, y - s.y) > 24) return;
      if (this.phase !== 'run' && this.phase !== 'intro') return;
      if (y < HORIZON_Y - 30) return;             // the banner area is not a lane
      this.setLane(clamp(Math.floor((x / W) * cfg.lanes), 0, cfg.lanes - 1));
    }));
    this.unsubs.push(ctx.on('answer', d => { this.totalCount++; if (d.correct) this.correctCount++; }));
    this.unsubs.push(ctx.on('pause', () => ctx.audio.music.setIntensity(0.12)));
    this.unsubs.push(ctx.on('resume', () => ctx.audio.music.setIntensity(this.musicIntensity)));
    this.startMusic(this.biome().music || 'calm', 0.45);
    this.bannerPop = 0;
    ctx.tweens.add(this, { bannerPop: 1 }, 0.6, { ease: Easing.easeOutBack });
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
    this.set = null; this.frozenSet = null; this.passedSets.length = 0; this.coins.length = 0; this.hazards.length = 0;
  }

  onPause() { this.ctx.audio.music.setIntensity(0.12); }
  onResume() { this.ctx.audio.music.setIntensity(this.musicIntensity); }

  startMusic(track, intensity) {
    this.musicIntensity = intensity;
    this.ctx.audio.music.start(track);
    this.ctx.audio.music.setIntensity(intensity);
  }

  // ---------- lanes ----------
  setLane(l) {
    const nl = clamp(l, 0, this.cfg.lanes - 1);
    if (nl === this.lane) return;
    this.heroLean = nl > this.lane ? 1 : -1;
    this.lane = nl;
    this.ctx.audio.play('tick', { volume: 0.5, pitch: 1.1 });
    this.ctx.tweens.killTarget(this);
    this.ctx.tweens.add(this, { heroPos: nl, heroLean: 0 }, 0.22, { ease: Easing.easeOutCubic });
  }

  // ---------- gate sets ----------
  spawnSet() {
    const { ctx, cfg } = this;
    let item = this.replayItem;
    const replay = !!item;
    this.replayItem = null;
    if (!item) {
      const opts = { type: 'choice', choices: cfg.lanes };
      if (this.inFinale && this.finaleSkills.length) opts.skill = ctx.rng.pick(this.finaleSkills);
      for (let attempt = 0; attempt < 4; attempt++) {
        item = ctx.nextItem(opts);
        if (item.type === 'choice' && item.choices.length >= 2) break;
      }
      if (!item || item.type !== 'choice') throw new Error('lane-runner: content did not supply a choice item');
    }
    // Map choices onto lanes: always include the correct one; fill the rest with distractors.
    const idx = item.choices.map((_, i) => i).filter(i => i !== item.correct);
    ctx.rng.shuffle(idx);
    const shown = [item.correct, ...idx.slice(0, cfg.lanes - 1)];
    ctx.rng.shuffle(shown);
    const set = { d: SPAWN_D, item, gates: [], resolved: false, correctLane: -1, chosenLane: -1, spawnedAt: performance.now(), pop: 0 };
    for (let lane = 0; lane < cfg.lanes; lane++) {
      const ci = shown[lane];
      if (ci === undefined) continue;
      if (ci === item.correct) set.correctLane = lane;
      set.gates.push({ lane, index: ci, label: item.choices[ci], color: cfg.gateColors[lane % cfg.gateColors.length], set, flash: 0 });
    }
    this.set = set;
    ctx.tweens.add(set, { pop: 1 }, 0.5, { ease: Easing.easeOutBack });
    // hint after two misses on this skill (or on a finale replay)
    const wantHint = item.hint && (replay || ctx.adaptive.needsHint(item.skill));
    this.hintText = wantHint ? item.hint : null;
    this.hintT = 0;
    if (this.shouldSpeak()) {
      const speech = item.speech || item.prompt;
      ctx.speak(wantHint ? `${speech}. ${item.hint}` : speech);
    }
    this.bannerPop = 0.6;
    ctx.tweens.add(this, { bannerPop: 1 }, 0.45, { ease: Easing.easeOutBack });
    ctx.audio.play('whoosh', { volume: 0.4 });
    // coins and hazards behind the set
    if (cfg.coinsBetweenGates && !this.inFinale) {
      const lane = ctx.rng.int(0, cfg.lanes - 1);
      const count = ctx.rng.int(4, 6);
      for (let k = 0; k < count; k++) this.coins.push({ lane, d: SPAWN_D + 9 + k * 5, taken: false, spin: ctx.rng.float(0, 6) });
      if (cfg.hazards && this.stageIndex + 1 >= cfg.hazardsFromStage && ctx.rng.chance(0.4)) {
        let hl = ctx.rng.int(0, cfg.lanes - 1);
        if (hl === lane) hl = (hl + 1) % cfg.lanes;
        this.hazards.push({ lane: hl, d: SPAWN_D + 22, hit: false, rot: 0 });
      }
    }
  }

  resolveSet(set) {
    const { ctx } = this;
    set.resolved = true;
    set.chosenLane = this.lane;
    const gate = set.gates.find(g => g.lane === this.lane) || set.gates[0];
    const responseMs = Math.round(performance.now() - set.spawnedAt);
    const res = ctx.answer(set.item, gate.index, { responseMs });
    if (res.correct) this.onCorrect(set, gate); else this.onWrong(set, gate, res);
  }

  onCorrect(set, gate) {
    const { ctx, cfg } = this;
    const hx = this.laneX(this.heroPos, 1), hy = PLAYER_Y - 60;
    let pts = cfg.pointsPerGate + cfg.pointsPerDifficulty * (set.item.difficulty || 1);
    if (this.inFinale) pts += cfg.finale.pointsPerPlank;
    if (ctx.streak >= 5) pts *= 2;
    ctx.addScore(pts, { x: hx, y: hy - 30 });
    this.burst(hx, hy, gate.color, 1.1);
    ctx.audio.play('pop', { pitch: 1 + Math.min(0.5, ctx.streak * 0.04) });
    this.boost = 1;
    this.flash = 0.35;
    ctx.hud.set({ combo: ctx.streak >= 2 ? ctx.streak : 0 });
    if (ctx.streak === 5 || ctx.streak === 10) {
      ctx.audio.play(ctx.streak === 5 ? 'powerup' : 'combo');
      ctx.floatingText.add(ctx.streak === 5 ? 'x2 XP!' : `${ctx.streak} in a row!`, CX, 300, { color: '#ffd54a', size: 36, duration: 1.2, vy: -30 });
      if (!ctx.reducedMotion) ctx.shake.shake(4, 0.2);
    } else if (ctx.streak >= 3 && ctx.streak % 3 === 0) {
      ctx.audio.play('combo', { volume: 0.7 });
    }
    this.passedSets.push(set);
    this.set = null;
    this.gatesDone++;
    this.totalPassed++;
    this.hintText = null;
    if (this.inFinale) {
      this.planks++;
      this.plankSlam = 1;
      ctx.audio.play('hit', { volume: 0.8, pitch: 0.7 });
      if (!ctx.reducedMotion) ctx.shake.shake(8, 0.3);
      ctx.particles.burst({ x: CX, y: 380, count: this.n(24), colors: ['#c98b4a', '#f0c58a', '#fff'], speed: 260, life: 0.7, size: 7, gravity: 500, shape: 'square' });
      if (this.planks >= cfg.finale.gates) {
        this.bridgeBuilt = true;
        this.nextSpawn = 1e9;
        ctx.tweens.delay(0.9, () => this.beginCrossing());
        return;
      }
    }
    this.nextSpawn = cfg.gapSec;
    ctx.hud.set({ progress: this.totalPassed / this.totalGates() });
  }

  onWrong(set, gate, res) {
    const { ctx } = this;
    set.d = 0;
    this.frozenSet = set;
    this.set = null;
    gate.flash = 1;
    this.speedTarget = 0;
    this.stumble = 1;
    this.coinStreak = 0;
    ctx.audio.play('hit', { volume: 0.7 });
    if (!ctx.reducedMotion) ctx.shake.shake(5, 0.2);
    ctx.hud.set({ combo: 0 });
    if (!this.inFinale) this.loseLife();
    else { this.plankDrop = 1; ctx.audio.play('buzz', { volume: 0.5 }); }
    this.phase = 'resolve';
    this.phaseT = 0;
    this.card = { item: set.item, correctText: res.correctText, lines: null, scale: 0 };
    if (this.shouldSpeak()) ctx.speak(`${this.label('answerIs')} ${res.correctText}. ${set.item.explanation}`);
  }

  loseLife() {
    this.lives = Math.max(0, this.lives - 1);
    this.ctx.hud.set({ lives: this.lives });
    this.ctx.hud.flash('lives', '#ff5d7a');
    this.ctx.hud.pulse('lives');
  }

  openCard() {
    this.phase = 'card';
    this.phaseT = 0;
    this.ctx.tweens.add(this.card, { scale: 1 }, 0.4, { ease: Easing.easeOutBack });
  }

  dismissCard() {
    const { ctx, cfg } = this;
    const set = this.frozenSet;
    this.frozenSet = null;
    this.card = null;
    if (set) { set.d = -1; this.passedSets.push(set); }
    ctx.audio.play('whoosh', { volume: 0.5 });
    ctx.input.flush();
    this.inputCooldown = 0.2;
    this.speedTarget = 1;
    this.phase = 'run';
    this.phaseT = 0;
    this.nextSpawn = cfg.gapSec * 0.8;
    if (this.inFinale) {
      this.replayItem = set ? set.item : null;      // replay the missed item with its hint
    } else {
      this.gatesDone++;
      this.totalPassed++;
      ctx.hud.set({ progress: this.totalPassed / this.totalGates() });
      if (this.lives <= 0) {
        if (cfg.livesOut === 'end') { this.finish(); return; }
        this.lives = cfg.lives;
        ctx.hud.set({ lives: this.lives });
        if (!this.retriedStage) {
          this.retriedStage = true;
          this.totalPassed -= this.gatesDone;
          this.gatesDone = 0;
          ctx.hud.set({ progress: this.totalPassed / this.totalGates() });
          this.phase = 'retry';
          this.phaseT = 0;
          this.nextSpawn = 0.6;
          ctx.audio.play('buzz', { volume: 0.5 });
        }
      }
    }
  }

  // ---------- stages ----------
  stageClear() {
    const { ctx, cfg } = this;
    this.phase = 'stageClear';
    this.phaseT = 0;
    this.bannerPop = 0;
    ctx.tweens.add(this, { bannerPop: 1 }, 0.7, { ease: Easing.easeOutBack });
    ctx.audio.play('levelup');
    ctx.audio.play('fanfare', { volume: 0.6 });
    if (!ctx.reducedMotion) ctx.shake.shake(7, 0.3);
    this.lives = cfg.lives;
    ctx.hud.set({ lives: this.lives });
    this.confetti();
    this.coins.length = 0;
    this.hazards.length = 0;
  }

  beginStage(i) {
    const { ctx, cfg } = this;
    this.prevBiomeIndex = this.stageIndex;
    this.stageIndex = i;
    this.gatesDone = 0;
    this.retriedStage = false;
    this.approach = this.approachFor(i);
    this.biomeMix = 0;
    ctx.tweens.add(this, { biomeMix: 1 }, 1.4);
    const b = this.biome();
    ctx.hud.set({ level: i + 1, levelLabel: `${b.name} ${i + 1}/${cfg.stages}` });
    ctx.hud.pulse('level');
    this.startMusic(b.music || 'calm', 0.45 + 0.2 * i);
    this.phase = 'run';
    this.phaseT = 0;
    this.nextSpawn = 1.0;
    this.bannerPop = 0;
    ctx.tweens.add(this, { bannerPop: 1 }, 0.5, { ease: Easing.easeOutBack });
  }

  beginFinaleIntro() {
    const { ctx, cfg } = this;
    this.phase = 'finaleIntro';
    this.phaseT = 0;
    this.inFinale = true;
    this.planks = 0;
    this.approach = Math.max(this.approachFor(cfg.stages - 1), cfg.minDecisionSec + 0.4);
    this.coins.length = 0;
    this.hazards.length = 0;
    this.lives = cfg.lives;
    ctx.hud.set({ lives: this.lives, levelLabel: this.label('finaleTitle') });
    ctx.hud.pulse('level');
    this.startMusic('boss', 0.85);
    ctx.audio.play('fanfare', { volume: 0.5 });
    if (!ctx.reducedMotion) ctx.shake.shake(6, 0.3);
    this.bannerPop = 0;
    ctx.tweens.add(this, { bannerPop: 1 }, 0.7, { ease: Easing.easeOutBack });
    if (this.shouldSpeak()) ctx.speak(`${this.label('finaleTitle')}. ${this.label('finaleIntro', { n: cfg.finale.gates })}`);
  }

  beginCrossing() {
    if (this.ended) return;
    const { ctx } = this;
    this.phase = 'crossing';
    this.phaseT = 0;
    this.bannerPop = 0;
    ctx.tweens.add(this, { bannerPop: 1 }, 0.6, { ease: Easing.easeOutBack });
    ctx.audio.play('fanfare');
    this.confetti();
    if (!ctx.reducedMotion) ctx.shake.shake(6, 0.35);
    ctx.tweens.delay(2.8, () => this.finish());
  }

  finish() {
    if (this.ended) return;
    this.ended = true;
    const { ctx, cfg } = this;
    const bonusXP = this.lives * cfg.lifeBonusXP + (this.bridgeBuilt ? cfg.finaleBonusXP : 0);
    const stats = [
      { label: this.label('gatesStat'), value: this.totalPassed },
      { label: this.label('coinsStat'), value: this.coinsTaken },
      { label: this.label('stageStat'), value: this.inFinale ? this.label('finaleTitle') : `${this.stageIndex + 1}/${cfg.stages}` },
    ];
    if (cfg.finale) stats.push({ label: this.label('bridgeStat'), value: this.bridgeBuilt ? `${this.planks}/${cfg.finale.gates}` : `${this.planks}/${cfg.finale.gates}` });
    ctx.endGame({ score: ctx.score, correct: this.correctCount, total: this.totalCount, bonusXP, stats });
  }

  // ---------- juice ----------
  burst(x, y, color, k) {
    const p = this.ctx.particles;
    p.burst({ x, y, count: this.n(Math.round(26 * k)), colors: [color, '#ffffff', shade(color, 0.45)], speed: 300 * k, life: 0.8, size: 9, gravity: 380, friction: 0.92 });
    p.burst({ x, y, count: this.n(Math.round(10 * k)), colors: ['#ffd54a', '#fff'], speed: 220 * k, life: 0.9, size: 12, gravity: 220, shape: 'star' });
    p.burst({ x, y, count: this.n(Math.round(12 * k)), colors: [color], speed: 460 * k, life: 0.35, size: 6, shape: 'spark', friction: 0.85 });
  }
  confetti() {
    const cols = [...this.cfg.gateColors, '#ffd54a', '#ffffff'];
    this.ctx.particles.burst({ x: CX, y: 140, count: this.n(70), colors: cols, speed: 380, life: 1.4, size: 9, gravity: 320, shape: 'square', friction: 0.95 });
    this.ctx.particles.burst({ x: CX, y: 160, count: this.n(24), colors: ['#ffd54a', '#fff'], speed: 300, life: 1.2, size: 12, gravity: 240, shape: 'star' });
  }

  // ---------- frame ----------
  update(dt) {
    if (this.ended) return;
    const { ctx, cfg } = this;
    const inp = ctx.input;
    this.time += dt;
    this.phaseT += dt;
    this.inputCooldown = Math.max(0, this.inputCooldown - dt);
    this.boost = Math.max(0, this.boost - dt / 1.2);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.stumble = Math.max(0, this.stumble - dt * 1.6);
    this.plankDrop = Math.max(0, this.plankDrop - dt * 1.2);
    this.plankSlam = Math.max(0, this.plankSlam - dt * 2.2);
    this.hintT += dt;
    this.speedMul += (this.speedTarget - this.speedMul) * Math.min(1, dt * (this.speedTarget < this.speedMul ? 9 : 4));
    for (const c of this.clouds) { c.x += c.v * c.s * dt; if (c.x > W + 120) c.x = -120; }

    // phase logic first so a dismiss key is not also read as a lane change
    const tapped = inp.pointer.justDown || this.keyFlag;
    switch (this.phase) {
      case 'intro':
        if (this.phaseT > 1.4) { this.phase = 'run'; this.phaseT = 0; this.nextSpawn = 0.15; }
        break;
      case 'resolve':
        if (this.phaseT > 0.8) this.openCard();
        break;
      case 'card':
        if (this.phaseT > 0.6 && tapped) { this.dismissCard(); this.keyFlag = false; return; }
        break;
      case 'stageClear':
        if (this.phaseT > 3.8 || (this.phaseT > 0.9 && tapped)) this.beginStage(this.stageIndex + 1);
        break;
      case 'retry':
        if (this.phaseT > 2.4 || (this.phaseT > 0.9 && tapped)) { this.phase = 'run'; this.phaseT = 0; }
        break;
      case 'finaleIntro':
        if (this.phaseT > 3.4 || (this.phaseT > 0.9 && tapped)) { this.phase = 'run'; this.phaseT = 0; this.nextSpawn = 0.4; }
        break;
      default: break;
    }
    this.keyFlag = false;

    // steering
    const steer = (this.phase === 'run' || this.phase === 'intro' || this.phase === 'crossing') && this.inputCooldown <= 0;
    if (steer) {
      if (inp.wasPressed('ArrowLeft') || inp.wasPressed('KeyA')) this.setLane(this.lane - 1);
      if (inp.wasPressed('ArrowRight') || inp.wasPressed('KeyD')) this.setLane(this.lane + 1);
      for (let k = 0; k < DIGITS.length; k++) if (inp.wasPressed(DIGITS[k]) && (k % 3) < cfg.lanes) this.setLane(k % 3);
    }

    // world motion
    const moving = this.phase === 'run' || this.phase === 'intro' || this.phase === 'crossing' || this.phase === 'stageClear' || this.phase === 'finaleIntro' || this.phase === 'retry';
    const v = moving ? (SPAWN_D / this.approach) * this.speedMul * (1 + 0.7 * this.boost) : 0;
    const step = v * dt;
    this.dist += step;
    for (const p of this.props) { p.d -= step; if (p.d < -26) { p.d += SPAWN_D + 26 + ctx.rng.float(0, 4); p.variant = ctx.rng.int(0, 2); p.off = ctx.rng.float(0, 1); } }

    // coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.d -= step; c.spin += dt * 4;
      if (!c.taken && c.d <= 0 && c.d > -3 && this.lane === c.lane && this.phase === 'run') {
        c.taken = true;
        this.coinsTaken++;
        this.coinStreak++;
        const x = this.laneX(c.lane, 1);
        ctx.audio.play('coin', { pitch: 1 + Math.min(0.6, 0.06 * this.coinStreak), volume: 0.8 });
        ctx.addScore(cfg.coinPoints, { x, y: PLAYER_Y - 110 });
        ctx.particles.burst({ x, y: PLAYER_Y - 50, count: this.n(8), colors: [cfg.coinColor, '#fff'], speed: 200, life: 0.5, size: 6, gravity: 300, shape: 'star' });
      }
      if (c.d < -26 || c.taken) { if (c.taken && c.d > -1) continue; this.coins.splice(i, 1); }
    }
    if (this.coins.length === 0) this.coinStreak = Math.min(this.coinStreak, 0);
    // hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.d -= step; h.rot += step * 0.5;
      if (!h.hit && h.d <= 0 && h.d > -3 && this.lane === h.lane && this.phase === 'run') {
        h.hit = true;
        this.stumble = 1;
        this.coinStreak = 0;
        ctx.audio.play('buzz', { volume: 0.6 });
        if (!ctx.reducedMotion) ctx.shake.shake(5, 0.2);
        ctx.addScore(-cfg.hazardPenalty, { x: this.laneX(h.lane, 1), y: PLAYER_Y - 110, label: this.label('hazard') });
      }
      if (h.d < -26) this.hazards.splice(i, 1);
    }
    // gate sets
    const set = this.set;
    if (set) {
      set.d -= step;
      if (set.d <= 0 && !set.resolved && this.phase === 'run') this.resolveSet(set);
      else if (set.d <= 0 && !set.resolved) set.d = 0.01;      // wait for the run phase (e.g. during a banner)
    }
    for (let i = this.passedSets.length - 1; i >= 0; i--) {
      const s = this.passedSets[i];
      s.d -= step;
      for (const g of s.gates) g.flash = Math.max(0, g.flash - dt * 1.5);
      if (s.d < -28) this.passedSets.splice(i, 1);
    }
    if (this.frozenSet) for (const g of this.frozenSet.gates) g.flash = Math.max(0.35, g.flash - dt * 0.4);

    // spawning and stage flow
    if (this.phase === 'run') {
      this.nextSpawn -= dt;
      const stageTarget = this.inFinale ? cfg.finale.gates : cfg.gatesPerStage;
      const stageDone = this.inFinale ? this.planks >= stageTarget : this.gatesDone >= stageTarget;
      if (!this.set && !stageDone && this.nextSpawn <= 0) this.spawnSet();
      else if (!this.set && stageDone && !this.inFinale) {
        if (this.stageIndex < cfg.stages - 1) this.stageClear();
        else if (cfg.finale && cfg.finale.gates > 0) this.beginFinaleIntro();
        else this.finish();
      }
    }
  }

  // ---------- rendering ----------
  _grad(g, key, make) {
    let gr = this._grads[key];
    if (!gr) { gr = make(); this._grads[key] = gr; }
    return gr;
  }

  render(g) {
    const b = this.biome();
    if (this.biomeMix < 1) {
      this.drawBackground(g, this.cfg.biomes[this.prevBiomeIndex % this.cfg.biomes.length], this.prevBiomeIndex);
      g.globalAlpha = this.biomeMix;
      this.drawBackground(g, b, this.stageIndex);
      g.globalAlpha = 1;
    } else this.drawBackground(g, b, this.stageIndex);
    this.drawRoad(g, b);
    if (this.inFinale) this.drawBridge(g, b);
    this.drawObjects(g, b);
    if (this.boost > 0.05 && !this.ctx.reducedMotion) this.drawSpeedLines(g);
    if (this.flash > 0) { g.fillStyle = `rgba(255,255,255,${this.flash * 0.25})`; g.fillRect(0, 0, W, H); }
    this.drawBanner(g, b);
    this.drawPhaseOverlay(g, b);
  }

  drawBackground(g, b, idx) {
    const sky = this._grad(g, 'sky' + idx, () => { const gr = g.createLinearGradient(0, 0, 0, HORIZON_Y + 40); gr.addColorStop(0, b.sky[0]); gr.addColorStop(1, b.sky[1]); return gr; });
    g.fillStyle = sky; g.fillRect(0, 0, W, HORIZON_Y + 2);
    // sun
    const sun = this._grad(g, 'sun' + idx, () => { const gr = g.createRadialGradient(790, 110, 10, 790, 110, 110); gr.addColorStop(0, 'rgba(255,255,230,0.95)'); gr.addColorStop(0.25, 'rgba(255,240,180,0.6)'); gr.addColorStop(1, 'rgba(255,240,180,0)'); return gr; });
    g.fillStyle = sun; g.fillRect(660, 0, 260, 230);
    // clouds
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const c of this.clouds) {
      const s = c.s * 22;
      g.beginPath();
      g.arc(c.x, c.y, s, 0, Math.PI * 2); g.arc(c.x + s * 1.1, c.y + s * 0.2, s * 0.8, 0, Math.PI * 2); g.arc(c.x - s * 1.0, c.y + s * 0.25, s * 0.7, 0, Math.PI * 2);
      g.fill();
    }
    // far layer with parallax
    const off = (this.dist * 1.6) % 240;
    g.fillStyle = b.far;
    if (b.farStyle === 'peaks') {
      g.beginPath(); g.moveTo(0, HORIZON_Y + 2);
      for (let x = -240 - off; x < W + 240; x += 120) { g.lineTo(x + 60, HORIZON_Y - 70 - 35 * Math.sin(x * 0.05)); g.lineTo(x + 120, HORIZON_Y + 2); }
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (let x = -240 - off; x < W + 240; x += 120) {
        const py = HORIZON_Y - 70 - 35 * Math.sin(x * 0.05);
        g.beginPath(); g.moveTo(x + 60, py); g.lineTo(x + 74, py + 22); g.lineTo(x + 66, py + 20); g.lineTo(x + 60, py + 28); g.lineTo(x + 54, py + 20); g.lineTo(x + 46, py + 22); g.closePath(); g.fill();
      }
    } else if (b.farStyle === 'trees') {
      g.beginPath(); g.moveTo(0, HORIZON_Y + 2);
      for (let x = -40 - off * 0.5; x < W + 40; x += 34) { g.lineTo(x, HORIZON_Y - 18 - 14 * Math.abs(Math.sin(x * 0.21))); g.lineTo(x + 17, HORIZON_Y - 40 - 12 * Math.abs(Math.cos(x * 0.13))); }
      g.lineTo(W, HORIZON_Y + 2); g.closePath(); g.fill();
    } else {
      g.beginPath(); g.moveTo(0, HORIZON_Y + 2);
      for (let x = 0; x <= W; x += 16) g.lineTo(x, HORIZON_Y - 26 - 24 * Math.sin((x + off * 0.4) * 0.011) - 10 * Math.sin((x - off) * 0.027));
      g.lineTo(W, HORIZON_Y + 2); g.closePath(); g.fill();
      g.fillStyle = shade(b.far, -0.18);
      g.beginPath(); g.moveTo(0, HORIZON_Y + 2);
      for (let x = 0; x <= W; x += 16) g.lineTo(x, HORIZON_Y - 10 - 14 * Math.sin((x + off) * 0.017 + 1.5));
      g.lineTo(W, HORIZON_Y + 2); g.closePath(); g.fill();
    }
    // ground
    const ground = this._grad(g, 'ground' + idx, () => { const gr = g.createLinearGradient(0, HORIZON_Y, 0, H); gr.addColorStop(0, b.ground); gr.addColorStop(1, b.groundDark); return gr; });
    g.fillStyle = ground; g.fillRect(0, HORIZON_Y, W, H - HORIZON_Y);
    if (b.water) {
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
      for (let k = 0; k < 9; k++) {
        const t = ((k * 0.11 + (this.dist * 0.01) % 0.11)) % 1;
        const y = screenY(0.08 + t * 1.3);
        if (y > H) continue;
        const rh = roadHalf(0.08 + t * 1.3) + 40;
        g.globalAlpha = 0.25 + 0.5 * t;
        g.beginPath(); g.moveTo(0, y); g.lineTo(CX - rh, y); g.moveTo(CX + rh, y); g.lineTo(W, y); g.stroke();
      }
      g.globalAlpha = 1;
    }
  }

  drawRoad(g, b) {
    const tTop = 0, tBot = 1.42;
    g.fillStyle = b.road;
    g.beginPath();
    g.moveTo(CX - roadHalf(tTop), screenY(tTop)); g.lineTo(CX + roadHalf(tTop), screenY(tTop));
    g.lineTo(CX + roadHalf(tBot), screenY(tBot)); g.lineTo(CX - roadHalf(tBot), screenY(tBot));
    g.closePath(); g.fill();
    // edges
    g.strokeStyle = b.roadLine; g.lineWidth = 4;
    g.beginPath();
    g.moveTo(CX - roadHalf(tTop), screenY(tTop)); g.lineTo(CX - roadHalf(tBot), screenY(tBot));
    g.moveTo(CX + roadHalf(tTop), screenY(tTop)); g.lineTo(CX + roadHalf(tBot), screenY(tBot));
    g.stroke();
    // lane dashes scrolling with distance
    const spacing = 12, dash = 5.5;
    const offset = this.dist % spacing;
    g.strokeStyle = hexToRgba(b.roadLine, 0.75);
    for (let lane = 1; lane < this.cfg.lanes; lane++) {
      const rel = lane - this.cfg.lanes / 2;
      for (let k = -3; k < SPAWN_D / spacing + 1; k++) {
        const d1 = k * spacing - offset, d2 = d1 + dash;
        const t1 = depth(d2), t2 = depth(d1);       // d2 is farther => smaller t
        if (t2 < 0.02 || t1 > 1.45) continue;
        const x1 = CX + rel * 2 * roadHalf(t1) / this.cfg.lanes, x2 = CX + rel * 2 * roadHalf(t2) / this.cfg.lanes;
        g.lineWidth = Math.max(1, 5 * t2);
        g.beginPath(); g.moveTo(x1, screenY(t1)); g.lineTo(x2, screenY(Math.min(t2, 1.45))); g.stroke();
      }
    }
    // soft shadow under the horizon for depth
    const haze = this._grad(g, 'haze', () => { const gr = g.createLinearGradient(0, HORIZON_Y - 6, 0, HORIZON_Y + 60); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); return gr; });
    g.fillStyle = haze; g.fillRect(0, HORIZON_Y - 6, W, 66);
  }

  drawBridge(g, b) {
    const n = this.cfg.finale.gates;
    const t0 = 0.22, t1 = 0.92;
    // the gap
    const gap = this._grad(g, 'gap', () => { const gr = g.createLinearGradient(0, screenY(t0), 0, screenY(t1)); gr.addColorStop(0, '#1b2140'); gr.addColorStop(1, '#2b3566'); return gr; });
    g.fillStyle = gap;
    g.beginPath();
    g.moveTo(CX - roadHalf(t0) - 40 * t0, screenY(t0)); g.lineTo(CX + roadHalf(t0) + 40 * t0, screenY(t0));
    g.lineTo(CX + roadHalf(t1) + 40 * t1, screenY(t1)); g.lineTo(CX - roadHalf(t1) - 40 * t1, screenY(t1));
    g.closePath(); g.fill();
    // planks: plank k spans [t0 + k*span, t0 + (k+1)*span] from the far side toward the hero
    const span = (t1 - t0) / n;
    for (let k = 0; k < n; k++) {
      const built = k < this.planks;
      const falling = !built && k === this.planks && this.plankDrop > 0;
      if (!built && !falling) continue;
      const ta = t1 - (k + 1) * span, tb = t1 - k * span;
      let dy = 0, alpha = 1;
      if (falling) { dy = (1 - this.plankDrop) * 160; alpha = this.plankDrop; }
      else if (k === this.planks - 1 && this.plankSlam > 0) dy = -this.plankSlam * this.plankSlam * 90;
      g.globalAlpha = alpha;
      g.fillStyle = falling ? '#8a5a2e' : '#c98b4a';
      g.beginPath();
      g.moveTo(CX - roadHalf(ta) * 0.95, screenY(ta) + dy); g.lineTo(CX + roadHalf(ta) * 0.95, screenY(ta) + dy);
      g.lineTo(CX + roadHalf(tb) * 0.95, screenY(tb) + dy); g.lineTo(CX - roadHalf(tb) * 0.95, screenY(tb) + dy);
      g.closePath(); g.fill();
      g.strokeStyle = '#7a4a1e'; g.lineWidth = 3; g.stroke();
      // plank lines
      g.strokeStyle = 'rgba(80,40,10,0.35)'; g.lineWidth = 2;
      for (let j = 1; j < 4; j++) { const tt = ta + (tb - ta) * j / 4; g.beginPath(); g.moveTo(CX - roadHalf(tt) * 0.95, screenY(tt) + dy); g.lineTo(CX + roadHalf(tt) * 0.95, screenY(tt) + dy); g.stroke(); }
      g.globalAlpha = 1;
    }
    // rope posts at the near edge
    g.fillStyle = shade(b.road, -0.4);
    for (const s of [-1, 1]) { const x = CX + s * (roadHalf(t1) + 14); g.fillRect(x - 5, screenY(t1) - 40, 10, 44); }
  }

  drawObjects(g, b) {
    const list = this.drawList;
    list.length = 0;
    for (const p of this.props) list.push(p);
    for (const c of this.coins) if (!c.taken) list.push(c);
    for (const h of this.hazards) list.push(h);
    if (this.set) for (const gt of this.set.gates) list.push(gt);
    if (this.frozenSet) for (const gt of this.frozenSet.gates) list.push(gt);
    for (const s of this.passedSets) for (const gt of s.gates) list.push(gt);
    list.sort((a, bb) => (bb.set ? bb.set.d : bb.d) - (a.set ? a.set.d : a.d));
    let heroDrawn = false;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      const d = o.set ? o.set.d : o.d;
      if (!heroDrawn && d < -7) { this.drawHero(g); heroDrawn = true; }
      const t = depth(d);
      if (t < 0.03 || t > 1.45) continue;
      if (d < -1 && o.side === undefined && !(o.set && o.set === this.frozenSet)) {
        // passed objects fade out quickly instead of ballooning toward the camera
        const a = clamp(1 + (d + 1) / 7, 0, 1);
        if (a <= 0.02) continue;
        g.globalAlpha = a;
        if (o.set) this.drawGate(g, o, Math.min(t, 1.12)); else if (o.spin !== undefined) this.drawCoin(g, o, Math.min(t, 1.12)); else this.drawHazard(g, o, Math.min(t, 1.12));
        g.globalAlpha = 1;
        continue;
      }
      if (o.side !== undefined) this.drawProp(g, o, t, b);
      else if (o.set) this.drawGate(g, o, t);
      else if (o.spin !== undefined) this.drawCoin(g, o, t);
      else this.drawHazard(g, o, t);
    }
    if (!heroDrawn) this.drawHero(g);
  }

  drawProp(g, p, t, b) {
    const kinds = b.props || ['bush'];
    const kind = kinds[p.variant % kinds.length];
    const x = p.side * (roadHalf(t) + (36 + 110 * p.off) * t) + CX;
    const y = screenY(t);
    const s = Math.min(t, 1.08) * p.size * 0.82;
    if (s < 0.04) return;
    g.save();
    if (t > 1.15) g.globalAlpha = clamp((1.45 - t) / 0.3, 0, 1);
    g.translate(x, y);
    g.scale(s, s);
    const sway = Math.sin(this.time * 1.4 + p.sway) * 0.03;
    switch (kind) {
      case 'lollipop': {
        g.strokeStyle = '#f7f1e3'; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -120); g.stroke();
        g.rotate(sway);
        const c = [b.accent, '#ff6fa6', '#5b8cff'][p.variant % 3];
        g.fillStyle = c; g.beginPath(); g.arc(0, -150, 48, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 7; g.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.3) { const r = 6 + a * 3.2; g.lineTo(Math.cos(a) * r, -150 + Math.sin(a) * r); }
        g.stroke();
        break;
      }
      case 'pine': {
        g.fillStyle = '#6b4a2b'; g.fillRect(-9, -40, 18, 44);
        g.rotate(sway);
        g.fillStyle = shade(b.far, 0.1);
        for (let k = 0; k < 3; k++) { const w = 70 - k * 16, yy = -40 - k * 46; g.beginPath(); g.moveTo(-w, yy); g.lineTo(0, yy - 70); g.lineTo(w, yy); g.closePath(); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.moveTo(-14, -176); g.lineTo(0, -202); g.lineTo(14, -176); g.closePath(); g.fill();
        break;
      }
      case 'bush': {
        g.fillStyle = shade(b.groundDark, -0.15);
        g.beginPath(); g.arc(-30, -24, 34, 0, Math.PI * 2); g.arc(26, -26, 38, 0, Math.PI * 2); g.arc(0, -46, 36, 0, Math.PI * 2); g.fill();
        g.fillStyle = b.accent;
        g.beginPath(); g.arc(-18, -40, 7, 0, Math.PI * 2); g.arc(24, -52, 7, 0, Math.PI * 2); g.arc(8, -22, 6, 0, Math.PI * 2); g.fill();
        break;
      }
      case 'flower': {
        g.strokeStyle = '#3f9a3a'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -60); g.stroke();
        g.rotate(sway * 2);
        g.fillStyle = ['#ffffff', '#ffd54a', b.accent][p.variant % 3];
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * 18, -70 + Math.sin(a) * 18, 12, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#ff9f43'; g.beginPath(); g.arc(0, -70, 10, 0, Math.PI * 2); g.fill();
        break;
      }
      case 'reed': {
        g.strokeStyle = '#4f8f3c'; g.lineWidth = 6; g.lineCap = 'round';
        for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(k * 16, 0); g.quadraticCurveTo(k * 20 + sway * 300, -80, k * 24 + sway * 500, -130); g.stroke(); }
        g.fillStyle = '#7a4a1e';
        for (let k = -1; k <= 1; k++) { g.beginPath(); g.ellipse(k * 24 + sway * 500, -138, 8, 22, 0, 0, Math.PI * 2); g.fill(); }
        break;
      }
      default: { // rock
        g.fillStyle = shade(b.groundDark, -0.3);
        g.beginPath(); g.moveTo(-50, 0); g.lineTo(-36, -44); g.lineTo(-4, -62); g.lineTo(34, -40); g.lineTo(50, 0); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(-28, -36); g.lineTo(-4, -52); g.lineTo(10, -40); g.closePath(); g.fill();
      }
    }
    g.restore();
  }

  drawGate(g, gate, t) {
    const set = gate.set;
    const x = this.laneX(gate.lane, t);
    const y = screenY(t);
    const lw = this.laneW(t);
    const s = Math.min(t, 1.12) * (set.pop ?? 1);
    const w = Math.min(lw, this.laneW(1.12)) * 0.86 * (set.pop ?? 1);
    const h = w * 0.68;
    const isCorrect = set.resolved && gate.lane === set.correctLane;
    const isWrongChoice = set.resolved && gate.lane === set.chosenLane && gate.lane !== set.correctLane;
    let color = gate.color;
    if (isCorrect) color = '#2ecc71';
    if (isWrongChoice) color = '#ef4444';
    const alpha = set.resolved && !isCorrect && !isWrongChoice ? 0.45 : 1;
    g.save();
    g.globalAlpha = alpha;
    // shadow on the ground
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.beginPath(); g.ellipse(x, y + 4 * t, w * 0.55, 10 * t, 0, 0, Math.PI * 2); g.fill();
    const post = Math.max(3, 16 * s);
    const style = this.cfg.gateStyle;
    if (style === 'ring') {
      g.strokeStyle = shade(color, -0.25); g.lineWidth = post * 1.2;
      g.beginPath(); g.ellipse(x, y - h * 0.5, w * 0.5, h * 0.5, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = color; g.lineWidth = post * 0.7; g.stroke();
    } else if (style === 'flag') {
      g.fillStyle = shade(color, -0.3); g.fillRect(x - w / 2 - post / 2, y - h, post, h); g.fillRect(x + w / 2 - post / 2, y - h, post, h);
      g.fillStyle = color; g.beginPath(); g.moveTo(x - w / 2, y - h); g.lineTo(x + w / 2, y - h); g.lineTo(x + w / 2, y - h * 0.62); g.lineTo(x, y - h * 0.5); g.lineTo(x - w / 2, y - h * 0.62); g.closePath(); g.fill();
    } else {
      // arch: two posts + rounded top bar
      g.fillStyle = shade(color, -0.3);
      roundRect(g, x - w / 2 - post / 2, y - h * 0.78, post, h * 0.78, post / 2, { fill: shade(color, -0.3) });
      roundRect(g, x + w / 2 - post / 2, y - h * 0.78, post, h * 0.78, post / 2, { fill: shade(color, -0.3) });
      g.strokeStyle = color; g.lineWidth = post; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - w / 2, y - h * 0.72); g.quadraticCurveTo(x, y - h * 1.22, x + w / 2, y - h * 0.72); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = post * 0.3;
      g.beginPath(); g.moveTo(x - w / 2, y - h * 0.74); g.quadraticCurveTo(x, y - h * 1.24, x + w / 2, y - h * 0.74); g.stroke();
    }
    // glow for resolved gates
    if (isCorrect || isWrongChoice) {
      g.fillStyle = hexToRgba(color, 0.22 + 0.2 * Math.sin(this.time * 10) * gate.flash);
      g.beginPath(); g.ellipse(x, y - h * 0.5, w * 0.62, h * 0.72, 0, 0, Math.PI * 2); g.fill();
    }
    // label plate
    const fontSize = clamp(Math.round(46 * t), 22, 46);
    const font = f(900, fontSize);
    g.font = font;
    const tw = g.measureText(String(gate.label)).width;
    const pw = Math.max(w * 0.9, tw + 26 * Math.max(0.6, t));
    const ph = fontSize * 1.5;
    const py = y - h * 0.55;
    roundRect(g, x - pw / 2, py - ph / 2, pw, ph, ph / 2, { fill: isCorrect ? '#1e8a4c' : isWrongChoice ? '#b91c1c' : 'rgba(255,255,255,0.96)', stroke: color, lineWidth: Math.max(2, 4 * t) });
    drawText(g, gate.label, x, py + 1, { font, color: isCorrect || isWrongChoice ? '#fff' : '#1f2544', maxWidth: pw - 12 });
    // tick / cross icon
    if (isCorrect || isWrongChoice) {
      const r = Math.max(14, 22 * t);
      const ix = x + pw / 2, iy = py - ph / 2;
      g.fillStyle = isCorrect ? '#2ecc71' : '#ef4444';
      g.beginPath(); g.arc(ix, iy, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = Math.max(3, r * 0.22); g.lineCap = 'round';
      g.beginPath();
      if (isCorrect) { g.moveTo(ix - r * 0.45, iy); g.lineTo(ix - r * 0.1, iy + r * 0.4); g.lineTo(ix + r * 0.5, iy - r * 0.4); }
      else { g.moveTo(ix - r * 0.4, iy - r * 0.4); g.lineTo(ix + r * 0.4, iy + r * 0.4); g.moveTo(ix + r * 0.4, iy - r * 0.4); g.lineTo(ix - r * 0.4, iy + r * 0.4); }
      g.stroke();
    }
    g.restore();
  }

  drawCoin(g, c, t) {
    const x = this.laneX(c.lane, t), y = screenY(t) - 26 * t;
    const r = 17 * t;
    const sq = Math.abs(Math.cos(c.spin));
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(x, screenY(t), r * 0.9, r * 0.3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = shade(this.cfg.coinColor, -0.3);
    g.beginPath(); g.ellipse(x, y, Math.max(2, r * sq), r, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = this.cfg.coinColor;
    g.beginPath(); g.ellipse(x - r * 0.08, y - r * 0.08, Math.max(1.5, r * 0.78 * sq), r * 0.78, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath(); g.ellipse(x - r * 0.25, y - r * 0.35, Math.max(1, r * 0.22 * sq), r * 0.16, -0.5, 0, Math.PI * 2); g.fill();
  }

  drawHazard(g, h, t) {
    const x = this.laneX(h.lane, t), y = screenY(t);
    const w = this.laneW(t) * 0.7, r = 22 * t;
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(x, y + 2 * t, w * 0.55, 8 * t, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8a5a2e'; roundRect(g, x - w / 2, y - r * 2, w, r * 2, r, { fill: '#8a5a2e' });
    g.strokeStyle = '#5c3a18'; g.lineWidth = Math.max(1, 3 * t);
    for (let k = -2; k <= 2; k++) { const ox = k * w * 0.18 + ((h.rot * 30) % (w * 0.18)); if (Math.abs(ox) > w * 0.42) continue; g.beginPath(); g.moveTo(x + ox, y - r * 2 + 2); g.lineTo(x + ox, y - 2); g.stroke(); }
    g.fillStyle = '#c98b4a'; g.beginPath(); g.ellipse(x + w / 2, y - r, r * 0.35, r, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5c3a18'; g.beginPath(); g.ellipse(x + w / 2, y - r, r * 0.15, r * 0.45, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  drawHero(g) {
    const { cfg } = this;
    const x = this.laneX(this.heroPos, 1);
    const run = this.phase !== 'card' && this.phase !== 'resolve' && this.speedMul > 0.05;
    const cycle = this.time * (10 + 6 * this.boost);
    const bob = run ? Math.abs(Math.sin(cycle)) * 7 : 0;
    const y = PLAYER_Y - bob;
    const lean = this.heroLean * 0.25 + (this.stumble > 0 ? Math.sin(this.stumble * 9) * 0.4 * this.stumble : 0);
    const squash = 1 - this.stumble * 0.15;
    g.save();
    // shadow
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath(); g.ellipse(x, PLAYER_Y + 6, 40 - bob, 12, 0, 0, Math.PI * 2); g.fill();
    g.translate(x, y);
    g.rotate(lean);
    g.scale(1 / squash, squash);
    const body = cfg.heroColor, dark = shade(body, -0.3), light = cfg.heroAccent;
    // legs
    g.strokeStyle = dark; g.lineWidth = 11; g.lineCap = 'round';
    const l1 = run ? Math.sin(cycle) * 22 : 0, l2 = -l1;
    g.beginPath(); g.moveTo(-14, -36); g.lineTo(-14 + l1 * 0.6, -2 + Math.max(0, -l1) * 0.3); g.stroke();
    g.beginPath(); g.moveTo(14, -36); g.lineTo(14 + l2 * 0.6, -2 + Math.max(0, -l2) * 0.3); g.stroke();
    // tail / jet
    if (cfg.heroStyle === 'critter') {
      g.strokeStyle = body; g.lineWidth = 12;
      g.beginPath(); g.moveTo(-22, -52); g.quadraticCurveTo(-58, -70 - Math.sin(cycle) * 8, -50, -98); g.stroke();
      g.strokeStyle = light; g.lineWidth = 6; g.beginPath(); g.moveTo(-50, -98); g.lineTo(-52, -102); g.stroke();
    } else if (cfg.heroStyle === 'robot' && this.boost > 0.1) {
      g.fillStyle = hexToRgba('#ffb347', 0.8 * this.boost);
      g.beginPath(); g.moveTo(-16, -44); g.lineTo(0, -44 + 40 * this.boost + Math.sin(cycle * 2) * 6); g.lineTo(16, -44); g.closePath(); g.fill();
    }
    // body
    const bodyShape = cfg.heroStyle === 'robot' ? 'box' : 'round';
    if (bodyShape === 'box') roundRect(g, -30, -96, 60, 66, 14, { fill: body, stroke: dark, lineWidth: 3 });
    else { g.fillStyle = body; g.beginPath(); g.ellipse(0, -64, 32, 36, 0, 0, Math.PI * 2); g.fill(); }
    // belly / visor
    g.fillStyle = light;
    if (bodyShape === 'box') roundRect(g, -20, -84, 40, 22, 8, { fill: '#9be7ff' });
    else { g.beginPath(); g.ellipse(0, -56, 20, 24, 0, 0, Math.PI * 2); g.fill(); }
    // arms
    g.strokeStyle = body; g.lineWidth = 10;
    const a1 = run ? Math.sin(cycle + Math.PI) * 18 : 0;
    g.beginPath(); g.moveTo(-28, -74); g.lineTo(-44 + a1 * 0.3, -60 + a1); g.stroke();
    g.beginPath(); g.moveTo(28, -74); g.lineTo(44 - a1 * 0.3, -60 - a1); g.stroke();
    // head
    if (cfg.heroStyle === 'blob') {
      g.fillStyle = body; g.beginPath(); g.ellipse(0, -112, 30, 26, 0, 0, Math.PI * 2); g.fill();
    } else if (cfg.heroStyle === 'robot') {
      roundRect(g, -26, -136, 52, 40, 10, { fill: shade(body, 0.15), stroke: dark, lineWidth: 3 });
      g.strokeStyle = dark; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -136); g.lineTo(0, -150); g.stroke();
      g.fillStyle = '#ff5d7a'; g.beginPath(); g.arc(0, -154, 6 + Math.sin(this.time * 8) * 1.5, 0, Math.PI * 2); g.fill();
    } else {
      // critter: round head with ears
      g.fillStyle = body;
      g.beginPath(); g.moveTo(-26, -122); g.lineTo(-20, -152); g.lineTo(-4, -130); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(26, -122); g.lineTo(20, -152); g.lineTo(4, -130); g.closePath(); g.fill();
      g.fillStyle = light;
      g.beginPath(); g.moveTo(-21, -126); g.lineTo(-18, -142); g.lineTo(-9, -130); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(21, -126); g.lineTo(18, -142); g.lineTo(9, -130); g.closePath(); g.fill();
      g.fillStyle = body; g.beginPath(); g.arc(0, -112, 30, 0, Math.PI * 2); g.fill();
      g.fillStyle = light; g.beginPath(); g.ellipse(0, -102, 16, 11, 0, 0, Math.PI * 2); g.fill();
    }
    // eyes + smile (all styles)
    const blink = Math.sin(this.time * 1.3) > 0.97 ? 0.15 : 1;
    const ey = cfg.heroStyle === 'robot' ? -118 : -114;
    if (cfg.heroStyle === 'robot') {
      g.fillStyle = '#1a2240'; roundRect(g, -20, -126, 40, 16, 6, { fill: '#1a2240' });
      g.fillStyle = '#7dd3fc'; g.beginPath(); g.ellipse(-9, ey, 5, 5 * blink, 0, 0, Math.PI * 2); g.ellipse(9, ey, 5, 5 * blink, 0, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-11, ey, 8, 9 * blink, 0, 0, Math.PI * 2); g.ellipse(11, ey, 8, 9 * blink, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1f2544'; g.beginPath(); g.ellipse(-10, ey - 1, 4, 5 * blink, 0, 0, Math.PI * 2); g.ellipse(12, ey - 1, 4, 5 * blink, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#1f2544'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath();
      if (this.stumble > 0.3) { g.arc(0, -92, 7, Math.PI * 1.15, Math.PI * 1.85); } else { g.arc(0, -102, 9, Math.PI * 0.15, Math.PI * 0.85); }
      g.stroke();
    }
    g.restore();
  }

  drawSpeedLines(g) {
    g.save();
    g.strokeStyle = `rgba(255,255,255,${0.35 * this.boost})`;
    g.lineWidth = 3;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + this.time * 0.6;
      const r0 = 260 + ((this.time * 900 + k * 70) % 180);
      const cx = CX, cy = 330;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.6); g.lineTo(cx + Math.cos(a) * (r0 + 90), cy + Math.sin(a) * (r0 + 90) * 0.6); g.stroke();
    }
    g.restore();
  }

  drawBanner(g, b) {
    const set = this.set || this.frozenSet;
    const showPrompt = set && (this.phase === 'run' || this.phase === 'resolve' || this.phase === 'card');
    if (!showPrompt) return;
    const item = set.item;
    const font = f(900, 40);
    g.font = font;
    const tw = Math.min(W - 120, g.measureText(String(item.prompt)).width);
    const pw = Math.max(300, tw + 72);
    const pop = clamp(this.bannerPop, 0, 1.2);
    g.save();
    g.translate(CX, BANNER_Y + BANNER_H / 2);
    g.scale(pop, pop);
    roundRect(g, -pw / 2, -BANNER_H / 2, pw, BANNER_H, 24, { fill: 'rgba(16,20,48,0.78)', stroke: hexToRgba(b.accent, 0.9), lineWidth: 3 });
    drawText(g, item.prompt, 0, 2, { font, color: '#fff', maxWidth: pw - 44, shadow: true });
    g.restore();
    if (this.hintText && this.phase === 'run') {
      const hf = f(700, 21);
      g.font = hf;
      const hw = Math.min(760, g.measureText(this.hintText).width + 70);
      const a = clamp(this.hintT * 3, 0, 1);
      g.globalAlpha = a;
      roundRect(g, CX - hw / 2, HINT_Y - 19, hw, 38, 19, { fill: 'rgba(16,20,48,0.72)', stroke: 'rgba(255,213,74,0.8)', lineWidth: 2 });
      // bulb icon
      g.fillStyle = '#ffd54a'; g.beginPath(); g.arc(CX - hw / 2 + 24, HINT_Y - 2, 7, 0, Math.PI * 2); g.fill();
      g.fillRect(CX - hw / 2 + 21, HINT_Y + 4, 6, 5);
      drawText(g, this.hintText, CX + 12, HINT_Y, { font: hf, color: '#fff', maxWidth: hw - 60 });
      g.globalAlpha = 1;
    }
  }

  drawPhaseOverlay(g, b) {
    const { cfg } = this;
    const L = k => this.label(k);
    switch (this.phase) {
      case 'intro': {
        const txt = this.phaseT < 0.9 ? L('getReady') : L('go');
        this.drawBigBanner(g, txt, null, b.accent);
        break;
      }
      case 'stageClear': {
        const next = cfg.biomes[(this.stageIndex + 1) % cfg.biomes.length];
        this.drawBigBanner(g, this.label('stageClear', { name: b.name }), this.label('nextStage', { name: next.name }), b.accent, true);
        break;
      }
      case 'retry':
        this.drawBigBanner(g, L('tryAgain'), null, '#ff8a8a');
        break;
      case 'finaleIntro':
        this.drawBigBanner(g, L('finaleTitle'), this.label('finaleIntro', { n: cfg.finale.gates }), '#ffd54a', true);
        break;
      case 'crossing':
        this.drawBigBanner(g, L('bridgeDone'), null, '#ffd54a');
        break;
      case 'card':
        this.drawCard(g);
        break;
      default: break;
    }
  }

  drawBigBanner(g, title, sub, accent, withProgress = false) {
    const pop = clamp(this.bannerPop, 0, 1.15);
    g.save();
    g.fillStyle = 'rgba(10,14,32,0.35)';
    g.fillRect(0, 0, W, H);
    g.translate(CX, 268);
    g.scale(pop, pop);
    const h = sub ? (withProgress ? 200 : 150) : 110;
    roundRect(g, -340, -h / 2, 680, h, 28, { fill: 'rgba(16,20,48,0.92)', stroke: hexToRgba(accent, 0.95), lineWidth: 4 });
    drawText(g, title, 0, -h / 2 + 52, { font: f(900, 46), color: accent, maxWidth: 620, shadow: true });
    if (sub) drawText(g, sub, 0, -h / 2 + 100, { font: f(700, 24), color: '#fff', maxWidth: 620 });
    if (withProgress) {
      const total = this.totalGates();
      const p = clamp(this.totalPassed / total, 0, 1);
      roundRect(g, -280, h / 2 - 66, 560, 22, 11, { fill: 'rgba(255,255,255,0.15)' });
      roundRect(g, -280, h / 2 - 66, 560 * p, 22, 11, { fill: accent });
      // stage pips
      for (let i = 1; i < this.cfg.stages; i++) { const x = -280 + 560 * (i * this.cfg.gatesPerStage / total); g.fillStyle = 'rgba(16,20,48,0.9)'; g.fillRect(x - 2, h / 2 - 68, 4, 26); }
      if (this.phaseT > 0.9) drawText(g, this.label('tapToSkip'), 0, h / 2 - 26, { font: f(700, 20), color: `rgba(255,255,255,${0.55 + 0.4 * Math.sin(this.time * 4)})` });
    }
    g.restore();
  }

  drawCard(g) {
    const card = this.card;
    if (!card) return;
    const item = card.item;
    const bodyFont = f(700, 23);
    if (!card.lines) card.lines = wrapText(g, item.explanation || '', 600, bodyFont).slice(0, 4);
    const visual = item.visual && VISUAL_H[item.visual.kind] ? item.visual : null;
    const vh = visual ? VISUAL_H[visual.kind] + 18 : 0;
    const lines = card.lines.length;
    const ch = 140 + lines * 30 + vh + 70;
    const cw = 680;
    const sc = clamp(card.scale, 0, 1.1);
    g.save();
    g.fillStyle = 'rgba(10,14,32,0.55)';
    g.fillRect(0, 0, W, H);
    g.translate(CX, 282);
    g.scale(sc, sc);
    const top = -ch / 2;
    roundRect(g, -cw / 2, top, cw, ch, 28, { fill: 'rgba(255,255,255,0.97)', stroke: '#ef4444', lineWidth: 4 });
    // red cross badge
    g.fillStyle = '#ef4444'; g.beginPath(); g.arc(0, top, 30, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-11, top - 11); g.lineTo(11, top + 11); g.moveTo(11, top - 11); g.lineTo(-11, top + 11); g.stroke();
    drawText(g, this.label('notQuite'), 0, top + 60, { font: f(900, 30), color: '#b91c1c' });
    // answer line
    const ansFont = f(900, 34);
    g.font = ansFont;
    const aw = Math.min(600, g.measureText(card.correctText).width + 40);
    const lblFont = f(700, 22);
    g.font = lblFont;
    const lw = g.measureText(this.label('answerIs')).width;
    const totalW = lw + 14 + aw;
    const sx = -totalW / 2;
    drawText(g, this.label('answerIs'), sx + lw / 2, top + 108, { font: lblFont, color: '#4b5270' });
    roundRect(g, sx + lw + 14, top + 108 - 26, aw, 52, 16, { fill: '#e9f8ef', stroke: '#2ecc71', lineWidth: 3 });
    drawText(g, card.correctText, sx + lw + 14 + aw / 2, top + 110, { font: ansFont, color: '#166534', maxWidth: aw - 16 });
    // explanation
    let y = top + 160;
    for (const line of card.lines) { drawText(g, line, 0, y, { font: bodyFont, color: '#1f2544', maxWidth: 620 }); y += 30; }
    if (visual) { drawVisual(g, visual, 0, y + 8, 600, VISUAL_H[visual.kind]); }
    drawText(g, this.label('tapToContinue'), 0, top + ch - 30, { font: f(700, 20), color: `rgba(75,82,112,${this.phaseT > 0.6 ? 0.6 + 0.4 * Math.sin(this.time * 4) : 0.3})` });
    g.restore();
  }
}

// ---------- in-canvas item visuals (kinds shared across games, see GAME_DESIGN_GUIDE 3.5) ----------
const VISUAL_H = { tenframe: 96, numberline: 92, baseten: 110 };

function drawVisual(g, v, cx, top, maxW, h) {
  if (v.kind === 'tenframe') return drawTenFrame(g, v, cx, top, h);
  if (v.kind === 'numberline') return drawNumberLine(g, v, cx, top, maxW, h);
  if (v.kind === 'baseten') return drawBaseTen(g, v, cx, top, maxW, h);
}

function drawTenFrame(g, v, cx, top, h) {
  const n = clamp(Math.round(Number(v.n) || 0), 0, 20);
  const m = clamp(Math.round(Number(v.m) || 0), 0, 20 - n);
  const remove = clamp(Math.round(Number(v.remove) || 0), 0, n);
  const frames = n + m > 10 ? 2 : 1;
  const cell = Math.min(44, (h - 8) / 2);
  const fw = cell * 5, fh = cell * 2, gap = 18;
  const totalW = frames * fw + (frames - 1) * gap;
  const x0 = cx - totalW / 2, y0 = top + (h - fh) / 2;
  let idx = 0;
  for (let fr = 0; fr < frames; fr++) {
    const ox = x0 + fr * (fw + gap);
    roundRect(g, ox, y0, fw, fh, 8, { fill: 'rgba(79,124,255,0.08)', stroke: '#4b5270', lineWidth: 2 });
    g.strokeStyle = 'rgba(75,82,112,0.4)'; g.lineWidth = 1.5;
    for (let c = 1; c < 5; c++) { g.beginPath(); g.moveTo(ox + c * cell, y0); g.lineTo(ox + c * cell, y0 + fh); g.stroke(); }
    g.beginPath(); g.moveTo(ox, y0 + cell); g.lineTo(ox + fw, y0 + cell); g.stroke();
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
      const x = ox + c * cell + cell / 2, y = y0 + r * cell + cell / 2;
      if (idx < n) {
        const crossed = idx >= n - remove;
        g.fillStyle = crossed ? 'rgba(79,124,255,0.35)' : '#4f7cff';
        g.beginPath(); g.arc(x, y, cell * 0.33, 0, Math.PI * 2); g.fill();
        if (crossed) { g.strokeStyle = '#ef4444'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 10, y - 10); g.lineTo(x + 10, y + 10); g.moveTo(x + 10, y - 10); g.lineTo(x - 10, y + 10); g.stroke(); }
      } else if (idx < n + m) {
        g.fillStyle = '#f59e0b'; g.beginPath(); g.arc(x, y, cell * 0.33, 0, Math.PI * 2); g.fill();
      }
      idx++;
    }
  }
}

function drawNumberLine(g, v, cx, top, maxW, h) {
  const min = Math.round(Number(v.min ?? 0)), max = Math.round(Number(v.max ?? 20));
  if (!(max > min)) return;
  const range = max - min;
  const L = cx - maxW / 2 + 20, R = cx + maxW / 2 - 20, Y = top + h - 34;
  const px = x => L + ((x - min) / range) * (R - L);
  const every = range <= 20 ? (range <= 12 ? 1 : 2) : range <= 60 ? 5 : 10;
  g.strokeStyle = '#1f2544'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(L, Y); g.lineTo(R, Y); g.stroke();
  const tickStep = range > 60 ? 5 : 1;
  for (let x = min; x <= max; x += tickStep) {
    const big = (x - min) % every === 0;
    g.lineWidth = big ? 2.5 : 1.5;
    g.beginPath(); g.moveTo(px(x), Y - (big ? 9 : 5)); g.lineTo(px(x), Y + (big ? 9 : 5)); g.stroke();
    if (big) drawText(g, String(x), px(x), Y + 22, { font: f(800, 20), color: '#1f2544' });
  }
  const jumps = Array.isArray(v.jumps) ? v.jumps : (Number.isFinite(Number(v.from)) && Number.isFinite(Number(v.jump)) ? [[Number(v.from), Number(v.from) + Number(v.jump)]] : []);
  for (const j of jumps) {
    const a = px(j[0]), bx = px(j[1]);
    const ah = Math.min(40, 14 + Math.abs(bx - a) * 0.3);
    g.strokeStyle = '#f59e0b'; g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(a, Y - 4); g.quadraticCurveTo((a + bx) / 2, Y - 4 - ah * 2, bx, Y - 4); g.stroke();
    g.fillStyle = '#f59e0b'; g.beginPath(); g.arc(bx, Y - 4, 5, 0, Math.PI * 2); g.fill();
    const diff = j[1] - j[0];
    const lbl = v.jumpLabel !== undefined ? String(v.jumpLabel) : (diff > 0 ? '+' + diff : String(diff));
    drawText(g, lbl, (a + bx) / 2, Y - ah - 14, { font: f(900, 20), color: '#b45309' });
  }
  if (Array.isArray(v.marks)) for (const mk of v.marks) { g.fillStyle = '#4f7cff'; g.beginPath(); g.arc(px(Number(mk)), Y, 8, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
  if (Number.isFinite(Number(v.point))) { g.fillStyle = '#2ecc71'; g.beginPath(); g.arc(px(Number(v.point)), Y, 9, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.stroke(); }
}

function drawBaseTen(g, v, cx, top, maxW, h) {
  const tens = clamp(Math.round(Number(v.tens) || 0), 0, 9);
  const ones = clamp(Math.round(Number(v.ones) || 0), 0, 9);
  const rodW = 22, rodH = h - 24, gap = 10, cube = 18;
  const onesCols = Math.ceil(ones / 5);
  const totalW = tens * (rodW + gap) + (tens ? 26 : 0) + onesCols * (cube + 6);
  let x = cx - totalW / 2;
  const y0 = top + 12;
  for (let i = 0; i < tens; i++) {
    roundRect(g, x, y0, rodW, rodH, 4, { fill: '#4f7cff', stroke: '#2b4fb0', lineWidth: 2 });
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.5;
    for (let k = 1; k < 10; k++) { const yy = y0 + rodH * k / 10; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + rodW, yy); g.stroke(); }
    x += rodW + gap;
  }
  if (tens) x += 16;
  for (let i = 0; i < ones; i++) {
    const col = Math.floor(i / 5), row = i % 5;
    roundRect(g, x + col * (cube + 6), y0 + rodH - (row + 1) * (cube + 2), cube, cube, 3, { fill: '#f59e0b', stroke: '#b45309', lineWidth: 2 });
  }
}
