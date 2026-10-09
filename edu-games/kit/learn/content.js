// kit/learn/content.js
// Item types, validation, pure grading and content helpers. DOM-free (Node imports it).

export const ITEM_TYPES = ['choice', 'numeric', 'text', 'sort', 'sequence', 'match', 'build'];

const norm = s => String(s).trim().replace(/\s+/g, ' ');
const normKey = s => norm(s).toLowerCase();

function fail(msg) { throw new Error('content.item: ' + msg); }
function isStr(v) { return typeof v === 'string' || typeof v === 'number'; }

/** Validates an item object, fills defaults and returns a fresh item. Throws on a bad shape. */
export function item(obj) {
  if (!obj || typeof obj !== 'object') fail('item must be an object');
  const type = obj.type;
  if (!ITEM_TYPES.includes(type)) fail(`unknown type "${type}"`);
  if (obj.prompt === undefined || obj.prompt === null || String(obj.prompt).length === 0) fail(`${type}: prompt is required`);
  if (typeof obj.skill !== 'string' || !obj.skill) fail(`${type}: skill id is required`);
  const difficulty = obj.difficulty === undefined ? 1 : Number(obj.difficulty);
  if (!Number.isFinite(difficulty) || difficulty < 1 || difficulty > 5) fail(`${type}: difficulty must be 1..5 (got ${obj.difficulty})`);
  if (typeof obj.explanation !== 'string' || !obj.explanation.trim()) fail(`${type}: explanation is required ("${String(obj.prompt).slice(0, 40)}")`);

  const out = {
    type, prompt: obj.prompt, skill: obj.skill, difficulty, explanation: obj.explanation,
    hint: obj.hint === undefined ? undefined : String(obj.hint),
    visual: obj.visual === undefined ? undefined : obj.visual,
    speech: obj.speech === undefined ? undefined : String(obj.speech),
    tags: Array.isArray(obj.tags) ? obj.tags.slice() : [],
  };
  if (obj.id !== undefined) out.id = obj.id;

  switch (type) {
    case 'choice': {
      if (!Array.isArray(obj.choices) || obj.choices.length < 2) fail('choice: choices must have >= 2 entries');
      const choices = obj.choices.map(c => { if (!isStr(c)) fail('choice: every choice must be a string or number'); return String(c); });
      const keys = new Set(choices.map(normKey));
      if (keys.size !== choices.length) fail(`choice: duplicate choices [${choices.join(' | ')}]`);
      if (!Number.isInteger(obj.correct) || obj.correct < 0 || obj.correct >= choices.length) fail(`choice: correct index ${obj.correct} out of range`);
      out.choices = choices; out.correct = obj.correct;
      break;
    }
    case 'numeric': {
      const answer = Number(obj.answer);
      if (!Number.isFinite(answer)) fail('numeric: answer must be a finite number');
      const tolerance = obj.tolerance === undefined ? 0 : Number(obj.tolerance);
      if (!Number.isFinite(tolerance) || tolerance < 0) fail('numeric: tolerance must be >= 0');
      out.answer = answer; out.tolerance = tolerance;
      if (obj.unit !== undefined) out.unit = String(obj.unit);
      break;
    }
    case 'text': {
      const arr = Array.isArray(obj.answer) ? obj.answer : [obj.answer];
      if (!arr.length || arr.some(a => !isStr(a) || !String(a).trim())) fail('text: answer must be a non-empty string or array of strings');
      out.answer = Array.isArray(obj.answer) ? arr.map(String) : String(obj.answer);
      out.caseSensitive = !!obj.caseSensitive;
      break;
    }
    case 'sort': {
      if (!Array.isArray(obj.items) || obj.items.length < 2) fail('sort: items must have >= 2 entries');
      if (!Array.isArray(obj.categories) || obj.categories.length < 2) fail('sort: categories must have >= 2 entries');
      const categories = obj.categories.map(String);
      const cats = new Set(categories);
      if (cats.size !== categories.length) fail('sort: duplicate categories');
      const items = obj.items.map(it => {
        if (!it || !isStr(it.text) || !isStr(it.category)) fail('sort: each item needs text and category');
        if (!cats.has(String(it.category))) fail(`sort: item "${it.text}" has category "${it.category}" not in categories`);
        return { text: String(it.text), category: String(it.category) };
      });
      out.items = items; out.categories = categories;
      break;
    }
    case 'sequence': {
      if (!Array.isArray(obj.items) || obj.items.length < 2) fail('sequence: items must have >= 2 entries');
      const items = obj.items.map(String);
      if (new Set(items.map(normKey)).size !== items.length) fail('sequence: duplicate items');
      out.items = items;
      break;
    }
    case 'match': {
      if (!Array.isArray(obj.pairs) || obj.pairs.length < 2) fail('match: pairs must have >= 2 entries');
      const pairs = obj.pairs.map(p => {
        if (!Array.isArray(p) || p.length !== 2 || !isStr(p[0]) || !isStr(p[1])) fail('match: each pair must be [left, right]');
        return [String(p[0]), String(p[1])];
      });
      if (new Set(pairs.map(p => normKey(p[1]))).size !== pairs.length) fail('match: duplicate right-hand entries');
      out.pairs = pairs;
      break;
    }
    case 'build': {
      if (!Array.isArray(obj.parts) || !obj.parts.length) fail('build: parts must be a non-empty array');
      if (!Array.isArray(obj.target) || !obj.target.length) fail('build: target must be a non-empty array');
      const parts = obj.parts.map(String);
      const target = obj.target.map(String);
      for (const t of target) if (!parts.includes(t)) fail(`build: target part "${t}" is not in parts`);
      out.parts = parts; out.target = target;
      break;
    }
  }
  return out;
}

/** Pure grader for every item type. See ARCHITECTURE.md section 7.1 for the `chosen` shapes. */
export function grade(it, chosen) {
  if (!it) return false;
  switch (it.type) {
    case 'choice':
      return Number.isInteger(chosen) && chosen === it.correct;
    case 'numeric': {
      if (chosen === null || chosen === undefined || chosen === '') return false;
      const n = typeof chosen === 'number' ? chosen : Number(String(chosen).replace(',', '.'));
      if (!Number.isFinite(n)) return false;
      return Math.abs(n - it.answer) <= (it.tolerance || 0) + 1e-9;
    }
    case 'text': {
      if (chosen === null || chosen === undefined) return false;
      const cs = !!it.caseSensitive;
      const c = cs ? norm(chosen) : normKey(chosen);
      const answers = Array.isArray(it.answer) ? it.answer : [it.answer];
      return answers.some(a => (cs ? norm(a) : normKey(a)) === c);
    }
    case 'sort':
      return Array.isArray(chosen) && chosen.length === it.items.length && it.items.every((x, i) => chosen[i] === x.category);
    case 'sequence':
      return Array.isArray(chosen) && chosen.length === it.items.length && chosen.every((v, i) => v === i);
    case 'match':
      return Array.isArray(chosen) && chosen.length === it.pairs.length && chosen.every((v, i) => v === i);
    case 'build':
      return Array.isArray(chosen) && chosen.length === it.target.length && chosen.every((v, i) => String(v) === it.target[i]);
    default:
      return false;
  }
}

/** Human-readable correct answer. */
export function correctText(it) {
  if (!it) return '';
  switch (it.type) {
    case 'choice': return String(it.choices[it.correct]);
    case 'numeric': return String(it.answer) + (it.unit ? ' ' + it.unit : '');
    case 'text': return Array.isArray(it.answer) ? String(it.answer[0]) : String(it.answer);
    case 'sort': return it.items.map(x => `${x.text} → ${x.category}`).join(', ');
    case 'sequence': return it.items.join(' → ');
    case 'match': return it.pairs.map(p => `${p[0]} = ${p[1]}`).join(', ');
    case 'build': return it.target.join(' ');
    default: return '';
  }
}

/**
 * Builds a shuffled choice list from a correct answer and candidate distractors.
 * Dedupes by normalised string, drops distractors equal to the correct answer, fills to n only
 * with what is available. Returns { choices: string[], correct: index }.
 */
export function makeChoices(rng, correct, distractors, n = 4) {
  const correctStr = String(correct);
  const ck = normKey(correctStr);
  const seen = new Set([ck]);
  const pool = [];
  for (const d of distractors || []) {
    if (d === undefined || d === null) continue;
    const s = String(d);
    const k = normKey(s);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    pool.push(s);
  }
  const take = Math.max(0, Math.min(n - 1, pool.length));
  const chosen = take < pool.length ? rng.shuffle(pool).slice(0, take) : pool;
  const choices = rng.shuffle([correctStr, ...chosen]);
  return { choices, correct: choices.indexOf(correctStr) };
}

// ---- fraction helpers ----
export function gcd(a, b) {
  a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}
export function lcm(a, b) {
  if (!a || !b) return 0;
  return Math.abs(a * b) / gcd(a, b);
}
/** Returns { n, d } in lowest terms with the sign on the numerator. */
export function simplify(n, d) {
  if (d === 0) throw new Error('simplify: denominator is 0');
  const sign = (n < 0) !== (d < 0) && n !== 0 ? -1 : 1;
  n = Math.abs(n); d = Math.abs(d);
  const g = gcd(n, d) || 1;
  return { n: sign * (n / g), d: d / g };
}
/** '3/4', or '2' when d divides n. */
export function fmtFraction(n, d) {
  if (d === 1 || (d !== 0 && n % d === 0)) return String(n / (d || 1));
  return `${n}/${d}`;
}
