// Star tiers, practice records and spaced repetition (Leitner boxes). Pure - no DOM.

// ---- Star tiers ----
// Every stage (math skill, English unit, spelling list) has three tiers: ★ easy, ★★ medium, ★★★ hard.
// A stage's stars = the highest tier passed. Passing a tier opens the next one; stars are never taken away.
export const PASS = 0.8; // share of a tier session to get right (first try) to pass it
export const passed = (correct, total) => total > 0 && correct / total >= PASS;
export const needToPass = total => Math.ceil(PASS * total - 1e-9);
// Tier the player is working on: the first one not passed yet (3 once everything is passed).
export const currentTier = stars => Math.min(3, (stars || 0) + 1);

export function emptyRec() {
  return { attempts: 0, correct: 0, recent: [], stars: 0, last: 0, errors: {} };
}

export function record(rec, ok, tag) {
  rec.attempts++;
  if (ok) rec.correct++;
  rec.recent = [...rec.recent, ok ? 1 : 0].slice(-20);
  if (!ok && tag) rec.errors[tag] = (rec.errors[tag] || 0) + 1;
  rec.last = Date.now();
  return rec;
}

export function recentAccuracy(rec) {
  if (!rec || !rec.recent.length) return null;
  const s = rec.recent.slice(-10);
  return s.reduce((a, b) => a + b, 0) / s.length;
}

// ---- Spaced repetition ----
const DAY = 864e5;
export const INTERVALS = [0, 1, 3, 7, 21, 60]; // days per box
export const MASTERED_BOX = 3;

export function newCard() {
  return { box: 0, due: 0, seen: 0, right: 0, wrong: 0, last: 0 };
}

export function grade(card, ok, { hinted = false, now = Date.now() } = {}) {
  card.seen++;
  card.last = now;
  if (ok) {
    card.right++;
    if (!hinted) card.box = Math.min(card.box + 1, INTERVALS.length - 1);
  } else {
    card.wrong++;
    card.box = 0;
  }
  card.due = card.box === 0 ? now : now + INTERVALS[card.box] * DAY;
  return card;
}

export const isDue = (card, now = Date.now()) => !!card && card.seen > 0 && card.due <= now;

export function cardStatus(card) {
  if (!card || !card.seen) return 'new';
  return card.box >= MASTERED_BOX ? 'mastered' : 'learning';
}
