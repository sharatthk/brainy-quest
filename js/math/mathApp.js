// Math Quest: skill map and practice sessions.
import { h, modal, toast } from '../ui.js';
import { screen, stars, sessionFrame, resultsView, cheer, praise } from '../views/common.js';
import { profile, save } from '../store.js';
import { SKILLS, UNITS, skillById, isUnlocked, diagnose, checkAnswer, answerText, frac } from './skills.js';
import { emptyRec, record, recentAccuracy } from '../shared/mastery.js';
import { columnWidget } from './column.js';
import { runGuided } from './guided.js';
import { award, recordAnswer, finishSession } from '../shared/rewards.js';
import { sfx } from '../shared/sound.js';
import { render as rerender } from '../router.js';
import { pick } from '../shared/util.js';

const rec = id => (profile().math.skills[id] ||= emptyRec());

// ---------------- Map ----------------

export function viewMap() {
  const p = profile();
  const totalStars = SKILLS.reduce((s, k) => s + (p.math.skills[k.id]?.stars || 0), 0);
  const main = screen({ title: 'Math Quest', back: '#/' });
  main.append(
    h('div', { class: 'quest-head' },
      h('div', {}, h('h2', {}, 'Pick your challenge'), h('p', { class: 'muted' }, `${totalStars} of ${SKILLS.length * 3} stars collected. Earn 2 ★ to unlock the next skill.`))),
    h('div', { class: 'quick-row' },
      h('a', { class: 'quick mix', href: '#/math/mix' }, h('span', { class: 'quick-emoji' }, '🎲'), h('span', {}, h('b', {}, 'Daily Mix'), h('small', {}, 'A smart mix of new and tricky skills'))),
      h('a', { class: 'quick gym', href: '#/math/gym' }, h('span', { class: 'quick-emoji' }, '🏋️'), h('span', {}, h('b', {}, 'Carry & Borrow Gym'), h('small', {}, 'Coach-guided column practice')))));

  for (const u of UNITS) {
    const list = SKILLS.filter(s => s.unit === u.id);
    const got = list.reduce((s, k) => s + (p.math.skills[k.id]?.stars || 0), 0);
    main.append(h('section', { class: 'unit' },
      h('h3', { class: 'unit-title' }, `${u.emoji} ${u.title}`, h('span', { class: 'unit-stars' }, `${got}/${list.length * 3} ★`)),
      h('div', { class: 'skill-grid' }, list.map(s => skillNode(s, p)))));
  }
}

function skillNode(s, p) {
  const open = isUnlocked(s, p);
  const r = p.math.skills[s.id];
  return h('button', { class: `skill ${open ? '' : 'locked'} ${r?.stars === 3 ? 'gold' : ''}`, onclick: () => skillSheet(s, open) },
    h('span', { class: 'skill-emoji' }, open ? s.emoji : '🔒'),
    h('span', { class: 'skill-title' }, s.title),
    stars(r?.stars || 0));
}

function skillSheet(s, open) {
  const r = profile().math.skills[s.id];
  const acc = recentAccuracy(r);
  const needs = s.requires.map(id => skillById(id).title).join(' and ');
  let close;
  const goTo = path => {
    close();
    location.hash = path;
  };
  close = modal(
    h('div', { class: 'sheet-emoji' }, s.emoji),
    h('h2', {}, s.title),
    h('p', { class: 'muted' }, s.desc),
    stars(r?.stars || 0),
    acc != null ? h('p', { class: 'muted small' }, `Recent accuracy: ${Math.round(acc * 100)}%`) : null,
    open
      ? h('div', { class: 'stack' },
        h('button', { class: 'btn big', onclick: () => goTo(`/math/play/practice/${s.id}`) }, '▶ Practice (10 questions)'),
        s.guided ? h('button', { class: 'btn alt', onclick: () => goTo(`/math/play/coach/${s.id}`) }, '🦉 Coach me step by step') : null)
      : h('div', { class: 'stack' },
        h('p', {}, `Unlock by earning 2 ★ in ${needs}.`),
        h('button', { class: 'btn alt', onclick: () => goTo(`/math/play/unlock/${s.id}`) }, '⚔️ Unlock challenge: 5 in a row')),
    h('button', { class: 'link-btn', onclick: () => close() }, 'Close'));
}

// ---------------- Sessions ----------------

const GYM = SKILLS.filter(s => s.gym);

function mixPicker(p) {
  const open = SKILLS.filter(s => isUnlocked(s, p));
  const weights = open.map(s => {
    const r = p.math.skills[s.id];
    if (!r || !r.attempts) return 4; // new frontier skill
    const acc = recentAccuracy(r) ?? 0.5;
    const days = (Date.now() - r.last) / 864e5;
    return 1 + (3 - r.stars) * 1.5 + (1 - acc) * 4 + Math.min(days, 7) * 0.3;
  });
  return () => {
    let x = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < open.length; i++) {
      x -= weights[i];
      if (x <= 0) return open[i];
    }
    return open[open.length - 1];
  };
}

export function viewPlay({ mode, skill: skillId }) {
  const p = profile();
  const skill = skillId ? skillById(skillId) : null;
  if (skillId && !skill) {
    location.hash = '/math';
    return;
  }
  const cfg = {
    practice: { length: 10, title: skill?.title, pickSkill: () => skill },
    coach: { length: 3, title: `Coach: ${skill?.title}`, pickSkill: () => skill, guided: true },
    unlock: { length: 5, title: `Unlock: ${skill?.title}`, pickSkill: () => skill },
    mix: { length: 12, title: 'Daily Mix', pickSkill: mixPicker(p) },
    gym: { length: 8, title: 'Carry & Borrow Gym', pickSkill: () => pick(GYM.filter(s => isUnlocked(s, p)).length >= 2 ? GYM.filter(s => isUnlocked(s, p)) : [skillById('add-2d-c'), skillById('sub-2d-b')]) },
  }[mode];
  if (!cfg) {
    location.hash = '/math';
    return;
  }

  const f = sessionFrame({ title: cfg.title, back: '#/math' });
  const starsBefore = skill ? rec(skill.id).stars : 0;
  let planned = cfg.length, answered = 0, correct = 0, combo = 0, coins = 0, xp = 0, requeues = 0;
  const queue = [];
  let onKey = null;

  const makeItem = (s, guided = false) => ({ skill: s, problem: s.gen(Math.random), guided });

  function next() {
    onKey = null;
    f.setProgress(answered, planned);
    if (answered >= planned) return finish();
    let item = queue.shift();
    if (!item) {
      const s = cfg.pickSkill();
      const guided = cfg.guided || (mode === 'gym' && answered < 2 && s.guided);
      item = makeItem(s, guided);
    }
    renderItem(item);
  }

  function renderItem(item) {
    const { problem: pr, skill: s } = item;
    const stage = f.stage;
    let advanced = false;
    const go = () => {
      if (advanced) return;
      advanced = true;
      next();
    };
    stage.replaceChildren();
    const tag = h('div', { class: 'q-tag' }, `${s.emoji} ${s.title}`);
    const card = h('div', { class: 'q-card card' }, tag);
    stage.append(card);

    if (item.guided && pr.kind === 'column' && s.guided) {
      runGuided(card, pr, ({ mistakes }) => {
        const ok = mistakes <= 1;
        settle(item, ok, null, true, card);
        const btn = h('button', { class: 'btn big', onclick: go }, 'Next ›');
        card.append(h('div', { class: 'row center' }, btn));
        btn.focus();
        onKey = e => e.key === 'Enter' && go();
      });
      return;
    }

    const fb = h('div', { class: 'feedback' });
    let getValue, focusFirst, lockInput, widget;
    if (pr.kind === 'column') {
      widget = columnWidget(pr, { onEnter: () => submit() });
      card.append(h('p', { class: 'q-hint' }, 'Type from right to left. Use the little boxes on top for carries and borrows.'), widget.el);
      getValue = () => widget.value();
      focusFirst = () => widget.focus();
      lockInput = () => widget.lock();
    } else if (pr.kind === 'choice') {
      card.append(h('div', { class: 'q-prompt', html: pr.prompt }));
      if (pr.visual) card.append(h('div', { class: 'viz-wrap', html: pr.visual }));
      const box = h('div', { class: `choices ${pr.choices.length <= 3 ? 'few' : ''}` });
      pr.choices.forEach((c, i) => {
        const b = h('button', { class: 'choice', onclick: () => submit(c, b) });
        if (pr.fracChoices && c.includes('/')) b.innerHTML = frac(...c.split('/'));
        else b.textContent = c;
        b.dataset.key = String(i + 1);
        box.append(b);
      });
      card.append(box);
      lockInput = () => box.querySelectorAll('button').forEach(b => (b.disabled = true));
      focusFirst = () => {};
      onKey = e => {
        const b = box.querySelector(`[data-key="${e.key}"]`);
        if (b && !b.disabled) b.click();
      };
    } else {
      card.append(h('div', { class: 'q-prompt', html: pr.kind === 'division' ? `<span class="big-num">${pr.prompt} = ?</span>` : pr.prompt }));
      if (pr.visual) card.append(h('div', { class: 'viz-wrap', html: pr.visual }));
      const mk = (label, cls = '') => {
        const i = h('input', { class: `answer-input ${cls}`, inputmode: pr.answerType === 'decimal' ? 'decimal' : 'numeric', autocomplete: 'off', 'aria-label': label });
        i.addEventListener('keydown', e => e.key === 'Enter' && submit());
        return i;
      };
      if (pr.kind === 'division') {
        const q = mk('quotient'), r = mk('remainder', 'small');
        card.append(h('div', { class: 'row center' }, q, h('span', { class: 'r-label' }, 'R'), r), h('p', { class: 'q-hint' }, 'R = remainder (leave it empty if nothing is left over)'));
        getValue = () => ({ q: q.value, r: r.value });
        focusFirst = () => q.focus();
        lockInput = () => [q, r].forEach(x => (x.disabled = true));
      } else if (pr.kind === 'fraction') {
        const n = mk('numerator', 'small'), d = mk('denominator', 'small');
        card.append(h('div', { class: 'frac-input' }, n, h('div', { class: 'frac-line' }), d));
        getValue = () => ({ n: n.value, d: d.value });
        focusFirst = () => n.focus();
        lockInput = () => [n, d].forEach(x => (x.disabled = true));
      } else {
        const i = mk('answer');
        card.append(h('div', { class: 'row center' }, i, pr.suffix ? h('span', { class: 'r-label' }, pr.suffix) : null));
        getValue = () => i.value;
        focusFirst = () => i.focus();
        lockInput = () => (i.disabled = true);
      }
    }
    const checkBtn = pr.kind === 'choice' ? null : h('button', { class: 'btn big', onclick: () => submit() }, 'Check ✓');
    if (checkBtn) card.append(h('div', { class: 'row center' }, checkBtn));
    card.append(fb);
    focusFirst();

    let done = false;
    function submit(choiceVal, choiceBtn) {
      if (done) return;
      const val = pr.kind === 'choice' ? choiceVal : getValue();
      const empty = val == null || (typeof val === 'string' && !val.trim()) || (typeof val === 'object' && !Object.values(val).some(v => String(v).trim()));
      if (empty) {
        fb.replaceChildren(h('p', { class: 'muted' }, val === null ? 'Fill in every digit (no gaps).' : 'Type your answer first.'));
        return;
      }
      done = true;
      lockInput();
      checkBtn?.remove();
      const ok = checkAnswer(pr, val);
      const diag = ok ? null : diagnose(pr, val);
      if (pr.kind === 'choice') {
        card.querySelectorAll('.choice').forEach((b, i) => {
          if (pr.choices[i] === pr.answer) b.classList.add('ok');
          else if (b === choiceBtn) b.classList.add('bad');
        });
      }
      settle(item, ok, diag, false, choiceBtn || card);
      if (ok) {
        fb.replaceChildren(h('div', { class: 'fb good' }, `✅ ${praise()}`));
        if (widget) widget.reveal();
        onKey = null;
        setTimeout(go, 1000);
        return;
      }
      if (widget) widget.reveal();
      const nextBtn = h('button', { class: 'btn big', onclick: go }, 'Got it ›');
      fb.replaceChildren(h('div', { class: 'fb bad' },
        h('p', { class: 'fb-title' }, `Not quite. The answer is ${answerText(pr)}.`),
        diag ? h('p', { class: 'fb-hint' }, `💡 ${diag.hint}`) : null,
        h('details', { class: 'how', open: true }, h('summary', {}, 'How to solve it'), h('ol', {}, pr.steps.map(st => h('li', {}, st)))),
        pr.visualAfter ? h('div', { class: 'viz-wrap', html: pr.visualAfter }) : null,
        h('div', { class: 'row center' }, nextBtn)));
      nextBtn.focus();
      onKey = e => e.key === 'Enter' && go();
    }
  }

  function settle(item, ok, diag, wasGuided, anchor) {
    answered++;
    const r = rec(item.skill.id);
    if (!wasGuided) record(r, ok, diag?.tag);
    save();
    if (ok) {
      correct++;
      combo++;
      const c = 1 + (combo % 5 === 0 ? 2 : 0);
      coins += c;
      xp += 2;
      award({ coins: c, xp: 2 });
      cheer(anchor, c, combo);
    } else {
      combo = 0;
      sfx.wrong();
      if (mode !== 'unlock' && requeues < 3) {
        requeues++;
        planned++;
        queue.push(makeItem(item.skill, !!diag && item.skill.guided));
      }
    }
    recordAnswer(ok, combo);
    f.setCombo(combo);
    f.setProgress(answered, planned);
    if (mode === 'unlock' && !ok) planned = answered; // challenge ends on the first miss
  }

  function finish() {
    const extra = [];
    if (mode === 'unlock') {
      if (correct === cfg.length) {
        rec(skill.id).unlocked = true;
        save();
        toast(`${skill.title} unlocked!`, '🔓');
        extra.push(h('p', { class: 'big-msg' }, '🔓 Skill unlocked! You are ready for it.'));
      } else {
        extra.push(h('p', { class: 'big-msg' }, 'Almost! Keep practicing the earlier skills and try again.'));
      }
    }
    const res = finishSession({ subject: 'math', correct, total: answered });
    if (skill && mode === 'practice') {
      const after = rec(skill.id).stars;
      if (after > starsBefore) extra.push(h('div', { class: 'star-up' }, h('p', {}, after >= 2 && starsBefore < 2 ? 'New star! Next skill unlocked!' : 'You earned a new star!'), stars(after)));
    }
    resultsView(f.stage, {
      correct, total: answered, coins: coins + res.bonusCoins, xp: xp + res.bonusXp, perfect: res.perfect, unlocked: res.unlocked, extra,
      again: () => rerender(), backHref: '#/math', backLabel: 'Skill map',
    });
  }

  const keyHandler = e => {
    if (!onKey || e.target instanceof HTMLInputElement) return;
    if (e.key === 'Enter' && e.target instanceof HTMLButtonElement) return; // native click handles it
    onKey(e);
  };
  document.addEventListener('keydown', keyHandler);
  next();
  return () => document.removeEventListener('keydown', keyHandler);
}
