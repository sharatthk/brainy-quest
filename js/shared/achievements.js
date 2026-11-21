// Achievement definitions. Pure: each test reads only the profile.
import { SKILLS } from '../math/skills.js';
import { ENGLISH_UNITS } from '../english/content.js';
import { MASTERED_BOX } from './mastery.js';

const mathStars = p => Object.values(p.math.skills).reduce((s, r) => s + (r.stars || 0), 0);
const skillStars = (p, id) => p.math.skills[id]?.stars || 0;
const engDone = (p, min = 1) => ENGLISH_UNITS.filter(u => (p.english.units[u.id]?.stars || 0) >= min).length;
const spellMastered = p => Object.values(p.spelling.cards).filter(c => c.box >= MASTERED_BOX).length;
const spellRight = p => Object.values(p.spelling.cards).reduce((s, c) => s + c.right, 0);
const levelOf = xp => {
  let n = 1;
  while (xp >= 25 * (n + 1) * n) n++;
  return n;
};

const A = (id, emoji, title, desc, test, coins = 20) => ({ id, emoji, title, desc, test, coins });

export const ACHIEVEMENTS = [
  A('first-steps', '👣', 'First Steps', 'Finish your first session', p => p.stats.sessions >= 1, 10),
  A('explorer', '🧭', 'Explorer', 'Play Math, English and Spelling', p => p.stats.mathSessions > 0 && p.stats.englishSessions > 0 && p.stats.spellingSessions > 0),
  A('perfect', '💎', 'Flawless', 'Get every answer right in a session', p => p.stats.perfectSessions >= 1),
  A('perfect-10', '👑', 'Perfection Pro', 'Have 10 perfect sessions', p => p.stats.perfectSessions >= 10, 50),
  A('combo-10', '🔥', 'On Fire', '10 right answers in a row', p => p.stats.bestCombo >= 10),
  A('combo-25', '☄️', 'Unstoppable', '25 right answers in a row', p => p.stats.bestCombo >= 25, 50),
  A('answers-500', '🧠', 'Big Brain', 'Answer 500 questions', p => p.stats.answered >= 500, 50),
  A('streak-3', '📅', 'Habit Builder', 'Play 3 days in a row', p => p.streak.best >= 3),
  A('streak-7', '🗓️', 'Week Warrior', 'Play 7 days in a row', p => p.streak.best >= 7, 50),
  A('streak-30', '🏆', 'Monthly Master', 'Play 30 days in a row', p => p.streak.best >= 30, 200),
  A('level-5', '⭐', 'Rising Star', 'Reach level 5', p => levelOf(p.xp) >= 5, 30),
  A('level-10', '🌟', 'Superstar', 'Reach level 10', p => levelOf(p.xp) >= 10, 100),
  A('shopper', '🛍️', 'Shopper', 'Buy something in the shop', p => p.stats.purchases >= 1, 10),

  A('carry-captain', '⚓', 'Carry Captain', 'Earn 2 stars on 3-digit addition with many carries', p => skillStars(p, 'add-3d-c2') >= 2, 30),
  A('borrow-boss', '🦉', 'Borrow Boss', 'Earn 2 stars on borrowing across zeros', p => skillStars(p, 'sub-3d-bz') >= 2, 40),
  A('times-titan', '⚡', 'Times Titan', 'Earn 3 stars on times tables', p => skillStars(p, 'mul-facts') >= 3, 40),
  A('long-mult', '🚀', 'Rocket Multiplier', 'Earn 2 stars on 2-digit × 2-digit', p => skillStars(p, 'mul-2x2') >= 2, 40),
  A('div-detective', '🔎', 'Division Detective', 'Earn 2 stars on remainders', p => skillStars(p, 'div-2x1r') >= 2, 30),
  A('fraction-fan', '🍕', 'Fraction Fan', 'Earn a star on any fraction skill', p => SKILLS.some(s => s.unit === 'frac' && skillStars(p, s.id) >= 1)),
  A('percent-pro', '💯', 'Percent Pro', 'Earn 2 stars on percent of a number', p => skillStars(p, 'pct-of') >= 2, 40),
  A('math-25', '🧮', 'Star Collector', 'Collect 25 math stars', p => mathStars(p) >= 25, 50),
  A('math-all', '🏅', 'Math Legend', 'Collect every math star', p => mathStars(p) >= SKILLS.length * 3, 300),

  A('bookworm', '🐛', 'Bookworm', 'Pass 5 English units', p => engDone(p) >= 5, 30),
  A('grammar-guru', '📜', 'Grammar Guru', 'Get 3 stars on 5 English units', p => engDone(p, 3) >= 5, 40),
  A('word-wizard', '🧙', 'Word Wizard', 'Pass every English unit', p => engDone(p) >= ENGLISH_UNITS.length, 150),

  A('first-bee', '🐝', 'First Buzz', 'Spell your first word right', p => spellRight(p) >= 1, 10),
  A('spell-25', '🍯', 'Honey Collector', 'Master 25 spelling words', p => spellMastered(p) >= 25, 30),
  A('spell-100', '🏵️', 'Hive Hero', 'Master 100 spelling words', p => spellMastered(p) >= 100, 80),
  A('spell-500', '👑', 'Queen Bee', 'Master 500 spelling words', p => spellMastered(p) >= 500, 250),
  A('bee-10', '🎤', 'Stage Ready', 'Spell 10 in a row in Bee Challenge', p => p.spelling.bestChallenge >= 10, 30),
  A('bee-25', '🏆', 'Champion Speller', 'Spell 25 in a row in Bee Challenge', p => p.spelling.bestChallenge >= 25, 80),
];

export function checkAchievements(p) {
  return ACHIEVEMENTS.filter(a => !p.achievements[a.id] && a.test(p));
}
