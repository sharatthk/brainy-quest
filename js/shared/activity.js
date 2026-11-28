// A small per-day activity log (answers, XP, stars) for the grown-ups' "This week" summary. Pure, unit tested.
// p.days = { 'YYYY-MM-DD': { answered, correct, xp, stars: [[subject, id, newStars], ...] } }, last 35 days kept.
// Older profiles and other devices may not have it: every reader tolerates a missing log.

const KEEP_DAYS = 35;

export function logDay(p, day, { answered = 0, correct = 0, xp = 0 } = {}) {
  const days = (p.days ||= {});
  const d = (days[day] ||= { answered: 0, correct: 0, xp: 0, stars: [] });
  d.answered += answered;
  d.correct += correct;
  d.xp += xp;
  const keys = Object.keys(days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete days[k];
  return d;
}

// A star tier went up: remember which (subject: math, english, science, coding or spelling).
export function logStar(p, day, subject, id, from, to) {
  if (!(to > from)) return;
  logDay(p, day).stars.push([subject, id, to]);
}

// The last 7 days (ending `today`): totals, stars earned, and what reached ★★ for the first time.
export function weekSummary(p, today) {
  const t = new Date(`${today}T12:00:00`);
  const keys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(t);
    d.setDate(t.getDate() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const days = keys.map(k => p.days?.[k]).filter(Boolean);
  const sum = f => days.reduce((a, d) => a + (d[f] || 0), 0);
  const stars = days.flatMap(d => d.stars || []);
  const reachedTwo = [...new Map(stars.filter(([, , s]) => s === 2).map(([subj, id]) => [`${subj}:${id}`, { subject: subj, id }])).values()];
  const answered = sum('answered'), correct = sum('correct');
  return {
    activeDays: days.filter(d => d.answered > 0).length,
    answered, correct, accuracy: answered ? correct / answered : null,
    xp: sum('xp'), starsEarned: stars.length, reachedTwo,
  };
}
