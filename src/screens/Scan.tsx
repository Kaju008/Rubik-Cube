import { useEffect, useRef, useState } from 'react';
import { useCamera } from '../hooks/useCamera';
import { CubeCanvas, CubeCanvasHandle } from '../ui/CubeCanvas';
import { Mascot } from '../ui/Mascot';
import { applyMoves, solvedState, State } from '../cube/model';
import { CellSample, ColorName, PALETTE, colorsFor, guessColor, labDist, sampleGrid, STANDARD_NAMES } from '../scan/color';
import { Capture, resolveScan } from '../scan/resolve';
import { say } from '../audio/voice';
import { sfx } from '../audio/sfx';

interface Step { name: ColorName; title: string; detail: string; voice: string; rot: string[] }
const STEPS: Step[] = [
  { name: 'green', title: 'Show the GREEN side', detail: 'Green facing the camera, white on the bottom. Fill the grid.',
    voice: "Let's scan your cube! Hold it with the green side facing the camera and white on the bottom. Fill the grid and hold still. I'll snap it automatically.", rot: [] },
  { name: 'orange', title: 'Now the ORANGE side', detail: 'Give the cube a quarter turn. Keep white on the bottom.',
    voice: 'Nice! Now give the cube a quarter turn to show the orange side. Keep white on the bottom.', rot: ['y'] },
  { name: 'blue', title: 'Now the BLUE side', detail: 'Keep turning the same way. White stays on the bottom.',
    voice: 'Great. Keep turning the same way, and show me blue.', rot: ['y'] },
  { name: 'red', title: 'Now the RED side', detail: 'One more quarter turn.',
    voice: 'One more turn. Show me red.', rot: ['y'] },
  { name: 'yellow', title: 'Now the YELLOW top', detail: 'Go back to green, then tip the top towards the camera. Green ends up at the bottom edge.',
    voice: 'Now turn back to green, then tip the top towards the camera, to show yellow.', rot: ['y', "x'"] },
  { name: 'white', title: 'Last one: the WHITE bottom', detail: 'Flip it over so white faces the camera. Green at the top edge.',
    voice: 'Last one! Flip it over to show the white side.', rot: ['x2'] },
];
const SIMILAR: Record<string, string> = { red: 'orange', orange: 'red', white: 'yellow', yellow: 'white' };
const ORIENT: State[] = (() => {
  const out: State[] = [];
  let s = solvedState();
  for (const st of STEPS) { s = applyMoves(s, st.rot); out.push(s); }
  return out;
})();

interface Props { onDone: (state: State, names: ColorName[]) => void; onDemo: () => void; onManual: () => void }

export function Scan({ onDone, onDemo, onManual }: Props) {
  const cam = useCamera();
  const stageRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<CubeCanvasHandle>(null);
  const [caps, setCaps] = useState<(Capture | null)[]>(() => STEPS.map(() => null));
  const [thumbs, setThumbs] = useState<(ColorName | null)[][]>(() => STEPS.map(() => []));
  const [live, setLive] = useState<(ColorName | null)[]>(Array(9).fill(null));
  const [hint, setHint] = useState('');
  const [hold, setHold] = useState(0);
  const [flash, setFlash] = useState(false);
  const capsRef = useRef(caps);
  capsRef.current = caps;
  const lastCells = useRef<CellSample[] | null>(null);
  const stable = useRef({ key: '', count: 0, cooldownUntil: 0, hintSince: 0, hintText: '', spokeAt: 0 });

  const step = caps.findIndex((c) => !c);
  const stepRef = useRef(step);
  const prevStep = useRef(-1);

  useEffect(() => { cam.start('user'); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // voice + mini-cube animation for each step
  useEffect(() => {
    stepRef.current = step;
    const v = miniRef.current?.view;
    if (step < 0) return;
    if (prevStep.current === step - 1 && step > 0 && v) {
      (async () => { for (const m of STEPS[step].rot) await v.commit(m, 520); })();
    } else v?.setState(ORIENT[step]);
    prevStep.current = step;
    if (cam.status === 'live') say(STEPS[step].voice);
  }, [step, cam.status]);

  // finished → resolve
  useEffect(() => {
    if (step !== -1) return;
    cam.stop();
    sfx.stage();
    say('All six sides scanned! Let me check the colours.');
    const res = resolveScan(caps as Capture[]);
    const t = setTimeout(() => onDone(res.state, res.names), 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const doCapture = (cells: CellSample[]) => {
    const i = stepRef.current;
    if (i < 0) return;
    sfx.capture();
    setFlash(true);
    setTimeout(() => setFlash(false), 220);
    stable.current.cooldownUntil = performance.now() + 1100;
    stable.current.count = 0;
    setHold(0);
    setCaps((c) => { const n = [...c]; n[i] = { cells }; return n; });
    setThumbs((t) => { const n = [...t]; n[i] = cells.map((c) => guessColor(c.rgb)); return n; });
  };

  // live sampling loop (~12 fps)
  useEffect(() => {
    if (cam.status !== 'live') return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    let raf = 0, last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 80) return;
      last = t;
      const v = cam.videoRef.current, stage = stageRef.current, grid = gridRef.current;
      if (!v || !stage || !grid || v.readyState < 2 || !v.videoWidth) return;
      const vw = v.videoWidth, vh = v.videoHeight;
      const W = 260, k = W / vw;
      canvas.width = W; canvas.height = Math.round(vh * k);
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const sr = stage.getBoundingClientRect(), gr = grid.getBoundingClientRect();
      const scale = Math.max(sr.width / vw, sr.height / vh);
      const ox = (sr.width - vw * scale) / 2, oy = (sr.height - vh * scale) / 2;
      let gx = (gr.left + gr.width / 2 - sr.left - ox) / scale;
      const gy = (gr.top + gr.height / 2 - sr.top - oy) / scale;
      if (cam.mirrored) gx = vw - gx;
      const cells = sampleGrid(ctx.getImageData(0, 0, canvas.width, canvas.height), (gr.width / scale) * k, gx * k, gy * k);
      lastCells.current = cells;
      const guesses = cells.map((c) => guessColor(c.rgb));
      setLive(cam.mirrored ? [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => guesses[Math.floor(i / 3) * 3 + 2 - (i % 3)]) : guesses);

      const i = stepRef.current;
      if (i < 0) return;
      const st = stable.current;
      const want = STEPS[i].name, centre = guesses[4];
      let msg = '';
      const full = guesses.every(Boolean);
      const taken = capsRef.current.some((c) => c && labDist(c.cells[4].lab, cells[4].lab) < 9);
      const centreOK = centre === want || SIMILAR[want] === centre;
      if (!full) msg = `Fill the grid with the ${want} side`;
      else if (taken) msg = `Already got that side! Show ${want}.`;
      else if (!centreOK) msg = `That looks like ${centre}. Show the ${want} side.`;

      const key = guesses.join(',');
      if (!msg && t > st.cooldownUntil) {
        st.count = key === st.key ? st.count + 1 : 1;
        setHold(Math.min(1, st.count / 8));
        if (st.count >= 8) { doCapture(cells); st.key = ''; return; }
        msg = 'Hold still…';
      } else { st.count = 0; setHold(0); }
      st.key = key;

      if (msg !== st.hintText) { st.hintText = msg; st.hintSince = t; }
      setHint(msg);
      // speak a stubborn hint now and then
      if (msg && msg !== 'Hold still…' && !msg.startsWith('Fill') && t - st.hintSince > 2600 && t - st.spokeAt > 7000) {
        st.spokeAt = t;
        say(msg);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam.status, cam.mirrored]);

  const retake = (i: number) => {
    sfx.tap();
    setCaps((c) => { const n = [...c]; n[i] = null; return n; });
    setThumbs((t) => { const n = [...t]; n[i] = []; return n; });
  };

  if (cam.status === 'denied' || cam.status === 'unavailable') {
    return (
      <div className="scan-blocked card">
        <Mascot size={110} mood="think" />
        <h2>{cam.status === 'denied' ? 'Camera is blocked' : "Can't find a camera"}</h2>
        <p>{cam.status === 'denied'
          ? 'Allow camera access for this site in your browser settings (the camera icon near the address bar), then try again.'
          : 'Cubr needs a camera to read your cube. You can still enter the colours by hand.'}</p>
        <div className="row">
          <button className="btn-toy" onClick={() => cam.start('user')}>Try again</button>
          <button className="btn-ghost" onClick={onManual}>Enter colours by hand</button>
          <button className="btn-ghost" onClick={onDemo}>Try the demo</button>
        </div>
      </div>
    );
  }

  const cur = step >= 0 ? STEPS[step] : null;
  return (
    <div className="scan">
      <div className="scan-stage" ref={stageRef}>
        <video ref={cam.videoRef} className={cam.mirrored ? 'mirror' : ''} autoPlay playsInline muted />
        {cam.status !== 'live' && <div className="cam-wait"><Mascot size={84} mood="think" className="bob" /><p>Starting camera…</p></div>}
        <div className="grid-wrap">
          <div className={`scan-grid ${hold > 0 ? 'holding' : ''}`} ref={gridRef} style={{ ['--hold' as string]: hold }}>
            {live.map((c, i) => (
              <span key={i} className={`cell ${c ? 'seen' : ''}`} style={{ ['--c' as string]: c ? PALETTE[c] : 'transparent' }}>
                {i === 4 && cur && <i className="target" style={{ background: PALETTE[cur.name] }} />}
              </span>
            ))}
            <svg className="hold-ring" viewBox="0 0 100 100" aria-hidden="true"><rect x="2" y="2" width="96" height="96" rx="14" pathLength={100} style={{ strokeDashoffset: 100 - hold * 100 }} /></svg>
          </div>
        </div>
        {hint && <div className="scan-hint" aria-live="polite">{hint}</div>}
        {flash && <div className="flash" />}
        <div className="cam-tools">
          {cam.canSwitch && <button className="chip" onClick={() => cam.flip()} title="Switch camera">🔄 Flip camera</button>}
        </div>
      </div>

      <aside className="scan-panel">
        <ol className="face-steps" aria-label="Sides scanned">
          {STEPS.map((s, i) => (
            <li key={s.name}>
              <button
                className={`face-chip ${caps[i] ? 'done' : ''} ${i === step ? 'current' : ''}`}
                onClick={() => caps[i] && retake(i)}
                title={caps[i] ? `Rescan ${s.name}` : s.name}
                style={{ ['--c' as string]: PALETTE[s.name] }}
              >
                {caps[i]
                  ? <span className="mini-grid">{thumbs[i].map((t, k) => <i key={k} style={{ background: t ? PALETTE[t] : '#333' }} />)}</span>
                  : <span className="dot" />}
                <small>{s.name}</small>
              </button>
            </li>
          ))}
        </ol>
        {cur && (
          <div className="step-card">
            <CubeCanvas ref={miniRef} state={ORIENT[0]} colors={colorsFor(STANDARD_NAMES)} interactive={false} mirrored={cam.mirrored} className="mini-cube" label="How to hold the cube" />
            <div>
              <p className="step-n">Side {step + 1} of 6</p>
              <h2 style={{ ['--c' as string]: PALETTE[cur.name] }} className="step-title">{cur.title}</h2>
              <p className="step-detail">{cur.detail}</p>
            </div>
          </div>
        )}
        <div className="scan-actions">
          <button className="btn-toy" disabled={!lastCells.current || step < 0} onClick={() => lastCells.current && doCapture(lastCells.current)}>📸 Capture</button>
          <button className="btn-ghost" onClick={onManual}>Enter colours by hand</button>
        </div>
        <p className="tiny">Tip: bright, even light works best. Avoid strong glare on the stickers.</p>
      </aside>
    </div>
  );
}
