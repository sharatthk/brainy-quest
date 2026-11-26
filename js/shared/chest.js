// Mystery chest after a session. Pure (no DOM), unit tested.
import { randInt, pick } from './util.js';
import { GEAR, gearId } from './buddy.js';

export const CHEST_MIN_ANSWERS = 5;
// Odds: 12% gear (rare), 28% bonus XP (uncommon), 60% coins (common).
export const ODDS = { gear: 0.12, xp: 0.28 };

// Returns { type: 'coins', coins } | { type: 'xp', xp } | { type: 'gear', emoji, name, id }.
// Gear is never one the player owns; with every item owned, it falls back to coins.
export function rollChest(rng, ownedIds = []) {
  const r = rng();
  if (r < ODDS.gear) {
    const free = GEAR.filter(([e]) => !ownedIds.includes(gearId(e)));
    if (free.length) {
      const [emoji, name] = pick(free, rng);
      return { type: 'gear', emoji, name, id: gearId(emoji) };
    }
  } else if (r < ODDS.gear + ODDS.xp) {
    return { type: 'xp', xp: randInt(rng, 10, 30) };
  }
  return { type: 'coins', coins: randInt(rng, 5, 25) };
}
