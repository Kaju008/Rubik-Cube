// Interactive 3D algorithm player.
// Two modes: "step" (default) previews one move at a time and waits for "Done, next";
// "watch" plays the whole thing like a video with play / pause / speed.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { CubeCanvas, CubeCanvasHandle } from './CubeCanvas';
import { MoveIcon } from './MoveIcon';
import { applyMoves, invertAlg, isRotation, parseAlg, solvedState, State } from '../cube/model';
import { describeMove } from '../cube/describe';
import { colorsFor, STANDARD_NAMES } from '../scan/color';
import { sfx } from '../audio/sfx';
import { moveClip, speak } from '../audio/voice';

interface Props {
  alg: string;
  setup?: string;          // moves from solved to the start position (default: inverse of the algorithm)
  start?: State;           // or an explicit start state
  colors?: string[];       // sticker colours (default: standard scheme)
  title?: string;
  caption?: string;
  narrate?: boolean;
  defaultMode?: 'step' | 'watch';
  autoPlay?: boolean;      // only used in watch mode
  /** optional labels for move ranges, e.g. [{from:0, label:'Set up'}, {from:20, label:'Pattern'}] */
  phases?: { from: number; label: string }[];
  onFinish?: () => void;
  compact?: boolean;
}

const SPEEDS = [{ k: '0.5×', ms: 900 }, { k: '1×', ms: 520 }, { k: '2×', ms: 280 }];

export function AlgPlayer({ alg, setup, start, colors: colorsProp, title, caption, narrate = true, defaultMode = 'step', autoPlay = false, phases, onFinish, compact }: Props) {
  const moves = useMemo(() => parseAlg(alg), [alg]);
  const startState = useMemo(
    () => start ?? applyMoves(solvedState(), setup !== undefined ? parseAlg(setup) : invertAlg(moves)),
    [start, setup, moves],
  );
  const std = useMemo(() => colorsFor(STANDARD_NAMES), []);
  const colors = colorsProp ?? std;
  const ref = useRef<CubeCanvasHandle>(null);
  const [mode, setMode] = useState<'step' | 'watch'>(defaultMode);
  const [i, setI] = useState(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(defaultMode === 'watch' && autoPlay);
  const [speed, setSpeed] = useState(1);
  const busy = useRef(false);
  const iRef = useRef(0);
  iRef.current = i;
  const finished = useRef(false);
  const done = i >= moves.length;

  const finish = () => { if (!finished.current) { finished.current = true; onFinish?.(); } };

  // new start position: reset everything
  useEffect(() => {
    ref.current?.view?.setState(startState);
    setI(0); setStarted(false); finished.current = false;
  }, [startState]);

  // step mode: loop a preview of the current move once started
  useEffect(() => {
    const v = ref.current?.view;
    if (!v) return;
    if (mode === 'step' && started && !done) v.showMove(moves[i]);
    else v.showMove(null);
  }, [mode, started, i, done, moves]);
  useEffect(() => () => ref.current?.view?.showMove(null), []);

  // narrate the move being previewed
  useEffect(() => {
    if (mode === 'step' && started && !done && narrate) speak(moveClip(moves[i]), { interrupt: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, started, i]);

  const jump = (k: number) => {
    setPlaying(false);
    ref.current?.view?.showMove(null);
    ref.current?.view?.setState(applyMoves(startState, moves.slice(0, k)));
    setI(k);
    if (mode === 'step') setStarted(true);
  };

  const commitNext = async (ms: number) => {
    const k = iRef.current;
    if (k >= moves.length || busy.current) return false;
    busy.current = true;
    sfx.turn();
    ref.current?.view?.showMove(null);
    await ref.current?.view?.commit(moves[k], ms);
    busy.current = false;
    setI(k + 1);
    if (k + 1 >= moves.length) { sfx.stage(); finish(); }
    return true;
  };

  // watch mode autoplay
  useEffect(() => {
    if (mode !== 'watch' || !playing) return;
    if (i >= moves.length) { setPlaying(false); finish(); return; }
    let alive = true;
    const t = setTimeout(async () => {
      if (!alive) return;
      if (narrate) speak(moveClip(moves[iRef.current]));
      await commitNext(SPEEDS[speed].ms * 0.75);
    }, i === 0 ? 250 : SPEEDS[speed].ms * 0.45);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, playing, i, speed]);

  const back = async () => {
    if (i === 0 || busy.current) return;
    setPlaying(false);
    sfx.tap();
    busy.current = true;
    ref.current?.view?.showMove(null);
    await ref.current?.view?.commit(invertAlg([moves[i - 1]])[0], 260);
    busy.current = false;
    setI(i - 1);
  };
  const restart = () => { sfx.tap(); jump(0); if (mode === 'step') setStarted(false); };
  const toggle = () => {
    sfx.tap();
    if (done) { jump(0); setTimeout(() => setPlaying(true), 120); return; }
    setPlaying(!playing);
  };
  const switchMode = (m: 'step' | 'watch') => {
    if (m === mode) return;
    sfx.tap(); setPlaying(false); setMode(m);
    if (m === 'step') setStarted(i > 0);
  };

  // keyboard: space / right arrow = next in step mode
  useEffect(() => {
    if (mode !== 'step' || compact) return;
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea')) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); if (!started) setStarted(true); else commitNext(380); }
      if (e.key === 'ArrowLeft') back();
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  });

  const cur = moves[i];
  const phase = phases ? [...phases].reverse().find((p) => i >= p.from) : undefined;
  const d = cur ? describeMove(cur) : null;

  return (
    <div className={`alg-player ${compact ? 'compact' : ''} mode-${mode}`}>
      <div className="ap-head">
        {title ? <h4 className="ap-title">{title}</h4> : <span />}
        <div className="seg sm" role="group" aria-label="Player mode">
          <button className={mode === 'step' ? 'on' : ''} onClick={() => switchMode('step')}><Icon name="hand" size={14} />Step by step</button>
          <button className={mode === 'watch' ? 'on' : ''} onClick={() => switchMode('watch')}><Icon name="play" size={13} />Watch</button>
        </div>
      </div>

      <div className="ap-stage">
        <CubeCanvas ref={ref} state={startState} colors={colors} peek label={title ?? 'Algorithm demo'} />
        {mode === 'watch' && cur && !done && <div className="ap-move"><MoveIcon move={cur} size={60} /><span>{d!.long}</span></div>}
        {mode === 'step' && !started && !done && (
          <div className="ap-intro">
            <Icon name="hand" size={16} />
            <span><b>{moves.length} moves, one at a time.</b> Copy each move on your cube, then tap <b>Done, next</b>.</span>
          </div>
        )}
        {done && <div className="ap-done"><Icon name="check" size={18} />All {moves.length} moves done</div>}
      </div>

      {mode === 'step' && started && !done && d && (
        <div className="ap-step" key={i}>
          <MoveIcon move={cur} size={compact ? 64 : 76} />
          <div className="ap-step-text">
            <span className={`notation ${isRotation(cur) ? 'rot' : ''}`}>{cur}</span>
            <b>{d.long}</b>
            <small>Move {i + 1} of {moves.length}{phase ? ` · ${phase.label}` : ''}</small>
          </div>
        </div>
      )}

      <div className="ap-chips" role="list">
        {moves.map((m, k) => (
          <button key={k} role="listitem" className={`mchip mono ${k === i ? 'now' : k < i ? 'past' : ''} ${phases?.some((p) => p.from === k && k > 0) ? 'phase-start' : ''}`} onClick={() => jump(k)} title={`Jump to move ${k + 1}`}>{m}</button>
        ))}
      </div>

      {mode === 'step' ? (
        <div className="ap-controls">
          <button className="icon-btn" onClick={restart} aria-label="Restart" title="Restart"><Icon name="restart" size={18} /></button>
          <button className="icon-btn" onClick={back} disabled={i === 0} aria-label="Previous move" title="Previous move"><Icon name="prev" size={18} /></button>
          {done
            ? <button className="btn-primary grow" onClick={restart}><Icon name="restart" size={17} />Again</button>
            : started
              ? <button className="btn-primary grow" onClick={() => commitNext(380)}>Done, next<Icon name="arrow-right" size={17} /></button>
              : <button className="btn-primary grow" onClick={() => { sfx.start(); setStarted(true); }}>Start<Icon name="arrow-right" size={17} /></button>}
        </div>
      ) : (
        <div className="ap-controls">
          <button className="icon-btn" onClick={() => jump(0)} aria-label="Restart" title="Restart"><Icon name="restart" size={18} /></button>
          <button className="icon-btn" onClick={back} disabled={i === 0} aria-label="Step back" title="Step back"><Icon name="prev" size={18} /></button>
          <button className="btn-primary" onClick={toggle}><Icon name={playing ? 'pause' : done ? 'restart' : 'play'} size={16} />{playing ? 'Pause' : done ? 'Again' : i ? 'Resume' : 'Play'}</button>
          <button className="icon-btn" onClick={() => { setPlaying(false); commitNext(SPEEDS[speed].ms * 0.75); }} disabled={done} aria-label="Step forward" title="Step forward"><Icon name="next" size={18} /></button>
          <div className="seg sm" role="group" aria-label="Speed">
            {SPEEDS.map((s, k) => <button key={s.k} className={k === speed ? 'on' : ''} onClick={() => setSpeed(k)}>{s.k}</button>)}
          </div>
        </div>
      )}
      {caption && <p className="ap-caption">{caption}</p>}
    </div>
  );
}
