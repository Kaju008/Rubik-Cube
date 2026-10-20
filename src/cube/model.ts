// Cubr cube engine — facelet model built from 3D geometry so every move is derived, not hand-typed.
// Facelet order follows Kociemba: U1..U9 R1..R9 F1..F9 D1..D9 L1..L9 B1..B9 (index = face*9 + row*3 + col).

export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];
export type V3 = [number, number, number];

/** A cube state: 54 colour ids (0..5). Colour id = index of the face whose centre carries that colour in the scan frame. */
export type State = Uint8Array;

export interface Facelet {
  idx: number;
  face: Face;
  p: V3; // cubie position, each coord in {-1,0,1}
  n: V3; // outward normal
}

function faceletGeom(f: Face, r: number, c: number): { p: V3; n: V3 } {
  switch (f) {
    case 'U': return { p: [c - 1, 1, r - 1], n: [0, 1, 0] };
    case 'R': return { p: [1, 1 - r, 1 - c], n: [1, 0, 0] };
    case 'F': return { p: [c - 1, 1 - r, 1], n: [0, 0, 1] };
    case 'D': return { p: [c - 1, -1, 1 - r], n: [0, -1, 0] };
    case 'L': return { p: [-1, 1 - r, c - 1], n: [-1, 0, 0] };
    case 'B': return { p: [1 - c, 1 - r, -1], n: [0, 0, -1] };
  }
}

export const FACELETS: Facelet[] = [];
FACES.forEach((face, fi) => {
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const g = faceletGeom(face, r, c);
      FACELETS.push({ idx: fi * 9 + r * 3 + c, face, ...g });
    }
});

const key = (p: V3, n: V3) => `${p.join(',')}|${n.join(',')}`;
const LOOKUP = new Map<string, number>();
FACELETS.forEach((f) => LOOKUP.set(key(f.p, f.n), f.idx));

function rot(v: V3, axis: number, dir: number): V3 {
  const [x, y, z] = v;
  if (axis === 0) return [x, -dir * z, dir * y];
  if (axis === 1) return [dir * z, y, -dir * x];
  return [-dir * y, dir * x, z];
}

interface MoveSpec { axis: number; layer: number | 'all'; dir: number }
const BASE: Record<string, MoveSpec> = {
  R: { axis: 0, layer: 1, dir: -1 },
  L: { axis: 0, layer: -1, dir: 1 },
  U: { axis: 1, layer: 1, dir: -1 },
  D: { axis: 1, layer: -1, dir: 1 },
  F: { axis: 2, layer: 1, dir: -1 },
  B: { axis: 2, layer: -1, dir: 1 },
  M: { axis: 0, layer: 0, dir: 1 },
  E: { axis: 1, layer: 0, dir: 1 },
  S: { axis: 2, layer: 0, dir: -1 },
  x: { axis: 0, layer: 'all', dir: -1 },
  y: { axis: 1, layer: 'all', dir: -1 },
  z: { axis: 2, layer: 'all', dir: -1 },
};

/** For animation: which axis/layer turns and by how many signed quarter turns (right-hand rule). */
export function moveGeometry(m: string): { axis: number; layer: number | 'all'; quarters: number } {
  const spec = BASE[m[0]];
  const amt = m.endsWith('2') ? 2 : m.endsWith("'") ? -1 : 1;
  return { axis: spec.axis, layer: spec.layer, quarters: spec.dir * amt };
}

/** Permutation as "to" array: the sticker at i moves to to[i]. */
export type Perm = Uint8Array;

function quarterPerm(spec: MoveSpec): Perm {
  const to = new Uint8Array(54);
  for (const f of FACELETS) {
    const inLayer = spec.layer === 'all' || f.p[spec.axis] === spec.layer;
    if (!inLayer) { to[f.idx] = f.idx; continue; }
    const j = LOOKUP.get(key(rot(f.p, spec.axis, spec.dir), rot(f.n, spec.axis, spec.dir)));
    if (j === undefined) throw new Error('bad geometry');
    to[f.idx] = j;
  }
  return to;
}

export const IDENTITY: Perm = Uint8Array.from({ length: 54 }, (_, i) => i);

/** a then b */
export function compose(a: Perm, b: Perm): Perm {
  const out = new Uint8Array(54);
  for (let i = 0; i < 54; i++) out[i] = b[a[i]];
  return out;
}
export function invertPerm(a: Perm): Perm {
  const out = new Uint8Array(54);
  for (let i = 0; i < 54; i++) out[a[i]] = i;
  return out;
}

export const MOVE_PERMS: Record<string, Perm> = {};
for (const [name, spec] of Object.entries(BASE)) {
  const q = quarterPerm(spec);
  const h = compose(q, q);
  MOVE_PERMS[name] = q;
  MOVE_PERMS[name + '2'] = h;
  MOVE_PERMS[name + "'"] = compose(h, q);
}

export function parseAlg(alg: string): string[] {
  return alg.replace(/’/g, "'").trim().split(/\s+/).filter(Boolean);
}

export function algPerm(moves: string[] | string): Perm {
  const list = typeof moves === 'string' ? parseAlg(moves) : moves;
  let p = IDENTITY;
  for (const m of list) {
    const mp = MOVE_PERMS[m];
    if (!mp) throw new Error('Unknown move ' + m);
    p = compose(p, mp);
  }
  return p;
}

export function applyPerm(s: State, to: Perm): State {
  const out = new Uint8Array(54);
  for (let i = 0; i < 54; i++) out[to[i]] = s[i];
  return out;
}
export function applyMoves(s: State, moves: string[] | string): State {
  const list = typeof moves === 'string' ? parseAlg(moves) : moves;
  let cur = s;
  for (const m of list) cur = applyPerm(cur, MOVE_PERMS[m]);
  return cur;
}

export function solvedState(): State {
  return Uint8Array.from({ length: 54 }, (_, i) => Math.floor(i / 9));
}

export function isSolved(s: State): boolean {
  for (let f = 0; f < 6; f++) {
    const c = s[f * 9 + 4];
    for (let k = 0; k < 9; k++) if (s[f * 9 + k] !== c) return false;
  }
  return true;
}

export function invertAlg(moves: string[]): string[] {
  return [...moves].reverse().map((m) => (m.endsWith("'") ? m[0] : m.endsWith('2') ? m : m + "'"));
}

const ROT_FACES = new Set(['x', 'y', 'z']);
export const isRotation = (m: string) => ROT_FACES.has(m[0]);
export const moveAmount = (m: string) => (m.endsWith('2') ? 2 : m.endsWith("'") ? 3 : 1);
export function makeMove(face: string, amt: number): string | null {
  const a = ((amt % 4) + 4) % 4;
  if (a === 0) return null;
  return face + (a === 1 ? '' : a === 2 ? '2' : "'");
}

/** Merge consecutive moves on the same face (U U -> U2, U U' -> nothing). */
export function simplify(moves: string[]): string[] {
  const out: string[] = [];
  for (const m of moves) {
    const last = out[out.length - 1];
    if (last && last[0] === m[0]) {
      out.pop();
      const merged = makeMove(m[0], moveAmount(last) + moveAmount(m));
      if (merged) out.push(merged);
    } else out.push(m);
  }
  return out;
}

/** Convert a state (relative to its current centres) to a Kociemba facelet string. */
export function toFaceletString(s: State): string {
  const centreToFace = new Map<number, Face>();
  FACES.forEach((f, fi) => centreToFace.set(s[fi * 9 + 4], f));
  let out = '';
  for (let i = 0; i < 54; i++) out += centreToFace.get(s[i]) ?? '?';
  return out;
}

export function fromFaceletString(str: string): State {
  return Uint8Array.from(str.split('').map((ch) => FACES.indexOf(ch as Face)));
}

export function randomScramble(len = 22): string[] {
  const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
  const axis: Record<string, number> = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };
  const out: string[] = [];
  let lastFace = '', lastAxis = -1, prevAxisCount = 0;
  while (out.length < len) {
    const f = faces[Math.floor(Math.random() * 6)];
    if (f === lastFace) continue;
    if (axis[f] === lastAxis && prevAxisCount >= 2) continue;
    const suffix = ['', "'", '2'][Math.floor(Math.random() * 3)];
    out.push(f + suffix);
    prevAxisCount = axis[f] === lastAxis ? prevAxisCount + 1 : 1;
    lastAxis = axis[f];
    lastFace = f;
  }
  return out;
}
