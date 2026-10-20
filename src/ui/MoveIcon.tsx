// Vector diagram of a move: a cube seen from the front-right-top, the turning layer highlighted, a big arrow.
const c = 26, dx = 13, dy = -13, x0 = 34, y0 = 52;
const P = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;

type Cell = { pts: string; on: boolean };

function cells(move: string): Cell[] {
  const f = move[0];
  const out: Cell[] = [];
  const all = f === 'y' || f === 'x' || f === 'z';
  // front
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const on = all || (f === 'R' && i === 2) || (f === 'L' && i === 0) || (f === 'U' && j === 0) || (f === 'D' && j === 2) || f === 'F';
    const X = x0 + i * c, Yy = y0 + j * c;
    out.push({ pts: [P(X, Yy), P(X + c, Yy), P(X + c, Yy + c), P(X, Yy + c)].join(' '), on });
  }
  // top (i across, k depth)
  for (let k = 0; k < 3; k++) for (let i = 0; i < 3; i++) {
    const on = all || f === 'U' || (f === 'R' && i === 2) || (f === 'L' && i === 0) || (f === 'F' && k === 0) || (f === 'B' && k === 2);
    const p = (ii: number, kk: number) => P(x0 + ii * c + kk * dx, y0 + kk * dy);
    out.push({ pts: [p(i, k), p(i + 1, k), p(i + 1, k + 1), p(i, k + 1)].join(' '), on });
  }
  // right (k depth, j row)
  for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) {
    const on = all || f === 'R' || (f === 'U' && j === 0) || (f === 'D' && j === 2) || (f === 'F' && k === 0) || (f === 'B' && k === 2);
    const q = (kk: number, jj: number) => P(x0 + 3 * c + kk * dx, y0 + jj * c + kk * dy);
    out.push({ pts: [q(k, j), q(k + 1, j), q(k + 1, j + 1), q(k, j + 1)].join(' '), on });
  }
  return out;
}

function arc(cx: number, cy: number, r: number, cw: boolean) {
  // 280° arc, arrow at the end
  const a0 = cw ? -200 : 20, a1 = cw ? 60 : -240;
  const rad = (a: number) => (a * Math.PI) / 180;
  const s = [cx + r * Math.cos(rad(a0)), cy + r * Math.sin(rad(a0))];
  const e = [cx + r * Math.cos(rad(a1)), cy + r * Math.sin(rad(a1))];
  return `M${P(s[0], s[1])} A${r},${r} 0 1 ${cw ? 1 : 0} ${P(e[0], e[1])}`;
}

function arrowPath(move: string): { d: string; dashed?: boolean } {
  const f = move[0], prime = move.endsWith("'");
  const rev = (pts: [number, number][]) => (prime ? [...pts].reverse() : pts);
  const line = (pts: [number, number][]) => 'M' + rev(pts).map(([a, b]) => P(a, b)).join(' L');
  switch (f) {
    case 'R': return { d: line([[x0 + 2.5 * c, y0 + 3 * c + 8], [x0 + 2.5 * c, y0 + 2], [x0 + 2.5 * c + 2.6 * dx, y0 + 2.6 * dy]]) };
    case 'L': return { d: line([[x0 + 0.5 * c + 2.6 * dx, y0 + 2.6 * dy], [x0 + 0.5 * c, y0 + 2], [x0 + 0.5 * c, y0 + 3 * c + 8]]) };
    case 'U': return { d: line([[x0 + 3 * c + 2.6 * dx, y0 + 0.5 * c + 2.6 * dy], [x0 + 3 * c, y0 + 0.5 * c], [x0 - 10, y0 + 0.5 * c]]) };
    case 'D': return { d: line([[x0 - 10, y0 + 2.5 * c], [x0 + 3 * c, y0 + 2.5 * c], [x0 + 3 * c + 2.6 * dx, y0 + 2.5 * c + 2.6 * dy]]) };
    case 'F': return { d: arc(x0 + 1.5 * c, y0 + 1.5 * c, 1.05 * c, !prime) };
    case 'B': return { d: arc(x0 + 1.5 * c + 3 * dx, y0 + 1.5 * c + 3 * dy, 1.5 * c, prime), dashed: true };
    case 'y': return { d: line([[x0 + 3 * c + 2.6 * dx, y0 + 1.5 * c + 2.6 * dy], [x0 + 3 * c, y0 + 1.5 * c], [x0 - 14, y0 + 1.5 * c]]) };
    default: return { d: '' };
  }
}

export function MoveIcon({ move, size = 160, className }: { move: string; size?: number; className?: string }) {
  const a = arrowPath(move);
  const double = move.endsWith('2');
  const whole = 'xyz'.includes(move[0]);
  return (
    <svg className={`move-icon ${className ?? ''}`} viewBox="0 0 190 150" width={size} height={(size * 150) / 190} aria-hidden="true">
      <defs>
        <marker id="mi-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="#FF4FD8" />
        </marker>
      </defs>
      {cells(move).map((cl, i) => (
        <polygon key={i} points={cl.pts} className={cl.on ? 'mi-on' : 'mi-off'} />
      ))}
      {a.d && <path d={a.d} className={`mi-arrow ${a.dashed ? 'dashed' : ''}`} markerEnd="url(#mi-head)" />}
      {double && <g><rect x="146" y="112" width="38" height="26" rx="13" fill="#FF4FD8" /><text x="165" y="130" textAnchor="middle" className="mi-badge">×2</text></g>}
      {move[0] === 'B' && <text x="150" y="24" className="mi-label">BACK</text>}
      {whole && <text x="6" y="146" className="mi-label">WHOLE CUBE</text>}
    </svg>
  );
}
