// Daily quests and sticker book: the home quests card, the results-screen card, and the sticker book screen.
import { h } from '../ui.js';
import { screen } from './common.js';
import { profile, save } from '../store.js';
import { award, questUpdate } from '../shared/rewards.js';
import { ensureQuests, questById, questText, ALL_DONE_BONUS } from '../shared/quests.js';
import { PAGES, PAGE_REWARD, ensureStickers, stickersForStars, completePages, pageOf } from '../shared/stickers.js';
import { dayKey } from '../shared/util.js';
import { sfx } from '../shared/sound.js';

const bar = pct => h('div', { class: 'qbar' }, h('div', { class: 'qbar-fill', style: { width: `${Math.round(pct * 100)}%` } }));

// Home: today's three quests with progress.
export function questsCard(p) {
  const qs = ensureQuests(p, dayKey());
  save();
  const left = qs.list.filter(q => !q.done).length;
  return h('section', { class: 'card quests' },
    h('div', { class: 'quests-head' }, h('h3', {}, "🗺️ Today's quests"), h('small', { class: 'muted' }, left ? `${3 - left} of 3 done` : 'All done! 🎉')),
    qs.list.map(q => h('div', { class: `quest ${q.done ? 'done' : ''}` },
      h('span', { class: 'quest-emoji' }, q.done ? '✅' : questById(q.id).emoji),
      h('div', { class: 'quest-body' }, h('b', {}, questText(q)), q.done ? null : bar(q.progress / q.goal)),
      h('span', { class: 'quest-reward' }, q.done ? 'Done' : `${q.progress}/${q.goal} · ${questById(q.id).coins} 🪙`))),
    h('p', { class: 'small muted quests-bonus' }, qs.bonus ? `Bonus earned: +${ALL_DONE_BONUS} 🪙 and a sticker!` : `Finish all 3 for +${ALL_DONE_BONUS} 🪙 and a sticker!`));
}

// Results screen: stickers from stars just earned, full pages, and quests finished since the last results.
export function afterSessionCard() {
  const p = profile();
  questUpdate({ type: 'stars' });
  const s = ensureStickers(p);
  const got = [...stickersForStars(p, Math.random), ...(s.pending || [])];
  s.pending = [];
  const pages = completePages(p);
  const qs = ensureQuests(p, dayKey());
  const quests = qs.list.filter(q => qs.fresh.includes(q.id));
  const bonus = qs.bonus && !qs.bonusShown;
  qs.fresh = [];
  if (bonus) qs.bonusShown = true;
  save();
  if (pages.length) award({ coins: PAGE_REWARD * pages.length });
  if (!got.length && !quests.length && !bonus) return null;
  if (got.length || pages.length) setTimeout(() => sfx.levelUp(), 500);
  return h('div', { class: 'after-card' },
    quests.map(q => h('div', { class: 'after-row quest-done' }, h('span', {}, '🗺️'), h('b', {}, `Quest done: ${questText(q)}`), h('small', {}, `+${questById(q.id).coins} 🪙`))),
    bonus ? h('div', { class: 'after-row quest-done' }, h('span', {}, '🏅'), h('b', {}, 'All quests done today!'), h('small', {}, `+${ALL_DONE_BONUS} 🪙`)) : null,
    got.length ? h('a', { class: 'after-row sticker-new', href: '#/stickers' },
      h('span', { class: 'sticker-peel' }, got.join(' ')),
      h('b', {}, got.length === 1 ? `New sticker for your ${pageOf(got[0]).title} page!` : `${got.length} new stickers!`),
      h('small', {}, 'Open book ›')) : null,
    pages.map(pg => h('div', { class: 'after-row page-done' }, h('span', {}, pg.emoji), h('b', {}, `${pg.title} page complete!`), h('small', {}, `+${PAGE_REWARD} 🪙`))));
}

// The sticker book: one page per theme; missing stickers show as a mystery slot.
export function viewStickers() {
  const p = profile();
  stickersForStars(p, Math.random); // stars earned before stickers existed
  completePages(p).forEach(() => award({ coins: PAGE_REWARD }));
  save();
  const s = ensureStickers(p);
  const total = PAGES.reduce((n, pg) => n + pg.stickers.length, 0);
  const main = screen({ title: 'Sticker Book', back: '#/' });
  main.append(
    h('div', { class: 'quest-head' }, h('div', {}, h('h2', {}, `📒 ${s.owned.length} of ${total} stickers`),
      h('p', { class: 'muted' }, `Every star you earn gives you a new sticker. Fill a page for +${PAGE_REWARD} 🪙!`))),
    ...PAGES.map(pg => {
      const have = pg.stickers.filter(x => s.owned.includes(x)).length;
      return h('section', { class: `card sticker-page ${have === pg.stickers.length ? 'full' : ''}` },
        h('div', { class: 'sticker-head' }, h('h3', {}, `${pg.emoji} ${pg.title}`), h('small', { class: 'muted' }, have === pg.stickers.length ? 'Complete! ✅' : `${have}/${pg.stickers.length}`)),
        h('div', { class: 'sticker-grid' }, pg.stickers.map(x => s.owned.includes(x)
          ? h('span', { class: 'sticker' }, x)
          : h('span', { class: 'sticker missing', 'aria-label': 'not found yet' }, '?'))));
    }));
}
