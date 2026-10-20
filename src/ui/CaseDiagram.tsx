// Top-down last-layer diagram (the standard OLL/PLL case picture), computed from a cube state.
import type { State } from '../cube/model';

interface Props { state: State; colors: string[]; mode: 'oll' | 'pll'; size?: number }

export function CaseDiagram({ state, colors, mode, size = 108 }: Props) {
  const yellow = state[4];
  const col = (i: number) => (mode === 'oll' ? (state[i] === yellow ? colors[yellow] : '#3a3a4c') : colors[state[i]]);
  const cells: JSX.Element[] = [];
  const S = 20, G = 2, O = 14; // sticker, gap, offset for side strips
  const top0 = O + 4;
  // U face (row 0 = back)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
    cells.push(<rect key={`u${r}${c}`} x={top0 + c * (S + G)} y={top0 + r * (S + G)} width={S} height={S} rx={4} fill={col(r * 3 + c)} />);
  const strip = (key: string, idx: number[], horiz: boolean, fixed: number) =>
    idx.forEach((fi, k) => {
      const along = top0 + k * (S + G);
      cells.push(horiz
        ? <rect key={key + k} x={along} y={fixed} width={S} height={8} rx={3} fill={col(fi)} />
        : <rect key={key + k} x={fixed} y={along} width={8} height={S} rx={3} fill={col(fi)} />);
    });
  const span = 3 * S + 2 * G;
  strip('b', [47, 46, 45], true, top0 - 11);           // back top row, seen from above
  strip('f', [18, 19, 20], true, top0 + span + 3);     // front top row
  strip('l', [36, 37, 38], false, top0 - 11);          // left top row (back → front)
  strip('r', [11, 10, 9], false, top0 + span + 3);     // right top row (back → front)
  const W = top0 * 2 + span;
  return (
    <svg className="case-diagram" viewBox={`0 0 ${W} ${W}`} width={size} height={size} aria-hidden="true">
      <rect x={top0 - 3} y={top0 - 3} width={span + 6} height={span + 6} rx={7} fill="#0b0b12" />
      {cells}
    </svg>
  );
}
