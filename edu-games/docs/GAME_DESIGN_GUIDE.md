# Game Design Guide

The practical handbook for anyone, human or agent, building a game on the edu-games kit. `docs/ARCHITECTURE.md` is the contract and wins every disagreement; this guide explains how to meet it well. `mechanics/CATALOG.md` lists the chassis you can build on; `docs/PHASE2_BACKLOG.md` lists what to build next.

Contents

1. Pedagogy principles, with good and bad examples
2. The "learning is the mechanic" test
3. Writing content packs (difficulty ladders, distractors, explanations, hints, visuals, generators)
4. Flow and juice checklist
5. Pacing template for a 7-minute session
6. Age-band UX rules
7. Accessibility rules
8. Anti-patterns
9. Build a new game in 10 steps
10. Reviewer checklist

---

## 1. Pedagogy principles

These are the eleven rules of `ARCHITECTURE.md` section 2.2, each with an example that passes and one that fails. "Bad" examples are real patterns seen in educational games; do not ship them.

### 1.1 Learning is the mechanic

The educational choice drives the game action directly.

- **Good.** In `fraction-fortress` the tower you place decides which goblins get hit, because the tower's rule is a fraction comparison. Placing is the maths.
- **Good.** In `conveyor-sort` the only action is dropping an item into a bin, and the bin is the category. There is no other action to take.
- **Bad.** A platformer where you jump and run for 30 seconds, then a quiz pops up; a correct answer lets you keep playing. The quiz is a toll booth, not the game.
- **Bad.** A match-3 where the tiles have science words on them but matching is by colour. The words are wallpaper.

### 1.2 Every wrong answer teaches

Show the correct answer and a one-to-two sentence explanation of why, from the item. Wrong-answer feedback requires a tap or keypress to dismiss; correct-answer feedback auto-dismisses fast.

- **Good.** "7 + 5 = 12. Make ten first: 7 + 3 = 10, then 10 + 2 = 12." shown over a ten-frame, dismissed by tap.
- **Good.** "Their shows ownership. There is a place, they're is they are." with the differing letters highlighted.
- **Bad.** A red X, a buzzer, and the next question.
- **Bad.** "Incorrect. The answer was B." (which answer was B? why?)
- **Bad.** A wrong-answer card that auto-dismisses after one second, before it can be read.

### 1.3 Adaptive

Use `ctx.adaptive`. Start at difficulty 1-2, step up after 3 correct in a row on a skill, step down after 2 misses. Never a wall: after 2 misses on the same skill, show the item `hint` before the next item of that skill.

- **Good.** A player who misses two subtraction items sees "Count back from the bigger number" under the banner as the next subtraction gates approach, and the next item is difficulty 1.
- **Bad.** Difficulty tied only to the stage number, so a struggling player in stage 3 faces difficulty 5 items until they lose.
- **Bad.** Random difficulty per item, so a difficulty 5 item follows a difficulty 1 item with no signal.

### 1.4 Fast feedback

Visual and audio response within 200 ms of any answer.

- **Good.** The gate flashes green and plays `correct` on the frame the hero crosses it; the explanation card comes after.
- **Bad.** The answer is graded at the end of the wave.
- **Bad.** A 600 ms tween before anything acknowledges the tap.

### 1.5 Juice

Particles on correct, screen shake on big events, floating "+50" text, combo and streak meter, tweened UI. Correct answers must feel good.

- **Good.** Correct: `particles.burst` at the gate, `floatingText.add('+50')`, combo meter tween, pitch of the coin sound rising with the streak.
- **Bad.** The score number changes with no animation. Nothing moves but the player.
- **Bad.** Shake on every correct answer: constant shake is noise, not juice. Save it for wave clears and bosses.

### 1.6 Session structure

5-10 minutes. At least 3 escalating stages, a visible progress bar, one finale or boss or "wow" moment.

- **Good.** 3 biomes of 12 gates, a progress bar across the top, and a bridge-building finale that changes the rules for 20 seconds.
- **Bad.** An endless runner with no stages that ends when you die.
- **Bad.** A session that takes 20 minutes because every wave is the same length and there are nine of them.

### 1.7 Meta-progress

Award XP via `ctx.progress.addXP`. The end screen shows score, accuracy, XP earned, and per-skill mastery deltas.

- **Good.** "Equivalent fractions: 42% → 61%" with a small bar that animates on the end screen.
- **Bad.** A score with no link to what was practised.

### 1.8 Variety

Procedural generators preferred. A content pack must produce at least 40 distinct items; two consecutive runs must not feel identical.

- **Good.** An addition generator that picks operands by difficulty band and writes distractors from the operands, giving thousands of items.
- **Bad.** A hand-written list of 12 questions shuffled.

### 1.9 Correctness

Generators must be factually and mathematically correct. Distractors must be plausible (common misconceptions) and never accidentally correct. Never duplicate choices.

- **Good.** For "3/4 equals?" the distractors are 4/3 (flipped), 6/9 (added 3 to both) and 3/8 (doubled the denominator only); a check confirms none simplifies to 3/4.
- **Bad.** Distractors generated as `correct ± rng.int(1, 3)` where one lands on the correct value.
- **Bad.** "Which is a mammal?" with "dolphin" and "whale" both as choices and only one marked correct.

### 1.10 Age fit

Grades 1-3: large text, icons, minimal reading, `ctx.speak(prompt)` on each new prompt. Grades 9-12: real rigor, not toy versions.

- **Good.** A grade 1 game with a 36 px prompt, a picture per gate, and the prompt spoken aloud.
- **Good.** A grade 11 economics game that asks about elasticity with real numbers and a chart.
- **Bad.** A grade 1 game whose prompt is a two-line sentence.
- **Bad.** A grade 10 chemistry game that only asks "what is the symbol for gold?".

### 1.11 Accessibility

Never rely on colour alone; add shape or label. Keyboard-complete: number keys 1-4 (and arrows + Enter) answer choices.

- **Good.** Bins are coloured and labelled and numbered; the correct gate glows green and gets a tick icon.
- **Bad.** "Hit the red bricks" with no other cue.
- **Bad.** A drag-only interaction with no key or tap alternative.

---

## 2. The "learning is the mechanic" test

Ask three questions before writing any code. A game must pass all three.

**Question 1. Is the learning decision the same gesture as the game action?**
The thing the player does to answer must be the thing the player does to play. Steering into a gate, dropping into a bin, playing a card, wiring a node. If the game has a "play" gesture and a separate "answer" gesture, it fails.

**Question 2. Does a right versus wrong answer change what happens on screen in the next second, in a way that matters to winning?**
Turbo versus oil slick. Tower built versus slot empty. Region claimed versus region lost. If the only consequence is a score number and a sound, it fails: the game state must diverge.

**Question 3. Can a player win by reflexes or luck alone, without knowing the content?**
Play the game pretending every prompt is unreadable. If you can still get a good score by being quick or by guessing, the content is decorative and it fails. The inverse must also hold: a player who knows the content but has slow hands must still be able to finish (see difficulty levers and the age-band rules).

Worked example. "Snake with science words": eating is the gesture (Q1 passes only if the rule decides what you may eat), eating a wrong tile shrinks you (Q2 passes), and a guesser eats half wrong tiles and never grows (Q3 passes). "Platformer with quiz gates" fails Q1 (jumping and answering are different gestures) and Q3 (a good jumper reaches the gate and then guesses).

---

## 3. Writing content packs

A content pack is `games/<game-id>/content.js`: a pure, deterministic generator with a `skills` map and a `generate(rng, { skill, difficulty, type, choices })` function that returns `item({...})`. It must be importable in Node with no DOM access. Run `node tools/content-check.mjs <game-id>` early and often.

### 3.1 Anatomy

```js
import { makeChoices, item, fmtFraction, simplify } from '../../kit/learn/content.js';
export const content = {
  id: 'my-game-content', subject: 'math', grades: [4, 5],
  skills: {
    'math.4.fractions.equivalent': { name: 'Equivalent fractions', types: ['choice'] },
  },
  generate(rng, { skill, difficulty, type, choices = 4 }) {
    // 1. pick parameters for this difficulty
    // 2. compute the correct answer
    // 3. build distractors from named misconceptions
    // 4. return item({ type, skill, difficulty, prompt, ..., explanation, hint, visual })
  },
};
```

Rules: all randomness through `rng`; one `generate` call returns one item; the same `(seed, args)` must give the same item; `explanation` is at least 10 characters and should be two sentences; `hint` is one sentence; `visual` is optional data the mechanic may draw.

### 3.2 Difficulty ladders 1-5 for each item type

Difficulty must change the thinking required, not just the numbers. A ladder step should be visible to a teacher: "level 3 adds regrouping". The examples give two subjects per type.

#### choice

| level | what changes | math (fractions, grade 4) | ela (vocabulary, grade 5) |
|---|---|---|---|
| 1 | one-step recall, visual support, distractors far apart | Which picture shows 1/2? (visual: fraction bar) | Which word means happy? (glad / sad / tall / cold) |
| 2 | one-step recall without visual, nearer distractors | Which equals 1/2? (2/4 / 1/4 / 2/3 / 1/3) | Which word means happy? (glad / calm / proud / kind) |
| 3 | two-step or comparison, misconception distractors | Which equals 3/4? (6/8 / 4/3 / 6/9 / 3/8) | Which word is closest to furious? (angry / annoyed / upset / sad) |
| 4 | unfamiliar presentation, mixed representations | Which is NOT equivalent to 2/3? (4/6 / 6/9 / 8/12 / 4/9) | In "the frugal shopper compared prices", frugal means (thrifty / wealthy / hurried / picky) |
| 5 | multi-step, justification, edge cases | Which pair is equivalent? (3/9 and 5/15 / 2/5 and 3/7 / 4/6 and 6/8 / 1/3 and 3/1) | Which sentence uses frugal correctly? (four sentences, three subtly wrong) |

#### numeric

| level | what changes | math (percent, grade 6) | science (density, grade 8) |
|---|---|---|---|
| 1 | benchmark values, exact answer | 50% of 80 = ? | Mass 10 g, volume 5 cm³, density = ? |
| 2 | friendly values, one operation | 25% of 60 = ? | Mass 24 g, volume 8 cm³, density = ? |
| 3 | unfriendly values, one operation | 15% of 80 = ? | Density 2.5 g/cm³, volume 4 cm³, mass = ? |
| 4 | two operations or inverse | 30 is what percent of 120? | Density 0.9 g/cm³, mass 45 g, volume = ? |
| 5 | multi-step, tolerance allowed | A price rises 20% then falls 20%: percent change? (tolerance 0.5) | Which floats? Give density of a 36 g object with sides 3 cm (tolerance 0.05) |

#### text

| level | what changes | ela (spelling, grade 2) | languages (Spanish vocabulary, grade 6) |
|---|---|---|---|
| 1 | 3-letter CVC, picture and speech | cat, dog, sun | sol, pan, mar (picture shown) |
| 2 | blends and digraphs, picture and speech | ship, frog, chat | gato, casa, libro |
| 3 | vowel teams, speech only | rain, boat, feet | manzana, ventana, escuela |
| 4 | silent letters, irregular patterns | knee, lamb, write | lápiz, árbol (accents required) |
| 5 | multi-syllable, affixes, accept alternatives | unhappy, jumping, careful | está, están (accents, verb forms) |

#### sort

| level | what changes | science (living things, grade 3) | languages (Spanish gender, grade 6) |
|---|---|---|---|
| 1 | two categories, obvious members, pictures | living / non-living (dog, rock, tree, car) | el / la with regular endings (gato, mesa) |
| 2 | two categories, less obvious members | living / non-living (seed, cloud, mushroom, fire) | el / la with -ción, -dad (canción, ciudad) |
| 3 | three categories | producer / consumer / decomposer | el / la / los / las (plurals) |
| 4 | three or four categories with near-misses | herbivore / carnivore / omnivore (bear, panda, owl) | exceptions (el día, la mano, el problema) |
| 5 | categories defined by a rule the player must infer | sort by what the animal eats AND where it lives | sort by gender AND whether the article changes before a stressed a- (el agua) |

#### sequence

| level | what changes | social (US history, grade 5) | math (proof steps, grade 10) |
|---|---|---|---|
| 1 | 3 items, large gaps, pictures | Columbus / Jamestown / Declaration | 3 steps: given, definition, conclusion |
| 2 | 4 items, large gaps | adds Constitution | 4 steps with one algebraic manipulation |
| 3 | 5 items, nearer dates | adds Boston Tea Party | 5 steps with a theorem citation |
| 4 | 5-6 items, one intruder to remove | adds an event from the wrong century | 6 steps with one false reason to remove |
| 5 | 7 items, close dates, cause-effect cues | events of 1774-1776 | 7 steps, two valid orders accepted via `answer` alternatives (mechanic-level) |

#### match

| level | what changes | languages (Spanish, grade 3) | science (body systems, grade 7) |
|---|---|---|---|
| 1 | 3 pairs, picture to word | perro, gato, pez with pictures | heart / lungs / stomach to pictures |
| 2 | 4 pairs, word to word | colours to English | organ to system |
| 3 | 4 pairs, near-miss pairs | hermano / hermana / abuelo / abuela | organ to function |
| 4 | 5 pairs, two representations | number word to digit to dots | system to disorder |
| 5 | 6 pairs, inferred relationship | verb to its conjugated form | structure to the level of organisation |

#### build

| level | what changes | cs (block programs, grade 4) | arts (fill a measure, grade 4) |
|---|---|---|---|
| 1 | 3 parts, no decoys | move, move, turn | two half notes in 4/4 |
| 2 | 4-5 parts, one decoy | move, turn, move, move with an extra turn | quarters and a half in 4/4 |
| 3 | needs a loop or a rest | repeat 3 (move) | eighths and a quarter rest in 4/4 |
| 4 | needs a conditional or a dotted value | if path ahead | dotted half plus quarter in 4/4 |
| 5 | needs a function or a different metre | define F1, call twice | fill 3/4 and 6/8 with mixed values |

### 3.3 Distractor design from real misconceptions

A distractor is a wrong answer a real student gives for a reason. Every distractor should be traceable to a named misconception, and the explanation should address the misconception the player actually chose when the mechanic can tell (it can: `chosen` is passed to `ctx.feedback`). Rules:

1. Generate distractors by applying a misconception to the correct working, not by perturbing the answer.
2. Verify each distractor is not equal to the correct answer under the grader's normalisation (`makeChoices` drops exact string matches, but you must also check numeric equivalence, simplified fractions and case).
3. Keep distractors in the same format as the correct answer (same number of decimal places, same capitalisation) so format is not a tell.
4. Keep the correct answer's position random (`makeChoices` shuffles) and never always the longest option.
5. At difficulty 1-2 use at most one misconception distractor and one far distractor; at 4-5 use only misconception distractors.

Misconception patterns per subject:

| subject | misconception | example prompt | distractor it produces |
|---|---|---|---|
| math | add numerators and denominators | 1/2 + 1/3 | 2/5 |
| math | bigger denominator means bigger fraction | which is larger, 1/4 or 1/6? | 1/6 |
| math | ignore place value when regrouping | 43 - 17 | 34 (subtracted smaller from larger in each column) |
| math | multiply before parentheses or left-to-right regardless of precedence | 2 + 3 × 4 | 20 |
| math | sign errors with negatives | -3 - 5 | -2 or 2 |
| math | treat the x-intercept as the y-intercept | y = 2x + 3 | intercept 3 on the x-axis |
| math | correlation implies causation | ice cream sales and drownings rise together | "ice cream causes drowning" |
| science | heavier objects fall faster | which hits the ground first in a vacuum? | the heavier ball |
| science | plants get food from the soil | where does a plant's mass come from? | the soil |
| science | heat and temperature are the same | which has more thermal energy, a cup or a bathtub at 40 °C? | the same |
| science | current is used up by the first bulb | brightness of the second bulb in series | dimmer |
| science | seasons are caused by distance from the Sun | why is it summer? | Earth is closer to the Sun |
| science | dominant means more common | if brown eyes are dominant, most people have brown eyes because... | dominant alleles are more frequent |
| ela | "their / there / they're" by sound | fill the blank | the wrong homophone |
| ela | a comma wherever you pause | place the comma | comma between subject and verb |
| ela | adjective and adverb confusion | he runs ___ | quick |
| ela | the main idea is the first sentence | what is the main idea? | the topic sentence verbatim when the paragraph's point differs |
| ela | a simile is any comparison | which is a simile? | a metaphor |
| ela | passive voice is any sentence with "was" | which is passive? | "he was happy" |
| social | the President makes laws | who makes federal laws? | the President |
| social | bigger country means bigger population | which has more people? | the larger area |
| social | all events in a unit happened in that order | sequence events | the order they were taught |
| social | demand is the amount people want, not want at a price | what happens to demand when price falls? | "demand increases" when quantity demanded increases |
| social | the Electoral College counts only popular vote | how is a president elected? | national popular vote |
| cs | a loop runs one extra time (off by one) | how many times does `for i in range(3)` print? | 4 |
| cs | `=` tests equality | what does `x = 5` do? | checks if x is 5 |
| cs | the computer reads intent, not instructions | why did the robot miss the gem? | "it should have known" |
| cs | binary digits are weighted like decimal | 101 in binary is | 101 |
| cs | a strong password is a long word | which password is strongest? | a long dictionary word |
| languages | adjective before noun as in English | translate "the red car" | el rojo coche |
| languages | gender follows the English speaker's intuition | el / la for "problema" | la problema |
| languages | ser for all "to be" | "estoy cansado" or "soy cansado" | soy cansado |
| languages | word-for-word translation of idioms | "I am hungry" | estoy hambriento (instead of tengo hambre) |
| languages | accent marks are optional | spell "lápiz" | lapiz |
| arts | a longer note looks bigger | which note lasts longer, a half or a quarter? | the quarter because it is filled |
| arts | the time signature's top number is a count of notes | how many notes fit in 4/4? | four |
| arts | mixing more colours makes brighter colours | red + green paint makes | yellow |
| arts | warm colours are light colours | which is a warm colour? | light blue |
| arts | the horizon line is the bottom of the picture | where is the horizon in one-point perspective? | the bottom edge |

### 3.4 Writing explanations and hints

**Explanations** are shown on every wrong answer and are the single most important text in the pack. Rules:

1. Two sentences. First sentence: the correct answer with the why. Second sentence: the rule or the working.
2. Name the rule in words a student would recognise ("make ten", "subject-verb agreement", "ser for permanent traits").
3. Show the correct working, not just the result. "7 + 3 = 10, then 10 + 2 = 12" beats "the answer is 12".
4. Address the misconception if the chosen answer reveals one. Generators may put the misconception label in `tags` so a mechanic can select the matching sentence.
5. Plain words, no jargon the grade band has not met, no "obviously", no exclamation marks.

| bad | good |
|---|---|
| "Wrong. It's 2/5." | "1/4 and 1/6: 1/4 is larger. When the top numbers are the same, the fraction with the smaller bottom number has bigger pieces." |
| "Remember the rule!" | "Tengo hambre. Spanish uses tener (to have) for hunger, thirst and age, not ser or estar." |
| "The adverb is quickly." | "The adverb is quickly because it tells how she ran. Adverbs describe verbs and often end in -ly." |
| "See the diagram." | "In series the second bulb is just as bright. The same current flows through every part of a series circuit, it is not used up." |

**Hints** are shown after two misses on a skill, before the next item of that skill. Rules:

1. One sentence, a strategy, not the answer. "Count back from the bigger number." "Say the word slowly and listen for the vowel." "Look at the ending of the noun."
2. The hint belongs to the item, so it can mention the item's specifics without giving the answer ("the bigger number is 15").
3. For early grades the hint should be speakable; the mechanic will call `ctx.speak` on it.

### 3.5 Visuals: when and which kinds

Add a `visual` when a picture carries the concept better than words, when the grade band reads slowly, or when the explanation needs a diagram. Do not add a visual that merely decorates. The kit's `overlay.showQuestion` draws known kinds; mechanics may draw them in-canvas too. Known kinds (free-form data, but these names are shared across games):

| kind | data | use for |
|---|---|---|
| `tenframe` | `{ n }` or `{ a, b }` | addition and subtraction within 20, grades 1-2 |
| `numberline` | `{ min, max, marks: [], highlight }` | counting, integers, rounding, fractions on a line |
| `fractionbar` | `{ n, d }` or `{ bars: [{ n, d }] }` | fractions, equivalence, comparison |
| `array` | `{ rows, cols }` | multiplication, area |
| `clock` | `{ h, m }` | telling time |
| `coins` | `{ coins: ['quarter', 'dime'] }` | money |
| `graph` | `{ points, line: { m, b }, xRange, yRange }` | slope, linear functions |
| `sd-chart` | `{ supply, demand, shift }` | supply and demand |
| `line` | `{ series: [{ label, values }] }` | trends, populations, statistics |
| `bar` | `{ labels, values }` | data literacy |
| `grid` | `{ cols, rows, cells }` | block-coding levels, coordinates |
| `staff` | `{ clef, notes: [] }` | music notation |
| `measure` | `{ timeSig, notes: [] }` | rhythm |
| `molecule` | `{ atoms, bonds }` | chemistry |
| `map` | `{ region, highlight }` | geography |
| `picture` | `{ id }` | an icon from the kit's inline SVG set for early grades |
| `sentence` | `{ words: [], highlight: [] }` | grammar, annotated feedback |

Rules: every visual must have a text equivalent in the prompt or explanation (accessibility); visuals on difficulty 1-2 are supports, on 4-5 they may be the question ("which graph has slope 2?"); keep visual data small and serialisable, never functions.

### 3.6 Generators: determinism, variety, correctness

- Use `rng.int`, `rng.pick`, `rng.shuffle`, `rng.weighted`; never `Math.random`.
- Build a parameter table per difficulty, then generate from it. Variety comes from parameters, not from a list.
- Compute the correct answer from the parameters; compute distractors from misconceptions applied to the same parameters; then verify each distractor differs from the answer after normalisation.
- Ensure every `(skill, type, difficulty)` combination the pack declares produces a valid item; `content-check` tries all of them.
- Keep prompts short: under 60 characters for early, under 90 for elementary, under 140 for middle and high. Put longer context in `visual` or the mechanic's banner.
- Provide `speech` when the prompt contains symbols that do not read aloud well ("7 + 5 = ?" → "seven plus five equals what?").
- Target at least 40 distinct items; aim for hundreds.

---

## 4. Flow and juice checklist

Flow is the state where the player is challenged just enough and never waits. Juice is the feedback that makes actions feel consequential. Check every item before review.

**Flow**
- [ ] The first learning decision happens within 10 seconds of pressing Start.
- [ ] There is never more than 8 seconds without something to do (steer, collect, dodge, aim) and never more than 20 seconds without a learning decision.
- [ ] Difficulty follows `ctx.adaptive`; stage escalation changes pace, not item difficulty alone.
- [ ] A wrong answer costs something visible but never ends the run on its own below the final stage.
- [ ] A hint appears after 2 misses on a skill (`adaptive.needsHint`), before the next item of that skill.
- [ ] Stage transitions are 3-5 seconds, skippable with a tap, and show the progress bar.
- [ ] The finale changes the rules (chain, boss, timer) and lasts 30-60 seconds.
- [ ] The whole session runs 5-10 minutes; at the default config a competent player finishes in about 7.
- [ ] Pause works on `Escape`, `P` and tab blur; resume does not skip an item.

**Juice**
- [ ] Correct: `audio.play('correct')`, `particles.burst` at the point of action, `floatingText.add('+N')`, HUD score tween via `hud.pulse('score')`.
- [ ] Streak: combo meter visible from streak 2, colour change at 5 and 10, `audio.play('combo')` at thresholds, XP doubled at 5 (`ctx.xpForCorrect`).
- [ ] Wrong: `audio.play('wrong')`, a short red flash on the chosen element, a small `shake.shake(4, 0.15)` at most, then the blocking card.
- [ ] Big events (wave clear, boss hit, finale success): `shake.shake(8, 0.3)`, `audio.play('fanfare')` or `'levelup'`, a banner tween with `Easing.easeOutBack`.
- [ ] Every moving UI element is tweened (`tweens.add`), nothing pops into place except on reduced motion.
- [ ] Sound pitch rises with consecutive collects (`audio.play('coin', { pitch: 1 + 0.05 * n })`).
- [ ] Music intensity follows the stage (`audio.music.setIntensity`), `boss` track for the finale.
- [ ] `ctx.reducedMotion`: particle counts halved, no shake, tween durations unchanged.

---

## 5. Pacing template for a 7-minute session

Use this as the default skeleton and adjust by mechanic. Times are from pressing Start.

| time | phase | what happens | learning decisions | notes |
|---|---|---|---|---|
| 0:00-0:10 | Start screen | title, tagline, 3 how-to-play lines, skills list, Start | 0 | `overlay.showStart` from the manifest; grades 1-3 get icons on each how-to line |
| 0:10-0:25 | Warm-up | stage 1 begins at the slowest speed; first two items are difficulty 1 | 2 | first decision inside 10 s; no hazards yet |
| 0:25-2:00 | Stage 1 | full stage 1 loop; adaptive steps up after 3 correct | 10-14 | introduce one hazard or secondary action at 1:00 |
| 2:00-2:05 | Transition | "Stage 1 clear" banner, progress bar 33%, `levelup` SFX | 0 | skippable |
| 2:05-3:45 | Stage 2 | faster pace, a new item type or a new rule; mid-stage bonus (shield, upgrade, pit stop) | 12-16 | the bonus is a harder item worth more |
| 3:45-3:50 | Transition | "Stage 2 clear", progress 66% | 0 | music intensity up |
| 3:50-5:30 | Stage 3 | fastest pace, the hardest rule family; hints are more likely to have fired by now | 12-16 | adaptive keeps struggling players at difficulty 2-3 |
| 5:30-5:40 | Finale intro | rules change announced in one line ("Build the bridge: 3 gates in a row"), `boss` music | 0 | 3-second countdown |
| 5:40-6:30 | Finale | chain, boss or timed sequence; one retry with the hint on failure | 3-6 | success or a graceful "almost" ending, never a hard fail |
| 6:30-6:40 | Wrap | fanfare, score tally rolling up, `ctx.endGame(results)` | 0 | results include per-skill stats |
| 6:40-7:00 | End screen | score, best, accuracy, XP, mastery deltas, Replay / Exit | 0 | `overlay.showEnd`; Replay re-seeds |

Totals: 39-58 learning decisions in 7 minutes, roughly one every 8-10 seconds, with the fast mechanics at the high end and the slow ones at the low end. If a mechanic's natural pace gives fewer than 25 decisions in a session, the loop is too slow for this kit.

---

## 6. Age-band UX rules

| rule | early (grades 1-2) | elementary (3-5) | middle (6-8) | high (9-12) |
|---|---|---|---|---|
| minimum canvas font | 24 px prompt, 20 px labels (contract minimum 20) | 20 px prompt, 18 px labels | 18 px, 16 px minimum | 16 px minimum |
| reading load per prompt | 1-6 words or none; picture plus speech | one line, under 90 chars | up to two lines | up to three lines or a short passage in the overlay |
| speech | `ctx.speak` on every prompt and hint, always | speak prompts for grade 3; optional after | off by default, on for world languages | off except world languages |
| choices | 2-3, pictures preferred | 3-4 | 4 | 4-5, including "none of these" at difficulty 5 where honest |
| time pressure | gentle, no fail from time alone; decision window never under 3 s | moderate; windows down to 2.5 s | real pressure acceptable; timers visible | real pressure; wager and timed modes |
| lives and failure | hearts refill each stage; losing all hearts restarts the stage, not the game | hearts per stage; a lost stage replays at an easier difficulty | lives per run acceptable with checkpoints | lives per run; roguelite loss acceptable |
| themes that land | animals, candy, space, playgrounds, friendly monsters, helpers | adventure, dungeons, robots, sports, nature, mild spooky | heists, racing, strategy, science fiction, humour with wordplay | noir, business, debate, lab, history drama; dry humour |
| humour | silly sounds, monsters that fall over, exaggerated faces | puns, surprising animations, goofy villains | self-aware jokes, dramatic opponents, memes used lightly | wit, sarcasm from opponents, understated absurdity |
| what feels patronising | nothing much at this age; avoid baby talk in speech | being called "little", clapping sounds, "great job!" every time | cartoon mascots that cheer, exclamation marks, "super star!" | any cheerleading, cartoon mascots, slow pacing, trivial items, explanations that over-explain |
| praise | varied short spoken praise ("nice", "you got it") | floating text and SFX; words sparingly | numbers and combos, not words | numbers, rank, accuracy; a one-line verdict at the end |
| control scheme | one gesture (tap lane, tap bin); big touch targets (minimum 72 px) | one or two gestures; touch buttons 64 px | full keyboard and touch; swipe plus buttons | full keyboard; typing allowed |
| explanation length | one short sentence spoken aloud plus a picture | two sentences plus a picture | two sentences, may use terms | two sentences, precise terms, worked steps |
| session length | 5-6 minutes | 6-8 | 7-9 | 7-10 |

Band assignment for a game whose grades straddle a band boundary: use the band of the majority of its grades; on a tie, the lower band. The band drives the font minimum and the speech default (`ctx.gradeBand`).

---

## 7. Accessibility rules

1. **Colour is never the only signal.** Pair every colour with a shape, icon or label: correct is green plus a tick, wrong is red plus a cross; bins are coloured and labelled and numbered.
2. **Keyboard-complete.** Every action has a key: choices on 1-4 (1-5 for five), arrows plus Enter to move and confirm, Space for the primary action, Escape or P to pause, M to mute. Drag interactions have a tap-tap or key alternative.
3. **Touch-complete.** Any lane or direction control has an on-screen alternative via `input.addTouchButton` or tap zones; touch targets are at least 64 logical px (72 for early grades) and never overlap the HUD.
4. **Text fits.** All canvas text goes through `drawText` or `wrapText` with a `maxWidth`; nothing overlaps at 960 × 540; readable on a 375 px wide phone (letterboxed, so test at 0.39 scale).
5. **Contrast.** Text on canvas has a stroke or shadow when drawn over art; HUD and overlay use `theme.css` tokens, which meet contrast in light and dark.
6. **Reduced motion.** Respect `ctx.reducedMotion`: halve particles, skip shake, keep tweens short and never flash more than three times a second.
7. **Speech.** Early grades call `ctx.speak` on every prompt and hint; speech never carries information that is not also on screen.
8. **Time.** Any timed element has a visible timer; early grades never fail from time alone; a config knob can lengthen or disable timers for a platform accessibility setting.
9. **Feedback is read.** Wrong-answer cards block until dismissed by tap or key; dismiss buttons carry `data-eg="feedback-dismiss"`.
10. **Focus and pause.** Tab blur pauses; resume restores state exactly; resizing never loses state.
11. **Language.** Plain words, short sentences, no idioms in instructions for early and elementary; world-language packs mark the language in `speech` so the right voice is used.

---

## 8. Anti-patterns

**Quiz with a skin.** A game whose play loop would be unchanged if every item were replaced with a coin flip. Symptoms: a separate "answer" screen; fun parts that need no knowledge; "answer to continue". Fix: move the decision into the gesture (section 2).

**Punishment loops.** A wrong answer that leads to a harder situation that causes more wrong answers: losing a tower makes the wave unwinnable, which loses lives, which ends the run. Fix: wrong answers cost score and time, not capability; hearts refill per stage for early grades; adaptive steps down; hints fire.

**Unreadable canvas text.** Labels drawn at 14 px over busy art, prompts that overflow their banner, text that scales with the window instead of the logical resolution. Fix: `drawText` with `maxWidth` always, font minimums per band, a stroke or backing panel over art, test at phone scale.

**Dead ends.** A level that cannot be completed without a skill the player has not been taught, a locked door with no hint, an empty hand with no playable card, a board that fills with no clear. Fix: every state must have a path forward; after 2 misses the hint fires; a stuck player gets a free pass item at difficulty 1; the finale has a graceful "almost" ending.

**Random difficulty.** Items picked uniformly across difficulty 1-5, or difficulty tied to the stage number alone. Fix: `ctx.nextItem()` with no arguments uses adaptive; stages change pace and rule family, not item difficulty.

**Toll-booth feedback.** A wrong-answer card that auto-dismisses, or that can be dismissed before it is readable. Fix: blocking card, no dismiss in the first 600 ms, the explanation in the first line.

**Decorative visuals.** A fraction bar drawn next to a question it does not illustrate; a chart that does not change with the answer. Fix: a visual is either the question or the explanation; otherwise remove it.

**Format tells.** The correct choice is always the longest, the only one with a unit, the only decimal with two places. Fix: same format for all choices; shuffle with `makeChoices`.

**Mascot cheerleading.** "Super job, superstar!" on every correct answer, at any age. Fix: juice through particles, sound and numbers; words only at milestones, and tuned to the band.

**Endless mode as the whole game.** No stages, no finale, play until you lose. Fix: three stages and a finale, with an optional endless mode after the end screen if you must.

**One-run content.** Twelve hand-written questions. Fix: generators with parameter tables; `content-check` requires 40 distinct items and you should have hundreds.

**Subject leakage into the mechanic.** A mechanic that knows what a fraction is, or imports from `games/`. Fix: all subject knowledge lives in the content pack; the mechanic consumes item types and `tags`.

---

## 9. Build a new game in 10 steps

Names below are the real kit API from `docs/ARCHITECTURE.md` section 3.

1. **Pick the row.** Take a row from `docs/PHASE2_BACKLOG.md` (or write one in the same format). Confirm mechanic + subject + grade band is unique. Read the mechanic's section in `mechanics/CATALOG.md` and its `mechanic.js` `meta.itemTypes` and `configSchema`.
2. **Write the one-sentence learning decision** and run the three-question test (section 2). If the mechanic's gesture is not the decision, pick another mechanic.
3. **List the skills** (3-6) with ids in the `subject.grade.topic-slug.skill-slug` convention; check `curriculum/map.json`, add to the per-subject file if missing and note it for the reviewer.
4. **Scaffold** `games/<game-id>/` with `index.html` (copy from the contract), `manifest.json` (all keys from section 5.1, `status: "draft"`), `thumb.svg` (320 × 180), `game.js`, `content.js`, `REVIEW.md` (empty headings).
5. **Write `content.js`.** `skills` map with `types` matching the mechanic's `itemTypes`; `generate(rng, { skill, difficulty, type, choices })` returning `item({...})` with `explanation`, `hint` and `visual` where useful; distractors from section 3.3 using `makeChoices(rng, correct, distractors, n)`. Run `node tools/content-check.mjs <game-id>` until it prints OK.
6. **Write `game.js`.** `import { createGame } from '../../kit/kit.js'`, `import { Mechanic } from '../../mechanics/<id>/mechanic.js'`, `import { content } from './content.js'`, fetch the manifest, call `createGame({ container, manifest, Mechanic, content, config })`. The `config` is the theme: names, colours, speeds, stage count, finale, `accent`. Every key must exist in `defaultConfig`.
7. **Run it.** `python -m http.server 8080` from the repo root, open `http://localhost:8080/games/<game-id>/`. Play a full session: Start, three stages, finale, end screen, Replay, Exit. Check `window.__eduGame.state()` in the console.
8. **Tune.** Use section 5's pacing template: time the session, count decisions, adjust `config` speeds and counts. Check the HUD via `hud.set` keys (score, streak, lives, progress, level). Check wrong-answer cards block and read well; check `adaptive.needsHint` fires after two misses.
9. **Verify.** `node --check` on `game.js` and `content.js`; `node tools/content-check.mjs <game-id>`; `node tools/smoke.mjs <game-id>` (zero page and console errors, non-blank screenshot); resize the window mid-run; press Escape; test on a touch device or with device emulation at 375 px wide; test `prefers-reduced-motion` and dark mode.
10. **Ship.** `node tools/build-index.mjs` to regenerate `games/index.json`; set `status` to `"ready"`; fill `REVIEW.md` with what you verified; hand to the reviewer with the section 10 checklist.

If the mechanic does not exist yet (a planned one), insert a step 4a: write `mechanics/<id>/mechanic.js` from its catalog section and the section 4 contract (`meta`, `defaultConfig`, `class Mechanic { constructor(ctx), init, update, render, destroy }`), declare `itemTypes`, consume items only via `ctx.nextItem()`, grade only via `ctx.answer()`, route wrong answers through `ctx.feedback` or an equivalent blocking in-canvas card, add touch buttons via `input.addTouchButton`, and smoke-test it with the first game before writing the second.

---

## 10. Reviewer checklist

Mirrors `docs/ARCHITECTURE.md` section 8 (Definition of Done). The reviewer writes the outcome of each line into `games/<game-id>/REVIEW.md` with evidence (command output, screenshot name, observed behaviour).

**Static**
- [ ] `node --check` passes on `mechanics/<id>/mechanic.js`, `games/<game-id>/content.js`, `games/<game-id>/game.js`.
- [ ] `node tools/content-check.mjs <game-id>` passes: 200+ items valid, no duplicate choices, no accidentally correct distractors, all skills × difficulties 1-5 produce items, at least 40 distinct.
- [ ] `manifest.json` has every key from section 5.1; `subject`, `gradeBand`, `mechanic` are valid; `skills` follow the id convention and exist in `curriculum/map.json` (or are flagged for reconciliation).
- [ ] No `Math.random` in mechanic or content; no imports from `games/` inside the mechanic; all imports relative with `.js`.
- [ ] `content.js` imports in Node with no `window` or `document` access.

**Smoke**
- [ ] `node tools/smoke.mjs <game-id>` passes: page loads, Start works, 10 s of simulated play with zero page and console errors, screenshot is not blank.
- [ ] `data-eg` hooks present: `start`, `replay`, `exit`, `resume`, `restart`, `pause`, `feedback-dismiss`, `choice` with `data-index`, `submit`, `hint`, `mute`; container `data-eg-phase` tracks the phase; canvas has `data-eg="canvas"`.

**Play**
- [ ] Start, play, end, replay loop works; Replay re-seeds and produces a different run; Exit returns to the start screen.
- [ ] `Escape` and `P` pause; tab blur pauses; resume continues exactly.
- [ ] Resizing the window mid-run keeps state and keeps the layout readable; a 375 px wide viewport is playable.
- [ ] Touch controls present for every keyboard action; touch targets at least 64 px (72 for early).
- [ ] At least 3 escalating stages with a visible progress bar; a finale moment that changes the rules.
- [ ] HUD shows score and streak; combo meter visible during streaks.

**Pedagogy**
- [ ] Every wrong answer shows the correct answer plus the explanation on a blocking card; correct feedback auto-dismisses fast.
- [ ] Hint appears after 2 misses on a skill, before the next item of that skill.
- [ ] Adaptive difficulty observed: 3 correct steps up, 2 misses step down; no wall.
- [ ] Learning is the mechanic: the three-question test (section 2) passes when played.
- [ ] Distractors are plausible; spot-check 20 generated items by hand for correctness and format tells.
- [ ] Age fit: font minimums for the band, reading load, speech on for early grades, rigor for high.

**Presentation**
- [ ] All canvas text fits; nothing overlaps at 960 × 540; minimum font 16 px (20 for grades 1-3).
- [ ] Light and dark themes both readable; the subject accent colour applied unless `config.accent` overrides.
- [ ] `prefers-reduced-motion` respected (halved particles, no shake).
- [ ] Not relying on colour alone anywhere.

**Progress**
- [ ] XP awarded via `ctx.progress.addXP`; end screen shows score, accuracy, XP, level, mastery deltas per skill; best score saved and shown on replay.
- [ ] Platform events fire (`answer`, `exit`) via `Progress.emit`.

**Documentation**
- [ ] `REVIEW.md` written with verification evidence, fixes made, and known gaps.
- [ ] `games/index.json` regenerated with `node tools/build-index.mjs`.

