// Optional cloud sync with Firebase (Google sign-in + Firestore).
// Local storage stays the source of truth for the app; this module mirrors each
// profile and imported word list to users/{uid}/{profiles|lists}/{id} and merges
// changes from other devices with a three-way merge (see merge.js).
import { firebaseConfig } from './firebase-config.js';
import { plan, preferProfile, combineProfile } from './merge.js';
import { getState, onChange, save, migrate } from '../store.js';
import { render } from '../router.js';
import { toast } from '../ui.js';

const CDN = 'https://www.gstatic.com/firebasejs/12.6.0';
const MENU_ROUTES = ['/', '/profiles', '/math', '/english', '/spelling', '/shop', '/trophies', '/parent'];
const MAX_DOC = 900_000; // Firestore documents are limited to 1 MiB.
const KINDS = {
  profiles: { items: () => getState().profiles, prefer: preferProfile, combine: combineProfile },
  lists: { items: () => getState().lists, prefer: undefined },
};

export const syncAvailable = !!firebaseConfig;

const status = { state: syncAvailable ? 'loading' : 'off', user: null, error: '' };
const statusListeners = new Set();
export const syncStatus = () => status;
export const onSyncStatus = fn => (statusListeners.add(fn), () => statusListeners.delete(fn));
function setStatus(patch) {
  Object.assign(status, patch);
  statusListeners.forEach(f => f(status));
}

let fb = null; // loaded SDK pieces
let session = null; // per signed-in user

async function sdk() {
  if (fb) return fb;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-auth.js`), import(`${CDN}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  fb = { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
  // Firebase convention: "demo-*" projects talk to the local emulators (for testing).
  if (firebaseConfig.projectId.startsWith('demo-')) {
    authMod.connectAuthEmulator(fb.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    fsMod.connectFirestoreEmulator(fb.db, '127.0.0.1', 8080);
  }
  return fb;
}

export async function initSync() {
  if (!syncAvailable) return;
  try {
    const { auth, authMod } = await sdk();
    authMod.onAuthStateChanged(auth, user => (user ? start(user) : stop()));
  } catch {
    setStatus({ state: 'offline', error: 'Could not reach the cloud. Progress is still saved on this device.' });
  }
  onChange(schedule);
  window.addEventListener('online', schedule);
}

export async function signIn() {
  try {
    const { auth, authMod } = await sdk();
    await authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider());
  } catch (e) {
    if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
      toast(`Sign-in failed: ${e?.code || e?.message || e}`, '⚠️', 5000);
    }
  }
}

export async function signOut() {
  const { auth, authMod } = await sdk();
  await authMod.signOut(auth);
}

// --- session ---------------------------------------------------------------

function start(user) {
  teardown();
  const baseKey = `brainyquest.sync.${user.uid}`;
  let base;
  try {
    base = JSON.parse(localStorage.getItem(baseKey)) || {};
  } catch {
    base = {};
  }
  session = { uid: user.uid, baseKey, base: { profiles: base.profiles || {}, lists: base.lists || {} }, remote: { profiles: null, lists: null }, unsubs: [], timer: 0, firstPull: true };
  setStatus({ state: 'syncing', user: { name: user.displayName, email: user.email }, error: '' });
  const { db, fsMod } = fb;
  for (const kind of Object.keys(KINDS)) {
    const s = session;
    s.unsubs.push(fsMod.onSnapshot(fsMod.collection(db, 'users', user.uid, kind), snap => {
      if (session !== s) return;
      s.remote[kind] = Object.fromEntries(snap.docs.map(d => [d.id, d.data().deleted ? null : d.data().json]));
      reconcile();
    }, err => setStatus({ state: 'error', error: err.code === 'permission-denied' ? 'Cloud access denied. Check firestore.rules.' : err.message })));
  }
}

function teardown() {
  if (session) {
    session.unsubs.forEach(u => u());
    clearTimeout(session.timer);
  }
  session = null;
}

function stop() {
  teardown();
  setStatus({ state: syncAvailable ? 'signed-out' : 'off', user: null });
}

function schedule() {
  if (!session) return;
  clearTimeout(session.timer);
  session.timer = setTimeout(reconcile, 1500);
}

function persistBase() {
  localStorage.setItem(session.baseKey, JSON.stringify(session.base));
}

let running = false;
let again = false;
async function reconcile() {
  if (!session || session.remote.profiles === null || session.remote.lists === null) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  const s = session;
  const { db, fsMod } = fb;
  let pulled = 0;
  let problem = '';
  try {
    const writes = [];
    for (const [kind, cfg] of Object.entries(KINDS)) {
      for (const a of plan(cfg.items(), s.remote[kind], s.base[kind], cfg.prefer, cfg.combine)) {
        const ref = fsMod.doc(db, 'users', s.uid, kind, a.id);
        if (a.action === 'none') {
          if (a.local === null) delete s.base[kind][a.id];
          else s.base[kind][a.id] = a.local;
        } else if (a.action === 'pull') {
          applyLocal(kind, a.id, JSON.parse(a.remote));
          s.base[kind][a.id] = a.remote;
          pulled++;
        } else if (a.action === 'delete-local') {
          applyLocal(kind, a.id, null);
          delete s.base[kind][a.id];
          pulled++;
        } else if (a.action === 'merge') {
          // Both devices changed it: keep the merged copy here and send it up.
          applyLocal(kind, a.id, JSON.parse(a.merged));
          pulled++;
          writes.push(fsMod.setDoc(ref, { json: a.merged, deleted: false, name: JSON.parse(a.merged).name || '', updatedAt: fsMod.serverTimestamp() })
            .then(() => { s.base[kind][a.id] = a.merged; }));
        } else if (a.action === 'push') {
          if (a.local.length > MAX_DOC) {
            problem = `"${JSON.parse(a.local).name}" is too large to sync. Split it into smaller lists.`;
            continue;
          }
          writes.push(fsMod.setDoc(ref, { json: a.local, deleted: false, name: JSON.parse(a.local).name || '', updatedAt: fsMod.serverTimestamp() })
            .then(() => { s.base[kind][a.id] = a.local; }));
        } else if (a.action === 'delete-remote') {
          writes.push(fsMod.setDoc(ref, { json: '', deleted: true, updatedAt: fsMod.serverTimestamp() })
            .then(() => { delete s.base[kind][a.id]; }));
        }
      }
    }
    if (pulled) finishPull(s.firstPull);
    s.firstPull = false;
    if (writes.length) setStatus({ state: 'syncing' });
    await Promise.all(writes);
    if (session === s) {
      persistBase();
      setStatus(problem ? { state: 'error', error: problem } : { state: 'synced', lastSync: Date.now(), error: '' });
    }
  } catch (e) {
    if (session === s) setStatus({ state: navigator.onLine ? 'error' : 'offline', error: navigator.onLine ? e.message : '' });
  } finally {
    running = false;
    if (again) {
      again = false;
      reconcile();
    }
  }
}

// Write a cloud copy into local state. Profiles are updated in place so that a
// screen holding a reference to the current profile keeps working.
function applyLocal(kind, id, value) {
  const arr = getState()[kind];
  const i = arr.findIndex(x => x.id === id);
  if (value === null) {
    if (i >= 0) arr.splice(i, 1);
    return;
  }
  if (kind === 'profiles') migrate(value);
  if (i < 0) arr.push(value);
  else {
    for (const k of Object.keys(arr[i])) delete arr[i][k];
    Object.assign(arr[i], value);
  }
}

function finishPull(first) {
  const st = getState();
  if (!st.profiles.some(p => p.id === st.currentId)) st.currentId = st.profiles[0]?.id || null;
  save();
  if (first) toast('Progress synced from the cloud', '☁️');
  // Refresh menu screens only; never interrupt a quiz or a half-typed form.
  const path = location.hash.slice(1) || '/';
  if (MENU_ROUTES.includes(path)) render();
}
