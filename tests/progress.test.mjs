import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGES, ALL_STICKERS, ensureStickers, giveStickers, stickersForStars, completePages } from '../js/shared/stickers.js';
import { QUESTS, pickQuests, ensureQuests, questEvent, questText } from '../js/shared/quests.js';
import { seeded } from '../js/shared/util.js';

const player = () => ({ id: 'p1', math: { skills: {} }, english: { units: {} }, spelling: { stars: {} } });

test('sticker pages are unique and well formed', () => {
  assert.equal(new Set(ALL_STICKERS).size, ALL_STICKERS.length, 'no sticker on two pages');
  for (const pg of PAGES) assert.equal(pg.stickers.length, 12, pg.id);
});

test('one new sticker per star, never a duplicate, and full pages pay once', () => {
  const rng = seeded(5), p = player();
  assert.deepEqual(stickersForStars(p, rng), [], 'no stars, no stickers');
  p.math.skills.a = { stars: 2 };
  p.english.units.b = { stars: 1 };
  assert.equal(stickersForStars(p, rng).length, 3);
  assert.equal(stickersForStars(p, rng).length, 0, 'the same stars never pay twice');
  p.spelling.stars.c = 3;
  assert.equal(stickersForStars(p, rng).length, 3);
  const s = ensureStickers(p);
  assert.equal(new Set(s.owned).size, s.owned.length);
  s.owned = [...PAGES[0].stickers];
  assert.deepEqual(completePages(p).map(pg => pg.id), ['animals']);
  assert.deepEqual(completePages(p), [], 'a page pays only once');
  assert.equal(giveStickers(p, 999, rng).length, ALL_STICKERS.length - 12, 'stops when every sticker is owned');
});

test('daily quests: stable per day, varied, and completed by events', () => {
  const a = pickQuests('2026-11-26', 'p1');
  assert.deepEqual(a, pickQuests('2026-11-26', 'p1'), 'same quests all day');
  assert.equal(a.length, 3);
  assert.equal(new Set(a.map(q => q.id)).size, 3);
  for (let d = 1; d <= 28; d++) {
    const qs = pickQuests(`2026-02-${String(d).padStart(2, '0')}`, 'p1');
    assert.ok(qs.filter(q => QUESTS.find(x => x.id === q.id).subject).length <= 1, 'at most one subject quest');
  }
  const p = player();
  const qs = ensureQuests(p, 'D');
  qs.list = [{ id: 'right', goal: 15, progress: 0, done: false }, { id: 'combo', goal: 5, progress: 0, done: false }, { id: 'stars', goal: 1, progress: 0, done: false }];
  assert.equal(questText(qs.list[0]), 'Get 15 answers right');
  assert.equal(questEvent(p, 'D', { type: 'session', subject: 'math', correct: 10 }).done.length, 0);
  const r1 = questEvent(p, 'D', { type: 'session', subject: 'english', correct: 6 });
  assert.deepEqual(r1.done.map(q => q.id), ['right']);
  questEvent(p, 'D', { type: 'combo', combo: 3 });
  assert.equal(questEvent(p, 'D', { type: 'combo', combo: 5 }).done[0].id, 'combo');
  p.math.skills.x = { stars: 1 };
  const r3 = questEvent(p, 'D', { type: 'stars' });
  assert.ok(r3.done[0].id === 'stars' && r3.allDone, 'all three done gives the bonus');
  assert.ok(!questEvent(p, 'D', { type: 'stars' }).allDone, 'bonus only once');
  ensureQuests(p, 'E');
  assert.ok(p.quests.list.every(q => !q.done), 'a new day brings new quests');
});

test('quest goals follow the player grade', () => {
  const day = '2026-11-27';
  const small = pickQuests(day, 'p1', 1), big = pickQuests(day, 'p1', 8);
  assert.deepEqual(small.map(q => q.id), big.map(q => q.id), 'same quests, different sizes');
  for (const [a, b] of small.map((q, i) => [q, big[i]])) {
    const def = QUESTS.find(x => x.id === a.id);
    assert.equal(a.goal, def.goals[0]);
    assert.equal(b.goal, def.goals[def.goals.length - 1]);
  }
});
