// Middle school math: integers, factors and multiples, fraction and decimal x and /, ratios and rates,
// percents with money, exponents and roots, more algebra, geometry, statistics and probability, graphs.
// Pure module (no DOM), unit tested. Each skill has three star tiers (MIDDLE_TIERS); `gen` is the ★★ tier.
import { randInt, pick, shuffle, gcd } from '../shared/util.js';

function until(make, ok, tries = 5000) {
  for (let i = 0; i < tries; i++) {
    const v = make();
    if (ok(v)) return v;
  }
  throw new Error('generator could not satisfy constraint');
}
const frac = (n, d) => `<span class="frac"><span>${n}</span><span>${d}</span></span>`;
const big = s => `<span class="big-num">${s}</span>`;
const neg = n => (n < 0 ? `−${-n}` : `${n}`); // typographic minus for display
const paren = n => (n < 0 ? `(${neg(n)})` : `${n}`);
const money = n => `$${n.toFixed(2)}`;
const round2 = n => Math.round(n * 100) / 100;
const fmt = n => n.toLocaleString('en-US');
const sup = (b, e) => `${b}<sup>${e}</sup>`;
const nz = (rng, lo, hi) => until(() => randInt(rng, lo, hi), x => x !== 0);

// Problem builders. int: whole-number answer that may be negative. dec: decimal answer.
const int = (prompt, answer, steps, extra = {}) => ({ kind: 'input', answerType: 'int', prompt, answer, answerText: neg(answer), steps, ...extra });
const num = (prompt, answer, steps, extra = {}) => ({ kind: 'input', prompt, answer, steps, ...extra });
const dec = (prompt, answer, steps, extra = {}) => ({ kind: 'input', answerType: 'decimal', prompt, answer: round2(answer), answerText: String(round2(answer)), steps, ...extra });
const choice = (prompt, choices, answer, steps) => ({ kind: 'choice', prompt, choices: [...new Set(choices)], answer, steps });

// ---------------- Integers ----------------

export function genIntLine(rng, level = 1) {
  if (level === 3) {
    const [a, b] = until(() => [nz(rng, -15, 15), nz(rng, -15, 15)], ([x, y]) => Math.abs(x) !== Math.abs(y) && Math.sign(x) !== Math.sign(y));
    const ans = Math.abs(a) > Math.abs(b) ? `|${neg(a)}|` : `|${neg(b)}|`;
    return choice(`Which is <b>greater</b>?`, shuffle([`|${neg(a)}|`, `|${neg(b)}|`], rng), ans,
      [`Absolute value is the distance from 0: |${neg(a)}| = ${Math.abs(a)} and |${neg(b)}| = ${Math.abs(b)}.`, `${Math.max(Math.abs(a), Math.abs(b))} is greater, so ${ans} is greater.`]);
  }
  if (level === 2) {
    const xs = until(() => Array.from({ length: 4 }, () => randInt(rng, -20, 20)), v => new Set(v).size === 4 && v.some(x => x < 0));
    const least = Math.min(...xs);
    return choice('Which number is the <b>least</b>?', shuffle(xs.map(neg), rng), neg(least),
      ['On a number line, numbers get smaller as you go left.', `${neg(least)} is farthest left, so it is the least.`]);
  }
  const [a, b] = until(() => [randInt(rng, -10, 10), randInt(rng, -10, 10)], ([x, y]) => x !== y && (x < 0 || y < 0));
  const ans = a < b ? '<' : '>';
  return choice(big(`${neg(a)} <span class="qbox">?</span> ${neg(b)}`), ['<', '>'], ans,
    [`On a number line, ${neg(Math.min(a, b))} is to the left of ${neg(Math.max(a, b))}, so it is smaller.`, `So ${neg(a)} ${ans} ${neg(b)}.`]);
}

export function genIntAbs(rng, level = 1) {
  if (level === 1) {
    const a = nz(rng, -40, 40);
    return int(`What is ${big(`|${neg(a)}|`)}?`, Math.abs(a), [`Absolute value is the distance from 0, and distance is never negative.`, `${neg(a)} is ${Math.abs(a)} steps from 0.`]);
  }
  if (level === 2) {
    const a = nz(rng, -20, 20), b = nz(rng, -20, 20), add = rng() < 0.5;
    const v = add ? Math.abs(a) + Math.abs(b) : Math.abs(a) - Math.abs(b);
    return int(big(`|${neg(a)}| ${add ? '+' : '−'} |${neg(b)}| = ?`), v, [`|${neg(a)}| = ${Math.abs(a)} and |${neg(b)}| = ${Math.abs(b)}.`, `${Math.abs(a)} ${add ? '+' : '−'} ${Math.abs(b)} = ${neg(v)}.`]);
  }
  const [a, b] = until(() => [randInt(rng, -25, 25), randInt(rng, -25, 25)], ([x, y]) => x !== y && Math.sign(x) * Math.sign(y) < 0);
  return int(`How far apart are ${big(neg(a))} and ${big(neg(b))} on a number line?`, Math.abs(a - b),
    [`One is below 0 and one is above, so add their distances from 0: ${Math.abs(a)} + ${Math.abs(b)} = ${Math.abs(a - b)}.`]);
}

export function genIntAddSub(rng, level = 1) {
  if (level === 3) {
    const [a, b, c] = [nz(rng, -15, 15), nz(rng, -15, 15), nz(rng, -15, 15)];
    const o1 = pick(['+', '−'], rng), o2 = pick(['+', '−'], rng);
    const ab = o1 === '+' ? a + b : a - b, v = o2 === '+' ? ab + c : ab - c;
    return int(big(`${neg(a)} ${o1} ${paren(b)} ${o2} ${paren(c)} = ?`), v, [`Work left to right: ${neg(a)} ${o1} ${paren(b)} = ${neg(ab)}.`, `${neg(ab)} ${o2} ${paren(c)} = ${neg(v)}.`]);
  }
  // At least one negative: that is what this skill practices (6 + 20 belongs in Addition).
  const [a, b] = until(() => [nz(rng, -20, 20), nz(rng, -20, 20)], ([x, y]) => x < 0 || y < 0);
  if (level === 1) {
    return int(big(`${neg(a)} + ${paren(b)} = ?`), a + b, [Math.sign(a) === Math.sign(b)
      ? `Same signs: add ${Math.abs(a)} + ${Math.abs(b)} = ${Math.abs(a + b)} and keep the sign.`
      : `Different signs: subtract the distances ${Math.max(Math.abs(a), Math.abs(b))} − ${Math.min(Math.abs(a), Math.abs(b))} and keep the sign of the one farther from 0.`, `${neg(a)} + ${paren(b)} = ${neg(a + b)}.`]);
  }
  return int(big(`${neg(a)} − ${paren(b)} = ?`), a - b, [`Subtracting is adding the opposite: ${neg(a)} − ${paren(b)} = ${neg(a)} + ${paren(-b)}.`, `= ${neg(a - b)}.`]);
}

const nz2 = (rng, lo, hi) => until(() => randInt(rng, lo, hi), x => Math.abs(x) >= 2); // no 0, 1 or −1
export function genIntMulDiv(rng, level = 1) {
  const [a, b] = until(() => [nz2(rng, -12, 12), nz2(rng, -12, 12)], ([x, y]) => x < 0 || y < 0);
  const sign = 'Same signs give a positive answer; different signs give a negative answer.';
  if (level === 1) return int(big(`${neg(a)} × ${paren(b)} = ?`), a * b, [sign, `${Math.abs(a)} × ${Math.abs(b)} = ${Math.abs(a * b)}, so the answer is ${neg(a * b)}.`]);
  if (level === 2) return int(big(`${neg(a * b)} ÷ ${paren(b)} = ?`), a, [sign, `${Math.abs(a * b)} ÷ ${Math.abs(b)} = ${Math.abs(a)}, so the answer is ${neg(a)}.`]);
  const c = pick([-2, 2, -3, 3, -4, 4], rng);
  const [x, y] = until(() => [nz2(rng, -9, 9), nz2(rng, -9, 9)], ([p, q]) => (p * q) % c === 0 && Math.abs((p * q) / c) >= 2);
  const v = (x * y) / c;
  return int(big(`${neg(x)} × ${paren(y)} ÷ ${paren(c)} = ?`), v, [`Left to right: ${neg(x)} × ${paren(y)} = ${neg(x * y)}.`, `${neg(x * y)} ÷ ${paren(c)} = ${neg(v)}.`]);
}

// ---------------- Factors & multiples ----------------

const factorsOf = n => Array.from({ length: n }, (_, i) => i + 1).filter(d => n % d === 0);
const lcm = (a, b) => (a * b) / gcd(a, b);

export function genFactor(rng, level = 1) {
  if (level === 1) {
    const n = pick([12, 18, 20, 24, 28, 30, 36, 40, 42, 48], rng);
    const yes = pick(factorsOf(n).filter(d => d > 1 && d < n), rng);
    const nos = shuffle(Array.from({ length: 11 }, (_, i) => i + 2).filter(d => n % d !== 0), rng).slice(0, 3);
    return choice(`Which number is a <b>factor</b> of ${big(n)}?`, shuffle([yes, ...nos].map(String), rng), String(yes), [`A factor of ${n} divides it exactly, with no remainder.`, `${n} ÷ ${yes} = ${n / yes}, so ${yes} is a factor (${yes} × ${n / yes} = ${n}).`, `The others leave a remainder: ${nos.map(d => `${n} ÷ ${d} = ${Math.floor(n / d)} R ${n % d}`).join(', ')}.`]);
  }
  const [a, b] = until(() => {
    const g = randInt(rng, 2, level === 2 ? 9 : 15);
    return [g * randInt(rng, 2, level === 2 ? 6 : 10), g * randInt(rng, 2, level === 2 ? 6 : 10)];
  }, ([x, y]) => x !== y && gcd(x, y) > 1);
  const g = gcd(a, b);
  return num(`What is the <b>greatest common factor</b> of ${big(a)} and ${big(b)}?`, g,
    [`Factors of ${a}: ${factorsOf(a).join(', ')}.`, `Factors of ${b}: ${factorsOf(b).join(', ')}.`, `The biggest one in both lists is ${g}.`]);
}

export function genMultiple(rng, level = 1) {
  if (level === 3) {
    const [a, b] = until(() => [randInt(rng, 4, 15), randInt(rng, 4, 15)], ([x, y]) => x !== y && lcm(x, y) <= 90 && lcm(x, y) !== Math.max(x, y));
    return num(`One bus comes every <b>${a} minutes</b> and another every <b>${b} minutes</b>. They both just left. In how many minutes will they leave together again?`, lcm(a, b),
      ['"Together again" means a common multiple: find the least common multiple.', `Multiples of ${a}: ${Array.from({ length: lcm(a, b) / a }, (_, i) => a * (i + 1)).join(', ')}. The first one ${b} also divides is ${lcm(a, b)}.`]);
  }
  const [a, b] = until(() => [randInt(rng, 2, level === 1 ? 8 : 12), randInt(rng, 2, level === 1 ? 8 : 12)], ([x, y]) => x !== y && lcm(x, y) !== Math.max(x, y) && (level > 1 || lcm(x, y) <= 40));
  const m = lcm(a, b);
  return num(`What is the <b>least common multiple</b> of ${big(a)} and ${big(b)}?`, m,
    [`Count by ${Math.max(a, b)}s: ${Array.from({ length: m / Math.max(a, b) }, (_, i) => Math.max(a, b) * (i + 1)).join(', ')}.`, `The first one that ${Math.min(a, b)} also divides is ${m}.`]);
}

// ---------------- Fraction and decimal x and / ----------------

export function genFracMulDiv(rng, level = 1) {
  if (level === 1) {
    const d = randInt(rng, 2, 8), n = randInt(rng, 1, d - 1), w = randInt(rng, 2, 9);
    return { kind: 'fraction', prompt: big(`${frac(n, d)} × ${w} =`), answer: { n: n * w, d }, steps: [`${n}/${d} × ${w} means ${w} groups of ${n}/${d}. The pieces stay the same size (${d}ths).`, `Multiply the top by ${w}: ${n} × ${w} = ${n * w}. Keep the bottom: ${n * w}/${d}.`] };
  }
  const [a, b, c, d] = [randInt(rng, 1, 7), randInt(rng, 2, 9), randInt(rng, 1, 7), randInt(rng, 2, 9)];
  const [n1, d1] = a < b ? [a, b] : [b - 1 || 1, b];
  const [n2, d2] = c < d ? [c, d] : [d - 1 || 1, d];
  if (level === 2) {
    return { kind: 'fraction', prompt: big(`${frac(n1, d1)} × ${frac(n2, d2)} =`), answer: { n: n1 * n2, d: d1 * d2 }, steps: [`Multiply tops: ${n1} × ${n2} = ${n1 * n2}. Multiply bottoms: ${d1} × ${d2} = ${d1 * d2}.`, `Answer: ${n1 * n2}/${d1 * d2} (any equal fraction is fine).`] };
  }
  return { kind: 'fraction', prompt: big(`${frac(n1, d1)} ÷ ${frac(n2, d2)} =`), answer: { n: n1 * d2, d: d1 * n2 },
    steps: [`Dividing by a fraction is multiplying by its flip: ${n1}/${d1} × ${d2}/${n2}.`, `= ${n1 * d2}/${d1 * n2} (any equal fraction is fine).`] };
}

export function genDecMulDiv(rng, level = 1) {
  if (level === 1) {
    const a = randInt(rng, 2, 9) / 10 + randInt(rng, 0, 9), b = randInt(rng, 2, 9);
    return dec(big(`${a} × ${b} = ?`), a * b, [`Multiply as if there were no point: ${Math.round(a * 10)} × ${b} = ${Math.round(a * 10) * b}.`, `${a} has 1 decimal place, so the answer has 1: ${round2(a * b)}.`]);
  }
  if (level === 2) {
    const a = randInt(rng, 11, 49) / 10, b = randInt(rng, 2, 9) / 10;
    return dec(big(`${a} × ${b} = ?`), a * b, [`Multiply without the points: ${Math.round(a * 10)} × ${Math.round(b * 10)} = ${Math.round(a * 10) * Math.round(b * 10)}.`, `Count decimal places: 1 + 1 = 2, so the answer is ${round2(a * b)}.`]);
  }
  const b = randInt(rng, 2, 9) / 10, q = randInt(rng, 2, 12), a = round2(b * q);
  return dec(big(`${a} ÷ ${b} = ?`), q, [`Move both points one place right: ${a} ÷ ${b} is the same as ${round2(a * 10)} ÷ ${Math.round(b * 10)}.`, `${round2(a * 10)} ÷ ${Math.round(b * 10)} = ${q}.`]);
}

// ---------------- Ratios & rates ----------------

const THINGS = [['🔴', 'red'], ['🔵', 'blue'], ['🟢', 'green'], ['🟡', 'yellow']];

export function genRatio(rng, level = 1) {
  if (level === 1) {
    const [[e1, n1], [e2, n2]] = shuffle(THINGS, rng).slice(0, 2), a = randInt(rng, 2, 6), b = until(() => randInt(rng, 2, 6), x => x !== a);
    const ans = `${a} : ${b}`;
    return choice(`${e1.repeat(a)} ${e2.repeat(b)}<br>What is the ratio of <b>${n1}</b> to <b>${n2}</b>?`, shuffle([ans, `${b} : ${a}`, `${a} : ${a + b}`, `${b} : ${a + b}`], rng), ans,
      [`Count ${n1} first (${a}), then ${n2} (${b}). The order matters: ${ans}.`]);
  }
  if (level === 2) {
    const a = randInt(rng, 1, 7), b = until(() => randInt(rng, 2, 9), x => x !== a && gcd(a, x) === 1), k = randInt(rng, 2, 8);
    return num(big(`${a} : ${b} = <span class="qbox">?</span> : ${b * k}`), a * k, [`${b} became ${b * k}: that is × ${k}.`, `Do the same to the other side: ${a} × ${k} = ${a * k}.`]);
  }
  const a = randInt(rng, 1, 5), b = until(() => randInt(rng, 2, 7), x => x !== a), k = randInt(rng, 3, 10), total = (a + b) * k;
  return num(`Boys and girls in a club are in the ratio <b>${a} : ${b}</b>. There are <b>${total}</b> kids in all. How many are <b>boys</b>?`, a * k,
    [`The ratio has ${a} + ${b} = ${a + b} parts.`, `Each part is ${total} ÷ ${a + b} = ${k} kids.`, `Boys are ${a} parts: ${a} × ${k} = ${a * k}.`]);
}

export function genRate(rng, level = 1) {
  if (level === 1) {
    const h = randInt(rng, 2, 6), r = randInt(rng, 3, 15) * 5;
    return num(`A car goes <b>${r * h} miles</b> in <b>${h} hours</b>. How many miles is that <b>per hour</b>?`, r, [`"Per hour" means in 1 hour, so share the miles equally over the ${h} hours.`, `Miles ÷ hours = ${r * h} ÷ ${h} = ${r}.`, `Check: ${r} × ${h} = ${r * h} miles.`], { suffix: 'mph' });
  }
  if (level === 2) {
    const n = pick([3, 4, 5, 6, 8], rng), each = randInt(rng, 25, 250) / 100;
    const total = round2(each * n);
    return dec(`<b>${n}</b> notebooks cost <b>${money(total)}</b>. How much is <b>one</b> notebook? $ ___`, total / n, [`The price for one is the total shared by the number of notebooks.`, `${money(total)} ÷ ${n} = ${money(total / n)}.`, `Check: ${money(total / n)} × ${n} = ${money(total)}.`]);
  }
  const [n1, n2] = shuffle([3, 4, 5, 6, 8, 10], rng).slice(0, 2), p1 = randInt(rng, 40, 120) / 100, p2 = until(() => randInt(rng, 40, 120) / 100, x => Math.abs(x - p1) > 0.08);
  const A = `${n1} for ${money(p1 * n1)}`, B = `${n2} for ${money(p2 * n2)}`;
  const better = p1 < p2 ? A : B;
  return choice('Which is the <b>better buy</b> (cheaper for each one)?', [A, B], better,
    [`${A}: ${money(p1 * n1)} ÷ ${n1} = ${money(p1)} each.`, `${B}: ${money(p2 * n2)} ÷ ${n2} = ${money(p2)} each.`, `${better} costs less for each one.`]);
}

export function genProportion(rng, level = 1) {
  const a = randInt(rng, 1, 8), b = until(() => randInt(rng, 2, 9), x => x !== a), k = randInt(rng, 2, level === 1 ? 5 : 9);
  if (level === 1) return num(big(`${frac(a, b)} = ${frac('x', b * k)}`) + '<br>What is x?', a * k, [`Equal fractions: whatever you do to the bottom, do to the top.`, `The bottom went from ${b} to ${b * k}: that is × ${k}.`, `So multiply the top by ${k} too: ${a} × ${k} = ${a * k}.`]);
  if (level === 2) return num(big(`${frac('x', b)} = ${frac(a * k, b * k)}`) + '<br>What is x?', a, [`Equal fractions: whatever you do to the bottom, do to the top.`, `The bottom goes from ${b * k} to ${b}: that is ÷ ${k}.`, `So divide the top by ${k} too: ${a * k} ÷ ${k} = ${a}.`]);
  const cups = randInt(rng, 2, 4), cookies = cups * randInt(rng, 6, 12), want = cookies * pick([2, 3], rng) / cups * pick([1, 2], rng);
  const ans = (want / cookies) * cups;
  return num(`A recipe uses <b>${cups} cups</b> of flour for <b>${cookies} cookies</b>. How many cups for <b>${want} cookies</b>?`, ans,
    [`Set up ${cups}/${cookies} = x/${want}.`, `${want} ÷ ${cookies} = ${want / cookies}, so x = ${cups} × ${want / cookies} = ${ans}.`]);
}

const CONVERT = [
  // [from, to, factor, level]
  ['feet', 'inches', 12, 1], ['yards', 'feet', 3, 1], ['hours', 'minutes', 60, 1], ['minutes', 'seconds', 60, 1], ['weeks', 'days', 7, 1],
  ['meters', 'centimeters', 100, 2], ['kilometers', 'meters', 1000, 2], ['kilograms', 'grams', 1000, 2], ['gallons', 'quarts', 4, 2], ['quarts', 'cups', 4, 2], ['pounds', 'ounces', 16, 2],
];
export function genConvert(rng, level = 1) {
  if (level === 3) {
    const [from, to, f] = pick(CONVERT.filter(c => c[2] >= 12), rng), v = randInt(rng, 1, 9) + 0.5;
    return dec(`${big(`${v} ${from}`)} = ? ${to}`, v * f, [`1 ${from.replace(/s$/, '')} = ${f} ${to}.`, `${v} × ${f} = ${round2(v * f)} ${to}.`]);
  }
  const [from, to, f] = pick(CONVERT.filter(c => c[3] === level), rng), v = randInt(rng, 2, 9);
  return rng() < 0.6
    ? num(`${big(`${v} ${from}`)} = ? ${to}`, v * f, [`1 ${from.replace(/s$/, '')} = ${f} ${to}. Big unit to small unit: multiply.`, `${v} × ${f} = ${v * f}.`])
    : num(`${big(`${fmt(v * f)} ${to}`)} = ? ${from}`, v, [`${f} ${to} make 1 ${from.replace(/s$/, '')}. Small unit to big unit: divide.`, `${fmt(v * f)} ÷ ${f} = ${v}.`]);
}

// ---------------- Percents & money ----------------

export function genTaxTip(rng, level = 1) {
  if (level === 1) {
    const bill = randInt(rng, 2, 12) * 10, p = pick([10, 20], rng);
    return dec(`Lunch costs <b>${money(bill)}</b>. You leave a <b>${p}%</b> tip. How much is the tip? $ ___`, (bill * p) / 100, [`10% of ${money(bill)} is ${money(bill / 10)}.`, p === 20 ? `20% is double that: ${money(bill / 5)}.` : `So the tip is ${money(bill / 10)}.`]);
  }
  if (level === 2) {
    const price = randInt(rng, 5, 40) * 5, p = pick([5, 6, 8], rng), tax = (price * p) / 100;
    return dec(`A game costs <b>${money(price)}</b> and sales tax is <b>${p}%</b>. What is the <b>total</b>? $ ___`, price + tax, [`Tax: ${p}% of ${money(price)} = ${money(price)} × ${p / 100} = ${money(tax)}.`, `Total: ${money(price)} + ${money(tax)} = ${money(price + tax)}.`]);
  }
  const bill = randInt(rng, 4, 16) * 5, p = pick([15, 18, 20], rng), tip = (bill * p) / 100;
  return dec(`A dinner bill is <b>${money(bill)}</b>. With a <b>${p}%</b> tip, what is the <b>total</b>? $ ___`, bill + tip, [`Tip: ${p}% of ${money(bill)} = ${money(tip)}.`, `Total: ${money(bill)} + ${money(tip)} = ${money(bill + tip)}.`]);
}

export function genDiscount(rng, level = 1) {
  const price = randInt(rng, 4, 30) * 5;
  if (level === 3) {
    const cost = randInt(rng, 4, 20) * 5, p = pick([20, 25, 40, 50], rng);
    return dec(`A store buys a jacket for <b>${money(cost)}</b> and marks it up <b>${p}%</b>. What is the store price? $ ___`, cost * (1 + p / 100), [`Markup: ${p}% of ${money(cost)} = ${money((cost * p) / 100)}.`, `Price: ${money(cost)} + ${money((cost * p) / 100)} = ${money(cost * (1 + p / 100))}.`]);
  }
  const p = level === 1 ? pick([10, 50], rng) : pick([20, 25, 30, 40], rng);
  const off = (price * p) / 100;
  return dec(`Shoes cost <b>${money(price)}</b>. They are <b>${p}% off</b>. What is the sale price? $ ___`, price - off, [`Discount: ${p}% of ${money(price)} = ${money(off)}.`, `Sale price: ${money(price)} − ${money(off)} = ${money(price - off)}.`]);
}

export function genInterest(rng, level = 1) {
  const P = randInt(rng, 2, 20) * 100, r = pick([2, 3, 4, 5, 6], rng), t = level === 1 ? 1 : randInt(rng, 2, 5);
  const I = (P * r * t) / 100;
  if (level === 3) return dec(`You put <b>${money(P)}</b> in a bank at <b>${r}%</b> simple interest per year. How much money do you have after <b>${t} years</b>? $ ___`, P + I, [`Interest = principal × rate × time = ${money(P)} × ${r / 100} × ${t} = ${money(I)}.`, `Total: ${money(P)} + ${money(I)} = ${money(P + I)}.`]);
  return dec(`<b>${money(P)}</b> earns <b>${r}%</b> simple interest per year. How much interest after <b>${t} year${t > 1 ? 's' : ''}</b>? $ ___`, I, [`Interest = principal × rate × time.`, `${money(P)} × ${r / 100} × ${t} = ${money(I)}.`]);
}

export function genPctChange(rng, level = 1) {
  const p = level === 1 ? pick([10, 20, 25, 50], rng) : pick([10, 20, 25, 30, 40, 50, 75], rng);
  const from = randInt(rng, 2, 16) * (p === 75 || p === 25 ? 20 : 10);
  if (level === 3) {
    const up = rng() < 0.5, to = up ? from + (from * p) / 100 : from - (from * p) / 100;
    return num(`A price of <b>${fmt(from)}</b> ${up ? 'goes up' : 'goes down'} by <b>${p}%</b>. What is the new price?`, to, [`${p}% of ${fmt(from)} = ${fmt((from * p) / 100)}.`, `${fmt(from)} ${up ? '+' : '−'} ${fmt((from * p) / 100)} = ${fmt(to)}.`]);
  }
  const up = level === 1 || rng() < 0.4, to = up ? from + (from * p) / 100 : from - (from * p) / 100;
  return num(`A number ${up ? 'grows' : 'drops'} from <b>${fmt(from)}</b> to <b>${fmt(to)}</b>. What is the percent ${up ? 'increase' : 'decrease'}?`, p,
    [`Change: ${fmt(Math.abs(to - from))}.`, `Percent change = change ÷ original = ${fmt(Math.abs(to - from))} ÷ ${fmt(from)} = ${p / 100} = ${p}%.`], { suffix: '%', answerText: `${p}%` });
}

// ---------------- Exponents, order of operations, scientific notation, roots ----------------

export function genPower(rng, level = 1) {
  if (level === 1) {
    const b = randInt(rng, 2, 6), e = randInt(rng, 2, b <= 3 ? 4 : 3);
    return num(big(`${sup(b, e)} = ?`), b ** e, [`The small ${e} is the exponent: it says how many ${b}s to multiply. It is not ${b} × ${e}.`, `${sup(b, e)} = ${Array(e).fill(b).join(' × ')}.`, `Multiply step by step: ${Array.from({ length: e - 1 }, (_, i) => `${b ** (i + 1)} × ${b} = ${b ** (i + 2)}`).join(', then ')}. So ${sup(b, e)} = ${b ** e}.`]);
  }
  if (level === 2) {
    const [b, e] = pick([[10, randInt(rng, 2, 7)], [5, 3], [5, 4], [3, 4], [3, 5], [2, 5], [2, 6], [2, 7], [4, 3], [6, 3], [7, 3], [8, 3], [11, 2], [12, 2], [13, 2], [15, 2], [20, 2], [9, 3]], rng);
    return num(big(`${sup(b, e)} = ?`), b ** e, [`${Array(e).fill(b).join(' × ')} = ${fmt(b ** e)}.`, b === 10 ? `Shortcut: 10 to the power ${e} is 1 followed by ${e} zeros.` : `Multiply one step at a time.`]);
  }
  if (rng() < 0.5) {
    const b = randInt(rng, 2, 9), e = pick([2, 3], rng), v = (-b) ** e;
    return int(big(`(−${b})<sup>${e}</sup> = ?`), v, [`(−${b})<sup>${e}</sup> = ${Array(e).fill(`(−${b})`).join(' × ')}.`, `An ${e === 2 ? 'even' : 'odd'} number of negatives gives a ${e === 2 ? 'positive' : 'negative'} answer: ${neg(v)}.`]);
  }
  const [a, b] = [randInt(rng, 2, 3), randInt(rng, 2, 7)];
  return num(big(`${sup(2, a + 1)} × ${sup(3, 2)} − ${sup(b, 2)} = ?`), 2 ** (a + 1) * 9 - b * b, [`Work out the powers first: ${2 ** (a + 1)} × 9 − ${b * b}.`, `${2 ** (a + 1) * 9} − ${b * b} = ${2 ** (a + 1) * 9 - b * b}.`]);
}

export function genOrderOps(rng, level = 1) {
  const a = randInt(rng, 2, 9), b = randInt(rng, 2, 9), c = randInt(rng, 2, 9), d = randInt(rng, 1, 9);
  if (level === 1) return num(big(`${a} + ${b} × ${c} = ?`), a + b * c, ['Multiply before you add.', `${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${a + b * c}.`]);
  if (level === 2) {
    const v = (a + b) * c - d;
    return num(big(`(${a} + ${b}) × ${c} − ${d} = ?`), v, ['Parentheses first.', `${a} + ${b} = ${a + b}; ${a + b} × ${c} = ${(a + b) * c}; ${(a + b) * c} − ${d} = ${v}.`]);
  }
  const e = pick([2, 3], rng), x = randInt(rng, 2, 4), v = a * x ** e - b * c + d;
  return int(big(`${a} × ${sup(x, e)} − ${b} × ${c} + ${d} = ?`), v, ['Powers first, then × and ÷, then + and − from left to right.', `${sup(x, e)} = ${x ** e}; ${a} × ${x ** e} = ${a * x ** e}; ${b} × ${c} = ${b * c}.`, `${a * x ** e} − ${b * c} + ${d} = ${neg(v)}.`]);
}

export function genSciNote(rng, level = 1) {
  if (level === 1) {
    const m = randInt(rng, 2, 9), e = randInt(rng, 3, 6);
    return num(`Write ${big(`${m} × ${sup(10, e)}`)} as a regular number.`, m * 10 ** e, [`× ${sup(10, e)} moves the point ${e} places right (adds ${e} zeros): ${fmt(m * 10 ** e)}.`]);
  }
  if (level === 2) {
    const m = randInt(rng, 11, 99) / 10, e = randInt(rng, 3, 8), n = Math.round(m * 10 ** e);
    return num(`${big(fmt(n))} = ${m} × 10<sup><span class="qbox">?</span></sup>`, e, [`Move the point from the end of ${fmt(n)} to just after the first digit: that is ${e} places.`, `So ${fmt(n)} = ${m} × ${sup(10, e)}.`]);
  }
  const m = randInt(rng, 2, 9), e = randInt(rng, 2, 5), s = `0.${'0'.repeat(e - 1)}${m}`;
  return int(`${big(s)} = ${m} × 10<sup><span class="qbox">?</span></sup>`, -e, [`Small numbers use a negative power of 10.`, `Move the point ${e} places right to get ${m}, so the power is −${e}.`]);
}

export function genRoot(rng, level = 1) {
  if (level === 1) {
    const r = randInt(rng, 2, 12);
    return num(big(`√${r * r} = ?`), r, [`√ asks: which number times itself makes ${r * r}?`, `Try ${r}: ${r} × ${r} = ${r * r}. That works.`, `So √${r * r} = ${r}.`]);
  }
  if (level === 2) {
    if (rng() < 0.5) { const r = randInt(rng, 2, 10); return num(big(`∛${r ** 3} = ?`), r, [`∛ asks: which number used 3 times in a multiplication makes ${r ** 3}?`, `Try ${r}: ${r} × ${r} = ${r * r}, and ${r * r} × ${r} = ${r ** 3}.`, `So ∛${r ** 3} = ${r}.`]); }
    const r = randInt(rng, 11, 20);
    return num(big(`√${r * r} = ?`), r, [`√ asks: which number times itself makes ${r * r}?`, `It is more than 10 × 10 = 100, so try numbers above 10.`, `${r} × ${r} = ${r * r}, so √${r * r} = ${r}.`]);
  }
  const n = until(() => randInt(rng, 5, 140), x => !Number.isInteger(Math.sqrt(x)));
  const lo = Math.floor(Math.sqrt(n)), ans = `${lo} and ${lo + 1}`;
  return choice(`${big(`√${n}`)} is between which two whole numbers?`, shuffle([ans, `${lo - 1} and ${lo}`, `${lo + 1} and ${lo + 2}`, `${Math.floor(n / 2)} and ${Math.floor(n / 2) + 1}`].filter((v, i, a) => a.indexOf(v) === i), rng), ans,
    [`${lo}² = ${lo * lo} and ${lo + 1}² = ${(lo + 1) ** 2}.`, `${n} is between them, so √${n} is between ${lo} and ${lo + 1}.`]);
}

// ---------------- More algebra ----------------

const X = '<i class="var">x</i>';
export function genLikeTerms(rng, level = 1) {
  const a = randInt(rng, 2, 9), b = randInt(rng, 2, 9), c = randInt(rng, 1, 9);
  if (level === 1) {
    const sub = rng() < 0.4 && a > b;
    return num(`${big(`${a}${X} ${sub ? '−' : '+'} ${b}${X} = <span class="qbox">?</span>${X}`)}`, sub ? a - b : a + b, ['Like terms have the same letter, so combine their numbers.', `${a} ${sub ? '−' : '+'} ${b} = ${sub ? a - b : a + b}.`]);
  }
  if (level === 2) return num(big(`${a}(${X} + ${c}) = ${a}${X} + <span class="qbox">?</span>`), a * c, [`Distribute: multiply ${a} by each part inside.`, `${a} × x = ${a}x and ${a} × ${c} = ${a * c}.`]);
  const ans = `${a + b}x + ${a * c}`;
  return choice(`Simplify ${big(`${a}(${X} + ${c}) + ${b}${X}`)}`, shuffle([ans, `${a + b}x + ${c}`, `${a * b}x + ${a * c}`, `${a}x + ${a * c + b}`], rng), ans,
    [`Distribute: ${a}(x + ${c}) = ${a}x + ${a * c}.`, `Combine like terms: ${a}x + ${b}x = ${a + b}x. Answer: ${ans}.`]);
}

export function genInequality(rng, level = 1) {
  if (level === 1) {
    const k = randInt(rng, 2, 15), v = randInt(rng, 0, 20), op = pick(['>', '<', '≥', '≤'], rng);
    const ok = { '>': v > k, '<': v < k, '≥': v >= k, '≤': v <= k }[op];
    return choice(`Is ${big(v)} a solution of ${big(`${X} ${op} ${k}`)}?`, ['Yes', 'No'], ok ? 'Yes' : 'No', [`${{ '>': '> means greater than', '<': '< means less than', '≥': '≥ means greater than or equal to', '≤': '≤ means less than or equal to' }[op]}.`, `Put ${v} in for x: is ${v} ${op} ${k}? ${ok ? 'Yes, that is true.' : 'No, that is false.'}`, ok ? `So ${v} is a solution.` : `So ${v} is not a solution.`]);
  }
  const a = level === 2 ? 1 : randInt(rng, 2, 6), x = randInt(rng, 1, 12), b = randInt(rng, 1, 12), op = pick(['>', '<', '≥', '≤'], rng);
  const left = level === 2 ? `${X} + ${b}` : `${a}${X} + ${b}`;
  const ans = `x ${op} ${x}`;
  const flip = { '>': '<', '<': '>', '≥': '≤', '≤': '≥' }[op];
  return choice(`Solve ${big(`${left} ${op} ${a * x + b}`)}`, shuffle([...new Set([ans, `x ${flip} ${x}`, `x ${op} ${a * x + 2 * b}`, `x ${op} ${x + 1}`])], rng), ans,
    [`Take away ${b} from both sides: ${a > 1 ? `${a}x` : 'x'} ${op} ${a * x}.`, a > 1 ? `Divide both sides by ${a}: x ${op} ${x}.` : `So x ${op} ${x}.`]);
}

// ---------------- Geometry ----------------

export function genAngles(rng, level = 1) {
  if (level === 1) {
    const a = randInt(rng, 10, 80);
    return num(`Two angles are <b>complementary</b> (they add to 90°). One is <b>${a}°</b>. What is the other?`, 90 - a, [`Complementary angles make a right angle: together they are 90°.`, `So take away the angle you know: 90 − ${a} = ${90 - a}.`, `Check: ${a} + ${90 - a} = 90.`], { suffix: '°' });
  }
  if (level === 2) {
    const a = randInt(rng, 20, 160);
    return num(`Two angles are <b>supplementary</b> (they add to 180°). One is <b>${a}°</b>. What is the other?`, 180 - a, [`Supplementary angles make a straight line: together they are 180°.`, `So take away the angle you know: 180 − ${a} = ${180 - a}.`, `Check: ${a} + ${180 - a} = 180.`], { suffix: '°' });
  }
  if (rng() < 0.5) {
    const [a, b] = until(() => [randInt(rng, 20, 100), randInt(rng, 20, 100)], ([p, q]) => p + q < 165);
    return num(`A triangle has angles of <b>${a}°</b> and <b>${b}°</b>. What is the third angle?`, 180 - a - b, ['The angles of a triangle add up to 180°.', `180 − ${a} − ${b} = ${180 - a - b}.`], { suffix: '°' });
  }
  const a = randInt(rng, 25, 155);
  return num(`Two lines cross. One angle is <b>${a}°</b>. What is the angle <b>vertical</b> (opposite) to it?`, a, ['Vertical angles are opposite each other where two lines cross, and they are always equal.', `So it is also ${a}°.`], { suffix: '°' });
}

export function genArea(rng, level = 1) {
  const a = randInt(rng, 3, 15), b = randInt(rng, 3, 15);
  if (level === 1) return num(`A rectangle is <b>${a} cm</b> long and <b>${b} cm</b> wide. What is its <b>area</b>?`, a * b, [`Area is how many 1 cm squares cover the shape.`, `A rectangle is ${b} rows of ${a} squares, so area = length × width.`, `${a} × ${b} = ${a * b} square cm.`], { suffix: 'cm²' });
  if (level === 2) {
    if (rng() < 0.5) { const h = randInt(rng, 2, 10) * 2; return num(`A triangle has a base of <b>${a} m</b> and a height of <b>${h} m</b>. What is its area?`, (a * h) / 2, [`Area of a triangle = base × height ÷ 2.`, `${a} × ${h} ÷ 2 = ${(a * h) / 2}.`], { suffix: 'm²' }); }
    return num(`A parallelogram has a base of <b>${a} ft</b> and a height of <b>${b} ft</b>. What is its area?`, a * b, [`Area of a parallelogram = base × height = ${a} × ${b} = ${a * b}.`], { suffix: 'ft²' });
  }
  const t = randInt(rng, 2, 10), bt = t + randInt(rng, 2, 8), h = randInt(rng, 1, 6) * 2;
  return num(`A trapezoid has parallel sides of <b>${t} in</b> and <b>${bt} in</b> and a height of <b>${h} in</b>. What is its area?`, ((t + bt) * h) / 2,
    ['Area of a trapezoid = (top + bottom) × height ÷ 2.', `(${t} + ${bt}) × ${h} ÷ 2 = ${((t + bt) * h) / 2}.`], { suffix: 'in²' });
}

export function genCircle(rng, level = 1) {
  const r = randInt(rng, 2, 20);
  if (level === 1) return dec(`A circle has a <b>diameter of ${2 * r} cm</b>. What is its <b>circumference</b>? (Use π = 3.14)`, 3.14 * 2 * r, ['Circumference is the distance around the circle. It is always a bit more than 3 diameters: π × diameter.', `3.14 × ${2 * r} = ${round2(3.14 * 2 * r)}.`], { suffix: 'cm' });
  if (level === 2) return dec(`A circle has a <b>radius of ${r} m</b>. What is its <b>area</b>? (Use π = 3.14)`, 3.14 * r * r, ['Area = π × radius × radius.', `3.14 × ${r} × ${r} = ${round2(3.14 * r * r)}.`], { suffix: 'm²' });
  return dec(`A round table is <b>${2 * r} feet across</b>. What is the area of its top? (Use π = 3.14)`, 3.14 * r * r, [`The radius is half of ${2 * r}: ${r}.`, `Area = 3.14 × ${r} × ${r} = ${round2(3.14 * r * r)}.`], { suffix: 'ft²' });
}

export function genVolume(rng, level = 1) {
  const l = randInt(rng, 2, 10), w = randInt(rng, 2, 8), h = randInt(rng, 2, 9);
  if (level === 1) return num(`A box is <b>${l} cm</b> long, <b>${w} cm</b> wide and <b>${h} cm</b> tall. What is its <b>volume</b>?`, l * w * h, ['Volume of a box = length × width × height.', `${l} × ${w} × ${h} = ${l * w * h}.`], { suffix: 'cm³' });
  if (level === 2) {
    const sa = 2 * (l * w + l * h + w * h);
    return num(`A box is <b>${l} in</b> × <b>${w} in</b> × <b>${h} in</b>. What is its <b>surface area</b>?`, sa, ['A box has 3 pairs of faces.', `2 × (${l}×${w} + ${l}×${h} + ${w}×${h}) = 2 × ${l * w + l * h + w * h} = ${sa}.`], { suffix: 'in²' });
  }
  const r = randInt(rng, 1, 6);
  return dec(`A can has a <b>radius of ${r} cm</b> and a <b>height of ${h} cm</b>. What is its volume? (Use π = 3.14)`, 3.14 * r * r * h, ['Volume of a cylinder = π × r × r × height.', `3.14 × ${r} × ${r} × ${h} = ${round2(3.14 * r * r * h)}.`], { suffix: 'cm³' });
}

// Whole-number right triangles: the basic triples and their multiples (hypotenuse up to 65).
const BASE_TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41], [12, 35, 37], [11, 60, 61]];
const TRIPLES = BASE_TRIPLES.flatMap(([a, b, c]) => Array.from({ length: Math.floor(65 / c) }, (_, k) => [a * (k + 1), b * (k + 1), c * (k + 1)]));
export function genPythag(rng, level = 1) {
  const t = pick(level === 1 ? TRIPLES.filter(x => x[2] <= 30) : TRIPLES, rng);
  const [a, b, c] = rng() < 0.5 ? t : [t[1], t[0], t[2]];
  if (level === 1) return num(`A right triangle has legs of <b>${a}</b> and <b>${b}</b>. How long is the <b>hypotenuse</b>?`, c, ['a² + b² = c².', `${a * a} + ${b * b} = ${c * c}, and √${c * c} = ${c}.`]);
  if (level === 2) return num(`A right triangle has a leg of <b>${a}</b> and a hypotenuse of <b>${c}</b>. How long is the other leg?`, b, ['a² + b² = c², so b² = c² − a².', `${c * c} − ${a * a} = ${b * b}, and √${b * b} = ${b}.`]);
  return num(`A <b>${c} ft</b> ladder leans on a wall. Its foot is <b>${a} ft</b> from the wall. How high up the wall does it reach?`, b, ['The wall, ground and ladder make a right triangle; the ladder is the hypotenuse.', `${c}² − ${a}² = ${c * c} − ${a * a} = ${b * b}, and √${b * b} = ${b}.`], { suffix: 'ft' });
}

export function genScale(rng, level = 1) {
  if (level === 1) {
    const s = pick([2, 5, 10, 20], rng), d = randInt(rng, 2, 12);
    return num(`On a map, <b>1 cm = ${s} km</b>. Two towns are <b>${d} cm</b> apart on the map. How far apart are they really?`, s * d, [`The scale says every 1 cm on the map is ${s} km in real life.`, `${d} cm is ${d} of those: ${d} × ${s} = ${s * d} km.`], { suffix: 'km' });
  }
  if (level === 2) {
    const a = randInt(rng, 2, 9), k = randInt(rng, 2, 5), b = randInt(rng, 2, 9);
    return num(`Two triangles are <b>similar</b>. A side of <b>${a}</b> in the small one matches a side of <b>${a * k}</b> in the big one. Another small side is <b>${b}</b>. What is the matching big side?`, b * k,
      [`Similar shapes grow by the same scale factor: ${a * k} ÷ ${a} = ${k}.`, `${b} × ${k} = ${b * k}.`]);
  }
  const s = pick([2.5, 4, 1.5, 25], rng), d = randInt(rng, 2, 8);
  return dec(`A drawing uses <b>1 in = ${s} ft</b>. A room is <b>${d} in</b> long in the drawing. How long is the real room?`, s * d, [`The scale says every 1 inch in the drawing is ${s} ft in real life.`, `${d} inches is ${d} of those: ${d} × ${s} = ${round2(s * d)} ft.`], { suffix: 'ft' });
}

// ---------------- Statistics & probability ----------------

export function genStats(rng, level = 1) {
  if (level === 1) {
    const n = randInt(rng, 3, 5), mean = randInt(rng, 4, 20);
    const xs = until(() => { const v = Array.from({ length: n - 1 }, () => randInt(rng, 1, 30)); return [...v, mean * n - v.reduce((s, x) => s + x, 0)]; }, v => v[n - 1] >= 0 && v[n - 1] <= 40);
    return num(`What is the <b>mean</b> (average) of ${big(shuffle(xs, rng).join(', '))}?`, mean, [`Add them: ${xs.reduce((s, x) => s + x, 0)}.`, `Divide by how many there are (${n}): ${xs.reduce((s, x) => s + x, 0)} ÷ ${n} = ${mean}.`]);
  }
  if (level === 2) {
    const n = pick([5, 7, 6], rng);
    const xs = until(() => Array.from({ length: n }, () => randInt(rng, 1, 40)), v => n % 2 === 1 || (([...v].sort((p, q) => p - q)[n / 2 - 1] + [...v].sort((p, q) => p - q)[n / 2]) % 2 === 0));
    const s = [...xs].sort((p, q) => p - q), med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    return num(`What is the <b>median</b> of ${big(xs.join(', '))}?`, med, [`Put them in order: ${s.join(', ')}.`, n % 2 ? `The middle one is ${med}.` : `Two middle numbers: ${s[n / 2 - 1]} and ${s[n / 2]}. Their mean is ${med}.`]);
  }
  if (rng() < 0.5) {
    const xs = Array.from({ length: 6 }, () => randInt(rng, 2, 50));
    return num(`What is the <b>range</b> of ${big(xs.join(', '))}?`, Math.max(...xs) - Math.min(...xs), [`Range = biggest − smallest = ${Math.max(...xs)} − ${Math.min(...xs)} = ${Math.max(...xs) - Math.min(...xs)}.`]);
  }
  const mean = randInt(rng, 70, 95), scores = Array.from({ length: 3 }, () => randInt(rng, mean - 12, Math.min(100, mean + 12)));
  const need = mean * 4 - scores.reduce((s, x) => s + x, 0);
  if (need < 0 || need > 100) return genStats(rng, 2);
  return num(`Maya's test scores are ${big(scores.join(', '))}. What must she score on the next test to have a mean of <b>${mean}</b>?`, need, [`For a mean of ${mean} over 4 tests, the total must be ${mean} × 4 = ${mean * 4}.`, `She has ${scores.reduce((s, x) => s + x, 0)}, so she needs ${mean * 4} − ${scores.reduce((s, x) => s + x, 0)} = ${need}.`]);
}

export function genProb(rng, level = 1) {
  if (level === 1) {
    const r = randInt(rng, 1, 7), b = randInt(rng, 1, 7), g = randInt(rng, 0, 5), t = r + b + g;
    return { kind: 'fraction', prompt: `A bag has <b>${r} red</b>, <b>${b} blue</b>${g ? ` and <b>${g} green</b>` : ''} marbles. What is the probability of picking <b>red</b>?`, answer: { n: r, d: t }, steps: [`Probability = ways to win ÷ all possible = ${r} ÷ ${t}.`, `So it is ${r}/${t}.`] };
  }
  if (level === 2) {
    const k = randInt(rng, 2, 5);
    const [want, wins] = pick([
      ['an even number', [2, 4, 6]], ['an odd number', [1, 3, 5]], [`a ${k}`, [k]], [`a number greater than ${k}`, [1, 2, 3, 4, 5, 6].filter(v => v > k)],
      [`a number less than ${k}`, [1, 2, 3, 4, 5, 6].filter(v => v < k)], ['a multiple of 3', [3, 6]], [`${k} or ${k + 1}`, [k, k + 1]], [`a number that is not ${k}`, [1, 2, 3, 4, 5, 6].filter(v => v !== k)],
    ], rng);
    const n = wins.length;
    return { kind: 'fraction', prompt: `You roll a fair number cube (1 to 6). What is the probability of rolling <b>${want}</b>?`, answer: { n, d: 6 },
      steps: ['Probability = winning rolls ÷ all possible rolls.', `There are 6 possible rolls. The winning ones are ${wins.join(', ')}: that is ${n}.`, `So it is ${n}/6${gcd(n, 6) > 1 ? ` (the same as ${n / gcd(n, 6)}/${6 / gcd(n, 6)})` : ''}.`] };
  }
  if (rng() < 0.5) {
    const d = pick([4, 5, 8, 10], rng), n = randInt(rng, 1, d - 1);
    return { kind: 'fraction', prompt: `The chance of rain is ${frac(n, d)}. What is the chance it does <b>not</b> rain?`, answer: { n: d - n, d }, steps: ['Something happens or it does not: the two chances add to 1.', `1 − ${n}/${d} = ${d - n}/${d}.`] };
  }
  return { kind: 'fraction', prompt: 'You flip <b>two</b> coins. What is the probability of getting <b>two heads</b>?', answer: { n: 1, d: 4 }, steps: ['The outcomes are HH, HT, TH and TT: 4 in all.', 'Only HH is two heads, so it is 1/4.'] };
}

// ---------------- Coordinate plane & functions ----------------

export function genPoints(rng, level = 1) {
  const x = nz(rng, -9, 9), y = nz(rng, -9, 9);
  if (level === 1) {
    const q = x > 0 ? (y > 0 ? 'I' : 'IV') : (y > 0 ? 'II' : 'III');
    return choice(`Which <b>quadrant</b> is the point ${big(`(${neg(x)}, ${neg(y)})`)} in?`, ['I', 'II', 'III', 'IV'], q,
      ['Quadrant I is (+, +), II is (−, +), III is (−, −), IV is (+, −).', `x is ${x > 0 ? 'positive' : 'negative'} and y is ${y > 0 ? 'positive' : 'negative'}, so it is in quadrant ${q}.`]);
  }
  if (level === 2) {
    const y2 = until(() => nz(rng, -9, 9), v => v !== y);
    return num(`How far apart are ${big(`(${neg(x)}, ${neg(y)})`)} and ${big(`(${neg(x)}, ${neg(y2)})`)}?`, Math.abs(y - y2), [`Same x, so count the distance between the y values.`, `|${neg(y)} − ${paren(y2)}| = ${Math.abs(y - y2)}.`]);
  }
  const overX = rng() < 0.5, ans = overX ? `(${neg(x)}, ${neg(-y)})` : `(${neg(-x)}, ${neg(y)})`;
  return choice(`Reflect ${big(`(${neg(x)}, ${neg(y)})`)} over the <b>${overX ? 'x' : 'y'}-axis</b>. Where does it land?`,
    shuffle([ans, `(${neg(-x)}, ${neg(-y)})`, overX ? `(${neg(-x)}, ${neg(y)})` : `(${neg(x)}, ${neg(-y)})`, `(${neg(y)}, ${neg(x)})`].filter((v, i, a) => a.indexOf(v) === i), rng), ans,
    [overX ? 'Flipping over the x-axis keeps x and changes the sign of y.' : 'Flipping over the y-axis keeps y and changes the sign of x.', `So it lands at ${ans}.`]);
}

export function genSlope(rng, level = 1) {
  if (level === 3) {
    const m = nz(rng, -6, 6), b = nz(rng, -9, 9), askSlope = rng() < 0.5;
    return int(`In ${big(`y = ${m === 1 ? '' : m === -1 ? '−' : neg(m)}${X} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`)}, what is the <b>${askSlope ? 'slope' : 'y-intercept'}</b>?`, askSlope ? m : b,
      ['In y = mx + b, m is the slope and b is the y-intercept (where the line crosses the y-axis).', askSlope ? `The slope is ${neg(m)}.` : `The y-intercept is ${neg(b)}.`]);
  }
  const m = level === 1 ? randInt(rng, 1, 5) : nz(rng, -5, 5);
  const x1 = randInt(rng, -5, 3), y1 = randInt(rng, -5, 5), dx = randInt(rng, 1, 4);
  const x2 = x1 + dx, y2 = y1 + m * dx;
  return int(`What is the <b>slope</b> of the line through ${big(`(${neg(x1)}, ${neg(y1)})`)} and ${big(`(${neg(x2)}, ${neg(y2)})`)}?`, m,
    ['Slope = rise ÷ run = change in y ÷ change in x.', `(${neg(y2)} − ${paren(y1)}) ÷ (${neg(x2)} − ${paren(x1)}) = ${neg(m * dx)} ÷ ${dx} = ${neg(m)}.`]);
}

export function genLinear(rng, level = 1) {
  const m = level === 1 ? randInt(rng, 2, 6) : nz(rng, -5, 6), b = nz(rng, -9, 9), x = randInt(rng, level === 1 ? 2 : -5, 8);
  const rule = `y = ${m === 1 ? '' : m === -1 ? '−' : neg(m)}${X} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`;
  if (level === 1) return int(`If ${big(rule)}, what is y when ${big(`${X} = ${x}`)}?`, m * x + b, [`Put ${x} in for x: ${m} × ${x} ${b < 0 ? '−' : '+'} ${Math.abs(b)}.`, `${m * x} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${neg(m * x + b)}.`]);
  if (level === 2) return int(`If ${big(rule)}, what is x when ${big(`y = ${neg(m * x + b)}`)}?`, x, [`${neg(m * x + b)} = ${neg(m)}x ${b < 0 ? '−' : '+'} ${Math.abs(b)}.`, `Undo the ${b < 0 ? '−' : '+'} ${Math.abs(b)}: ${neg(m)}x = ${neg(m * x)}. Divide by ${neg(m)}: x = ${neg(x)}.`]);
  const k = randInt(rng, 2, 9), xs = shuffle([1, 2, 3, 4, 5, 6], rng).slice(0, 3).sort((p, q) => p - q);
  const rows = xs.map(v => `<tr><td>${v}</td><td>${v * k}</td></tr>`).join('');
  return num(`This table shows a <b>proportional</b> relationship. What is the constant of proportionality (y ÷ x)?<table class="io-table"><tr><th>x</th><th>y</th></tr>${rows}</table>`, k,
    [`In a proportional relationship, y ÷ x is the same every time.`, `${xs[0] * k} ÷ ${xs[0]} = ${k}.`]);
}

// ---------------- Skills, units and tiers ----------------

export const MIDDLE_UNITS = [
  { id: 'ratio', title: 'Ratios & Rates', emoji: '⚖️' },
  { id: 'money', title: 'Percents & Money', emoji: '🏷️' },
  { id: 'int', title: 'Integers', emoji: '🌡️' },
  { id: 'fm', title: 'Factors & Multiples', emoji: '🧱' },
  { id: 'expo', title: 'Exponents & Roots', emoji: '🚀' },
  { id: 'geo', title: 'Geometry', emoji: '📏' },
  { id: 'stats', title: 'Statistics & Probability', emoji: '🎲' },
  { id: 'graph', title: 'Graphs & Functions', emoji: '📈' },
];

const T = (label, gen) => ({ label, gen });
const M = (id, unit, title, emoji, requires, desc, tiers) => ({ id, unit, title, emoji, requires, desc, tiers });

const DEFS = [
  M('frac-muldiv', 'frac', 'Multiply & divide fractions', '✂️', ['frac-add'], '2/3 × 3/4, 1/2 ÷ 1/4',
    [T('Fraction × whole number', r => genFracMulDiv(r, 1)), T('Fraction × fraction', r => genFracMulDiv(r, 2)), T('Fraction ÷ fraction', r => genFracMulDiv(r, 3))]),
  M('dec-muldiv', 'dec', 'Multiply & divide decimals', '🧪', ['dec-add'], '1.2 × 0.3, 4.8 ÷ 0.6',
    [T('Decimal × whole number', r => genDecMulDiv(r, 1)), T('Decimal × decimal', r => genDecMulDiv(r, 2)), T('Divide by a decimal', r => genDecMulDiv(r, 3))]),
  M('alg-like', 'alg', 'Like terms & distributing', '🧲', ['alg-expr'], '3x + 5x, 4(x + 2)',
    [T('3x + 5x', r => genLikeTerms(r, 1)), T('4(x + 2)', r => genLikeTerms(r, 2)), T('Distribute, then combine', r => genLikeTerms(r, 3))]),
  M('alg-ineq', 'alg', 'Inequalities', '↔️', ['alg-one'], 'x + 4 > 9',
    [T('Is it a solution?', r => genInequality(r, 1)), T('x + 4 > 9', r => genInequality(r, 2)), T('3x + 2 ≤ 14', r => genInequality(r, 3))]),

  M('ratio-basic', 'ratio', 'Ratios', '🍎', ['mul-facts'], '3 : 5, equal ratios',
    [T('Write a ratio', r => genRatio(r, 1)), T('2 : 3 = ? : 12', r => genRatio(r, 2)), T('Share in a ratio', r => genRatio(r, 3))]),
  M('ratio-rate', 'ratio', 'Unit rates & prices', '🛒', ['ratio-basic', 'div-2x1'], 'Miles per hour, price for one',
    [T('Per hour', r => genRate(r, 1)), T('Price for one', r => genRate(r, 2)), T('Better buy', r => genRate(r, 3))]),
  M('ratio-prop', 'ratio', 'Proportions', '🍪', ['ratio-basic'], '3/4 = x/12',
    [T('3/4 = x/12', r => genProportion(r, 1)), T('x/5 = 12/20', r => genProportion(r, 2)), T('Scale a recipe', r => genProportion(r, 3))]),
  M('ratio-convert', 'ratio', 'Converting units', '📏', ['mul-2x1'], 'Feet to inches, kg to g',
    [T('Feet, hours, weeks', r => genConvert(r, 1)), T('Metric and cups', r => genConvert(r, 2)), T('Halves: 2.5 hours', r => genConvert(r, 3))]),

  M('money-tax', 'money', 'Tax & tips', '🧾', ['pct-of'], '20% tip, 8% tax',
    [T('10% and 20% tips', r => genTaxTip(r, 1)), T('Price plus tax', r => genTaxTip(r, 2)), T('Bill plus a 15% tip', r => genTaxTip(r, 3))]),
  M('money-discount', 'money', 'Sales & markups', '🏷️', ['pct-of'], '25% off',
    [T('10% and 50% off', r => genDiscount(r, 1)), T('20% to 40% off', r => genDiscount(r, 2)), T('Markups', r => genDiscount(r, 3))]),
  M('money-interest', 'money', 'Simple interest', '🏦', ['money-tax'], 'Interest = P × r × t',
    [T('One year', r => genInterest(r, 1)), T('Several years', r => genInterest(r, 2)), T('Total after interest', r => genInterest(r, 3))]),
  M('money-change', 'money', 'Percent change', '📊', ['pct-of'], 'From 50 to 60 is +20%',
    [T('Percent increase', r => genPctChange(r, 1)), T('Increase or decrease', r => genPctChange(r, 2)), T('Find the new amount', r => genPctChange(r, 3))]),

  M('int-line', 'int', 'Negative numbers', '🧊', ['num-place'], 'Compare and order integers',
    [T('Compare: −3 ? 2', r => genIntLine(r, 1)), T('Find the least', r => genIntLine(r, 2)), T('Absolute values', r => genIntLine(r, 3))]),
  M('int-abs', 'int', 'Absolute value', '📍', ['int-line'], '|−7| = 7',
    [T('|−7|', r => genIntAbs(r, 1)), T('|−4| + |6|', r => genIntAbs(r, 2)), T('Distance on a number line', r => genIntAbs(r, 3))]),
  M('int-add', 'int', 'Add & subtract integers', '➕', ['int-line'], '−5 + 3, 4 − (−6)',
    [T('Add integers', r => genIntAddSub(r, 1)), T('Subtract integers', r => genIntAddSub(r, 2)), T('Three numbers', r => genIntAddSub(r, 3))]),
  M('int-muldiv', 'int', 'Multiply & divide integers', '✖️', ['int-add', 'mul-facts'], '−4 × 3, −20 ÷ −5',
    [T('Multiply', r => genIntMulDiv(r, 1)), T('Divide', r => genIntMulDiv(r, 2)), T('× and ÷ together', r => genIntMulDiv(r, 3))]),

  M('fm-gcf', 'fm', 'Factors & GCF', '🧩', ['mul-facts'], 'Greatest common factor',
    [T('Spot a factor', r => genFactor(r, 1)), T('GCF up to 60', r => genFactor(r, 2)), T('GCF up to 150', r => genFactor(r, 3))]),
  M('fm-lcm', 'fm', 'Multiples & LCM', '🔔', ['mul-facts'], 'Least common multiple',
    [T('LCM of small numbers', r => genMultiple(r, 1)), T('LCM up to 12', r => genMultiple(r, 2)), T('When do they meet?', r => genMultiple(r, 3))]),

  M('expo-pow', 'expo', 'Exponents', '💥', ['mul-facts'], '2³ = 8',
    [T('2³, 5²', r => genPower(r, 1)), T('10⁵, 3⁴', r => genPower(r, 2)), T('Negative bases and mixes', r => genPower(r, 3))]),
  M('expo-ops', 'expo', 'Order of operations', '🧮', ['mul-facts'], 'Parentheses, powers, × ÷, + −',
    [T('× before +', r => genOrderOps(r, 1)), T('Parentheses', r => genOrderOps(r, 2)), T('With powers', r => genOrderOps(r, 3))]),
  M('expo-sci', 'expo', 'Scientific notation', '🔬', ['expo-pow'], '4.5 × 10⁶',
    [T('To a regular number', r => genSciNote(r, 1)), T('Find the power of 10', r => genSciNote(r, 2)), T('Tiny numbers', r => genSciNote(r, 3))]),
  M('expo-roots', 'expo', 'Square & cube roots', '🌱', ['expo-pow'], '√49, ∛27',
    [T('√49', r => genRoot(r, 1)), T('∛27 and √169', r => genRoot(r, 2)), T('Estimate √50', r => genRoot(r, 3))]),

  M('geo-angles', 'geo', 'Angles', '📐', ['add-2d-c'], 'Complementary, supplementary, triangles',
    [T('Add to 90°', r => genAngles(r, 1)), T('Add to 180°', r => genAngles(r, 2)), T('Triangles and vertical angles', r => genAngles(r, 3))]),
  M('geo-area', 'geo', 'Area', '🟩', ['mul-2x1'], 'Rectangles, triangles, trapezoids',
    [T('Rectangles', r => genArea(r, 1)), T('Triangles and parallelograms', r => genArea(r, 2)), T('Trapezoids', r => genArea(r, 3))]),
  M('geo-circle', 'geo', 'Circles', '⭕', ['geo-area', 'dec-muldiv'], 'Circumference and area with 3.14',
    [T('Circumference', r => genCircle(r, 1)), T('Area from the radius', r => genCircle(r, 2)), T('Area from the diameter', r => genCircle(r, 3))]),
  M('geo-volume', 'geo', 'Volume & surface area', '📦', ['geo-area'], 'Boxes and cylinders',
    [T('Volume of a box', r => genVolume(r, 1)), T('Surface area of a box', r => genVolume(r, 2)), T('Volume of a cylinder', r => genVolume(r, 3))]),
  M('geo-pythag', 'geo', 'Pythagorean theorem', '📐', ['expo-roots'], 'a² + b² = c²',
    [T('Find the hypotenuse', r => genPythag(r, 1)), T('Find a leg', r => genPythag(r, 2)), T('Ladder problems', r => genPythag(r, 3))]),
  M('geo-scale', 'geo', 'Scale & similar figures', '🗺️', ['ratio-prop'], 'Maps and similar triangles',
    [T('Map scales', r => genScale(r, 1)), T('Similar triangles', r => genScale(r, 2)), T('Scale drawings', r => genScale(r, 3))]),

  M('stats-center', 'stats', 'Mean, median & range', '📊', ['div-2x1'], 'Find the middle of data',
    [T('Mean', r => genStats(r, 1)), T('Median', r => genStats(r, 2)), T('Range and a missing score', r => genStats(r, 3))]),
  M('stats-prob', 'stats', 'Probability', '🎲', ['frac-id'], 'Marbles, number cubes, coins',
    [T('Marbles in a bag', r => genProb(r, 1)), T('Number cubes', r => genProb(r, 2)), T('Not happening, two coins', r => genProb(r, 3))]),

  M('graph-points', 'graph', 'The coordinate plane', '📍', ['int-line'], 'Quadrants and reflections',
    [T('Quadrants', r => genPoints(r, 1)), T('Distance on a line', r => genPoints(r, 2)), T('Reflections', r => genPoints(r, 3))]),
  M('graph-slope', 'graph', 'Slope', '⛰️', ['graph-points', 'int-muldiv'], 'Rise over run',
    [T('Uphill slopes', r => genSlope(r, 1)), T('Any slope', r => genSlope(r, 2)), T('Read y = mx + b', r => genSlope(r, 3))]),
  M('graph-linear', 'graph', 'Linear equations', '📈', ['graph-slope', 'alg-one'], 'y = 2x + 3',
    [T('Find y', r => genLinear(r, 1)), T('Find x', r => genLinear(r, 2)), T('Proportional tables', r => genLinear(r, 3))]),
];

// Steps are shown as plain text, so exponents written with <sup> become ² ³ ... there.
const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export const plainSteps = steps => steps.map(st => st.replace(/<sup>(\d+)<\/sup>/g, (_, d) => [...d].map(c => SUPS[c]).join('')));
const textSteps = t => ({ ...t, gen: rng => { const p = t.gen(rng); return { ...p, steps: plainSteps(p.steps) }; } });
const TIERS_OF = Object.fromEntries(DEFS.map(d => [d.id, d.tiers.map(textSteps)]));
export const MIDDLE_SKILLS = DEFS.map(({ tiers, ...s }) => ({ ...s, gen: TIERS_OF[s.id][1].gen }));
export const MIDDLE_TIERS = TIERS_OF;
