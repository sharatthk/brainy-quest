import { viewStickers } from './views/progressCards.js';
import { route, render } from './router.js';
import { profile, onChange } from './store.js';
import { currentStreak } from './shared/rewards.js';
import { viewHome, viewProfiles } from './views/home.js';
import { viewShop, viewTrophies } from './views/shop.js';
import { viewParent } from './views/parent.js';
import { viewMap, viewPlay } from './math/mathApp.js';
import { viewSpeedPicker, viewSpeedPlay } from './math/speed.js';
import { lessonViews } from './lessons/lessonApp.js';
import { SUBJECTS } from './lessons/subjects.js';
import { initSync } from './sync/sync.js';
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
route('/math/gaps', needProfile(() => viewPlay({ mode: 'gaps' })));
route('/math/play/:mode/:skill', needProfile(viewPlay));
route('/math/play/:mode/:skill/:tier', needProfile(viewPlay));
route('/math/speed', needProfile(viewSpeedPicker));
route('/math/speed/:topic/:secs', needProfile(viewSpeedPlay));
route('/math/speed/:topic/:secs/:tier', needProfile(viewSpeedPlay));
for (const subj of SUBJECTS) {
  const v = lessonViews(subj), b = `/${subj.id}`;
  route(b, needProfile(v.viewHome));
  route(`${b}/unit/:id`, needProfile(v.viewLesson));
  route(`${b}/quiz/:id`, needProfile(v.viewQuiz));
  route(`${b}/quiz/:id/:tier`, needProfile(v.viewQuiz));
  route(`${b}/review`, needProfile(v.viewReview));
}
route('/spelling', needProfile(viewSpellingHome));
route('/spelling/practice/:list', needProfile(viewPractice));
route('/spelling/practice/:list/:tier', needProfile(viewPractice));
route('/spelling/challenge/:list', needProfile(viewChallenge));
route('/spelling/challenge/:list/:tier', needProfile(viewChallenge));
route('/spelling/words/:list', needProfile(viewWords));
route('/spelling/import', needProfile(viewImport));
route('/shop', needProfile(viewShop));
route('/trophies', needProfile(viewTrophies));
route('/stickers', needProfile(viewStickers));
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
initSync();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
