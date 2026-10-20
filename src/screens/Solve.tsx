import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CubeData, DoneStats } from '../App';
import type { Chunk, Solution } from '../cube/beginner';
import { solve, Solutions } from '../cube/solverClient';
import { describeMove } from '../cube/describe';
import { applyMoves, invertAlg, isRotation, isSolved, State } from '../cube/model';
import { CORNERS, EDGES } from '../cube/pieces';
import { CubeCanvas, CubeCanvasHandle } from '../ui/CubeCanvas';
import { MoveIcon } from '../ui/MoveIcon';
import { Icon } from '../ui/Icon';
import { FloatCam, CamMode } from '../ui/FloatCam';
import { ColorName, colorsFor, guessColor, labDist, PALETTE } from '../scan/color';
import { sampleUnderGrid } from '../scan/sampler';
import { rotIndex } from '../scan/resolve';
import { useCamera } from '../hooks/useCamera';
import { moveClip, preload, speak, hasLine } from '../audio/voice';
import { sfx } from '../audio/sfx';

interface Step { move: string; stage: number; chunk: number; pos: number; chunkLen: number }
type Phase = 'thinking' | 'choose' | 'hold' | 'guide' | 'error';
type Recover = null | 'menu' | 'check' | 'undo' | 'wrong';
interface CheckResult { kind: 'ok' | 'found' | 'lost'; k?: number }

const SPEEDS = [{ label: 'Relaxed', ms: 4500 }, { label: 'Normal', ms: 3000 }, { label: 'Quick', ms: 1900 }];
const STAGE_CLIP: Record<string, string> = { cross: 'stage_cross', corners: 'stage_corners', middle: 'stage_middle', ycross: 'stage_ycross', yedges: 'stage_yedges', ycorners: 'stage_ycorners', twist: 'stage_twist' };
const STAGE_ICON: Record<string, string> = { cross: 'plus', corners: 'corner', middle: 'layers', ycross: 'plus', yedges: 'swap', ycorners: 'cycle', twist: 'twist', fast: 'bolt' };
const PAD = ['R', "R'", 'R2', 'L', "L'", 'L2', 'U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2'];

/** "white–red–green" style names for a target piece, white/yellow first. */
function pieceNames(target: number[], names: ColorName[]) {
  const n = target.map((c) => names[c]);
  return n.sort((a, b) => (a === 'white' || a === 'yellow' ? -1 : b === 'white' || b === 'yellow' ? 1 : 0));
}

function goalOf(c: Chunk | null, names: ColorName[]): { text: string; clip?: string; dots: ColorName[] } | null {
  if (!c?.goal) return null;
  const dots = c.target ? pieceNames(c.target, names) : [];
  const key = [...dots].sort().join('_');
  switch (c.goal) {
    case 'corner': return { text: `Bringing the ${dots.join('–')} corner home`, clip: `goal_c_${key}`, dots };
    case 'edge': return { text: `Slotting the ${dots.join('–')} edge into the middle layer`, clip: `goal_e_${key}`, dots };
    case 'cross': return { text: 'Building the white cross on the bottom', clip: 'goal_cross', dots: ['white'] };
    case 'ycross': return { text: 'Turning the top into a yellow cross', clip: 'goal_ycross', dots: ['yellow'] };
    case 'yedges': return { text: 'Matching the yellow edges with their side colours', clip: 'goal_yedges', dots: ['yellow'] };
    case 'ycorners': return { text: 'Moving the yellow corners to their homes', clip: 'goal_ycorners', dots: ['yellow'] };
    case 'twist': return { text: 'Twisting the front-right corner until yellow faces up', clip: 'goal_twist', dots: ['yellow'] };
    default: return { text: 'Following the shortest route to solved', dots: [] };
  }
}

function pieceFacelets(st: State, target: number[]): number[] {
  const want = [...target].sort().join();
  for (const p of [...CORNERS, ...EDGES]) {
    if (p.facelets.length !== target.length) continue;
    if (p.facelets.map((f) => st[f]).sort().join() === want) return p.facelets;
  }
  return [];
}

interface Props { cube: CubeData; initialMethod?: Solution['method']; onDone: (s: DoneStats) => void; onBack: () => void; onRescan: (method: Solution['method']) => void }

export function Solve({ cube, initialMethod, onDone, onBack, onRescan }: Props) {
  const colors = useMemo(() => colorsFor(cube.names), [cube.names]);
  const [phase, setPhase] = useState<Phase>('thinking');
  const [sols, setSols] = useState<Solutions | null>(null);
  const [sol, setSol] = useState<Solution | null>(null);
  const [base, setBase] = useState<State>(cube.state);
  const [i, setI] = useState(0);
  const [intro, setIntro] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [camMode, setCamMode] = useState<CamMode | 'off'>(cube.source === 'scan' ? 'float' : 'off');
  const [recover, setRecover] = useState<Recover>(null);
  const [undoTarget, setUndoTarget] = useState<number | null>(null);
  const [undoN, setUndoN] = useState(3);
  const [wrong, setWrong] = useState<string[]>([]);
  const [check, setCheck] = useState<{ result: CheckResult | null; hint: string; live: (ColorName | null)[] }>({ result: null, hint: '', live: Array(9).fill(null) });
  const [busy, setBusy] = useState(false);
  const [backs, setBacks] = useState(0);
  const viewRef = useRef<CubeCanvasHandle>(null);
  const camBox = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const token = useRef(0);
  const startedAt = useRef(0);
  const cam = useCamera();

  const front = cube.names[2], top = cube.names[0];
  const standard = front === 'red' && top === 'yellow';

  const pickSolution = useCallback((s: Solution) => {
    sfx.pop();
    setSol(s);
    setPhase('hold');
    speak(standard ? 'hold' : `Hold your cube with ${top} on top and ${front} facing you. Keep it that way the whole time.`);
  }, [standard, top, front]);

  useEffect(() => {
    if (isSolved(cube.state)) { onDone({ moves: 0, ms: 0, method: 'beginner' }); return; }
    let alive = true;
    preload(['choose', 'hold', 'go', 'stage_cross', 'alg_cross', 'goal_cross', 'm_R', 'm_Rp', 'm_U', 'm_Up', 'm_F', 'm_Fp', 'solved', 'stuck_open']);
    solve(cube.state).then((r) => {
      if (!alive) return;
      setSols(r);
      if (!r.beginner && !r.fast) { setPhase('error'); return; }
      const pre = initialMethod === 'fast' ? r.fast : initialMethod === 'beginner' ? r.beginner : null;
      if (pre) pickSolution(pre);
      else { setPhase('choose'); speak('choose'); }
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // camera on whenever it is shown
  useEffect(() => {
    const wantCam = (phase === 'hold' || phase === 'guide') && (camMode === 'float' || camMode === 'check');
    if (wantCam && cam.status !== 'live' && cam.status !== 'starting') cam.start('user');
    if ((camMode === 'off' || camMode === 'mini') && cam.status === 'live') cam.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, camMode]);

  const steps: Step[] = useMemo(() => {
    if (!sol) return [];
    const out: Step[] = [];
    sol.stages.forEach((st, si) => st.chunks.forEach((c, ci) => c.moves.forEach((m, pi) => out.push({ move: m, stage: si, chunk: ci, pos: pi, chunkLen: c.moves.length }))));
    return out;
  }, [sol]);
  const states = useMemo(() => {
    const out: State[] = [base];
    for (const s of steps) out.push(applyMoves(out[out.length - 1], [s.move]));
    return out;
  }, [base, steps]);

  const begin = () => {
    sfx.start();
    setPhase('guide');
    startedAt.current = performance.now();
    if (sol?.method === 'beginner') setIntro(steps[0]?.stage ?? 0);
    else speak('go');
  };

  const undoing = undoTarget !== null;
  const cur = steps[i];
  const stage = cur && sol ? sol.stages[cur.stage] : null;
  const chunk = cur && stage ? stage.chunks[cur.chunk] : null;
  const shownMove = undoing ? (steps[i - 1] ? invertAlg([steps[i - 1].move])[0] : null) : cur?.move ?? null;
  const goal = goalOf(chunk ?? null, cube.names);

  // show + speak the current move
  useEffect(() => {
    if (phase !== 'guide' || !sol) return;
    const v = viewRef.current?.view;
    if (!cur && !undoing) {
      v?.showMove(null); v?.setHighlight([]);
      sfx.solved();
      speak('solved');
      const t = setTimeout(() => onDone({ moves: steps.filter((s) => !isRotation(s.move)).length, ms: performance.now() - startedAt.current, method: sol.method }), 1200);
      return () => clearTimeout(t);
    }
    if (intro !== null || recover) { v?.showMove(null); return; }
    const myToken = token.current;
    const wait = setTimeout(() => { if (token.current === myToken && shownMove) v?.showMove(shownMove); }, 30);
    // the piece we're working on glows
    v?.setHighlight(!undoing && chunk?.target ? pieceFacelets(states[i], chunk.target) : []);
    const lines: string[] = [];
    if (!undoing) {
      const prev = steps[i - 1];
      const prevChunk = prev && sol.stages[prev.stage].chunks[prev.chunk];
      const newGoal = goal?.clip && (!prevChunk || prevChunk.goal !== chunk?.goal || String(prevChunk.target) !== String(chunk?.target));
      if (newGoal && goal?.clip && i > 0) lines.push(goal.clip);
      if (cur.pos === 0 && chunk?.voice && cur.chunkLen > 2) lines.push(chunk.voice);
    }
    if (shownMove) lines.push(hasLine(moveClip(shownMove)) ? moveClip(shownMove) : describeMove(shownMove).speak);
    speak(lines);
    preload(steps.slice(i + 1, i + 4).map((s) => moveClip(s.move)));
    return () => clearTimeout(wait);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, phase, intro, sol, undoTarget, recover]);

  useEffect(() => {
    if (intro === null || !sol) return;
    const st = sol.stages[intro];
    if (intro > 0) sfx.stage();
    speak([...(intro > 0 ? ['stage_nice'] : []), STAGE_CLIP[st.id] ?? `${st.title}. ${st.goal}`]);
  }, [intro, sol]);

  const jumpTo = useCallback((k: number) => {
    token.current++;
    setUndoTarget(null);
    setIntro(null);
    setI(k);
    viewRef.current?.view?.setState(states[k]);
  }, [states]);

  const back = useCallback(() => {
    if (phase !== 'guide' || i === 0) return;
    setIntro(null);
    token.current++;
    sfx.rewind();
    const prev = steps[i - 1];
    const v = viewRef.current?.view;
    v?.commit(invertAlg([prev.move])[0], 260).then(() => { if (!undoTarget) v.showMove(prev.move); });
    setI(i - 1);
    if (undoTarget !== null && i - 1 <= undoTarget) {
      setUndoTarget(null);
      setTimeout(() => { sfx.ok(); speak('undo_done'); }, 300);
    }
  }, [phase, i, steps, undoTarget]);

  const next = useCallback(async () => {
    if (phase !== 'guide' || recover) return;
    if (intro !== null) { sfx.tap(); setIntro(null); return; }
    if (undoing) { back(); return; }
    const s = steps[i];
    if (!s) return;
    setBacks(0);
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
  }, [phase, recover, intro, undoing, back, steps, i, sol]);

  const userBack = () => { setBacks((b) => b + 1); back(); };

  useEffect(() => {
    if (!auto || phase !== 'guide' || recover || (!cur && !undoing)) return;
    const t = setTimeout(() => next(), intro !== null ? 7500 : SPEEDS[speed].ms);
    return () => clearTimeout(t);
  }, [auto, phase, cur, intro, speed, next, recover, undoing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement || recover) return;
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') userBack();
      else if (e.key.toLowerCase() === 'a') setAuto((a) => !a);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, back, recover]);

  // ---------- recovery ----------
  const openRecover = () => { sfx.pop(); setAuto(false); setRecover('menu'); speak('stuck_open'); };
  const closeRecover = () => { setRecover(null); setCheck({ result: null, hint: '', live: Array(9).fill(null) }); if (camMode === 'check') setCamMode('float'); };

  const startUndo = () => {
    const n = Math.min(undoN, i);
    if (!n) return closeRecover();
    setRecover(null);
    setUndoTarget(i - n);
    sfx.rewind();
    speak('undo_start');
  };

  const replan = async (from: State) => {
    if (!sol) return;
    setBusy(true);
    const r = await solve(from);
    setBusy(false);
    const s2 = sol.method === 'fast' ? r.fast ?? r.beginner : r.beginner ?? r.fast;
    if (!s2) { sfx.error(); speak('check_lost'); return; }
    token.current++;
    setBase(from);
    setSol(s2);
    setI(0);
    setUndoTarget(null);
    setIntro(null);
    setWrong([]);
    setRecover(null);
    viewRef.current?.view?.setState(from);
    sfx.ok();
    speak('replan_done');
  };

  const startCheck = () => {
    setRecover('check');
    setCheck({ result: null, hint: 'Hold any side inside the box', live: Array(9).fill(null) });
    setCamMode('check');
    if (cam.status !== 'live') cam.start('user');
    speak('check_prompt');
  };

  /** Find the guide step whose expected cube shows this side (any rotation). */
  const locate = useCallback((g: (ColorName | null)[]): CheckResult => {
    const cid = g[4] ? cube.names.indexOf(g[4]) : -1;
    if (cid < 0) return { kind: 'lost' };
    let best = -1, ks: number[] = [];
    const lo = Math.max(0, i - 24), hi = Math.min(states.length - 1, i + 12);
    for (let k = lo; k <= hi; k++) {
      const st = states[k];
      const f = [0, 1, 2, 3, 4, 5].find((ff) => st[ff * 9 + 4] === cid);
      if (f === undefined) continue;
      let sc = 0;
      for (let rot = 0; rot < 4; rot++) {
        let m = 0;
        for (let c = 0; c < 9; c++) if (g[rotIndex(c, rot)] && cube.names[st[f * 9 + c]] === g[rotIndex(c, rot)]) m++;
        sc = Math.max(sc, m);
      }
      if (sc > best) { best = sc; ks = [k]; } else if (sc === best) ks.push(k);
    }
    if (best < 8) return { kind: 'lost' };
    if (ks.includes(i)) return { kind: 'ok', k: i };
    const k = ks.reduce((a, b) => (Math.abs(b - i) < Math.abs(a - i) ? b : a));
    return { kind: 'found', k };
  }, [cube.names, i, states]);

  // camera loop while checking one side
  useEffect(() => {
    if (recover !== 'check' || cam.status !== 'live' || check.result) return;
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    let raf = 0, last = 0, still = 0, prev: number[][] | null = null, miss = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 80) return;
      last = t;
      const v = cam.videoRef.current, box = v?.getBoundingClientRect(), grid = gridRef.current?.getBoundingClientRect();
      if (!v || !box || !grid) return;
      const cells = sampleUnderGrid(v, box, grid, cam.mirrored, ctx);
      if (!cells) return;
      const g = cells.map((c) => guessColor(c.rgb));
      const solid = cells.filter((c, q) => c.spread < 36 && g[q]).length;
      const shown = cam.mirrored ? [0, 1, 2, 3, 4, 5, 6, 7, 8].map((q) => g[Math.floor(q / 3) * 3 + 2 - (q % 3)]) : g;
      if (solid < 7) { miss++; if (miss > 2) { still = 0; setCheck((c) => ({ ...c, live: shown, hint: 'Place one side of the cube inside the box' })); } return; }
      miss = 0;
      const labs = cells.map((c) => c.lab as unknown as number[]);
      const motion = prev ? labs.map((l, q) => labDist(l as never, prev![q] as never)).sort((a, b) => a - b)[4] : 99;
      prev = labs;
      still = motion < 9 ? still + 1 : 0;
      setCheck((c) => ({ ...c, live: shown, hint: still >= 1 ? 'Hold still…' : 'Hold still…' }));
      if (still >= 5) {
        cancelAnimationFrame(raf);
        sfx.capture();
        const res = locate(g);
        setCheck((c) => ({ ...c, result: res, hint: '' }));
        if (res.kind === 'ok') { sfx.ok(); speak('check_ok'); }
        else if (res.kind === 'found') { sfx.ok(); speak('check_found'); }
        else { sfx.error(); speak('check_lost'); }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [recover, cam.status, cam.mirrored, cam.videoRef, check.result, locate]);

  const applyCheck = () => {
    const r = check.result;
    if (r?.kind === 'found' && r.k !== undefined) jumpTo(r.k);
    closeRecover();
  };

  // ---------- render ----------
  if (phase === 'thinking') {
    return <div className="center-card card"><div className="spinner" /><h2>Planning your route…</h2><p className="muted">Working out the best way to solve your cube.</p></div>;
  }
  if (phase === 'error') {
    return (
      <div className="center-card card">
        <Icon name="info" size={28} />
        <h2>That cube can't be solved</h2>
        <p className="muted">A sticker was probably misread. Go back and check the colours.</p>
        <button className="btn-primary" onClick={onBack}><Icon name="arrow-left" size={18} />Fix colours</button>
      </div>
    );
  }
  if (phase === 'choose' && sols) {
    return (
      <div className="choose">
        <p className="eyebrow">Your cube is ready</p>
        <h1>Choose your route</h1>
        <div className="route-grid">
          {sols.beginner && (
            <button className="route card" onClick={() => pickSolution(sols.beginner!)}>
              <span className="route-ico"><Icon name="learn" size={24} /></span>
              <span className="badge">Recommended</span>
              <h2>Learn route</h2>
              <p>The beginner method in {sols.beginner.stages.filter((s) => s.chunks.length).length} named stages. You learn it while you solve it.</p>
              <p className="big-num">{sols.beginner.moveCount}<small>moves</small></p>
            </button>
          )}
          {sols.fast && (
            <button className="route card" onClick={() => pickSolution(sols.fast!)}>
              <span className="route-ico pink"><Icon name="bolt" size={24} /></span>
              <span className="badge pink">Fastest</span>
              <h2>Fast route</h2>
              <p>The computer's shortcut, close to the fewest moves possible. Just follow the arrows.</p>
              <p className="big-num">{sols.fast.moveCount}<small>moves</small></p>
            </button>
          )}
        </div>
        <button className="btn-text" onClick={onBack}><Icon name="arrow-left" size={16} />Back to colours</button>
      </div>
    );
  }

  const total = steps.length;
  const words = shownMove ? describeMove(shownMove) : null;
  const introStage = intro !== null && sol ? sol.stages[intro] : null;
  const camLive = cam.status === 'live';

  return (
    <div className="solve full-stage" onClick={(e) => { if (e.target === e.currentTarget) next(); }}>
      <div className="solve-cube hero">
        <CubeCanvas ref={viewRef} state={base} colors={colors} peek onTap={next} label="Your cube, showing the next move" />
      </div>

      {phase === 'guide' && sol && (
        <header className="solve-top">
          {sol.method === 'beginner' ? (
            <ol className="stepper">
              {sol.stages.map((st, si) => {
                const state = cur ? (si < cur.stage ? 'done' : si === cur.stage ? 'now' : '') : 'done';
                return (
                  <li key={st.id} className={state} title={st.title}>
                    <span className="st-dot">{state === 'done' ? <Icon name="check" size={13} /> : <Icon name={STAGE_ICON[st.id] ?? 'cube'} size={13} />}</span>
                    <em>{st.title}</em>
                  </li>
                );
              })}
            </ol>
          ) : <p className="eyebrow">Fast route</p>}
          <div className="progress" aria-label={`Move ${Math.min(i + 1, total)} of ${total}`}><i style={{ width: `${(i / Math.max(1, total)) * 100}%` }} /></div>
        </header>
      )}

      {phase === 'hold' && (
        <div className="overlay-card card center-pop">
          <p className="eyebrow">Before you start</p>
          <h2>Hold your cube like this</h2>
          <div className="hold-rule">
            <span className="rule"><i style={{ background: PALETTE[top] }} />Top<b>{top}</b></span>
            <span className="rule"><i style={{ background: PALETTE[front] }} />Facing you<b>{front}</b></span>
            <span className="rule"><i style={{ background: PALETTE[cube.names[3]] }} />Bottom<b>{cube.names[3]}</b></span>
          </div>
          <p className="muted">Keep it that way. Cubr tells you whenever to turn the whole cube.</p>
          <button className="btn-primary lg" onClick={begin}>I'm ready<Icon name="arrow-right" size={18} /></button>
        </div>
      )}

      {introStage && !recover && (
        <div className="overlay-card card center-pop stage-intro">
          <p className="eyebrow">Stage {intro! + 1} of {sol!.stages.length}</p>
          <h2><Icon name={STAGE_ICON[introStage.id] ?? 'cube'} size={22} />{introStage.title}</h2>
          <p>{introStage.goal}</p>
          <p className="tip"><Icon name="bulb" size={16} />{introStage.tip}</p>
          <button className="btn-primary" onClick={next}>Let's go<Icon name="arrow-right" size={18} /></button>
        </div>
      )}

      {phase === 'guide' && sol && !introStage && (cur || undoing) && words && shownMove && (
        <aside className={`move-panel ${undoing ? 'undo' : ''}`} aria-live="polite">
          {undoing ? (
            <div className="goal undo-goal"><Icon name="undo" size={16} /><span>Undoing: {i - (undoTarget ?? 0)} move{i - (undoTarget ?? 0) === 1 ? '' : 's'} to go</span></div>
          ) : goal && (
            <div className="goal">
              <span className="goal-dots">{goal.dots.map((d) => <i key={d} style={{ background: PALETTE[d] }} />)}</span>
              <span>{goal.text}</span>
            </div>
          )}
          <div className="move-main" key={`${i}-${undoing}`}>
            <MoveIcon move={shownMove} size={132} />
            <div className="mm-text">
              <span className={`notation ${isRotation(shownMove) ? 'rot' : ''}`}>{shownMove}</span>
              <p className="mm-words">{words.long}</p>
              <p className="mm-sub">{undoing ? 'Reverse move' : `Move ${i + 1} of ${total}`}{!undoing && stage && sol.method === 'beginner' ? ` · ${stage.title}` : ''}</p>
            </div>
          </div>
          {!undoing && chunk && cur && (
            <div className="chunk">
              <p className="label">{chunk.kind === 'alg' ? <>Algorithm · <b>{chunk.label}</b></> : chunk.label}</p>
              <div className="chips">
                {chunk.moves.map((m, k) => <span key={k} className={`mchip mono ${k === cur.pos ? 'now' : k < cur.pos ? 'past' : ''}`}>{m}</span>)}
              </div>
            </div>
          )}
          {!undoing && stage && sol.method === 'beginner' && <p className="tip small"><Icon name="bulb" size={15} />{stage.tip}</p>}
        </aside>
      )}

      {phase === 'guide' && sol && (
        <div className="control-bar">
          <button className="icon-btn" onClick={userBack} disabled={i === 0 || undoing} aria-label="Previous move" title="Previous move (←)"><Icon name="prev" size={20} /></button>
          <button className={`btn-primary lg grow ${undoing ? 'amber' : ''}`} onClick={next}>
            {intro !== null ? "Let's go" : undoing ? 'Undone, next' : 'Done, next'}<Icon name="arrow-right" size={18} />
          </button>
          <button className={`icon-btn ${auto ? 'on' : ''}`} onClick={() => setAuto(!auto)} aria-label={auto ? 'Pause auto-play' : 'Auto-play'} title="Auto-play (A)"><Icon name={auto ? 'pause' : 'play'} size={18} /></button>
          <select className="speed-select" value={speed} onChange={(e) => setSpeed(+e.target.value)} aria-label="Auto-play speed">
            {SPEEDS.map((s, k) => <option key={s.label} value={k}>{s.label}</option>)}
          </select>
          <span className="cb-sep" />
          <button className={`btn-stuck ${backs >= 2 ? 'pulse' : ''}`} onClick={openRecover}><Icon name="lifebuoy" size={18} />Stuck?</button>
        </div>
      )}

      {phase === 'guide' && camMode === 'off' && (
        <button className="cam-pill" onClick={() => setCamMode('float')} aria-label="Show camera"><Icon name="camera" size={18} /><span>Camera</span></button>
      )}
      {(phase === 'guide' || phase === 'hold') && camMode !== 'off' && (
        <FloatCam
          ref={camBox}
          videoRef={cam.videoRef}
          live={camLive}
          mode={camMode}
          onMode={(m) => setCamMode(m)}
          onClose={() => { if (camMode === 'check') { closeRecover(); } else { setCamMode('off'); cam.stop(); } }}
          overlay={camMode === 'check' && (
            <div className="check-overlay">
              <div className="check-grid" ref={gridRef}>
                {check.live.map((c, k) => <span key={k} style={{ ['--c' as string]: c ? PALETTE[c] : 'transparent' }} className={c ? 'seen' : ''} />)}
              </div>
              {!check.result && <p className="check-hint">{check.hint}</p>}
            </div>
          )}
        />
      )}

      {recover && recover !== 'check' && (
        <div className="sheet-wrap" onClick={(e) => { if (e.target === e.currentTarget) closeRecover(); }}>
          <div className="sheet card" role="dialog" aria-label="Get back on track">
            <button className="sheet-x icon-btn sm" onClick={closeRecover} aria-label="Close"><Icon name="close" size={18} /></button>
            {recover === 'menu' && (
              <>
                <p className="eyebrow">Stuck or made a wrong turn?</p>
                <h2>Let's get you back on track</h2>
                <div className="recover-grid">
                  <button className="rc-opt" onClick={startCheck}>
                    <span className="rc-ico"><Icon name="search" size={22} /></span>
                    <b>Check where I am</b><span>Show one side to the camera. Cubr finds your place in the guide.</span>
                  </button>
                  <button className="rc-opt" onClick={() => { setUndoN(Math.min(3, i)); setRecover('undo'); }} disabled={i === 0}>
                    <span className="rc-ico"><Icon name="undo" size={22} /></span>
                    <b>Undo my last moves</b><span>Rewind a few steps with reverse moves, then carry on.</span>
                  </button>
                  <button className="rc-opt" onClick={() => { setWrong([]); setRecover('wrong'); speak('wrong_prompt'); }}>
                    <span className="rc-ico"><Icon name="refresh" size={22} /></span>
                    <b>I turned something wrong</b><span>Tap the moves you actually did. Cubr re-plans from there.</span>
                  </button>
                  <button className="rc-opt" onClick={() => { setRecover(null); onRescan(sol!.method); }}>
                    <span className="rc-ico"><Icon name="scan" size={22} /></span>
                    <b>Rescan & continue</b><span>Scan the whole cube again and get a fresh route from exactly where it is.</span>
                  </button>
                </div>
              </>
            )}
            {recover === 'undo' && (
              <>
                <p className="eyebrow">Undo</p>
                <h2>How many moves back?</h2>
                <div className="undo-pick">
                  <button className="icon-btn" onClick={() => setUndoN(Math.max(1, undoN - 1))} aria-label="Fewer"><Icon name="minimize" size={18} /></button>
                  <span className="undo-n">{undoN}</span>
                  <button className="icon-btn" onClick={() => setUndoN(Math.min(i, undoN + 1))} aria-label="More"><Icon name="plus" size={16} /></button>
                </div>
                <div className="chips center">
                  {steps.slice(Math.max(0, i - 12), i).map((s, k, arr) => (
                    <span key={k} className={`mchip mono ${arr.length - k <= undoN ? 'undo' : 'past'}`}>{s.move}</span>
                  ))}
                </div>
                <p className="muted small center">The highlighted moves get reversed, newest first. Cubr shows each reverse move.</p>
                <div className="row center-row">
                  <button className="btn-secondary" onClick={() => setRecover('menu')}><Icon name="arrow-left" size={16} />Back</button>
                  <button className="btn-primary amber" onClick={startUndo}><Icon name="undo" size={18} />Undo {undoN} move{undoN === 1 ? '' : 's'}</button>
                </div>
              </>
            )}
            {recover === 'wrong' && (
              <>
                <p className="eyebrow">Re-plan</p>
                <h2>Which moves did you actually do?</h2>
                <p className="muted small">Your cube should have been at move {i + 1}. Tap the extra or wrong moves you made, in order.</p>
                <div className="pad-grid">
                  {PAD.map((m) => <button key={m} className="pad-key mono" onClick={() => { sfx.turn(); setWrong((w) => [...w, m]); }}>{m}</button>)}
                </div>
                <div className="wrong-list mono">{wrong.length ? wrong.join('  ') : 'No moves yet'}</div>
                <div className="row center-row">
                  <button className="btn-secondary" onClick={() => setWrong((w) => w.slice(0, -1))} disabled={!wrong.length}><Icon name="undo" size={16} />Remove last</button>
                  <button className="btn-primary" disabled={!wrong.length || busy} onClick={() => replan(applyMoves(states[i], wrong))}>
                    {busy ? 'Planning…' : 'Re-plan from here'}<Icon name="arrow-right" size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {recover === 'check' && check.result && (
        <div className="sheet-wrap">
          <div className={`sheet card result ${check.result.kind}`} role="dialog" aria-label="Check result">
            <span className="result-ico"><Icon name={check.result.kind === 'lost' ? 'info' : 'check'} size={26} /></span>
            {check.result.kind === 'ok' && <><h2>You're right on track</h2><p className="muted">That side matches move {i + 1}. Carry on!</p><button className="btn-primary" onClick={closeRecover}>Continue<Icon name="arrow-right" size={18} /></button></>}
            {check.result.kind === 'found' && <><h2>Found your place</h2><p className="muted">Your cube matches move {(check.result.k ?? 0) + 1}. The guide jumps there.</p><button className="btn-primary" onClick={applyCheck}>Jump to move {(check.result.k ?? 0) + 1}<Icon name="arrow-right" size={18} /></button></>}
            {check.result.kind === 'lost' && (
              <>
                <h2>That side doesn't match</h2>
                <p className="muted">Your cube has moved away from the plan. Rescan it and Cubr plans a fresh route from exactly where it is.</p>
                <div className="row center-row">
                  <button className="btn-secondary" onClick={() => setCheck({ result: null, hint: 'Hold another side inside the box', live: Array(9).fill(null) })}><Icon name="refresh" size={16} />Try another side</button>
                  <button className="btn-primary" onClick={() => { closeRecover(); onRescan(sol!.method); }}><Icon name="scan" size={18} />Rescan & continue</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
