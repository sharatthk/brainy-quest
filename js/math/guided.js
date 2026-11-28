// Coach mode: walks the kid through each column, asking about carries and borrows.
import { h, onEnter, advanceDelay } from '../ui.js';
import { guidedPlan } from './skills.js';
import { columnWidget } from './column.js';
import { sfx } from '../shared/sound.js';

export function runGuided(container, p, onDone) {
  const plan = guidedPlan(p);
  const w = columnWidget(p);
  w.setCoachMode();
  const bubble = h('div', { class: 'coach' });
  container.append(h('div', { class: 'coach-tag' }, "🦉 Let's solve it together, one column at a time"), w.el, bubble);
  let idx = 0, mistakes = 0, tries = 0;

  function show() {
    if (idx >= plan.length) {
      bubble.replaceChildren(h('p', { class: 'coach-q' }, `🎉 You did it! ${p.a} ${p.op} ${p.b} = ${p.answer}`));
      return onDone({ mistakes });
    }
    const s = plan[idx];
    tries = 0;
    w.highlight(s.col);
    if (s.kind === 'info') {
      bubble.replaceChildren(h('p', { class: 'coach-q' }, s.text), h('button', { class: 'btn', onclick: () => { w.write(s.col, s.write); next(); } }, 'OK'));
      bubble.querySelector('button').focus();
      return;
    }
    if (s.kind === 'yesno') {
      const msg = h('p', { class: 'coach-msg' });
      const answer = val => {
        if (val === s.expect) {
          sfx.click();
          s.changes.forEach(c => {
            w.strike(c.col);
            w.note(c.col, c.value);
          });
          msg.textContent = s.success;
          msg.className = 'coach-msg good';
          setTimeout(next, advanceDelay(s.expect ? 1400 : 800));
        } else {
          mistakes++;
          sfx.wrong();
          msg.textContent = s.expect ? 'Look again: is the top digit smaller than the bottom one?' : 'Look again: the top digit is big enough to take away from.';
          msg.className = 'coach-msg bad';
        }
      };
      bubble.replaceChildren(
        h('p', { class: 'coach-q' }, s.question),
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => answer(true) }, 'Yes, borrow'), h('button', { class: 'btn alt', onclick: () => answer(false) }, 'No borrow')),
        msg,
      );
      return;
    }
    // kind: 'ask'
    const inp = h('input', { class: 'answer-input small', inputmode: 'numeric', autocomplete: 'off', 'aria-label': 'column answer' });
    const msg = h('p', { class: 'coach-msg' });
    const check = () => {
      if (!inp.value.trim()) return;
      if (Number(inp.value) === s.expect) {
        sfx.click();
        w.write(s.col, s.write);
        if (s.carry) w.note(s.carry.col, s.carry.value);
        msg.textContent = s.success;
        msg.className = 'coach-msg good';
        inp.disabled = true;
        setTimeout(next, advanceDelay(s.carry ? 1400 : 800));
      } else {
        mistakes++;
        tries++;
        sfx.wrong();
        msg.textContent = tries >= 2 ? `It's ${s.expect}. Type ${s.expect} to keep going.` : 'Not quite - count again carefully.';
        msg.className = 'coach-msg bad';
        inp.select();
      }
    };
    onEnter(inp, check);
    bubble.replaceChildren(h('p', { class: 'coach-q' }, s.question), h('div', { class: 'row' }, inp, h('button', { class: 'btn', onclick: check }, 'Check')), msg);
    inp.focus();
  }
  function next() {
    idx++;
    show();
  }
  show();
}
