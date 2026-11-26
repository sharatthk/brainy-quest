// Buddy pet: the player's avatar grows as they learn. Pure (no DOM), unit tested.
// Food = every star earned in any game + 1 per finished session ("meals").
import { pick } from './util.js';

export const DEFAULT_NAME = 'Pip';

export const STAGES = [
  { id: 'egg', name: 'Egg', at: 0 },
  { id: 'baby', name: 'Baby', at: 3 },
  { id: 'kid', name: 'Kid', at: 12 },
  { id: 'hero', name: 'Hero', at: 30 },
  { id: 'legend', name: 'Legend', at: 60 },
];

// Wearables sold in the shop as `gear:<emoji>`.
// [emoji, name, price, slot]; slot says where it sits on the buddy (hat, eyes or side).
export const GEAR = [
  ['🎀', 'Bow', 40, 'side'], ['🧢', 'Cap', 60, 'hat'], ['🕶️', 'Shades', 80, 'eyes'], ['🎩', 'Top hat', 100, 'hat'],
  ['⛑️', 'Helmet', 120, 'hat'], ['🎓', 'Grad cap', 150, 'hat'], ['👑', 'Crown', 200, 'hat'],
];
export const gearSlot = emoji => GEAR.find(g => g[0] === emoji)?.[3] || 'hat';
export const gearId = emoji => `gear:${emoji}`;

// Fills in missing buddy fields (profiles from older versions or other devices may lack them).
export function ensureBuddy(p) {
  p.buddy ||= {};
  const b = p.buddy;
  b.name ||= DEFAULT_NAME;
  b.meals ||= 0;
  b.gear ||= null;
  b.fedDay ||= null;
  if (b.stage == null) b.stage = stageFor(buddyFood(p));
  return b;
}

const sum = xs => xs.reduce((s, x) => s + (Number(x) || 0), 0);

export function buddyFood(p) {
  const math = sum(Object.values(p.math?.skills || {}).map(r => r?.stars));
  const eng = sum(Object.values(p.english?.units || {}).map(r => r?.stars));
  const spell = sum(Object.values(p.spelling?.stars || {}));
  return math + eng + spell + (p.buddy?.meals || 0);
}

// Index into STAGES for a food count.
export function stageFor(food) {
  let i = 0;
  while (i + 1 < STAGES.length && food >= STAGES[i + 1].at) i++;
  return i;
}

// { stage, next (null at the last stage), into, need, pct } for the "next stage" bar.
export function stageProgress(food) {
  const i = stageFor(food);
  const stage = STAGES[i], next = STAGES[i + 1] || null;
  if (!next) return { stage, next, into: 0, need: 0, left: 0, pct: 1 };
  const into = food - stage.at, need = next.at - stage.at;
  return { stage, next, into, need, left: need - into, pct: into / need };
}

export const mood = (buddy, today) => (buddy?.fedDay === today ? 'happy' : 'hungry');

export const LINES = {
  start: ["Let's do this!", 'I believe in you!', 'Ready, set, learn!', 'Brain power, go!'],
  right: ['Yay!', 'You got it!', 'Woohoo!', 'Nice one!', 'Yum, brain food!', 'High five!', 'So smart!'],
  streak: ["You're on fire!", 'Unstoppable!', 'Wow, wow, wow!', 'Keep it going!', 'Super streak!'],
  wrong: ["Oops, let's look!", "That's okay, we learn!", "Almost! Let's see how.", 'Mistakes help us grow!', "Let's figure it out!", 'Good try! Keep going!'],
};

// A short speech-bubble line. kind: 'start' | 'right' | 'wrong'; streak = right answers in a row.
export function reaction(kind, streak = 0, rng = Math.random) {
  if (kind === 'right' && streak >= 3) {
    if (streak % 5 === 0) return { text: "You're on fire!", face: 'fire' };
    return { text: pick(LINES.streak, rng), face: 'fire' };
  }
  if (kind === 'wrong') return { text: pick(LINES.wrong, rng), face: 'oops' };
  if (kind === 'start') return { text: pick(LINES.start, rng), face: 'cheer' };
  return { text: pick(LINES.right, rng), face: 'cheer' };
}
