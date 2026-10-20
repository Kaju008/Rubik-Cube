// Reaching a target pattern from any cube state.
// If x solves the "relative" state Z, then applying x to the real cube S produces the target T.
import { applyMoves, State } from './model';
import { CORNERS, EDGES, CENTERS } from './pieces';

const face = (i: number) => Math.floor(i / 9);

/** For each position i, the home facelet whose sticker sits at i (S[i] === face(src[i])). Null if the state is not a real cube. */
export function sourceMap(s: State): Int16Array | null {
  const src = new Int16Array(54).fill(-1);
  for (const c of CENTERS) { if (s[c] !== face(c)) return null; src[c] = c; }
  for (const group of [CORNERS, EDGES]) {
    const used = new Set<number>();
    for (const slot of group) {
      const cols = slot.facelets.map((i) => s[i]);
      const key = [...cols].sort().join();
      const home = group.findIndex((h) => [...h.facelets.map(face)].sort().join() === key);
      if (home < 0 || used.has(home)) return null;
      used.add(home);
      for (let k = 0; k < slot.facelets.length; k++) {
        const h = group[home].facelets.find((f) => face(f) === cols[k]);
        if (h === undefined) return null;
        src[slot.facelets[k]] = h;
      }
    }
  }
  return src;
}

/** State Z such that any solution x of Z takes S to T (T must keep its centres in place). */
export function relativeState(S: State, T: State): State | null {
  const sigma = sourceMap(S), tau = sourceMap(T);
  if (!sigma || !tau) return null;
  const tauInv = new Int16Array(54);
  for (let i = 0; i < 54; i++) tauInv[tau[i]] = i;
  const Z = new Uint8Array(54);
  for (let i = 0; i < 54; i++) Z[i] = face(tauInv[sigma[i]]);
  return Z;
}

/** Check a candidate route: does applying x to S give T? */
export function reaches(S: State, x: string[], T: State) {
  const r = applyMoves(S, x);
  for (let i = 0; i < 54; i++) if (r[i] !== T[i]) return false;
  return true;
}
