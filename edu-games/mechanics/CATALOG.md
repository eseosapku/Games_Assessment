# Mechanics Catalog

Every game in `edu-games` is one **Mechanic** (a content-agnostic chassis in `mechanics/<id>/mechanic.js`) plus one **Content Pack** plus a **Config/Theme**. This catalog documents the 13 mechanics built in Phase 1 and the 20 planned mechanics named in `docs/PHASE1_PLAN.md`. It is the menu that `docs/PHASE2_BACKLOG.md` orders from.

The binding contract for all of them is `docs/ARCHITECTURE.md` (section 4 for the mechanic contract, section 2.2 for pedagogy). Where this catalog and the contract disagree, the contract wins.

How to read a section:

- **Hook** is the one sentence a player would use to describe the game.
- **Core loop** is what the player does every 3-10 seconds. If the learning decision is not in that loop, the mechanic fails the "learning is the mechanic" test (`docs/GAME_DESIGN_GUIDE.md` section 2).
- **Learning decision** names the item types consumed, how the question is presented without stopping play, and how a wrong answer is shown and explained.
- **Config knobs** are the keys a game's `game.js` passes in `config`. For built mechanics the `configSchema` in `mechanic.js` is the source of truth; the table here is the design intent and must stay in sync.
- **Re-skins** are written as `Game Title - subject - grades - skills focus - twist` and are ready to paste into a backlog row.

Pace vocabulary used below: **fast** (continuous motion, decisions every 2-4 s), **medium** (short bursts of action, decisions every 4-8 s), **slow** (turn-based or self-paced, decisions every 8-20 s), **relaxed** (no fail state, timing is forgiving).

## Comparison table

| id | name | pace | primary input | item types consumed | best grade bands | ideal subjects | built in Phase 1 |
|---|---|---|---|---|---|---|---|
| lane-runner | Lane Runner | fast | lane steer (arrows / swipe / tap lane) | choice (3) | early, elementary | math, ela, languages, science, social, cs, arts | yes |
| tower-defense | Tower Defense | medium, wave-based | tap slot, then choose | choice (4) | elementary, middle, high | math, science, ela, languages, arts | yes |
| racing | Racing | fast | steer + drive onto pad | choice (3) | elementary, middle, high | math, science, ela, social, languages | yes |
| grid-collector | Grid Collector | medium, snake-like | 4-direction | choice (in-canvas), sort | early, elementary | science, math, ela, social, languages | yes |
| merge-grid | Merge Grid | medium, drop-puzzle | drag / tap tiles | build, choice | elementary, middle, high | science, math, ela, cs, arts | yes |
| turn-battle | Turn Battle | slow with attack timer | tap letter tiles / choose | text, choice | early, elementary, middle, high | ela, math, science, cs | yes |
| deduction | Deduction | medium, timed puzzle | tap the word / element | choice, text | elementary, middle, high | ela, math, science, social, cs, languages, arts | yes |
| card-battler | Card Battler | slow, turn-based | select card | choice, sequence | middle, high | ela, math, science, social, arts | yes |
| map-conquest | Map Conquest | slow, strategy turns | tap region, then choose / order | choice, sequence | elementary, middle, high | social, math, science, ela, cs, arts | yes |
| tycoon-sim | Tycoon Sim | slow, round-based | sliders + choice | choice, numeric | elementary, middle, high | social, math, science, ela, cs, languages, arts | yes |
| block-coding | Block Coding | slow, puzzle | drag blocks, run | build, choice | elementary, middle | cs, math, languages, arts | yes |
| conveyor-sort | Conveyor Sort | fast | drag to bin / number key | sort, choice | elementary, middle | languages, science, social, cs, arts | yes |
| rhythm-tap | Rhythm Tap | fast, timing | tap on beat | build, choice | early, elementary, middle | arts, ela, languages, cs | yes |
| physics-launcher | Physics Launcher | medium, aim-and-fire | drag to aim, release | numeric, choice | middle, high | math, science | no |
| platformer | Platformer | medium, movement | run / jump | choice | early, elementary | science, social, arts, ela | no |
| breakout-bubble | Breakout Bubble | fast, arcade | paddle / aim shooter | choice | elementary, middle | math, ela, science | no |
| word-grid | Word Grid | slow, search | drag-select letters | text | elementary, middle | ela, languages, science | no |
| escape-room | Escape Room | slow, exploration | tap hotspots, then solve | choice, text, match, sequence | middle, high | ela, social, science | no |
| timeline-sequencer | Timeline Sequencer | medium, drag-ordering | drag cards | sequence | early, elementary, middle, high | social, ela, math, science, languages | no |
| system-sim | System Sim | slow, sliders | sliders, then predict | numeric, choice | middle, high | science, social, math | no |
| dungeon-crawler | Dungeon Crawler | medium, room-to-room | 4-direction + choose | choice, text, match | middle, high | science, social, cs, ela | no |
| quiz-show-wager | Quiz Show Wager | slow, confidence bets | pick wager, then choose | choice, numeric | elementary, middle, high | any | no |
| memory-pairs | Memory Pairs | slow, memory | tap cards | match | early, elementary | languages, ela, math, science | no |
| geometry-construct | Geometry Construct | slow, precise | drag points / tools | build, numeric | middle, high | math | no |
| typing-shooter | Typing Shooter | fast, typing | keyboard typing | text | elementary, middle, high | ela, cs, languages | no |
| stack-drop | Stack Drop | medium, falling blocks | move / rotate / drop | build, sequence | early, elementary, middle, high | math, ela, science, cs, social | no |
| circuit-connect | Circuit Connect | slow, wiring puzzle | drag connections | match, build | elementary, middle, high | science, social, ela, cs | no |
| story-choice | Story Choice | slow, narrative | choose option | choice | middle, high | ela, languages, social, arts | no |
| idle-tycoon | Idle Tycoon | slow, idle | tap upgrades | choice, numeric | middle, high | social, math, science | no |
| trace-draw | Trace Draw | medium, drawing | pointer drawing | build (strokes), choice | early, elementary, middle | arts, ela, math | no |
| pattern-echo | Pattern Echo | medium, memory / audio | tap pads in sequence | sequence | early, elementary | arts, ela, languages, math | no |
| auction-bid | Auction Bid | medium, estimation party | bid buttons | numeric, choice | elementary, middle, high | math, social, science | no |
| fishing-collect | Fishing Collect | relaxed, timing | cast / hold / release | choice, sort | early, elementary, middle | ela, languages, science, math | no |

Genre coverage across the 33: arcade (lane-runner, conveyor-sort, breakout-bubble, typing-shooter), puzzle (merge-grid, word-grid, stack-drop, circuit-connect, geometry-construct), strategy (tower-defense, map-conquest), simulation (tycoon-sim, system-sim), RPG and roguelite (turn-battle, dungeon-crawler), rhythm (rhythm-tap, pattern-echo), party (quiz-show-wager, auction-bid), idle (idle-tycoon), physics (physics-launcher), deduction (deduction, escape-room), narrative (story-choice), sports and racing (racing, fishing-collect), builder (block-coding, stack-drop), card (card-battler, memory-pairs), board (map-conquest), platformer (platformer), drawing (trace-draw).

---

# Part A. Mechanics built in Phase 1

## 1. lane-runner — Lane Runner

- **id:** `lane-runner`
- **Hook:** Steer through the gate that answers the prompt; every gate is a decision at speed.

**Core loop.** The hero auto-runs along a three-lane track whose speed creeps up. Every 3-5 seconds a prompt appears in a fixed banner at the top (spoken aloud for early grades) and three gates roll toward the player, one per lane, each showing a candidate answer. The player steers with arrows / A-D, a swipe, or a tap on a lane; passing through a gate commits the answer. Correct: a burst of speed, coins, combo +1. Wrong: the hero stumbles, loses a heart, the world slows to a stop and a feedback card with the item's visual appears; tap to continue. Between gates, coins and the occasional hazard keep hands busy without asking anything.

**Learning decision.** Consumes `choice` items with 3 choices. The prompt sits in the banner and the gate labels are large (28 px or more) so the eyes never leave the track; the gate itself is the answer button. Wrong answer: the run freezes, the chosen gate flashes red and the correct gate glows green, a card shows the correct answer, the `explanation` and the item `visual` (ten-frame, number line, picture); dismiss by tap / Enter / Space. After two misses on a skill the `hint` is shown under the banner as the next gates of that skill approach.

**Difficulty levers.** Run speed (gate approach time 4.5 s down to 2.5 s); minimum decision window; adaptive item difficulty; distractor closeness (off by one vs off by ten); hazards between gates on/off; two lanes instead of three for difficulty 1 in early grades; prompt spoken only (no text) at the top of a phonics ladder.

**Juice moments.** Speed lines and confetti when a gate is cleared; combo meter changes colour at 5 and 10; ascending-pitch coin pings; "x2" floating text during a streak; biome wipe transition with fanfare; finale planks slam into place with screen shake.

**Session structure.** 3 biomes of ~12 gates each (about 2 minutes per biome), each faster with a shorter window; a 5-second breather with a "biome cleared" banner and the progress bar between biomes. Finale: **Bridge Builder** — three consecutive gates with no coins; every correct gate extends a bridge over a gap, a miss drops a plank and replays the item with its hint; crossing triggers the fanfare and the end screen.

**Best fit.** Early and elementary. Any subject with quick-recall items: number facts, phonics, vocabulary (including world languages), science classification, map symbols, pattern completion.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| lanes | int | 3 | number of lanes (2 or 3) |
| baseSpeed | number | 220 | logical px per second at stage 1 |
| speedPerStage | number | 1.15 | multiplier applied each stage |
| gateIntervalSec | number | 4.0 | time between gate sets at stage 1 |
| minDecisionSec | number | 2.2 | floor for gate approach time |
| lives | int | 3 | hearts |
| stages | int | 3 | number of biomes |
| gatesPerStage | int | 12 | gates per biome |
| biomes | array | meadow/river/mountain | `{ name, sky, ground, accent }` per stage |
| coinsBetweenGates | bool | true | coin trails between gate sets |
| hazards | bool | false | rolling obstacles between gates |
| finale | object | `{ type: 'bridge', gates: 3 }` | finale definition |

**Re-skins.**
- Letter Sound Lane - ela - 1 - beginning sounds, rhyming, CVC words - the prompt is a spoken sound and every gate speaks its letter as you pass
- Weather Watch Run - science - 1-2 - weather, seasons, dressing for weather - the sky switches to the weather you chose the moment you pass the gate
- Colores Corredor - languages - 1-2 - colours, numbers, animals - Spanish spoken prompt, picture-only gates, gates repeat the word
- Pattern Pixel Run - cs - 1-2 - patterns, sequencing, algorithm steps - the hero's trail paints the pattern you built
- Helper Highway - social - 1-2 - community helpers, needs vs wants, map symbols - the town behind you fills with the helpers you chose
- Vocabulary Velocity - ela - 6-7 - context clues, connotation, shades of meaning - the banner sentence hides after one second at the top difficulty to reward reading speed

## 2. tower-defense — Tower Defense

- **id:** `tower-defense`
- **Hook:** Build towers by answering, and let the towers answer for you by targeting enemies by property.

**Core loop.** Enemies carrying labelled banners march along a path toward the base. The player taps an empty slot beside the path; a card appears (4 choices) and a correct answer builds a tower there, with faster answers producing a stronger tower. Each tower shows a targeting rule ("hits fractions < 1/2", "hits nouns"); enemies whose banner matches the rule take damage when they pass. Between waves the player spends gold to upgrade a tower by answering a harder card. Enemies that reach the base cost a life; the wave counter and progress bar sit in the HUD.

**Learning decision.** Consumes `choice` items with 4 choices. Building is the recall decision (card in the DOM overlay, engine paused, 1-4 keys); placing is the comparison decision made in-canvas, because the player must predict which enemies the tower's rule will catch. Wrong card: the slot stays empty for a 3-second cooldown, the card flips to show the correct answer, the `explanation` and the item `visual` (fraction bar, cell diagram); dismiss by tap. An enemy that a tower wrongly ignores is not a wrong answer and must not be penalised beyond the base damage.

**Difficulty levers.** Enemy count and HP per wave; path length (decision time); number of tower slots; card time limit (none, 15 s, 8 s); rule subtlety (`< 1/2` vs `between 1/3 and 2/3`); boss shield that requires a specific conversion; adaptive item difficulty.

**Juice moments.** Tower rises from the ground with dust and a "thunk"; projectile trails; enemy pop with coin spray; wave-cleared banner with gold counter rolling up; tower upgrade flash; base shakes when hit; boss shield cracks in three stages.

**Session structure.** 6 waves in 3 phases (two waves each), each phase introducing a harder item type and a new enemy; a 10-second build phase before each wave with a visible countdown that can be skipped. Finale: **Boss wave** — a giant carrying a shield that only a correctly converted item (for example improper to mixed) can crack; three cracks and it falls, dropping a jackpot of gold.

**Best fit.** Elementary, middle and high. Subjects where items can be grouped by property: fractions and decimals, cell parts, parts of speech, verb conjugations, key signatures.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| waves | int | 6 | total waves |
| phases | int | 3 | wave groups that escalate items |
| slots | int | 6 | tower slots along the path |
| enemiesPerWave | int | 8 | base enemy count, grows per wave |
| enemySpeed | number | 60 | px per second at wave 1 |
| cardTimeLimitSec | number | 0 | 0 disables the card timer |
| lives | int | 5 | base HP |
| rules | array | from content tags | targeting rules shown on towers, each `{ label, test(itemTag) }` is supplied via config using content `tags` |
| bossWave | bool | true | final wave is a boss |
| theme | object | castle / goblins | sprites, path colour, base name |

**Re-skins.**
- Clock Castle - math - 1-2 - tell time to the hour and half hour, count coins, compare lengths - towers are clock faces that only fire at goblins carrying the time they show
- Cell Defense - science - 6-7 - organelles, plant vs animal cells, immune response - towers are organelles with real functions and pathogens are weak only to the organelle that actually fights them
- Theme Tower - ela - 6-8 - theme, character motivation, inference - passages march by and take damage only from the theme they truly express
- Verbo Volcán - languages - 7-8 - regular and irregular present tense, stem changers, reflexives - towers are subject pronouns that only hit lava sprites carrying a matching conjugation
- Theory Tower - arts - 9-10 - key signatures, interval quality, cadences - towers are keys and marching motifs take damage only from the key they belong to

## 3. racing — Racing

- **id:** `racing`
- **Hook:** Drive onto the boost pad that solves the sign and leave the AI karts behind.

**Core loop.** A top-down kart drives a looping track against three AI karts for three laps. Every 4-6 seconds a trackside sign shows a prompt ("3x - 4 = 11") and three boost pads appear ahead, one per track third, each marked with a candidate answer. The player steers with arrows / A-D / swipe and drives onto a pad; the correct pad fires a turbo, the wrong pad is an oil slick that spins the kart and shows a worked-solution card. Corners can be drifted for a small speed bonus so there is always something to do between signs. Position and lap are in the HUD.

**Learning decision.** Consumes `choice` items with 3 choices. The sign is read at speed, so prompts must be short; long prompts are shown in the top banner as well. Wrong pad: the kart spins (0.8 s), the game pauses with a card showing the correct value, the `explanation` with the worked steps, and the item `visual` (graph for slope items); dismiss by tap. Pit stops between laps use `overlay.showQuestion` for a harder "tune-up" item that upgrades top speed.

**Difficulty levers.** Kart speed; AI rubber-banding strength; sign-to-pad distance (decision time); turbo and oil-slick duration; number of pads (3, or 2 on difficulty 1); chain pads (two consecutive pads forming a two-step problem) in the final lap; adaptive item difficulty.

**Juice moments.** Turbo flame and speed lines; drift sparks; overtaking "whoosh"; lap banner; checkered-flag confetti; position change pulse in the HUD; chain-pad combo text.

**Session structure.** 3 tracks (one lap each in a short session, or 3 laps on one track), each with a harder skill set; pit-stop tune-up between laps. Finale: **Final lap chain pads** — the last lap replaces single pads with two-step chains worth double turbo; crossing the line in first with full chain accuracy triggers a podium with fireworks.

**Best fit.** Elementary to high. Equations, decimals, forces predictions, punctuation choices, article and adjective agreement, civics decisions.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| laps | int | 3 | laps per race |
| tracks | int | 3 | track layouts used across the session |
| aiKarts | int | 3 | opponents |
| baseSpeed | number | 260 | px per second |
| rubberBand | number | 0.5 | 0..1 AI catch-up strength |
| padLeadSec | number | 3.5 | seconds between sign and pads |
| turboSec | number | 2.0 | boost duration |
| spinSec | number | 0.8 | oil-slick spin duration |
| chainPadsFinalLap | bool | true | two-step chains on the final lap |
| pitStops | bool | true | tune-up item between laps |
| theme | object | kart / asphalt | sprites, track colours, pad art |

**Re-skins.**
- Decimal Derby - math - 4-5 - decimal place value, compare and round decimals, fraction-decimal equivalents - the track edge is a number line so the right pad is literally closest to the sign's value
- Derivative Drift - math - 11-12 - limits, derivative rules, tangent slope - drift corners draw the tangent line so the slope you pick is the slope you feel
- Force Field Racer - science - 4-5 - balanced and unbalanced forces, friction, gravity - the kart physically obeys the pad you chose so wrong predictions feel wrong
- Punctuation Pit Stop - ela - 4-5 - commas in lists, quotation marks, apostrophes - pads show three punctuated versions of the sign's sentence and pit stops swap in a harder rule per lap
- Artículo Autopista - languages - 6-7 - gender and articles, adjective agreement, ser vs estar - pads show el/la/los/las or adjective forms and drift corners add adjectives to the phrase
- Campaign Trail - social - 9-10 - Electoral College, voting rights, political parties - the lap map shows the electoral votes each pad choice wins or loses

## 4. grid-collector — Grid Collector

- **id:** `grid-collector`
- **Hook:** You are a snake that may only eat what the rule says; every move is a yes-or-no decision about the thing in front of you.

**Core loop.** A snake-like organism moves on a tile grid in a themed biome. The grid fills with labelled items; the HUD shows the current rule ("You are a grasshopper", "Eat synonyms of HAPPY"). The player steers with arrows / WASD / swipe / tap zones to eat valid items, which grow the snake and fill a growth bar; eating an invalid item shrinks the snake and shows a card explaining why. One or two chasers patrol and must be avoided, so routing matters. When the growth bar fills, the rule changes (the organism levels up, the biome shifts) and the valid set changes with it.

**Learning decision.** Consumes `choice` items rendered in-canvas: the item's `choices` are scattered on the grid as tiles and the `prompt` is the rule in the HUD; eating a tile calls `ctx.answer` with that index. Multiple items are live at once (typically 2 correct and 4 distractor tiles). Also consumes `sort` items between levels as a shield card in the overlay. Wrong tile: snake shrinks, movement pauses, the card shows the correct tiles pulsing on the grid, the `explanation` and `visual`; dismiss by tap. The next valid tile pulses gently if the skill needs a hint.

**Difficulty levers.** Snake speed (tiles per second); grid size; ratio of valid to invalid tiles; number and speed of chasers; rule complexity (one category vs two); tile labels as pictures vs words; adaptive item difficulty.

**Juice moments.** Chomp pop and particle burst; growth bar fill with a "level up the chain" transformation animation; biome colour shift; near-miss chaser whoosh; shield bubble on a correct sort; "balance restored" finale swirl.

**Session structure.** 3 biomes × 3 levels (rule changes), each biome adding a chaser and speed; a `sort` card between biomes grants a shield. Finale: **Web Storm** — arrows on screen show a network of relationships and the player must eat tiles in the correct order to restore it, with each correct eat lighting an arrow.

**Best fit.** Early and elementary. Food chains and habitats, shapes and attributes, synonyms and word families, map landforms, vocabulary by room or category.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| gridCols | int | 16 | grid columns |
| gridRows | int | 9 | grid rows |
| tilesPerSecond | number | 3 | snake speed at level 1 |
| speedPerLevel | number | 1.1 | multiplier per level |
| validTiles | int | 2 | correct tiles live at once |
| distractorTiles | int | 4 | incorrect tiles live at once |
| chasers | int | 1 | predators on screen at biome 1 |
| growthToLevel | int | 6 | valid eats per level |
| biomes | array | pond/savanna/forest | `{ name, bg, accent }` |
| shieldCards | bool | true | sort item between biomes |
| finale | object | `{ type: 'web', steps: 5 }` | ordered-eat finale |

**Re-skins.**
- Geometry Garden - math - 3-4 - area and perimeter, angle types, quadrilaterals, symmetry - the snake may only eat shapes matching the rule and each eaten shape plants a bed whose area is counted live
- Synonym Snake - ela - 3-4 - synonyms and antonyms, affixes, context clues - antonyms shrink you and the rule flips to antonyms when the biome changes
- Compass Collector - social - 2-3 - cardinal directions, map symbols, landforms - instructions arrive as directions ("go north two") and a wrong landform rotates the compass to show the way
- La Casa Collector - languages - 3-5 - rooms, furniture, prepositions of place - a spoken Spanish sentence names a room and position and only the matching item is edible
- Element Eater - science - 7-8 - metals vs non-metals, periodic groups - the rule is a group or property and the chasers are noble gases that never react

## 5. merge-grid — Merge Grid

- **id:** `merge-grid`
- **Hook:** Drop tiles and fuse them into the thing on the target list; a wrong fusion fizzes and tells you why.

**Core loop.** Tiles drop into a 6 × 7 grid one at a time (the player picks the column with arrows / tap). A target list on the right names 3-4 things to make (H2O, 24, "green", NOT gate output). The player drags or taps adjacent tiles to combine them; if the combination matches a target it fuses into a glowing result tile that scores and leaves the list; a combination that matches nothing fizzes, costs a few seconds and shows a card explaining the rule that was broken. Fused tiles can be merged again for higher-tier targets. The board filling to the top ends the run.

**Learning decision.** Consumes `build` items (parts = the tiles that can appear, target = the parts that form a valid result) and `choice` items for between-stage cards. The item `prompt` is the target label on the list; the player answers by assembling, and the mechanic maps the assembled parts back to `ctx.answer`. Wrong merge: tiles bounce apart, the board dims, a card shows the target decomposed correctly, the `explanation` (valence, factor pair, colour mix) and the `visual`; dismiss by tap. A hint reveals one correct part on the board.

**Difficulty levers.** Drop speed / idle timer; grid size; number of simultaneous targets; distractor tiles that fit no target; multi-step targets (a product of three, a two-fusion molecule); board pressure from junk tiles; adaptive item difficulty.

**Juice moments.** Fusion flash with ring pulse and "glow" tile; target struck off with a chime; chain-fusion combo text; board-clear bonus; fizz with purple smoke on a wrong merge; finale "balance" animation where both sides of the board light up.

**Session structure.** 3 stages (symbols only, then formulas or compound targets, then a rule twist such as ionic vs covalent); each stage clears the board and adds a tile type. Finale: **Balance the Reaction** — reactant tiles on the left must be merged into product tiles that balance the counts on the right under a soft timer.

**Best fit.** Elementary to high. Chemistry formulas, multiplication facts and factors, colour mixing, main idea and supporting details, logic gates.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| cols | int | 6 | grid columns |
| rows | int | 7 | grid rows |
| dropIdleSec | number | 6 | seconds before an idle drop happens |
| targetsVisible | int | 3 | targets shown at once |
| junkTileChance | number | 0.15 | probability a dropped tile fits no target |
| stages | int | 3 | stage count |
| targetsPerStage | int | 8 | targets to clear per stage |
| mergeMaxParts | int | 4 | max tiles in one fusion |
| finale | object | `{ type: 'balance', pairs: 3 }` | finale definition |
| theme | object | lab / atoms | tile art, fusion colour, names |

**Re-skins.**
- Multiplication Merge - math - 3-4 - multiplication facts, factors and multiples, primes - prime targets can only be made from 1 × p, teaching primes by discovery
- Color Mix Merge - arts - 1-2 - primary and secondary colours, tints and shades - only real mixes fuse and white or black tiles tint and shade
- Main Idea Merge - ela - 5-6 - main idea and details, summarising, text structure - detail tiles fuse into the main idea they support and an unrelated detail fizzes
- Gate Merge - cs - 9-10 - Boolean logic, logic gates, truth tables - merge input tiles through gate tiles so the output matches the truth-table row shown
- Fraction Fusion - math - 5-6 - add fractions with unlike denominators, simplify - tiles are fractions and only sums that simplify to the target fuse

## 6. turn-battle — Turn Battle

- **id:** `turn-battle`
- **Hook:** Your spells are answers; build the word or pick the right one before the monster's timer runs out.

**Core loop.** A turn-based duel against a silly monster. Each turn a picture appears with a spoken word (or a prompt), and the player either builds the answer from a tray of letter tiles (tap or type) or chooses from 3-4 spell cards. Casting a correct spell deals damage proportional to the item's length or difficulty, with a crit for a fast answer; a wrong spell makes the monster laugh and the correct answer is built on screen with the tricky part highlighted. The monster attacks on a visible timer bar, so speed matters but a slow correct answer still hits. Three monsters per dungeon, a boss at the end.

**Learning decision.** Consumes `text` items (spelling with tiles; the mechanic shuffles tiles and includes 1-2 decoy letters from the item's distractor list if present) and `choice` items. The question is the attack screen itself; nothing pauses. Wrong answer: a blocking card shows the correct spelling with the tricky letters pulsing, the `explanation` ("ai makes the long a sound in rain") and the `visual`; dismiss by tap. Hints reveal the first letter of the tricky part.

**Difficulty levers.** Monster timer length; monster HP and damage; decoy tile count; word length and rarity; whether the word is spoken only or also shown briefly; boss mechanics that require a specific skill (split into syllables); adaptive item difficulty.

**Juice moments.** Spell projectile with element colour and hit shake; damage numbers; monster hurt face and wobble; crit flash; tile snap sound as letters land; dungeon door opening transition; boss roar with screen shake and a slow-motion final blow.

**Session structure.** 3 dungeons of 3 monsters each; dungeons introduce harder skills; a potion (heal) is earned by a 5-streak. Finale: **Boss** with a special rule stated on its health bar ("only syllable splits hurt The Mumbler"); defeating it unlocks the end screen with a loot chest.

**Best fit.** Early to high. Spelling and phonics, vocabulary, forces and materials for early science, code output prediction, quadratic factoring at high school.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| dungeons | int | 3 | stage count |
| monstersPerDungeon | int | 3 | including the boss in the last |
| monsterTimerSec | number | 12 | attack timer at dungeon 1 |
| timerPerDungeon | number | 0.85 | multiplier per dungeon |
| playerHP | int | 5 | hearts |
| decoyTiles | int | 2 | extra letters in the tray |
| critUnderSec | number | 4 | fast answer crit threshold |
| bossRule | string | 'syllables' | skill tag the boss is weak to |
| monsters | array | goblin/slime/bat/mumbler | `{ name, color, hp, attack, sprite }` |
| speakPrompt | bool | true | call `ctx.speak` for each prompt |

**Re-skins.**
- Push Pull Playground - science - 1-2 - push and pull, sound and vibration, light and shadow, materials - monsters are stuck playground objects freed by choosing the right force or material action
- Code Duel - cs - 6-8 - loops, functions, Boolean logic, predicting output - spells are code snippets and the monster's counterspell is a bug you must spot
- Quadratic Quest - math - 9-10 - factor quadratics, quadratic formula, vertex and roots - the monster's HP bar is the parabola and its roots are the hit points you must land
- Vocab Vanquisher - languages - 6-7 - Spanish verbs and vocabulary - spells are built from syllable tiles and accents are tiles too
- Formula Fencer - science - 9-10 - chemical formulas, naming compounds - spells are built from symbol and subscript tiles

## 7. deduction — Deduction

- **id:** `deduction`
- **Hook:** Crack the lock pin by pin: tap the one word, step or clue that answers the puzzle while the laser timer sweeps.

**Core loop.** A noir heist (or any investigation skin). Each vault lock has 3-5 pins; each pin is a short puzzle presented in-canvas: a sentence whose words are tappable, a worked solution whose steps are tappable, a source document with tappable features. A laser timer sweeps across the lock; the player taps the element that answers the pin's instruction ("tap the adverb", "tap the step that breaks the order of operations"). A correct tap clicks the pin into place and the lock turns a notch; a wrong tap triggers an alarm tick (3 ticks and the guards arrive, costing a tool), and the sentence or solution is annotated to show the right answer. Opening the lock reveals the loot and the next room.

**Learning decision.** Consumes `choice` items where the `choices` are the tappable elements (the mechanic lays them out as the sentence or step list and keeps the original indices) and `text` items for "fix it" pins typed into a short field. Wrong tap: the element flashes red, the correct element highlights with a label (for example "adverb: quickly, it describes how"), the card shows the `explanation`; dismiss by tap. Hints dim the elements that are clearly not candidates.

**Difficulty levers.** Timer sweep speed; number of pins per lock; number of tappable elements (sentence length); alarm tolerance (3 ticks → 2); planted near-misses (two adverbs, only one modifying the verb); a "fix it" text pin instead of a tap pin; adaptive item difficulty.

**Juice moments.** Pin click with a satisfying mechanical sound; lock dial turning; laser sweep hum; alarm red flash with shake; vault door swinging open with loot sparkle; evidence board pin-and-string animation as skills are mastered; manuscript finale where each fixed error ink-stamps "CORRECTED".

**Session structure.** 3 buildings (museum, bank, mansion) with escalating sentence or problem complexity and one new pin type each; an evidence board between buildings shows mastery per skill. Finale: **The Manuscript** — a short paragraph with five planted errors; tap and fix all five before the sweep ends.

**Best fit.** Elementary to high. Grammar and punctuation, order of operations, data literacy, primary-source analysis, debugging, verb tense choice, composition critique.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| buildings | int | 3 | stage count |
| locksPerBuilding | int | 3 | locks per stage |
| pinsPerLock | int | 4 | pins per lock |
| sweepSec | number | 14 | timer per pin at stage 1 |
| sweepPerBuilding | number | 0.85 | multiplier per stage |
| alarmTicks | int | 3 | wrong taps before guards arrive |
| tools | int | 3 | lives |
| finaleErrors | int | 5 | planted errors in the manuscript |
| elementLayout | string | 'sentence' | 'sentence', 'steps', 'document' |
| theme | object | noir | palette, names, SFX set |

**Re-skins.**
- Order Vault - math - 5-6 - order of operations, evaluate expressions, exponents - each pin is one step of a worked evaluation and the wrong step is the pin
- Fault Line Files - science - 8 - plate boundaries, earthquakes and volcanoes, evidence - pins are evidence cards and the correct boundary type is the pin
- War Room Files - social - 9-10 - WWI and WWII causes, primary sources, propaganda - pins are propaganda posters and the technique is the pin
- Bug Vault - cs - 5-6 - debugging, tracing, conditionals - each pin is a short program with its wrong output and the buggy line is the pin
- Tiempo Detective - languages - 9-10 - preterite vs imperfect, subjunctive triggers, por vs para - pins are sentences with one wrong tense or pronoun to tap
- Data Detective - math - 9-12 - correlation vs causation, sampling bias, misleading graphs - each pin is a flawed infographic and the misleading element is the pin

## 8. card-battler — Card Battler

- **id:** `card-battler`
- **Hook:** The opponent plays a statement; play the card that names what it is doing to block it and strike back.

**Core loop.** A duel across a table. Each round the opponent plays a statement card (a sentence, an event, a chord, a scenario). The player's hand holds 4-5 named cards (ethos, straw man, Fourth Amendment, dominant seventh); the player selects the card that correctly identifies or answers the statement and plays it. A correct play blocks the statement and deals damage; a wrong play lets the statement through for damage and the statement is shown annotated. Chaining Claim → Evidence → Reasoning cards (a `sequence` item) over three rounds charges a finisher. Hands refill from a deck that grows between opponents.

**Learning decision.** Consumes `choice` items (the `choices` become the hand; the prompt is the opponent's card) and `sequence` items for combo chains. Play is in-canvas: drag or tap a card, or press 1-5. Wrong play: the statement card flips to show its true label, the relevant words are highlighted, the `explanation` is shown; dismiss by tap. Hints grey out two cards that cannot apply.

**Difficulty levers.** Hand size (3 → 5); opponent damage; statement subtlety (obvious anaphora vs embedded); number of near-miss cards in the hand; round timer (none → 20 s); finisher chain length (3 → 5); adaptive item difficulty.

**Juice moments.** Card slam with shake; block shield shatter; opponent portrait reacts (smug, flinch); combo chain glows card by card; finisher cinematic (the whole table flips); deck-growth reveal between opponents.

**Session structure.** 3 opponents with increasing subtlety and a growing deck; a new card type is introduced each opponent. Finale: **Closing Statement** — a timed CER chain (`sequence` item) where the three parts must be played in order to land a final blow.

**Best fit.** Middle and high. Rhetoric and fallacies, probability comparisons, periodic trends, constitutional amendments, chord resolution.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| opponents | int | 3 | stage count |
| roundsPerOpponent | int | 6 | statements per opponent |
| handSize | int | 4 | cards in hand |
| playerHP | int | 10 | hit points |
| opponentHP | int | 10 | hit points per opponent |
| roundTimerSec | number | 0 | 0 disables |
| comboLength | int | 3 | cards in a finisher chain |
| finaleTimerSec | number | 30 | closing statement timer |
| opponents | array | debater/ad exec/politician | `{ name, portrait, taunts[] }` |
| theme | object | arena | table art, card backs, palette |

**Re-skins.**
- Probability Poker - math - 7-8 - probability of events, compound events, expected value - play the card whose probability beats the opponent's event and combos multiply independent events
- Element Duel - science - 9-10 - periodic trends, electron configuration, reactivity - play the element that wins the called trend and the table lights up the trend direction after each play
- Rights Rumble - social - 7-8 - Bill of Rights, amendments, landmark cases - play the amendment that defends against the scenario and chain cases for a precedent combo
- Chord Clash - arts - 7-9 - chords, scales, key signatures, intervals - play the chord that resolves the opponent's progression and chain a cadence for the finisher
- Figurative Face-off - ela - 6-7 - similes, metaphors, hyperbole, personification - statement cards are lines of poetry and the finisher is naming all devices in a stanza

## 9. map-conquest — Map Conquest

- **id:** `map-conquest`
- **Hook:** Claim the map one region at a time; each region asks you a question about itself.

**Core loop.** A stylised hex or cell map. On the player's turn they tap a region adjacent to territory they own; a card about that region or era appears (4 choices). Correct: a banner plants with a flourish and the region is claimed; wrong: a rival empire takes it and an explanation card appears. Rivals expand on their own each turn, so the player must also choose which region matters (a chokepoint, a wonder site). Some regions are wonder sites: claiming one requires ordering 4-5 events (`sequence` item) and grants a bonus. The turn counter and territory share are in the HUD.

**Learning decision.** Consumes `choice` (region card, overlay with 1-4 keys) and `sequence` (wonder timeline, in-canvas drag ordering). The strategic choice of region is free and fun; the claim is the learning decision. Wrong answer: the card shows the correct answer, the `explanation` and a `visual` (map detail, era strip); dismiss by tap; the region recolours to the rival with a "lost" stamp. Hints highlight the era strip or map detail before the card.

**Difficulty levers.** Rival expansion rate; number of rivals; map size; wonder sequence length; chokepoint design; card timer (none → 15 s); adaptive item difficulty.

**Juice moments.** Banner plant with dust puff and horn; region fill wipe; rival encroach animation with a drum hit; wonder construction in three stages; era transition as the map ages; final territory tally with a sweeping line.

**Session structure.** 3 eras, each a fresh region set and skill set on the same map; territory carries over. Finale: **Great Wonder** — a six-event timeline under a 45-second timer; completing it flips all contested regions to the player.

**Best fit.** Elementary to high. Geography and history, coordinate plane and integers, solar system order, argument structure, art movements, grid commands.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| eras | int | 3 | stage count |
| regions | int | 24 | map regions |
| rivals | int | 2 | AI empires |
| rivalRate | number | 1 | regions a rival claims per turn |
| wonderSites | int | 3 | regions needing a sequence item |
| wonderLength | int | 4 | events in a wonder sequence |
| finaleLength | int | 6 | events in the finale |
| finaleTimerSec | number | 45 | finale timer |
| cardTimerSec | number | 0 | 0 disables |
| theme | object | ancient world | map art, banner colours, rival names |

**Re-skins.**
- Integer Island - math - 6-7 - integers on the number line, absolute value, coordinate plane - regions are coordinate cells claimed by solving the expression that gives their coordinates and rivals invade from the negative quadrants
- Solar Conquest - science - 5-6 - planets and their order, moon phases, rotation and revolution - claim worlds outward from the Sun, wonders sequence moon phases, rivals are comets
- Argument Atlas - ela - 9-11 - thesis statements, counterclaims, logical structure - claim regions of a debate map with the strongest thesis or rebuttal and rivals win with fallacies you can retake
- Grid Commander - cs - 4-5 - coordinates, movement commands, pathfinding - claim cells by giving the correct command sequence while rivals block paths
- Art Atlas - arts - 6-8 - art movements, famous artists, cultural traditions - claim regions by period and place, wonders sequence a movement's key works

## 10. tycoon-sim — Tycoon Sim

- **id:** `tycoon-sim`
- **Hook:** Run the business for twelve rounds; each round's news event asks a question that your profit answers honestly.

**Core loop.** A dashboard with a live chart (supply/demand, population, readership), an inventory and a cash balance. Each round (about 30 seconds) a news event lands ("input costs rise 20%"); the player sets one or two sliders (price, quantity, mix) and then answers the question the event poses (4 choices, or a numeric prediction). Correct reasoning pays off in a profit spike on the chart; wrong reasoning shows a loss and an annotated chart explaining the shift. Profits buy upgrades between rounds that unlock harder events. The quarter counter and net worth are in the HUD.

**Learning decision.** Consumes `choice` and `numeric` items with a `visual` of kind `sd-chart`, `line`, or `bar`. The event text is the prompt; the question is in the overlay but the chart stays visible behind it. Wrong answer: the chart animates the true shift with arrows and labels, the card shows the `explanation` and the correct value; dismiss by tap. Hints show the relevant curve pulsing.

**Difficulty levers.** Number of simultaneous shocks; slider granularity; numeric tolerance; round timer; upgrade cost curve; linked questions (three in a row during the finale); adaptive item difficulty.

**Juice moments.** Cash counter rolling up with coin sound; chart line drawing itself; profit confetti and loss thunder; upgrade build animation on the storefront; "stage up" when the business changes scale (stand → chain → national); recession storm clouds in the finale.

**Session structure.** 12 rounds in 3 business scales (4 rounds each), each scale introducing a new chart or event type. Finale: **Recession** — three linked policy questions in one round; survival with cash above zero triggers the IPO fanfare.

**Best fit.** Elementary to high. Economics, statistics decisions, genetics orders, climate energy mix, headline evidence, data-structure choices, market stall comprehension, gallery curation.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| rounds | int | 12 | total rounds |
| scales | int | 3 | business stages |
| roundTimerSec | number | 0 | 0 disables |
| startingCash | number | 100 | initial balance |
| sliders | array | price, quantity | `{ id, label, min, max, step }` |
| chartKind | string | 'sd-chart' | default chart visual |
| upgrades | array | 3 per scale | `{ name, cost, effect }` |
| finaleLinked | int | 3 | linked questions in the finale |
| numericTolerance | number | 0.05 | relative tolerance for numeric items |
| theme | object | lemonade | storefront art, currency symbol, names |

**Re-skins.**
- Stats Stadium - math - 6-8 - mean, median and mode, spread, sampling, simple probability - run a sports franchise and each season a data chart and scout report force a stats-based call
- Gene Garden - science - 7-8 - Punnett squares, dominant and recessive, heredity - breed plants to fill orders and profit follows the real offspring ratio
- Newsroom Tycoon - ela - 7-8 - main idea, text evidence, author's purpose, bias - pick the headline the evidence supports and readership follows the honesty of the call
- Trading Post - social - 5-6 - goods and services, scarcity, producers and consumers, barter - each season's decision is a scarcity question and barter rounds use ratios
- Server Farm - cs - 9-10 - data structures, efficiency, cloud, privacy - each quarter's decision is a structure or efficiency question and latency charts answer
- Gallery Tycoon - arts - 9-12 - curation, art movements, critique vocabulary - each season's decision is a critique or movement question and attendance follows your eye

## 11. block-coding — Block Coding

- **id:** `block-coding`
- **Hook:** The program is the only way to move; drag blocks, press Run, watch it play out.

**Core loop.** A grid level with a robot, gems and walls. A block palette (move, turn, repeat N, if-path-ahead, function F1, or subject-specific commands) sits on the left; the player drags blocks into a program strip (tap-to-append on touch), then presses Run. The robot animates step by step; collecting all gems passes the level. A block budget shown on the strip forces loops and functions. On failure the run replays with the failing step highlighted and a hint; the player edits and runs again. Debug levels hand the player a broken program to fix.

**Learning decision.** Consumes `build` items (parts = block ids, target = one valid program; the item `visual` holds the level grid and the mechanic also accepts any program that solves the level by simulation) and `choice` items for "predict the output" cards between worlds. Every edit is a learning decision; the Run button is the commit. Wrong program: the replay stops at the failing step with the block highlighted, the card shows the `explanation` of the concept the level teaches and shows the reference program's shape (not the whole solution) as a hint; dismiss by tap. After two fails the full `hint` text appears.

**Difficulty levers.** Grid size and path complexity; block budget tightness; available block set (sequences only → loops → conditionals → functions); number of gems; debug levels with 1-2 planted bugs; prediction cards with trace tables; adaptive item difficulty by level selection.

**Juice moments.** Blocks snap with a click; robot hops with squash and stretch; gem collect sparkle and ascending chime; Run button pulse; level-complete banner with star rating by block count; replay rewind sound; factory finale where the whole floor lights up.

**Session structure.** 4 worlds (sequences, loops, conditionals, functions) of 4 puzzles; a prediction card between worlds. Finale: **The Factory** — one long level that needs all four concepts; passing it with the budget triggers a three-star finale.

**Best fit.** Elementary and middle. Programming concepts, function machines in math, command vocabulary in a world language, movement sequences and musical form in arts.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| worlds | int | 4 | stage count |
| puzzlesPerWorld | int | 4 | levels per world |
| blockSet | array | move, turnL, turnR, repeat, if, fn | block ids available by world |
| blockLabels | object | english defaults | label per block id (lets a language pack relabel) |
| budgetSlack | int | 0 | extra blocks allowed over the reference |
| debugLevels | bool | true | include fix-the-program levels |
| predictionCards | bool | true | choice cards between worlds |
| stepSec | number | 0.35 | animation seconds per step |
| theme | object | robot / gems | sprites, floor tiles, names |

**Re-skins.**
- Function Factory - math - 8 - functions and input-output tables, linear vs nonlinear, slope - assemble function machines from operation blocks so every input produces the shown output and the budget forces the simplest rule
- Ruta Robot - languages - 4-5 - direction words, numbers, imperative commands - blocks are Spanish commands so understanding the command is the only way to move
- Choreo Coder - arts - 4-6 - movement sequences, musical form (ABA), repeats, tempo - program a dancer with move blocks and repeats to match the shown form
- Photosynthesis Factory - science - 6-8 - photosynthesis inputs and outputs, cellular respiration - blocks are process steps and the plant only produces glucose when the pipeline is correct
- Recipe Robot - math - 3-4 - multi-step word problems, operations order - blocks are operations and the robot delivers the answer only if the steps are in the right order

## 12. conveyor-sort — Conveyor Sort

- **id:** `conveyor-sort`
- **Hook:** Items slide past; drop each into the right bin before it falls off the end.

**Core loop.** Two or three conveyor belts carry labelled items (spoken aloud when they appear) from left to right; 2-4 bins sit below with category labels. The player drags an item into a bin or presses the bin's number key while the item is highlighted; items that reach the end fall and count as misses. The sorting rule changes every round ("by category", "by gender", "by verb ending"). Periodically a customer shouts an order ("¡Dos manzanas rojas!") and the player must drop the matching items into the order box. Belt speed and item density rise within a round.

**Learning decision.** Consumes `sort` items (the mechanic streams the `items` onto belts and uses `categories` as bins; each drop grades one element and the full item grades when all its elements are placed) and `choice` items for customer orders (the `choices` are the items currently on the belts). Wrong bin: the item bounces out, the belts pause, the bin that was correct glows, the card shows the `explanation` ("manzana ends in -a and is feminine, so la"); dismiss by tap. Hints colour-code the bin hint strip.

**Difficulty levers.** Belt speed; number of belts; number of bins (2 → 4); item density; rule complexity (one feature vs two); spoken-only items; order length (2 → 6 items); adaptive item difficulty.

**Juice moments.** Bin "clunk" with a bounce; combo sparkle on a perfect round; belts speeding up with a motor sound; customer cheer with a tip jar coin; rush-hour siren and lights; fiesta finale with streamers.

**Session structure.** 3 shifts (morning, noon, evening rush) with different rule families; a short customer order at the end of each shift. Finale: **Fiesta Order** — a six-item order under a 40-second timer; filling it perfectly triggers the fiesta.

**Best fit.** Elementary and middle. Vocabulary categories, gender and articles, energy forms, geography bins, online safety, instrument families.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| belts | int | 2 | conveyor belts |
| bins | int | 3 | bins visible |
| beltSpeed | number | 80 | px per second at shift 1 |
| speedPerShift | number | 1.2 | multiplier per shift |
| itemsPerShift | int | 18 | items streamed per shift |
| ordersPerShift | int | 1 | customer orders per shift |
| orderLength | int | 3 | items per order |
| finaleOrderLength | int | 6 | items in the finale order |
| speakItems | bool | true | speak item labels |
| theme | object | market stall | belt art, bin art, customer sprites |

**Re-skins.**
- Energy Conveyor - science - 6-8 - forms of energy, transformations, heat transfer - sort objects by energy form then by transformation and rush rounds ask which bin loses energy as heat
- Geo Rush - social - 6-7 - continents, countries and capitals, climate zones - sort place cards onto map bins and rush rounds narrow the bin to one continent
- Safe Surfer Sort - cs - 3-4 - strong passwords, personal information, phishing - sort messages into Safe or Report bins and rush rounds add a Share-with-adult bin
- Orchestra Conveyor - arts - 3-4 - instrument families, timbre, how sound is made - instruments play a snippet as they pass and rush rounds sort by how the sound is made
- Parts of Speech Pantry - ela - 3-4 - nouns, verbs, adjectives, adverbs - words slide past in a sentence context and bins are parts of speech

## 13. rhythm-tap — Rhythm Tap

- **id:** `rhythm-tap`
- **Hook:** Read the notation, tap on the beat; then build the measure that makes it add up.

**Core loop.** Notes scroll along a lane toward a hit line while a metronome ticks; the player taps (Space / tap) when a note crosses the line and gets Perfect / Good / Miss judgement with a combo. The rhythm being tapped is shown as real notation above the lane, so reading ahead is the skill. Between sections, Forge rounds pause the scroll: an empty measure with a time signature must be filled by placing note tiles so the values add up (`build` item). Songs are synthesized with `audio.playNote`, so there are no asset files.

**Learning decision.** Consumes `build` items (parts = note values, target = a valid fill) in Forge rounds and `choice` items on a bonus lane (name the staff note, name the term). The tapping itself is graded by timing, and the notation that drives it is the learning; a lane can carry labels so a tap only counts when the label matches a rule (used by non-music re-skins). Wrong forge: the measure shows the beats counted out loud with the overflow or gap highlighted, the `explanation` ("a half note is two beats, this measure has four"); dismiss by tap. Missed taps are not explained individually; after a section with accuracy under 60% a notation card explains the rhythm figure.

**Difficulty levers.** Tempo; note density (quarters → eighths → syncopation); rests; time signature changes; cue sound on/off (notation only); forge measure length; bonus lane frequency; judgement window width.

**Juice moments.** Hit-line flash and note burst; combo counter growing with a pitch rise; "Perfect" text; section-clear drum fill; forge measure locking in with a chord; drum-off finale with stage lights pulsing to the beat.

**Session structure.** 3 songs with escalating notation ideas, each in three sections with a Forge round between sections; a bonus staff-note lane appears in song 2. Finale: **Drum-off** — a long pattern with no cue sound and notation only; finishing above 80% triggers the encore.

**Best fit.** Early to middle. Music notation, syllables and phonemes, syllable stress in a world language, algorithm steps that happen on a beat.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| songs | int | 3 | stage count |
| sectionsPerSong | int | 3 | sections per song |
| bpm | number | 90 | tempo at song 1 |
| bpmPerSong | number | 1.1 | tempo multiplier per song |
| perfectMs | number | 60 | perfect window |
| goodMs | number | 140 | good window |
| cueSound | bool | true | play a cue on each note (off in finale) |
| forgeRounds | bool | true | build items between sections |
| bonusLane | bool | true | choice items on a side lane |
| labelledNotes | bool | false | notes carry labels and a rule decides which to tap |
| theme | object | forge | lane art, note sprites, palette |

**Re-skins.**
- Syllable Stomp - ela - 1-2 - syllable counting, phoneme segmentation, blending, rhyme - tap once per syllable as the word scrolls by and forge rounds build a word from phoneme tiles
- Fiesta Beat - languages - 4-6 - syllable stress, pronunciation, accent marks, question words - tap on the stressed syllable of each scrolling word and forge rounds place the accent mark
- Sort Beat - cs - 7-8 - sorting algorithms, comparisons and swaps, step tracing - bars scroll by and you tap on the beat only when the algorithm would swap, forge rounds order the passes
- Rock Cycle Rhythm - science - 6-7 - rock cycle, weathering and erosion - notes carry rock names and you tap only when the note matches the current process, forge rounds order the cycle
- Poetry Pulse - ela - 7-8 - meter, iambic pentameter, scansion - stressed syllables are the notes and forge rounds fill a line of verse with the right foot

---

# Part B. Planned mechanics (spec only in Phase 1)

These are not yet built. Each spec is complete enough that a builder can create `mechanics/<id>/mechanic.js` from it plus `docs/ARCHITECTURE.md` section 4. The first game that uses a planned mechanic builds it (see `docs/PHASE2_BACKLOG.md`, batches 5 and 6).

## 14. physics-launcher — Physics Launcher

- **id:** `physics-launcher`
- **Hook:** Set the numbers, pull back, release; the shot only lands if the maths is right.

**Core loop.** A launcher sits on the left and a target on the right; a sign states the problem ("hit the target 60 m away with a 30° launch: what initial speed?" or "set a 3:2 ratio of power to angle"). The player drags to aim (angle) and uses a slider or number pad for the second quantity, then releases. A dotted preview shows the first third of the arc so the aim feels physical, but the full arc only reveals on release. A hit knocks the target over with a satisfying crash; a miss shows the real arc next to the correct arc with the components labelled, then the shot is replayed with the right value. Three shots per target before the item is counted as a miss.

**Learning decision.** Consumes `numeric` items (the quantity to set, with `tolerance`) and `choice` items (which of three pre-set launches hits). The question is the sign; the answer is the launch itself. Wrong shot: the overlay shows the correct value, the `explanation` with the worked formula, and a `visual` of kind `vectors` or `ratio`; dismiss by tap. Hints draw the correct arc faintly.

**Difficulty levers.** Tolerance; which quantity is unknown (speed, angle, time, distance); wind or gravity variations; moving targets; two-stage shots (bounce); showing or hiding the preview arc; number of attempts per target; adaptive item difficulty.

**Juice moments.** Slow-motion on the apex; target crumbles with shake; trail of sparks; "bullseye" text with fanfare for a centre hit; chain of targets toppling in the finale; wind gust animation.

**Session structure.** 3 ranges (static targets, moving targets, obstacles), 6 targets each. Finale: **Chain Reaction** — one shot must pass through three rings whose positions encode three sub-answers; passing all three detonates a firework.

**Best fit.** Middle and high. Ratios and percent, trigonometry, projectile motion, Newton's laws.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| ranges | int | 3 | stage count |
| targetsPerRange | int | 6 | targets per stage |
| attempts | int | 3 | shots per target |
| gravity | number | 9.8 | simulation gravity in world units |
| worldScale | number | 8 | logical px per world metre |
| showPreview | bool | true | dotted preview of the first third of the arc |
| unknown | string | 'speed' | which quantity the player sets by number |
| movingTargets | bool | false | targets move in range 2+ |
| theme | object | catapult | launcher sprite, target art, backdrop |

**Re-skins.**
- Ratio Rocket - math - 6-7 - ratios and unit rates, proportions, percent - set power and angle as a ratio and only proportional launches hit the target that shows an equivalent ratio
- Trig Trajectory - math - 10-11 - right-triangle trig, unit circle, radians - angle is set in radians and the shot only lands when the ratio matches the triangle on the sign
- Projectile Lab - science - 9-10 - Newton's laws, projectile motion, velocity and acceleration - set velocity and angle from the given numbers and a vector overlay shows your components against the correct ones on a miss
- Momentum Bowling - science - 8 - momentum, mass and velocity, collisions - set mass and speed so the ball transfers exactly enough momentum to topple the pin wall
- Percent Pitch - math - 6 - percent of a quantity, percent change - the target is at 100% and the sign asks you to land at 35% of the distance

## 15. platformer — Platformer

- **id:** `platformer`
- **Hook:** Only the platform with the right answer holds your weight.

**Core loop.** A side-scrolling hero runs and jumps (arrows / A-D + Space, or on-screen left / right / jump buttons). Every 5-8 seconds the path splits into a gap with three floating platforms at different heights, each carrying a candidate answer to the prompt in the banner. The player jumps to one; the correct platform holds and bounces the hero onward with coins, the wrong platform crumbles after a short wobble and drops the hero to a soft ledge below where a card explains the answer. Between decision gaps there are coins, springs and a slow enemy to hop on, so platforming skill is rewarded but never required to pass.

**Learning decision.** Consumes `choice` items with 3 choices drawn on the platforms. The prompt is in the banner and spoken for early grades. Wrong platform: the hero lands on the recovery ledge, the correct platform glows above, the card shows the `explanation` and the `visual`; dismiss by tap; a spring returns the hero to the path. Hints make the correct platform sparkle.

**Difficulty levers.** Scroll speed; gap width and platform spacing; number of platforms (2 or 3); enemy count; moving platforms; time before the wrong platform crumbles; adaptive item difficulty.

**Juice moments.** Squash-and-stretch jump; coin pop chime; platform crumble with shake; enemy stomp bounce; checkpoint flag; level-end flagpole slide with fireworks; crumbling-tower finale.

**Session structure.** 3 worlds of 2 levels, each world a new tileset and skill; checkpoints each level. Finale: **Rising Water** — a vertical climb where water rises and only correct platforms are safe; reaching the top plants the flag.

**Best fit.** Early and elementary. Habitats and life cycles, explorers and ports, pitch heights, early vocabulary.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| worlds | int | 3 | stage count |
| levelsPerWorld | int | 2 | levels per world |
| scrollSpeed | number | 140 | px per second |
| platforms | int | 3 | platforms per gap |
| crumbleSec | number | 0.6 | wobble time before a wrong platform falls |
| enemies | bool | true | stompable enemies between gaps |
| movingPlatforms | bool | false | world 3 platforms move |
| lives | int | 3 | hearts |
| theme | object | jungle | tileset, hero sprite, music track |

**Re-skins.**
- Habitat Hopper - science - 2-3 - habitats, animal body parts, life cycles, plant parts - platforms are habitats and wrong ones crumble to show where the animal actually lives
- Pitch Platformer - arts - 3-5 - high and low pitch, solfege, melodic direction - platforms sit at pitch heights and a note sounds so you must jump to the platform that plays it
- Explorer's Ledge - social - 4-5 - Age of Exploration, Indigenous nations, colonies - platforms are labelled ports and nations and you hop only to the one that answers the captain's question
- Rhyme Climb - ela - 1-2 - rhyming, word families, short vowels - platforms show words and only the one that rhymes with the spoken word holds
- Number Line Leap - math - 2-3 - number line, skip counting, rounding - platforms sit on a number line and the correct platform is the number the banner describes

## 16. breakout-bubble — Breakout Bubble

- **id:** `breakout-bubble`
- **Hook:** Break the bricks that answer the prompt; hitting the wrong brick costs a ball.

**Core loop.** Two sub-modes share one chassis. Breakout mode: a paddle (mouse / touch / arrows) bounces a ball into a wall of labelled bricks; the banner prompt names what to break ("multiples of 6"); correct bricks shatter and score, wrong bricks ring like iron, bounce the ball back hard and show a card; clearing all correct bricks ends the wave. Bubble mode: the player aims a shooter and fires a labelled bubble at a ceiling of bubbles; a bubble that joins two or more matching bubbles (same category, equivalent value) pops the group. Both modes keep the hands busy with aiming while the eyes read labels.

**Learning decision.** Consumes `choice` items: the `choices` are drawn as bricks or bubbles and the prompt is the banner; several items are live per wave. Wrong brick or bubble: the ball or bubble freezes, the card shows the correct bricks pulsing, the `explanation` and the `visual`; dismiss by tap; a ball is lost. Hints highlight correct bricks faintly.

**Difficulty levers.** Ball speed; paddle width; brick count and layout; ratio of correct to wrong bricks; bubble ceiling descent rate; multi-hit bricks; adaptive item difficulty.

**Juice moments.** Brick shatter with debris; ball trail; combo multiplier text; paddle stretch on a power-up; ceiling crash in bubble mode; wall-clear fanfare; boss brick with a health bar.

**Session structure.** 3 walls in breakout mode or 3 ceilings in bubble mode, each adding a layout twist. Finale: **Boss Brick** — a large brick with a multi-part answer (three correct hits in order) guarded by moving wrong bricks.

**Best fit.** Elementary and middle. Multiples and factors, arrays, synonyms, element categories.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| mode | string | 'breakout' | 'breakout' or 'bubble' |
| waves | int | 3 | stage count |
| ballSpeed | number | 300 | px per second |
| paddleWidth | number | 120 | logical px |
| correctBricks | int | 6 | correct bricks per wave |
| wrongBricks | int | 6 | wrong bricks per wave |
| lives | int | 3 | balls |
| descentSec | number | 20 | bubble mode ceiling descent interval |
| theme | object | arcade | brick art, palette, SFX set |

**Re-skins.**
- Array Arcade - math - 3 - multiplication as arrays, commutative property, facts to 10 x 10 - bricks form a rows x columns array and choosing the paddle equation that matches breaks the whole block
- Multiple Mayhem - math - 4-5 - multiples, factors, divisibility - the banner names a rule and only matching bricks shatter
- Synonym Smash - ela - 4-5 - synonyms, antonyms, shades of meaning - bubbles pop when three synonyms touch
- Element Bubbles - science - 7-8 - metals, non-metals, metalloids, periodic groups - bubbles pop when elements of the same group join
- Fraction Breaker - math - 4 - equivalent fractions - bricks show fractions and only those equivalent to the banner fraction break

## 17. word-grid — Word Grid

- **id:** `word-grid`
- **Hook:** Find the words that fit the rule hidden in the letter grid, before the ink dries.

**Core loop.** A letter grid (8 × 8 to 12 × 12) with words hidden in straight lines. A rule card names what to find ("words with the root GRAPH", "past-tense verbs", "cognates"). The player drags across letters (or taps start and end) to select a word; a valid selection that matches the rule highlights and scores, a real word that breaks the rule is marked grey with a short note, and a non-word shakes off. A timer ink-fills the border slowly. Finding all the rule words clears the grid; a meaning check (choose the definition) is asked for one found word per grid.

**Learning decision.** Consumes `text` items (the `answer` list is the set of words to find; the `prompt` is the rule) and `choice` items for meaning checks. Wrong selection of a real word that breaks the rule: the word is greyed with a one-line note from the item's distractor explanation ("GRAPHIC fits, but GIRAFFE has no root"); non-words only shake. After two misses the first letter of a remaining word pulses.

**Difficulty levers.** Grid size; diagonals and backwards words on/off; number of rule-breaking decoy words; timer length; meaning checks on/off; rule subtlety.

**Juice moments.** Highlight sweep as the word is selected; letters pop in sequence; grid-clear ripple; decoy word greyed with a thud; ink border creeping; final grid where found words reveal a hidden picture.

**Session structure.** 3 grids of increasing size and decoy count. Finale: **Picture Grid** — a large grid where the found words tile a hidden image; completing it reveals the image with a flourish.

**Best fit.** Elementary and middle. Roots and affixes, spelling patterns, cognates in a world language, science vocabulary.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| grids | int | 3 | stage count |
| size | int | 8 | grid size at stage 1 |
| sizePerStage | int | 2 | size increase per stage |
| diagonals | bool | false | allow diagonal words |
| backwards | bool | false | allow reversed words |
| decoys | int | 2 | rule-breaking real words per grid |
| timerSec | number | 120 | per grid |
| meaningChecks | bool | true | choice item after each grid |
| theme | object | library | palette, highlight colour, fonts |

**Re-skins.**
- Root Word Grid - ela - 4-6 - Greek and Latin roots, prefixes and suffixes, word families - find words with the target root and each found word's meaning must match before it scores
- Cognate Caza - languages - 5-7 - cognates, spelling, accents - find the Spanish cognates of English clue words
- Lab Lexicon - science - 6-7 - science vocabulary, process words - find the words that name steps of the scientific method
- Tense Trawl - ela - 3-4 - past tense, irregular verbs - find only the past-tense forms and decoys are present-tense twins
- Capital Search - social - 4-5 - states and capitals, continents - find capitals of the states shown on a small map

## 18. escape-room — Escape Room

- **id:** `escape-room`
- **Hook:** Every object in the room hides a puzzle; solve them to find the key and get out before the clock.

**Core loop.** A single illustrated room with 5-7 tappable hotspots (a painting, a desk, a safe). Tapping a hotspot zooms in and presents its puzzle: identify the device in the framed quote, type the modern meaning of the archaic phrase, match the four portraits to their motives, order the letters on the desk by date. Solving a hotspot yields a clue token (a digit, a word) shown in the inventory; three tokens open the door's combination lock. A wrong answer costs 20 seconds on the room clock and shows the explanation; the hotspot can be retried after one other hotspot is attempted. The clock and inventory sit in the HUD.

**Learning decision.** Consumes `choice`, `text`, `match` and `sequence` items; each hotspot is bound to one item type by config so a room has variety. Puzzles are shown in-canvas with the room visible behind. Wrong answer: the hotspot shakes, the card shows the correct answer, the `explanation` and the `visual`; dismiss by tap; the clock loses time. Hints light up the hotspot that holds the clue related to the current puzzle.

**Difficulty levers.** Room clock length; number of hotspots; item types mixed per room; red-herring hotspots (fun but no token); combination lock length; adaptive item difficulty.

**Juice moments.** Zoom-in with a soft whoosh; token flying into the inventory; lock dial clicking; door creak and burst of light; clock red pulse under 30 seconds; final room with a chain of three locks.

**Session structure.** 3 rooms (study, library, vault) with more hotspots and more item types each. Finale: **The Vault** — three locks that each need two tokens, with a tighter clock; escaping triggers the alarm-off fanfare.

**Best fit.** Middle and high. Literary analysis, history and civics, science vocabulary and processes.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| rooms | int | 3 | stage count |
| hotspotsPerRoom | int | 5 | puzzles per room |
| roomClockSec | number | 240 | time per room |
| wrongPenaltySec | number | 20 | clock penalty |
| tokensToOpen | int | 3 | tokens per door |
| redHerrings | int | 1 | hotspots without tokens |
| hotspotTypes | array | choice, text, match, sequence | item types cycled through hotspots |
| theme | object | manor | room art per stage, palette |

**Re-skins.**
- Bard's Escape - ela - 9-12 - literary devices, Shakespearean language, soliloquy analysis, character arcs - each room is a scene and you unlock it by naming the device, inverting the archaic phrase or naming the motive
- Agora Escape - social - 6 - Greek democracy, Roman republic, Mediterranean geography - rooms are Athens and Rome and puzzles ask who may vote, which route carries grain, which god the temple honours
- Lab Lockdown - science - 7-8 - lab safety, scientific method, variables - rooms are a lab after an accident and each hotspot asks which procedure was skipped
- Poet's Attic - ela - 7-8 - poetic forms, rhyme scheme, imagery - each hotspot holds a stanza whose form or device is the token
- Code Vault - cs - 8-9 - binary, ciphers, Boolean logic - each hotspot is a cipher or logic puzzle whose output is a digit of the lock

## 19. timeline-sequencer — Timeline Sequencer

- **id:** `timeline-sequencer`
- **Hook:** Drag the cards onto the line in the right order; the train only leaves when the order runs.

**Core loop.** 4-7 cards sit shuffled in a tray; a track (timeline, proof ladder, story rail) runs across the screen with empty slots. The player drags cards into slots (or selects a card with arrows and places it with a number key); when all slots are full a Check button runs the sequence as an animation: each correct adjacent pair lights green and the vehicle advances, the first wrong pair stops it with the two cards swapped on screen and a one-line reason. The player fixes and checks again; three checks per item. Some rounds plant one card that does not belong and must be removed first.

**Learning decision.** Consumes `sequence` items. Checking is the commit; partial credit is visible as the vehicle's progress but the item is graded as a whole via `ctx.answer` with the mapped order. Wrong order: the card shows the correct order with the swapped pair highlighted, the `explanation` naming the cue ("the Declaration came before the Constitution because..."), and the `visual` (era strip, story picture); dismiss by tap. Hints lock the first and last cards in place.

**Difficulty levers.** Card count (4 → 7); near-date or near-step cards; intruder cards; timer; checks allowed (3 → 1); text-only cards vs picture cards; adaptive item difficulty.

**Juice moments.** Card snap into slot; vehicle chugging along with a whistle; green sweep over correct pairs; wrong pair swap with a buzz; bridge planks appearing per correct pair; finale where a long train crosses a canyon.

**Session structure.** 3 lines (short, medium, long sequences) with an intruder card introduced on line 2. Finale: **Canyon Crossing** — a 7-card sequence with two intruders under a 60-second timer; crossing triggers the whistle fanfare.

**Best fit.** Early to high. Story events, historical chronology, proof steps, life cycles, sequence of tenses.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| lines | int | 3 | stage count |
| itemsPerLine | int | 5 | sequence items per stage |
| cardsMin | int | 4 | cards at stage 1 |
| cardsMax | int | 7 | cards at the finale |
| intruders | bool | true | plant an extra card from line 2 |
| checksPerItem | int | 3 | attempts before the item is missed |
| timerSec | number | 0 | 0 disables |
| pictureCards | bool | true | draw `visual` on cards when present |
| theme | object | railway | track art, vehicle sprite, palette |

**Re-skins.**
- Story Train - ela - 2-3 - sequence of events, beginning middle end, cause and effect - couple story-card carriages in order and a derailed carriage replays the clue
- Timeline Trail - social - 3-5 - chronology, inventions, explorers - lay events on a wagon trail and the wagon only crosses rivers bridged by correctly ordered cards
- Proof Pursuit - math - 9-10 - two-column proofs, congruence postulates, parallel line theorems - sequence statements and reasons and one planted false reason must be removed first
- Tense Timeline - languages - 10-12 - sequence of tenses, narrating in the past, time expressions - order the sentences of a story by tense cues and fix the one in the wrong tense
- Life Cycle Line - science - 2-3 - life cycles, plant growth, metamorphosis - picture cards of stages must be ordered and the intruder is a stage from another animal

## 20. system-sim — System Sim

- **id:** `system-sim`
- **Hook:** Move the sliders, watch the curve; the question is which lever moves it the way the brief asks.

**Core loop.** A live chart shows one or two curves over time (population, temperature, price). A brief card states a goal ("keep the rabbit population between 40 and 60 for 30 days"). The player adjusts 2-3 labelled sliders (birth rate, food, predators) and presses Simulate; the curves animate forward 10 seconds of model time. Before each simulate the game asks a prediction question ("if you raise food, what happens to predators?"), and the simulation answers it visibly. Meeting the brief locks the level; missing it shows a diagnosis of which lever was wrong. Levels change which variables are exposed.

**Learning decision.** Consumes `choice` items (predictions, with `visual` of kind `line`) and `numeric` items (set the slider to the value that achieves the goal). The slider move is the game action and the prediction is the learning decision bound to it. Wrong prediction: the simulation runs anyway, the chart annotates the actual effect against the prediction, the card shows the `explanation` ("more food lets rabbits grow, so predators grow after a delay"); dismiss by tap. Hints animate one lever's effect alone.

**Difficulty levers.** Number of sliders; feedback loops with delay; brief tightness; noise in the model; number of simulate steps allowed; prediction subtlety; adaptive item difficulty.

**Juice moments.** Curve drawing itself with a soft tone that rises and falls with the value; goal band glowing green when the curve stays inside; collapse animation with thunder when a population crashes; "stable" badge; finale where all curves must stay in band at once.

**Session structure.** 3 models (one variable, two coupled variables, three with delay). Finale: **Hold the Balance** — all exposed curves must stay in their bands for 60 seconds of model time with three slider adjustments allowed.

**Best fit.** Middle and high. Ecosystems, climate, economics, civilization resources, exponential models.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| models | int | 3 | stage count |
| levelsPerModel | int | 3 | briefs per model |
| sliders | array | 2 | `{ id, label, min, max, step }` exposed per model |
| modelStepSec | number | 10 | model time per simulate |
| simulatesPerLevel | int | 4 | attempts per brief |
| noise | number | 0 | 0..1 randomness in the model (seeded) |
| predictionBeforeSim | bool | true | ask a choice item before each simulate |
| theme | object | meadow | chart palette, icons, names |

**Re-skins.**
- Balance of Nature - science - 7-8 - population dynamics, carrying capacity, predator-prey cycles, human impact - tune birth, food and hunting sliders to hit a target curve
- River Valley Sim - social - 6-8 - river valley civilizations, agricultural surplus, social hierarchy - tune irrigation, farming and trade to grow a city and each level asks which lever history shows worked
- Carbon Dial - science - 9-10 - carbon cycle, greenhouse effect, feedback loops - set emissions, forests and ocean uptake to hold temperature in band
- Exponential Garden - math - 9-10 - exponential growth and decay, half-life - set rate and starting amount so the curve passes through two marked points
- Market Mix - social - 11-12 - supply and demand, elasticity - set price and supply so the equilibrium lands inside the goal band

## 21. dungeon-crawler — Dungeon Crawler

- **id:** `dungeon-crawler`
- **Hook:** Rooms, doors and loot; every door asks a question and every floor is harder than the last.

**Core loop.** A top-down dungeon of connected rooms seen one at a time; the hero moves with arrows / swipe. Each door is locked with a question panel (3-4 choices) drawn on the door; walking into a door opens its panel, a correct answer swings it open with a lantern flare, a wrong one locks it for a short time, spawns a slow slime to dodge and shows the explanation. Rooms hold treasure chests (a `match` or `text` item for a key) and potions. Floors are procedurally laid out from the seed with a staircase at the end; the hero keeps gold between floors but loses it on death (roguelite), with a persistent "lore" bonus that makes later runs easier.

**Learning decision.** Consumes `choice` (doors), `text` (chests: type the word) and `match` (chest lock: pair four items). The map screen is the question screen so nothing stops play; the slime makes a wrong answer cost movement time, never a dead end. Wrong door: the panel flips to show the correct answer, the `explanation` and the `visual`; dismiss by tap; the door relocks for 5 seconds. Hints dim one wrong choice.

**Difficulty levers.** Rooms per floor; doors per room; slime speed and count; chest lock complexity; door timer; roguelite gold loss on/off; adaptive item difficulty.

**Juice moments.** Lantern flare on a door opening; chest burst of gold; slime squish; staircase descent with a drum roll; floor banner; boss door with a three-part lock in the finale; death with a slow fade and a "lore learned" recap.

**Session structure.** 3 floors with more rooms and a new item type each; a shop between floors. Finale: **Boss Door** — a three-question lock answered in a row; opening it reveals the treasure vault and the end screen.

**Best fit.** Middle and high. Molecular biology, medieval history, recursion and algorithms, literary terms.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| floors | int | 3 | stage count |
| roomsPerFloor | int | 6 | rooms per floor at floor 1 |
| doorsPerRoom | int | 2 | question doors per room |
| chestsPerFloor | int | 2 | chests per floor |
| slimeSpeed | number | 40 | px per second |
| relockSec | number | 5 | door lock time after a miss |
| roguelite | bool | true | lose gold on death, keep lore |
| heroSpeed | number | 160 | px per second |
| theme | object | crypt | tiles, sprites, palette |

**Re-skins.**
- Genome Dungeon - science - 10-12 - DNA replication, transcription and translation, mutations - rooms are codons and doors open with the right amino acid, a mutation room changes one base
- Medieval Dungeon - social - 6-8 - feudalism, medieval Europe, Silk Road, Renaissance - each floor is a century and treasure rooms hold primary sources
- Recursion Depths - cs - 10-12 - recursion, stacks and queues, search, complexity - floors are recursive calls and you descend by giving the base case and climb back with return values
- Myth Maze - ela - 6-7 - Greek myths, allusions, archetypes - doors ask which hero or archetype a passage alludes to
- Fraction Catacombs - math - 5 - fractions on a number line, compare, add and subtract - doors are fraction comparisons and chests ask for a sum typed as a fraction

## 22. quiz-show-wager — Quiz Show Wager

- **id:** `quiz-show-wager`
- **Hook:** Bet points on how sure you are before you see the choices; confidence is the skill.

**Core loop.** A game-show stage with a host and a board of categories (skills) and point values. The player picks a cell; the prompt appears alone for three seconds and the player sets a wager with a slider (10% to 100% of the cell value) based on how sure they are; then the choices appear and a short timer runs. Correct wins the wager with crowd applause; wrong loses it and the host explains. The board clears row by row; a Daily Double cell doubles the stake; the final round is an all-in wager on one hard item. Multiplayer hot-seat for up to four players is supported on one device (party mode).

**Learning decision.** Consumes `choice` and `numeric` items. The wager is a metacognitive decision that reflects calibration; the answer is the learning decision. Wrong answer: the host card shows the correct answer, the `explanation` and the `visual`; dismiss by tap; the calibration meter in the HUD shows how well the player's confidence tracks their accuracy. Hints are bought with points before the wager.

**Difficulty levers.** Timer; wager range; item difficulty tied to row value; penalty multiplier; Daily Double count; number of players; adaptive item difficulty by row.

**Juice moments.** Stage lights and applause; wager slider with a rising drum roll; board cell flip; Daily Double klaxon; calibration meter needle; final-round spotlight with a long silence before the reveal.

**Session structure.** 3 rounds (board, double board, final wager). Finale: **Final Wager** — one hard item, all-in slider, 30-second timer, dramatic reveal.

**Best fit.** Elementary to high. Any subject with recall and reasoning items; especially good for mixed-skill review.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| rounds | int | 2 | board rounds before the final |
| categories | int | 5 | skills shown as columns |
| rows | int | 4 | point rows |
| rowValues | array | 100,200,300,400 | points per row |
| wagerMin | number | 0.1 | fraction of cell value |
| timerSec | number | 15 | per question |
| dailyDoubles | int | 1 | per board |
| players | int | 1 | hot-seat players (1-4) |
| theme | object | studio | stage art, host sprite, palette |

**Re-skins.**
- Fact Fortune - math - 3-4 - multiplication and division facts, place value, time - categories are fact families and the final wager is a two-step word problem
- Science Showdown - science - 6-8 - mixed review of cells, matter, energy, Earth - categories rotate each board from the content pack's skills
- History Hotseat - social - 7-8 - US history mixed review - party mode for four players with a shared board
- Vocab Vegas - ela - 5-6 - vocabulary, roots, context clues - Daily Double items are analogies
- Trivia en Español - languages - 8-9 - Spanish mixed review - prompts and choices are in Spanish and hints translate one word

## 23. memory-pairs — Memory Pairs

- **id:** `memory-pairs`
- **Hook:** Flip two cards; they only stay up if they truly belong together.

**Core loop.** A grid of face-down cards (8 to 20). The player flips two per turn (tap or arrow + Enter); a matching pair (picture and word, fraction and decimal, term and definition) stays up with a chime and the pair speaks itself; a non-matching pair flips back after a second with a brief note on why they do not match if they were a plausible pair. A move counter and a soft timer run. Clearing the board opens the next level with more cards or a harder pairing rule; a "shuffle on miss" twist in later levels raises the stakes.

**Learning decision.** Consumes `match` items (the `pairs` become the cards). Each flip pair is graded locally; the item grades as a whole when the board clears, via `ctx.answer` with the mapped match array. Wrong plausible pair: a small card shows both faces and a one-line reason from the item `explanation` family ("1/4 is 0.25, not 0.4"); auto-dismisses after 1.5 seconds unless the pair is a known misconception, in which case it blocks. Hints briefly reveal one card.

**Difficulty levers.** Card count; near-miss pairs (0.4 and 1/4); shuffle on miss; timer; peek time; pairs across three representations (a triple match); adaptive item difficulty.

**Juice moments.** Card flip with a snap; matched pair glow and lift; board-clear sweep; combo for consecutive matches; shuffle whoosh; final board where matched pairs form a picture.

**Session structure.** 3 boards (8, 12, 16 cards) with a new pairing rule each. Finale: **Big Board** — 20 cards, shuffle on miss, 90-second timer; clearing it reveals the picture.

**Best fit.** Early and elementary. Vocabulary with pictures, fraction and decimal equivalents, term and definition, animal and habitat.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| boards | int | 3 | stage count |
| cards | array | 8,12,16 | cards per board |
| peekSec | number | 1.0 | time a wrong pair stays visible |
| shuffleOnMiss | bool | false | shuffle unseen cards after a miss (board 3+) |
| timerSec | number | 0 | 0 disables |
| speakPairs | bool | true | speak a matched pair |
| finaleCards | int | 20 | finale board size |
| theme | object | garden | card backs, palette |

**Re-skins.**
- Amigos Memory - languages - 2-3 - family members, body parts, classroom objects, animals - flip picture and word pairs and a matched pair speaks itself
- Fraction Flip - math - 4-5 - fraction and decimal equivalents, equivalent fractions - near-miss pairs like 1/4 and 0.4 are planted
- Habitat Match - science - 1-2 - animals and habitats, parent and offspring - picture pairs, no reading
- Term Twins - science - 6-7 - science vocabulary and definitions - pairs are term and short definition
- Sight Word Snap - ela - 1 - sight words - pairs are the same word in two fonts and the card speaks the word

## 24. geometry-construct — Geometry Construct

- **id:** `geometry-construct`
- **Hook:** Build the figure the brief describes with real tools; the checker measures what you made.

**Core loop.** A grid canvas with construction tools (point, segment, circle, perpendicular, reflect, rotate, translate) in a toolbar. A brief card states a target ("construct the perpendicular bisector of AB", "reflect triangle ABC over the y-axis", "draw a right triangle with legs 3 and 4"). The player places points by tap and uses tools by selecting them and tapping targets; a snap grid keeps it precise on touch. Pressing Check measures the construction (lengths, angles, coordinates) against the target with tolerance; a pass locks the figure with a glow, a fail highlights the measurement that is off and the expected value. Three checks per brief.

**Learning decision.** Consumes `build` items (parts = tool ids and points, target = the required construction expressed as measurements the mechanic can verify from the item `visual` spec) and `numeric` items (type the missing length or angle after constructing). Wrong construction: the card overlays the correct figure in a dotted outline, shows the `explanation` ("a reflection keeps the distance to the mirror line equal on both sides") and names the measurement that failed; dismiss by tap. Hints place one correct point.

**Difficulty levers.** Snap grid spacing; tool set; tolerance; number of steps in the construction; composite transformations; coordinate vs free construction; adaptive item difficulty.

**Juice moments.** Points snapping with a tick; circle sweep animation; figure glow on pass; measurement callouts animating in; "congruent" stamp; finale where constructed pieces assemble into a mosaic.

**Session structure.** 3 workshops (basic constructions, transformations, coordinate geometry). Finale: **Mosaic** — a tiling of three transformed copies of a figure; completing it animates the pattern across the screen.

**Best fit.** Middle and high. Geometry constructions, transformations, Pythagorean theorem, coordinate geometry.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| workshops | int | 3 | stage count |
| briefsPerWorkshop | int | 4 | items per stage |
| tools | array | point, segment, circle, perp, reflect, rotate, translate | tools available |
| snap | number | 20 | grid spacing in logical px |
| tolerance | number | 0.05 | relative tolerance for measurements |
| checksPerBrief | int | 3 | attempts |
| showCoordinates | bool | true | axis labels on the grid |
| theme | object | blueprint | grid palette, tool icons |

**Re-skins.**
- Transformation Workshop - math - 8 - translations, rotations and reflections, congruence, dilations - construct the image under a stated transformation and the finale asks for a composite of two moves
- Compass and Straightedge - math - 9-10 - classic constructions, bisectors, inscribed shapes - no coordinates, only circle and segment tools
- Pythagoras Yard - math - 8 - Pythagorean theorem, distance formula - construct right triangles whose hypotenuse matches a given length
- Angle Architect - math - 7 - angle relationships, supplementary and vertical angles - construct lines so the marked angle equals the brief
- Area Atelier - math - 6 - area of composite shapes, triangles and parallelograms - construct a shape with the brief's area on the grid

## 25. typing-shooter — Typing Shooter

- **id:** `typing-shooter`
- **Hook:** Type the answer to shoot the asteroid before it hits the base.

**Core loop.** Asteroids drift down from the top, each carrying a short prompt (a sentence with a blank, a misspelled word, a broken line of code). The player types the answer; the first letters lock the target onto the asteroid whose answer begins that way, and completing the word fires a laser that destroys it. A wrong word (Enter on a non-matching answer) bounces off with sparks and the asteroid highlights its clue; asteroids reaching the base cost a shield point. A combo multiplier rewards unbroken accuracy; waves grow in density and speed. On touch devices a compact on-screen keyboard or a 4-choice fallback is used.

**Learning decision.** Consumes `text` items (the `answer` is what to type; alternatives in the `answer` array are accepted). The asteroid is the question and typing is the action; no pauses. Wrong word: the asteroid freezes for a moment, the card shows the correct word with the differing letters highlighted and the `explanation` ("their shows ownership; there is a place"); dismiss by tap; the asteroid resumes closer. After two misses the first letter is shown on the asteroid.

**Difficulty levers.** Fall speed; asteroid count on screen; prompt length; typing accuracy requirement (exact vs normalised); shield points; timed waves; adaptive item difficulty.

**Juice moments.** Laser with recoil; asteroid shatter; letters lighting up as they are typed; combo text and multiplier colour; shield crack; boss asteroid with a multi-word answer breaking piece by piece.

**Session structure.** 3 waves of 12 asteroids with speed and length rising. Finale: **Boss Asteroid** — one large asteroid with a three-word answer that must be typed in order under a 30-second approach.

**Best fit.** Elementary to high. Homophones and spelling, verb forms, code syntax, world-language vocabulary.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| waves | int | 3 | stage count |
| asteroidsPerWave | int | 12 | targets per wave |
| fallSpeed | number | 30 | px per second at wave 1 |
| speedPerWave | number | 1.25 | multiplier per wave |
| maxOnScreen | int | 3 | asteroids at once |
| shields | int | 3 | lives |
| touchFallback | string | 'keyboard' | 'keyboard' or 'choices' |
| finaleWords | int | 3 | words in the boss answer |
| theme | object | space | backdrop, ship sprite, palette |

**Re-skins.**
- Homophone Hunter - ela - 5-6 - homophones, irregular plurals, verb tenses, commonly confused words - asteroids carry sentences with a blank and the wrong word bounces off highlighting the clue
- Syntax Shooter - cs - 7-9 - syntax and keywords, variables and types, string operations - asteroids carry broken lines and you type the fix
- Vocab Volley - languages - 7-8 - Spanish vocabulary, accents - type the Spanish word for the picture on the asteroid and accents count
- Spell Storm - ela - 3-4 - spelling patterns, silent letters - a word is spoken and you type it
- Formula Fire - science - 9-10 - chemical formulas - the asteroid shows a compound name and you type its formula

## 26. stack-drop — Stack Drop

- **id:** `stack-drop`
- **Hook:** Blocks fall; stack them so they build the thing the order card asks for, before the pile hits the roof.

**Core loop.** Labelled blocks fall one at a time into a well (arrows / swipe to move, down to drop, tap column on touch). An order card names the target (a number to build from tens and ones, a sentence from words, a byte from bits, a product's supply chain). Blocks that belong go into the structure in the right place and snap with a click; a block placed where it does not belong wobbles and must be removed by dropping the next correct block on it, costing height. Ten ones placed in a row fuse into a ten-rod, a capital word placed first turns gold; these transformations are the teaching. Completing the order clears the structure with a flourish; the pile reaching the roof ends the stage.

**Learning decision.** Consumes `build` items (parts = the block labels including decoys, target = the ordered correct stack) and `sequence` items (ordering a given set). Each placement is a local decision; the item grades on completion via `ctx.answer` with the assembled order. Wrong placement: the well dims, the misplaced block flashes with the correct position outlined, the card shows the `explanation` ("the capital letter starts the sentence, so it goes first"); dismiss by tap. Hints outline the next correct slot.

**Difficulty levers.** Fall speed; decoy block ratio; target length; well height; fusing rules (10 → 1, 8 bits → 1 byte); timed orders; adaptive item difficulty.

**Juice moments.** Block snap; fuse animation with a flash (ten ones become a rod); structure complete with a camera pull-back; wobble warning; roof alarm; finale skyscraper topping out with fireworks.

**Session structure.** 3 shifts with faster drops and longer targets. Finale: **Skyscraper** — a single long target (a three-digit number, a full paragraph, a 16-bit value) built under a timer; topping out triggers fireworks.

**Best fit.** Early to high. Place value, sentence order, binary, particle arrangements, supply chains.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| shifts | int | 3 | stage count |
| ordersPerShift | int | 5 | items per stage |
| fallSpeed | number | 60 | px per second at shift 1 |
| speedPerShift | number | 1.3 | multiplier per shift |
| wellCols | int | 7 | columns in the well |
| wellRows | int | 10 | rows before the roof |
| decoyRatio | number | 0.25 | share of falling blocks that are decoys |
| fuseRule | object | null | `{ count, from, to }` transformation, for example 10 ones to a ten |
| timedOrders | bool | false | per-order timer in shift 3 |
| theme | object | construction | block art, palette, crane sprite |

**Re-skins.**
- Place Value Pile-Up - math - 1-2 - tens and ones, bundling, compare two-digit numbers - falling unit blocks snap into a ten-rod when ten stack and you build the spoken number before the pile reaches the roof
- Sentence Stacker - ela - 2-3 - sentence word order, capital letters, end punctuation - the capital must land first and the punctuation last or the tower topples
- Supply Chain Stacker - social - 9-12 - globalization, comparative advantage, supply chains - stack production stages in the order a real product travels and a misplaced stage collapses
- Binary Bakery - cs - 4-5 - binary numbers, bits and bytes, pixels - stack 1 and 0 tiles to bake the ordered number and eight tiles make a byte-cake
- Matter Lab Stacker - science - 3-5 - states of matter, particle arrangement, heating and cooling - stack particle tiles tightly for solid, loose for liquid, scattered for gas to match the stated temperature

## 27. circuit-connect — Circuit Connect

- **id:** `circuit-connect`
- **Hook:** Wire the nodes so the current flows; a wrong connection is where the light goes out.

**Core loop.** A board of nodes (components, branches of government, claims and evidence, network routers) with ports. The player drags wires between ports (tap port, tap port on touch); a Test button sends a pulse that animates along the wires. Where the connection is right the pulse passes and the node lights; where it is wrong the pulse stops with a spark and the node shows why it cannot accept that input. The goal of each board is stated on a card ("light all three bulbs", "route the packet to 10.0.0.7", "connect each branch to its power"). Boards grow in node count and add decoy ports.

**Learning decision.** Consumes `match` items (left nodes to right nodes; the mechanic lays them out as ports and grades the wiring map) and `build` items (an ordered path through nodes). Testing is the commit. Wrong wiring: the pulse stops at the bad wire, the wire turns red, the card shows the correct connection, the `explanation` ("plastic is an insulator, so current stops here") and the `visual`; dismiss by tap. Hints light one correct wire.

**Difficulty levers.** Node count; decoy ports; series vs parallel paths; one-to-many connections; test attempts; board timer; adaptive item difficulty.

**Juice moments.** Pulse racing along wires with a hum; bulb glow bloom; spark and smoke on a fault; whole-board illumination with a chord; city skyline lighting up in the finale.

**Session structure.** 3 boards (simple, branching, decoyed). Finale: **Power the City** — a 10-node board where every district must light at once; success rolls a skyline lighting sequence.

**Best fit.** Elementary to high. Electric circuits, government structures, claim-evidence-citation, networks.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| boards | int | 3 | stage count |
| itemsPerBoard | int | 3 | wiring puzzles per board |
| nodesMax | int | 10 | nodes in the largest board |
| decoyPorts | int | 2 | ports that connect to nothing valid |
| testsPerItem | int | 3 | attempts |
| pulseSpeed | number | 400 | px per second |
| timerSec | number | 0 | 0 disables |
| theme | object | circuit | wire colours, node icons, backdrop |

**Re-skins.**
- Circuit City - science - 4-5 - electric circuits, conductors and insulators, series vs parallel - connect batteries, switches and bulbs on a city block and a wrong material keeps the street dark
- Government Gears - social - 4-5 - three branches, checks and balances, how a bill becomes law - connect branches to their powers so the gear train turns and a wrong connection jams the gears
- Network Nodes - cs - 6-7 - how the internet works, packets and routing, IP addresses - wire nodes so a packet reaches its address and a wrong hop shows the packet getting lost
- Citation Circuit - ela - 9-10 - citing textual evidence, paraphrase vs quotation, MLA basics - wire claim to evidence to citation and a plagiarised node shorts the circuit
- Body Systems Board - science - 7 - organ systems and functions - connect organs to the system they belong to so the body lights up

## 28. story-choice — Story Choice

- **id:** `story-choice`
- **Hook:** A branching story where every choice is a craft or comprehension decision, and weak choices dead-end the plot.

**Core loop.** A scene plays as illustrated text with a character portrait (spoken in world-language packs). Every 20-40 seconds the story stops at a choice point with 3 options; the options are not "what should the hero do" but "which line foreshadows the ending", "which sentence the shopkeeper actually said", "which stage direction gets the laugh". The chosen option is woven into the next scene, so the player immediately sees its effect: a strong choice opens a path and raises the tension meter, a weak choice produces a flat scene and a narrator aside explaining what went wrong before the scene rewinds one step. Collectibles (story beads) reward reading the scene before choosing.

**Learning decision.** Consumes `choice` items. The choice is in-canvas with the scene visible; the prompt is the narrator's question. Wrong choice: the weak scene plays for three seconds, then a card shows the strong choice, the `explanation` ("foreshadowing hints at what will happen without saying it") and the scene rewinds; dismiss by tap. Hints reveal one bead's clue text.

**Difficulty levers.** Scene length (reading load); number of options; similarity of options; time limit on choices (none → 20 s); hidden text after a delay for listening comprehension; adaptive item difficulty.

**Juice moments.** Page-turn animation; portrait expressions reacting to the choice; tension meter sting; bead collect chime; branch map filling in at chapter ends; finale ending card with an illustrated recap of all strong choices.

**Session structure.** 3 chapters, each introducing a new craft concept and a new location. Finale: **The Ending** — four consecutive choices with no rewinds decide which of three endings plays.

**Best fit.** Middle and high. Narrative craft, listening comprehension in a world language, drama elements, historical perspective.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| chapters | int | 3 | stage count |
| choicesPerChapter | int | 6 | choice points per chapter |
| optionCount | int | 3 | options per choice |
| choiceTimerSec | number | 0 | 0 disables |
| speakScenes | bool | false | speak scene text (world-language packs) |
| hideTextAfterSec | number | 0 | 0 keeps text visible |
| finaleChoices | int | 4 | consecutive choices in the finale |
| theme | object | storybook | portraits, backgrounds, fonts |

**Re-skins.**
- Plot Twist - ela - 7-9 - plot structure, types of conflict, narrative perspective, foreshadowing - choices are craft decisions and weak craft dead-ends the plot
- Viaje Story - languages - 9-10 - travel vocabulary, polite forms, listening comprehension - a trip told in Spanish where each choice is a comprehension check and misunderstandings send you to the wrong city
- Director's Cut - arts - 6-8 - elements of drama, stage directions, character objectives - direct a scene and the audience meter reacts to what theatre craft says works
- Perspectives 1776 - social - 8 - points of view in the American Revolution, primary sources - the same event is told from three perspectives and choices test whose account says what
- Fable Forge - ela - 4-5 - moral of the story, character traits, dialogue - choose the line that fits the character and the fable's moral

## 29. idle-tycoon — Idle Tycoon

- **id:** `idle-tycoon`
- **Hook:** Income ticks in while you think; every upgrade is a decision with a number behind it.

**Core loop.** A side view of a growing operation (a savings account, a farm, a power plant). Resources accumulate automatically at a visible rate. The player buys upgrades from a panel; each upgrade is gated by a short question that is its description in disguise ("this account pays 5% a year: how much after 2 years on 100?"). A correct answer buys the upgrade at list price; a wrong answer shows the working and charges 25% extra, so bad calls are visible as a slower tick rate. Every two minutes an event (a loan offer, a drought) poses a bigger choice. The session ends at a target net worth or at the time limit, whichever first; idle is honest here, nothing accrues while the tab is hidden.

**Learning decision.** Consumes `choice` and `numeric` items with a `visual` of kind `bar` or `line`. The upgrade panel is the question panel. Wrong answer: the card shows the worked calculation and the `explanation` ("compound interest pays interest on the interest"); dismiss by tap; the upgrade still buys at a penalty. Hints show the formula.

**Difficulty levers.** Tick rate; upgrade cost curve; penalty rate; numeric tolerance; event frequency; question difficulty per upgrade tier; session target.

**Juice moments.** Counter ticking with coin sounds that speed up; building growth animations; "milestone" banners; event storm clouds; final net-worth reveal with a rising bar.

**Session structure.** 3 tiers of upgrades, each a scale change. Finale: **The Big Decision** — a single large investment question with the whole balance at stake; the right call doubles the tick rate for the last minute.

**Best fit.** Middle and high. Personal finance, percent and interest, energy and resources, exponential growth.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| tiers | int | 3 | upgrade tiers |
| upgradesPerTier | int | 4 | upgrades per tier |
| baseTick | number | 1 | income per second at start |
| penaltyRate | number | 0.25 | extra cost after a wrong answer |
| eventEverySec | number | 120 | event interval |
| targetWorth | number | 5000 | ends the session |
| sessionCapSec | number | 480 | hard time limit |
| numericTolerance | number | 0.02 | relative tolerance |
| theme | object | farm | building art, currency, palette |

**Re-skins.**
- Budget Builder - social - 7-9 - budgeting, simple and compound interest, credit and debt - income ticks in idly and bad credit choices visibly slow the tick rate
- Percent Plantation - math - 6-7 - percent increase and decrease, discounts, tax - every upgrade price is a percent problem
- Power Plant - science - 8-9 - energy sources, efficiency, renewable vs non-renewable - upgrades are generators and the question is their real efficiency
- Startup Sim - cs - 9-10 - computing costs, scaling, data storage units - upgrades are servers priced by storage and throughput questions
- Exponential Estate - math - 9-10 - exponential growth, compound interest formulas - the tick rate itself is the function you must predict

## 30. trace-draw — Trace Draw

- **id:** `trace-draw`
- **Hook:** Draw it right and it comes alive; draw it wrong and the guide shows where your line wandered.

**Core loop.** A faint guide (a letter, a shape, a vanishing-line box, a music clef) is shown on canvas with a start dot. The player draws with pointer or finger; the mechanic samples the stroke and scores it against the guide (coverage, order, direction) in real time, lighting the guide green as it is covered. A good trace animates the thing drawn (the letter sounds, the shape fills and spins, the box becomes a 3D room); a poor trace shows the stroke overlaid on the guide with the drift highlighted and a tip, then offers a retry. Later rounds remove the guide and show only the prompt ("draw a lowercase b", "draw the horizon line").

**Learning decision.** Consumes `build` items where `parts` are stroke ids and `target` is the ordered stroke list (the item `visual` holds the guide path data) and `choice` items for recognition rounds ("which of these is drawn in one-point perspective?"). Wrong trace: the overlay shows the correct strokes in order with arrows, the `explanation` ("lowercase b starts with the tall line, then the bump on the right") and the drift map; dismiss by tap. Hints animate the first stroke.

**Difficulty levers.** Tolerance band width; guide visibility (full → dots → none); stroke order enforcement; number of strokes; timer; adaptive item difficulty.

**Juice moments.** Guide lighting up under the pen; completed drawing animating (letter bounces and speaks, shape spins); ink splash; gallery wall filling with the player's drawings; finale where all drawings animate together.

**Session structure.** 3 sketchbooks (guided, dotted, free). Finale: **Gallery Night** — five free draws in a row judged by the checker; a passing gallery animates every piece.

**Best fit.** Early to middle. Letter formation, shapes, perspective and contour drawing, clefs and note heads, map outlines.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| sketchbooks | int | 3 | stage count |
| drawsPerBook | int | 5 | items per stage |
| toleranceBand | number | 18 | logical px around the guide |
| coverageToPass | number | 0.85 | fraction of guide covered |
| enforceOrder | bool | true | stroke order must match |
| guideMode | array | full, dots, none | guide per sketchbook |
| strokeWidth | number | 8 | logical px |
| theme | object | sketchbook | paper texture, ink colour |

**Re-skins.**
- Perspective Trace - arts - 6-7 - one-point perspective, horizon line, proportion, contour lines - trace the vanishing lines to the correct point and a wrong horizon is shown as the box tilting
- Letter Lab - ela - 1 - letter formation, uppercase and lowercase, stroke order - a good trace makes the letter say its sound
- Shape Studio - math - 1-2 - 2D shapes, sides and vertices - draw the shape named and it fills and spins
- Clef Calligraphy - arts - 4-5 - treble and bass clefs, note heads, stems - trace the clef then draw note heads on the named lines
- Map Maker - social - 3-4 - continents and outlines, compass rose - trace the outline of the named continent

## 31. pattern-echo — Pattern Echo

- **id:** `pattern-echo`
- **Hook:** Listen, then play it back; the pattern grows by one every time you get it right.

**Core loop.** Four to six large pads, each with a colour, a shape and a sound (a pitch, a syllable, a word). The game plays a pattern on the pads; the player echoes it by tapping the pads (or pressing 1-6) in order. A correct echo adds one element and plays the longer pattern; a wrong tap stops the pattern with a buzz, shows the full pattern replayed slowly with the mistaken step highlighted, and restarts at the same length. Rounds change what the pads mean: pitches (echo the melody), stressed vs unstressed syllables (echo the meter), colours in a sequence (echo the pattern rule), words (echo the sentence).

**Learning decision.** Consumes `sequence` items (the `items` are pad ids in order; the mechanic plays them and grades the echo via `ctx.answer` with the tapped indices). The playback is the question and the echo is the answer; nothing pauses. Wrong echo: the pads replay the pattern slowly with the wrong step in red and the correct pad pulsing, the card shows the `explanation` ("the melody went up a step, so the next pad is the higher one") for rounds where the pattern has a rule; dismiss by tap for rule patterns, auto-dismiss for pure memory patterns. Hints replay the pattern once more.

**Difficulty levers.** Pattern length; playback speed; pad count; hiding the visual cue (audio only); rule-based patterns vs memory patterns; timer on the echo; adaptive item difficulty.

**Juice moments.** Pads lighting with a bloom and tone; pattern-complete chord; length milestone banners; audio-only mode with pads dimmed and a spotlight; finale with all pads strobing on a long pattern.

**Session structure.** 3 rounds (visual plus audio, audio only, rule patterns) of growing length. Finale: **Long Echo** — a 10-element pattern played once, echoed with no cue.

**Best fit.** Early and elementary. Melodic and rhythmic echo, phonemes and syllable stress, pattern rules, word order in a world language.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| rounds | int | 3 | stage count |
| pads | int | 4 | pads on screen |
| startLength | int | 2 | pattern length at round start |
| maxLength | int | 8 | length that completes a round |
| playbackMs | number | 600 | ms per element at round 1 |
| speedPerRound | number | 0.8 | playback multiplier per round |
| audioOnlyRound | int | 2 | round index that hides visual cues (0 disables) |
| echoTimerSec | number | 0 | 0 disables |
| theme | object | studio | pad colours and shapes, sound set |

**Re-skins.**
- Melody Echo - arts - 2-3 - echo melodic patterns, rhythm patterns, call and response, steady beat - hear a short phrase and echo it on four pitch pads, patterns grow one note per round
- Phoneme Echo - ela - 1 - phoneme segmentation, blending - pads are sounds and echoing them in order blends the spoken word
- Meter Echo - ela - 6-8 - poetic meter, rhyme scheme, stanza forms - hear a line and echo its stress pattern on two pads, rhyme rounds echo the scheme letters
- Palabras Echo - languages - 3-4 - word order, sentence building, listening - pads are Spanish words and the echo must rebuild the spoken sentence
- Pattern Pads - math - 1-2 - repeating patterns, growing patterns - pads are shapes and the echo must continue the rule, not just repeat it

## 32. auction-bid — Auction Bid

- **id:** `auction-bid`
- **Hook:** Estimate, then bid; the closest bid without going over wins the lot.

**Core loop.** An auction house. Each lot shows an estimation prompt with a picture ("how many centimetres long is this bus?", "what year did this machine appear?", "what is 38% of 250?"). The player and three AI bidders bid with a slider and bid buttons (+1, +10, +100) over a 12-second clock; the lot goes to the highest bid that does not exceed the true value, and the winner pays their bid out of a budget while an over-bidder loses the lot and sees the true value with the reasoning. Winning lots fill a collection; the budget forces honest estimation rather than always bidding high. Party mode runs hot-seat for up to four players.

**Learning decision.** Consumes `numeric` items (the `answer` is the true value; the mechanic treats a bid within `tolerance` as the best possible) and `choice` items for "appraisal" rounds (which of three estimates is most reasonable). The bid is the answer; the clock keeps it moving. Over-bid or far-under bid: the card shows the true value, the `explanation` with the estimation strategy ("a bus is about 12 m, so 1200 cm") and the `visual` (a reference object for scale); dismiss by tap. Hints show a reference object next to the lot.

**Difficulty levers.** Clock length; AI bidder aggressiveness; tolerance band; budget size; magnitude span of the lots; appraisal rounds; adaptive item difficulty.

**Juice moments.** Gavel bang with shake; paddle raise animations; bid counter rolling; "SOLD" stamp; collection shelf filling; finale lot with a spotlight and a slow gavel.

**Session structure.** 3 auctions of 5 lots each with a growing magnitude span. Finale: **The Masterpiece** — one lot with a wide range where the whole remaining budget is at stake.

**Best fit.** Elementary to high. Estimation and measurement, percent, historical dates, scientific magnitudes, economic values.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| auctions | int | 3 | stage count |
| lotsPerAuction | int | 5 | items per stage |
| clockSec | number | 12 | bidding time |
| aiBidders | int | 3 | opponents |
| aiAggression | number | 0.5 | 0..1 how close AI bids get to the true value |
| budget | number | 1000 | starting budget |
| bidSteps | array | 1,10,100 | bid button increments |
| players | int | 1 | hot-seat players (1-4) |
| theme | object | auction house | lot frames, gavel, palette |

**Re-skins.**
- Measure Market - math - 3-4 - estimate length and mass, metric units, benchmarks - lots are everyday objects shown next to a reference object
- Percent Paddles - math - 6-7 - percent of a quantity, discounts, tips - lots are shop prices and the true value is the discounted price
- Date Dealer - social - 7-8 - historical dates, inventions, eras - lots are artefacts and the bid is the year
- Magnitude Mart - science - 8-10 - orders of magnitude, scientific notation, scale of the universe - lots are objects and the bid is the exponent
- Appraisal Arcade - social - 11-12 - market value, inflation, opportunity cost - lots are goods across decades and the bid is the inflation-adjusted price

## 33. fishing-collect — Fishing Collect

- **id:** `fishing-collect`
- **Hook:** Cast for the fish that matches the order; the wrong catch flops back and tells you what it was.

**Core loop.** A calm lake or café counter. Labelled fish (words, numbers, pictures) swim at different depths and speeds; an order card at the top says what to catch ("a simile", "a prime", "une pomme"). The player holds to lower the line (Space or touch), releases to hook when the line is over a fish, and taps rhythmically to reel it in (a tiny timing minigame). A matching catch lands in the bucket with a splash and a tally; a wrong catch flops back into the water with a short card explaining what it actually was. Orders change every 3-4 catches, and a rare golden fish carries a bonus item worth double.

**Learning decision.** Consumes `choice` items (the `choices` are the fish currently swimming; the prompt is the order) and `sort` items for bucket rounds (sort the day's catch into labelled buckets). The lake is the question screen and the cast is the answer; no pauses. Wrong catch: the fish is shown large with its real label, the card shows the `explanation` ("this is a metaphor: it says the moon IS a lantern, with no like or as"); dismiss by tap; the fish swims back. Hints make matching fish glint.

**Difficulty levers.** Fish speed and depth; number of fish; decoy similarity; reel minigame difficulty; order length (one fish → three fish in order); timer per order; adaptive item difficulty.

**Juice moments.** Cast arc and plop; hook tug with controller-like shake; fish leaping into the bucket with a splash; golden fish shimmer; bucket-full fanfare; finale with a rising moon and a big fish silhouette.

**Session structure.** 3 spots (shallows, reef, deep) with faster fish and longer orders. Finale: **The Big One** — a three-part order that must be caught in sequence, with a long reel minigame on the last fish.

**Best fit.** Early to middle. Figurative language, vocabulary in a world language, number properties, animal classification. Relaxed pace suits anxious or younger players.

**Config knobs.**

| knob | type | default | meaning |
|---|---|---|---|
| spots | int | 3 | stage count |
| catchesPerSpot | int | 8 | correct catches per stage |
| fishOnScreen | int | 6 | fish swimming at once |
| fishSpeed | number | 50 | px per second at spot 1 |
| speedPerSpot | number | 1.25 | multiplier per spot |
| reelTaps | int | 4 | taps to land a fish |
| orderLength | int | 1 | fish per order at spot 1 |
| goldenChance | number | 0.1 | chance a fish is golden |
| bucketRounds | bool | true | sort item at the end of each spot |
| theme | object | lake | water palette, fish sprites, dock art |

**Re-skins.**
- Figurative Fishing - ela - 4-5 - similes and metaphors, idioms, personification, alliteration - fish carry phrases and the wrong catch flops back explaining its type
- Café Catch - languages - 6-8 - French food vocabulary, gender and articles, numbers, greetings - catch the fish whose label matches the spoken order and wrong fish repeat the word slowly
- Prime Pond - math - 4-5 - primes and composites, factors, even and odd - the order names a property and fish carry numbers
- Classification Cove - science - 3-4 - vertebrate groups, animal classification, adaptations - fish are animals and the order names a group
- Counting Creek - math - 1 - count to 20, one more and one less, compare numbers - fish carry dot patterns and the order is spoken

---

## Appendix: choosing a mechanic for a new game

1. Start from the skill, not the theme. Write the learning decision as one sentence ("decide whether this fraction is less than one half"). Then find the mechanic whose core loop makes that decision the game action: a yes/no per object is grid-collector or conveyor-sort; pick-one-of-three at speed is lane-runner, racing or platformer; assemble-from-parts is merge-grid, stack-drop or block-coding; order is timeline-sequencer; pair is memory-pairs or circuit-connect; set a number is physics-launcher, system-sim or auction-bid; find the element is deduction.
2. Check the pace against the age band (`docs/GAME_DESIGN_GUIDE.md` section 6). Early grades get fast but forgiving mechanics (lane-runner, fishing-collect) or slow and tactile ones (memory-pairs, trace-draw); high school can take slow strategic pace (map-conquest, tycoon-sim, card-battler).
3. Check `docs/PHASE2_BACKLOG.md` for the uniqueness rule: no two games may share mechanic + subject + grade band.
4. Write the re-skin line for your game in the format used above and add it to the mechanic's section when the game ships.

