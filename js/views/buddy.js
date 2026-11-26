// Buddy pet views: the face (with stage and gear), the home panel, session reactions and growing up.
import { h, modal, toast, onEnter } from '../ui.js';
import { profile, save } from '../store.js';
import { STAGES, ensureBuddy, buddyFood, stageFor, stageProgress, mood, reaction, gearSlot } from '../shared/buddy.js';
import { dayKey } from '../shared/util.js';
import { confetti } from '../shared/confetti.js';
import { sfx } from '../shared/sound.js';

// The buddy itself. size: 'sm' (sessions), 'md' (shop) or 'lg' (home, celebrations).
export function buddyFace(p, { size = 'lg', stage } = {}) {
  const b = ensureBuddy(p);
  const st = STAGES[stage ?? stageFor(buddyFood(p))];
  const gear = b.gear ? h('span', { class: `buddy-gear slot-${gearSlot(b.gear)}`, 'aria-hidden': 'true' }, b.gear) : null;
  return h('div', { class: `buddy buddy-${size} st-${st.id}`, role: 'img', 'aria-label': `${b.name} the ${st.name}` },
    h('span', { class: 'buddy-body' }, h('span', { class: 'buddy-pet' }, p.avatar), gear),
    st.id === 'egg' ? h('span', { class: 'buddy-egg', 'aria-hidden': 'true' }) : null,
    st.id === 'legend' ? h('span', { class: 'buddy-sparkle', 'aria-hidden': 'true' }, '✨') : null);
}

// Home hero piece: the buddy in a bubble with its stage badge.
export function heroBuddy(p) {
  const st = STAGES[stageFor(buddyFood(p))];
  return h('div', { class: `hero-buddy mood-${mood(p.buddy, dayKey())}` }, buddyFace(p), h('span', { class: `stage-badge st-${st.id}` }, st.name));
}

// Home strip: name (tap to rename), mood and the next-stage bar.
export function buddyStrip(p, onRename) {
  const b = ensureBuddy(p);
  const food = buddyFood(p);
  const pr = stageProgress(food);
  const happy = mood(b, dayKey()) === 'happy';
  return h('div', { class: 'buddy-strip' },
    h('div', { class: 'buddy-who' },
      h('button', { class: 'buddy-name', title: 'Rename your buddy', onclick: () => renameBuddy(onRename) }, b.name, h('span', { class: 'pen', 'aria-hidden': 'true' }, '✏️')),
      h('span', { class: `mood-chip ${happy ? 'happy' : 'hungry'}` }, happy ? '😊 Happy and full' : '😋 Hungry')),
    h('div', { class: 'buddy-grow' },
      h('div', { class: 'buddy-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': pr.need || 1, 'aria-valuenow': pr.next ? pr.into : 1 },
        h('div', { class: 'buddy-fill', style: { width: `${Math.round(pr.pct * 100)}%` } })),
      h('small', { class: 'muted' }, pr.next ? `🍎 ${pr.left} more to grow into a ${pr.next.name}` : `🌟 ${b.name} is a Legend!`)),
    h('p', { class: 'small muted buddy-tip' }, happy
      ? `Every star and finished session feeds ${b.name}.`
      : `Finish a session to feed ${b.name}!`));
}

function renameBuddy(after) {
  const b = ensureBuddy(profile());
  const input = h('input', { class: 'text-input', value: b.name, maxlength: 14, 'aria-label': 'Buddy name' });
  let close;
  const done = () => {
    const name = input.value.trim();
    if (!name) {
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 400);
      return input.focus();
    }
    b.name = name;
    save();
    close();
    sfx.click();
    after?.();
  };
  onEnter(input, done);
  close = modal(
    buddyFace(profile()),
    h('h2', {}, 'Name your buddy'),
    h('div', { class: 'stack' }, input, h('button', { class: 'btn big', onclick: done }, 'Save ✓')),
    h('button', { class: 'link-btn', onclick: () => close() }, 'Cancel'));
  input.focus();
  input.select();
}

// Small buddy in the session bar with a speech bubble. It never takes clicks.
export function sessionPal() {
  const p = profile();
  const bubble = h('span', { class: 'pal-bubble', 'aria-live': 'polite' });
  const face = buddyFace(p, { size: 'sm' });
  const el = h('div', { class: 'pal' }, face, bubble);
  let timer = 0;
  const say = ({ text, face: f }) => {
    bubble.textContent = text;
    el.classList.remove('show', 'cheer', 'oops', 'fire');
    void el.offsetWidth; // restart the pop animation
    el.classList.add('show', f);
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('show'), 2200);
  };
  setTimeout(() => say(reaction('start')), 350);
  return { el, react: (ok, streak) => say(reaction(ok ? 'right' : 'wrong', streak)) };
}

// After a session (or on home): if the buddy reached a new stage, celebrate it once.
// The party waits a moment so the results can land first; if the player has already left the
// screen (anchor gone), the stage is not marked as seen and the celebration shows on the next screen that asks.
export function celebrateGrowth(anchor, delay = 1400) {
  const p = profile();
  const b = ensureBuddy(p);
  const now = stageFor(buddyFood(p));
  if (now <= b.stage) return false;
  const st = STAGES[now];
  setTimeout(() => {
    if (!anchor?.isConnected || b.stage >= now || document.querySelector('.modal-back')) return;
    b.stage = now;
    save();
    sfx.fanfare();
    confetti({ count: 220 });
    let close;
    close = modal(
      h('div', { class: 'grow-show' }, buddyFace(p), h('span', { class: `stage-badge st-${st.id}` }, st.name)),
      h('h2', {}, `${b.name} grew into a ${st.name}!`),
      h('p', { class: 'muted' }, now === STAGES.length - 1 ? 'The very top! You are both legends. 🌟' : 'Keep learning to help your buddy grow even more.'),
      h('div', { class: 'stack' }, h('button', { class: 'btn big', onclick: () => close() }, 'Hooray! 🎉')));
  }, 1400);
  return true;
}

export function wearGear(emoji) {
  const p = profile();
  ensureBuddy(p).gear = emoji;
  save();
  toast(`${p.buddy.name} is wearing the ${emoji}!`, emoji);
}
