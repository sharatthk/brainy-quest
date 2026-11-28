// Middle school math, part 2: the rest of the middle school checklist. Types of numbers, mixed numbers,
// commission, properties, equations with x on both sides and word problems, geometry basics, shapes,
// 3D figures, cones, pyramids and spheres, transversals, samples, mode, IQR and MAD, data displays,
// compound probability, functions, systems, nonlinear functions, polygons on a grid and transformations.
// Pure module (no DOM), unit tested. Skills join existing units; each has three star tiers.
import { randInt, pick, shuffle } from '../shared/util.js';
import { until, frac, big, neg, paren, money, round2, fmt, nz, int, num, dec, choice, X } from './middle.js';

const T = (label, gen) => ({ label, gen });
const M = (id, unit, title, emoji, requires, desc, tiers) => ({ id, unit, title, emoji, requires, desc, tiers });
const fraction = (prompt, n, d, steps, extra = {}) => ({ kind: 'fraction', prompt, answer: { n, d }, steps, ...extra });
const pt = (x, y) => `(${neg(x)}, ${neg(y)})`;
const cx = c => (c === 1 ? 'x' : `${c}x`); // 1x reads as x

// ---------------- Types of numbers ----------------

export function genNumTypes(rng, level = 1) {
  if (level === 1) {
    const [v, ans, why] = pick([
      [String(randInt(rng, 2, 40)), 'whole number', 'counting number or zero'],
      ['0', 'whole number', 'zero is a whole number but not a counting (natural) number'],
      [neg(-randInt(rng, 2, 30)), 'integer', 'a negative whole number'],
      [`${randInt(rng, 1, 7)}/${pick([8, 9, 10], rng)}`, 'rational number', 'a fraction'],
      [(randInt(rng, 11, 99) / 10).toFixed(1), 'rational number', 'a decimal that ends'],
    ], rng);
    return choice(`What is the best name for ${big(v)}?`, shuffle(['whole number', 'integer', 'rational number', 'irrational number'], rng), ans,
      ['Whole numbers: 0, 1, 2, 3, ... Integers add the negatives: ..., −2, −1, 0, 1, 2, ... Rational numbers can be written as a fraction of integers.', `${v} is ${why}, so the best (smallest) group is: ${ans}.`]);
  }
  if (level === 2) {
    const sq = randInt(rng, 2, 12);
    const [v, rational, why] = pick([
      [`√${sq * sq}`, true, `√${sq * sq} = [[${sq}]], a whole number`],
      [`√${until(() => randInt(rng, 2, 99), x => !Number.isInteger(Math.sqrt(x)))}`, false, 'it is not a perfect square, so its decimal never ends or repeats'],
      ['π', false, 'π = 3.14159... never ends or repeats'],
      [`0.${randInt(rng, 1, 9)}${randInt(rng, 1, 9)}${randInt(rng, 1, 9)}`, true, 'a decimal that ends can be written as a fraction'],
      [`0.${randInt(rng, 1, 9)} repeating`, true, 'a repeating decimal can be written as a fraction'],
      [`${randInt(rng, 2, 9)}/${randInt(rng, 2, 9)}`, true, 'it is already a fraction'],
    ], rng);
    return choice(`Is ${big(v)} rational or irrational?`, ['rational', 'irrational'], rational ? 'rational' : 'irrational',
      ['Rational numbers can be written as a fraction. Their decimals end or repeat.', `${v}: ${why}.`]);
  }
  const n = until(() => randInt(rng, 5, 99), x => !Number.isInteger(Math.sqrt(x)));
  const lo = Math.floor(Math.sqrt(n));
  const d = (lo + randInt(rng, 1, 9) / 10);
  const bigger = Math.sqrt(n) > d ? `√${n}` : d.toFixed(1);
  return choice(`Which is <b>greater</b>: ${big(`√${n}`)} or ${big(d.toFixed(1))}?`, shuffle([`√${n}`, d.toFixed(1)], rng), bigger,
    [`${lo} × ${lo} = ${lo * lo} and ${lo + 1} × ${lo + 1} = ${(lo + 1) ** 2}, so √${n} is between ${lo} and ${lo + 1}.`, `Check the decimal: ${d.toFixed(1)} × ${d.toFixed(1)} = ${round2(d * d)}.`, `${round2(d * d)} is ${d * d > n ? 'more' : 'less'} than ${n}, so ${bigger} is greater.`]);
}

// ---------------- Mixed numbers ----------------

export function genMixed(rng, level = 1) {
  const d = randInt(rng, 2, 9), w = randInt(rng, 1, 6), n = randInt(rng, 1, d - 1);
  if (level === 1) {
    return fraction(`Write ${big(`${w} ${frac(n, d)}`)} as an <b>improper fraction</b>.`, w * d + n, d,
      [`Each whole is ${d}/${d}, so ${w} wholes are ${w} × ${d} = ${w * d} pieces.`, `Add the ${n} extra pieces: ${w * d} + ${n} = ${w * d + n}.`, `So ${w} ${n}/${d} = ${w * d + n}/${d}.`]);
  }
  if (level === 2) {
    const top = w * d + n, ans = `${w} ${n}/${d}`;
    return choice(`Write ${big(frac(top, d))} as a <b>mixed number</b>.`, shuffle([ans, `${w + 1} ${n}/${d}`, `${w} ${d - n}/${d}`, `${n} ${w}/${d}`].filter((v, i, a) => a.indexOf(v) === i), rng), ans,
      [`How many whole groups of ${d} fit in ${top}? ${top} ÷ ${d} = ${w} with ${n} left over.`, `The ${w} is the whole number and the leftover ${n} stays over ${d}: ${ans}.`]);
  }
  const D = Math.max(d, 3); // with halves, two proper fractions can never add to more than 1
  const [a, b] = until(() => [randInt(rng, 1, D - 1), randInt(rng, 1, D - 1)], ([x, y]) => x + y > D);
  const w2 = randInt(rng, 1, 4), sum = a + b - D, whole = w + w2 + 1, ans = `${whole} ${sum}/${D}`;
  return choice(`${big(`${w} ${frac(a, D)} + ${w2} ${frac(b, D)} = ?`)}`, shuffle([ans, `${whole - 1} ${a + b}/${D}`, `${whole - 1} ${sum}/${D}`, `${whole + 1} ${sum}/${D}`].filter((v, i, x) => x.indexOf(v) === i), rng), ans,
    [`Add the wholes: ${w} + ${w2} = ${w + w2}.`, `Add the fractions: ${a}/${D} + ${b}/${D} = ${a + b}/${D}, which is more than 1.`, `${a + b}/${D} = 1 ${sum}/${D}, so carry the 1: ${w + w2} + 1 = ${whole}. The answer is ${ans}.`]);
}

// ---------------- Commission ----------------

export function genCommission(rng, level = 1) {
  if (level === 1) {
    const p = pick([5, 10, 20], rng), sales = randInt(rng, 2, 40) * 50, c = (sales * p) / 100;
    return dec(`Mia earns a <b>${p}% commission</b> on what she sells. She sells <b>${money(sales)}</b> of shoes. How much commission does she earn? $ ___`, c,
      ['A commission is a percent of the sales that the seller keeps.', `${p}% of ${money(sales)} = ${sales} × ${p / 100} = ${round2(c)}.`]);
  }
  if (level === 2) {
    const base = randInt(rng, 3, 9) * 100, p = pick([4, 5, 6, 8, 10], rng), sales = randInt(rng, 10, 60) * 100, c = (sales * p) / 100;
    return dec(`Leo is paid <b>${money(base)}</b> a week plus <b>${p}% commission</b>. This week he sold <b>${money(sales)}</b>. What is his total pay? $ ___`, base + c,
      [`Commission: ${p}% of ${money(sales)} = ${sales} × ${p / 100} = ${round2(c)}.`, `Total pay = base + commission = ${base} + ${round2(c)} = ${round2(base + c)}.`]);
  }
  const p = pick([2, 4, 5, 6, 8, 10, 12, 15], rng), sales = randInt(rng, 4, 40) * 100, c = (sales * p) / 100;
  return num(`An agent earned <b>${money(c)}</b> commission on <b>${money(sales)}</b> in sales. What was the commission rate?`, p,
    ['Rate = commission ÷ sales, then change it to a percent.', `${c} ÷ ${sales} = ${c / sales}.`, `${c / sales} × 100 = ${p}, so the rate is ${p}%.`], { suffix: '%' });
}

// ---------------- Properties ----------------

export function genProperties(rng, level = 1) {
  const a = randInt(rng, 2, 12), b = randInt(rng, 2, 12), c = randInt(rng, 2, 12);
  if (level === 1) {
    const [shown, ans, why] = pick([
      [`${a} + ${b} = ${b} + ${a}`, 'commutative', 'the order of the numbers changed'],
      [`${a} × ${b} = ${b} × ${a}`, 'commutative', 'the order of the numbers changed'],
      [`(${a} + ${b}) + ${c} = ${a} + (${b} + ${c})`, 'associative', 'the grouping (parentheses) changed'],
      [`(${a} × ${b}) × ${c} = ${a} × (${b} × ${c})`, 'associative', 'the grouping (parentheses) changed'],
      [`${a} × (${b} + ${c}) = ${a} × ${b} + ${a} × ${c}`, 'distributive', `${a} was multiplied by each part inside the parentheses`],
      [`${a} + 0 = ${a}`, 'identity', 'adding 0 keeps the number the same'],
      [`${a} × 1 = ${a}`, 'identity', 'multiplying by 1 keeps the number the same'],
    ], rng);
    return choice(`Which property is shown? ${big(shown)}`, shuffle(['commutative', 'associative', 'distributive', 'identity'], rng), ans,
      ['Commutative: change the order. Associative: change the grouping. Distributive: multiply into parentheses. Identity: add 0 or multiply by 1.', `Here ${why}, so it is the ${ans} property.`]);
  }
  if (level === 2) {
    const [shown, ans, how] = pick([
      [`${a} × (${b} + ${c}) = ${a} × ${b} + ${a} × <span class="qbox">?</span>`, c, `Distributive: ${a} multiplies both ${b} and ${c}, so the box is [[${c}]].`],
      [`(${a} + ${b}) + ${c} = ${a} + (<span class="qbox">?</span> + ${c})`, b, `Associative: the same numbers, just grouped differently, so the box is [[${b}]].`],
      [`${a} × ${b} = <span class="qbox">?</span> × ${a}`, b, `Commutative: swap the order, so the box is [[${b}]].`],
      [`${a} × (${b} − ${Math.min(c, b - 1) || 1}) = ${a} × ${b} − ${a} × <span class="qbox">?</span>`, Math.min(c, b - 1) || 1, `Distributive works with subtraction too, so the box is [[${Math.min(c, b - 1) || 1}]].`],
    ], rng);
    return num(big(shown), ans, ['Each property keeps both sides equal.', how]);
  }
  const t = randInt(rng, 2, 9), o = randInt(rng, 1, 9), m = randInt(rng, 3, 9), n = t * 10 + o;
  return num(`Use the distributive property: ${big(`${m} × ${n} = ?`)}`, m * n,
    [`Split ${n} into ${t * 10} + ${o}.`, `${m} × ${t * 10} = ${m * t * 10} and ${m} × ${o} = ${m * o}.`, `Add the parts: ${m * t * 10} + ${m * o} = ${m * n}.`]);
}

// ---------------- Equations with x on both sides ----------------

export function genBothSides(rng, level = 1) {
  const x = randInt(rng, 1, 12);
  if (level === 3) {
    const a = randInt(rng, 2, 5), b = randInt(rng, 1, 6), c = until(() => randInt(rng, 1, a - 1 || 1), v => v < a);
    const d = a * (x + b) - c * x;
    return num(`Solve: ${big(`${a}(${X} + ${b}) = ${c === 1 ? '' : c}${X} + ${d}`)}`, x,
      [`Distribute: ${a}(x + ${b}) = ${a}x + ${a * b}.`, `Take ${cx(c)} from both sides: ${cx(a - c)} + ${a * b} = ${d}.`, `Take ${a * b} from both sides: ${cx(a - c)} = ${d} − ${a * b} = ${d - a * b}.`, ...(a - c > 1 ? [`Divide by ${a - c}: x = ${d - a * b} ÷ ${a - c} = ${x}.`] : [])]);
  }
  const [a, c, b] = until(() => [randInt(rng, 2, 9), randInt(rng, 1, 8), (level === 1 ? 1 : -1) * randInt(rng, 1, 15)], ([p, q, r]) => p > q && (p - q) * x + r !== 0);
  const d = a * x + b - c * x;
  const left = `${a}${X} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`, right = `${c === 1 ? '' : c}${X} ${d < 0 ? '−' : '+'} ${Math.abs(d)}`;
  return num(`Solve: ${big(`${left} = ${right}`)}`, x,
    [`Get the x terms on one side: take ${cx(c)} from both sides. ${a}x − ${cx(c)} = ${cx(a - c)}.`, `Now ${cx(a - c)} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${neg(d)}. Undo the ${b < 0 ? '−' : '+'} ${Math.abs(b)}: ${cx(a - c)} = ${neg(d)} ${b < 0 ? '+' : '−'} ${Math.abs(b)} = ${(a - c) * x}.`, ...(a - c > 1 ? [`Divide by ${a - c}: x = ${(a - c) * x} ÷ ${a - c} = ${x}.`] : [])]);
}

// ---------------- Word problems with equations ----------------

const NAMES = ['Maya', 'Leo', 'Aarav', 'Zoe', 'Sam', 'Priya', 'Omar', 'Lily', 'Kai', 'Nina'];
export function genEqWords(rng, level = 1) {
  const who = pick(NAMES, rng);
  if (level === 1) {
    const x = randInt(rng, 3, 40), k = randInt(rng, 2, 30);
    return pick([
      () => num(`A number plus <b>${k}</b> is <b>${x + k}</b>. What is the number?`, x, [`Write it: x + ${k} = ${x + k}.`, `Undo + ${k}: x = ${x + k} − ${k} = ${x}.`]),
      () => num(`${who} had some stickers and got <b>${k}</b> more. Now ${who} has <b>${x + k}</b>. How many were there at first?`, x, [`Write it: x + ${k} = ${x + k}.`, `x = ${x + k} − ${k} = ${x}.`]),
      () => num(`<b>${Math.min(k, 9) + 1}</b> friends share <b>${x * (Math.min(k, 9) + 1)}</b> cards equally. How many does each get?`, x, [`Write it: ${Math.min(k, 9) + 1}x = ${x * (Math.min(k, 9) + 1)}.`, `x = ${x * (Math.min(k, 9) + 1)} ÷ ${Math.min(k, 9) + 1} = ${x}.`]),
    ], rng)();
  }
  if (level === 2) {
    const n = randInt(rng, 2, 12), price = randInt(rng, 3, 15), fee = randInt(rng, 2, 10);
    return num(`Tickets cost <b>$${price}</b> each plus a <b>$${fee}</b> booking fee. ${who} paid <b>$${n * price + fee}</b>. How many tickets?`, n,
      [`Write it: ${price}t + ${fee} = ${n * price + fee}.`, `Take away the fee: ${price}t = ${n * price + fee} − ${fee} = ${n * price}.`, `Divide by the price: t = ${n * price} ÷ ${price} = ${n}.`]);
  }
  if (rng() < 0.5) {
    const w = randInt(rng, 3, 20), m = randInt(rng, 2, 9), p = 2 * (w + w + m);
    return num(`A rectangle is <b>${m} cm longer</b> than it is wide. Its perimeter is <b>${p} cm</b>. How wide is it?`, w,
      [`Let the width be w. The length is w + ${m}.`, `Perimeter: 2(w + w + ${m}) = ${p}, so 2w + ${m} = ${p} ÷ 2 = ${p / 2}.`, `2w = ${p / 2} − ${m} = ${2 * w}, so w = ${2 * w} ÷ 2 = ${w}.`], { suffix: 'cm' });
  }
  const n = randInt(rng, 5, 60);
  return num(`The sum of two numbers in a row (like 7 and 8) is <b>${2 * n + 1}</b>. What is the smaller number?`, n,
    ['Call the numbers n and n + 1.', `n + n + 1 = ${2 * n + 1}, so 2n = ${2 * n + 1} − 1 = ${2 * n}.`, `n = ${2 * n} ÷ 2 = ${n}.`]);
}

// ---------------- Geometry basics ----------------

export function genGeoBasics(rng, level = 1) {
  if (level === 1) {
    const [q, ans, why] = pick([
      ['A part of a line with <b>two endpoints</b> is a...', 'line segment', 'It starts and stops at two points'],
      ['A part of a line with <b>one endpoint</b> that goes on forever in one direction is a...', 'ray', 'It has one endpoint and an arrow on the other end'],
      ['A straight path that goes on forever in <b>both</b> directions is a...', 'line', 'It has arrows on both ends and no endpoints'],
      ['An exact location with no size is a...', 'point', 'A point marks a spot and is named with a capital letter'],
      ['A flat surface that goes on forever in every direction is a...', 'plane', 'Think of a tabletop that never ends'],
      ['A sunbeam that starts at the Sun and goes on forever is like a...', 'ray', 'It starts at one point and never stops'],
      ['The edge of a ruler from the 0 mark to the 12 mark is like a...', 'line segment', 'It has two ends you can measure between'],
      ['A dot on a map that marks your house is like a...', 'point', 'It shows one exact place'],
      ['Which one can you measure the length of?', 'line segment', 'Only a segment has two endpoints; lines and rays go on forever'],
    ], rng);
    return choice(q, shuffle([ans, ...shuffle(['line segment', 'ray', 'line', 'point', 'plane'].filter(x => x !== ans), rng).slice(0, 3)], rng), ans,
      [`${why}.`, `So it is a ${ans}.`]);
  }
  if (level === 2) {
    const [q, ans, why] = pick([
      ['Two lines that <b>never meet</b> and stay the same distance apart are...', 'parallel', 'like train tracks'],
      ['Two lines that meet to form a <b>right angle</b> are...', 'perpendicular', 'like the corner of a square'],
      ['Two lines that <b>cross</b> but not at a right angle are...', 'intersecting', 'they meet at one point'],
      ['The lines on a notebook page (across) are...', 'parallel', 'they never meet'],
      ['The edges where a floor meets a wall and a corner of the wall going up are...', 'perpendicular', 'they meet at a right angle'],
      ['The two side rails of a ladder are...', 'parallel', 'they run side by side and never meet'],
      ['The two strokes of a capital T are...', 'perpendicular', 'they meet at a right angle'],
      ['The two strokes of a capital X are...', 'intersecting', 'they cross, but not at right angles'],
      ['The hands of a clock at 3:00 are...', 'perpendicular', 'they make a right angle (a quarter turn)'],
      ['The two long sides of a capital H are...', 'parallel', 'they never meet'],
      ['Two roads that cross like a pair of open scissors are...', 'intersecting', 'they meet at one point without a right angle'],
    ], rng);
    return choice(q, shuffle(['parallel', 'perpendicular', 'intersecting'], rng), ans, [`They are ${why}.`, `So they are ${ans}.`]);
  }
  const d = pick([randInt(rng, 10, 85), 90, randInt(rng, 95, 175), 180], rng);
  const ans = d < 90 ? 'acute' : d === 90 ? 'right' : d < 180 ? 'obtuse' : 'straight';
  return choice(`An angle measures ${big(`${d}°`)}. What kind of angle is it?`, ['acute', 'right', 'obtuse', 'straight'], ans,
    ['Acute: less than 90°. Right: exactly 90°. Obtuse: between 90° and 180°. Straight: exactly 180°.', `${d}° is ${d < 90 ? 'less than 90°' : d === 90 ? 'exactly 90°' : d < 180 ? 'between 90° and 180°' : 'exactly 180°'}, so it is ${ans}.`]);
}

// ---------------- Triangles and quadrilaterals ----------------

export function genShapes(rng, level = 1) {
  if (level === 1) {
    const a = randInt(rng, 3, 12);
    const [s, ans] = pick([
      [[a, a, a], 'equilateral'],
      [(b => [a, a, b])(until(() => randInt(rng, 2, 2 * a - 1), v => v !== a)), 'isosceles'],
      [until(() => [randInt(rng, 3, 15), randInt(rng, 3, 15), randInt(rng, 3, 15)], ([p, q, r]) => p !== q && q !== r && p !== r && p + q > r && p + r > q && q + r > p), 'scalene'],
    ], rng);
    const sides = shuffle(s, rng);
    return choice(`A triangle has sides of ${big(sides.join(', '))}. What kind of triangle is it?`, ['equilateral', 'isosceles', 'scalene'], ans,
      ['Equilateral: all 3 sides equal. Isosceles: exactly 2 equal sides. Scalene: no equal sides.', `The sides ${sides.join(', ')} have ${ans === 'equilateral' ? 'all 3' : ans === 'isosceles' ? 'exactly 2' : 'no'} equal sides, so it is ${ans}.`]);
  }
  if (level === 2) {
    const kind = pick(['acute', 'right', 'obtuse'], rng);
    const a = kind === 'right' ? 90 : kind === 'obtuse' ? randInt(rng, 95, 150) : randInt(rng, 50, 85);
    const b = until(() => randInt(rng, 10, 85), v => 180 - a - v >= 10 && (kind !== 'acute' || 180 - a - v < 90));
    const angs = shuffle([a, b, 180 - a - b], rng);
    return choice(`A triangle has angles of ${big(angs.map(v => `${v}°`).join(', '))}. What kind is it?`, ['acute', 'right', 'obtuse'], kind,
      ['Look at the biggest angle. Less than 90°: acute. Exactly 90°: right. More than 90°: obtuse.', `The biggest angle is [[${Math.max(...angs)}]]°, so it is ${kind}.`]);
  }
  const [desc, ans] = pick([
    ['4 equal sides and 4 right angles', 'square'],
    ['2 pairs of parallel sides and 4 right angles, but not all sides equal', 'rectangle'],
    ['4 equal sides but no right angles', 'rhombus'],
    ['exactly 1 pair of parallel sides', 'trapezoid'],
    ['2 pairs of parallel sides, no right angles and not all sides equal', 'parallelogram'],
    ['all sides 6 cm and every angle 90°', 'square'],
    ['angles of 90°, 90°, 90° and 90°, with sides 3, 8, 3 and 8', 'rectangle'],
    ['all sides 5 cm and angles of 60°, 120°, 60° and 120°', 'rhombus'],
    ['a top and bottom that are parallel, but slanted sides that are not', 'trapezoid'],
    ['sides 4, 7, 4 and 7, with opposite sides parallel and angles of 70° and 110°', 'parallelogram'],
  ], rng);
  return choice(`A quadrilateral has <b>${desc}</b>. What is its best name?`, shuffle([ans, ...shuffle(['square', 'rectangle', 'rhombus', 'trapezoid', 'parallelogram'].filter(x => x !== ans), rng).slice(0, 3)], rng), ans,
    ['Square: 4 equal sides and 4 right angles. Rectangle: 4 right angles. Rhombus: 4 equal sides. Parallelogram: 2 pairs of parallel sides. Trapezoid: exactly 1 pair.', `${desc} fits the ${ans} best.`]);
}

// ---------------- 3D figures ----------------

const POLY = { 3: 'triangle', 4: 'rectangle', 5: 'pentagon', 6: 'hexagon', 8: 'octagon' };
export function gen3D(rng, level = 1) {
  if (level === 1) {
    const [name, f, e, v] = pick([['cube', 6, 12, 8], ['rectangular prism', 6, 12, 8], ['triangular prism', 5, 9, 6], ['square pyramid', 5, 8, 5], ['triangular pyramid', 4, 6, 4]], rng);
    const [what, ans] = pick([['faces', f], ['edges', e], ['vertices (corners)', v]], rng);
    return num(`How many <b>${what}</b> does a <b>${name}</b> have?`, ans,
      ['Faces are the flat sides, edges are where two faces meet, vertices are the corners.', `A ${name} has ${f} faces, ${e} edges and ${v} vertices, so the answer is [[${ans}]].`]);
  }
  if (level === 2) {
    const n = pick([3, 5, 6, 8], rng), prism = rng() < 0.5;
    const [what, ans, rule] = pick(prism
      ? [['faces', n + 2, `2 bases + ${n} side faces = ${n + 2}`], ['edges', 3 * n, `${n} on each base + ${n} going up = 3 × ${n} = ${3 * n}`], ['vertices', 2 * n, `${n} on each base: 2 × ${n} = ${2 * n}`]]
      : [['faces', n + 1, `1 base + ${n} triangles = ${n + 1}`], ['edges', 2 * n, `${n} around the base + ${n} up to the top = ${2 * n}`], ['vertices', n + 1, `${n} on the base + 1 on top = ${n + 1}`]], rng);
    return num(`A <b>${prism ? 'prism' : 'pyramid'}</b> has a <b>${POLY[n]}</b> base (${n} sides). How many <b>${what}</b> does it have?`, ans,
      [`A ${prism ? 'prism has two matching bases joined by rectangles' : 'pyramid has one base and triangles that meet at the top'}.`, `${what[0].toUpperCase() + what.slice(1)}: ${rule}.`]);
  }
  if (rng() < 0.5) {
    const [f, v] = pick([[6, 8], [5, 6], [5, 5], [7, 10], [8, 12], [7, 7]], rng);
    return num(`A solid has <b>${f} faces</b> and <b>${v} vertices</b>. How many <b>edges</b> does it have? (Faces + Vertices − Edges = 2)`, f + v - 2,
      [`Use Euler\'s rule: F + V − E = 2, so E = F + V − 2.`, `E = ${f} + ${v} − 2 = ${f + v - 2}.`]);
  }
  const [q, ans] = pick([
    ['A cylinder is sliced <b>parallel to its base</b>. What shape is the cross-section?', 'circle'],
    ['A cylinder is sliced straight down <b>through its center</b> (top to bottom). What shape is the cross-section?', 'rectangle'],
    ['A square pyramid is sliced <b>parallel to its base</b>. What shape is the cross-section?', 'square'],
    ['A cone is sliced <b>parallel to its base</b>. What shape is the cross-section?', 'circle'],
    ['A sphere is sliced anywhere. What shape is the cross-section?', 'circle'],
    ['A square pyramid is sliced straight down <b>through its top point</b>. What shape is the cross-section?', 'triangle'],
    ['A cube is sliced <b>parallel to one face</b>. What shape is the cross-section?', 'square'],
    ['A cone is sliced straight down <b>through its tip</b>. What shape is the cross-section?', 'triangle'],
    ['A triangular prism is sliced <b>parallel to its triangle base</b>. What shape is the cross-section?', 'triangle'],
    ['A long rectangular box (not a cube) is sliced <b>along its length</b>, parallel to a long side. What shape is the cross-section?', 'rectangle'],
  ], rng);
  return choice(q, ['circle', 'rectangle', 'square', 'triangle'], ans,
    ['A cross-section is the flat face you would see if you cut the solid with a knife.', `Picture the cut: it shows a ${ans}.`]);
}

// ---------------- Volume of pyramids, cones and spheres ----------------

export function genVolume2(rng, level = 1) {
  if (level === 1) {
    const [l, w, h] = until(() => [randInt(rng, 2, 10), randInt(rng, 2, 10), randInt(rng, 3, 12)], ([a, b, c]) => (a * b * c) % 3 === 0);
    return num(`A pyramid has a rectangle base <b>${l} cm</b> by <b>${w} cm</b> and is <b>${h} cm</b> tall. What is its volume?`, (l * w * h) / 3,
      ['A pyramid holds 1/3 of the box with the same base and height: V = (1/3) × base area × height.', `Base area = ${l} × ${w} = ${l * w}.`, `V = ${l * w} × ${h} ÷ 3 = ${(l * w * h) / 3}.`], { suffix: 'cm³' });
  }
  if (level === 2) {
    const [r, h] = until(() => [randInt(rng, 1, 6), randInt(rng, 2, 12)], ([a, b]) => (a * a * b) % 3 === 0);
    return dec(`A cone has a radius of <b>${r} in</b> and a height of <b>${h} in</b>. What is its volume? (Use π = 3.14)`, (3.14 * r * r * h) / 3,
      ['A cone holds 1/3 of the cylinder with the same base and height: V = (1/3) × π × r × r × h.', `r × r × h = ${r} × ${r} × ${h} = ${r * r * h}, and ${r * r * h} ÷ 3 = ${(r * r * h) / 3}.`, `V = 3.14 × ${(r * r * h) / 3} = ${round2((3.14 * r * r * h) / 3)}.`], { suffix: 'in³' });
  }
  const r = pick([3, 6, 9, 12], rng), across = rng() < 0.5;
  if (rng() < 0.3) {
    return dec(`A bowl is a <b>hemisphere</b> (half a sphere) with a radius of <b>${r} cm</b>. What is its volume? (Use π = 3.14)`, (2 / 3) * 3.14 * r ** 3,
      ['A whole sphere is (4/3) × π × r × r × r, so half of it is (2/3) × π × r × r × r.', `r × r × r = ${r ** 3}, and ${r ** 3} ÷ 3 × 2 = ${(r ** 3 / 3) * 2}.`, `V = 3.14 × ${(r ** 3 / 3) * 2} = ${round2((2 / 3) * 3.14 * r ** 3)}.`], { suffix: 'cm³' });
  }
  return dec(`A ball (sphere) ${across ? `is <b>${2 * r} cm</b> across` : `has a radius of <b>${r} cm</b>`}. What is its volume? (Use π = 3.14)`, (4 / 3) * 3.14 * r ** 3,
    [`${across ? `The radius is half of ${2 * r}: ${r}. ` : ''}V = (4/3) × π × r × r × r.`, `r × r × r = ${r} × ${r} × ${r} = ${r ** 3}, and ${r ** 3} ÷ 3 × 4 = ${(r ** 3 / 3) * 4}.`, `V = 3.14 × ${(r ** 3 / 3) * 4} = ${round2((4 / 3) * 3.14 * r ** 3)}.`], { suffix: 'cm³' });
}

// ---------------- Parallel lines and transversals ----------------

export function genTransversal(rng, level = 1) {
  const a = randInt(rng, 35, 145);
  const intro = 'Two parallel lines are crossed by a third line (a transversal).';
  if (level === 1) {
    const [rel, same, why] = pick([
      ['corresponding', true, 'Corresponding angles sit in the same spot at each crossing, so they are equal'],
      ['vertical', true, 'Vertical angles are opposite each other at one crossing, so they are equal'],
      ['a linear pair with', false, 'A linear pair makes a straight line, so the two angles add to 180°'],
    ], rng);
    return num(`${intro} One angle is <b>${a}°</b>. What is the angle that is <b>${rel}</b> it?`, same ? a : 180 - a,
      [`${why}.`, same ? `So it is also [[${a}]]°.` : `180 − ${a} = ${180 - a}.`], { suffix: '°' });
  }
  if (level === 2) {
    const [rel, same, why] = pick([
      ['alternate interior to', true, 'Alternate interior angles are between the parallel lines on opposite sides of the transversal, so they are equal'],
      ['alternate exterior to', true, 'Alternate exterior angles are outside the parallel lines on opposite sides, so they are equal'],
      ['same-side interior with', false, 'Same-side interior angles are between the lines on the same side, so they add to 180°'],
    ], rng);
    return num(`${intro} One angle is <b>${a}°</b>. What is the angle <b>${rel}</b> it?`, same ? a : 180 - a,
      [`${why}.`, same ? `So it is also [[${a}]]°.` : `180 − ${a} = ${180 - a}.`], { suffix: '°' });
  }
  if (rng() < 0.5) {
    const x = randInt(rng, 5, 30), k = randInt(rng, 2, 4), c = until(() => randInt(rng, 5, 40), v => k * x + v < 170);
    return num(`${intro} Two corresponding angles measure <b>(${k}x + ${c})°</b> and <b>${k * x + c}°</b>. What is x?`, x,
      ['Corresponding angles are equal.', `${k}x + ${c} = ${k * x + c}, so ${k}x = ${k * x + c} − ${c} = ${k * x}.`, `x = ${k * x} ÷ ${k} = ${x}.`]);
  }
  const x = randInt(rng, 20, 50), c = 180 - 3 * x;
  return num(`${intro} Two same-side interior angles measure <b>(2x)°</b> and <b>(x + ${c})°</b>. What is x?`, x,
    ['Same-side interior angles add to 180°.', `2x + x + ${c} = 180, so 3x = 180 − ${c} = ${3 * x}.`, `x = ${3 * x} ÷ 3 = ${x}.`]);
}

// ---------------- Statistical questions and samples ----------------

export function genSamples(rng, level = 1) {
  if (level === 1) {
    const yes = pick(['How many hours do students in my class sleep on school nights?', 'How tall are the players on our soccer team?', 'How many books did each student read this summer?', 'What are the ages of people at the park?',
      'How many minutes does it take students in my grade to get to school?', 'What are the favorite colors of the kids on my street?', 'How many letters are in the first names of my classmates?', 'How much do the dogs at the shelter weigh?'], rng);
    const nos = shuffle(['How tall am I?', 'What time does school start?', 'How many days are in March?', 'What is the name of our principal?', 'How many legs does a spider have?', 'What color is my backpack?', 'How far is it from my house to the library?', 'What is the capital of France?'], rng).slice(0, 3);
    return choice('Which is a <b>statistical question</b>?', shuffle([yes, ...nos], rng), yes,
      ['A statistical question expects answers that vary, so you need to collect data.', 'The others have one fixed answer, so they are not statistical.']);
  }
  if (level === 2) {
    const total = randInt(rng, 4, 12) * 100, n = randInt(rng, 3, 9) * 10, place = pick(['school', 'town library', 'summer camp'], rng);
    const ans = `the ${n} people who were asked`;
    return choice(`To learn what people at a ${place} think, ${n} of its ${total} members are asked. What is the <b>sample</b>?`, shuffle([ans, `all ${total} members`, `the people who did not answer`, `the ${place} building`], rng), ans,
      [`The population is everyone you want to learn about: all ${total} members.`, `The sample is the smaller group you actually ask: the ${n} people.`]);
  }
  const n = pick([20, 25, 40, 50], rng), k = randInt(rng, 2, n / 2), total = n * randInt(rng, 4, 20);
  return num(`In a random sample of <b>${n}</b> students, <b>${k}</b> walk to school. About how many of the school\'s <b>${total}</b> students walk?`, (k * total) / n,
    [`In the sample, ${k} out of ${n} walk.`, `The school has ${total} ÷ ${n} = ${total / n} times as many students.`, `${k} × ${total / n} = ${(k * total) / n}.`]);
}

// ---------------- Mode, IQR, MAD ----------------

export function genSpread(rng, level = 1) {
  if (level === 1) {
    const m = randInt(rng, 2, 20);
    const xs = shuffle([m, m, m, ...until(() => Array.from({ length: 4 }, () => randInt(rng, 1, 25)), v => new Set(v).size === 4 && !v.includes(m))], rng);
    return num(`What is the <b>mode</b> of ${big(xs.join(', '))}?`, m,
      ['The mode is the value that appears most often.', `${m} appears 3 times, more than any other number, so the mode is [[${m}]].`]);
  }
  if (level === 2) {
    const xs = until(() => Array.from({ length: 7 }, () => randInt(rng, 1, 40)), v => new Set(v).size === 7);
    const s = [...xs].sort((a, b) => a - b), q1 = s[1], q3 = s[5];
    return num(`What is the <b>interquartile range</b> (IQR) of ${big(xs.join(', '))}?`, q3 - q1,
      [`Order them: ${s.join(', ')}. The median is the middle one, ${s[3]}.`, `Lower half: ${s.slice(0, 3).join(', ')}, so Q1 = [[${q1}]].`, `Upper half: ${s.slice(4).join(', ')}, so Q3 = ${q3}.`, `IQR = Q3 − Q1 = ${q3} − ${q1} = ${q3 - q1}.`]);
  }
  const xs = until(() => Array.from({ length: 4 }, () => randInt(rng, 1, 30)), v => {
    const mean = v.reduce((a, b) => a + b, 0) / 4;
    return Number.isInteger(mean) && Number.isInteger(v.reduce((a, b) => a + Math.abs(b - mean), 0) / 4) && new Set(v).size > 2;
  });
  const mean = xs.reduce((a, b) => a + b, 0) / 4, devs = xs.map(x => Math.abs(x - mean)), mad = devs.reduce((a, b) => a + b, 0) / 4;
  return num(`What is the <b>mean absolute deviation</b> (MAD) of ${big(xs.join(', '))}?`, mad,
    [`Mean: (${xs.join(' + ')}) ÷ 4 = ${mean}.`, `Distance of each from ${mean}: ${devs.join(', ')}.`, `MAD = mean of the distances: (${devs.join(' + ')}) ÷ 4 = ${mad}.`]);
}

// ---------------- Data displays (drawn as SVG) ----------------

const svgOpen = (w, h, label) => `<svg class="viz" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">`;
const txt = (x, y, s, anchor = 'middle', size = 13) => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" style="fill:var(--ink)">${s}</text>`;
const lineSvg = (x1, y1, x2, y2, w = 2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:var(--ink);stroke-width:${w}"/>`;

export function dotPlot(values, counts, title) {
  const w = 40 * values.length + 20, top = Math.max(...counts), h = 16 * top + 60;
  let s = svgOpen(w, h, title) + lineSvg(10, h - 30, w - 10, h - 30);
  values.forEach((v, i) => {
    const x = 30 + 40 * i;
    s += lineSvg(x, h - 34, x, h - 26, 1.5) + txt(x, h - 12, v);
    for (let k = 0; k < counts[i]; k++) s += `<circle cx="${x}" cy="${h - 42 - 16 * k}" r="6" style="fill:var(--brand)"/>`;
  });
  return `${s}${txt(w / 2, 14, title, 'middle', 12)}</svg>`;
}
export function histogram(bins, counts, title) {
  const bw = 56, w = bw * bins.length + 50, top = Math.max(...counts), unit = 120 / top, h = 190;
  let s = svgOpen(w, h, title) + lineSvg(40, 150, w - 8, 150) + lineSvg(40, 150, 40, 22);
  for (let k = 0; k <= top; k += top > 6 ? 2 : 1) s += txt(34, 154 - k * unit, k, 'end', 11) + `<line x1="40" y1="${150 - k * unit}" x2="${w - 8}" y2="${150 - k * unit}" style="stroke:var(--line);stroke-width:1"/>`;
  bins.forEach((b, i) => {
    const x = 44 + bw * i;
    s += `<rect x="${x}" y="${150 - counts[i] * unit}" width="${bw - 4}" height="${counts[i] * unit}" style="fill:var(--brand);stroke:var(--ink);stroke-width:1"/>` + txt(x + bw / 2 - 2, 168, b, 'middle', 11);
  });
  return `${s}${txt(w / 2, 14, title, 'middle', 12)}</svg>`;
}
export function boxPlot([mn, q1, md, q3, mx], lo, hi, title) {
  const w = 320, x = v => 20 + ((v - lo) / (hi - lo)) * (w - 40);
  let s = svgOpen(w, 120, title) + lineSvg(20, 92, w - 20, 92, 1.5);
  for (let v = lo; v <= hi; v += 5) s += lineSvg(x(v), v % 10 ? 90 : 87, x(v), v % 10 ? 94 : 97, 1) + (v % 10 ? '' : txt(x(v), 110, v, 'middle', 10));
  s += lineSvg(x(mn), 55, x(q1), 55) + lineSvg(x(q3), 55, x(mx), 55) + lineSvg(x(mn), 47, x(mn), 63) + lineSvg(x(mx), 47, x(mx), 63);
  s += `<rect x="${x(q1)}" y="38" width="${x(q3) - x(q1)}" height="34" style="fill:color-mix(in srgb, var(--brand) 30%, transparent);stroke:var(--ink);stroke-width:2"/>` + lineSvg(x(md), 38, x(md), 72, 3);
  return `${s}${txt(w / 2, 16, title, 'middle', 12)}</svg>`;
}

export function genDisplays(rng, level = 1) {
  if (level === 1) {
    const values = [0, 1, 2, 3, 4, 5], counts = until(() => values.map(() => randInt(rng, 0, 6)), c => c.filter(v => v === Math.max(...c)).length === 1 && c.reduce((a, b) => a + b, 0) >= 8);
    const total = counts.reduce((a, b) => a + b, 0), k = randInt(rng, 1, 4), mode = values[counts.indexOf(Math.max(...counts))];
    const viz = dotPlot(values, counts, 'Pets per student');
    return pick([
      () => num(`The dot plot shows how many pets each student has. How many students have <b>${k} pets</b>?`, counts[k], ['Each dot is one student.', `Count the dots above ${k}: there are [[${counts[k]}]].`], { visual: viz }),
      () => num('The dot plot shows how many pets each student has. How many students are in the class?', total, ['Each dot is one student, so count every dot.', `${counts.join(' + ')} = ${total}.`], { visual: viz }),
      () => num('The dot plot shows how many pets each student has. What is the <b>mode</b>?', mode, ['The mode is the value with the most dots (the tallest stack).', `The tallest stack has ${Math.max(...counts)} dots, above [[${mode}]].`], { visual: viz }),
    ], rng)();
  }
  if (level === 2) {
    const bins = ['50-59', '60-69', '70-79', '80-89', '90-99'], counts = values5(rng);
    const viz = histogram(bins, counts, 'Test scores');
    const i = randInt(rng, 0, 4), from = randInt(rng, 2, 4), above = counts.slice(from).reduce((a, b) => a + b, 0);
    return pick([
      () => num(`The histogram shows test scores. How many students scored <b>${bins[i].replace('-', ' to ')}</b>?`, counts[i], ['Each bar shows how many scores fall in that range.', `Read the top of the ${bins[i]} bar on the left scale: [[${counts[i]}]].`], { visual: viz }),
      () => num(`The histogram shows test scores. How many students scored <b>${bins[from].split('-')[0]} or more</b>?`, above, [`Add the bars from ${bins[from]} up.`, `${counts.slice(from).join(' + ')} = ${above}.`], { visual: viz }),
    ], rng)();
  }
  const lo = 0, hi = 100;
  const [mn, q1, md, q3, mx] = until(() => Array.from({ length: 5 }, () => randInt(rng, 1, 19) * 5).sort((a, b) => a - b), v => new Set(v).size === 5);
  const viz = boxPlot([mn, q1, md, q3, mx], lo, hi, 'Minutes of reading per day');
  return pick([
    () => num('The box plot shows minutes of reading per day. What is the <b>median</b>?', md, ['The line inside the box is the median.', `It sits at [[${md}]] on the scale.`], { visual: viz }),
    () => num('The box plot shows minutes of reading per day. What is the <b>interquartile range</b>?', q3 - q1, [`The box goes from Q1 = ${q1} to Q3 = ${q3}.`, `IQR = ${q3} − ${q1} = ${q3 - q1}.`], { visual: viz }),
    () => num('The box plot shows minutes of reading per day. What is the <b>range</b>?', mx - mn, [`The whiskers end at the minimum ${mn} and the maximum ${mx}.`, `Range = ${mx} − ${mn} = ${mx - mn}.`], { visual: viz }),
  ], rng)();
}
function values5(rng) {
  return until(() => Array.from({ length: 5 }, () => randInt(rng, 1, 9)), c => new Set(c).size >= 4);
}

// ---------------- Compound probability ----------------

export function genCompound(rng, level = 1) {
  if (level === 1) {
    const a = randInt(rng, 2, 6), b = randInt(rng, 2, 6), c = rng() < 0.4 ? randInt(rng, 2, 4) : 0;
    return num(`A cafe has <b>${a} sandwiches</b>, <b>${b} drinks</b>${c ? ` and <b>${c} desserts</b>` : ''}. How many different meals can you make with one of each?`, a * b * (c || 1),
      ['Counting principle: multiply the number of choices for each part.', c ? `${a} × ${b} × ${c} = ${a * b * c}.` : `${a} × ${b} = ${a * b}.`]);
  }
  if (level === 2) {
    const k = randInt(rng, 1, 6), g = randInt(rng, 1, 5), c = randInt(rng, 3, 6), m = randInt(rng, 2, c - 1);
    const [desc, n1, d1, n2, d2, w1, w2] = pick([
      [`flip a coin and roll a number cube. What is the probability of <b>heads and a ${k}</b>?`, 1, 2, 1, 6, 'heads', `a ${k}`],
      [`flip a coin and roll a number cube. What is the probability of <b>tails and a number greater than ${g}</b>?`, 1, 2, 6 - g, 6, 'tails', `greater than ${g}`],
      ['flip two coins. What is the probability of <b>two tails</b>?', 1, 2, 1, 2, 'tails', 'tails'],
      ['roll two number cubes. What is the probability of <b>two even numbers</b>?', 3, 6, 3, 6, 'even', 'even'],
      [`spin a spinner with ${c} equal colors and flip a coin. What is the probability of <b>red and heads</b>?`, 1, c, 1, 2, 'red', 'heads'],
      [`pick a marble from a bag with ${m} red and ${c - m} blue, put it back, and pick again. What is the probability of <b>red both times</b>?`, m, c, m, c, 'red', 'red again'],
    ], rng);
    return fraction(`You ${desc}`, n1 * n2, d1 * d2,
      ['The two events do not affect each other, so multiply their probabilities.', `P(${w1}) = ${n1}/${d1} and P(${w2}) = ${n2}/${d2}.`, `${n1}/${d1} × ${n2}/${d2} = ${n1 * n2}/${d1 * d2}.`]);
  }
  const k = randInt(rng, 3, 5), target = randInt(rng, 3, 2 * k - 1);
  const pairs = [];
  for (let i = 1; i <= k; i++) for (let j = 1; j <= k; j++) if (i + j === target) pairs.push(`${i}+${j}`);
  return fraction(`A spinner has the numbers <b>1 to ${k}</b>. You spin it twice and add. What is the probability the sum is <b>${target}</b>?`, pairs.length, k * k,
    [`Make a list or tree: ${k} × ${k} = ${k * k} outcomes.`, `Ways to make ${target}: ${pairs.join(', ')}. That is [[${pairs.length}]].`, `Probability = ${pairs.length}/${k * k}.`]);
}

// ---------------- Functions ----------------

export function genFunctions(rng, level = 1) {
  if (level === 1) {
    const xs = shuffle([1, 2, 3, 4, 5, 6, 7], rng).slice(0, 4), isF = rng() < 0.5;
    const pairs = xs.map(x => [x, randInt(rng, 0, 12)]);
    if (!isF) pairs[3] = [pairs[1][0], (pairs[1][1] + randInt(rng, 1, 5)) % 13];
    const shown = shuffle(pairs, rng).map(([x, y]) => pt(x, y)).join(', ');
    return choice(`Is this relation a <b>function</b>? ${big(`{${shown}}`)}`, ['Yes', 'No'], isF ? 'Yes' : 'No',
      ['A function gives each input (x) exactly one output (y).', isF ? 'Every x appears only once, so yes, it is a function.' : `The input ${pairs[1][0]} goes to two different outputs, so it is not a function.`]);
  }
  if (level === 2) {
    const a = nz(rng, -6, 6), b = nz(rng, -9, 9), x = randInt(rng, -4, 6);
    return int(`If ${big(`f(x) = ${a === 1 ? '' : a === -1 ? '−' : neg(a)}x ${b < 0 ? '−' : '+'} ${Math.abs(b)}`)}, what is ${big(`f(${neg(x)})`)}?`, a * x + b,
      ['f(x) is the output when the input is x. Put the number in for x.', `${neg(a)} × ${paren(x)} = ${neg(a * x)}.`, `${neg(a * x)} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${neg(a * x + b)}.`]);
  }
  const ys = until(() => Array.from({ length: 4 }, () => randInt(rng, 0, 9)), v => new Set(v).size === 3);
  const xs = [1, 2, 3, 4], range = [...new Set(ys)].sort((p, q) => p - q), ans = `{${range.join(', ')}}`;
  const wrongs = [`{${xs.join(', ')}}`, `{${ys.join(', ')}}`, `{${range.slice(0, 2).join(', ')}}`].filter(w => w !== ans);
  return choice(`What is the <b>range</b> of ${big(`{${xs.map((x, i) => pt(x, ys[i])).join(', ')}}`)}?`, shuffle([ans, ...wrongs].filter((v, i, a) => a.indexOf(v) === i), rng), ans,
    ['The domain is the set of inputs (x). The range is the set of outputs (y).', `The outputs are ${ys.join(', ')}. List each one once, in order: ${ans}.`]);
}

// ---------------- Systems of equations ----------------

export function genSystems(rng, level = 1) {
  if (level === 3) {
    const total = randInt(rng, 8, 20), adult = randInt(rng, 2, total - 2), pa = randInt(rng, 6, 12), pc = until(() => randInt(rng, 2, 8), v => v < pa);
    const cost = adult * pa + (total - adult) * pc;
    return num(`Adult tickets cost <b>$${pa}</b> and child tickets cost <b>$${pc}</b>. A group bought <b>${total} tickets</b> for <b>$${cost}</b>. How many <b>adult</b> tickets?`, adult,
      [`Let a = adult tickets. Then child tickets = ${total} − a.`, `${pa}a + ${pc}(${total} − a) = ${cost}, so ${pa - pc}a + ${pc * total} = ${cost}.`, `${pa - pc}a = ${cost} − ${pc * total} = ${(pa - pc) * adult}, so a = ${(pa - pc) * adult} ÷ ${pa - pc} = ${adult}.`]);
  }
  const x = randInt(rng, -5, 6), [m1, m2] = until(() => [nz(rng, -4, 5), nz(rng, -4, 5)], ([p, q]) => p !== q);
  const [b1, y, b2] = until(() => { const b = nz(rng, -8, 8), yy = m1 * x + b; return [b, yy, yy - m2 * x]; }, ([, , c]) => c !== 0);
  const eq = (m, b) => `y = ${m === 1 ? '' : m === -1 ? '−' : neg(m)}x ${b < 0 ? '−' : '+'} ${Math.abs(b)}`;
  const shown = `${big(eq(m1, b1))} and ${big(eq(m2, b2))}`;
  const steps = ['Both equations equal y, so set them equal to each other.', `${neg(m1)}x ${b1 < 0 ? '−' : '+'} ${Math.abs(b1)} = ${neg(m2)}x ${b2 < 0 ? '−' : '+'} ${Math.abs(b2)}, so ${neg(m1 - m2)}x = ${neg(b2 - b1)} and x = ${neg(x)}.`];
  if (level === 1) return int(`The lines ${shown} cross at one point. What is <b>x</b> there?`, x, steps);
  return int(`The lines ${shown} cross at one point. What is <b>y</b> there?`, y, [...steps, `Put x = ${neg(x)} into the first equation: y = ${neg(m1)} × ${paren(x)} ${b1 < 0 ? '−' : '+'} ${Math.abs(b1)} = ${neg(y)}.`]);
}

// ---------------- Linear and nonlinear ----------------

export function genNonlinear(rng, level = 1) {
  if (level === 1) {
    const a = randInt(rng, 2, 9), b = randInt(rng, 1, 9);
    const [eq, lin, why] = pick([
      [`y = ${a}x + ${b}`, true, 'x has no exponent, so the graph is a straight line'],
      [`y = −x + ${b}`, true, 'x has no exponent, so the graph is a straight line'],
      [`y = x² + ${b}`, false, 'x is squared, so the graph curves'],
      [`y = ${a}/x`, false, 'x is in the bottom of a fraction, so the graph curves'],
      [`y = x³`, false, 'x is cubed, so the graph curves'],
      [`y = ${a}x`, true, 'x has no exponent, so the graph is a straight line'],
    ], rng);
    return choice(`Is ${big(eq)} linear or nonlinear?`, ['linear', 'nonlinear'], lin ? 'linear' : 'nonlinear', ['Linear equations look like y = mx + b: x to the first power only.', `In ${eq}, ${why}.`]);
  }
  if (level === 2) {
    const lin = rng() < 0.5, m = randInt(rng, 2, 6), b = randInt(rng, 0, 5);
    const ys = [1, 2, 3, 4].map(x => (lin ? m * x + b : x * x + b));
    const diffs = ys.slice(1).map((y, i) => y - ys[i]);
    return choice(`Is this table linear or nonlinear?<table class="io-table"><tr><th>x</th><th>y</th></tr>${ys.map((y, i) => `<tr><td>${i + 1}</td><td>${y}</td></tr>`).join('')}</table>`, ['linear', 'nonlinear'], lin ? 'linear' : 'nonlinear',
      ['When x goes up by 1 each time, a linear table goes up by the same amount every time.', `The y values go up by ${diffs.join(', ')}.`, lin ? 'Always the same, so it is linear.' : 'Not the same, so it is nonlinear.']);
  }
  if (rng() < 0.5) {
    const s = randInt(rng, 1, 5), base = pick([2, 3], rng), ys = [1, 2, 3, 4].map(x => s * base ** x);
    return num(`Find the pattern. When x = 5, what is y?<table class="io-table"><tr><th>x</th><th>y</th></tr>${ys.map((y, i) => `<tr><td>${i + 1}</td><td>${y}</td></tr>`).join('')}</table>`, s * base ** 5,
      [`Compare each y with the one before: each is ${base} times bigger.`, `So y at x = 5 is ${ys[3]} × ${base} = ${s * base ** 5}.`]);
  }
  const c = randInt(rng, 0, 10), ys = [1, 2, 3, 4].map(x => x * x + c);
  return num(`Find the pattern. When x = 5, what is y?<table class="io-table"><tr><th>x</th><th>y</th></tr>${ys.map((y, i) => `<tr><td>${i + 1}</td><td>${y}</td></tr>`).join('')}</table>`, 25 + c,
    [`Each y is x × x${c ? ` + ${c}` : ''}: for example 3 × 3${c ? ` + ${c}` : ''} = ${9 + c}.`, `At x = 5: 5 × 5${c ? ` + ${c}` : ''} = ${25 + c}.`]);
}

// ---------------- Polygons on the coordinate plane ----------------

export function genGridPolygons(rng, level = 1) {
  if (level === 1) {
    const v = rng() < 0.5, k = randInt(rng, -6, 6), [p, q] = until(() => [randInt(rng, -8, 8), randInt(rng, -8, 8)], ([a, b]) => Math.abs(a - b) >= 2);
    const A = v ? pt(k, p) : pt(p, k), B = v ? pt(k, q) : pt(q, k);
    return num(`How long is the side from ${big(A)} to ${big(B)}?`, Math.abs(p - q),
      [`The ${v ? 'x' : 'y'} values match, so the side is ${v ? 'up and down' : 'side to side'}: subtract the other numbers.`, `${neg(Math.max(p, q))} − ${paren(Math.min(p, q))} = ${Math.abs(p - q)}.`]);
  }
  const x1 = randInt(rng, -6, 2), y1 = randInt(rng, -6, 2), w = randInt(rng, 2, 8), h = randInt(rng, 2, 8);
  const verts = [pt(x1, y1), pt(x1 + w, y1), pt(x1 + w, y1 + h), pt(x1, y1 + h)].join(', ');
  if (level === 2) {
    const area = rng() < 0.5;
    return num(`A rectangle has corners at ${big(verts)}. What is its <b>${area ? 'area' : 'perimeter'}</b>?`, area ? w * h : 2 * (w + h),
      [`Width: ${neg(x1 + w)} − ${paren(x1)} = ${w}. Height: ${neg(y1 + h)} − ${paren(y1)} = ${h}.`, area ? `Area = ${w} × ${h} = ${w * h}.` : `Perimeter = 2 × (${w} + ${h}) = ${2 * (w + h)}.`]);
  }
  const W = 2 * randInt(rng, 1, 5);
  return num(`A right triangle has corners at ${big([pt(x1, y1), pt(x1 + W, y1), pt(x1, y1 + h)].join(', '))}. What is its <b>area</b>?`, (W * h) / 2,
    [`The base runs along y = ${neg(y1)}: ${neg(x1 + W)} − ${paren(x1)} = ${W}. The height runs along x = ${neg(x1)}: ${neg(y1 + h)} − ${paren(y1)} = ${h}.`, `Area = base × height ÷ 2 = ${W} × ${h} ÷ 2 = ${(W * h) / 2}.`]);
}

// ---------------- Transformations ----------------

export function genTransform(rng, level = 1) {
  const x = nz(rng, -8, 8), y = nz(rng, -8, 8);
  const opts = (ans, more) => shuffle([ans, ...more].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4), rng);
  if (level === 1) {
    const dx = nz(rng, -6, 6), dy = nz(rng, -6, 6), ans = pt(x + dx, y + dy);
    const move = `${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'} and ${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}`;
    return choice(`Translate (slide) ${big(pt(x, y))} <b>${move}</b>. Where does it land?`, opts(ans, [pt(x - dx, y - dy), pt(x + dy, y + dx), pt(x + dx, y - dy), pt(x - dx, y + dy)]), ans,
      ['Right and left change x. Up and down change y.', `x: ${neg(x)} ${dx > 0 ? '+' : '−'} ${Math.abs(dx)} = [[${neg(x + dx)}]].`, `y: ${neg(y)} ${dy > 0 ? '+' : '−'} ${Math.abs(dy)} = ${neg(y + dy)}. It lands at ${ans}.`]);
  }
  if (level === 2) {
    const [turn, rule, f] = pick([
      ['90° counterclockwise', '(x, y) becomes (−y, x)', () => [-y, x]],
      ['90° clockwise', '(x, y) becomes (y, −x)', () => [y, -x]],
      ['180°', '(x, y) becomes (−x, −y)', () => [-x, -y]],
    ], rng);
    const [nx, ny] = f(), ans = pt(nx, ny);
    return choice(`Rotate ${big(pt(x, y))} <b>${turn}</b> around the origin. Where does it land?`, opts(ans, [pt(-y, x), pt(y, -x), pt(-x, -y), pt(-x, y), pt(x, -y)]), ans,
      [`For a ${turn} turn around (0, 0), ${rule}.`, `So ${pt(x, y)} becomes ${ans}.`]);
  }
  const k = pick([2, 3, 0.5], rng);
  const [x2, y2] = k === 0.5 ? [2 * x, 2 * y] : [x, y];
  const ans = pt(x2 * k, y2 * k);
  return choice(`Dilate ${big(pt(x2, y2))} by a <b>scale factor of ${k === 0.5 ? '1/2' : k}</b> from the origin. Where does it land?`, opts(ans, [pt(x2 + k, y2 + k), pt(x2 * k, y2), pt(x2, y2 * k), pt(Math.round(x2 / (k === 0.5 ? 1 : k)), Math.round(y2 / (k === 0.5 ? 1 : k)))]), ans,
    [`A dilation from the origin multiplies both coordinates by the scale factor ${k === 0.5 ? '1/2' : k}.`, `x: ${neg(x2)} × ${k === 0.5 ? '1/2' : k} = [[${neg(x2 * k)}]]. y: ${neg(y2)} × ${k === 0.5 ? '1/2' : k} = ${neg(y2 * k)}.`, `It lands at ${ans}.`]);
}

// ---------------- Skills ----------------

const DEFS = [
  M('num-types', 'int', 'Types of numbers', '🔢', ['int-line'], 'Whole, integer, rational, irrational',
    [T('Whole, integer or rational?', r => genNumTypes(r, 1)), T('Rational or irrational?', r => genNumTypes(r, 2)), T('Compare √50 and 7.2', r => genNumTypes(r, 3))]),
  M('frac-mixed', 'frac', 'Mixed numbers', '🥨', ['frac-equiv'], '2 3/4 = 11/4',
    [T('Mixed to improper', r => genMixed(r, 1)), T('Improper to mixed', r => genMixed(r, 2)), T('Add mixed numbers', r => genMixed(r, 3))]),
  M('money-commission', 'money', 'Commission', '💼', ['pct-of'], '5% of the sales',
    [T('Find the commission', r => genCommission(r, 1)), T('Pay plus commission', r => genCommission(r, 2)), T('Find the rate', r => genCommission(r, 3))]),
  M('alg-props', 'alg', 'Properties', '🔄', ['alg-missing'], 'Commutative, associative, distributive',
    [T('Name the property', r => genProperties(r, 1)), T('Fill the box', r => genProperties(r, 2)), T('Distribute to multiply', r => genProperties(r, 3))]),
  M('alg-both', 'alg', 'x on both sides', '⚖️', ['alg-two'], '5x − 3 = 2x + 9',
    [T('3x + 4 = x + 12', r => genBothSides(r, 1)), T('With minus signs', r => genBothSides(r, 2)), T('Distribute first', r => genBothSides(r, 3))]),
  M('alg-words', 'alg', 'Equation word problems', '📜', ['alg-one'], 'Write it, then solve it',
    [T('One step', r => genEqWords(r, 1)), T('Two steps', r => genEqWords(r, 2)), T('Perimeters and number pairs', r => genEqWords(r, 3))]),
  M('geo-basics', 'geo', 'Points, lines & angles', '📌', ['num-place'], 'Rays, segments, parallel lines',
    [T('Points, lines, rays', r => genGeoBasics(r, 1)), T('Parallel or perpendicular', r => genGeoBasics(r, 2)), T('Acute, right, obtuse', r => genGeoBasics(r, 3))]),
  M('geo-shapes', 'geo', 'Triangles & quadrilaterals', '🔺', ['geo-basics'], 'Name the shape',
    [T('Triangles by sides', r => genShapes(r, 1)), T('Triangles by angles', r => genShapes(r, 2)), T('Quadrilaterals', r => genShapes(r, 3))]),
  M('geo-3d', 'geo', '3D figures', '🧊', ['geo-shapes'], 'Faces, edges, vertices, cross-sections',
    [T('Count faces and edges', r => gen3D(r, 1)), T('Prisms and pyramids', r => gen3D(r, 2)), T("Cross-sections and Euler's rule", r => gen3D(r, 3))]),
  M('geo-volume2', 'geo', 'Pyramids, cones & spheres', '🍦', ['geo-volume'], 'Volume with 1/3 and 4/3',
    [T('Pyramids', r => genVolume2(r, 1)), T('Cones', r => genVolume2(r, 2)), T('Spheres', r => genVolume2(r, 3))]),
  M('geo-transversal', 'geo', 'Parallel lines & transversals', '🛤️', ['geo-angles'], 'Corresponding and alternate angles',
    [T('Corresponding and vertical', r => genTransversal(r, 1)), T('Alternate and same-side', r => genTransversal(r, 2)), T('Solve for x', r => genTransversal(r, 3))]),
  M('stats-sample', 'stats', 'Questions & samples', '🗳️', ['stats-center'], 'Statistical questions and samples',
    [T('Statistical questions', r => genSamples(r, 1)), T('Population or sample?', r => genSamples(r, 2)), T('Predict from a sample', r => genSamples(r, 3))]),
  M('stats-spread', 'stats', 'Mode, IQR & MAD', '📏', ['stats-center'], 'Most common and how spread out',
    [T('Mode', r => genSpread(r, 1)), T('Interquartile range', r => genSpread(r, 2)), T('Mean absolute deviation', r => genSpread(r, 3))]),
  M('stats-displays', 'stats', 'Dot plots, histograms & box plots', '📊', ['stats-center'], 'Read data displays',
    [T('Dot plots', r => genDisplays(r, 1)), T('Histograms', r => genDisplays(r, 2)), T('Box plots', r => genDisplays(r, 3))]),
  M('stats-compound', 'stats', 'Compound probability', '🎰', ['stats-prob'], 'Two events, outcomes, trees',
    [T('Count the outcomes', r => genCompound(r, 1)), T('Two events', r => genCompound(r, 2)), T('Sums of two spins', r => genCompound(r, 3))]),
  M('graph-functions', 'graph', 'Functions', '🔌', ['graph-points'], 'One output for each input',
    [T('Is it a function?', r => genFunctions(r, 1)), T('f(x) notation', r => genFunctions(r, 2)), T('Domain and range', r => genFunctions(r, 3))]),
  M('graph-systems', 'graph', 'Systems of equations', '✖️', ['graph-linear'], 'Where two lines cross',
    [T('Find x', r => genSystems(r, 1)), T('Find y', r => genSystems(r, 2)), T('Ticket problems', r => genSystems(r, 3))]),
  M('graph-nonlinear', 'graph', 'Linear or nonlinear?', '〰️', ['graph-linear'], 'Lines and curves',
    [T('From the equation', r => genNonlinear(r, 1)), T('From a table', r => genNonlinear(r, 2)), T('Continue the pattern', r => genNonlinear(r, 3))]),
  M('graph-polygons', 'graph', 'Shapes on a grid', '🟪', ['graph-points'], 'Side lengths, area, perimeter',
    [T('Side lengths', r => genGridPolygons(r, 1)), T('Rectangles', r => genGridPolygons(r, 2)), T('Right triangles', r => genGridPolygons(r, 3))]),
  M('graph-transform', 'graph', 'Transformations', '🌀', ['graph-points'], 'Slide, turn, grow',
    [T('Translations', r => genTransform(r, 1)), T('Rotations', r => genTransform(r, 2)), T('Dilations', r => genTransform(r, 3))]),
];

export const MIDDLE2_SKILLS = DEFS.map(({ tiers, ...s }) => ({ ...s, gen: tiers[1].gen }));
export const MIDDLE2_TIERS = Object.fromEntries(DEFS.map(d => [d.id, d.tiers]));
