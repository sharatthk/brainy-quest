import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, plan, preferProfile } from '../js/sync/merge.js';

const P = (xp, answered = 0) => JSON.stringify({ id: 'a', name: 'Kid', xp, stats: { answered } });

test('decide: one side changed', () => {
  assert.equal(decide('x', 'x', null), 'none');
  assert.equal(decide('new', 'old', 'old'), 'push');
  assert.equal(decide('old', 'new', 'old'), 'pull');
  assert.equal(decide(null, 'old', 'old'), 'delete-remote');
  assert.equal(decide('old', null, 'old'), 'delete-local');
  assert.equal(decide('x', null, null), 'push'); // first sync of a local item
  assert.equal(decide(null, 'x', null), 'pull'); // item created on another device
});

test('decide: both changed, progress beats deletion and prefer breaks ties', () => {
  assert.equal(decide(null, 'r', 'b'), 'pull');
  assert.equal(decide('l', null, 'b'), 'push');
  assert.equal(decide('l', 'r', 'b'), 'pull');
  assert.equal(decide('l', 'r', 'b', () => 'local'), 'push');
  assert.equal(decide(P(50), P(80), P(10), preferProfile), 'pull');
  assert.equal(decide(P(90), P(80), P(10), preferProfile), 'push');
  assert.equal(decide(P(80, 7), P(80, 5), P(10), preferProfile), 'push');
});

test('plan covers local, remote and base ids and converges after applying', () => {
  const local = [{ id: 'a', v: 2 }, { id: 'c', v: 1 }, { id: 'd' }];
  const remote = { a: JSON.stringify({ id: 'a', v: 1 }), b: JSON.stringify({ id: 'b', v: 1 }), d: null };
  const base = { a: JSON.stringify({ id: 'a', v: 1 }), d: JSON.stringify({ id: 'd' }) };
  const byId = Object.fromEntries(plan(local, remote, base).map(x => [x.id, x.action]));
  assert.deepEqual(byId, { a: 'push', c: 'push', b: 'pull', d: 'delete-local' });

  // Apply the plan, then planning again is a no-op on both sides.
  const nextLocal = [local[0], local[1], JSON.parse(remote.b)];
  const synced = Object.fromEntries(nextLocal.map(x => [x.id, JSON.stringify(x)]));
  assert.ok(plan(nextLocal, synced, synced).every(x => x.action === 'none'));
});

test('activity logs from two devices add up instead of one side winning', async () => {
  const { mergeDays, combineProfile, plan, preferProfile } = await import('../js/sync/merge.js');
  const base = { '2026-11-28': { answered: 10, correct: 8, xp: 20, stars: [] } };
  const tablet = { '2026-11-28': { answered: 15, correct: 12, xp: 30, stars: [['math', 'add-2d-c', 2]] } };
  const laptop = { '2026-11-28': { answered: 14, correct: 9, xp: 26, stars: [['english', 'nouns', 1]] }, '2026-11-27': { answered: 3, correct: 3, xp: 6, stars: [] } };
  const m = mergeDays(tablet, laptop, base);
  assert.deepEqual(m['2026-11-28'], { answered: 19, correct: 13, xp: 36, stars: [['math', 'add-2d-c', 2], ['english', 'nouns', 1]] });
  assert.equal(m['2026-11-27'].answered, 3);
  const P = (xp, days) => JSON.stringify({ id: 'p1', name: 'Ava', xp, stats: { answered: xp }, days });
  const acts = plan([JSON.parse(P(50, tablet))], { p1: P(40, laptop) }, { p1: P(30, base) }, preferProfile, combineProfile);
  assert.equal(acts[0].action, 'merge');
  const merged = JSON.parse(acts[0].merged);
  assert.equal(merged.xp, 50, 'the copy with more progress still wins');
  assert.equal(merged.days['2026-11-28'].answered, 19, "but keeps both devices' answers");
  // Without activity logs the plan is unchanged.
  assert.equal(plan([{ id: 'p1', xp: 50 }], { p1: JSON.stringify({ id: 'p1', xp: 40 }) }, { p1: JSON.stringify({ id: 'p1', xp: 30 }) }, preferProfile, combineProfile)[0].action, 'push');
});
