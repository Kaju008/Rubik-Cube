// Quick vector tutorial before scanning: how to hold the cube, how to turn it, and what the sides are called.
import { CSSProperties, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { PALETTE, ColorName } from '../scan/color';
import { speak, stopVoice } from '../audio/voice';
import { sfx } from '../audio/sfx';

type FaceKey = 'U' | 'D' | 'F' | 'B' | 'R' | 'L';
const FACE_COLOR: Record<FaceKey, ColorName> = { U: 'yellow', D: 'white', F: 'red', B: 'orange', R: 'green', L: 'blue' };

/** A flat-shaded CSS 3D cube. */
function Cube3D({ rx, ry, letters, instant, size = 132 }: { rx: number; ry: number; letters?: boolean; instant?: boolean; size?: number }) {
  return (
    <div className="t3d" style={{ ['--s' as string]: `${size}px` } as CSSProperties}>
      <div className={`t3d-cube ${instant ? 'instant' : ''}`} style={{ transform: `rotateX(-20deg) rotateY(-26deg) rotateX(${rx}deg) rotateY(${ry}deg)` }}>
        {(Object.keys(FACE_COLOR) as FaceKey[]).map((f) => (
          <div key={f} className={`t3d-face f-${f}`} style={{ ['--c' as string]: PALETTE[FACE_COLOR[f]] } as CSSProperties}>
            {Array.from({ length: 9 }, (_, k) => <i key={k} />)}
            {letters && <b>{f}</b>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Two-finger pinch: index finger resting on the top, thumb underneath. Drawn from the right. */
function PinchHand({ hidden }: { hidden?: boolean }) {
  return (
    <svg className={`t-hand ${hidden ? 'off' : ''}`} viewBox="0 0 320 320" overflow="visible" aria-hidden="true">
      <defs>
        <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F1ECFA" /><stop offset="1" stopColor="#CFC6E6" /></linearGradient>
      </defs>
      <g>
      <g fill="url(#skin)" stroke="#0E0E14" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* forearm + palm */}
        <path d="M640 146 L 330 150 C 296 146, 270 142, 252 150 C 236 158, 232 182, 238 204 C 244 226, 270 238, 330 236 L 640 240 Z" />
        {/* curled fingers */}
        <path d="M252 152 C 238 150, 228 160, 236 170 C 242 176, 252 174, 258 168" />
        <path d="M246 172 C 232 172, 226 184, 236 192 C 242 196, 252 192, 256 186" />
        <path d="M244 192 C 232 194, 230 206, 240 212 C 246 215, 254 211, 256 205" />
        {/* index finger reaching over the top to its centre */}
        <path d="M262 148 C 244 128, 214 104, 176 96 C 166 94, 160 100, 164 108 C 168 114, 178 114, 188 118 C 214 128, 236 148, 248 162 Z" />
        {/* thumb tucked under the bottom */}
        <path d="M250 214 C 232 228, 204 238, 176 234 C 166 233, 162 241, 168 246 C 176 252, 200 252, 224 246 C 244 240, 258 230, 264 222 Z" />
      </g>
      <g fill="none" stroke="#0E0E14" strokeWidth="2" strokeLinecap="round" opacity="0.35">
        <path d="M172 100 C 176 104, 176 108, 172 110" />
        <path d="M172 238 C 176 240, 176 244, 172 246" />
      </g>
      </g>
    </svg>
  );
}

const TURNS: { label: string; sub: string; rx: number; ry: number; face: ColorName; hand: boolean }[] = [
  { label: 'Red faces the camera', sub: 'Side 1 of 6', rx: 0, ry: 0, face: 'red', hand: true },
  { label: 'Turn the cube to the left', sub: 'Green comes round to face you', rx: 0, ry: -90, face: 'green', hand: true },
  { label: 'Keep turning left', sub: 'Orange faces you', rx: 0, ry: -180, face: 'orange', hand: true },
  { label: 'One more turn left', sub: 'Blue faces you', rx: 0, ry: -270, face: 'blue', hand: true },
  { label: 'Red to the front, tip yellow forward', sub: 'The top faces the camera', rx: -90, ry: -360, face: 'yellow', hand: false },
  { label: 'Flip it over', sub: 'White, the bottom, faces the camera', rx: 90, ry: -360, face: 'white', hand: false },
];

const NAMES: { f: FaceKey; word: string; where: string }[] = [
  { f: 'U', word: 'Up', where: 'the top' },
  { f: 'D', word: 'Down', where: 'the bottom' },
  { f: 'F', word: 'Front', where: 'faces you' },
  { f: 'B', word: 'Back', where: 'faces away' },
  { f: 'R', word: 'Right', where: 'your right' },
  { f: 'L', word: 'Left', where: 'your left' },
];

const SLIDES = [
  { id: 'hold', eyebrow: 'Step 1 · Grip', title: 'Hold it with two fingers', voice: 'tut_hold' },
  { id: 'turn', eyebrow: 'Step 2 · Turning', title: 'Turn to show each side', voice: 'tut_turn' },
  { id: 'names', eyebrow: 'Step 3 · Names', title: 'Every side has a name', voice: 'tut_names' },
];

export function ScanTutorial({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0);
  const [turn, setTurn] = useState(0);
  const [instant, setInstant] = useState(false);
  const [spin, setSpin] = useState(0);
  const timer = useRef(0);

  useEffect(() => { speak(SLIDES[slide].voice, { interrupt: true }); }, [slide]);
  useEffect(() => () => stopVoice(), []);

  // slide 2: step through the six sides, then loop
  useEffect(() => {
    if (slide !== 1) { setTurn(0); return; }
    setTurn(0);
    let k = 0;
    timer.current = window.setInterval(() => {
      k = (k + 1) % (TURNS.length + 1);
      if (k === TURNS.length) { setInstant(true); setTurn(0); requestAnimationFrame(() => requestAnimationFrame(() => setInstant(false))); k = 0; return; }
      setTurn(k);
    }, 2300);
    return () => clearInterval(timer.current);
  }, [slide]);

  // slide 3: a slow quarter-turn showcase so every letter gets its moment
  useEffect(() => {
    if (slide !== 2) return;
    const id = window.setInterval(() => setSpin((s) => s + 1), 2400);
    return () => clearInterval(id);
  }, [slide]);

  const go = (k: number) => { sfx.tap(); setSlide(Math.max(0, Math.min(SLIDES.length - 1, k))); };
  const finish = () => { sfx.start(); stopVoice(); onDone(); };
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') (slide === SLIDES.length - 1 ? finish() : go(slide + 1));
      if (e.key === 'ArrowLeft') go(slide - 1);
      if (e.key === 'Escape') finish();
    };
    addEventListener('keydown', kd);
    return () => removeEventListener('keydown', kd);
  });

  const t = TURNS[turn];
  const SPIN_POSES = [[0, 0], [0, -90], [0, -180], [0, -270], [-90, -360], [90, -360]];
  const sp = SPIN_POSES[spin % SPIN_POSES.length];
  const shownName = NAMES.find((n) => n.f === (['F', 'R', 'B', 'L', 'U', 'D'] as FaceKey[])[spin % 6])!;

  return createPortal(
    <div className="tut" role="dialog" aria-label="How to hold and scan your cube">
      <div className="tut-card">
        <div className="tut-top">
          <div className="tut-dots" role="tablist" aria-label="Tutorial steps">
            {SLIDES.map((s, k) => <button key={s.id} role="tab" aria-selected={k === slide} aria-label={s.title} className={k === slide ? 'on' : k < slide ? 'past' : ''} onClick={() => go(k)} />)}
          </div>
          <button className="btn-text tut-skip" onClick={finish}>Skip<Icon name="arrow-right" size={15} /></button>
        </div>

        <div className="tut-body" key={slide}>
          <div className="tut-stage">
            {slide === 0 && (
              <>
                <Cube3D rx={0} ry={0} />
                <PinchHand />
                <span className="tut-tag t-top"><i style={{ background: PALETTE.yellow }} />Yellow on top</span>
                <span className="tut-tag t-front"><i style={{ background: PALETTE.red }} />Red faces the camera</span>
                <span className="tut-tag t-bottom"><i style={{ background: PALETTE.white }} />White underneath</span>
                <span className="tut-cam"><Icon name="camera" size={16} />Camera</span>
              </>
            )}
            {slide === 1 && (
              <>
                <Cube3D rx={t.rx} ry={t.ry} instant={instant} />
                <PinchHand hidden={!t.hand} />
                {t.ry !== 0 && t.hand && <svg className="tut-arrow" viewBox="0 0 200 60" aria-hidden="true"><path d="M170 18 C 130 52, 70 52, 30 18" /><path d="M42 12 L 28 18 L 38 30" /></svg>}
                {!t.hand && <svg className={`tut-arrow v ${t.rx > 0 ? 'down' : ''}`} viewBox="0 0 60 200" aria-hidden="true"><path d="M18 30 C 52 70, 52 130, 18 170" /><path d="M12 158 L 18 172 L 30 162" /></svg>}
              </>
            )}
            {slide === 2 && (
              <>
                <Cube3D rx={sp[0]} ry={sp[1]} letters />
                <span className="tut-name" key={shownName.f}><b>{shownName.f}</b>{shownName.word}</span>
              </>
            )}
          </div>

          <div className="tut-copy">
            <p className="eyebrow">{SLIDES[slide].eyebrow}</p>
            <h2>{SLIDES[slide].title}</h2>
            {slide === 0 && (
              <ul className="tut-list">
                <li><span className="tl-n">1</span><span>Pinch the cube: index finger on the <b>yellow</b> top, thumb under the <b>white</b> bottom.</span></li>
                <li><span className="tl-n">2</span><span>Turn the <b>red</b> side to face the camera.</span></li>
                <li><span className="tl-n">3</span><span>Keep it inside the box on screen, about a hand's length from the camera.</span></li>
              </ul>
            )}
            {slide === 1 && (
              <>
                <div className="tut-turn" key={turn}>
                  <span className="tt-swatch" style={{ background: PALETTE[t.face] }} />
                  <div><b>{t.label}</b><small>{t.sub}</small></div>
                </div>
                <ol className="tut-seq" aria-label="Scan order">
                  {TURNS.map((x, k) => <li key={x.face} className={k === turn ? 'on' : k < turn ? 'past' : ''} style={{ ['--c' as string]: PALETTE[x.face] } as CSSProperties}><i />{x.face}</li>)}
                </ol>
                <p className="tut-note"><Icon name="info" size={15} /><span>Cubr tells you which side to show next, and snaps it automatically when the cube is steady.</span></p>
              </>
            )}
            {slide === 2 && (
              <>
                <div className="tut-names">
                  {NAMES.map((n) => (
                    <div key={n.f} className={`tn ${n.f === shownName.f ? 'on' : ''}`}>
                      <span className="tn-badge" style={{ ['--c' as string]: PALETTE[FACE_COLOR[n.f]] } as CSSProperties}>{n.f}</span>
                      <span><b>{n.word}</b><small>{n.where} · {FACE_COLOR[n.f]}</small></span>
                    </div>
                  ))}
                </div>
                <p className="tut-note"><Icon name="info" size={15} /><span>Names follow the position, not the colour. Whatever side faces you is always <b>F</b>, the front.</span></p>
              </>
            )}
          </div>
        </div>

        <div className="tut-actions">
          <button className="btn-secondary" onClick={() => go(slide - 1)} disabled={slide === 0}><Icon name="arrow-left" size={16} />Back</button>
          {slide < SLIDES.length - 1
            ? <button className="btn-primary" onClick={() => go(slide + 1)}>Next<Icon name="arrow-right" size={17} /></button>
            : <button className="btn-primary" onClick={finish}><Icon name="scan" size={17} />Start scanning</button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
