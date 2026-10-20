// Runs in the background from page load: builds the solver tables once ("pre-installed"), then answers solve requests.
import Kociemba from '../vendor/kociemba.js';
import { solveBeginner, fastSolution, Solution } from './beginner';
import { toFaceletString, parseAlg, applyMoves, isSolved, State } from './model';

let ready = false;
const t0 = performance.now();
try {
  Kociemba.initSolver();
  ready = true;
  (self as unknown as Worker).postMessage({ type: 'ready', ms: Math.round(performance.now() - t0) });
} catch (e) {
  (self as unknown as Worker).postMessage({ type: 'error', error: String(e) });
}

self.onmessage = (ev: MessageEvent) => {
  const { id, state } = ev.data as { id: number; state: number[] };
  const s: State = Uint8Array.from(state);
  let beginner: Solution | null = null;
  let fast: Solution | null = null;
  let error: string | null = null;
  try {
    beginner = solveBeginner(s);
  } catch (e) {
    error = String(e);
  }
  try {
    if (ready) {
      const str = toFaceletString(s);
      const sol = Kociemba.fromString(str).solve() as string;
      const moves = parseAlg(sol);
      if (isSolved(applyMoves(s, moves))) fast = fastSolution(moves);
    }
  } catch (e) {
    error = error ?? String(e);
  }
  (self as unknown as Worker).postMessage({ type: 'solution', id, beginner, fast, error });
};
