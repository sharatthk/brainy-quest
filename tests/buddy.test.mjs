import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, GEAR, gearId, gearSlot, buddyFood, stageFor, stageProgress, mood, reaction, ensureBuddy, LINES, DEFAULT_NAME } from '../js/shared/buddy.js';
import { rollChest, ODDS } from '../js/shared/chest.js';
import { seeded } from '../js/shared/util.js';

const kid = (extra = {}) => ({
  math: { skills: { a: { stars: 2 }, b: { stars: 3 }, c: {} } },
  english: { units: { u: { stars: 1 } } },
  spelling: { stars: { l1: 2 } },
  ...extra,
});

test('buddy food counts every star plus finished sessions', () => {
  assert.equal(buddyFood(kid()), 8);
  assert.equal(buddyFood(kid({ buddy: { meals: 4 } })), 12);
  assert.equal(buddyFood({}), 0); // tolerates a profile missing everything
});

test('stages: thresholds and progress to the next stage', () => {
  assert.deepEqual(STAGES.map(s => s.at), [0, 3, 12, 30, 60]);
  const cases = [[0, 'egg'], [2, 'egg'], [3, 'baby'], [11, 'baby'], [12, 'kid'], [29, 'kid'], [30, 'hero'], [59, 'hero'], [60, 'legend'], [500, 'legend']];
  for (const [food, id] of cases) assert.equal(STAGES[stageFor(food)].id, id, `food ${food}`);
  assert.deepEqual(stageProgress(5), { stage: STAGES[1], next: STAGES[2], into: 2, need: 9, left: 7, pct: 2 / 9 });
  const top = stageProgress(80);
  assert.equal(top.next, null);
  assert.equal(top.pct, 1);
  for (let f = 0; f < 70; f++) {
    const p = stageProgress(f);
    assert.ok(p.pct >= 0 && p.pct <= 1);
  }
});

test('ensureBuddy fills missing fields without losing existing ones', () => {
  const p = kid({ buddy: { name: 'Zed', meals: 5 } });
  const b = ensureBuddy(p);
  assert.equal(b.name, 'Zed');
  assert.equal(b.meals, 5);
  assert.equal(b.gear, null);
  assert.equal(b.stage, stageFor(13)); // existing players start at their current stage, no fake celebration
  const fresh = ensureBuddy({});
  assert.equal(fresh.name, DEFAULT_NAME);
  assert.equal(fresh.stage, 0);
});

test('mood: happy once a session was finished today', () => {
  assert.equal(mood({ fedDay: '2026-11-26' }, '2026-11-26'), 'happy');
  assert.equal(mood({ fedDay: '2026-11-25' }, '2026-11-26'), 'hungry');
  assert.equal(mood(undefined, '2026-11-26'), 'hungry');
});

test('reactions are short, varied and kind', () => {
  const rng = seeded(3);
  assert.ok(LINES.wrong.includes(reaction('wrong', 0, rng).text));
  assert.ok(LINES.right.includes(reaction('right', 1, rng).text));
  assert.ok(LINES.streak.includes(reaction('right', 4, rng).text));
  assert.equal(reaction('right', 10, rng).text, "You're on fire!");
  assert.equal(reaction('wrong', 0, rng).face, 'oops');
  const seen = new Set(Array.from({ length: 50 }, () => reaction('right', 1, rng).text));
  assert.ok(seen.size >= 4);
  for (const line of Object.values(LINES).flat()) {
    assert.ok(line.length <= 24, `short enough for the bubble: ${line}`);
    assert.ok(!line.includes(String.fromCharCode(0x2014)), 'no em dash');
  }
});

test('gear list: unique, priced 40-200, with a slot', () => {
  assert.equal(new Set(GEAR.map(g => g[0])).size, GEAR.length);
  for (const [e, , price] of GEAR) {
    assert.ok(price >= 40 && price <= 200);
    assert.ok(['hat', 'eyes', 'side'].includes(gearSlot(e)));
  }
});

test('chest: odds look right and gear is never one you own', () => {
  const rng = seeded(7);
  const n = 20000;
  const owned = [gearId('🎩'), gearId('👑')];
  const count = { coins: 0, xp: 0, gear: 0 };
  for (let i = 0; i < n; i++) {
    const r = rollChest(rng, owned);
    count[r.type]++;
    if (r.type === 'coins') assert.ok(r.coins >= 5 && r.coins <= 25);
    if (r.type === 'xp') assert.ok(r.xp >= 10 && r.xp <= 30);
    if (r.type === 'gear') {
      assert.ok(!owned.includes(r.id));
      assert.equal(r.id, gearId(r.emoji));
    }
  }
  assert.ok(Math.abs(count.gear / n - ODDS.gear) < 0.015, `gear ${count.gear / n}`);
  assert.ok(Math.abs(count.xp / n - ODDS.xp) < 0.02, `xp ${count.xp / n}`);
  assert.ok(count.coins > count.xp && count.xp > count.gear);
});

test('chest: falls back to coins when every gear item is owned', () => {
  const all = GEAR.map(([e]) => gearId(e));
  const rng = seeded(11);
  for (let i = 0; i < 2000; i++) assert.notEqual(rollChest(rng, all).type, 'gear');
  // A roll that would be gear becomes coins.
  const r = rollChest(() => 0, all);
  assert.equal(r.type, 'coins');
  assert.ok(r.coins >= 5);
  // With one item left, a gear roll always gives that one.
  assert.equal(rollChest(() => 0.01, all.slice(1)).emoji, GEAR[0][0]);
});
