// Grade-level paths: the school grade where each math skill is usually learned (US Common Core, roughly).
// A player's grade (settings.grade, 0 = not set) moves the suggested start: skills up to their grade count as
// reached, ✨ Next skips skills far below it, and Daily Mix leans toward on-grade skills. Pure, unit tested.

export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8];
export const gradeName = g => (g ? `${g}${{ 1: 'st', 2: 'nd', 3: 'rd' }[g] || 'th'} grade` : 'Not set');

export const SKILL_GRADE = {
  'basic-count': 1, 'basic-add': 1, 'basic-sub': 1, 'basic-bonds': 1, 'basic-skip': 2,
  'num-place': 2, 'num-round': 3, 'word-add-sub': 3, 'word-mul-div': 4,
  'add-2d-nc': 1, 'add-2d-c': 2, 'add-3d-nc': 2, 'add-3d-c1': 3, 'add-3d-c2': 3, 'add-4d': 4,
  'sub-2d-nb': 1, 'sub-2d-b': 2, 'sub-3d-nb': 2, 'sub-3d-b1': 3, 'sub-3d-b2': 3, 'sub-3d-bz': 3, 'sub-4d': 4,
  'mul-facts': 3, 'mul-2x1': 4, 'mul-3x1': 4, 'mul-2x2': 4,
  'div-facts': 3, 'div-2x1': 4, 'div-2x1r': 4, 'div-3x1': 4, 'div-3x2': 5,
  'frac-id': 3, 'frac-equiv': 3, 'frac-compare': 3, 'frac-add': 4, 'frac-of': 4, 'frac-muldiv': 5,
  'dec-place': 4, 'dec-add': 5, 'dec-muldiv': 5, 'pct-intro': 6, 'pct-of': 6, 'pct-big': 6,
  'big-read': 4, 'big-addsub': 5, 'big-muldiv': 5, 'big-pct': 6,
  'alg-missing': 3, 'alg-rule': 5, 'alg-one': 6, 'alg-expr': 6, 'alg-ineq': 6, 'alg-two': 7, 'alg-like': 7,
  'ratio-basic': 6, 'ratio-rate': 6, 'ratio-prop': 7, 'ratio-convert': 5,
  'money-tax': 7, 'money-discount': 7, 'money-interest': 7, 'money-change': 7,
  'int-line': 6, 'int-abs': 6, 'int-add': 7, 'int-muldiv': 7,
  'fm-gcf': 6, 'fm-lcm': 6,
  'expo-pow': 6, 'expo-ops': 6, 'expo-sci': 8, 'expo-roots': 8,
  'geo-angles': 7, 'geo-area': 6, 'geo-circle': 7, 'geo-volume': 7, 'geo-pythag': 8, 'geo-scale': 7,
  'stats-center': 6, 'stats-prob': 7,
  'graph-points': 6, 'graph-slope': 8, 'graph-linear': 8,
};

export const gradeOf = skill => SKILL_GRADE[skill.id] ?? 1;
export const playerGrade = p => Number(p?.settings?.grade) || 0;

// Untouched skills two or more grades below the player are review only: no ✨ Next, rare in Daily Mix.
export const belowGrade = (skill, p) => {
  const g = playerGrade(p);
  return !!g && gradeOf(skill) < g - 1;
};
