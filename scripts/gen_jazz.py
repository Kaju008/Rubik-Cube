"""Cubr background music: an original, seamless lo-fi jazz loop (Rhodes-style piano, walking bass, brushes).
Synthesised from scratch with numpy, so there are no samples or licences to worry about.
Usage: python scripts/gen_jazz.py public/music/cubr-lofi.mp3
"""
import sys, subprocess, tempfile, numpy as np, soundfile as sf

SR = 44100
BPM = 82
BEAT = 60 / BPM
SWING = 0.64                    # swung 8ths
BARS = 16
LEN = int(BARS * 4 * BEAT * SR)
rng = np.random.default_rng(7)
L = np.zeros(LEN + SR * 4); R = np.zeros_like(L)

def midi(n): return 440 * 2 ** ((n - 69) / 12)
def t_of(bar, beat): return (bar * 4 + beat) * BEAT
def swing8(bar, beat, half):  # half = 0 on-beat, 1 the "and"
    return t_of(bar, beat) + (SWING * BEAT if half else 0)

def add(sig, t, pan=0.0, gain=1.0):
    i = int(t * SR) % LEN                # wrap so the loop is seamless
    n = len(sig)
    lg, rg = gain * np.sqrt((1 - pan) / 2), gain * np.sqrt((1 + pan) / 2)
    for buf, g in ((L, lg), (R, rg)):
        end = i + n
        if end <= len(buf): buf[i:end] += sig * g
        else:
            k = len(buf) - i; buf[i:] += sig[:k] * g; buf[:n - k] += sig[k:] * g

# ---------- instruments ----------
def rhodes(f, dur, vel=0.5):
    n = int((dur + 1.4) * SR); t = np.arange(n) / SR
    idx = 1.6 * np.exp(-t * 3.5) + 0.25
    mod = np.sin(2 * np.pi * f * t) * idx
    car = np.sin(2 * np.pi * f * t + mod)
    tine = np.sin(2 * np.pi * f * 7.1 * t) * np.exp(-t * 18) * 0.25
    env = np.minimum(1, t / 0.006) * np.exp(-t * 0.9)
    rel = np.clip(1 - (t - dur) / 0.35, 0, 1)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.2 * t)
    return (car + tine) * env * rel * trem * vel

def bass(f, dur, vel=0.6):
    n = int((dur + 0.3) * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    env = np.minimum(1, t / 0.012) * np.exp(-t * 2.2) * np.clip(1 - (t - dur) / 0.08, 0, 1)
    thump = np.sin(2 * np.pi * f * 0.5 * t) * np.exp(-t * 30) * 0.4
    return np.tanh((s * env + thump) * 1.4) * vel

def noise(n): return rng.standard_normal(n)
def onepole_lp(x, a):
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a * (v - acc); y[i] = acc
    return y
def hp(x, a): return x - onepole_lp(x, a)

def brush(dur=0.22, vel=0.25):
    n = int(dur * SR); t = np.arange(n) / SR
    env = np.minimum(1, t / 0.03) * np.exp(-t * 14)
    return hp(noise(n), 0.25) * env * vel
def ride(vel=0.12):
    # soft brushed ride: high-passed noise with a faint shimmer, no pitched partials
    n = int(0.7 * SR); t = np.arange(n) / SR
    s = hp(hp(noise(n), 0.55), 0.55)
    shimmer = np.sin(2 * np.pi * 5200 * t + 3 * np.sin(2 * np.pi * 7300 * t)) * 0.08
    return (s * 0.6 + shimmer) * np.exp(-t * 6) * np.minimum(1, t / 0.002) * vel
def kick(vel=0.45):
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 52 + 60 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * vel

# ---------- harmony: | Dm9 | G13 | Cmaj9 | A7b9 | x2 then | Fmaj7 | Em7 A7 | Dm9 G13 | Cmaj9 | x2 ----------
CH = {
    'Dm9': ([53, 57, 60, 64], 38), 'G13': ([53, 59, 64, 69], 43), 'Cmaj9': ([52, 55, 59, 62], 36),
    'A7b9': ([55, 58, 61, 64], 45), 'Fmaj7': ([57, 60, 64, 65], 41), 'Em7': ([55, 59, 62, 64], 40), 'A7': ([55, 61, 64, 66], 45),
}
PROG = (['Dm9', 'G13', 'Cmaj9', 'A7b9'] * 2 + ['Fmaj7', ['Em7', 'A7'], ['Dm9', 'G13'], 'Cmaj9'] * 2)[:BARS]

for bar, ch in enumerate(PROG):
    halves = ch if isinstance(ch, list) else [ch, ch]
    # piano comping: beat 1 (long) + the "and" of 2 (short), or per-half for split bars
    for h, name in enumerate(halves):
        notes, root = CH[name]
        if isinstance(ch, list):
            hits = [(t_of(bar, 2 * h), 1.6, 0.45)]
        else:
            hits = [(t_of(bar, 0), 1.4, 0.45), (swing8(bar, 1, 1), 0.7, 0.3)] if bar % 2 == 0 else [(swing8(bar, 0, 1), 1.2, 0.4), (t_of(bar, 2), 0.9, 0.32)]
        for (t0, d, v) in hits:
            for k, nn in enumerate(notes):
                add(rhodes(midi(nn), d, v * (0.9 + 0.2 * rng.random())), t0 + k * 0.012, pan=-0.25 + k * 0.17, gain=0.34)
    # walking bass
    notes, root = CH[halves[0]]
    nxt = CH[(PROG[(bar + 1) % BARS][0] if isinstance(PROG[(bar + 1) % BARS], list) else PROG[(bar + 1) % BARS])][1]
    if isinstance(ch, list):
        r2 = CH[halves[1]][1]
        line = [root, root + 7, r2, nxt + (1 if nxt < r2 else -1)]
    else:
        third = root + (3 if 'm' in halves[0] and 'maj' not in halves[0] else 4)
        line = [root, root + 7, third + 12 if rng.random() < 0.5 else root + 12, nxt - 1 if rng.random() < 0.6 else nxt + 1]
    for b, nn in enumerate(line):
        add(bass(midi(nn - 12 if nn > 50 else nn), BEAT * 0.92, 0.55 if b == 0 else 0.45), t_of(bar, b), pan=0.0, gain=0.30)
    # drums: brushes on 2 & 4, ride pattern, soft kick
    for b in (1, 3): add(brush(), t_of(bar, b), pan=0.15)
    for b in range(4):
        add(ride(0.05 if b % 2 == 0 else 0.035), t_of(bar, b), pan=0.35)
        if b in (1, 3): add(ride(0.025), swing8(bar, b, 1), pan=0.35)
    add(kick(0.35), t_of(bar, 0)); add(kick(0.22), t_of(bar, 2) + (SWING * BEAT if bar % 4 == 3 else 0))
    # continuous brush swirl
    swirl = hp(noise(int(4 * BEAT * SR)), 0.3) * 0.012 * (0.6 + 0.4 * np.sin(np.linspace(0, 8 * np.pi, int(4 * BEAT * SR))) ** 2)
    add(swirl, t_of(bar, 0), pan=-0.1)

# fold the tail back onto the start → seamless loop
L, R = L[:LEN] + 0, R[:LEN] + 0

# ---------- master: reverb, warmth, vinyl ----------
ir_n = int(2.2 * SR); ti = np.arange(ir_n) / SR
irL = noise(ir_n) * np.exp(-ti * 2.6); irR = noise(ir_n) * np.exp(-ti * 2.6)
def conv_circ(x, ir):
    n = len(x); F = np.fft.rfft(x, n * 2); G = np.fft.rfft(ir, n * 2)
    y = np.fft.irfft(F * G, n * 2)
    return y[:n] + y[n:2 * n]
wetL, wetR = conv_circ(L, irL), conv_circ(R, irR)
wetL /= np.max(np.abs(wetL)) + 1e-9; wetR /= np.max(np.abs(wetR)) + 1e-9
drymax = max(np.max(np.abs(L)), np.max(np.abs(R)))
L = L / drymax + 0.22 * wetL; R = R / drymax + 0.22 * wetR
# gentle low-pass (lo-fi) and saturation
def lp_fft(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))
L, R = lp_fft(L, 6500), lp_fft(R, 6500)
crackle = np.zeros(LEN); idx = rng.integers(0, LEN, 260); crackle[idx] = rng.standard_normal(260) * 0.05
crackle = lp_fft(crackle, 3000)
hiss = lp_fft(noise(LEN), 5000) * 0.006
L += crackle * 0.5 + hiss; R += np.roll(crackle, 37) * 0.5 + hiss
L, R = np.tanh(L * 1.1), np.tanh(R * 1.1)
peak = max(np.max(np.abs(L)), np.max(np.abs(R)))
L, R = L / peak * 0.8, R / peak * 0.8

out = sys.argv[1] if len(sys.argv) > 1 else 'cubr-lofi.mp3'
with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
    sf.write(tmp.name, np.stack([L, R], 1).astype(np.float32), SR)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp.name, '-codec:a', 'libmp3lame', '-b:a', '112k', out], check=True)
print('wrote', out, round(LEN / SR, 1), 's')
