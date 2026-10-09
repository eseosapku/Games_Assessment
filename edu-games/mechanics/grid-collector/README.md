# grid-collector — Grid Collector

A snake-style grid chassis in which the only way to score is to eat the tile that answers the rule. Content-agnostic: it never knows what a "producer" or a "synonym" is; every name, colour, sprite style, speed, count and string comes from `config`.

## What it does

- A creature (head + segments) moves cell by cell on a `gridCols × gridRows` grid, interpolated for smooth motion. Steering: arrow keys / WASD, swipe, tap zones (tap anywhere and the creature turns toward the tap), and **tap-to-target** (tap/click a tile, or press its number key 1-4, and the creature routes itself to that tile; any steering input cancels it). At a wall the creature waits. Self-collision is ignored.
- Each `choice` item is one "round": its `prompt` becomes the rule in the bottom-left panel (and flashes over the grid for 1.5 s), its `choices` become 2-cell word tiles scattered on the grid, each with a number + shape badge. Eating a tile calls `ctx.answer(item, index)`.
  - Correct: pop + coin (pitch rises with the streak), particle burst, floating points, the creature grows one segment, the growth bar fills, remaining tiles poof away, next item after 0.45 s. Streak toasts at 3/5/9…; HUD combo.
  - Wrong: hit + buzz, red flash on the tile and screen, small shake, the creature loses two segments and one notch of growth, then `ctx.feedback(item, index, false, { blocking: true })` shows the kit's card (correct answer + explanation) until dismissed. Then a fresh item.
  - Hint: when `ctx.adaptive.needsHint(skill)` the item's `hint` is drawn above the rule panel for 8 s and the correct tile gets a soft golden pulse.
- Chasers (`stage.chaser` sprite) step toward the head every `chaserInterval` seconds with some randomness. Touching one costs a heart, one segment and 2.2 s of invulnerability; the chaser respawns far away. At zero hearts the current level restarts (growth 0, hearts refilled) with a banner; the run never ends early. A shield absorbs one hit.
- Sun orbs (`bonusEvery`) give `bonusValue` points and slow chasers for `bonusSlow` seconds.
- Growth reaching `growthToLevel` levels the creature up (next `stage.levels[i]`: new name, sprite, colour, speed ×`speedPerLevel`). After the last level the stage is cleared: fanfare, optional **shield card**, then the next stage (sky crossfade, new deco, new chaser count, hearts refilled). After the last stage comes the **finale**: storm overlay (wind streaks, lightning flashes, `boss` music), chasers +1 and faster, items at difficulty +1, and `finale.steps` correct eats in a row light a chain of links in the rule panel. A wrong eat shows the card and the step is retried. Success: "restored" banner, confetti, `ctx.endGame`.
- Shield card: a `sort` item answered in-canvas. Each entry is shown one at a time with the categories as big numbered buttons (keys 1-N or tap). The whole sort is graded with `ctx.answer(item, categoriesArray)`; correct grants a shield + 100×difficulty points, wrong shows the blocking feedback card.
- HUD: score, streak, combo, hearts, level label (`Stage · Level` or the finale name) and overall progress (`stages × levels + finale`).

## Item types consumed

| type | where | how it is presented |
|---|---|---|
| `choice` | every round | prompt = rule in the bottom panel; choices = grid tiles; `visual` of kind `chain` (`{ nodes, missing }`) or `web` (`{ nodes, edges: [[food, eater], …] }`) is drawn in the right half of the panel; `speech`/prompt spoken when `speak` applies |
| `sort` | between stages (only if `shieldCards` is true) | in-canvas card, one entry at a time, categories as buttons |

`init()` throws if the pack has no `choice` skill, or if `shieldCards` is true and no skill offers `sort`.

## Config keys

| key | type | default | meaning |
|---|---|---|---|
| gridCols | int | 18 | grid columns (8-24) |
| gridRows | int | 7 | grid rows (5-12) |
| cellSize | number | 50 | cell size in logical px; the grid is centred horizontally, 64 px from the top, with the rule panel below |
| tilesPerSecond | number | 2.4 | creature speed at the first level, cells per second |
| speedPerLevel | number | 1.07 | speed multiplier applied at every level-up (and once more in the finale) |
| maxTilesPerSecond | number | 4.4 | speed cap |
| startLength | int | 3 | segments at the start of each stage |
| maxLength | int | 10 | maximum segments |
| growthToLevel | int | 4 | correct eats per level |
| lives | int | 3 | hearts per stage; 0 hearts restarts the level |
| chaserBase | int | 1 | chasers in stage 1 |
| chaserPerStage | int | 1 | chasers added per stage |
| maxChasers | int | 3 | chaser cap |
| chaserInterval | number | 0.8 | seconds between chaser steps at stage 1 |
| chaserSpeedPerStage | number | 0.12 | fraction removed from chaserInterval per stage |
| chaserRandomness | number | 0.3 | probability of a random chaser step |
| bonusEvery | number | 10 | seconds between sun orbs (0 disables) |
| bonusValue | int | 25 | points per orb |
| bonusSlow | number | 4 | seconds chasers are slowed after an orb |
| shieldCards | bool | true | sort card between stages |
| finale | object | `{ steps: 5, name: 'The Storm', sub: 'Eat {n} right answers in a row to restore balance!' }` | finale length and strings (`{n}` is replaced by steps) |
| finaleSkills | string[] | `[]` | skills drawn in the finale; empty = adaptive picker |
| stages | array | 3 generic stages | `{ name, deco, sky: [top, bottom], ground, accent, levels: [{ name, sprite, color }], chaser: { name, sprite, color } }` |
| tilePalette | string[4] | greens/golds | tile border colours (badge shapes circle/square/diamond/triangle are added so colour is never the only cue) |
| labels | object | English strings | `rule, grow, stage, levelUp, stageClear, caught, shield, shieldCard, shieldHint, storm, restored, bonus, notFood, yum, tapHint, keyHint, watchOut, link` |
| speak | `'auto'`/bool | `'auto'` | auto = speak prompts for the early band or when `manifest.grades[0] <= 3` |
| font | string | Nunito stack | canvas font family |
| touchDpad | bool | false | also draw a D-pad of touch buttons on touch devices (tap-to-target, tap zones and swipe are always on) |

Sprite styles for `levels[].sprite` and `chaser.sprite`: `bug`, `fish`, `frog`, `bird`, `cat`, `lizard`, `blob`. Chasers are drawn with angry brows and teeth automatically.

Deco styles for `stage.deco`: `pond`, `ocean`, `savanna`, `meadow`, `forest`, `snow`, `cave`.

## Re-skin notes

1. Write a content pack whose `choice` prompts read as rules ("Which word means HAPPY?", "Which shape has 4 equal sides?") and whose choices are short labels (tiles wrap to two lines of 18 px in ~90 px; longer labels auto-shrink).
2. Pick 3 stages × 3 levels of names/sprites/colours that fit the subject (Synonym Snake: bookworm → librarian → poet; Geometry Garden: seed → sprout → tree), one chaser per stage, a sky pair and `deco` per stage.
3. Override `labels` so the banners speak the subject's language ("You are now the …", "FOOD WEB STORM" → "WORD STORM").
4. If the pack has no `sort` skill set `shieldCards: false`; if it has one, the card is the natural place for the subject's classification skill.
5. Optional `visual` kinds `chain` and `web` are drawn by the mechanic; any other kind is ignored (the organism card shows instead).
6. Keep `tilesPerSecond` ≤ 2.6 for grades 1-3 and consider `growthToLevel: 3` for a shorter session; 3 × 3 × 4 + 5 ≈ 41 decisions ≈ 6-8 minutes.
