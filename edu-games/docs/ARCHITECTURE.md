# Edu-Games Architecture Contract

This is the binding contract for every file in `edu-games/`. Every kit module, mechanic, content pack and game must follow it exactly. When this document and any other file disagree, this document wins.

## 0. Goals

- ~100 highly interactive learning games, grades 1-12, seven subjects, for a web app.
- Each game = **one reusable Mechanic** (the game chassis) + **one Content Pack** (what is being learned) + **a Config/Theme** (skin, names, speeds). The same mechanic re-skinned with another content pack is a new game. This is how we scale to 100 without 100 islands.
- Learning IS the core loop. The educational decision is the fun action (steer through the right gate, aim with the right equation). Never "answer a quiz to unlock 30 seconds of unrelated play".
- Zero build step, zero runtime dependencies. Plain ES2022 modules + Canvas 2D + a thin DOM overlay. Any static host serves it. The platform embeds a game as an `<iframe>` or mounts it with `createGame()`.

## 1. Repository layout

```
edu-games/
  index.html                  Launcher (game library UI)
  launcher/launcher.js        Launcher logic (reads games/index.json + Progress)
  launcher/launcher.css
  games/index.json            Generated list of manifests (tools/build-index.mjs)
  kit/                        Shared engine ("the kit") - see section 3
    kit.js                    Barrel + createGame()
    core/engine.js            Canvas, fixed logical resolution, game loop, scene stack
    core/input.js             Keyboard + unified pointer/touch + swipe + virtual buttons
    core/audio.js             WebAudio synthesized SFX + simple music, no asset files
    core/tween.js             Tweens + easing
    core/particles.js         Particles, FloatingText, ScreenShake
    core/utils.js             Seeded RNG, math, canvas text helpers
    ui/theme.css              Design tokens, light/dark, overlay styles
    ui/hud.js                 DOM HUD over the canvas
    ui/overlay.js             Start/pause/end screens, question panel, feedback card, toasts
    learn/content.js          Item types, ContentPack contract, helpers (makeChoices, etc.)
    learn/adaptive.js         Per-skill adaptive difficulty controller
    learn/progress.js         XP, levels, streaks, mastery per skill (localStorage), platform events
  mechanics/<mechanic-id>/mechanic.js   Reusable, content-agnostic game chassis (section 4)
  mechanics/CATALOG.md        Catalog of all mechanics (built and planned)
  games/<game-id>/            One playable game (section 5)
    index.html                Standalone page: loads kit + mechanic + content + config
    manifest.json             Metadata (section 5.1)
    content.js                ContentPack for this game (section 6)
    game.js                   Wires mechanic + content + config; calls createGame()
    thumb.svg                 Thumbnail 320x180
    REVIEW.md                 Reviewer notes (what was verified / fixed / known gaps)
  curriculum/map.json         7 subjects x grades 1-12 x topics x skills (section 7)
  curriculum/<subject>.json   Per-subject source files merged into map.json
  tools/build-index.mjs       Scans games/*/manifest.json -> games/index.json
  tools/content-check.mjs     Imports a game's content.js, generates 200 items, checks invariants
  tools/smoke.mjs             Playwright smoke test using installed Edge/Chrome
  docs/                       This file, GAME_DESIGN_GUIDE.md, INTEGRATION.md, PHASE1_PLAN.md
```

Serve from `edu-games/` root: `python -m http.server 8080` then open `http://localhost:8080/`. ES modules do not load from `file://`.

## 2. Non-negotiable rules

### 2.1 Technical
- ES2022 modules, relative imports, `.js` extension in every import path. No bundler, no TypeScript, no npm packages at runtime, no frameworks, no WebGL.
- Logical resolution is **960 x 540** (16:9). The engine scales/letterboxes to the container. All game code draws in logical pixels and receives pointer events in logical pixels.
- Input must work with keyboard, mouse AND touch. Any lane/direction control must also have an on-screen touch alternative (`input.addTouchButton` or tap zones).
- No per-frame allocations in hot loops where avoidable; no DOM writes from `update()`/`render()` except via `hud.set()` which diffs internally.
- All text drawn on canvas goes through `drawText`/`wrapText` from `kit/core/utils.js` so it fits. Minimum font size on canvas: 16 logical px (20 for grades 1-3).
- Use the kit `RNG` for all randomness so a run is reproducible from its seed. `Math.random` is forbidden in mechanics and content.
- `node --check <file>` must pass for every `.js` file. The smoke test (`node tools/smoke.mjs <game-id>`) must report zero page errors and zero console errors.
- Pause on `Escape` or `P` and on tab blur. Resume cleanly. Never lose state on resize.
- Respect `prefers-reduced-motion` (kit exposes `ctx.reducedMotion`; halve particle counts and skip screen shake when true).

### 2.2 Pedagogy (every game, no exceptions)
1. **Learning is the mechanic.** The educational choice drives the game action directly.
2. **Every wrong answer teaches.** Show the correct answer AND a one-to-two sentence `explanation` of *why* (from the item). Wrong-answer feedback requires a tap/keypress to dismiss (so it is read); correct-answer feedback auto-dismisses fast.
3. **Adaptive.** Use `ctx.adaptive`. Start at difficulty 1-2, step up after 3 correct in a row on a skill, step down after 2 misses. Never a wall: after 2 misses on the same skill show the item `hint` before the next item of that skill.
4. **Fast feedback.** Visual + audio response within 200 ms of any answer.
5. **Juice.** Particles on correct, screen shake on big events, floating "+50" text, combo/streak meter, tweened UI. Correct answers must *feel* good.
6. **Session structure.** 5-10 minutes. At least 3 escalating stages/waves/levels with a visible progress bar and one finale/boss/"wow" moment.
7. **Meta-progress.** Award XP via `ctx.progress.addXP`. End screen shows score, accuracy, XP earned, per-skill mastery deltas.
8. **Variety.** Procedural generators preferred. A content pack must be able to produce at least 40 distinct items; two consecutive runs must not feel identical.
9. **Correctness.** Generators must be factually/mathematically correct. Distractors must be plausible (common misconceptions) and never accidentally correct. Never duplicate choices.
10. **Age fit.** Grades 1-3: large text, icons, minimal reading, call `ctx.speak(prompt)` on each new prompt. Grades 9-12: real rigor, not toy versions.
11. **Accessibility.** Never rely on colour alone; add shape/label. Keyboard-complete: number keys 1-4 (and arrows + Enter) answer choices.

## 3. Kit API (what mechanics and games may use)

All kit modules are imported through `kit/kit.js`:

```js
import { createGame, Engine, Input, Audio, Tweens, Easing, Particles, FloatingText, ScreenShake,
         RNG, clamp, lerp, dist, roundRect, drawText, wrapText, measureText, formatTime,
         HUD, Overlay, Adaptive, Progress, Content } from '../../kit/kit.js';
```

### 3.1 `createGame(options)`: the game shell

```js
const handle = await createGame({
  container: document.getElementById('game'),   // any block element; kit fills it
  manifest,                                      // parsed manifest.json
  Mechanic,                                      // class exported by mechanics/<id>/mechanic.js
  content,                                       // ContentPack object (section 6)
  config: {},                                    // mechanic-specific config/theme (section 4)
  seed: undefined,                               // optional; default derived from Date.now() ONCE at start
});
handle.destroy(); handle.restart(); handle.pause(); handle.resume();
```

`createGame` does, in order: builds the canvas + DOM overlay inside `container` (applies `theme.css`), constructs `engine, input, audio, tweens, particles, floatingText, shake, hud, overlay, adaptive, progress`, builds the `ctx` object (below), shows `overlay.showStart(...)` from the manifest, on Start unlocks audio, calls `mechanic.init()`, runs the loop; when the mechanic calls `ctx.endGame(results)` it records progress and shows `overlay.showEnd(...)` with Replay/Exit; Replay re-seeds and re-inits. Exit posts an `exit` platform event and shows the start screen again.

### 3.2 The `ctx` object handed to a Mechanic

```js
ctx = {
  engine, input, audio, tweens, particles, floatingText, shake, hud, overlay, adaptive, progress,
  content,            // the ContentPack
  rng,                // RNG seeded for this run
  manifest, config,   // from createGame
  width: 960, height: 540,
  reducedMotion: bool,
  gradeBand: 'early'|'elementary'|'middle'|'high',   // from manifest.gradeBand
  speak(text),        // SpeechSynthesis if available; no-op otherwise. Rate-limited, cancels previous.
  nextItem({ skill, type, difficulty, choices } = {}),  // -> Item. Picks skill via adaptive if omitted,
                      // difficulty via adaptive.difficultyFor(skill) if omitted. Guarantees no immediate repeat of the same prompt.
  answer(item, chosen, { responseMs } = {}) -> { correct, explanation, correctText, hint },
                      // Grades via Content.grade, records to adaptive + progress, updates ctx.streak,
                      // fires platform 'answer' event, plays correct/wrong SFX. Does NOT show UI.
  feedback(item, chosen, correct, { blocking } = {}),  // Standard feedback card via overlay.showFeedback; returns Promise
  endGame(results),   // results: { score, correct, total, bonusXP, stats: [{label,value}] } -> shows end screen
  score, addScore(n, { x, y, label } = {}),  // keeps HUD in sync, spawns floating text if x,y given
  streak,             // current correct streak (kit maintains via answer())
  on(event, fn),      // 'pause' | 'resume' | 'resize' | 'answer'  -> unsubscribe
  xpForCorrect(item), // helper: 10 * difficulty, doubled during streak >= 5
};
```

### 3.3 Engine: `kit/core/engine.js`
```js
class Engine {
  constructor({ container, width = 960, height = 540 })
  canvas, g /*CanvasRenderingContext2D*/, width, height, scale, offsetX, offsetY   // scale maps logical -> CSS pixels
  push(scene) / pop() / replace(scene)   // scene: { enter(), exit(), update(dt), render(g), transparent }
  start() / stop() / pause() / resume() ; paused
  time: { dt, elapsed, frame }      // dt in seconds, clamped to 1/20
  toLogical(clientX, clientY) -> { x, y }
  on('pause'|'resume'|'resize'|'frame', fn) -> unsubscribe
}
```
The engine clears the canvas each frame, calls `update(dt)` then `render(g)` on the top scene (lower scenes still render, dimmed, if `scene.transparent`), then renders `particles`, `floatingText`, touch buttons, and applies `shake.offset`. Mechanics do not call those renders themselves. The Mechanic instance itself is the base scene.

### 3.4 Input: `kit/core/input.js`
```js
class Input {
  constructor(engine)
  isDown(code), wasPressed(code), wasReleased(code)      // KeyboardEvent.code: 'ArrowLeft','KeyA','Space','Digit1','Enter','Escape'
  pointer: { x, y, down, justDown, justUp, active }       // logical coords; active=false until first event
  onPointerDown(fn(x,y,e)) / onPointerUp / onPointerMove / onKeyDown(fn(code,e)) / onKeyUp / onSwipe(fn('left'|'right'|'up'|'down'))
     // each returns an unsubscribe function
  addTouchButton({ id, x, y, w, h, label, code })        // draws a soft button on canvas; maps to key `code`
  removeTouchButton(id) ; clearTouchButtons() ; drawTouchButtons(g)   // engine calls draw automatically after scene render
  isTouchDevice
  endFrame()                                              // engine calls it; clears justDown/justUp/pressed
}
```

### 3.5 Audio: `kit/core/audio.js` (synthesized, no files)
```js
class Audio {
  unlock()                     // call on first user gesture (createGame does this on Start)
  play(name, { volume = 1, pitch = 1 } = {})
    // names: 'click','correct','wrong','pop','coin','hit','explode','levelup','whoosh','tick','fanfare','buzz','powerup','jump','swoosh','combo'
  tone({ freq, duration, type = 'sine', volume = 0.3, attack = 0.005, release = 0.05 })
  playNote(midi, duration, { type, volume } = {})      // for music games
  music: { start(trackName /* 'calm'|'upbeat'|'tense'|'boss' */), stop(), setIntensity(v /*0..1*/) }
  setMuted(bool), muted
}
```

### 3.6 Tween: `kit/core/tween.js`
```js
Easing: linear, easeInQuad, easeOutQuad, easeInOutQuad, easeOutCubic, easeInOutCubic, easeOutBack, easeOutElastic, easeOutBounce
class Tweens {
  add(target, props, duration, { ease = Easing.easeOutQuad, delay = 0, onComplete, onUpdate, yoyo, repeat } = {}) -> tween
  update(dt) ; kill(tween) ; killTarget(obj) ; killAll() ; delay(seconds, fn) -> handle
}
```

### 3.7 Particles: `kit/core/particles.js`
```js
class Particles {
  burst({ x, y, count = 20, colors = ['#fff'], speed = 200, spread = Math.PI*2, angle = 0, life = 0.8, size = 6, gravity = 0, shape = 'circle', fade = true, friction = 0.9 })
    // shape: 'circle'|'square'|'star'|'spark'
  update(dt) ; render(g) ; clear() ; count
}
class FloatingText { add(text, x, y, { color = '#fff', size = 24, duration = 1, vy = -60, font, stroke = true } = {}) ; update(dt) ; render(g) ; clear() }
class ScreenShake { shake(intensity = 8, duration = 0.3) ; update(dt) ; offset: { x, y } }
```

### 3.8 Utils: `kit/core/utils.js`
```js
class RNG { constructor(seed) ; next() ; int(min, max) /*inclusive*/ ; float(min, max) ; pick(arr) ; shuffle(arr) /*in place, returns arr*/ ; chance(p) ; weighted(items, weights) ; sample(arr, n) ; seed }
clamp(v, a, b), lerp(a, b, t), inverseLerp(a, b, v), dist(x1, y1, x2, y2), angleTo(x1, y1, x2, y2), wrap(v, min, max), smoothstep(a, b, t)
roundRect(g, x, y, w, h, r, { fill, stroke, lineWidth } = {})
drawText(g, text, x, y, { font = '20px system-ui', color = '#fff', align = 'center', baseline = 'middle', maxWidth, stroke, strokeWidth = 4, shadow } = {})
   // auto-shrinks font until it fits maxWidth; returns the font size used
wrapText(g, text, maxWidth, font) -> string[]
measureText(g, text, font) -> width
formatTime(seconds) -> 'm:ss'
hexToRgba(hex, alpha), shade(hex, amount /* -1..1 */)
```

### 3.9 UI: `kit/ui/hud.js`, `kit/ui/overlay.js`, `kit/ui/theme.css`
HUD and Overlay are DOM nodes absolutely positioned over the canvas inside the container; they scale with it. Styles come only from `theme.css` tokens (`--eg-*`). Theme must work in light and dark (`prefers-color-scheme`) and allow a per-game accent via `--eg-accent` set by `createGame` from the subject colour unless `config.accent` overrides.

```js
class HUD {
  set({ score, streak, lives, maxLives, timer, level, levelLabel, progress /*0..1*/, label, combo })   // diffs; only shows keys that were ever set
  pulse(key) ; flash(key, color) ; show() ; hide() ; setVisible(key, bool)
}
class Overlay {
  showStart({ title, tagline, howToPlay: string[], skills: string[], controls: string[], gradeLabel }) -> Promise<void>   // resolves on Start
  showEnd({ title, score, bestScore, correct, total, xpEarned, level, leveledUp, mastery: [{skill, name, before, after}], stats: [{label, value}] }) -> Promise<'replay'|'exit'>
  showPause() -> Promise<'resume'|'restart'|'exit'>
  showQuestion(item, { timeLimit, allowHint } = {}) -> Promise<{ chosen, responseMs, timedOut }>
     // standard in-DOM question panel for choice/numeric/text items; pauses engine; keyboard 1-4 / Enter; draws item.visual if kind is known
  showFeedback(item, chosen, correct, { blocking = !correct, duration = 1.2 } = {}) -> Promise<void>
     // card with tick/cross, correct answer, explanation. Blocking requires tap/key.
  showMessage({ title, body, buttons: [{ label, value, primary }] }) -> Promise<value>
  toast(text, { type = 'info' /* 'info'|'good'|'bad' */, duration = 1.5 } = {})
  showHint(text) ; hideAll()
}
```

### 3.10 Learn: `kit/learn/*.js`
```js
class Adaptive {
  constructor({ skills: string[], start = 1, min = 1, max = 5, upAfter = 3, downAfter = 2 })
  nextSkill() -> skillId          // weighted toward weakest + least-recently-seen; never same skill 3x in a row if >1 skill
  difficultyFor(skill) -> 1..5 (integer)
  record(skill, correct, responseMs)
  missesInRow(skill) -> n ; needsHint(skill) -> bool (>= downAfter misses in a row)
  summary() -> { [skill]: { seen, correct, difficulty, streak } }
}
Progress (singleton module object):
  load(gameId) / save(gameId, data)           // per-game arbitrary blob
  addXP(amount, { gameId, skill }) -> { xp, level, leveledUp, xpToNext }
  level(), xp()                               // level thresholds documented in the file (quadratic-ish curve)
  recordAttempt({ gameId, skill, correct, difficulty, responseMs })
  mastery(skill) -> 0..1 ; skillStats(skill) -> { attempts, correct, mastery, lastSeen }
  gameStats(gameId) -> { plays, bestScore, totalXP, lastPlayed } ; setBestScore(gameId, score) ; recordPlay(gameId)
  allGameStats() ; allSkillStats()
  exportAll() -> object ; importAll(object) ; reset()
  emit(type, detail)   // dispatches window 'edu-games:event' AND window.parent.postMessage({ source:'edu-games', type, detail }, '*') when framed
  Storage key prefix: 'edu-games:v1:'. All storage access wrapped in try/catch; works in-memory if storage is blocked.
Content helpers (kit/learn/content.js): see section 6.
```

## 4. Mechanic contract: `mechanics/<mechanic-id>/mechanic.js`

```js
export const meta = {
  id: 'tower-defense',
  name: 'Tower Defense',
  description: 'Place towers by answering; towers target enemies by property.',
  itemTypes: ['choice'],          // item types this mechanic can consume
  choices: 4,                     // preferred number of choices if it uses 'choice'
  configSchema: { /* documented keys with defaults, plain object: key -> 'description (default)' */ },
};
export const defaultConfig = { /* every key in configSchema with its default */ };
export class Mechanic {
  constructor(ctx) { this.ctx = ctx; this.cfg = { ...defaultConfig, ...ctx.config }; }
  init() {}            // build initial state; may call ctx.nextItem
  update(dt) {}        // game logic
  render(g) {}         // g = CanvasRenderingContext2D (logical coords already applied)
  destroy() {}         // remove listeners, kill tweens
  // optional: onPause(), onResume(), onResize()
}
```
Rules: a mechanic must not import anything from `games/` or know subject-specific facts. All text, colours, names, speeds, counts come from `config` with sane defaults. It gets items only via `ctx.nextItem()` and grades only via `ctx.answer()`. It must handle all item types it declares and throw a clear error in `init()` if the content pack cannot supply them. Mechanics may show questions in-canvas (gates, enemies carrying answers) or via `overlay.showQuestion`; either way wrong answers must route through `ctx.feedback` or an equivalent in-canvas card that shows the explanation and blocks until dismissed.

## 5. Game contract: `games/<game-id>/`

`index.html` (minimal, standalone):
```html
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Fraction Fortress</title><link rel="stylesheet" href="../../kit/ui/theme.css">
<style>html,body{margin:0;height:100%;background:var(--eg-bg)}#game{position:fixed;inset:0}</style></head>
<body><div id="game"></div><script type="module" src="./game.js"></script></body></html>
```
`game.js`:
```js
import { createGame } from '../../kit/kit.js';
import { Mechanic } from '../../mechanics/tower-defense/mechanic.js';
import { content } from './content.js';
const manifest = await (await fetch('./manifest.json')).json();
createGame({ container: document.getElementById('game'), manifest, Mechanic, content, config: { /* theme */ } });
```

### 5.1 `manifest.json`
```json
{
  "id": "fraction-fortress", "title": "Fraction Fortress", "tagline": "Hold the wall with equivalent fractions.",
  "subject": "math", "grades": [4, 5], "gradeBand": "elementary",
  "topics": ["math.4.fractions"], "skills": ["math.4.fractions.equivalent", "math.4.fractions.compare", "math.5.fractions.add-unlike"],
  "mechanic": "tower-defense", "genre": ["strategy", "arcade"], "duration": "6-9 min",
  "controls": ["mouse", "touch", "keyboard"], "description": "One paragraph.",
  "learningGoals": ["Recognise equivalent fractions", "..."], "howToPlay": ["...", "..."],
  "thumbnail": "thumb.svg", "version": "1.0.0", "status": "flagship"
}
```
`subject` is one of `math | science | ela | social | cs | languages | arts`. `gradeBand` is one of `early (1-2) | elementary (3-5) | middle (6-8) | high (9-12)`. Skill ids should exist in `curriculum/map.json`; if the curriculum is still being written, follow the id convention in section 7 and the reviewer reconciles.

## 6. Content Pack contract: `games/<game-id>/content.js`

```js
import { makeChoices, item } from '../../kit/learn/content.js';
export const content = {
  id: 'fraction-fortress-content', subject: 'math', grades: [4, 5],
  skills: {
    'math.4.fractions.equivalent': { name: 'Equivalent fractions', types: ['choice'] },
    // ...
  },
  // Must be pure and deterministic given rng. difficulty 1..5. type is one of the skill's types.
  generate(rng, { skill, difficulty, type, choices = 4 }) { return item({ /* ... */ }); },
};
```
Item shapes. `type` is required; every item also has `skill`, `difficulty`, `explanation`, optional `hint`, optional `visual` (free-form data a mechanic may draw, e.g. `{ kind: 'tenframe', n: 7 }`), optional `speech` (text to speak if different from prompt), optional `tags`.
```
choice   { prompt, choices: string[], correct: index }   // choices unique
numeric  { prompt, answer: number, tolerance = 0, unit }
text     { prompt, answer: string | string[], caseSensitive = false }        // spelling/typing
sort     { prompt, items: [{ text, category }], categories: string[] }
sequence { prompt, items: string[] /* correct order */ }
match    { prompt, pairs: [[left, right], ...] }
build    { prompt, parts: string[], target: string[] /* ordered subset of parts */ }
```
`kit/learn/content.js` exports: `item(obj)` (validates + fills defaults, throws on bad shape), `makeChoices(rng, correct, distractors, n)` (dedupes by string, drops distractors equal to correct, shuffles, returns `{ choices, correct }`), `grade(item, chosen)` (pure grader for all types; `chosen` is index for choice, number for numeric, string for text, array of categories/indices for sort/sequence/match/build), `correctText(item)` (human-readable correct answer), `fmtFraction(n, d)`, `gcd(a, b)`, `lcm(a, b)`, `simplify(n, d)`.

## 7. Curriculum map: `curriculum/map.json`

```json
{ "version": 1, "subjects": [
  { "id": "math", "name": "Mathematics", "color": "#4F7CFF", "icon": "sigma",
    "grades": { "1": { "topics": [
        { "id": "math.1.add-sub-20", "name": "Addition and subtraction within 20",
          "skills": [ { "id": "math.1.add-sub-20.add", "name": "Add within 20", "description": "..." } ] } ] } } } ] }
```
Ids: `subject.grade.topic-slug` and `subject.grade.topic-slug.skill-slug`. Grade keys "1".."12". Each grade has 5-8 topics; each topic 2-4 skills. Subjects and colours:

| id | name | colour |
|---|---|---|
| math | Mathematics | #4F7CFF |
| science | Science | #22C55E |
| ela | English Language Arts | #F59E0B |
| social | Social Studies (history, civics, geography, economics) | #EF4444 |
| cs | Computer Science and Digital Literacy | #8B5CF6 |
| languages | World Languages (Spanish first) | #EC4899 |
| arts | Arts and Music | #14B8A6 |

## 7.1 `grade(item, chosen)` argument shapes (used by `ctx.answer` and `tools/content-check.mjs`)

| type | `chosen` | correct when |
|---|---|---|
| choice | index into `choices` | `chosen === item.correct` |
| numeric | number | `Math.abs(chosen - answer) <= tolerance` |
| text | string | normalised (trim, collapse spaces, case per flag) equals `answer` or any element of the `answer` array |
| sort | array of category strings aligned to `items` | every `chosen[i] === items[i].category` |
| sequence | array of indices into the ORIGINAL `items` in the player's order | equals `[0, 1, ..., n-1]` |
| match | array where `chosen[i]` = index of the right-hand entry matched to left `i` | equals identity |
| build | array of strings (assembled parts) | deep-equals `target` |

Mechanics shuffle for display themselves (with `ctx.rng`) and map back to original indices before calling `ctx.answer`.

## 9. Test hooks (mandatory, used by `tools/smoke.mjs`)

- `createGame` sets `window.__eduGame = handle`. `handle.ctx` is the ctx object; `handle.state()` returns `{ phase: 'start'|'playing'|'paused'|'ended', score, frame, seed }`.
- The container element carries `data-eg-phase="<phase>"` kept in sync.
- The canvas element has `data-eg="canvas"`.
- Overlay buttons carry `data-eg` attributes: `start`, `replay`, `exit`, `resume`, `restart`, `pause`, `feedback-dismiss`, `choice` (each choice button, with `data-index`), `submit` (numeric/text), `hint`, `mute`.
- `kit/learn/content.js`, `kit/learn/adaptive.js`, `kit/core/utils.js` and every `games/*/content.js` must be importable in Node with no top-level `window`/`document` access, so tools can test them headlessly.

## 8. Definition of Done for a game
- `node --check` passes on mechanic.js, content.js, game.js.
- `node tools/content-check.mjs <game-id>` passes (200 generated items valid, no duplicate choices, no accidentally correct distractors, all skills x difficulties 1-5 produce items).
- `node tools/smoke.mjs <game-id>` passes: page loads, Start works, 10 s of simulated play with zero page/console errors, screenshot is not blank.
- Start, play, end, replay loop works; Esc pauses; resize keeps state; touch controls present.
- At least 3 escalating stages and a finale moment; visible progress; HUD score/streak.
- Every wrong answer shows correct answer + explanation; hint after 2 misses on a skill.
- All canvas text fits; nothing overlaps at 960x540; readable at 375px-wide phone (letterboxed).
- XP awarded; end screen shows mastery deltas; best score saved.
- `REVIEW.md` written by the reviewer with verification evidence.
