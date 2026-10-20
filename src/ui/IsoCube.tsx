// Flat isometric cube drawing (top, front, right faces) — used for thumbnails and illustrations.
import type { State } from '../cube/model';

interface FaceProps { x: number; y: number; s: number; top: string[]; left: string[]; right: string[] }

/** top: 9 colours indexed [a*3+b] along the two top edges; left = front face, right = right face (row-major). */
export function IsoCube({ x, y, s, top, left, right }: FaceProps) {
  const cells: JSX.Element[] = [];
  const h = s * 0.5;
  const sw = s * 0.14;
  const pt = (a: number, b: number) => `${x + (a - b) * s * 0.866},${y + (a + b) * h}`;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    cells.push(<polygon key={`t${i}${j}`} points={[pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)].join(' ')} fill={top[i * 3 + j]} stroke="#101018" strokeWidth={sw} strokeLinejoin="round" />);
  const lp = (a: number, b: number) => `${x + (-3 + a) * s * 0.866},${y + (3 + a) * h + b * s}`;
  const rp = (a: number, b: number) => `${x + a * s * 0.866},${y + (6 - a) * h + b * s}`;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    cells.push(<polygon key={`l${i}${j}`} points={[lp(i, j), lp(i + 1, j), lp(i + 1, j + 1), lp(i, j + 1)].join(' ')} fill={left[j * 3 + i]} stroke="#101018" strokeWidth={sw} strokeLinejoin="round" style={{ filter: 'brightness(.88)' }} />);
    cells.push(<polygon key={`r${i}${j}`} points={[rp(i, j), rp(i + 1, j), rp(i + 1, j + 1), rp(i, j + 1)].join(' ')} fill={right[j * 3 + i]} stroke="#101018" strokeWidth={sw} strokeLinejoin="round" style={{ filter: 'brightness(.72)' }} />);
  }
  return <g>{cells}</g>;
}

/** Thumbnail of a real cube state, seen from the front-right-top. */
export function CubeThumb({ state, colors, size = 120, className }: { state: State; colors: string[]; size?: number; className?: string }) {
  const col = (i: number) => colors[state[i]] ?? '#333';
  // top: IsoCube wants [x*3+z]; U facelet (row=z, col=x) = U[z*3+x]
  const top = Array.from({ length: 9 }, (_, k) => col(Math.floor(k % 3) * 3 + Math.floor(k / 3)));
  const left = Array.from({ length: 9 }, (_, k) => col(18 + k)); // F
  const right = Array.from({ length: 9 }, (_, k) => col(9 + k)); // R
  return (
    <svg className={className} viewBox="0 0 120 124" width={size} height={size * 124 / 120} aria-hidden="true">
      <IsoCube x={60} y={6} s={20} top={top} left={left} right={right} />
    </svg>
  );
}
