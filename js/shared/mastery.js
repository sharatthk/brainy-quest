// Skill mastery (stars) and spaced repetition (Leitner boxes). Pure - no DOM.

export function emptyRec() {
  return { attempts: 0, correct: 0, recent: [], stars: 0, last: 0, errors: {} };
}

// Stars from recent answers (1 = right, 0 = wrong). Stars are never taken away once earned.
export function starsFor(recent) {
  const n = recent.length;
  if (n < 5) return 0;
  const acc = k => {
    const s = recent.slice(-k);
    return s.reduce((a, b) => a + b, 0) / s.length;
  };
  if (n >= 20 && acc(20) >= 0.95) return 3;
  if (n >= 10 && acc(10) >= 0.9) return 2;
  if (acc(Math.min(n, 10)) >= 0.7) return 1;
  return 0;
}

export function record(rec, ok, tag) {
  rec.attempts++;
  if (ok) rec.correct++;
  rec.recent = [...rec.recent, ok ? 1 : 0].slice(-20);
  if (!ok && tag) rec.errors[tag] = (rec.errors[tag] || 0) + 1;
  rec.last = Date.now();
  rec.stars = Math.max(rec.stars, starsFor(rec.recent));
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
