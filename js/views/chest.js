// Mystery chest on the results screen: one per finished session with enough answers.
import { h } from '../ui.js';
import { profile, save } from '../store.js';
import { award } from '../shared/rewards.js';
import { rollChest, CHEST_MIN_ANSWERS } from '../shared/chest.js';
import { sfx } from '../shared/sound.js';
import { confetti } from '../shared/confetti.js';
import { wearGear } from './buddy.js';

// Call after finishSession: the session count identifies this session's chest, so a
// re-render of the same results shows it as already opened.
export function chestCard(answers) {
  if (answers < CHEST_MIN_ANSWERS) return null;
  const p = profile();
  p.chest ||= { session: 0, opened: 0 };
  const session = p.stats.sessions;
  const box = h('div', { class: 'chest-box' });
  if (p.chest.session === session) {
    box.append(h('p', { class: 'muted small' }, '🧰 Chest opened. Finish another session for a new one!'));
    return box;
  }
  const btn = h('button', { class: 'chest-btn', 'aria-label': 'Open the mystery chest' },
    h('span', { class: 'chest-emoji' }, '🎁'), h('span', { class: 'chest-label' }, h('b', {}, 'Mystery chest!'), h('small', {}, 'Tap to open it')));
  btn.addEventListener('click', () => open(btn, box, session), { once: true });
  box.append(btn);
  return box;
}

function open(btn, box, session) {
  const p = profile();
  if (p.chest.session === session) return;
  const reward = rollChest(Math.random, p.owned);
  p.chest.session = session;
  p.chest.opened = (p.chest.opened || 0) + 1;
  if (reward.type === 'gear') p.owned.push(reward.id);
  save();
  if (reward.type === 'coins') award({ coins: reward.coins });
  if (reward.type === 'xp') award({ xp: reward.xp });

  btn.disabled = true;
  btn.classList.add('opening');
  [0, 180, 360].forEach(ms => setTimeout(() => sfx.tick(), ms));
  setTimeout(() => {
    const r = btn.getBoundingClientRect();
    sfx.chest();
    if (reward.type === 'gear') setTimeout(() => sfx.fanfare(), 250);
    else if (reward.type === 'coins') setTimeout(() => sfx.coin(), 250);
    confetti({ count: reward.type === 'gear' ? 160 : 70, x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight });
    box.replaceChildren(reveal(reward));
  }, 650);
}

function reveal(reward) {
  if (reward.type === 'coins') return revealCard('🪙', `+${reward.coins} coins!`, 'Spend them in the shop.');
  if (reward.type === 'xp') return revealCard('⚡', `+${reward.xp} bonus XP!`, 'Your brain is growing!');
  const wear = h('button', { class: 'btn', onclick: () => {
    wearGear(reward.emoji);
    wear.replaceWith(h('p', { class: 'small' }, 'Looking great! ✓'));
  } }, `Wear it`);
  return revealCard(reward.emoji, `Rare find: ${reward.name}!`, 'A new item for your buddy.', wear, 'rare');
}

const revealCard = (emoji, title, sub, action = null, cls = '') =>
  h('div', { class: `chest-reveal ${cls}` },
    h('span', { class: 'reveal-emoji' }, emoji),
    h('div', { class: 'reveal-text' }, h('b', {}, title), h('small', { class: 'muted' }, sub)),
    action);
