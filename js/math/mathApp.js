// Math Quest: skill map and practice sessions.
import { h, modal, toast } from '../ui.js';
import { screen, stars, sessionFrame, resultsView, cheer, praise, tierList, TIER_NAMES, starText } from '../views/common.js';
import { profile, save } from '../store.js';
import { SKILLS, UNITS, skillById, isUnlocked, diagnose, checkAnswer, answerText } from './skills.js';
import { emptyRec, record, recentAccuracy, currentTier, passed, needToPass } from '../shared/mastery.js';
import { buildQuestion, isEmptyAnswer } from './question.js';
import { genAt, tiersOf, tierLabel } from './tiers.js';
import { runGuided } from './guided.js';
import { award, recordAnswer, finishSession } from '../shared/rewards.js';
import { sfx } from '../shared/sound.js';
import { render as rerender } from '../router.js';
import { pick } from '../shared/util.js';

const rec = id => (profile().math.skills[id] ||= emptyRec());
// Highest tier the player may play: the next one to earn, or all three when a grown-up unlocked everything.
const topTier = (p, s) => (p.settings.unlockAll ? 3 : currentTier(rec(s.id).stars));

// ---------------- Map ----------------

export function viewMap() {
  const p = profile();
  const totalStars = SKILLS.reduce((s, k) => s + (p.math.skills[k.id]?.stars || 0), 0);
  const main = screen({ title: 'Math Quest', back: '#/' });
  main.append(
    h('div', { class: 'quest-head' },
      h('div', {}, h('h2', {}, 'Pick your challenge'), h('p', { class: 'muted' }, `${totalStars} of ${SKILLS.length * 3} stars collected. Pass ★★ to unlock the next skill.`))),
    h('div', { class: 'quick-row' },
      h('a', { class: 'quick mix', href: '#/math/mix' }, h('span', { class: 'quick-emoji' }, '🎲'), h('span', {}, h('b', {}, 'Daily Mix'), h('small', {}, 'A smart mix of new and tricky skills'))),
      h('a', { class: 'quick gym', href: '#/math/gym' }, h('span', { class: 'quick-emoji' }, '🏋️'), h('span', {}, h('b', {}, 'Carry & Borrow Gym'), h('small', {}, 'Coach-guided column practice'))),
      h('a', { class: 'quick speed', href: '#/math/speed' }, h('span', { class: 'quick-emoji' }, '⏱️'), h('span', {}, h('b', {}, 'Speed Challenge'), h('small', {}, 'Race the clock for big points')))));

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
  const got = r?.stars || 0;
  let close;
  const goTo = path => {
    close();
    location.hash = path;
  };
  close = modal(
    h('div', { class: 'sheet-emoji' }, s.emoji),
    h('h2', {}, s.title),
    h('p', { class: 'muted' }, s.desc),
    stars(got),
    acc != null ? h('p', { class: 'muted small' }, `Recent accuracy: ${Math.round(acc * 100)}%`) : null,
    open
      ? h('div', { class: 'stack' },
        tierList({ tiers: tiersOf(s), got, top: topTier(profile(), s), onPick: tier => goTo(`/math/play/practice/${s.id}/${tier}`) }),
        h('p', { class: 'muted small' }, `Get ${needToPass(10)} of 10 right to earn a star and open the next one.`),
        s.guided ? h('button', { class: 'btn alt', onclick: () => goTo(`/math/play/coach/${s.id}`) }, '🦉 Coach me step by step') : null)
      : h('div', { class: 'stack' },
        h('p', {}, `Unlock by earning ★★ in ${needs}.`),
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
    return 1 + (3 - (r.stars || 0)) * 1.5 + (1 - acc) * 4 + Math.min(days, 7) * 0.3;
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

export function viewPlay({ mode, skill: skillId, tier: tierParam }) {
  const p = profile();
  const skill = skillId ? skillById(skillId) : null;
  // Practice plays one star tier (the next one to earn unless the URL picks an open one); the unlock challenge uses ★★.
  const tier = !skill ? null : mode === 'unlock' ? 2
    : Math.min(topTier(p, skill), Math.max(1, Number(tierParam) || currentTier(rec(skill.id).stars)));
  if (skillId && !skill) {
    location.hash = '/math';
    return;
  }
  const cfg = {
    practice: { length: 10, title: `${skill?.title} ${starText(tier)}`, pickSkill: () => skill },
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
  let planned = cfg.length, answered = 0, correct = 0, firstTry = 0, combo = 0, coins = 0, xp = 0, requeues = 0;
  const queue = [];
  let onKey = null;

  // Each problem comes from a star tier: the session's tier, or (Mix, Gym, Coach) the tier the player is working on.
  const makeItem = (s, guided = false, t = tier ?? currentTier(rec(s.id).stars), retry = false) =>
    ({ skill: s, tier: t, problem: genAt(s, t), guided, retry });

  function next() {
    onKey = null;
    f.setProgress(answered, planned);
    if (answered >= planned) return finish();
    let item = queue.shift();
    if (!item) {
      const s = cfg.pickSkill();
      item = makeItem(s, !!cfg.guided);
      if (mode === 'gym' && answered < 2 && item.skill.guided) item.guided = true;
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
    const tag = h('div', { class: 'q-tag' }, `${s.emoji} ${mode === 'practice' ? tierLabel(s, item.tier) : s.title}`,
      h('span', { class: 'tier-chip', title: `${TIER_NAMES[item.tier - 1]}: ${tierLabel(s, item.tier)}` }, starText(item.tier)));
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
    let done = false;
    const qn = buildQuestion(card, pr, { onSubmit: submit });
    card.append(fb);
    qn.focus();
    onKey = qn.onKey;

    function submit(val, choiceBtn) {
      if (done) return;
      if (isEmptyAnswer(val)) {
        fb.replaceChildren(h('p', { class: 'muted' }, 'Type your answer first.'));
        return;
      }
      done = true;
      qn.lock();
      qn.checkBtn?.remove();
      const ok = checkAnswer(pr, val);
      const diag = ok ? null : diagnose(pr, val);
      qn.reveal(choiceBtn);
      settle(item, ok, diag, false, choiceBtn || card);
      if (ok) {
        fb.replaceChildren(h('div', { class: 'fb good' }, `✅ ${praise()}`));
        onKey = null;
        setTimeout(go, 1000);
        return;
      }
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
      if (!item.retry) firstTry++;
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
        queue.push(makeItem(item.skill, !!diag && item.skill.guided, item.tier, true));
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
    if (skill && mode === 'practice') extra.push(tierResult());
    resultsView(f.stage, {
      correct, total: answered, coins: coins + res.bonusCoins, xp: xp + res.bonusXp, perfect: res.perfect, unlocked: res.unlocked, extra,
      again: () => rerender(), backHref: '#/math', backLabel: 'Skill map',
    });
  }

  // Star tier outcome: first-try answers count, so a retried miss doesn't turn into a pass.
  function tierResult() {
    const r = rec(skill.id), need = needToPass(cfg.length);
    if (!passed(firstTry, cfg.length)) {
      return h('div', { class: 'star-up miss' }, h('p', {}, `Get ${need} of ${cfg.length} right on the first try to earn ${starText(tier)}. You got ${firstTry}.`), stars(r.stars));
    }
    r.stars = Math.max(r.stars || 0, tier);
    save();
    const fresh = r.stars > starsBefore;
    const msg = !fresh ? `You passed ${starText(tier)} again!`
      : tier === 2 && starsBefore < 2 ? `${starText(tier)} earned! Next skill unlocked!`
        : `${starText(tier)} earned!`;
    if (fresh) sfx.levelUp();
    return h('div', { class: 'star-up' }, h('p', {}, msg), stars(r.stars),
      tier < 3 ? h('a', { class: 'btn alt', href: `#/math/play/practice/${skill.id}/${tier + 1}` }, `Try ${starText(tier + 1)} ${TIER_NAMES[tier]} ›`) : null);
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
