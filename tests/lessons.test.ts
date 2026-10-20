import { describe, it, expect } from 'vitest';
import { applyMoves, invertAlg, parseAlg, solvedState, isSolved } from '../src/cube/model';
import { solveCross } from '../src/cube/beginner';
import { LESSONS } from '../src/learn/lessons';
import { CORNERS, EDGES } from '../src/cube/pieces';

describe('lesson demos', () => {
  for (const l of LESSONS) for (const b of l.blocks) {
    if (b.kind === 'demo' && !(b.setup === '' && !/solved/.test(b.title))) it(`${l.id}: ${b.title} ends solved`, () => {
      const start = applyMoves(solvedState(), b.setup !== undefined ? parseAlg(b.setup) : invertAlg(parseAlg(b.alg)));
      expect(isSolved(applyMoves(start, b.alg))).toBe(true);
    });
    if (b.kind === 'cross-demo') it(`${l.id}: cross demo builds the cross`, () => {
      const s0 = applyMoves(solvedState(), b.setup);
      const s = applyMoves(s0, solveCross(s0));
      const centreOf = (i: number) => Math.floor(i / 9) * 9 + 4;
      expect(EDGES.filter((e) => e.pos[1] === -1).every((e) => e.facelets.every((i) => s[i] === s[centreOf(i)]))).toBe(true);
    });
  }
  it('lesson ids unique', () => expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length));
  void CORNERS;
});
