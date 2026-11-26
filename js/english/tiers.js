// Star tiers for English units: ★ Warm-up, ★★ Quiz, ★★★ Expert. Pure module (no DOM), unit tested.
import { shuffle, pick } from '../shared/util.js';
import { passed, needToPass } from '../shared/mastery.js';

export const ENGLISH_TIERS = [
  { name: 'Warm-up', label: '6 questions with extra help', count: 6 },
  { name: 'Quiz', label: '8 questions', count: 8 },
  { name: 'Expert', label: 'Every question, at most 1 miss', count: Infinity },
];

// The questions of one tier quiz: [{ idx, choices?, hint? }]. The Warm-up trims multiple choice to
// two options and says how many words to tap or what a fill-in starts with.
export function quizItems(unit, tier, rng = Math.random) {
  const order = shuffle(unit.questions.map((_, k) => k), rng).slice(0, ENGLISH_TIERS[tier - 1].count);
  return order.map(idx => {
    const q = unit.questions[idx];
    if (tier !== 1) return { idx };
    if (q.t === 'mc') return { idx, choices: shuffle([q.a, pick(q.c.filter(c => c !== q.a), rng)], rng) };
    if (q.t === 'tap') return { idx, hint: `Tap ${q.a.length} ${q.a.length === 1 ? 'word' : 'words'}, then press Check.` };
    if (/^[^\p{L}\p{N}]$/u.test(q.a[0])) return { idx, hint: 'Use one of these marks: . ? !' };
    return { idx, hint: `It starts with "${q.a[0][0]}".` };
  });
}

// Expert allows one miss; the other tiers use the shared pass mark.
export const needFor = (tier, total) => (tier === 3 ? total - 1 : needToPass(total));
export const passedQuiz = (tier, correct, total) => (tier === 3 ? correct >= total - 1 : passed(correct, total));
