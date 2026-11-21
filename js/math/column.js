// Column-arithmetic workspace: carry/borrow scratch row, digits, and right-to-left answer cells.
import { h } from '../ui.js';
import { dls, COL } from './skills.js';

export function columnWidget(p, { onEnter } = {}) {
  const W = p.cells;
  const A = dls(p.a), B = dls(p.b);
  const showScratch = !(p.op === '×' && p.b >= 10);
  const grid = h('div', { class: 'col-grid', style: { gridTemplateColumns: `repeat(${W + 1}, var(--cell))` } });
  const at = (row, colIdx, el) => {
    el.style.gridRow = row;
    el.style.gridColumn = W + 1 - colIdx;
    grid.append(el);
    return el;
  };

  // Row 1: scratch (carries above columns for + and ×, borrow marks above top digits for −)
  const scratch = [];
  if (showScratch) {
    for (let i = 0; i < W; i++) {
      const isSub = p.op === '−';
      if (isSub ? i >= A.length : i === 0) continue;
      scratch[i] = at(1, i, h('input', {
        class: 'scratch', inputmode: 'numeric', maxlength: 2, autocomplete: 'off',
        'aria-label': `${isSub ? 'borrow note' : 'carry'} above ${COL[i]}`,
      }));
    }
  }

  // Row 2-3: the numbers
  const topEls = A.map((d, i) => at(2, i, h('div', { class: 'digit' }, d)));
  const opEl = h('div', { class: 'digit op' }, p.op);
  opEl.style.gridRow = 3;
  opEl.style.gridColumn = 1;
  grid.append(opEl);
  B.forEach((d, i) => at(3, i, h('div', { class: 'digit' }, d)));
  grid.append(h('div', { class: 'rule', style: { gridRow: 4, gridColumn: `1 / span ${W + 1}` } }));

  // Row 5: answer cells
  const cells = [];
  for (let i = 0; i < W; i++) {
    const inp = h('input', { class: 'cell', inputmode: 'numeric', maxlength: 1, autocomplete: 'off', 'aria-label': `answer ${COL[i]} digit` });
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(-1);
      if (inp.value && i + 1 < W) cells[i + 1].focus();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !inp.value && i > 0) {
        e.preventDefault();
        cells[i - 1].value = '';
        cells[i - 1].focus();
      } else if (e.key === 'ArrowLeft' && i + 1 < W) cells[i + 1].focus();
      else if (e.key === 'ArrowRight' && i > 0) cells[i - 1].focus();
      else if (e.key === 'Enter') {
        e.preventDefault();
        onEnter?.();
      }
    });
    cells[i] = at(5, i, inp);
  }

  const el = h('div', { class: 'col-wrap' }, grid);

  return {
    el,
    focus: () => cells[0].focus(),
    // Returns digits as a string, '' if empty, or null if there is a gap.
    value() {
      let s = '';
      for (let i = W - 1; i >= 0; i--) {
        const v = cells[i].value;
        if (!v && s) return null;
        s += v;
      }
      return s.replace(/^0+(?=\d)/, '');
    },
    lock() {
      cells.forEach(c => (c.disabled = true));
      scratch.forEach(c => c && (c.disabled = true));
    },
    reveal() {
      const ans = dls(p.answer);
      cells.forEach((c, i) => {
        const want = ans[i] === undefined ? '' : String(ans[i]);
        const got = c.value;
        c.classList.add(got === want ? 'ok' : 'bad');
        if (got !== want) at(6, i, h('div', { class: 'digit fix' }, want));
      });
      if (p.op === '−' && p.newTop) {
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
    },
    // Coach-mode helpers
    highlight(i) {
      grid.querySelectorAll('.hl-col').forEach(x => x.classList.remove('hl-col'));
      [topEls[i], cells[i], scratch[i]].forEach(x => x?.classList.add('hl-col'));
      grid.querySelectorAll('.digit').forEach(d => {
        if (d.style.gridColumn === String(W + 1 - i) && (d.style.gridRow === '2' || d.style.gridRow === '3')) d.classList.add('hl-col');
      });
    },
    write(i, d) {
      cells[i].value = d;
      cells[i].classList.add('ok', 'popin');
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
      cells.forEach(c => (c.readOnly = true));
      scratch.forEach(c => c && (c.readOnly = true));
    },
  };
}
