"""Record every Cubr voice line with the Kokoro neural TTS (Apache-2.0) and save small MP3s.

Usage:  pip install kokoro-onnx soundfile
        (download kokoro-v1.0.onnx + voices-v1.0.bin from github.com/thewh1teagle/kokoro-onnx releases)
        python scripts/gen_voice.py /path/to/kokoro.onnx /path/to/voices.bin [voice]
"""
import json, os, subprocess, sys, tempfile
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

model, voices = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else "af_heart"
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lines = json.load(open(os.path.join(root, "src/audio/lines.json")))
out = os.path.join(root, "public/voice")
os.makedirs(out, exist_ok=True)
k = Kokoro(model, voices)
lang = "en-gb" if voice.startswith("b") else "en-us"
only = set(sys.argv[4].split(",")) if len(sys.argv) > 4 else None
SAY = {"Cubr": "Cuber"}  # pronunciation fixes (spoken text only)
for key, text in lines.items():
    if only and key not in only:
        continue
    for a, b in SAY.items():
        text = text.replace(a, b)
    samples, sr = k.create(text, voice=voice, speed=0.97, lang=lang)
    pad = np.zeros(int(sr * 0.06), dtype=samples.dtype)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, np.concatenate([pad, samples, pad]), sr)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name, "-ac", "1", "-codec:a", "libmp3lame",
                        "-b:a", "56k", os.path.join(out, key + ".mp3")], check=True)
    os.unlink(tmp.name)
    print("ok", key)
