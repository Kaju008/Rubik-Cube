import { useEffect, useRef, useState } from 'react';
import { Mascot } from '../ui/Mascot';
import { CubeCanvas } from '../ui/CubeCanvas';
import { applyMoves, solvedState } from '../cube/model';
import { say } from '../audio/voice';
import { unlockAudio, sfx } from '../audio/sfx';
import { colorsFor, STANDARD_NAMES } from '../scan/color';

const LINES = [
  "Hey, I'm Cubr! 👋",
  "Got a scrambled cube? I'll solve it with you — one turn at a time.",
  'Place your phone or laptop on a table, show your cube to the camera, and tap Start.',
];
export const INTRO_VOICE =
  "Hey, I'm Cubr! Got a scrambled cube? I'll solve it with you, one turn at a time. Place your phone or laptop on a table, show your cube to the camera, and tap Start.";

const HERO_STATE = applyMoves(solvedState(), "R U R' U' F2 D L' B");

export function Home({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  const [typed, setTyped] = useState<string[]>(['']);
  const spoke = useRef(false);

  // typewriter dialogue
  useEffect(() => {
    let line = 0, ch = 0;
    const id = setInterval(() => {
      if (line >= LINES.length) { clearInterval(id); return; }
      ch++;
      const chars = Array.from(LINES[line]); // emoji-safe
      setTyped((t) => {
        const n = [...t];
        n[line] = chars.slice(0, ch).join('');
        return n;
      });
      if (ch >= chars.length) { line++; ch = 0; if (line < LINES.length) setTyped((t) => [...t, '']); }
    }, 20);
    return () => clearInterval(id);
  }, []);

  const hear = () => {
    unlockAudio();
    sfx.pop();
    spoke.current = true;
    say(INTRO_VOICE);
  };

  return (
    <div
      className="home"
      onPointerDown={(e) => {
        // browsers only allow speech after a tap — greet on the first one (unless it's the Start button)
        if (!spoke.current && !(e.target as HTMLElement).closest('.no-greet')) hear();
      }}
    >
      <section className="hero">
        <div className="hero-copy">
          <div className="dialogue">
            <Mascot size={92} className="bob" />
            <div className="bubble" aria-live="polite">
              {typed.map((t, i) => <p key={i}>{t}</p>)}
              <button className="hear no-greet" onClick={hear}>▶ Hear Cubr</button>
            </div>
          </div>
          <h1>Point. Scan. <span className="grad">Solve.</span></h1>
          <p className="lede">
            Your camera reads the colours on your Rubik's Cube. Cubr then walks you through every turn with a 3D guide,
            sound and voice, live.
          </p>
          <div className="cta no-greet">
            <button className="btn-toy big" onClick={onStart}>Start <span aria-hidden="true">→</span></button>
            <button className="btn-ghost" onClick={onDemo}>No cube nearby? Try the demo</button>
          </div>
          <ol className="howto">
            <li><span className="howto-ico">📱</span><b>Place your camera</b> on a table surface</li>
            <li><span className="howto-ico">🧊</span><b>Show your cube</b> towards the camera</li>
            <li><span className="howto-ico">▶</span><b>Tap Start</b> and follow along</li>
          </ol>
        </div>
        <div className="hero-cube">
          <CubeCanvas state={HERO_STATE} colors={colorsFor(STANDARD_NAMES)} autoSpin label="Spinning 3D cube" />
          <div className="hero-glow" />
        </div>
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
        <p className="fine">Rubik's Cube is a trademark of Spin Master Ltd. Cubr is an independent fan project and is not affiliated with it.</p>
      </footer>
    </div>
  );
}
