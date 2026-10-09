// mechanics/grid-collector/mechanic.js
// "Grid Collector": a snake-style grid chassis where the ONLY way to score is to eat the tile that answers
// the rule. Each `choice` item's choices are scattered on the grid as word tiles and its prompt is the rule
// shown in the bottom panel; eating a tile calls ctx.answer(item, index). Wrong tiles shrink the snake and
// show the kit's blocking feedback card (correct answer + explanation). Chasers patrol so routing matters.
// Fill the growth bar to level up (the organism changes); clear every level of a stage to change stage; a
// `sort` item between stages grants a shield; the finale is a "storm" where N correct eats in a row restore
// the web. Everything subject-specific (names, colours, sprite styles, labels) comes from config.
import { drawText, wrapText, roundRect, clamp, lerp, hexToRgba, shade, Easing } from '../../kit/kit.js';

export const meta = {
  id: 'grid-collector',
  name: 'Grid Collector',
  description: 'Steer a growing creature across a grid and eat only the tiles that answer the rule; wrong tiles shrink you, chasers hunt you, growth levels you up.',
  itemTypes: ['choice', 'sort'],
  choices: 4,
  configSchema: {
    gridCols: 'Grid columns (18)',
    gridRows: 'Grid rows (7)',
    cellSize: 'Cell size in logical px (50)',
    tilesPerSecond: 'Creature speed in cells per second at the first level (2.4)',
    speedPerLevel: 'Speed multiplier applied at every level-up (1.07)',
    maxTilesPerSecond: 'Speed cap in cells per second (4.4)',
    startLength: 'Creature segments at the start of each stage (3)',
    maxLength: 'Maximum creature segments (10)',
    growthToLevel: 'Correct eats needed to level up (4)',
    lives: 'Hearts per stage; losing all restarts the level, never the game (3)',
    chaserBase: 'Chasers on screen in the first stage (1)',
    chaserPerStage: 'Chasers added per stage (1)',
    maxChasers: 'Chaser cap (3)',
    chaserInterval: 'Seconds a chaser waits between cell moves at stage 1 (0.8)',
    chaserSpeedPerStage: 'Fraction removed from chaserInterval per stage (0.12)',
    chaserRandomness: 'Probability a chaser moves randomly instead of toward you (0.3)',
    bonusEvery: 'Seconds between bonus orbs; 0 disables them (10)',
    bonusValue: 'Points for a bonus orb (25)',
    bonusSlow: 'Seconds chasers are slowed after a bonus orb (4)',
    shieldCards: 'Show a sort card between stages; a correct sort grants a shield (true). Needs a skill with type "sort".',
    finale: '{ steps, name, sub } ordered-eat finale after the last stage ({ steps: 5, ... })',
    finaleSkills: 'Skill ids used in the finale; empty = adaptive picks (empty)',
    stages: 'Array of stages: { name, deco, sky:[top,bottom], ground, accent, levels:[{ name, sprite, color }], chaser:{ name, sprite, color } }',
    tilePalette: 'Four tile colours (greens/golds)',
    labels: 'All UI strings: rule, grow, next, levelUp, stageClear, caught, shield, shieldCard, storm, restored, bonus, tapHint',
    speak: '"auto" speaks prompts for early band or grade <= 3, true always, false never ("auto")',
    font: 'Canvas font family stack',
    touchDpad: 'Also draw a D-pad of touch buttons on touch devices (false; tap-to-target and swipe are always on)',
  },
};

export const defaultConfig = {
  gridCols: 18,
  gridRows: 7,
  cellSize: 50,
  tilesPerSecond: 2.4,
  speedPerLevel: 1.07,
  maxTilesPerSecond: 4.4,
  startLength: 3,
  maxLength: 10,
  growthToLevel: 4,
  lives: 3,
  chaserBase: 1,
  chaserPerStage: 1,
  maxChasers: 3,
  chaserInterval: 0.8,
  chaserSpeedPerStage: 0.12,
  chaserRandomness: 0.3,
  bonusEvery: 10,
  bonusValue: 25,
  bonusSlow: 4,
  shieldCards: true,
  finale: { steps: 5, name: 'The Storm', sub: 'Eat {n} right answers in a row to restore balance!' },
  finaleSkills: [],
  stages: [
    { name: 'Meadow', deco: 'meadow', sky: ['#2b5876', '#4e9a51'], ground: '#3f8f3a', accent: '#a7f3a0',
      levels: [{ name: 'Beetle', sprite: 'bug', color: '#f59e0b' }, { name: 'Lizard', sprite: 'lizard', color: '#22c55e' }, { name: 'Hawk', sprite: 'bird', color: '#c084fc' }],
      chaser: { name: 'Fox', sprite: 'cat', color: '#f97316' } },
    { name: 'Lake', deco: 'pond', sky: ['#0b3d5c', '#1f7a8c'], ground: '#1d6f7c', accent: '#8ecae6',
      levels: [{ name: 'Minnow', sprite: 'fish', color: '#60a5fa' }, { name: 'Frog', sprite: 'frog', color: '#4ade80' }, { name: 'Heron', sprite: 'bird', color: '#e2e8f0' }],
      chaser: { name: 'Pike', sprite: 'fish', color: '#64748b' } },
    { name: 'Forest', deco: 'forest', sky: ['#14213d', '#1b4332'], ground: '#2d6a4f', accent: '#95d5b2',
      levels: [{ name: 'Caterpillar', sprite: 'bug', color: '#a3e635' }, { name: 'Mouse', sprite: 'cat', color: '#d6d3d1' }, { name: 'Owl', sprite: 'bird', color: '#fbbf24' }],
      chaser: { name: 'Wolf', sprite: 'cat', color: '#9ca3af' } },
  ],
  tilePalette: ['#34d399', '#fbbf24', '#60a5fa', '#f472b6'],
  labels: {
    rule: 'RULE', grow: 'Grow', next: 'Next', levelUp: 'You grew into', stageClear: 'cleared!', stage: 'Stage',
    caught: 'Caught! Try this level again', shield: 'Shield up!', shieldCard: 'Shield card', shieldHint: 'Sort them all right to earn a shield',
    storm: 'FINAL STORM', restored: 'Balance restored!', bonus: 'Energy!', notFood: 'Not food!', yum: 'Yum!',
    tapHint: 'Tap a tile to go there, or swipe to steer', keyHint: 'Arrows / WASD to steer, 1-4 to target a tile',
    watchOut: 'Watch out for the', link: 'Link',
  },
  speak: 'auto',
  font: 'Nunito, "Segoe UI", system-ui, sans-serif',
  touchDpad: false,
};

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];
const NUMPAD = ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'];
const SHAPES = ['circle', 'square', 'diamond', 'triangle'];
const PANEL_BG = 'rgba(10, 14, 32, 0.66)';
const PANEL_STROKE = 'rgba(255,255,255,0.18)';

// ------------------------------------------------------------------------------------------------
// Procedural drawing helpers (pure functions of the canvas context)
// ------------------------------------------------------------------------------------------------
function shapeBadge(g, shape, x, y, r, fill) {
  g.fillStyle = fill;
  g.beginPath();
  if (shape === 'circle') g.arc(x, y, r, 0, Math.PI * 2);
  else if (shape === 'square') g.rect(x - r, y - r, r * 2, r * 2);
  else if (shape === 'diamond') { g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); }
  else { g.moveTo(x, y - r); g.lineTo(x + r, y + r); g.lineTo(x - r, y + r); g.closePath(); }
  g.fill();
}

function eye(g, x, y, r, lookX, lookY, menace) {
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#14172b';
  g.beginPath(); g.arc(x + lookX * r * 0.35, y + lookY * r * 0.35, r * 0.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(x + lookX * r * 0.35 - r * 0.18, y + lookY * r * 0.35 - r * 0.2, r * 0.16, 0, Math.PI * 2); g.fill();
  if (menace) {
    g.strokeStyle = '#14172b'; g.lineWidth = Math.max(1.5, r * 0.35); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - r, y - r * 1.15); g.lineTo(x + r * 0.9, y - r * 0.45); g.stroke();
  }
}

/**
 * Draws a creature head facing `angle` (radians) at (x, y) with radius r.
 * styles: bug, fish, frog, bird, cat, lizard, blob. `menace` draws an angry chaser.
 */
function drawHead(g, { x, y, r, angle, style, color, menace = false, t = 0, mouth = 0 }) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  const dark = shade(color, -0.35), light = shade(color, 0.4);
  // style extras behind the body
  if (style === 'bug') {
    g.strokeStyle = dark; g.lineWidth = Math.max(2, r * 0.12); g.lineCap = 'round';
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(r * 0.3, s * r * 0.35); g.quadraticCurveTo(r * 1.1, s * r * 0.9, r * 1.25, s * r * 1.15 + Math.sin(t * 6) * r * 0.1); g.stroke();
      g.fillStyle = dark; g.beginPath(); g.arc(r * 1.25, s * r * 1.15 + Math.sin(t * 6) * r * 0.1, r * 0.14, 0, Math.PI * 2); g.fill();
    }
  } else if (style === 'fish') {
    g.fillStyle = dark;
    g.beginPath(); g.moveTo(-r * 0.6, 0); g.lineTo(-r * 1.5, -r * 0.8); g.lineTo(-r * 1.3, 0); g.lineTo(-r * 1.5, r * 0.8); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-r * 0.2, -r * 0.7); g.lineTo(r * 0.4, -r * 1.25); g.lineTo(r * 0.6, -r * 0.6); g.closePath(); g.fill();
  } else if (style === 'cat') {
    g.fillStyle = color;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-r * 0.2, s * r * 0.55); g.lineTo(-r * 0.1, s * r * 1.35); g.lineTo(r * 0.45, s * r * 0.75); g.closePath(); g.fill(); }
    g.fillStyle = '#ffb3c6';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-r * 0.05, s * r * 0.7); g.lineTo(0, s * r * 1.15); g.lineTo(r * 0.3, s * r * 0.8); g.closePath(); g.fill(); }
  } else if (style === 'lizard') {
    g.fillStyle = dark;
    for (let i = 0; i < 4; i++) { const bx = -r * 0.8 + i * r * 0.45; g.beginPath(); g.moveTo(bx, -r * 0.6); g.lineTo(bx + r * 0.18, -r * 1.15); g.lineTo(bx + r * 0.36, -r * 0.55); g.closePath(); g.fill(); }
  } else if (style === 'bird') {
    g.fillStyle = dark;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-r * 0.5 + i * r * 0.2, -r * 0.6); g.lineTo(-r * 0.7 + i * r * 0.25, -r * 1.3 - i * r * 0.1); g.lineTo(-r * 0.2 + i * r * 0.2, -r * 0.7); g.closePath(); g.fill(); }
  }
  // body
  const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  gr.addColorStop(0, light); gr.addColorStop(0.6, color); gr.addColorStop(1, dark);
  g.fillStyle = gr;
  g.beginPath();
  if (style === 'fish' || style === 'lizard') g.ellipse(0, 0, r * 1.1, r * 0.85, 0, 0, Math.PI * 2);
  else g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  if (style === 'bug') { g.fillStyle = hexToRgba(dark, 0.6); g.beginPath(); g.ellipse(-r * 0.25, 0, r * 0.12, r * 0.75, 0, 0, Math.PI * 2); g.fill(); }
  // front features
  if (style === 'bird') {
    g.fillStyle = '#ffb020';
    g.beginPath(); g.moveTo(r * 0.75, -r * 0.3); g.lineTo(r * 1.55, mouth * r * 0.1); g.lineTo(r * 0.75, r * 0.35); g.closePath(); g.fill();
    g.fillStyle = '#d98500';
    g.beginPath(); g.moveTo(r * 0.75, 0.05 * r + mouth * r * 0.1); g.lineTo(r * 1.5, mouth * r * 0.25 + r * 0.05); g.lineTo(r * 0.75, r * 0.35); g.closePath(); g.fill();
  } else if (style === 'cat') {
    g.fillStyle = '#14172b';
    g.beginPath(); g.ellipse(r * 0.85, 0, r * 0.18, r * 0.13, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.5;
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(r * 0.5, s * r * 0.15); g.lineTo(r * 1.3, s * (r * 0.3 + i * r * 0.25)); g.stroke(); }
  } else {
    // mouth
    g.strokeStyle = '#14172b'; g.lineWidth = Math.max(1.5, r * 0.1); g.lineCap = 'round';
    g.beginPath();
    if (menace) { g.moveTo(r * 0.45, -r * 0.35); g.lineTo(r * 0.95, 0); g.lineTo(r * 0.45, r * 0.35); }
    else g.arc(r * 0.45, 0, r * 0.3 + mouth * r * 0.15, -Math.PI * 0.45, Math.PI * 0.45);
    g.stroke();
    if (menace) {
      g.fillStyle = '#fff';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(r * 0.5, s * r * 0.3); g.lineTo(r * 0.72, s * r * 0.05); g.lineTo(r * 0.82, s * r * 0.3); g.closePath(); g.fill(); }
    }
  }
  // eyes
  const er = r * (style === 'frog' ? 0.34 : 0.26);
  const ey = style === 'frog' ? -r * 0.55 : -r * 0.42;
  const ex = style === 'frog' ? r * 0.3 : r * 0.4;
  eye(g, ex, ey, er, 1, 0, menace);
  eye(g, ex, -ey, er, 1, 0, menace);
  g.restore();
}

function drawSegment(g, x, y, r, color, style, idx) {
  const dark = shade(color, -0.35), light = shade(color, 0.35);
  const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  gr.addColorStop(0, light); gr.addColorStop(0.65, color); gr.addColorStop(1, dark);
  g.save();
  g.translate(x, y);
  g.fillStyle = gr;
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  if (style === 'bug' || style === 'lizard') { g.fillStyle = hexToRgba(dark, 0.55); g.beginPath(); g.ellipse(0, 0, r * 0.14, r * 0.72, 0, 0, Math.PI * 2); g.fill(); }
  else if (style === 'fish') { g.fillStyle = hexToRgba('#ffffff', 0.25); g.beginPath(); g.arc(0, 0, r * 0.45, 0, Math.PI * 2); g.fill(); }
  else if (idx % 2 === 0) { g.fillStyle = hexToRgba('#ffffff', 0.18); g.beginPath(); g.arc(-r * 0.15, -r * 0.15, r * 0.35, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

function arrowLine(g, x1, y1, x2, y2, color, width = 3, head = 9) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = width; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6); g.stroke();
  g.beginPath();
  g.moveTo(x2, y2);
  g.lineTo(x2 - Math.cos(a - 0.5) * head, y2 - Math.sin(a - 0.5) * head);
  g.lineTo(x2 - Math.cos(a + 0.5) * head, y2 - Math.sin(a + 0.5) * head);
  g.closePath(); g.fill();
}

// ------------------------------------------------------------------------------------------------
// Mechanic
// ------------------------------------------------------------------------------------------------
export class Mechanic {
  constructor(ctx) {
    this.ctx = ctx;
    const cfg = { ...defaultConfig, ...ctx.config };
    cfg.labels = { ...defaultConfig.labels, ...(ctx.config.labels || {}) };
    cfg.finale = { ...defaultConfig.finale, ...(ctx.config.finale || {}) };
    cfg.gridCols = clamp(Math.round(cfg.gridCols) || 18, 8, 24);
    cfg.gridRows = clamp(Math.round(cfg.gridRows) || 7, 5, 12);
    this.cfg = cfg;
    const f = cfg.font;
    this.fonts = {
      tile: `800 18px ${f}`, prompt: `800 20px ${f}`, promptBig: `900 28px ${f}`, eyebrow: `800 16px ${f}`, small: `700 16px ${f}`,
      banner: `900 44px ${f}`, bannerSub: `800 22px ${f}`, node: `800 16px ${f}`, big: `900 24px ${f}`, cardTitle: `900 30px ${f}`, cardItem: `900 34px ${f}`,
      badge: `800 15px ${f}`, hud: `800 18px ${f}`,
    };
  }

  // ---------------------------------------------------------------- lifecycle
  init() {
    const { ctx, cfg } = this;
    const skills = ctx.content.skills || {};
    this.choiceSkills = Object.keys(skills).filter(s => (skills[s].types || ['choice']).includes('choice'));
    this.sortSkills = Object.keys(skills).filter(s => (skills[s].types || []).includes('sort'));
    if (!this.choiceSkills.length) throw new Error('grid-collector needs a content pack with at least one skill of type "choice"');
    if (cfg.shieldCards && !this.sortSkills.length) throw new Error('grid-collector: shieldCards is on but no skill offers type "sort" (set config.shieldCards = false)');
    if (!Array.isArray(cfg.stages) || !cfg.stages.length) throw new Error('grid-collector: config.stages must have at least one stage');

    const W = ctx.width, H = ctx.height;
    this.cell = cfg.cellSize;
    this.gw = cfg.gridCols * this.cell;
    this.gh = cfg.gridRows * this.cell;
    this.gx = Math.round((W - this.gw) / 2);
    this.gy = 64;
    this.panelY = this.gy + this.gh + 8;
    this.panelH = H - this.panelY - 6;

    this.t = 0;
    this.mode = 'banner';
    this.ended = false;
    this.busy = false;
    this.stageIdx = -1;
    this.levelIdx = 0;
    this.growth = 0;
    this.lives = cfg.lives;
    this.shield = false;
    this.inFinale = false;
    this.finaleStep = 0;
    this.finaleDone = false;
    this.stats = { eaten: 0, wrong: 0, caught: 0, correct: 0, total: 0, bonus: 0 };
    this.snake = [];
    this.snakePrev = [];
    this.growPending = 0;
    this.dir = [1, 0];
    this.nextDir = null;
    this.waiting = false;
    this.moveT = 0;
    this.speed = cfg.tilesPerSecond;
    this.autopilot = null;
    this.tiles = [];
    this.chasers = [];
    this.bonus = null;
    this.bonusT = cfg.bonusEvery;
    this.slowT = 0;
    this.invuln = 0;
    this.item = null;
    this.itemStart = 0;
    this.promptLines = [];
    this.hintText = '';
    this.hintT = 0;
    this.banner = null;
    this.promptFlash = { a: 0, lines: [] };
    this.flash = { a: 0, color: '#ffffff' };
    this.storm = { v: 0 };
    this.lightningT = 0;
    this.bgMix = { v: 1 };
    this.bgFrom = 0;
    this.deco = [];
    this.wind = [];
    for (let i = 0; i < (ctx.reducedMotion ? 14 : 36); i++) this.wind.push({ x: ctx.rng.float(0, W), y: ctx.rng.float(0, H), v: ctx.rng.float(300, 600), len: ctx.rng.float(30, 90), a: ctx.rng.float(0.15, 0.4) });
    this.card = null;
    this.mouth = 0;
    this.lightning = { a: 0 };
    this.unsubs = [];
    this._grads = {};
    this.stepCount = 0;

    const totalUnits = cfg.stages.length * (cfg.stages[0].levels ? cfg.stages[0].levels.length : 1) + 1;
    this.totalUnits = totalUnits;

    ctx.hud.set({ score: 0, streak: 0, lives: this.lives, maxLives: cfg.lives, level: 1, levelLabel: '', progress: 0, combo: 0 });
    this.unsubs.push(ctx.on('answer', d => { this.stats.total++; if (d.correct) this.stats.correct++; }));
    this.unsubs.push(ctx.on('pause', () => ctx.audio.music.setIntensity(0.12)));
    this.unsubs.push(ctx.on('resume', () => this.musicLevel()));
    this.unsubs.push(ctx.input.onSwipe(dir => { if (this.mode === 'play' && DIRS[dir]) this.steer(DIRS[dir]); }));
    this.unsubs.push(ctx.input.onPointerDown((x, y) => this.onTap(x, y)));
    if (cfg.touchDpad && ctx.input.isTouchDevice) {
      const bx = W - 150, by = this.panelY - 150, s = 46;
      ctx.input.addTouchButton({ id: 'up', x: bx + s, y: by, w: s, h: s, label: '▲', code: 'ArrowUp' });
      ctx.input.addTouchButton({ id: 'down', x: bx + s, y: by + s * 2, w: s, h: s, label: '▼', code: 'ArrowDown' });
      ctx.input.addTouchButton({ id: 'left', x: bx, y: by + s, w: s, h: s, label: '◀', code: 'ArrowLeft' });
      ctx.input.addTouchButton({ id: 'right', x: bx + s * 2, y: by + s, w: s, h: s, label: '▶', code: 'ArrowRight' });
    }
    ctx.audio.music.start('calm');
    ctx.audio.music.setIntensity(0.45);
    ctx.overlay.toast(ctx.input.isTouchDevice ? cfg.labels.tapHint : cfg.labels.keyHint, { type: 'info', duration: 2.6 });
    this.startStage(0);
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
    this.chasers.length = 0;
  }

  onPause() { }
  onResume() { }

  // ---------------------------------------------------------------- helpers
  n(count) { return this.ctx.reducedMotion ? Math.ceil(count / 2) : count; }
  get stage() { return this.cfg.stages[Math.max(0, Math.min(this.stageIdx, this.cfg.stages.length - 1))]; }
  get level() { const L = this.stage.levels || [{ name: '', sprite: 'blob', color: '#fff' }]; return L[Math.min(this.levelIdx, L.length - 1)]; }
  get levelsPerStage() { return (this.cfg.stages[0].levels || [1]).length; }
  cellX(c) { return this.gx + (c + 0.5) * this.cell; }
  cellY(r) { return this.gy + (r + 0.5) * this.cell; }
  shouldSpeak() {
    const s = this.cfg.speak;
    if (s === true || s === false) return s;
    const g = (this.ctx.manifest.grades || [])[0];
    return this.ctx.gradeBand === 'early' || (typeof g === 'number' && g <= 3);
  }
  musicLevel() {
    const a = this.ctx.audio;
    if (this.inFinale) a.music.setIntensity(1);
    else a.music.setIntensity(0.4 + 0.2 * this.stageIdx + 0.05 * this.levelIdx);
  }
  skillName(id) { const d = this.ctx.content.skills[id]; return (d && d.name) || id; }
  updateProgress() {
    const L = this.levelsPerStage;
    const units = this.inFinale ? this.cfg.stages.length * L + (this.finaleStep / Math.max(1, this.cfg.finale.steps)) : this.stageIdx * L + this.levelIdx + this.growth / this.cfg.growthToLevel;
    this.ctx.hud.set({ progress: clamp(units / this.totalUnits, 0, 1) });
  }
  showBanner(text, sub, dur = 1.5, color = '#ffffff') {
    const b = { text, sub, color, a: 0, scale: 0.6, y: 0 };
    this.banner = b;
    const tw = this.ctx.tweens;
    tw.add(b, { a: 1, scale: 1 }, 0.45, { ease: Easing.easeOutBack });
    tw.add(b, { a: 0, y: -30 }, 0.35, { delay: dur, onComplete: () => { if (this.banner === b) this.banner = null; } });
  }
  doFlash(color, a = 0.35) {
    this.flash.color = color; this.flash.a = a;
    this.ctx.tweens.killTarget(this.flash);
    this.ctx.tweens.add(this.flash, { a: 0 }, 0.4);
  }
  burst(x, y, color, k = 1) {
    const p = this.ctx.particles;
    p.burst({ x, y, count: this.n(Math.round(24 * k)), colors: [color, '#ffffff', shade(color, 0.45)], speed: 260 * k, life: 0.7, size: 8, gravity: 300, friction: 0.92 });
    p.burst({ x, y, count: this.n(Math.round(8 * k)), colors: ['#ffd54a', '#fff'], speed: 200 * k, life: 0.9, size: 11, gravity: 180, shape: 'star' });
    p.burst({ x, y, count: this.n(Math.round(8 * k)), colors: [color], speed: 400 * k, life: 0.3, size: 5, shape: 'spark', friction: 0.85 });
  }

  // ---------------------------------------------------------------- stages and levels
  startStage(i) {
    const { ctx, cfg } = this;
    this.bgFrom = Math.max(0, this.stageIdx);
    this.stageIdx = i;
    this.levelIdx = 0;
    this.growth = 0;
    this.lives = cfg.lives;
    this.bgMix.v = i === 0 ? 1 : 0;
    ctx.tweens.killTarget(this.bgMix);
    if (i > 0) ctx.tweens.add(this.bgMix, { v: 1 }, 1.4);
    this.makeDeco();
    this.resetSnake();
    this.tiles.length = 0;
    this.bonus = null;
    this.makeChasers(Math.min(cfg.maxChasers, cfg.chaserBase + cfg.chaserPerStage * i));
    this.applySpeed();
    ctx.hud.set({ lives: this.lives, level: i + 1, levelLabel: `${this.stage.name} · ${this.level.name}` });
    ctx.hud.pulse('level');
    this.updateProgress();
    if (i > 0) { ctx.audio.play('levelup'); ctx.shake.shake(6, 0.25); }
    if (i === 1) ctx.audio.music.start('upbeat');
    if (i >= 2) ctx.audio.music.start('tense');
    this.musicLevel();
    this.mode = 'banner';
    this.showBanner(`${cfg.labels.stage} ${i + 1}: ${this.stage.name}`, `${cfg.labels.watchOut} ${this.stage.chaser ? this.stage.chaser.name : ''}!`, 1.6, this.stage.accent);
    ctx.tweens.delay(2.0, () => { if (!this.ended) { this.mode = 'play'; this.spawnItem(); } });
  }

  resetSnake() {
    const { cfg } = this;
    const c = Math.floor(cfg.gridCols / 2) - 1, r = Math.floor(cfg.gridRows / 2);
    this.snake.length = 0; this.snakePrev.length = 0;
    for (let i = 0; i < cfg.startLength; i++) { this.snake.push({ c: c - i, r }); this.snakePrev.push({ c: c - i, r }); }
    this.dir = [1, 0]; this.nextDir = null; this.waiting = false; this.moveT = 0; this.autopilot = null; this.growPending = 0; this.invuln = 2;
  }
  applySpeed() {
    const { cfg } = this;
    const lv = this.stageIdx * this.levelsPerStage + this.levelIdx + (this.inFinale ? 1 : 0);
    this.speed = Math.min(cfg.maxTilesPerSecond, cfg.tilesPerSecond * Math.pow(cfg.speedPerLevel, lv));
  }
  makeChasers(count) {
    const { cfg, ctx } = this;
    this.chasers.length = 0;
    const base = Math.max(0.25, cfg.chaserInterval * (1 - cfg.chaserSpeedPerStage * this.stageIdx) * (this.inFinale ? 0.85 : 1));
    const corners = [[0, 0], [cfg.gridCols - 1, cfg.gridRows - 1], [cfg.gridCols - 1, 0], [0, cfg.gridRows - 1]];
    for (let i = 0; i < count; i++) {
      const [c, r] = corners[i % corners.length];
      this.chasers.push({ c, r, pc: c, pr: r, t: -ctx.rng.float(0.5, 1.5), interval: base * ctx.rng.float(0.9, 1.1), angle: 0, bob: ctx.rng.float(0, 6) });
    }
  }
  makeDeco() {
    const { ctx, cfg } = this;
    const rng = ctx.rng;
    const W = ctx.width;
    this.deco.length = 0;
    const kind = this.stage.deco || 'meadow';
    const count = cfg.gridCols + 6;
    for (let i = 0; i < count; i++) {
      this.deco.push({ x: rng.float(-20, W + 20), y: rng.float(0, 1), s: rng.float(0.6, 1.4), ph: rng.float(0, Math.PI * 2), k: rng.int(0, 2), kind });
    }
    this.deco.sort((a, b) => a.y - b.y);
  }

  levelUp() {
    const { ctx, cfg } = this;
    this.growth = 0;
    this.levelIdx++;
    const L = this.levelsPerStage;
    if (this.levelIdx >= L) {
      this.levelIdx = L - 1;
      this.stageClear();
      return;
    }
    this.applySpeed();
    this.mode = 'banner';
    this.tiles.length = 0;
    ctx.audio.play('levelup');
    ctx.audio.play('powerup', { volume: 0.5 });
    ctx.shake.shake(5, 0.25);
    const h = this.snake[0];
    this.burst(this.cellX(h.c), this.cellY(h.r), this.level.color, 1.6);
    ctx.particles.burst({ x: ctx.width / 2, y: 140, count: this.n(40), colors: [this.level.color, '#fff', '#ffd54a'], speed: 320, life: 1, size: 8, gravity: 240, shape: 'square' });
    ctx.hud.set({ levelLabel: `${this.stage.name} · ${this.level.name}` });
    ctx.hud.pulse('level');
    this.updateProgress();
    this.musicLevel();
    this.showBanner(`${cfg.labels.levelUp} ${this.level.name}!`, `${this.stage.name} · ${this.levelIdx + 1}/${L}`, 1.3, this.level.color);
    ctx.tweens.delay(1.8, () => { if (!this.ended) { this.mode = 'play'; this.spawnItem(); } });
  }

  stageClear() {
    const { ctx, cfg } = this;
    this.mode = 'banner';
    this.tiles.length = 0;
    ctx.audio.play('fanfare');
    ctx.shake.shake(8, 0.3);
    ctx.particles.burst({ x: ctx.width / 2, y: 200, count: this.n(60), colors: [this.stage.accent, '#fff', '#ffd54a', this.level.color], speed: 380, life: 1.1, size: 9, gravity: 260, shape: 'star' });
    this.showBanner(`${this.stage.name} ${cfg.labels.stageClear}`, '', 1.4, this.stage.accent);
    const next = this.stageIdx + 1;
    ctx.tweens.delay(1.9, async () => {
      if (this.ended) return;
      if (cfg.shieldCards && this.sortSkills.length) await this.shieldCard();
      if (this.ended) return;
      if (next >= cfg.stages.length) this.startFinale(); else this.startStage(next);
    });
  }

  // ---------------------------------------------------------------- finale
  startFinale() {
    const { ctx, cfg } = this;
    this.inFinale = true;
    this.finaleStep = 0;
    this.bgFrom = this.stageIdx;
    this.levelIdx = this.levelsPerStage - 1;
    this.lives = cfg.lives;
    this.resetSnake();
    this.tiles.length = 0;
    this.bonus = null;
    this.makeChasers(Math.min(cfg.maxChasers, cfg.chaserBase + cfg.chaserPerStage * this.stageIdx + 1));
    this.applySpeed();
    ctx.tweens.killTarget(this.storm);
    ctx.tweens.add(this.storm, { v: 1 }, 2.2);
    ctx.audio.music.start('boss');
    ctx.audio.music.setIntensity(1);
    ctx.audio.play('explode', { volume: 0.8 });
    ctx.shake.shake(10, 0.5);
    ctx.hud.set({ lives: this.lives, levelLabel: cfg.finale.name });
    ctx.hud.pulse('level');
    this.updateProgress();
    this.mode = 'banner';
    this.showBanner(cfg.labels.storm, String(cfg.finale.sub || '').replace('{n}', String(cfg.finale.steps)), 2.4, '#ffd54a');
    ctx.tweens.delay(3.0, () => { if (!this.ended) { this.mode = 'play'; this.spawnItem(); } });
  }
  finaleWin() {
    const { ctx, cfg } = this;
    this.finaleDone = true;
    this.mode = 'done';
    this.tiles.length = 0;
    ctx.tweens.killTarget(this.storm);
    ctx.tweens.add(this.storm, { v: 0 }, 1.6);
    ctx.audio.music.start('upbeat');
    ctx.audio.music.setIntensity(0.8);
    ctx.audio.play('fanfare');
    ctx.audio.play('levelup', { volume: 0.6 });
    ctx.shake.shake(10, 0.4);
    this.doFlash('#ffffff', 0.5);
    const W = ctx.width;
    for (let i = 0; i < 5; i++) {
      ctx.tweens.delay(i * 0.18, () => ctx.particles.burst({ x: W * (0.2 + 0.15 * i), y: 160 + (i % 2) * 90, count: this.n(36), colors: ['#ffd54a', '#fff', this.stage.accent, '#34d399'], speed: 320, life: 1.2, size: 9, gravity: 160, shape: i % 2 ? 'star' : 'circle' }));
    }
    this.showBanner(cfg.labels.restored, '', 2.2, '#ffd54a');
    ctx.tweens.delay(2.8, () => this.finish());
  }
  finish() {
    if (this.ended) return;
    this.ended = true;
    const { ctx, cfg } = this;
    ctx.overlay.hideHint();
    ctx.endGame({
      score: ctx.score, correct: this.stats.correct, total: this.stats.total,
      bonusXP: (this.finaleDone ? 40 : 0) + this.lives * 10 + (this.shield ? 15 : 0),
      stats: [
        { label: 'Right tiles eaten', value: this.stats.eaten },
        { label: 'Stages cleared', value: `${Math.min(cfg.stages.length, this.stageIdx + (this.inFinale ? 1 : 0))}/${cfg.stages.length}` },
        { label: 'Times caught', value: this.stats.caught },
        { label: `${cfg.finale.name}`, value: this.finaleDone ? 'restored' : `${this.finaleStep}/${cfg.finale.steps}` },
      ],
    });
  }

  // ---------------------------------------------------------------- items and tiles
  spawnItem() {
    if (this.ended || this.mode !== 'play') return;
    const { ctx, cfg } = this;
    let skill;
    if (this.inFinale && cfg.finaleSkills && cfg.finaleSkills.length) {
      const pool = cfg.finaleSkills.filter(s => this.choiceSkills.includes(s));
      skill = pool.length ? ctx.rng.pick(pool) : undefined;
    }
    if (!skill) {
      for (let i = 0; i < 4 && !skill; i++) { const s = ctx.adaptive.nextSkill(); if (this.choiceSkills.includes(s)) skill = s; }
      if (!skill) skill = ctx.rng.pick(this.choiceSkills);
    }
    const opts = { skill, type: 'choice', choices: 4 };
    if (this.inFinale) opts.difficulty = clamp(ctx.adaptive.difficultyFor(skill) + 1, 2, 5);
    const item = ctx.nextItem(opts);
    if (item.type !== 'choice') throw new Error('grid-collector: content returned a non-choice item for a tile round');
    this.item = item;
    this.itemStart = performance.now();
    this.promptLines = null;    // laid out lazily in render (needs g)
    this.hintText = '';
    const needsHint = ctx.adaptive.needsHint(item.skill) && item.hint;
    if (needsHint) { this.hintText = item.hint; this.hintT = 8; }
    if (this.shouldSpeak()) ctx.speak(item.speech || item.prompt);
    // flash the prompt over the grid
    const pf = this.promptFlash;
    pf.lines = null; pf.a = 0;
    ctx.tweens.killTarget(pf);
    ctx.tweens.add(pf, { a: 1 }, 0.25, { onComplete: () => ctx.tweens.add(pf, { a: 0 }, 0.4, { delay: 1.3 }) });
    // place tiles
    this.tiles.length = 0;
    const order = ctx.rng.shuffle(item.choices.map((_, i) => i));
    for (let k = 0; k < order.length; k++) {
      const i = order[k];
      const pos = this.freeTileCell();
      const tile = { c: pos.c, r: pos.r, w: 2, index: i, label: item.choices[i], lines: null, color: cfg.tilePalette[k % cfg.tilePalette.length], shape: SHAPES[k % SHAPES.length], key: k + 1, scale: 0, alive: true, flash: 0, hint: needsHint && i === item.correct, ph: ctx.rng.float(0, 6) };
      this.tiles.push(tile);
      ctx.tweens.add(tile, { scale: 1 }, 0.45, { ease: Easing.easeOutBack, delay: 0.05 * k });
    }
    ctx.audio.play('whoosh', { volume: 0.35 });
  }
  freeTileCell() {
    const { cfg, ctx } = this;
    const head = this.snake[0];
    let best = null, bestD = -1;
    for (let tries = 0; tries < 80; tries++) {
      const c = ctx.rng.int(0, cfg.gridCols - 2), r = ctx.rng.int(0, cfg.gridRows - 1);
      let ok = true;
      for (const t of this.tiles) if (t.r === r && Math.abs(t.c - c) < 2) { ok = false; break; }
      if (ok && (Math.abs(r - head.r) + Math.abs(Math.min(Math.abs(c - head.c), Math.abs(c + 1 - head.c)))) < 3) ok = false;
      if (ok) for (const s of this.snake) if (s.r === r && (s.c === c || s.c === c + 1)) { ok = false; break; }
      if (ok) for (const ch of this.chasers) if (ch.r === r && Math.abs(ch.c - c) < 2) { ok = false; break; }
      if (ok) {
        // prefer cells spread apart from existing tiles
        let d = 99;
        for (const t of this.tiles) d = Math.min(d, Math.abs(t.c - c) + Math.abs(t.r - r));
        if (d > bestD) { bestD = d; best = { c, r }; }
        if (bestD >= 4) break;
      }
    }
    return best || { c: 0, r: 0 };
  }
  tileAt(c, r) {
    for (const t of this.tiles) if (t.alive && t.r === r && (t.c === c || t.c + 1 === c)) return t;
    return null;
  }
  clearTiles(except) {
    const { ctx } = this;
    for (const t of this.tiles) {
      if (t === except || !t.alive) continue;
      ctx.tweens.killTarget(t);
      ctx.tweens.add(t, { scale: 0 }, 0.3, { ease: Easing.easeInQuad, onComplete: () => { t.alive = false; } });
    }
  }

  // ---------------------------------------------------------------- answering
  eat(tile) {
    if (!tile.alive || this.busy) return;
    const { ctx } = this;
    const responseMs = Math.round(performance.now() - this.itemStart);
    const res = ctx.answer(this.item, tile.index, { responseMs });
    this.autopilot = null;
    if (res.correct) this.onCorrect(tile, responseMs); else this.onWrong(tile);
  }
  onCorrect(tile, responseMs) {
    const { ctx, cfg } = this;
    this.busy = true;
    this.stats.eaten++;
    const speedBonus = clamp(Math.round((9000 - responseMs) / 300), 0, 25);
    let pts = 50 + 20 * this.item.difficulty + speedBonus;
    if (ctx.streak >= 5) pts *= 2;
    pts = Math.round(pts / 5) * 5;
    const x = this.cellX(tile.c + 0.5), y = this.cellY(tile.r);
    ctx.audio.play('pop', { pitch: 1 + Math.min(0.6, ctx.streak * 0.05) });
    ctx.audio.play('coin', { volume: 0.5, pitch: 1 + Math.min(0.5, ctx.streak * 0.04) });
    this.burst(x, y, tile.color, 1);
    ctx.addScore(pts, { x, y: y - 26 });
    ctx.floatingText.add(ctx.streak >= 5 ? 'x2 ' + cfg.labels.yum : cfg.labels.yum, x, y + 22, { color: '#fff', size: 20, duration: 0.8, vy: -40 });
    tile.alive = false;
    ctx.tweens.killTarget(tile);
    this.clearTiles(tile);
    ctx.audio.play('swoosh', { volume: 0.3 });
    this.mouth = 1;
    ctx.tweens.killTarget(this);
    ctx.tweens.add(this, { mouth: 0 }, 0.4);
    if (this.snake.length < cfg.maxLength) this.growPending++;
    const streak = ctx.streak;
    ctx.hud.set({ combo: streak >= 2 ? streak : 0 });
    if (streak === 5) { ctx.audio.play('powerup'); ctx.overlay.toast('Streak of 5: double XP!', { type: 'good', duration: 1.8 }); ctx.shake.shake(4, 0.2); }
    else if (streak >= 3 && streak % 3 === 0) { ctx.audio.play('combo'); ctx.overlay.toast(`${streak} in a row!`, { type: 'good', duration: 1.2 }); }
    if (this.inFinale) {
      this.finaleStep++;
      this.doFlash('#ffd54a', 0.25);
      ctx.floatingText.add(`${cfg.labels.link} ${this.finaleStep}/${cfg.finale.steps}`, ctx.width / 2, 120, { color: '#ffd54a', size: 30, duration: 1.1, vy: -30 });
      this.updateProgress();
      if (this.finaleStep >= cfg.finale.steps) { this.busy = false; this.finaleWin(); return; }
    } else {
      this.growth++;
      this.updateProgress();
    }
    ctx.tweens.delay(0.45, () => {
      this.busy = false;
      if (this.ended || this.mode !== 'play') return;
      if (!this.inFinale && this.growth >= cfg.growthToLevel) this.levelUp(); else this.spawnItem();
    });
  }
  async onWrong(tile) {
    const { ctx, cfg } = this;
    this.busy = true;
    this.stats.wrong++;
    const x = this.cellX(tile.c + 0.5), y = this.cellY(tile.r);
    ctx.audio.play('hit');
    ctx.audio.play('buzz', { volume: 0.4 });
    tile.flash = 1;
    ctx.tweens.add(tile, { flash: 0 }, 0.5);
    ctx.floatingText.add(cfg.labels.notFood, x, y - 26, { color: '#ff8a8a', size: 24 });
    ctx.particles.burst({ x, y, count: this.n(16), colors: ['#ff6b6b', '#fff'], speed: 200, life: 0.5, size: 6, gravity: 300 });
    ctx.shake.shake(5, 0.2);
    this.doFlash('#ef4444', 0.28);
    ctx.hud.set({ combo: 0 });
    if (!this.inFinale) this.growth = Math.max(0, this.growth - 1);
    this.shrink(2);
    this.updateProgress();
    await ctx.feedback(this.item, tile.index, false, { blocking: true });
    if (this.ended) return;
    this.clearTiles(null);
    ctx.audio.play('whoosh', { volume: 0.3 });
    ctx.tweens.delay(0.35, () => { this.busy = false; if (!this.ended && this.mode === 'play') this.spawnItem(); });
  }
  shrink(n) {
    while (n-- > 0 && this.snake.length > 2) { this.snake.pop(); this.snakePrev.pop(); }
  }

  // ---------------------------------------------------------------- hazards
  caught(ch) {
    const { ctx, cfg } = this;
    if (this.invuln > 0 || this.mode !== 'play' || this.busy) return;
    const h = this.snake[0];
    const x = this.cellX(h.c), y = this.cellY(h.r);
    if (this.shield) {
      this.shield = false;
      ctx.audio.play('powerup');
      ctx.particles.burst({ x, y, count: this.n(30), colors: ['#8ecae6', '#fff', '#ffd54a'], speed: 300, life: 0.7, size: 7 });
      ctx.floatingText.add('Shield!', x, y - 30, { color: '#8ecae6', size: 26 });
      this.invuln = 2;
      this.respawnChaser(ch);
      return;
    }
    this.lives = Math.max(0, this.lives - 1);
    this.stats.caught++;
    ctx.hud.set({ lives: this.lives });
    ctx.hud.flash('lives', '#ff5d7a');
    ctx.hud.pulse('lives');
    ctx.audio.play('explode', { volume: 0.7 });
    ctx.shake.shake(10, 0.35);
    this.doFlash('#ef4444', 0.35);
    ctx.particles.burst({ x, y, count: this.n(26), colors: ['#ff6b6b', '#fff', this.level.color], speed: 260, life: 0.6, size: 7, gravity: 300 });
    ctx.floatingText.add('Ouch!', x, y - 30, { color: '#ff8a8a', size: 26 });
    this.shrink(1);
    this.invuln = 2.2;
    this.respawnChaser(ch);
    if (this.lives <= 0) this.levelRestart();
  }
  respawnChaser(ch) {
    const { cfg } = this;
    const h = this.snake[0];
    const c = h.c < cfg.gridCols / 2 ? cfg.gridCols - 1 : 0;
    const r = h.r < cfg.gridRows / 2 ? cfg.gridRows - 1 : 0;
    ch.c = c; ch.r = r; ch.pc = c; ch.pr = r; ch.t = -1.5;
  }
  levelRestart() {
    const { ctx, cfg } = this;
    this.mode = 'banner';
    this.tiles.length = 0;
    this.growth = 0;
    this.lives = cfg.lives;
    this.updateProgress();
    this.showBanner(cfg.labels.caught, '', 1.4, '#ff8a8a');
    ctx.audio.play('wrong', { volume: 0.5 });
    ctx.tweens.delay(1.7, () => {
      if (this.ended) return;
      this.resetSnake();
      for (const ch of this.chasers) this.respawnChaser(ch);
      ctx.hud.set({ lives: this.lives });
      this.mode = 'play';
      this.spawnItem();
    });
  }
  spawnBonus() {
    const { cfg, ctx } = this;
    const head = this.snake[0];
    for (let tries = 0; tries < 40; tries++) {
      const c = ctx.rng.int(0, cfg.gridCols - 1), r = ctx.rng.int(0, cfg.gridRows - 1);
      if (this.tileAt(c, r) || (Math.abs(c - head.c) + Math.abs(r - head.r)) < 4) continue;
      let ok = true;
      for (const s of this.snake) if (s.c === c && s.r === r) { ok = false; break; }
      if (!ok) continue;
      this.bonus = { c, r, scale: 0, ph: 0 };
      ctx.tweens.add(this.bonus, { scale: 1 }, 0.4, { ease: Easing.easeOutBack });
      return;
    }
  }
  eatBonus() {
    const { ctx, cfg } = this;
    const b = this.bonus;
    this.bonus = null;
    this.stats.bonus++;
    const x = this.cellX(b.c), y = this.cellY(b.r);
    ctx.audio.play('coin', { pitch: 1.3 });
    ctx.audio.play('powerup', { volume: 0.4 });
    ctx.particles.burst({ x, y, count: this.n(22), colors: ['#ffd54a', '#fff7cc', '#fff'], speed: 240, life: 0.7, size: 7, shape: 'star' });
    ctx.addScore(cfg.bonusValue, { x, y: y - 24, label: `+${cfg.bonusValue} ${cfg.labels.bonus}` });
    this.slowT = cfg.bonusSlow;
    this.bonusT = cfg.bonusEvery;
  }

  // ---------------------------------------------------------------- shield card (sort item)
  shieldCard() {
    const { ctx, cfg } = this;
    return new Promise(resolve => {
      const skill = ctx.rng.pick(this.sortSkills);
      const item = ctx.nextItem({ skill, type: 'sort' });
      if (item.type !== 'sort') { resolve(); return; }
      if (this.shouldSpeak()) ctx.speak(item.speech || item.prompt);
      this.card = { item, idx: 0, chosen: [], a: 0, buttons: [], hover: -1, start: performance.now(), resolve };
      ctx.tweens.add(this.card, { a: 1 }, 0.35);
      ctx.audio.play('whoosh');
      this.mode = 'card';
    });
  }
  cardPick(k) {
    const card = this.card;
    if (!card || card.a < 0.9 || this.busy) return;
    const { ctx, cfg } = this;
    const cats = card.item.categories;
    if (k < 0 || k >= cats.length) return;
    ctx.audio.play('click');
    card.chosen.push(cats[k]);
    card.idx++;
    if (card.idx < card.item.items.length) return;
    this.busy = true;
    const responseMs = Math.round(performance.now() - card.start);
    const res = ctx.answer(card.item, card.chosen, { responseMs });
    const finishCard = () => {
      this.busy = false;
      const r = card.resolve;
      this.card = null;
      this.mode = 'banner';
      r();
    };
    if (res.correct) {
      this.shield = true;
      ctx.audio.play('fanfare', { volume: 0.7 });
      ctx.audio.play('powerup');
      ctx.shake.shake(4, 0.2);
      ctx.addScore(100 * card.item.difficulty, { x: ctx.width / 2, y: 150, label: `+${100 * card.item.difficulty}` });
      ctx.particles.burst({ x: ctx.width / 2, y: ctx.height / 2, count: this.n(50), colors: ['#8ecae6', '#fff', '#ffd54a'], speed: 360, life: 1, size: 8, shape: 'star' });
      ctx.overlay.toast(cfg.labels.shield, { type: 'good', duration: 1.6 });
      ctx.feedback(card.item, card.chosen, true, { blocking: false, duration: 1.1 });
      ctx.tweens.add(card, { a: 0 }, 0.3, { onComplete: finishCard });
    } else {
      ctx.feedback(card.item, card.chosen, false, { blocking: true }).then(() => { if (!this.ended) finishCard(); });
    }
  }

  // ---------------------------------------------------------------- input
  steer(d) {
    if (this.mode !== 'play') return;
    this.autopilot = null;
    const cur = this.dir;
    const reverse = cur[0] === -d[0] && cur[1] === -d[1];
    if (reverse && this.snake.length > 1 && !this.waiting) return;
    this.nextDir = d;
    this.waiting = false;
  }
  onTap(x, y) {
    if (this.ended) return;
    if (this.mode === 'card' && this.card) {
      for (let i = 0; i < this.card.buttons.length; i++) {
        const b = this.card.buttons[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { this.cardPick(i); return; }
      }
      return;
    }
    if (this.mode !== 'play') return;
    // tap a tile -> go there
    for (const t of this.tiles) {
      if (!t.alive) continue;
      const tx = this.gx + t.c * this.cell, ty = this.gy + t.r * this.cell;
      if (x >= tx - 6 && x <= tx + this.cell * 2 + 6 && y >= ty - 6 && y <= ty + this.cell + 6) { this.target(t); return; }
    }
    // tap elsewhere -> steer toward the tap relative to the head
    const h = this.snake[0];
    const dx = x - this.cellX(h.c), dy = y - this.cellY(h.r);
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    this.steer(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
  }
  target(tile) {
    if (!tile || !tile.alive || this.mode !== 'play') return;
    this.autopilot = tile;
    this.waiting = false;
    this.ctx.audio.play('tick', { volume: 0.7 });
  }
  autoDir() {
    const t = this.autopilot;
    if (!t || !t.alive) { this.autopilot = null; return null; }
    const h = this.snake[0];
    const tc = Math.abs(t.c - h.c) <= Math.abs(t.c + 1 - h.c) ? t.c : t.c + 1;
    const dx = tc - h.c, dy = t.r - h.r;
    if (dx === 0 && dy === 0) return null;
    const cands = [];
    if (Math.abs(dx) >= Math.abs(dy)) { if (dx) cands.push([Math.sign(dx), 0]); if (dy) cands.push([0, Math.sign(dy)]); }
    else { if (dy) cands.push([0, Math.sign(dy)]); if (dx) cands.push([Math.sign(dx), 0]); }
    for (const d of cands) if (!(this.snake.length > 1 && d[0] === -this.dir[0] && d[1] === -this.dir[1])) return d;
    // only reverse would reach it: sidestep perpendicular to the current direction
    const p = this.dir[0] ? [0, h.r > 0 ? -1 : 1] : [h.c > 0 ? -1 : 1, 0];
    return p;
  }

  // ---------------------------------------------------------------- update
  update(dt) {
    if (this.ended) return;
    const { ctx, cfg } = this;
    const inp = ctx.input;
    this.t += dt;
    if (this.hintT > 0) this.hintT -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.slowT > 0) this.slowT -= dt;
    // storm wind
    if (this.storm.v > 0.01) {
      for (const w of this.wind) { w.x -= w.v * dt * this.storm.v; w.y += w.v * 0.18 * dt; if (w.x < -w.len) { w.x = ctx.width + w.len; w.y = ctx.rng.float(0, ctx.height); } if (w.y > ctx.height) w.y = -10; }
      this.lightningT -= dt;
      if (this.lightningT <= 0 && this.mode === 'play') {
        this.lightningT = ctx.rng.float(3, 6);
        this.lightning.a = 0.45;
        ctx.tweens.killTarget(this.lightning);
        ctx.tweens.add(this.lightning, { a: 0 }, 0.35);
        ctx.audio.play('explode', { volume: 0.35, pitch: 0.7 });
        ctx.shake.shake(4, 0.2);
      }
    }

    if (this.mode === 'card') {
      if (this.card && !this.busy) {
        const k = this.card.item.categories.length;
        for (let i = 0; i < k; i++) if (inp.wasPressed(DIGITS[i]) || inp.wasPressed(NUMPAD[i])) { this.cardPick(i); break; }
      }
      return;
    }
    if (this.mode !== 'play') return;

    // keyboard
    if (inp.wasPressed('ArrowUp') || inp.wasPressed('KeyW')) this.steer(DIRS.up);
    else if (inp.wasPressed('ArrowDown') || inp.wasPressed('KeyS')) this.steer(DIRS.down);
    else if (inp.wasPressed('ArrowLeft') || inp.wasPressed('KeyA')) this.steer(DIRS.left);
    else if (inp.wasPressed('ArrowRight') || inp.wasPressed('KeyD')) this.steer(DIRS.right);
    for (let k = 0; k < 4; k++) if (inp.wasPressed(DIGITS[k]) || inp.wasPressed(NUMPAD[k])) { const t = this.tiles.find(x => x.alive && x.key === k + 1); if (t) this.target(t); }

    if (this.busy) return;

    // bonus orbs
    if (cfg.bonusEvery > 0 && !this.bonus && !this.inFinale) { this.bonusT -= dt; if (this.bonusT <= 0) this.spawnBonus(); }
    if (this.bonus) this.bonus.ph += dt;

    // snake movement
    const period = 1 / this.speed;
    this.moveT += dt;
    let guard = 0;
    while (this.moveT >= period && guard++ < 3) {
      this.moveT -= period;
      this.step();
      if (this.busy || this.mode !== 'play') { this.moveT = 0; break; }
    }
    if (this.waiting) this.moveT = Math.min(this.moveT, period);

    // chasers
    const slow = this.slowT > 0 ? 2.2 : 1;
    for (const ch of this.chasers) {
      ch.t += dt;
      const iv = ch.interval * slow;
      if (ch.t >= iv) {
        ch.t -= iv;
        this.chaserStep(ch);
        const h = this.snake[0];
        if (ch.c === h.c && ch.r === h.r) this.caught(ch);
      }
    }
  }

  step() {
    const { cfg } = this;
    const auto = this.autopilot ? this.autoDir() : null;
    if (auto) this.nextDir = auto;
    if (this.nextDir) { this.dir = this.nextDir; this.nextDir = null; }
    if (this.waiting && !auto) return;
    const h = this.snake[0];
    const nc = h.c + this.dir[0], nr = h.r + this.dir[1];
    if (nc < 0 || nr < 0 || nc >= cfg.gridCols || nr >= cfg.gridRows) {
      if (!this.waiting) { this.ctx.audio.play('tick', { volume: 0.4, pitch: 0.6 }); this.waiting = true; }
      return;
    }
    this.waiting = false;
    // record previous positions for interpolation
    for (let i = 0; i < this.snake.length; i++) { const p = this.snakePrev[i] || (this.snakePrev[i] = { c: 0, r: 0 }); p.c = this.snake[i].c; p.r = this.snake[i].r; }
    const tail = this.snake[this.snake.length - 1];
    if (this.growPending > 0) { this.growPending--; this.snake.push({ c: tail.c, r: tail.r }); this.snakePrev.push({ c: tail.c, r: tail.r }); }
    for (let i = this.snake.length - 1; i > 0; i--) { this.snake[i].c = this.snake[i - 1].c; this.snake[i].r = this.snake[i - 1].r; }
    h.c = nc; h.r = nr;
    this.stepCount++;
    // collisions
    const tile = this.tileAt(nc, nr);
    if (tile) { this.eat(tile); return; }
    if (this.bonus && this.bonus.c === nc && this.bonus.r === nr) this.eatBonus();
    for (const ch of this.chasers) if (ch.c === nc && ch.r === nr) { this.caught(ch); break; }
  }
  chaserStep(ch) {
    const { cfg, ctx } = this;
    const h = this.snake[0];
    ch.pc = ch.c; ch.pr = ch.r;
    let dx = Math.sign(h.c - ch.c), dy = Math.sign(h.r - ch.r);
    let mx = 0, my = 0;
    if (ctx.rng.chance(cfg.chaserRandomness)) { const d = ctx.rng.pick([DIRS.up, DIRS.down, DIRS.left, DIRS.right]); mx = d[0]; my = d[1]; }
    else if (Math.abs(h.c - ch.c) >= Math.abs(h.r - ch.r)) { mx = dx || 0; if (!mx) my = dy; }
    else { my = dy || 0; if (!my) mx = dx; }
    const nc = clamp(ch.c + mx, 0, cfg.gridCols - 1), nr = clamp(ch.r + my, 0, cfg.gridRows - 1);
    if (mx || my) ch.angle = Math.atan2(nr - ch.r, nc - ch.c);
    ch.c = nc; ch.r = nr;
  }

  // ---------------------------------------------------------------- render
  _sky(g, idx) {
    const key = 'sky' + idx;
    if (!this._grads[key]) {
      const st = this.cfg.stages[Math.min(idx, this.cfg.stages.length - 1)];
      const gr = g.createLinearGradient(0, 0, 0, this.ctx.height);
      gr.addColorStop(0, st.sky[0]); gr.addColorStop(1, st.sky[1]);
      this._grads[key] = gr;
    }
    return this._grads[key];
  }
  render(g) {
    const { ctx, cfg } = this;
    const W = ctx.width, H = ctx.height;
    // sky crossfade
    g.fillStyle = this._sky(g, this.stageIdx);
    g.fillRect(0, 0, W, H);
    if (this.bgMix.v < 1) { g.globalAlpha = 1 - this.bgMix.v; g.fillStyle = this._sky(g, this.bgFrom); g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    this.renderDeco(g);
    // storm darkness
    if (this.storm.v > 0.01) {
      g.fillStyle = `rgba(8, 10, 30, ${0.45 * this.storm.v})`;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = `rgba(220, 230, 255, ${0.5 * this.storm.v})`; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath();
      for (const w of this.wind) { g.moveTo(w.x, w.y); g.lineTo(w.x + w.len, w.y - w.len * 0.18); }
      g.stroke();
      if (this.lightning.a > 0) { g.fillStyle = `rgba(255,255,255,${this.lightning.a})`; g.fillRect(0, 0, W, H); }
    }
    this.renderGrid(g);
    this.renderBonus(g);
    this.renderTiles(g);
    this.renderSnake(g);
    this.renderChasers(g);
    this.renderPanel(g);
    this.renderPromptFlash(g);
    if (this.flash.a > 0) { g.fillStyle = hexToRgba(this.flash.color, this.flash.a); g.fillRect(0, 0, W, H); }
    if (this.banner) this.renderBanner(g);
    if (this.card) this.renderCard(g);
  }

  renderDeco(g) {
    const { ctx } = this;
    const W = ctx.width, H = ctx.height;
    const st = this.stage;
    const time = this.t;
    const horizon = this.gy - 10;
    // ground band
    g.fillStyle = hexToRgba(st.ground, 0.55);
    g.fillRect(0, horizon, W, H - horizon);
    const kind = st.deco || 'meadow';
    if (kind === 'savanna' || kind === 'meadow') {
      g.fillStyle = kind === 'savanna' ? 'rgba(255, 214, 102, 0.9)' : 'rgba(255,255,255,0.85)';
      g.beginPath(); g.arc(W * 0.82, 30, kind === 'savanna' ? 26 : 16, 0, Math.PI * 2); g.fill();
    } else if (kind === 'snow') {
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath(); g.arc(W * 0.8, 28, 14, 0, Math.PI * 2); g.fill();
    } else if (kind === 'forest' || kind === 'cave') {
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.beginPath(); g.arc(W * 0.86, 30, 12, 0, Math.PI * 2); g.fill();
    }
    for (const d of this.deco) {
      const x = d.x + Math.sin(time * 0.4 + d.ph) * 4;
      const s = d.s;
      if (kind === 'pond' || kind === 'ocean') {
        const y = horizon + 8 + d.y * (H - horizon - 20);
        g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(x, y, 26 * s + Math.sin(time + d.ph) * 4, 7 * s, 0, 0, Math.PI * 2); g.stroke();
        if (kind === 'pond' && d.k === 0) { g.fillStyle = 'rgba(80, 180, 110, 0.35)'; g.beginPath(); g.ellipse(x, y, 16 * s, 10 * s, 0, 0.3, Math.PI * 2 - 0.3); g.lineTo(x, y); g.fill(); }
        if (kind === 'ocean' && d.k === 1) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(x, y - ((time * 20 + d.ph * 30) % 120), 3 * s, 0, Math.PI * 2); g.fill(); }
      } else if (kind === 'forest') {
        const y = horizon - 2;
        const h = 40 + 50 * s;
        g.fillStyle = `rgba(20, 60, 40, ${0.35 + 0.25 * d.y})`;
        g.fillRect(x - 4 * s, y - h, 8 * s, h);
        g.beginPath(); g.arc(x, y - h, 22 * s, 0, Math.PI * 2); g.arc(x - 14 * s, y - h + 10, 16 * s, 0, Math.PI * 2); g.arc(x + 14 * s, y - h + 10, 16 * s, 0, Math.PI * 2); g.fill();
        if (d.k === 2) { g.fillStyle = `rgba(255, 240, 120, ${0.35 + 0.35 * Math.sin(time * 3 + d.ph)})`; g.beginPath(); g.arc(x + 10, y - 20 - d.y * 300, 2.5, 0, Math.PI * 2); g.fill(); }
      } else if (kind === 'savanna') {
        const y = horizon - 2;
        if (d.k === 0) { g.fillStyle = 'rgba(60, 40, 20, 0.5)'; g.fillRect(x - 2, y - 46 * s, 4, 46 * s); g.beginPath(); g.ellipse(x, y - 46 * s, 30 * s, 9 * s, 0, 0, Math.PI * 2); g.fill(); }
        else { g.strokeStyle = 'rgba(120, 90, 30, 0.5)'; g.lineWidth = 2; g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(x, y); g.lineTo(x + i * 5 * s, y - 14 * s); } g.stroke(); }
      } else if (kind === 'snow') {
        if (d.k === 0) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(x - 50 * s, horizon); g.lineTo(x, horizon - 50 * s); g.lineTo(x + 50 * s, horizon); g.closePath(); g.fill(); }
        else { g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(x, (d.y * H + time * 25 + d.ph * 20) % H, 2.5 * s, 0, Math.PI * 2); g.fill(); }
      } else if (kind === 'cave') {
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.moveTo(x - 10 * s, 0); g.lineTo(x, 30 * s + d.y * 20); g.lineTo(x + 10 * s, 0); g.closePath(); g.fill();
      } else { // meadow
        const y = horizon - 2;
        if (d.k === 0) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(x, y - 30 * s, 60 * s, 18 * s, 0, 0, Math.PI * 2); g.fill(); }
        else { g.fillStyle = ['#ff8fa3', '#ffd166', '#c7f9cc'][d.k]; g.beginPath(); g.arc(x, y - 6 * s, 3 * s, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(60,120,50,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 6 * s); g.lineTo(x, y + 4); g.stroke(); }
      }
    }
  }

  renderGrid(g) {
    const { cfg } = this;
    const cs = this.cell;
    roundRect(g, this.gx - 6, this.gy - 6, this.gw + 12, this.gh + 12, 18, { fill: 'rgba(10,14,32,0.35)', stroke: hexToRgba(this.stage.accent, 0.5), lineWidth: 3 });
    for (let r = 0; r < cfg.gridRows; r++) for (let c = 0; c < cfg.gridCols; c++) {
      g.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.11)';
      g.fillRect(this.gx + c * cs + 1, this.gy + r * cs + 1, cs - 2, cs - 2);
    }
  }

  renderBonus(g) {
    const b = this.bonus;
    if (!b) return;
    const x = this.cellX(b.c), y = this.cellY(b.r) + Math.sin(b.ph * 4) * 3;
    const r = this.cell * 0.3 * b.scale;
    g.save();
    g.translate(x, y);
    g.rotate(b.ph);
    g.fillStyle = 'rgba(255, 213, 74, 0.35)';
    g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 1.9, Math.sin(a) * r * 1.9); } g.lineWidth = 3; g.strokeStyle = 'rgba(255,213,74,0.5)'; g.stroke();
    const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
    gr.addColorStop(0, '#fff7cc'); gr.addColorStop(1, '#f59e0b');
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  renderTiles(g) {
    const cs = this.cell;
    const time = this.t;
    for (const t of this.tiles) {
      if (!t.alive || t.scale <= 0.01) continue;
      const w = cs * 2 - 8, h = cs - 8;
      const cx = this.gx + t.c * cs + cs, cy = this.gy + t.r * cs + cs / 2;
      g.save();
      g.translate(cx, cy);
      const pulse = t.hint ? 1 + 0.04 * Math.sin(time * 5 + t.ph) : 1;
      g.scale(t.scale * pulse, t.scale * pulse);
      if (t.hint) { g.shadowColor = '#ffd54a'; g.shadowBlur = 18; }
      roundRect(g, -w / 2, -h / 2, w, h, 12, { fill: 'rgba(255,255,255,0.93)', stroke: t.color, lineWidth: 4 });
      g.shadowBlur = 0;
      if (t.flash > 0) roundRect(g, -w / 2, -h / 2, w, h, 12, { fill: hexToRgba('#ef4444', t.flash * 0.7) });
      // badge: number + shape (never colour alone)
      shapeBadge(g, t.shape, -w / 2 + 13, -h / 2 + 13, 9, t.color);
      drawText(g, String(t.key), -w / 2 + 13, -h / 2 + 14, { font: this.fonts.badge, color: '#14172b' });
      if (!t.lines) t.lines = wrapText(g, t.label, w - 34, this.fonts.tile);
      if (t.lines.length > 2) t.lines = [t.lines[0], t.lines.slice(1).join(' ')];
      const lh = 19;
      const y0 = -((t.lines.length - 1) * lh) / 2;
      for (let i = 0; i < t.lines.length; i++) drawText(g, t.lines[i], 6, y0 + i * lh + 1, { font: this.fonts.tile, color: '#14172b', maxWidth: w - 34 });
      g.restore();
    }
  }

  renderSnake(g) {
    const cs = this.cell;
    const period = 1 / this.speed;
    const tt = this.waiting ? 1 : clamp(this.moveT / period, 0, 1);
    const lvl = this.level;
    const color = lvl.color, style = lvl.sprite || 'blob';
    const n = this.snake.length;
    const blink = this.invuln > 0 && Math.floor(this.t * 12) % 2 === 0;
    if (blink) g.globalAlpha = 0.45;
    if (this.shield) {
      const h = this.snake[0];
      const hp = this.snakePrev[0] || h;
      const x = this.cellX(lerp(hp.c, h.c, tt)), y = this.cellY(lerp(hp.r, h.r, tt));
      g.fillStyle = `rgba(142, 202, 230, ${0.22 + 0.08 * Math.sin(this.t * 4)})`;
      g.strokeStyle = 'rgba(190, 230, 255, 0.8)'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, cs * 0.62, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    for (let i = n - 1; i >= 1; i--) {
      const s = this.snake[i], p = this.snakePrev[i] || s;
      const x = this.cellX(lerp(p.c, s.c, tt)), y = this.cellY(lerp(p.r, s.r, tt));
      const r = cs * lerp(0.36, 0.22, (i - 1) / Math.max(1, n - 2));
      drawSegment(g, x, y, r, color, style, i);
    }
    const h = this.snake[0], hp = this.snakePrev[0] || h;
    const x = this.cellX(lerp(hp.c, h.c, tt)), y = this.cellY(lerp(hp.r, h.r, tt));
    const angle = Math.atan2(this.dir[1], this.dir[0]);
    drawHead(g, { x, y, r: cs * 0.4, angle, style, color, t: this.t, mouth: this.mouth });
    g.globalAlpha = 1;
    // autopilot target marker
    const a = this.autopilot;
    if (a && a.alive) {
      const tx = this.gx + a.c * cs + cs, ty = this.gy + a.r * cs + cs / 2;
      g.save(); g.setLineDash([6, 6]); g.lineDashOffset = -this.t * 40; g.strokeStyle = '#ffd54a'; g.lineWidth = 3;
      roundRect(g, tx - cs + 2, ty - cs / 2 + 2, cs * 2 - 4, cs - 4, 14, { stroke: '#ffd54a', lineWidth: 3 });
      g.restore();
    }
  }

  renderChasers(g) {
    const cs = this.cell;
    const st = this.stage.chaser || { sprite: 'cat', color: '#f97316' };
    const slow = this.slowT > 0;
    for (const ch of this.chasers) {
      const iv = ch.interval * (slow ? 2.2 : 1);
      const tt = clamp(ch.t / iv, 0, 1);
      const x = this.cellX(lerp(ch.pc, ch.c, tt)), y = this.cellY(lerp(ch.pr, ch.r, tt)) + Math.sin(this.t * 6 + ch.bob) * 2;
      if (slow) { g.fillStyle = 'rgba(142,202,230,0.3)'; g.beginPath(); g.arc(x, y, cs * 0.55, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x, y + cs * 0.38, cs * 0.34, cs * 0.12, 0, 0, Math.PI * 2); g.fill();
      drawHead(g, { x, y, r: cs * 0.42, angle: ch.angle, style: st.sprite, color: st.color, menace: true, t: this.t });
    }
  }

  renderPanel(g) {
    const { ctx, cfg } = this;
    const W = ctx.width;
    const px = this.gx - 6, py = this.panelY, ph = this.panelH;
    const leftW = Math.round((this.gw + 12) * 0.6) - 6;
    const rightX = px + leftW + 10, rightW = (this.gw + 12) - leftW - 10;
    roundRect(g, px, py, leftW, ph, 16, { fill: PANEL_BG, stroke: PANEL_STROKE, lineWidth: 2 });
    roundRect(g, rightX, py, rightW, ph, 16, { fill: PANEL_BG, stroke: PANEL_STROKE, lineWidth: 2 });
    const item = this.item;
    const lf = this.fonts;
    // left: rule
    const eyebrow = item ? `${cfg.labels.rule} · ${this.skillName(item.skill)}` : cfg.labels.rule;
    drawText(g, eyebrow, px + 16, py + 16, { font: lf.eyebrow, color: hexToRgba(this.stage.accent, 0.95), align: 'left', maxWidth: leftW - 32 });
    if (item) {
      if (!this.promptLines) this.promptLines = wrapText(g, item.prompt, leftW - 32, lf.prompt).slice(0, 3);
      const lines = this.promptLines;
      const lh = lines.length >= 3 ? 22 : 24;
      for (let i = 0; i < lines.length; i++) drawText(g, lines[i], px + 16, py + 40 + i * lh, { font: lf.prompt, color: '#fff', align: 'left', maxWidth: leftW - 32 });
    }
    // growth line (bottom of the left panel)
    const gyLine = py + ph - 16;
    const L = this.levelsPerStage;
    if (this.inFinale) {
      drawText(g, `${cfg.finale.name} · ${cfg.labels.link} ${this.finaleStep}/${cfg.finale.steps}`, px + 16, gyLine, { font: lf.small, color: '#ffd54a', align: 'left' });
      const n = cfg.finale.steps, sx = px + leftW - 16 - n * 26;
      for (let i = 0; i < n; i++) {
        const lit = i < this.finaleStep;
        if (i > 0) arrowLine(g, sx + (i - 1) * 26 + 9, gyLine, sx + i * 26 - 9, gyLine, lit ? '#ffd54a' : 'rgba(255,255,255,0.3)', 2, 6);
        g.fillStyle = lit ? '#ffd54a' : 'rgba(255,255,255,0.25)';
        g.beginPath(); g.arc(sx + i * 26, gyLine, 7, 0, Math.PI * 2); g.fill();
      }
    } else {
      const next = this.levelIdx + 1 < L ? this.stage.levels[this.levelIdx + 1].name : (this.stageIdx + 1 < cfg.stages.length ? cfg.stages[this.stageIdx + 1].levels[0].name : cfg.finale.name);
      drawText(g, `${cfg.labels.grow}: ${this.level.name} → ${next}`, px + 16, gyLine, { font: lf.small, color: 'rgba(255,255,255,0.85)', align: 'left', maxWidth: leftW - 180 });
      const segs = cfg.growthToLevel, sw = 24, sx = px + leftW - 16 - segs * (sw + 4);
      for (let i = 0; i < segs; i++) roundRect(g, sx + i * (sw + 4), gyLine - 7, sw, 14, 5, { fill: i < this.growth ? this.level.color : 'rgba(255,255,255,0.2)', stroke: i < this.growth ? shade(this.level.color, 0.4) : 'rgba(255,255,255,0.25)', lineWidth: 1.5 });
    }
    // hint under the eyebrow line if active (replaces prompt lines 3)
    if (this.hintT > 0 && this.hintText) {
      const a = clamp(this.hintT, 0, 1);
      g.globalAlpha = a;
      const hw = leftW - 20, hy = py - 44;
      roundRect(g, px + 10, hy, hw, 36, 12, { fill: 'rgba(14,18,40,0.9)', stroke: 'rgba(255,213,74,0.6)', lineWidth: 2 });
      drawText(g, '💡 ' + this.hintText, px + 10 + hw / 2, hy + 18, { font: lf.small, color: '#ffe58a', maxWidth: hw - 20 });
      g.globalAlpha = 1;
    }
    // right: visual or organism card
    const vis = item && item.visual;
    if (vis && (vis.kind === 'chain' || vis.kind === 'web')) this.renderVisual(g, vis, rightX + 10, py + 8, rightW - 20, ph - 16);
    else this.renderOrganismCard(g, rightX, py, rightW, ph);
  }

  renderOrganismCard(g, x, y, w, h) {
    const { cfg } = this;
    const lvl = this.level;
    drawHead(g, { x: x + 46, y: y + h / 2, r: 24, angle: -0.2, style: lvl.sprite, color: lvl.color, t: this.t });
    const tx = x + 88;
    drawText(g, lvl.name, tx, y + 26, { font: this.fonts.big, color: '#fff', align: 'left', maxWidth: w - 100 });
    drawText(g, `${this.stage.name} · ${cfg.labels.stage} ${this.stageIdx + 1}/${cfg.stages.length}`, tx, y + 52, { font: this.fonts.small, color: 'rgba(255,255,255,0.8)', align: 'left', maxWidth: w - 100 });
    if (this.stage.chaser) {
      drawHead(g, { x: w + x - 40, y: y + h - 26, r: 13, angle: Math.PI, style: this.stage.chaser.sprite, color: this.stage.chaser.color, menace: true, t: this.t });
      drawText(g, `${cfg.labels.watchOut} ${this.stage.chaser.name}`, tx, y + h - 24, { font: this.fonts.small, color: '#ffb4b4', align: 'left', maxWidth: w - 150 });
    }
    if (this.shield) drawText(g, '🛡 Shield', x + w - 16, y + 20, { font: this.fonts.small, color: '#8ecae6', align: 'right' });
  }

  /** Draws a { kind: 'chain', nodes, missing } or { kind: 'web', nodes, edges } visual inside the box. */
  renderVisual(g, vis, x, y, w, h) {
    const font = this.fonts.node;
    const nodes = (vis.nodes || []).map(String).slice(0, 8);
    const n = nodes.length;
    if (!n) return;
    const accent = this.stage.accent;
    const box = (cx, cy, bw, bh, label, hot) => {
      roundRect(g, cx - bw / 2, cy - bh / 2, bw, bh, 9, { fill: hot ? '#ffd54a' : 'rgba(255,255,255,0.92)', stroke: hot ? '#fff' : accent, lineWidth: 2 });
      drawText(g, label, cx, cy + 1, { font, color: '#14172b', maxWidth: bw - 12 });
    };
    if (vis.kind === 'chain') {
      const cols = Math.min(n, 2), rows = Math.ceil(n / 2);
      const bw = Math.min(150, (w - 40) / cols), bh = Math.min(30, (h - 8) / rows - 6);
      const pos = [];
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / 2);
        const colIdx = row % 2 === 0 ? i % 2 : 1 - (i % 2);   // zigzag: left->right, then right->left
        const cx = x + w / 2 + (colIdx - 0.5) * (bw + 40);
        const cy = y + 8 + bh / 2 + row * ((h - 16 - bh) / Math.max(1, rows - 1) || 0);
        pos.push([cx, rows === 1 ? y + h / 2 : cy]);
      }
      for (let i = 1; i < n; i++) {
        const [x1, y1] = pos[i - 1], [x2, y2] = pos[i];
        const horiz = y1 === y2;
        const sx = horiz ? x1 + Math.sign(x2 - x1) * (bw / 2 + 2) : x1, sy = horiz ? y1 : y1 + bh / 2 + 2;
        const ex = horiz ? x2 - Math.sign(x2 - x1) * (bw / 2 + 2) : x2, ey = horiz ? y2 : y2 - bh / 2 - 2;
        arrowLine(g, sx, sy, ex, ey, '#ffd54a', 3, 9);
      }
      for (let i = 0; i < n; i++) box(pos[i][0], pos[i][1], bw, bh, nodes[i], vis.missing === i);
      return;
    }
    // web: columns by order (content sorts producers first), two rows
    const cols = n <= 3 ? n : 3;
    const perCol = Math.ceil(n / cols);
    const bw = Math.min(118, (w - 24) / cols - 8), bh = Math.min(28, (h - 10) / perCol - 6);
    const pos = [];
    for (let i = 0; i < n; i++) {
      const col = Math.floor(i / perCol), row = i % perCol;
      const cx = x + 12 + bw / 2 + col * ((w - 24 - bw) / Math.max(1, cols - 1) || 0);
      const cy = perCol === 1 ? y + h / 2 : y + 6 + bh / 2 + row * ((h - 12 - bh) / Math.max(1, perCol - 1)) + (col % 2 ? 0 : 0);
      pos.push([cx, cy]);
    }
    for (const [a, b] of (vis.edges || [])) {
      if (!pos[a] || !pos[b]) continue;
      const [x1, y1] = pos[a], [x2, y2] = pos[b];
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      // leave the box edges
      const sx = x1 + ux * (Math.abs(ux) > Math.abs(uy) ? bw / 2 + 2 : bh / 2 + 2), sy = y1 + uy * (Math.abs(ux) > Math.abs(uy) ? (bw / 2 + 2) : bh / 2 + 2);
      const ex = x2 - ux * (Math.abs(ux) > Math.abs(uy) ? bw / 2 + 3 : bh / 2 + 3), ey = y2 - uy * (Math.abs(ux) > Math.abs(uy) ? (bw / 2 + 3) : bh / 2 + 3);
      arrowLine(g, sx, sy, ex, ey, '#ffd54a', 2.5, 8);
    }
    for (let i = 0; i < n; i++) box(pos[i][0], pos[i][1], bw, bh, nodes[i], false);
  }

  renderPromptFlash(g) {
    const pf = this.promptFlash;
    if (pf.a <= 0.01 || !this.item) return;
    const { ctx } = this;
    const W = ctx.width;
    if (!pf.lines) pf.lines = wrapText(g, this.item.prompt, 760, this.fonts.promptBig).slice(0, 2);
    const h = 30 + pf.lines.length * 34;
    const y = this.gy + 14;
    g.globalAlpha = pf.a;
    roundRect(g, W / 2 - 410, y, 820, h, 18, { fill: 'rgba(10,14,32,0.82)', stroke: hexToRgba(this.stage.accent, 0.7), lineWidth: 2 });
    for (let i = 0; i < pf.lines.length; i++) drawText(g, pf.lines[i], W / 2, y + 24 + i * 34, { font: this.fonts.promptBig, color: '#fff', maxWidth: 780, shadow: true });
    g.globalAlpha = 1;
  }

  renderBanner(g) {
    const b = this.banner;
    const { ctx } = this;
    const W = ctx.width;
    const y = this.gy + this.gh / 2 + b.y;
    g.save();
    g.globalAlpha = clamp(b.a, 0, 1);
    g.translate(W / 2, y);
    g.scale(b.scale, b.scale);
    const w = 620, h = b.sub ? 118 : 86;
    roundRect(g, -w / 2, -h / 2, w, h, 22, { fill: 'rgba(10,14,32,0.85)', stroke: hexToRgba(b.color, 0.8), lineWidth: 3 });
    drawText(g, b.text, 0, b.sub ? -16 : 0, { font: this.fonts.banner, color: b.color, maxWidth: w - 48, shadow: true });
    if (b.sub) drawText(g, b.sub, 0, 30, { font: this.fonts.bannerSub, color: '#fff', maxWidth: w - 48 });
    g.restore();
  }

  renderCard(g) {
    const card = this.card;
    const { ctx, cfg } = this;
    const W = ctx.width, H = ctx.height;
    const item = card.item;
    g.save();
    g.globalAlpha = clamp(card.a, 0, 1);
    g.fillStyle = 'rgba(8,10,24,0.6)';
    g.fillRect(0, 0, W, H);
    const w = 680, h = 380, x = W / 2 - w / 2, y = H / 2 - h / 2;
    roundRect(g, x, y, w, h, 24, { fill: 'rgba(14,18,40,0.96)', stroke: 'rgba(142,202,230,0.8)', lineWidth: 3 });
    drawText(g, `🛡 ${cfg.labels.shieldCard}`, W / 2, y + 34, { font: this.fonts.cardTitle, color: '#8ecae6' });
    drawText(g, cfg.labels.shieldHint, W / 2, y + 64, { font: this.fonts.small, color: 'rgba(255,255,255,0.75)', maxWidth: w - 40 });
    const lines = wrapText(g, item.prompt, w - 60, this.fonts.prompt).slice(0, 2);
    for (let i = 0; i < lines.length; i++) drawText(g, lines[i], W / 2, y + 96 + i * 24, { font: this.fonts.prompt, color: '#fff', maxWidth: w - 60 });
    // current item
    const cur = item.items[Math.min(card.idx, item.items.length - 1)];
    const done = card.idx >= item.items.length;
    roundRect(g, W / 2 - 200, y + 150, 400, 60, 16, { fill: 'rgba(255,255,255,0.95)', stroke: '#ffd54a', lineWidth: 3 });
    drawText(g, done ? '...' : cur.text, W / 2, y + 181, { font: this.fonts.cardItem, color: '#14172b', maxWidth: 360 });
    drawText(g, `${Math.min(card.idx + 1, item.items.length)} / ${item.items.length}`, W / 2 + 200, y + 150, { font: this.fonts.badge, color: '#ffd54a', align: 'right', baseline: 'bottom' });
    // category buttons
    const k = item.categories.length;
    const gap = 14, bw = Math.min(200, (w - 60 - gap * (k - 1)) / k), bh = 60;
    const totalW = k * bw + (k - 1) * gap;
    card.buttons.length = 0;
    const p = ctx.input.pointer;
    for (let i = 0; i < k; i++) {
      const bx = W / 2 - totalW / 2 + i * (bw + gap), by = y + 240;
      card.buttons.push({ x: bx, y: by, w: bw, h: bh });
      const hover = p.active && p.x >= bx && p.x <= bx + bw && p.y >= by && p.y <= by + bh;
      const col = cfg.tilePalette[i % cfg.tilePalette.length];
      roundRect(g, bx, by, bw, bh, 16, { fill: hover ? col : hexToRgba(col, 0.25), stroke: col, lineWidth: 3 });
      roundRect(g, bx + 8, by + 8, 26, 26, 8, { fill: 'rgba(10,14,32,0.8)' });
      drawText(g, String(i + 1), bx + 21, by + 22, { font: this.fonts.badge, color: '#fff' });
      drawText(g, item.categories[i], bx + bw / 2 + 12, by + bh / 2 + 1, { font: this.fonts.big, color: hover ? '#14172b' : '#fff', maxWidth: bw - 50 });
    }
    // picks so far
    const picked = card.chosen.map((c, i) => `${item.items[i].text} → ${c}`).join('   ·   ');
    if (picked) drawText(g, picked, W / 2, y + h - 40, { font: this.fonts.small, color: 'rgba(255,255,255,0.7)', maxWidth: w - 40 });
    drawText(g, `Press 1-${k} or tap`, W / 2, y + h - 16, { font: this.fonts.badge, color: 'rgba(255,255,255,0.5)' });
    g.restore();
  }
}
