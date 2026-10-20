// Turns six raw face captures into a cube state: names the centres, classifies all 54 stickers with a
// balanced assignment (exactly 9 of each colour), and auto-detects how each face was held.
import { State } from '../cube/model';
import { fastValid, validate } from '../cube/pieces';
import { hungarian } from './hungarian';
import { CellSample, ColorName, COLOR_NAMES, Lab, guessColor, labDist, refLab } from './color';

export interface Capture { cells: CellSample[] }
export interface Resolved {
  state: State;           // colour id = role face index (U R F D L B)
  names: ColorName[];     // names[colourId]
  valid: boolean;
  errors: string[];
  lowConfidence: number[]; // facelet indices worth double-checking
}

/** Index of the image cell that lands on facelet cell k when the face image is rotated by q quarter turns. */
export function rotIndex(k: number, q: number): number {
  let r = Math.floor(k / 3), c = k % 3;
  for (let i = 0; i < q; i++) { const nr = 2 - c; c = r; r = nr; }
  return r * 3 + c;
}

const ROLE_A: Record<ColorName, number> = { yellow: 0, orange: 1, green: 2, white: 3, red: 4, blue: 5 };
const ROLE_B: Record<ColorName, number> = { yellow: 0, red: 1, green: 2, white: 3, orange: 4, blue: 5 };

export function nameCentres(captures: Capture[]): ColorName[] {
  const cost = captures.map((cap) => {
    const cell = cap.cells[4];
    const g = guessColor(cell.rgb);
    return COLOR_NAMES.map((n) => labDist(cell.lab, refLab(n)) + (g && g !== n ? 18 : 0));
  });
  return hungarian(cost).map((j) => COLOR_NAMES[j]);
}

/** labels[capture][cell] = index of the capture whose centre colour this sticker has. */
export function classifyStickers(captures: Capture[]): { labels: number[][]; margin: number[][] } {
  const stickers: { cap: number; cell: number; lab: Lab }[] = [];
  captures.forEach((c, ci) => c.cells.forEach((s, k) => stickers.push({ cap: ci, cell: k, lab: s.lab })));
  let refs: Lab[] = captures.map((c) => c.cells[4].lab);
  let assign: number[] = [];
  for (let pass = 0; pass < 2; pass++) {
    const cost = stickers.map((st) => {
      const row: number[] = [];
      for (let j = 0; j < 6; j++) {
        const d = st.cell === 4 ? (st.cap === j ? 0 : 1e6) : labDist(st.lab, refs[j]);
        for (let r = 0; r < 9; r++) row.push(d);
      }
      return row;
    });
    assign = hungarian(cost).map((col) => Math.floor(col / 9));
    // refine references with the mean of each class (handles light changes between faces)
    refs = refs.map((centre, j) => {
      const mem = stickers.filter((_, i) => assign[i] === j);
      const mean = [0, 1, 2].map((d) => mem.reduce((m, s) => m + s.lab[d], 0) / Math.max(1, mem.length)) as Lab;
      return [0, 1, 2].map((d) => centre[d] * 0.4 + mean[d] * 0.6) as Lab;
    });
  }
  const labels = captures.map(() => new Array(9).fill(0));
  const margin = captures.map(() => new Array(9).fill(99));
  stickers.forEach((st, i) => {
    labels[st.cap][st.cell] = assign[i];
    const d = refs.map((r) => labDist(st.lab, r)).sort((a, b) => a - b);
    margin[st.cap][st.cell] = d[1] - d[0];
  });
  return { labels, margin };
}

export function buildState(labels: number[][], roleOf: number[], rots: number[]): State {
  const s = new Uint8Array(54);
  labels.forEach((cells, ci) => {
    const face = roleOf[ci];
    for (let k = 0; k < 9; k++) s[face * 9 + k] = roleOf[cells[rotIndex(k, rots[ci])]];
  });
  return s;
}

export function resolveScan(captures: Capture[]): Resolved {
  const centreNames = nameCentres(captures);
  const { labels, margin } = classifyStickers(captures);
  let best: { state: State; cost: number; roles: number[] } | null = null;
  for (const [ri, table] of [ROLE_A, ROLE_B].entries()) {
    const roleOf = centreNames.map((n) => table[n]);
    const rots = [0, 0, 0, 0, 0, 0];
    for (let combo = 0; combo < 4096; combo++) {
      let cost = ri * 0.5;
      for (let f = 0; f < 6; f++) { rots[f] = (combo >> (2 * f)) & 3; cost += rots[f] === 0 ? 0 : rots[f] === 2 ? 2 : 1; }
      if (best && cost >= best.cost) continue;
      const s = buildState(labels, roleOf, rots);
      if (fastValid(s)) best = { state: s, cost, roles: roleOf };
    }
  }
  const names: ColorName[] = new Array(6);
  const roles = best?.roles ?? centreNames.map((n) => ROLE_A[n]);
  centreNames.forEach((n, ci) => (names[roles[ci]] = n));
  const state = best?.state ?? buildState(labels, roles, [0, 0, 0, 0, 0, 0]);
  const v = validate(state, names);
  // low-confidence stickers, mapped to facelet positions (only meaningful for the unrotated fallback)
  const lowConfidence: number[] = [];
  if (!best) labels.forEach((_, ci) => margin[ci].forEach((m, k) => { if (k !== 4 && m < 6) lowConfidence.push(roles[ci] * 9 + k); }));
  return { state, names, valid: v.ok, errors: v.errors, lowConfidence };
}
