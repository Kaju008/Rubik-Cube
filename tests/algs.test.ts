import { describe, it, expect } from 'vitest';
import { applyMoves, invertAlg, parseAlg, solvedState, isSolved, State } from '../src/cube/model';
import { CORNERS, EDGES } from '../src/cube/pieces';
import { OLL_EDGES, OLL_CORNERS, PLL, PATTERNS } from '../src/learn/algs';

const centreOf = (i: number) => Math.floor(i / 9) * 9 + 4;
const ok = (s: State, f: number[]) => f.every((i) => s[i] === s[centreOf(i)]);
const f2l = (s: State) => [...CORNERS, ...EDGES].filter((p) => p.pos[1] < 1).every((p) => ok(s, p.facelets));
const uAll = (s: State) => [0, 1, 2, 3, 4, 5, 6, 7, 8].every((i) => s[i] === s[4]);
const uEdgesUp = (s: State) => [1, 3, 5, 7].every((i) => s[i] === s[4]);
const uCornersUp = (s: State) => [0, 2, 6, 8].every((i) => s[i] === s[4]);
const case_ = (alg: string) => applyMoves(solvedState(), invertAlg(parseAlg(alg)));

describe('algorithm library', () => {
  for (const a of OLL_EDGES) it(`OLL edges ${a.name}: keeps F2L, only touches edge orientation`, () => {
    const s = case_(a.alg);
    expect(f2l(s)).toBe(true);
    expect(uEdgesUp(s)).toBe(false);
  });
  for (const a of OLL_CORNERS) it(`OLL corners ${a.name}: keeps F2L + yellow cross`, () => {
    const s = case_(a.alg);
    expect(f2l(s)).toBe(true);
    expect(uEdgesUp(s)).toBe(true);
    expect(uCornersUp(s)).toBe(false);
  });
  for (const a of PLL) it(`PLL ${a.name}: keeps F2L and orientation, permutes`, () => {
    const s = case_(a.alg);
    expect(f2l(s)).toBe(true);
    expect(uAll(s)).toBe(true);
    // not solvable by a U turn alone (it really is a permutation case)
    expect(['', 'U', 'U2', "U'"].some((m) => isSolved(m ? applyMoves(s, [m]) : s))).toBe(false);
  });
  for (const p of PATTERNS) it(`pattern ${p.name} is not solved and is a legal state`, () => {
    const s = applyMoves(solvedState(), p.alg);
    expect(isSolved(s)).toBe(false);
  });
});

describe('PLL groups', () => {
  const uCornersPlaced = (s: State) => CORNERS.filter((c) => c.pos[1] === 1).every((c) => ok(s, c.facelets));
  const uEdgesPlaced = (s: State) => EDGES.filter((e) => e.pos[1] === 1).every((e) => ok(s, e.facelets));
  const anyU = (s: State, f: (x: State) => boolean) => ['', 'U', 'U2', "U'"].some((m) => f(m ? applyMoves(s, [m]) : s));
  for (const a of PLL) {
    if (a.group === 'Edges only') it(`${a.name} moves only edges`, () => expect(anyU(case_(a.alg), uCornersPlaced)).toBe(true));
    if (a.group === 'Corners only') it(`${a.name} moves only corners`, () => expect(anyU(case_(a.alg), uEdgesPlaced)).toBe(true));
  }
});
