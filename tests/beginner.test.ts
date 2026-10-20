import { describe, it, expect } from 'vitest';
import { applyMoves, solvedState, isSolved, randomScramble } from '../src/cube/model';
import { solveBeginner } from '../src/cube/beginner';

describe('beginner solver', () => {
  it('solves 300 random cubes', () => {
    let total = 0, max = 0; const t = Date.now();
    for (let k = 0; k < 300; k++) {
      const start = applyMoves(solvedState(), randomScramble());
      const sol = solveBeginner(start);
      let s = start;
      for (const st of sol.stages) for (const c of st.chunks) s = applyMoves(s, c.moves);
      expect(isSolved(s)).toBe(true);
      total += sol.moveCount; max = Math.max(max, sol.moveCount);
    }
    console.log('avg moves', total / 300, 'max', max, 'ms/solve', (Date.now() - t) / 300);
  });
  it('handles a solved cube', () => {
    const sol = solveBeginner(solvedState());
    expect(sol.moveCount).toBe(0);
  });
  it('prints one example', () => {
    const sol = solveBeginner(applyMoves(solvedState(), randomScramble()));
    for (const st of sol.stages) console.log(st.title, '|', st.chunks.map(c => `[${c.label}] ${c.moves.join(' ')}`).join('  ·  '));
  });
});
