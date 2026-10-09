#!/usr/bin/env node
// tools/smoke.mjs
// Real-browser smoke test for edu-games. Starts a tiny static server for the repo root,
// launches the machine's installed Edge or Chrome through playwright-core (no browser download),
// opens each game, presses Start, fuzzes input for N seconds, and checks:
//   - zero page errors, zero console errors, zero failed requests
//   - the game loop actually ran (frame counter > 60)
//   - the canvas is not blank
// Writes tools/out/<game-id>.png and tools/out/report.json. Exit code 1 if any game fails.
//
// Usage:
//   node tools/smoke.mjs <game-id> [<game-id> ...] [--seconds 10] [--headed]
//   node tools/smoke.mjs --all
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright-core'));
} catch {
  console.error('playwright-core is not installed. Run:  cd tools && npm install');
  process.exit(2);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const argv = process.argv.slice(2);
function flag(name, def) {
  const i = argv.indexOf(name);
  if (i < 0) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}
const SECONDS = Number(flag('--seconds', 10));
const HEADED = argv.includes('--headed');
const consumed = new Set();
for (const f of ['--seconds']) { const i = argv.indexOf(f); if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--')) consumed.add(i + 1); }
let ids = argv.filter((a, i) => !a.startsWith('--') && !consumed.has(i));
if (!ids.length || argv.includes('--all')) {
  const gamesDir = path.join(ROOT, 'games');
  ids = fs.readdirSync(gamesDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(gamesDir, d.name, 'manifest.json')))
    .map(d => d.name);
}
if (!ids.length) { console.error('No games found.'); process.exit(2); }

// ---------- static server ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg',
};
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found: ' + p); return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500); res.end(String(e));
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

// ---------- browser ----------
async function launch() {
  const errors = [];
  for (const channel of ['msedge', 'chrome']) {
    try { return await chromium.launch({ channel, headless: !HEADED }); } catch (e) { errors.push(`${channel}: ${e.message.split('\n')[0]}`); }
  }
  try { return await chromium.launch({ headless: !HEADED }); } catch (e) { errors.push(`bundled: ${e.message.split('\n')[0]}`); }
  throw new Error('No browser available. Install Microsoft Edge or Google Chrome.\n' + errors.join('\n'));
}

const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'KeyA', 'KeyD'];

async function runGame(browser, id) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [], consoleErrors = [], failed = [];
  page.on('pageerror', e => errors.push(String((e && e.stack) || e)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('requestfailed', r => failed.push(`FAILED ${r.url()}`));
  page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  const url = `http://127.0.0.1:${PORT}/games/${id}/index.html`;
  const result = { id, url, ok: false, errors, consoleErrors, failed, frames: 0, phase: null, score: null, blank: null, screenshot: path.join(OUT, `${id}.png`), notes: [] };
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    const start = page.locator('[data-eg="start"]');
    await start.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(300);
    await start.click();
    const t0 = Date.now();
    let endSeen = 0;
    while (Date.now() - t0 < SECONDS * 1000) {
      // Answer a visible question panel if one is up
      const choice = page.locator('[data-eg="choice"]:visible');
      const n = await choice.count().catch(() => 0);
      if (n > 0) {
        await choice.nth(Math.floor(rnd() * n)).click({ timeout: 800 }).catch(() => {});
        await page.waitForTimeout(200);
      }
      const submit = page.locator('[data-eg="submit"]:visible');
      if (await submit.count().catch(() => 0)) {
        const inp = page.locator('[data-eg="answer-input"]:visible');
        if (await inp.count().catch(() => 0)) await inp.first().fill(String(Math.floor(rnd() * 20))).catch(() => {});
        await submit.first().click({ timeout: 800 }).catch(() => {});
      }
      const dismiss = page.locator('[data-eg="feedback-dismiss"]:visible, [data-eg="resume"]:visible');
      if (await dismiss.count().catch(() => 0)) await dismiss.first().click({ timeout: 800 }).catch(() => {});
      const replay = page.locator('[data-eg="replay"]:visible');
      if (await replay.count().catch(() => 0)) {
        endSeen++;
        if (endSeen === 1) result.notes.push('reached end screen; replayed');
        await replay.first().click({ timeout: 800 }).catch(() => {});
        await page.waitForTimeout(300);
      }
      // Random fuzz on the canvas / keyboard
      const box = await page.locator('canvas').first().boundingBox().catch(() => null);
      if (box && rnd() < 0.55) {
        const x = box.x + box.width * (0.08 + 0.84 * rnd());
        const y = box.y + box.height * (0.12 + 0.76 * rnd());
        if (rnd() < 0.3) {
          await page.mouse.move(x, y); await page.mouse.down();
          await page.mouse.move(x + (rnd() - 0.5) * 300, y + (rnd() - 0.5) * 200, { steps: 5 });
          await page.mouse.up();
        } else {
          await page.mouse.click(x, y).catch(() => {});
        }
      } else {
        const k = KEYS[Math.floor(rnd() * KEYS.length)];
        await page.keyboard.down(k).catch(() => {});
        await page.waitForTimeout(60 + rnd() * 120);
        await page.keyboard.up(k).catch(() => {});
      }
      await page.waitForTimeout(220);
    }
    const state = await page.evaluate(() => {
      const h = window.__eduGame;
      if (!h) return null;
      let s = {};
      try { s = h.state ? h.state() : {}; } catch (e) { s = { error: String(e) }; }
      return { frame: s.frame ?? (h.ctx && h.ctx.engine && h.ctx.engine.time ? h.ctx.engine.time.frame : null), phase: s.phase ?? null, score: s.score ?? null, stateError: s.error ?? null };
    });
    if (!state) result.notes.push('window.__eduGame is missing (createGame must set it)');
    if (state && state.stateError) result.notes.push('handle.state() threw: ' + state.stateError);
    result.frames = (state && state.frame) || 0;
    result.phase = state && state.phase;
    result.score = state && state.score;
    result.blank = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return true;
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const seen = new Set();
      for (let i = 0; i < d.length; i += 4 * 101) {
        seen.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
        if (seen.size > 8) return false;
      }
      return true;
    }).catch(() => true);
    await page.screenshot({ path: result.screenshot });
    result.ok = errors.length === 0 && consoleErrors.length === 0 && failed.length === 0 && result.frames > 60 && result.blank === false;
    if (result.frames <= 60) result.notes.push(`frame counter is ${result.frames}; the game loop does not seem to run`);
    if (result.blank) result.notes.push('canvas looks blank');
  } catch (e) {
    result.errors.push('smoke: ' + ((e && e.message) || e));
    try { await page.screenshot({ path: result.screenshot }); } catch {}
  }
  await page.close();
  return result;
}

const browser = await launch();
const report = { startedAt: new Date().toISOString(), seconds: SECONDS, results: [] };
for (const id of ids) {
  const r = await runGame(browser, id);
  report.results.push(r);
  const status = r.ok ? 'PASS' : 'FAIL';
  console.log(`${status}  ${id}  frames=${r.frames} phase=${r.phase} score=${r.score}${r.notes.length ? '  | ' + r.notes.join('; ') : ''}`);
  for (const e of r.errors) console.log('   pageerror: ' + e.split('\n').slice(0, 3).join(' | '));
  for (const e of r.consoleErrors.slice(0, 8)) console.log('   console.error: ' + e.slice(0, 300));
  for (const e of r.failed.slice(0, 8)) console.log('   request: ' + e);
  console.log('   screenshot: ' + path.relative(ROOT, r.screenshot));
}
await browser.close();
server.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const failedCount = report.results.filter(r => !r.ok).length;
console.log(`\n${report.results.length - failedCount}/${report.results.length} passed. Report: tools/out/report.json`);
process.exit(failedCount ? 1 : 0);
