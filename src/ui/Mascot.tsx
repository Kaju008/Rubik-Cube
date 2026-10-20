// Cubr's mascot & logo: a little toy cube with living eyes. Original character.
// Pupils follow the pointer (CSS vars --lx/--ly set by startEyeTracking) and blink on their own.
interface Props { size?: number; mood?: 'happy' | 'wow' | 'think'; className?: string; id?: string }

let tracking = false;
/** Make every mascot's eyes follow the pointer; on touch devices they glance around by themselves. */
export function startEyeTracking() {
  if (tracking || typeof window === 'undefined') return;
  tracking = true;
  const root = document.documentElement;
  let raf = 0, lastMove = 0;
  const set = (x: number, y: number) => { root.style.setProperty('--lx', x.toFixed(2)); root.style.setProperty('--ly', y.toFixed(2)); };
  addEventListener('pointermove', (e: PointerEvent) => {
    lastMove = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const x = (e.clientX / innerWidth) * 2 - 1, y = (e.clientY / innerHeight) * 2 - 1;
      set(Math.max(-1, Math.min(1, x * 1.4)), Math.max(-1, Math.min(1, y * 1.4)));
    });
  }, { passive: true });
  // idle glances
  setInterval(() => {
    if (performance.now() - lastMove < 2500) return;
    const spots = [[0, 0], [-0.9, -0.2], [0.9, -0.2], [0.3, 0.7], [-0.5, 0.5], [0, -0.8]];
    const [x, y] = spots[Math.floor(Math.random() * spots.length)];
    set(x, y);
  }, 1800);
}

export function Mascot({ size = 120, mood = 'happy', className, id }: Props) {
  const g = `mbody-${id ?? 'm'}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`mascot ${className ?? ''}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2a3c" />
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
        <path d="M84 36 L94 27 V40 L84 49Z" fill="#22D17A" opacity=".85" /><path d="M84 54 L94 45 V58 L84 67Z" fill="#22D17A" opacity=".7" /><path d="M84 72 L94 63 V73 L84 82Z" fill="#22D17A" opacity=".55" />
        {/* front face */}
        <rect x="18" y="30" width="62" height="60" rx="11" fill={`url(#${g})`} />
        <rect x="23" y="35" width="16" height="15" rx="4" fill="#FF3B4E" />
        <rect x="41" y="35" width="16" height="15" rx="4" fill="#FF8A1F" />
        <rect x="59" y="35" width="16" height="15" rx="4" fill="#2F7BFF" />
        {/* eyes */}
        <g className="mascot-eyes">
          <rect x="23" y="52" width="16" height="16" rx="8" fill="#F4F1EA" />
          <rect x="59" y="52" width="16" height="16" rx="8" fill="#F4F1EA" />
          <g className="pupils">
            <circle cx="31" cy={mood === 'think' ? 58 : 60} r="4.2" fill="#0b0b12" />
            <circle cx="67" cy={mood === 'think' ? 58 : 60} r="4.2" fill="#0b0b12" />
            <circle cx="32.4" cy={mood === 'think' ? 56.6 : 58.6} r="1.3" fill="#fff" />
            <circle cx="68.4" cy={mood === 'think' ? 56.6 : 58.6} r="1.3" fill="#fff" />
          </g>
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
