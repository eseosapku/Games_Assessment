export const meta = {
  name: 'edu-games-phase1-games',
  description: 'Build and review the 13 flagship games (one reusable mechanic + content pack each)',
  phases: [
    { title: 'Build', detail: 'one builder per game: mechanic + content pack + game wiring, self-tested in a real browser' },
    { title: 'Review', detail: 'one independent reviewer/fixer per game: contract, pedagogy, fun, performance' },
  ],
}

// args: { root: absolute path to edu-games, games?: [ids to build; default all 13] }
const ROOT = args.root

const GAMES = [
  { n: 1, id: 'number-gate-runner', title: 'Number Gate Runner', mechanic: 'lane-runner', subject: 'math', grades: '1-2', band: 'early' },
  { n: 2, id: 'fraction-fortress', title: 'Fraction Fortress', mechanic: 'tower-defense', subject: 'math', grades: '4-5', band: 'elementary' },
  { n: 3, id: 'algebra-kart', title: 'Algebra Kart', mechanic: 'racing', subject: 'math', grades: '7-9', band: 'middle' },
  { n: 4, id: 'food-chain-frenzy', title: 'Food Chain Frenzy', mechanic: 'grid-collector', subject: 'science', grades: '3-5', band: 'elementary' },
  { n: 5, id: 'molecule-merge', title: 'Molecule Merge', mechanic: 'merge-grid', subject: 'science', grades: '7-9', band: 'middle' },
  { n: 6, id: 'word-wizard-duel', title: 'Word Wizard Duel', mechanic: 'turn-battle', subject: 'ela', grades: '2-3', band: 'early' },
  { n: 7, id: 'grammar-heist', title: 'Grammar Heist', mechanic: 'deduction', subject: 'ela', grades: '6-8', band: 'middle' },
  { n: 8, id: 'rhetoric-arena', title: 'Rhetoric Arena', mechanic: 'card-battler', subject: 'ela', grades: '9-12', band: 'high' },
  { n: 9, id: 'empire-of-eras', title: 'Empire of Eras', mechanic: 'map-conquest', subject: 'social', grades: '6-8', band: 'middle' },
  { n: 10, id: 'market-mayhem', title: 'Market Mayhem', mechanic: 'tycoon-sim', subject: 'social', grades: '10-12', band: 'high' },
  { n: 11, id: 'robot-route', title: 'Robot Route', mechanic: 'block-coding', subject: 'cs', grades: '3-5', band: 'elementary' },
  { n: 12, id: 'mercado-rush', title: 'Mercado Rush', mechanic: 'conveyor-sort', subject: 'languages', grades: '6-8', band: 'middle' },
  { n: 13, id: 'rhythm-forge', title: 'Rhythm Forge', mechanic: 'rhythm-tap', subject: 'arts', grades: '3-6', band: 'elementary' },
]
const selected = Array.isArray(args.games) && args.games.length ? GAMES.filter(g => args.games.includes(g.id)) : GAMES

const REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    filesWritten: { type: 'array', items: { type: 'string' } },
    verified: { type: 'array', items: { type: 'string' }, description: 'Concrete checks you ran and their outcome' },
    fixed: { type: 'array', items: { type: 'string' } },
    deviations: { type: 'array', items: { type: 'string' } },
    openIssues: { type: 'array', items: { type: 'string' } },
    smokePassed: { type: 'boolean' },
    contentCheckPassed: { type: 'boolean' },
    passed: { type: 'boolean' },
  },
  required: ['summary', 'filesWritten', 'verified', 'openIssues', 'smokePassed', 'contentCheckPassed', 'passed'],
}

const PREAMBLE = `You are building part of "edu-games", a library of ~100 K-12 educational web games that will become a section of a web app.
Project root (absolute): ${ROOT}
FIRST read, completely: ${ROOT}/docs/ARCHITECTURE.md (the binding contract; it wins over everything else), ${ROOT}/docs/PHASE1_PLAN.md (the game briefs), ${ROOT}/docs/GAME_DESIGN_GUIDE.md, ${ROOT}/kit/README.md.
Then read the kit source you will call: ${ROOT}/kit/kit.js, ${ROOT}/kit/learn/content.js, ${ROOT}/kit/learn/adaptive.js, ${ROOT}/kit/ui/overlay.js, ${ROOT}/kit/core/input.js, ${ROOT}/kit/core/utils.js (skim the others as needed), and the reference implementation ${ROOT}/mechanics/kit-demo/mechanic.js plus everything in ${ROOT}/games/kit-demo/ which shows how a mechanic, a content pack and the game wiring fit together.
Rules: plain ES2022 modules, no build step, no runtime dependencies, no TypeScript, no frameworks, Canvas 2D only, all graphics drawn procedurally (shapes, gradients, simple characters), no external images or fonts beyond what theme.css provides. Use absolute paths under the root. Never create files outside the root (temporary scripts go in ${ROOT}/tools/out/ and are deleted afterwards). Do not modify anything under ${ROOT}/kit/ or ${ROOT}/docs/; if the kit has a bug that blocks you, work around it in your own files and report it under "deviations" with the exact file/line.
Tooling notes: use the Bash tool (Git Bash) for shell commands and chain with &&. Shell heredocs are unreliable here: create and edit files with the Write/Edit tools. Node 22 is installed. playwright-core is installed in ${ROOT}/tools/node_modules and Microsoft Edge launches with channel "msedge" (see ${ROOT}/tools/smoke.mjs for a working launch + static-server pattern you can copy). Read screenshots with the Read tool.
Your final message is machine-read; return only the structured output.`

const BUILD = (g) => `${PREAMBLE}

TASK: Build flagship game #${g.n} "${g.title}" (id: ${g.id}; subject: ${g.subject}; grades ${g.grades}; band: ${g.band}) exactly as briefed in PHASE1_PLAN.md, as a reusable mechanic plus a content pack. Also read the "${g.mechanic}" section of ${ROOT}/mechanics/CATALOG.md and find your required skill ids (and their neighbours) in ${ROOT}/curriculum/${g.subject}.json to align names and descriptions.

FILES TO CREATE
1. ${ROOT}/mechanics/${g.mechanic}/mechanic.js: the generic, content-agnostic chassis per ARCHITECTURE.md section 4 (export meta, defaultConfig, class Mechanic with constructor(ctx), init, update(dt), render(g), destroy, and optional onPause/onResume/onResize). Everything subject-specific (names, colours, palette, labels, stage names, speeds, counts, enemy/sprite styles chosen from a small set of procedural drawing styles) comes through config with sane defaults so Phase 2 can re-skin it for another subject without touching this file. Declare meta.itemTypes honestly and validate in init() that the content pack supports them. Also write ${ROOT}/mechanics/${g.mechanic}/README.md: what it does, the item types it consumes and how it presents them, every config key with type/default/meaning, and re-skin notes.
2. ${ROOT}/games/${g.id}/content.js (ContentPack per section 6; pure, deterministic from rng, Node-importable), manifest.json (section 5.1, status "flagship", skills = exactly the required ids from the brief), game.js (wires mechanic + content + config; the config is where the theme lives), index.html (section 5 template), thumb.svg (hand-written SVG 320x180 that evokes the game, using the subject colour), NOTES.md (how to play, the stage structure, exactly how learning is the mechanic, config used, known limitations).

QUALITY BAR (this is a flagship that sets the standard for 90 more games)
- Genuinely fun: a real game loop with momentum, escalation, risk/reward and a finale, not a quiz with a skin. Juice everywhere: particles, tweens, screen shake, floating score text, combo/streak feedback, sound on every meaningful event, music via ctx.audio.music.
- Genuinely teaching: follow ARCHITECTURE.md 2.2 to the letter. Every wrong answer shows the correct answer and the item's explanation and blocks until dismissed (ctx.feedback or an equivalent in-canvas card that is at least as clear); hints after two misses on a skill (ctx.adaptive.needsHint); difficulty adapts (ctx.nextItem with no explicit difficulty uses the adaptive controller); the grade band dictates text size, reading load and speech (ctx.speak for early band).
- Looks like a real game: full use of the 960x540 canvas, layered background with depth, animated characters/objects drawn procedurally, consistent palette from config, readable HUD. Grade-appropriate art direction.
- Controls: keyboard + mouse + touch; on-screen touch alternative for any directional control (ctx.input.addTouchButton or tap zones); pause via Escape/P handled by the kit.
- Session: 5-10 minutes, at least 3 escalating stages with a visible progress bar (hud progress or in-canvas), one finale/boss moment as described in the brief, then ctx.endGame({ score, correct, total, bonusXP, stats }).
- Content: ALL required skill ids from the brief, difficulty 1-5 for each, procedural generators where possible (large variety), distractors from real misconceptions, explanations that teach the rule in one or two sentences, hints, and item.visual where the brief asks for one (and the mechanic draws it).
- Code: mechanic.js may be 800-1800 lines; keep update() allocation-light; use ctx.rng only; all canvas text through drawText/wrapText; no console.log spam; no console.error in normal play.

VERIFY (do all; fix and repeat until green)
1. node --check on every .js you wrote.
2. From ${ROOT}: node tools/content-check.mjs ${g.id}  -> must print OK. Also dump 10 items per skill at difficulties 1, 3 and 5 with a one-off node script and READ them like a teacher: correct? plausible distractors? explanation teaches the why? difficulty really rises? Fix the generators until yes.
3. From ${ROOT}: node tools/build-index.mjs
4. From ${ROOT}: node tools/smoke.mjs ${g.id} --seconds 20  -> must PASS. Read tools/out/${g.id}.png and judge it honestly: does it look like a polished game? Fix until it does.
5. Write an ad-hoc playwright-core walk script in ${ROOT}/tools/out/ (copy the server + launch pattern from tools/smoke.mjs) that screenshots: the start screen; 3 seconds into play; a wrong-answer feedback card (reach it by fuzzing or by calling the mechanic's own methods through window.__eduGame.ctx if your mechanic exposes them); a stage transition or the finale (force progress through window.__eduGame.ctx or by playing); the end screen (force via window.__eduGame.ctx.endGame if needed); plus one mid-play screenshot at viewport 375x667. Read every screenshot. Fix overlap, unreadable text, broken layout, dull visuals. Delete the ad-hoc script and its screenshots afterwards (keep tools/out/${g.id}.png).
6. Confirm start -> play -> end -> replay -> play works without errors (the smoke test replays automatically when it reaches the end screen; if it never reaches the end in 20 s, force it once in your walk script and click replay).
Report precisely what you verified in the structured output.`

const REVIEW = (g, build) => `${PREAMBLE}

TASK: Independently review, play-test and FIX flagship game "${g.title}" (id: ${g.id}; mechanic: ${g.mechanic}; subject ${g.subject}; grades ${g.grades}). Another agent built it; its report is below. Do not trust it. You own the final quality of this game: fix problems directly in ${ROOT}/mechanics/${g.mechanic}/ and ${ROOT}/games/${g.id}/ (never in kit/ or docs/).

BUILDER REPORT:
${JSON.stringify(build, null, 2)}

REVIEW STEPS
1. Contract audit (ARCHITECTURE.md 2.1, 2.2, 4, 5, 6, 8, 9): read every file of the game and mechanic. Check: mechanic is content-agnostic (grep it for subject-specific words; move any into config); no Math.random; all canvas text via drawText/wrapText with sizes >= 16 (>= 20 for early band); keyboard + mouse + touch all work, with an on-screen alternative for directional input; wrong answers always show the correct answer AND the explanation and block until dismissed; hint after two misses on a skill; ctx.nextItem/ctx.answer used (no private grading); at least 3 escalating stages + finale; progress visible; XP flows; endGame called with correct/total; destroy() removes every listener/tween/timer so replay is clean; manifest skills equal the brief's required ids; manifest fields complete.
2. Pedagogy audit of content.js: with a one-off node script, generate 20 items per skill at each difficulty 1-5 and read them like a demanding teacher. Verify factual/mathematical correctness of EVERY generator path, that distractors are plausible misconceptions and never accidentally correct, that explanations teach the why and name the rule, that hints help without giving the answer, that difficulty truly rises, and that there is enough variety (>= 40 distinct items, ideally hundreds). Fix generators. Then run node tools/content-check.mjs ${g.id}.
3. Fun and clarity play-test: with playwright-core (pattern in tools/smoke.mjs) play for 90 seconds with a mix of random input and, where possible, deliberate correct answers (if the mechanic exposes its current item or state through window.__eduGame.ctx / the mechanic instance, use it to answer correctly sometimes so you can see escalation). Screenshot every 10 seconds plus the first wrong-answer card, a stage transition, the finale and the end screen (force via ctx.endGame if needed). Read them all. Ask: would a ${g.band}-band student understand what to do in 5 seconds? Is the pace right? Does difficulty and spectacle escalate? Is the finale a real moment? Is text readable at 375x667? Fix what is clearly wrong; improve juice where it is flat.
4. Robustness: run node tools/smoke.mjs ${g.id} --seconds 25 twice (different fuzz because timing differs) and once at --seconds 10 with a quick replay; zero errors required. Test Escape pause/resume mid-animation, a window resize mid-play (viewport 800x450 then 1366x768), and rapid repeated clicks on the same target. Check the frame rate: frames / seconds >= 50 in headless.
5. Performance scan: look for per-frame allocations, DOM writes in update/render, unbounded arrays (particles, enemies, bullets) and fix.
6. Final: node --check all files; content-check OK; smoke PASS; node tools/build-index.mjs. Write ${ROOT}/games/${g.id}/REVIEW.md with: what you verified (with the evidence: command outputs, what screenshots showed), what you fixed, remaining known gaps, and a 1-10 rating for fun, clarity, learning and polish with one line of justification each. Delete your ad-hoc scripts and screenshots (keep tools/out/${g.id}.png).
Report in the structured output.`

// args.review === false skips the independent reviewer stage (budget mode: the orchestrator reviews via tools instead)
const DO_REVIEW = args.review !== false
log(`Building ${selected.length} flagship games (${DO_REVIEW ? 'build + independent review' : 'build only, orchestrator reviews'}): ${selected.map(g => g.id).join(', ')}`)

const EFFICIENCY = `
BUDGET NOTE: be efficient with tool calls. Write each file once, completely, rather than in many small edits. Batch your browser verification into one or two playwright scripts that capture all screenshots in a single run. Aim to finish in well under 60 tool calls.`

const results = await pipeline(
  selected,
  (g) => agent(BUILD(g) + EFFICIENCY, { label: `build:${g.id}`, phase: 'Build', schema: REPORT, effort: 'high' }),
  (build, g) => DO_REVIEW
    ? agent(REVIEW(g, build), { label: `review:${g.id}`, phase: 'Review', schema: REPORT, effort: 'high' })
        .then(review => ({ game: g.id, mechanic: g.mechanic, build, review }))
    : Promise.resolve({ game: g.id, mechanic: g.mechanic, build, review: build }),
)

const done = results.filter(Boolean)
const passing = done.filter(r => r.review && r.review.passed && r.review.smokePassed && r.review.contentCheckPassed)
const failing = done.filter(r => !(r.review && r.review.passed && r.review.smokePassed && r.review.contentCheckPassed))
const dropped = selected.filter(g => !done.find(r => r.game === g.id)).map(g => g.id)
log(`Review passed: ${passing.length}/${selected.length}; failing: ${failing.map(r => r.game).join(', ') || 'none'}; dropped (agent died/skipped): ${dropped.join(', ') || 'none'}`)

return {
  passing: passing.map(r => r.game),
  failing: failing.map(r => ({ game: r.game, openIssues: r.review ? r.review.openIssues : ['no review result'] })),
  dropped,
  results: done,
}
