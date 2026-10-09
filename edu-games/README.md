# Edu-Games: the Learning Arcade

A library of highly interactive educational web games for grades 1 to 12 across seven subjects, built to drop into a web app as a section. Every game is a reusable **mechanic** (the game chassis) combined with a **content pack** (what is being learned) and a **config/theme**, so the same mechanic can be re-skinned for other subjects and grades.

Zero build step. Zero runtime dependencies. Plain ES modules + Canvas 2D. Any static host serves it; the platform embeds a game as an iframe or mounts it with `createGame()`.

## Run it locally

```bash
node tools/serve.mjs 8080
```

Then open http://localhost:8080/ for the launcher, or http://localhost:8080/games/<game-id>/ for a single game. ES modules do not load from `file://`, so always use a server.

## Layout

| Path | What it is |
|---|---|
| `index.html`, `launcher/` | The game library UI (filters by subject, grade, mechanic; player XP; opens games in a modal) |
| `kit/` | The shared engine: canvas loop, input, synthesized audio, tweens, particles, HUD, overlays, adaptive difficulty, progress/XP/mastery |
| `mechanics/<id>/` | Reusable, content-agnostic game chassis plus a README of its config knobs. `mechanics/CATALOG.md` describes all built and planned mechanics |
| `games/<id>/` | One playable game: `manifest.json`, `content.js`, `game.js`, `index.html`, `thumb.svg`, `NOTES.md`, `REVIEW.md` |
| `curriculum/` | The skill taxonomy: 7 subjects x grades 1-12 x topics x skills (`map.json`, merged from per-subject files) |
| `docs/` | `ARCHITECTURE.md` (the contract), `GAME_DESIGN_GUIDE.md`, `INTEGRATION.md`, `PHASE1_PLAN.md`, `PHASE2_BACKLOG.md` |
| `tools/` | Dev tooling only (not shipped): static server, index builder, content checker, real-browser smoke test, workflow scripts |

## Subjects

Mathematics, Science, English Language Arts, Social Studies (history, civics, geography, economics), Computer Science and Digital Literacy, World Languages (Spanish first), Arts and Music.

## Quality gates for every game

```bash
node --check games/<id>/content.js
node tools/content-check.mjs <id>      # 200+ generated items validated: shapes, graders, distractors, variety
node tools/build-index.mjs             # regenerates games/index.json, validates manifests against the curriculum
node tools/smoke.mjs <id> --seconds 20 # opens the game in headless Edge, presses Start, fuzzes input, checks for errors, screenshots
```

The smoke test needs the dev tooling installed once:

```bash
cd tools && npm install
```

## Adding a game

1. Pick a mechanic from `mechanics/` (or build a new one following `docs/ARCHITECTURE.md` section 4).
2. Create `games/<id>/` with `manifest.json`, `content.js`, `game.js`, `index.html`, `thumb.svg` (templates in section 5 of the architecture doc; copy `games/kit-demo/` to start).
3. Run the quality gates above, then `node tools/build-index.mjs` so the launcher sees it.

See `docs/INTEGRATION.md` for embedding games in the platform and syncing progress to a backend.
