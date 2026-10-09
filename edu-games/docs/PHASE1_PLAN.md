# Phase 1 Plan: Foundation + 13 Flagship Games

Phase 1 delivers the shared kit, the full K-12 curriculum map, the mechanic catalog, the launcher, and 13 fully playable flagship games. Each flagship game establishes one reusable mechanic, so Phase 2 can produce the remaining ~90 games mostly as mechanic x content-pack pairings.

Read `docs/ARCHITECTURE.md` first. It is the contract.

## Subjects and grade bands

| Subject id | Name | Bands used in Phase 1 |
|---|---|---|
| math | Mathematics | early (1-2), elementary (4-5), middle/high (7-9) |
| science | Science | elementary (3-5), middle/high (7-9) |
| ela | English Language Arts | early (2-3), middle (6-8), high (9-12) |
| social | Social Studies | middle (6-8), high (10-12) |
| cs | Computer Science and Digital Literacy | elementary (3-5) |
| languages | World Languages (Spanish) | middle (6-8) |
| arts | Arts and Music | elementary (3-6) |

## Flagship games

Each brief: id, mechanic, subject, grades, core loop, how learning IS the mechanic, stages and finale, item types, skills. Skill ids below are REQUIRED to exist in `curriculum/map.json`; curriculum authors must include them verbatim.

### 1. number-gate-runner (mechanic: `lane-runner`) · math · grades 1-2 · early
- **Core loop.** Auto-running hero in a bright candy-forest world, 3 lanes. Every ~4 s a prompt appears big at the top ("7 + 5 = ?", spoken aloud) and three gates roll toward you, one per lane, each showing an answer. Steer (arrow keys, A/D, swipe, or tap a lane) through the correct gate. Correct = speed boost, coins, combo meter up, confetti. Wrong = stumble, lose a heart, run slows, a ten-frame/number-line card shows why, tap to continue.
- **Learning is the mechanic.** Choosing the gate is the only steering decision that matters.
- **Stages.** 3 biomes (meadow, river, mountain) with increasing speed and shorter decision windows; coins between gates; finale "Bridge Builder": a long gap, pick 3 gates in a row to complete number bonds and build the bridge.
- **Items.** choice (3 choices), `visual: { kind: 'tenframe'|'numberline', ... }` on difficulty 1-2.
- **Skills.** `math.1.add-sub-20.add`, `math.1.add-sub-20.subtract`, `math.1.add-sub-20.missing-addend`, `math.1.place-value.tens-ones`, `math.2.numbers-100.compare`, `math.2.skip-counting.count-by`.

### 2. fraction-fortress (mechanic: `tower-defense`) · math · grades 4-5 · elementary
- **Core loop.** Goblins carrying fraction banners march along a path toward your castle wall. Tower slots line the path. To build a tower you solve a slot card (e.g. "Which equals 3/4?"): correct = tower built (faster answers = stronger tower), wrong = card explains with a fraction-bar visual, slot stays empty for a moment. Each tower has a targeting rule shown on it (e.g. "hits fractions < 1/2"): enemies whose banner matches the rule take damage, so placing towers is also a comparison decision. Upgrade towers between waves with harder cards.
- **Learning is the mechanic.** Both building (equivalence/arithmetic) and targeting (comparison) are fraction decisions.
- **Stages.** 6 waves across 3 phases (unit fractions, equivalents, unlike denominators); boss wave: a giant with a mixed-number shield that only falls to correctly converted improper fractions.
- **Items.** choice (4 choices), `visual: { kind: 'fractionbar', n, d }`.
- **Skills.** `math.4.fractions.equivalent`, `math.4.fractions.compare`, `math.4.fractions.add-sub-like`, `math.5.fractions.add-sub-unlike`, `math.4.fractions.mixed-numbers`.

### 3. algebra-kart (mechanic: `racing`) · math · grades 7-9 · middle/high
- **Core loop.** Top-down kart race, 3 laps vs 3 AI karts. Track signs show an equation ("3x - 4 = 11"); ahead, three boost pads marked with candidate values of x. Drive onto the correct pad = turbo; wrong pad = oil slick spin plus a worked-solution card. Steering with arrows/swipe; drifting corners for fun.
- **Learning is the mechanic.** Pad choice decides the race.
- **Stages.** 3 tracks (one-step, two-step and distributive, inequalities and systems); pit-stop mini "tune-up" between laps: answer a slope/graph question to upgrade kart; finale: final lap with "chain pads" (two-step chains).
- **Items.** choice (3 choices), `visual: { kind: 'graph', ... }` for slope items.
- **Skills.** `math.7.equations.one-step`, `math.7.equations.two-step`, `math.7.expressions.distributive`, `math.8.linear.slope`, `math.7.inequalities.solve`, `math.8.systems.solve`.

### 4. food-chain-frenzy (mechanic: `grid-collector`) · science · grades 3-5 · elementary
- **Core loop.** Snake-style grid in a biome (pond, savanna, forest). You are an organism (e.g. a grasshopper); the grid fills with food items and other organisms. Eat only what your organism really eats to grow; eating something wrong shrinks you and shows why; predators chase you. Fill the growth bar to "level up the food chain" (become the next consumer) and your valid food set changes.
- **Learning is the mechanic.** Every move is a "does X eat Y?" decision.
- **Stages.** 3 biomes x 3 trophic levels; between levels a sort card (producer/consumer/decomposer) grants a shield; finale: the Food Web Storm where arrows show a web and you must eat in correct order to restore balance.
- **Items.** choice (used in-canvas as "which of these can I eat"), sort.
- **Skills.** `science.3.ecosystems.food-chains`, `science.3.ecosystems.producers-consumers`, `science.4.ecosystems.energy-flow`, `science.3.adaptations.habitats`, `science.5.ecosystems.food-webs`.

### 5. molecule-merge (mechanic: `merge-grid`) · science · grades 7-9 · middle/high
- **Core loop.** Atom tiles (H, O, C, Na, Cl...) drop into a 6x7 grid like a drop-merge puzzle. A target formula list sits on the right (H2O, CO2, NaCl, CH4...). Drag/tap to combine adjacent atoms; a combination that matches a real target compound fuses into a glowing molecule tile and scores; a wrong combination fizzes and shows why (valence). Board fills = game over.
- **Learning is the mechanic.** Merging is reading and applying formulas and valence.
- **Stages.** Element symbols only, then formulas, then valence/ionic vs covalent, finale: "Balance the Reaction" where reactant molecule tiles must be merged into balanced product counts.
- **Items.** build (parts = atoms, target = atoms in the compound), choice.
- **Skills.** `science.7.matter.element-symbols`, `science.8.chemistry.formulas`, `science.8.chemistry.bonding-valence`, `science.8.chemistry.periodic-groups`, `science.9.chemistry.balancing`.

### 6. word-wizard-duel (mechanic: `turn-battle`) · ela · grades 2-3 · early
- **Core loop.** Turn-based RPG duel against silly monsters. Your spells are words: a picture + spoken word appears; build it from letter tiles (text item) or pick the correct spelling/vowel-team/sight word (choice). Correct spell = damage (longer words hit harder); wrong = monster laughs and you see the word built correctly with the tricky part highlighted. Monster attacks on a visible timer, so speed matters but is not everything.
- **Learning is the mechanic.** Spelling is attacking.
- **Stages.** 3 dungeons (short vowels/blends, vowel teams/digraphs, syllables/affixes), 3 monsters each, final boss "The Mumbler" whose attacks can only be countered by splitting words into syllables.
- **Items.** text (spelling with letter tiles), choice.
- **Skills.** `ela.2.phonics.short-long-vowels`, `ela.2.phonics.blends-digraphs`, `ela.2.phonics.vowel-teams`, `ela.2.spelling.sight-words`, `ela.3.spelling.syllables`, `ela.3.vocabulary.prefixes-suffixes`.

### 7. grammar-heist (mechanic: `deduction`) · ela · grades 6-8 · middle
- **Core loop.** Noir heist. Each vault has a lock with 3-5 "pins", each pin a sentence puzzle: tap the word that is the adverb, pick the corrected comma placement, choose the clause type, fix agreement. A moving laser timer pressures you. Correct pin = click, the lock turns; wrong = alarm tick (3 ticks = guards arrive, lose a tool), explanation shown with the sentence annotated.
- **Learning is the mechanic.** Grammar analysis opens vaults.
- **Stages.** 3 buildings (museum, bank, mansion) with escalating sentence complexity; evidence board tracks skills mastered; finale: "The Manuscript", edit a short paragraph by fixing 5 planted errors before the timer ends.
- **Items.** choice (tap-the-word is a choice where choices are the sentence's words), text.
- **Skills.** `ela.6.grammar.parts-of-speech`, `ela.6.grammar.subject-verb-agreement`, `ela.7.grammar.clauses-sentence-types`, `ela.7.punctuation.commas-semicolons`, `ela.6.grammar.pronoun-antecedent`, `ela.8.grammar.active-passive`.

### 8. rhetoric-arena (mechanic: `card-battler`) · ela · grades 9-12 · high
- **Core loop.** Debate duel. The opponent plays a statement card (a real-feeling sentence). Your hand holds device/appeal/fallacy cards. Play the card that correctly names what the statement does (ethos? anaphora? straw man?) to block it and deal damage; wrong card = you take damage and see the statement annotated. Build combos by chaining Claim, Evidence and Reasoning cards into a full argument for a finisher.
- **Learning is the mechanic.** Identifying rhetoric is the card play.
- **Stages.** 3 opponents (campus debater, ad executive, politician) with increasing subtlety; deck grows; finale: "Closing Statement", a CER chain under time.
- **Items.** choice, sequence (CER chain).
- **Skills.** `ela.9.rhetoric.appeals`, `ela.10.rhetoric.devices`, `ela.10.argument.fallacies`, `ela.9.argument.claim-evidence-reasoning`, `ela.11.literary.devices`, `ela.11.rhetoric.tone-diction`.

### 9. empire-of-eras (mechanic: `map-conquest`) · social · grades 6-8 · middle
- **Core loop.** Stylised hex-region map of the ancient world. Each turn, choose an adjacent region to claim; a question about that region/era appears (geography, civilization facts, chronology). Correct = region claimed with a satisfying banner plant; wrong = rival empire takes it, explanation card. Rivals expand on their own. Wonders are built by sequencing 4-5 events of an era (sequence item).
- **Learning is the mechanic.** Expansion is knowledge of place and time.
- **Stages.** 3 eras (river valleys, classical, post-classical); finale: "Great Wonder", a 6-event timeline under pressure that decides the map.
- **Items.** choice, sequence.
- **Skills.** `social.6.ancient.civilizations`, `social.6.geography.physical`, `social.7.geography.climate-regions`, `social.6.history.chronology`, `social.7.civics.government-types`, `social.7.economics.trade`.

### 10. market-mayhem (mechanic: `tycoon-sim`) · social · grades 10-12 · high
- **Core loop.** Run a business across 12 quarters. Each quarter: a live supply/demand chart, a news event ("input costs rise 20%", "competitor enters"), and a decision: set price and quantity, then answer the economics question the event poses ("What happens to equilibrium price?"). Correct reasoning = profit spike, wrong = loss and an annotated chart explaining the shift. Reinvest profits into upgrades.
- **Learning is the mechanic.** Economic reasoning is the business decision.
- **Stages.** Lemonade stand, regional chain, national company; finale: "Recession", 3 linked policy questions decide survival.
- **Items.** choice, numeric, `visual: { kind: 'sd-chart', ... }`.
- **Skills.** `social.11.economics.supply-demand`, `social.11.economics.elasticity`, `social.12.economics.inflation-interest`, `social.11.economics.opportunity-cost`, `social.12.economics.fiscal-monetary-policy`, `social.12.economics.market-structures`.

### 11. robot-route (mechanic: `block-coding`) · cs · grades 3-5 · elementary
- **Core loop.** Grid puzzles. Drag blocks (move, turn left/right, repeat N, if path ahead, function F1) into a program; press Run; the robot animates; collect all gems to pass. Block budget forces loops. Debug levels hand you a broken program to fix. Instant replay on failure with the failing step highlighted and a hint.
- **Learning is the mechanic.** The program is the only way to move.
- **Stages.** 4 worlds (sequences, loops, conditionals, functions), 4 puzzles each; finale: "The Factory", one long level needing all four.
- **Items.** The mechanic uses `build` items where `parts` are block ids and `target` is one valid program (the mechanic ALSO accepts any program that solves the level by simulation; the item's `visual` holds the level grid). Also choice for "predict the output" cards between worlds.
- **Skills.** `cs.3.programming.sequences`, `cs.3.programming.loops`, `cs.4.programming.conditionals`, `cs.4.programming.debugging`, `cs.5.programming.functions`.

### 12. mercado-rush (mechanic: `conveyor-sort`) · languages (Spanish) · grades 6-8 · middle
- **Core loop.** A market stall. Items slide along conveyors with Spanish labels (spoken via speech synthesis); drag or key them into the correct bin before they fall off. Rounds change the sorting rule: by category (comida/ropa), by gender (el/la), by number word, by verb ending (-ar/-er/-ir), by ser vs estar. Customers shout orders ("¡Dos manzanas rojas!") that must be fulfilled by dropping the right items.
- **Learning is the mechanic.** Sorting is comprehension.
- **Stages.** Morning (vocabulary), noon (gender/articles and numbers), evening rush (conjugation and ser/estar); finale: "Fiesta Order", a 6-item order under time.
- **Items.** sort, choice.
- **Skills.** `languages.6.spanish-vocab.food`, `languages.6.spanish-vocab.clothing-colors`, `languages.6.spanish-basics.numbers`, `languages.6.spanish-grammar.gender-articles`, `languages.7.spanish-verbs.present-regular`, `languages.7.spanish-verbs.ser-estar`. (Topic ids for languages are `<language>-<area>`, e.g. `languages.6.spanish-vocab`.)

### 13. rhythm-forge (mechanic: `rhythm-tap`) · arts (music) · grades 3-6 · elementary
- **Core loop.** Notes scroll toward a hit line; tap on the beat (space/tap). Each song section teaches a notation idea: the rhythm you tap is shown as real notation above (quarter, eighth, half, rests, 3/4 vs 4/4). Between sections, "Forge" rounds: fill an empty measure by placing note tiles so it adds up to the time signature (build item). Perfect/Good/Miss judgement with combo.
- **Learning is the mechanic.** You read the notation to tap right, and you build measures to progress.
- **Stages.** 3 songs (4/4 with quarters and halves; eighths and rests; 3/4 and 6/8) plus a staff-note bonus lane (name the note on the treble staff); finale: "Drum-off", a long pattern with no cue sound, notation only.
- **Items.** build (parts = note values, target = a valid fill), choice (staff notes, terms).
- **Skills.** `arts.3.music.note-values`, `arts.3.music.rests`, `arts.4.music.time-signatures`, `arts.4.music.reading-rhythm`, `arts.5.music.staff-notes`, `arts.5.music.tempo-dynamics`.

## Mechanic ids established in Phase 1
`lane-runner`, `tower-defense`, `racing`, `grid-collector`, `merge-grid`, `turn-battle`, `deduction`, `card-battler`, `map-conquest`, `tycoon-sim`, `block-coding`, `conveyor-sort`, `rhythm-tap`.

Planned for the catalog (spec only in Phase 1): `physics-launcher`, `platformer`, `breakout-bubble`, `word-grid`, `escape-room`, `timeline-sequencer`, `system-sim`, `dungeon-crawler`, `quiz-show-wager`, `memory-pairs`, `geometry-construct`, `typing-shooter`, `stack-drop`, `circuit-connect`, `story-choice`, `idle-tycoon`, `trace-draw`, `pattern-echo`, `auction-bid`, `fishing-collect`.

## Build order
1. Kit (all of `kit/`), `games/kit-demo` (exercises every kit API), `tools/*`.
2. In parallel: curriculum per subject, mechanics catalog + game design guide, launcher.
3. Smoke-test the kit demo in a real browser. Fix before fan-out.
4. 13 flagship games, each: builder agent then reviewer/fixer agent, both running `node --check`, `tools/content-check.mjs` and `tools/smoke.mjs`.
5. Orchestrator browser pass over every game, fix list, final report.
