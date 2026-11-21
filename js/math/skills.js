// Math skill tree, problem generators, worked solutions and misconception detection.
// Pure module (no DOM) so it can be unit tested in Node.
import { randInt, pick, shuffle, gcd } from '../shared/util.js';

export const COL = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands', 'hundred-thousands'];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export const dls = n => String(n).split('').reverse().map(Number); // least significant digit first
const len = n => String(n).length;
const nd = (rng, n) => randInt(rng, 10 ** (n - 1), 10 ** n - 1);
const fromDigitsMsFirst = arr => Number(arr.join(''));

function until(make, ok, tries = 5000) {
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
function makeDivision(a, b) {
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
  const s = String(given ?? '').replace(/[,\s$%]/g, '');
  if (p.answerType === 'decimal') {
    if (!/^\d*\.?\d+$/.test(s)) return false;
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

function genPlace(rng) {
  const n = nd(rng, pick([3, 4], rng));
  const D = dls(n);
  const i = until(() => randInt(rng, 0, D.length - 1), k => D[k] !== 0);
  const shown = String(n).split('').map((ch, idx, arr) => {
    const pos = arr.length - 1 - idx;
    const comma = pos === 3 && arr.length > 3 ? ',' : '';
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

function genRound(rng) {
  if (rng() < 0.5) {
    const n = until(() => randInt(rng, 11, 999), x => x % 10 !== 0);
    const ans = Math.round(n / 10) * 10, d = n % 10;
    return {
      kind: 'input', prompt: `Round <span class="big-num">${n}</span> to the nearest <b>ten</b>.`, answer: ans,
      steps: [`Look at the ones digit: ${d}. ${d >= 5 ? '5 or more means round up' : 'Less than 5 means round down'}, so ${n} rounds to ${ans}.`],
    };
  }
  const n = until(() => randInt(rng, 101, 9999), x => x % 100 !== 0);
  const ans = Math.round(n / 100) * 100, d = Math.floor(n / 10) % 10;
  return {
    kind: 'input', prompt: `Round <span class="big-num">${n.toLocaleString('en-US')}</span> to the nearest <b>hundred</b>.`, answer: ans,
    steps: [`Look at the tens digit: ${d}. ${d >= 5 ? '5 or more means round up' : 'Less than 5 means round down'}, so ${n.toLocaleString('en-US')} rounds to ${ans.toLocaleString('en-US')}.`],
  };
}

function genMulFacts(rng) {
  const a = randInt(rng, 2, 12), b = randInt(rng, 2, 12);
  const seq = Array.from({ length: Math.min(b, a) }, (_, k) => (k + 1) * Math.max(a, b));
  return {
    kind: 'input', prompt: `<span class="big-num">${a} × ${b} = ?</span>`, answer: a * b,
    steps: [`${a} × ${b} is the same as ${Math.min(a, b)} groups of ${Math.max(a, b)}.`, `Count by ${Math.max(a, b)}s: ${seq.join(', ')}.`],
  };
}

function genDivFacts(rng) {
  const b = randInt(rng, 2, 12), q = randInt(rng, 2, 12), a = b * q;
  return {
    kind: 'input', prompt: `<span class="big-num">${a} ÷ ${b} = ?</span>`, answer: q,
    steps: [`Think: ${b} × what = ${a}?`, `${b} × ${q} = ${a}, so ${a} ÷ ${b} = ${q}.`],
  };
}

function genFracId(rng) {
  const d = pick([2, 3, 4, 5, 6, 8], rng), n = randInt(rng, 1, d - 1);
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

function genFracEquiv(rng) {
  const b = randInt(rng, 2, 6), a = randInt(rng, 1, b - 1), k = randInt(rng, 2, 5);
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

function genFracCompare(rng) {
  const type = pick(['sameD', 'sameN', 'equal'], rng);
  let n1, d1, n2, d2, why;
  if (type === 'sameD') {
    d1 = d2 = randInt(rng, 3, 12);
    [n1, n2] = until(() => [randInt(rng, 1, d1 - 1), randInt(rng, 1, d1 - 1)], ([x, y]) => x !== y);
    why = `Same bottom number (${d1}), so the pieces are the same size. More pieces is bigger: compare ${n1} and ${n2}.`;
  } else if (type === 'sameN') {
    n1 = n2 = randInt(rng, 1, 4);
    [d1, d2] = until(() => [randInt(rng, n1 + 1, 12), randInt(rng, n1 + 1, 12)], ([x, y]) => x !== y);
    why = `Same top number (${n1}). A bigger bottom number means smaller pieces, so ${n1}/${Math.min(d1, d2)} is the bigger fraction.`;
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

function genFracAdd(rng) {
  const d = randInt(rng, 3, 12);
  if (rng() < 0.65) {
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

function genFracOf(rng) {
  const d = pick([2, 3, 4, 5, 6, 8, 10], rng), k = randInt(rng, 2, 10), whole = d * k;
  const n = rng() < 0.5 ? 1 : randInt(rng, 1, d - 1);
  return {
    kind: 'input', prompt: `What is <span class="big-num">${frac(n, d)}</span> of <span class="big-num">${whole}</span>?`, answer: n * k,
    steps: [`Split ${whole} into ${d} equal groups: ${whole} ÷ ${d} = ${k}.`, n === 1 ? `One group is ${k}.` : `Take ${n} groups: ${k} × ${n} = ${n * k}.`],
  };
}

const fmtDec = (hundredths, places) => (hundredths / 100).toFixed(places);

function genDecPlace(rng) {
  const v = randInt(rng, 0, 3);
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

function genDecAdd(rng) {
  const p1 = pick([1, 2], rng), p2 = pick([1, 2], rng);
  const mk = p => (p === 1 ? randInt(rng, 11, 99) * 10 : randInt(rng, 101, 999));
  let x = mk(p1), y = mk(p2);
  const add = rng() < 0.6;
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

function genPctIntro(rng) {
  const v = randInt(rng, 0, 2);
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

function genPctOf(rng) {
  const p = pick([10, 20, 25, 50, 75, 5], rng);
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

function genWordAddSub(rng) {
  const n = pick(NAMES, rng), m = pick(NAMES.filter(x => x !== n), rng), it = pick(ITEMS, rng);
  const t = randInt(rng, 0, 2);
  if (t === 0) {
    const a = randInt(rng, 120, 600), b = randInt(rng, 110, 399);
    return { kind: 'input', prompt: `${n} has <b>${a}</b> ${it}. ${m} gives ${n} <b>${b}</b> more. How many ${it} does ${n} have now?`, answer: a + b, steps: ['"More" and "now" tell us to add.', ...addSolution(a, b).steps, `${n} has ${a + b} ${it}.`] };
  }
  if (t === 1) {
    const a = randInt(rng, 300, 900), b = randInt(rng, 101, a - 50);
    return { kind: 'input', prompt: `${n} had <b>${a}</b> ${it} and gave away <b>${b}</b>. How many are left?`, answer: a - b, steps: ['"Gave away" and "left" tell us to subtract.', ...subSolution(a, b).steps, `${a - b} ${it} are left.`] };
  }
  const a = randInt(rng, 300, 900), b = randInt(rng, 120, a - 40);
  return { kind: 'input', prompt: `${n} read <b>${a}</b> pages. ${m} read <b>${b}</b> pages. How many <b>more</b> pages did ${n} read?`, answer: a - b, steps: ['"How many more" means find the difference: subtract.', ...subSolution(a, b).steps] };
}

function genWordMulDiv(rng) {
  const n = pick(NAMES, rng), it = pick(ITEMS, rng);
  if (rng() < 0.5) {
    const a = randInt(rng, 3, 9), b = randInt(rng, 12, 48);
    return { kind: 'input', prompt: `There are <b>${a}</b> boxes with <b>${b}</b> ${it} in each box. How many ${it} are there in all?`, answer: a * b, steps: ['Equal groups put together means multiply.', ...mulSolution(b, a).steps, `${b} × ${a} = ${a * b}.`] };
  }
  const b = randInt(rng, 2, 9), q = randInt(rng, 3, 15), a = b * q;
  return { kind: 'input', prompt: `${n} shares <b>${a}</b> ${it} equally among <b>${b}</b> friends. How many does each friend get?`, answer: q, steps: ['Sharing equally means divide.', `${a} ÷ ${b} = ${q}, because ${b} × ${q} = ${a}.`] };
}

// ---------- Skill tree ----------

export const UNITS = [
  { id: 'num', title: 'Number Sense', emoji: '🔢' },
  { id: 'add', title: 'Addition', emoji: '➕' },
  { id: 'sub', title: 'Subtraction', emoji: '➖' },
  { id: 'mul', title: 'Multiplication', emoji: '✖️' },
  { id: 'div', title: 'Division', emoji: '➗' },
  { id: 'frac', title: 'Fractions', emoji: '🍕' },
  { id: 'dec', title: 'Decimals & Percents', emoji: '💯' },
];

const S = (id, unit, title, emoji, requires, desc, gen, extra = {}) => ({ id, unit, title, emoji, requires, desc, gen, ...extra });
const pair = (rng, da, db) => [nd(rng, da), nd(rng, db)];

export const SKILLS = [
  S('num-place', 'num', 'Place value', '🏠', [], 'What each digit is worth', genPlace),
  S('num-round', 'num', 'Rounding', '🎯', ['num-place'], 'Round to the nearest 10 or 100', genRound),
  S('word-add-sub', 'num', 'Story problems: + and −', '📖', ['add-3d-c1', 'sub-3d-b1'], 'Read, decide, solve', genWordAddSub),
  S('word-mul-div', 'num', 'Story problems: × and ÷', '📚', ['mul-2x1', 'div-2x1'], 'Equal groups and sharing', genWordMulDiv),

  S('add-2d-nc', 'add', '2-digit, no carrying', '🌱', [], 'Warm up: 34 + 25', rng => makeAdd(...until(() => pair(rng, 2, 2), ([a, b]) => countCarries(a, b) === 0)), { guided: true }),
  S('add-2d-c', 'add', '2-digit with carrying', '🌿', ['add-2d-nc'], 'Carry the 1: 47 + 38', rng => makeAdd(...until(() => pair(rng, 2, 2), ([a, b]) => countCarries(a, b) >= 1)), { guided: true, gym: true }),
  S('add-3d-nc', 'add', '3-digit, no carrying', '🌳', ['add-2d-c'], 'Bigger numbers: 312 + 456', rng => makeAdd(...until(() => pair(rng, 3, 3), ([a, b]) => countCarries(a, b) === 0)), { guided: true }),
  S('add-3d-c1', 'add', '3-digit, one carry', '🍀', ['add-3d-nc'], 'One carry: 358 + 217', rng => makeAdd(...until(() => pair(rng, 3, 3), ([a, b]) => countCarries(a, b) === 1)), { guided: true, gym: true }),
  S('add-3d-c2', 'add', '3-digit, many carries', '🌲', ['add-3d-c1'], 'Carry chains: 487 + 365', rng => makeAdd(...until(() => pair(rng, 3, 3), ([a, b]) => countCarries(a, b) >= 2)), { guided: true, gym: true }),

  S('sub-2d-nb', 'sub', '2-digit, no borrowing', '🐣', ['add-2d-nc'], 'Warm up: 87 − 25', rng => makeSub(...until(() => pair(rng, 2, 2), ([a, b]) => a > b && countBorrows(a, b) === 0)), { guided: true }),
  S('sub-2d-b', 'sub', '2-digit with borrowing', '🐥', ['sub-2d-nb'], 'Borrow: 52 − 27', rng => makeSub(...until(() => pair(rng, 2, 2), ([a, b]) => a > b && countBorrows(a, b) === 1)), { guided: true, gym: true }),
  S('sub-3d-nb', 'sub', '3-digit, no borrowing', '🐤', ['sub-2d-b'], 'Bigger: 768 − 325', rng => makeSub(...until(() => [nd(rng, 3), nd(rng, pick([2, 3], rng))], ([a, b]) => a > b && countBorrows(a, b) === 0)), { guided: true }),
  S('sub-3d-b1', 'sub', '3-digit, one borrow', '🦆', ['sub-3d-nb'], 'One borrow: 643 − 218', rng => makeSub(...until(() => [nd(rng, 3), nd(rng, 3)], ([a, b]) => a > b && countBorrows(a, b) === 1 && !borrowsAcrossZero(a, b))), { guided: true, gym: true }),
  S('sub-3d-b2', 'sub', '3-digit, two borrows', '🦢', ['sub-3d-b1'], 'Double borrow: 523 − 278', rng => makeSub(...until(() => [nd(rng, 3), nd(rng, 3)], ([a, b]) => a > b && countBorrows(a, b) === 2 && !borrowsAcrossZero(a, b))), { guided: true, gym: true }),
  S('sub-3d-bz', 'sub', 'Borrowing across zeros', '🦉', ['sub-3d-b2'], 'The tricky one: 403 − 178', rng => makeSub(...until(() => {
    const a = randInt(rng, 1, 9) * 100 + randInt(rng, 0, 8) * (rng() < 0.3 ? 0 : 1);
    return [a, randInt(rng, 11, a - 1)];
  }, ([a, b]) => Math.floor(a / 10) % 10 === 0 && a > b && borrowsAcrossZero(a, b))), { guided: true, gym: true }),

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
];

export const skillById = id => SKILLS.find(s => s.id === id);

export function isUnlocked(skill, p) {
  if (p.settings.unlockAll) return true;
  const recs = p.math.skills;
  if (recs[skill.id]?.unlocked) return true;
  return skill.requires.every(r => (recs[r]?.stars || 0) >= 2);
}
