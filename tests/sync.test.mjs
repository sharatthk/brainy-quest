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
