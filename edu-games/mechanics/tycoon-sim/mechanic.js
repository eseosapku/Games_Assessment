// mechanics/tycoon-sim/mechanic.js
// "Tycoon Sim": run a business for N rounds. Each round a news event lands with a live chart; the player
// picks a stake (risk/reward), then makes the call the event poses (choice cards in-canvas, numeric via the
// overlay). Correct reasoning pays out on the chart and in cash; a wrong call costs cash and the chart
// animates the true shift with annotations before the blocking explanation card. Profits buy upgrades
// between business scales; a linked-question finale decides the ending.
// Content-agnostic: every name, colour, label, speed and count comes from config. Subject knowledge lives in
// the content pack; this file only consumes `choice` and `numeric` items and draws `visual` kinds
// `sd-chart` (two shifting curves), `line` and `bar`, falling back to the player's own cash history.
import { drawText, wrapText, roundRect, clamp, lerp, hexToRgba, shade, Easing } from '../../kit/kit.js';

export const meta = {
  id: 'tycoon-sim',
  name: 'Tycoon Sim',
  description: 'Run a business for a dozen rounds; every news event is a question your profit answers honestly. Stakes, upgrades, business scales and a linked-question finale.',
  itemTypes: ['choice', 'numeric'],
  choices: 4,
  configSchema: {
    rounds: 'Total rounds in a run (12)',
    eventsPerRound: 'Decisions per round; each is one item (1)',
    roundTimerSec: 'Seconds allowed per decision, 0 disables the timer (0)',
    startingCash: 'Cash at the start (500)',
    currency: 'Currency symbol shown before amounts ("$")',
    cashLabel: 'Caption of the cash panel ("Cash")',
    roundLabel: 'Long name of a round ("Quarter")',
    roundShort: 'Short prefix for the HUD, e.g. Q3 ("Q")',
    brand: 'Business name painted on the building sign ("Tycoon Co.")',
    newsLabel: 'Caption of the event card ("Breaking news")',
    chartTitle: 'Default chart caption when the item has a chart visual ("Market chart")',
    historyTitle: 'Chart caption when the item has no visual and the cash history is shown ("Cash history")',
    stakeLabel: 'Caption of the stake pills ("Investment")',
    stakes: 'Array of { label, mul } stake options; profit and loss scale with mul (Safe x1, Bold x2, All-in x3)',
    baseProfit: 'Cash earned by a correct difficulty-1 answer at stake x1 in stage 1 (120)',
    lossRatio: 'Loss on a wrong answer as a fraction of the profit it would have earned (0.6)',
    speedBonusSec: 'Answering within this many seconds earns up to +50% profit and +50 score (12)',
    numericChance: 'Probability that a skill supporting numeric items gets one (0.3)',
    numericTolerance: 'Extra relative tolerance applied to numeric answers, 0.05 = 5% (0)',
    loanPenalty: 'Score removed when cash drops below zero outside the finale and an emergency loan resets it to 0 (150)',
    stages: 'Array of business scales: { name, building: "stand"|"shop"|"tower", sky: [top, bottom], ground, mul, music } (3 stages)',
    upgrades: 'Array per stage of 3 upgrades { name, desc, cost, effect: { profitMul, lossMul, timeBonus } } offered after that stage',
    finale: '{ name, intro, linked, skills, music, weather: "storm"|"none", successTitle, successText, failTitle, failText }',
    visitorStyle: 'Procedural style of the passers-by: "people" or "robots" ("people")',
    palette: 'Colours: panel, line, text, dim, good, bad, gold, curveA, curveB, card, accent, visitors[]',
    bonusXPPerStage: 'Bonus XP per completed stage (20)',
    finaleBonusXP: 'Bonus XP for surviving the finale (60)',
  },
};

export const defaultConfig = {
  rounds: 12,
  eventsPerRound: 1,
  roundTimerSec: 0,
  startingCash: 500,
  currency: '$',
  cashLabel: 'Cash',
  roundLabel: 'Quarter',
  roundShort: 'Q',
  brand: 'Tycoon Co.',
  newsLabel: 'Breaking news',
  chartTitle: 'Market chart',
  historyTitle: 'Cash history',
  stakeLabel: 'Investment',
  stakes: [{ label: 'Safe', mul: 1 }, { label: 'Bold', mul: 2 }, { label: 'All-in', mul: 3 }],
  baseProfit: 120,
  lossRatio: 0.6,
  speedBonusSec: 12,
  numericChance: 0.3,
  numericTolerance: 0,
  loanPenalty: 150,
  stages: [
    { name: 'Startup', building: 'stand', sky: ['#6fb8ff', '#dff1ff'], ground: '#6fae62', mul: 1, music: 'calm' },
    { name: 'Regional Chain', building: 'shop', sky: ['#3f7fd6', '#bcdcff'], ground: '#5d9b60', mul: 2.5, music: 'upbeat' },
    { name: 'National Company', building: 'tower', sky: ['#1b2a5e', '#6e90e6'], ground: '#4d6876', mul: 6, music: 'tense' },
  ],
  upgrades: [
    [
      { name: 'Marketing', desc: '+25% profit on correct calls', cost: 450, effect: { profitMul: 1.25 } },
      { name: 'Insurance', desc: 'Losses cut by 30%', cost: 400, effect: { lossMul: 0.7 } },
      { name: 'Analyst desk', desc: '+8 s on every decision timer', cost: 350, effect: { timeBonus: 8 } },
    ],
    [
      { name: 'Ad campaign', desc: '+30% profit on correct calls', cost: 1500, effect: { profitMul: 1.3 } },
      { name: 'Hedging', desc: 'Losses cut by 35%', cost: 1300, effect: { lossMul: 0.65 } },
      { name: 'Research team', desc: '+10 s on every decision timer', cost: 1100, effect: { timeBonus: 10 } },
    ],
    [
      { name: 'Global brand', desc: '+40% profit on correct calls', cost: 4500, effect: { profitMul: 1.4 } },
      { name: 'Reserve fund', desc: 'Losses cut by 40%', cost: 4000, effect: { lossMul: 0.6 } },
      { name: 'Think tank', desc: '+12 s on every decision timer', cost: 3500, effect: { timeBonus: 12 } },
    ],
  ],
  finale: {
    name: 'Recession', intro: 'Three linked calls decide survival. Keep cash above zero.', linked: 3, skills: [], music: 'boss', weather: 'storm',
    successTitle: 'IPO!', successText: 'You rang the bell with cash to spare.', failTitle: 'Bailout', failText: 'Cash ran dry. The company was rescued, at a price.',
  },
  visitorStyle: 'people',
  palette: {
    panel: 'rgba(12,16,38,0.78)', line: 'rgba(255,255,255,0.16)', text: '#ffffff', dim: 'rgba(255,255,255,0.68)',
    good: '#3ad29f', bad: '#ff5d7a', gold: '#ffd54a', curveA: '#ff8a5b', curveB: '#5bb0ff', card: 'rgba(255,255,255,0.09)', accent: '#ef4444',
    visitors: ['#ff8a5b', '#5bb0ff', '#ffd54a', '#c084fc', '#3ad29f', '#f472b6'],
  },
  bonusXPPerStage: 20,
  finaleBonusXP: 60,
};

// ---------- layout (logical 960x540) ----------
const TOP = 58;
const SCENE = { x: 16, y: TOP, w: 400, h: 300 };
const CHART = { x: 432, y: TOP, w: 512, h: 300 };
const NEWS_H = 98;
const STAKE_Y = 372, STAKE_H = 34;
const CARD_Y1 = 412, CARD_Y2 = 476, CARD_H = 58, CARD_W = 456, CARD_GAP = 16;
const SHOP_Y = 406, SHOP_H = 130, SHOP_W = 296;
const FONT = (w, s) => `${w} ${s}px Nunito, "Segoe UI", system-ui, sans-serif`;
const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];
const NUMPAD = ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'];
const ARROW = { up: '▲', down: '▼', same: '▬', '?': '?' };

export class Mechanic {
  constructor(ctx) {
    this.ctx = ctx;
    const cfg = { ...defaultConfig, ...ctx.config };
    cfg.palette = { ...defaultConfig.palette, ...(ctx.config.palette || {}) };
    cfg.finale = { ...defaultConfig.finale, ...(ctx.config.finale || {}) };
    if (!Array.isArray(cfg.stages) || !cfg.stages.length) cfg.stages = defaultConfig.stages;
    if (!Array.isArray(cfg.stakes) || !cfg.stakes.length) cfg.stakes = defaultConfig.stakes;
    cfg.rounds = Math.max(cfg.stages.length, Math.round(cfg.rounds) || 12);
    cfg.eventsPerRound = clamp(Math.round(cfg.eventsPerRound) || 1, 1, 4);
    this.cfg = cfg;
    ctx.mechanic = this;   // test hook: lets tooling drive the mechanic (debugAnswer, debugSkipTo)
  }

  // =============================================================== lifecycle
  init() {
    const { ctx, cfg } = this;
    const skills = ctx.content.skills || {};
    const ids = Object.keys(skills);
    this.choiceSkills = ids.filter(s => (skills[s].types || ['choice']).includes('choice'));
    this.numericSkills = new Set(ids.filter(s => (skills[s].types || []).includes('numeric')));
    if (!this.choiceSkills.length) throw new Error('Tycoon Sim needs a content pack with at least one skill of type "choice"');
    for (const s of ids) {
      const types = skills[s].types || ['choice'];
      if (!types.some(t => meta.itemTypes.includes(t))) throw new Error(`Tycoon Sim cannot consume skill ${s}: types [${types.join(', ')}] are not choice/numeric`);
    }
    const fin = cfg.finale.skills || [];
    this.finaleSkills = fin.filter(s => ids.includes(s));

    this.ended = false;
    this.phase = 'banner';
    this.phaseT = 0;
    this.round = 1;
    this.eventInRound = 0;
    this.stage = 1;
    this.roundsPerStage = Math.ceil(cfg.rounds / cfg.stages.length);
    this.totalEvents = cfg.rounds * cfg.eventsPerRound + Math.max(1, cfg.finale.linked | 0);
    this.eventsDone = 0;
    this.cash = cfg.startingCash;
    this.cashShown = cfg.startingCash;
    this.history = [cfg.startingCash];
    this.mods = { profitMul: 1, lossMul: 1, timeBonus: 0 };
    this.upgradesBought = [];
    this.loans = 0;
    this.correct = 0;
    this.total = 0;
    this.item = null;
    this.cards = [];
    this.cardsAlive = false;
    this.stakeIdx = 0;
    this.cursor = -1;
    this.cursorVisible = false;
    this.timer = 0;
    this.timerMax = 0;
    this.lastTickSec = -1;
    this.decideStart = 0;
    this.news = { x: 0, a: 0 };
    this.newsLines = null;
    this.chartAnim = { t: 0 };
    this.lastResult = null;
    this.flash = { a: 0, color: '#fff' };
    this.banner = { title: '', sub: '', a: 0, s: 0.6, color: cfg.palette.gold };
    this.bld = { s: 1 };
    this.skyMix = { v: 1 };
    this.skyFrom = 0;
    this.weather = { v: 0 };
    this.lightning = 0;
    this.lastThunder = -10;
    this.hintPulse = 0;
    this.finaleActive = false;
    this.finaleIndex = 0;
    this.finaleCorrect = 0;
    this.survived = null;
    this.shop = null;
    this.cashTick = 0;
    this.time = 0;
    this._grads = {};
    this.unsubs = [];

    // deterministic scenery
    const rng = ctx.rng;
    this.clouds = [];
    for (let i = 0; i < 6; i++) this.clouds.push({ x: rng.float(0, SCENE.w), y: rng.float(14, 110), r: rng.float(16, 30), v: rng.float(5, 14), a: rng.float(0.5, 0.9) });
    this.skyline = [];
    let sx = 0;
    while (sx < SCENE.w + 40) { const w = rng.int(22, 48); this.skyline.push({ x: sx, w, h: rng.int(26, 78), win: rng.int(0, 7) }); sx += w + rng.int(2, 8); }
    this.windows = [];
    for (let i = 0; i < 60; i++) this.windows.push(rng.chance(0.72) ? 1 : 0);
    this.visitors = [];
    this.rain = [];
    for (let i = 0; i < 46; i++) this.rain.push({ x: rng.float(0, SCENE.w), y: rng.float(0, SCENE.h), l: rng.float(10, 22), v: rng.float(380, 560) });

    ctx.hud.set({ score: 0, streak: 0, level: 1, levelLabel: this.levelLabel(), progress: 0, combo: 0 });
    this.unsubs.push(ctx.on('pause', () => ctx.audio.music.setIntensity(0.12)));
    this.unsubs.push(ctx.on('resume', () => ctx.audio.music.setIntensity(this.musicIntensity())));
    this.unsubs.push(ctx.input.onSwipe(dir => {
      if (this.phase !== 'decide') return;
      if (dir === 'up') this.setStake(this.stakeIdx + 1); else if (dir === 'down') this.setStake(this.stakeIdx - 1);
    }));
    this.startMusic();
    this.showBanner(`${cfg.roundLabel} 1`, `${cfg.stages[0].name}`, cfg.palette.gold, 1.5);
    this.phaseT = 1.3;
  }

  destroy() {
    for (const off of this.unsubs) { try { off(); } catch { /* ignore */ } }
    this.unsubs.length = 0;
    const { ctx } = this;
    ctx.tweens.killAll();
    ctx.particles.clear();
    ctx.floatingText.clear();
    ctx.audio.music.stop();
    ctx.overlay.hideHint();
    this.cards.length = 0;
    if (ctx.mechanic === this) ctx.mechanic = null;
  }
  onPause() { /* timers are dt-driven; nothing to do */ }
  onResume() { /* nothing to do */ }

  // =============================================================== helpers
  n(count) { return this.ctx.reducedMotion ? Math.ceil(count / 2) : count; }
  stageCfg(s = this.stage) { return this.cfg.stages[Math.min(this.cfg.stages.length, s) - 1]; }
  stageMul() { return (this.stageCfg().mul || 1) * (this.finaleActive ? 1.5 : 1); }
  money(v) { const c = this.cfg.currency; const r = Math.round(v); return (r < 0 ? '-' : '') + c + Math.abs(r).toLocaleString('en-US'); }
  levelLabel() {
    const { cfg } = this;
    if (this.finaleActive) return `${cfg.finale.name} ${Math.min(this.finaleIndex + 1, cfg.finale.linked)}/${cfg.finale.linked}`;
    return `${cfg.roundShort}${this.round} · ${this.stageCfg().name}`;
  }
  musicIntensity() { return this.finaleActive ? 1 : 0.35 + 0.2 * this.stage; }
  startMusic() {
    const { ctx } = this;
    ctx.audio.music.start(this.finaleActive ? (this.cfg.finale.music || 'boss') : (this.stageCfg().music || 'calm'));
    ctx.audio.music.setIntensity(this.musicIntensity());
  }
  showBanner(title, sub, color, hold = 1.4) {
    const b = this.banner;
    const tw = this.ctx.tweens;
    tw.killTarget(b);
    b.title = title; b.sub = sub || ''; b.color = color || this.cfg.palette.gold; b.a = 0; b.s = 0.6;
    tw.add(b, { a: 1, s: 1 }, 0.45, { ease: Easing.easeOutBack });
    tw.add(b, { a: 0 }, 0.35, { delay: 0.45 + hold, ease: Easing.easeInQuad });
  }
  doFlash(color, a = 0.45) {
    this.flash.color = color; this.flash.a = a;
    this.ctx.tweens.killTarget(this.flash);
    this.ctx.tweens.add(this.flash, { a: 0 }, 0.5);
  }
  burst(x, y, color, k = 1, shape = 'circle') {
    const p = this.ctx.particles;
    p.burst({ x, y, count: this.n(Math.round(22 * k)), colors: [color, '#ffffff', shade(color, 0.4)], speed: 260 * k, life: 0.8, size: 8, gravity: 300, friction: 0.92, shape });
    p.burst({ x, y, count: this.n(Math.round(8 * k)), colors: [this.cfg.palette.gold, '#fff'], speed: 200 * k, life: 0.9, size: 11, gravity: 220, shape: 'star' });
  }
  setStake(i) {
    const n = this.cfg.stakes.length;
    const v = clamp(i, 0, n - 1);
    if (v === this.stakeIdx) return;
    this.stakeIdx = v;
    this.ctx.audio.play('tick', { pitch: 0.9 + 0.15 * v });
  }

  // =============================================================== rounds
  startEvent() {
    if (this.ended) return;
    const { ctx, cfg } = this;
    let skill = null;
    if (this.finaleActive && this.finaleSkills.length) {
      for (let i = 0; i < 4 && !skill; i++) { const s = ctx.adaptive.nextSkill(); if (this.finaleSkills.includes(s)) skill = s; }
      if (!skill) skill = ctx.rng.pick(this.finaleSkills);
    } else skill = ctx.adaptive.nextSkill();
    const canNumeric = this.numericSkills.has(skill);
    const type = canNumeric && ctx.rng.chance(cfg.numericChance) ? 'numeric' : 'choice';
    const item = ctx.nextItem({ skill, type: this.choiceSkills.includes(skill) || type === 'numeric' ? type : 'numeric', choices: meta.choices });
    if (item.type === 'numeric' && cfg.numericTolerance > 0) item.tolerance = Math.max(item.tolerance || 0, Math.abs(item.answer) * cfg.numericTolerance);
    this.item = item;
    this.newsLines = null;
    this.chartAnim.t = 0;
    this.lastResult = null;
    this.cursor = -1;
    this.cursorVisible = false;
    this.stakeIdx = 0;
    this.needsHint = ctx.adaptive.needsHint(item.skill) && !!item.hint;
    if (this.needsHint) { ctx.overlay.showHint(item.hint); this.hintPulse = 1; }
    ctx.hud.set({ levelLabel: this.levelLabel(), level: this.stage });

    // news card slides in
    this.news.x = 80; this.news.a = 0;
    ctx.tweens.killTarget(this.news);
    ctx.tweens.add(this.news, { x: 0, a: 1 }, 0.5, { ease: Easing.easeOutCubic });
    ctx.audio.play('whoosh', { volume: 0.6 });
    ctx.audio.play('tick', { volume: 0.5, pitch: 1.4 });
    this.phase = 'news';
    this.phaseT = 0.55;
  }

  openDecision() {
    const { ctx, cfg } = this;
    const item = this.item;
    this.phase = 'decide';
    this.decideStart = performance.now();
    this.timerMax = cfg.roundTimerSec > 0 ? cfg.roundTimerSec + this.mods.timeBonus : 0;
    this.timer = this.timerMax;
    this.lastTickSec = -1;
    this.cards.length = 0;
    if (item.type === 'choice') {
      const n = item.choices.length;
      for (let i = 0; i < n; i++) {
        const col = i % 2, row = Math.floor(i / 2);
        this.cards.push({ text: item.choices[i], index: i, key: i + 1, x: SCENE.x + col * (CARD_W + CARD_GAP), y: row === 0 ? CARD_Y1 : CARD_Y2, w: CARD_W, h: CARD_H, s: 0, flash: 0, state: '', lines: null, font: 18 });
      }
    } else {
      this.cards.push({ text: 'Type your answer', index: -1, key: 1, x: SCENE.x, y: CARD_Y1, w: CARD_W * 2 + CARD_GAP, h: CARD_H, s: 0, flash: 0, state: '', lines: null, font: 20, numeric: true });
    }
    this.cardsAlive = true;
    this.cards.forEach((c, i) => ctx.tweens.add(c, { s: 1 }, 0.4, { ease: Easing.easeOutBack, delay: 0.05 * i }));
    ctx.audio.play('pop', { volume: 0.5 });
  }

  async askNumeric() {
    if (this.phase !== 'decide' || this.ended) return;
    const { ctx } = this;
    this.phase = 'question';
    ctx.audio.play('click');
    const remaining = this.timerMax > 0 ? Math.max(4, this.timer) : undefined;
    const res = await ctx.overlay.showQuestion(this.item, { timeLimit: remaining, allowHint: this.needsHint });
    if (this.ended) return;
    this.commit(res.chosen, res.responseMs, 0);
  }

  pickCard(c) {
    if (!c || this.phase !== 'decide' || this.ended) return;
    if (c.numeric) { this.askNumeric(); return; }
    this.commit(c.index, Math.round(performance.now() - this.decideStart), c);
  }

  commit(chosen, responseMs, card) {
    if (this.ended || (this.phase !== 'decide' && this.phase !== 'question')) return;
    const { ctx, cfg } = this;
    const item = this.item;
    this.phase = 'resolve';
    ctx.overlay.hideHint();
    const res = ctx.answer(item, chosen, { responseMs });
    this.total++;
    const stake = cfg.stakes[this.stakeIdx];
    const base = cfg.baseProfit * item.difficulty * this.stageMul() * (stake.mul || 1);
    const speed = cfg.speedBonusSec > 0 ? clamp(1 - responseMs / (cfg.speedBonusSec * 1000), 0, 1) : 0;
    const cx = card && card.x !== undefined ? card.x + card.w / 2 : ctx.width / 2;
    const cy = card && card.y !== undefined ? card.y : CARD_Y1;
    let delta;
    if (res.correct) {
      this.correct++;
      if (this.finaleActive) this.finaleCorrect++;
      delta = Math.round(base * this.mods.profitMul * (1 + 0.5 * speed) * (ctx.streak >= 5 ? 1.25 : 1) / 10) * 10;
      this.cash += delta;
      let pts = 100 * item.difficulty + Math.round(50 * speed);
      if (ctx.streak >= 5) pts *= 2;
      ctx.addScore(pts, { x: cx, y: cy - 10 });
      ctx.floatingText.add('+' + this.money(delta), SCENE.x + SCENE.w - 110, SCENE.y + SCENE.h - 92, { color: cfg.palette.gold, size: 30, duration: 1.3, vy: -50 });
      ctx.audio.play('coin', { pitch: 1 + Math.min(0.6, ctx.streak * 0.06) });
      this.burst(cx, cy + CARD_H / 2, cfg.palette.good, 1.1);
      ctx.particles.burst({ x: SCENE.x + SCENE.w * 0.42, y: SCENE.y + 190, count: this.n(14), colors: [cfg.palette.gold, '#fff6c2'], speed: 160, angle: -Math.PI / 2, spread: 1.1, life: 1, size: 7, gravity: 260, shape: 'circle' });
      this.doFlash(cfg.palette.good, 0.28);
      if (card) { card.state = 'good'; card.flash = 1; ctx.tweens.add(card, { flash: 0 }, 0.9); }
      const streak = ctx.streak;
      ctx.hud.set({ combo: streak >= 2 ? streak : 0 });
      if (streak === 5) { ctx.audio.play('powerup'); ctx.overlay.toast('Streak of 5: double XP and +25% profit', { type: 'good', duration: 1.8 }); if (!ctx.reducedMotion) ctx.shake.shake(4, 0.2); }
      else if (streak >= 3 && streak % 3 === 0) { ctx.audio.play('combo'); ctx.overlay.toast(`${streak} right in a row`, { type: 'good', duration: 1.2 }); }
      if (stake.mul > 1) ctx.floatingText.add(`${stake.label} x${stake.mul}`, cx, cy + CARD_H + 14, { color: '#fff', size: 18, duration: 0.9, vy: -30 });
    } else {
      delta = -Math.round(base * cfg.lossRatio * this.mods.lossMul / 10) * 10;
      this.cash += delta;
      ctx.floatingText.add(this.money(delta), SCENE.x + SCENE.w - 110, SCENE.y + SCENE.h - 92, { color: cfg.palette.bad, size: 30, duration: 1.4, vy: -40 });
      ctx.audio.play('hit');
      if (!ctx.reducedMotion) ctx.shake.shake(7, 0.3);
      this.doFlash(cfg.palette.bad, 0.35);
      ctx.particles.burst({ x: SCENE.x + SCENE.w * 0.42, y: SCENE.y + 180, count: this.n(16), colors: ['#5a5a6e', '#8a8a9e', cfg.palette.bad], speed: 90, angle: -Math.PI / 2, spread: 1.4, life: 1.3, size: 12, gravity: -40, friction: 0.96 });
      if (card) { card.state = 'bad'; card.flash = 1; ctx.tweens.add(card, { flash: 0 }, 1.2); }
      if (item.type === 'choice') for (const c of this.cards) if (c.index === item.correct) c.state = 'good';
      ctx.hud.set({ combo: 0 });
      if (this.cash < 0 && !this.finaleActive) {
        this.cash = 0;
        this.loans++;
        ctx.addScore(-cfg.loanPenalty);
        ctx.overlay.toast(`Emergency loan: cash reset, -${cfg.loanPenalty} score`, { type: 'bad', duration: 2 });
        ctx.audio.play('buzz');
      }
    }
    this.lastResult = { correct: res.correct, delta, chosen };
    ctx.tweens.killTarget(this.chartAnim);
    this.chartAnim.t = 0;
    ctx.tweens.add(this.chartAnim, { t: 1 }, 0.9, { ease: Easing.easeInOutCubic, delay: 0.15 });
    ctx.tweens.delay(res.correct ? 1.15 : 1.45, () => this.afterResolve(res, chosen));
  }

  async afterResolve(res, chosen) {
    if (this.ended) return;
    const { ctx } = this;
    if (!res.correct) {
      await ctx.feedback(this.item, chosen, false, { blocking: true });
      if (this.ended) return;
    }
    for (const c of this.cards) ctx.tweens.add(c, { s: 0 }, 0.25, { ease: Easing.easeInQuad });
    ctx.tweens.add(this.news, { x: -60, a: 0 }, 0.3, { ease: Easing.easeInQuad });
    this.cardsAlive = false;
    this.eventsDone++;
    ctx.hud.set({ progress: clamp(this.eventsDone / this.totalEvents, 0, 1) });
    this.phase = 'between';
    this.phaseT = 0.35;
  }

  nextStep() {
    if (this.ended) return;
    const { cfg } = this;
    if (this.finaleActive) {
      this.finaleIndex++;
      if (this.finaleIndex < cfg.finale.linked) { this.ctx.hud.set({ levelLabel: this.levelLabel() }); this.startEvent(); }
      else this.finishFinale();
      return;
    }
    this.eventInRound++;
    if (this.eventInRound < cfg.eventsPerRound) { this.startEvent(); return; }
    this.eventInRound = 0;
    this.history.push(this.cash);
    const finished = this.round;
    this.round++;
    const stageDone = finished % this.roundsPerStage === 0 || finished >= cfg.rounds;
    const newStage = Math.min(cfg.stages.length, Math.floor((this.round - 1) / this.roundsPerStage) + 1);
    const stageIdx = Math.min(cfg.stages.length, Math.ceil(finished / this.roundsPerStage));
    const after = () => {
      if (this.round > cfg.rounds) this.startFinale();
      else if (newStage !== this.stage) this.stageUp(newStage);
      else this.startEvent();
    };
    const offers = stageDone && Array.isArray(cfg.upgrades) ? cfg.upgrades[Math.min(cfg.upgrades.length, stageIdx) - 1] : null;
    if (offers && offers.length) this.openShop(offers, after); else after();
  }

  // =============================================================== shop
  openShop(offers, after) {
    const { ctx, cfg } = this;
    this.phase = 'shop';
    this.shop = { offers, after, cards: [], cursor: -1, skip: { x: ctx.width - 16 - 120, y: STAKE_Y, w: 120, h: STAKE_H } };
    offers.slice(0, 3).forEach((u, i) => {
      const c = { u, key: i + 1, x: SCENE.x + i * (SHOP_W + 16), y: SHOP_Y, w: SHOP_W, h: SHOP_H, s: 0, flash: 0, lines: null };
      this.shop.cards.push(c);
      ctx.tweens.add(c, { s: 1 }, 0.4, { ease: Easing.easeOutBack, delay: 0.08 * i });
    });
    ctx.audio.play('powerup', { volume: 0.7 });
    ctx.audio.music.setIntensity(0.25);
    ctx.overlay.toast('Reinvest your profits', { type: 'info', duration: 1.6 });
  }
  buy(i) {
    const sh = this.shop;
    if (!sh || this.phase !== 'shop') return;
    const c = sh.cards[i];
    if (!c) return;
    const { ctx, cfg } = this;
    if (this.cash < c.u.cost) {
      ctx.audio.play('buzz', { volume: 0.7 });
      c.flash = 1; ctx.tweens.add(c, { flash: 0 }, 0.6);
      ctx.overlay.toast('Not enough cash', { type: 'bad', duration: 1.1 });
      return;
    }
    this.cash -= c.u.cost;
    const e = c.u.effect || {};
    if (e.profitMul) this.mods.profitMul *= e.profitMul;
    if (e.lossMul) this.mods.lossMul *= e.lossMul;
    if (e.timeBonus) this.mods.timeBonus += e.timeBonus;
    this.upgradesBought.push(c.u.name);
    ctx.audio.play('coin', { pitch: 0.8 });
    ctx.audio.play('levelup', { volume: 0.6 });
    this.burst(c.x + c.w / 2, c.y + c.h / 2, cfg.palette.gold, 1.2, 'square');
    ctx.floatingText.add(c.u.name + ' built', SCENE.x + SCENE.w * 0.42, SCENE.y + 120, { color: cfg.palette.gold, size: 24, duration: 1.4, vy: -30 });
    ctx.addScore(50, { x: c.x + c.w / 2, y: c.y - 6 });
    this.closeShop();
  }
  closeShop() {
    const sh = this.shop;
    if (!sh) return;
    for (const c of sh.cards) this.ctx.tweens.add(c, { s: 0 }, 0.25);
    const after = sh.after;
    this.shop = null;
    this.phase = 'between';
    this.phaseT = 0.3;
    this.pendingAfter = after;
  }

  // =============================================================== stages + finale
  stageUp(s) {
    const { ctx, cfg } = this;
    this.skyFrom = this.stage - 1;
    this.stage = s;
    this.skyMix.v = 0;
    ctx.tweens.add(this.skyMix, { v: 1 }, 1.4);
    this.bld.s = 0;
    ctx.tweens.add(this.bld, { s: 1 }, 0.9, { ease: Easing.easeOutBack, delay: 0.3 });
    ctx.hud.set({ level: s, levelLabel: this.levelLabel() });
    ctx.hud.pulse('level');
    ctx.audio.play('levelup');
    if (s >= cfg.stages.length) ctx.audio.play('fanfare', { volume: 0.6 });
    if (!ctx.reducedMotion) ctx.shake.shake(6, 0.3);
    ctx.particles.burst({ x: SCENE.x + SCENE.w / 2, y: SCENE.y + 150, count: this.n(46), colors: [cfg.palette.gold, '#fff', cfg.palette.accent, cfg.palette.curveB], speed: 320, life: 1.1, size: 8, gravity: 260, shape: 'square' });
    this.startMusic();
    this.showBanner(`Stage ${s}: ${this.stageCfg().name}`, `${cfg.roundLabel} ${this.round} of ${cfg.rounds}`, cfg.palette.gold, 1.6);
    this.phase = 'banner';
    this.phaseT = 2.2;
  }

  startFinale() {
    const { ctx, cfg } = this;
    this.finaleActive = true;
    this.finaleIndex = 0;
    this.finaleCorrect = 0;
    if (cfg.finale.weather === 'storm') ctx.tweens.add(this.weather, { v: 1 }, 2.2);
    this.startMusic();
    ctx.audio.play('explode', { volume: 0.5, pitch: 0.7 });
    if (!ctx.reducedMotion) ctx.shake.shake(9, 0.5);
    ctx.hud.set({ levelLabel: this.levelLabel() });
    ctx.overlay.toast(cfg.finale.intro, { type: 'bad', duration: 3 });
    this.showBanner(cfg.finale.name.toUpperCase(), cfg.finale.intro, cfg.palette.bad, 2);
    this.phase = 'banner';
    this.phaseT = 2.6;
  }

  finishFinale() {
    const { ctx, cfg } = this;
    this.survived = this.cash > 0;
    this.phase = 'outro';
    this.phaseT = 2.8;
    if (this.survived) {
      ctx.tweens.add(this.weather, { v: 0 }, 1.5);
      ctx.audio.play('fanfare');
      if (!ctx.reducedMotion) ctx.shake.shake(8, 0.4);
      for (let i = 0; i < 3; i++) ctx.tweens.delay(0.2 * i, () => ctx.particles.burst({ x: ctx.width * (0.25 + 0.25 * i), y: 200, count: this.n(50), colors: [cfg.palette.gold, '#fff', cfg.palette.good, cfg.palette.curveB, cfg.palette.accent], speed: 360, life: 1.4, size: 9, gravity: 240, shape: 'square' }));
      ctx.addScore(500 + 250 * this.finaleCorrect, { x: ctx.width / 2, y: 330 });
      this.showBanner(cfg.finale.successTitle, cfg.finale.successText, cfg.palette.gold, 2.2);
    } else {
      ctx.audio.play('explode', { volume: 0.8 });
      ctx.audio.play('buzz');
      this.showBanner(cfg.finale.failTitle, cfg.finale.failText, cfg.palette.bad, 2.2);
    }
  }

  finish() {
    if (this.ended) return;
    this.ended = true;
    const { ctx, cfg } = this;
    ctx.overlay.hideHint();
    const stagesDone = this.stage - 1 + (this.round > cfg.rounds ? 1 : 0);
    ctx.endGame({
      score: ctx.score, correct: this.correct, total: this.total,
      bonusXP: stagesDone * cfg.bonusXPPerStage + (this.survived ? cfg.finaleBonusXP : 0),
      stats: [
        { label: 'Final cash', value: this.money(this.cash) },
        { label: 'Outcome', value: this.survived === null ? 'Unfinished' : this.survived ? cfg.finale.successTitle : cfg.finale.failTitle },
        { label: 'Upgrades', value: this.upgradesBought.length },
        { label: `${cfg.roundLabel}s run`, value: `${Math.min(this.round, cfg.rounds)}/${cfg.rounds}` },
      ],
    });
  }

  // ---- test hooks (used by tooling; harmless in play) ----
  debugAnswer(wrong = true) {
    if (this.phase !== 'decide' || !this.item) return false;
    if (this.item.type === 'numeric') { this.commit(wrong ? this.item.answer + 7 : this.item.answer, 1500, null); return true; }
    const i = wrong ? (this.item.correct + 1) % this.item.choices.length : this.item.correct;
    this.commit(i, 1500, this.cards[i]);
    return true;
  }
  debugSkipTo(what) {
    const { cfg } = this;
    if (this.ended) return;
    this.ctx.tweens.killTarget(this.news);
    this.cards.length = 0; this.cardsAlive = false; this.shop = null;
    if (what === 'finale') { this.round = cfg.rounds + 1; this.stage = cfg.stages.length; this.eventsDone = cfg.rounds * cfg.eventsPerRound; this.startFinale(); }
    else if (what === 'stage2') { this.round = this.roundsPerStage + 1; this.stageUp(2); }
    else if (what === 'shop') { this.openShop(cfg.upgrades[0], () => this.startEvent()); }
    else if (what === 'end') { this.survived = this.cash > 0; this.finish(); }
  }

  // =============================================================== frame
  update(dt) {
    if (this.ended) return;
    const { ctx, cfg } = this;
    const inp = ctx.input;
    this.time += dt;

    // ambient
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > SCENE.w + 40) c.x = -40; }
    this.updateVisitors(dt);
    if (this.weather.v > 0.02) {
      for (const r of this.rain) { r.y += r.v * dt; r.x -= 60 * dt; if (r.y > SCENE.h) { r.y = -r.l; r.x = ctx.rng.float(0, SCENE.w + 40); } if (r.x < 0) r.x += SCENE.w; }
      if (this.lightning > 0) this.lightning = Math.max(0, this.lightning - dt * 3);
      else if (ctx.rng.chance(dt * 0.25)) { this.lightning = 1; if (this.time - this.lastThunder > 3) { this.lastThunder = this.time; ctx.audio.play('explode', { volume: 0.25, pitch: 0.6 }); } }
    }
    if (this.hintPulse > 0) this.hintPulse = Math.max(0, this.hintPulse - dt * 0.25);

    // cash roll-up
    const diff = this.cash - this.cashShown;
    if (Math.abs(diff) > 0.5) {
      this.cashShown += diff * Math.min(1, dt * 5);
      this.cashTick += dt;
      if (this.cashTick > 0.07) { this.cashTick = 0; ctx.audio.play('tick', { volume: 0.18, pitch: diff > 0 ? 1.6 : 0.8 }); }
    } else this.cashShown = this.cash;

    // phase machine
    switch (this.phase) {
      case 'banner':
        this.phaseT -= dt;
        if (this.phaseT <= 0) this.startEvent();
        break;
      case 'news':
        this.phaseT -= dt;
        if (this.phaseT <= 0) this.openDecision();
        break;
      case 'decide':
        if (this.timerMax > 0) {
          this.timer -= dt;
          const sec = Math.ceil(this.timer);
          if (sec !== this.lastTickSec && sec <= 5 && sec > 0) { this.lastTickSec = sec; ctx.audio.play('buzz', { volume: 0.5 }); }
          if (this.timer <= 0) { this.commit(null, Math.round(this.timerMax * 1000), null); return; }
        }
        this.handleDecideInput(inp);
        break;
      case 'shop':
        this.handleShopInput(inp);
        break;
      case 'between':
        this.phaseT -= dt;
        if (this.phaseT <= 0) {
          if (this.pendingAfter) { const f = this.pendingAfter; this.pendingAfter = null; f(); }
          else this.nextStep();
        }
        break;
      case 'outro':
        this.phaseT -= dt;
        if (this.phaseT <= 0) this.finish();
        break;
      default: break;
    }
  }

  handleDecideInput(inp) {
    const n = this.cards.length;
    for (let k = 0; k < 4; k++) if (inp.wasPressed(DIGITS[k]) || inp.wasPressed(NUMPAD[k])) { if (k < n) { this.pickCard(this.cards[k]); return; } }
    if (inp.wasPressed('ArrowUp') || inp.wasPressed('KeyW')) this.setStake(this.stakeIdx + 1);
    if (inp.wasPressed('ArrowDown') || inp.wasPressed('KeyS')) this.setStake(this.stakeIdx - 1);
    if (inp.wasPressed('ArrowLeft') || inp.wasPressed('KeyA')) { this.cursorVisible = true; this.cursor = (this.cursor - 1 + n) % n; this.ctx.audio.play('tick'); }
    if (inp.wasPressed('ArrowRight') || inp.wasPressed('KeyD')) { this.cursorVisible = true; this.cursor = (this.cursor + 1) % n; this.ctx.audio.play('tick'); }
    if (inp.wasPressed('Enter') || inp.wasPressed('Space') || inp.wasPressed('NumpadEnter')) {
      if (n === 1) { this.pickCard(this.cards[0]); return; }
      if (this.cursorVisible && this.cursor >= 0) { this.pickCard(this.cards[this.cursor]); return; }
      this.cursorVisible = true; this.cursor = 0; this.ctx.audio.play('click');
    }
    if (inp.pointer.justDown) {
      const p = inp.pointer;
      const st = this.stakeRects();
      for (let i = 0; i < st.length; i++) { const r = st[i]; if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y - 6 && p.y <= r.y + r.h + 6) { this.setStake(i); return; } }
      for (const c of this.cards) if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { this.pickCard(c); return; }
    }
  }
  handleShopInput(inp) {
    const sh = this.shop;
    if (!sh) return;
    for (let k = 0; k < 3; k++) if (inp.wasPressed(DIGITS[k]) || inp.wasPressed(NUMPAD[k])) { this.buy(k); return; }
    if (inp.wasPressed('Digit4') || inp.wasPressed('Numpad4')) { this.ctx.audio.play('click'); this.closeShop(); return; }
    if (inp.wasPressed('ArrowLeft') || inp.wasPressed('KeyA')) { sh.cursor = (sh.cursor - 1 + sh.cards.length) % sh.cards.length; this.ctx.audio.play('tick'); }
    if (inp.wasPressed('ArrowRight') || inp.wasPressed('KeyD')) { sh.cursor = (sh.cursor + 1) % sh.cards.length; this.ctx.audio.play('tick'); }
    if (inp.wasPressed('Enter') || inp.wasPressed('Space') || inp.wasPressed('NumpadEnter')) { if (sh.cursor >= 0) this.buy(sh.cursor); else { this.ctx.audio.play('click'); this.closeShop(); } return; }
    if (inp.pointer.justDown) {
      const p = inp.pointer;
      const k = sh.skip;
      if (p.x >= k.x && p.x <= k.x + k.w && p.y >= k.y && p.y <= k.y + k.h) { this.ctx.audio.play('click'); this.closeShop(); return; }
      for (let i = 0; i < sh.cards.length; i++) { const c = sh.cards[i]; if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { this.buy(i); return; } }
    }
  }
  stakeRects() {
    const out = this._stakeRects || (this._stakeRects = []);
    out.length = 0;
    const labelW = 118;
    let x = SCENE.x + labelW;
    for (let i = 0; i < this.cfg.stakes.length; i++) { out.push({ x, y: STAKE_Y, w: 112, h: STAKE_H }); x += 120; }
    return out;
  }

  updateVisitors(dt) {
    const { ctx, cfg } = this;
    const target = this.finaleActive ? 1 : Math.min(9, 2 + this.stage * 2 + Math.min(3, Math.floor(ctx.streak / 2)));
    const laneL = 6, laneR = SCENE.w - 232;
    if (this.visitors.length < target && ctx.rng.chance(dt * 1.2)) {
      const dir = ctx.rng.chance(0.5) ? 1 : -1;
      this.visitors.push({ x: dir > 0 ? laneL - 10 : laneR + 10, y: ctx.rng.float(232, 268), v: ctx.rng.float(26, 48) * dir, c: ctx.rng.pick(cfg.palette.visitors), ph: ctx.rng.float(0, 6.28), sz: ctx.rng.float(0.85, 1.15) });
    }
    for (let i = this.visitors.length - 1; i >= 0; i--) {
      const v = this.visitors[i];
      v.x += v.v * dt; v.ph += dt * 9;
      if (v.x < laneL - 16 || v.x > laneR + 16) this.visitors.splice(i, 1);
      else if (this.visitors.length > target && ctx.rng.chance(dt * 0.4)) this.visitors.splice(i, 1);
    }
  }

  // =============================================================== render
  grad(g, key, make) { return this._grads[key] || (this._grads[key] = make()); }

  render(g) {
    const { ctx, cfg } = this;
    const P = cfg.palette;
    const W = ctx.width, H = ctx.height;
    // backdrop
    g.fillStyle = this.grad(g, 'bg', () => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0f1430'); gr.addColorStop(1, '#1a1f45'); return gr; });
    g.fillRect(0, 0, W, H);
    this.renderScene(g);
    this.renderChartPanel(g);
    if (this.phase === 'shop' && this.shop) this.renderShop(g);
    else this.renderDecision(g);
    // flash + banner
    if (this.flash.a > 0.01) { g.fillStyle = hexToRgba(this.flash.color, this.flash.a * 0.5); g.fillRect(0, 0, W, H); }
    if (this.banner.a > 0.01) this.renderBanner(g);
    void P;
  }

  // ---------- scene (left) ----------
  renderScene(g) {
    const { ctx, cfg } = this;
    const P = cfg.palette;
    const S = SCENE;
    g.save();
    roundRect(g, S.x, S.y, S.w, S.h, 18);
    g.clip();
    const stIdx = this.stage - 1;
    const sky = i => this.grad(g, 'sky' + i, () => { const [t, b] = this.stageCfg(i + 1).sky; const gr = g.createLinearGradient(0, S.y, 0, S.y + 210); gr.addColorStop(0, t); gr.addColorStop(1, b); return gr; });
    g.fillStyle = sky(stIdx); g.fillRect(S.x, S.y, S.w, S.h);
    if (this.skyMix.v < 1) { g.globalAlpha = 1 - this.skyMix.v; g.fillStyle = sky(this.skyFrom); g.fillRect(S.x, S.y, S.w, S.h); g.globalAlpha = 1; }
    // sun
    const sunX = S.x + 330, sunY = S.y + 54;
    g.fillStyle = this.grad(g, 'sun', () => { const gr = g.createRadialGradient(sunX, sunY, 6, sunX, sunY, 70); gr.addColorStop(0, 'rgba(255,245,200,0.95)'); gr.addColorStop(0.3, 'rgba(255,230,140,0.55)'); gr.addColorStop(1, 'rgba(255,230,140,0)'); return gr; });
    g.beginPath(); g.arc(sunX, sunY, 70, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(sunX, sunY, 22, 0, Math.PI * 2); g.fill();
    // far clouds
    for (const c of this.clouds) {
      g.fillStyle = `rgba(255,255,255,${0.45 * c.a})`;
      const cx = S.x + c.x, cy = S.y + c.y;
      g.beginPath(); g.ellipse(cx, cy, c.r * 1.6, c.r * 0.6, 0, 0, Math.PI * 2); g.ellipse(cx - c.r * 0.7, cy + 3, c.r * 0.9, c.r * 0.45, 0, 0, Math.PI * 2); g.ellipse(cx + c.r * 0.8, cy + 4, c.r, c.r * 0.5, 0, 0, Math.PI * 2); g.fill();
    }
    // skyline (depth layer, grows with stage)
    const horizon = S.y + 200;
    if (this.stage >= 2 || this.skyMix.v < 1) {
      const a = this.stage >= 2 ? 1 : 0;
      g.globalAlpha = a * 0.55 + (this.stage >= 3 ? 0.25 : 0);
      g.fillStyle = '#243058';
      for (const b of this.skyline) { const hh = b.h * (this.stage >= 3 ? 1.5 : 1); g.fillRect(S.x + b.x, horizon - hh, b.w, hh); }
      g.fillStyle = 'rgba(255,230,150,0.55)';
      for (const b of this.skyline) { const hh = b.h * (this.stage >= 3 ? 1.5 : 1); for (let k = 0; k < b.win; k++) g.fillRect(S.x + b.x + 4 + (k % 3) * 7, horizon - hh + 6 + Math.floor(k / 3) * 9, 3, 4); }
      g.globalAlpha = 1;
    }
    // ground + street
    g.fillStyle = this.stageCfg().ground || '#6fae62'; g.fillRect(S.x, horizon, S.w, S.h - 200);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(S.x, horizon + 26, S.w, 56);
    g.fillStyle = 'rgba(255,255,255,0.22)';
    for (let x = 0; x < S.w; x += 36) g.fillRect(S.x + x + ((this.time * 20) % 36), horizon + 53, 18, 3);
    // building
    this.renderBuilding(g, S.x + 150, horizon + 4, this.stageCfg().building, this.bld.s);
    // visitors
    for (const v of this.visitors) this.renderVisitor(g, S.x + v.x, S.y + v.y, v);
    // weather
    if (this.weather.v > 0.01) {
      const w = this.weather.v;
      g.fillStyle = `rgba(8,10,30,${0.5 * w})`; g.fillRect(S.x, S.y, S.w, S.h);
      g.strokeStyle = `rgba(200,220,255,${0.5 * w})`; g.lineWidth = 1.5;
      g.beginPath();
      for (const r of this.rain) { g.moveTo(S.x + r.x, S.y + r.y); g.lineTo(S.x + r.x - 3, S.y + r.y + r.l); }
      g.stroke();
      g.fillStyle = `rgba(40,44,70,${0.8 * w})`;
      for (let i = 0; i < 4; i++) { const cx = S.x + 60 + i * 95 + Math.sin(this.time * 0.4 + i) * 10, cy = S.y + 30; g.beginPath(); g.ellipse(cx, cy, 58, 22, 0, 0, Math.PI * 2); g.ellipse(cx - 30, cy + 8, 36, 16, 0, 0, Math.PI * 2); g.ellipse(cx + 34, cy + 9, 40, 17, 0, 0, Math.PI * 2); g.fill(); }
      if (this.lightning > 0) { g.fillStyle = `rgba(255,255,255,${0.55 * this.lightning * w})`; g.fillRect(S.x, S.y, S.w, S.h); }
    }
    // cash panel
    const cw = 210, ch = 66, cx = S.x + S.w - cw - 10, cy = S.y + S.h - ch - 10;
    roundRect(g, cx, cy, cw, ch, 14, { fill: P.panel, stroke: P.line, lineWidth: 1.5 });
    drawText(g, cfg.cashLabel.toUpperCase(), cx + 14, cy + 16, { font: FONT(800, 16), color: P.dim, align: 'left' });
    const low = this.cash <= 0;
    drawText(g, this.money(this.cashShown), cx + 14, cy + 42, { font: FONT(900, 30), color: low ? P.bad : P.gold, align: 'left', maxWidth: cw - 28 });
    // hint pulse on building when adaptive hint is active
    if (this.hintPulse > 0) { g.fillStyle = `rgba(255,213,74,${0.08 * this.hintPulse * (0.6 + 0.4 * Math.sin(this.time * 6))})`; g.fillRect(S.x, S.y, S.w, S.h); }
    g.restore();
    // frame
    roundRect(g, S.x, S.y, S.w, S.h, 18, { stroke: P.line, lineWidth: 1.5 });
    // stage chip
    const label = `${cfg.roundLabel} ${Math.min(this.round, cfg.rounds)} · ${this.stageCfg().name}`;
    roundRect(g, S.x + 10, S.y + 10, 236, 30, 10, { fill: P.panel, stroke: P.line, lineWidth: 1.2 });
    drawText(g, this.finaleActive ? cfg.finale.name.toUpperCase() : label, S.x + 22, S.y + 25, { font: FONT(800, 16), color: this.finaleActive ? P.bad : P.text, align: 'left', maxWidth: 214 });
  }

  renderBuilding(g, cx, gy, style, s) {
    const { cfg } = this;
    const P = cfg.palette;
    if (s <= 0.01) return;
    g.save();
    g.translate(cx, gy);
    g.scale(s, s);
    const acc = P.accent;
    const flags = this.upgradesBought.length;
    if (style === 'stand') {
      // booth
      g.fillStyle = '#b5742f'; g.fillRect(-52, -62, 104, 62);
      g.fillStyle = '#d99a4c'; g.fillRect(-52, -62, 104, 10);
      g.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = 0; i < 4; i++) g.fillRect(-48 + i * 26, -50, 2, 50);
      // awning
      g.fillStyle = acc; g.beginPath(); g.moveTo(-64, -62); g.lineTo(64, -62); g.lineTo(56, -92); g.lineTo(-56, -92); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = -56; i < 56; i += 16) { g.beginPath(); g.moveTo(i, -92); g.lineTo(i + 8, -92); g.lineTo(i + 9, -62); g.lineTo(i + 1, -62); g.closePath(); g.fill(); }
      for (let i = -64; i < 64; i += 16) { g.fillStyle = (i / 16) % 2 === 0 ? acc : '#fff'; g.beginPath(); g.arc(i + 8, -62, 8, 0, Math.PI); g.fill(); }
      // posts + sign
      g.fillStyle = '#8a5a24'; g.fillRect(-60, -118, 6, 56); g.fillRect(54, -118, 6, 56);
      roundRect(g, -58, -132, 116, 24, 6, { fill: '#fff8e6', stroke: shade(acc, -0.2), lineWidth: 2 });
      drawText(g, cfg.brand, 0, -120, { font: FONT(900, 15), color: shade(acc, -0.35), maxWidth: 104 });
      // product jar
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(14, -84, 22, 22); g.fillStyle = P.gold; g.fillRect(16, -76, 18, 12);
    } else if (style === 'shop') {
      g.fillStyle = '#e9d5b8'; g.fillRect(-100, -120, 200, 120);
      g.fillStyle = '#c9a97e'; g.fillRect(-100, -120, 200, 8);
      // windows + door
      for (const wx of [-82, 24]) { roundRect(g, wx, -74, 58, 46, 6, { fill: '#9fd3ff', stroke: '#6b6b6b', lineWidth: 2 }); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(wx + 6, -70, 14, 38); }
      roundRect(g, -16, -66, 32, 66, 4, { fill: shade(acc, -0.3), stroke: '#5a3a1a', lineWidth: 2 }); g.fillStyle = P.gold; g.beginPath(); g.arc(8, -36, 3, 0, Math.PI * 2); g.fill();
      // awning
      g.fillStyle = acc; g.fillRect(-106, -92, 212, 14);
      for (let i = -106; i < 106; i += 20) { g.fillStyle = ((i + 106) / 20) % 2 === 0 ? acc : '#fff'; g.beginPath(); g.arc(i + 10, -78, 10, 0, Math.PI); g.fill(); }
      // sign band
      roundRect(g, -94, -116, 188, 22, 6, { fill: shade(acc, -0.45) });
      drawText(g, cfg.brand, 0, -105, { font: FONT(900, 16), color: '#fff', maxWidth: 170 });
      // roof logo
      g.fillStyle = acc; g.beginPath(); g.arc(0, -134, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -134, 5, 0, Math.PI * 2); g.fill();
    } else {
      // tower + side buildings
      g.fillStyle = '#3a4a7a'; g.fillRect(-150, -120, 70, 120); g.fillRect(80, -140, 70, 140);
      g.fillStyle = 'rgba(255,230,150,0.5)'; for (let r = 0; r < 9; r++) for (let c = 0; c < 3; c++) { if ((r + c) % 3 !== 0) g.fillRect(-142 + c * 20, -110 + r * 12, 10, 6); if ((r + c) % 4 !== 1) g.fillRect(88 + c * 20, -130 + r * 14, 10, 6); }
      g.fillStyle = this.grad(g, 'tower', () => { const gr = g.createLinearGradient(-70, 0, 70, 0); gr.addColorStop(0, '#5a6fb0'); gr.addColorStop(0.5, '#7f95d8'); gr.addColorStop(1, '#4a5c98'); return gr; });
      g.fillRect(-70, -210, 140, 210);
      let k = 0;
      for (let r = 0; r < 12; r++) for (let c = 0; c < 5; c++) { g.fillStyle = this.windows[k++ % this.windows.length] ? 'rgba(255,235,170,0.85)' : 'rgba(20,25,50,0.5)'; g.fillRect(-58 + c * 24, -198 + r * 16, 14, 9); }
      g.fillStyle = '#2d3a66'; g.fillRect(-74, -216, 148, 8); g.fillRect(-6, -246, 12, 30);
      g.fillStyle = acc; g.beginPath(); g.arc(0, -250, 6 + 2 * Math.sin(this.time * 4), 0, Math.PI * 2); g.fill();
      roundRect(g, -62, -176, 124, 24, 6, { fill: shade(acc, -0.4), stroke: 'rgba(255,255,255,0.3)', lineWidth: 1.5 });
      drawText(g, cfg.brand, 0, -164, { font: FONT(900, 15), color: '#fff', maxWidth: 110 });
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(-70, -210, 24, 210);
    }
    // upgrade flags
    for (let i = 0; i < flags; i++) {
      const fx = -140 + i * 26;
      g.fillStyle = '#ddd'; g.fillRect(fx, -70, 2, 70);
      g.fillStyle = [P.gold, P.good, P.curveB, acc, P.curveA][i % 5];
      const wave = Math.sin(this.time * 5 + i) * 3;
      g.beginPath(); g.moveTo(fx + 2, -70); g.lineTo(fx + 22, -64 + wave); g.lineTo(fx + 2, -56); g.closePath(); g.fill();
    }
    g.restore();
  }

  renderVisitor(g, x, y, v) {
    const walk = Math.sin(v.ph);
    const sz = v.sz;
    g.save();
    g.translate(x, y);
    g.scale(sz * (v.v < 0 ? -1 : 1), sz);
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(0, 1, 8, 2.5, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2a2f55'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-2, -12); g.lineTo(-2 + walk * 5, 0); g.moveTo(2, -12); g.lineTo(2 - walk * 5, 0); g.stroke();
    if (this.cfg.visitorStyle === 'robots') {
      g.fillStyle = v.c; g.fillRect(-7, -30, 14, 19);
      g.fillStyle = '#cfd8ff'; g.fillRect(-6, -42, 12, 11);
      g.fillStyle = '#1a1f3a'; g.fillRect(-3, -39, 2, 2); g.fillRect(1, -39, 2, 2);
      g.strokeStyle = '#cfd8ff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -42); g.lineTo(0, -47); g.stroke();
      g.fillStyle = this.cfg.palette.good; g.beginPath(); g.arc(0, -48, 2, 0, Math.PI * 2); g.fill();
    } else {
      roundRect(g, -7, -30, 14, 19, 5, { fill: v.c });
      g.fillStyle = '#f2c6a0'; g.beginPath(); g.arc(0, -36, 6.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3b2a20'; g.beginPath(); g.arc(0, -39, 6.5, Math.PI, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  // ---------- chart panel (right) ----------
  renderChartPanel(g) {
    const { cfg } = this;
    const P = cfg.palette;
    const C = CHART;
    roundRect(g, C.x, C.y, C.w, C.h, 18, { fill: P.panel, stroke: P.line, lineWidth: 1.5 });
    const item = this.item;
    const visual = item && item.visual && typeof item.visual === 'object' ? item.visual : null;
    const showNews = item && this.news.a > 0.01 && this.phase !== 'shop' && this.phase !== 'outro';
    // news card
    if (showNews) {
      g.save();
      g.globalAlpha = this.news.a;
      const nx = C.x + 12 + this.news.x, ny = C.y + 10, nw = C.w - 24;
      roundRect(g, nx, ny, nw, NEWS_H, 12, { fill: 'rgba(255,255,255,0.07)', stroke: P.line, lineWidth: 1 });
      g.fillStyle = P.accent; roundRect(g, nx, ny, 6, NEWS_H, 3, { fill: P.accent });
      const diffLabel = `${cfg.newsLabel.toUpperCase()}  ·  ${(this.ctx.content.skills[item.skill] || {}).name || ''}  ·  LEVEL ${item.difficulty}`;
      drawText(g, diffLabel, nx + 16, ny + 15, { font: FONT(800, 14), color: P.dim, align: 'left', maxWidth: nw - 120 });
      if (!this.newsLines) {
        let size = 18, lines;
        do { lines = wrapText(g, item.prompt, nw - 30, FONT(700, size)); if (lines.length <= 3) break; size--; } while (size > 14);
        this.newsLines = lines; this.newsFont = size;
      }
      const lh = this.newsFont + 4;
      const y0 = ny + 36;
      for (let i = 0; i < this.newsLines.length; i++) drawText(g, this.newsLines[i], nx + 16, y0 + i * lh, { font: FONT(700, this.newsFont), color: P.text, align: 'left', maxWidth: nw - 30 });
      // timer bar
      if (this.timerMax > 0 && (this.phase === 'decide' || this.phase === 'question' || this.phase === 'news')) {
        const f = clamp(this.timer / this.timerMax, 0, 1);
        const col = this.timer <= 5 ? P.bad : P.gold;
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(nx + 12, ny + NEWS_H - 7, nw - 24, 4);
        g.fillStyle = col; g.fillRect(nx + 12, ny + NEWS_H - 7, (nw - 24) * f, 4);
        drawText(g, `${Math.ceil(this.timer)}s`, nx + nw - 14, ny + 15, { font: FONT(900, 15), color: col, align: 'right' });
      }
      g.restore();
    }
    // chart
    const top = C.y + 10 + NEWS_H + 8;
    const area = { x: C.x + 14, y: showNews ? top : C.y + 14, w: C.w - 28, h: C.y + C.h - 12 - (showNews ? top : C.y + 14) };
    const kind = visual ? visual.kind : null;
    const title = (visual && visual.title) || (kind ? cfg.chartTitle : cfg.historyTitle);
    drawText(g, title.toUpperCase(), area.x + 4, area.y + 8, { font: FONT(800, 14), color: P.dim, align: 'left', maxWidth: area.w * 0.5 });
    const plot = { x: area.x + 44, y: area.y + 24, w: area.w - 56, h: area.h - 50 };
    if (kind === 'sd-chart') this.renderSD(g, plot, visual, this.chartAnim.t);
    else if (kind === 'line') this.renderLine(g, plot, visual, this.chartAnim.t);
    else if (kind === 'bar') this.renderBar(g, plot, visual, this.chartAnim.t);
    else this.renderHistory(g, plot);
    // result badge
    if (this.lastResult && this.chartAnim.t > 0.15 && this.phase !== 'shop') {
      const r = this.lastResult;
      const a = clamp((this.chartAnim.t - 0.15) / 0.3, 0, 1);
      g.save(); g.globalAlpha = a;
      const txt = r.correct ? `✓ Correct  ${this.money(r.delta)}` : `✗ Wrong  ${this.money(r.delta)}`;
      const bw = 230;
      roundRect(g, C.x + C.w - bw - 14, area.y - 2, bw, 26, 8, { fill: r.correct ? hexToRgba(P.good, 0.25) : hexToRgba(P.bad, 0.25), stroke: r.correct ? P.good : P.bad, lineWidth: 1.5 });
      drawText(g, txt, C.x + C.w - 14 - bw / 2, area.y + 11, { font: FONT(900, 15), color: r.correct ? P.good : P.bad, maxWidth: bw - 16 });
      g.restore();
    }
  }

  axes(g, plot, xLabel, yLabel) {
    const P = this.cfg.palette;
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(plot.x, plot.y - 4); g.lineTo(plot.x, plot.y + plot.h); g.lineTo(plot.x + plot.w + 6, plot.y + plot.h); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath(); g.moveTo(plot.x, plot.y - 10); g.lineTo(plot.x - 4, plot.y - 3); g.lineTo(plot.x + 4, plot.y - 3); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(plot.x + plot.w + 12, plot.y + plot.h); g.lineTo(plot.x + plot.w + 5, plot.y + plot.h - 4); g.lineTo(plot.x + plot.w + 5, plot.y + plot.h + 4); g.closePath(); g.fill();
    if (yLabel) drawText(g, yLabel, plot.x - 6, plot.y - 10, { font: FONT(800, 14), color: P.dim, align: 'left' });
    if (xLabel) drawText(g, xLabel, plot.x + plot.w + 2, plot.y + plot.h + 14, { font: FONT(800, 14), color: P.dim, align: 'right' });
  }

  renderSD(g, plot, v, t) {
    const P = this.cfg.palette;
    const curves = Array.isArray(v.curves) ? v.curves : [];
    this.axes(g, plot, v.xLabel, v.yLabel);
    const px = nx => plot.x + nx * plot.w, py = ny => plot.y + ny * plot.h;
    const ends = (c, shiftAmt) => {
      const dx = 0.17 * shiftAmt;
      return c.slope === 'up' ? [0.1 + dx, 0.95, 0.9 + dx, 0.1] : [0.1 + dx, 0.1, 0.9 + dx, 0.95];
    };
    const inter = (a, b) => {
      const [x1, y1, x2, y2] = a, [x3, y3, x4, y4] = b;
      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(den) < 1e-6) return null;
      const tt = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
      return [x1 + tt * (x2 - x1), y1 + tt * (y2 - y1)];
    };
    g.save();
    g.beginPath(); g.rect(plot.x - 2, plot.y - 12, plot.w + 16, plot.h + 14); g.clip();
    const cols = [P.curveA, P.curveB, P.gold, P.good];
    const drawCurve = (e, color, width, alpha, dash) => {
      g.save(); g.globalAlpha = alpha; g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round';
      if (dash) g.setLineDash([7, 6]);
      g.beginPath(); g.moveTo(px(e[0]), py(e[1])); g.lineTo(px(e[2]), py(e[3])); g.stroke(); g.restore();
    };
    const base = curves.map(c => ends(c, 0));
    const now = curves.map(c => ends(c, (Number(c.shift) || 0) * t));
    // hint pulse highlights a curve
    curves.forEach((c, i) => {
      const hl = this.hintPulse > 0 && v.highlight && v.highlight === c.id;
      if (t > 0.02 && c.shift) drawCurve(base[i], cols[i % cols.length], 3, 0.35, true);
      drawCurve(now[i], cols[i % cols.length], hl ? 5 + 2 * Math.sin(this.time * 8) : 3.5, 1, false);
      if (c.shift && t > 0.05) {
        // arrow from old to new curve at mid height
        const mid = 0.5;
        const xa = base[i][0] + (base[i][2] - base[i][0]) * ((mid - base[i][1]) / (base[i][3] - base[i][1]));
        const xb = now[i][0] + (now[i][2] - now[i][0]) * ((mid - now[i][1]) / (now[i][3] - now[i][1]));
        if (Math.abs(xb - xa) > 0.01) {
          g.save(); g.strokeStyle = P.gold; g.fillStyle = P.gold; g.lineWidth = 2.5;
          const ax = px(xa), bx = px(xb), yy = py(mid) + (i === 0 ? -16 : 16);
          g.beginPath(); g.moveTo(ax, yy); g.lineTo(bx, yy); g.stroke();
          const dir = Math.sign(bx - ax);
          g.beginPath(); g.moveTo(bx + dir * 6, yy); g.lineTo(bx - dir * 4, yy - 5); g.lineTo(bx - dir * 4, yy + 5); g.closePath(); g.fill();
          g.restore();
        }
      }
      // label at the top end of the curve
      const e = now[i];
      const topIsEnd = e[3] < e[1];
      const lx = topIsEnd ? e[2] : e[0], ly = topIsEnd ? e[3] : e[1];
      drawText(g, (c.id || c.label || '').slice(0, 8), px(lx) + (topIsEnd ? 10 : -10), py(ly) + 8, { font: FONT(900, 15), color: cols[i % cols.length], align: topIsEnd ? 'left' : 'right' });
    });
    // equilibria
    if (curves.length >= 2) {
      const e0 = inter(base[0], base[1]);
      const e1 = inter(now[0], now[1]);
      const ys = v.yShort || 'P', xs = v.xShort || 'Q';
      const proj = (e, alpha, label) => {
        if (!e) return;
        g.save(); g.globalAlpha = alpha; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.2; g.setLineDash([4, 5]);
        g.beginPath(); g.moveTo(plot.x, py(e[1])); g.lineTo(px(e[0]), py(e[1])); g.lineTo(px(e[0]), plot.y + plot.h); g.stroke(); g.restore();
        g.save(); g.globalAlpha = alpha;
        drawText(g, ys + label, plot.x - 6, py(e[1]), { font: FONT(800, 14), color: P.text, align: 'right' });
        drawText(g, xs + label, px(e[0]), plot.y + plot.h + 12, { font: FONT(800, 14), color: P.text });
        g.restore();
      };
      const moved = e0 && e1 && (Math.abs(e0[0] - e1[0]) > 0.005 || Math.abs(e0[1] - e1[1]) > 0.005);
      proj(e0, moved ? 0.45 : 0.9, moved ? '₁' : '');
      if (moved) proj(e1, 1, '₂');
      if (e0) { g.fillStyle = moved ? 'rgba(255,255,255,0.5)' : '#fff'; g.beginPath(); g.arc(px(e0[0]), py(e0[1]), 5, 0, Math.PI * 2); g.fill(); }
      if (moved) { g.fillStyle = P.gold; g.beginPath(); g.arc(px(e1[0]), py(e1[1]), 6, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
      // price control line
      if (v.control && e0) {
        const cy = py(e0[1] + (v.control.rel === 'below' ? 0.17 : -0.17));
        g.save(); g.strokeStyle = P.gold; g.lineWidth = 2.5; g.setLineDash([10, 6]);
        g.beginPath(); g.moveTo(plot.x + 4, cy); g.lineTo(plot.x + plot.w, cy); g.stroke(); g.restore();
        drawText(g, v.control.label || '', plot.x + plot.w - 4, cy - 10, { font: FONT(800, 14), color: P.gold, align: 'right' });
      }
    }
    g.restore();
    // outcome labels after the reveal
    if (t > 0.45) {
      const a = clamp((t - 0.45) / 0.3, 0, 1);
      g.save(); g.globalAlpha = a;
      const parts = [];
      if (v.outcome) { parts.push(`${v.yShort || 'P'} ${ARROW[v.outcome.y] || '?'}`); parts.push(`${v.xShort || 'Q'} ${ARROW[v.outcome.x] || '?'}`); }
      const txt = v.note ? v.note : parts.join('   ');
      if (txt) {
        const bw = Math.min(plot.w - 20, 260);
        roundRect(g, plot.x + plot.w - bw - 4, plot.y + 4, bw, 28, 8, { fill: 'rgba(12,16,38,0.85)', stroke: P.gold, lineWidth: 1.5 });
        drawText(g, txt, plot.x + plot.w - 4 - bw / 2, plot.y + 18, { font: FONT(900, 16), color: P.gold, maxWidth: bw - 16 });
      }
      g.restore();
    }
  }

  renderLine(g, plot, v, t) {
    const P = this.cfg.palette;
    this.axes(g, plot, v.xLabel, v.yLabel);
    const series = Array.isArray(v.series) ? v.series : [];
    let min = Infinity, max = -Infinity, len = 0;
    for (const s of series) for (const val of s.values || []) { if (val < min) min = val; if (val > max) max = val; }
    for (const s of series) len = Math.max(len, (s.values || []).length);
    if (!Number.isFinite(min) || len < 1) return;
    if (max === min) { max += 1; min -= 1; }
    const pad = (max - min) * 0.18;
    const lo = Math.min(0, min - pad) < 0 ? min - pad : Math.max(0, min - pad), hi = max + pad;
    const px = i => plot.x + 18 + (len === 1 ? 0 : (i / (len - 1)) * (plot.w - 36));
    const py = val => plot.y + plot.h - ((val - lo) / (hi - lo)) * (plot.h - 10);
    const cols = [P.curveB, P.curveA, P.gold];
    // gridlines
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1;
    for (let k = 1; k <= 3; k++) { const yy = plot.y + (plot.h / 4) * k; g.beginPath(); g.moveTo(plot.x, yy); g.lineTo(plot.x + plot.w, yy); g.stroke(); }
    series.forEach((s, si) => {
      const vals = s.values || [];
      const col = s.color || cols[si % cols.length];
      g.strokeStyle = col; g.lineWidth = 3.5; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      vals.forEach((val, i) => { if (i === 0) g.moveTo(px(i), py(val)); else g.lineTo(px(i), py(val)); });
      g.stroke();
      vals.forEach((val, i) => {
        g.fillStyle = col; g.beginPath(); g.arc(px(i), py(val), 5, 0, Math.PI * 2); g.fill();
        drawText(g, String(val), px(i), py(val) - 14, { font: FONT(800, 14), color: P.text });
        if (si === 0 && v.xLabels && v.xLabels[i] !== undefined) drawText(g, String(v.xLabels[i]), px(i), plot.y + plot.h + 12, { font: FONT(700, 14), color: P.dim });
      });
      if (t > 0.1) { const i = vals.length - 1; g.strokeStyle = P.gold; g.lineWidth = 3; g.beginPath(); g.arc(px(i), py(vals[i]), 9 + 4 * Math.sin(this.time * 6), 0, Math.PI * 2); g.stroke(); }
      if (s.label) drawText(g, s.label, plot.x + plot.w, plot.y + 4 + si * 18, { font: FONT(800, 14), color: col, align: 'right' });
    });
  }

  renderBar(g, plot, v, t) {
    const P = this.cfg.palette;
    this.axes(g, plot, v.xLabel, v.yLabel);
    const vals = Array.isArray(v.values) ? v.values : [];
    if (!vals.length) return;
    const max = Math.max(...vals, 1);
    const n = vals.length;
    const slot = plot.w / n, bw = Math.min(64, slot * 0.62);
    const hl = Number(v.highlight) || 0;
    vals.forEach((val, i) => {
      const h = (val / max) * (plot.h - 24);
      const x = plot.x + slot * i + (slot - bw) / 2, y = plot.y + plot.h - h;
      const col = i < hl ? P.gold : P.curveB;
      roundRect(g, x, y, bw, h, 6, { fill: hexToRgba(col, 0.85) });
      drawText(g, String(val), x + bw / 2, y - 11, { font: FONT(800, 14), color: P.text });
      if (v.labels && v.labels[i] !== undefined) drawText(g, String(v.labels[i]), x + bw / 2, plot.y + plot.h + 12, { font: FONT(700, 13), color: P.dim, maxWidth: slot - 4 });
    });
    if (hl > 0 && t > 0.1) { const x0 = plot.x + 2, x1 = plot.x + slot * hl - 2; g.strokeStyle = P.gold; g.lineWidth = 2; g.setLineDash([6, 5]); g.strokeRect(x0, plot.y - 2, x1 - x0, plot.h + 2); g.setLineDash([]); }
  }

  renderHistory(g, plot) {
    const { cfg } = this;
    const P = cfg.palette;
    this.axes(g, plot, cfg.roundLabel, cfg.cashLabel);
    const vals = this.history;
    const n = vals.length;
    const max = Math.max(cfg.startingCash * 1.5, ...vals), min = Math.min(0, ...vals);
    const px = i => plot.x + 16 + (n === 1 ? 0 : (i / Math.max(1, cfg.rounds)) * (plot.w - 32));
    const py = val => plot.y + plot.h - ((val - min) / (max - min || 1)) * (plot.h - 14);
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1;
    for (let k = 1; k <= 3; k++) { const yy = plot.y + (plot.h / 4) * k; g.beginPath(); g.moveTo(plot.x, yy); g.lineTo(plot.x + plot.w, yy); g.stroke(); }
    g.beginPath(); g.moveTo(px(0), plot.y + plot.h);
    for (let i = 0; i < n; i++) g.lineTo(px(i), py(vals[i]));
    g.lineTo(px(n - 1), plot.y + plot.h); g.closePath();
    g.fillStyle = hexToRgba(P.gold, 0.16); g.fill();
    g.strokeStyle = P.gold; g.lineWidth = 3; g.lineJoin = 'round';
    g.beginPath(); for (let i = 0; i < n; i++) { if (i === 0) g.moveTo(px(i), py(vals[i])); else g.lineTo(px(i), py(vals[i])); } g.stroke();
    for (let i = 0; i < n; i++) { g.fillStyle = i === n - 1 ? '#fff' : P.gold; g.beginPath(); g.arc(px(i), py(vals[i]), i === n - 1 ? 6 : 4, 0, Math.PI * 2); g.fill(); }
    drawText(g, this.money(vals[n - 1]), px(n - 1), py(vals[n - 1]) - 16, { font: FONT(800, 14), color: P.text });
  }

  // ---------- decision strip ----------
  renderDecision(g) {
    const { ctx, cfg } = this;
    const P = cfg.palette;
    const active = this.phase === 'decide';
    const show = this.cardsAlive || this.cards.some(c => c.s > 0.01);
    if (!show && !active) return;
    // stake row
    const fade = active ? 1 : 0.45;
    g.save(); g.globalAlpha = fade;
    drawText(g, cfg.stakeLabel, SCENE.x + 4, STAKE_Y + STAKE_H / 2, { font: FONT(800, 16), color: P.dim, align: 'left', maxWidth: 110 });
    const rects = this.stakeRects();
    rects.forEach((r, i) => {
      const sel = i === this.stakeIdx;
      const st = cfg.stakes[i];
      roundRect(g, r.x, r.y, r.w, r.h, 12, { fill: sel ? P.accent : 'rgba(255,255,255,0.08)', stroke: sel ? '#fff' : P.line, lineWidth: sel ? 2 : 1 });
      drawText(g, `${st.label} x${st.mul}`, r.x + r.w / 2, r.y + r.h / 2 + 1, { font: FONT(900, 16), color: '#fff', maxWidth: r.w - 12 });
    });
    const hintTxt = ctx.input.isTouchDevice ? 'Tap a stake, then tap your answer' : '↑↓ stake · 1-4 or ←→ + Enter answer';
    drawText(g, hintTxt, ctx.width - 16, STAKE_Y + STAKE_H / 2, { font: FONT(700, 15), color: P.dim, align: 'right', maxWidth: 400 });
    g.restore();
    // cards
    const p = ctx.input.pointer;
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i];
      if (c.s <= 0.01) continue;
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      g.save();
      g.translate(cx, cy); g.scale(c.s, c.s); g.translate(-cx, -cy);
      const hover = active && p.active && p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h;
      let fill = hover ? 'rgba(255,255,255,0.16)' : P.card;
      let stroke = P.line;
      if (c.state === 'good') { fill = hexToRgba(P.good, 0.28 + 0.3 * c.flash); stroke = P.good; }
      else if (c.state === 'bad') { fill = hexToRgba(P.bad, 0.28 + 0.35 * c.flash); stroke = P.bad; }
      roundRect(g, c.x, c.y, c.w, c.h, 14, { fill, stroke, lineWidth: c.state ? 2.5 : 1.2 });
      if (this.cursorVisible && this.cursor === i && active) {
        g.save(); g.setLineDash([8, 6]); g.lineDashOffset = -this.time * 40; g.strokeStyle = P.gold; g.lineWidth = 3;
        roundRect(g, c.x - 4, c.y - 4, c.w + 8, c.h + 8, 17, { stroke: P.gold, lineWidth: 3 }); g.restore();
      }
      // key badge
      roundRect(g, c.x + 12, c.y + c.h / 2 - 15, 30, 30, 9, { fill: c.state === 'good' ? P.good : c.state === 'bad' ? P.bad : P.accent });
      drawText(g, c.state === 'good' ? '✓' : c.state === 'bad' ? '✗' : String(c.key), c.x + 27, c.y + c.h / 2 + 1, { font: FONT(900, 17), color: '#fff' });
      // text
      if (!c.lines) {
        let size = c.font, lines;
        do { lines = wrapText(g, c.text, c.w - 72, FONT(800, size)); if (lines.length <= 2) break; size--; } while (size > 14);
        c.lines = lines; c.font = size;
      }
      if (c.numeric) {
        drawText(g, `${c.text}  ·  ${ctx.input.isTouchDevice ? 'tap here' : 'press Enter'}`, c.x + 56, cy + 1, { font: FONT(800, c.font), color: P.text, align: 'left', maxWidth: c.w - 72 });
      } else {
        const lh = c.font + 3;
        const y0 = cy - ((c.lines.length - 1) * lh) / 2;
        for (let k = 0; k < c.lines.length; k++) drawText(g, c.lines[k], c.x + 56, y0 + k * lh + 1, { font: FONT(800, c.font), color: P.text, align: 'left', maxWidth: c.w - 72 });
      }
      g.restore();
    }
  }

  renderShop(g) {
    const { cfg } = this;
    const P = cfg.palette;
    const sh = this.shop;
    drawText(g, `Upgrade shop  ·  ${cfg.cashLabel} ${this.money(this.cash)}`, SCENE.x + 4, STAKE_Y + STAKE_H / 2, { font: FONT(900, 18), color: P.gold, align: 'left', maxWidth: 480 });
    const k = sh.skip;
    roundRect(g, k.x, k.y, k.w, k.h, 12, { fill: 'rgba(255,255,255,0.08)', stroke: P.line, lineWidth: 1 });
    drawText(g, 'Skip  (4)', k.x + k.w / 2, k.y + k.h / 2 + 1, { font: FONT(800, 16), color: P.text });
    sh.cards.forEach((c, i) => {
      if (c.s <= 0.01) return;
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      g.save(); g.translate(cx, cy); g.scale(c.s, c.s); g.translate(-cx, -cy);
      const afford = this.cash >= c.u.cost;
      roundRect(g, c.x, c.y, c.w, c.h, 14, { fill: c.flash > 0 ? hexToRgba(P.bad, 0.3 * c.flash) : P.card, stroke: sh.cursor === i ? P.gold : afford ? P.line : 'rgba(255,255,255,0.08)', lineWidth: sh.cursor === i ? 3 : 1.2 });
      roundRect(g, c.x + 12, c.y + 12, 28, 28, 8, { fill: afford ? P.accent : 'rgba(255,255,255,0.15)' });
      drawText(g, String(c.key), c.x + 26, c.y + 27, { font: FONT(900, 16), color: '#fff' });
      drawText(g, c.u.name, c.x + 50, c.y + 26, { font: FONT(900, 18), color: afford ? P.text : P.dim, align: 'left', maxWidth: c.w - 64 });
      if (!c.lines) c.lines = wrapText(g, c.u.desc || '', c.w - 28, FONT(700, 15));
      c.lines.slice(0, 2).forEach((ln, j) => drawText(g, ln, c.x + 14, c.y + 56 + j * 19, { font: FONT(700, 15), color: P.dim, align: 'left', maxWidth: c.w - 28 }));
      drawText(g, this.money(c.u.cost), c.x + c.w - 14, c.y + c.h - 18, { font: FONT(900, 18), color: afford ? P.gold : P.bad, align: 'right' });
      if (!afford) drawText(g, 'not enough cash', c.x + 14, c.y + c.h - 18, { font: FONT(700, 14), color: P.bad, align: 'left' });
      g.restore();
    });
  }

  renderBanner(g) {
    const { ctx } = this;
    const b = this.banner;
    const W = ctx.width;
    g.save();
    g.globalAlpha = b.a;
    g.translate(W / 2, 250); g.scale(b.s, b.s);
    g.fillStyle = 'rgba(8,10,24,0.72)'; g.fillRect(-W, -56, W * 2, 112);
    g.fillStyle = b.color; g.fillRect(-W, -58, W * 2, 3); g.fillRect(-W, 55, W * 2, 3);
    drawText(g, b.title, 0, -12, { font: FONT(900, 44), color: b.color, maxWidth: W - 80, shadow: true });
    if (b.sub) drawText(g, b.sub, 0, 28, { font: FONT(700, 20), color: '#fff', maxWidth: W - 120 });
    g.restore();
  }
}
