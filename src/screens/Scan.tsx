import { useEffect, useRef, useState } from 'react';
import { useCamera } from '../hooks/useCamera';
import type { CubeCanvasHandle } from '../ui/CubeCanvas';
import { HoldGuide } from '../ui/HoldGuide';
import { Mascot } from '../ui/Mascot';
import { applyMoves, solvedState, State } from '../cube/model';
import { CellSample, ColorName, Lab, PALETTE, guessColor, labDist, rgbToLab, sampleGrid } from '../scan/color';
import { Capture, resolveScan } from '../scan/resolve';
import { preload, speak } from '../audio/voice';
import { sfx } from '../audio/sfx';

interface Step { name: ColorName; title: string; detail: string; voice: string[]; rot: string[]; top: ColorName; topLabel: string; bottom: ColorName }
const STEPS: Step[] = [
  { name: 'red', title: 'Show the RED side', detail: 'Red faces the camera. Yellow on top, white at the bottom.', voice: ['scan_intro', 'scan_red'], rot: [], top: 'yellow', topLabel: 'Top', bottom: 'white' },
  { name: 'green', title: 'Turn to the GREEN side', detail: 'Give the cube a quarter turn. Keep yellow on top.', voice: ['scan_green'], rot: ['y'], top: 'yellow', topLabel: 'Top', bottom: 'white' },
  { name: 'orange', title: 'Now the ORANGE side', detail: 'Keep turning the same way. Yellow stays on top.', voice: ['scan_orange'], rot: ['y'], top: 'yellow', topLabel: 'Top', bottom: 'white' },
  { name: 'blue', title: 'Now the BLUE side', detail: 'One more quarter turn.', voice: ['scan_blue'], rot: ['y'], top: 'yellow', topLabel: 'Top', bottom: 'white' },
  { name: 'yellow', title: 'Now the YELLOW top', detail: 'Turn red back to the front, then tip the yellow top towards the camera. Red ends up at the bottom edge.', voice: ['scan_yellow'], rot: ['y', "x'"], top: 'orange', topLabel: 'Top edge', bottom: 'red' },
  { name: 'white', title: 'Last one: the WHITE bottom', detail: 'Flip the cube so white faces the camera. Red edge at the top.', voice: ['scan_white'], rot: ['x2'], top: 'red', topLabel: 'Top edge', bottom: 'orange' },
];
const SIMILAR: Partial<Record<ColorName, ColorName>> = { red: 'orange', orange: 'red', white: 'yellow', yellow: 'white' };
const ORIENT: State[] = (() => {
  const out: State[] = [];
  let s = solvedState();
  for (const st of STEPS) { s = applyMoves(s, st.rot); out.push(s); }
  return out;
})();
const SWEEP_MS = 700;

interface Props { onDone: (state: State, names: ColorName[]) => void; onDemo: () => void; onManual: () => void }
type Phase = 'search' | 'moving' | 'sweep' | 'dupe';

export function Scan({ onDone, onDemo, onManual }: Props) {
  const cam = useCamera();
  const stageRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<CubeCanvasHandle>(null);
  const [caps, setCaps] = useState<(Capture | null)[]>(() => STEPS.map(() => null));
  const [thumbs, setThumbs] = useState<(ColorName | null)[][]>(() => STEPS.map(() => []));
  const [live, setLive] = useState<(ColorName | null)[]>(Array(9).fill(null));
  const [phase, setPhase] = useState<Phase>('search');
  const [hint, setHint] = useState('');
  const [snap, setSnap] = useState(false);
  const capsRef = useRef(caps);
  capsRef.current = caps;
  const lastCells = useRef<CellSample[] | null>(null);
  const st = useRef({ miss: 0, prev: null as Lab[] | null, still: 0, sweepStart: 0, acc: [] as Lab[][], accRgb: [] as [number, number, number][][], cooldown: 0, absentSince: 0, dupeSince: 0, spoke: {} as Record<string, number> });

  const step = caps.findIndex((c) => !c);
  const stepRef = useRef(step);
  const prevStep = useRef(-1);

  useEffect(() => {
    cam.start('user');
    preload(['scan_intro', 'scan_red', 'scan_green', 'scan_orange', 'scan_blue', 'scan_yellow', 'scan_white', 'scan_center', 'scan_done']);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3D guide follows each step
  useEffect(() => {
    stepRef.current = step;
    if (step < 0) return;
    const v = guideRef.current?.view;
    if (prevStep.current === step - 1 && step > 0 && v) {
      (async () => { for (const m of STEPS[step].rot) await v.commit(m, 560); })();
    } else v?.setState(ORIENT[step]);
    prevStep.current = step;
  }, [step]);

  // voice for each step (the very first one also explains the rule: yellow top, white bottom, red front)
  const spokenIntro = useRef(false);
  const isLive = cam.status === 'live';
  useEffect(() => {
    if (step < 0 || !isLive) return;
    const lines = spokenIntro.current ? STEPS[step].voice.filter((x) => x !== 'scan_intro') : ['scan_intro', ...STEPS[step].voice.filter((x) => x !== 'scan_intro')];
    spokenIntro.current = true;
    speak(lines);
  }, [step, isLive]);

  // all six → resolve
  useEffect(() => {
    if (step !== -1) return;
    cam.stop();
    sfx.stage();
    speak('scan_done');
    const res = resolveScan(caps as Capture[]);
    const t = setTimeout(() => onDone(res.state, res.names), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const capture = (cells: CellSample[]) => {
    const want = STEPS[stepRef.current]?.name;
    if (!want) return;
    // which side is this? trust the colour of the centre if it's clearly another side we still need
    const g = guessColor(cells[4].rgb);
    let i = stepRef.current;
    if (g && g !== want && g !== SIMILAR[want]) {
      const j = STEPS.findIndex((s, k) => s.name === g && !capsRef.current[k]);
      if (j >= 0) i = j;
    }
    sfx.capture();
    setSnap(true);
    setTimeout(() => setSnap(false), 380);
    st.current.cooldown = performance.now() + 900;
    setCaps((c) => { const n = [...c]; n[i] = { cells }; return n; });
    setThumbs((t) => { const n = [...t]; n[i] = cells.map((c) => guessColor(c.rgb)); return n; });
  };

  const sayOnce = (id: string, gap = 8000) => {
    const now = performance.now();
    if ((st.current.spoke[id] ?? 0) + gap > now) return;
    st.current.spoke[id] = now;
    speak(id);
  };

  // live loop (~15 fps): find the cube, wait until it's steady, sweep, snap
  useEffect(() => {
    if (cam.status !== 'live') return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    let raf = 0, last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 66) return;
      last = t;
      const v = cam.videoRef.current, stage = stageRef.current, grid = gridRef.current;
      if (!v || !stage || !grid || v.readyState < 2 || !v.videoWidth) return;
      const vw = v.videoWidth, vh = v.videoHeight;
      const sr = stage.getBoundingClientRect(), gr = grid.getBoundingClientRect();
      const scale = Math.max(sr.width / vw, sr.height / vh);
      const ox = (sr.width - vw * scale) / 2, oy = (sr.height - vh * scale) / 2;
      let gx = (gr.left + gr.width / 2 - sr.left - ox) / scale;
      const gy = (gr.top + gr.height / 2 - sr.top - oy) / scale;
      if (cam.mirrored) gx = vw - gx;
      // crop just the box from the full-resolution frame, so sampling quality doesn't depend on screen size
      const gs = gr.width / scale, N = 192;
      canvas.width = N; canvas.height = N;
      ctx.drawImage(v, gx - gs / 2, gy - gs / 2, gs, gs, 0, 0, N, N);
      const cells = sampleGrid(ctx.getImageData(0, 0, N, N), N);
      lastCells.current = cells;
      const guesses = cells.map((c) => guessColor(c.rgb));
      setLive(cam.mirrored ? [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => guesses[Math.floor(i / 3) * 3 + 2 - (i % 3)]) : guesses);

      const S = st.current;
      const i = stepRef.current;
      if (i < 0) return;
      const want = STEPS[i].name;
      const labs = cells.map((c) => c.lab);
      // steadiness = median sticker change between frames (robust to one noisy cell or a passing finger)
      // a cube face = mostly uniform, coloured cells; ignore up to 2 glitchy frames in a row (blur, a finger)
      const solid = cells.filter((c, q) => c.spread < 36 && guesses[q]).length;
      const clean = solid >= 7;
      S.miss = clean ? 0 : S.miss + 1;
      if (!clean && S.miss < 3 && S.prev) return;
      const present = clean;
      const motion = S.prev && present ? labs.map((l, q) => labDist(l, S.prev![q])).sort((a, b) => a - b)[4] : 99;
      if (present) S.prev = labs;
      const dupe = present && capsRef.current.some((c) => c && labDist(c.cells[4].lab, cells[4].lab) < 8);

      (window as unknown as { __cubrScan: unknown }).__cubrScan = { motion: +motion.toFixed(1), solid, still: S.still, sweep: !!S.sweepStart };
      if (S.sweepStart) {
        // keep collecting while the laser sweeps; abort if the cube moves
        if (!present || motion > 16) { S.sweepStart = 0; S.acc = []; S.accRgb = []; setPhase('moving'); return; }
        S.acc.push(labs); S.accRgb.push(cells.map((c) => c.rgb));
        if (t - S.sweepStart >= SWEEP_MS) {
          const avg = cells.map((c, q) => {
            const lab = [0, 1, 2].map((d) => S.acc.reduce((m, a) => m + a[q][d], 0) / S.acc.length) as Lab;
            const rgb = [0, 1, 2].map((d) => Math.round(S.accRgb.reduce((m, a) => m + a[q][d], 0) / S.accRgb.length)) as [number, number, number];
            return { lab: S.acc.length ? lab : rgbToLab(rgb), rgb, spread: c.spread };
          });
          S.sweepStart = 0; S.acc = []; S.accRgb = []; S.still = 0;
          setPhase('search');
          capture(avg);
        }
        return;
      }

      if (t < S.cooldown) { setHint(''); return; }
      if (!present) {
        S.still = 0; S.dupeSince = 0;
        if (!S.absentSince) S.absentSince = t;
        setPhase('search');
        setHint(t - S.absentSince > 900 ? 'Place the cube in the centre of the box' : '');
        if (t - S.absentSince > 3500) sayOnce('scan_center', 10000);
        return;
      }
      S.absentSince = 0;
      if (dupe) {
        if (!S.dupeSince) S.dupeSince = t;
        setPhase('dupe');
        setHint(`Already got that side. Show the ${want} side`);
        if (t - S.dupeSince > 1600) sayOnce('already_' + want, 9000);
        return;
      }
      S.dupeSince = 0;
      S.still = motion < 9 ? S.still + 1 : 0;
      if (S.still >= 3) {
        S.sweepStart = t; S.acc = [labs]; S.accRgb = [cells.map((c) => c.rgb)];
        setPhase('sweep');
        setHint('Scanning…');
        sfx.scanTick();
      } else {
        setPhase('moving');
        setHint('Hold still…');
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
        <div className="row center-row">
          <button className="btn-toy" onClick={() => cam.start('user')}>Try again</button>
          <button className="btn-ghost" onClick={onManual}>Enter colours by hand</button>
          <button className="btn-ghost" onClick={onDemo}>Try the demo</button>
        </div>
      </div>
    );
  }

  const cur = step >= 0 ? STEPS[step] : STEPS[5];
  return (
    <div className="scan full-stage" ref={stageRef}>
      <video ref={cam.videoRef} className={cam.mirrored ? 'mirror' : ''} autoPlay playsInline muted />
      <div className="vignette" />
      {cam.status !== 'live' && <div className="cam-wait"><Mascot size={84} mood="think" className="bob" /><p>Starting camera…</p></div>}

      <ol className="scan-chips" aria-label="Sides scanned">
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

      <div className="grid-wrap">
        <div className={`scan-grid ph-${phase} ${snap ? 'snap' : ''}`} ref={gridRef} style={{ ['--want' as string]: PALETTE[cur.name] }}>
          {live.map((c, i) => (
            <span key={i} className={`cell ${c ? 'seen' : ''}`} style={{ ['--c' as string]: c ? PALETTE[c] : 'transparent', ['--r' as string]: Math.floor(i / 3) }}>
              {i === 4 && <i className="target" style={{ background: PALETTE[cur.name] }} />}
            </span>
          ))}
          <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
          <i className="laser" />
          {hint && <div className={`scan-hint ${phase}`} aria-live="polite">{hint}</div>}
        </div>
      </div>
      {snap && <div className="flash" />}

      <HoldGuide ref={guideRef} state={ORIENT[0]} facing={cur.name} top={cur.top} topLabel={cur.topLabel} bottom={cur.bottom} mirrored={cam.mirrored} className="float-right" defaultOpen={typeof window === 'undefined' || innerWidth > 900 || innerHeight > 760} />

      <div className="scan-card card">
        <div className="rule-row">
          <span className="rule"><i style={{ background: PALETTE.yellow }} />Top <b>yellow</b></span>
          <span className="rule"><i style={{ background: PALETTE.white }} />Bottom <b>white</b></span>
          <span className="rule"><i style={{ background: PALETTE.red }} />Front <b>red</b></span>
        </div>
        <p className="step-n">Side {Math.max(1, step + 1)} of 6</p>
        <h2 className="step-title" style={{ ['--c' as string]: PALETTE[cur.name] }}>{step < 0 ? 'All six sides scanned!' : cur.title}</h2>
        <p className="step-detail">{step < 0 ? 'Checking the colours…' : cur.detail}</p>
        <div className="scan-actions">
          <button className="btn-toy" disabled={!lastCells.current || step < 0} onClick={() => lastCells.current && capture(lastCells.current)}>📸 Capture now</button>
          <button className="btn-ghost" onClick={onManual}>Enter by hand</button>
          {cam.canSwitch && <button className="btn-ghost" onClick={() => cam.flip()}>🔄 Flip camera</button>}
        </div>
      </div>
    </div>
  );
}
