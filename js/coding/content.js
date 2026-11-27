// Code Club: original lessons and quizzes covering middle school computer science and coding.
// Same unit format as js/english/content.js (see the add-content skill).

export const CODING_SECTIONS = [
  { id: 'computers', title: 'Computing Systems', emoji: '🖥️' },
  { id: 'data', title: 'Data & Information', emoji: '💾' },
  { id: 'engineering', title: 'Building Software', emoji: '🛠️' },
  { id: 'algorithms', title: 'Algorithms & Thinking', emoji: '🧠' },
  { id: 'basics', title: 'Programming Basics', emoji: '🧩' },
  { id: 'python', title: 'Python', emoji: '🐍' },
  { id: 'web', title: 'The Web, HTML & CSS', emoji: '🌐' },
];

const U = (id, section, title, emoji, lessons, questions) => ({ id, section, title, emoji, lessons, questions });
const L = (title, body) => ({ title, body });

export const CODING_UNITS = [];
