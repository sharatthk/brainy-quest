// Worked examples shown after a wrong answer: more problems of the same skill and tier, solved.
// Pure (no DOM) so it can be unit tested; uses its own rng so it never disturbs Math.random.
import { genAt } from './tiers.js';
import { answerText, stacked } from './skills.js';

const QBOX = '<span class="qbox">?</span>';
const keyOf = pr => `${pr.kind}|${pr.a ?? ''}|${pr.b ?? ''}|${pr.prompt ?? ''}|${answerText(pr)}`;

// The problem with its answer written in: the ? box filled, or "= ?" finished. filled: false if neither fits.
export function solvedPrompt(pr) {
  const ans = answerText(pr);
  if (pr.kind === 'column') return { html: stacked(pr.a, pr.b, pr.op, pr.answer), filled: true };
  if (pr.kind === 'division') return { html: `<span class="big-num">${pr.prompt} = ${ans}</span>`, filled: true };
  const p = pr.prompt || '';
  const mark = `<b class="ex-ans">${ans}</b>`;
  if (p.includes(QBOX)) return { html: p.replace(QBOX, mark), filled: true };
  if (/= \?<\/span>/.test(p)) return { html: p.replace(/= \?<\/span>/, `= ${mark}</span>`), filled: true };
  return { html: p, filled: false };
}

// n solved problems like `pr` (same skill and tier), all different from it and from each other.
export function workedExamples(skill, tier, pr, rng, n = 2) {
  const seen = new Set([keyOf(pr)]);
  const out = [];
  for (let i = 0; i < 40 && out.length < n; i++) {
    let ex;
    try {
      ex = genAt(skill, tier, rng);
    } catch {
      continue;
    }
    const k = keyOf(ex);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ problem: ex, ...solvedPrompt(ex), answer: answerText(ex), steps: ex.steps || [] });
  }
  return out;
}

// What the kid typed or picked, as text ("45", "12 R 3", "3/4").
export function givenText(pr, val) {
  if (pr.kind === 'division') return `${String(val.q).trim() || '?'}${String(val.r ?? '').trim() ? ` R ${String(val.r).trim()}` : ''}`;
  if (pr.kind === 'fraction') return `${String(val.n).trim() || '?'}/${String(val.d).trim() || '?'}`;
  return String(val).trim();
}
