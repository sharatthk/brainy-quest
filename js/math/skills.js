// Math skill tree, problem generators, worked solutions and misconception detection.
// Pure module (no DOM) so it can be unit tested in Node.
import { randInt, pick, shuffle, gcd } from '../shared/util.js';

import { MIDDLE_UNITS, MIDDLE_SKILLS } from './middle.js';

export const COL = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands', 'hundred-thousands'];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export const dls = n => String(n).split('').reverse().map(Number); // least significant digit first
const len = n => String(n).length;
export const nd = (rng, n) => randInt(rng, 10 ** (n - 1), 10 ** n - 1);
const fromDigitsMsFirst = arr => Number(arr.join(''));

export function until(make, ok, tries = 5000) {
  for (let i = 0; i < tries; i++) {
    const v = make();
    if (ok(v)) return v;
  }
  throw new Error('generator could not satisfy constraint');
}

export const frac = (n, d) => `<span class="frac"><span>${n}</span><span>${d}</span></span>`;

// ---------- Column arithmetic ----------

export function countCarries(a, b) {
  const A = dls(a), B = dls(b);
  let c = 0, n = 0;
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const s = (A[i] || 0) + (B[i] || 0) + c;
    c = s >= 10 ? 1 : 0;
    n += c;
  }
  return n;
}

export function addSolution(a, b) {
  const A = dls(a), B = dls(b), n = Math.max(A.length, B.length);
  const carries = [];
  const steps = [];
  let c = 0;
  for (let i = 0; i < n; i++) {
    const x = A[i] || 0, y = B[i] || 0, s = x + y + c;
    carries[i] = c;
    let t = `${cap(COL[i])}: ${x} + ${y}${c ? ` + ${c} (carried)` : ''} = ${s}.`;
    t += s >= 10 ? ` Write ${s % 10} and carry 1 to the ${COL[i + 1]}.` : ` Write ${s}.`;
    steps.push(t);
    c = s >= 10 ? 1 : 0;
  }
  if (c) {
    carries[n] = 1;
    steps.push(`Bring the carried 1 down into the ${COL[n]} place.`);
  }
  return { carries, steps };
}

// Simulates borrowing; returns the working digits after all borrows.
function subWork(a, b) {
  const work = dls(a), B = dls(b), n = work.length;
  const changed = new Array(n).fill(false);
  const events = [];
  for (let i = 0; i < n; i++) {
    const y = B[i] || 0;
    if (work[i] < y) {
      let j = i + 1;
      while (work[j] === 0) j++;
      events.push({ col: i, from: j, before: [...work] });
      work[j]--;
      changed[j] = true;
      for (let k = j - 1; k > i; k--) {
        work[k] = 9;
        changed[k] = true;
      }
      work[i] += 10;
      changed[i] = true;
    }
    events.push({ col: i, diff: work[i] - y, top: work[i], y });
  }
  return { work, changed, events };
}

export function countBorrows(a, b) {
  return subWork(a, b).events.filter(e => e.from !== undefined).length;
}

export function borrowsAcrossZero(a, b) {
  return subWork(a, b).events.some(e => e.from !== undefined && e.from > e.col + 1);
}

export function subSolution(a, b) {
  const { work, changed, events } = subWork(a, b);
  const steps = [];
  const n = work.length;
  for (const e of events) {
    const i = e.col;
    if (e.from !== undefined) {
      const top = e.before[i], j = e.from, zeros = j - i - 1;
      const y = dls(b)[i] || 0;
      if (zeros === 0) {
        steps.push(`${cap(COL[i])}: ${top} is smaller than ${y}, so borrow 1 from the ${COL[j]}. The ${COL[j]} digit ${e.before[j]} becomes ${e.before[j] - 1}, and ${top} becomes ${top + 10}.`);
      } else {
        steps.push(`${cap(COL[i])}: ${top} is smaller than ${y}, but the ${COL[i + 1]} digit is 0, so go next door to the ${COL[j]}: ${e.before[j]} becomes ${e.before[j] - 1}, ${zeros > 1 ? 'each 0 becomes 9' : 'the 0 becomes 9'}, and ${top} becomes ${top + 10}.`);
      }
    } else {
      if (i === n - 1 && i > 0 && e.diff === 0) {
        steps.push(`${cap(COL[i])}: ${e.top} − ${e.y} = 0. Nothing left here, so we don't write a leading 0.`);
      } else {
        steps.push(`${cap(COL[i])}: ${e.top} − ${e.y} = ${e.diff}. Write ${e.diff}.`);
      }
    }
  }
  return { newTop: work.map((v, i) => (changed[i] ? v : null)), steps };
}

export function mulSolution(a, m) {
  const A = dls(a);
  const carries = [];
  const steps = [];
  let c = 0;
  for (let i = 0; i < A.length; i++) {
    const p = A[i] * m + c;
    carries[i] = c;
    const last = i === A.length - 1;
    let t = `${cap(COL[i])}: ${A[i]} × ${m}${c ? ` + ${c} (carried)` : ''} = ${p}.`;
    if (last) t += p >= 10 ? ` It's the last digit, so write the whole ${p}.` : ` Write ${p}.`;
    else t += p >= 10 ? ` Write ${p % 10} and carry ${Math.floor(p / 10)}.` : ` Write ${p}.`;
    steps.push(t);
    c = Math.floor(p / 10);
  }
  return { carries, steps };
}

export function mul2Solution(a, b) {
  const ones = b % 10, tens = Math.floor(b / 10);
  const p1 = a * ones, p2 = a * tens * 10;
  return {
    steps: [
      `Multiply by the ones digit: ${a} × ${ones} = ${p1}.`,
      `Multiply by the tens digit: ${a} × ${tens * 10} = ${p2}. (Write a 0 in the ones place first, then ${a} × ${tens} = ${a * tens}.)`,
      `Add the two parts: ${p1} + ${p2} = ${a * b}.`,
    ],
  };
}

export function divSolution(a, b) {
  const steps = [];
  let rem = 0;
  let started = false;
  for (const d of String(a).split('').map(Number)) {
    const cur = rem * 10 + d;
    const q = Math.floor(cur / b);
    if (!started && q === 0) {
      steps.push(`${b} doesn't fit into ${cur}, so look at the next digit too.`);
      rem = cur;
      continue;
    }
    started = true;
    steps.push(`${cur} ÷ ${b} = ${q}${q ? ` (because ${q} × ${b} = ${q * b})` : ''}, leftover ${cur - q * b}.`);
    rem = cur - q * b;
  }
  const q = Math.floor(a / b);
  steps.push(rem ? `So ${a} ÷ ${b} = ${q} remainder ${rem}. Check: ${q} × ${b} + ${rem} = ${a}.` : `So ${a} ÷ ${b} = ${q}. Check: ${q} × ${b} = ${a}.`);
  return { steps };
}

export function makeAdd(a, b) {
  const s = addSolution(a, b);
  return { kind: 'column', op: '+', a, b, answer: a + b, cells: Math.max(len(a), len(b)) + 1, carries: s.carries, steps: s.steps };
}
export function makeSub(a, b) {
  const s = subSolution(a, b);
  return { kind: 'column', op: '−', a, b, answer: a - b, cells: len(a), newTop: s.newTop, steps: s.steps };
}
export function makeMul(a, b) {
  if (b < 10) {
    const s = mulSolution(a, b);
    return { kind: 'column', op: '×', a, b, answer: a * b, cells: len(a) + 1, carries: s.carries, steps: s.steps };
  }
  return { kind: 'column', op: '×', a, b, answer: a * b, cells: len(a) + len(b), carries: null, steps: mul2Solution(a, b).steps };
}
export function makeDivision(a, b) {
  return { kind: 'division', a, b, q: Math.floor(a / b), r: a % b, prompt: `${a} ÷ ${b}`, steps: divSolution(a, b).steps };
}

// ---------- Misconception detection ----------

function addNoCarry(a, b) {
  const A = dls(a), B = dls(b), n = Math.max(A.length, B.length);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const s = (A[i] || 0) + (B[i] || 0);
    out.push(i === n - 1 ? s : s % 10);
  }
  return fromDigitsMsFirst(out);
}
function subFlip(a, b) {
  const A = dls(a), B = dls(b);
  const out = [];
  for (let i = A.length - 1; i >= 0; i--) out.push(Math.abs(A[i] - (B[i] || 0)));
  return fromDigitsMsFirst(out);
}
function subNoDecrement(a, b) {
  const A = dls(a), B = dls(b);
  const out = [];
  for (let i = A.length - 1; i >= 0; i--) {
    const x = A[i], y = B[i] || 0;
    out.push(x < y ? x + 10 - y : x - y);
  }
  return fromDigitsMsFirst(out);
}
function mulNoCarry(a, m) {
  const A = dls(a);
  const out = [];
  for (let i = A.length - 1; i >= 0; i--) out.push(i === A.length - 1 ? A[i] * m : (A[i] * m) % 10);
  return fromDigitsMsFirst(out);
}

export function diagnose(p, given) {
  const g = Number(String(given).replace(/[^\d]/g, ''));
  if (!String(given).trim() || !Number.isFinite(g) || g === p.answer || p.kind !== 'column') return null;
  if (p.op === '+' && g === addNoCarry(p.a, p.b)) {
    return { tag: 'forgot-carry', hint: 'It looks like you forgot to carry. When a column adds up to 10 or more, write the ones digit and carry the 1 to the next column.' };
  }
  if (p.op === '−') {
    if (g === subFlip(p.a, p.b)) return { tag: 'flip-subtract', hint: 'It looks like you took the smaller digit away from the bigger one. When the top digit is smaller, you need to borrow from the next column!' };
    if (g === subNoDecrement(p.a, p.b)) return { tag: 'forgot-decrement', hint: 'You borrowed, but forgot to make the next digit 1 smaller. When you borrow, cross out the digit next door and write one less.' };
  }
  if (p.op === '×' && p.b < 10 && g === mulNoCarry(p.a, p.b)) {
    return { tag: 'forgot-carry', hint: 'Remember to add the carried number after you multiply the next digit.' };
  }
  if (p.op === '×' && p.b >= 10 && g === p.a * (p.b % 10) + p.a * Math.floor(p.b / 10)) {
    return { tag: 'forgot-zero', hint: 'When you multiply by the tens digit, remember the placeholder 0 - you are really multiplying by tens!' };
  }
  return null;
}

// ---------- Answer checking ----------

export function checkAnswer(p, given) {
  if (p.kind === 'choice') return given === p.answer;
  if (p.kind === 'division') {
    const q = String(given.q ?? '').trim(), r = String(given.r ?? '').trim();
    if (!/^\d+$/.test(q) || (r && !/^\d+$/.test(r))) return false;
    return Number(q) === p.q && Number(r || 0) === p.r;
  }
  if (p.kind === 'fraction') {
    const n = String(given.n ?? '').trim(), d = String(given.d ?? '').trim();
    if (!/^\d+$/.test(n) || !/^\d+$/.test(d) || Number(d) === 0) return false;
    return Number(n) * p.answer.d === p.answer.n * Number(d);
  }
  const s = String(given ?? '').replace(/[,\s$%]/g, '').replace(/^[−–]/, '-');
  if (p.answerType === 'big') return parseBigNumber(given) === p.answer;
  if (p.answerType === 'int') return /^-?\d+$/.test(s) && Number(s) === p.answer;
  if (p.answerType === 'decimal') {
    if (!/^-?\d*\.?\d+$/.test(s)) return false;
    return Math.abs(parseFloat(s) - p.answer) < 1e-9;
  }
  return /^\d+$/.test(s) && Number(s) === p.answer;
}

export function answerText(p) {
  if (p.answerText) return p.answerText;
  if (p.kind === 'division') return p.r ? `${p.q} R ${p.r}` : `${p.q}`;
  if (p.kind === 'fraction') return `${p.answer.n}/${p.answer.d}`;
  return String(p.answer);
}

// ---------- Guided (coach) plan for + and − ----------

export function guidedPlan(p) {
  const steps = [];
  if (p.op === '+') {
    const A = dls(p.a), B = dls(p.b), n = Math.max(A.length, B.length);
    let c = 0;
    for (let i = 0; i < n; i++) {
      const x = A[i] || 0, y = B[i] || 0, s = x + y + c;
      steps.push({
        col: i, kind: 'ask',
        question: `${cap(COL[i])} column: ${x} + ${y}${c ? ` + ${c} (the carry)` : ''} = ?`,
        expect: s,
        success: s >= 10 ? `${s} is 10 or more! Write ${s % 10} and carry 1 to the ${COL[i + 1]}.` : `Write ${s}.`,
        write: s % 10,
        carry: s >= 10 ? { col: i + 1, value: 1 } : null,
      });
      c = s >= 10 ? 1 : 0;
    }
    if (c) steps.push({ col: n, kind: 'info', text: 'Bring the carried 1 straight down.', write: 1 });
    return steps;
  }
  if (p.op === '−') {
    const work = dls(p.a), B = dls(p.b), n = work.length;
    for (let i = 0; i < n; i++) {
      const y = B[i] || 0;
      const need = work[i] < y;
      const step = {
        col: i, kind: 'yesno',
        question: `${cap(COL[i])} column: ${work[i]} on top, ${y} on the bottom. Do we need to borrow?`,
        expect: need,
        success: need ? `Yes! ${work[i]} is smaller than ${y}, so we borrow.` : `Right - ${work[i]} is big enough, no borrowing needed.`,
        changes: [],
      };
      if (need) {
        let j = i + 1;
        while (work[j] === 0) j++;
        work[j]--;
        step.changes.push({ col: j, value: work[j] });
        for (let k = j - 1; k > i; k--) {
          work[k] = 9;
          step.changes.push({ col: k, value: 9 });
        }
        work[i] += 10;
        step.changes.push({ col: i, value: work[i] });
      }
      steps.push(step);
      const d = work[i] - y;
      if (i === n - 1 && i > 0 && d === 0) continue; // no leading zero
      steps.push({ col: i, kind: 'ask', question: `${work[i]} − ${y} = ?`, expect: d, success: `Write ${d}.`, write: d });
    }
    return steps;
  }
  return [];
}

// ---------- Visuals ----------

export function fracBar(n, d, w = 260, hgt = 44) {
  const seg = w / d;
  let s = `<svg class="viz" viewBox="0 0 ${w + 4} ${hgt + 4}" width="${w + 4}" height="${hgt + 4}" role="img" aria-label="${n} of ${d} parts shaded">`;
  for (let i = 0; i < d; i++) {
    s += `<rect x="${2 + i * seg}" y="2" width="${seg}" height="${hgt}" rx="3" style="fill:${i < n ? 'var(--brand)' : 'var(--card)'};stroke:var(--ink);stroke-width:2"/>`;
  }
  return `${s}</svg>`;
}

export function fracPie(n, d, r = 64) {
  const c = r + 4;
  let s = `<svg class="viz" viewBox="0 0 ${c * 2} ${c * 2}" width="${c * 2}" height="${c * 2}" role="img" aria-label="${n} of ${d} slices shaded">`;
  for (let i = 0; i < d; i++) {
    const a0 = (i / d) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / d) * 2 * Math.PI - Math.PI / 2;
    const x0 = c + r * Math.cos(a0), y0 = c + r * Math.sin(a0), x1 = c + r * Math.cos(a1), y1 = c + r * Math.sin(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    s += `<path d="M${c},${c} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z" style="fill:${i < n ? 'var(--brand)' : 'var(--card)'};stroke:var(--ink);stroke-width:2"/>`;
  }
  return `${s}</svg>`;
}

export function percentGrid(n) {
  const cell = 18;
  let s = `<svg class="viz" viewBox="0 0 ${cell * 10 + 4} ${cell * 10 + 4}" width="${cell * 10 + 4}" height="${cell * 10 + 4}" role="img" aria-label="${n} of 100 squares shaded">`;
  for (let i = 0; i < 100; i++) {
    const x = 2 + (i % 10) * cell, y = 2 + Math.floor(i / 10) * cell;
    s += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" style="fill:${i < n ? 'var(--brand)' : 'var(--card)'};stroke:var(--ink);stroke-width:1"/>`;
  }
  return `${s}</svg>`;
}

// ---------- Generators for non-column skills ----------

// digits: how many digits the number may have (2-6).
export function genPlace(rng, digits = [3, 4]) {
  const n = nd(rng, pick(digits, rng));
  const D = dls(n);
  const i = until(() => randInt(rng, 0, D.length - 1), k => D[k] !== 0);
  const shown = String(n).split('').map((ch, idx, arr) => {
    const pos = arr.length - 1 - idx;
    const comma = pos === 3 ? ',' : '';
    return (pos === i ? `<b class="hl">${ch}</b>` : ch) + comma;
  }).join('');
  if (rng() < 0.6) {
    return {
      kind: 'input', prompt: `What is the value of the highlighted <b class="hl">${D[i]}</b> in <span class="big-num">${shown}</span>?`,
      answer: D[i] * 10 ** i,
      steps: [`The ${D[i]} is in the ${COL[i]} place, so it is worth ${D[i]} × ${(10 ** i).toLocaleString('en-US')} = ${(D[i] * 10 ** i).toLocaleString('en-US')}.`],
    };
  }
  const plain = n.toLocaleString('en-US');
  return {
    kind: 'input', prompt: `Which digit is in the <b>${COL[i]}</b> place of <span class="big-num">${plain}</span>?`,
    answer: D[i],
    steps: [`Count places from the right: ones, tens, hundreds, thousands. The ${COL[i]} digit is ${D[i]}.`],
  };
}

const PLACE_NAME = { 10: 'ten', 100: 'hundred', 1000: 'thousand' };
const LOOK_AT = { 10: 'ones', 100: 'tens', 1000: 'hundreds' };
function roundQ(n, place) {
  const ans = Math.round(n / place) * place, d = Math.floor(n / (place / 10)) % 10;
  const f = x => x.toLocaleString('en-US');
  return {
    kind: 'input', prompt: `Round <span class="big-num">${f(n)}</span> to the nearest <b>${PLACE_NAME[place]}</b>.`, answer: ans,
    steps: [`Look at the ${LOOK_AT[place]} digit: ${d}. ${d >= 5 ? '5 or more means round up' : 'Less than 5 means round down'}, so ${f(n)} rounds to ${f(ans)}.`],
  };
}

// level 1: 2-digit to the nearest ten. 2: 3-digit to tens, 4-digit to hundreds. 3: nearest hundred or thousand, often rolling over (2,961 → 3,000).
export function genRound(rng, level = 2) {
  if (level === 1) return roundQ(until(() => randInt(rng, 11, 99), x => x % 10 !== 0), 10);
  if (level === 3) {
    if (rng() < 0.5) return roundQ(until(() => randInt(rng, 1001, 9999), x => x % 1000 !== 0), 1000);
    return roundQ(until(() => randInt(rng, 1001, 9999), x => Math.floor(x / 100) % 10 === 9 && Math.floor(x / 10) % 10 >= 5), 100);
  }
  if (rng() < 0.5) return roundQ(until(() => randInt(rng, 11, 999), x => x % 10 !== 0), 10);
  return roundQ(until(() => randInt(rng, 101, 9999), x => x % 100 !== 0), 100);
}

const span = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

// as, bs: the factors to draw from.
export function genMulFacts(rng, as = span(2, 12), bs = as) {
  const [a, b] = rng() < 0.5 ? [pick(as, rng), pick(bs, rng)] : [pick(bs, rng), pick(as, rng)];
  const seq = Array.from({ length: Math.min(b, a) }, (_, k) => (k + 1) * Math.max(a, b));
  return {
    kind: 'input', prompt: `<span class="big-num">${a} × ${b} = ?</span>`, answer: a * b,
    steps: [`${a} × ${b} is the same as ${Math.min(a, b)} groups of ${Math.max(a, b)}.`, `Count by ${Math.max(a, b)}s: ${seq.join(', ')}.`],
  };
}

export function genDivFacts(rng, divisors = span(2, 12), quotients = span(2, 12)) {
  const b = pick(divisors, rng), q = pick(quotients, rng), a = b * q;
  return {
    kind: 'input', prompt: `<span class="big-num">${a} ÷ ${b} = ?</span>`, answer: q,
    steps: [`Think: ${b} × what = ${a}?`, `${b} × ${q} = ${a}, so ${a} ÷ ${b} = ${q}.`],
  };
}

export function genFracId(rng, dens = [2, 3, 4, 5, 6, 8]) {
  const d = pick(dens, rng), n = randInt(rng, 1, d - 1);
  const correct = `${n}/${d}`;
  const opts = new Set([correct]);
  if (d - n !== n) opts.add(`${d - n}/${d}`);
  if (d - n > 0 && d - n !== d && `${n}/${d - n}` !== correct && n !== d - n) opts.add(`${n}/${d - n}`);
  const val = f => f.split('/').reduce((x, y) => x / y);
  while (opts.size < 4) {
    const dd = pick([2, 3, 4, 5, 6, 8, 10], rng), nn = randInt(rng, 1, dd - 1);
    if (![...opts].some(o => Math.abs(val(o) - nn / dd) < 1e-9)) opts.add(`${nn}/${dd}`);
  }
  const viz = rng() < 0.5 ? fracBar(n, d) : fracPie(n, d);
  return {
    kind: 'choice', prompt: 'What fraction is shaded?', visual: viz, fracChoices: true,
    choices: shuffle([...opts].slice(0, 4), rng), answer: correct,
    steps: [`There are ${d} equal parts in all (the bottom number), and ${n} ${n === 1 ? 'is' : 'are'} shaded (the top number). So it's ${n}/${d}.`],
  };
}

export function genFracEquiv(rng, maxB = 6, ks = [2, 3, 4, 5]) {
  const b = randInt(rng, 2, maxB), a = randInt(rng, 1, b - 1), k = pick(ks, rng);
  const g = gcd(a, b);
  const A = a / g, B = b / g;
  if (rng() < 0.6) {
    return {
      kind: 'input', prompt: `<span class="big-num">${frac(A, B)} = ${frac('?', B * k)}</span>`, answer: A * k,
      visual: fracBar(A, B) + fracBar(A * k, B * k),
      steps: [`The bottom went from ${B} to ${B * k}: that's × ${k}.`, `Do the same to the top: ${A} × ${k} = ${A * k}.`],
    };
  }
  return {
    kind: 'input', prompt: `<span class="big-num">${frac(A, B)} = ${frac(A * k, '?')}</span>`, answer: B * k,
    steps: [`The top went from ${A} to ${A * k}: that's × ${k}.`, `Do the same to the bottom: ${B} × ${k} = ${B * k}.`],
  };
}

// types: sameD (same bottom), sameN (same top), equal, multiple (one bottom is a multiple of the other).
export function genFracCompare(rng, types = ['sameD', 'sameN', 'equal']) {
  const type = pick(types, rng);
  let n1, d1, n2, d2, why;
  if (type === 'sameD') {
    d1 = d2 = randInt(rng, 3, 12);
    [n1, n2] = until(() => [randInt(rng, 1, d1 - 1), randInt(rng, 1, d1 - 1)], ([x, y]) => x !== y);
    why = `Same bottom number (${d1}), so the pieces are the same size. More pieces is bigger: compare ${n1} and ${n2}.`;
  } else if (type === 'sameN') {
    n1 = n2 = randInt(rng, 1, 4);
    [d1, d2] = until(() => [randInt(rng, n1 + 1, 12), randInt(rng, n1 + 1, 12)], ([x, y]) => x !== y);
    why = `Same top number (${n1}). A bigger bottom number means smaller pieces, so ${n1}/${Math.min(d1, d2)} is the bigger fraction.`;
  } else if (type === 'multiple') {
    const b = randInt(rng, 2, 6), k = randInt(rng, 2, 3), D = b * k, a = randInt(rng, 1, b - 1);
    const m = until(() => randInt(rng, 1, D - 1), x => x !== a * k);
    [n1, d1, n2, d2] = rng() < 0.5 ? [a, b, m, D] : [m, D, a, b];
    why = `Make the bottoms the same: ${a}/${b} = ${a * k}/${D} (top and bottom × ${k}). Now compare ${a * k}/${D} with ${m}/${D}.`;
  } else {
    const b = randInt(rng, 2, 5), a = randInt(rng, 1, b - 1), k = randInt(rng, 2, 4);
    [n1, d1, n2, d2] = rng() < 0.5 ? [a, b, a * k, b * k] : [a * k, b * k, a, b];
    why = `Multiply ${Math.min(d1, d2) === d1 ? `${n1}/${d1}` : `${n2}/${d2}`} top and bottom by ${k} and you get the other fraction. They are equal!`;
  }
  const v1 = n1 / d1, v2 = n2 / d2;
  const ans = Math.abs(v1 - v2) < 1e-12 ? '=' : v1 > v2 ? '>' : '<';
  return {
    kind: 'choice', prompt: `<span class="big-num">${frac(n1, d1)} <span class="qbox">?</span> ${frac(n2, d2)}</span>`,
    choices: ['<', '=', '>'], answer: ans, steps: [why, `So ${n1}/${d1} ${ans} ${n2}/${d2}.`],
    visualAfter: fracBar(n1, d1, 240, 30) + fracBar(n2, d2, 240, 30),
  };
}

// level 1: add, small bottoms. 2: add or subtract. 3: three fractions, or take a fraction away from 1 whole.
export function genFracAdd(rng, level = 2) {
  if (level === 3) {
    const d = randInt(rng, 4, 12);
    if (rng() < 0.5) {
      const n = randInt(rng, 1, d - 1);
      return {
        kind: 'fraction', prompt: `<span class="big-num">1 − ${frac(n, d)} =</span>`, answer: { n: d - n, d },
        steps: [`1 whole is ${d}/${d}.`, `${d}/${d} − ${n}/${d} = ${d - n}/${d}.`],
      };
    }
    const [x, y, z] = until(() => [randInt(rng, 1, d - 2), randInt(rng, 1, d - 2), randInt(rng, 1, d - 2)], ([x, y, z]) => x + y + z < d);
    return {
      kind: 'fraction', prompt: `<span class="big-num">${frac(x, d)} + ${frac(y, d)} + ${frac(z, d)} =</span>`, answer: { n: x + y + z, d },
      steps: [`All the bottoms are ${d}, so keep the bottom.`, `Add the tops: ${x} + ${y} + ${z} = ${x + y + z}. Answer: ${x + y + z}/${d}.`],
    };
  }
  const d = level === 1 ? randInt(rng, 3, 8) : randInt(rng, 3, 12);
  if (level === 1 || rng() < 0.65) {
    const [n1, n2] = until(() => [randInt(rng, 1, d - 1), randInt(rng, 1, d - 1)], ([x, y]) => x + y <= d);
    return {
      kind: 'fraction', prompt: `<span class="big-num">${frac(n1, d)} + ${frac(n2, d)} =</span>`, answer: { n: n1 + n2, d },
      steps: [`The bottoms are the same (${d}), so the pieces are the same size. Keep the bottom.`, `Add the tops: ${n1} + ${n2} = ${n1 + n2}. Answer: ${n1 + n2}/${d}.`],
    };
  }
  const [n1, n2] = until(() => [randInt(rng, 2, d - 1), randInt(rng, 1, d - 2)], ([x, y]) => x > y);
  return {
    kind: 'fraction', prompt: `<span class="big-num">${frac(n1, d)} − ${frac(n2, d)} =</span>`, answer: { n: n1 - n2, d },
    steps: [`Same bottom (${d}), so keep it.`, `Subtract the tops: ${n1} − ${n2} = ${n1 - n2}. Answer: ${n1 - n2}/${d}.`],
  };
}

// unit: 'yes' (1/d only), 'no' (top > 1) or 'mix'.
export function genFracOf(rng, dens = [2, 3, 4, 5, 6, 8, 10], unit = 'mix') {
  const d = pick(dens, rng), k = randInt(rng, 2, 10), whole = d * k;
  const n = unit === 'yes' || (unit === 'mix' && rng() < 0.5) ? 1 : randInt(rng, 2, d - 1);
  return {
    kind: 'input', prompt: `What is <span class="big-num">${frac(n, d)}</span> of <span class="big-num">${whole}</span>?`, answer: n * k,
    steps: [`Split ${whole} into ${d} equal groups: ${whole} ÷ ${d} = ${k}.`, n === 1 ? `One group is ${k}.` : `Take ${n} groups: ${k} × ${n} = ${n * k}.`],
  };
}

const fmtDec = (hundredths, places) => (hundredths / 100).toFixed(places);

// variants: 0 tenths, 1 hundredths, 2 compare, 3 money.
export function genDecPlace(rng, variants = [0, 1, 2, 3]) {
  const v = pick(variants, rng);
  if (v === 0) {
    const t = randInt(rng, 1, 9);
    return { kind: 'input', answerType: 'decimal', prompt: `Write <b>${t} tenths</b> as a decimal.`, answer: t / 10, answerText: (t / 10).toFixed(1), steps: [`Tenths are 1 place after the decimal point: ${t} tenths = 0.${t}.`] };
  }
  if (v === 1) {
    const x = randInt(rng, 1, 99);
    const s = (x / 100).toFixed(2);
    return { kind: 'input', answerType: 'decimal', prompt: `Write <b>${x} hundredths</b> as a decimal.`, answer: x / 100, answerText: s, steps: [`Hundredths use 2 places after the decimal point: ${x} hundredths = ${s}.`] };
  }
  if (v === 2) {
    const [a, b] = until(() => {
      const t = randInt(rng, 1, 9);
      return [(t / 10).toFixed(1), (randInt(rng, 1, 99) / 100).toFixed(2)];
    }, ([x, y]) => parseFloat(x) !== parseFloat(y) && y[3] !== '0');
    const bigger = parseFloat(a) > parseFloat(b) ? a : b;
    return {
      kind: 'choice', prompt: 'Which decimal is <b>greater</b>?', choices: shuffle([a, b], rng), answer: bigger,
      steps: [`Give them the same number of places: ${a} = ${a}0 and ${b}.`, `Now compare ${a.replace('.', '').replace(/^0/, '')}0 hundredths with ${Number(b.slice(2))} hundredths. ${bigger} is greater.`],
    };
  }
  const d = randInt(rng, 1, 20), c = randInt(rng, 1, 99);
  const s = (d + c / 100).toFixed(2);
  return { kind: 'input', answerType: 'decimal', prompt: `Write <b>${d} dollars and ${c} cents</b> as a decimal. $ ___`, answer: d + c / 100, answerText: s, steps: [`Dollars go before the point, cents (hundredths of a dollar) after: $${s}.`] };
}

// level 1: add tenths. 2: same number of places, add or subtract. 3: different number of places.
export function genDecAdd(rng, level = 0) {
  let p1 = pick([1, 2], rng), p2 = pick([1, 2], rng);
  if (level === 1) p1 = p2 = 1;
  if (level === 2) p2 = p1;
  if (level === 3) p2 = 3 - p1;
  const mk = p => (p === 1 ? randInt(rng, 11, 99) * 10 : until(() => randInt(rng, 101, 999), v => v % 10 !== 0));
  let x = mk(p1), y = mk(p2);
  const add = level === 1 || rng() < 0.6;
  if (!add && y > x) [x, y] = [y, x];
  const px = x % 10 === 0 && p1 === 1 ? 1 : 2, py = y % 10 === 0 && p2 === 1 ? 1 : 2;
  const res = add ? x + y : x - y;
  const places = Math.max(px, py);
  const sx = fmtDec(x, px), sy = fmtDec(y, py), sr = fmtDec(res, places);
  const steps = [];
  if (px !== py) steps.push(`Line up the decimal points. Write ${px < py ? sx : sy} as ${fmtDec(px < py ? x : y, 2)} so both have 2 places.`);
  else steps.push('Line up the decimal points, one above the other.');
  steps.push(`${add ? 'Add' : 'Subtract'} like whole numbers and bring the point straight down: ${fmtDec(x, places)} ${add ? '+' : '−'} ${fmtDec(y, places)} = ${sr}.`);
  return { kind: 'input', answerType: 'decimal', prompt: `<span class="big-num">${sx} ${add ? '+' : '−'} ${sy} = ?</span>`, answer: res / 100, answerText: sr, steps };
}

// variants: 0 shaded grid, 1 percent as a fraction, 2 "out of 100", 3 fraction as a percent.
export function genPctIntro(rng, variants = [0, 1, 2]) {
  const v = pick(variants, rng);
  if (v === 3) {
    const d = pick([2, 4, 5, 10, 20, 25], rng), n = randInt(rng, 1, d - 1), m = 100 / d;
    return { kind: 'input', prompt: `What percent is <span class="big-num">${frac(n, d)}</span>?`, answer: n * m, answerText: `${n * m}%`, suffix: '%', steps: [`Make the bottom 100: multiply top and bottom by ${m}.`, `${n}/${d} = ${n * m}/100 = ${n * m}%.`] };
  }
  if (v === 0) {
    const n = randInt(rng, 3, 97);
    return { kind: 'input', prompt: 'What <b>percent</b> of the grid is shaded?', visual: percentGrid(n), answer: n, answerText: `${n}%`, suffix: '%', steps: [`There are 100 squares and ${n} are shaded. Percent means "out of 100", so it's ${n}%.`] };
  }
  if (v === 1) {
    const [p, f] = pick([[50, '1/2'], [25, '1/4'], [75, '3/4'], [10, '1/10'], [20, '1/5']], rng);
    const choices = shuffle(['1/2', '1/4', '3/4', '1/10', '1/5'].filter(x => x !== f).slice(0, 3).concat(f), rng);
    return { kind: 'choice', fracChoices: true, prompt: `<span class="big-num">${p}%</span> is the same as which fraction?`, choices, answer: f, steps: [`${p}% means ${p} out of 100 = ${p}/100, which simplifies to ${f}.`] };
  }
  const n = randInt(rng, 1, 99);
  return { kind: 'input', prompt: `A class answered <b>${n} out of 100</b> questions right. What percent is that?`, answer: n, answerText: `${n}%`, suffix: '%', steps: [`"Out of 100" is exactly what percent means: ${n}%.`] };
}

export function genPctOf(rng, pcts = [10, 20, 25, 50, 75, 5]) {
  const p = pick(pcts, rng);
  const mult = { 10: 10, 20: 5, 25: 4, 50: 2, 75: 4, 5: 20 }[p];
  const N = mult * randInt(rng, 2, p === 5 ? 10 : 25);
  const ans = (N * p) / 100;
  const how = {
    10: `10% is one tenth: ${N} ÷ 10 = ${ans}.`,
    20: `10% of ${N} is ${N / 10}, and 20% is double that: ${ans}.`,
    25: `25% is one quarter: ${N} ÷ 4 = ${ans}.`,
    50: `50% is half: ${N} ÷ 2 = ${ans}.`,
    75: `25% is ${N} ÷ 4 = ${N / 4}, and 75% is three of those: ${N / 4} × 3 = ${ans}.`,
    5: `10% of ${N} is ${N / 10}, and 5% is half of that: ${ans}.`,
  }[p];
  return { kind: 'input', prompt: `What is <span class="big-num">${p}%</span> of <span class="big-num">${N}</span>?`, answer: ans, steps: [how] };
}

const NAMES = ['Maya', 'Leo', 'Aarav', 'Zoe', 'Sam', 'Priya', 'Omar', 'Lily', 'Kai', 'Nina'];
const ITEMS = ['stickers', 'marbles', 'baseball cards', 'stamps', 'shells', 'beads', 'coins', 'books'];

// level 1: 2-digit numbers, 2: 3-digit, 3: 4-digit.
export function genWordAddSub(rng, level = 2) {
  const n = pick(NAMES, rng), m = pick(NAMES.filter(x => x !== n), rng), it = pick(ITEMS, rng);
  const k = 10 ** (level - 2), r = (lo, hi) => randInt(rng, Math.round(lo * k), Math.round(hi * k));
  const t = randInt(rng, 0, 2);
  if (t === 0) {
    const a = r(120, 600), b = r(110, 399);
    return { kind: 'input', prompt: `${n} has <b>${a}</b> ${it}. ${m} gives ${n} <b>${b}</b> more. How many ${it} does ${n} have now?`, answer: a + b, steps: ['"More" and "now" tell us to add.', ...addSolution(a, b).steps, `${n} has ${a + b} ${it}.`] };
  }
  if (t === 1) {
    const a = r(300, 900), b = randInt(rng, Math.round(101 * k), a - Math.round(50 * k));
    return { kind: 'input', prompt: `${n} had <b>${a}</b> ${it} and gave away <b>${b}</b>. How many are left?`, answer: a - b, steps: ['"Gave away" and "left" tell us to subtract.', ...subSolution(a, b).steps, `${a - b} ${it} are left.`] };
  }
  const a = r(300, 900), b = randInt(rng, Math.round(120 * k), a - Math.round(40 * k));
  return { kind: 'input', prompt: `${n} read <b>${a}</b> pages. ${m} read <b>${b}</b> pages. How many <b>more</b> pages did ${n} read?`, answer: a - b, steps: ['"How many more" means find the difference: subtract.', ...subSolution(a, b).steps] };
}

// level 1: small facts. 2: 2-digit groups. 3: 3-digit groups and bigger shares.
export function genWordMulDiv(rng, level = 2) {
  const n = pick(NAMES, rng), it = pick(ITEMS, rng);
  if (rng() < 0.5) {
    const a = level === 1 ? randInt(rng, 2, 5) : randInt(rng, 3, 9);
    const b = [null, randInt(rng, 2, 10), randInt(rng, 12, 48), randInt(rng, 101, 250)][level];
    return { kind: 'input', prompt: `There are <b>${a}</b> boxes with <b>${b}</b> ${it} in each box. How many ${it} are there in all?`, answer: a * b, steps: ['Equal groups put together means multiply.', ...mulSolution(b, a).steps, `${b} × ${a} = ${a * b}.`] };
  }
  const b = level === 1 ? randInt(rng, 2, 5) : randInt(rng, level === 3 ? 3 : 2, 9);
  const q = [null, randInt(rng, 2, 10), randInt(rng, 3, 15), randInt(rng, 16, 60)][level], a = b * q;
  if (level === 3) return { kind: 'input', prompt: `${n} shares <b>${a}</b> ${it} equally among <b>${b}</b> friends. How many does each friend get?`, answer: q, steps: ['Sharing equally means divide.', ...divSolution(a, b).steps] };
  return { kind: 'input', prompt: `${n} shares <b>${a}</b> ${it} equally among <b>${b}</b> friends. How many does each friend get?`, answer: q, steps: ['Sharing equally means divide.', `${a} ÷ ${b} = ${q}, because ${b} × ${q} = ${a}.`] };
}

// ---------- Math basics (counting, facts to 20, number bonds, skip counting) ----------

const THINGS = ['🍎', '⭐', '🐟', '🌸', '🚗', '🧁', '🐞', '⚽'];
const pictureRow = (emoji, n) => `<span class="count-pics">${Array.from({ length: n }, (_, i) => `${i && i % 5 === 0 ? '<span class="gap"></span>' : ''}${emoji}`).join('')}</span>`;

// level 1: count up to 10 pictures. 2: the number before or after (to 100). 3: which number is bigger.
export function genCount(rng, level = 1) {
  if (level === 1) {
    const n = randInt(rng, 3, 10), e = pick(THINGS, rng);
    return { kind: 'input', prompt: `How many? ${pictureRow(e, n)}`, answer: n, steps: [`Touch each one as you count: ${Array.from({ length: n }, (_, i) => i + 1).join(', ')}. There are ${n}.`] };
  }
  if (level === 2) {
    const n = randInt(rng, 11, 98), after = rng() < 0.5;
    return {
      kind: 'input', prompt: `What number comes <b>${after ? 'after' : 'before'}</b> <span class="big-num">${n}</span>?`, answer: after ? n + 1 : n - 1,
      steps: [after ? `Count up one from ${n}: ${n}, ${n + 1}.` : `Count back one from ${n}: ${n}, ${n - 1}.`],
    };
  }
  const [a, b] = until(() => [randInt(rng, 10, 99), randInt(rng, 10, 99)], ([x, y]) => x !== y && (Math.floor(x / 10) === Math.floor(y / 10) || Math.abs(x - y) < 15));
  const big = Math.max(a, b);
  return {
    kind: 'choice', prompt: 'Which number is <b>bigger</b>?', choices: [String(a), String(b)], answer: String(big),
    steps: [Math.floor(a / 10) === Math.floor(b / 10) ? `Both have ${Math.floor(a / 10)} tens, so compare the ones: ${big} has more.` : `Compare the tens first: ${big} has more tens.`],
  };
}

// Facts: + or − with numbers up to max. sub: subtraction; teen: take away from 11-18 (crossing ten).
export function genFact(rng, { op = '+', max = 10, teen = false } = {}) {
  if (op === '+') {
    const [a, b] = until(() => [randInt(rng, 1, Math.min(9, max)), randInt(rng, 1, Math.min(9, max))], ([x, y]) => x + y <= max && (max <= 10 || x + y > 10));
    const big = Math.max(a, b), small = Math.min(a, b);
    return { kind: 'input', prompt: `<span class="big-num">${a} + ${b} = ?</span>`, answer: a + b, steps: [`Start at the bigger number, ${big}, and count on ${small}: ${Array.from({ length: small }, (_, i) => big + i + 1).join(', ')}. So ${a} + ${b} = ${a + b}.`] };
  }
  const [a, b] = teen
    ? until(() => [randInt(rng, 11, 18), randInt(rng, 2, 9)], ([x, y]) => x - y < 10)
    : until(() => [randInt(rng, 2, max), randInt(rng, 1, max)], ([x, y]) => y < x);
  const how = teen
    ? `Take ${a - 10} away to get to 10, then ${b - (a - 10)} more: 10 − ${b - (a - 10)} = ${a - b}.`
    : `Start at ${a} and count back ${b}: ${Array.from({ length: b }, (_, i) => a - i - 1).join(', ')}.`;
  return { kind: 'input', prompt: `<span class="big-num">${a} − ${b} = ?</span>`, answer: a - b, steps: [how, `So ${a} − ${b} = ${a - b}.`] };
}

// Number bonds: two parts that make the whole (5, 10 or 20).
export function genBond(rng, whole = 10) {
  const part = randInt(rng, whole === 20 ? 2 : 1, whole - 1), first = rng() < 0.5;
  const shown = first ? `${part} + ? = ${whole}` : `? + ${part} = ${whole}`;
  return { kind: 'input', prompt: `<span class="big-num">${shown}</span>`, answer: whole - part, steps: [`Count up from ${part} to ${whole}: that is ${whole - part} more.`, `${part} + ${whole - part} = ${whole}.`] };
}

// Skip counting: fill in the missing number of a sequence counting by one of steps.
export function genSkip(rng, steps = [2]) {
  const by = pick(steps, rng), start = by * randInt(rng, 0, by >= 5 ? 6 : 8), seq = Array.from({ length: 5 }, (_, i) => start + by * i);
  const hole = randInt(rng, 2, 4);
  const shown = seq.map((n, i) => `<span>${i === hole ? '<span class="qbox">?</span>' : n}${i < seq.length - 1 ? ',' : ''}</span>`).join(' ');
  return { kind: 'input', prompt: `Count by <b>${by}s</b>: <span class="seq">${shown}</span>`, answer: seq[hole], steps: [`Each number is ${by} more than the one before: ${seq[hole - 1]} + ${by} = ${seq[hole]}.`] };
}

// ---------- Big numbers (millions, billions, trillions) ----------

const SCALES = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];
const fmt = n => n.toLocaleString('en-US');

// "6M", "6 million", "2.5 million", "6,000,000" -> number (null if it is not a number).
export function parseBigNumber(given) {
  const s = String(given ?? '').trim().toLowerCase().replace(/[,\s$]/g, '');
  const m = s.match(/^(\d+(?:\.\d+)?)(k|thousand|m|mil|million|b|bn|billion|t|trillion)?$/);
  if (!m) return null;
  const mult = { k: 1e3, thousand: 1e3, m: 1e6, mil: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9, t: 1e12, trillion: 1e12 }[m[2]] || 1;
  return Math.round(parseFloat(m[1]) * mult);
}

// 2500000 -> "2.5 million"; small or messy numbers keep their digits ("4,750,000").
export function bigWords(n) {
  for (const [v, name] of SCALES.slice(0, 3)) {
    if (n >= v && Number.isInteger((n / v) * 100)) return `${+(n / v).toFixed(2)} ${name}`;
  }
  return fmt(n);
}
const bigAnswer = (prompt, answer, steps) => ({
  kind: 'input', answerType: 'big', prompt, answer, answerText: bigWords(answer),
  steps: [...steps, `${bigWords(answer) === fmt(answer) ? '' : `${bigWords(answer)} = `}${fmt(answer)}.`],
});

// level 1: millions in words and digits. 2: halves of millions, thousands in a million. 3: billions.
export function genBigRead(rng, level = 1) {
  const v = rng() < 0.5;
  if (level === 1) {
    const m = randInt(rng, 2, 9);
    return v
      ? { kind: 'input', prompt: `How many millions is <span class="big-num">${fmt(m * 1e6)}</span>?`, answer: m, steps: ['A million has 6 zeros: 1,000,000.', `${fmt(m * 1e6)} is ${m} groups of a million, so ${m} millions.`] }
      : bigAnswer(`Write <b>${m} million</b> with digits.`, m * 1e6, ['A million is 1 followed by 6 zeros.']);
  }
  if (level === 2) {
    const m = randInt(rng, 1, 9) + pick([0.5, 0.25, 0.75], rng);
    return v
      ? bigAnswer(`Write <b>${m} million</b> with digits.`, m * 1e6, [`${m} million is ${Math.floor(m)} million and ${fmt((m % 1) * 1e6)} more.`])
      : { kind: 'input', prompt: `How many <b>thousands</b> are in <span class="big-num">${Math.floor(m)} million</span>?`, answer: Math.floor(m) * 1000, steps: ['1 million = 1,000 thousands.', `${Math.floor(m)} × 1,000 = ${fmt(Math.floor(m) * 1000)}.`] };
  }
  const b = randInt(rng, 2, 9);
  return v
    ? { kind: 'input', prompt: `How many <b>millions</b> are in <span class="big-num">${b} billion</span>?`, answer: b * 1000, steps: ['1 billion = 1,000 millions (9 zeros = 6 zeros + 3 more).', `${b} × 1,000 = ${fmt(b * 1000)}.`] }
    : (d => bigAnswer(`Write <b>${b}.${d} billion</b> with digits.`, b * 1e9 + d * 1e8, ['A billion is 1 followed by 9 zeros.', `${b}.${d} billion is ${b} billion and ${fmt(d * 1e8)} more.`]))(randInt(rng, 1, 9));
}

// level 1: whole millions. 2: millions and hundred-thousands. 3: millions with thousands (5,000,000 - 250,000).
export function genBigAddSub(rng, level = 1) {
  const add = rng() < 0.5;
  let a, b, how;
  if (level === 1) {
    [a, b] = until(() => [randInt(rng, 1, 9), randInt(rng, 1, 9)], ([x, y]) => add || x > y);
    const ans = add ? a + b : a - b;
    return bigAnswer(`<span class="big-num">${a} million ${add ? '+' : '−'} ${b} million = ?</span>`, ans * 1e6, [`Think in millions: ${a} ${add ? '+' : '−'} ${b} = ${ans}. So the answer is ${ans} million.`]);
  }
  if (level === 2) {
    [a, b] = until(() => [randInt(rng, 11, 89) * 1e5, randInt(rng, 11, 89) * 1e5], ([x, y]) => add || x > y);
    how = `Think in hundred-thousands: ${a / 1e5} ${add ? '+' : '−'} ${b / 1e5} = ${add ? (a + b) / 1e5 : (a - b) / 1e5} hundred-thousands.`;
  } else {
    a = randInt(rng, 2, 9) * 1e6 + (rng() < 0.5 ? 0 : randInt(rng, 1, 9) * 1e5);
    b = randInt(rng, 1, 19) * 5e4;
    how = add ? `Add the thousands: ${fmt(a)} + ${fmt(b)}. Line up the places carefully.` : `Take ${fmt(b)} away from ${fmt(a)}: borrow from the millions if you need to.`;
  }
  return bigAnswer(`<span class="big-num long">${fmt(a)} ${add ? '+' : '−'} ${fmt(b)} = ?</span>`, add ? a + b : a - b, [how]);
}

// level 1: millions × or ÷ a small number. 2: tens × hundred-thousands, millions ÷ hundreds. 3: 3M × 2M (count the zeros).
export function genBigMulDiv(rng, level = 1) {
  if (level === 1) {
    const a = randInt(rng, 1, 9), b = randInt(rng, 2, 9);
    if (rng() < 0.5) return bigAnswer(`<span class="big-num">${a} million × ${b} = ?</span>`, a * b * 1e6, [`${a} × ${b} = ${a * b}, so ${a} million × ${b} = ${a * b} million.`]);
    return bigAnswer(`<span class="big-num">${a * b} million ÷ ${b} = ?</span>`, a * 1e6, [`${a * b} ÷ ${b} = ${a}, so it is ${a} million.`]);
  }
  if (level === 2) {
    if (rng() < 0.5) {
      const a = randInt(rng, 2, 9) * 10, b = randInt(rng, 2, 9) * 1e5;
      return bigAnswer(`<span class="big-num long">${a} × ${fmt(b)} = ?</span>`, a * b, [`Multiply the front digits: ${a / 10} × ${b / 1e5} = ${(a / 10) * (b / 1e5)}.`, `Then add the zeros: 1 from ${a} and 5 from ${fmt(b)}, 6 zeros in all.`]);
    }
    const q = randInt(rng, 2, 9) * 1e4, d = randInt(rng, 2, 9) * 100;
    return bigAnswer(`<span class="big-num long">${fmt(q * d)} ÷ ${d} = ?</span>`, q, [`Cross off the 2 zeros of ${d} from ${fmt(q * d)}: ${fmt((q * d) / 100)} ÷ ${d / 100}.`, `${fmt((q * d) / 100)} ÷ ${d / 100} = ${fmt(q)}.`]);
  }
  const a = randInt(rng, 2, 9), b = randInt(rng, 2, 9), n = a * b;
  const [x, xName, y, yName, ans] = pick([[1e6, 'M', 1e6, 'M', 'trillion'], [1e3, ',000', 1e6, 'M', 'billion'], [1e6, 'M', 1e3, ',000', 'billion']], rng);
  const show = (k, v, name) => (name === 'M' ? `${k}M` : fmt(k * v));
  const zeros = Math.log10(x) + Math.log10(y);
  return {
    kind: 'choice', prompt: `<span class="big-num">${show(a, x, xName)} × ${show(b, y, yName)} = ?</span><span class="q-hint block">M = million</span>`,
    choices: shuffle([`${n} million`, `${n} billion`, `${n} trillion`, `${n * 10} ${ans}`], rng), answer: `${n} ${ans}`,
    steps: [`Multiply the front numbers: ${a} × ${b} = ${n}.`, `Count the zeros: ${Math.log10(x)} + ${Math.log10(y)} = ${zeros} zeros. 1 with ${zeros} zeros is a ${ans}.`, `So the answer is ${n} ${ans}.`],
  };
}

// level 1: 10% and 50% of millions. 2: 25%, 20%, 5%. 3: 15%, 35%, 75%, 12%.
export function genBigPct(rng, level = 1) {
  const p = pick([[10, 50], [25, 20, 5], [15, 35, 75, 12]][level - 1], rng), m = randInt(rng, 2, 9), N = m * 1e6;
  return bigAnswer(`What is <span class="big-num">${p}%</span> of <span class="big-num">${m} million</span>?`, (N * p) / 100,
    [`1% of ${m} million is ${fmt(N / 100)}.`, `So ${p}% is ${p} × ${fmt(N / 100)} = ${fmt((N * p) / 100)}.`]);
}

// Percent of hundreds and thousands: level 1 10%/50%, 2 20%/25%/5%, 3 15%-75% of thousands.
export function genPctBig(rng, level = 1) {
  const p = pick([[10, 50], [20, 25, 5], [15, 30, 35, 40, 60, 75]][level - 1], rng);
  const N = level === 3 ? randInt(rng, 10, 90) * 100 : randInt(rng, 2, 20) * 100;
  const ans = (N * p) / 100;
  const tenth = N / 10;
  const how = p === 50 ? `50% is half: ${fmt(N)} ÷ 2 = ${fmt(ans)}.`
    : p % 10 === 0 ? `10% of ${fmt(N)} is ${fmt(tenth)}. ${p}% is ${p / 10} × ${fmt(tenth)} = ${fmt(ans)}.`
      : p === 25 || p === 75 ? `25% is a quarter: ${fmt(N)} ÷ 4 = ${fmt(N / 4)}.${p === 75 ? ` 75% is 3 quarters: ${fmt(ans)}.` : ''}`
        : `10% of ${fmt(N)} is ${fmt(tenth)}, so 5% is half of that: ${fmt(tenth / 2)}. ${p}% = ${p === 5 ? fmt(ans) : `${(p - 5) / 10} × ${fmt(tenth)} + ${fmt(tenth / 2)} = ${fmt(ans)}`}.`;
  return { kind: 'input', prompt: `What is <span class="big-num">${p}%</span> of <span class="big-num">${fmt(N)}</span>?`, answer: ans, steps: [how] };
}

// ---------- Algebra ----------

const X = '<i class="var">x</i>';
const box = '<span class="qbox">?</span>';

// Missing number: level 1 + and − to 20, 2 × and ÷ facts, 3 bigger + − × ÷.
export function genMissing(rng, level = 1) {
  const mulDiv = level === 2 || (level === 3 && rng() < 0.5);
  if (mulDiv) {
    const a = randInt(rng, 2, level === 3 ? 12 : 10), b = randInt(rng, 2, level === 3 ? 12 : 10), c = a * b;
    const [shown, ans, how] = pick([
      [`${box} × ${a} = ${c}`, b, `Think: what times ${a} makes ${c}? ${c} ÷ ${a} = ${b}.`],
      [`${a} × ${box} = ${c}`, b, `${c} ÷ ${a} = ${b}.`],
      [`${c} ÷ ${box} = ${a}`, b, `${c} ÷ what = ${a}? Flip it: ${c} ÷ ${a} = ${b}, so the missing number is ${b}.`],
      [`${box} ÷ ${a} = ${b}`, c, `Undo the ÷ with ×: ${b} × ${a} = ${c}.`],
    ], rng);
    return { kind: 'input', prompt: `<span class="big-num">${shown}</span>`, answer: ans, steps: [how] };
  }
  const max = level === 1 ? 20 : 200;
  const [a, b] = until(() => [randInt(rng, 1, max), randInt(rng, 1, max)], ([x, y]) => x + y <= max);
  const c = a + b;
  const [shown, ans, how] = pick([
    [`${box} + ${a} = ${c}`, b, `Take ${a} away from ${c}: ${c} − ${a} = ${b}.`],
    [`${a} + ${box} = ${c}`, b, `Count up from ${a} to ${c}: that is ${b}.`],
    [`${box} − ${a} = ${b}`, c, `Undo the − with +: ${b} + ${a} = ${c}.`],
    [`${c} − ${box} = ${a}`, b, `${c} − ${a} = ${b}, so ${b} was taken away.`],
  ], rng);
  return { kind: 'input', prompt: `<span class="big-num">${shown}</span>`, answer: ans, steps: [how] };
}

// Solve for x in one step: level 1 x + a, x − a; 2 ax, x ÷ a; 3 bigger numbers of every kind.
export function genOneStep(rng, level = 1) {
  const kind = level === 1 ? pick(['+', '−'], rng) : level === 2 ? pick(['×', '÷'], rng) : pick(['+', '−', '×', '÷'], rng);
  const big = level === 3;
  if (kind === '+' || kind === '−') {
    const x = randInt(rng, big ? 50 : 2, big ? 500 : 40), a = randInt(rng, big ? 25 : 2, big ? 400 : 30);
    if (kind === '+') return { kind: 'input', prompt: `Solve: <span class="big-num">${X} + ${a} = ${x + a}</span>`, answer: x, steps: [`Undo + ${a} by taking ${a} away from both sides.`, `${x + a} − ${a} = ${x}, so x = ${x}.`] };
    return { kind: 'input', prompt: `Solve: <span class="big-num">${X} − ${a} = ${x}</span>`, answer: x + a, steps: [`Undo − ${a} by adding ${a} to both sides.`, `${x} + ${a} = ${x + a}, so x = ${x + a}.`] };
  }
  const a = randInt(rng, 2, big ? 15 : 9), x = randInt(rng, 2, big ? 15 : 10);
  if (kind === '×') return { kind: 'input', prompt: `Solve: <span class="big-num">${a}${X} = ${a * x}</span>`, answer: x, steps: [`${a}x means ${a} × x.`, `Undo × ${a} by dividing: ${a * x} ÷ ${a} = ${x}, so x = ${x}.`] };
  return { kind: 'input', prompt: `Solve: <span class="big-num">${X} ÷ ${a} = ${x}</span>`, answer: a * x, steps: [`Undo ÷ ${a} by multiplying: ${x} × ${a} = ${a * x}, so x = ${a * x}.`] };
}

// Two steps: level 1 ax + b = c, 2 ax − b = c and x ÷ a + b = c, 3 a(x + b) = c and bigger.
export function genTwoStep(rng, level = 1) {
  const x = randInt(rng, 2, level === 3 ? 15 : 10), a = randInt(rng, 2, level === 1 ? 5 : 9), b = randInt(rng, 1, level === 3 ? 30 : 12);
  const form = level === 1 ? 'ax+b' : level === 2 ? pick(['ax-b', 'x/a+b'], rng) : pick(['a(x+b)', 'ax+b', 'ax-b'], rng);
  if (form === 'ax+b') return { kind: 'input', prompt: `Solve: <span class="big-num">${a}${X} + ${b} = ${a * x + b}</span>`, answer: x, steps: [`First undo + ${b}: ${a * x + b} − ${b} = ${a * x}. Now ${a}x = ${a * x}.`, `Then undo × ${a}: ${a * x} ÷ ${a} = ${x}. So x = ${x}.`] };
  if (form === 'ax-b') {
    const [xx, bb] = until(() => [randInt(rng, 2, level === 3 ? 15 : 10), randInt(rng, 1, level === 3 ? 30 : 12)], ([p, q]) => a * p - q > 0);
    return { kind: 'input', prompt: `Solve: <span class="big-num">${a}${X} − ${bb} = ${a * xx - bb}</span>`, answer: xx, steps: [`First undo − ${bb}: ${a * xx - bb} + ${bb} = ${a * xx}. Now ${a}x = ${a * xx}.`, `Then undo × ${a}: ${a * xx} ÷ ${a} = ${xx}. So x = ${xx}.`] };
  }
  if (form === 'x/a+b') return { kind: 'input', prompt: `Solve: <span class="big-num">${X} ÷ ${a} + ${b} = ${x + b}</span>`, answer: a * x, steps: [`First undo + ${b}: ${x + b} − ${b} = ${x}. Now x ÷ ${a} = ${x}.`, `Then undo ÷ ${a}: ${x} × ${a} = ${a * x}. So x = ${a * x}.`] };
  return { kind: 'input', prompt: `Solve: <span class="big-num">${a}(${X} + ${b}) = ${a * (x + b)}</span>`, answer: x, steps: [`${a}(x + ${b}) means ${a} groups of (x + ${b}). Undo × ${a} first: ${a * (x + b)} ÷ ${a} = ${x + b}.`, `Now x + ${b} = ${x + b}, so x = ${x}.`] };
}

// Work out an expression: level 1 one operation, 2 ax + b, 3 two letters or x × x.
export function genExpr(rng, level = 1) {
  if (level === 3 && rng() < 0.5) {
    const a = randInt(rng, 2, 9), b = randInt(rng, 2, 9), p = randInt(rng, 2, 5), q = randInt(rng, 2, 5);
    return { kind: 'input', prompt: `If <i class="var">a</i> = ${a} and <i class="var">b</i> = ${b}, what is <span class="big-num">${p}<i class="var">a</i> + ${q}<i class="var">b</i></span>?`, answer: p * a + q * b, steps: [`Put the numbers in: ${p} × ${a} + ${q} × ${b}.`, `${p * a} + ${q * b} = ${p * a + q * b}.`] };
  }
  const x = randInt(rng, 2, 9);
  if (level === 3) return { kind: 'input', prompt: `If ${X} = ${x}, what is <span class="big-num">${X} × ${X} + ${x > 5 ? 10 : 1}</span>?`, answer: x * x + (x > 5 ? 10 : 1), steps: [`x × x = ${x} × ${x} = ${x * x}.`, `${x * x} + ${x > 5 ? 10 : 1} = ${x * x + (x > 5 ? 10 : 1)}.`] };
  if (level === 2) {
    const a = randInt(rng, 2, 9), b = randInt(rng, 1, 15);
    return { kind: 'input', prompt: `If ${X} = ${x}, what is <span class="big-num">${a}${X} + ${b}</span>?`, answer: a * x + b, steps: [`${a}x means ${a} × x = ${a} × ${x} = ${a * x}.`, `${a * x} + ${b} = ${a * x + b}.`] };
  }
  const b = randInt(rng, 1, x - 1);
  const [shown, ans] = pick([[`${X} + ${b + 3}`, x + b + 3], [`${X} − ${b}`, x - b], [`2${X}`, 2 * x], [`${X} + ${X}`, 2 * x]], rng);
  return { kind: 'input', prompt: `If ${X} = ${x}, what is <span class="big-num">${shown}</span>?`, answer: ans, steps: [`Swap x for ${x}: ${shown.replace(/<[^>]+>x<\/i>/g, String(x)).replace(/^2(\d)/, '2 × $1')} = ${ans}.`] };
}

// Find the rule: level 1 add k, 2 multiply by k, 3 multiply then add.
export function genRule(rng, level = 1) {
  const k = randInt(rng, 2, level === 1 ? 15 : 9), c = randInt(rng, 1, 9);
  const f = level === 1 ? n => n + k : level === 2 ? n => n * k : n => n * k + c;
  const rule = level === 1 ? `add ${k}` : level === 2 ? `multiply by ${k}` : `multiply by ${k}, then add ${c}`;
  const ins = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 10], rng).slice(0, 4);
  const shown = ins.slice(0, 3).sort((p, q) => p - q), ask = ins[3];
  const rows = shown.map(n => `<tr><td>${n}</td><td>${f(n)}</td></tr>`).join('');
  return {
    kind: 'input', prompt: `Find the rule, then fill in the box.<table class="io-table"><tr><th>In</th><th>Out</th></tr>${rows}<tr><td>${ask}</td><td>${box}</td></tr></table>`,
    answer: f(ask), steps: [`Look at each pair: the rule is "${rule}".`, `${ask} → ${f(ask)}.`],
  };
}

// ---------- Skill tree ----------

export const UNITS = [
  { id: 'basic', title: 'Math Basics', emoji: '🧸' },
  { id: 'num', title: 'Number Sense', emoji: '🔢' },
  { id: 'add', title: 'Addition', emoji: '➕' },
  { id: 'sub', title: 'Subtraction', emoji: '➖' },
  { id: 'mul', title: 'Multiplication', emoji: '✖️' },
  { id: 'div', title: 'Division', emoji: '➗' },
  { id: 'frac', title: 'Fractions', emoji: '🍕' },
  { id: 'dec', title: 'Decimals & Percents', emoji: '💯' },
  { id: 'big', title: 'Big Numbers', emoji: '🌌' },
  { id: 'alg', title: 'Algebra', emoji: '🔮' },
  ...MIDDLE_UNITS,
];

const S = (id, unit, title, emoji, requires, desc, gen, extra = {}) => ({ id, unit, title, emoji, requires, desc, gen, ...extra });
export const pair = (rng, da, db) => [nd(rng, da), nd(rng, db)];

export const SKILLS = [
  S('basic-count', 'basic', 'Counting', '🍎', [], 'Count, before and after, bigger', rng => genCount(rng, 1)),
  S('basic-add', 'basic', 'Adding to 20', '🧮', ['basic-count'], 'Facts: 4 + 3, 8 + 7', rng => genFact(rng, { max: 10 })),
  S('basic-sub', 'basic', 'Taking away', '🍪', ['basic-add'], 'Facts: 9 − 4, 15 − 7', rng => genFact(rng, { op: '−', max: 10 })),
  S('basic-bonds', 'basic', 'Number bonds', '🤝', ['basic-add'], 'Make 10: 7 + ? = 10', rng => genBond(rng, 10)),
  S('basic-skip', 'basic', 'Skip counting', '🦘', ['basic-count'], 'By 2s, 5s and 10s', rng => genSkip(rng, [2, 5, 10])),

  S('num-place', 'num', 'Place value', '🏠', [], 'What each digit is worth', genPlace),
  S('num-round', 'num', 'Rounding', '🎯', ['num-place'], 'Round to the nearest 10 or 100', genRound),
  S('word-add-sub', 'num', 'Story problems: + and −', '📖', ['add-3d-c1', 'sub-3d-b1'], 'Read, decide, solve', genWordAddSub),
  S('word-mul-div', 'num', 'Story problems: × and ÷', '📚', ['mul-2x1', 'div-2x1'], 'Equal groups and sharing', genWordMulDiv),

  S('add-2d-nc', 'add', '2-digit, no carrying', '🌱', ['basic-add'], 'Warm up: 34 + 25', rng => makeAdd(...until(() => pair(rng, 2, 2), ([a, b]) => countCarries(a, b) === 0)), { guided: true }),
  S('add-2d-c', 'add', '2-digit with carrying', '🌿', ['add-2d-nc'], 'Carry the 1: 47 + 38', rng => makeAdd(...until(() => pair(rng, 2, 2), ([a, b]) => countCarries(a, b) >= 1)), { guided: true, gym: true }),
  S('add-3d-nc', 'add', '3-digit, no carrying', '🌳', ['add-2d-c'], 'Bigger numbers: 312 + 456', rng => makeAdd(...until(() => pair(rng, 3, 3), ([a, b]) => countCarries(a, b) === 0)), { guided: true }),
  S('add-3d-c1', 'add', '3-digit, one carry', '🍀', ['add-3d-nc'], 'One carry: 358 + 217', rng => makeAdd(...until(() => pair(rng, 3, 3), ([a, b]) => countCarries(a, b) === 1)), { guided: true, gym: true }),
  S('add-3d-c2', 'add', '3-digit, many carries', '🌲', ['add-3d-c1'], 'Carry chains: 487 + 365', rng => makeAdd(...until(() => pair(rng, 3, 3), ([a, b]) => countCarries(a, b) >= 2)), { guided: true, gym: true }),

  S('add-4d', 'add', '4-digit addition', '🏔️', ['add-3d-c2'], 'Thousands: 4,867 + 2,958', rng => makeAdd(...until(() => pair(rng, 4, 4), ([a, b]) => countCarries(a, b) >= 2)), { guided: true }),

  S('sub-2d-nb', 'sub', '2-digit, no borrowing', '🐣', ['add-2d-nc'], 'Warm up: 87 − 25', rng => makeSub(...until(() => pair(rng, 2, 2), ([a, b]) => a > b && countBorrows(a, b) === 0)), { guided: true }),
  S('sub-2d-b', 'sub', '2-digit with borrowing', '🐥', ['sub-2d-nb'], 'Borrow: 52 − 27', rng => makeSub(...until(() => pair(rng, 2, 2), ([a, b]) => a > b && countBorrows(a, b) === 1)), { guided: true, gym: true }),
  S('sub-3d-nb', 'sub', '3-digit, no borrowing', '🐤', ['sub-2d-b'], 'Bigger: 768 − 325', rng => makeSub(...until(() => [nd(rng, 3), nd(rng, pick([2, 3], rng))], ([a, b]) => a > b && countBorrows(a, b) === 0)), { guided: true }),
  S('sub-3d-b1', 'sub', '3-digit, one borrow', '🦆', ['sub-3d-nb'], 'One borrow: 643 − 218', rng => makeSub(...until(() => [nd(rng, 3), nd(rng, 3)], ([a, b]) => a > b && countBorrows(a, b) === 1 && !borrowsAcrossZero(a, b))), { guided: true, gym: true }),
  S('sub-3d-b2', 'sub', '3-digit, two borrows', '🦢', ['sub-3d-b1'], 'Double borrow: 523 − 278', rng => makeSub(...until(() => [nd(rng, 3), nd(rng, 3)], ([a, b]) => a > b && countBorrows(a, b) === 2 && !borrowsAcrossZero(a, b))), { guided: true, gym: true }),
  S('sub-3d-bz', 'sub', 'Borrowing across zeros', '🦉', ['sub-3d-b2'], 'The tricky one: 403 − 178', rng => makeSub(...until(() => {
    const a = randInt(rng, 1, 9) * 100 + randInt(rng, 0, 8) * (rng() < 0.3 ? 0 : 1);
    return [a, randInt(rng, 11, a - 1)];
  }, ([a, b]) => Math.floor(a / 10) % 10 === 0 && a > b && borrowsAcrossZero(a, b))), { guided: true, gym: true }),
  S('sub-4d', 'sub', '4-digit subtraction', '🦅', ['sub-3d-bz'], 'Thousands: 6,214 − 3,867', rng => makeSub(...until(() => [nd(rng, 4), nd(rng, pick([3, 4], rng))], ([a, b]) => a > b && countBorrows(a, b) >= 2)), { guided: true }),

  S('mul-facts', 'mul', 'Times tables', '⚡', ['add-2d-c'], 'Facts from 2 × 2 to 12 × 12', genMulFacts),
  S('mul-2x1', 'mul', '2-digit × 1-digit', '🚲', ['mul-facts'], 'Multiply and carry: 47 × 6', rng => makeMul(randInt(rng, 12, 99), randInt(rng, 2, 9))),
  S('mul-3x1', 'mul', '3-digit × 1-digit', '🚗', ['mul-2x1'], 'Longer: 358 × 4', rng => makeMul(randInt(rng, 101, 999), randInt(rng, 2, 9))),
  S('mul-2x2', 'mul', '2-digit × 2-digit', '🚀', ['mul-3x1'], 'Two parts: 34 × 27', rng => makeMul(...until(() => [randInt(rng, 11, 99), randInt(rng, 11, 99)], ([a, b]) => a % 10 !== 0 && b % 10 !== 0))),

  S('div-facts', 'div', 'Division facts', '🍪', ['mul-facts'], 'Flip the times tables: 56 ÷ 7', genDivFacts),
  S('div-2x1', 'div', '2-digit ÷ 1-digit', '🧁', ['div-facts'], 'Share evenly: 84 ÷ 4', rng => {
    const [a, b] = until(() => {
      const b = randInt(rng, 2, 9);
      return [b * randInt(rng, 2, Math.floor(99 / b)), b];
    }, ([a]) => a >= 10);
    return { kind: 'input', prompt: `<span class="big-num">${a} ÷ ${b} = ?</span>`, answer: a / b, steps: divSolution(a, b).steps };
  }),
  S('div-2x1r', 'div', 'Remainders', '🍩', ['div-2x1'], 'What is left over: 47 ÷ 5', rng => makeDivision(...until(() => [randInt(rng, 10, 99), randInt(rng, 2, 9)], ([a, b]) => a % b !== 0 && a > b))),
  S('div-3x1', 'div', '3-digit ÷ 1-digit', '🎂', ['div-2x1r'], 'Long division: 736 ÷ 4', rng => makeDivision(randInt(rng, 100, 999), randInt(rng, 2, 9))),
  S('div-3x2', 'div', 'Dividing by 2 digits', '🏰', ['div-3x1', 'mul-2x2'], 'Estimate: 391 ÷ 17', rng => {
    const [a, b] = until(() => {
      const b = randInt(rng, 11, 25);
      return [b * randInt(rng, 4, 39) + randInt(rng, 0, b - 1), b];
    }, ([a]) => a >= 100 && a <= 999);
    const q = Math.floor(a / b), r = a % b;
    return {
      kind: 'division', a, b, q, r, prompt: `${a} ÷ ${b}`,
      steps: [`Estimate: ${b} is close to ${Math.round(b / 10) * 10}. How many ${b}s fit in ${a}?`, `${b} × ${q} = ${b * q}, and ${b} × ${q + 1} = ${b * (q + 1)} is too big.`, `${a} − ${b * q} = ${r}. So ${a} ÷ ${b} = ${q}${r ? ` R ${r}` : ''}.`],
    };
  }),

  S('frac-id', 'frac', 'What is a fraction?', '🍕', ['mul-facts'], 'Name the shaded part', genFracId),
  S('frac-equiv', 'frac', 'Equivalent fractions', '🪞', ['frac-id'], '1/2 = 4/8', genFracEquiv),
  S('frac-compare', 'frac', 'Compare fractions', '⚖️', ['frac-equiv'], 'Which is bigger?', genFracCompare),
  S('frac-add', 'frac', 'Add & subtract fractions', '🥧', ['frac-id'], 'Same bottom numbers', genFracAdd),
  S('frac-of', 'frac', 'Fraction of a number', '🍫', ['frac-id', 'div-facts'], '3/4 of 20', genFracOf),

  S('dec-place', 'dec', 'Decimals', '🔍', ['frac-id'], 'Tenths, hundredths and money', genDecPlace),
  S('dec-add', 'dec', 'Add & subtract decimals', '💵', ['dec-place', 'add-3d-c1'], 'Line up the points', genDecAdd),
  S('pct-intro', 'dec', 'What is a percent?', '💯', ['frac-equiv', 'dec-place'], 'Out of 100', genPctIntro),
  S('pct-of', 'dec', 'Percent of a number', '🛍️', ['pct-intro'], '25% of 80', genPctOf),
  S('pct-big', 'dec', 'Percents of big numbers', '💰', ['pct-of'], '20% of 500', rng => genPctBig(rng, 2)),

  S('big-read', 'big', 'Millions & billions', '🔭', ['num-place'], 'How many zeros in a million?', rng => genBigRead(rng, 1)),
  S('big-addsub', 'big', 'Millions: + and −', '🚀', ['big-read', 'add-4d'], '3 million + 2 million', rng => genBigAddSub(rng, 1)),
  S('big-muldiv', 'big', 'Millions: × and ÷', '🪐', ['big-read', 'mul-3x1'], '3M × 2M', rng => genBigMulDiv(rng, 1)),
  S('big-pct', 'big', 'Percents of millions', '💸', ['big-read', 'pct-big'], '25% of 8 million', rng => genBigPct(rng, 1)),

  S('alg-missing', 'alg', 'Missing numbers', '🔍', ['mul-facts'], '? + 7 = 15, 6 × ? = 42', rng => genMissing(rng, 1)),
  S('alg-one', 'alg', 'Solve for x', '🧩', ['alg-missing'], 'x + 5 = 12, 3x = 21', rng => genOneStep(rng, 1)),
  S('alg-two', 'alg', 'Two-step equations', '🪜', ['alg-one'], '2x + 3 = 11', rng => genTwoStep(rng, 1)),
  S('alg-expr', 'alg', 'Work out expressions', '📐', ['alg-one'], 'If x = 3, what is 4x + 5?', rng => genExpr(rng, 1)),
  S('alg-rule', 'alg', 'Find the rule', '🔁', ['alg-missing'], 'In → Out tables', rng => genRule(rng, 1)),
  ...MIDDLE_SKILLS,
];

export const skillById = id => SKILLS.find(s => s.id === id);

// Every skill can be played any time. A skill is "reached" once its prerequisites have ★★ (the suggested
// path) or the player has started it; Daily Mix and Speed "Everything I know" draw from reached skills.
export function isReached(skill, p) {
  const recs = p.math.skills;
  if (recs[skill.id]?.attempts || recs[skill.id]?.stars) return true;
  return skill.requires.every(r => (recs[r]?.stars || 0) >= 2);
}
