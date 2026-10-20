import { useEffect } from 'react';
import type { DoneStats } from '../App';
import { Confetti } from '../ui/Confetti';
import { Mascot } from '../ui/Mascot';
import { say } from '../audio/voice';

const fmt = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function Done({ stats, onAgain, onHome, onDemo }: { stats: DoneStats | null; onAgain: () => void; onHome: () => void; onDemo: () => void }) {
  useEffect(() => {
    if (stats && stats.moves === 0) say('That cube is already solved! Scramble it and scan again.');
  }, [stats]);

  const share = async () => {
    const text = stats && stats.moves
      ? `I just solved my Rubik's Cube with Cubr in ${fmt(stats.ms)} (${stats.moves} moves)! 🧊`
      : 'Cubr solves your Rubik\'s Cube with your camera 🧊';
    const url = location.href.split('#')[0];
    try {
      if (navigator.share) await navigator.share({ title: 'Cubr', text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); alert('Copied to clipboard!'); }
    } catch { /* cancelled */ }
  };

  const already = stats && stats.moves === 0;
  return (
    <div className="done">
      {!already && <Confetti />}
      <Mascot size={150} mood="wow" className="bob" />
      <h1>{already ? 'Already solved!' : <>Solved! <span className="grad">🎉</span></>}</h1>
      {stats && !already && (
        <div className="stats">
          <div className="stat card"><b>{fmt(stats.ms)}</b><span>time</span></div>
          <div className="stat card"><b>{stats.moves}</b><span>moves</span></div>
          <div className="stat card"><b>{stats.method === 'beginner' ? 'Learn' : 'Fast'}</b><span>route</span></div>
        </div>
      )}
      <p className="muted">{already ? 'Scramble it up and scan again.' : 'Scramble it again and beat your time.'}</p>
      <div className="row center-row">
        <button className="btn-toy big" onClick={onAgain}>Solve another →</button>
        <button className="btn-ghost" onClick={share}>Share</button>
        <button className="btn-ghost" onClick={onDemo}>Demo</button>
        <button className="btn-ghost" onClick={onHome}>Home</button>
      </div>
    </div>
  );
}
