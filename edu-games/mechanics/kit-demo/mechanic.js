// mechanics/kit-demo/mechanic.js
// "Bubble Pop": the reference mechanic. Answer bubbles float up; pop the one that answers the prompt.
// Small but complete, and it deliberately exercises every kit API: all SFX names, music tracks,
// tweens, particles, floating text, screen shake, every HUD key, overlay question/feedback/hint/toast,
// adaptive difficulty, progress and speech. Content-agnostic: it only sees items from ctx.nextItem().
import { drawText, roundRect, clamp, hexToRgba, shade, Easing } from '../../kit/kit.js';

export const meta = {
  id: 'kit-demo',
  name: 'Bubble Pop',
  description: 'Answer bubbles rise from the bottom; tap, click or key the bubble that answers the prompt before it floats away.',
  itemTypes: ['choice', 'numeric', 'text'],
  choices: 4,
  configSchema: {
    duration: 'Round length in seconds (60)',
    lives: 'Lives at the start (3)',
    bubbles: 'Answer bubbles per prompt, 3 or 4 (4)',
    baseSpeed: 'Bubble rise speed in logical px/s at stage 1 (58)',
    speedStep: 'Speed multiplier added after every correct pop (0.035)',
    stageSpeed: 'Speed multiplier added at each new stage (0.3)',
    questionEvery: 'Every Nth item is asked in the DOM question panel with a numeric/text item (5)',
    questionTime: 'Seconds allowed for a panel question (20)',
    promptLabel: 'Small caption above the prompt ("Pop the bubble that shows")',
    palette: 'Bubble colours, array of hex strings (4 pastel tones)',
    sky: 'Background per stage: array of [top, bottom] hex pairs (3 entries)',
    lifeBonusXP: 'Bonus XP per remaining life at the end (15)',
  },
};

export const defaultConfig = {
  duration: 60,
  lives: 3,
  bubbles: 4,
  baseSpeed: 58,
  speedStep: 0.035,
  stageSpeed: 0.3,
  questionEvery: 5,
  questionTime: 20,
  promptLabel: 'Pop the bubble that shows',
  palette: ['#5b8cff', '#ff6fa6', '#3ad29f', '#ffb347'],
  sky: [['#1d2b64', '#3f6fd8'], ['#2a1f62', '#7a4fcf'], ['#3b0f3f', '#d9485f']],
  lifeBonusXP: 15,
};

const CEILING = 165;        // bubbles that cross this line have escaped
const PROMPT_TOP = 72;
const PROMPT_H = 72;
const BUBBLE_FONT = '900 34px Nunito, "Segoe UI", system-ui, sans-serif';
const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];
const NUMPAD = ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'];

export class Mechanic {
  constructor(ctx) {
    this.ctx = ctx;
    this.cfg = { ...defaultConfig, ...ctx.config };
    this.cfg.bubbles = clamp(Math.round(this.cfg.bubbles) || 4, 2, 4);
  }

  // ---------- lifecycle ----------
  init() {
    const { ctx, cfg } = this;
    const skills = ctx.content.skills || {};
    this.choiceSkills = Object.keys(skills).filter(s => (skills[s].types || ['choice']).includes('choice'));
    this.panelSkills = Object.keys(skills).filter(s => (skills[s].types || []).some(t => t === 'numeric' || t === 'text'));
    if (!this.choiceSkills.length) throw new Error('Bubble Pop needs a content pack with at least one skill of type "choice"');

    this.t = 0;
    this.stage = 1;
    this.speedMul = 1;
    this.lives = cfg.lives;
    this.popped = 0;
    this.correct = 0;
    this.total = 0;
    this.round = 0;
    this.busy = false;
    this.ended = false;
    this.cooldown = 0;
    this.cursor = 0;
    this.cursorVisible = false;
    this.item = null;
    this.bubbles = [];
    this.roundStart = 0;
    this.lastTimer = -1;
    this.lastBuzz = -1;
    this.skyMix = { v: 0 };
    this.skyFrom = 0;
    this.lowPulse = 0;
    this._grads = {};
    this.unsubs = [];

    // decorative background bubbles (deterministic from the run seed)
    this.deco = [];
    for (let i = 0; i < 16; i++) {
      this.deco.push({ x: ctx.rng.float(0, ctx.width), y: ctx.rng.float(0, ctx.height), r: ctx.rng.float(6, 26), v: ctx.rng.float(8, 26), a: ctx.rng.float(0.05, 0.16) });
    }

    ctx.hud.set({ score: 0, streak: 0, lives: this.lives, maxLives: cfg.lives, timer: cfg.duration, level: 1, levelLabel: 'Stage 1/3', progress: 0, combo: 0 });
    if (ctx.input.isTouchDevice) {
      ctx.input.addTouchButton({ id: 'left', x: 24, y: 468, w: 92, h: 56, label: '◀', code: 'ArrowLeft' });
      ctx.input.addTouchButton({ id: 'right', x: 128, y: 468, w: 92, h: 56, label: '▶', code: 'ArrowRight' });
      ctx.input.addTouchButton({ id: 'select', x: ctx.width - 24 - 120, y: 468, w: 120, h: 56, label: 'Pop', code: 'Enter' });
    }
    this.unsubs.push(ctx.on('answer', d => { this.total++; if (d.correct) this.correct++; }));
    this.unsubs.push(ctx.on('pause', () => ctx.audio.music.setIntensity(0.15)));
    this.unsubs.push(ctx.on('resume', () => ctx.audio.music.setIntensity(this.stage === 3 ? 0.9 : 0.35 + 0.2 * this.stage)));
    this.unsubs.push(ctx.input.onSwipe(dir => {
      if (this.busy || this.ended || !this.bubbles.length) return;
      if (dir === 'left') this.moveCursor(-1); else if (dir === 'right') this.moveCursor(1);
    }));
    ctx.audio.music.start('calm');
    ctx.audio.music.setIntensity(0.55);
    ctx.overlay.toast('Pop the right bubble!', { type: 'info', duration: 1.6 });
    this.nextRound();
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
    this.bubbles.length = 0;
  }

  // ---------- rounds ----------
  pickSkill(allowed) {
    const { adaptive, rng } = this.ctx;
    for (let i = 0; i < 4; i++) {
      const s = adaptive.nextSkill();
      if (allowed.includes(s)) return s;
    }
    return rng.pick(allowed);
  }

  nextRound() {
    if (this.ended) return;
    const { ctx, cfg } = this;
    this.round++;
    if (this.panelSkills.length && this.round % cfg.questionEvery === 0) { this.panelRound(); return; }
    const skill = this.pickSkill(this.choiceSkills);
    const item = ctx.nextItem({ skill, type: 'choice', choices: cfg.bubbles });
    if (item.type !== 'choice') throw new Error('Bubble Pop: content returned a non-choice item for a bubble round');
    this.item = item;
    this.roundStart = performance.now();
    if (ctx.adaptive.needsHint(item.skill) && item.hint) ctx.overlay.showHint(item.hint);
    if (ctx.gradeBand === 'early') ctx.speak(item.speech || item.prompt);

    const n = item.choices.length;
    const laneW = ctx.width / n;
    const r = n <= 3 ? 64 : 58;
    this.bubbles.length = 0;
    const order = ctx.rng.shuffle(item.choices.map((_, i) => i));
    for (let k = 0; k < n; k++) {
      const i = order[k];
      const b = {
        x: laneW * (k + 0.5) + ctx.rng.float(-laneW * 0.14, laneW * 0.14),
        y: ctx.height + r + 20 + k * ctx.rng.float(30, 90),
        r, vy: -cfg.baseSpeed * this.speedMul * ctx.rng.float(0.88, 1.18),
        label: item.choices[i], index: i, color: cfg.palette[i % cfg.palette.length],
        phase: ctx.rng.float(0, Math.PI * 2), scale: 0, alive: true, flash: 0, key: k + 1,
      };
      this.bubbles.push(b);
      ctx.tweens.add(b, { scale: 1 }, 0.5, { ease: Easing.easeOutBack, delay: k * 0.06 });
    }
    this.cursor = 0;
    ctx.audio.play('jump', { volume: 0.6 });
    ctx.audio.play('whoosh', { volume: 0.5 });
  }

  async panelRound() {
    const { ctx } = this;
    this.busy = true;
    this.bubbles.length = 0;
    const skill = this.pickSkill(this.panelSkills);
    const types = (ctx.content.skills[skill].types || []).filter(t => t === 'numeric' || t === 'text');
    const item = ctx.nextItem({ skill, type: ctx.rng.pick(types) });
    this.item = item;
    if (ctx.gradeBand === 'early') ctx.speak(item.speech || item.prompt);
    const res = await ctx.overlay.showQuestion(item, { timeLimit: this.cfg.questionTime, allowHint: !!item.hint });
    if (this.ended) return;
    const graded = ctx.answer(item, res.chosen, { responseMs: res.responseMs });
    if (graded.correct) {
      ctx.audio.play('coin');
      const pts = 100 * item.difficulty;
      ctx.addScore(pts, { x: ctx.width / 2, y: 250, label: `+${pts} bonus` });
      this.burst(ctx.width / 2, 300, '#ffd54a', 1.4);
      ctx.hud.set({ combo: ctx.streak >= 2 ? ctx.streak : 0 });
      await ctx.feedback(item, res.chosen, true, { blocking: false, duration: 1.1 });
    } else {
      this.loseLife();
      ctx.hud.set({ combo: 0 });
      await ctx.feedback(item, res.chosen, false, { blocking: true });
    }
    if (this.ended) return;
    this.cooldown = 0.3;
    this.busy = false;
    if (this.lives <= 0) this.finish('lives'); else this.nextRound();
  }

  // ---------- answering ----------
  pick(b) {
    if (!b || !b.alive || this.busy || this.ended) return;
    this.busy = true;
    const responseMs = Math.round(performance.now() - this.roundStart);
    const res = this.ctx.answer(this.item, b.index, { responseMs });
    if (res.correct) this.onCorrect(b, responseMs); else this.onWrong(b, false);
  }
  pickIndex(k) { this.pick(this.bubbles.find(b => b.alive && b.key === k + 1)); }

  onCorrect(b, responseMs) {
    const { ctx, cfg } = this;
    this.popped++;
    const speedBonus = clamp(Math.round((4500 - responseMs) / 150), 0, 30);
    let pts = 40 + 20 * this.item.difficulty + speedBonus;
    if (ctx.streak >= 5) pts *= 2;
    pts = Math.round(pts / 5) * 5;
    ctx.audio.play('pop', { pitch: 1 + Math.min(0.5, ctx.streak * 0.05) });
    this.burst(b.x, b.y, b.color, 1);
    ctx.addScore(pts, { x: b.x, y: b.y - 30 });
    ctx.floatingText.add(ctx.streak >= 5 ? 'x2!' : 'Nice!', b.x, b.y + 24, { color: '#fff', size: 20, duration: 0.8, vy: -40 });
    b.alive = false;
    ctx.tweens.killTarget(b);
    let swept = false;
    for (const o of this.bubbles) {
      if (!o.alive) continue;
      swept = true;
      ctx.tweens.add(o, { scale: 0, y: o.y - 50 }, 0.32, { ease: Easing.easeInQuad, onComplete: () => { o.alive = false; } });
    }
    if (swept) ctx.audio.play('swoosh', { volume: 0.5 });
    this.speedMul += cfg.speedStep;
    const streak = ctx.streak;
    ctx.hud.set({ combo: streak >= 2 ? streak : 0 });
    if (streak === 5) {
      ctx.audio.play('powerup');
      ctx.overlay.toast('Streak of 5: double XP!', { type: 'good', duration: 1.8 });
      ctx.shake.shake(4, 0.2);
    } else if (streak >= 3 && streak % 3 === 0) {
      ctx.audio.play('combo');
      ctx.overlay.toast(`${streak} in a row!`, { type: 'good', duration: 1.2 });
    }
    ctx.tweens.delay(0.5, () => { this.busy = false; this.nextRound(); });
  }

  async onWrong(b, escaped) {
    const { ctx } = this;
    const item = this.item;
    if (escaped) {
      ctx.audio.play('explode', { volume: 0.7 });
      ctx.particles.burst({ x: b.x, y: CEILING, count: this.n(18), colors: ['#fff', b.color], speed: 180, life: 0.6, size: 6, gravity: 400 });
      ctx.floatingText.add('Escaped!', b.x, CEILING + 20, { color: '#ff8a8a', size: 24 });
    } else {
      ctx.audio.play('hit');
      b.flash = 1;
      ctx.tweens.add(b, { flash: 0 }, 0.5);
      ctx.floatingText.add('Oops', b.x, b.y - 30, { color: '#ff8a8a', size: 24 });
    }
    ctx.shake.shake(10, 0.35);
    this.loseLife();
    ctx.hud.set({ combo: 0 });
    for (const o of this.bubbles) if (o !== b) o.vy *= 0.25;
    await ctx.feedback(item, escaped ? null : b.index, false, { blocking: true });
    if (this.ended) return;
    for (const o of this.bubbles) { o.alive = false; ctx.tweens.killTarget(o); }
    ctx.audio.play('whoosh', { volume: 0.4 });
    this.cooldown = 0.3;
    this.busy = false;
    if (this.lives <= 0) this.finish('lives'); else this.nextRound();
  }

  onEscape(b) {
    if (this.busy || this.ended) return;
    this.busy = true;
    this.ctx.answer(this.item, null, { responseMs: Math.round(performance.now() - this.roundStart) });
    this.onWrong(b, true);
  }

  loseLife() {
    this.lives = Math.max(0, this.lives - 1);
    this.ctx.hud.set({ lives: this.lives });
    this.ctx.hud.flash('lives', '#ff5d7a');
    this.ctx.hud.pulse('lives');
  }

  moveCursor(dir) {
    const alive = this.bubbles.filter(b => b.alive);
    if (!alive.length) return;
    this.cursorVisible = true;
    this.cursor = (this.cursor + dir + this.bubbles.length) % this.bubbles.length;
    let guard = 0;
    while (!this.bubbles[this.cursor].alive && guard++ < 8) this.cursor = (this.cursor + dir + this.bubbles.length) % this.bubbles.length;
    this.ctx.audio.play('tick');
  }

  n(count) { return this.ctx.reducedMotion ? Math.ceil(count / 2) : count; }
  burst(x, y, color, k) {
    const p = this.ctx.particles;
    p.burst({ x, y, count: this.n(Math.round(26 * k)), colors: [color, '#ffffff', shade(color, 0.45)], speed: 280 * k, life: 0.75, size: 9, gravity: 320, friction: 0.92 });
    p.burst({ x, y, count: this.n(Math.round(8 * k)), colors: ['#ffd54a', '#fff'], speed: 200 * k, life: 0.9, size: 12, gravity: 200, shape: 'star' });
    p.burst({ x, y, count: this.n(Math.round(10 * k)), colors: [color], speed: 420 * k, life: 0.35, size: 6, shape: 'spark', friction: 0.85 });
  }

  // ---------- stages + end ----------
  onStage(s) {
    const { ctx } = this;
    this.skyFrom = this.stage - 1;
    this.stage = s;
    this.skyMix.v = 0;
    ctx.tweens.add(this.skyMix, { v: 1 }, 1.2);
    this.speedMul += this.cfg.stageSpeed;
    ctx.hud.set({ level: s, levelLabel: `Stage ${s}/3` });
    ctx.hud.pulse('level');
    ctx.audio.play('levelup');
    ctx.shake.shake(6, 0.25);
    ctx.particles.burst({ x: ctx.width / 2, y: 120, count: this.n(40), colors: ['#ffd54a', '#fff', '#8fb0ff'], speed: 320, life: 1, size: 8, gravity: 260, shape: 'square' });
    if (s === 3) {
      ctx.audio.music.start('tense');
      ctx.audio.music.setIntensity(0.9);
      ctx.audio.play('fanfare', { volume: 0.7 });
      ctx.overlay.toast('Final stage! Bubbles are fast now!', { type: 'bad', duration: 2 });
      ctx.floatingText.add('FINAL STAGE', ctx.width / 2, 300, { color: '#ffd54a', size: 44, duration: 1.6, vy: -20 });
    } else {
      ctx.audio.music.setIntensity(0.35 + 0.2 * s);
      ctx.overlay.toast(`Stage ${s}! Faster bubbles.`, { type: 'info', duration: 1.6 });
      ctx.floatingText.add(`STAGE ${s}`, ctx.width / 2, 300, { color: '#fff', size: 40, duration: 1.4, vy: -20 });
    }
  }

  finish(reason) {
    if (this.ended) return;
    this.ended = true;
    this.busy = true;
    const { ctx, cfg } = this;
    ctx.overlay.hideHint();
    if (reason === 'time') ctx.floatingText.add("Time's up!", ctx.width / 2, 300, { color: '#fff', size: 44, duration: 1 });
    ctx.endGame({
      score: ctx.score, correct: this.correct, total: this.total, bonusXP: this.lives * cfg.lifeBonusXP,
      stats: [
        { label: 'Bubbles popped', value: this.popped },
        { label: 'Stage reached', value: `${this.stage}/3` },
        { label: 'Lives left', value: this.lives },
      ],
    });
  }

  // ---------- frame ----------
  update(dt) {
    if (this.ended) return;
    const { ctx, cfg, input } = this;
    const inp = ctx.input;
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (const d of this.deco) { d.y -= d.v * dt; if (d.y < -d.r) { d.y = ctx.height + d.r; } }
    if (!this.busy) {
      this.t += dt;
      const remaining = Math.max(0, Math.ceil(cfg.duration - this.t));
      if (remaining !== this.lastTimer) {
        this.lastTimer = remaining;
        ctx.hud.set({ timer: remaining });
        if (remaining <= 5 && remaining > 0 && remaining !== this.lastBuzz) {
          this.lastBuzz = remaining;
          ctx.audio.play('buzz', { volume: 0.6 });
          ctx.hud.flash('timer', '#ff6b6b');
          ctx.hud.pulse('timer');
        }
      }
      ctx.hud.set({ progress: clamp(this.t / cfg.duration, 0, 1) });
      const stage = Math.min(3, Math.floor(this.t / (cfg.duration / 3)) + 1);
      if (stage !== this.stage) this.onStage(stage);
      if (this.t >= cfg.duration) { this.finish('time'); return; }
    }
    this.lowPulse += dt * 6;
    if (this.busy) return;

    // bubbles
    const time = ctx.engine.time.elapsed;
    for (const b of this.bubbles) {
      if (!b.alive) continue;
      b.y += b.vy * dt;
      b.x += Math.sin(time * 1.7 + b.phase) * 22 * dt;
      b.x = clamp(b.x, b.r + 6, ctx.width - b.r - 6);
      if (b.y + b.r * 0.6 < CEILING) {
        if (b.index === this.item.correct) { this.onEscape(b); return; }
        b.alive = false;
      }
    }
    if (this.cooldown > 0) return;

    // keyboard
    for (let k = 0; k < 4; k++) if (inp.wasPressed(DIGITS[k]) || inp.wasPressed(NUMPAD[k])) { this.pickIndex(k); return; }
    if (inp.wasPressed('ArrowLeft') || inp.wasPressed('KeyA')) this.moveCursor(-1);
    if (inp.wasPressed('ArrowRight') || inp.wasPressed('KeyD')) this.moveCursor(1);
    if (inp.wasPressed('Enter') || inp.wasPressed('Space') || inp.wasPressed('NumpadEnter')) {
      this.cursorVisible = true;
      ctx.audio.play('click');
      const b = this.bubbles[this.cursor];
      if (b && b.alive) { this.pick(b); return; }
    }
    // pointer
    if (inp.pointer.justDown) {
      const p = inp.pointer;
      for (const b of this.bubbles) {
        if (!b.alive) continue;
        const dx = p.x - b.x, dy = p.y - b.y;
        if (dx * dx + dy * dy <= (b.r * 1.15) * (b.r * 1.15)) { this.pick(b); return; }
      }
    }
    void input;
  }

  _sky(g, idx) {
    const key = 's' + idx;
    if (!this._grads[key]) {
      const [top, bottom] = this.cfg.sky[Math.min(idx, this.cfg.sky.length - 1)];
      const gr = g.createLinearGradient(0, 0, 0, this.ctx.height);
      gr.addColorStop(0, top); gr.addColorStop(1, bottom);
      this._grads[key] = gr;
    }
    return this._grads[key];
  }
  _bubbleGrad(g, color) {
    const key = 'b' + color;
    if (!this._grads[key]) {
      const gr = g.createRadialGradient(-0.35, -0.4, 0.05, 0, 0, 1);
      gr.addColorStop(0, shade(color, 0.55));
      gr.addColorStop(0.55, color);
      gr.addColorStop(1, shade(color, -0.35));
      this._grads[key] = gr;
    }
    return this._grads[key];
  }

  render(g) {
    const { ctx, cfg } = this;
    const W = ctx.width, H = ctx.height;
    // sky with crossfade between stages
    g.fillStyle = this._sky(g, this.stage - 1);
    g.fillRect(0, 0, W, H);
    if (this.skyMix.v < 1 && this.stage > 1) {
      g.globalAlpha = 1 - this.skyMix.v;
      g.fillStyle = this._sky(g, this.skyFrom);
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    // decorative bubbles
    for (const d of this.deco) {
      g.globalAlpha = d.a;
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(d.x, d.y, d.r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    // surface line
    g.save();
    g.setLineDash([10, 10]);
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(24, CEILING); g.lineTo(W - 24, CEILING); g.stroke();
    g.restore();
    drawText(g, 'surface', W - 30, CEILING - 12, { font: '700 16px Nunito, "Segoe UI", system-ui, sans-serif', color: 'rgba(255,255,255,0.5)', align: 'right' });

    // low-time vignette
    if (this.lastTimer >= 0 && this.lastTimer <= 5 && !this.busy) {
      g.fillStyle = `rgba(255,60,60,${0.06 + 0.06 * Math.sin(this.lowPulse)})`;
      g.fillRect(0, 0, W, H);
    }

    // prompt pill
    if (this.item && this.item.type === 'choice') {
      const pw = Math.min(W - 80, 640);
      const px = (W - pw) / 2;
      roundRect(g, px, PROMPT_TOP, pw, PROMPT_H, 24, { fill: 'rgba(10,14,32,0.55)', stroke: 'rgba(255,255,255,0.25)', lineWidth: 2 });
      drawText(g, cfg.promptLabel, W / 2, PROMPT_TOP + 18, { font: '700 16px Nunito, "Segoe UI", system-ui, sans-serif', color: 'rgba(255,255,255,0.7)' });
      drawText(g, this.item.prompt, W / 2, PROMPT_TOP + 46, { font: '900 36px Nunito, "Segoe UI", system-ui, sans-serif', color: '#fff', maxWidth: pw - 48, shadow: true });
    }

    // bubbles
    for (const b of this.bubbles) {
      if (!b.alive || b.scale <= 0.01) continue;
      g.save();
      g.translate(b.x, b.y);
      const s = b.r * b.scale;
      g.save();
      g.scale(s, s);
      g.fillStyle = this._bubbleGrad(g, b.color);
      g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill();
      g.restore();
      // rim + highlight
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, s, 0, Math.PI * 2); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath(); g.ellipse(-s * 0.35, -s * 0.45, s * 0.22, s * 0.13, -0.6, 0, Math.PI * 2); g.fill();
      if (b.flash > 0) {
        g.fillStyle = hexToRgba('#ef4444', b.flash * 0.75);
        g.beginPath(); g.arc(0, 0, s, 0, Math.PI * 2); g.fill();
      }
      // label
      drawText(g, b.label, 0, 2, { font: BUBBLE_FONT, color: '#fff', maxWidth: s * 1.5, stroke: 'rgba(10,14,32,0.65)', strokeWidth: 5 });
      // key badge
      roundRect(g, -s - 4, -s - 4, 28, 28, 9, { fill: 'rgba(10,14,32,0.7)', stroke: 'rgba(255,255,255,0.5)', lineWidth: 1.5 });
      drawText(g, String(b.key), -s + 10, -s + 11, { font: '800 17px Nunito, "Segoe UI", system-ui, sans-serif', color: '#fff' });
      // keyboard cursor
      if (this.cursorVisible && this.bubbles[this.cursor] === b) {
        g.save();
        g.setLineDash([8, 6]);
        g.lineDashOffset = -ctx.engine.time.elapsed * 40;
        g.strokeStyle = '#ffd54a';
        g.lineWidth = 4;
        g.beginPath(); g.arc(0, 0, s + 10, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
      g.restore();
    }
  }
}
