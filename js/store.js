// Persistent state in localStorage. Profiles hold per-kid progress; word lists are shared.
import { uid } from './shared/util.js';
import { ensureBuddy } from './shared/buddy.js';

const KEY = 'brainyquest.v1';
const listeners = new Set();
let state = load();

function defaults() {
  return {
    coins: 0,
    xp: 0,
    createdAt: Date.now(),
    streak: { count: 0, best: 0, lastDay: null },
    daily: { day: null, xp: 0 },
    owned: [],
    theme: 'sunny',
    achievements: {},
    stats: {
      answered: 0, correct: 0, sessions: 0, perfectSessions: 0, bestCombo: 0, coinsEarned: 0,
      purchases: 0, mathSessions: 0, englishSessions: 0, spellingSessions: 0, speedRecords: 0,
    },
    math: { skills: {}, speed: {} },
    english: { units: {}, review: {} },
    spelling: { cards: {}, bestChallenge: 0, stars: {} },
    buddy: {},
    chest: { session: 0, opened: 0 },
    settings: { voiceURI: '', rate: 0.85, sound: true, dailyGoal: 60, scratch: false },
  };
}

export function migrate(p) {
  const d = defaults();
  for (const [k, v] of Object.entries(d)) {
    if (p[k] === undefined) p[k] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v)) p[k] = { ...v, ...p[k] };
  }
  ensureBuddy(p);
  return p;
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.profiles)) {
      s.profiles.forEach(migrate);
      s.lists ||= [];
      s.defs ||= {};
      return s;
    }
  } catch { /* fall through to fresh state */ }
  return { version: 1, profiles: [], currentId: null, lists: [], defs: {} };
}

export function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach(f => f());
}

export const getState = () => state;
export const onChange = fn => listeners.add(fn);
export const profile = () => state.profiles.find(p => p.id === state.currentId) || null;

export function createProfile(name, avatar) {
  const p = migrate({ id: uid(), name, avatar });
  state.profiles.push(p);
  state.currentId = p.id;
  save();
  return p;
}

export function switchProfile(id) {
  state.currentId = id;
  save();
}

export function deleteProfile(id) {
  state.profiles = state.profiles.filter(p => p.id !== id);
  if (state.currentId === id) state.currentId = state.profiles[0]?.id || null;
  save();
}

export const exportData = () => JSON.stringify(state, null, 2);

export function importData(json) {
  const s = JSON.parse(json);
  if (!s || !Array.isArray(s.profiles)) throw new Error('This file is not a Brainy Quest backup.');
  s.profiles.forEach(migrate);
  s.lists ||= [];
  s.defs ||= {};
  state = s;
  save();
}
