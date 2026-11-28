// "Let's walk through it": after a second miss on the same skill, the retry shows the worked steps one at a
// time and the kid works out a number in each step (see stepBlank), then answers the whole problem.
// Works for any problem with text steps; the column skills keep their own Coach mode (guided.js).
import { h, onEnter } from '../ui.js';
import { sfx } from '../shared/sound.js';

const NUM = '[−-]?\\$?\\d(?:[\\d,]*\\d)?(?:\\.\\d+)?';

const value = s => Number(String(s).replace(/[−–]/g, '-').replace(/[$,]/g, ''));

// Numbers shown in the problem itself (prompt and choices): asking for one of those teaches nothing.
export function givenNumbers(pr) {
  const text = [pr.prompt, ...(pr.choices || [])].join(' ').replace(/<sup>(\d+)<\/sup>/g, ' $1').replace(/<\/?[a-z][^>]*>/gi, ' ').replace(/&[a-z]+;/g, ' ');
  return new Set((text.match(new RegExp(NUM, 'g')) || []).map(value));
}

// Splits a step at the number to work out: { before, expect, after }, or null if there is none.
// First choice: the result after its last "=". Otherwise the last number that is not in the problem
// (like the 4 in "47 has 4 tens"), so even compare and pick problems get something to work out.
export function stepBlank(text, given = null) {
  const at = (index, num) => ({ before: text.slice(0, index), expect: num, after: text.slice(index + num.length) });
  const rx = new RegExp(`= (${NUM})`, 'g');
  let m, last = null;
  while ((m = rx.exec(text))) last = m;
  if (last) return at(last.index + 2, last[1]);
  if (!given) return null;
  // Skip numbers in the problem and tiny counting words like "1 place" or "2 zeros".
  const any = new RegExp(`(?<![\\w.])${NUM}(?!\\w)`, 'g');
  let pick = null;
  while ((m = any.exec(text))) {
    const v = value(m[0]);
    if (!given.has(v) && !(Number.isInteger(v) && v >= 0 && v <= 3)) pick = m;
  }
  return pick ? at(pick.index, pick[0]) : null;
}

// "1,200" == "1200", "−5" == "-5", "$2.50" == "2.5".
export const sameNumber = (given, expect) => {
  const n = s => Number(String(s).trim().replace(/[−–]/g, '-').replace(/[$,\s]/g, ''));
  return given.trim() !== '' && n(given) === n(expect);
};

// Shows pr.steps one at a time in `container`. Calls onDone({ mistakes }) after the last step.
export function runWalk(container, pr, onDone) {
  const list = h('ol', { class: 'walk-steps' });
  const box = h('div', { class: 'walk' }, h('p', { class: 'walk-tag' }, "🦉 Let's walk through it together, one step at a time"), list);
  container.append(box);
  let idx = 0, mistakes = 0;
  const given = givenNumbers(pr);

  function show() {
    if (idx >= pr.steps.length) return onDone({ mistakes });
    const text = pr.steps[idx];
    const b = stepBlank(text, given);
    const li = h('li', { class: 'walk-step' });
    list.append(li);
    if (!b) {
      const ok = h('button', { class: 'btn small', onclick: () => { ok.remove(); idx++; show(); } }, 'Next step ›');
      li.append(h('span', {}, text), ' ', ok);
      ok.focus();
      return;
    }
    const inp = h('input', { class: 'answer-input small walk-input', inputmode: 'text', autocomplete: 'off', 'aria-label': `step ${idx + 1}` });
    const msg = h('p', { class: 'walk-msg' });
    let tries = 0;
    const check = () => {
      if (!inp.value.trim()) return;
      if (sameNumber(inp.value, b.expect)) {
        sfx.correct?.();
        finish(true);
        return;
      }
      tries++;
      if (tries < 2) {
        inp.classList.add('bad');
        msg.textContent = 'Not yet. Look at the numbers in this step and try again.';
        inp.select();
        return;
      }
      mistakes++;
      finish(false);
    };
    const finish = ok => {
      li.replaceChildren(h('span', {}, b.before), h('b', { class: ok ? 'walk-ok' : 'walk-fix' }, b.expect), h('span', {}, b.after));
      if (!ok) li.append(h('p', { class: 'walk-msg' }, `It is ${b.expect}. Keep going!`));
      idx++;
      show();
    };
    onEnter(inp, check);
    li.append(h('span', {}, b.before), inp, h('span', {}, b.after), ' ', h('button', { class: 'btn small', onclick: check }, 'Check'), msg);
    inp.focus();
  }
  show();
}
