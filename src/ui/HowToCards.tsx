// Three floating "app window" cards with vector illustrations: set up → show the cube → follow along.
import { IsoCube } from './IsoCube';
const Y = '#FFD93B', R = '#FF3B4E', O = '#FF8A1F', G = '#22D17A', B = '#2F7BFF', W = '#F4F1EA', P = '#FF4FD8';

function SetupArt() {
  return (
    <svg viewBox="0 0 220 140" aria-hidden="true">
      <defs>
        <linearGradient id="ht-table" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#3a2f52" /><stop offset="1" stopColor="#231c33" /></linearGradient>
        <linearGradient id="ht-screen" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#2f7bff" stopOpacity=".55" /><stop offset="1" stopColor="#ff4fd8" stopOpacity=".45" /></linearGradient>
      </defs>
      <rect x="10" y="104" width="200" height="16" rx="8" fill="url(#ht-table)" />
      <rect x="18" y="120" width="10" height="16" rx="3" fill="#231c33" /><rect x="192" y="120" width="10" height="16" rx="3" fill="#231c33" />
      {/* stand */}
      <path d="M92 104 L104 86 L120 86 L130 104 Z" fill="#4a4a60" />
      {/* phone */}
      <g transform="rotate(-8 110 62)">
        <rect x="88" y="18" width="46" height="84" rx="9" fill="#14141c" stroke="#5c5c74" strokeWidth="2" />
        <rect x="92" y="26" width="38" height="68" rx="5" fill="url(#ht-screen)" />
        <circle cx="111" cy="22" r="2.2" fill={P} />
        <rect x="100" y="44" width="22" height="22" rx="4" fill="none" stroke={W} strokeWidth="2" strokeDasharray="4 3" />
      </g>
      {/* camera waves */}
      <g fill="none" stroke={Y} strokeWidth="2.5" strokeLinecap="round" className="ht-waves">
        <path d="M70 40 Q60 52 70 64" /><path d="M60 32 Q44 52 60 72" opacity=".6" />
      </g>
      <g fill={Y}><path d="M170 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" /><circle cx="186" cy="62" r="2.5" fill={G} /><circle cx="38" cy="86" r="2.5" fill={B} /></g>
    </svg>
  );
}

function ShowArt() {
  return (
    <svg viewBox="0 0 220 140" aria-hidden="true">
      {/* phone side-on */}
      <rect x="16" y="30" width="34" height="74" rx="8" fill="#14141c" stroke="#5c5c74" strokeWidth="2" />
      <circle cx="44" cy="44" r="3" fill={P} />
      {/* scan cone */}
      <path d="M47 44 L150 22 L150 112 Z" fill={P} opacity=".09" />
      <g stroke={P} strokeWidth="1.6" strokeDasharray="3 4" opacity=".7"><line x1="47" y1="44" x2="150" y2="22" /><line x1="47" y1="44" x2="150" y2="112" /></g>
      {/* cube */}
      <IsoCube x={152} y={30} s={11} top={[Y, Y, O, Y, Y, Y, G, Y, Y]} left={[R, R, R, B, R, R, R, W, R]} right={[G, G, G, G, G, O, G, G, Y]} />
      {/* hand */}
      <path d="M128 112 q6 -16 22 -14 l30 4 q12 2 10 12 l-2 10 q-2 8 -12 8 h-38 q-14 0 -10 -20z" fill="#f2b38a" />
      <path d="M170 102 q10 -10 18 -2" stroke="#d99572" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* scan brackets */}
      <g stroke={Y} strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M124 16 h-10 v10" /><path d="M180 16 h10 v10" /><path d="M114 92 v10 h10" /><path d="M190 92 v10 h-10" />
      </g>
      <rect className="ht-laser" x="116" y="20" width="72" height="3" rx="1.5" fill={Y} />
    </svg>
  );
}

function FollowArt() {
  return (
    <svg viewBox="0 0 220 140" aria-hidden="true">
      <rect x="22" y="14" width="176" height="112" rx="14" fill="#14141c" stroke="#3a3a50" strokeWidth="2" />
      <IsoCube x={80} y={34} s={10} top={[Y, Y, Y, Y, Y, Y, Y, Y, Y]} left={[R, R, R, R, R, R, R, R, R]} right={[G, G, G, G, G, G, G, G, G]} />
      {/* move arrow on right column */}
      <path d="M100 112 C 112 96, 112 70, 104 52" fill="none" stroke={P} strokeWidth="5" strokeLinecap="round" />
      <path d="M96 58 L104 46 L112 58 Z" fill={P} />
      {/* instruction pill */}
      <rect x="128" y="34" width="58" height="22" rx="11" fill={Y} />
      <text x="157" y="49.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="800" fontSize="12" fill="#17130a">R  ↑</text>
      <rect x="128" y="62" width="50" height="7" rx="3.5" fill="#3a3a50" /><rect x="128" y="74" width="36" height="7" rx="3.5" fill="#3a3a50" />
      {/* play + sound */}
      <circle cx="140" cy="104" r="11" fill={G} /><path d="M137 98 L146 104 L137 110 Z" fill="#04130b" />
      <g fill="none" stroke={W} strokeWidth="2.2" strokeLinecap="round"><path d="M160 98 q5 6 0 12" /><path d="M166 94 q9 10 0 20" opacity=".6" /></g>
    </svg>
  );
}

const CARDS = [
  { n: '01', title: 'Place your camera', sub: 'on a table surface, facing you', art: <SetupArt />, tint: 'var(--blue)' },
  { n: '02', title: 'Show your cube', sub: 'towards the camera, inside the box', art: <ShowArt />, tint: 'var(--pink)' },
  { n: '03', title: 'Tap Start', sub: 'and follow the moves with voice', art: <FollowArt />, tint: 'var(--green)' },
];

export function HowToCards() {
  return (
    <ol className="howto-cards">
      {CARDS.map((c, i) => (
        <li key={c.n} className="win" style={{ ['--tint' as string]: c.tint, ['--i' as string]: i }}>
          <div className="win-bar"><i /><i /><i /><span>{c.n} · step</span></div>
          <div className="win-art">{c.art}</div>
          <div className="win-text"><b>{c.title}</b><span>{c.sub}</span></div>
        </li>
      ))}
    </ol>
  );
}
