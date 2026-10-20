// Piece-level view of a facelet state: used for validation ("can this cube actually exist?") and by the solvers.
import { FACELETS, State, V3 } from './model';

export interface PieceSlot { pos: V3; facelets: number[] } // ordered facelets

const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const byPos = new Map<string, number[]>();
for (const f of FACELETS) {
  const k = f.p.join(',');
  if (!byPos.has(k)) byPos.set(k, []);
  byPos.get(k)!.push(f.idx);
}

export const CORNERS: PieceSlot[] = [];
export const EDGES: PieceSlot[] = [];
export const CENTERS = [4, 13, 22, 31, 40, 49];

for (const [k, list] of byPos) {
  const pos = k.split(',').map(Number) as V3;
  if (list.length === 3) {
    const ud = list.find((i) => FACELETS[i].n[1] !== 0)!;
    const rest = list.filter((i) => i !== ud);
    const n0 = FACELETS[ud].n;
    const first = rest.find((i) => dot(cross(n0, FACELETS[i].n), pos) < 0)!;
    const second = rest.find((i) => i !== first)!;
    CORNERS.push({ pos, facelets: [ud, first, second] });
  } else if (list.length === 2) {
    const prim = list.find((i) => FACELETS[i].n[1] !== 0) ?? list.find((i) => FACELETS[i].n[2] !== 0)!;
    EDGES.push({ pos, facelets: [prim, list.find((i) => i !== prim)!] });
  }
}

/** Which facelets share a cubie with facelet i. */
export const PARTNERS: number[][] = FACELETS.map((f) => byPos.get(f.p.join(','))!.filter((j) => j !== f.idx));

export interface Validation { ok: boolean; errors: string[]; badFacelets: number[] }

const COLOR_WORD = ['top', 'right', 'front', 'bottom', 'left', 'back'];

/** Validate a scanned state where colour id k = the colour of face k's centre. */
export function validate(s: State, names?: string[]): Validation {
  const errors: string[] = [];
  const bad = new Set<number>();
  const nm = (c: number) => names?.[c] ?? COLOR_WORD[c];

  for (let f = 0; f < 6; f++) if (s[f * 9 + 4] !== f) errors.push('Centre stickers are mixed up.');
  const counts = new Array(6).fill(0);
  for (let i = 0; i < 54; i++) counts[s[i]]++;
  counts.forEach((c, k) => {
    if (c !== 9) errors.push(`${cap(nm(k))} appears ${c} times (should be 9).`);
  });
  if (errors.length) return { ok: false, errors: dedupe(errors), badFacelets: [] };

  const solvedCornerKeys = CORNERS.map((c) => c.facelets.map((i) => Math.floor(i / 9)));
  const solvedEdgeKeys = EDGES.map((e) => e.facelets.map((i) => Math.floor(i / 9)));
  const setKey = (a: number[]) => [...a].sort().join('');

  const cornerPerm: number[] = [];
  let twist = 0;
  CORNERS.forEach((slot, si) => {
    const cols = slot.facelets.map((i) => s[i]);
    const piece = solvedCornerKeys.findIndex((k) => setKey(k) === setKey(cols));
    if (piece < 0) {
      slot.facelets.forEach((i) => bad.add(i));
      errors.push(`A corner has colours ${cols.map(nm).join(' / ')} — that corner doesn't exist.`);
      return;
    }
    if (cornerPerm.includes(piece)) {
      slot.facelets.forEach((i) => bad.add(i));
      errors.push('The same corner appears twice.');
    }
    cornerPerm[si] = piece;
    const o = cols.findIndex((c) => c === 0 || c === 3);
    // the piece's own colours in solved order, rotated by o, must match
    const ref = solvedCornerKeys[piece];
    const rotated = [ref[(3 - o) % 3], ref[(4 - o) % 3], ref[(5 - o) % 3]];
    if (rotated.join() !== cols.join()) {
      slot.facelets.forEach((i) => bad.add(i));
      errors.push('A corner has its colours in a mirrored order — one of its stickers is probably misread.');
    }
    twist += o;
  });

  const edgePerm: number[] = [];
  let flip = 0;
  EDGES.forEach((slot, si) => {
    const cols = slot.facelets.map((i) => s[i]);
    const piece = solvedEdgeKeys.findIndex((k) => setKey(k) === setKey(cols));
    if (piece < 0 || cols[0] === cols[1]) {
      slot.facelets.forEach((i) => bad.add(i));
      errors.push(`An edge has colours ${cols.map(nm).join(' / ')} — that edge doesn't exist.`);
      return;
    }
    if (edgePerm.includes(piece)) {
      slot.facelets.forEach((i) => bad.add(i));
      errors.push('The same edge appears twice.');
    }
    edgePerm[si] = piece;
    flip += cols[0] === solvedEdgeKeys[piece][0] ? 0 : 1;
  });

  if (errors.length) return { ok: false, errors: dedupe(errors), badFacelets: [...bad] };
  if (twist % 3 !== 0) errors.push('One corner is twisted — the cube can\'t be solved like this. Check for a misread sticker, or the cube may have been reassembled.');
  if (flip % 2 !== 0) errors.push('One edge is flipped — check for a misread sticker, or the cube may have been reassembled.');
  if (parity(cornerPerm) !== parity(edgePerm)) errors.push('Two pieces look swapped — check for misread stickers.');
  return { ok: errors.length === 0, errors, badFacelets: [] };
}

function parity(p: number[]): number {
  const seen = new Array(p.length).fill(false);
  let par = 0;
  for (let i = 0; i < p.length; i++) {
    if (seen[i]) continue;
    let len = 0;
    for (let j = i; !seen[j]; j = p[j]) { seen[j] = true; len++; }
    par += len - 1;
  }
  return par % 2;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const dedupe = (a: string[]) => [...new Set(a)];

/** Fast boolean check used when searching scan orientations. */
export function quickValid(s: State): boolean {
  return validate(s).ok;
}

// ---------- fast validity check (used thousands of times while resolving scans) ----------
const CK = CORNERS.map((c) => c.facelets.map((i) => Math.floor(i / 9)));
const EK = EDGES.map((e) => e.facelets.map((i) => Math.floor(i / 9)));
const sortKey = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.reduce((k, x) => k * 6 + x, 0); };
const CORNER_BY_KEY = new Map<number, number>(CK.map((k, i) => [sortKey(k), i]));
const EDGE_BY_KEY = new Map<number, number>(EK.map((k, i) => [sortKey(k), i]));

export function fastValid(s: State): boolean {
  const cp: number[] = new Array(8);
  let used = 0, twist = 0;
  for (let si = 0; si < 8; si++) {
    const f = CORNERS[si].facelets;
    const a = s[f[0]], b = s[f[1]], c = s[f[2]];
    const piece = CORNER_BY_KEY.get(sortKey([a, b, c]));
    if (piece === undefined || used & (1 << piece)) return false;
    used |= 1 << piece;
    cp[si] = piece;
    const o = a === 0 || a === 3 ? 0 : b === 0 || b === 3 ? 1 : 2;
    const ref = CK[piece];
    if (ref[(3 - o) % 3] !== a || ref[(4 - o) % 3] !== b) return false;
    twist += o;
  }
  if (twist % 3) return false;
  const ep: number[] = new Array(12);
  let eused = 0, flip = 0;
  for (let si = 0; si < 12; si++) {
    const f = EDGES[si].facelets;
    const a = s[f[0]], b = s[f[1]];
    if (a === b) return false;
    const piece = EDGE_BY_KEY.get(sortKey([a, b]));
    if (piece === undefined || eused & (1 << piece)) return false;
    eused |= 1 << piece;
    ep[si] = piece;
    if (a !== EK[piece][0]) flip++;
  }
  if (flip % 2) return false;
  return parity(cp) === parity(ep);
}
