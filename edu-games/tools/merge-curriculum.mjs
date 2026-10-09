#!/usr/bin/env node
// tools/merge-curriculum.mjs
// Merges curriculum/<subject>.json files into curriculum/map.json (shape in docs/ARCHITECTURE.md section 7)
// and validates ids, counts and the skills referenced by every games/*/manifest.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(ROOT, 'curriculum');
const ORDER = ['math', 'science', 'ela', 'social', 'cs', 'languages', 'arts'];
const COLORS = { math: '#4F7CFF', science: '#22C55E', ela: '#F59E0B', social: '#EF4444', cs: '#8B5CF6', languages: '#EC4899', arts: '#14B8A6' };

const subjects = [];
const allSkills = new Map();
let problems = 0;
for (const id of ORDER) {
  const file = path.join(dir, `${id}.json`);
  if (!fs.existsSync(file)) { console.warn(`missing curriculum/${id}.json`); problems++; continue; }
  let s;
  try { s = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`curriculum/${id}.json: invalid JSON: ${e.message}`); problems++; continue; }
  if (s.id !== id) { console.warn(`curriculum/${id}.json: id is "${s.id}", forcing "${id}"`); s.id = id; }
  s.color = s.color || COLORS[id];
  let topics = 0, skills = 0;
  const grades = Object.keys(s.grades || {}).map(Number).sort((a, b) => a - b);
  const missingGrades = []; for (let g = 1; g <= 12; g++) if (!s.grades || !s.grades[String(g)]) missingGrades.push(g);
  if (missingGrades.length) { console.warn(`${id}: missing grades ${missingGrades.join(',')}`); problems++; }
  for (const g of grades) {
    const gr = s.grades[String(g)];
    for (const t of gr.topics || []) {
      topics++;
      if (!t.id.startsWith(`${id}.${g}.`)) { console.warn(`${id}: topic id ${t.id} not under ${id}.${g}.`); problems++; }
      for (const k of t.skills || []) {
        skills++;
        if (!k.id.startsWith(t.id + '.')) { console.warn(`${id}: skill id ${k.id} not under ${t.id}.`); problems++; }
        if (allSkills.has(k.id)) { console.warn(`${id}: duplicate skill id ${k.id}`); problems++; }
        allSkills.set(k.id, { ...k, topic: t.id, grade: g, subject: id });
      }
    }
  }
  console.log(`${id.padEnd(10)} grades=${grades.length} topics=${topics} skills=${skills}`);
  subjects.push(s);
}

const map = { version: 1, generatedAt: new Date().toISOString(), subjects };
fs.writeFileSync(path.join(dir, 'map.json'), JSON.stringify(map, null, 1));
console.log(`curriculum/map.json written: ${subjects.length} subjects, ${allSkills.size} skills`);

// Cross-check game manifests
const gamesDir = path.join(ROOT, 'games');
if (fs.existsSync(gamesDir)) {
  for (const d of fs.readdirSync(gamesDir, { withFileTypes: true })) {
    const mf = path.join(gamesDir, d.name, 'manifest.json');
    if (!d.isDirectory() || !fs.existsSync(mf)) continue;
    try {
      const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
      const missing = (m.skills || []).filter(s => !allSkills.has(s));
      if (missing.length) { console.warn(`games/${d.name}: skills not in curriculum: ${missing.join(', ')}`); problems++; }
    } catch (e) { console.warn(`games/${d.name}/manifest.json: ${e.message}`); }
  }
}
// Also check the required ids listed in docs/PHASE1_PLAN.md
const plan = path.join(ROOT, 'docs', 'PHASE1_PLAN.md');
if (fs.existsSync(plan)) {
  const text = fs.readFileSync(plan, 'utf8');
  const ids = [...text.matchAll(/`((?:math|science|ela|social|cs|languages|arts)\.\d{1,2}\.[a-z0-9-]+\.[a-z0-9-]+)`/g)].map(m => m[1]);
  const missing = [...new Set(ids)].filter(i => !allSkills.has(i));
  if (missing.length) { console.warn(`PHASE1_PLAN required ids missing from curriculum: ${missing.join(', ')}`); problems++; }
  else console.log(`all ${new Set(ids).size} PHASE1_PLAN required skill ids present`);
}
process.exit(problems ? 1 : 0);
