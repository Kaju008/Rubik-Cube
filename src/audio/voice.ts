// Cubr's voice: natural recorded female voice clips (Kokoro neural TTS, "Heart"), played through Web Audio
// so lines can be queued, interrupted and chained smoothly. Falls back to the browser's speech engine.
import LINES from './lines.json';
import { audioCtx, masterBus, unlockAudio } from './sfx';
import { duck } from './music';

const TEXT = LINES as Record<string, string>;
let enabled = true;
const bytes = new Map<string, Promise<ArrayBuffer | null>>();
const buffers = new Map<string, Promise<AudioBuffer | null>>();
let current: AudioBufferSourceNode | null = null;
let token = 0;
let chain: Promise<void> = Promise.resolve();

export const hasLine = (id: string) => id in TEXT;
export const lineText = (id: string) => TEXT[id] ?? id;

function fetchBytes(id: string) {
  if (!bytes.has(id)) bytes.set(id, fetch(`${import.meta.env.BASE_URL}voice/${id}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null));
  return bytes.get(id)!;
}
function decode(id: string): Promise<AudioBuffer | null> {
  const ctx = audioCtx();
  if (!ctx) return Promise.resolve(null);
  if (!buffers.has(id)) buffers.set(id, fetchBytes(id).then((b) => (b ? ctx.decodeAudioData(b.slice(0)) : null)).catch(() => null));
  return buffers.get(id)!;
}

/** Warm the cache so the next lines start instantly. */
export function preload(ids: string[]) { ids.filter(hasLine).forEach((id) => fetchBytes(id)); }

function play(buf: AudioBuffer, my: number): Promise<void> {
  const ctx = audioCtx()!;
  return new Promise((resolve) => {
    if (my !== token) return resolve();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 1.1;
    src.connect(g).connect(masterBus() ?? ctx.destination);
    duck(true);
    src.onended = () => { duck(false); if (current === src) current = null; resolve(); };
    current = src;
    src.start();
  });
}

// ---------- browser speech fallback ----------
const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);
let fallbackVoice: SpeechSynthesisVoice | null = null;
const PREFERRED = ['Natural', 'Samantha', 'Ava', 'Google UK English Female', 'Google US English', 'Karen', 'Moira', 'Veena'];
function pickVoice() {
  const voices = synth()?.getVoices() ?? [];
  for (const name of PREFERRED) { const v = voices.find((x) => x.name.includes(name) && x.lang.startsWith('en')); if (v) { fallbackVoice = v; return; } }
  fallbackVoice = voices.find((v) => v.lang?.startsWith('en')) ?? null;
}
if (synth()) { pickVoice(); synth()!.addEventListener?.('voiceschanged', pickVoice); }
function ttsSay(text: string): Promise<void> {
  const s = synth();
  if (!s) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    if (fallbackVoice) u.voice = fallbackVoice;
    u.rate = 0.98; u.pitch = 1.04;
    duck(true);
    u.onend = () => { duck(false); resolve(); }; u.onerror = () => { duck(false); resolve(); };
    s.speak(u);
  });
}

async function run(ids: string[], my: number) {
  for (const id of ids) {
    if (my !== token || !enabled) return;
    const buf = hasLine(id) ? await decode(id) : null;
    if (my !== token || !enabled) return;
    if (buf) await play(buf, my);
    else await ttsSay(lineText(id));
  }
}

/**
 * Speak one or more lines (ids from lines.json, or raw text). By default it interrupts what's playing,
 * so guidance never lags behind the user.
 */
export function speak(ids: string | string[], opts: { interrupt?: boolean } = {}) {
  if (!enabled) return;
  unlockAudio();
  const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  if (opts.interrupt === false) { const my = token; chain = chain.then(() => run(list, my)); return; }
  stopVoice();
  const my = token;
  chain = run(list, my);
}

/** Legacy alias. */
export const say = (text: string) => speak(text);

export function stopVoice() {
  token++;
  try { current?.stop(); } catch { /* already stopped */ }
  current = null;
  synth()?.cancel();
}
export function setVoiceEnabled(v: boolean) { enabled = v; if (!v) stopVoice(); }
export function voiceEnabled() { return enabled; }
export const voiceSupported = () => true;

/** Clip id for a move, e.g. R' -> m_Rp */
export const moveClip = (m: string) => {
  const suf = m.endsWith("'") ? 'p' : m.endsWith('2') ? '2' : '';
  // wide moves (r, f, …) get their own prefix so file names never clash on case-insensitive disks
  return 'rludfb'.includes(m[0]) ? `w_${m[0]}${suf}` : `m_${m[0]}${suf}`;
};
