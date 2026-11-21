// Cloud sync card: sign in with Google, see sync status, sign out.
import { h } from '../ui.js';
import { syncAvailable, syncStatus, onSyncStatus, signIn, signOut } from '../sync/sync.js';

const LABELS = {
  loading: '⏳ Connecting…',
  'signed-out': 'Not signed in',
  syncing: '🔄 Syncing…',
  synced: '✅ Synced',
  offline: '📴 Offline - will sync when back online',
  error: '⚠️ Sync problem',
};

// compact: the short version for the player picker on a new device.
export function syncCard({ compact = false } = {}) {
  if (!syncAvailable) return null;
  const el = h('section', { class: `card stack sync-card${compact ? ' compact' : ''}` });
  const draw = s => {
    const signedIn = !!s.user;
    el.hidden = compact && signedIn;
    if (el.hidden) return;
    el.replaceChildren(...[
      h('h3', {}, '☁️ Cloud sync'),
      compact
        ? h('p', { class: 'muted small' }, 'Played on another device? Sign in to bring your players and progress here.')
        : h('p', { class: 'muted small' }, signedIn
          ? `Signed in as ${s.user.email}. Every player and imported word list is saved to the cloud and kept in sync on every device signed in to this account.`
          : 'Sign in with a grown-up\'s Google account to back up progress and use it on other laptops, tablets and phones.'),
      compact ? null : h('p', { class: 'small' }, h('b', {}, LABELS[s.state] || ''), s.state === 'synced' && s.lastSync ? ` at ${new Date(s.lastSync).toLocaleTimeString()}` : ''),
      s.error ? h('p', { class: 'warn small' }, s.error) : null,
      signedIn
        ? h('button', { class: 'btn alt', onclick: signOut }, 'Sign out')
        : h('button', { class: 'btn', disabled: s.state === 'loading' ? true : null, onclick: signIn }, 'Sign in with Google'),
    ].filter(Boolean));
  };
  draw(syncStatus());
  const off = onSyncStatus(s => (el.isConnected ? draw(s) : off()));
  return el;
}
