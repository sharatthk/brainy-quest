// Grade-level paths for lesson subjects: the school grade where each English, Science and Coding unit
// usually fits (roughly US Common Core / NGSS / CSTA). Used for "Next up" on each subject page. Pure, unit tested.

export const UNIT_GRADE = {
  // English
  abc: 1, rhymes: 1, 'naming-doing': 1, 'one-many': 1, 'first-sentences': 1, opposites: 1,
  nouns: 2, pronouns: 2, verbs: 2, adjectives: 2, adverbs: 3, connectors: 4,
  'subject-predicate': 3, 'sentence-types': 2, fragments: 4, agreement: 3, tenses: 3,
  phrases: 6, clauses: 6, 'sentence-structure': 5, modifiers: 7, voice: 8, 'pronoun-agreement': 6,
  capitals: 2, commas: 3, apostrophes: 3, quotes: 4, semicolons: 6,
  homophones: 2, affixes: 3, synonyms: 2, context: 4, roots: 5, connotation: 7, analogies: 6, 'multi-meaning': 4,
  similes: 4, personification: 5, idioms: 4, sounds: 3,
  'main-idea': 3, 'fact-opinion': 3, paragraphs: 3,
  plot: 5, theme: 6, pov: 6, character: 6, 'setting-mood': 7,
  'text-structure': 6, 'purpose-evidence': 6,
  argument: 7, narrative: 5, informative: 6, transitions: 5,
  'pronoun-case': 6, verbals: 8, 'verb-moods': 8, reference: 4, genres: 5, summary: 6, poetry: 5, 'nonfiction-types': 5, research: 6, 'writing-process': 4,
  // Science
  'sci-method': 3, 'measure-data': 4, states: 2, atoms: 7, compounds: 7, changes: 6,
  motion: 7, forces: 5, energy: 6, waves: 4, electricity: 6,
  cells: 6, classify: 4, plants: 5, genetics: 8, ecosystems: 5,
  'body-fuel': 5, 'body-move': 4, 'earth-inside': 6, rocks: 4, weather: 5, 'solar-system': 3, 'moon-seasons': 3,
  // Coding
  'cs-intro': 2, hardware: 3, binary: 5, data: 4, design: 4, debug: 3, teamwork: 5, algorithms: 3, ct: 5,
  blocks: 2, decisions: 3, loops: 3, functions: 4,
  'py-print': 5, 'py-vars': 5, 'py-lists': 6, 'py-if': 6, 'py-loops': 6, 'py-func': 7,
  internet: 3, safety: 2, html: 5, css: 6,
};

export const unitGrade = u => UNIT_GRADE[u.id] ?? 1;

// "Next up": without a grade, the first unit without ★★. With one, the first unit without ★★ at the player's
// grade, then one grade up, then anything not far below it, then the first unit without ★★.
export function suggestedUnit(units, recs, grade = 0) {
  const open = units.filter(u => !((recs[u.id]?.stars || 0) >= 2));
  if (!grade) return open[0];
  return open.find(u => unitGrade(u) === grade)
    || open.find(u => unitGrade(u) === grade + 1)
    || open.find(u => unitGrade(u) >= grade - 1)
    || open[0];
}

// Units worth another go: with a grade, earlier-grade units tried but not at ★★ yet; without one,
// units quizzed twice or more with a best score under 70%. Most-tried first.
export function unitGaps(units, recs, grade = 0) {
  const tried = units.filter(u => recs[u.id]?.attempts);
  const gaps = grade
    ? tried.filter(u => unitGrade(u) < grade && (recs[u.id].stars || 0) < 2)
    : tried.filter(u => recs[u.id].attempts >= 2 && (recs[u.id].best ?? 1) < 0.7);
  return gaps.sort((a, b) => recs[b.id].attempts - recs[a.id].attempts);
}
