// Cubr's mascot: a little toy cube with googly eyes. Original character.
interface Props { size?: number; mood?: 'happy' | 'wow' | 'think'; className?: string }

export function Mascot({ size = 120, mood = 'happy', className }: Props) {
  return (
    <svg className={`mascot ${className ?? ''}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="mbody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#262636" />
          <stop offset="1" stopColor="#15151f" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="112" rx="34" ry="5" fill="#000" opacity=".35" className="mascot-shadow" />
      <g className="mascot-body">
        {/* top face */}
        <path d="M22 30 L40 14 H98 L80 30 Z" fill="#1d1d2a" />
        <path d="M30 28 L42 18 H56 L45 28Z" fill="#FFD93B" /><path d="M50 28 L61 18 H75 L65 28Z" fill="#FFD93B" opacity=".85" /><path d="M69 28 L80 18 H93 L83 28Z" fill="#FFD93B" opacity=".7" />
        {/* side face */}
        <path d="M80 30 L98 14 V72 L80 88 Z" fill="#101018" />
        <path d="M84 36 L94 27 V40 L84 49Z" fill="#FF8A1F" opacity=".8" /><path d="M84 54 L94 45 V58 L84 67Z" fill="#FF8A1F" opacity=".65" /><path d="M84 72 L94 63 V73 L84 82Z" fill="#FF8A1F" opacity=".5" />
        {/* front face */}
        <rect x="18" y="30" width="62" height="60" rx="11" fill="url(#mbody)" />
        <rect x="23" y="35" width="16" height="15" rx="4" fill="#22D17A" />
        <rect x="41" y="35" width="16" height="15" rx="4" fill="#FF3B4E" />
        <rect x="59" y="35" width="16" height="15" rx="4" fill="#2F7BFF" />
        {/* eyes */}
        <g className="mascot-eyes">
          <rect x="23" y="52" width="16" height="16" rx="8" fill="#F4F1EA" />
          <rect x="59" y="52" width="16" height="16" rx="8" fill="#F4F1EA" />
          <circle cx={mood === 'think' ? 34 : 32} cy={mood === 'think' ? 57 : 61} r="4" fill="#0b0b12" className="pupil" />
          <circle cx={mood === 'think' ? 70 : 68} cy={mood === 'think' ? 57 : 61} r="4" fill="#0b0b12" className="pupil" />
        </g>
        <rect x="41" y="52" width="16" height="16" rx="4" fill="#FFD93B" />
        {/* mouth */}
        {mood === 'wow'
          ? <ellipse cx="49" cy="80" rx="6" ry="6" fill="#0b0b12" stroke="#FF4FD8" strokeWidth="2" />
          : <path d={mood === 'think' ? 'M40 80 Q49 78 58 80' : 'M38 76 Q49 88 60 76'} stroke="#FF4FD8" strokeWidth="4" strokeLinecap="round" fill="none" />}
        <circle cx="27" cy="78" r="3" fill="#FF4FD8" opacity=".5" /><circle cx="71" cy="78" r="3" fill="#FF4FD8" opacity=".5" />
      </g>
    </svg>
  );
}
