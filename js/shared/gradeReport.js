// "How is this player doing for their grade?" per subject, for the Grown-ups corner. Pure, unit tested.
// items: [{ grade, stars, attempts }] for every skill or unit of one subject. ★★ counts as "has it".

export function gradeStatus(items, grade) {
  if (!grade) return { status: 'unset', label: 'Set a grade to see this' };
  const has = i => (i.stars || 0) >= 2;
  const on = items.filter(i => i.grade === grade);
  const above = items.filter(i => i.grade > grade);
  const below = items.filter(i => i.grade < grade);
  const out = {
    onDone: on.filter(has).length, onTotal: on.length,
    aboveDone: above.filter(has).length,
    // Below-grade work that was tried but is not at ★★ yet: the gaps worth practicing.
    gaps: below.filter(i => i.attempts && !has(i)).length,
  };
  const started = items.some(i => i.attempts || i.stars);
  if (!started) return { ...out, status: 'new', label: 'Not started yet' };
  if (out.gaps >= 2 && out.gaps > out.onDone) return { ...out, status: 'catching-up', label: 'Catching up' };
  if (out.aboveDone >= 2 || (out.onTotal && out.onDone === out.onTotal)) return { ...out, status: 'ahead', label: 'Ahead' };
  return { ...out, status: 'on-grade', label: 'On grade' };
}
