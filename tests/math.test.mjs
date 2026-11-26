import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, UNITS, skillById, checkAnswer, diagnose, guidedPlan, countCarries, countBorrows, borrowsAcrossZero, makeAdd, makeSub, makeMul, addSolution, subSolution, dls } from '../js/math/skills.js';
import { seeded } from '../js/shared/util.js';
import { TIERS, genAt } from '../js/math/tiers.js';
import { currentTier, passed, needToPass } from '../js/shared/mastery.js';

const rng = seeded(42);

test('every skill and every star tier generates valid problems', () => {
  for (const s of SKILLS) {
    const gens = [s.gen, ...[1, 2, 3].map(t => r => genAt(s, t, r))];
    for (let i = 0; i < 600; i++) {
      const p = gens[i % 4](rng);
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

test('star tiers generate exactly the shape each tier promises', () => {
  const rng = seeded(7);
  const sample = (id, t, n = 60) => Array.from({ length: n }, () => genAt(skillById(id), t, rng));
  const carryCols = p => p.carries.map((c, i) => (c ? i - 1 : null)).filter(x => x != null);
  const expectAdd = { 'add-2d-nc': [0, 0, 0], 'add-2d-c': [1, 1, 2], 'add-3d-nc': [0, 0, 0], 'add-3d-c1': [1, 1, 1], 'add-3d-c2': [2, 2, 3] };
  for (const [id, carries] of Object.entries(expectAdd)) {
    carries.forEach((c, k) => sample(id, k + 1).forEach(p => assert.equal(countCarries(p.a, p.b), c, `${id} ★${k + 1}: ${p.a}+${p.b}`)));
  }
  assert.ok(sample('add-3d-c1', 1).every(p => carryCols(p).join() === '0'), 'carry from the ones');
  assert.ok(sample('add-3d-c1', 2).every(p => carryCols(p).join() === '1'), 'carry from the tens');
  assert.ok(sample('add-3d-c1', 3).every(p => p.answer >= 1000), 'carry into the thousands');
  assert.ok(sample('add-3d-c2', 1).every(p => p.answer < 1000) && sample('add-3d-c2', 2).every(p => p.answer >= 1000));
  assert.ok(sample('add-2d-nc', 1).every(p => p.b < 10) && sample('sub-2d-b', 1).every(p => p.b < 10), '★ uses a 1-digit number');
  assert.ok(sample('add-4d', 3).every(p => countCarries(p.a, p.b) >= 3));
  [0, 1].forEach(b => assert.ok(sample('sub-2d-nb', 2).concat(sample('sub-2d-b', 2)).some(p => countBorrows(p.a, p.b) === b)));
  assert.ok(sample('sub-2d-b', 3).every(p => p.a % 10 === 0 && countBorrows(p.a, p.b) === 1), 'borrow from a zero');
  assert.ok(sample('sub-3d-b2', 3).every(p => countBorrows(p.a, p.b) === 2 && p.answer < 100));
  for (const t of [1, 2, 3]) assert.ok(sample('sub-3d-bz', t).every(p => borrowsAcrossZero(p.a, p.b)), `across zero ★${t}`);
  assert.ok(sample('mul-facts', 1).every(p => /\b(2|5|10)\b/.test(p.prompt)), '2s, 5s and 10s');
  assert.ok(sample('mul-3x1', 3).every(p => Math.floor(p.a / 10) % 10 === 0 && p.b >= 6), 'zero in the middle');
  assert.ok(sample('div-3x1', 1).every(p => p.r === 0) && sample('div-3x1', 3).every(p => String(p.q).includes('0')));
  assert.ok(sample('div-3x2', 3).every(p => p.b >= 26));
  assert.ok(sample('num-place', 3).every(p => /\d{2,3},\d{3}/.test(p.prompt.replace(/<[^>]+>/g, ''))), 'up to 6 digits');
  assert.ok(sample('word-add-sub', 1).every(p => p.answer < 200) && sample('word-add-sub', 3).every(p => p.answer >= 100));
  for (const s of SKILLS) assert.equal(TIERS[s.id].length, 3, s.id);
});

test('star tier rules', () => {
  assert.equal(currentTier(0), 1);
  assert.equal(currentTier(2), 3);
  assert.equal(currentTier(3), 3, 'stays on ★★★ once everything is passed');
  assert.equal(currentTier(undefined), 1);
  assert.equal(needToPass(10), 8);
  assert.equal(needToPass(6), 5);
  assert.ok(passed(8, 10) && !passed(7, 10) && !passed(0, 0));
});

test('math basics tiers', () => {
  const rng = seeded(11);
  const sample = (id, t, n = 80) => Array.from({ length: n }, () => genAt(skillById(id), t, rng));
  const nums = p => p.prompt.replace(/<[^>]+>/g, ' ').match(/\d+/g).map(Number);
  assert.ok(sample('basic-count', 1).every(p => p.answer >= 3 && p.answer <= 10 && (p.prompt.match(/\p{Extended_Pictographic}/gu) || []).length === p.answer), 'count the pictures');
  assert.ok(sample('basic-add', 1).every(p => p.answer <= 5) && sample('basic-add', 2).every(p => p.answer <= 10));
  assert.ok(sample('basic-add', 3).every(p => p.answer > 10 && p.answer <= 18 && nums(p).every(n => n <= 9 || n === p.answer)), 'two 1-digit numbers crossing 10');
  assert.ok(sample('basic-sub', 3).every(p => { const [a, b] = nums(p); return a > 10 && a - b < 10 && b <= 9; }), 'subtract across 10');
  for (const [t, whole] of [[1, 5], [2, 10], [3, 20]]) assert.ok(sample('basic-bonds', t).every(p => nums(p).includes(whole) && p.answer > 0 && p.answer < whole));
  assert.ok(sample('basic-skip', 1).every(p => /by <b>2s/.test(p.prompt)) && sample('basic-skip', 3).every(p => /by <b>[34]s/.test(p.prompt)));
  assert.equal(UNITS[0].id, 'basic', 'basics come first on the map');
});

test('every skill is playable; reached skills follow the suggested path', async () => {
  const { isReached } = await import('../js/math/skills.js');
  const p = { math: { skills: {} } };
  assert.ok(isReached(skillById('basic-count'), p), 'no prerequisites');
  assert.ok(!isReached(skillById('basic-add'), p));
  p.math.skills['basic-count'] = { stars: 2 };
  assert.ok(isReached(skillById('basic-add'), p), '★★ on the prerequisite');
  assert.ok(!isReached(skillById('div-3x2'), p));
  p.math.skills['div-3x2'] = { attempts: 1, stars: 0 };
  assert.ok(isReached(skillById('div-3x2'), p), 'a skill the player jumped to counts as reached');
});
