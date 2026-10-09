// kit/ui/overlay.js
// Start / pause / end screens, the standard question panel, the feedback card, messages, toasts and hints.
// Everything is DOM over the canvas, styled only by theme.css tokens. Buttons carry data-eg attributes
// (section 9 of ARCHITECTURE.md) so tools can drive the game.
import { correctText } from '../learn/content.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SVG = {
  tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z"/><path d="M17 9l5 5M22 9l-5 5"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>',
  replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v5h5"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.4A5 5 0 0 1 13 14.9V17h3v2H8v-2h3v-2.1A5 5 0 0 1 8.4 12H8a4 4 0 0 1-4-4V5h3zm0 4H6v1a2 2 0 0 0 2 2V7zm11 0h-1v3a2 2 0 0 0 2-2V7z"/></svg>',
};

const CHOICE_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };

// ---------- inline SVG visuals for item.visual ----------
const VISUALS = {
  tenframe(v) {
    const n = Math.max(0, Math.min(20, Math.round(Number(v.n) || 0)));
    const m = Math.max(0, Math.min(20 - n, Math.round(Number(v.m) || 0)));
    const remove = Math.max(0, Math.min(n, Math.round(Number(v.remove) || 0)));
    const frames = n + m > 10 ? 2 : 1;
    const cell = 40, gap = 14, pad = 3;
    const fw = cell * 5, fh = cell * 2;
    const W = frames * fw + (frames - 1) * gap + pad * 2, H = fh + pad * 2;
    let s = `<svg class="eg-tenframe" viewBox="0 0 ${W} ${H}" width="${Math.min(W, 420)}" role="img" aria-label="ten frame showing ${n}${m ? ' and ' + m : ''}">`;
    let idx = 0;
    for (let f = 0; f < frames; f++) {
      const ox = pad + f * (fw + gap), oy = pad;
      s += `<rect x="${ox}" y="${oy}" width="${fw}" height="${fh}" rx="8" fill="rgba(127,127,127,0.1)" stroke="currentColor" stroke-opacity="0.5" stroke-width="2"/>`;
      for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
        const x = ox + c * cell, y = oy + r * cell;
        if (c > 0) s += `<line x1="${x}" y1="${oy}" x2="${x}" y2="${oy + fh}" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>`;
        if (r > 0 && c === 0) s += `<line x1="${ox}" y1="${y}" x2="${ox + fw}" y2="${y}" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>`;
        const cx = x + cell / 2, cy = y + cell / 2;
        if (idx < n) {
          const crossed = idx >= n - remove;
          s += `<circle cx="${cx}" cy="${cy}" r="13" fill="#4f7cff" opacity="${crossed ? 0.35 : 1}"/>`;
          if (crossed) s += `<path d="M${cx - 10} ${cy - 10}l20 20M${cx + 10} ${cy - 10}l-20 20" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>`;
        } else if (idx < n + m) {
          s += `<circle cx="${cx}" cy="${cy}" r="13" fill="#f59e0b"/>`;
        }
        idx++;
      }
    }
    return s + '</svg>';
  },
  numberline(v) {
    const min = Math.round(Number(v.min ?? 0)), max = Math.round(Number(v.max ?? 20));
    if (!(max > min)) return '';
    const range = max - min;
    const W = 460, H = 92, L = 24, R = W - 24, Y = 58;
    const px = x => L + ((x - min) / range) * (R - L);
    const every = range <= 12 ? 1 : range <= 30 ? 5 : 10;
    let s = `<svg class="eg-numberline" viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="number line from ${min} to ${max}">`;
    s += `<line x1="${L}" y1="${Y}" x2="${R}" y2="${Y}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`;
    for (let x = min; x <= max; x++) {
      const big = x % every === 0;
      s += `<line x1="${px(x)}" y1="${Y - (big ? 9 : 5)}" x2="${px(x)}" y2="${Y + (big ? 9 : 5)}" stroke="currentColor" stroke-width="${big ? 2.2 : 1.4}" stroke-opacity="${big ? 1 : 0.6}"/>`;
      if (big) s += `<text x="${px(x)}" y="${Y + 26}" text-anchor="middle" font-size="14" font-weight="800" fill="currentColor">${x}</text>`;
    }
    const from = Number(v.from), jump = Number(v.jump);
    if (Number.isFinite(from) && Number.isFinite(jump) && jump !== 0) {
      const x1 = px(from), x2 = px(from + jump), h = Math.min(34, 10 + Math.abs(x2 - x1) * 0.35);
      s += `<path d="M${x1} ${Y - 4} Q ${(x1 + x2) / 2} ${Y - 4 - h * 2} ${x2} ${Y - 4}" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>`;
      s += `<circle cx="${x2}" cy="${Y - 4}" r="5" fill="#f59e0b"/>`;
      s += `<text x="${(x1 + x2) / 2}" y="${Y - h - 12}" text-anchor="middle" font-size="15" font-weight="900" fill="#f59e0b">${jump > 0 ? '+' : ''}${jump}</text>`;
    }
    const point = Number(v.point);
    if (Number.isFinite(point)) s += `<circle cx="${px(point)}" cy="${Y}" r="7" fill="#4f7cff" stroke="#fff" stroke-width="2"/>`;
    return s + '</svg>';
  },
  fractionbar(v) {
    const d = Math.max(1, Math.min(24, Math.round(Number(v.d) || 1)));
    const n = Math.max(0, Math.min(d, Math.round(Number(v.n) || 0)));
    const W = 420, H = 56, pad = 3, w = (W - pad * 2) / d;
    let s = `<svg class="eg-fractionbar" viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="${n} of ${d} parts shaded">`;
    s += `<rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${H - pad * 2}" rx="10" fill="rgba(127,127,127,0.12)" stroke="currentColor" stroke-opacity="0.5" stroke-width="2"/>`;
    for (let i = 0; i < d; i++) {
      const x = pad + i * w;
      if (i < n) s += `<rect x="${x + 1}" y="${pad + 1}" width="${w - 2}" height="${H - pad * 2 - 2}" fill="#4f7cff" rx="${i === 0 || i === d - 1 ? 8 : 2}"/>`;
      if (i > 0) s += `<line x1="${x}" y1="${pad}" x2="${x}" y2="${H - pad}" stroke="currentColor" stroke-opacity="0.45" stroke-width="2"/>`;
    }
    return s + '</svg>';
  },
};

export function renderVisual(visual) {
  if (!visual || typeof visual !== 'object') return '';
  const fn = VISUALS[visual.kind];
  if (!fn) return '';
  try { return fn(visual); } catch { return ''; }
}

export class Overlay {
  constructor(root, { engine, audio, layer } = {}) {
    this.root = root;
    this.engine = engine || null;
    this.audio = audio || null;
    this.layer = layer || root;
    this.toastsEl = document.createElement('div');
    this.toastsEl.className = 'eg-toasts';
    this.layer.appendChild(this.toastsEl);
    this._hintEl = null;
    this._hintTimer = null;
    this.busy = 0;              // number of open screens that capture input
    this._cancels = new Set();  // cancel fns for pending promises (hideAll)
  }

  // ---- internals ----
  _screen(cls, { clear = false } = {}) {
    const s = document.createElement('div');
    s.className = 'eg-screen ' + cls + (clear ? ' eg-clear' : '');
    this.root.appendChild(s);
    if (!clear) this.busy++;
    s._eg = { clear };
    return s;
  }
  _close(s, animate = false) {
    if (!s || !s.isConnected) return;
    if (!s._eg.clear) this.busy = Math.max(0, this.busy - 1);
    s._eg.clear = true;
    if (animate) {
      const p = s.firstElementChild; if (p) p.classList.add('eg-leaving');
      s.style.pointerEvents = 'none';
      setTimeout(() => s.remove(), 180);
    } else s.remove();
  }
  _keys(fn) {
    const h = e => fn(e.code, e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }
  _pauseEngine() {
    const e = this.engine;
    if (!e || e.paused) return () => {};
    e.pause('overlay');
    return () => { if (e.paused && e.pauseReason === 'overlay') e.resume(); this._flushInput(); };
  }
  _flushInput() { const i = this.engine && this.engine.systems && this.engine.systems.input; if (i) i.flush(); }
  _track(cancel) { this._cancels.add(cancel); return () => this._cancels.delete(cancel); }

  // ---- start ----
  showStart({ title, tagline, howToPlay = [], skills = [], controls = [], gradeLabel } = {}) {
    return new Promise(resolve => {
      const s = this._screen('eg-start');
      const audio = this.audio;
      const muted = !!(audio && audio.muted);
      s.innerHTML = `<div class="eg-panel eg-wide" role="dialog" aria-label="${esc(title)}">
        <div class="eg-row" style="justify-content:space-between;align-items:flex-start">
          ${gradeLabel ? `<span class="eg-chip eg-accent">${esc(gradeLabel)}</span>` : '<span></span>'}
          <button class="eg-btn eg-btn-icon eg-btn-ghost" data-eg="mute" aria-label="${muted ? 'Unmute' : 'Mute'}" aria-pressed="${muted}">${muted ? SVG.soundOff : SVG.sound}</button>
        </div>
        <h1 class="eg-title">${esc(title)}</h1>
        ${tagline ? `<p class="eg-tagline">${esc(tagline)}</p>` : ''}
        <div class="eg-cols">
          <div><h3 class="eg-h3">How to play</h3><ul class="eg-list">${howToPlay.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>
          <div><h3 class="eg-h3">You will practise</h3><div class="eg-chips">${skills.map(k => `<span class="eg-chip">${esc(k)}</span>`).join('')}</div></div>
        </div>
        ${controls.length ? `<div class="eg-controls">${controls.map(c => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
        <div class="eg-actions">
          <button class="eg-btn eg-btn-primary eg-btn-big" data-eg="start">${SVG.play} Start</button>
          <span class="eg-subtle">or press Enter</span>
        </div>
      </div>`;
      const muteBtn = s.querySelector('[data-eg="mute"]');
      muteBtn.addEventListener('click', () => {
        if (!audio) return;
        audio.setMuted(!audio.muted);
        muteBtn.innerHTML = audio.muted ? SVG.soundOff : SVG.sound;
        muteBtn.setAttribute('aria-pressed', String(audio.muted));
        muteBtn.setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute');
      });
      const done = () => { off(); untrack(); this._close(s); resolve(); };
      const off = this._keys(code => { if (code === 'Enter' || code === 'Space') done(); });
      const untrack = this._track(() => { off(); this._close(s); });
      s.querySelector('[data-eg="start"]').addEventListener('click', done);
      setTimeout(() => { try { s.querySelector('[data-eg="start"]').focus({ preventScroll: true }); } catch { /* ignore */ } }, 50);
    });
  }

  // ---- pause ----
  showPause() {
    return new Promise(resolve => {
      const s = this._screen('eg-pause');
      s.innerHTML = `<div class="eg-panel eg-narrow" role="dialog" aria-label="Paused">
        <div class="eg-eyebrow">Take a breath</div>
        <h2 class="eg-title">Paused</h2>
        <div class="eg-actions">
          <button class="eg-btn eg-btn-primary eg-btn-big" data-eg="resume">${SVG.play} Resume</button>
          <button class="eg-btn" data-eg="restart">${SVG.replay} Restart</button>
          <button class="eg-btn eg-btn-ghost" data-eg="exit">Exit</button>
        </div>
        <p class="eg-subtle" style="margin:14px 0 0">Esc or P to resume</p>
      </div>`;
      const done = v => { off(); untrack(); this._close(s); this._flushInput(); resolve(v); };
      const off = this._keys(code => { if (code === 'Escape' || code === 'KeyP' || code === 'Enter') done('resume'); });
      const untrack = this._track(() => { off(); this._close(s); });
      for (const v of ['resume', 'restart', 'exit']) s.querySelector(`[data-eg="${v}"]`).addEventListener('click', () => done(v));
      setTimeout(() => { try { s.querySelector('[data-eg="resume"]').focus({ preventScroll: true }); } catch { /* ignore */ } }, 30);
    });
  }

  // ---- end ----
  showEnd({ title, score = 0, bestScore = 0, correct = 0, total = 0, xpEarned = 0, level = 1, leveledUp = false,
    levelProgress = 0, xpToNext, isNewBest = false, mastery = [], stats = [] } = {}) {
    return new Promise(resolve => {
      const s = this._screen('eg-end');
      const acc = total > 0 ? correct / total : 0;
      const pct = Math.round(acc * 100);
      const C = 2 * Math.PI * 42;
      const heading = title || (acc >= 0.9 ? 'Amazing!' : acc >= 0.7 ? 'Great job!' : acc >= 0.5 ? 'Nice work!' : 'Good try!');
      s.innerHTML = `<div class="eg-panel" role="dialog" aria-label="Results">
        <div class="eg-eyebrow">Round complete</div>
        <h2 class="eg-title">${esc(heading)}</h2>
        <div class="eg-end-head">
          <div>
            <div class="eg-score"><small>Score</small><span class="eg-score-val">0</span></div>
            <div class="eg-best ${isNewBest ? 'eg-new' : ''}">${isNewBest ? SVG.trophy + ' New best score!' : 'Best: ' + esc(Math.round(bestScore).toLocaleString())}</div>
          </div>
          <div class="eg-ring" role="img" aria-label="Accuracy ${pct} percent">
            <svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="42"/><circle class="val" cx="50" cy="50" r="42" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"/></svg>
            <div class="lbl"><div>${pct}%<small>${correct}/${total} right</small></div></div>
          </div>
          <div class="eg-xp">
            <div class="eg-xp-top"><span>XP earned</span><b>+${Math.round(xpEarned)} XP</b></div>
            <div class="eg-bar"><i style="width:0%"></i></div>
            <div class="eg-xp-foot"><span>Level ${esc(level)}</span><span>${xpToNext !== undefined ? esc(xpToNext) + ' XP to next' : ''}</span></div>
            ${leveledUp ? `<div style="margin-top:10px"><span class="eg-levelup">${SVG.trophy} Level up! You reached level ${esc(level)}</span></div>` : ''}
          </div>
        </div>
        ${mastery.length ? `<h3 class="eg-h3">Skill mastery</h3><div class="eg-mastery">${mastery.map(m => {
          const b = Math.round((m.before || 0) * 100), a = Math.round((m.after || 0) * 100), d = a - b;
          return `<div class="eg-mastery-row"><span class="eg-skillname" title="${esc(m.name || m.skill)}">${esc(m.name || m.skill)}</span>
            <div class="eg-bars"><i class="before" style="width:${b}%"></i><i class="after" style="width:${b}%" data-to="${a}"></i></div>
            <span class="eg-delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '+' : ''}${d}%</span></div>`;
        }).join('')}</div>` : ''}
        ${stats.length ? `<div class="eg-stats">${stats.map(st => `<span class="eg-stat">${esc(st.label)}<b>${esc(st.value)}</b></span>`).join('')}</div>` : ''}
        <div class="eg-actions">
          <button class="eg-btn eg-btn-primary eg-btn-big" data-eg="replay">${SVG.replay} Play again</button>
          <button class="eg-btn" data-eg="exit">Exit</button>
        </div>
      </div>`;
      // animations: score count-up, ring, xp bar, mastery bars
      const scoreEl = s.querySelector('.eg-score-val');
      const t0 = performance.now();
      const dur = 1100;
      let raf = 0;
      const tick = now => {
        if (!s.isConnected) return;
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - t, 3);
        scoreEl.textContent = Math.round(score * e).toLocaleString();
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      setTimeout(() => {
        if (!s.isConnected) return;
        s.querySelector('.eg-ring .val').style.strokeDashoffset = (C * (1 - acc)).toFixed(1);
        s.querySelector('.eg-xp .eg-bar > i').style.width = (Math.max(0, Math.min(1, levelProgress)) * 100).toFixed(1) + '%';
        for (const i of s.querySelectorAll('.eg-bars .after')) i.style.width = i.dataset.to + '%';
      }, 80);
      const done = v => { cancelAnimationFrame(raf); off(); untrack(); this._close(s); this._flushInput(); resolve(v); };
      const off = this._keys(code => { if (code === 'Enter' || code === 'Space') done('replay'); });
      const untrack = this._track(() => { cancelAnimationFrame(raf); off(); this._close(s); });
      s.querySelector('[data-eg="replay"]').addEventListener('click', () => done('replay'));
      s.querySelector('[data-eg="exit"]').addEventListener('click', () => done('exit'));
    });
  }

  // ---- question panel ----
  showQuestion(it, { timeLimit, allowHint = false } = {}) {
    return new Promise(resolve => {
      const resumeEngine = this._pauseEngine();
      const s = this._screen('eg-question');
      const isChoice = it.type === 'choice';
      const isNumeric = it.type === 'numeric';
      const visual = renderVisual(it.visual);
      const choicesHtml = isChoice
        ? `<div class="eg-choices" role="group" aria-label="Answers">${it.choices.map((c, i) =>
          `<button class="eg-btn eg-choice" data-eg="choice" data-index="${i}"><span class="eg-key">${i + 1}</span>${esc(c)}</button>`).join('')}</div>`
        : `<div class="eg-input-row">
            <input class="eg-input" data-eg="answer-input" type="${isNumeric ? 'number' : 'text'}" ${isNumeric ? 'inputmode="decimal" step="any"' : 'autocomplete="off" autocapitalize="off" spellcheck="false"'} placeholder="${isNumeric ? '?' : 'Type your answer'}" aria-label="Your answer">
            <button class="eg-btn eg-btn-primary" data-eg="submit">Submit</button>
          </div>`;
      s.innerHTML = `<div class="eg-panel" role="dialog" aria-label="Question">
        ${timeLimit ? '<div class="eg-timerbar"><i></i></div>' : ''}
        <p class="eg-prompt">${esc(it.prompt)}</p>
        ${visual ? `<div class="eg-visual">${visual}</div>` : ''}
        ${choicesHtml}
        <div class="eg-qfoot">
          <span class="eg-subtle">${isChoice ? 'Press 1-' + it.choices.length : 'Press Enter to submit'}${isNumeric && it.unit ? ' · answer in ' + esc(it.unit) : ''}</span>
          ${allowHint && it.hint ? `<button class="eg-btn eg-btn-ghost" data-eg="hint" style="min-height:40px;padding:0 14px;font-size:14px">${SVG.bulb} Hint</button>` : ''}
        </div>
      </div>`;
      const t0 = performance.now();
      let settled = false;
      let timer = 0;
      const finish = (chosen, timedOut = false) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        off(); untrack();
        this._close(s);
        resumeEngine();
        resolve({ chosen, responseMs: Math.round(performance.now() - t0), timedOut });
      };
      const untrack = this._track(() => finish(null, true));
      const submitInput = () => {
        const inp = s.querySelector('[data-eg="answer-input"]');
        const raw = inp ? inp.value : '';
        if (isNumeric) {
          const n = Number(String(raw).trim().replace(',', '.'));
          finish(String(raw).trim() === '' || !Number.isFinite(n) ? null : n);
        } else finish(String(raw));
      };
      const off = this._keys((code, e) => {
        if (isChoice) {
          const idx = CHOICE_KEYS[code];
          if (idx !== undefined && idx < it.choices.length) { e.preventDefault(); finish(idx); }
        } else if (code === 'Enter' || code === 'NumpadEnter') { e.preventDefault(); submitInput(); }
      });
      if (isChoice) {
        for (const b of s.querySelectorAll('[data-eg="choice"]')) b.addEventListener('click', () => finish(Number(b.dataset.index)));
      } else {
        s.querySelector('[data-eg="submit"]').addEventListener('click', submitInput);
        setTimeout(() => { try { s.querySelector('[data-eg="answer-input"]').focus({ preventScroll: true }); } catch { /* ignore */ } }, 40);
      }
      const hintBtn = s.querySelector('[data-eg="hint"]');
      if (hintBtn) hintBtn.addEventListener('click', () => {
        const foot = s.querySelector('.eg-qfoot');
        hintBtn.remove();
        const h = document.createElement('div');
        h.className = 'eg-hinttext';
        h.innerHTML = `${SVG.bulb.replace('<svg', '<svg style="width:18px;height:18px;vertical-align:-3px;color:#f5b301;margin-right:6px"')}${esc(it.hint)}`;
        foot.appendChild(h);
      });
      if (timeLimit) {
        const bar = s.querySelector('.eg-timerbar > i');
        const wrap = s.querySelector('.eg-timerbar');
        requestAnimationFrame(() => { bar.style.transitionDuration = timeLimit + 's'; bar.style.width = '0%'; });
        setTimeout(() => wrap.classList.add('eg-low'), Math.max(0, (timeLimit - 5) * 1000));
        timer = setTimeout(() => finish(null, true), timeLimit * 1000);
      }
    });
  }

  // ---- feedback card ----
  showFeedback(it, chosen, correct, { blocking = !correct, duration = 1.2 } = {}) {
    return new Promise(resolve => {
      const resumeEngine = blocking ? this._pauseEngine() : () => {};
      const s = this._screen('eg-feedback-screen', { clear: !blocking });
      const answer = correctText(it);
      const missed = chosen === null || chosen === undefined;
      const titleTxt = correct ? 'Correct!' : missed ? 'Time’s up!' : 'Not quite';
      s.innerHTML = `<div class="eg-panel eg-feedback ${correct ? 'good' : 'bad'}" data-eg="feedback-dismiss" role="${blocking ? 'alertdialog' : 'status'}" tabindex="-1">
        <div class="eg-icon">${correct ? SVG.tick : SVG.cross}</div>
        <h2>${titleTxt}</h2>
        <div class="eg-answerline">${correct ? 'Answer' : 'The answer is'} <b>${esc(answer)}</b></div>
        ${it.explanation ? `<p class="eg-explain">${esc(it.explanation)}</p>` : ''}
        ${blocking ? '<div class="eg-continue">Tap or press any key to continue</div>' : ''}
      </div>`;
      let settled = false;
      let timer = 0;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        off(); untrack();
        this._close(s, true);
        resumeEngine();
        resolve();
      };
      const untrack = this._track(done);
      const armed = performance.now() + 250;
      const off = blocking ? this._keys((code, e) => { if (performance.now() < armed) return; e.preventDefault(); done(); }) : () => {};
      s.addEventListener('pointerdown', () => { if (performance.now() >= armed) done(); });
      s.querySelector('[data-eg="feedback-dismiss"]').addEventListener('click', () => { if (performance.now() >= armed) done(); });
      if (!blocking) timer = setTimeout(done, Math.max(0.2, duration) * 1000);
      else setTimeout(() => { try { s.querySelector('.eg-feedback').focus({ preventScroll: true }); } catch { /* ignore */ } }, 30);
    });
  }

  // ---- message ----
  showMessage({ title, body, buttons = [{ label: 'OK', value: true, primary: true }] } = {}) {
    return new Promise(resolve => {
      const s = this._screen('eg-message');
      s.innerHTML = `<div class="eg-panel eg-narrow" role="dialog" aria-label="${esc(title || 'Message')}">
        ${title ? `<h2 class="eg-title" style="font-size:26px">${esc(title)}</h2>` : ''}
        ${body ? `<p class="eg-explain" style="margin-bottom:16px">${esc(body)}</p>` : ''}
        <div class="eg-actions">${buttons.map((b, i) => `<button class="eg-btn ${b.primary ? 'eg-btn-primary' : ''}" data-eg="msg-${i}">${esc(b.label)}</button>`).join('')}</div>
      </div>`;
      const done = v => { off(); untrack(); this._close(s); this._flushInput(); resolve(v); };
      const untrack = this._track(() => done(undefined));
      const off = this._keys(code => { if (code === 'Enter') { const p = buttons.find(b => b.primary) || buttons[0]; done(p && p.value); } });
      buttons.forEach((b, i) => s.querySelector(`[data-eg="msg-${i}"]`).addEventListener('click', () => done(b.value)));
    });
  }

  // ---- toast + hint ----
  toast(text, { type = 'info', duration = 1.5 } = {}) {
    const t = document.createElement('div');
    t.className = 'eg-toast ' + type;
    t.textContent = String(text);
    this.toastsEl.appendChild(t);
    while (this.toastsEl.childElementCount > 3) this.toastsEl.firstElementChild.remove();
    setTimeout(() => { t.classList.add('eg-leaving'); setTimeout(() => t.remove(), 180); }, Math.max(0.3, duration) * 1000);
    return t;
  }
  showHint(text) {
    this.hideHint();
    if (!text) return;
    const h = document.createElement('div');
    h.className = 'eg-hint';
    h.setAttribute('role', 'note');
    h.innerHTML = `${SVG.bulb}<span>${esc(text)}</span>`;
    this.layer.appendChild(h);
    this._hintEl = h;
    this._hintTimer = setTimeout(() => this.hideHint(), 6000);
  }
  hideHint() {
    clearTimeout(this._hintTimer);
    if (this._hintEl) { this._hintEl.remove(); this._hintEl = null; }
  }
  hideAll() {
    for (const c of Array.from(this._cancels)) { try { c(); } catch { /* ignore */ } }
    this._cancels.clear();
    for (const s of Array.from(this.root.querySelectorAll('.eg-screen'))) s.remove();
    this.busy = 0;
    this.toastsEl.innerHTML = '';
    this.hideHint();
  }
  destroy() { this.hideAll(); this.toastsEl.remove(); }
}
