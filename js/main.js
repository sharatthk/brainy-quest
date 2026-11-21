import { route, render } from './router.js';
import { profile, onChange } from './store.js';
import { currentStreak } from './shared/rewards.js';
import { viewHome, viewProfiles } from './views/home.js';
import { viewShop, viewTrophies } from './views/shop.js';
import { viewParent } from './views/parent.js';
import { viewMap, viewPlay } from './math/mathApp.js';
import { viewEnglishHome, viewLesson, viewQuiz, viewReview } from './english/englishApp.js';
import { viewSpellingHome, viewPractice, viewChallenge, viewWords, viewImport } from './spelling/spellingApp.js';

const needProfile = fn => params => {
  if (!profile()) {
    location.hash = '/profiles';
    return;
  }
  return fn(params);
};

route('/', needProfile(viewHome));
route('/profiles', viewProfiles);
route('/math', needProfile(viewMap));
route('/math/mix', needProfile(() => viewPlay({ mode: 'mix' })));
route('/math/gym', needProfile(() => viewPlay({ mode: 'gym' })));
route('/math/play/:mode/:skill', needProfile(viewPlay));
route('/english', needProfile(viewEnglishHome));
route('/english/unit/:id', needProfile(viewLesson));
route('/english/quiz/:id', needProfile(viewQuiz));
route('/english/review', needProfile(viewReview));
route('/spelling', needProfile(viewSpellingHome));
route('/spelling/practice/:list', needProfile(viewPractice));
route('/spelling/challenge/:list', needProfile(viewChallenge));
route('/spelling/words/:list', needProfile(viewWords));
route('/spelling/import', needProfile(viewImport));
route('/shop', needProfile(viewShop));
route('/trophies', needProfile(viewTrophies));
route('/parent', needProfile(viewParent));

let lastCoins = null;
function syncChrome() {
  const p = profile();
  document.documentElement.dataset.theme = p?.theme || 'sunny';
  const el = document.getElementById('coin-count');
  if (el && p && lastCoins !== p.coins) {
    el.textContent = p.coins;
    el.parentElement.classList.remove('bump');
    void el.offsetWidth;
    el.parentElement.classList.add('bump');
  }
  const st = document.getElementById('streak-count');
  if (st && p) st.textContent = currentStreak(p);
  lastCoins = p?.coins ?? null;
}
onChange(syncChrome);
syncChrome();
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
