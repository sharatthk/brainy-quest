// Pure three-way merge for cloud sync. No timestamps or clocks are involved.
// For each item (a profile or a word list) we compare three JSON snapshots:
//   local  - what this device has now (null if missing)
//   remote - what the cloud has now (null if missing or deleted)
//   base   - what both sides agreed on at the last successful sync (null if never synced)
// Whichever side differs from base has changed. If both changed, `prefer` breaks the tie.

// Returns one of: 'none' | 'push' | 'pull' | 'delete-local' | 'delete-remote'.
export function decide(local, remote, base, prefer = () => 'remote') {
  if (local === remote) return 'none';
  const localChanged = local !== base;
  const remoteChanged = remote !== base;
  if (!remoteChanged) return local === null ? 'delete-remote' : 'push';
  if (!localChanged) return remote === null ? 'delete-local' : 'pull';
  // Both sides changed. Never lose progress to a deletion.
  if (local === null) return 'pull';
  if (remote === null) return 'push';
  return prefer(local, remote) === 'local' ? 'push' : 'pull';
}

// Profiles: the copy with more progress wins (XP only grows, answers break ties).
export function preferProfile(localJson, remoteJson) {
  const score = j => {
    const p = JSON.parse(j);
    return [p.xp || 0, p.stats?.answered || 0];
  };
  const [lx, la] = score(localJson);
  const [rx, ra] = score(remoteJson);
  return lx > rx || (lx === rx && la > ra) ? 'local' : 'remote';
}

// The per-day activity log (p.days) adds up on every device, so a conflict keeps both sides' work:
// each count is local + remote - base, and stars are the union. Days missing on a side count as 0.
export function mergeDays(local = {}, remote = {}, base = {}) {
  const out = {};
  for (const day of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const L = local[day] || {}, R = remote[day] || {}, B = base[day] || {};
    const n = f => Math.max(0, (L[f] || 0) + (R[f] || 0) - (B[f] || 0));
    const seen = new Set(), stars = [];
    for (const st of [...(L.stars || []), ...(R.stars || [])]) {
      const k = JSON.stringify(st);
      if (!seen.has(k)) seen.add(k) && stars.push(st);
    }
    out[day] = { answered: n('answered'), correct: n('correct'), xp: n('xp'), stars };
  }
  return out;
}

// Profiles: when both sides changed, the preferred copy wins but keeps both sides' activity log.
export function combineProfile(winnerJson, loserJson, baseJson) {
  const w = JSON.parse(winnerJson), l = JSON.parse(loserJson), b = baseJson ? JSON.parse(baseJson) : {};
  if (!w.days && !l.days) return winnerJson;
  return JSON.stringify({ ...w, days: mergeDays(w.days, l.days, b.days) });
}

// Plan actions for a whole collection.
// localItems: array of objects with an id. remoteMap / baseMap: { id: json | null }.
// combine(winner, loser, base) -> json: optional; on a two-sided change it can fold the losing side in,
// giving the action 'merge' (apply `merged` here and push it).
export function plan(localItems, remoteMap, baseMap, prefer, combine = null) {
  const localMap = Object.fromEntries(localItems.map(it => [it.id, JSON.stringify(it)]));
  const ids = new Set([...Object.keys(localMap), ...Object.keys(remoteMap), ...Object.keys(baseMap)]);
  const actions = [];
  for (const id of ids) {
    const local = localMap[id] ?? null;
    const remote = remoteMap[id] ?? null;
    const base = baseMap[id] ?? null;
    let action = decide(local, remote, base, prefer);
    let merged = null;
    if (combine && local !== null && remote !== null && local !== base && remote !== base && (action === 'push' || action === 'pull')) {
      merged = action === 'push' ? combine(local, remote, base) : combine(remote, local, base);
      if (merged === remote) action = 'pull';
      else if (merged === local) action = 'push';
      else action = 'merge';
    }
    actions.push({ id, action, local, remote, merged });
  }
  return actions;
}
