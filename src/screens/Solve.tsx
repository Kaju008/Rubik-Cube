import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CubeData, DoneStats } from '../App';
import type { Solution } from '../cube/beginner';
import { solve, Solutions } from '../cube/solverClient';
import { describeMove } from '../cube/describe';
import { invertAlg, isRotation, isSolved } from '../cube/model';
import { CubeCanvas, CubeCanvasHandle } from '../ui/CubeCanvas';
import { Mascot } from '../ui/Mascot';
import { colorsFor, PALETTE } from '../scan/color';
import { useCamera } from '../hooks/useCamera';
import { say } from '../audio/voice';
import { sfx } from '../audio/sfx';

interface Step { move: string; stage: number; chunk: number; pos: number; chunkLen: number }
type Phase = 'thinking' | 'choose' | 'hold' | 'guide' | 'error';
const SPEEDS = [{ label: 'Relaxed', ms: 4200 }, { label: 'Normal', ms: 2800 }, { label: 'Quick', ms: 1700 }];

interface Props { cube: CubeData; onDone: (s: DoneStats) => void; onBack: () => void }

export function Solve({ cube, onDone, onBack }: Props) {
  const colors = useMemo(() => colorsFor(cube.names), [cube.names]);
  const [phase, setPhase] = useState<Phase>('thinking');
  const [sols, setSols] = useState<Solutions | null>(null);
  const [sol, setSol] = useState<Solution | null>(null);
  const [i, setI] = useState(0);
  const [intro, setIntro] = useState<number | null>(null); // stage index whose intro card is showing
  const [auto, setAuto] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [pip, setPip] = useState(cube.source === 'scan');
  const viewRef = useRef<CubeCanvasHandle>(null);
  const token = useRef(0);
  const startedAt = useRef(0);
  const cam = useCamera();

  const front = cube.names[2], bottom = cube.names[3];

  useEffect(() => {
    if (isSolved(cube.state)) { onDone({ moves: 0, ms: 0, method: 'beginner' }); return; }
    let alive = true;
    solve(cube.state).then((r) => {
      if (!alive) return;
      setSols(r);
      if (!r.beginner && !r.fast) { setPhase('error'); return; }
      setPhase('choose');
      say('Pick your route. The learn route teaches you the beginner method, stage by stage. The fast route finishes in the fewest moves.');
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    say(`Hold your cube with ${front} facing you and ${bottom} on the bottom, just like on screen. Keep it that way the whole time.`);
  };

  const begin = () => {
    sfx.start();
    setPhase('guide');
    startedAt.current = performance.now();
    if (pip) cam.start('user');
    if (sol?.method === 'beginner') setIntro(steps[0]?.stage ?? 0);
  };

  const cur = steps[i];
  const stage = cur && sol ? sol.stages[cur.stage] : null;
  const chunk = cur && stage ? stage.chunks[cur.chunk] : null;

  // show/loop the current move and speak it
  useEffect(() => {
    if (phase !== 'guide' || !sol) return;
    const v = viewRef.current?.view;
    if (!cur) {
      v?.showMove(null);
      sfx.solved();
      say('Yes! You solved it! Amazing work.');
      const t = setTimeout(() => onDone({ moves: steps.filter((s) => !isRotation(s.move)).length, ms: performance.now() - startedAt.current, method: sol.method }), 900);
      return () => clearTimeout(t);
    }
    if (intro !== null) { v?.showMove(null); return; }
    const myToken = token.current;
    const wait = setTimeout(() => {
      if (token.current !== myToken) return;
      v?.showMove(cur.move);
    }, 30);
    const w = describeMove(cur.move);
    const chunkIntro = cur.pos === 0 && chunk && chunk.kind === 'alg' && cur.chunkLen > 2 ? `${chunk.label.replace(/×/g, 'times')}. ` : '';
    say(chunkIntro + w.speak, { rate: 1.05 });
    return () => clearTimeout(wait);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, phase, intro, sol]);

  // stage intro voice
  useEffect(() => {
    if (intro === null || !sol) return;
    const st = sol.stages[intro];
    const prevDone = intro > 0 ? `Nice, ${sol.stages[intro - 1].title} done! ` : '';
    if (intro > 0) sfx.stage();
    say(`${prevDone}Stage ${intro + 1}: ${st.title}. ${st.goal} Tip: ${st.tip}`);
  }, [intro, sol]);

  const next = useCallback(async () => {
    if (phase !== 'guide') return;
    if (intro !== null) { sfx.tap(); setIntro(null); return; }
    const s = steps[i];
    if (!s) return;
    const t = ++token.current;
    sfx.turn();
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

  // auto-play
  useEffect(() => {
    if (!auto || phase !== 'guide' || !cur) return;
    const t = setTimeout(() => next(), intro !== null ? 6500 : SPEEDS[speed].ms);
    return () => clearTimeout(t);
  }, [auto, phase, cur, intro, speed, next]);

  // keyboard: space/→ next, ← back, A auto
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') back();
      else if (e.key.toLowerCase() === 'a') setAuto((a) => !a);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [next, back]);

  const togglePip = () => {
    if (pip) { cam.stop(); setPip(false); } else { setPip(true); cam.start('user'); }
  };

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

  return (
    <div className="solve">
      <div className="solve-stage">
        <CubeCanvas ref={viewRef} state={cube.state} colors={colors} peek onTap={next} label="Your cube, showing the next move" />
        {phase === 'hold' && (
          <div className="overlay-card card">
            <h2>Hold your cube like this</h2>
            <p>
              <b style={{ color: PALETTE[front] }}>{front.toUpperCase()}</b> facing you, <b style={{ color: PALETTE[bottom] }}>{bottom.toUpperCase()}</b> on the bottom.
              Keep it that way. Cubr will tell you when to turn the whole cube.
            </p>
            <button className="btn-toy big" onClick={begin}>I'm ready →</button>
          </div>
        )}
        {introStage && (
          <div className="overlay-card card stage-intro">
            <p className="step-n">Stage {intro! + 1} of {sol!.stages.length}</p>
            <h2>{introStage.title}</h2>
            <p>{introStage.goal}</p>
            <p className="tip">💡 {introStage.tip}</p>
            <button className="btn-toy" onClick={next}>Let's go →</button>
          </div>
        )}
        {pip && phase === 'guide' && (
          <div className="pip">
            <video ref={cam.videoRef} className="mirror" autoPlay playsInline muted />
            {cam.status !== 'live' && <span>camera…</span>}
          </div>
        )}
        {phase === 'guide' && <p className="tap-hint">Tap the cube or press Space for the next move</p>}
      </div>

      {phase === 'guide' && sol && (
        <aside className="solve-panel">
          {sol.method === 'beginner' && (
            <ol className="stage-rail">
              {sol.stages.map((st, si) => (
                <li key={st.id} className={cur ? (si < cur.stage ? 'done' : si === cur.stage ? 'now' : '') : 'done'}>
                  <span>{si + 1}</span>{st.title}
                </li>
              ))}
            </ol>
          )}
          <div className="progress" aria-label={`Move ${Math.min(i + 1, total)} of ${total}`}><i style={{ width: `${(i / Math.max(1, total)) * 100}%` }} /></div>

          {cur && words && (
            <div className={`move-card card ${isRotation(cur.move) ? 'rotate' : ''}`} aria-live="polite">
              <div className="move-big mono">{isRotation(cur.move) ? '🔄' : cur.move}</div>
              <div>
                <p className="move-words">{words.long}</p>
                <p className="muted small">Move {i + 1} of {total}{stage && sol.method === 'beginner' ? ` · ${stage.title}` : ''}</p>
              </div>
            </div>
          )}
          {chunk && cur && (
            <div className="chunk">
              <p className="label">{chunk.kind === 'alg' ? `Algorithm · ${chunk.label}` : chunk.label}</p>
              <div className="chips">
                {chunk.moves.map((m, k) => <span key={k} className={`mchip mono ${k === cur.pos ? 'now' : k < cur.pos ? 'past' : ''}`}>{m}</span>)}
              </div>
            </div>
          )}
          {stage && sol.method === 'beginner' && <p className="tip small">💡 {stage.tip}</p>}

          <div className="controls">
            <button className="btn-round" onClick={back} disabled={i === 0} aria-label="Previous move">◀</button>
            <button className="btn-toy big grow" onClick={next}>{intro !== null ? "Let's go" : 'Done, next'} →</button>
            <button className={`btn-round ${auto ? 'on' : ''}`} onClick={() => setAuto(!auto)} aria-label={auto ? 'Pause auto-play' : 'Auto-play'}>{auto ? '⏸' : '▶'}</button>
          </div>
          <div className="row small-row">
            <label className="muted small">Auto speed
              <select value={speed} onChange={(e) => setSpeed(+e.target.value)}>
                {SPEEDS.map((s, k) => <option key={s.label} value={k}>{s.label}</option>)}
              </select>
            </label>
            <button className={`chip ${pip ? 'on' : ''}`} onClick={togglePip}>📷 Mirror cam</button>
          </div>
        </aside>
      )}
    </div>
  );
}
