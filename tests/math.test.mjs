import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, UNITS, skillById, checkAnswer, diagnose, guidedPlan, countCarries, countBorrows, borrowsAcrossZero, makeAdd, makeSub, makeMul, addSolution, subSolution, dls } from '../js/math/skills.js';
import { seeded } from '../js/shared/util.js';

const rng = seeded(42);

test('every skill generates 300 valid problems', () => {
  for (const s of SKILLS) {
    for (let i = 0; i < 300; i++) {
      const p = s.gen(rng);
      assert.ok(['column', 'input', 'choice', 'division', 'fraction'].includes(p.kind), s.id);
      assert.ok(Array.isArray(p.steps) && p.steps.length > 0, `${s.id} has steps`);
      if (p.kind === 'choice') {
        assert.ok(p.choices.includes(p.answer), `${s.id} answer in choices`);
        assert.equal(new Set(p.choices).size, p.choices.length, `${s.id} unique choices`);
        if (p.fracChoices) {
          const v = c => c.split('/').reduce((x, y) => x / y);
          assert.equal(p.choices.filter(c => Math.abs(v(c) - v(p.answer)) < 1e-9).length, 1, `${s.id} only one equivalent choice: ${p.choices}`);
        }
      }
      if (p.kind === 'column') {
        assert.ok(String(p.answer).length <= p.cells, `${s.id} answer fits cells`);
        const expected = { '+': p.a + p.b, '−': p.a - p.b, '×': p.a * p.b }[p.op];
        assert.equal(p.answer, expected);
        assert.ok(checkAnswer(p, String(p.answer)));
      }
      if (p.kind === 'division') {
        assert.equal(p.q * p.b + p.r, p.a);
        assert.ok(p.r < p.b);
        assert.ok(checkAnswer(p, { q: String(p.q), r: p.r ? String(p.r) : '' }));
      }
      if (p.kind === 'input') {
        assert.ok(checkAnswer(p, p.answerText?.replace('%', '') ?? String(p.answer)), `${s.id} accepts its own answer`);
        assert.ok(!checkAnswer(p, String(Number(p.answer) + 1)), `${s.id} rejects wrong`);
      }
      if (p.kind === 'fraction') assert.ok(checkAnswer(p, { n: String(p.answer.n), d: String(p.answer.d) }));
    }
  }
});

test('skill constraints hold', () => {
  for (let i = 0; i < 300; i++) {
    let p = skillById('add-2d-nc').gen(rng);
    assert.equal(countCarries(p.a, p.b), 0);
    p = skillById('add-3d-c2').gen(rng);
    assert.ok(countCarries(p.a, p.b) >= 2);
    p = skillById('sub-2d-b').gen(rng);
    assert.equal(countBorrows(p.a, p.b), 1);
    p = skillById('sub-3d-b2').gen(rng);
    assert.equal(countBorrows(p.a, p.b), 2);
    assert.ok(!borrowsAcrossZero(p.a, p.b));
    p = skillById('sub-3d-bz').gen(rng);
    assert.ok(borrowsAcrossZero(p.a, p.b), `${p.a}-${p.b}`);
    assert.ok(p.a > p.b);
  }
});

test('requires reference real skills and units', () => {
  for (const s of SKILLS) {
    assert.ok(UNITS.some(u => u.id === s.unit), s.id);
    for (const r of s.requires) assert.ok(skillById(r), `${s.id} requires ${r}`);
  }
});

test('addition carries and steps', () => {
  const { carries, steps } = addSolution(987, 365);
  assert.deepEqual(carries, [0, 1, 1, 1]);
  assert.equal(steps.length, 4);
  assert.match(steps[0], /Ones: 7 \+ 5 = 12\. Write 2 and carry 1/);
});

test('subtraction borrowing across zeros', () => {
  const s = subSolution(403, 178);
  assert.deepEqual(s.newTop, [13, 9, 3]);
  assert.match(s.steps[0], /tens digit is 0/);
  const s2 = subSolution(5000, 1);
  assert.deepEqual(s2.newTop, [10, 9, 9, 4]);
});

test('diagnose classic misconceptions', () => {
  assert.equal(diagnose(makeAdd(58, 67), '115').tag, 'forgot-carry');
  assert.equal(diagnose(makeSub(52, 27), '35').tag, 'flip-subtract');
  assert.equal(diagnose(makeSub(543, 278), '375').tag, 'forgot-decrement');
  assert.equal(diagnose(makeMul(47, 6), '242').tag, 'forgot-carry');
  assert.equal(diagnose(makeMul(34, 27), String(34 * 7 + 34 * 2)).tag, 'forgot-zero');
  assert.equal(diagnose(makeAdd(58, 67), '125'), null);
});

test('guided plan reproduces the answer', () => {
  for (let i = 0; i < 300; i++) {
    for (const id of ['add-3d-c2', 'sub-3d-bz', 'sub-3d-b2', 'add-2d-c']) {
      const p = skillById(id).gen(rng);
      const written = [];
      for (const st of guidedPlan(p)) if (st.write !== undefined) written[st.col] = st.write;
      const got = Number(written.map(d => d ?? 0).reverse().join(''));
      assert.equal(got, p.answer, `${id} ${p.a}${p.op}${p.b}`);
    }
  }
});

test('answer checking edge cases', () => {
  const dec = { kind: 'input', answerType: 'decimal', answer: 3.75 };
  assert.ok(checkAnswer(dec, '3.75'));
  assert.ok(checkAnswer(dec, '3.750'));
  assert.ok(!checkAnswer(dec, '3.7'));
  assert.ok(!checkAnswer(dec, 'abc'));
  const fr = { kind: 'fraction', answer: { n: 4, d: 8 } };
  assert.ok(checkAnswer(fr, { n: '1', d: '2' }));
  assert.ok(!checkAnswer(fr, { n: '1', d: '0' }));
  const int = { kind: 'input', answer: 1200 };
  assert.ok(checkAnswer(int, '1,200'));
  assert.ok(!checkAnswer(int, '12.00'));
  const div = { kind: 'division', q: 9, r: 2 };
  assert.ok(checkAnswer(div, { q: '9', r: '2' }));
  assert.ok(!checkAnswer(div, { q: '9', r: '' }));
  assert.deepEqual(dls(305), [5, 0, 3]);
});

test('speed challenge scoring', async () => {
  const { pointsFor, multiplier, coinsFor } = await import('../js/math/scoring.js');
  assert.equal(multiplier(1), 1);
  assert.equal(multiplier(5), 2);
  assert.equal(multiplier(10), 3);
  assert.equal(multiplier(99), 4);
  assert.deepEqual(pointsFor({ tier: 1, seconds: 2, kind: 'input', streak: 1 }), { points: 15, quick: true });
  assert.deepEqual(pointsFor({ tier: 3, seconds: 6, kind: 'column', streak: 5 }), { points: 70, quick: true });
  assert.deepEqual(pointsFor({ tier: 2, seconds: 9, kind: 'column', streak: 0 }), { points: 20, quick: false });
  assert.equal(coinsFor(410), 21);
});
