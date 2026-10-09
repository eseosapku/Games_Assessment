#!/usr/bin/env node
// tools/content-check.mjs
// Headless validation of a game's content pack.
//   node tools/content-check.mjs <game-id> [--per 8]
// For every skill x declared type x difficulty 1..5 it generates `per` items (default 8) and checks:
//   - item shape is valid for its type and matches the requested skill/type
//   - explanation present (>= 10 chars)
//   - choice: unique choices, valid correct index, grader accepts the correct index and rejects every distractor
//   - numeric/text/sort/sequence/match/build: grader accepts the canonical correct answer
//   - at least 40 distinct prompts across the pack
// Exit code 1 on any problem. Imports kit/core/utils.js and kit/learn/content.js, which must be DOM-free.
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const id = argv.find(a => !a.startsWith('--'));
const perIdx = argv.indexOf('--per');
const PER = perIdx >= 0 ? Number(argv[perIdx + 1]) : 8;
if (!id) { console.error('usage: node tools/content-check.mjs <game-id> [--per 8]'); process.exit(2); }

const contentPath = path.join(ROOT, 'games', id, 'content.js');
if (!fs.existsSync(contentPath)) { console.error('no such file: ' + contentPath); process.exit(2); }

const { content } = await import(pathToFileURL(contentPath).href);
const { RNG } = await import(pathToFileURL(path.join(ROOT, 'kit', 'core', 'utils.js')).href);
const { grade } = await import(pathToFileURL(path.join(ROOT, 'kit', 'learn', 'content.js')).href);

const problems = [];
const seenProblem = new Set();
function problem(msg) { if (seenProblem.has(msg)) return; seenProblem.add(msg); problems.push(msg); }

if (!content || typeof content.generate !== 'function') { console.error('content.generate is not a function'); process.exit(1); }
const skills = Object.keys(content.skills || {});
if (skills.length < 3) problem(`only ${skills.length} skills declared (need >= 3)`);

const rng = new RNG(20261009);
const prompts = new Set();
let count = 0;
const perSkill = {};
for (const skill of skills) {
  const types = content.skills[skill].types || ['choice'];
  perSkill[skill] = 0;
  for (const type of types) {
    for (let d = 1; d <= 5; d++) {
      for (let k = 0; k < PER; k++) {
        let it;
        try { it = content.generate(rng, { skill, difficulty: d, type, choices: 4 }); }
        catch (e) { problem(`${skill} d${d} ${type}: generate() threw: ${e.message}`); continue; }
        count++; perSkill[skill]++;
        if (!it || typeof it !== 'object') { problem(`${skill} d${d} ${type}: returned ${it}`); continue; }
        const where = `${skill} d${d} ${type} "${String(it.prompt).slice(0, 60)}"`;
        if (it.type !== type) problem(`${where}: type is "${it.type}", requested "${type}"`);
        if (it.skill !== skill) problem(`${where}: skill is "${it.skill}"`);
        if (typeof it.difficulty !== 'number') problem(`${where}: difficulty missing`);
        if (!it.explanation || String(it.explanation).length < 10) problem(`${where}: explanation missing or too short`);
        if (it.prompt === undefined || it.prompt === null || String(it.prompt).length === 0) problem(`${where}: prompt missing`);
        prompts.add(JSON.stringify([it.prompt, it.visual ?? null, it.type === 'choice' ? it.choices : it.answer ?? it.items ?? it.pairs ?? it.target]));
        try {
          switch (it.type) {
            case 'choice': {
              if (!Array.isArray(it.choices) || it.choices.length < 2) { problem(`${where}: needs >= 2 choices`); break; }
              const set = new Set(it.choices.map(c => String(c).trim().toLowerCase()));
              if (set.size !== it.choices.length) problem(`${where}: duplicate choices [${it.choices.join(' | ')}]`);
              if (!(Number.isInteger(it.correct) && it.correct >= 0 && it.correct < it.choices.length)) problem(`${where}: bad correct index ${it.correct}`);
              else {
                if (!grade(it, it.correct)) problem(`${where}: grader rejects the correct index`);
                for (let i = 0; i < it.choices.length; i++) if (i !== it.correct && grade(it, i)) problem(`${where}: distractor "${it.choices[i]}" graded correct`);
              }
              break;
            }
            case 'numeric':
              if (typeof it.answer !== 'number' || !Number.isFinite(it.answer)) problem(`${where}: numeric answer invalid`);
              else if (!grade(it, it.answer)) problem(`${where}: grader rejects correct numeric`);
              break;
            case 'text': {
              const ans = Array.isArray(it.answer) ? it.answer[0] : it.answer;
              if (typeof ans !== 'string' || !ans.length) problem(`${where}: text answer invalid`);
              else if (!grade(it, ans)) problem(`${where}: grader rejects correct text`);
              break;
            }
            case 'sort': {
              if (!Array.isArray(it.items) || !Array.isArray(it.categories) || it.items.length < 2 || it.categories.length < 2) { problem(`${where}: sort needs items and categories`); break; }
              const cats = new Set(it.categories);
              if (it.items.some(x => !cats.has(x.category))) problem(`${where}: an item has a category not in categories`);
              if (!grade(it, it.items.map(x => x.category))) problem(`${where}: grader rejects correct sort`);
              break;
            }
            case 'sequence':
              if (!Array.isArray(it.items) || it.items.length < 2) { problem(`${where}: sequence needs >= 2 items`); break; }
              if (new Set(it.items.map(String)).size !== it.items.length) problem(`${where}: duplicate sequence items`);
              if (!grade(it, it.items.map((_, i) => i))) problem(`${where}: grader rejects correct sequence`);
              break;
            case 'match':
              if (!Array.isArray(it.pairs) || it.pairs.length < 2) { problem(`${where}: match needs >= 2 pairs`); break; }
              if (!grade(it, it.pairs.map((_, i) => i))) problem(`${where}: grader rejects correct match`);
              break;
            case 'build':
              if (!Array.isArray(it.parts) || !Array.isArray(it.target) || !it.target.length) { problem(`${where}: build needs parts and target`); break; }
              if (it.target.some(t => !it.parts.includes(t))) problem(`${where}: target uses a part not in parts`);
              if (!grade(it, it.target)) problem(`${where}: grader rejects correct build`);
              break;
            default:
              problem(`${where}: unknown type`);
          }
        } catch (e) {
          problem(`${where}: grader threw: ${e.message}`);
        }
      }
    }
  }
}
if (prompts.size < 40) problem(`only ${prompts.size} distinct items across the pack (need >= 40)`);

console.log(`content-check ${id}: ${count} items generated, ${prompts.size} distinct, skills: ${skills.length}`);
for (const [s, n] of Object.entries(perSkill)) console.log(`  ${s}: ${n} items`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems.slice(0, 40)) console.log('  - ' + p);
  if (problems.length > 40) console.log(`  ... and ${problems.length - 40} more`);
  process.exit(1);
}
console.log('OK');
