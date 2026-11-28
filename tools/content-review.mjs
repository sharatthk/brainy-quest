#!/usr/bin/env node
// Content review: the checks done by hand before new content reaches a kid.
//   node tools/content-review.mjs                     # everything: math tiers, lesson units, spelling lists
//   node tools/content-review.mjs --skill big-muldiv --show 3    # one skill, print 3 samples per tier to read
//   node tools/content-review.mjs --unit py-loops --source ~/book.txt   # one unit, flag text copied from a source
// Options: --skill a,b  --unit a,b  --spelling  --samples N (default 300)  --show K  --source FILE[,FILE]  --no-python
//          --strict (also list every lesson explanation shorter than 25 characters)
// ERROR lines (broken content) exit 1. WARN lines are for a human to look at.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { SKILLS } from '../js/math/skills.js';
import { genAt, tierLabel } from '../js/math/tiers.js';
import { answerText } from '../js/math/skills.js';
import { seeded } from '../js/shared/util.js';
import { SUBJECTS } from '../js/lessons/subjects.js';
import { BUILTIN_LISTS } from '../js/spelling/words.js';

const args = process.argv.slice(2);
const opt = (name, dflt = null) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? dflt : args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
};
const list = v => (typeof v === 'string' ? v.split(',').map(x => x.trim()).filter(Boolean) : null);
const onlySkills = list(opt('skill')), onlyUnits = list(opt('unit'));
const spellingOnly = !!opt('spelling');
const SAMPLES = Number(opt('samples', 300)), SHOW = Number(opt('show', 0));
const runPython = !opt('no-python');
const strict = !!opt('strict');
const everything = !onlySkills && !onlyUnits && !spellingOnly;

let errors = 0, warns = 0;
const err = (where, msg) => { errors++; console.log(`ERROR ${where}: ${msg}`); };
const warn = (where, msg) => { warns++; console.log(`WARN  ${where}: ${msg}`); };
const plain = html => String(html ?? '').replace(/<span class="ghost">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const EMDASH = /—/;

// ---- Source overlap: any 8 words in a row shared with a source book ----
const SHINGLE = 8;
const words = s => plain(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
const shingles = s => {
  const w = words(s), out = [];
  for (let i = 0; i + SHINGLE <= w.length; i++) out.push(w.slice(i, i + SHINGLE).join(' '));
  return out;
};
const sourceSet = new Set((list(opt('source')) || []).flatMap(f => shingles(readFileSync(f.replace(/^~/, process.env.HOME), 'utf8'))));
const copied = (where, text) => {
  if (!sourceSet.size) return;
  const hit = shingles(text).find(s => sourceSet.has(s));
  if (hit) warn(where, `shares "${hit}" with the source: rewrite it in your own words`);
};

// ---- Math: every skill x tier ----
function reviewMath() {
  for (const s of SKILLS) {
    if (onlySkills && !onlySkills.includes(s.id)) continue;
    for (const t of [1, 2, 3]) {
      const where = `math ${s.id} ★${t} (${tierLabel(s, t)})`;
      const rng = seeded(1000 + t);
      const seen = new Set();
      let thin = 0, trivial = 0, inline = 0, longBig = 0;
      const shown = [];
      for (let i = 0; i < SAMPLES; i++) {
        let p;
        try {
          p = genAt(s, t, rng);
        } catch (e) {
          err(where, `generator threw: ${e.message}`);
          break;
        }
        const txt = plain(p.prompt ?? `${p.a} ${p.op} ${p.b}`);
        seen.add(`${txt}|${answerText(p)}`);
        if (!p.steps?.length) err(where, `no steps for "${txt}"`);
        else if (p.steps.length === 1 && p.steps[0].length < 60) thin++;
        if (p.kind === 'choice') {
          if (!p.choices.includes(p.answer)) err(where, `answer "${p.answer}" not in choices for "${txt}"`);
          if (new Set(p.choices).size !== p.choices.length) err(where, `duplicate choices ${JSON.stringify(p.choices)} for "${txt}"`);
        }
        if (p.kind === 'input' && typeof p.answer === 'number' && !Number.isFinite(p.answer)) err(where, `answer is ${p.answer} for "${txt}"`);
        if ([p.prompt, ...(p.steps || []), ...(p.choices || [])].some(x => EMDASH.test(String(x)))) err(where, `em dash in "${txt}"`);
        if (!String(p.prompt).includes('class="frac"') && /(^|[^\d.])[01] [×÷]|[×÷] \(?−?[01]\)?(?![\d.])|[+−] 0(?![\d.])/.test(txt)) trivial++;
        if (p.kind !== 'column' && !String(p.prompt).includes('stack-sum') && /^\d[\d,.]*\s*[+−]\s*\d[\d,.]*\s*= \?$/.test(txt)) inline++;
        if (s.unit === 'big' && /[×÷]/.test(txt) && /\d{1,3},\d{3},\d{3}/.test(txt)) longBig++;
        if (shown.length < SHOW) shown.push(p);
      }
      if (thin > SAMPLES * 0.5) warn(where, `${thin}/${SAMPLES} explanations are a single short step: add a why or a check step`);
      if (trivial > SAMPLES * 0.05) warn(where, `${trivial}/${SAMPLES} problems use 0 or 1 (too easy?)`);
      if (inline) warn(where, `${inline} + or − problems are written inline: use stacked() so the numbers are one below the other`);
      if (longBig) warn(where, `${longBig} × or ÷ problems show millions as digits: use K / M / B symbols (shortBig)`);
      // Tiers whose topic only has a handful of problems (sums to 5, halves and thirds, √ of small squares, 2³).
      const SMALL_BY_NATURE = ['basic-add 1', 'basic-sub 1', 'basic-bonds 1', 'frac-id 1', 'frac-equiv 1', 'expo-pow 1', 'expo-roots 1'];
      if (seen.size < Math.min(15, SAMPLES / 4)) {
        if (SMALL_BY_NATURE.includes(`${s.id} ${t}`)) console.log(`INFO  ${where}: ${seen.size} different problems (a small topic by nature)`);
        else warn(where, `only ${seen.size} different problems in ${SAMPLES}: too repetitive`);
      }
      for (const p of shown) {
        console.log(`  · ${plain(p.prompt ?? `${p.a} ${p.op} ${p.b} = ?`)}${p.choices ? `  [${p.choices.join(' | ')}]` : ''}  ->  ${answerText(p)}`);
        for (const st of p.steps) console.log(`      ${st}`);
      }
    }
  }
}

// ---- Lessons: English, Science, Coding ----
function python(code) {
  try {
    return execFileSync('python3', ['-I', '-c', code], { timeout: 5000, maxBuffer: 1 << 20, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return `ERROR: ${String(e.stderr || e.message).trim().split('\n').pop()}`;
  }
}

function reviewLessons() {
  let shortE = 0;
  for (const subj of SUBJECTS) {
    for (const u of subj.units) {
      if (onlyUnits && !onlyUnits.includes(u.id)) continue;
      const where = `${subj.id} ${u.id}`;
      if (u.questions.length < 7) err(where, `${u.questions.length} questions, needs at least 7`);
      const qs = new Set();
      for (const l of u.lessons) {
        if (EMDASH.test(l.body)) err(where, `em dash in lesson "${l.title}"`);
        copied(`${where} lesson "${l.title}"`, l.body);
      }
      for (const q of u.questions) {
        const qw = `${where} "${q.q.slice(0, 50)}"`;
        const key = JSON.stringify([q.q, q.s, q.code, q.p, q.c]);
        if (qs.has(key)) err(qw, 'duplicate question');
        qs.add(key);
        if (!q.e) warn(qw, 'no explanation (e): a wrong answer shows only the answer');
        else if (q.e.length < 25) {
          shortE++;
          if (strict) warn(qw, `short explanation "${q.e}": say why`);
        }
        if (JSON.stringify(q).match(EMDASH)) err(qw, 'em dash');
        copied(qw, [q.q, q.s, q.p, q.e, ...(q.c || [])].filter(Boolean).join(' . '));
        if (q.t === 'mc') {
          if (!q.c.includes(q.a)) err(qw, `answer "${q.a}" not in choices`);
          if (new Set(q.c).size !== q.c.length) err(qw, 'duplicate choices');
        } else if (q.t === 'tap') {
          const ws = q.s.split(/\s+/).map(w => w.replace(/[^\w'-]/g, '').toLowerCase());
          for (const a of q.a) if (ws.filter(w => w === a.replace(/[^\w'-]/g, '').toLowerCase()).length !== 1) err(qw, `tap answer "${a}" must appear exactly once`);
        } else if (q.t === 'fill') {
          if (!q.s.includes('___') || !q.a?.length) err(qw, 'fill needs ___ and at least one answer');
        }
        if (q.code) {
          const long = q.code.split('\n').filter(l => l.length > 32);
          if (long.length) warn(qw, `${long.length} code line(s) longer than 32 characters (phone width)`);
          if (runPython && u.section === 'python' && !/never stop|forever|infinite/i.test(q.q + q.a)) {
            const out = python(q.code);
            if (out.startsWith('ERROR') && !/error|bug|wrong|fix/i.test(q.q + q.a)) warn(qw, `Python raised ${out}`);
            else if (q.q === 'What does this program print?' && q.t === 'mc' && out.replace(/\s+/g, ' ') !== q.a.replace(/\s+/g, ' ') && !(/lines/.test(q.a) && out.split('\n').every(l => q.a.includes(l.trim())))) warn(qw, `Python printed "${out.replace(/\n/g, ' / ')}" but the answer is "${q.a}": check by hand`);
          }
        }
      }
    }
  }
  if (shortE && !strict) console.log(`INFO  ${shortE} lesson explanations are under 25 characters (--strict lists them).`);
}

// ---- Spelling lists ----
function reviewSpelling() {
  for (const l of BUILTIN_LISTS) {
    const seen = new Set();
    for (const w of l.words) {
      const where = `spelling ${l.id} "${w.w}"`;
      if (seen.has(w.w.toLowerCase())) err(where, 'duplicate word');
      seen.add(w.w.toLowerCase());
      if (w.d && new RegExp(`\\b${w.w}\\b`, 'i').test(w.d)) err(where, 'definition contains the word');
      if (JSON.stringify(w).match(EMDASH)) err(where, 'em dash');
    }
  }
}

if (everything || onlySkills) reviewMath();
if (everything || onlyUnits) reviewLessons();
if (everything || spellingOnly) reviewSpelling();
console.log(`\n${errors} error(s), ${warns} warning(s).`);
process.exit(errors ? 1 : 0);
