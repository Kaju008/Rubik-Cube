// Interactive 3D algorithm player: play / pause / step / scrub, with spoken moves.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CubeCanvas, CubeCanvasHandle } from './CubeCanvas';
import { MoveIcon } from './MoveIcon';
import { applyMoves, invertAlg, parseAlg, solvedState, State } from '../cube/model';
import { describeMove } from '../cube/describe';
import { colorsFor, STANDARD_NAMES } from '../scan/color';
import { sfx } from '../audio/sfx';
import { moveClip, speak } from '../audio/voice';

interface Props {
  alg: string;
  setup?: string;          // moves from solved to the start position (default: inverse of the algorithm)
  start?: State;           // or an explicit start state
  title?: string;
  caption?: string;
  narrate?: boolean;
  autoPlay?: boolean;
  onFinish?: () => void;
  compact?: boolean;
}

const SPEEDS = [{ k: '0.5×', ms: 900 }, { k: '1×', ms: 520 }, { k: '2×', ms: 280 }];

export function AlgPlayer({ alg, setup, start, title, caption, narrate = true, autoPlay = false, onFinish, compact }: Props) {
  const moves = useMemo(() => parseAlg(alg), [alg]);
  const startState = useMemo(
    () => start ?? applyMoves(solvedState(), setup !== undefined ? parseAlg(setup) : invertAlg(moves)),
    [start, setup, moves],
  );
  const colors = useMemo(() => colorsFor(STANDARD_NAMES), []);
  const ref = useRef<CubeCanvasHandle>(null);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1);
  const iRef = useRef(0);
  iRef.current = i;

  const jump = (k: number) => {
    setPlaying(false);
    ref.current?.view?.setState(applyMoves(startState, moves.slice(0, k)));
    setI(k);
  };
  // new start position: reset the cube without touching play/pause (so autoPlay works)
  useEffect(() => { ref.current?.view?.setState(startState); setI(0); }, [startState]);

  const step = async () => {
    const k = iRef.current;
    if (k >= moves.length) return false;
    sfx.turn();
    if (narrate) speak(moveClip(moves[k]));
    setI(k + 1);
    await ref.current?.view?.commit(moves[k], SPEEDS[speed].ms * 0.75);
    return true;
  };

  useEffect(() => {
    if (!playing) return;
    if (i >= moves.length) { setPlaying(false); onFinish?.(); return; }
    let alive = true;
    const t = setTimeout(async () => { if (alive) await step(); }, i === 0 ? 250 : SPEEDS[speed].ms * 0.45);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, i, speed]);

  const back = () => {
    if (i === 0) return;
    setPlaying(false);
    sfx.tap();
    ref.current?.view?.commit(invertAlg([moves[i - 1]])[0], 260);
    setI(i - 1);
  };
  const toggle = () => {
    sfx.tap();
    if (i >= moves.length) { jump(0); setTimeout(() => setPlaying(true), 120); return; }
    setPlaying(!playing);
  };

  const cur = moves[Math.min(i, moves.length - 1)];
  const done = i >= moves.length;
  return (
    <div className={`alg-player ${compact ? 'compact' : ''}`}>
      {title && <h4 className="ap-title">{title}</h4>}
      <div className="ap-stage">
        <CubeCanvas ref={ref} state={startState} colors={colors} peek onTap={toggle} label={title ?? 'Algorithm demo'} />
        {cur && <div className="ap-move">{!done && <MoveIcon move={moves[i] ?? cur} size={86} />}<span>{done ? '✓ Done' : describeMove(moves[i]).long}</span></div>}
      </div>
      <div className="ap-chips" role="list">
        {moves.map((m, k) => (
          <button key={k} role="listitem" className={`mchip mono ${k === i ? 'now' : k < i ? 'past' : ''}`} onClick={() => jump(k)} title={`Jump to move ${k + 1}`}>{m}</button>
        ))}
      </div>
      <div className="ap-controls">
        <button className="btn-round sm" onClick={() => jump(0)} aria-label="Restart">⟲</button>
        <button className="btn-round sm" onClick={back} disabled={i === 0} aria-label="Step back">◀</button>
        <button className="btn-toy" onClick={toggle}>{playing ? '⏸ Pause' : done ? '↻ Again' : i ? '▶ Resume' : '▶ Play'}</button>
        <button className="btn-round sm" onClick={() => { setPlaying(false); step(); }} disabled={done} aria-label="Step forward">▶</button>
        <div className="seg sm" role="group" aria-label="Speed">
          {SPEEDS.map((s, k) => <button key={s.k} className={k === speed ? 'on' : ''} onClick={() => setSpeed(k)}>{s.k}</button>)}
        </div>
      </div>
      {caption && <p className="ap-caption">{caption}</p>}
    </div>
  );
}
