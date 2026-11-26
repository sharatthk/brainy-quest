// Pure spelling helpers: matching, letter diff, list import parsing.

export function normalizeSpelling(s) {
  return String(s).normalize('NFC').trim().toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ');
}
const stripMarks = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Accept exact spelling, or the same letters without accent marks (hard to type on a kid's keyboard).
export function isCorrectSpelling(typed, target) {
  const a = normalizeSpelling(typed), b = normalizeSpelling(target);
  return a === b || (a.length > 0 && stripMarks(a) === stripMarks(b));
}

// A word may list alternate accepted spellings (e.g. practice OR practise).
export function matchesWord(typed, word) {
  return [word.w, ...(word.alts || [])].some(t => isCorrectSpelling(typed, t));
}

// Levenshtein alignment -> [{op:'ok'|'sub'|'del'|'ins', t?:typedChar, c?:correctChar}]
export function diffSpelling(typed, target) {
  const a = [...normalizeSpelling(typed)], b = [...normalizeSpelling(target)];
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  const out = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      out.push(a[i - 1] === b[j - 1] ? { op: 'ok', t: a[i - 1], c: b[j - 1] } : { op: 'sub', t: a[i - 1], c: b[j - 1] });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      out.push({ op: 'del', t: a[i - 1] });
      i--;
    } else {
      out.push({ op: 'ins', c: b[j - 1] });
      j--;
    }
  }
  return out.reverse();
}

// Parse pasted or uploaded word lists.
// Supported: one word per line; "word | definition | sentence"; tab-separated; comma-separated words.
// Alternate spellings: "practice OR practise".
export function parseWordList(text) {
  const out = [];
  const seen = new Set();
  const tidy = w => String(w).replace(/^\s*(\d+\s*[.)]?|[-•*])\s*/, '').replace(/\*+$/, '').replace(/\s+/g, ' ').trim();
  const add = (raw, def = '', sent = '') => {
    const [w, ...alts] = String(raw).split(/\s+OR\s+/).map(tidy);
    if (!w || w.length > 40 || !/\p{L}/u.test(w) || /\d/.test(w)) return;
    const key = normalizeSpelling(w);
    if (seen.has(key)) return;
    seen.add(key);
    const word = { w, def: def.trim(), sent: sent.trim() };
    if (alts.filter(Boolean).length) word.alts = alts.filter(Boolean);
    out.push(word);
  };
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.includes('|')) {
      const [w, d, s] = line.split('|');
      add(w, d, s);
    } else if (line.includes('\t')) {
      const [w, d, s] = line.split('\t');
      add(w, d, s);
    } else if (/[,;]/.test(line)) {
      line.split(/[,;]+/).forEach(x => add(x));
    } else {
      add(line);
    }
  }
  return out;
}

// Hide the word inside a sentence or definition so it doesn't give the spelling away.
export function blankWord(text, word) {
  if (!text) return text;
  const stem = word.length > 5 ? word.slice(0, word.length - 2) : word;
  const esc = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`\\b${esc}\\w*`, 'gi'), '_____');
}

// ---------- Star tiers ----------

// Patterns that make a word harder to spell than its length suggests.
const TRICKY = [
  /ough|augh|eigh/, /ph|gh/, /^(kn|wr|gn|ps|pn|rh)|mb$|mn$/, /ei|ie/, /sc[eiy]/, /([b-df-hj-np-tv-z])\1/,
  /(tion|sion|cian|ous|eous|ious|ance|ence|ible|able|ise|ize)$/, /[yz]|x|qu/, /[^a-z]/,
];

// Spelling difficulty: letters plus 1.5 per tricky pattern. Pure, so the split is the same on every device.
export function wordDifficulty(w) {
  const s = normalizeSpelling(w);
  const letters = [...s].filter(ch => /\p{L}/u.test(ch)).length;
  return letters + 1.5 * TRICKY.filter(re => re.test(s)).length;
}

// Split a list into easy, medium and hard thirds (by difficulty, ties keep list order).
export function splitTiers(words) {
  const sorted = words.map((w, i) => ({ w, i, d: wordDifficulty(w.w) })).sort((a, b) => a.d - b.d || a.i - b.i).map(x => x.w);
  const a = Math.round(sorted.length / 3), b = Math.round((2 * sorted.length) / 3);
  return [sorted.slice(0, a), sorted.slice(a, b), sorted.slice(b)];
}

// Bee Challenge goal for a tier: 10 right, or fewer for a tiny tier (3 lives allow 2 misses).
export const challengeGoal = n => Math.max(1, Math.min(10, n - 2));
