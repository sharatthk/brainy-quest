// Text-to-speech via the browser's built-in voices.
import { profile } from '../store.js';

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
let voices = [];
function loadVoices() {
  voices = speechSynthesis.getVoices();
}
if (supported) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export const speechSupported = () => supported;
export const englishVoices = () => voices.filter(v => v.lang?.toLowerCase().startsWith('en'));

function defaultVoice() {
  const en = englishVoices();
  const prefer = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Alex'];
  for (const name of prefer) {
    const v = en.find(x => x.name.includes(name));
    if (v) return v;
  }
  return en.find(v => v.lang === 'en-US') || en[0] || null;
}

export function speak(text, { rate } = {}) {
  if (!supported) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const s = profile()?.settings;
  const v = voices.find(x => x.voiceURI === s?.voiceURI) || defaultVoice();
  if (v) u.voice = v;
  u.lang = v?.lang || 'en-US';
  u.rate = rate ?? s?.rate ?? 0.85;
  speechSynthesis.speak(u);
  return true;
}

export const stopSpeaking = () => supported && speechSynthesis.cancel();
