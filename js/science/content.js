// Science Lab: original lessons and quizzes covering core middle school science.
// Same unit format as js/english/content.js (see the add-content skill).

export const SCIENCE_SECTIONS = [
  { id: 'method', title: 'Thinking Like a Scientist', emoji: '🧪' },
  { id: 'matter', title: 'Matter & Chemistry', emoji: '⚗️' },
  { id: 'physics', title: 'Forces, Motion & Energy', emoji: '⚡' },
  { id: 'life', title: 'Life Science', emoji: '🧬' },
  { id: 'body', title: 'The Human Body', emoji: '🫀' },
  { id: 'earth', title: 'Earth Science', emoji: '🌋' },
  { id: 'space', title: 'Space', emoji: '🪐' },
];

const U = (id, section, title, emoji, lessons, questions) => ({ id, section, title, emoji, lessons, questions });
const L = (title, body) => ({ title, body });

export const SCIENCE_UNITS = [];
