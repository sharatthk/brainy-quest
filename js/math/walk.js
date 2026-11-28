// "Let's walk through it": after a second miss on the same skill, the retry shows the worked steps one at a
// time and the kid works out each step's result (the number after the last "="), then answers the whole problem.
// Works for any problem with text steps; the column skills keep their own Coach mode (guided.js).
import { h, onEnter } from '../ui.js';
import { sfx } from '../shared/sound.js';

const NUM = '[−-]?\\$?\\d(?:[\\d,]*\\d)?(?:\\.\\d+)?';

// Splits a step at the number after its last "=": { before, expect, after }, or null if there is none.
export function stepBlank(text) {
  const rx = new RegExp(`= (${NUM})`, 'g');
  let m, last = null;
  while ((m = rx.exec(text))) last = m;
  if (!last) return null;
  const start = last.index + 2;
  return { before: text.slice(0, start), expect: last[1], after: text.slice(start + last[1].length) };
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

  function show() {
    if (idx >= pr.steps.length) return onDone({ mistakes });
    const text = pr.steps[idx];
    const b = stepBlank(text);
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
