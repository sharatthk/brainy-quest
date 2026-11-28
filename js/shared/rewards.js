// XP, levels, coins, streaks, session completion, achievements.
import { profile, save } from '../store.js';
import { dayKey, prevDayKey } from './util.js';
import { toast } from '../ui.js';
import { sfx } from './sound.js';
import { confetti } from './confetti.js';
import { checkAchievements } from './achievements.js';
import { ensureBuddy } from './buddy.js';
import { questEvent, ALL_DONE_BONUS } from './quests.js';
import { ensureStickers, giveStickers } from './stickers.js';
import { logDay, logStar } from './activity.js';

export const xpForLevel = n => 25 * n * (n - 1);
export function levelOf(xp) {
  let n = 1;
  while (xp >= xpForLevel(n + 1)) n++;
  return n;
}
export function levelProgress(xp) {
  const level = levelOf(xp);
  const a = xpForLevel(level), b = xpForLevel(level + 1);
  return { level, into: xp - a, need: b - a };
}

export function currentStreak(p) {
  const t = dayKey();
  return p.streak.lastDay === t || p.streak.lastDay === prevDayKey(t) ? p.streak.count : 0;
}
export function dailyXp(p) {
  return p.daily.day === dayKey() ? p.daily.xp : 0;
}

export function award({ coins = 0, xp = 0 } = {}) {
  const p = profile();
  const before = levelOf(p.xp);
  p.coins += coins;
  if (coins > 0) p.stats.coinsEarned += coins;
  p.xp += xp;
  const today = dayKey();
  if (p.daily.day !== today) p.daily = { day: today, xp: 0 };
  const goalBefore = p.daily.xp >= p.settings.dailyGoal;
  p.daily.xp += xp;
  if (xp) logDay(p, today, { xp });
  save();
  const after = levelOf(p.xp);
  if (after > before) {
    sfx.levelUp();
    confetti({ count: 200 });
    toast(`Level up! You reached level ${after}!`, '🆙', 3500);
  }
  if (!goalBefore && p.daily.xp >= p.settings.dailyGoal) {
    setTimeout(() => toast('Daily goal complete! Amazing work today!', '🎯', 3500), 400);
  }
}

// A star tier went up (from -> to): log it for the grown-ups' weekly summary.
export function starUp(subject, id, from, to) {
  const p = profile();
  logStar(p, dayKey(), subject, id, from || 0, to);
  save();
}

export function recordAnswer(ok, combo) {
  const p = profile();
  p.stats.answered++;
  if (ok) p.stats.correct++;
  p.stats.bestCombo = Math.max(p.stats.bestCombo, combo);
  logDay(p, dayKey(), { answered: 1, correct: ok ? 1 : 0 });
  save();
  if (ok) questUpdate({ type: 'combo', combo });
}

// Feed an event to today's quests and pay for any that got done. Finishing all three adds
// a bonus and a sticker (kept in stickers.pending until a results screen shows it).
export function questUpdate(event) {
  const p = profile();
  const { done, allDone } = questEvent(p, dayKey(), event);
  if (allDone) {
    const s = ensureStickers(p);
    s.pending = [...(s.pending || []), ...giveStickers(p, 1, Math.random)];
  }
  const coins = done.reduce((sum, q) => sum + q.coins, 0) + (allDone ? ALL_DONE_BONUS : 0);
  save();
  if (coins) award({ coins });
  return { done, allDone };
}

function touchStreak(p) {
  const t = dayKey();
  if (p.streak.lastDay === t) return;
  p.streak.count = p.streak.lastDay === prevDayKey(t) ? p.streak.count + 1 : 1;
  p.streak.lastDay = t;
  p.streak.best = Math.max(p.streak.best || 0, p.streak.count);
}

export function finishSession({ subject, correct, total }) {
  const p = profile();
  const streakBefore = currentStreak(p);
  touchStreak(p);
  p.stats.sessions++;
  p.stats[`${subject}Sessions`] = (p.stats[`${subject}Sessions`] || 0) + 1;
  const perfect = total > 0 && correct === total;
  if (perfect) p.stats.perfectSessions++;
  const buddy = ensureBuddy(p);
  buddy.meals++; // every finished session feeds the buddy
  buddy.fedDay = dayKey();
  save();
  if (p.streak.count > streakBefore && p.streak.count > 1) {
    setTimeout(() => toast(`${p.streak.count}-day streak! Keep it going!`, '🔥', 3000), 800);
  }
  const bonusXp = 10 + (perfect ? 10 : 0);
  const bonusCoins = perfect ? 10 : 3;
  award({ coins: bonusCoins, xp: bonusXp });
  const unlocked = runAchievements();
  questUpdate({ type: 'session', subject, correct });
  return { bonusXp, bonusCoins, perfect, unlocked };
}

// announce: show a toast per achievement (for places without a results screen, like the shop).
export function runAchievements({ announce = false } = {}) {
  const p = profile();
  const fresh = checkAchievements(p);
  if (!fresh.length) return [];
  for (const a of fresh) p.achievements[a.id] = Date.now();
  save();
  // A results screen lists new achievements itself, so there it is one fanfare instead of a pile of popups.
  if (announce) fresh.forEach(a => toast(`Achievement unlocked: ${a.title}! +${a.coins} 🪙`, a.emoji, 4000));
  setTimeout(() => sfx.fanfare(), 900);
  award({ coins: fresh.reduce((s, a) => s + a.coins, 0) });
  return fresh;
}
