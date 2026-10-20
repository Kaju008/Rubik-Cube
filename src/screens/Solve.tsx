import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CubeData, DoneStats } from '../App';
import type { Solution } from '../cube/beginner';
import { solve, Solutions } from '../cube/solverClient';
import { describeMove } from '../cube/describe';
import { invertAlg, isRotation, isSolved } from '../cube/model';
import { CubeCanvas, CubeCanvasHandle } from '../ui/CubeCanvas';
import { Mascot } from '../ui/Mascot';
import { MoveIcon } from '../ui/MoveIcon';
import { colorsFor, PALETTE } from '../scan/color';
import { useCamera } from '../hooks/useCamera';
import { moveClip, preload, speak, hasLine } from '../audio/voice';
import { sfx } from '../audio/sfx';

interface Step { move: string; stage: number; chunk: number; pos: number; chunkLen: number }
type Phase = 'thinking' | 'choose' | 'hold' | 'guide' | 'error';
const SPEEDS = [{ label: 'Relaxed', ms: 4500 }, { label: 'Normal', ms: 3000 }, { label: 'Quick', ms: 1900 }];
const STAGE_CLIP: Record<string, string> = { cross: 'stage_cross', corners: 'stage_corners', middle: 'stage_middle', ycross: 'stage_ycross', yedges: 'stage_yedges', ycorners: 'stage_ycorners', twist: 'stage_twist' };

interface Props { cube: CubeData; onDone: (s: DoneStats) => void; onBack: () => void }

export function Solve({ cube, onDone, onBack }: Props) {
  const colors = useMemo(() => colorsFor(cube.names), [cube.names]);
  const [phase, setPhase] = useState<Phase>('thinking');
  const [sols, setSols] = useState<Solutions | null>(null);
  const [sol, setSol] = useState<Solution | null>(null);
  const [i, setI] = useState(0);
  const [intro, setIntro] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [liveMode, setLiveMode] = useState(cube.source !== 'demo');
  const viewRef = useRef<CubeCanvasHandle>(null);
  const token = useRef(0);
  const startedAt = useRef(0);
  const cam = useCamera();

  const front = cube.names[2], top = cube.names[0];
  const standard = front === 'red' && top === 'yellow';

  useEffect(() => {
    if (isSolved(cube.state)) { onDone({ moves: 0, ms: 0, method: 'beginner' }); return; }
    let alive = true;
    preload(['choose', 'hold', 'go', 'stage_cross', 'alg_cross', 'm_R', 'm_Rp', 'm_U', 'm_Up', 'm_F', 'm_Fp', 'm_D', 'm_L', 'm_B', 'solved']);
    solve(cube.state).then((r) => {
      if (!alive) return;
      setSols(r);
      if (!r.beginner && !r.fast) { setPhase('error'); return; }
      setPhase('choose');
      speak('choose');
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // camera for live mode
  useEffect(() => {
    if ((phase === 'hold' || phase === 'guide') && liveMode && cam.status !== 'live' && cam.status !== 'starting') cam.start('user');
    if (!liveMode && cam.status === 'live') cam.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, liveMode]);
  const live = liveMode && cam.status !== 'denied' && cam.status !== 'unavailable';

  const steps: Step[] = useMemo(() => {
    if (!sol) return [];
    const out: Step[] = [];
    sol.stages.forEach((st, si) => st.chunks.forEach((c, ci) => c.moves.forEach((m, pi) => out.push({ move: m, stage: si, chunk: ci, pos: pi, chunkLen: c.moves.length }))));
    return out;
  }, [sol]);

  const pick = (s: Solution) => {
    sfx.pop();
    setSol(s);
    setPhase('hold');
    speak(standard ? 'hold' : `Hold your cube with ${top} on top and ${front} facing you. Keep it that way the whole time.`);
  };

  const begin = () => {
    sfx.start();
    setPhase('guide');
    startedAt.current = performance.now();
    if (sol?.method === 'beginner') setIntro(steps[0]?.stage ?? 0);
    else speak('go');
  };

  const cur = steps[i];
  const stage = cur && sol ? sol.stages[cur.stage] : null;
  const chunk = cur && stage ? stage.chunks[cur.chunk] : null;

  // show + speak the current move
  useEffect(() => {
    if (phase !== 'guide' || !sol) return;
    const v = viewRef.current?.view;
    if (!cur) {
      v?.showMove(null);
      sfx.solved();
      speak('solved');
      const t = setTimeout(() => onDone({ moves: steps.filter((s) => !isRotation(s.move)).length, ms: performance.now() - startedAt.current, method: sol.method }), 1100);
      return () => clearTimeout(t);
    }
    if (intro !== null) { v?.showMove(null); return; }
    const myToken = token.current;
    const wait = setTimeout(() => { if (token.current === myToken) v?.showMove(cur.move); }, 30);
    const lines: string[] = [];
    if (cur.pos === 0 && chunk?.voice && cur.chunkLen > 2) lines.push(chunk.voice);
    lines.push(hasLine(moveClip(cur.move)) ? moveClip(cur.move) : describeMove(cur.move).speak);
    speak(lines);
    // warm up the next few clips
    preload(steps.slice(i + 1, i + 4).map((s) => moveClip(s.move)));
    return () => clearTimeout(wait);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, phase, intro, sol]);

  // stage intro voice
  useEffect(() => {
    if (intro === null || !sol) return;
    const st = sol.stages[intro];
    if (intro > 0) sfx.stage();
    speak([...(intro > 0 ? ['stage_nice'] : []), STAGE_CLIP[st.id] ?? `${st.title}. ${st.goal}`]);
  }, [intro, sol]);

  const next = useCallback(async () => {
    if (phase !== 'guide') return;
    if (intro !== null) { sfx.tap(); setIntro(null); return; }
    const s = steps[i];
    if (!s) return;
    const t = ++token.current;
    sfx.turn();
    if (navigator.vibrate) try { navigator.vibrate(12); } catch { /* ignore */ }
    const nextStep = steps[i + 1];
    const v = viewRef.current?.view;
    const p = v?.commit(s.move, 260);
    setI(i + 1);
    if (nextStep && sol?.method === 'beginner' && nextStep.stage !== s.stage) setIntro(nextStep.stage);
    await p;
    if (token.current === t && nextStep && v && (sol?.method !== 'beginner' || nextStep.stage === s.stage)) v.showMove(nextStep.move);
  }, [phase, intro, steps, i, sol]);

  const back = useCallback(() => {
    if (phase !== 'guide' || i === 0) return;
    setIntro(null);
    token.current++;
    sfx.tap();
    const prev = steps[i - 1];
    viewRef.current?.view?.commit(invertAlg([prev.move])[0], 260).then(() => viewRef.current?.view?.showMove(prev.move));
    setI(i - 1);
  }, [phase, i, steps]);

  useEffect(() => {
    if (!auto || phase !== 'guide' || !cur) return;
    const t = setTimeout(() => next(), intro !== null ? 7500 : SPEEDS[speed].ms);
    return () => clearTimeout(t);
  }, [auto, phase, cur, intro, speed, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement) return;
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') back();
      else if (e.key.toLowerCase() === 'a') setAuto((a) => !a);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [next, back]);

  if (phase === 'thinking') {
    return <div className="center-card card"><Mascot size={100} mood="think" className="bob" /><h2>Cubr is thinking…</h2><p className="muted">Working out the best way to solve your cube.</p></div>;
  }
  if (phase === 'error') {
    return (
      <div className="center-card card">
        <Mascot size={100} mood="think" />
        <h2>That cube can't be solved</h2>
        <p className="muted">A sticker was probably misread. Go back and check the colours.</p>
        <button className="btn-toy" onClick={onBack}>← Fix colours</button>
      </div>
    );
  }
  if (phase === 'choose' && sols) {
    return (
      <div className="choose">
        <h1>Pick your route</h1>
        <div className="route-grid">
          {sols.beginner && (
            <button className="route card c-green" onClick={() => pick(sols.beginner!)}>
              <span className="tag">Recommended</span>
              <h2>🎓 Learn route</h2>
              <p>The beginner method in {sols.beginner.stages.filter((s) => s.chunks.length).length} stages. You learn it while you solve it.</p>
              <p className="big-num">{sols.beginner.moveCount}<small> moves</small></p>
            </button>
          )}
          {sols.fast && (
            <button className="route card c-pink" onClick={() => pick(sols.fast!)}>
              <span className="tag">Speedy</span>
              <h2>⚡ Fast route</h2>
              <p>The computer's shortcut, close to the fewest moves possible. Just follow the arrows.</p>
              <p className="big-num">{sols.fast.moveCount}<small> moves</small></p>
            </button>
          )}
        </div>
        <button className="btn-ghost" onClick={onBack}>← Back to colours</button>
      </div>
    );
  }

  const total = steps.length;
  const words = cur ? describeMove(cur.move) : null;
  const introStage = intro !== null && sol ? sol.stages[intro] : null;
  const tapBg = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement;
    if (el === e.currentTarget || el.classList.contains('vignette') || el.tagName === 'VIDEO') next();
  };

  return (
    <div className={`solve full-stage ${live ? 'is-live' : 'is-3d'}`} onClick={tapBg}>
      {live && <video ref={cam.videoRef} className="mirror" autoPlay playsInline muted />}
      <div className="vignette" />

      <div className={`solve-cube ${live ? 'float' : 'hero'}`}>
        {live && <span className="float-label">3D guide</span>}
        <CubeCanvas ref={viewRef} state={cube.state} colors={colors} peek onTap={next} label="Your cube, showing the next move" />
      </div>

      {phase === 'guide' && sol && (
        <div className="solve-top">
          {sol.method === 'beginner' && (
            <ol className="stage-rail">
              {sol.stages.map((st, si) => (
                <li key={st.id} className={cur ? (si < cur.stage ? 'done' : si === cur.stage ? 'now' : '') : 'done'}>
                  <span>{si + 1}</span><em>{st.title}</em>
                </li>
              ))}
            </ol>
          )}
          <div className="progress"><i style={{ width: `${(i / Math.max(1, total)) * 100}%` }} /></div>
        </div>
      )}

      {phase === 'hold' && (
        <div className="overlay-card card center-pop">
          <h2>Hold your cube like this</h2>
          <div className="hold-rule">
            <span className="rule"><i style={{ background: PALETTE[top] }} />Top <b>{top}</b></span>
            <span className="rule"><i style={{ background: PALETTE[front] }} />Facing you <b>{front}</b></span>
            <span className="rule"><i style={{ background: PALETTE[cube.names[3]] }} />Bottom <b>{cube.names[3]}</b></span>
          </div>
          <p>Keep it that way. Cubr will tell you when to turn the whole cube.</p>
          <button className="btn-toy big" onClick={begin}>I'm ready →</button>
        </div>
      )}

      {introStage && (
        <div className="overlay-card card center-pop stage-intro">
          <p className="step-n">Stage {intro! + 1} of {sol!.stages.length}</p>
          <h2>{introStage.title}</h2>
          <p>{introStage.goal}</p>
          <p className="tip">💡 {introStage.tip}</p>
          <button className="btn-toy" onClick={next}>Let's go →</button>
        </div>
      )}

      {phase === 'guide' && cur && words && !introStage && (
        <div className={`instr ${isRotation(cur.move) ? 'rotate' : ''}`} key={i} aria-live="polite">
          <MoveIcon move={cur.move} size={live ? 150 : 128} />
          <div className="instr-text">
            <span className="instr-note mono">{cur.move}</span>
            <p className="instr-words">{words.long}</p>
            <p className="instr-sub">Move {i + 1} of {total}{stage && sol?.method === 'beginner' ? ` · ${stage.title}` : ''}</p>
          </div>
        </div>
      )}

      {phase === 'guide' && sol && (
        <div className="solve-bottom">
          {chunk && cur && !introStage && (
            <div className="chunk">
              <p className="label">{chunk.kind === 'alg' ? `Algorithm · ${chunk.label}` : chunk.label}</p>
              <div className="chips">
                {chunk.moves.map((m, k) => <span key={k} className={`mchip mono ${k === cur.pos ? 'now' : k < cur.pos ? 'past' : ''}`}>{m}</span>)}
              </div>
            </div>
          )}
          <div className="controls">
            <button className="btn-round" onClick={back} disabled={i === 0} aria-label="Previous move">◀</button>
            <button className="btn-toy big grow" onClick={next}>{intro !== null ? "Let's go" : 'Done, next'} →</button>
            <button className={`btn-round ${auto ? 'on' : ''}`} onClick={() => setAuto(!auto)} aria-label={auto ? 'Pause auto-play' : 'Auto-play'}>{auto ? '⏸' : '▶'}</button>
          </div>
          <div className="row small-row">
            <label className="muted small">Auto
              <select value={speed} onChange={(e) => setSpeed(+e.target.value)}>
                {SPEEDS.map((s, k) => <option key={s.label} value={k}>{s.label}</option>)}
              </select>
            </label>
            <div className="seg" role="group" aria-label="View">
              <button className={live ? 'on' : ''} onClick={() => setLiveMode(true)}>📷 Live</button>
              <button className={!live ? 'on' : ''} onClick={() => setLiveMode(false)}>🧊 3D</button>
            </div>
          </div>
          <p className="tap-hint">Tap anywhere or press Space for the next move</p>
        </div>
      )}
    </div>
  );
}
