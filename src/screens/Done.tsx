import { useEffect, useState } from 'react';
import type { DoneStats } from '../App';
import { Confetti } from '../ui/Confetti';
import { Mascot } from '../ui/Mascot';
import { SelfieBooth } from '../ui/SelfieBooth';
import { speak } from '../audio/voice';

export const fmtTime = (ms: number) => {
  const s = Math.max(1, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function Popper() {
  return (
    <svg className="popper" viewBox="0 0 160 160" aria-hidden="true">
      <path d="M30 140 L62 52 L108 98 Z" fill="#FFD93B" stroke="#17130a" strokeWidth="4" strokeLinejoin="round" />
      <path d="M44 102 L80 76 M52 124 L94 92" stroke="#FF4FD8" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="85" cy="75" rx="33" ry="11" transform="rotate(45 85 75)" fill="#FF8A1F" stroke="#17130a" strokeWidth="4" />
      <g className="popper-burst">
        <rect x="104" y="20" width="12" height="12" rx="3" fill="#2F7BFF" transform="rotate(20 110 26)" />
        <rect x="128" y="50" width="12" height="12" rx="3" fill="#22D17A" transform="rotate(-15 134 56)" />
        <circle cx="90" cy="22" r="6" fill="#FF3B4E" />
        <circle cx="140" cy="84" r="6" fill="#FFD93B" />
        <path d="M120 34 q10 -12 22 -6" stroke="#FF4FD8" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M70 18 q-2 -12 10 -16" stroke="#FFD93B" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M134 104 q14 0 18 12" stroke="#2F7BFF" strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Done({ stats, onAgain, onHome, onDemo }: { stats: DoneStats | null; onAgain: () => void; onHome: () => void; onDemo: () => void }) {
  const [booth, setBooth] = useState(false);
  const already = !stats || stats.moves === 0;
  useEffect(() => { if (already) speak('already_solved'); }, [already]);

  const time = stats ? fmtTime(stats.ms) : '0:00';
  const route = stats?.method === 'fast' ? 'Fast' : 'Learn';
  const share = async () => {
    const text = !already ? `I just solved my Rubik's Cube with Cubr in ${time} (${stats!.moves} moves)! 🧊` : "Cubr solves your Rubik's Cube with your camera 🧊";
    const url = location.href.split('#')[0];
    try {
      if (navigator.share) await navigator.share({ title: 'Cubr', text, url });
      else await navigator.clipboard.writeText(`${text} ${url}`);
    } catch { /* cancelled */ }
  };

  return (
    <div className="done">
      {!already && <Confetti />}
      <div className="done-hero">
        {!already && <Popper />}
        <Mascot size={140} mood="wow" className="bob" id="done" />
        {!already && <Popper />}
      </div>
      <h1>{already ? 'Already solved!' : <>You solved it! <span className="grad">🎉</span></>}</h1>
      {!already && (
        <p className="done-line">
          in <b className="grad">{stats!.moves} moves</b> and <b className="grad">{time}</b>
        </p>
      )}
      {!already && (
        <div className="stats">
          <div className="stat card"><b>{time}</b><span>time</span></div>
          <div className="stat card"><b>{stats!.moves}</b><span>moves</span></div>
          <div className="stat card"><b>{route}</b><span>route</span></div>
        </div>
      )}
      {!already && (
        <button className="btn-toy big selfie-btn" onClick={() => setBooth(true)}>📸 Victory selfie</button>
      )}
      <p className="muted">{already ? 'Scramble it up and scan again.' : 'Pose with your cube. We add your time and the Cubr logo, ready to download.'}</p>
      <div className="row center-row">
        <button className={already ? 'btn-toy big' : 'btn-ghost'} onClick={onAgain}>Solve another →</button>
        <button className="btn-ghost" onClick={share}>Share</button>
        <button className="btn-ghost" onClick={onDemo}>Demo</button>
        <button className="btn-ghost" onClick={onHome}>Home</button>
      </div>
      {booth && stats && <SelfieBooth time={time} moves={stats.moves} route={route} onClose={() => setBooth(false)} />}
    </div>
  );
}
