import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGLISH_UNITS, ENGLISH_SECTIONS, cleanWord } from '../js/english/content.js';
import { BUILTIN_LISTS } from '../js/spelling/words.js';
import { emptyRec, record, newCard, grade, isDue, cardStatus } from '../js/shared/mastery.js';
import { isCorrectSpelling, diffSpelling, parseWordList, blankWord, wordDifficulty, splitTiers, challengeGoal } from '../js/spelling/logic.js';
import { quizItems, passedQuiz, needFor, LESSON_TIERS } from '../js/lessons/tiers.js';
import { seeded } from '../js/shared/util.js';

test('lesson units (English, Science, Coding) are well formed', async () => {
  const { SUBJECTS } = await import('../js/lessons/subjects.js');
  for (const subj of SUBJECTS) {
  const ids = new Set();
  for (const u of subj.units) {
    assert.ok(!ids.has(u.id), `duplicate ${u.id}`);
    ids.add(u.id);
    assert.ok(subj.sections.some(s => s.id === u.section), u.id);
    assert.ok(u.lessons.length >= 1 && u.questions.length >= 7, u.id);
    for (const q of u.questions) {
      if (q.t === 'mc') {
        assert.ok(q.c.includes(q.a), `${u.id}: "${q.q}" answer missing from choices`);
        assert.equal(new Set(q.c).size, q.c.length, `${u.id}: duplicate choices`);
      } else if (q.t === 'tap') {
        const words = q.s.split(/\s+/).map(w => cleanWord(w).toLowerCase());
        for (const a of q.a) assert.equal(words.filter(w => w === a.toLowerCase()).length, 1, `${u.id}: "${a}" must appear exactly once in "${q.s}"`);
      } else if (q.t === 'fill') {
        assert.ok(q.s.includes('___') && q.a.length, u.id);
      } else assert.fail(`unknown type ${q.t}`);
    }
  }
  }
});

test('lesson text has no em dash and fill-in marks match the Warm-up hint', async () => {
  const { SUBJECTS } = await import('../js/lessons/subjects.js');
  for (const subj of SUBJECTS) {
    assert.ok(!JSON.stringify(subj.units).includes('\u2014'), `${subj.id}: em dash found`);
    for (const u of subj.units) {
      for (const q of u.questions.filter(x => x.t === 'fill' && /^[^\p{L}\p{N}]$/u.test(x.a[0]))) {
        assert.ok(q.a.every(m => '.?!'.includes(m)), `${u.id}: the Warm-up hint only offers . ? ! but "${q.q}" wants ${q.a}`);
      }
    }
  }
});

test('starter spelling lists are well formed', () => {
  for (const l of BUILTIN_LISTS.filter(x => x.id.startsWith('starter-'))) {
    const seen = new Set();
    for (const w of l.words) {
      assert.ok(w.w && w.def && w.sent, `${l.id} ${w.w}`);
      assert.ok(!seen.has(w.w.toLowerCase()), `dup ${w.w}`);
      seen.add(w.w.toLowerCase());
      assert.ok(!w.def.toLowerCase().includes(w.w.toLowerCase()), `definition gives away "${w.w}"`);
    }
  }
});

test('practice records and spaced repetition', () => {
  const r = emptyRec();
  for (let i = 0; i < 25; i++) record(r, true);
  record(r, false, 'forgot-carry');
  assert.equal(r.attempts, 26);
  assert.equal(r.recent.length, 20);
  assert.equal(r.errors['forgot-carry'], 1);
  assert.equal(r.stars, 0, 'accuracy alone never earns stars; passing a star tier does');

  const now = Date.now();
  const c = newCard();
  assert.equal(cardStatus(c), 'new');
  grade(c, true, { now });
  assert.equal(c.box, 1);
  assert.ok(!isDue(c, now));
  assert.ok(isDue(c, now + 2 * 864e5));
  grade(c, true, { now, hinted: true });
  assert.equal(c.box, 1, 'hints do not advance');
  grade(c, true, { now });
  grade(c, true, { now });
  assert.equal(cardStatus(c), 'mastered');
  grade(c, false, { now });
  assert.equal(c.box, 0);
  assert.ok(isDue(c, now));
});

test('spelling helpers', () => {
  assert.ok(isCorrectSpelling(' Beautiful ', 'beautiful'));
  assert.ok(isCorrectSpelling('cafe', 'café'));
  assert.ok(isCorrectSpelling("hors d’oeuvre", "hors d'oeuvre"));
  assert.ok(!isCorrectSpelling('beutiful', 'beautiful'));
  const d = diffSpelling('beutifull', 'beautiful');
  assert.equal(d.filter(x => x.op === 'ins').map(x => x.c).join(''), 'a');
  assert.equal(d.filter(x => x.op === 'del').length, 1);
  const words = parseWordList('1. apple\n2) banana | a yellow fruit | I ate a banana.\ncherry, date; elderberry\n\napple\n42\n• fig');
  assert.deepEqual(words.map(w => w.w), ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig']);
  assert.equal(words[1].def, 'a yellow fruit');
  assert.equal(blankWord('The garden is beautiful in spring.', 'beautiful'), 'The garden is _____ in spring.');
  assert.equal(blankWord('Use a knife to cut.', 'knife'), 'Use a _____ to cut.');
});

test('2024 Words of the Champions lists are complete and clean', async () => {
  const { WOC_2024 } = await import('../js/spelling/woc2024.js');
  const { normalizeSpelling } = await import('../js/spelling/logic.js');
  assert.equal(WOC_2024.length, 6);
  const all = WOC_2024.flatMap(l => l.words);
  assert.ok(all.length >= 4000, `expected about 4000 words, got ${all.length}`);
  for (const l of WOC_2024.filter(x => x.id.endsWith('-study'))) assert.equal(l.words.length, 150, l.name);
  assert.equal(new Set(all.map(w => normalizeSpelling(w.w))).size, all.length, 'no duplicate words');
  for (const w of all) assert.match(w.w, /^\p{L}[\p{L}' .-]*$/u, `bad entry: ${w.w}`);
  assert.ok(all.filter(w => w.alts).length >= 40, 'alternate spellings parsed');
});

test('alternate spellings are parsed and accepted', async () => {
  const { parseWordList, matchesWord } = await import('../js/spelling/logic.js');
  const [w] = parseWordList('practice** OR practise | noun: repeated exercise.');
  assert.deepEqual([w.w, w.alts, w.def], ['practice', ['practise'], 'noun: repeated exercise.']);
  assert.ok(matchesWord('practise', w) && matchesWord('Practice', w) && !matchesWord('practis', w));
  assert.ok(matchesWord('deja vu', { w: 'déjà vu' }));
});

test('english star tiers', () => {
  const rng = seeded(3);
  for (const u of ENGLISH_UNITS) {
    const warm = quizItems(u, 1, rng), quiz = quizItems(u, 2, rng), expert = quizItems(u, 3, rng);
    assert.equal(warm.length, Math.min(6, u.questions.length), u.id);
    assert.equal(quiz.length, Math.min(8, u.questions.length), u.id);
    assert.equal(expert.length, u.questions.length, 'Expert asks every question');
    assert.equal(new Set(expert.map(x => x.idx)).size, u.questions.length);
    for (const it of warm) {
      const q = u.questions[it.idx];
      if (q.t === 'mc') {
        assert.equal(it.choices.length, 2);
        assert.ok(it.choices.includes(q.a) && new Set(it.choices).size === 2, `${u.id} warm-up choices`);
      } else assert.ok(it.hint, `${u.id} warm-up hint`);
    }
    assert.ok(quiz.every(x => !x.choices && !x.hint) && expert.every(x => !x.choices && !x.hint));
  }
  assert.ok(passedQuiz(3, 8, 9) && !passedQuiz(3, 7, 9), 'Expert allows one miss');
  assert.ok(passedQuiz(2, 7, 8) && !passedQuiz(2, 6, 8));
  assert.equal(needFor(1, 6), 5);
  assert.equal(LESSON_TIERS.length, 3);
});

test('spelling star tiers split lists by difficulty', () => {
  assert.ok(wordDifficulty('cat') < wordDifficulty('caught'));
  assert.ok(wordDifficulty('knight') > wordDifficulty('nights'), 'silent letters count');
  for (const list of BUILTIN_LISTS) {
    const [a, b, c] = splitTiers(list.words);
    assert.equal(a.length + b.length + c.length, list.words.length, list.id);
    assert.ok(a.length && b.length && c.length, `${list.id} has words in every tier`);
    const max = xs => Math.max(...xs.map(w => wordDifficulty(w.w))), min = xs => Math.min(...xs.map(w => wordDifficulty(w.w)));
    assert.ok(max(a) <= min(b) && max(b) <= min(c), `${list.id} tiers are ordered`);
  }
  assert.deepEqual(splitTiers([]), [[], [], []]);
  assert.equal(challengeGoal(150), 10);
  assert.equal(challengeGoal(5), 3, 'a tiny tier still leaves room for the 2 misses 3 lives allow');
  assert.equal(challengeGoal(1), 1);
});

test('coding questions with code are well formed', async () => {
  const { CODING_UNITS } = await import('../js/coding/content.js');
  const { SUBJECTS } = await import('../js/lessons/subjects.js');
  let withCode = 0;
  for (const subj of SUBJECTS) {
    for (const u of subj.units) {
      for (const q of u.questions) {
        if (q.code === undefined) continue;
        assert.equal(subj.id, 'coding', `${u.id}: only Code Club questions show code`);
        withCode++;
        const where = `${u.id}: "${q.q}"`;
        assert.equal(typeof q.code, 'string', where);
        assert.ok(q.code.trim(), `${where} has empty code`);
        assert.equal(q.code, q.code.replace(/^\n+|\n+$/g, ''), `${where} code starts or ends with a blank line`);
        assert.ok(!q.code.includes('\t'), `${where} code uses tabs; indent with spaces`);
        assert.ok(!/&(lt|gt|amp|quot);/.test(q.code), `${where} code is plain text, not HTML (write < not &lt;)`);
        for (const line of q.code.split('\n')) {
          assert.equal(line, line.trimEnd(), `${where} trailing spaces`);
          assert.equal(line.match(/^ */)[0].length % 2, 0, `${where} odd indentation: "${line}"`);
          assert.ok(line.length <= 32, `${where} line too long to fit a phone without scrolling: "${line}"`);
        }
      }
    }
  }
  assert.ok(withCode >= 40, `expected plenty of code questions, got ${withCode}`);
  for (const u of CODING_UNITS) {
    assert.ok(u.lessons.length >= 2 && u.lessons.length <= 3, `${u.id}: 2-3 lesson cards`);
    assert.ok(u.questions.length >= 9 && u.questions.length <= 12, `${u.id}: 9-12 questions`);
    assert.deepEqual(new Set(u.questions.map(q => q.t)), new Set(['mc', 'tap', 'fill']), `${u.id} mixes mc, tap and fill`);
    for (const q of u.questions.filter(x => x.t === 'fill')) assert.ok(q.a[0].length > 1, `${u.id}: the Warm-up hint would give away "${q.a[0]}"`);
    for (const l of u.lessons) {
      for (const [, inner] of l.body.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)) assert.ok(!inner.includes('<'), `${u.id}: escape < inside <pre> in "${l.title}"`);
    }
  }
});

test('no em dashes in lesson content', async () => {
  const { SUBJECTS } = await import('../js/lessons/subjects.js');
  for (const subj of SUBJECTS) assert.ok(!JSON.stringify(subj.units).includes('\u2014'), subj.id);
});

test('science lab covers every section and its warm-ups are valid', async () => {
  const { SCIENCE_UNITS, SCIENCE_SECTIONS } = await import('../js/science/content.js');
  assert.ok(SCIENCE_UNITS.length >= 18);
  for (const s of SCIENCE_SECTIONS) assert.ok(SCIENCE_UNITS.some(u => u.section === s.id), `section ${s.id} has units`);
  const rng = seeded(7);
  for (const u of SCIENCE_UNITS) {
    assert.ok(u.lessons.length >= 2 && u.questions.length >= 9, u.id);
    assert.ok(!JSON.stringify(u).includes('—'), `${u.id} has an em dash`);
    for (const it of quizItems(u, 1, rng)) {
      const q = u.questions[it.idx];
      if (q.t === 'mc') assert.ok(it.choices.length === 2 && it.choices.includes(q.a), u.id);
      else assert.ok(it.hint, u.id);
    }
  }
});

test('a missed lesson question gets 2 solved examples from its unit, never ones still to come', async () => {
  const { SUBJECTS } = await import('../js/lessons/subjects.js');
  const { lessonExamples, solved } = await import('../js/lessons/examples.js');
  const rng = seeded(8);
  for (const subj of SUBJECTS) {
    for (const u of subj.units) {
      const items = quizItems(u, 2, rng);
      items.forEach((it, k) => {
        const coming = items.slice(k + 1).map(x => x.idx);
        const exs = lessonExamples(u, it.idx, coming, rng);
        assert.ok(exs.length === Math.min(2, u.questions.length - 1 - coming.length), `${u.id}: ${exs.length} examples`);
        for (const ex of exs) {
          assert.ok(ex.idx !== it.idx && !coming.includes(ex.idx), `${u.id}: example gives away a coming question`);
          assert.ok(ex.answer && ex.prompt, `${u.id}: example is solved`);
          if (ex.sentence) assert.match(ex.sentence, /\[\[.+?\]\]/, `${u.id}: answer is marked in the sentence`);
        }
      });
    }
  }
  assert.deepEqual(solved({ t: 'fill', q: 'Q', s: 'Fish can ___ fast.', a: ['swim'] }).sentence, 'Fish can [[swim]] fast.');
  assert.equal(solved({ t: 'tap', q: 'Q', s: 'The frog jumps.', a: ['frog'] }).sentence, 'The [[frog]] jumps.');
});

test('lesson grade paths: every unit has a grade; Next up follows the player grade', async () => {
  const { SUBJECTS } = await import('../js/lessons/subjects.js');
  const { UNIT_GRADE, suggestedUnit, unitGrade } = await import('../js/lessons/grades.js');
  const all = SUBJECTS.flatMap(s => s.units);
  for (const u of all) assert.ok(UNIT_GRADE[u.id] >= 1 && UNIT_GRADE[u.id] <= 8, `${u.id} has a grade`);
  assert.equal(Object.keys(UNIT_GRADE).length, all.length, 'no stale unit grades');
  const eng = SUBJECTS.find(s => s.id === 'english').units;
  assert.equal(suggestedUnit(eng, {}).id, 'abc', 'no grade: the first unit');
  assert.equal(unitGrade(suggestedUnit(eng, {}, 5)), 5, '5th grade: a 5th grade unit');
  const recs = Object.fromEntries(eng.filter(u => unitGrade(u) === 8).map(u => [u.id, { stars: 2 }]));
  assert.equal(unitGrade(suggestedUnit(eng, recs, 8)), 7, '8th grade done: one grade down');
  for (const s of SUBJECTS) for (let g = 1; g <= 8; g++) assert.ok(suggestedUnit(s.units, {}, g), `${s.id} has a unit for grade ${g}`);
});
