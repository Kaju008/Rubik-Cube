# cubr — Point. Scan. Solve.

**Cubr** is a browser-based Rubik's Cube solver and tutor for mobile and desktop. Your camera reads the colours on the cube, and Cubr walks you through every turn with a 3D animated cube, sound effects and a voice guide.

**Live:** https://kaju008.github.io/Rubik-Cube/

## What's in Phase 1
- **Landing screen** with Cubr's intro dialogue (typed + spoken), the Start button and the "place your camera on a table → show your cube → begin" guide.
- **Live camera scanner**: a 3×3 grid overlay reads the stickers in real time and auto-captures each side once you hold it still. The order is green → orange → blue → red → yellow → white, with a mini 3D cube showing how to turn it.
  - Self-calibrating: it compares every sticker against your own cube's centres, under your lighting.
  - Each colour is forced to appear exactly 9 times, using a balanced assignment.
  - It detects how you held each side, so a side shown at the wrong angle is fixed automatically.
- **Review & fix**: 3D preview plus a flat cube map. Tap any sticker to correct it, with live validity checks (twisted corner, flipped edge, swapped pieces).
- **Two routes**
  - 🎓 **Learn route**: the beginner layer-by-layer method in 7 named stages (White cross → White corners → Middle layer → Yellow cross → Yellow edges → Corner homes → Twist corners), using the classic algorithms exactly as they're taught.
  - ⚡ **Fast route**: Kociemba two-phase solver, about 20 moves.
- **3D guide**: your real colours, each move looping with a direction arrow, the camera peeking at hidden faces, voice for every move ("R prime. Right side down."), stage intros with tips, auto-play, keyboard (Space / ← / A), and a mirror-camera picture-in-picture.
- **Sounds**: all synthesised in the browser (turn clicks, capture shutter, stage chimes, solved fanfare + confetti).
- **Offline-ready**: the solver tables build in a background worker when the page loads, and a service worker caches the app.
- 100% on-device. No video is uploaded.

## Run locally
```bash
npm install
npm run dev      # http://localhost:5173 (camera needs localhost or https)
npm test         # engine, solver (300 random cubes), scan resolver
npm run build
```

## Project layout
```
src/cube/      cube engine (facelet model from 3D geometry), validation, beginner solver, worker
src/scan/      colour maths, Hungarian assignment, scan resolver
src/three/     Three.js cube renderer + move animations
src/audio/     synthesised SFX + speech voice-over
src/screens/   Home, Scan, Review, Solve, Done
src/vendor/    cubejs (MIT) Kociemba solver, wrapped as an ES module
```

## v2 (what's new)
- **Mascot logo**: the googly-eyed cube is the logo. Its eyes follow your cursor, blink, and glance around on phones.
- **Natural female voice**: every line is recorded with the Kokoro neural TTS ("Heart" voice) as small MP3s in `public/voice/`. To re-record or change the voice:
  `python scripts/gen_voice.py kokoro.onnx voices.bin af_heart` (other voices: af_bella, bf_emma, af_nicole…)
- **Clear holding rule**: yellow on top, white on the bottom, red in front, shown on screen and spoken. A floating "How to hold" 3D tab animates each turn.
- **Faster scanning**:
  - Each side is captured within about a second of being held still.
  - A "place the cube in the centre" warning appears when nothing is in the box.
  - A scan-sweep animation plays, averaged over several frames, then the photo is taken.
  - It works even if you show sides out of order.
- **Live solve mode**: your camera fills the screen, with faded overlay instructions, vector move diagrams, a floating 3D guide and voice for every move. There's a 3D-only mode too.
- **Finale**: party poppers and confetti with your moves and time, then a 3-2-1 victory selfie with your time and the Cubr logo, ready to download or share.

## v3: Learn, Tricks, Speed
- **Learn**: 15 lessons in 4 tracks (Basics → beginner method → 4-look last layer → CFOP).
  - Every lesson has an interactive 3D algorithm player (play, pause, step, scrub, speed) and a spoken intro.
  - Hands-on widgets: a piece explorer and a notation pad.
  - Progress and XP are saved on the device.
- **Tricks**:
  - 8 patterns with 3D playback (checkerboard, superflip, cube-in-a-cube…).
  - A finger-tricks guide with move diagrams.
  - A library of 2-look OLL plus all 21 PLLs, with case diagrams.
- **Speed**:
  - A WCA-style timer: hold to arm, release to start, optional 15-second inspection with spoken 8/12-second warnings, and +2/DNF.
  - Random-state scrambles with a cube preview.
  - Best, ao5, ao12, best ao5 and mean, plus a progress chart.
  - A level ladder (Sub-3:00 → Sub-15) linking to the right lesson, and a daily streak.
  - Algorithm drills that repeat the cases you miss more often.
- Every algorithm and lesson demo is checked by simulation (`npm test`, 76 tests).
- Navigation: a top bar on desktop and a bottom tab bar on phones, with hash routes (`#/learn/cross`, `#/tricks/algs`, `#/speed/drills`).

## v4: Recovery, 3D-first guide, pro UI

- **Stuck? button** while solving, with four ways back on track:
  - *Check where I am*: show any one side to the camera and Cubr finds your place in the guide.
  - *Undo my last moves*: rewind a few steps with reverse moves.
  - *I turned something wrong*: tap the moves you actually did and Cubr re-plans from there.
  - *Rescan & continue*: scan the whole cube again and get a fresh route from where it is.
- **3D cube is the hero** of the solve screen. The camera floats in a small draggable window that can be minimised to a pill.
- **Step goals**: every step says what it is doing ("bringing the white-green-red corner home"), and the target piece glows on the 3D cube.
- **Audio**: richer synthesised sound effects, plus an original lo-fi jazz loop (`scripts/gen_jazz.py`) that ducks under the voice. It has its own toggle.
- **Professional UI**: a custom line-icon set (`src/ui/Icon.tsx`) replaces emoji, and the design system (Inter, Unbounded and JetBrains Mono) has been rebuilt.

## v5: Guided tricks, real cube detection, scan tutorial

- **Step-by-step players** everywhere (patterns, OLL/PLL, lesson demos): a short intro, then one move at a time with **Done, next**. A *Watch* mode is still there for playing straight through.
- **Patterns from any cube**: choose *It's solved* or *It's mixed up*. Mixed-up cubes are scanned, and Cubr computes a direct route from that exact position to the pattern (`src/cube/target.ts`).
- **Cube detection** (`src/scan/detect.ts`): a side is only captured when the box shows real sticker gaps or several clear sticker colours, and the centre matches a side that is still needed. Otherwise the frame turns red with "Cube not detected".
- **Pre-scan tutorial** (`src/ui/ScanTutorial.tsx`): vector hand-and-cube animations show how to grip the cube (index finger on yellow, thumb under white, red facing the camera), the turning order, and the U/D/F/B/R/L face names. It can be replayed from "How to hold".

## Roadmap
Next: automatic move checking through the camera · full OLL (57) · accounts, cloud sync & leaderboards · Hindi voice.

---
Rubik's Cube is a trademark of Spin Master Ltd. Cubr is an independent project and is not affiliated with it.
