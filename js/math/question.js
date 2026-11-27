// Renders one math problem's input UI (column, choices, division, fraction or a plain box).
// Shared by practice sessions and speed challenges.
import { h, onEnter } from '../ui.js';
import { frac, checkAnswer } from './skills.js';
import { columnWidget } from './column.js';

// Appends the problem to `card`. Calls onSubmit(value, choiceButton) when the kid answers.
// Returns { focus, lock, reveal, onKey, checkBtn, isEmpty }.
export function buildQuestion(card, pr, { onSubmit, compact = false }) {
  const q = { focus: () => {}, lock: () => {}, reveal: () => {}, onKey: null, checkBtn: null };
  let getValue = () => '';
  const submit = () => onSubmit(getValue());

  if (pr.kind === 'column') {
    const w = columnWidget(pr, { onEnter: submit });
    if (!compact) card.append(h('p', { class: 'q-hint' }, 'Type the whole answer in the box.'));
    card.append(w.el);
    getValue = () => w.value();
    q.focus = () => w.focus();
    q.lock = () => w.lock();
    q.reveal = () => w.reveal();
  } else if (pr.kind === 'choice') {
    card.append(h('div', { class: 'q-prompt', html: pr.prompt }));
    if (pr.visual) card.append(h('div', { class: 'viz-wrap', html: pr.visual }));
    const box = h('div', { class: `choices ${pr.choices.length <= 3 ? 'few' : ''}` });
    pr.choices.forEach((c, i) => {
      const b = h('button', { class: 'choice', onclick: () => onSubmit(c, b) });
      if (pr.fracChoices && c.includes('/')) b.innerHTML = frac(...c.split('/'));
      else b.textContent = c;
      b.dataset.key = String(i + 1);
      box.append(b);
    });
    card.append(box);
    q.lock = () => box.querySelectorAll('button').forEach(b => (b.disabled = true));
    q.reveal = picked => box.querySelectorAll('.choice').forEach((b, i) => {
      if (pr.choices[i] === pr.answer) b.classList.add('ok');
      else if (b === picked) b.classList.add('bad');
    });
    q.onKey = e => {
      const b = box.querySelector(`[data-key="${e.key}"]`);
      if (b && !b.disabled) b.click();
    };
  } else {
    card.append(h('div', { class: 'q-prompt', html: pr.kind === 'division' ? `<span class="big-num">${pr.prompt} = ?</span>` : pr.prompt }));
    if (pr.visual) card.append(h('div', { class: 'viz-wrap', html: pr.visual }));
    const mk = (label, cls = '') => {
      const i = h('input', { class: `answer-input ${cls}`, inputmode: pr.answerType === 'decimal' ? 'decimal' : pr.answerType === 'big' || pr.answerType === 'int' ? 'text' : 'numeric', autocomplete: 'off', 'aria-label': label });
      onEnter(i, () => submit());
      return i;
    };
    let inputs;
    if (pr.kind === 'division') {
      const qt = mk('quotient'), r = mk('remainder', 'small');
      card.append(h('div', { class: 'row center' }, qt, h('span', { class: 'r-label' }, 'R'), r),
        compact ? null : h('p', { class: 'q-hint' }, 'R = remainder (leave it empty if nothing is left over)'));
      getValue = () => ({ q: qt.value, r: r.value });
      inputs = [qt, r];
    } else if (pr.kind === 'fraction') {
      const n = mk('numerator', 'small'), d = mk('denominator', 'small');
      card.append(h('div', { class: 'frac-input' }, n, h('div', { class: 'frac-line' }), d));
      getValue = () => ({ n: n.value, d: d.value });
      inputs = [n, d];
    } else {
      const i = mk('answer');
      card.append(h('div', { class: 'row center' }, i, pr.suffix ? h('span', { class: 'r-label' }, pr.suffix) : null));
      if (pr.answerType === 'big' && !compact) card.append(h('p', { class: 'q-hint' }, 'Type it with digits, or like 6M or 6 million.'));
      getValue = () => i.value;
      inputs = [i];
    }
    q.focus = () => inputs[0].focus();
    q.lock = () => inputs.forEach(x => (x.disabled = true));
    q.reveal = () => {
      const cls = checkAnswer(pr, getValue()) ? 'ok' : 'bad';
      inputs.forEach(x => x.classList.add(cls));
    };
  }
  if (pr.kind !== 'choice') {
    q.checkBtn = h('button', { class: 'btn big', onclick: submit }, 'Check ✓');
    card.append(h('div', { class: 'row center' }, q.checkBtn));
  }
  return q;
}

export const isEmptyAnswer = val =>
  val == null || (typeof val === 'string' && !val.trim()) || (typeof val === 'object' && !Object.values(val).some(v => String(v).trim()));
