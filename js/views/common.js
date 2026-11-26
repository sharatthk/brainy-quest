// Shared layout pieces: top bar, screens, stars, session frame, results.
import { h, pop } from '../ui.js';
import { profile } from '../store.js';
import { currentStreak } from '../shared/rewards.js';
import { confetti } from '../shared/confetti.js';
import { sfx } from '../shared/sound.js';
import { sessionPal, celebrateGrowth } from './buddy.js';
import { chestCard } from './chest.js';

export function topbar({ title, back }) {
  const p = profile();
  return h('header', { class: 'topbar' },
    back ? h('a', { class: 'icon-btn', href: back, 'aria-label': 'Back' }, '‹') : h('span', { class: 'icon-btn ghost' }),
    h('h1', { class: 'topbar-title' }, title),
    p ? h('div', { class: 'topbar-stats' },
      h('span', { class: 'pill', title: 'Day streak' }, '🔥', h('b', { id: 'streak-count' }, currentStreak(p))),
      h('span', { class: 'pill', title: 'Coins' }, '🪙', h('b', { id: 'coin-count' }, p.coins)),
      h('a', { class: 'avatar-sm', href: '#/profiles', title: 'Switch player' }, p.avatar)) : h('span'));
}

export function screen({ title, back = '#/', cls = '' }, ...children) {
  const main = h('main', { class: `screen ${cls}` }, ...children);
  document.getElementById('app').replaceChildren(topbar({ title, back }), main);
  window.scrollTo(0, 0);
  return main;
}

export function stars(n, max = 3) {
  return h('span', { class: 'stars', 'aria-label': `${n} of ${max} stars` },
    Array.from({ length: max }, (_, i) => h('span', { class: i < n ? 'star on' : 'star' }, '★')));
}

export const TIER_NAMES = ['Easy', 'Medium', 'Hard'];
export const starText = tier => '★'.repeat(tier);

// The three star tiers of a stage. tiers: [{ name, label }] (name defaults to Easy/Medium/Hard);
// got: stars earned; onPick(tier) starts one. Every tier is open; the next one to earn is marked.
export function tierList({ tiers, got, onPick }) {
  const next = Math.min(3, got + 1);
  return h('div', { class: 'tier-list' }, tiers.map((t, k) => {
    const tier = k + 1, done = got >= tier;
    return h('button', { class: `tier-row ${done ? 'done' : ''} ${tier === next && !done ? 'suggested' : ''}`, onclick: () => onPick(tier) },
      h('span', { class: 'tier-stars' }, starText(tier)),
      h('span', { class: 'tier-text' }, h('b', {}, t.name || TIER_NAMES[k]), h('small', {}, t.label)),
      h('span', { class: 'tier-state', 'aria-label': done ? 'passed' : 'play' }, done ? '✅' : '▶'));
  }));
}

export function sessionFrame({ title, back }) {
  const fill = h('div', { class: 'progress-fill' });
  const combo = h('div', { class: 'combo' });
  const stage = h('div', { class: 'stage' });
  const pal = sessionPal();
  screen({ title, back, cls: 'session-screen' }, h('div', { class: 'session-top' }, pal.el, h('div', { class: 'progress' }, fill), combo), stage);
  return {
    stage,
    // The buddy reacts to an answer; streak = right answers in a row.
    react: pal.react,
    setProgress(done, total) {
      fill.style.width = `${Math.min(100, (done / Math.max(1, total)) * 100)}%`;
    },
    setCombo(n) {
      combo.textContent = n >= 3 ? `🔥 ${n} in a row!` : '';
      combo.classList.toggle('hot', n >= 5);
    },
  };
}

// Visual + audio reward for a correct answer.
export function cheer(anchor, coins, combo) {
  sfx.correct();
  if (coins) setTimeout(() => sfx.coin(), 120);
  pop(anchor, `+${coins} 🪙`);
  if (combo && combo % 5 === 0) confetti({ count: 60, y: 0.5 });
}

const PRAISE = ['Awesome!', 'Great job!', 'You got it!', 'Brilliant!', 'Super!', 'Nailed it!', 'Fantastic!', 'Way to go!'];
export const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

export function resultsView(stage, { correct, total, coins, xp, perfect, unlocked = [], extra = [], again, backHref, backLabel = 'Back' }) {
  const pct = total ? correct / total : 0;
  const medal = perfect ? '🏆' : pct >= 0.8 ? '🥇' : pct >= 0.6 ? '🥈' : '🥉';
  const msg = perfect ? 'PERFECT!' : pct >= 0.8 ? 'Excellent work!' : pct >= 0.6 ? 'Nice effort!' : 'Practice makes progress!';
  if (pct >= 0.6) {
    confetti({ count: perfect ? 260 : 140 });
    sfx.fanfare();
  }
  stage.replaceChildren(h('div', { class: 'results card' },
    h('div', { class: 'medal' }, medal),
    h('h2', {}, msg),
    h('p', { class: 'score' }, `${correct} / ${total} correct`),
    h('div', { class: 'reward-row' },
      h('div', { class: 'reward' }, h('b', {}, `+${coins}`), h('span', {}, '🪙 coins')),
      h('div', { class: 'reward' }, h('b', {}, `+${xp}`), h('span', {}, '⚡ XP'))),
    ...extra,
    chestCard(total),
    unlocked.length ? h('div', { class: 'unlocked' }, h('h3', {}, 'New achievements!'),
      unlocked.map(a => h('div', { class: 'ach-mini' }, h('span', {}, a.emoji), h('b', {}, a.title), h('small', { class: 'muted' }, ` +${a.coins} 🪙`)))) : null,
    h('div', { class: 'row center' },
      again ? h('button', { class: 'btn', onclick: again }, '🔁 Play again') : null,
      h('a', { class: 'btn alt', href: backHref }, backLabel))));
  stage.querySelector('.btn')?.focus();
  celebrateGrowth(stage.firstElementChild);
}
