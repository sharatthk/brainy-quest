// Speed Challenge: answer as many problems as you can before the timer runs out.
// Points grow with difficulty, quick answers and streaks. Records are kept per topic and timer.
import { h, toast } from '../ui.js';
import { screen, TIER_NAMES, starText } from '../views/common.js';
import { profile, save, getState } from '../store.js';
import { SKILLS, UNITS, isReached, checkAnswer, answerText } from './skills.js';
import { buildQuestion, isEmptyAnswer } from './question.js';
import { award, recordAnswer, finishSession } from '../shared/rewards.js';
import { sfx } from '../shared/sound.js';
import { confetti } from '../shared/confetti.js';
import { pick } from '../shared/util.js';
import { go } from '../router.js';
import { multiplier, pointsFor, coinsFor } from './scoring.js';
import { genAt } from './tiers.js';
import { chestCard } from '../views/chest.js';
import { afterSessionCard } from '../views/progressCards.js';
import { celebrateGrowth } from '../views/buddy.js';

export const TIMERS = [
  { secs: 60, name: 'Sprint', emoji: '⚡' },
  { secs: 120, name: 'Blitz', emoji: '🔥' },
  { secs: 180, name: 'Marathon', emoji: '🏃' },
];
const MIX = { id: 'mix', title: 'Everything I know', emoji: '🎲' };


const DIFFICULTY = [
  { tier: 1, blurb: 'Warm-up problems' },
  { tier: 2, blurb: 'Standard problems' },
  { tier: 3, blurb: 'Hard problems, big points' },
];

// Reached skills of the topic; a topic not reached yet starts with its first skill.
function openSkills(p, topic) {
  const reached = SKILLS.filter(s => isReached(s, p) && (topic === 'mix' || s.unit === topic));
  return reached.length || topic === 'mix' ? reached : SKILLS.filter(s => s.unit === topic).slice(0, 1);
}
const topics = () => [MIX, ...UNITS];
// ★★ keeps the original key, so records set before difficulty tiers existed count as ★★ records.
const recKey = (topic, secs, tier) => (tier === 2 ? `${topic}-${secs}` : `${topic}-${secs}-t${tier}`);
const speedRecs = p => (p.math.speed ||= {});

let choice = { topic: 'mix', secs: 60, tier: 2 };

// ---------------- Picker ----------------

export function viewSpeedPicker() {
  const p = profile();
  const main = screen({ title: 'Speed Challenge', back: '#/math' });
  const draw = () => {
    const recs = speedRecs(p);
    const topicGrid = h('div', { class: 'topic-grid' }, topics().map(t => {
      const n = openSkills(p, t.id).length;
      return h('button', {
        class: `topic-chip ${choice.topic === t.id ? 'on' : ''}`, disabled: n ? null : true,
        title: n ? '' : 'Unlock a skill in this topic first',
        onclick: () => { choice.topic = t.id; sfx.click(); draw(); },
      }, h('span', { class: 'topic-emoji' }, n ? t.emoji : '🔒'), h('span', {}, t.title));
    }));
    const timerRow = h('div', { class: 'timer-row' }, TIMERS.map(t => {
      const best = recs[recKey(choice.topic, t.secs, choice.tier)]?.best;
      return h('button', { class: `timer-card ${choice.secs === t.secs ? 'on' : ''}`, onclick: () => { choice.secs = t.secs; sfx.click(); draw(); } },
        h('span', { class: 'timer-emoji' }, t.emoji), h('b', {}, t.name), h('small', {}, `${t.secs / 60} min`),
        h('small', { class: 'timer-best' }, best ? `Best: ${best}` : 'No record yet'));
    }));
    const tierRow = h('div', { class: 'tier-pick' }, DIFFICULTY.map(d => h('button', {
      class: choice.tier === d.tier ? 'on' : '', onclick: () => { choice.tier = d.tier; sfx.click(); draw(); },
    }, h('span', { class: 'tier-stars' }, starText(d.tier)), h('b', {}, TIER_NAMES[d.tier - 1]), h('small', {}, d.blurb))));
    const t = TIMERS.find(x => x.secs === choice.secs);
    main.replaceChildren(
      h('div', { class: 'quest-head' }, h('div', {}, h('h2', {}, 'Race the clock! ⏱️'),
        h('p', { class: 'muted' }, 'Quick answers earn bonus points. Every 5 in a row raises your multiplier, up to ×4.'))),
      h('section', { class: 'unit' }, h('h3', { class: 'unit-title' }, '1. Pick a topic'), topicGrid),
      h('section', { class: 'unit' }, h('h3', { class: 'unit-title' }, '2. Pick the difficulty'), tierRow),
      h('section', { class: 'unit' }, h('h3', { class: 'unit-title' }, '3. Pick your timer'), timerRow),
      leaderboard(choice.topic, choice.secs, choice.tier),
      h('div', { class: 'row center' }, h('button', { class: 'btn big', onclick: () => go(`/math/speed/${choice.topic}/${choice.secs}/${choice.tier}`) }, `▶ Start ${t.name} ${starText(choice.tier)}`)));
  };
  draw();
}

function leaderboard(topic, secs, tier, highlightId) {
  const key = recKey(topic, secs, tier);
  const rows = getState().profiles.map(pp => ({ pp, best: pp.math.speed?.[key]?.best || 0 })).filter(r => r.best > 0).sort((a, b) => b.best - a.best);
  const t = TIMERS.find(x => x.secs === secs);
  const title = `${topics().find(x => x.id === topic)?.title} · ${starText(tier)} · ${t.name}`;
  return h('section', { class: 'card leaderboard' },
    h('h3', {}, `🏆 Family leaderboard`, h('small', { class: 'muted' }, ` ${title}`)),
    rows.length
      ? h('ol', {}, rows.slice(0, 5).map((r, i) => h('li', { class: r.pp.id === highlightId ? 'me' : '' },
        h('span', { class: 'lb-rank' }, ['🥇', '🥈', '🥉'][i] || `${i + 1}.`), h('span', { class: 'lb-avatar' }, r.pp.avatar),
        h('span', { class: 'lb-name' }, r.pp.name), h('b', {}, r.best))))
      : h('p', { class: 'muted' }, 'No scores yet. Be the first!'));
}

// ---------------- Play ----------------

export function viewSpeedPlay({ topic, secs, tier = '2' }) {
  const p = profile();
  secs = Number(secs);
  tier = Number(tier);
  const timer = TIMERS.find(t => t.secs === secs);
  const pool = openSkills(p, topic);
  if (!timer || !pool.length || ![1, 2, 3].includes(tier)) {
    location.hash = '/math/speed';
    return;
  }
  choice = { topic, secs, tier };

  let alive = true, ended = false, timerId = 0, onKey = null, pausedLeft = null; // pausedLeft: ms left while a miss is on screen
  let score = 0, correct = 0, answered = 0, streak = 0, bestStreak = 0, endAt = 0;

  const timeEl = h('b', { class: 'sp-time' }, `${secs}`);
  const scoreEl = h('b', { class: 'sp-score' }, '0');
  const multEl = h('span', { class: 'sp-mult' }, '×1');
  const fill = h('div', { class: 'progress-fill sp-fill' });
  const stage = h('div', { class: 'stage' });
  screen({ title: `${timer.emoji} ${timer.name} ${starText(tier)}`, back: '#/math/speed', cls: 'session-screen speed-screen' },
    h('div', { class: 'speed-hud' },
      h('div', { class: 'sp-box' }, h('small', {}, 'Time'), timeEl),
      h('div', { class: 'progress sp-progress' }, fill),
      h('div', { class: 'sp-box' }, h('small', {}, 'Score'), scoreEl),
      multEl),
    stage);

  const setMult = () => {
    const m = multiplier(streak);
    multEl.textContent = `×${m}`;
    multEl.className = `sp-mult m${m}`;
  };
  const bumpScore = () => {
    scoreEl.textContent = score;
    scoreEl.classList.remove('bump');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('bump');
  };

  // 3-2-1-Go!
  const countdown = h('div', { class: 'countdown' });
  stage.replaceChildren(countdown);
  const steps = ['3', '2', '1', 'Go!'];
  steps.forEach((s, i) => setTimeout(() => {
    if (!alive) return;
    countdown.textContent = s;
    countdown.classList.remove('pulse');
    void countdown.offsetWidth;
    countdown.classList.add('pulse');
    (i === steps.length - 1 ? sfx.correct : sfx.click)();
  }, i * 700));
  setTimeout(() => alive && start(), steps.length * 700);

  function start() {
    endAt = performance.now() + secs * 1000;
    let lastTick = null;
    timerId = setInterval(() => {
      if (pausedLeft != null) return;
      const left = Math.max(0, endAt - performance.now());
      const s = Math.ceil(left / 1000);
      timeEl.textContent = s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}`;
      fill.style.width = `${(left / (secs * 1000)) * 100}%`;
      const urgent = left <= 10000;
      timeEl.classList.toggle('urgent', urgent);
      fill.classList.toggle('urgent', urgent);
      if (s <= 5 && s > 0 && s !== lastTick) {
        lastTick = s;
        sfx.tick();
      }
      if (left <= 0) finish();
    }, 100);
    nextQuestion();
  }

  function nextQuestion() {
    if (!alive || ended) return;
    const skill = pick(pool);
    const pr = genAt(skill, tier);
    const shownAt = performance.now();
    const card = h('div', { class: 'q-card card speed-card' }, h('div', { class: 'q-tag' }, `${skill.emoji} ${skill.title}`,
      h('span', { class: 'tier-chip' }, starText(tier))));
    const fb = h('div', { class: 'feedback' });
    let done = false;
    const qn = buildQuestion(card, pr, { compact: true, onSubmit: submit });
    card.append(fb);
    stage.replaceChildren(card);
    qn.focus();
    onKey = qn.onKey;

    function submit(val, choiceBtn) {
      if (done || ended) return;
      if (isEmptyAnswer(val)) return;
      done = true;
      qn.lock();
      qn.checkBtn?.remove();
      const ok = checkAnswer(pr, val);
      qn.reveal(choiceBtn);
      answered++;
      recordAnswer(ok, ok ? streak + 1 : 0);
      if (ok) {
        correct++;
        streak++;
        bestStreak = Math.max(bestStreak, streak);
        const { points, quick } = pointsFor({ tier, seconds: (performance.now() - shownAt) / 1000, kind: pr.kind, streak });
        score += points;
        bumpScore();
        sfx.correct();
        if (streak % 5 === 0) {
          confetti({ count: 50, y: 0.4 });
          toast(`${streak} in a row! Multiplier ×${multiplier(streak)}`, '🔥', 1500);
        }
        fb.replaceChildren(h('div', { class: 'fb good sp-pop' }, `+${points}`, quick ? ' ⚡ Quick!' : ''));
        setTimeout(nextQuestion, 350);
      } else {
        streak = 0;
        sfx.wrong();
        // A miss stays on screen until Next, with the clock paused so reading it costs no time.
        pausedLeft = Math.max(0, endAt - performance.now());
        const resume = () => {
          if (pausedLeft == null) return;
          endAt = performance.now() + pausedLeft;
          pausedLeft = null;
          nextQuestion();
        };
        const nextBtn = h('button', { class: 'btn big', onclick: resume }, 'Next ›');
        fb.replaceChildren(h('div', { class: 'fb bad' },
          h('p', { class: 'fb-title' }, `The answer is ${answerText(pr)}.`),
          pr.steps?.length ? h('details', { class: 'how' }, h('summary', {}, 'How to solve it'), h('ol', {}, pr.steps.map(st => h('li', {}, st)))) : null,
          h('p', { class: 'muted small' }, '⏸ The clock is paused.'),
          h('div', { class: 'row center' }, nextBtn)));
        nextBtn.focus();
        onKey = e => e.key === 'Enter' && resume();
      }
      setMult();
    }
  }

  function finish() {
    if (ended) return;
    ended = true;
    clearInterval(timerId);
    onKey = null;
    const recs = speedRecs(p);
    const key = recKey(topic, secs, tier);
    const prev = recs[key] || { best: 0, bestCorrect: 0, plays: 0 };
    const isRecord = score > prev.best;
    recs[key] = { best: Math.max(prev.best, score), bestCorrect: Math.max(prev.bestCorrect, correct), plays: prev.plays + 1 };
    if (isRecord && prev.best > 0) p.stats.speedRecords = (p.stats.speedRecords || 0) + 1;
    const coins = coinsFor(score), xp = correct * 2;
    award({ coins, xp });
    save();
    const res = finishSession({ subject: 'math', correct, total: Math.max(answered, 1) });
    if (isRecord && score > 0) {
      confetti({ count: 260 });
      sfx.fanfare();
    } else if (correct) {
      confetti({ count: 100 });
    }
    sfx.levelUp();
    stage.replaceChildren(h('div', { class: 'results card' },
      h('div', { class: 'medal' }, isRecord && score > 0 ? '🏆' : '⏱️'),
      h('h2', {}, isRecord && score > 0 ? (prev.best ? 'NEW RECORD!' : 'First record set!') : "Time's up!"),
      h('p', { class: 'sp-final' }, score, h('small', {}, ' points')),
      h('p', { class: 'score' }, `${correct} right out of ${answered} · best streak ${bestStreak}`),
      prev.best && !isRecord ? h('p', { class: 'muted' }, `Your record: ${prev.best}. ${prev.best - score} more to beat it!`) : null,
      h('div', { class: 'reward-row' },
        h('div', { class: 'reward' }, h('b', {}, `+${coins + res.bonusCoins}`), h('span', {}, '🪙 coins')),
        h('div', { class: 'reward' }, h('b', {}, `+${xp + res.bonusXp}`), h('span', {}, '⚡ XP'))),
      res.unlocked.length ? h('div', { class: 'unlocked' }, h('h3', {}, 'New achievements!'),
        res.unlocked.map(a => h('div', { class: 'ach-mini' }, h('span', {}, a.emoji), h('b', {}, a.title), h('small', { class: 'muted' }, ` +${a.coins} 🪙`)))) : null,
      afterSessionCard(),
      chestCard(answered),
      leaderboard(topic, secs, tier, p.id),
      h('div', { class: 'row center' },
        h('button', { class: 'btn', onclick: () => go(`/math/speed/${topic}/${secs}/${tier}`) }, '🔁 Play again'),
        h('a', { class: 'btn alt', href: '#/math/speed' }, 'Change challenge'))));
    stage.querySelector('.btn')?.focus();
    celebrateGrowth(stage.firstElementChild);
  }

  const keyHandler = e => {
    if (!onKey || e.target instanceof HTMLInputElement) return;
    if (e.key === 'Enter' && e.target instanceof HTMLButtonElement) return;
    onKey(e);
  };
  document.addEventListener('keydown', keyHandler);
  return () => {
    alive = false;
    clearInterval(timerId);
    document.removeEventListener('keydown', keyHandler);
  };
}
