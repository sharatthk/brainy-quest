// Spelling Bee: spaced-repetition practice, Bee Challenge (3 lives), word hive, list import.
import { h, modal, toast, onEnter, advanceDelay } from '../ui.js';
import { screen, sessionFrame, resultsView, cheer, praise, stars, starText, TIER_NAMES } from '../views/common.js';
import { profile, save, getState } from '../store.js';
import { BUILTIN_LISTS } from './words.js';
import { matchesWord, diffSpelling, parseWordList, blankWord, normalizeSpelling, splitTiers, challengeGoal } from './logic.js';
import { newCard, grade, isDue, cardStatus, currentTier } from '../shared/mastery.js';
import { award, recordAnswer, finishSession } from '../shared/rewards.js';
import { sfx } from '../shared/sound.js';
import { speak, speechSupported, stopSpeaking } from '../shared/speech.js';
import { shuffle, uid } from '../shared/util.js';
import { render as rerender } from '../router.js';

const SESSION = 10;
const MAX_NEW = 6;
const HINT_COST = 2;

export const allLists = () => [...BUILTIN_LISTS, ...getState().lists];
const listById = id => allLists().find(l => l.id === id);
const keyOf = w => normalizeSpelling(w);
const cardOf = w => profile().spelling.cards[keyOf(w)];

// ---------- Star tiers: every list splits into easy, medium and hard words ----------
const tierCache = new WeakMap();
const tiersOf = list => {
  if (!tierCache.has(list)) tierCache.set(list, splitTiers(list.words));
  return tierCache.get(list);
};
const listStars = (p, id) => (p.spelling.stars ||= {})[id] || 0;
// The tier from the URL (any tier with words), else the one the player is working on.
function tierFor(list, param) {
  const p = profile(), want = Number(param) || currentTier(listStars(p, list.id));
  const t = Math.min(3, Math.max(1, want));
  return tiersOf(list)[t - 1].length ? t : null;
}
const picked = {}; // tier the player tapped on each list card during this visit

function listStats(list) {
  const now = Date.now();
  const s = { new: 0, learning: 0, mastered: 0, due: 0 };
  for (const w of list.words) {
    const c = cardOf(w.w);
    s[cardStatus(c)]++;
    if (isDue(c, now)) s.due++;
  }
  return s;
}

// ---------- Definitions (built-in, or looked up online for imported words) ----------

// Built-in meanings win; anything missing (often the example sentence) is looked up once and cached.
const withInfo = (word, info) => ({ ...word, ...info, def: word.def || info.def, pos: word.pos || info.pos, sent: word.sent || info.sent });

async function wordInfo(word) {
  if (word.def && word.sent) return word;
  const defs = getState().defs;
  const k = keyOf(word.w);
  if (defs[k]) return withInfo(word, defs[k]);
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.w)}`);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    const e = data[0];
    const m = e?.meanings?.[0];
    const d = m?.definitions?.find(x => x.definition) || {};
    const info = { def: d.definition || '', pos: m?.partOfSpeech || '', sent: d.example || '', origin: e?.origin || '' };
    defs[k] = info;
    save();
    return withInfo(word, info);
  } catch {
    return word.def ? word : { ...word, def: '', missing: true };
  }
}

// ---------- Home ----------

export function viewSpellingHome() {
  const p = profile();
  const main = screen({ title: 'Spelling Bee', back: '#/' });
  main.append(
    h('div', { class: 'quest-head' },
      h('div', {}, h('h2', {}, 'Become a spelling champion'), h('p', { class: 'muted' }, `Best Bee Challenge streak: ${p.spelling.bestChallenge} 🏆`)),
      h('a', { class: 'btn alt', href: '#/spelling/import' }, '➕ Import word list')));
  if (!speechSupported()) main.append(h('p', { class: 'warn' }, 'This browser cannot speak words out loud. Try Chrome, Edge or Safari.'));
  const groups = new Map();
  for (const list of allLists()) {
    const g = list.group || 'My lists';
    if (!groups.has(g)) groups.set(g, h('div', { class: 'list-grid' }));
    const s = listStats(list);
    const total = list.words.length || 1;
    const got = listStars(p, list.id), tiers = tiersOf(list);
    // Default to the tier being worked on, so earning a star moves the card on to the next tier.
    let tier = picked[list.id] || currentTier(got);
    if (!tiers[tier - 1].length) tier = 1;
    const actions = h('div', { class: 'list-actions' });
    const drawActions = () => {
      const t = tier, now = Date.now();
      const due = tiers[t - 1].filter(w => isDue(cardOf(w.w), now)).length;
      actions.replaceChildren(
        h('a', { class: 'btn', href: `#/spelling/practice/${list.id}/${t}` }, due ? `📚 Practice (${due} due)` : '📚 Practice'),
        h('a', { class: 'btn alt', href: `#/spelling/challenge/${list.id}/${t}` }, '🎤 Bee Challenge'));
    };
    const pickRow = h('div', { class: 'tier-pick small-pick', role: 'group', 'aria-label': 'Word difficulty' }, tiers.map((words, k) => {
      const t = k + 1, can = words.length > 0;
      const b = h('button', { class: t === tier ? 'on' : '', disabled: can ? null : true,
        onclick: () => {
          tier = picked[list.id] = t;
          pickRow.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
          sfx.click();
          drawActions();
        } },
      h('span', { class: 'tier-stars' }, got >= t ? `${starText(t)} ✅` : starText(t)),
      h('small', {}, TIER_NAMES[k]), h('small', {}, `${words.length} words`));
      return b;
    }));
    drawActions();
    groups.get(g).append(h('div', { class: 'list-card card' },
      h('div', { class: 'list-head' }, h('span', { class: 'list-emoji' }, list.emoji || '📝'), h('div', {}, h('h3', {}, list.name), h('p', { class: 'muted small' }, `${list.words.length} words · `, h('a', { class: 'words-link', href: `#/spelling/words/${list.id}` }, '🍯 See all'))), stars(got)),
      h('div', { class: 'meter', title: `${s.mastered} mastered, ${s.learning} learning, ${s.new} new` },
        h('span', { class: 'm-mastered', style: { width: `${(s.mastered / total) * 100}%` } }),
        h('span', { class: 'm-learning', style: { width: `${(s.learning / total) * 100}%` } })),
      h('p', { class: 'small legend' }, h('span', { class: 'dot mastered' }), `${s.mastered} mastered `, h('span', { class: 'dot learning' }), `${s.learning} learning `, h('span', { class: 'dot new' }), `${s.new} new`),
      pickRow, actions,
      list.builtin ? null : h('button', { class: 'link-btn danger', onclick: () => {
        if (!confirm(`Delete the list "${list.name}"? Progress on the words is kept.`)) return;
        getState().lists = getState().lists.filter(l => l.id !== list.id);
        save();
        rerender();
      } }, 'Delete list')));
  }
  for (const [g, grid] of groups) main.append(h('section', { class: 'unit' }, h('h3', { class: 'unit-title' }, g), grid));
}

// ---------- Word card (shared by practice & challenge) ----------

function wordCard(word, { onResult, allowHints = true }) {
  const card = h('div', { class: 'q-card card spell-card' });
  const info = h('div', { class: 'word-info' });
  const hintRow = h('div', { class: 'hint-letters' });
  const input = h('input', { class: 'answer-input text spell-input', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': 'Type the spelling' });
  const fb = h('div', { class: 'feedback' });
  let full = word, hinted = 0, done = false;

  const say = (rate) => speak(word.w, rate ? { rate } : {});
  const showInfo = (label, text) => info.replaceChildren(h('p', {}, h('b', {}, `${label}: `), text));
  const tool = (emoji, label, fn) => h('button', { class: 'tool', onclick: fn }, h('span', {}, emoji), h('small', {}, label));

  const tools = h('div', { class: 'tools' },
    tool('🔁', 'Again', () => say()),
    tool('🐢', 'Slowly', () => say(0.5)),
    tool('📖', 'Meaning', async () => {
      info.replaceChildren(h('p', { class: 'muted' }, 'Looking it up…'));
      full = await wordInfo(word);
      if (!full.def) return showInfo('Meaning', 'No definition found. Ask a grown-up!');
      showInfo(`Meaning${full.pos ? ` (${full.pos})` : ''}`, blankWord(full.def, word.w));
      speak(full.def, { rate: 0.9 });
    }),
    tool('💬', 'Sentence', async () => {
      full = await wordInfo(word);
      if (!full.sent) return showInfo('Sentence', 'No example sentence for this word.');
      showInfo('Sentence', blankWord(full.sent, word.w));
      speak(full.sent, { rate: 0.9 });
    }),
    tool('🔤', 'Letters', () => showInfo('Letters', `${[...word.w].filter(ch => /\p{L}/u.test(ch)).length} letters`)),
    allowHints ? tool('💡', `Hint -${HINT_COST}🪙`, () => {
      const p = profile();
      if (hinted >= word.w.length - 1) return;
      if (p.coins < HINT_COST) return toast('Not enough coins for a hint', '🪙');
      p.coins -= HINT_COST;
      save();
      hinted++;
      hintRow.replaceChildren(...[...word.w].map((ch, i) => h('span', { class: i < hinted ? 'hl' : '' }, i < hinted ? ch : ch === ' ' ? ' ' : '_')));
    }) : null);

  const check = () => {
    if (done || !input.value.trim()) return;
    done = true;
    input.disabled = true;
    checkBtn.remove();
    const ok = matchesWord(input.value, word);
    input.classList.add(ok ? 'ok' : 'bad');
    onResult({ ok, hinted: hinted > 0, typed: input.value, fb, card, input });
  };
  onEnter(input, check);
  const checkBtn = h('button', { class: 'btn big', onclick: check }, 'Check ✓');

  card.append(...[
    h('button', { class: 'bee-btn', onclick: () => say(), 'aria-label': 'Hear the word' }, h('span', { class: 'bee' }, '🐝'), h('span', {}, 'Tap to hear the word')),
    word.pos ? h('p', { class: 'muted center small' }, word.pos) : null,
    tools, info, hintRow,
    h('div', { class: 'row center' }, input), h('div', { class: 'row center' }, checkBtn), fb].filter(Boolean));
  setTimeout(() => {
    say();
    input.focus();
  }, 350);
  return card;
}

function diffView(typed, target) {
  const d = diffSpelling(typed, target);
  return h('div', { class: 'diff' },
    h('div', { class: 'diff-row' }, h('small', {}, 'You wrote'), h('div', { class: 'letters' }, d.filter(x => x.op !== 'ins').map(x => h('span', { class: x.op === 'ok' ? 'l-ok' : 'l-bad' }, x.t)))),
    h('div', { class: 'diff-row' }, h('small', {}, 'Correct'), h('div', { class: 'letters' }, d.filter(x => x.op !== 'del').map(x => h('span', { class: x.op === 'ok' ? 'l-ok' : 'l-fix' }, x.c)))));
}

const spellOut = w => speak(`${w}. ${[...w].filter(ch => ch !== ' ').join(', ')}. ${w}.`, { rate: 0.8 });

// ---------- Practice ----------

export function viewPractice({ list: listId, tier: tierParam }) {
  const list = listById(listId);
  const tier = list && tierFor(list, tierParam);
  if (!tier) {
    location.hash = '/spelling';
    return;
  }
  const words = tiersOf(list)[tier - 1];
  const now = Date.now();
  const due = words.filter(w => isDue(cardOf(w.w), now)).sort((a, b) => cardOf(a.w).due - cardOf(b.w).due).slice(0, SESSION);
  // New words come from the front of the list (it is ordered by the publisher), mixed within a small window.
  const fresh = shuffle(words.filter(w => cardStatus(cardOf(w.w)) === 'new').slice(0, 25)).slice(0, Math.max(3, Math.min(MAX_NEW, SESSION - due.length)));
  let items = [...due, ...fresh].slice(0, SESSION);
  let extraNote = '';
  if (!items.length) {
    items = shuffle(words).slice(0, SESSION);
    extraNote = 'All caught up! Here is a bonus round of review words.';
  }
  items = shuffle(items).map(w => ({ word: w, retry: false }));

  const f = sessionFrame({ title: `${list.name} ${starText(tier)}`, back: '#/spelling' });
  let i = 0, correct = 0, firstTry = 0, combo = 0, coins = 0, xp = 0;
  const firstCount = items.length;
  if (extraNote) toast(extraNote, '🎉');

  function next() {
    f.setProgress(i, items.length);
    if (i >= items.length) return finish();
    const item = items[i];
    let advanced = false;
    const go = () => {
      if (advanced) return;
      advanced = true;
      i++;
      next();
    };
    const card = wordCard(item.word, {
      onResult: ({ ok, hinted, typed, fb, card: c }) => {
        const p = profile();
        const k = keyOf(item.word.w);
        if (!item.retry) {
          p.spelling.cards[k] = grade(p.spelling.cards[k] || newCard(), ok, { hinted });
          save();
        }
        if (ok) {
          correct++;
          if (!item.retry) firstTry++;
          combo++;
          const gain = (hinted ? 0 : 1) + (combo % 5 === 0 ? 2 : 0);
          coins += gain;
          xp += 3;
          award({ coins: gain, xp: 3 });
          cheer(c, gain, combo);
          fb.replaceChildren(h('div', { class: 'fb good' }, `✅ ${praise()} `, h('b', {}, item.word.w)));
          setTimeout(go, advanceDelay(1300));
        } else {
          combo = 0;
          sfx.wrong();
          if (!item.retry) items.push({ word: item.word, retry: true });
          const fix = h('input', { class: 'answer-input text spell-input', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', placeholder: 'Type it correctly', 'aria-label': 'Type the correct spelling' });
          const msg = h('p', { class: 'muted small' }, 'Type the correct spelling once to lock it into your memory.');
          onEnter(fix, () => {
            if (matchesWord(fix.value, item.word)) {
              sfx.click();
              go();
            } else {
              fix.classList.add('shake');
              setTimeout(() => fix.classList.remove('shake'), 400);
            }
          });
          fb.replaceChildren(h('div', { class: 'fb bad' },
            h('p', { class: 'fb-title' }, 'Almost! Look closely:'), diffView(typed, item.word.w),
            h('button', { class: 'link-btn', onclick: () => spellOut(item.word.w) }, '🔊 Spell it for me'),
            msg, h('div', { class: 'row center' }, fix)));
          spellOut(item.word.w);
          fix.focus();
        }
        recordAnswer(ok, combo);
        f.setCombo(combo);
        f.react(ok, combo);
      },
    });
    if (item.retry) card.prepend(h('div', { class: 'q-tag' }, '🔁 Second try'));
    f.stage.replaceChildren(card);
  }

  function finish() {
    const res = finishSession({ subject: 'spelling', correct: firstTry, total: firstCount });
    const s = listStats(list);
    resultsView(f.stage, {
      correct: firstTry, total: firstCount, coins: coins + res.bonusCoins, xp: xp + res.bonusXp, perfect: res.perfect, unlocked: res.unlocked,
      extra: [h('p', { class: 'muted' }, `${list.name}: ${s.mastered} mastered · ${s.learning} learning · ${s.new} new`)],
      again: () => rerender(), backHref: '#/spelling', backLabel: 'Word lists',
    });
  }

  next();
  return stopSpeaking;
}

// ---------- Bee Challenge ----------

export function viewChallenge({ list: listId, tier: tierParam }) {
  const list = listById(listId);
  const tier = list && tierFor(list, tierParam);
  if (!tier) {
    location.hash = '/spelling';
    return;
  }
  const f = sessionFrame({ title: `Bee Challenge ${starText(tier)}: ${list.name}`, back: '#/spelling' });
  const pool = shuffle(tiersOf(list)[tier - 1]);
  const goal = challengeGoal(pool.length);
  const starsBefore = listStars(profile(), list.id);
  let lives = 3, streak = 0, idx = 0, coins = 0, xp = 0, answered = 0, right = 0, earned = false;
  const livesEl = h('div', { class: 'lives' });
  const drawLives = () => livesEl.replaceChildren(...[0, 1, 2].map(k => h('span', { class: k < lives ? '' : 'lost' }, '❤️')),
    h('b', {}, earned ? ` ${starText(tier)} earned! Streak: ${streak}` : ` ${right}/${goal} for ${starText(tier)} · Streak: ${streak}`));

  function next() {
    if (lives <= 0 || idx >= pool.length) return finish();
    const word = pool[idx++];
    drawLives();
    if (earned) f.setProgress(streak % 10, 10);
    else f.setProgress(right, goal);
    let advanced = false;
    const go = () => {
      if (advanced) return;
      advanced = true;
      next();
    };
    const card = wordCard(word, {
      allowHints: false,
      onResult: ({ ok, typed, fb, card: c }) => {
        const p = profile();
        const k = keyOf(word.w);
        p.spelling.cards[k] = grade(p.spelling.cards[k] || newCard(), ok);
        answered++;
        if (ok) {
          streak++;
          right++;
          if (!earned && right >= goal) {
            earned = true;
            const st = (p.spelling.stars ||= {});
            st[list.id] = Math.max(st[list.id] || 0, tier);
            sfx.levelUp();
            toast(`${starText(tier)} earned! Keep going for a big streak.`, '🐝', 2400);
          }
          const gain = 1 + (streak % 5 === 0 ? 3 : 0);
          coins += gain;
          xp += 3;
          if (streak > p.spelling.bestChallenge) p.spelling.bestChallenge = streak;
          save();
          award({ coins: gain, xp: 3 });
          cheer(c, gain, streak);
          fb.replaceChildren(h('div', { class: 'fb good' }, `✅ Correct! `, h('b', {}, word.w)));
          setTimeout(go, advanceDelay(1100));
        } else {
          lives--;
          save();
          sfx.wrong();
          const btn = h('button', { class: 'btn big', onclick: go }, lives > 0 ? 'Next word ›' : 'See results');
          fb.replaceChildren(h('div', { class: 'fb bad' }, h('p', { class: 'fb-title' }, lives > 0 ? `Oops! ${lives} ${lives === 1 ? 'life' : 'lives'} left.` : 'Out of lives!'), diffView(typed, word.w), h('div', { class: 'row center' }, btn)));
          btn.focus();
        }
        recordAnswer(ok, streak);
        f.setCombo(streak);
        f.react(ok, streak);
        drawLives();
      },
    });
    f.stage.replaceChildren(livesEl, card);
  }

  function finish() {
    const p = profile();
    const res = finishSession({ subject: 'spelling', correct: streak, total: answered });
    resultsView(f.stage, {
      correct: answered - (3 - Math.max(lives, 0)), total: answered, coins: coins + res.bonusCoins, xp: xp + res.bonusXp, perfect: false, unlocked: res.unlocked,
      extra: [
        earned
          ? h('div', { class: 'star-up' }, h('p', {}, listStars(p, list.id) > starsBefore ? `${starText(tier)} earned!` : `You passed ${starText(tier)} again!`), stars(listStars(p, list.id)),
            tier < 3 && tiersOf(list)[tier].length ? h('a', { class: 'btn alt', href: `#/spelling/challenge/${list.id}/${tier + 1}` }, `Try ${starText(tier + 1)} ${TIER_NAMES[tier]} words ›`) : null)
          : h('div', { class: 'star-up miss' }, h('p', {}, `Spell ${goal} words right before you run out of lives to earn ${starText(tier)}. You got ${right}.`), stars(listStars(p, list.id))),
        h('p', { class: 'big-msg' }, `Final streak: ${streak} 🐝 · Best ever: ${p.spelling.bestChallenge} 🏆`)],
      again: () => rerender(), backHref: '#/spelling', backLabel: 'Word lists',
    });
  }

  next();
  return stopSpeaking;
}

// ---------- Word hive ----------

export function viewWords({ list: listId }) {
  const list = listById(listId);
  if (!list) {
    location.hash = '/spelling';
    return;
  }
  const main = screen({ title: list.name, back: '#/spelling' });
  const search = h('input', { class: 'search', type: 'search', placeholder: 'Search words…', 'aria-label': 'Search words' });
  const grid = h('div', { class: 'hive' });
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    grid.replaceChildren(...list.words.filter(w => !q || w.w.toLowerCase().includes(q)).map(w => {
      const st = cardStatus(cardOf(w.w));
      return h('button', { class: `hex ${st}`, onclick: () => showWord(w) }, w.w);
    }));
  };
  search.addEventListener('input', draw);
  main.append(h('p', { class: 'small legend' }, h('span', { class: 'dot mastered' }), 'mastered ', h('span', { class: 'dot learning' }), 'learning ', h('span', { class: 'dot new' }), 'new'), search, grid);
  draw();
  return stopSpeaking;
}

async function showWord(w) {
  const body = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Loading…'));
  modal(h('h2', { class: 'word-title' }, w.w), h('button', { class: 'btn', onclick: () => speak(w.w) }, '🔊 Hear it'), body);
  speak(w.w);
  const full = await wordInfo(w);
  const c = cardOf(w.w);
  body.replaceChildren(...[
    full.pos ? h('p', { class: 'muted' }, full.pos) : null,
    h('p', {}, full.def || 'No definition available.'),
    full.sent ? h('p', { class: 'example' }, `“${full.sent}”`) : null,
    full.origin ? h('p', { class: 'muted small' }, `Origin: ${full.origin}`) : null,
    c ? h('p', { class: 'muted small' }, `Spelled right ${c.right}× · wrong ${c.wrong}×`) : null].filter(Boolean));
}

// ---------- Import ----------

export function viewImport() {
  const main = screen({ title: 'Import word list', back: '#/spelling' });
  const name = h('input', { class: 'text-input', placeholder: 'List name, e.g. School Bee - Level 1', 'aria-label': 'List name' });
  const area = h('textarea', { class: 'text-area', rows: 12, placeholder: 'Paste words here. One word per line works best.\n\nOptional extras per line:\nword | definition | example sentence' });
  const file = h('input', { type: 'file', accept: '.txt,.csv,.tsv,text/plain', 'aria-label': 'Upload a text file' });
  const preview = h('p', { class: 'muted' }, '0 words found');
  const update = () => {
    const words = parseWordList(area.value);
    preview.textContent = `${words.length} words found${words.length ? `: ${words.slice(0, 8).map(w => w.w).join(', ')}${words.length > 8 ? '…' : ''}` : ''}`;
  };
  area.addEventListener('input', update);
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    area.value = await f.text();
    if (!name.value) name.value = f.name.replace(/\.\w+$/, '');
    update();
  });
  const saveBtn = h('button', { class: 'btn big', onclick: () => {
    const words = parseWordList(area.value);
    if (!words.length) return toast('Add some words first', '✋');
    const st = getState();
    st.lists.push({ id: `list-${uid()}`, name: name.value.trim() || `My list ${st.lists.length + 1}`, emoji: '📝', words });
    save();
    toast(`Saved ${words.length} words!`, '✅');
    location.hash = '/spelling';
  } }, '💾 Save list');
  main.append(h('div', { class: 'card stack' },
    h('p', {}, 'Add any word list - for example the official school spelling bee study list. Copy the words from the PDF and paste them below, or upload a text file. Big lists (thousands of words) are fine.'),
    h('p', { class: 'muted small' }, 'Words without a definition are looked up in a free online dictionary the first time they are needed.'),
    name, area, h('label', { class: 'file-label' }, '📄 Or upload a file: ', file), preview, saveBtn));
}
