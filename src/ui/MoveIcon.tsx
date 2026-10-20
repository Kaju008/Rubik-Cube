// Vector diagram of any move: a cube seen from the front-right-top, the turning layers highlighted, a big arrow.
// Built from the move's geometry, so face, wide (r, f…), slice (M, E, S) and whole-cube (x, y, z) moves all work.
import { moveGeometry } from '../cube/model';

const c = 26, dx = 13, dy = -13, x0 = 34, y0 = 52;
const P = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;

function inMove(axis: number, layers: number[] | 'all', pos: [number, number, number]) {
  return layers === 'all' || layers.includes(pos[axis]);
}

function arc(cx: number, cy: number, r: number, cw: boolean) {
  const a0 = cw ? -200 : 20, a1 = cw ? 60 : -240;
  const rad = (a: number) => (a * Math.PI) / 180;
  const s = [cx + r * Math.cos(rad(a0)), cy + r * Math.sin(rad(a0))];
  const e = [cx + r * Math.cos(rad(a1)), cy + r * Math.sin(rad(a1))];
  return `M${P(s[0], s[1])} A${r},${r} 0 1 ${cw ? 1 : 0} ${P(e[0], e[1])}`;
}

export function MoveIcon({ move, size = 160, className }: { move: string; size?: number; className?: string }) {
  const { axis, layers, quarters } = moveGeometry(move);
  const polys: { pts: string; on: boolean }[] = [];
  // front (x = i-1, y = 1-j, z = 1)
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const X = x0 + i * c, Y = y0 + j * c;
    polys.push({ pts: [P(X, Y), P(X + c, Y), P(X + c, Y + c), P(X, Y + c)].join(' '), on: inMove(axis, layers, [i - 1, 1 - j, 1]) });
  }
  // top (x = i-1, y = 1, z = 1-k)
  for (let k = 0; k < 3; k++) for (let i = 0; i < 3; i++) {
    const p = (ii: number, kk: number) => P(x0 + ii * c + kk * dx, y0 + kk * dy);
    polys.push({ pts: [p(i, k), p(i + 1, k), p(i + 1, k + 1), p(i, k + 1)].join(' '), on: inMove(axis, layers, [i - 1, 1, 1 - k]) });
  }
  // right (x = 1, y = 1-j, z = 1-k)
  for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) {
    const q = (kk: number, jj: number) => P(x0 + 3 * c + kk * dx, y0 + jj * c + kk * dy);
    polys.push({ pts: [q(k, j), q(k + 1, j), q(k + 1, j + 1), q(k, j + 1)].join(' '), on: inMove(axis, layers, [1, 1 - j, 1 - k]) });
  }

  // arrow: front stickers go UP when turning about x with negative sign, LEFT about y with negative sign
  const ls = layers === 'all' ? [-1, 0, 1] : layers;
  const mid = ls.reduce((a, b) => a + b, 0) / ls.length; // centre of the moving block
  const neg = quarters < 0;
  let d = '', dashed = false;
  if (axis === 0) {
    const X = x0 + (mid + 1.5) * c;
    const pts: [number, number][] = [[X, y0 + 3 * c + 8], [X, y0 + 2], [X + 2.6 * dx, y0 + 2.6 * dy]];
    const seq = neg ? pts : [...pts].reverse();
    d = 'M' + seq.map(([a, b]) => P(a, b)).join(' L');
  } else if (axis === 1) {
    const Y = y0 + (1.5 - mid) * c;
    const pts: [number, number][] = [[x0 + 3 * c + 2.6 * dx, Y + 2.6 * dy], [x0 + 3 * c, Y], [x0 - 12, Y]];
    const seq = neg ? pts : [...pts].reverse();
    d = 'M' + seq.map(([a, b]) => P(a, b)).join(' L');
  } else {
    const back = ls.every((l) => l < 0);
    if (back) { d = arc(x0 + 1.5 * c + 3 * dx, y0 + 1.5 * c + 3 * dy, 1.5 * c, neg); dashed = true; }
    else d = arc(x0 + 1.5 * c, y0 + 1.5 * c, mid === 0 && layers !== 'all' ? 0.7 * c : 1.05 * c, neg);
  }
  const double = move.endsWith('2');
  const whole = 'xyz'.includes(move[0]);
  const back = move[0] === 'B' || move[0] === 'b';
  return (
    <svg className={`move-icon ${className ?? ''}`} viewBox="0 0 190 150" width={size} height={(size * 150) / 190} aria-hidden="true">
      <defs>
        <marker id="mi-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="#FF4FD8" />
        </marker>
      </defs>
      {polys.map((p, i) => <polygon key={i} points={p.pts} className={p.on ? 'mi-on' : 'mi-off'} />)}
      {d && <path d={d} className={`mi-arrow ${dashed ? 'dashed' : ''}`} markerEnd="url(#mi-head)" />}
      {double && <g><rect x="146" y="112" width="38" height="26" rx="13" fill="#FF4FD8" /><text x="165" y="130" textAnchor="middle" className="mi-badge">×2</text></g>}
      {back && <text x="150" y="24" className="mi-label">BACK</text>}
      {whole && <text x="6" y="146" className="mi-label">WHOLE CUBE</text>}
    </svg>
  );
}
