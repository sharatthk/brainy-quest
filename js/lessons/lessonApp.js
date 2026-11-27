// Lesson subjects (English, Science, Coding): lesson cards, star-tier quizzes and mistake review.
// One engine for every subject in js/lessons/subjects.js; each keeps its progress in p[subject.id].
import { h, onEnter } from '../ui.js';
import { screen, stars, sessionFrame, resultsView, cheer, praise, tierList, starText } from '../views/common.js';
import { profile, save } from '../store.js';
import { cleanWord, normalizeText } from '../english/content.js';
import { newCard, grade, isDue, currentTier } from '../shared/mastery.js';
import { LESSON_TIERS, quizItems, needFor, passedQuiz } from './tiers.js';
import { award, recordAnswer, finishSession } from '../shared/rewards.js';
import { sfx } from '../shared/sound.js';
import { speak, speechSupported, stopSpeaking } from '../shared/speech.js';
import { shuffle } from '../shared/util.js';
import { render as rerender } from '../router.js';

// Progress for one subject; older profiles and other devices may not have it yet.
export const book = (p, subj) => (p[subj.id] ||= { units: {}, review: {} });

export function lessonViews(subj) {
  const base = `/${subj.id}`;
  const unitById = id => subj.units.find(u => u.id === id);
  const unitRec = id => (book(profile(), subj).units[id] ||= { stars: 0, best: 0, attempts: 0, lessonSeen: false });

  function dueReviews(p) {
    const now = Date.now();
    return Object.entries(book(p, subj).review)
      .filter(([, c]) => isDue(c, now) && c.box < 3)
      .map(([key]) => {
        const [uid, idx] = key.split('#');
        const u = unitById(uid);
        return u && u.questions[+idx] ? { unit: u, idx: +idx, key } : null;
      })
      .filter(Boolean);
  }

  function viewHome() {
    const p = profile();
    const units = book(p, subj).units;
    const reviews = dueReviews(p);
    const passed = subj.units.filter(u => (units[u.id]?.stars || 0) > 0).length;
    const nextUp = subj.units.find(u => !(units[u.id]?.stars >= 2));
    const main = screen({ title: subj.title, back: '#/' });
    main.append(
      h('div', { class: 'quest-head' }, h('div', {}, h('h2', {}, 'Learn, then quiz yourself'), h('p', { class: 'muted' }, `${passed} of ${subj.units.length} units passed. Each unit has ★ Warm-up, ★★ Quiz and ★★★ Expert.`))),
      h('div', { class: 'quick-row' },
        nextUp ? h('a', { class: 'quick mix', href: `#${base}/unit/${nextUp.id}` }, h('span', { class: 'quick-emoji' }, nextUp.emoji), h('span', {}, h('b', {}, 'Next up'), h('small', {}, nextUp.title))) : null,
        h('a', { class: `quick gym ${reviews.length ? '' : 'dim'}`, href: reviews.length ? `#${base}/review` : null, 'aria-disabled': reviews.length ? null : 'true' },
          h('span', { class: 'quick-emoji' }, '🔁'), h('span', {}, h('b', {}, `Fix my mistakes (${reviews.length})`), h('small', {}, reviews.length ? 'Questions you missed, ready for another try' : 'Nothing to review right now')))));
    for (const sec of subj.sections) {
      const list = subj.units.filter(u => u.section === sec.id);
      if (!list.length) continue;
      main.append(h('section', { class: 'unit' },
        h('h3', { class: 'unit-title' }, `${sec.emoji} ${sec.title}`),
        h('div', { class: 'skill-grid' }, list.map(u => {
          const r = units[u.id];
          return h('a', { class: `skill eng ${r?.stars === 3 ? 'gold' : ''}`, href: `#${base}/unit/${u.id}` },
            h('span', { class: 'skill-emoji' }, u.emoji), h('span', { class: 'skill-title' }, u.title), stars(r?.stars || 0));
        }))));
    }
  }

  function viewLesson({ id }) {
    const u = unitById(id);
    if (!u) {
      location.hash = base;
      return;
    }
    let i = 0;
    const main = screen({ title: u.title, back: `#${base}` });
    const body = h('div', { class: 'lesson card' });
    main.append(body);
    const last = u.lessons.length - 1;
    const show = () => {
      const l = u.lessons[i];
      const content = h('div', { class: 'lesson-body', html: l.body });
      const p = profile(), r = book(p, subj).units[u.id];
      const startQuiz = tier => {
        unitRec(u.id).lessonSeen = true;
        save();
        stopSpeaking();
        location.hash = `${base}/quiz/${u.id}/${tier}`;
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
          tierList({ tiers: LESSON_TIERS, got: r?.stars || 0, onPick: startQuiz })) : '');
    };
    show();
    return stopSpeaking;
  }

  function viewQuiz({ id, tier: tierParam }) {
    const u = unitById(id);
    if (!u) {
      location.hash = base;
      return;
    }
    const p = profile();
    const tier = Math.min(3, Math.max(1, Number(tierParam) || currentTier(book(p, subj).units[u.id]?.stars)));
    const items = quizItems(u, tier).map(it => ({ ...it, unit: u, key: `${u.id}#${it.idx}` }));
    return runQuiz({ title: `${LESSON_TIERS[tier - 1].name} ${starText(tier)}: ${u.title}`, back: `#${base}/unit/${u.id}`, items, unit: u, tier });
  }

  function viewReview() {
    const items = shuffle(dueReviews(profile())).slice(0, 10);
    if (!items.length) {
      location.hash = base;
      return;
    }
    return runQuiz({ title: 'Fix my mistakes', back: `#${base}`, items, review: true });
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
      // Optional code (Code Club): plain text in a monospace block that keeps indentation.
      if (q.code) card.append(h('pre', { class: 'code-block' }, h('code', {}, q.code)));
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
      const review = book(p, subj).review;
      const card = review[item.key];
      if (!ok) {
        review[item.key] = grade(card || newCard(), false);
      } else if (card) {
        grade(card, true);
        if (card.box >= 3) delete review[item.key];
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
            tier < 3 ? h('a', { class: 'btn alt', href: `#${base}/quiz/${unit.id}/${tier + 1}` }, `Try ${starText(tier + 1)} ${LESSON_TIERS[tier].name} ›`) : null));
        } else {
          extra.push(h('div', { class: 'star-up miss' }, h('p', {}, `Get ${needFor(tier, total)} of ${total} right to earn ${starText(tier)}. You got ${correct}.`), stars(r.stars)));
        }
        save();
      }
      const res = finishSession({ subject: subj.id, correct, total: items.length });
      resultsView(f.stage, {
        correct, total: items.length, coins: coins + res.bonusCoins, xp: xp + res.bonusXp, perfect: res.perfect, unlocked: res.unlocked, extra,
        again: () => rerender(), backHref: `#${base}`, backLabel: 'All units',
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

  return { viewHome, viewLesson, viewQuiz, viewReview };
}
