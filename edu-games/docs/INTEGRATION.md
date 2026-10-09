# Integrating Edu-Games into the platform

Everything here is static files: ES modules, Canvas 2D, a thin DOM overlay. There is no build step and no runtime dependency. Host the `edu-games/` folder (minus `tools/`) at any path on a static host or CDN, and the platform can embed games in two ways.

## 1. Embed a game as an iframe (recommended)

Each game is a standalone page at `games/<id>/index.html`.

```html
<div class="game-frame">
  <iframe
    src="https://cdn.example.com/edu-games/games/fraction-fortress/index.html?seed=12345"
    title="Fraction Fortress"
    allow="autoplay; fullscreen"
    loading="eager"
    referrerpolicy="no-referrer"></iframe>
</div>
```

```css
/* Keep the 16:9 logical canvas; the kit letterboxes inside whatever box it gets. */
.game-frame { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #0f172a; border-radius: 16px; overflow: hidden; }
.game-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
```

Query parameters the game page accepts:

| Parameter | Effect |
|---|---|
| `seed=<integer>` | Deterministic run (same items, same order). Omit for a fresh seed per play. |
| `theme=light` or `theme=dark` | Forces the UI theme instead of following `prefers-color-scheme`. |

Sandboxing: if you add `sandbox`, include `allow-scripts allow-same-origin` (the kit needs `localStorage` for progress) and `allow-popups` only if you want "open in new tab" from the launcher.

## 2. The event stream (postMessage)

Every game emits events to its parent window and also as a DOM `CustomEvent` named `edu-games:event` on its own `window`. Listen on the platform side:

```js
window.addEventListener('message', (e) => {
  if (!e.data || e.data.source !== 'edu-games') return;
  const { type, detail } = e.data;
  // type: 'start' | 'answer' | 'xp' | 'levelup' | 'end' | 'exit'
  track(type, detail);
});
```

Payloads (every `detail` includes `gameId` and `at`, an ISO timestamp):

| type | detail fields | when |
|---|---|---|
| `start` | `gameId, seed, skills[]` | the player pressed Start |
| `answer` | `gameId, skill, correct (bool), difficulty (1-5), responseMs, itemType, streak` | after every graded answer |
| `xp` | `gameId, amount, xp, level, skill` | XP awarded |
| `levelup` | `gameId, level, xp` | player level increased |
| `end` | `gameId, score, bestScore, correct, total, accuracy, xpEarned, durationMs, skills: { [skillId]: { before, after } }` | end screen shown |
| `exit` | `gameId` | player chose Exit on the end or pause screen |

Verify `e.origin` against the host you serve the games from before trusting the data.

## 3. Mount a game inside a single-page app

If the games are served from the same origin as the SPA, mount directly with `createGame()`:

```js
import { createGame } from '/edu-games/kit/kit.js';
import { Mechanic } from '/edu-games/mechanics/tower-defense/mechanic.js';
import { content } from '/edu-games/games/fraction-fortress/content.js';

const manifest = await (await fetch('/edu-games/games/fraction-fortress/manifest.json')).json();
const handle = await createGame({ container: document.getElementById('game'), manifest, Mechanic, content, config: {} });
// later
handle.pause(); handle.resume(); handle.restart(); handle.destroy();
```

React:

```jsx
import { useEffect, useRef } from 'react';
export function GameMount({ id }) {
  const ref = useRef(null);
  useEffect(() => {
    let handle, alive = true;
    (async () => {
      const [{ createGame }, manifest] = await Promise.all([
        import(`/edu-games/kit/kit.js`),
        fetch(`/edu-games/games/${id}/manifest.json`).then(r => r.json()),
      ]);
      const [{ Mechanic }, { content }, { config = {} }] = await Promise.all([
        import(`/edu-games/mechanics/${manifest.mechanic}/mechanic.js`),
        import(`/edu-games/games/${id}/content.js`),
        import(`/edu-games/games/${id}/game.js`).then(m => m.default ? { config: m.default.config } : {}).catch(() => ({})),
      ]);
      if (!alive) return;
      handle = await createGame({ container: ref.current, manifest, Mechanic, content, config });
    })();
    return () => { alive = false; handle && handle.destroy(); };
  }, [id]);
  return <div ref={ref} style={{ width: '100%', aspectRatio: '16 / 9' }} />;
}
```

Vue (Composition API) follows the same shape: create in `onMounted`, call `handle.destroy()` in `onBeforeUnmount`.

Note: `games/<id>/game.js` is written for the standalone page (it calls `createGame` itself). When mounting from the SPA, import the mechanic and content directly as above and pass the game's `config` object (copy it from `game.js`; a future revision can export it).

## 4. Progress, XP and mastery

The kit stores progress in `localStorage` under the prefix `edu-games:v1:`. For a logged-in platform user, sync it with the backend:

```js
import { Progress } from '/edu-games/kit/kit.js';

// On login: hydrate from the server
Progress.importAll(await api.get('/learning/progress'));

// On every event: push incrementally (or debounce and push Progress.exportAll())
window.addEventListener('message', (e) => {
  if (e.data?.source === 'edu-games' && (e.data.type === 'end' || e.data.type === 'levelup')) {
    api.put('/learning/progress', Progress.exportAll());
  }
});
```

`Progress.exportAll()` returns `{ xp, level, skills: { [skillId]: { attempts, correct, mastery, lastSeen } }, games: { [gameId]: { plays, bestScore, totalXP, lastPlayed } } }`. Mastery is a 0..1 exponential moving average weighted by item difficulty, so it decays toward recent performance.

Because iframes share `localStorage` with their origin, games embedded from the same origin as the launcher see the same progress. If games are served from a different origin than the platform, hydrate inside the iframe by posting `{ source: 'platform', type: 'progress:import', data }` to it; the kit does not implement that listener yet, so add it to `kit/learn/progress.js` when needed.

## 5. The skill taxonomy

`curriculum/map.json` is the single source of truth for subjects, grades, topics and skills (about 1,900 skills across 7 subjects and grades 1 to 12). Ids are stable strings like `math.4.fractions.equivalent`. Every manifest lists the skills a game practises, and every `answer` event names the skill, so the platform can build per-skill mastery dashboards, recommend games for weak skills, and map to local standards by adding a `standards` field to each skill entry.

Regenerate it after editing a per-subject file:

```bash
node tools/merge-curriculum.mjs
```

## 6. Adding a game

1. Create `games/<id>/` with `manifest.json`, `content.js`, `game.js`, `index.html`, `thumb.svg` (templates in `docs/ARCHITECTURE.md` sections 5 and 6; copy `games/kit-demo/`).
2. Reuse a mechanic from `mechanics/` or add one (section 4 of the architecture doc; see `mechanics/CATALOG.md` for the design of each).
3. Run the quality gates from the README, then `node tools/build-index.mjs` so the launcher lists it.

## 7. Hosting requirements

- Serve `.js` as `text/javascript` (ES modules refuse `text/plain`), `.json` as `application/json`, `.svg` as `image/svg+xml`.
- Must be served over HTTP(S). `file://` does not load modules.
- Cache `kit/` and `mechanics/` aggressively with versioned paths if you like; keep `games/index.json` and manifests short-lived.
- No cross-origin requests are made by the kit. Speech synthesis and WebAudio are used when available and degrade silently.
- The launcher at `index.html` is optional. The platform can render its own library from `games/index.json`.

## FAQ

**Can we theme the games to the platform's brand?** Yes. Override the `--eg-*` tokens in `kit/ui/theme.css` (or inject a stylesheet into the iframe page that sets them on `:root`). Each game also sets `--eg-accent` from its subject colour.

**How do we pass the student's grade so the game starts at the right difficulty?** Hydrate progress first (section 4). The adaptive controller starts from stored mastery for the game's skills. A `?difficulty=` parameter can be added to the game page in a later revision.

**Can two students share a device?** Call `Progress.reset()` on logout, then `importAll` on the next login.

**Is anything sent anywhere?** No. The kit makes no network calls beyond loading its own files.
