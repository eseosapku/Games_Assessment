// kit/learn/adaptive.js
// Per-skill adaptive difficulty controller. DOM-free (Node imports it).
//
// Difficulty: starts at `start`, +1 after `upAfter` correct in a row on a skill, -1 after `downAfter`
// misses in a row, clamped to [min, max]. needsHint(skill) is true while a skill has >= downAfter misses in a row.
//
// nextSkill(): weight = (1 - thisRunAccuracy) * 2 + (turns since last seen) / 5 + small jitter from rng;
// never the same skill three times in a row when more than one skill exists.

class LCG {
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() { this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0; return this.s / 4294967296; }
}

export class Adaptive {
  constructor({ skills, start = 1, min = 1, max = 5, upAfter = 3, downAfter = 2, rng } = {}) {
    if (!Array.isArray(skills) || !skills.length) throw new Error('Adaptive: skills[] is required');
    this.skills = skills.slice();
    this.min = min; this.max = max; this.upAfter = upAfter; this.downAfter = downAfter;
    this.start = Math.max(min, Math.min(max, start));
    this.rng = rng || new LCG(7);
    this.turn = 0;
    this.history = [];
    this.state = {};
    for (const s of this.skills) this._ensure(s);
  }
  _ensure(skill) {
    if (!this.state[skill]) {
      this.state[skill] = { seen: 0, correct: 0, difficulty: this.start, streak: 0, misses: 0, lastTurn: -5, totalMs: 0 };
      if (!this.skills.includes(skill)) this.skills.push(skill);
    }
    return this.state[skill];
  }

  nextSkill() {
    const h = this.history;
    const banned = this.skills.length > 1 && h.length >= 2 && h[h.length - 1] === h[h.length - 2] ? h[h.length - 1] : null;
    let best = null, bestW = -Infinity;
    for (const skill of this.skills) {
      if (skill === banned) continue;
      const st = this.state[skill];
      const acc = st.seen ? st.correct / st.seen : 0.5;
      const recency = (this.turn - st.lastTurn) / 5;
      const w = (1 - acc) * 2 + recency + this.rng.next() * 0.35;
      if (w > bestW) { bestW = w; best = skill; }
    }
    this.turn++;
    this.state[best].lastTurn = this.turn;
    h.push(best);
    if (h.length > 4) h.shift();
    return best;
  }

  difficultyFor(skill) { return this._ensure(skill).difficulty; }

  record(skill, correct, responseMs = 0) {
    const st = this._ensure(skill);
    st.seen++;
    st.totalMs += Number(responseMs) || 0;
    st.lastTurn = this.turn;
    if (correct) {
      st.correct++;
      st.streak++;
      st.misses = 0;
      if (st.streak >= this.upAfter) {
        st.difficulty = Math.min(this.max, st.difficulty + 1);
        st.streak = 0;
      }
    } else {
      st.streak = 0;
      st.misses++;
      if (st.misses === this.downAfter) st.difficulty = Math.max(this.min, st.difficulty - 1);
    }
    return st;
  }

  missesInRow(skill) { return this._ensure(skill).misses; }
  needsHint(skill) { return this._ensure(skill).misses >= this.downAfter; }
  accuracy(skill) { const st = this._ensure(skill); return st.seen ? st.correct / st.seen : 0; }

  summary() {
    const out = {};
    for (const s of this.skills) {
      const st = this.state[s];
      out[s] = { seen: st.seen, correct: st.correct, difficulty: st.difficulty, streak: st.streak, misses: st.misses, avgMs: st.seen ? Math.round(st.totalMs / st.seen) : 0 };
    }
    return out;
  }
}
