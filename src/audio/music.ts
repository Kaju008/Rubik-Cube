// Background music: an original lo-fi jazz loop, low in the mix, ducked whenever Cubr speaks.
import { audioCtx, masterBus } from './sfx';

const LEVEL = 0.16, DUCKED = 0.05;
let enabled = true;
let gain: GainNode | null = null;
let src: AudioBufferSourceNode | null = null;
let buffer: Promise<AudioBuffer | null> | null = null;
let ducks = 0;

function load(ctx: AudioContext) {
  if (!buffer) {
    buffer = fetch(`${import.meta.env.BASE_URL}music/cubr-lofi.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((b) => (b ? ctx.decodeAudioData(b) : null))
      .catch(() => null);
  }
  return buffer;
}

function target() { return ducks > 0 ? DUCKED : LEVEL; }

export async function startMusic() {
  const ctx = audioCtx(), bus = masterBus();
  if (!enabled || !ctx || !bus || src) return;
  const buf = await load(ctx);
  if (!buf || src || !enabled) return;
  gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.connect(bus);
  src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(gain);
  src.start();
  gain.gain.setTargetAtTime(target(), ctx.currentTime, 1.2); // slow fade in
}

export function stopMusic() {
  const ctx = audioCtx();
  if (!src || !gain || !ctx) return;
  const s = src, g = gain;
  src = null; gain = null;
  g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
  setTimeout(() => { try { s.stop(); } catch { /* ignore */ } g.disconnect(); }, 1600);
}

export function setMusicEnabled(v: boolean) { enabled = v; if (v) startMusic(); else stopMusic(); }
export const musicEnabled = () => enabled;

/** Lower the music while the voice talks. */
export function duck(on: boolean) {
  ducks = Math.max(0, ducks + (on ? 1 : -1));
  const ctx = audioCtx();
  if (gain && ctx) gain.gain.setTargetAtTime(target(), ctx.currentTime, on ? 0.08 : 0.6);
}
