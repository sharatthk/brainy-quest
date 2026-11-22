// Synthesized sound effects (no audio files needed).
import { profile } from '../store.js';

let ctx;
function ac() {
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', gain = 0.12) {
  const c = ac();
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

const on = () => profile()?.settings.sound !== false;
const play = fn => () => {
  if (!on()) return;
  try { fn(); } catch { /* audio unavailable */ }
};

export const sfx = {
  correct: play(() => { tone(660, 0, 0.12); tone(990, 0.09, 0.2); }),
  wrong: play(() => { tone(250, 0, 0.18, 'triangle', 0.1); tone(200, 0.12, 0.25, 'triangle', 0.1); }),
  coin: play(() => { tone(988, 0, 0.07, 'square', 0.04); tone(1319, 0.06, 0.14, 'square', 0.04); }),
  click: play(() => tone(520, 0, 0.05, 'sine', 0.06)),
  tick: play(() => tone(1100, 0, 0.05, 'square', 0.03)),
  levelUp: play(() => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.22, 'triangle'))),
  fanfare: play(() => [784, 784, 784, 1047].forEach((f, i) => tone(f, i * 0.13, i === 3 ? 0.5 : 0.12, 'triangle'))),
};
