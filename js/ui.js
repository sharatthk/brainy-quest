// Tiny DOM helpers.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

export function toast(text, emoji = '⭐', ms = 2600) {
  const box = document.getElementById('toasts');
  const t = h('div', { class: 'toast' }, h('span', { class: 'toast-emoji' }, emoji), h('span', {}, text));
  box.append(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 400);
  }, ms);
}

export function modal(...children) {
  const card = h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true' }, ...children);
  const back = h('div', { class: 'modal-back' }, card);
  const close = () => {
    back.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = e => e.key === 'Escape' && close();
  back.addEventListener('click', e => e.target === back && close());
  document.addEventListener('keydown', onKey);
  document.body.append(back);
  return close;
}

// Floating "+1 🪙" near an element.
export function pop(anchor, text) {
  const r = anchor?.getBoundingClientRect?.() || { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
  const el = h('div', { class: 'pop' }, text);
  el.style.left = `${r.left + r.width / 2}px`;
  el.style.top = `${r.top + window.scrollY}px`;
  document.body.append(el);
  setTimeout(() => el.remove(), 1100);
}
