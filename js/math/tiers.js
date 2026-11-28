// Star tiers: every math skill has three difficulty tiers, ★ easy, ★★ medium and ★★★ hard.
// Passing a tier's session earns its star and opens the next tier (rules in js/shared/mastery.js). Pure, unit tested.
import {
  SKILLS, makeAdd, makeSub, makeMul, makeDivision, countCarries, countBorrows, borrowsAcrossZero, until, nd, pair,
  mulSolution, divSolution, genPctBig, genBigRead, genBigAddSub, genBigMulDiv, genBigPct, genMissing, genOneStep, genTwoStep, genExpr, genRule, genCount, genFact, genBond, genSkip, genPlace, genRound, genMulFacts, genDivFacts, genFracId, genFracEquiv, genFracCompare,
  genFracAdd, genFracOf, genDecPlace, genDecAdd, genPctIntro, genPctOf, genWordAddSub, genWordMulDiv,
} from './skills.js';
import { randInt, pick } from '../shared/util.js';
import { MIDDLE_TIERS } from './middle.js';

// ---- Shape helpers for column problems ----
const digits = n => String(n).split('').reverse().map(Number);
const zeros = (...ns) => ns.join('').split('0').length - 1;
// Columns (0 = ones) that send a carry to the next column.
function carryCols(a, b) {
  const A = digits(a), B = digits(b), out = [];
  let c = 0;
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    c = (A[i] || 0) + (B[i] || 0) + c >= 10 ? 1 : 0;
    if (c) out.push(i);
  }
  return out;
}
// Columns (0 = ones) that need to borrow.
function borrowCols(a, b) {
  const A = digits(a), B = digits(b), out = [];
  let owe = 0;
  for (let i = 0; i < A.length; i++) {
    owe = A[i] - owe < (B[i] || 0) ? 1 : 0;
    if (owe) out.push(i);
  }
  return out;
}
const same = (xs, ys) => xs.length === ys.length && xs.every((x, i) => x === ys[i]);
const colSums = (a, b) => digits(Math.max(a, b)).map((x, i) => x + (digits(Math.min(a, b))[i] || 0));

// add(da, db, ok): da-digit + db-digit, at most one zero digit (630 + 400 is too easy), ok(a, b) shape check.
const add = (da, db, ok) => rng => makeAdd(...until(() => pair(rng, da, db), ([a, b]) => zeros(a, b) <= 1 && ok(a, b)));
const sub = (da, db, ok, allowZeros = false) => rng => makeSub(...until(() => [nd(rng, da), nd(rng, pick([db].flat(), rng))],
  ([a, b]) => a > b && (allowZeros || zeros(a, b) <= 1) && ok(a, b)));
const mulCarries = (a, m) => mulSolution(a, m).carries.filter(Boolean).length;
const divInput = (a, b) => ({ kind: 'input', prompt: `<span class="big-num">${a} ÷ ${b} = ?</span>`, answer: a / b, steps: divSolution(a, b).steps });
const span = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

function divBy2Digits(rng, lo, hi) {
  const [a, b] = until(() => {
    const b = randInt(rng, lo, hi);
    return [b * randInt(rng, 4, 39) + randInt(rng, 0, b - 1), b];
  }, ([a]) => a >= 100 && a <= 999);
  const q = Math.floor(a / b), r = a % b;
  const near = Math.round(b / 10) * 10;
  return {
    kind: 'division', a, b, q, r, prompt: `${a} ÷ ${b}`,
    steps: [`Estimate: ${b} is close to ${near}. How many ${b}s fit in ${a}?`, `${b} × ${q} = ${b * q}, and ${b} × ${q + 1} = ${b * (q + 1)} is too big.`, `${a} − ${b * q} = ${r}. So ${a} ÷ ${b} = ${q}${r ? ` R ${r}` : ''}.`],
  };
}

const T = (label, gen) => ({ label, gen });

export const TIERS = {
  ...MIDDLE_TIERS,
  // ---- Math basics ----
  'basic-count': [T('Count the pictures', rng => genCount(rng, 1)), T('Before and after', rng => genCount(rng, 2)), T('Which is bigger?', rng => genCount(rng, 3))],
  'basic-add': [T('Sums to 5', rng => genFact(rng, { max: 5 })), T('Sums to 10', rng => genFact(rng, { max: 10 })), T('Sums to 18: 8 + 7', rng => genFact(rng, { max: 18 }))],
  'basic-sub': [T('Within 5', rng => genFact(rng, { op: '−', max: 5 })), T('Within 10', rng => genFact(rng, { op: '−', max: 10 })), T('From the teens: 15 − 7', rng => genFact(rng, { op: '−', teen: true }))],
  'basic-bonds': [T('Make 5', rng => genBond(rng, 5)), T('Make 10', rng => genBond(rng, 10)), T('Make 20', rng => genBond(rng, 20))],
  'basic-skip': [T('By 2s', rng => genSkip(rng, [2])), T('By 5s and 10s', rng => genSkip(rng, [5, 10])), T('By 3s and 4s', rng => genSkip(rng, [3, 4]))],

  // ---- Number sense ----
  'num-place': [T('2 and 3-digit numbers', rng => genPlace(rng, [2, 3])), T('Thousands', rng => genPlace(rng, [4])), T('Up to 6 digits', rng => genPlace(rng, [5, 6]))],
  'num-round': [T('2-digit to the nearest ten', rng => genRound(rng, 1)), T('Nearest ten or hundred', rng => genRound(rng, 2)), T('Hundreds and thousands', rng => genRound(rng, 3))],
  'word-add-sub': [T('2-digit numbers', rng => genWordAddSub(rng, 1)), T('3-digit numbers', rng => genWordAddSub(rng, 2)), T('4-digit numbers', rng => genWordAddSub(rng, 3))],
  'word-mul-div': [T('Small groups', rng => genWordMulDiv(rng, 1)), T('2-digit groups', rng => genWordMulDiv(rng, 2)), T('Big groups', rng => genWordMulDiv(rng, 3))],

  // ---- Addition ----
  'add-2d-nc': [
    T('2-digit + 1-digit', add(2, 1, (a, b) => countCarries(a, b) === 0)),
    T('2-digit + 2-digit', add(2, 2, (a, b) => countCarries(a, b) === 0)),
    T('Big digits: 46 + 53', add(2, 2, (a, b) => countCarries(a, b) === 0 && colSums(a, b).every(s => s >= 7))),
  ],
  'add-2d-c': [
    T('2-digit + 1-digit: 47 + 8', add(2, 1, (a, b) => countCarries(a, b) === 1)),
    T('One carry: 47 + 38', add(2, 2, (a, b) => same(carryCols(a, b), [0]))),
    T('Two carries: 68 + 57', add(2, 2, (a, b) => countCarries(a, b) === 2)),
  ],
  'add-3d-nc': [
    T('3-digit + 2-digit', add(3, 2, (a, b) => countCarries(a, b) === 0)),
    T('3-digit + 3-digit', add(3, 3, (a, b) => countCarries(a, b) === 0)),
    T('Big digits: 436 + 552', add(3, 3, (a, b) => countCarries(a, b) === 0 && colSums(a, b).every(s => s >= 7))),
  ],
  'add-3d-c1': [
    T('Carry from the ones', add(3, 3, (a, b) => same(carryCols(a, b), [0]))),
    T('Carry from the tens', add(3, 3, (a, b) => same(carryCols(a, b), [1]))),
    T('Carry into the thousands', add(3, 3, (a, b) => same(carryCols(a, b), [2]))),
  ],
  'add-3d-c2': [
    T('Two carries, under 1,000', add(3, 3, (a, b) => same(carryCols(a, b), [0, 1]))),
    T('Two carries, over 1,000', add(3, 3, (a, b) => countCarries(a, b) === 2 && a + b >= 1000)),
    T('Three carries', add(3, 3, (a, b) => countCarries(a, b) === 3)),
  ],
  'add-4d': [
    T('4-digit + 3-digit', add(4, 3, (a, b) => countCarries(a, b) >= 1 && countCarries(a, b) <= 2)),
    T('Two carries', add(4, 4, (a, b) => countCarries(a, b) === 2)),
    T('Three or more carries', add(4, 4, (a, b) => countCarries(a, b) >= 3)),
  ],

  // ---- Subtraction ----
  'sub-2d-nb': [
    T('2-digit − 1-digit', sub(2, 1, (a, b) => countBorrows(a, b) === 0)),
    T('2-digit − 2-digit', sub(2, 2, (a, b) => countBorrows(a, b) === 0)),
    T('Close numbers: 78 − 63', sub(2, 2, (a, b) => countBorrows(a, b) === 0 && a - b < 20)),
  ],
  'sub-2d-b': [
    T('2-digit − 1-digit: 42 − 7', sub(2, 1, (a, b) => countBorrows(a, b) === 1)),
    T('2-digit − 2-digit: 52 − 27', sub(2, 2, (a, b) => countBorrows(a, b) === 1 && a % 10 !== 0)),
    T('From a zero: 50 − 27', sub(2, 2, (a, b) => countBorrows(a, b) === 1 && a % 10 === 0, true)),
  ],
  'sub-3d-nb': [
    T('3-digit − 2-digit', sub(3, 2, (a, b) => countBorrows(a, b) === 0)),
    T('3-digit − 3-digit', sub(3, 3, (a, b) => countBorrows(a, b) === 0)),
    T('Zeros in the answer: 768 − 358', sub(3, 3, (a, b) => countBorrows(a, b) === 0 && String(a - b).includes('0'), true)),
  ],
  'sub-3d-b1': [
    T('3-digit − 2-digit', sub(3, 2, (a, b) => countBorrows(a, b) === 1 && !borrowsAcrossZero(a, b))),
    T('Borrow for the ones', sub(3, 3, (a, b) => same(borrowCols(a, b), [0]) && !borrowsAcrossZero(a, b))),
    T('Borrow for the tens', sub(3, 3, (a, b) => same(borrowCols(a, b), [1]))),
  ],
  'sub-3d-b2': [
    T('3-digit − 2-digit', sub(3, 2, (a, b) => countBorrows(a, b) === 2 && !borrowsAcrossZero(a, b))),
    T('3-digit − 3-digit', sub(3, 3, (a, b) => countBorrows(a, b) === 2 && !borrowsAcrossZero(a, b))),
    T('Small answers: 523 − 478', sub(3, 3, (a, b) => countBorrows(a, b) === 2 && !borrowsAcrossZero(a, b) && a - b < 100)),
  ],
  'sub-3d-bz': [
    T('Hundreds − 2-digit: 300 − 45', rng => makeSub(randInt(rng, 1, 9) * 100, until(() => randInt(rng, 11, 99), b => b % 10 !== 0))),
    T('Zero in the middle: 403 − 178', rng => makeSub(...until(() => {
      const a = randInt(rng, 1, 9) * 100 + randInt(rng, 1, 8);
      return [a, randInt(rng, 11, a - 1)];
    }, ([a, b]) => borrowsAcrossZero(a, b)))),
    T('Hundreds − 3-digit: 600 − 287', rng => makeSub(...until(() => {
      const a = randInt(rng, 2, 9) * 100;
      return [a, randInt(rng, 101, a - 1)];
    }, ([a, b]) => b % 10 !== 0 && borrowsAcrossZero(a, b)))),
  ],
  'sub-4d': [
    T('4-digit − 3-digit', sub(4, 3, (a, b) => countBorrows(a, b) === 2 && !borrowsAcrossZero(a, b))),
    T('Two borrows', sub(4, 4, (a, b) => countBorrows(a, b) === 2 && !borrowsAcrossZero(a, b))),
    T('Three borrows or zeros', sub(4, [3, 4], (a, b) => countBorrows(a, b) >= 3 || (countBorrows(a, b) >= 2 && borrowsAcrossZero(a, b)), true)),
  ],

  // ---- Multiplication ----
  'mul-facts': [
    T('2s, 5s and 10s', rng => genMulFacts(rng, [2, 5, 10], span(2, 10))),
    T('Up to 10 × 10', rng => genMulFacts(rng, span(2, 10))),
    T('Tricky ones: 6 to 12', rng => genMulFacts(rng, span(6, 12))),
  ],
  'mul-2x1': [
    T('No carrying: 32 × 3', rng => makeMul(...until(() => [randInt(rng, 11, 99), randInt(rng, 2, 9)], ([a, m]) => a % 10 !== 0 && mulCarries(a, m) === 0))),
    T('Carrying, × 2 to 5', rng => makeMul(...until(() => [randInt(rng, 12, 99), randInt(rng, 2, 5)], ([a, m]) => mulCarries(a, m) >= 1))),
    T('Carrying, × 6 to 9', rng => makeMul(...until(() => [randInt(rng, 12, 99), randInt(rng, 6, 9)], ([a, m]) => mulCarries(a, m) >= 1))),
  ],
  'mul-3x1': [
    T('× 2 and 3', rng => makeMul(randInt(rng, 101, 999), randInt(rng, 2, 3))),
    T('× 4 to 9', rng => makeMul(randInt(rng, 101, 999), randInt(rng, 4, 9))),
    T('Zero in the middle: 405 × 7', rng => makeMul(randInt(rng, 1, 9) * 100 + randInt(rng, 1, 9), randInt(rng, 6, 9))),
  ],
  'mul-2x2': [
    T('× 11 to 19', rng => makeMul(...until(() => [randInt(rng, 11, 99), randInt(rng, 11, 19)], ([a]) => a % 10 !== 0))),
    T('Up to 50 × 50', rng => makeMul(...until(() => [randInt(rng, 11, 50), randInt(rng, 21, 50)], ([a, b]) => a % 10 !== 0 && b % 10 !== 0))),
    T('Big ones: 76 × 58', rng => makeMul(...until(() => [randInt(rng, 51, 99), randInt(rng, 51, 99)], ([a, b]) => a % 10 !== 0 && b % 10 !== 0))),
  ],

  // ---- Division ----
  'div-facts': [
    T('÷ 2, 5 and 10', rng => genDivFacts(rng, [2, 5, 10], span(2, 10))),
    T('Up to ÷ 10', rng => genDivFacts(rng, span(2, 10), span(2, 10))),
    T('Tricky ones: 6 to 12', rng => genDivFacts(rng, span(6, 12), span(6, 12))),
  ],
  'div-2x1': [
    T('Digit by digit: 84 ÷ 4', rng => divInput(...until(() => {
      const b = randInt(rng, 2, 4);
      return [randInt(rng, 1, Math.floor(9 / b)) * b * 10 + randInt(rng, 0, Math.floor(9 / b)) * b, b];
    }, ([a, b]) => a % 10 !== 0 && a / b >= 10))),
    T('÷ 2 to 5: 72 ÷ 4', rng => divInput(...until(() => {
      const b = randInt(rng, 2, 5);
      return [b * randInt(rng, 2, Math.floor(99 / b)), b];
    }, ([a, b]) => a >= 10 && Math.floor(a / 10) % b !== 0))),
    T('÷ 6 to 9: 91 ÷ 7', rng => divInput(...until(() => {
      const b = randInt(rng, 6, 9);
      return [b * randInt(rng, 2, Math.floor(99 / b)), b];
    }, ([a]) => a >= 10))),
  ],
  'div-2x1r': [
    T('÷ 2 to 5, under 50', rng => makeDivision(...until(() => [randInt(rng, 10, 49), randInt(rng, 2, 5)], ([a, b]) => a % b !== 0))),
    T('÷ 2 to 9', rng => makeDivision(...until(() => [randInt(rng, 10, 99), randInt(rng, 2, 9)], ([a, b]) => a % b !== 0))),
    T('÷ 6 to 9, over 50', rng => makeDivision(...until(() => [randInt(rng, 50, 99), randInt(rng, 6, 9)], ([a, b]) => a % b !== 0))),
  ],
  'div-3x1': [
    T('No remainder, ÷ 2 to 5', rng => makeDivision(...until(() => [randInt(rng, 100, 999), randInt(rng, 2, 5)], ([a, b]) => a % b === 0))),
    T('÷ 2 to 9', rng => makeDivision(randInt(rng, 100, 999), randInt(rng, 2, 9))),
    T('Zero in the answer: 721 ÷ 7', rng => makeDivision(...until(() => [randInt(rng, 100, 999), randInt(rng, 6, 9)], ([a, b]) => Math.floor(a / b) >= 100 && String(Math.floor(a / b)).includes('0')))),
  ],
  'div-3x2': [
    T('÷ 11 to 15', rng => divBy2Digits(rng, 11, 15)),
    T('÷ 11 to 25', rng => divBy2Digits(rng, 11, 25)),
    T('÷ 26 to 49', rng => divBy2Digits(rng, 26, 49)),
  ],

  // ---- Fractions ----
  'frac-id': [T('Halves, thirds, quarters', rng => genFracId(rng, [2, 3, 4])), T('Fifths to eighths', rng => genFracId(rng, [5, 6, 8])), T('Up to twelfths', rng => genFracId(rng, [8, 10, 12]))],
  'frac-equiv': [T('Double it: 1/2 = 2/4', rng => genFracEquiv(rng, 4, [2])), T('× 2 to 5', rng => genFracEquiv(rng, 6, [2, 3, 4, 5])), T('Bigger bottoms', rng => genFracEquiv(rng, 10, [3, 4, 5, 6]))],
  'frac-compare': [
    T('Same bottom number', rng => genFracCompare(rng, ['sameD'])),
    T('Same top number', rng => genFracCompare(rng, ['sameN', 'sameD'])),
    T('Different bottoms', rng => genFracCompare(rng, ['multiple', 'equal'])),
  ],
  'frac-add': [T('Add', rng => genFracAdd(rng, 1)), T('Add and subtract', rng => genFracAdd(rng, 2)), T('Three parts, or from 1 whole', rng => genFracAdd(rng, 3))],
  'frac-of': [
    T('1/2, 1/3, 1/4 of a number', rng => genFracOf(rng, [2, 3, 4, 5], 'yes')),
    T('Any fraction of a number', rng => genFracOf(rng, [2, 3, 4, 5, 6, 8, 10])),
    T('3/8 of 40', rng => genFracOf(rng, [6, 8, 10, 12], 'no')),
  ],

  // ---- Decimals & percents ----
  'dec-place': [T('Tenths and money', rng => genDecPlace(rng, [0, 3])), T('Hundredths and money', rng => genDecPlace(rng, [1, 3])), T('Compare decimals', rng => genDecPlace(rng, [2, 1]))],
  'dec-add': [T('Add tenths', rng => genDecAdd(rng, 1)), T('Add and subtract', rng => genDecAdd(rng, 2)), T('Line up different places', rng => genDecAdd(rng, 3))],
  'pct-intro': [T('Out of 100', rng => genPctIntro(rng, [0, 2])), T('Percents as fractions', rng => genPctIntro(rng, [0, 1])), T('Fractions as percents', rng => genPctIntro(rng, [1, 3]))],
  'pct-big': [T('10% and 50%: 10% of 500', rng => genPctBig(rng, 1)), T('20%, 25%, 5%: 20% of 500', rng => genPctBig(rng, 2)), T('Any 5%: 35% of 6,000', rng => genPctBig(rng, 3))],

  // ---- Big numbers ----
  'big-read': [T('Millions', rng => genBigRead(rng, 1)), T('Half millions and thousands', rng => genBigRead(rng, 2)), T('Billions', rng => genBigRead(rng, 3))],
  'big-addsub': [T('3M + 2M', rng => genBigAddSub(rng, 1)), T('2,400,000 + 1,300,000', rng => genBigAddSub(rng, 2)), T('5,000,000 − 250,000', rng => genBigAddSub(rng, 3))],
  'big-muldiv': [T('3M × 2', rng => genBigMulDiv(rng, 1)), T('40 × 300K', rng => genBigMulDiv(rng, 2)), T('3M × 5K: count the zeros', rng => genBigMulDiv(rng, 3))],
  'big-pct': [T('10% and 50% of 8M', rng => genBigPct(rng, 1)), T('25%, 20%, 5%', rng => genBigPct(rng, 2)), T('15%, 35%, 75%', rng => genBigPct(rng, 3))],

  // ---- Algebra ----
  'alg-missing': [T('? + 7 = 15', rng => genMissing(rng, 1)), T('6 × ? = 42', rng => genMissing(rng, 2)), T('Bigger numbers', rng => genMissing(rng, 3))],
  'alg-one': [T('x + 5 = 12', rng => genOneStep(rng, 1)), T('3x = 21, x ÷ 4 = 6', rng => genOneStep(rng, 2)), T('Bigger numbers', rng => genOneStep(rng, 3))],
  'alg-two': [T('2x + 3 = 11', rng => genTwoStep(rng, 1)), T('5x − 4 = 21, x ÷ 3 + 2 = 7', rng => genTwoStep(rng, 2)), T('3(x + 2) = 24', rng => genTwoStep(rng, 3))],
  'alg-expr': [T('x + 9, 2x', rng => genExpr(rng, 1)), T('4x + 5', rng => genExpr(rng, 2)), T('2a + 3b, x × x', rng => genExpr(rng, 3))],
  'alg-rule': [T('Add a number', rng => genRule(rng, 1)), T('Multiply', rng => genRule(rng, 2)), T('Multiply, then add', rng => genRule(rng, 3))],

  'pct-of': [T('50% and 10%', rng => genPctOf(rng, [50, 10])), T('25% and 20%', rng => genPctOf(rng, [25, 20, 50, 10])), T('75% and 5%', rng => genPctOf(rng, [75, 5, 20, 25]))],
};

export const tiersOf = skill => TIERS[skill.id];
// Steps may mark the number the walk-through should ask for as [[4]]; shown steps never contain the marks.
export const genAt = (skill, tier, rng = Math.random) => {
  const p = TIERS[skill.id][tier - 1].gen(rng);
  if (!p.steps?.some(st => st.includes('[['))) return p;
  return { ...p, walkSteps: p.steps, steps: p.steps.map(st => st.replace(/\[\[(.+?)\]\]/g, '$1')) };
};
export const tierLabel = (skill, tier) => TIERS[skill.id][tier - 1].label;

// Every skill must have exactly three tiers (checked at load so a new skill can't be forgotten).
for (const s of SKILLS) if (TIERS[s.id]?.length !== 3) throw new Error(`skill ${s.id} needs 3 tiers`);
