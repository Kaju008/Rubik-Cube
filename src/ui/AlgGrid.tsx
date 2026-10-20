// Grid of algorithm cards with case diagrams.
import { useMemo } from 'react';
import { Icon } from './Icon';
import type { Alg } from '../learn/algs';
import { CaseDiagram } from './CaseDiagram';
import { applyMoves, invertAlg, parseAlg, solvedState } from '../cube/model';
import { colorsFor, STANDARD_NAMES } from '../scan/color';

export function caseState(alg: string) { return applyMoves(solvedState(), invertAlg(parseAlg(alg))); }

export function AlgGrid({ algs, mode, onWatch }: { algs: Alg[]; mode: 'oll' | 'pll'; onWatch: (a: Alg) => void }) {
  const colors = useMemo(() => colorsFor(STANDARD_NAMES), []);
  let lastGroup = '';
  return (
    <div className="alg-grid">
      {algs.map((a) => {
        const header = a.group && a.group !== lastGroup ? a.group : null;
        if (a.group) lastGroup = a.group;
        return (
          <div key={a.id} className="alg-wrap">
            {header && <p className="alg-group">{header}</p>}
            <button className="alg-card" onClick={() => onWatch(a)} title={`Watch ${a.name}`}>
              <CaseDiagram state={caseState(a.alg)} colors={colors} mode={mode} size={96} />
              <span className="ac-body">
                <b>{a.name}{a.twoLook && mode === 'pll' ? <small className="tag">2-look</small> : null}</b>
                <span className="mono">{a.alg}</span>
                <small className="ac-watch"><Icon name="cube" size={13} />Watch in 3D</small>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
