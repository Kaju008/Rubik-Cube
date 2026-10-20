import { useEffect, useMemo, useState } from 'react';
import { PATTERNS, OLL_EDGES, OLL_CORNERS, PLL, Alg, Pattern } from '../learn/algs';
import { AlgGrid } from '../ui/AlgGrid';
import { AlgPlayer } from '../ui/AlgPlayer';
import { CubeThumb } from '../ui/IsoCube';
import { MoveIcon } from '../ui/MoveIcon';
import { Mascot } from '../ui/Mascot';
import { AlgModal } from './Learn';
import { applyMoves, solvedState } from '../cube/model';
import { colorsFor, STANDARD_NAMES } from '../scan/color';
import { speak, stopVoice } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { nav } from '../router';

const TABS = [
  { id: 'patterns', label: '✨ Patterns' },
  { id: 'fingers', label: '🖐 Finger tricks' },
  { id: 'algs', label: '📚 Algorithms' },
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

function PatternModal({ p, onClose }: { p: Pattern; onClose: () => void }) {
  useEffect(() => { speak('pattern_start'); return () => stopVoice(); }, []);
  return (
    <div className="modal" role="dialog" aria-label={p.name} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card card">
        <button className="modal-x" onClick={onClose} aria-label="Close">✕</button>
        <p className="eyebrow">Pattern · {p.level}</p>
        <h2>{p.name}</h2>
        <p className="muted">{p.vibe} Start from a solved cube, with yellow on top and red in front.</p>
        <AlgPlayer alg={p.alg} setup="" narrate={false} autoPlay onFinish={() => { sfx.stage(); speak('pattern_done'); }} />
      </div>
    </div>
  );
}

export function Tricks({ tab }: { tab?: string }) {
  const t = TABS.some((x) => x.id === tab) ? tab! : 'patterns';
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [watch, setWatch] = useState<Alg | null>(null);
  const colors = useMemo(() => colorsFor(STANDARD_NAMES), []);
  useEffect(() => () => stopVoice(), []);

  return (
    <div className="section-page tricks">
      <header className="section-hero card">
        <Mascot size={86} mood="wow" className="bob" id="tricks" />
        <div className="sh-text">
          <p className="eyebrow">Tricks</p>
          <h1>Patterns, finger tricks and <span className="grad">pro algorithms</span></h1>
          <p className="muted">For cubers who know the basics. Impress your friends, then shave seconds off your solves.</p>
          <div className="row"><button className="btn-ghost" onClick={() => speak('tricks_intro')}>▶ Hear intro</button></div>
        </div>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={t === x.id} className={t === x.id ? 'on' : ''} onClick={() => { sfx.tap(); nav(`/tricks/${x.id}`); }}>{x.label}</button>
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
            <span>🎯 Drill: do R U R′ U′ six times using only finger tricks, as smoothly as you can.</span>
            <button className="btn-toy" onClick={() => nav('/speed')}>Time yourself →</button>
          </div>
        </>
      )}

      {t === 'algs' && (
        <>
          <div className="algset"><h3>2-look OLL · Yellow cross</h3><AlgGrid algs={OLL_EDGES} mode="oll" onWatch={setWatch} /></div>
          <div className="algset"><h3>2-look OLL · Yellow corners</h3><AlgGrid algs={OLL_CORNERS} mode="oll" onWatch={setWatch} /></div>
          <div className="algset"><h3>PLL · all 21</h3><AlgGrid algs={PLL} mode="pll" onWatch={setWatch} /></div>
          <div className="lesson-practice card">
            <span>🧠 Drill these with flash-card style practice.</span>
            <button className="btn-toy" onClick={() => nav('/speed/drills')}>Algorithm drills →</button>
          </div>
        </>
      )}

      {pattern && <PatternModal p={pattern} onClose={() => setPattern(null)} />}
      {watch && <AlgModal alg={watch} mode={watch.set === 'pll' ? 'pll' : 'oll'} onClose={() => setWatch(null)} />}
    </div>
  );
}
