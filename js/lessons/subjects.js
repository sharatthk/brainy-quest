// Lesson subjects that share the lesson engine (js/lessons/lessonApp.js): lesson cards, then
// ★ Warm-up / ★★ Quiz / ★★★ Expert quizzes. Each subject's progress lives in p[id].
import { ENGLISH_SECTIONS, ENGLISH_UNITS } from '../english/content.js';
import { SCIENCE_SECTIONS, SCIENCE_UNITS } from '../science/content.js';
import { CODING_SECTIONS, CODING_UNITS } from '../coding/content.js';

export const SUBJECTS = [
  { id: 'english', title: 'Word Wizard', emoji: '📚', cls: 'eng', desc: 'Grammar, punctuation, vocabulary, reading, writing', sections: ENGLISH_SECTIONS, units: ENGLISH_UNITS },
  { id: 'science', title: 'Science Lab', emoji: '🔬', cls: 'sci', desc: 'Matter, forces, life, Earth and space', sections: SCIENCE_SECTIONS, units: SCIENCE_UNITS },
  { id: 'coding', title: 'Code Club', emoji: '💻', cls: 'code', desc: 'Computers, algorithms, Python and the web', sections: CODING_SECTIONS, units: CODING_UNITS },
];
export const subjectById = id => SUBJECTS.find(s => s.id === id);
