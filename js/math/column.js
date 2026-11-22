// Column-arithmetic workspace: the problem laid out in columns, an optional carry/borrow
// scratch row, and ONE answer box whose digits line up under the columns.
import { h } from '../ui.js';
import { dls, COL } from './skills.js';
import { profile, save } from '../store.js';

export function columnWidget(p, { onEnter } = {}) {
  const W = p.cells;
  const A = dls(p.a), B = dls(p.b);
  const hasScratch = !(p.op === '×' && p.b >= 10);
  const isSub = p.op === '−';
  const grid = h('div', { class: 'col-grid', style: { gridTemplateColumns: `repeat(${W + 1}, var(--cell))` } });
  const at = (row, colIdx, el) => {
    el.style.gridRow = row;
    el.style.gridColumn = W + 1 - colIdx;
    grid.append(el);
    return el;
  };

  // Row 1: optional scratch boxes (carries above columns for + and ×, borrow notes above top digits for −)
  const scratch = [];
  if (hasScratch) {
    for (let i = 0; i < W; i++) {
      if (isSub ? i >= A.length : i === 0) continue;
      scratch[i] = at(1, i, h('input', {
        class: 'scratch', inputmode: 'numeric', maxlength: 2, autocomplete: 'off',
        'aria-label': `${isSub ? 'borrow note' : 'carry'} above ${COL[i]}`,
      }));
    }
  }

  // Rows 2-3: the numbers
  const topEls = A.map((d, i) => at(2, i, h('div', { class: 'digit' }, d)));
  const opEl = h('div', { class: 'digit op' }, p.op);
  opEl.style.gridRow = 3;
  opEl.style.gridColumn = 1;
  grid.append(opEl);
  const botEls = B.map((d, i) => at(3, i, h('div', { class: 'digit' }, d)));
  grid.append(h('div', { class: 'rule', style: { gridRow: 4, gridColumn: `1 / span ${W + 1}` } }));

  // Row 5: one answer box spanning the digit columns. Typed digits fill from the right.
  const input = h('input', {
    class: 'col-answer', inputmode: 'numeric', maxlength: W, autocomplete: 'off', 'aria-label': 'answer',
    style: { gridRow: 5, gridColumn: `2 / span ${W}` },
  });
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, W);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter?.();
    }
  });
  grid.append(input);

  // Carry/borrow boxes are optional and hidden unless the kid turns them on (remembered per player).
  const label = isSub ? 'borrow boxes' : 'carry boxes';
  const pr = profile();
  const setScratch = on => {
    grid.classList.toggle('hide-scratch', !on);
    if (toggle) toggle.textContent = on ? `✏️ Hide ${label}` : `✏️ Use ${label}`;
  };
  const toggle = hasScratch ? h('button', { class: 'link-btn scratch-toggle', type: 'button', onclick: () => {
    const on = grid.classList.contains('hide-scratch');
    if (pr) {
      pr.settings.scratch = on;
      save();
    }
    setScratch(on);
    (on ? scratch.find(Boolean) : input)?.focus();
  } }) : null;
  setScratch(!!pr?.settings.scratch);

  const el = h('div', { class: 'col-wrap' }, grid, toggle);
  let coachDigits = [];

  return {
    el,
    focus: () => input.focus(),
    value: () => input.value.replace(/^0+(?=\d)/, ''),
    lock() {
      input.disabled = true;
      scratch.forEach(c => c && (c.disabled = true));
      toggle?.remove();
    },
    // Show right/wrong; on a wrong answer, show the right digits and the carries/borrows that make them.
    reveal() {
      const ok = Number(input.value) === p.answer;
      input.classList.add(ok ? 'ok' : 'bad');
      if (ok) return;
      dls(p.answer).forEach((d, i) => at(6, i, h('div', { class: 'digit fix' }, d)));
      setScratch(true);
      toggle?.remove();
      if (isSub && p.newTop) {
        p.newTop.forEach((v, i) => {
          if (v == null) return;
          topEls[i].classList.add('struck');
          if (scratch[i]) {
            scratch[i].value = v;
            scratch[i].classList.add('revealed');
          }
        });
      } else if (p.carries) {
        p.carries.forEach((v, i) => {
          if (v && scratch[i]) {
            scratch[i].value = v;
            scratch[i].classList.add('revealed');
          }
        });
      }
      // Keep only the boxes that matter for this answer.
      scratch.forEach(c => c && !c.classList.contains('revealed') && !c.value && c.classList.add('unused'));
    },
    // Coach-mode helpers
    highlight(i) {
      grid.querySelectorAll('.hl-col').forEach(x => x.classList.remove('hl-col'));
      [topEls[i], botEls[i], scratch[i]].forEach(x => x?.classList.add('hl-col'));
    },
    write(i, d) {
      coachDigits[i] = d;
      input.value = Array.from({ length: coachDigits.length }, (_, k) => coachDigits[k] ?? '').reverse().join('');
      input.classList.add('popin');
    },
    note(i, v) {
      if (!scratch[i]) return;
      scratch[i].value = v;
      scratch[i].classList.add('revealed', 'popin');
    },
    strike(i) {
      topEls[i]?.classList.add('struck');
    },
    setCoachMode() {
      input.readOnly = true;
      input.tabIndex = -1;
      scratch.forEach(c => c && (c.readOnly = true));
      setScratch(true);
      toggle?.remove();
      coachDigits = [];
    },
  };
}
