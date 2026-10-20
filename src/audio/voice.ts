// Voice-over using the browser's built-in speech engine (works offline on most devices).
let enabled = true;
let chosen: SpeechSynthesisVoice | null = null;
const PREFERRED = ['Google US English', 'Samantha', 'Ava', 'Microsoft Aria', 'Microsoft Jenny', 'Google UK English Female', 'Karen', 'Daniel', 'Rishi', 'Veena'];

const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

function pickVoice() {
  const s = synth();
  if (!s) return;
  const voices = s.getVoices();
  if (!voices.length) return;
  for (const name of PREFERRED) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) { chosen = v; return; }
  }
  chosen = voices.find((v) => v.lang?.startsWith('en') && v.localService) ?? voices.find((v) => v.lang?.startsWith('en')) ?? null;
}
if (synth()) {
  pickVoice();
  synth()!.addEventListener?.('voiceschanged', pickVoice);
}

export function setVoiceEnabled(v: boolean) { enabled = v; if (!v) synth()?.cancel(); }
export function voiceEnabled() { return enabled; }
export const voiceSupported = () => !!synth();

/** Speak a line. By default it interrupts whatever was being said, so guidance never lags behind. */
export function say(text: string, opts: { interrupt?: boolean; rate?: number } = {}) {
  const s = synth();
  if (!s || !enabled) return;
  if (opts.interrupt !== false) s.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[👋🎉✨🧊]/gu, ''));
  if (chosen) u.voice = chosen;
  u.lang = chosen?.lang ?? 'en-US';
  u.rate = opts.rate ?? 1.03;
  u.pitch = 1.05;
  s.speak(u);
}

export function stopVoice() { synth()?.cancel(); }
