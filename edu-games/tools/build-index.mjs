#!/usr/bin/env node
// tools/build-index.mjs
// Scans games/*/manifest.json and writes games/index.json for the launcher.
// Validates the manifest fields the launcher and the platform rely on.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gamesDir = path.join(ROOT, 'games');
const SUBJECTS = new Set(['math', 'science', 'ela', 'social', 'cs', 'languages', 'arts']);
const BANDS = new Set(['early', 'elementary', 'middle', 'high']);
const REQUIRED = ['id', 'title', 'tagline', 'subject', 'grades', 'gradeBand', 'skills', 'mechanic', 'description', 'howToPlay', 'learningGoals'];

let skillIds = null;
const mapPath = path.join(ROOT, 'curriculum', 'map.json');
if (fs.existsSync(mapPath)) {
  try {
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    skillIds = new Set();
    for (const s of map.subjects || []) for (const g of Object.values(s.grades || {})) for (const t of g.topics || []) for (const k of t.skills || []) skillIds.add(k.id);
  } catch (e) { console.warn('warn: could not parse curriculum/map.json: ' + e.message); }
}

const games = [];
let bad = 0;
for (const d of fs.readdirSync(gamesDir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const mf = path.join(gamesDir, d.name, 'manifest.json');
  if (!fs.existsSync(mf)) continue;
  let m;
  try { m = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch (e) { console.error(`ERROR ${d.name}: manifest.json is not valid JSON (${e.message})`); bad++; continue; }
  const problems = [];
  for (const k of REQUIRED) if (m[k] === undefined || m[k] === null || m[k] === '') problems.push(`missing "${k}"`);
  if (m.id !== d.name) problems.push(`id "${m.id}" does not match folder "${d.name}"`);
  if (!SUBJECTS.has(m.subject)) problems.push(`unknown subject "${m.subject}"`);
  if (!BANDS.has(m.gradeBand)) problems.push(`unknown gradeBand "${m.gradeBand}"`);
  if (!Array.isArray(m.grades) || m.grades.length !== 2 || m.grades[0] < 1 || m.grades[1] > 12 || m.grades[0] > m.grades[1]) problems.push('grades must be [min, max] within 1..12');
  if (!fs.existsSync(path.join(gamesDir, d.name, 'index.html'))) problems.push('index.html missing');
  if (!fs.existsSync(path.join(gamesDir, d.name, 'game.js'))) problems.push('game.js missing');
  if (!fs.existsSync(path.join(gamesDir, d.name, 'content.js'))) problems.push('content.js missing');
  if (!fs.existsSync(path.join(ROOT, 'mechanics', m.mechanic, 'mechanic.js'))) problems.push(`mechanics/${m.mechanic}/mechanic.js missing`);
  if (skillIds && Array.isArray(m.skills)) for (const s of m.skills) if (!skillIds.has(s)) problems.push(`skill "${s}" not in curriculum/map.json`);
  if (problems.length) { console.warn(`WARN ${d.name}: ` + problems.join('; ')); if (problems.some(p => p.startsWith('missing') || p.includes('not valid'))) bad++; }
  games.push({ ...m, path: `games/${d.name}/` });
}
games.sort((a, b) => a.subject.localeCompare(b.subject) || (a.grades[0] - b.grades[0]) || a.title.localeCompare(b.title));
fs.writeFileSync(path.join(gamesDir, 'index.json'), JSON.stringify({ generatedAt: new Date().toISOString(), count: games.length, games }, null, 2));
console.log(`games/index.json written: ${games.length} games${bad ? `, ${bad} with blocking problems` : ''}`);
process.exit(bad ? 1 : 0);
