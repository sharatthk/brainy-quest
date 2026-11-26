// Sticker book: themed pages of stickers. Every star earned adds a new random sticker;
// a full page pays a one-time coin reward. Pure (no DOM), unit tested.
import { totalStars } from './buddy.js';

export const PAGE_REWARD = 100;
export const PAGES = [
  { id: 'animals', title: 'Animal Friends', emoji: '🐾', stickers: ['🐶', '🐱', '🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵', '🐰', '🦉', '🐢'] },
  { id: 'ocean', title: 'Under the Sea', emoji: '🌊', stickers: ['🐳', '🐬', '🦈', '🐠', '🐙', '🦀', '🐚', '🦑', '🐡', '🦭', '🪸', '🐋'] },
  { id: 'space', title: 'Space Trip', emoji: '🚀', stickers: ['🚀', '🪐', '🌙', '⭐', '☄️', '🛸', '👽', '🌍', '🔭', '🌞', '🛰️', '🌠'] },
  { id: 'food', title: 'Yummy Treats', emoji: '🍩', stickers: ['🍎', '🍕', '🍩', '🍓', '🍉', '🧁', '🍔', '🍦', '🍪', '🥕', '🍌', '🍇'] },
  { id: 'fun', title: 'Fun & Games', emoji: '🎮', stickers: ['⚽', '🏀', '🎨', '🎸', '🎮', '🪁', '🎯', '🛹', '🎳', '🎲', '🧩', '🎻'] },
  { id: 'magic', title: 'Magic Land', emoji: '🏰', stickers: ['🦄', '🐉', '🦖', '🦕', '🧚', '🧜', '🧙', '🏰', '🌈', '🔮', '💎', '👑'] },
];
export const ALL_STICKERS = PAGES.flatMap(pg => pg.stickers);
export const pageOf = sticker => PAGES.find(pg => pg.stickers.includes(sticker));

// Fills in missing fields (profiles from older versions or other devices may lack them).
export function ensureStickers(p) {
  p.stickers ||= {};
  const s = p.stickers;
  s.owned ||= [];
  s.counted ||= 0; // stars already turned into stickers
  s.pages ||= []; // pages whose reward was paid
  return s;
}

// Adds `n` random stickers the player does not have yet; returns the new ones.
export function giveStickers(p, n, rng) {
  const s = ensureStickers(p);
  const got = [];
  for (let i = 0; i < n; i++) {
    const free = ALL_STICKERS.filter(x => !s.owned.includes(x));
    if (!free.length) break;
    const x = free[Math.floor(rng() * free.length)];
    s.owned.push(x);
    got.push(x);
  }
  return got;
}

// One sticker per star earned since last time (stars earned before stickers existed count too).
export function stickersForStars(p, rng) {
  const s = ensureStickers(p);
  const stars = totalStars(p);
  const fresh = Math.max(0, stars - s.counted);
  s.counted = Math.max(s.counted, stars);
  return giveStickers(p, fresh, rng);
}

// Pages that are now full and not yet rewarded; marks them rewarded.
export function completePages(p) {
  const s = ensureStickers(p);
  const done = PAGES.filter(pg => !s.pages.includes(pg.id) && pg.stickers.every(x => s.owned.includes(x)));
  done.forEach(pg => s.pages.push(pg.id));
  return done;
}
