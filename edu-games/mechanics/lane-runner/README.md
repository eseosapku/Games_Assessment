# lane-runner — Lane Runner

A content-agnostic pseudo-3D lane runner. The hero auto-runs down a track with 2 or 3 lanes. Every few seconds a prompt appears in the banner at the top (spoken aloud for the early band) and one gate per lane rolls toward the player, each carrying a candidate answer. **Steering into a gate is the answer**: there is no separate "answer" gesture.

- Correct gate: speed boost with speed lines, confetti burst, floating `+N`, combo meter (`hud.combo`) from streak 2, `powerup` at streak 5 (x2 XP), `combo` at 10.
- Wrong gate: the run freezes, the hero stumbles and loses a heart, the chosen gate flashes red with a cross, the correct gate glows green with a tick, then an **in-canvas feedback card** shows "Not quite", the correct answer, the item's `explanation` and its `visual`. The card blocks until a tap or key press (armed after 0.6 s). For the early band the answer and explanation are also spoken.
- After two misses on a skill (`ctx.adaptive.needsHint`) the item `hint` is shown under the banner as the next gates of that skill approach (and spoken with the prompt).
- Coins run in trails between gate sets (ascending-pitch pings, `coinPoints` each); optional rolling-log hazards cost points, never hearts.
- Session: `stages` biomes of `gatesPerStage` gate sets each, faster with a shorter decision window per stage, a "stage cleared" banner with the overall progress bar between them (hearts refill), then the finale.
- Finale **Bridge Builder**: a gap opens in the road; `finale.gates` correct answers in a row slam planks across it (shake + wood chips). A miss drops the plank, shows the card and replays the same item with its hint. Crossing the finished bridge triggers the fanfare and `ctx.endGame`.
- Hearts gone (outside the finale): with `livesOut: 'retry-stage'` the stage restarts once with full hearts ("Try this part again"); a second time the hearts simply refill and the run continues (never a wall). With `'end'` the run ends.

The mechanic imports only from `kit/kit.js`, gets items only via `ctx.nextItem()` and grades only via `ctx.answer()`.

## Item types consumed

`meta.itemTypes = ['choice']`, `meta.choices = 3`. `init()` throws unless the content pack declares at least one skill with type `choice`.

- Each gate set requests `ctx.nextItem({ type: 'choice', choices: lanes })`. If an item has more choices than lanes, the correct answer plus `lanes - 1` random distractors are shown; if it has fewer, only that many gates are spawned.
- `item.prompt` goes in the banner (40 px, auto-shrunk to fit), `item.speech || item.prompt` is spoken when `speak` is on, `item.hint` is shown after two misses, `item.explanation` is on the card.
- `item.visual` is drawn on the card when `kind` is one of:
  - `tenframe` `{ n, m?, remove? }` — n blue dots, m orange dots, the last `remove` blue dots crossed out; two frames when n + m > 10.
  - `numberline` `{ min, max, jumps?: [[from, to], ...], jumpLabel?, marks?: number[], point?, from?, jump? }` — ticks and labels sized by range; orange hop arcs labelled with the difference (or `jumpLabel`); blue dots at `marks`; a green dot at `point`.
  - `baseten` `{ tens, ones }` — tens rods and unit cubes.
  Other kinds are ignored (the explanation text still carries the content).

## Controls

Arrow keys / A, D move one lane; 1-3 (and numpad) jump to a lane; swipe left/right; tap a lane (left/centre/right third of the canvas below the banner). On touch devices two 112x72 px `◀ ▶` buttons are added at the bottom corners. Any key or tap dismisses the feedback card; banners are skippable after 0.9 s. Escape / P pause (kit).

## Config keys (`defaultConfig`)

| key | type | default | meaning |
|---|---|---|---|
| lanes | int | 3 | 2 or 3 lanes; one gate per lane |
| approachSec | number | 4.5 | seconds a gate set takes from spawn to the hero at stage 1 |
| approachPerStage | number | 0.84 | approach multiplier per stage (stage i uses approachSec * approachPerStage^i) |
| minDecisionSec | number | 2.5 | floor for the approach time (early band: keep >= 3) |
| gapSec | number | 1.6 | seconds between a set passing and the next spawning |
| lives | int | 3 | hearts per stage (refilled each stage and before the finale) |
| livesOut | string | 'retry-stage' | `'retry-stage'` or `'end'` |
| stages | int | 3 | number of stages; stage i uses `biomes[i % biomes.length]` |
| gatesPerStage | int | 12 | gate sets per stage |
| biomes | array | meadow / river / mountain | `{ name, sky:[top,bottom], far, farStyle:'hills'|'trees'|'peaks', ground, groundDark, road, roadLine, water:bool, props:[kinds], music:'calm'|'upbeat'|'tense'|'boss', accent }`; prop kinds: `lollipop`, `pine`, `bush`, `flower`, `reed`, `rock` |
| coinsBetweenGates | bool | true | coin trails after each gate set |
| hazards | bool | false | rolling logs between gates (score penalty only) |
| hazardsFromStage | int | 2 | first stage (1-based) with hazards |
| heroStyle | string | 'critter' | `'critter'` (ears + tail), `'robot'` (box body, antenna, jet on boost), `'blob'` |
| heroColor | hex | '#ff9f43' | hero body colour |
| heroAccent | hex | '#fff4e0' | belly / ear colour |
| gateStyle | string | 'arch' | `'arch'`, `'flag'` or `'ring'` |
| gateColors | hex[] | 3 candy colours | gate colour per lane |
| coinColor | hex | '#ffd54a' | coin colour |
| pointsPerGate | int | 50 | base points per correct gate |
| pointsPerDifficulty | int | 10 | extra points per item difficulty level |
| coinPoints | int | 5 | points per coin |
| hazardPenalty | int | 20 | points lost per hazard hit |
| finale | object/null | `{ type:'bridge', gates:3, skills:null, pointsPerPlank:150 }` | `skills` limits finale items to those skill ids; `null` disables the finale |
| lifeBonusXP | int | 10 | bonus XP per heart left at the end |
| finaleBonusXP | int | 50 | bonus XP when the bridge is completed |
| speak | 'auto'/bool | 'auto' | `'auto'` speaks for `gradeBand === 'early'` only |
| labels | object | see file | every UI string: `getReady, go, stageClear ({name}), nextStage ({name}), tryAgain, finaleTitle, finaleIntro ({n}), bridgeDone, notQuite, answerIs, tapToContinue, tapToSkip, hazard, gatesStat, coinsStat, bridgeStat, stageStat` |

Points for a correct gate are doubled while `ctx.streak >= 5`. `ctx.endGame` receives `stats`: gates passed, coins, stage reached, bridge planks.

## Re-skin notes

Everything a new subject needs is in `config`:

1. **Biomes**: swap names, palettes, `farStyle`, `props` and `music` per stage (e.g. a classroom, a beach, outer space). Keep `accent` readable on dark banners.
2. **Hero**: `heroStyle` + `heroColor` give a fox, a robot or a blob without touching the mechanic.
3. **Gates**: `gateStyle` changes the silhouette; `gateColors` the palette.
4. **Labels**: translate or rename the finale ("Bridge Builder" can become "Rocket Launch" with the same plank logic; the gap is drawn generically).
5. **Pace**: `approachSec`, `approachPerStage`, `minDecisionSec`, `gapSec`, `gatesPerStage`. Early band: keep `minDecisionSec >= 3`.
6. **Content**: any `choice` pack with 3 choices works. Supply `speech` when prompts have symbols, `visual` on difficulty 1-2 using the kinds above, short prompts (the banner shrinks text down to fit but under 60 characters reads best).
7. **Speech**: `speak: true` for world-language packs regardless of band.

Catalog re-skins that fit this chassis: Letter Sound Lane (ela 1), Weather Watch Run (science 1-2), Colores Corredor (languages 1-2), Pattern Pixel Run (cs 1-2), Helper Highway (social 1-2), Vocabulary Velocity (ela 6-7).
