// Answer oracles evaluated inside the page. Each top-level function is passed to page.evaluate().
// Separated by a line "//---- name" so the Python side can load them by name.

//---- init
// Init script: records Math.random() outputs (so a math problem can be regenerated from them),
// and stubs speech so tests can read which word the app speaks.
(() => {
  const orig = Math.random.bind(Math);
  const log = [];
  let replay = null;
  Math.random = function random() {
    if (replay) return replay();
    const v = orig();
    log.push(v);
    if (log.length > 400000) log.splice(0, 200000);
    return v;
  };
  window.__rand = { log, setReplay: f => { replay = f; } };
  // Buddy speech bubble watcher: while the session buddy's bubble is showing, record any control it
  // overlaps and any horizontal overflow it causes. Read back by the suite at the end of each flow.
  window.__pal = { shown: 0, texts: [], hits: [], overflow: [] };
  setInterval(() => {
    const pal = document.querySelector('.pal.show');
    const bub = pal && pal.querySelector('.pal-bubble');
    if (!bub || getComputedStyle(bub).opacity < 0.9) return;
    const P = window.__pal;
    P.shown++;
    const t = bub.textContent;
    if (!P.texts.includes(t)) P.texts.push(t);
    const b = bub.getBoundingClientRect();
    if (b.right > innerWidth + 1 || b.left < -1) P.overflow.push(`"${t}" ${Math.round(b.left)}..${Math.round(b.right)} > ${innerWidth}`);
    if (document.documentElement.scrollWidth > innerWidth) P.overflow.push(`scrollWidth ${document.documentElement.scrollWidth} while "${t}" shows`);
    for (const el of document.querySelectorAll('main button, main input, main a.btn, main select, main textarea, main .icon-btn, header button, header a')) {
      if (pal.contains(el) || !el.offsetParent) continue;
      const r = el.getBoundingClientRect();
      const ox = Math.min(r.right, b.right) - Math.max(r.left, b.left), oy = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top);
      if (ox > 2 && oy > 2) {
        const d = `"${t}" covers <${el.tagName.toLowerCase()} class="${el.className}"> ${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)} (${Math.round(ox)}x${Math.round(oy)}px)`;
        if (!P.hits.includes(d)) P.hits.push(d);
      }
    }
  }, 120);
  window.__said = [];
  if (window.speechSynthesis) {
    window.speechSynthesis.speak = u => { window.__said.push(String(u.text)); };
  }
})();

//---- math
// Finds the math problem on screen by replaying the recorded Math.random() values through the real
// generators (js/math/tiers.js genAt) until one reproduces exactly what is rendered. Returns the answer.
async ({ skillId, tier, sel }) => {
  const base = new URL('.', location.href).href;
  const T = await import(base + 'js/math/tiers.js');
  const S = await import(base + 'js/math/skills.js');
  const card = [...document.querySelectorAll(sel)].pop();
  if (!card) return { err: 'no question card' };
  const norm = html => { const d = document.createElement('div'); d.innerHTML = html; return d.innerHTML; };
  const txt = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
  const tagText = card.querySelector('.q-tag')?.textContent || '';
  const chip = card.querySelector('.tier-chip');
  const t = tier || (chip ? (chip.textContent.match(/★/g) || []).length : 0);
  let skills = skillId ? [S.skillById(skillId)] : S.SKILLS.filter(s => tagText.includes(s.title));
  if (!skills.length) skills = S.SKILLS;
  const tiers = t ? [t] : [1, 2, 3];

  const grid = card.querySelector('.col-grid');
  let match;
  if (grid) {
    const rows = {};
    let op = null;
    for (const d of grid.querySelectorAll('.digit')) {
      if (d.classList.contains('op')) { op = d.textContent.trim(); continue; }
      const r = parseInt(d.style.gridRow), c = parseInt(d.style.gridColumn);
      if (r !== 2 && r !== 3) continue;
      (rows[r] ||= {})[c] = d.textContent.trim();
    }
    const num = r => Number(Object.keys(rows[r] || {}).sort((a, b) => a - b).map(c => rows[r][c]).join(''));
    const a = num(2), b = num(3);
    match = pr => pr.kind === 'column' && pr.a === a && pr.b === b && pr.op === op;
  } else {
    const prompt = card.querySelector('.q-prompt')?.innerHTML ?? '';
    const viz = card.querySelector('.viz-wrap')?.innerHTML ?? '';
    const choices = [...card.querySelectorAll('.choice')].map(b => b.innerHTML);
    match = pr => {
      if (pr.kind === 'column') return false;
      const p = pr.kind === 'division' ? `<span class="big-num">${pr.prompt} = ?</span>` : pr.prompt;
      if (norm(p) !== prompt) return false;
      if (norm(pr.visual || '') !== viz) return false;
      if (pr.kind === 'choice') {
        const want = pr.choices.map(c => (pr.fracChoices && c.includes('/') ? norm(S.frac(...c.split('/'))) : txt(c)));
        return want.length === choices.length && want.every((w, i) => w === choices[i]);
      }
      return choices.length === 0;
    };
  }

  const log = window.__rand.log;
  const stop = Math.max(0, log.length - 60000);
  let found = null;
  try {
    outer: for (let i = log.length - 1; i >= stop; i--) {
      for (const s of skills) {
        for (const tt of tiers) {
          let j = i;
          const rng = () => { if (j >= log.length) throw new Error('end'); return log[j++]; };
          window.__rand.setReplay(rng);
          let pr;
          try { pr = T.genAt(s, tt, rng); } catch { continue; }
          if (match(pr)) { found = { pr, s, tt }; break outer; }
        }
      }
    }
  } finally {
    window.__rand.setReplay(null);
  }
  if (!found) return { err: `no generator reproduced the problem (tag "${tagText}", tier ${t})` };
  const { pr, s, tt } = found;
  const out = { kind: pr.kind, skill: s.id, tier: tt, answerText: S.answerText(pr), steps: pr.steps || [] };
  if (pr.kind === 'choice') out.choiceIndex = pr.choices.indexOf(pr.answer);
  else if (pr.kind === 'division') { out.q = pr.q; out.r = pr.r; }
  else if (pr.kind === 'fraction') { out.n = pr.answer.n; out.d = pr.answer.d; }
  else out.answer = pr.answer;
  if (pr.kind === 'column') {
    out.a = pr.a; out.b = pr.b; out.op = pr.op;
    try { out.plan = S.guidedPlan(pr); } catch { out.plan = null; }
  }
  return out;
}

//---- english
// Identifies the English question on screen from js/english/content.js and returns how to answer it.
async ({ unitId }) => {
  const base = new URL('.', location.href).href;
  const C = await import(base + 'js/english/content.js');
  const card = [...document.querySelectorAll('.stage .q-card')].pop();
  if (!card) return { err: 'no question card' };
  const tag = card.querySelector('.q-tag')?.textContent || '';
  const units = unitId ? [C.unitById(unitId)] : C.ENGLISH_UNITS.filter(u => tag === `${u.emoji} ${u.title}`);
  const prompt = card.querySelector('.q-prompt')?.textContent;
  const passage = card.querySelector('.passage')?.textContent || null;
  const choices = [...card.querySelectorAll('.choice')].map(b => b.textContent);
  const taps = [...card.querySelectorAll('.tap-word')].map(b => b.textContent);
  const fill = card.querySelector('.fill-sentence');
  for (const u of units) {
    for (const q of u.questions) {
      if (q.q !== prompt || (q.p || null) !== passage) continue;
      if (q.t === 'mc' && choices.length && choices.every(c => q.c.includes(c))) {
        return { t: 'mc', unit: u.id, answer: q.a, index: choices.indexOf(q.a), choices: choices.length, hint: null };
      }
      if (q.t === 'tap' && taps.length && taps.join(' ') === q.s.split(/\s+/).join(' ')) {
        const want = new Set(q.a.map(w => C.cleanWord(w).toLowerCase()));
        return { t: 'tap', unit: u.id, answer: q.a.join(', '), indices: taps.map((w, i) => (want.has(C.cleanWord(w).toLowerCase()) ? i : -1)).filter(i => i >= 0), count: q.a.length, hint: card.querySelector('.q-hint')?.textContent || null };
      }
      if (q.t === 'fill' && fill && fill.textContent.replace(/\s+/g, ' ').trim() === q.s.split('___').join('').replace(/\s+/g, ' ').trim()) {
        return { t: 'fill', unit: u.id, answer: q.a.join(', '), text: q.a[0], hint: card.querySelector('.q-hint')?.textContent || null };
      }
    }
  }
  return { err: `question not found: "${prompt}" (tag "${tag}")` };
}
