// Small interactive widgets used inside lessons.
import { useMemo, useRef, useState } from 'react';
import { CubeCanvas, CubeCanvasHandle } from './CubeCanvas';
import { MoveIcon } from './MoveIcon';
import { applyMoves, solvedState } from '../cube/model';
import { CORNERS, EDGES, CENTERS } from '../cube/pieces';
import { describeMove } from '../cube/describe';
import { colorsFor, STANDARD_NAMES } from '../scan/color';
import { sfx } from '../audio/sfx';
import { moveClip, speak } from '../audio/voice';

const DIM = '#262634';

/** Light up centres, edges or corners on a 3D cube. */
export function PiecesExplorer() {
  const [kind, setKind] = useState<'all' | 'centres' | 'edges' | 'corners'>('all');
  const colors = useMemo(() => [...colorsFor(STANDARD_NAMES), DIM], []);
  const state = useMemo(() => {
    const s = solvedState();
    if (kind === 'all') return s;
    const keep = new Set<number>(kind === 'centres' ? CENTERS : (kind === 'edges' ? EDGES : CORNERS).flatMap((p) => p.facelets));
    return s.map((v, i) => (keep.has(i) ? v : 6)) as unknown as typeof s;
  }, [kind]);
  const INFO = { all: '26 pieces in total', centres: '6 centres: fixed, they define each side’s colour', edges: '12 edges: 2 colours each', corners: '8 corners: 3 colours each' };
  return (
    <div className="widget">
      <div className="widget-cube"><CubeCanvas state={state} colors={colors} sync autoSpin label="Cube pieces" /></div>
      <div className="seg wide" role="group" aria-label="Piece type">
        {(['all', 'centres', 'edges', 'corners'] as const).map((k) => (
          <button key={k} className={kind === k ? 'on' : ''} onClick={() => { sfx.tap(); setKind(k); }}>{k[0].toUpperCase() + k.slice(1)}</button>
        ))}
      </div>
      <p className="widget-note">{INFO[kind]}</p>
    </div>
  );
}

const PAD = ['R', "R'", 'R2', 'L', "L'", 'L2', 'U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2'];

/** Tap a move, watch it on the cube, hear it. */
export function NotationPad() {
  const ref = useRef<CubeCanvasHandle>(null);
  const colors = useMemo(() => colorsFor(STANDARD_NAMES), []);
  const [last, setLast] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const press = (m: string) => {
    sfx.turn();
    speak(moveClip(m));
    setLast(m);
    setHistory((h) => [...h.slice(-11), m]);
    ref.current?.view?.commit(m, 340);
  };
  const reset = () => { sfx.tap(); setHistory([]); setLast(null); ref.current?.view?.setState(solvedState()); };
  return (
    <div className="widget notation">
      <div className="widget-cube"><CubeCanvas ref={ref} state={applyMoves(solvedState(), [])} colors={colors} peek label="Notation practice cube" /></div>
      <div className="np-side">
        <div className="np-now">
          {last ? <><MoveIcon move={last} size={92} /><div><b className="mono">{last}</b><span>{describeMove(last).long}</span></div></> : <span className="muted">Tap a move ↓</span>}
        </div>
        <div className="np-grid">
          {PAD.map((m) => <button key={m} className="np-key mono" onClick={() => press(m)}>{m}</button>)}
        </div>
        <div className="row">
          <span className="mono small muted np-hist">{history.join(' ') || ' '}</span>
          <button className="btn-ghost sm" onClick={reset}>Reset</button>
        </div>
      </div>
    </div>
  );
}
