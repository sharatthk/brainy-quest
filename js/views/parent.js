// Grown-ups corner: progress report, trouble spots, settings, backup.
import { h, toast } from '../ui.js';
import { screen, stars } from './common.js';
import { profile, save, getState, exportData, importData, deleteProfile } from '../store.js';
import { SKILLS, UNITS } from '../math/skills.js';
import { ENGLISH_UNITS } from '../english/content.js';
import { recentAccuracy, cardStatus } from '../shared/mastery.js';
import { englishVoices, speak, speechSupported } from '../shared/speech.js';
import { levelOf, currentStreak } from '../shared/rewards.js';
import { allLists } from '../spelling/spellingApp.js';
import { normalizeSpelling } from '../spelling/logic.js';
import { render as rerender, go } from '../router.js';

let unlockedUntil = 0;
const ERROR_LABELS = {
  'forgot-carry': 'Forgets to carry',
  'flip-subtract': 'Subtracts smaller from bigger instead of borrowing',
  'forgot-decrement': 'Borrows but forgets to reduce the next digit',
  'forgot-zero': 'Forgets the placeholder zero in 2-digit multiplication',
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

  // English
  main.append(h('section', { class: 'card' }, h('h3', {}, '📚 English units'),
    h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Unit'), h('th', {}, 'Stars'), h('th', {}, 'Best score'), h('th', {}, 'Quizzes'))),
      h('tbody', {}, ENGLISH_UNITS.map(u => {
        const r = p.english.units[u.id];
        return h('tr', {}, h('td', {}, `${u.emoji} ${u.title}`), h('td', {}, stars(r?.stars || 0)), h('td', {}, r ? `${Math.round(r.best * 100)}%` : '-'), h('td', {}, r?.attempts || 0));
      }))))));

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
  main.append(h('section', { class: 'card stack' }, h('h3', {}, '⚙️ Settings'),
    toggle('Unlock every math skill (skip the star requirement)', p.settings.unlockAll, v => { p.settings.unlockAll = v; save(); }),
    toggle('Sound effects', p.settings.sound, v => { p.settings.sound = v; save(); }),
    h('label', { class: 'field' }, 'Daily goal ', goalSel),
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
  main.append(h('section', { class: 'card stack' }, h('h3', {}, '💾 Data'),
    h('p', { class: 'muted small' }, 'Progress is saved in this browser only. Download a backup to move it to another device.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn alt', onclick: () => {
        const a = h('a', { href: URL.createObjectURL(new Blob([exportData()], { type: 'application/json' })), download: `brainy-quest-backup-${new Date().toISOString().slice(0, 10)}.json` });
        a.click();
        URL.revokeObjectURL(a.href);
      } }, '⬇️ Download backup'),
      h('label', { class: 'btn alt file-btn' }, '⬆️ Restore backup', file)),
    h('button', { class: 'link-btn danger', onclick: () => {
      if (!confirm(`Delete ${p.name}'s profile and all progress? This cannot be undone.`)) return;
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
  inp.addEventListener('keydown', e => e.key === 'Enter' && check());
  main.append(h('section', { class: 'card stack center' }, h('h2', {}, '👪 Grown-ups only'), h('p', {}, `To continue, solve: ${a} × ${b}`), h('div', { class: 'row center' }, inp, h('button', { class: 'btn', onclick: check }, 'Enter'))));
  inp.focus();
}
