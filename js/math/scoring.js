// Speed Challenge scoring rules (pure, unit tested).

// Every 5 in a row raises the multiplier, up to x4.
export const multiplier = streak => Math.min(4, 1 + Math.floor(streak / 5));

// 10 points per difficulty tier (1-3), +5 for a quick answer, times the streak multiplier.
export function pointsFor({ tier, seconds, kind, streak }) {
  const quick = seconds <= (kind === 'column' || kind === 'division' || kind === 'fraction' ? 8 : 4);
  return { points: (10 * tier + (quick ? 5 : 0)) * multiplier(streak), quick };
}

export const coinsFor = score => Math.round(score / 20);
