// kit/learn/progress.js
// XP, levels, per-skill mastery, per-game stats (localStorage with in-memory fallback) and platform events.
//
// XP curve: level 1 starts at 0 XP; reaching level L+1 requires 100*L more XP than reaching level L.
//   totalXPForLevel(L) = 50 * L * (L - 1)   ->  L2 = 100, L3 = 300, L4 = 600, L5 = 1000, L10 = 4500 ...
//   level(xp) = floor((1 + sqrt(1 + xp / 12.5)) / 2)
// Mastery EMA per skill: m = m * (1 - a) + a * (correct ? min(1, 0.5 + difficulty / 10) : 0), a = 0.25, clamped 0..1.
// Events: Progress.emit(type, detail) dispatches window CustomEvent 'edu-games:event' ({ type, detail }) and
//   window.parent.postMessage({ source: 'edu-games', type, detail }, '*') when framed.
//   Types used by the kit: start, answer, xp, levelup, end, exit. Every detail includes gameId.

export const STORAGE_PREFIX = 'edu-games:v1:';
const ALPHA = 0.25;
const mem = new Map();

function store() {
  try { return typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : null; } catch { return null; }
}
function read(key, fallback) {
  try {
    const s = store();
    if (s) {
      const raw = s.getItem(STORAGE_PREFIX + key);
      if (raw !== null) return JSON.parse(raw);
    }
  } catch { /* blocked or corrupt */ }
  return mem.has(key) ? mem.get(key) : fallback;
}
function write(key, value) {
  mem.set(key, value);
  try { const s = store(); if (s) s.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); } catch { /* in-memory only */ }
}
function remove(key) {
  mem.delete(key);
  try { const s = store(); if (s) s.removeItem(STORAGE_PREFIX + key); } catch { /* ignore */ }
}
const now = () => Date.now();

export function totalXPForLevel(L) { return 50 * L * (L - 1); }
export function levelForXP(xp) { return Math.max(1, Math.floor((1 + Math.sqrt(1 + Math.max(0, xp) / 12.5)) / 2)); }

function profile() { return read('profile', { xp: 0 }); }
function skills() { return read('skills', {}); }
function games() { return read('games', {}); }

export const Progress = {
  STORAGE_PREFIX,
  totalXPForLevel,
  levelForXP,

  load(gameId) { return read('data:' + gameId, null); },
  save(gameId, data) { write('data:' + gameId, data); },

  xp() { return Number(profile().xp) || 0; },
  level() { return levelForXP(this.xp()); },
  /** { level, xp, xpToNext, levelProgress 0..1, levelStart, levelEnd } */
  levelInfo() {
    const xp = this.xp();
    const level = levelForXP(xp);
    const levelStart = totalXPForLevel(level);
    const levelEnd = totalXPForLevel(level + 1);
    return { level, xp, xpToNext: levelEnd - xp, levelProgress: (xp - levelStart) / (levelEnd - levelStart), levelStart, levelEnd };
  },

  addXP(amount, { gameId, skill } = {}) {
    amount = Math.max(0, Math.round(Number(amount) || 0));
    const p = profile();
    const before = levelForXP(Number(p.xp) || 0);
    p.xp = (Number(p.xp) || 0) + amount;
    write('profile', p);
    if (gameId) {
      const g = games();
      const st = g[gameId] || (g[gameId] = { plays: 0, bestScore: 0, totalXP: 0, lastPlayed: 0 });
      st.totalXP = (st.totalXP || 0) + amount;
      write('games', g);
    }
    const info = this.levelInfo();
    const leveledUp = info.level > before;
    if (amount > 0) this.emit('xp', { gameId: gameId ?? null, skill: skill ?? null, amount, xp: info.xp, level: info.level });
    if (leveledUp) this.emit('levelup', { gameId: gameId ?? null, level: info.level, xp: info.xp });
    return { xp: info.xp, level: info.level, leveledUp, xpToNext: info.xpToNext, levelProgress: info.levelProgress, amount };
  },

  recordAttempt({ gameId, skill, correct, difficulty = 1, responseMs = 0 } = {}) {
    if (!skill) return null;
    const all = skills();
    const st = all[skill] || (all[skill] = { attempts: 0, correct: 0, mastery: 0, lastSeen: 0, totalMs: 0 });
    st.attempts++;
    if (correct) st.correct++;
    const target = correct ? Math.min(1, 0.5 + (Number(difficulty) || 1) / 10) : 0;
    st.mastery = Math.max(0, Math.min(1, st.mastery * (1 - ALPHA) + ALPHA * target));
    st.lastSeen = now();
    st.totalMs = (st.totalMs || 0) + (Number(responseMs) || 0);
    if (gameId) st.lastGame = gameId;
    write('skills', all);
    return { ...st };
  },

  mastery(skill) { const st = skills()[skill]; return st ? st.mastery : 0; },
  skillStats(skill) {
    const st = skills()[skill];
    return st ? { attempts: st.attempts, correct: st.correct, mastery: st.mastery, lastSeen: st.lastSeen } : { attempts: 0, correct: 0, mastery: 0, lastSeen: 0 };
  },

  gameStats(gameId) {
    const st = games()[gameId];
    return st ? { ...st } : { plays: 0, bestScore: 0, totalXP: 0, lastPlayed: 0 };
  },
  /** Returns true when the score is a new best. */
  setBestScore(gameId, score) {
    const g = games();
    const st = g[gameId] || (g[gameId] = { plays: 0, bestScore: 0, totalXP: 0, lastPlayed: 0 });
    const s = Number(score) || 0;
    const isNew = s > (st.bestScore || 0);
    if (isNew) st.bestScore = s;
    write('games', g);
    return isNew;
  },
  recordPlay(gameId) {
    const g = games();
    const st = g[gameId] || (g[gameId] = { plays: 0, bestScore: 0, totalXP: 0, lastPlayed: 0 });
    st.plays++;
    st.lastPlayed = now();
    write('games', g);
    return { ...st };
  },
  allGameStats() { return { ...games() }; },
  allSkillStats() { return { ...skills() }; },

  exportAll() {
    const data = {};
    for (const gid of Object.keys(games())) data[gid] = this.load(gid);
    return { version: 1, profile: profile(), skills: skills(), games: games(), data, exportedAt: now() };
  },
  importAll(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.profile) write('profile', obj.profile);
    if (obj.skills) write('skills', obj.skills);
    if (obj.games) write('games', obj.games);
    if (obj.data) for (const [gid, d] of Object.entries(obj.data)) if (d !== null && d !== undefined) this.save(gid, d);
  },
  reset() {
    const ids = Object.keys(games());
    remove('profile'); remove('skills'); remove('games');
    for (const gid of ids) remove('data:' + gid);
    try {
      const s = store();
      if (s) for (let i = s.length - 1; i >= 0; i--) { const k = s.key(i); if (k && k.startsWith(STORAGE_PREFIX)) s.removeItem(k); }
    } catch { /* ignore */ }
    mem.clear();
  },

  emit(type, detail = {}) {
    if (typeof window === 'undefined') return;
    try { window.dispatchEvent(new CustomEvent('edu-games:event', { detail: { type, detail } })); } catch { /* ignore */ }
    try {
      if (window.parent && window.parent !== window) window.parent.postMessage({ source: 'edu-games', type, detail }, '*');
    } catch { /* ignore */ }
  },
};

export default Progress;
