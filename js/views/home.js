// Hub screen and player profiles.
import { h, onEnter } from '../ui.js';
import { screen } from './common.js';
import { profile, getState, createProfile, switchProfile } from '../store.js';
import { levelProgress, currentStreak, dailyXp } from '../shared/rewards.js';
import { SKILLS } from '../math/skills.js';
import { ENGLISH_UNITS } from '../english/content.js';
import { MASTERED_BOX } from '../shared/mastery.js';
import { go, render as rerender } from '../router.js';
import { syncCard } from './syncCard.js';
import { heroBuddy, buddyStrip, celebrateGrowth } from './buddy.js';

export const FREE_AVATARS = ['🦊', '🐼', '🐯', '🐸', '🐨', '🐰', '🐶', '🐱'];

function ring(pct, label) {
  const r = 34, c = 2 * Math.PI * r;
  return h('div', { class: 'ring', html: `<svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true"><circle cx="40" cy="40" r="${r}" style="fill:none;stroke:var(--bg2);stroke-width:9"/><circle cx="40" cy="40" r="${r}" transform="rotate(-90 40 40)" style="fill:none;stroke:var(--good);stroke-width:9;stroke-linecap:round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}"/></svg>` }, h('span', {}, label));
}

export function viewHome() {
  const p = profile();
  const lv = levelProgress(p.xp);
  const today = dailyXp(p);
  const goal = p.settings.dailyGoal;
  const mathStars = Object.values(p.math.skills).reduce((s, r) => s + (r.stars || 0), 0);
  const engStars = Object.values(p.english.units).reduce((s, r) => s + (r.stars || 0), 0);
  const mastered = Object.values(p.spelling.cards).filter(c => c.box >= MASTERED_BOX).length;

  const main = screen({ title: 'Brainy Quest', back: null, cls: 'home' });
  main.append(
    h('section', { class: 'hero card' },
      heroBuddy(p),
      h('div', { class: 'hero-info' },
        h('h2', {}, `Hi, ${p.name}!`),
        h('p', { class: 'muted' }, `Level ${lv.level} · ${currentStreak(p) ? `${currentStreak(p)}-day streak 🔥` : 'Start a streak today!'}`),
        h('div', { class: 'xpbar', title: `${lv.into} / ${lv.need} XP` }, h('div', { class: 'xpfill', style: { width: `${(lv.into / lv.need) * 100}%` } })),
        h('p', { class: 'small muted' }, `${lv.need - lv.into} XP to level ${lv.level + 1}`)),
      h('div', { class: 'hero-goal' }, ring(today / goal, today >= goal ? '✓' : `${today}`), h('small', {}, today >= goal ? 'Goal done!' : `Daily goal ${goal} XP`)),
      buddyStrip(p, () => rerender())),
    h('div', { class: 'hub' },
      hubCard('#/math', 'math', '🧮', 'Math Quest', 'Carry, borrow, multiply, divide, fractions, percents', `${mathStars}/${SKILLS.length * 3} ★`),
      hubCard('#/english', 'eng', '📚', 'Word Wizard', 'Grammar, punctuation, vocabulary, reading', `${engStars}/${ENGLISH_UNITS.length * 3} ★`),
      hubCard('#/spelling', 'spell', '🐝', 'Spelling Bee', 'Hear it, spell it, master it', `${mastered} words mastered`)),
    h('div', { class: 'hub small-hub' },
      miniCard('#/shop', '🛍️', 'Shop'),
      miniCard('#/trophies', '🏆', 'Trophies'),
      miniCard('#/parent', '👪', 'Grown-ups')));
  celebrateGrowth(main, 600); // a growth the player left the results screen before seeing
}

const hubCard = (href, cls, emoji, title, desc, stat) =>
  h('a', { class: `hub-card ${cls}`, href }, h('span', { class: 'hub-emoji' }, emoji), h('span', { class: 'hub-text' }, h('b', {}, title), h('small', {}, desc)), h('span', { class: 'hub-stat' }, stat));
const miniCard = (href, emoji, title) => h('a', { class: 'mini-card', href }, h('span', {}, emoji), h('b', {}, title));

export function viewProfiles() {
  const st = getState();
  const main = screen({ title: 'Who is playing?', back: st.profiles.length && profile() ? '#/' : null });
  if (st.profiles.length) {
    main.append(h('div', { class: 'profile-grid' }, st.profiles.map(p =>
      h('button', { class: `profile-btn ${p.id === st.currentId ? 'current' : ''}`, onclick: () => { switchProfile(p.id); go('/'); } },
        h('span', { class: 'profile-avatar' }, p.avatar), h('b', {}, p.name)))));
  }
  let avatar = FREE_AVATARS[0];
  const name = h('input', { class: 'text-input', placeholder: 'Your name', maxlength: 20, 'aria-label': 'Your name' });
  const picks = h('div', { class: 'avatar-pick' }, FREE_AVATARS.map(a => h('button', { class: a === avatar ? 'on' : '', onclick: e => {
    avatar = a;
    picks.querySelectorAll('button').forEach(b => b.classList.remove('on'));
    e.currentTarget.classList.add('on');
  } }, a)));
  const create = () => {
    if (!name.value.trim()) {
      name.focus();
      name.classList.add('shake');
      setTimeout(() => name.classList.remove('shake'), 400);
      return;
    }
    createProfile(name.value.trim(), avatar);
    go('/');
  };
  onEnter(name, create);
  main.append(h('section', { class: 'card stack new-profile' },
    h('h2', {}, st.profiles.length ? 'Add a new player' : 'Welcome to Brainy Quest! 🎉'),
    st.profiles.length ? null : h('p', { class: 'muted' }, 'Learn math, English and spelling. Earn coins, level up and collect trophies!'),
    name, h('p', { class: 'small muted' }, 'Pick your buddy:'), picks,
    h('button', { class: 'btn big', onclick: create }, "Let's go! 🚀")));
  const sync = syncCard({ compact: true });
  if (sync) main.append(sync);
  if (!st.profiles.length) name.focus();
}
