// Worked examples after a missed lesson question: other questions from the same unit, shown solved.
// Never one the player is still going to be asked in this quiz. Pure (no DOM), unit tested.
import { shuffle } from '../shared/util.js';

// unit: the missed question's unit. idx: its index. skip: indexes still coming up in this quiz.
// Prefers the same question type and questions without a reading passage (short to read).
export function lessonExamples(unit, idx, skip = [], rng = Math.random, n = 2) {
  const miss = unit.questions[idx];
  const pool = unit.questions.map((q, i) => ({ q, i })).filter(({ i }) => i !== idx && !skip.includes(i));
  const score = ({ q }) => (q.t === miss.t ? 2 : 0) + (q.p ? 0 : 1);
  return shuffle(pool, rng).sort((a, b) => score(b) - score(a)).slice(0, n).map(({ q, i }) => ({ idx: i, ...solved(q) }));
}

// One question with its answer worked in: { prompt, sentence?, code?, answer, why }.
// sentence is plain text with the answer marked as [[word]] so the view can bold it safely.
export function solved(q) {
  const ans = Array.isArray(q.a) ? q.a : [q.a];
  const out = { prompt: q.q, code: q.code || null, answer: q.t === 'fill' ? ans[0] : ans.join(', '), why: q.e || '' };
  if (q.t === 'fill') out.sentence = q.s.replace('___', `[[${ans[0]}]]`);
  if (q.t === 'tap') {
    const want = new Set(ans.map(w => w.toLowerCase()));
    out.sentence = q.s.split(/\s+/).map(w => (want.has(w.replace(/[^\w'-]/g, '').toLowerCase()) ? `[[${w}]]` : w)).join(' ');
  }
  return out;
}
