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

## Roadmap
Phase 2 Learn section · Phase 3 Speed (timer, stats, CFOP trainer) · Phase 4 Tricks, gamification, automatic move checking · Phase 5 accounts & leaderboard.

---
Rubik's Cube is a trademark of Spin Master Ltd. Cubr is an independent project and is not affiliated with it.
