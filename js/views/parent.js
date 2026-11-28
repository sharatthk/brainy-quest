// Grown-ups corner: progress report, trouble spots, settings, backup.
import { h, toast, onEnter } from '../ui.js';
import { screen, stars } from './common.js';
import { profile, save, getState, exportData, importData, deleteProfile } from '../store.js';
import { SKILLS, UNITS, skillById, gapSkills } from '../math/skills.js';
import { weekSummary } from '../shared/activity.js';
import { dayKey } from '../shared/util.js';
import { GRADES, gradeName, playerGrade, gradeOf } from '../math/grades.js';
import { unitGrade, unitGaps } from '../lessons/grades.js';
import { gradeStatus } from '../shared/gradeReport.js';
import { SUBJECTS } from '../lessons/subjects.js';
import { book } from '../lessons/lessonApp.js';
import { recentAccuracy, cardStatus } from '../shared/mastery.js';
import { englishVoices, speak, speechSupported } from '../shared/speech.js';
import { levelOf, currentStreak } from '../shared/rewards.js';
import { allLists } from '../spelling/spellingApp.js';
import { normalizeSpelling } from '../spelling/logic.js';
import { render as rerender, go } from '../router.js';
import { syncCard } from './syncCard.js';
import { syncStatus } from '../sync/sync.js';

let unlockedUntil = 0;
const ERROR_LABELS = {
  'forgot-carry': 'Forgets to carry',
  'flip-subtract': 'Subtracts smaller from bigger instead of borrowing',
  'forgot-decrement': 'Borrows but forgets to reduce the next digit',
  'forgot-zero': 'Forgets the placeholder zero in 2-digit multiplication',
  'wrong-sign': 'Adds when it says take away (or the other way round)',
  'zeros': 'Gets the digits right but the number of zeros wrong',
  'off-by-one': 'Off by one when counting on or back',
};

export function viewParent() {
  if (Date.now() > unlockedUntil) return gate();
  const p = profile();
  const main = screen({ title: 'Grown-ups', back: '#/' });

  // Overview
  const acc = p.stats.answered ? Math.round((p.stats.correct / p.stats.answered) * 100) : 0;
  main.append(h('section', { class: 'card' },
    h('h2', {}, `${p.avatar} ${p.name}'s progress`),
    h('div', { class: 'stat-row' },
      stat('Level', levelOf(p.xp)), stat('Streak', `${currentStreak(p)} days`), stat('Best streak', `${p.streak.best} days`),
      stat('Sessions', p.stats.sessions), stat('Questions', p.stats.answered), stat('Accuracy', `${acc}%`))));

  // This week: activity, stars, what reached ★★, and the gaps to practice
  const wk = weekSummary(p, dayKey());
  const nameOf = ({ subject, id }) => {
    if (subject === 'math') return skillById(id)?.title;
    if (subject === 'spelling') return allLists().find(l => l.id === id)?.name;
    return SUBJECTS.find(s => s.id === subject)?.units.find(u => u.id === id)?.title;
  };
  const twoStar = wk.reachedTwo.map(nameOf).filter(Boolean);
  const gaps = gapSkills(p);
  main.append(h('section', { class: 'card week' },
    h('h3', {}, '📅 This week'),
    wk.answered ? h('div', { class: 'stat-row' },
      stat('Days played', `${wk.activeDays} of 7`), stat(`Questions, ${Math.round(wk.accuracy * 100)}% right`, wk.answered),
      stat('XP', wk.xp), stat('Stars earned', wk.starsEarned)) : h('p', { class: 'muted' }, 'No practice in the last 7 days yet.'),
    twoStar.length ? h('p', {}, h('b', {}, 'Reached ★★: '), twoStar.join(', ')) : null,
    gaps.length ? h('p', {}, h('b', {}, playerGrade(p) ? 'Gaps from earlier grades: ' : 'Needs practice: '), gaps.slice(0, 6).map(s => s.title).join(', ')) : null,
    gaps.length ? h('a', { class: 'btn alt', href: '#/math/gaps' }, `🧩 Practice the math gaps (${Math.min(gaps.length, 6)} skill${gaps.length === 1 ? '' : 's'})`) : null,
    // English, Science and Coding gaps: each links to that unit's ★★ Quiz.
    ...SUBJECTS.map(subj => {
      const ug = unitGaps(subj.units, book(p, subj).units, playerGrade(p)).slice(0, 4);
      return ug.length ? h('p', { class: 'lesson-gaps' }, h('b', {}, `${subj.emoji} ${subj.title} to review: `),
        ug.flatMap((u, i) => [i ? ', ' : '', h('a', { href: `#/${subj.id}/quiz/${u.id}/2` }, u.title)])) : null;
    })));

  // Grade path: on grade, ahead or catching up, per subject
  const g = playerGrade(p);
  const subjects = [
    { title: '🧮 Math', items: SKILLS.map(s => ({ grade: gradeOf(s), ...(p.math.skills[s.id] || {}) })) },
    ...SUBJECTS.map(subj => ({ title: `${subj.emoji} ${subj.title}`, items: subj.units.map(u => ({ grade: unitGrade(u), ...(book(p, subj).units[u.id] || {}) })) })),
  ];
  main.append(h('section', { class: 'card grade-report' },
    h('h3', {}, `🎒 Grade path${g ? `: ${gradeName(g)}` : ''}`),
    g ? h('ul', { class: 'grade-rows' }, subjects.map(({ title, items }) => {
      const r = gradeStatus(items, g);
      return h('li', {},
        h('div', { class: 'grade-row-top' }, h('b', {}, title), h('span', { class: `grade-chip ${r.status}` }, r.label)),
        h('p', { class: 'muted small' }, `${gradeName(g)}: ${r.onDone} of ${r.onTotal} at ★★ · above grade: ${r.aboveDone} · earlier gaps: ${r.gaps}`));
    })) : h('p', { class: 'muted' }, 'Pick a grade in Settings below to see how each subject compares with it.'),
    g ? h('p', { class: 'muted small' }, 'On grade: working at their grade. Ahead: ★★ on 2 or more skills above it, or all of this grade done. Catching up: 2 or more skills from earlier grades tried but not at ★★ yet.') : null));

  // Trouble spots
  const errors = {};
  for (const r of Object.values(p.math.skills)) for (const [k, v] of Object.entries(r.errors || {})) errors[k] = (errors[k] || 0) + v;
  const weakSkills = SKILLS.map(s => ({ s, r: p.math.skills[s.id] })).filter(x => x.r?.attempts >= 5 && recentAccuracy(x.r) < 0.7);
  const cards = p.spelling.cards;
  const toughWords = Object.entries(cards).filter(([, c]) => c.wrong > 0).sort((a, b) => b[1].wrong - a[1].wrong).slice(0, 12);
  main.append(h('section', { class: 'card' },
    h('h3', {}, '🔎 Trouble spots'),
    Object.keys(errors).length ? h('ul', {}, Object.entries(errors).sort((a, b) => b[1] - a[1]).map(([k, v]) => h('li', {}, `${ERROR_LABELS[k] || k}: ${v}×`))) : h('p', { class: 'muted' }, 'No repeated carry/borrow mistakes detected yet.'),
    weakSkills.length ? h('p', {}, h('b', {}, 'Math skills below 70% recently: '), weakSkills.map(x => x.s.title).join(', ')) : null,
    toughWords.length ? h('p', {}, h('b', {}, 'Toughest spelling words: '), toughWords.map(([w, c]) => `${w} (${c.wrong}×)`).join(', ')) : null));

  // Math table
  main.append(h('section', { class: 'card' }, h('h3', {}, '🧮 Math skills'),
    h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Skill'), h('th', {}, 'Stars'), h('th', {}, 'Recent'), h('th', {}, 'Answered'))),
      h('tbody', {}, UNITS.flatMap(u => SKILLS.filter(s => s.unit === u.id).map(s => {
        const r = p.math.skills[s.id];
        const a = recentAccuracy(r);
        return h('tr', {}, h('td', {}, `${s.emoji} ${s.title}`), h('td', {}, stars(r?.stars || 0)), h('td', {}, a == null ? '-' : `${Math.round(a * 100)}%`), h('td', {}, r?.attempts || 0));
      })))))));

  // Lesson subjects (English, Science, Coding)
  for (const subj of SUBJECTS.filter(x => x.units.length)) {
    main.append(h('section', { class: 'card' }, h('h3', {}, `${subj.emoji} ${subj.title} units`),
      h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Unit'), h('th', {}, 'Stars'), h('th', {}, 'Best score'), h('th', {}, 'Quizzes'))),
        h('tbody', {}, subj.units.map(u => {
          const r = book(p, subj).units[u.id];
          return h('tr', {}, h('td', {}, `${u.emoji} ${u.title}`), h('td', {}, stars(r?.stars || 0)), h('td', {}, r ? `${Math.round(r.best * 100)}%` : '-'), h('td', {}, r?.attempts || 0));
        }))))));
  }

  // Spelling
  main.append(h('section', { class: 'card' }, h('h3', {}, '🐝 Spelling lists'),
    h('ul', {}, allLists().map(l => {
      const s = { new: 0, learning: 0, mastered: 0 };
      l.words.forEach(w => s[cardStatus(cards[normalizeSpelling(w.w)])]++);
      return h('li', {}, `${l.name}: ${s.mastered} mastered, ${s.learning} learning, ${s.new} new (of ${l.words.length})`);
    }))));

  // Settings
  const voices = englishVoices();
  const voiceSel = h('select', { 'aria-label': 'Voice', onchange: e => { p.settings.voiceURI = e.target.value; save(); speak('Hello! Let us spell beautiful.'); } },
    h('option', { value: '' }, 'Automatic'), voices.map(v => h('option', { value: v.voiceURI, selected: v.voiceURI === p.settings.voiceURI ? true : null }, `${v.name} (${v.lang})`)));
  const rate = h('input', { type: 'range', min: 0.5, max: 1.2, step: 0.05, value: p.settings.rate, 'aria-label': 'Speaking speed', onchange: e => { p.settings.rate = Number(e.target.value); save(); speak('beautiful'); } });
  const goalSel = h('select', { 'aria-label': 'Daily goal', onchange: e => { p.settings.dailyGoal = Number(e.target.value); save(); } },
    [30, 60, 100, 150].map(v => h('option', { value: v, selected: v === p.settings.dailyGoal ? true : null }, `${v} XP (${{ 30: 'light', 60: 'regular', 100: 'serious', 150: 'intense' }[v]})`)));
  const gradeSel = h('select', { 'aria-label': 'Grade', onchange: e => { p.settings.grade = Number(e.target.value); save(); rerender(); } },
    [0, ...GRADES].map(g => h('option', { value: g, selected: g === playerGrade(p) ? true : null }, gradeName(g))));
  main.append(h('section', { class: 'card stack' }, h('h3', {}, '⚙️ Settings'),
    toggle('Sound effects', p.settings.sound, v => { p.settings.sound = v; save(); }),
    h('label', { class: 'field' }, 'Daily goal ', goalSel),
    h('label', { class: 'field' }, 'Grade (math path and quests) ', gradeSel),
    speechSupported() ? h('label', { class: 'field' }, 'Spelling voice ', voiceSel) : h('p', { class: 'warn' }, 'Speech is not supported in this browser.'),
    speechSupported() ? h('label', { class: 'field' }, 'Speaking speed ', rate) : null));

  // Data
  const file = h('input', { type: 'file', accept: 'application/json,.json', 'aria-label': 'Restore backup file' });
  file.addEventListener('change', async () => {
    try {
      importData(await file.files[0].text());
      toast('Backup restored', '✅');
      rerender();
    } catch (e) {
      toast(e.message, '⚠️', 4000);
    }
  });
  const sync = syncCard();
  if (sync) main.append(sync);
  const cloud = !!syncStatus().user;
  main.append(h('section', { class: 'card stack' }, h('h3', {}, '💾 Data'),
    h('p', { class: 'muted small' }, cloud ? 'Progress is saved in this browser and in the cloud. A backup file is an extra copy you keep yourself.' : 'Progress is saved in this browser only. Download a backup to move it to another device.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn alt', onclick: () => {
        const a = h('a', { href: URL.createObjectURL(new Blob([exportData()], { type: 'application/json' })), download: `brainy-quest-backup-${new Date().toISOString().slice(0, 10)}.json` });
        a.click();
        URL.revokeObjectURL(a.href);
      } }, '⬇️ Download backup'),
      h('label', { class: 'btn alt file-btn' }, '⬆️ Restore backup', file)),
    h('button', { class: 'link-btn danger', onclick: () => {
      if (!confirm(`Delete ${p.name}'s profile and all progress${cloud ? ' on every synced device' : ''}? This cannot be undone.`)) return;
      deleteProfile(p.id);
      go(getState().profiles.length ? '/' : '/profiles');
    } }, `Delete ${p.name}'s profile`)));
}

const stat = (label, value) => h('div', { class: 'stat' }, h('b', {}, value), h('small', {}, label));

function toggle(label, value, onchange) {
  const inp = h('input', { type: 'checkbox', checked: value ? true : null, onchange: e => onchange(e.target.checked) });
  return h('label', { class: 'toggle' }, inp, h('span', {}, label));
}

function gate() {
  const a = 12 + Math.floor(Math.random() * 8), b = 13 + Math.floor(Math.random() * 7);
  const main = screen({ title: 'Grown-ups', back: '#/' });
  const inp = h('input', { class: 'answer-input', inputmode: 'numeric', 'aria-label': 'answer' });
  const check = () => {
    if (Number(inp.value) === a * b) {
      unlockedUntil = Date.now() + 10 * 60e3;
      rerender();
    } else {
      inp.classList.add('shake');
      setTimeout(() => inp.classList.remove('shake'), 400);
    }
  };
  onEnter(inp, check);
  main.append(h('section', { class: 'card stack center' }, h('h2', {}, '👪 Grown-ups only'), h('p', {}, `To continue, solve: ${a} × ${b}`), h('div', { class: 'row center' }, inp, h('button', { class: 'btn', onclick: check }, 'Enter'))));
  inp.focus();
}
