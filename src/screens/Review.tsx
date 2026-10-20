import { useEffect, useMemo } from 'react';
import type { CubeData } from '../App';
import { CubeCanvas } from '../ui/CubeCanvas';
import { Net } from '../ui/Net';
import { Mascot } from '../ui/Mascot';
import { validate } from '../cube/pieces';
import { colorsFor } from '../scan/color';
import { say } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { warmUpSolver } from '../cube/solverClient';

interface Props { cube: CubeData; onChange: (c: CubeData) => void; onSolve: () => void; onRescan: () => void }

export function Review({ cube, onChange, onSolve, onRescan }: Props) {
  const colors = useMemo(() => colorsFor(cube.names), [cube.names]);
  const v = useMemo(() => validate(cube.state, cube.names), [cube.state, cube.names]);

  useEffect(() => {
    warmUpSolver();
    if (cube.source === 'demo') say("Demo time! Scramble a solved cube with these moves, or just watch. Tap Solve when you're ready.");
    else if (cube.source === 'manual') say('Paint each sticker to match your cube. Hold it with green in front and yellow on top.');
    else if (v.ok) { sfx.stage(); say("Got it! Your cube looks good. Check it matches, then tap Solve."); }
    else { sfx.error(); say('Hmm, a few stickers look off. Tap any wrong sticker to fix it.'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const edit = (idx: number, color: number) => {
    sfx.tap();
    const s = cube.state.slice();
    s[idx] = color;
    onChange({ ...cube, state: s });
  };

  const title = cube.source === 'demo' ? 'Demo cube, ready to solve'
    : cube.source === 'manual' ? 'Paint your cube'
    : v.ok ? "Got it! Here's your cube" : 'Almost there: fix a sticker or two';

  return (
    <div className="review">
      <div className="review-3d">
        <CubeCanvas state={cube.state} colors={colors} sync autoSpin label="Your cube in 3D" />
        <p className="tiny center">Drag to look around</p>
      </div>
      <div className="review-panel card">
        <div className="review-head">
          <Mascot size={64} mood={v.ok ? 'happy' : 'think'} />
          <div>
            <h2>{title}</h2>
            <p className="muted">
              {cube.source === 'manual'
                ? 'Tap a sticker, pick its colour. Front = green, top = yellow.'
                : 'Compare with your real cube. Tap any sticker to change it.'}
            </p>
          </div>
        </div>

        {cube.scramble && (
          <div className="scramble">
            <p className="label">Scramble a solved cube (green front, yellow top) with:</p>
            <p className="mono">{cube.scramble.join(' ')}</p>
          </div>
        )}

        <Net state={cube.state} colors={colors} names={cube.names} bad={v.badFacelets} onChange={edit} />

        {!v.ok && cube.source !== 'manual' && (
          <ul className="errors">{v.errors.slice(0, 3).map((e) => <li key={e}>{e}</li>)}</ul>
        )}
        {!v.ok && cube.source === 'manual' && <p className="muted small">{v.errors[0]}</p>}

        <div className="row">
          <button className="btn-toy big" disabled={!v.ok} onClick={() => { sfx.start(); onSolve(); }}>Solve it →</button>
          <button className="btn-ghost" onClick={onRescan}>📷 Rescan</button>
        </div>
      </div>
    </div>
  );
}
