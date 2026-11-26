// Daily quests: three small goals a day, picked per player and day, rewarded as soon as they are done.
// Pure (no DOM), unit tested.
import { seeded, shuffle } from './util.js';
import { totalStars } from './buddy.js';

export const ALL_DONE_BONUS = 50; // coins (plus a sticker) for finishing all three
// [id, emoji, text(goal), goals to pick from, coins, subject]
const Q = (id, emoji, text, goals, coins, subject = null) => ({ id, emoji, text, goals, coins, subject });
export const QUESTS = [
  Q('right', '🎯', n => `Get ${n} answers right`, [15, 20, 25], 20),
  Q('math', '🧮', n => `Get ${n} math answers right`, [8, 10, 12], 20, 'math'),
  Q('english', '📚', n => `Get ${n} English answers right`, [5, 6, 8], 20, 'english'),
  Q('spelling', '🐝', n => `Spell ${n} words right`, [5, 6, 8], 20, 'spelling'),
  Q('sessions', '🏁', n => `Finish ${n} sessions`, [2, 3], 25),
  Q('combo', '🔥', n => `Get ${n} right in a row`, [5, 8, 10], 20),
  Q('stars', '⭐', n => (n === 1 ? 'Earn a star' : `Earn ${n} stars`), [1, 2], 30),
  Q('chest', '🎁', () => 'Open a mystery chest', [1], 15),
];
export const questById = id => QUESTS.find(q => q.id === id);
export const questText = q => questById(q.id).text(q.goal);

const hash = s => [...s].reduce((h, c) => (Math.imul(h, 31) + c.codePointAt(0)) | 0, 7) >>> 0;

// The same three quests all day for a player; at most one subject quest so any game can be played.
export function pickQuests(day, playerId) {
  const rng = seeded(hash(`${day}:${playerId}`) || 1);
  const out = [];
  for (const q of shuffle(QUESTS, rng)) {
    if (out.length === 3) break;
    if (q.subject && out.some(o => questById(o.id).subject)) continue;
    out.push({ id: q.id, goal: q.goals[Math.floor(rng() * q.goals.length)], progress: 0, done: false });
  }
  return out;
}

// Today's quests, made fresh when the day changes.
export function ensureQuests(p, day) {
  if (p.quests?.day !== day) p.quests = { day, starsAt: totalStars(p), list: pickQuests(day, p.id || 'player'), bonus: false, fresh: [] };
  p.quests.fresh ||= [];
  return p.quests;
}

// Apply one event and return quests that just got done (with their coins).
// event: { type: 'session', subject, correct } | { type: 'combo', combo } | { type: 'chest' } | { type: 'stars' }
export function questEvent(p, day, event) {
  const qs = ensureQuests(p, day);
  const done = [];
  for (const q of qs.list) {
    if (q.done) continue;
    const def = questById(q.id);
    if (event.type === 'session') {
      if (q.id === 'right' || def.subject === event.subject) q.progress += event.correct;
      if (q.id === 'sessions') q.progress += 1;
    }
    if (event.type === 'combo' && q.id === 'combo') q.progress = Math.max(q.progress, event.combo);
    if (event.type === 'chest' && q.id === 'chest') q.progress += 1;
    if (q.id === 'stars') q.progress = Math.max(q.progress, totalStars(p) - qs.starsAt);
    if (q.progress >= q.goal) {
      q.progress = q.goal;
      q.done = true;
      done.push({ ...q, coins: def.coins });
    }
  }
  const allDone = !qs.bonus && qs.list.every(q => q.done);
  if (allDone) qs.bonus = true;
  qs.fresh.push(...done.map(q => q.id));
  return { done, allDone };
}
