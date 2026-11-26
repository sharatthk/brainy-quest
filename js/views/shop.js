// Shop (spend coins on avatars, buddy gear and themes) and trophy case.
import { h, toast } from '../ui.js';
import { screen } from './common.js';
import { profile, save } from '../store.js';
import { ACHIEVEMENTS } from '../shared/achievements.js';
import { sfx } from '../shared/sound.js';
import { runAchievements } from '../shared/rewards.js';
import { confetti } from '../shared/confetti.js';
import { render as rerender } from '../router.js';
import { FREE_AVATARS } from './home.js';
import { GEAR, gearId, ensureBuddy } from '../shared/buddy.js';
import { buddyFace } from './buddy.js';

export const AVATARS = [
  ['🐧', 30], ['🐙', 40], ['🦁', 40], ['🐝', 50], ['🦄', 50], ['🦖', 60], ['🤖', 60],
  ['👾', 70], ['🐉', 80], ['🦸', 100], ['🧙', 120], ['🚀', 150], ['🐲', 200], ['👑', 300],
];
export const THEMES = [
  ['sunny', 'Sunny', 0, '#ffb703'], ['ocean', 'Ocean', 100, '#0096c7'], ['forest', 'Forest', 100, '#2d9d4f'],
  ['candy', 'Candy', 150, '#ff4fa3'], ['space', 'Space (dark)', 200, '#9d7bff'],
];

function buy(id, price, apply) {
  const p = profile();
  if (p.owned.includes(id)) {
    apply(p);
    save();
    return rerender();
  }
  if (p.coins < price) return toast(`You need ${price - p.coins} more coins`, '🪙');
  p.coins -= price;
  p.owned.push(id);
  p.stats.purchases++;
  apply(p);
  save();
  sfx.fanfare();
  confetti({ count: 80 });
  toast('Bought it!', '🎉');
  runAchievements({ announce: true }); // e.g. Shopper
  rerender();
}

export function viewShop() {
  const p = profile();
  const main = screen({ title: 'Shop', back: '#/' });
  main.append(h('p', { class: 'muted' }, `You have ${p.coins} 🪙. Earn coins by answering questions, finishing sessions and unlocking achievements.`));
  main.append(h('h3', { class: 'unit-title' }, 'Buddies'),
    h('div', { class: 'shop-grid' },
      FREE_AVATARS.map(a => item(a, 'Free', p.avatar === a, true, () => { p.avatar = a; save(); rerender(); })),
      AVATARS.map(([a, price]) => item(a, p.owned.includes(`av:${a}`) ? 'Owned' : `${price} 🪙`, p.avatar === a, p.owned.includes(`av:${a}`), () => buy(`av:${a}`, price, x => (x.avatar = a))))));
  main.append(...gearSection(p));
  main.append(h('h3', { class: 'unit-title' }, 'Themes'),
    h('div', { class: 'shop-grid' }, THEMES.map(([id, name, price, color]) => {
      const owned = price === 0 || p.owned.includes(`th:${id}`);
      return item(h('span', { class: 'swatch', style: { background: color } }), `${name} · ${owned ? 'Owned' : `${price} 🪙`}`, p.theme === id, owned, () => (owned ? (p.theme = id, save(), rerender()) : buy(`th:${id}`, price, x => (x.theme = id))));
    })));
}

function gearSection(p) {
  const b = ensureBuddy(p);
  const wear = g => () => {
    b.gear = g;
    save();
    rerender();
  };
  return [
    h('h3', { class: 'unit-title' }, 'Hats & gear'),
    h('div', { class: 'gear-head' }, buddyFace(p, { size: 'md' }), h('p', { class: 'muted small' }, `Dress up ${b.name}! Tap an item you own to wear it. Some items hide in mystery chests.`)),
    h('div', { class: 'shop-grid' },
      item('🚫', 'No gear', !b.gear, true, wear(null)),
      GEAR.map(([g, name, price]) => {
        const owned = p.owned.includes(gearId(g));
        return item(g, `${name} · ${owned ? 'Owned' : `${price} 🪙`}`, b.gear === g, owned, owned ? wear(g) : () => buy(gearId(g), price, x => (ensureBuddy(x).gear = g)));
      })),
  ];
}

const item = (icon, label, active, owned, onclick) =>
  h('button', { class: `shop-item ${active ? 'active' : ''} ${owned ? 'owned' : ''}`, onclick }, h('span', { class: 'shop-icon' }, icon), h('small', {}, active ? 'Using ✓' : label));

export function viewTrophies() {
  const p = profile();
  const got = ACHIEVEMENTS.filter(a => p.achievements[a.id]).length;
  const main = screen({ title: 'Trophies', back: '#/' });
  main.append(h('p', { class: 'muted' }, `${got} of ${ACHIEVEMENTS.length} unlocked`),
    h('div', { class: 'trophy-grid' }, ACHIEVEMENTS.map(a => {
      const on = !!p.achievements[a.id];
      return h('div', { class: `trophy ${on ? 'on' : ''}` }, h('span', { class: 'trophy-emoji' }, on ? a.emoji : '🔒'), h('b', {}, a.title), h('small', {}, a.desc), h('small', { class: 'muted' }, `+${a.coins} 🪙`));
    })));
}
