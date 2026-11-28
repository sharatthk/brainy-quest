// Math Quest: skill map and practice sessions.
import { h, modal, toast, advanceDelay } from '../ui.js';
import { screen, stars, sessionFrame, resultsView, cheer, praise, tierList, TIER_NAMES, starText } from '../views/common.js';
import { profile, save } from '../store.js';
import { SKILLS, UNITS, skillById, isReached, suggestedSkill, gapSkills, diagnose, checkAnswer, answerText } from './skills.js';
import { GRADES, gradeName, playerGrade, belowGrade } from './grades.js';
import { emptyRec, record, recentAccuracy, currentTier, passed, needToPass } from '../shared/mastery.js';
import { buildQuestion, isEmptyAnswer } from './question.js';
import { genAt, tiersOf, tierLabel } from './tiers.js';
import { runGuided } from './guided.js';
import { runWalk } from './walk.js';
import { award, recordAnswer, finishSession, starUp } from '../shared/rewards.js';
import { sfx } from '../shared/sound.js';
import { render as rerender } from '../router.js';
import { pick, seeded } from '../shared/util.js';
import { workedExamples, givenText } from './examples.js';

const rec = id => (profile().math.skills[id] ||= emptyRec());

// ---------------- Map ----------------

export function viewMap() {
  const p = profile();
  const totalStars = SKILLS.reduce((s, k) => s + (p.math.skills[k.id]?.stars || 0), 0);
  const main = screen({ title: 'Math Quest', back: '#/' });
  main.append(
    h('div', { class: 'quest-head' },
      h('div', {}, h('h2', {}, 'Pick your challenge'), h('p', { class: 'muted' }, `${totalStars} of ${SKILLS.length * 3} stars collected. Start anywhere: ✨ marks the suggested next skill.`)),
      gradePicker(p)),
    h('div', { class: 'quick-row' },
      h('a', { class: 'quick mix', href: '#/math/mix' }, h('span', { class: 'quick-emoji' }, '🎲'), h('span', {}, h('b', {}, 'Daily Mix'), h('small', {}, 'A smart mix of new and tricky skills'))),
      h('a', { class: 'quick gym', href: '#/math/gym' }, h('span', { class: 'quick-emoji' }, '🏋️'), h('span', {}, h('b', {}, 'Carry & Borrow Gym'), h('small', {}, 'Coach-guided column practice'))),
      h('a', { class: 'quick speed', href: '#/math/speed' }, h('span', { class: 'quick-emoji' }, '⏱️'), h('span', {}, h('b', {}, 'Speed Challenge'), h('small', {}, 'Race the clock for big points')))));

  for (const u of UNITS) {
    const list = SKILLS.filter(s => s.unit === u.id);
    const got = list.reduce((s, k) => s + (p.math.skills[k.id]?.stars || 0), 0);
    // Suggested next: the first skill on the path that doesn't have ★★ yet.
    const next = suggestedSkill(list, p);
    main.append(h('section', { class: 'unit' },
      h('h3', { class: 'unit-title' }, `${u.emoji} ${u.title}`, h('span', { class: 'unit-stars' }, `${got}/${list.length * 3} ★`)),
      h('div', { class: 'skill-grid' }, list.map(s => skillNode(s, p, s === next)))));
  }
}

// "My grade": moves the suggested starting skills, Daily Mix and quests to the player's school grade.
export function gradePicker(p, onChange = () => rerender()) {
  const sel = h('select', { 'aria-label': 'My grade', onchange: e => {
    p.settings.grade = Number(e.target.value);
    save();
    onChange();
  } }, [0, ...GRADES].map(g => h('option', { value: g, selected: g === playerGrade(p) ? true : null }, g ? gradeName(g) : 'Pick a grade')));
  return h('label', { class: 'grade-pick' }, h('span', {}, '🎒 My grade'), sel);
}

function skillNode(s, p, suggested) {
  const r = p.math.skills[s.id];
  return h('button', { class: `skill ${suggested ? 'suggested' : ''} ${r?.stars === 3 ? 'gold' : ''}`, onclick: () => skillSheet(s) },
    suggested ? h('span', { class: 'next-badge' }, '✨ Next') : null,
    h('span', { class: 'skill-emoji' }, s.emoji),
    h('span', { class: 'skill-title' }, s.title),
    stars(r?.stars || 0));
}

function skillSheet(s) {
  const r = profile().math.skills[s.id];
  const acc = recentAccuracy(r);
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
    h('div', { class: 'stack' },
        tierList({ tiers: tiersOf(s), got, onPick: tier => goTo(`/math/play/practice/${s.id}/${tier}`) }),
        h('p', { class: 'muted small' }, `Get ${needToPass(10)} of 10 right on the first try to earn a star.`),
        s.guided ? h('button', { class: 'btn alt', onclick: () => goTo(`/math/play/coach/${s.id}`) }, '🦉 Coach me step by step') : null),
    h('button', { class: 'link-btn', onclick: () => close() }, 'Close'));
}

// ---------------- Sessions ----------------

const GYM = SKILLS.filter(s => s.gym);

function mixPicker(p) {
  // Untouched skills far below the player's grade stay out of the mix (practiced ones still come back for review).
  const reached = SKILLS.filter(s => isReached(s, p));
  const open = reached.filter(s => !belowGrade(s, p) || p.math.skills[s.id]?.attempts);
  if (!open.length) open.push(...reached);
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
  const tier = !skill ? null : Math.min(3, Math.max(1, Number(tierParam) || currentTier(rec(skill.id).stars)));
  if (skillId && !skill) {
    location.hash = '/math';
    return;
  }
  const cfg = {
    practice: { length: 10, title: `${skill?.title} ${starText(tier)}`, pickSkill: () => skill },
    coach: { length: 3, title: `Coach: ${skill?.title}`, pickSkill: () => skill, guided: true },
    mix: { length: 12, title: 'Daily Mix', pickSkill: mixPicker(p) },
    gaps: { length: 10, title: 'Practice the gaps', pickSkill: () => pick(gapSkills(p).slice(0, 6)) },
    gym: { length: 8, title: 'Carry & Borrow Gym', pickSkill: () => pick(GYM.filter(s => isReached(s, p)).length >= 2 ? GYM.filter(s => isReached(s, p)) : [skillById('add-2d-c'), skillById('sub-2d-b')]) },
  }[mode];
  if (!cfg || (mode === 'gaps' && !gapSkills(p).length)) {
    location.hash = '/math';
    return;
  }

  const f = sessionFrame({ title: cfg.title, back: '#/math' });
  const starsBefore = skill ? rec(skill.id).stars : 0;
  let planned = cfg.length, answered = 0, correct = 0, firstTry = 0, combo = 0, coins = 0, xp = 0, requeues = 0;
  const misses = {}; // skill id -> misses this session
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
    const body = h('div', { class: 'q-body' });
    card.append(body);
    const qn = buildQuestion(body, pr, { onSubmit: submit });
    card.append(fb);
    if (item.walk && pr.kind !== 'column') {
      // Second miss on this skill: work through the steps first, then answer the whole problem.
      body.classList.add('walking');
      const holder = h('div', { class: 'walk-holder' });
      body.insertBefore(holder, [...body.children].find(el => !el.matches('.q-prompt, .viz-wrap')) || null);
      runWalk(holder, pr, () => {
        body.classList.remove('walking');
        holder.append(h('p', { class: 'walk-now' }, '✨ Now you try the whole problem.'));
        qn.focus();
        onKey = qn.onKey;
      });
    } else {
      qn.focus();
      onKey = qn.onKey;
    }

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
        setTimeout(go, advanceDelay(1000));
        return;
      }
      const nextBtn = h('button', { class: 'btn big', onclick: go }, 'Got it ›');
      fb.replaceChildren(h('div', { class: 'fb bad' },
        h('p', { class: 'fb-title' }, `Not quite. The answer is ${answerText(pr)}.`),
        h('p', { class: 'fb-given' }, `You answered ${givenText(pr, val)}. Let's see how to get ${answerText(pr)}.`),
        diag ? h('p', { class: 'fb-hint' }, `💡 ${diag.hint}`) : null,
        h('details', { class: 'how', open: true }, h('summary', {}, 'How to solve it'), h('ol', {}, pr.steps.map(st => h('li', {}, st)))),
        pr.visualAfter ? h('div', { class: 'viz-wrap', html: pr.visualAfter }) : null,
        examplesBlock(item, pr),
        h('div', { class: 'row center' }, nextBtn)));
      nextBtn.focus();
      onKey = e => e.key === 'Enter' && go();
    }
  }

  // Two more problems of the same skill and tier, solved step by step.
  function examplesBlock(item, pr) {
    const exs = workedExamples(item.skill, item.tier, pr, seeded((Date.now() + answered * 7919) >>> 0));
    if (!exs.length) return null;
    return h('div', { class: 'worked' },
      h('p', { class: 'ex-title' }, `👀 ${exs.length === 1 ? 'One more example' : `${exs.length} more examples`} like this one`),
      exs.map((ex, i) => h('div', { class: 'worked-ex' },
        h('p', { class: 'ex-label' }, `Example ${i + 1}`),
        h('div', { class: 'ex-prompt', html: ex.html }),
        ex.problem.visual ? h('div', { class: 'viz-wrap small', html: ex.problem.visual }) : null,
        ex.problem.kind === 'choice' ? h('p', { class: 'ex-choices' }, ex.problem.choices.map(c => h('span', { class: `ex-chip ${c === ex.problem.answer ? 'ok' : ''}` }, c))) : null,
        ex.filled && ex.problem.kind !== 'choice' ? null : h('p', { class: 'ex-answer' }, 'Answer: ', h('b', {}, ex.answer)),
        h('ol', { class: 'ex-steps' }, ex.steps.map(st => h('li', {}, st))))));
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
      if (requeues < 3) {
        requeues++;
        planned++;
        // A known slip on a column skill gets Coach mode; a second miss on any skill gets the walk-through.
        const twice = (misses[item.skill.id] = (misses[item.skill.id] || 0) + 1) >= 2;
        const retry = makeItem(item.skill, (!!diag || twice) && !!item.skill.guided, item.tier, true);
        retry.walk = twice && !item.skill.guided;
        queue.push(retry);
      }
    }
    recordAnswer(ok, combo);
    f.setCombo(combo);
    f.react(ok, combo);
    f.setProgress(answered, planned);
  }

  function finish() {
    const extra = [];
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
    starUp('math', skill.id, starsBefore, r.stars);
    const fresh = r.stars > starsBefore;
    const msg = !fresh ? `You passed ${starText(tier)} again!`
      : tier === 2 && starsBefore < 2 ? `${starText(tier)} earned! You're ready for the next skill.`
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
