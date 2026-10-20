// Cubr sound kit — synthesised in the browser (no downloads): plastic cube clicks, marimba chimes, soft UI ticks.
// Also hosts the shared AudioContext used by the voice and the background music.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let fxBus: GainNode | null = null;
let enabled = true;

export function setSfxEnabled(v: boolean) { enabled = v; }
export const audioCtx = () => ctx;
export const masterBus = () => master;
export function sfxEnabled() { return enabled; }

/** Must be called from a user gesture once (browsers block audio until then). */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    // gentle glue compressor on everything
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
    master.connect(comp).connect(ctx.destination);
    fxBus = ctx.createGain();
    fxBus.gain.value = 0.55;
    fxBus.connect(master);
    window.dispatchEvent(new Event('cubr-audio-ready'));
  }
  if (ctx.state === 'suspended') ctx.resume();
}

const now = () => ctx!.currentTime;

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, glideTo?: number, dest?: AudioNode) {
  const t = now() + start;
  const o = ctx!.createOscillator(), g = ctx!.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  env(g, t, vol, 0.006, dur);
  o.connect(g).connect(dest ?? fxBus!);
  o.start(t); o.stop(t + dur + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
function noise(start: number, dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'bandpass') {
  if (!noiseBuf) {
    noiseBuf = ctx!.createBuffer(1, ctx!.sampleRate, ctx!.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = now() + start;
  const src = ctx!.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx!.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx!.createGain();
  env(g, t, vol, 0.0015, dur);
  src.connect(f).connect(g).connect(fxBus!);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

/** Marimba-ish mallet note: fundamental + 4th partial, fast decay. */
function mallet(freq: number, start: number, vol = 0.22, decay = 0.55) {
  tone(freq, start, decay, 'sine', vol);
  tone(freq * 3.98, start, decay * 0.25, 'sine', vol * 0.18);
  noise(start, 0.012, freq * 2, 1.2, vol * 0.25);
}

/** Warm pad chord (detuned triangles through a low-pass). */
function pad(freqs: number[], start: number, dur: number, vol = 0.06) {
  const t = now() + start;
  const lp = ctx!.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  lp.connect(g).connect(fxBus!);
  for (const f of freqs) for (const det of [-4, 4]) {
    const o = ctx!.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = det;
    o.connect(lp); o.start(t); o.stop(t + dur + 0.1);
  }
}

const play = (fn: () => void) => () => { if (enabled && ctx && fxBus) fn(); };
const jitter = (x: number, amt = 0.06) => x * (1 + (Math.random() - 0.5) * amt);

export const sfx = {
  /** soft UI tick */
  tap: play(() => { tone(jitter(1150), 0, 0.045, 'sine', 0.07, 780); noise(0, 0.01, 5000, 0.8, 0.03); }),
  /** bubbly confirm */
  pop: play(() => { tone(520, 0, 0.09, 'sine', 0.12, 980); tone(780, 0.04, 0.1, 'sine', 0.07, 1300); }),
  /** a cube layer turning: two plastic clicks (start + landing) with a little body resonance */
  turn: play(() => {
    noise(0, 0.03, jitter(2600, 0.2), 2.2, 0.35); tone(jitter(420), 0, 0.03, 'triangle', 0.05);
    noise(0.085, 0.025, jitter(3400, 0.2), 2.5, 0.28); tone(jitter(520), 0.085, 0.025, 'triangle', 0.04);
  }),
  /** camera shutter + a little chime */
  capture: play(() => {
    noise(0, 0.018, 6000, 0.7, 0.32, 'highpass'); noise(0.06, 0.022, 4200, 0.9, 0.26, 'highpass');
    mallet(1568, 0.1, 0.12, 0.4);
  }),
  scanTick: play(() => tone(2200, 0, 0.025, 'sine', 0.03)),
  /** gentle "hmm" — never harsh */
  error: play(() => { mallet(392, 0, 0.14, 0.35); mallet(330, 0.13, 0.14, 0.45); }),
  /** affirmative two-note */
  ok: play(() => { mallet(784, 0, 0.16, 0.35); mallet(1175, 0.09, 0.16, 0.5); }),
  start: play(() => { pad([261.6, 329.6, 392, 493.9], 0, 1.1, 0.05); [523.3, 659.3, 784].forEach((f, i) => mallet(f, i * 0.06, 0.12, 0.5)); }),
  stage: play(() => { [523.3, 659.3, 784, 1046.5].forEach((f, i) => mallet(f, i * 0.085, 0.16, 0.6)); pad([261.6, 392, 523.3], 0.1, 1.2, 0.035); }),
  /** undo / rewind cue: descending */
  rewind: play(() => { [784, 659.3, 523.3].forEach((f, i) => mallet(f, i * 0.07, 0.12, 0.35)); }),
  solved: play(() => {
    [523.3, 659.3, 784, 1046.5, 1318.5, 1568].forEach((f, i) => mallet(f, i * 0.08, 0.17, 0.7));
    pad([261.6, 329.6, 392, 493.9, 587.3], 0.35, 2.4, 0.06);
    for (let k = 0; k < 10; k++) tone(2000 + Math.random() * 2500, 0.6 + k * 0.07, 0.25, 'sine', 0.025);
  }),
};
