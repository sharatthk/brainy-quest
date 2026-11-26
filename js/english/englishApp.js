// Word Wizard: English lessons, quizzes and mistake review.
import { h, onEnter } from '../ui.js';
import { screen, stars, sessionFrame, resultsView, cheer, praise, tierList, starText } from '../views/common.js';
import { profile, save } from '../store.js';
import { ENGLISH_SECTIONS, ENGLISH_UNITS, unitById, cleanWord, normalizeText } from './content.js';
import { newCard, grade, isDue, currentTier } from '../shared/mastery.js';
import { ENGLISH_TIERS, quizItems, needFor, passedQuiz } from './tiers.js';
import { award, recordAnswer, finishSession } from '../shared/rewards.js';
import { sfx } from '../shared/sound.js';
import { speak, speechSupported, stopSpeaking } from '../shared/speech.js';
import { shuffle } from '../shared/util.js';
import { render as rerender } from '../router.js';

const unitRec = id => (profile().english.units[id] ||= { stars: 0, best: 0, attempts: 0, lessonSeen: false });

function dueReviews(p) {
  const now = Date.now();
  return Object.entries(p.english.review)
    .filter(([, c]) => isDue(c, now) && c.box < 3)
    .map(([key]) => {
      const [uid, idx] = key.split('#');
      const u = unitById(uid);
      return u && u.questions[+idx] ? { unit: u, idx: +idx, key } : null;
    })
    .filter(Boolean);
}

export function viewEnglishHome() {
  const p = profile();
  const reviews = dueReviews(p);
  const passed = ENGLISH_UNITS.filter(u => (p.english.units[u.id]?.stars || 0) > 0).length;
  const nextUp = ENGLISH_UNITS.find(u => !(p.english.units[u.id]?.stars >= 2));
  const main = screen({ title: 'Word Wizard', back: '#/' });
  main.append(
    h('div', { class: 'quest-head' }, h('div', {}, h('h2', {}, 'Learn, then quiz yourself'), h('p', { class: 'muted' }, `${passed} of ${ENGLISH_UNITS.length} units passed. Each unit has ★ Warm-up, ★★ Quiz and ★★★ Expert.`))),
    h('div', { class: 'quick-row' },
      nextUp ? h('a', { class: 'quick mix', href: `#/english/unit/${nextUp.id}` }, h('span', { class: 'quick-emoji' }, nextUp.emoji), h('span', {}, h('b', {}, 'Next up'), h('small', {}, nextUp.title))) : null,
      h('a', { class: `quick gym ${reviews.length ? '' : 'dim'}`, href: reviews.length ? '#/english/review' : null, 'aria-disabled': reviews.length ? null : 'true' },
        h('span', { class: 'quick-emoji' }, '🔁'), h('span', {}, h('b', {}, `Fix my mistakes (${reviews.length})`), h('small', {}, reviews.length ? 'Questions you missed, ready for another try' : 'Nothing to review right now')))));
  for (const sec of ENGLISH_SECTIONS) {
    const units = ENGLISH_UNITS.filter(u => u.section === sec.id);
    main.append(h('section', { class: 'unit' },
      h('h3', { class: 'unit-title' }, `${sec.emoji} ${sec.title}`),
      h('div', { class: 'skill-grid' }, units.map(u => {
        const r = p.english.units[u.id];
        return h('a', { class: `skill eng ${r?.stars === 3 ? 'gold' : ''}`, href: `#/english/unit/${u.id}` },
          h('span', { class: 'skill-emoji' }, u.emoji), h('span', { class: 'skill-title' }, u.title), stars(r?.stars || 0));
      }))));
  }
}

export function viewLesson({ id }) {
  const u = unitById(id);
  if (!u) {
    location.hash = '/english';
    return;
  }
  let i = 0;
  const main = screen({ title: u.title, back: '#/english' });
  const body = h('div', { class: 'lesson card' });
  main.append(body);
  const last = u.lessons.length - 1;
  const show = () => {
    const l = u.lessons[i];
    const content = h('div', { class: 'lesson-body', html: l.body });
    const p = profile(), r = p.english.units[u.id];
    const startQuiz = tier => {
      unitRec(u.id).lessonSeen = true;
      save();
      stopSpeaking();
      location.hash = `/english/quiz/${u.id}/${tier}`;
    };
    body.replaceChildren(
      h('div', { class: 'lesson-top' }, h('span', { class: 'lesson-count' }, `${u.emoji} Card ${i + 1} of ${u.lessons.length}`),
        r?.lessonSeen && i < last ? h('button', { class: 'link-btn', onclick: () => { i = last; stopSpeaking(); show(); } }, 'Skip to quiz ›') : null,
        speechSupported() ? h('button', { class: 'icon-btn', title: 'Read aloud', 'aria-label': 'Read aloud', onclick: () => speak(`${l.title}. ${content.innerText}`, { rate: 0.95 }) }, '🔊') : null),
      h('h2', {}, l.title), content,
      h('div', { class: 'row spread' },
        h('button', { class: 'btn alt', disabled: i === 0, onclick: () => { i--; stopSpeaking(); show(); } }, '‹ Back'),
        i < last ? h('button', { class: 'btn', onclick: () => { i++; stopSpeaking(); show(); } }, 'Next ›') : null),
      i === last ? h('div', { class: 'stack quiz-pick' }, h('h3', {}, '🎯 Pick your quiz'),
        tierList({ tiers: ENGLISH_TIERS, got: r?.stars || 0, onPick: startQuiz })) : null);
  };
  show();
  return stopSpeaking;
}

export function viewQuiz({ id, tier: tierParam }) {
  const u = unitById(id);
  if (!u) {
    location.hash = '/english';
    return;
  }
  const p = profile();
  const tier = Math.min(3, Math.max(1, Number(tierParam) || currentTier(p.english.units[u.id]?.stars)));
  const items = quizItems(u, tier).map(it => ({ ...it, unit: u, key: `${u.id}#${it.idx}` }));
  return runQuiz({ title: `${ENGLISH_TIERS[tier - 1].name} ${starText(tier)}: ${u.title}`, back: `#/english/unit/${u.id}`, items, unit: u, tier });
}

export function viewReview() {
  const items = shuffle(dueReviews(profile())).slice(0, 10);
  if (!items.length) {
    location.hash = '/english';
    return;
  }
  return runQuiz({ title: 'Fix my mistakes', back: '#/english', items, review: true });
}

function runQuiz({ title, back, items, unit, tier, review = false }) {
  const f = sessionFrame({ title, back });
  let i = 0, correct = 0, combo = 0, coins = 0, xp = 0;
  let onKey = null;

  function next() {
    onKey = null;
    f.setProgress(i, items.length);
    if (i >= items.length) return finish();
    ask(items[i]);
  }

  function ask(item) {
    const q = item.unit.questions[item.idx];
    const card = h('div', { class: 'q-card card' }, h('div', { class: 'q-tag' }, `${item.unit.emoji} ${item.unit.title}`));
    f.stage.replaceChildren(card);
    if (q.p) card.append(h('blockquote', { class: 'passage' }, q.p));
    card.append(h('p', { class: 'q-prompt' }, q.q));
    const fb = h('div', { class: 'feedback' });
    let advanced = false;
    const go = () => {
      if (advanced) return;
      advanced = true;
      i++;
      next();
    };
    let answered = false;
    const done = (ok, anchor) => {
      answered = true;
      settle(item, ok, anchor);
      if (ok) {
        fb.replaceChildren(h('div', { class: 'fb good' }, `✅ ${praise()}`, q.e ? h('p', { class: 'fb-hint' }, q.e) : null));
        setTimeout(go, 1500);
      } else {
        const btn = h('button', { class: 'btn big', onclick: go }, 'Got it ›');
        fb.replaceChildren(h('div', { class: 'fb bad' }, h('p', { class: 'fb-title' }, `The answer: ${Array.isArray(q.a) ? q.a.join(', ') : q.a}`), q.e ? h('p', { class: 'fb-hint' }, `💡 ${q.e}`) : null, h('div', { class: 'row center' }, btn)));
        btn.focus();
        onKey = e => e.key === 'Enter' && go();
      }
    };

    if (q.t === 'mc') {
      const opts = item.choices || shuffle(q.c);
      const box = h('div', { class: `choices ${opts.length <= 3 ? 'few' : ''} ${opts.some(c => c.length > 22) ? 'wide' : ''}` });
      opts.forEach((c, k) => {
        const b = h('button', { class: 'choice', 'data-key': String(k + 1) }, c);
        b.addEventListener('click', () => {
          if (answered) return;
          box.querySelectorAll('button').forEach(x => {
            x.disabled = true;
            if (x.textContent === q.a) x.classList.add('ok');
          });
          const ok = c === q.a;
          if (!ok) b.classList.add('bad');
          done(ok, b);
        });
        box.append(b);
      });
      card.append(box);
      onKey = e => box.querySelector(`[data-key="${e.key}"]:not([disabled])`)?.click();
    } else if (q.t === 'tap') {
      const want = new Set(q.a.map(w => cleanWord(w).toLowerCase()));
      const words = q.s.split(/\s+/);
      const sentence = h('div', { class: 'tap-sentence' }, words.map(w => h('button', { class: 'tap-word', onclick: e => !answered && e.currentTarget.classList.toggle('picked') }, w)));
      const check = h('button', { class: 'btn big', onclick: () => {
        if (answered) return;
        const btns = [...sentence.children];
        if (!btns.some(b => b.classList.contains('picked'))) {
          fb.replaceChildren(h('p', { class: 'muted' }, 'Tap one or more words first.'));
          return;
        }
        let ok = true;
        btns.forEach(b => {
          const isAns = want.has(cleanWord(b.textContent).toLowerCase());
          const picked = b.classList.contains('picked');
          if (isAns !== picked) ok = false;
          b.classList.add(isAns ? (picked ? 'ok' : 'missed') : picked ? 'bad' : 'plain');
          b.disabled = true;
        });
        check.remove();
        done(ok, sentence);
      } }, 'Check ✓');
      card.append(h('p', { class: 'q-hint' }, item.hint || 'Tap the words, then press Check.'), sentence, h('div', { class: 'row center' }, check));
    } else {
      const parts = q.s.split('___');
      const inp = h('input', { class: 'answer-input text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'your answer' });
      const check = () => {
        if (answered || !inp.value.trim()) return;
        inp.disabled = true;
        const ok = q.a.some(a => normalizeText(a) === normalizeText(inp.value));
        inp.classList.add(ok ? 'ok' : 'bad');
        checkBtn.remove();
        done(ok, inp);
      };
      onEnter(inp, check);
      const checkBtn = h('button', { class: 'btn big', onclick: check }, 'Check ✓');
      card.append(item.hint ? h('p', { class: 'q-hint' }, `💡 ${item.hint}`) : null, h('p', { class: 'fill-sentence' }, parts[0], inp, parts[1] || ''), h('div', { class: 'row center' }, checkBtn));
      inp.focus();
    }
    card.append(fb);
  }

  function settle(item, ok, anchor) {
    const p = profile();
    const card = p.english.review[item.key];
    if (!ok) {
      p.english.review[item.key] = grade(card || newCard(), false);
    } else if (card) {
      grade(card, true);
      if (card.box >= 3) delete p.english.review[item.key];
    }
    save();
    if (ok) {
      correct++;
      combo++;
      const c = 1 + (combo % 5 === 0 ? 2 : 0);
      coins += c;
      xp += 3;
      award({ coins: c, xp: 3 });
      cheer(anchor, c, combo);
    } else {
      combo = 0;
      sfx.wrong();
    }
    recordAnswer(ok, combo);
    f.setCombo(combo);
    f.react(ok, combo);
  }

  function finish() {
    const extra = [];
    if (unit) {
      const r = unitRec(unit.id);
      const before = r.stars;
      const total = items.length;
      r.attempts++;
      r.best = Math.max(r.best, correct / total);
      if (passedQuiz(tier, correct, total)) {
        r.stars = Math.max(r.stars, tier);
        const fresh = r.stars > before;
        if (fresh) sfx.levelUp();
        extra.push(h('div', { class: 'star-up' }, h('p', {}, fresh ? `${starText(tier)} earned!` : `You passed ${starText(tier)} again!`), stars(r.stars),
          tier < 3 ? h('a', { class: 'btn alt', href: `#/english/quiz/${unit.id}/${tier + 1}` }, `Try ${starText(tier + 1)} ${ENGLISH_TIERS[tier].name} ›`) : null));
      } else {
        extra.push(h('div', { class: 'star-up miss' }, h('p', {}, `Get ${needFor(tier, total)} of ${total} right to earn ${starText(tier)}. You got ${correct}.`), stars(r.stars)));
      }
      save();
    }
    const res = finishSession({ subject: 'english', correct, total: items.length });
    resultsView(f.stage, {
      correct, total: items.length, coins: coins + res.bonusCoins, xp: xp + res.bonusXp, perfect: res.perfect, unlocked: res.unlocked, extra,
      again: () => rerender(), backHref: '#/english', backLabel: 'All units',
    });
  }

  const keyHandler = e => {
    if (!onKey || e.target instanceof HTMLInputElement) return;
    if (e.key === 'Enter' && e.target instanceof HTMLButtonElement) return;
    onKey(e);
  };
  document.addEventListener('keydown', keyHandler);
  next();
  return () => document.removeEventListener('keydown', keyHandler);
}
