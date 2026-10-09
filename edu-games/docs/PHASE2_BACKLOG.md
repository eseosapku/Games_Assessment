# Phase 2 Backlog: 90 games to reach 100

Phase 1 ships 13 flagship games, one per built mechanic (`docs/PHASE1_PLAN.md`). This backlog proposes the remaining 90 so the library reaches 100 games across seven subjects and grades 1-12. Each row is a mechanic from `mechanics/CATALOG.md` plus a content pack plus a theme, built with the 10 steps in `docs/GAME_DESIGN_GUIDE.md` section 9.

Columns: `#`, working title, mechanic id, subject id, grades, band, skill focus (3-5 plain skill names in the curriculum's wording), twist (one line).

Band rule: the band of the majority of the game's grades; on a tie, the lower band. The band is what goes in `manifest.gradeBand` and drives font minimums and speech defaults.

Coverage rules this table satisfies (verified by counting the rows):

- every subject has at least 10 games (math 16, science 14, ela 14, social 12, cs 11, languages 11, arts 12);
- every grade 1-12 appears in at least 6 games;
- each of the 13 built mechanics is reused at least 3 times, across different subjects;
- no two rows share mechanic + subject + band, and no row repeats a flagship's mechanic + subject + band;
- 30 rows use planned (not yet built) mechanics, introducing 15 of the 20 planned mechanics, so Phase 2 grows the mechanic library from 13 to 28.

## The 90 games

| # | Working title | Mechanic id | Subject id | Grades | Band | Skill focus | Twist |
|---|---|---|---|---|---|---|---|
| 1 | Place Value Pile-Up | stack-drop | math | 1-2 | early | Tens and ones; Bundle ten ones; Compare two-digit numbers; Count to 120 | Falling unit blocks snap into a ten-rod when ten stack; build the spoken number before the pile reaches the roof. |
| 2 | Clock Castle | tower-defense | math | 1-2 | early | Tell time to the hour and half hour; Count coins; Measure length in units; Compare lengths | Towers are clock faces and only fire at goblins carrying the time they show, so building is reading a clock and targeting is matching it. |
| 3 | Multiplication Merge | merge-grid | math | 3-4 | elementary | Multiplication facts; Factors and multiples; Prime and composite; Division as missing factor | Merge two number tiles whose product is on the target list; prime targets can only be made from 1 x p, so primes are discovered rather than told. |
| 4 | Decimal Derby | racing | math | 4-5 | elementary | Decimal place value; Compare and order decimals; Round decimals; Fraction-decimal equivalents | Boost pads show decimals and the track edge is a number line, so the right pad is literally the closest to the sign's value. |
| 5 | Geometry Garden | grid-collector | math | 3-4 | elementary | Area and perimeter; Angle types; Classify quadrilaterals; Lines of symmetry | The snake may only eat shapes matching the current rule ("has a right angle"); each eaten shape plants a bed whose area is counted live. |
| 6 | Ratio Rocket | physics-launcher | math | 6-7 | middle | Ratios and unit rates; Proportions; Percent of a quantity; Scale drawings | Power and angle are set as a ratio; the target shows an equivalent ratio or percent and only proportional launches hit. |
| 7 | Integer Island | map-conquest | math | 6-7 | middle | Integers on the number line; Absolute value; Add and subtract negatives; Coordinate plane | Regions are coordinate cells claimed by solving the integer expression that gives their coordinates; rivals invade from the negative quadrants. |
| 8 | Order Vault | deduction | math | 5-6 | elementary | Order of operations; Evaluate expressions; Exponents; Properties of operations | Each lock pin is one step of a worked evaluation; tap the step where the order of operations was broken. |
| 9 | Stats Stadium | tycoon-sim | math | 6-8 | middle | Mean, median and mode; Box plots and spread; Sampling; Simple probability | Run a sports franchise; each season a data chart and a scout report force a stats-based signing or pricing call. |
| 10 | Probability Poker | card-battler | math | 7-8 | middle | Probability of simple events; Compound events; Sample spaces; Expected value | Play the card whose stated probability beats the opponent's event; combos chain independent events by multiplying. |
| 11 | Function Factory | block-coding | math | 8 | middle | Functions and input-output tables; Linear vs nonlinear; Slope and intercept; Graph interpretation | Assemble function machines from operation blocks so every input in the table gives the shown output; the block budget forces the simplest rule. |
| 12 | Quadratic Quest | turn-battle | math | 9-10 | high | Factor quadratics; Quadratic formula; Vertex and roots; Parabola features | Spells are factored forms; the monster's HP bar is the parabola and its roots are the hit points you must land. |
| 13 | Proof Pursuit | timeline-sequencer | math | 9-10 | high | Two-column proofs; Triangle congruence postulates; Parallel line theorems; Logical statements | Sequence proof statements and reasons under time; one planted false reason must be removed first. |
| 14 | Derivative Drift | racing | math | 11-12 | high | Limits; Derivative rules; Tangent slope; Rates of change | Boost pads show candidate derivatives; drift corners draw the tangent line so the slope you pick is the slope you feel. |
| 15 | Data Detective | deduction | math | 9-12 | high | Correlation vs causation; Sampling bias; Normal distribution; Misleading graphs | Each pin is a flawed infographic; tap the element (axis, sample, claim) that makes it misleading. |
| 16 | Trig Trajectory | physics-launcher | math | 10-11 | high | Right-triangle trigonometry; Unit circle; Radians; Law of sines | Angle is set in radians and height in sine and cosine values; the shot only lands when the ratio matches the triangle on the sign. |
| 17 | Weather Watch Run | lane-runner | science | 1-2 | early | Weather types; Seasons; Day and night; Dressing for the weather | The prompt is a spoken forecast; gates show clothing or tools and the sky switches to the weather you chose as you pass. |
| 18 | Push Pull Playground | turn-battle | science | 1-2 | early | Push and pull; Sound and vibration; Light and shadow; Material properties | Monsters are stuck playground objects; choose the force or material action (push, pull, shine, shake) that frees them. |
| 19 | Habitat Hopper | platformer | science | 2-3 | early | Animal habitats; Animal body parts and functions; Life cycles; Plant parts | Platforms are habitats; only the correct one holds your weight and a wrong platform crumbles to show where the animal actually lives. |
| 20 | Force Field Racer | racing | science | 4-5 | elementary | Balanced and unbalanced forces; Friction; Gravity; Simple machines | Pads predict what happens next (speeds up, slows, stops); the kart physically obeys the pad you chose so wrong predictions feel wrong. |
| 21 | Circuit City | circuit-connect | science | 4-5 | elementary | Electric circuits; Conductors and insulators; Series vs parallel; Energy transfer | Connect batteries, switches and bulbs on a city block; a wrong material in the path keeps the street dark and glows red where current stops. |
| 22 | Solar Conquest | map-conquest | science | 5-6 | elementary | Planets and their order; Moon phases; Earth's rotation and revolution; Gravity | Claim worlds outward from the Sun; wonder items sequence moon phases and the rivals are comets. |
| 23 | Cell Defense | tower-defense | science | 6-7 | middle | Cell organelles; Plant vs animal cells; Microbes; Immune response | Towers are organelles with real functions; pathogens are weak only to the organelle that actually fights them. |
| 24 | Energy Conveyor | conveyor-sort | science | 6-8 | middle | Forms of energy; Energy transformations; Kinetic and potential energy; Heat transfer | Sort objects by energy form, then by transformation; rush rounds ask which bin loses energy as heat. |
| 25 | Gene Garden | tycoon-sim | science | 7-8 | middle | Punnett squares; Dominant and recessive traits; Heredity vs environment; Probability of offspring | Breed plants to fill customer orders; each quarter's decision is a Punnett prediction and profit follows the real ratio. |
| 26 | Balance of Nature | system-sim | science | 7-8 | middle | Population dynamics; Carrying capacity; Predator-prey cycles; Human impact | Tune birth, food and hunting sliders to hit a target population curve; the question is which lever moves the curve as asked. |
| 27 | Projectile Lab | physics-launcher | science | 9-10 | high | Newton's laws; Projectile motion; Velocity and acceleration; Momentum | Set velocity and angle from the given numbers; on a miss a vector overlay shows your components against the correct ones. |
| 28 | Element Duel | card-battler | science | 9-10 | high | Periodic trends; Electron configuration; Reactivity; Atomic and ionic radius | Play the element whose property wins the called trend; the periodic table lights up the trend direction after each play. |
| 29 | Genome Dungeon | dungeon-crawler | science | 10-12 | high | DNA replication; Transcription and translation; Mutations; Protein synthesis | Rooms are codons; doors open with the right amino acid and a mutation room changes one base so you must read the new codon. |
| 30 | Climate Council | tycoon-sim | science | 11-12 | high | Carbon cycle; Greenhouse effect; Feedback loops; Energy sources | Run a region's energy mix for 12 years; each decision is a carbon-flow question and the temperature chart answers it honestly. |
| 31 | Letter Sound Lane | lane-runner | ela | 1 | early | Letter sounds; Beginning sounds; Rhyming words; CVC words | The prompt is a spoken sound or word; gates show letters or pictures and every gate speaks when you pass it. |
| 32 | Syllable Stomp | rhythm-tap | ela | 1-2 | early | Syllable counting; Phoneme segmentation; Blending; Rhyme | Tap once per syllable as the word scrolls by; forge rounds build a word from scrolling phoneme tiles. |
| 33 | Sentence Stacker | stack-drop | ela | 2-3 | early | Sentence word order; Capital letters; End punctuation; Nouns and verbs | Word tiles fall; stack them left to right into a sentence and the capital must land first and the punctuation last or the tower topples. |
| 34 | Story Train | timeline-sequencer | ela | 2-3 | early | Sequence of events; Beginning, middle and end; Cause and effect; Retelling | Couple story-card carriages in order; the train only departs when the sequence runs and a derailed carriage replays the clue. |
| 35 | Synonym Snake | grid-collector | ela | 3-4 | elementary | Synonyms and antonyms; Prefixes and suffixes; Context clues; Multiple-meaning words | Eat only synonyms of the head word; antonyms shrink you and the rule flips to antonyms when the biome changes. |
| 36 | Punctuation Pit Stop | racing | ela | 4-5 | elementary | Commas in lists; Quotation marks; Apostrophes; Capitalisation rules | Pads show three punctuated versions of the sign's sentence; pit stops swap in a harder rule each lap. |
| 37 | Figurative Fishing | fishing-collect | ela | 4-5 | elementary | Similes and metaphors; Idioms; Personification; Alliteration | Fish carry phrases; cast only for the figurative type on your order card and the wrong catch flops back explaining its type. |
| 38 | Main Idea Merge | merge-grid | ela | 5-6 | elementary | Main idea and details; Summarising; Text structure; Paragraph unity | Merge detail tiles into the main-idea tile they support; an unrelated detail fizzes and the paragraph shows why it does not belong. |
| 39 | Homophone Hunter | typing-shooter | ela | 5-6 | elementary | Homophones; Irregular plurals; Verb tenses; Commonly confused words | Asteroids carry sentences with a blank; type the correct word to shoot and a wrong word bounces off highlighting the clue. |
| 40 | Theme Tower | tower-defense | ela | 6-8 | middle | Theme; Character motivation; Inference; Point of view | Towers are themes; passages marching by take damage only from the theme they truly express. |
| 41 | Newsroom Tycoon | tycoon-sim | ela | 7-8 | middle | Main idea; Text evidence; Author's purpose; Bias and reliability | Publish a paper each week; pick the headline the evidence supports and readership follows the honesty of your call. |
| 42 | Plot Twist | story-choice | ela | 7-9 | middle | Plot structure; Types of conflict; Narrative perspective; Foreshadowing | Your branching choices are craft decisions (which line foreshadows, which conflict escalates); weak craft dead-ends the plot and rewinds. |
| 43 | Bard's Escape | escape-room | ela | 9-12 | high | Literary devices; Shakespearean language; Soliloquy analysis; Character arcs | Each room is a scene; unlock it by naming the device, translating the archaic phrase or naming the motive. |
| 44 | Argument Atlas | map-conquest | ela | 9-11 | high | Thesis statements; Counterclaims; Logical structure; Transitions | Claim regions of a debate map with the strongest thesis, rebuttal or transition; rivals win with fallacies you can later retake. |
| 45 | Helper Highway | lane-runner | social | 1-2 | early | Community helpers; Rules and laws; Needs vs wants; Map symbols | A spoken scenario ("a house is on fire"); gates show helpers or tools and the town behind you fills with those you chose. |
| 46 | Compass Collector | grid-collector | social | 2-3 | early | Cardinal directions; Map symbols; Landforms; Continents and oceans | Instructions arrive as directions ("go north two"); eat the landform named and a wrong landform rotates the compass to show the way. |
| 47 | Timeline Trail | timeline-sequencer | social | 3-5 | elementary | Historical chronology; Inventions; Explorers; Local history | Lay events on a wagon trail; the wagon only crosses rivers bridged by correctly ordered cards. |
| 48 | Government Gears | circuit-connect | social | 4-5 | elementary | Three branches; Checks and balances; How a bill becomes law; Levels of government | Connect branches to their powers so the gear train turns; a power wired to the wrong branch jams the gears. |
| 49 | Trading Post | tycoon-sim | social | 5-6 | elementary | Goods and services; Scarcity and choice; Producers and consumers; Trade and barter | Run a frontier post; each season's decision is a scarcity question and barter rounds use ratios. |
| 50 | Geo Rush | conveyor-sort | social | 6-7 | middle | Continents and oceans; Countries and capitals; Climate zones; Landforms | Sort place cards onto map bins before they slide off; rush rounds narrow the bin to one continent. |
| 51 | Rights Rumble | card-battler | social | 7-8 | middle | Bill of Rights; Constitutional amendments; Landmark Supreme Court cases; Federalism | Play the amendment card that defends against the scenario card; chain cases for a precedent combo. |
| 52 | Medieval Dungeon | dungeon-crawler | social | 6-8 | middle | Feudalism; Medieval Europe; Silk Road; Renaissance | Each floor is a century; doors open by identifying roles, routes and inventions and treasure rooms hold primary sources. |
| 53 | Budget Builder | idle-tycoon | social | 7-9 | middle | Budgeting; Simple and compound interest; Credit and debt; Saving goals | Income ticks in idly; every upgrade is a finance question and bad credit choices visibly slow the tick rate. |
| 54 | War Room Files | deduction | social | 9-10 | high | Causes of WWI and WWII; Primary source analysis; Propaganda techniques; Alliances | Pins are primary sources; identify the technique, the author's side or the cause it supports. |
| 55 | Campaign Trail | racing | social | 9-10 | high | Electoral College; Voting rights history; Political parties; Media literacy | Pads are campaign decisions with civics facts behind them; the lap map shows the electoral votes you win or lose. |
| 56 | Supply Chain Stacker | stack-drop | social | 9-12 | high | Globalization; Comparative advantage; Supply chains; GDP and trade | Stack production stages in the order a real product travels; a misplaced stage collapses and shows the true chain. |
| 57 | Pattern Pixel Run | lane-runner | cs | 1-2 | early | Patterns; Algorithms as steps; Computer parts; Sequencing | Gates show the next item in a pattern or the next step of a routine; the hero's trail paints the pattern you built. |
| 58 | Safe Surfer Sort | conveyor-sort | cs | 3-4 | elementary | Strong passwords; Personal information; Spotting phishing; Digital citizenship | Sort messages and pop-ups into Safe or Report bins; rush rounds add a Share-with-an-adult bin. |
| 59 | Grid Commander | map-conquest | cs | 4-5 | elementary | Coordinates on a grid; Movement commands; Pathfinding; Events and triggers | Claim grid cells by giving the correct command sequence; rivals block paths so you must re-route. |
| 60 | Bug Vault | deduction | cs | 5-6 | elementary | Debugging; Tracing code; Conditionals; Variables | Each pin is a short program and its wrong output; tap the line with the bug. |
| 61 | Network Nodes | circuit-connect | cs | 6-7 | middle | How the internet works; Packets and routing; IP addresses; Online safety | Wire nodes so a packet reaches its address; a wrong hop is shown as the packet getting lost. |
| 62 | Code Duel | turn-battle | cs | 6-8 | middle | Loops; Functions; Boolean logic; Predicting output | Spells are code snippets; predict the output to cast and the monster's counterspell is a bug you must spot. |
| 63 | Sort Beat | rhythm-tap | cs | 7-8 | middle | Sorting algorithms; Comparisons and swaps; Step tracing; Efficiency intuition | Bars scroll by; tap on the beat only when the algorithm would swap and forge rounds order the passes. |
| 64 | Syntax Shooter | typing-shooter | cs | 7-9 | middle | Syntax and keywords; Variables and types; String operations; Common errors | Asteroids carry broken lines of code; type the fix to shoot and the correct token glows when you hit. |
| 65 | Server Farm | tycoon-sim | cs | 9-10 | high | Data structures; Algorithm efficiency; Cloud and servers; Data privacy | Scale a startup; each quarter's decision is a data-structure or efficiency question and latency charts answer it. |
| 66 | Gate Merge | merge-grid | cs | 9-10 | high | Boolean logic; Logic gates; Truth tables; Binary arithmetic | Merge input tiles through gate tiles; the output must match the truth-table row shown. |
| 67 | Recursion Depths | dungeon-crawler | cs | 10-12 | high | Recursion; Stacks and queues; Search algorithms; Complexity | Floors are recursive calls; descend by giving the base case and climb back with the return values. |
| 68 | Colores Corredor | lane-runner | languages | 1-2 | early | Colours; Numbers 1-10; Greetings; Animals | Spoken Spanish word; gates show pictures only and every gate repeats its word as you pass. |
| 69 | Amigos Memory | memory-pairs | languages | 2-3 | early | Family members; Body parts; Classroom objects; Animals | Flip picture and word pairs; a matched pair speaks itself and the board shuffles on misses in the final round. |
| 70 | La Casa Collector | grid-collector | languages | 3-5 | elementary | Rooms of the house; Furniture; Prepositions of place; Daily routine verbs | A spoken Spanish sentence names a room and a position; eat only the matching item. |
| 71 | Ruta Robot | block-coding | languages | 4-5 | elementary | Direction words; Numbers; Imperative commands; Classroom instructions | Program blocks are Spanish commands (gira a la izquierda, avanza tres); understanding the command is the only way to move. |
| 72 | Fiesta Beat | rhythm-tap | languages | 4-6 | elementary | Syllable stress; Pronunciation; Accent marks; Question words | Tap on the stressed syllable of each scrolling word; forge rounds place the accent mark. |
| 73 | Artículo Autopista | racing | languages | 6-7 | middle | Gender and articles; Adjective agreement; Plurals; Ser vs estar | Pads show el/la/los/las or adjective forms; the sign is a noun phrase and drift corners add adjectives. |
| 74 | Café Catch | fishing-collect | languages | 6-8 | middle | French food vocabulary; French gender and articles; French numbers; French greetings | First French pack; catch the fish whose label matches the spoken order and wrong fish repeat the word slowly. |
| 75 | Verbo Volcán | tower-defense | languages | 7-8 | middle | Regular present tense; Irregular verbs; Stem-changing verbs; Reflexive verbs | Towers are subject pronouns; they only hit lava sprites carrying the matching conjugation. |
| 76 | Mercado Tycoon | tycoon-sim | languages | 7-9 | middle | Numbers to 1000; Money and prices; Food vocabulary; Bargaining phrases | Run a stall; each day's decision is a Spanish-only customer request and the ledger pays only for correct comprehension. |
| 77 | Tiempo Detective | deduction | languages | 9-10 | high | Preterite vs imperfect; Subjunctive triggers; Por vs para; Object pronouns | Pins are sentences with one wrong tense or pronoun; tap the word that breaks the rule. |
| 78 | Viaje Story | story-choice | languages | 9-10 | high | Travel vocabulary; Polite forms; Conversational phrases; Listening comprehension | A branching trip told in Spanish; each choice is a comprehension check and misunderstandings send you to the wrong city. |
| 79 | Color Mix Merge | merge-grid | arts | 1-2 | early | Primary and secondary colours; Warm and cool colours; Tints and shades; Colour wheel | Merge paint tiles; only real mixes fuse (blue + yellow = green) and white or black tiles tint and shade. |
| 80 | Line Dancer Run | lane-runner | arts | 1-2 | early | Types of lines; Shapes in art; Patterns; Texture words | Spoken line name; gates show zigzag, wavy or straight lines and the hero's trail draws the line you chose. |
| 81 | Melody Echo | pattern-echo | arts | 2-3 | early | Echo melodic patterns; Rhythm patterns; Call and response; Steady beat | Hear a short phrase and echo it on four pitch pads; patterns grow one note per round and round 2 is audio only. |
| 82 | Pitch Platformer | platformer | arts | 3-5 | elementary | High and low pitch; Solfege; Melodic direction; Steps and skips | Platforms sit at pitch heights; a note sounds and you must jump to the platform that plays it. |
| 83 | Orchestra Conveyor | conveyor-sort | arts | 3-4 | elementary | Instrument families; Timbre; How instruments make sound; The orchestra | Instruments play a snippet as they pass; sort by family and rush rounds sort by how the sound is made. |
| 84 | Choreo Coder | block-coding | arts | 4-6 | elementary | Movement sequences; Musical form (ABA); Repeat patterns; Tempo | Program a dancer with move blocks and repeats to match the shown form; the block budget forces the loop. |
| 85 | Perspective Trace | trace-draw | arts | 6-7 | middle | One-point perspective; Horizon line; Proportion; Contour lines | Trace the vanishing lines to the correct point; a wrong horizon is shown as the box tilting. |
| 86 | Art Atlas | map-conquest | arts | 6-8 | middle | Art movements; Famous artists; Cultural art traditions; Art chronology | Claim regions by period and place; wonder items sequence a movement's key works. |
| 87 | Director's Cut | story-choice | arts | 6-8 | middle | Elements of drama; Stage directions; Character objectives; Blocking | Direct a scene; each choice is a staging decision and the audience meter reacts to what theatre craft says works. |
| 88 | Chord Clash | card-battler | arts | 7-9 | middle | Chords and triads; Scales; Key signatures; Intervals | Play the chord card that resolves the opponent's progression; chain a cadence for the finisher. |
| 89 | Theory Tower | tower-defense | arts | 9-10 | high | Key signatures; Interval quality; Chord quality; Cadences | Towers are keys; marching motifs take damage only from the key they belong to. |
| 90 | Gallery Tycoon | tycoon-sim | arts | 9-12 | high | Curation and exhibition; Art movements; Art critique vocabulary; Art careers | Run a gallery; each season's decision is a critique or movement question and attendance follows your eye. |

## Coverage summary

| check | result |
|---|---|
| games per subject | math 16, science 14, ela 14, social 12, cs 11, languages 11, arts 12 (all >= 10) |
| games per grade | 1: 11, 2: 15, 3: 13, 4: 18, 5: 17, 6: 23, 7: 27, 8: 21, 9: 21, 10: 18, 11: 10, 12: 8 (all >= 6) |
| built mechanics reused | lane-runner 6, tower-defense 5, racing 6, grid-collector 4, merge-grid 4, turn-battle 3, deduction 5, card-battler 4, map-conquest 5, tycoon-sim 8, block-coding 3, conveyor-sort 4, rhythm-tap 3 (each >= 3, each across >= 3 subjects) |
| rows on built mechanics | 60 |
| rows on planned mechanics | 30 (stack-drop 3, physics-launcher 3, timeline-sequencer 3, circuit-connect 3, dungeon-crawler 3, story-choice 3, platformer 2, fishing-collect 2, typing-shooter 2, system-sim 1, escape-room 1, idle-tycoon 1, memory-pairs 1, pattern-echo 1, trace-draw 1) |
| planned mechanics still unused after Phase 2 | breakout-bubble, word-grid, geometry-construct, quiz-show-wager, auction-bid (specs ready in the catalog for Phase 3) |
| mechanic + subject + band collisions | none, including against the 13 flagships |

## Suggested build order

Six batches of fifteen. Batches 1-4 use only built mechanics, so each is pure content-pack and theme work and a builder learns one chassis and ships several skins; batches are grouped by chassis for that reason. Batch 1 leans early and elementary because the flagships cover those bands least. Batches 5-6 introduce the planned mechanics; each new mechanic is built with its first game and reused immediately, and mechanics used only once sit in batch 6 so they are built last. Within a batch, rows are independent and can be built in parallel.

**Batch 1 — runners, racers, collectors (lane-runner x6, racing x6, grid-collector x3).** Simplest chassis, fastest decisions, fills grades 1-5.
17 Weather Watch Run, 31 Letter Sound Lane, 45 Helper Highway, 57 Pattern Pixel Run, 68 Colores Corredor, 80 Line Dancer Run, 4 Decimal Derby, 20 Force Field Racer, 36 Punctuation Pit Stop, 73 Artículo Autopista, 55 Campaign Trail, 14 Derivative Drift, 5 Geometry Garden, 35 Synonym Snake, 46 Compass Collector.

**Batch 2 — towers, merges, conveyors, duels (tower-defense x5, merge-grid x4, conveyor-sort x4, turn-battle x2).** Medium-pace chassis with in-canvas item presentation.
2 Clock Castle, 23 Cell Defense, 40 Theme Tower, 75 Verbo Volcán, 89 Theory Tower, 3 Multiplication Merge, 38 Main Idea Merge, 66 Gate Merge, 79 Color Mix Merge, 24 Energy Conveyor, 50 Geo Rush, 58 Safe Surfer Sort, 83 Orchestra Conveyor, 18 Push Pull Playground, 62 Code Duel.

**Batch 3 — deduction, cards, maps (deduction x5, card-battler x4, map-conquest x5, turn-battle x1).** Slower strategic chassis; mostly middle and high.
8 Order Vault, 15 Data Detective, 54 War Room Files, 60 Bug Vault, 77 Tiempo Detective, 10 Probability Poker, 28 Element Duel, 51 Rights Rumble, 88 Chord Clash, 7 Integer Island, 22 Solar Conquest, 44 Argument Atlas, 59 Grid Commander, 86 Art Atlas, 12 Quadratic Quest.

**Batch 4 — sims, coding, rhythm (tycoon-sim x8, block-coding x3, rhythm-tap x3, grid-collector x1).** The chart-heavy and audio-heavy chassis; needs the `sd-chart`, `line` and `bar` visuals and `playNote` music to be solid.
9 Stats Stadium, 25 Gene Garden, 30 Climate Council, 41 Newsroom Tycoon, 49 Trading Post, 65 Server Farm, 76 Mercado Tycoon, 90 Gallery Tycoon, 11 Function Factory, 71 Ruta Robot, 84 Choreo Coder, 32 Syllable Stomp, 63 Sort Beat, 72 Fiesta Beat, 70 La Casa Collector.

**Batch 5 — five new mechanics, three games each (stack-drop, physics-launcher, timeline-sequencer, circuit-connect, dungeon-crawler).** Build the mechanic with the first row listed, smoke-test it, then ship the two re-skins.
stack-drop: 1 Place Value Pile-Up, 33 Sentence Stacker, 56 Supply Chain Stacker; physics-launcher: 6 Ratio Rocket, 27 Projectile Lab, 16 Trig Trajectory; timeline-sequencer: 34 Story Train, 47 Timeline Trail, 13 Proof Pursuit; circuit-connect: 21 Circuit City, 48 Government Gears, 61 Network Nodes; dungeon-crawler: 52 Medieval Dungeon, 29 Genome Dungeon, 67 Recursion Depths.

**Batch 6 — ten new mechanics (story-choice x3, platformer x2, fishing-collect x2, typing-shooter x2, system-sim, escape-room, idle-tycoon, memory-pairs, pattern-echo, trace-draw).** The remaining chassis, including the single-use ones; build each with its first game and record its re-skin ideas in the catalog for Phase 3.
story-choice: 42 Plot Twist, 78 Viaje Story, 87 Director's Cut; platformer: 19 Habitat Hopper, 82 Pitch Platformer; fishing-collect: 37 Figurative Fishing, 74 Café Catch; typing-shooter: 39 Homophone Hunter, 64 Syntax Shooter; 26 Balance of Nature (system-sim); 43 Bard's Escape (escape-room); 53 Budget Builder (idle-tycoon); 69 Amigos Memory (memory-pairs); 81 Melody Echo (pattern-echo); 85 Perspective Trace (trace-draw).

After batch 6 the library holds 103 rows (13 flagships + 90) on 28 mechanics; the five unused planned mechanics (breakout-bubble, word-grid, geometry-construct, quiz-show-wager, auction-bid) are the natural start of Phase 3.
