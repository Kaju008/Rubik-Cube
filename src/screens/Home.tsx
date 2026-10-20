import { useEffect, useRef, useState } from 'react';
import { Mascot } from '../ui/Mascot';
import { CubeCanvas } from '../ui/CubeCanvas';
import { HowToCards } from '../ui/HowToCards';
import { applyMoves, solvedState } from '../cube/model';
import { speak, preload } from '../audio/voice';
import { unlockAudio, sfx } from '../audio/sfx';
import { colorsFor, STANDARD_NAMES } from '../scan/color';

const LINES = [
  "Hey, I'm Cubr! 👋",
  "Got a scrambled cube? I'll solve it with you, one turn at a time.",
  'Place your phone or laptop on a table, show your cube to the camera, and tap Start.',
];
const HERO_STATE = applyMoves(solvedState(), "R U R' U' F2 D L' B");

export function Home({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  const [typed, setTyped] = useState<string[]>(['']);
  const spoke = useRef(false);

  useEffect(() => {
    preload(['intro_home', 'scan_intro', 'scan_red']);
    let line = 0, ch = 0;
    const id = setInterval(() => {
      if (line >= LINES.length) { clearInterval(id); return; }
      ch++;
      const chars = Array.from(LINES[line]); // emoji-safe
      setTyped((t) => { const n = [...t]; n[line] = chars.slice(0, ch).join(''); return n; });
      if (ch >= chars.length) { line++; ch = 0; if (line < LINES.length) setTyped((t) => [...t, '']); }
    }, 20);
    return () => clearInterval(id);
  }, []);

  const hear = () => { unlockAudio(); sfx.pop(); spoke.current = true; speak('intro_home'); };

  return (
    <div className="home" onPointerDown={(e) => { if (!spoke.current && !(e.target as HTMLElement).closest('.no-greet')) hear(); }}>
      <section className="hero">
        <div className="hero-copy">
          <div className="dialogue">
            <Mascot size={96} className="bob" id="hero" />
            <div className="bubble" aria-live="polite">
              {typed.map((t, i) => <p key={i}>{t}</p>)}
              <button className="hear no-greet" onClick={hear}>▶ Hear Cubr</button>
            </div>
          </div>
          <h1>Point. Scan. <span className="grad">Solve.</span></h1>
          <p className="lede">
            Your camera reads the colours on your Rubik's Cube. Cubr then walks you through every turn, live on your screen,
            with a gentle voice guide.
          </p>
          <div className="cta no-greet">
            <button className="btn-toy big" onClick={onStart}>Start <span aria-hidden="true">→</span></button>
            <button className="btn-ghost" onClick={onDemo}>No cube nearby? Try the demo</button>
          </div>
        </div>
        <div className="hero-cube">
          <CubeCanvas state={HERO_STATE} colors={colorsFor(STANDARD_NAMES)} autoSpin label="Spinning 3D cube" />
          <div className="hero-glow" />
        </div>
      </section>

      <section className="how">
        <h2>Three steps. That's it.</h2>
        <HowToCards />
      </section>

      <section className="soon">
        <h2>More ways to play</h2>
        <div className="soon-grid">
          <article className="soon-card c-green"><span className="tag">Coming soon</span><h3>Learn</h3><p>Beginner to advanced, stage by stage, on your own cube.</p></article>
          <article className="soon-card c-pink"><span className="tag">Coming soon</span><h3>Tricks</h3><p>Finger tricks, patterns and algorithms for people who know the basics.</p></article>
          <article className="soon-card c-blue"><span className="tag">Coming soon</span><h3>Speed</h3><p>Timer, personal bests and drills to get faster every week.</p></article>
        </div>
      </section>

      <footer className="foot">
        <p>🔒 Everything runs on your device. Your camera feed never leaves your phone or laptop.</p>
        <p className="fine">Rubik's Cube is a trademark of Spin Master Ltd. Cubr is an independent fan project and is not affiliated with it. Voice: Kokoro TTS.</p>
      </footer>
    </div>
  );
}
