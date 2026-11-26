// Hash router. Handlers may return a cleanup function.
const routes = [];
let cleanup = null;

export function route(pattern, handler) {
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`);
  routes.push({ re, handler });
}

export function go(path) {
  if (location.hash === `#${path}`) render();
  else location.hash = path;
}

export function render() {
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  document.querySelectorAll('.modal-back').forEach(m => m.remove()); // a popup never outlives its screen
  const path = location.hash.slice(1) || '/';
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) {
      const params = Object.fromEntries(Object.entries(m.groups || {}).map(([k, v]) => [k, decodeURIComponent(v)]));
      cleanup = r.handler(params);
      return;
    }
  }
  go('/');
}

window.addEventListener('hashchange', render);
