import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGLISH_UNITS, ENGLISH_SECTIONS, cleanWord } from '../js/english/content.js';
import { BUILTIN_LISTS } from '../js/spelling/words.js';
import { emptyRec, record, starsFor, newCard, grade, isDue, cardStatus } from '../js/shared/mastery.js';
import { isCorrectSpelling, diffSpelling, parseWordList, blankWord } from '../js/spelling/logic.js';

test('english units are well formed', () => {
  const ids = new Set();
  for (const u of ENGLISH_UNITS) {
    assert.ok(!ids.has(u.id), `duplicate ${u.id}`);
    ids.add(u.id);
    assert.ok(ENGLISH_SECTIONS.some(s => s.id === u.section), u.id);
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
});

test('spelling lists are well formed', () => {
  for (const l of BUILTIN_LISTS) {
    const seen = new Set();
    for (const w of l.words) {
      assert.ok(w.w && w.def && w.sent, `${l.id} ${w.w}`);
      assert.ok(!seen.has(w.w.toLowerCase()), `dup ${w.w}`);
      seen.add(w.w.toLowerCase());
      assert.ok(!w.def.toLowerCase().includes(w.w.toLowerCase()), `definition gives away "${w.w}"`);
    }
  }
});

test('stars and spaced repetition', () => {
  const r = emptyRec();
  for (let i = 0; i < 9; i++) record(r, true);
  assert.equal(r.stars, 1);
  record(r, true);
  assert.equal(r.stars, 2);
  for (let i = 0; i < 10; i++) record(r, true);
  assert.equal(r.stars, 3);
  record(r, false);
  assert.equal(r.stars, 3, 'stars are kept');
  assert.equal(starsFor([1, 1, 0, 0, 0]), 0);

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
