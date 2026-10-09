// kit/ui/hud.js
// DOM HUD over the canvas: score, streak flame, lives as hearts, timer, level + progress bar, label, combo.
// set() diffs against the last values and only touches the DOM for keys that changed; a key only becomes
// visible once it has been set at least once.
import { formatTime } from '../core/utils.js';

const ICON = {
  star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 2c.4 3.2-1.3 4.6-2.7 6.1C9.3 9.6 8 11 8 13.4a4 4 0 0 0 8 0c0-1-.4-1.9-1-2.6-.1 1-.7 1.8-1.6 2.1.5-1.6.1-3.3-1-4.5C13.7 6.4 15 4.5 13.5 2zM12 22a7 7 0 0 1-7-7c0-3.2 1.9-5.1 3.4-6.6C9.7 7 11 5.7 11 4c2 1.5 3 3.5 2.5 5.5 1.3-.5 2-1.7 2.1-3C18 8.5 19 10.5 19 13a7 7 0 0 1-7 9z"/></svg>',
  heart: '<svg class="eg-heart" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.8 4.5c2 0 3.6 1.1 4.4 2.6.8-1.5 2.4-2.6 4.4-2.6 3.8 0 6 3.8 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
};

export class HUD {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.className = 'eg-hud';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'off');
    this.el.innerHTML = `
      <div class="eg-hud-group eg-hud-left">
        <div class="eg-hud-item eg-hud-score eg-hidden" data-key="score">${ICON.star}<span class="v">0</span></div>
        <div class="eg-hud-item eg-hud-streak eg-hidden" data-key="streak">${ICON.flame}<span class="v">0</span></div>
        <div class="eg-hud-item eg-hud-combo eg-hidden" data-key="combo">${ICON.bolt}<span class="v">x2</span></div>
      </div>
      <div class="eg-hud-group eg-hud-center">
        <div class="eg-hud-item eg-hud-level eg-hidden" data-key="level"><span class="eg-hud-lvl v">Level 1</span><div class="eg-bar"><i></i></div></div>
        <div class="eg-hud-item eg-hud-label eg-hidden" data-key="label"><span class="v"></span></div>
      </div>
      <div class="eg-hud-group eg-hud-right">
        <div class="eg-hud-item eg-hud-lives eg-hidden" data-key="lives"></div>
        <div class="eg-hud-item eg-hud-timer eg-hidden" data-key="timer">${ICON.clock}<span class="v">0:00</span></div>
      </div>`;
    this._nodes = {};
    for (const n of this.el.querySelectorAll('[data-key]')) this._nodes[n.dataset.key] = n;
    this._vals = {};
    this._visible = {};
    this._timers = {};
    parent.appendChild(this.el);
  }

  _node(key) {
    if (key === 'levelLabel' || key === 'progress') return this._nodes.level;
    if (key === 'maxLives') return this._nodes.lives;
    return this._nodes[key];
  }
  _show(key) {
    const node = this._node(key);
    if (!node) return;
    const k = node.dataset.key;
    if (this._visible[k] === undefined) this._visible[k] = true;
    node.classList.toggle('eg-hidden', !this._visible[k]);
  }

  /** Updates only the keys whose values changed. */
  set(values) {
    if (!values) return;
    const v = this._vals;
    let livesChanged = false;
    for (const key of Object.keys(values)) {
      const val = values[key];
      if (val === undefined) continue;
      if (v[key] === val) continue;
      v[key] = val;
      switch (key) {
        case 'score': this._text('score', Math.round(Number(val) || 0).toLocaleString()); break;
        case 'streak': {
          const n = Number(val) || 0;
          this._text('streak', String(n));
          this._nodes.streak.classList.toggle('eg-hot', n >= 3);
          break;
        }
        case 'combo': {
          const n = Number(val) || 0;
          this._text('combo', 'x' + n);
          this._show('combo');
          this._nodes.combo.classList.toggle('eg-hidden', !(this._visible.combo && n > 1));
          continue;
        }
        case 'timer': {
          const node = this._nodes.timer;
          const txt = typeof val === 'number' ? formatTime(val) : String(val);
          node.querySelector('.v').textContent = txt;
          node.classList.toggle('eg-low', typeof val === 'number' && val <= 5);
          break;
        }
        case 'level': this._nodes.level.querySelector('.v').textContent = v.levelLabel ?? ('Level ' + val); break;
        case 'levelLabel': this._nodes.level.querySelector('.v').textContent = String(val); break;
        case 'progress': this._nodes.level.querySelector('.eg-bar > i').style.width = (Math.max(0, Math.min(1, Number(val) || 0)) * 100).toFixed(1) + '%'; break;
        case 'label': this._text('label', String(val)); break;
        case 'lives': case 'maxLives': livesChanged = true; break;
        default: continue;
      }
      this._show(key);
    }
    if (livesChanged) this._renderLives();
  }
  _text(key, txt) { this._nodes[key].querySelector('.v').textContent = txt; }
  _renderLives() {
    const node = this._nodes.lives;
    const lives = Math.max(0, Math.round(Number(this._vals.lives) || 0));
    const max = Math.max(lives, Math.round(Number(this._vals.maxLives) || lives || 1));
    if (node.childElementCount !== max) {
      node.innerHTML = ICON.heart.repeat(max);
    }
    const hearts = node.children;
    for (let i = 0; i < hearts.length; i++) hearts[i].classList.toggle('off', i >= lives);
    node.setAttribute('aria-label', `${lives} of ${max} lives`);
    this._show('lives');
  }

  pulse(key) {
    const node = this._node(key);
    if (!node) return;
    node.classList.remove('eg-pulse');
    void node.offsetWidth;
    node.classList.add('eg-pulse');
    clearTimeout(this._timers['p' + key]);
    this._timers['p' + key] = setTimeout(() => node.classList.remove('eg-pulse'), 450);
  }
  flash(key, color = '#fff') {
    const node = this._node(key);
    if (!node) return;
    node.style.setProperty('--eg-flash', color);
    node.classList.remove('eg-flash');
    void node.offsetWidth;
    node.classList.add('eg-flash');
    clearTimeout(this._timers['f' + key]);
    this._timers['f' + key] = setTimeout(() => node.classList.remove('eg-flash'), 650);
  }
  show() { this.el.classList.remove('eg-hidden'); }
  hide() { this.el.classList.add('eg-hidden'); }
  setVisible(key, bool) {
    const node = this._node(key);
    if (!node) return;
    this._visible[node.dataset.key] = !!bool;
    node.classList.toggle('eg-hidden', !bool);
  }
  /** Forgets all values and hides every item (used between runs). */
  reset() {
    this._vals = {};
    this._visible = {};
    for (const n of Object.values(this._nodes)) n.classList.add('eg-hidden');
    this._nodes.lives.innerHTML = '';
  }
  destroy() { for (const t of Object.values(this._timers)) clearTimeout(t); this.el.remove(); }
}
