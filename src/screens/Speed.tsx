import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Solve, Penalty, avgOf, bestAvg, bestSingle, mean, fmt, levelFor, LEVELS, streakDays, loadSolves, saveSolves, eff } from '../speed/stats';
import { getScramble } from '../cube/solverClient';
import { applyMoves, invertAlg, parseAlg, solvedState } from '../cube/model';
import { Net } from '../ui/Net';
import { Mascot } from '../ui/Mascot';
import { Confetti } from '../ui/Confetti';
import { CaseDiagram } from '../ui/CaseDiagram';
import { AlgModal } from './Learn';
import { OLL_EDGES, OLL_CORNERS, PLL, Alg } from '../learn/algs';
import { colorsFor, STANDARD_NAMES } from '../scan/color';
import { speak, stopVoice } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { nav } from '../router';

type Phase = 'idle' | 'inspect' | 'holding' | 'ready' | 'running';
const HOLD_MS = 350;

function Chart({ solves }: { solves: Solve[] }) {
  const last = solves.slice(-50);
  const pts = last.map(eff).map((t, i) => ({ i, t }));
  const finite = pts.filter((p) => isFinite(p.t));
  if (finite.length < 2) return <p className="muted small chart-empty">Your progress chart appears after a couple of solves.</p>;
  const W = 600, H = 170, pad = 28;
  const max = Math.max(...finite.map((p) => p.t)), min = Math.min(...finite.map((p) => p.t));
  const span = Math.max(1000, max - min);
  const X = (i: number) => pad + (i / Math.max(1, last.length - 1)) * (W - pad * 2);
  const Y = (t: number) => H - pad - ((t - min) / span) * (H - pad * 2);
  const line = finite.map((p, k) => `${k ? 'L' : 'M'}${X(p.i).toFixed(1)},${Y(p.t).toFixed(1)}`).join(' ');
  const ao5: string[] = [];
  last.forEach((_, i) => { const a = avgOf(last, 5, i + 1); if (a !== null && isFinite(a)) ao5.push(`${ao5.length ? 'L' : 'M'}${X(i).toFixed(1)},${Y(a).toFixed(1)}`); });
  const pb = Math.min(...finite.map((p) => p.t));
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Solve times chart">
      <line x1={pad} x2={W - pad} y1={Y(pb)} y2={Y(pb)} className="ch-pb" />
      <text x={W - pad} y={Y(pb) - 6} textAnchor="end" className="ch-label">PB {fmt(pb)}</text>
      <text x={pad} y={14} className="ch-label">{fmt(max)}</text>
      <path d={line} className="ch-line" />
      {ao5.length > 1 && <path d={ao5.join(' ')} className="ch-avg" />}
      {finite.map((p) => <circle key={p.i} cx={X(p.i)} cy={Y(p.t)} r={p.t === pb ? 5 : 3} className={p.t === pb ? 'ch-dot pb' : 'ch-dot'} />)}
    </svg>
  );
}

function Timer() {
  const [solves, setSolves] = useState<Solve[]>(() => loadSolves());
  const [scramble, setScramble] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [display, setDisplay] = useState(0);
  const [inspectOn, setInspectOn] = useState(() => { try { return localStorage.getItem('cubr.inspect') === '1'; } catch { return false; } });
  const [showNet, setShowNet] = useState(false);
  const [party, setParty] = useState<string | null>(null);
  const [inspectLeft, setInspectLeft] = useState(15);
  const r = useRef({ phase: 'idle' as Phase, start: 0, holdTimer: 0, raf: 0, inspectStart: 0, inspectPenalty: 0 as Penalty, stoppedAt: 0, said8: false, said12: false });
  const colors = useMemo(() => colorsFor(STANDARD_NAMES), []);

  const setP = (p: Phase) => { r.current.phase = p; setPhase(p); };
  const newScramble = useCallback(() => { setScramble(''); getScramble().then(setScramble); }, []);
  useEffect(() => { newScramble(); }, [newScramble]);
  useEffect(() => { try { localStorage.setItem('cubr.inspect', inspectOn ? '1' : '0'); } catch { /* ignore */ } }, [inspectOn]);

  const finish = useCallback((ms: number) => {
    const penalty = r.current.inspectPenalty;
    const solve: Solve = { id: Math.random().toString(36).slice(2), ms, penalty, scramble, at: Date.now() };
    setSolves((prev) => {
      const next = [...prev, solve];
      saveSolves(next);
      const oldBest = bestSingle(prev), newBest = bestSingle(next);
      const oldAo5 = bestAvg(prev, 5), newAo5 = bestAvg(next, 5);
      if (prev.length && newBest !== null && (oldBest === null || newBest < oldBest)) { sfx.solved(); speak('speed_pb'); setParty('New personal best!'); }
      else if (newAo5 !== null && isFinite(newAo5) && (oldAo5 === null || newAo5 < oldAo5) && next.length > 5) { sfx.stage(); speak('speed_ao5'); setParty('New best average of 5!'); }
      else sfx.capture();
      return next;
    });
    setTimeout(() => setParty(null), 4500);
    newScramble();
  }, [scramble, newScramble]);

  const tick = useCallback(() => {
    const R = r.current;
    if (R.phase === 'running') setDisplay(performance.now() - R.start);
    if (R.phase === 'inspect' || ((R.phase === 'holding' || R.phase === 'ready') && R.inspectStart)) {
      const el = (performance.now() - R.inspectStart) / 1000;
      setInspectLeft(Math.ceil(15 - el));
      if (el > 8 && !R.said8) { R.said8 = true; speak('speed_8'); }
      if (el > 12 && !R.said12) { R.said12 = true; speak('speed_12'); }
      R.inspectPenalty = el > 17 ? 'dnf' : el > 15 ? 2 : 0;
    }
    R.raf = requestAnimationFrame(tick);
  }, []);
  useEffect(() => { r.current.raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(r.current.raf); }, [tick]);

  const down = useCallback(() => {
    const R = r.current;
    if (R.phase === 'running') {
      const ms = performance.now() - R.start;
      setDisplay(ms); setP('idle'); R.stoppedAt = performance.now(); R.inspectStart = 0;
      finish(ms);
      return;
    }
    if (performance.now() - R.stoppedAt < 400) return;
    if (inspectOn && R.phase === 'idle') {
      R.inspectStart = performance.now(); R.said8 = false; R.said12 = false; R.inspectPenalty = 0;
      setP('inspect'); sfx.tap(); return;
    }
    if (R.phase === 'idle' || R.phase === 'inspect') {
      if (!inspectOn) R.inspectPenalty = 0;
      setP('holding');
      clearTimeout(R.holdTimer);
      R.holdTimer = window.setTimeout(() => { if (r.current.phase === 'holding') { setP('ready'); sfx.scanTick(); } }, HOLD_MS);
    }
  }, [inspectOn, finish]);

  const up = useCallback(() => {
    const R = r.current;
    clearTimeout(R.holdTimer);
    if (R.phase === 'ready') { R.start = performance.now(); setDisplay(0); setP('running'); stopVoice(); }
    else if (R.phase === 'holding') setP(R.inspectStart ? 'inspect' : 'idle');
  }, []);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.repeat) { if (e.code === 'Space') e.preventDefault(); return; }
      if (r.current.phase === 'running') { e.preventDefault(); down(); return; }
      if (e.code === 'Space') { e.preventDefault(); down(); }
    };
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); up(); } };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    return () => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
  }, [down, up]);
  // stop with a tap anywhere while running
  useEffect(() => {
    if (phase !== 'running') return;
    const pd = (e: PointerEvent) => { e.preventDefault(); down(); };
    addEventListener('pointerdown', pd);
    return () => removeEventListener('pointerdown', pd);
  }, [phase, down]);

  const last = solves[solves.length - 1];
  const setPenalty = (p: Penalty) => {
    if (!last) return;
    sfx.tap();
    setSolves((s) => { const n = s.map((x) => (x.id === last.id ? { ...x, penalty: x.penalty === p ? 0 : p } : x)); saveSolves(n); return n; });
  };
  const remove = (id: string) => { sfx.tap(); setSolves((s) => { const n = s.filter((x) => x.id !== id); saveSolves(n); return n; }); };

  const lvl = levelFor(solves);
  const streak = streakDays(solves);
  const scrState = useMemo(() => (scramble ? applyMoves(solvedState(), parseAlg(scramble)) : solvedState()), [scramble]);
  const shown = phase === 'running' ? display : phase === 'inspect' || (r.current.inspectStart && (phase === 'holding' || phase === 'ready')) ? null : last && phase === 'idle' ? eff(last) : display;
  const busy = phase !== 'idle';

  return (
    <div className={`timer-wrap ph-${phase} ${busy ? 'busy' : ''}`}>
      {party && <><Confetti /><div className="pb-toast">🏆 {party}</div></>}
      <div className="scramble-card card">
        <div className="sc-head">
          <p className="eyebrow">Scramble · yellow top, red front</p>
          <div className="row">
            <button className="btn-ghost sm" onClick={() => setShowNet(!showNet)}>{showNet ? 'Hide' : 'Show'} cube</button>
            <button className="btn-ghost sm" onClick={() => { sfx.tap(); newScramble(); }}>↻ New</button>
          </div>
        </div>
        <p className="scramble-text mono">{scramble || 'Generating…'}</p>
        {showNet && scramble && <div className="sc-net"><Net state={scrState} colors={colors} names={STANDARD_NAMES} /></div>}
      </div>

      <div
        className="timer-pad"
        onPointerDown={(e) => { if (r.current.phase !== 'running') { e.preventDefault(); down(); } }}
        onPointerUp={(e) => { e.preventDefault(); up(); }}
        onPointerCancel={() => up()}
        role="button"
        tabIndex={0}
        aria-label="Timer: hold, then release to start. Tap to stop."
      >
        {phase === 'inspect' || (r.current.inspectStart && (phase === 'holding' || phase === 'ready'))
          ? <div className={`time insp ${inspectLeft <= 3 ? 'warn' : ''}`}>{inspectLeft > 0 ? inspectLeft : inspectLeft > -2 ? '+2' : 'DNF'}</div>
          : <div className="time mono">{fmt(shown as number)}</div>}
        <p className="pad-hint">
          {phase === 'idle' && (inspectOn ? 'Tap / Space to start inspection' : 'Hold Space or press & hold here, release to start')}
          {phase === 'inspect' && 'Inspect your cube, then hold to get ready'}
          {phase === 'holding' && 'Keep holding…'}
          {phase === 'ready' && 'Release to start!'}
          {phase === 'running' && 'Tap anywhere or press any key to stop'}
        </p>
        {last && phase === 'idle' && (
          <div className="pad-actions" onPointerDown={(e) => e.stopPropagation()}>
            <button className={`chip ${last.penalty === 2 ? 'on' : ''}`} onClick={() => setPenalty(2)}>+2</button>
            <button className={`chip ${last.penalty === 'dnf' ? 'on' : ''}`} onClick={() => setPenalty('dnf')}>DNF</button>
            <button className="chip" onClick={() => remove(last.id)}>Delete</button>
          </div>
        )}
      </div>

      <div className="timer-opts">
        <label className="switch"><input type="checkbox" checked={inspectOn} onChange={(e) => setInspectOn(e.target.checked)} /> 15-second inspection (with voice at 8 and 12)</label>
      </div>

      <div className="stat-row">
        {[
          ['Best', fmt(bestSingle(solves))],
          ['Ao5', fmt(avgOf(solves, 5))],
          ['Ao12', fmt(avgOf(solves, 12))],
          ['Best ao5', fmt(bestAvg(solves, 5))],
          ['Mean', fmt(mean(solves))],
          ['Solves', String(solves.length)],
        ].map(([k, v]) => <div key={k} className="stat card"><b className="mono">{v}</b><span>{k}</span></div>)}
      </div>

      <div className="speed-grid">
        <section className="card level-card">
          <div className="lv-head">
            <Mascot size={58} mood={lvl.idx >= 5 ? 'wow' : 'happy'} id="lvl" />
            <div>
              <p className="eyebrow">Your level</p>
              <h3>{lvl.cur ? lvl.cur.name : 'Not ranked yet'}</h3>
              <p className="muted small">{streak ? `🔥 ${streak}-day streak` : 'Solve today to start a streak'}</p>
            </div>
          </div>
          <ol className="ladder">
            {LEVELS.slice(1).map((l, k) => (
              <li key={l.name} className={k + 1 <= lvl.idx ? 'got' : k + 1 === lvl.idx + 1 ? 'next' : ''}>{l.name}</li>
            ))}
          </ol>
          {lvl.next && (
            <div className="lv-next">
              <p><b>Next: {lvl.next.name}</b>{lvl.record !== null && isFinite(lvl.record) ? ` · you're at ${fmt(lvl.record)}` : ''}</p>
              <p className="muted small">{lvl.next.tip}</p>
              {lvl.next.learn && <button className="btn-ghost sm" onClick={() => nav(`/learn/${lvl.next!.learn}`)}>Open the lesson →</button>}
            </div>
          )}
        </section>
        <section className="card chart-card">
          <p className="eyebrow">Progress · last 50 solves <span className="legend"><i className="lg-line" /> time <i className="lg-avg" /> ao5</span></p>
          <Chart solves={solves} />
          <ol className="history">
            {[...solves].reverse().slice(0, 12).map((s, k) => (
              <li key={s.id} title={s.scramble}>
                <span className="muted">#{solves.length - k}</span>
                <b className="mono">{fmt(eff(s))}{s.penalty === 2 ? '+' : ''}</b>
                <button className="x" onClick={() => remove(s.id)} aria-label="Delete solve">✕</button>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

// ---------------- algorithm drills ----------------
const DRILL_SETS: Record<string, { label: string; algs: Alg[]; mode: 'oll' | 'pll' }> = {
  oll: { label: '2-look OLL', algs: [...OLL_EDGES, ...OLL_CORNERS], mode: 'oll' },
  pll2: { label: '2-look PLL', algs: PLL.filter((a) => a.twoLook), mode: 'pll' },
  pll: { label: 'Full PLL', algs: PLL, mode: 'pll' },
};
const WKEY = 'cubr.drill.v1';
const loadW = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem(WKEY) || '{}'); } catch { return {}; } };

function Drills() {
  const [setId, setSetId] = useState('pll2');
  const [w, setW] = useState<Record<string, number>>(loadW);
  const [cur, setCur] = useState<{ alg: Alg; auf: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ ok: 0, n: 0 });
  const [watch, setWatch] = useState<Alg | null>(null);
  const [shownAt, setShownAt] = useState(0);
  const [now, setNow] = useState(0);
  const colors = useMemo(() => colorsFor(STANDARD_NAMES), []);
  const set = DRILL_SETS[setId];

  const pick = useCallback(() => {
    const pool = set.algs;
    const weights = pool.map((a) => w[a.id] ?? 3);
    let x = Math.random() * weights.reduce((a, b) => a + b, 0);
    let chosen = pool[0];
    for (let k = 0; k < pool.length; k++) { x -= weights[k]; if (x <= 0) { chosen = pool[k]; break; } }
    const auf = ['', 'U', 'U2', "U'"][Math.floor(Math.random() * 4)];
    setCur({ alg: chosen, auf }); setRevealed(false); setShownAt(performance.now());
  }, [set, w]);
  useEffect(() => { pick(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [setId]);
  useEffect(() => { speak('drill_intro'); return () => stopVoice(); }, []);
  useEffect(() => { if (revealed) return; const t = setInterval(() => setNow(performance.now()), 100); return () => clearInterval(t); }, [revealed]);

  const grade = (ok: boolean) => {
    if (!cur) return;
    ok ? sfx.pop() : sfx.error();
    const nw = { ...w, [cur.alg.id]: Math.max(1, Math.min(9, (w[cur.alg.id] ?? 3) + (ok ? -1 : 2))) };
    setW(nw); try { localStorage.setItem(WKEY, JSON.stringify(nw)); } catch { /* ignore */ }
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), n: s.n + 1 }));
    pick();
  };

  const state = cur ? applyMoves(solvedState(), [...invertAlg(parseAlg(cur.alg.alg)), ...(cur.auf ? [cur.auf] : [])]) : solvedState();
  return (
    <div className="drills">
      <div className="seg wide" role="group" aria-label="Algorithm set">
        {Object.entries(DRILL_SETS).map(([k, v]) => <button key={k} className={k === setId ? 'on' : ''} onClick={() => { sfx.tap(); setSetId(k); }}>{v.label}</button>)}
      </div>
      {cur && (
        <div className="drill-card card">
          <p className="eyebrow">Recognise this case · {((revealed ? shownAt : now) - shownAt > 0 ? ((now - shownAt) / 1000).toFixed(1) : '0.0')}s</p>
          <CaseDiagram state={state} colors={colors} mode={set.mode} size={190} />
          {revealed ? (
            <div className="drill-answer">
              <h3>{cur.alg.name}</h3>
              <p className="mono">{cur.auf ? `(${cur.auf}) ` : ''}{cur.alg.alg}</p>
              <div className="row center-row">
                <button className="btn-ghost" onClick={() => setWatch(cur.alg)}>▶ Watch in 3D</button>
                <button className="btn-toy" onClick={() => grade(true)}>✓ Knew it</button>
                <button className="btn-ghost danger" onClick={() => grade(false)}>✗ Practise more</button>
              </div>
            </div>
          ) : (
            <button className="btn-toy big" onClick={() => { sfx.tap(); setRevealed(true); }}>Reveal</button>
          )}
          <p className="muted small">Session: {score.ok}/{score.n} correct. Cases you miss come back more often.</p>
        </div>
      )}
      {watch && <AlgModal alg={watch} mode={set.mode} onClose={() => setWatch(null)} />}
    </div>
  );
}

export function Speed({ tab }: { tab?: string }) {
  const t = tab === 'drills' ? 'drills' : 'timer';
  useEffect(() => { return () => stopVoice(); }, []);
  return (
    <div className="section-page speed">
      <header className="section-hero card compact">
        <div className="sh-text">
          <p className="eyebrow">Speed</p>
          <h1>Get faster, <span className="grad">every week</span></h1>
        </div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={t === 'timer'} className={t === 'timer' ? 'on' : ''} onClick={() => nav('/speed')}>⏱ Timer</button>
          <button role="tab" aria-selected={t === 'drills'} className={t === 'drills' ? 'on' : ''} onClick={() => nav('/speed/drills')}>🧠 Alg drills</button>
          <button className="btn-ghost sm" onClick={() => speak('speed_intro')}>▶ How it works</button>
        </div>
      </header>
      {t === 'timer' ? <Timer /> : <Drills />}
    </div>
  );
}
