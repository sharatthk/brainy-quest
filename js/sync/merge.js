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

// Plan actions for a whole collection.
// localItems: array of objects with an id. remoteMap / baseMap: { id: json | null }.
export function plan(localItems, remoteMap, baseMap, prefer) {
  const localMap = Object.fromEntries(localItems.map(it => [it.id, JSON.stringify(it)]));
  const ids = new Set([...Object.keys(localMap), ...Object.keys(remoteMap), ...Object.keys(baseMap)]);
  const actions = [];
  for (const id of ids) {
    const local = localMap[id] ?? null;
    const remote = remoteMap[id] ?? null;
    const base = baseMap[id] ?? null;
    const action = decide(local, remote, base, prefer);
    actions.push({ id, action, local, remote });
  }
  return actions;
}
