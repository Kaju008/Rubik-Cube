import { describe, it, expect } from 'vitest';
import { applyMoves, invertAlg, parseAlg, randomScramble, solvedState, isSolved } from '../src/cube/model';
import { relativeState, reaches } from '../src/cube/target';
import { PATTERNS } from '../src/learn/algs';

describe('relative target state', () => {
  it('a solution of Z takes the scrambled cube to the pattern', () => {
    for (let t = 0; t < 40; t++) {
      const A = randomScramble(25);
      const P = parseAlg(PATTERNS[t % PATTERNS.length].alg);
      const S = applyMoves(solvedState(), A);
      const T = applyMoves(solvedState(), P);
      const Z = relativeState(S, T)!;
      expect(Z).not.toBeNull();
      const x = [...invertAlg(A), ...P]; // a known route from S to T
      expect(reaches(S, x, T)).toBe(true);
      // x must also solve Z, which is what lets any solver find a route
      expect(isSolved(applyMoves(Z, x))).toBe(true);
    }
  });
});
