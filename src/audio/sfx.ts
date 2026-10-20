// Tiny synthesised sound kit (no audio files to download). Every sound is built from oscillators + noise.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

export function setSfxEnabled(v: boolean) { enabled = v; }
export const audioCtx = () => ctx;
export function sfxEnabled() { return enabled; }

/** Must be called from a user gesture once (browsers block audio until then). */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, glideTo?: number) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(start: number, dur: number, freq: number, q: number, vol: number) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + start;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const play = (fn: () => void) => () => { if (enabled && ctx) fn(); };

export const sfx = {
  tap: play(() => tone(660, 0, 0.07, 'triangle', 0.18)),
  pop: play(() => tone(420, 0, 0.12, 'sine', 0.25, 880)),
  /** plastic "clack" of a layer turning */
  turn: play(() => { noise(0, 0.09, 2400, 1.2, 0.9); noise(0.05, 0.07, 1300, 2, 0.6); tone(180, 0, 0.05, 'square', 0.04); }),
  capture: play(() => { noise(0, 0.05, 3500, 0.8, 0.6); tone(880, 0.04, 0.12, 'triangle', 0.22); tone(1320, 0.12, 0.16, 'triangle', 0.2); }),
  scanTick: play(() => tone(1500, 0, 0.03, 'sine', 0.05)),
  error: play(() => { tone(220, 0, 0.16, 'sawtooth', 0.12, 160); tone(160, 0.14, 0.2, 'sawtooth', 0.1, 110); }),
  start: play(() => { [392, 523, 659].forEach((f, i) => tone(f, i * 0.07, 0.22, 'triangle', 0.2)); }),
  stage: play(() => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.3, 'triangle', 0.18)); }),
  solved: play(() => {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => tone(f, i * 0.09, 0.35, 'triangle', 0.2));
    [262, 330, 392].forEach((f) => tone(f, 0.63, 0.9, 'sine', 0.12));
    noise(0.6, 0.6, 6000, 0.5, 0.25);
  }),
};
