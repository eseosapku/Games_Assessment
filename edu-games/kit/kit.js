// kit/kit.js
// Barrel for every kit module + createGame(), the shell that wires a Mechanic, a ContentPack and a
// config into a playable game (ARCHITECTURE.md sections 3.1, 3.2 and 9).
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { Tweens, Easing } from './core/tween.js';
import { Particles, FloatingText, ScreenShake } from './core/particles.js';
import { RNG, clamp, lerp, inverseLerp, dist, angleTo, wrap, smoothstep, roundRect, drawText, wrapText, measureText, formatTime, hexToRgba, shade } from './core/utils.js';
import { HUD } from './ui/hud.js';
import { Overlay, renderVisual } from './ui/overlay.js';
import { Adaptive } from './learn/adaptive.js';
import { Progress } from './learn/progress.js';
import * as Content from './learn/content.js';

export { Engine, Input, Audio, Tweens, Easing, Particles, FloatingText, ScreenShake,
  RNG, clamp, lerp, inverseLerp, dist, angleTo, wrap, smoothstep, roundRect, drawText, wrapText, measureText, formatTime, hexToRgba, shade,
  HUD, Overlay, renderVisual, Adaptive, Progress, Content };

export const SUBJECT_COLORS = {
  math: '#4F7CFF', science: '#22C55E', ela: '#F59E0B', social: '#EF4444', cs: '#8B5CF6', languages: '#EC4899', arts: '#14B8A6',
};
const BAND_BY_GRADE = g => (g <= 2 ? 'early' : g <= 5 ? 'elementary' : g <= 8 ? 'middle' : 'high');

function ensureTheme() {
  if (document.querySelector('link[data-eg-theme], link[href*="theme.css"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./ui/theme.css', import.meta.url).href;
  link.dataset.egTheme = '1';
  document.head.appendChild(link);
}
function luminance(hex) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return 0;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Builds the canvas + DOM overlay inside `container`, constructs every kit system, shows the start screen
 * and runs the Mechanic. Returns a handle: { ctx, destroy(), restart(), pause(), resume(), state() }.
 */
export async function createGame({ container, manifest, Mechanic, content, config = {}, seed } = {}) {
  if (!container) throw new Error('createGame: container is required');
  if (!manifest) throw new Error('createGame: manifest is required');
  if (typeof Mechanic !== 'function') throw new Error('createGame: Mechanic class is required');
  if (!content || typeof content.generate !== 'function') throw new Error('createGame: content pack with generate() is required');

  ensureTheme();
  const gameId = manifest.id || 'game';
  const accent = config.accent || SUBJECT_COLORS[manifest.subject] || '#4F7CFF';
  container.style.setProperty('--eg-accent', accent);
  container.style.setProperty('--eg-accent-text', luminance(accent) > 0.62 ? '#161a33' : '#ffffff');
  if (config.theme === 'light' || config.theme === 'dark') container.dataset.theme = config.theme;

  const engine = new Engine({ container });
  engine.canvas.setAttribute('aria-label', manifest.title || gameId);
  const input = new Input(engine);
  const audio = new Audio();
  const tweens = new Tweens();
  const particles = new Particles();
  const floatingText = new FloatingText();
  const shake = new ScreenShake();
  engine.attach({ input, tweens, particles, floatingText, shake });
  const hud = new HUD(engine.layer);
  const overlay = new Overlay(engine.overlayRoot, { engine, audio, layer: engine.layer });

  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  shake.enabled = !reducedMotion;
  const gradeBand = manifest.gradeBand || BAND_BY_GRADE((manifest.grades && manifest.grades[0]) || 3);

  const contentSkills = Object.keys(content.skills || {});
  const skillIds = (Array.isArray(manifest.skills) ? manifest.skills.filter(s => contentSkills.includes(s)) : []);
  const skills = skillIds.length ? skillIds : contentSkills;
  if (!skills.length) throw new Error('createGame: content pack declares no skills');
  const skillName = id => (content.skills[id] && content.skills[id].name) || id;

  // ---- run state ----
  let phase = 'start';
  let runSeed = seed === undefined ? Date.now() : seed;
  let mechanic = null;
  let run = null;        // per-run stats
  const listeners = { answer: new Set() };
  let destroyed = false;

  const setPhase = p => { phase = p; container.dataset.egPhase = p; input.capture = p === 'playing'; };
  setPhase('start');

  // ---- speech ----
  let lastSpeak = 0;
  const speak = text => {
    try {
      if (!('speechSynthesis' in window) || !text || audio.muted) return;
      const now = performance.now();
      if (now - lastSpeak < 300) return;
      lastSpeak = now;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text));
      u.rate = 0.95;
      u.lang = (manifest.lang) || document.documentElement.lang || 'en-US';
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  };

  // ---- ctx ----
  const ctx = {
    engine, input, audio, tweens, particles, floatingText, shake, hud, overlay, progress: Progress,
    adaptive: null, content, rng: null, manifest, config,
    width: engine.width, height: engine.height,
    reducedMotion, gradeBand,
    score: 0, streak: 0, seed: runSeed,
    speak,
    nextItem(opts = {}) {
      const adaptive = ctx.adaptive;
      const skill = opts.skill || adaptive.nextSkill();
      const def = content.skills[skill] || {};
      const types = def.types || ['choice'];
      let type = opts.type || types[0];
      if (!types.includes(type)) type = types[0];
      const difficulty = opts.difficulty ?? adaptive.difficultyFor(skill);
      const choices = opts.choices ?? 4;
      let it = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        it = content.generate(ctx.rng, { skill, difficulty, type, choices });
        if (!it) throw new Error(`content.generate returned nothing for ${skill} ${type} d${difficulty}`);
        if (attempt >= 5 || String(it.prompt) !== run.lastPrompt) break;
      }
      run.lastPrompt = String(it.prompt);
      run.turn++;
      return it;
    },
    answer(it, chosen, { responseMs = 0 } = {}) {
      const correct = Content.grade(it, chosen);
      run.total++;
      let xp = 0;
      let leveledUp = false;
      if (correct) {
        run.correct++;
        ctx.streak++;
        run.bestStreak = Math.max(run.bestStreak, ctx.streak);
        xp = ctx.xpForCorrect(it);
        const r = Progress.addXP(xp, { gameId, skill: it.skill });
        run.xpEarned += xp;
        leveledUp = r.leveledUp;
        if (leveledUp) run.leveledUp = true;
      } else {
        ctx.streak = 0;
      }
      ctx.adaptive.record(it.skill, correct, responseMs);
      Progress.recordAttempt({ gameId, skill: it.skill, correct, difficulty: it.difficulty, responseMs });
      hud.set({ streak: ctx.streak });
      if (correct) hud.pulse('streak');
      const detail = { gameId, skill: it.skill, type: it.type, difficulty: it.difficulty, correct, chosen, responseMs, xp, streak: ctx.streak, prompt: it.prompt };
      Progress.emit('answer', detail);
      audio.play(correct ? 'correct' : 'wrong');
      for (const fn of Array.from(listeners.answer)) { try { fn(detail); } catch (e) { console.error(e); } }
      return { correct, explanation: it.explanation, correctText: Content.correctText(it), hint: it.hint, xp, leveledUp };
    },
    feedback(it, chosen, correct, { blocking = !correct, duration } = {}) {
      return overlay.showFeedback(it, chosen, correct, { blocking, duration });
    },
    endGame(results = {}) { return endGame(results); },
    addScore(n, { x, y, label } = {}) {
      ctx.score = Math.max(0, Math.round(ctx.score + (Number(n) || 0)));
      hud.set({ score: ctx.score });
      hud.pulse('score');
      if (x !== undefined && y !== undefined) floatingText.add(label ?? (n >= 0 ? '+' + n : String(n)), x, y, { color: n >= 0 ? '#ffd54a' : '#ff6b6b', size: 28 });
      return ctx.score;
    },
    on(event, fn) {
      if (event === 'answer') { listeners.answer.add(fn); return () => listeners.answer.delete(fn); }
      if (event === 'pause' || event === 'resume' || event === 'resize') return engine.on(event, fn);
      throw new Error('ctx.on: unknown event ' + event);
    },
    xpForCorrect(it) {
      const base = 10 * Math.max(1, Math.round(Number(it && it.difficulty) || 1));
      return ctx.streak >= 5 ? base * 2 : base;
    },
  };

  // ---- run lifecycle ----
  function newRun() {
    run = { correct: 0, total: 0, xpEarned: 0, bestStreak: 0, leveledUp: false, lastPrompt: null, turn: 0, startedAt: Date.now(), masteryBefore: {} };
    for (const s of skills) run.masteryBefore[s] = Progress.mastery(s);
  }
  function teardownMechanic() {
    if (mechanic) { try { mechanic.destroy && mechanic.destroy(); } catch (e) { console.error(e); } }
    mechanic = null;
    while (engine.scenes.length) engine.pop();
    tweens.killAll();
    particles.clear();
    floatingText.clear();
    input.clearTouchButtons();
    overlay.hideAll();
    hud.reset();
    audio.music.stop();
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }
  function startRun() {
    if (destroyed) return;
    newRun();
    ctx.seed = runSeed;
    ctx.rng = new RNG(runSeed);
    ctx.adaptive = new Adaptive({ skills, rng: ctx.rng, ...(config.adaptive || {}) });
    ctx.score = 0;
    ctx.streak = 0;
    hud.reset();
    hud.show();
    audio.unlock();
    mechanic = new Mechanic(ctx);
    engine.replace(mechanic);
    engine.resume();
    setPhase('playing');
    try { mechanic.init(); } catch (e) { setPhase('start'); teardownMechanic(); throw e; }
    engine.start();
    Progress.emit('start', { gameId, seed: runSeed, skills });
  }
  async function showStartScreen() {
    if (destroyed) return;
    setPhase('start');
    const g = manifest.grades || [];
    await overlay.showStart({
      title: manifest.title || gameId,
      tagline: manifest.tagline,
      howToPlay: manifest.howToPlay || [],
      skills: skills.map(skillName),
      controls: manifest.controls || [],
      gradeLabel: g.length ? (g[0] === g[1] || g.length === 1 ? `Grade ${g[0]}` : `Grades ${g[0]}-${g[g.length - 1]}`) : undefined,
    });
    if (destroyed) return;
    startRun();
  }
  async function endGame(results) {
    if (phase !== 'playing' && phase !== 'paused') return;
    setPhase('ended');
    overlay.hideAll();          // closes any panel first so its engine-resume cannot undo the pause below
    if (engine.paused) engine.resume();
    engine.pause('ended');
    const score = Math.round(Number(results.score ?? ctx.score) || 0);
    ctx.score = score;
    const correct = Number(results.correct ?? run.correct) || 0;
    const total = Number(results.total ?? run.total) || 0;
    const bonusXP = Math.max(0, Math.round(Number(results.bonusXP) || 0));
    Progress.recordPlay(gameId);
    const isNewBest = Progress.setBestScore(gameId, score);
    if (bonusXP > 0) { const r = Progress.addXP(bonusXP, { gameId }); run.xpEarned += bonusXP; if (r.leveledUp) run.leveledUp = true; }
    const info = Progress.levelInfo();
    const mastery = skills.map(s => ({ skill: s, name: skillName(s), before: run.masteryBefore[s], after: Progress.mastery(s) }));
    const stats = Array.isArray(results.stats) ? results.stats.slice() : [];
    if (run.bestStreak > 0 && !stats.some(s => /streak/i.test(s.label))) stats.push({ label: 'Best streak', value: run.bestStreak });
    const durationMs = Date.now() - run.startedAt;
    Progress.emit('end', { gameId, score, correct, total, accuracy: total ? correct / total : 0, xpEarned: run.xpEarned, level: info.level, leveledUp: run.leveledUp, durationMs, seed: runSeed, mastery });
    audio.music.stop();
    audio.play('fanfare');
    const choice = await overlay.showEnd({
      title: results.title, score, bestScore: Progress.gameStats(gameId).bestScore, correct, total,
      xpEarned: run.xpEarned, level: info.level, leveledUp: run.leveledUp, levelProgress: info.levelProgress, xpToNext: info.xpToNext,
      isNewBest, mastery, stats,
    });
    if (destroyed) return;
    if (choice === 'replay') {
      teardownMechanic();
      runSeed = (Number(runSeed) || 0) + 1;
      startRun();
    } else {
      Progress.emit('exit', { gameId, score, from: 'end' });
      teardownMechanic();
      showStartScreen();
    }
  }
  async function doPause() {
    if (phase !== 'playing' || overlay.busy > 0) return;
    setPhase('paused');
    engine.pause('user');
    const r = await overlay.showPause();
    if (destroyed) return;
    if (r === 'resume') {
      setPhase('playing');
      engine.resume();
    } else if (r === 'restart') {
      teardownMechanic();
      startRun();
    } else {
      Progress.emit('exit', { gameId, score: ctx.score, from: 'pause' });
      teardownMechanic();
      showStartScreen();
    }
  }
  const offKey = input.onKeyDown(code => { if ((code === 'Escape' || code === 'KeyP') && phase === 'playing') doPause(); });
  const onVisibility = () => { if (document.hidden && phase === 'playing') doPause(); };
  document.addEventListener('visibilitychange', onVisibility);

  const handle = {
    ctx,
    state() { return { phase, score: ctx.score, frame: engine.time.frame, seed: runSeed }; },
    pause() { return doPause(); },
    resume() { if (phase === 'paused') { overlay.hideAll(); setPhase('playing'); engine.resume(); } },
    restart() { if (phase === 'start') return; teardownMechanic(); startRun(); },
    destroy() {
      destroyed = true;
      offKey();
      document.removeEventListener('visibilitychange', onVisibility);
      teardownMechanic();
      overlay.destroy();
      hud.destroy();
      input.destroy();
      audio.destroy();
      engine.destroy();
      container.classList.remove('eg-container');
      delete container.dataset.egPhase;
      if (window.__eduGame === handle) window.__eduGame = undefined;
    },
  };
  window.__eduGame = handle;
  showStartScreen();
  return handle;
}
