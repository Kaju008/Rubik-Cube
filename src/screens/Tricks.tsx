import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../ui/Icon';
import { PATTERNS, OLL_EDGES, OLL_CORNERS, PLL, Alg, Pattern } from '../learn/algs';
import { AlgGrid } from '../ui/AlgGrid';
import { AlgPlayer } from '../ui/AlgPlayer';
import { CubeThumb } from '../ui/IsoCube';
import { MoveIcon } from '../ui/MoveIcon';
import { Mascot } from '../ui/Mascot';
import { AlgModal } from './Learn';
import { applyMoves, parseAlg, simplify, solvedState, State } from '../cube/model';
import { relativeState, reaches } from '../cube/target';
import { solve } from '../cube/solverClient';
import type { Solution } from '../cube/beginner';
import { ColorName, colorsFor, STANDARD_NAMES } from '../scan/color';
import { speak, stopVoice } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { nav } from '../router';

const TABS = [
  { id: 'patterns', label: 'Patterns', icon: 'wand' },
  { id: 'fingers', label: 'Finger tricks', icon: 'hand' },
  { id: 'algs', label: 'Algorithms', icon: 'book' },
];

const FINGER: { move: string; title: string; how: string }[] = [
  { move: 'U', title: 'U: index flick', how: 'Your right index finger flicks the back-right of the top layer to the left. No wrist needed.' },
  { move: "U'", title: 'U′: left index flick', how: 'Mirror it: your left index finger flicks the back-left of the top layer to the right.' },
  { move: 'U2', title: 'U2: double flick', how: 'Right index then right middle finger, one after the other, in a single smooth motion.' },
  { move: 'R', title: 'R: wrist up', how: 'Thumb on the front, roll your right wrist upwards. Don’t lift the cube with your fingers.' },
  { move: "R'", title: 'R′: wrist down', how: 'Roll the right wrist back down. R U R′ U′ should feel like a little dance.' },
  { move: "L'", title: 'L′: left wrist', how: 'The left hand does the same as the right does for R: roll the wrist up for L′, down for L.' },
  { move: 'D', title: 'D: left ring finger', how: 'Your left ring finger pushes the bottom-front of the cube to the right.' },
  { move: "D'", title: 'D′: right ring finger', how: 'Your right ring finger pushes the bottom-front to the left.' },
  { move: 'F', title: 'F: right index', how: 'Tilt the cube a little, and your right index finger pushes the front-top edge clockwise.' },
  { move: "M'", title: 'M′: ring flick', how: 'Your right ring finger pushes the back of the middle slice down, so the front comes up. Used in H and Z perms.' },
];

export interface ScannedForPattern { state: State; names: ColorName[]; patternId: string }

function flatten(sol: Solution | null) { return sol ? sol.stages.flatMap((st) => st.chunks.flatMap((c) => c.moves)) : null; }

function PatternModal({ p, scanned, onScan, onClose }: { p: Pattern; scanned?: ScannedForPattern; onScan: () => void; onClose: () => void }) {
  const [from, setFrom] = useState<'choose' | 'solved' | 'mine'>(scanned ? 'mine' : 'choose');
  const [route, setRoute] = useState<{ moves: string[]; phases?: { from: number; label: string }[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const target = useMemo(() => applyMoves(solvedState(), p.alg), [p]);
  const myColors = useMemo(() => (scanned ? colorsFor(scanned.names) : undefined), [scanned]);

  useEffect(() => { speak(scanned ? 'pattern_scanned' : 'pattern_choose'); return () => stopVoice(); }, [scanned]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);

  // build a route from the scanned cube straight to the pattern
  useEffect(() => {
    if (from !== 'mine' || !scanned) return;
    let alive = true;
    (async () => {
      const S = scanned.state;
      const Z = relativeState(S, target);
      let moves: string[] | null = null;
      if (Z) {
        const r = await solve(Z);
        moves = flatten(r.fast) ?? flatten(r.beginner);
        if (moves) moves = simplify(moves);
        if (moves && !reaches(S, moves, target)) moves = null;
      }
      let phases: { from: number; label: string }[] | undefined;
      if (!moves) { // fallback: solve first, then make the pattern
        const r = await solve(S);
        const sol = flatten(r.fast) ?? flatten(r.beginner);
        if (sol) { moves = [...sol, ...parseAlg(p.alg)]; phases = [{ from: 0, label: 'Solving first' }, { from: sol.length, label: 'Pattern' }]; }
      }
      if (!alive) return;
      if (moves) setRoute({ moves, phases }); else setErr('Cubr could not read that cube. Try scanning again.');
    })();
    return () => { alive = false; };
  }, [from, scanned, target, p]);

  return (
    <div className="modal" role="dialog" aria-label={p.name} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card card">
        <button className="modal-x" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        <p className="eyebrow">Pattern · {p.level}</p>
        <h2>{p.name}</h2>
        <p className="muted">{p.vibe}</p>

        {from === 'choose' && (
          <>
            <div className="pm-preview">
              <CubeThumb state={target} colors={colorsFor(STANDARD_NAMES)} size={150} />
              <div className="pm-facts">
                <span><Icon name="layers" size={16} />{parseAlg(p.alg).length} moves</span>
                <span><Icon name="hand" size={16} />One move at a time</span>
                <span><Icon name="cube" size={16} />Yellow on top, red in front</span>
              </div>
            </div>
            <p className="pm-q">Where does your cube start?</p>
            <div className="pm-choices">
              <button className="pm-choice" onClick={() => { sfx.pop(); setFrom('solved'); }}>
                <span className="pm-ico"><Icon name="check" size={20} /></span>
                <b>It's solved</b>
                <small>Start from a solved cube and follow the {parseAlg(p.alg).length} moves.</small>
              </button>
              <button className="pm-choice" onClick={() => { sfx.pop(); onScan(); }}>
                <span className="pm-ico pink"><Icon name="scan" size={20} /></span>
                <b>It's mixed up</b>
                <small>Scan your cube as it is. Cubr finds a route from there to the pattern.</small>
              </button>
            </div>
          </>
        )}

        {from === 'solved' && (
          <AlgPlayer alg={p.alg} setup="" narrate onFinish={() => { sfx.stage(); speak('pattern_done'); }} />
        )}

        {from === 'mine' && scanned && <p className="pm-from"><Icon name="scan" size={15} />Starting from your scanned cube. Hold it yellow on top, red in front.</p>}
        {from === 'mine' && scanned && (
          route
            ? <AlgPlayer alg={route.moves.join(' ')} start={scanned.state} colors={myColors} phases={route.phases} narrate onFinish={() => { sfx.stage(); speak('pattern_done'); }} />
            : err
              ? <div className="pm-wait"><p>{err}</p><button className="btn-primary" onClick={onScan}><Icon name="scan" size={17} />Scan again</button></div>
              : <div className="pm-wait"><span className="spinner" />Finding the route from your cube…</div>
        )}
        {from !== 'choose' && !scanned && <button className="btn-text pm-switch" onClick={() => setFrom('choose')}><Icon name="arrow-left" size={15} />My cube isn't solved</button>}
      </div>
    </div>
  );
}

export function Tricks({ tab, scanned, onScanFor, onClearScan }: { tab?: string; scanned?: ScannedForPattern | null; onScanFor: (patternId: string) => void; onClearScan: () => void }) {
  const t = TABS.some((x) => x.id === tab) ? tab! : 'patterns';
  const [pattern, setPattern] = useState<Pattern | null>(() => (scanned ? PATTERNS.find((x) => x.id === scanned.patternId) ?? null : null));
  const [watch, setWatch] = useState<Alg | null>(null);
  const colors = useMemo(() => colorsFor(STANDARD_NAMES), []);
  useEffect(() => () => stopVoice(), []);
  useEffect(() => { if (t !== 'patterns') { setPattern(null); onClearScan(); } /* leaving the tab closes the pattern */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  return (
    <div className="section-page tricks">
      <header className="section-hero card">
        <Mascot size={86} mood="wow" className="bob" id="tricks" />
        <div className="sh-text">
          <p className="eyebrow">Tricks</p>
          <h1>Patterns, finger tricks and <span className="grad">pro algorithms</span></h1>
          <p className="muted">For cubers who know the basics. Impress your friends, then shave seconds off your solves.</p>
          <div className="row"><button className="btn-ghost" onClick={() => speak('tricks_intro')}><Icon name="play" size={14} />Hear intro</button></div>
        </div>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={t === x.id} className={t === x.id ? 'on' : ''} onClick={() => { sfx.tap(); nav(`/tricks/${x.id}`); }}><Icon name={x.icon} size={17} />{x.label}</button>
        ))}
      </div>

      {t === 'patterns' && (
        <div className="pattern-grid">
          {PATTERNS.map((p) => (
            <button key={p.id} className="pattern-card card" onClick={() => { sfx.pop(); setPattern(p); }}>
              <CubeThumb state={applyMoves(solvedState(), p.alg)} colors={colors} size={120} className="pc-thumb" />
              <span className={`tag lvl-${p.level}`}>{p.level}</span>
              <b>{p.name}</b>
              <span className="muted small">{p.vibe}</span>
              <span className="mono pc-alg">{p.alg}</span>
            </button>
          ))}
        </div>
      )}

      {t === 'fingers' && (
        <>
          <p className="muted">Fast cubers barely move their hands. They flick. Practise each trick 20 times slowly, then string them together.</p>
          <div className="finger-grid">
            {FINGER.map((f) => (
              <article key={f.move} className="finger-card card">
                <MoveIcon move={f.move} size={110} />
                <div><h3>{f.title}</h3><p>{f.how}</p></div>
              </article>
            ))}
          </div>
          <div className="lesson-practice card">
            <span className="lp-text"><Icon name="target" size={20} />Drill: do R U R′ U′ six times using only finger tricks, as smoothly as you can.</span>
            <button className="btn-toy" onClick={() => nav('/speed')}>Time yourself<Icon name="arrow-right" size={18} /></button>
          </div>
        </>
      )}

      {t === 'algs' && (
        <>
          <div className="algset"><h3>2-look OLL · Yellow cross</h3><AlgGrid algs={OLL_EDGES} mode="oll" onWatch={setWatch} /></div>
          <div className="algset"><h3>2-look OLL · Yellow corners</h3><AlgGrid algs={OLL_CORNERS} mode="oll" onWatch={setWatch} /></div>
          <div className="algset"><h3>PLL · all 21</h3><AlgGrid algs={PLL} mode="pll" onWatch={setWatch} /></div>
          <div className="lesson-practice card">
            <span className="lp-text"><Icon name="cards" size={20} />Drill these with flash-card style practice.</span>
            <button className="btn-toy" onClick={() => nav('/speed/drills')}>Algorithm drills<Icon name="arrow-right" size={18} /></button>
          </div>
        </>
      )}

      {pattern && <PatternModal p={pattern} scanned={scanned && scanned.patternId === pattern.id ? scanned : undefined} onScan={() => onScanFor(pattern.id)} onClose={() => { setPattern(null); onClearScan(); }} />}
      {watch && <AlgModal alg={watch} mode={watch.set === 'pll' ? 'pll' : 'oll'} onClose={() => setWatch(null)} />}
    </div>
  );
}
