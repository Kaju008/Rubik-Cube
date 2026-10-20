import { describe, it, expect } from 'vitest';
import { applyMoves, solvedState, isSolved, MOVE_PERMS, randomScramble, invertAlg, toFaceletString, compose } from '../src/cube/model';
import { validate } from '../src/cube/pieces';
import Cube from '../src/vendor/kociemba.js';

describe('model', () => {
  it('quarter turns have order 4', () => {
    for (const m of ['U','R','F','D','L','B','x','y','z','M','E','S']) {
      let s = solvedState();
      for (let i = 0; i < 4; i++) s = applyMoves(s, [m]);
      expect(isSolved(s)).toBe(true);
      expect(isSolved(applyMoves(solvedState(), [m]))).toBe(m === 'x' || m === 'y' || m === 'z');
    }
  });
  it('sexy move has order 6', () => {
    let s = solvedState();
    for (let i = 0; i < 6; i++) s = applyMoves(s, "R U R' U'");
    expect(isSolved(s)).toBe(true);
  });
  it('matches cubejs facelets for random scrambles', () => {
    for (let k = 0; k < 50; k++) {
      const scr = randomScramble();
      const ours = toFaceletString(applyMoves(solvedState(), scr));
      const c = new Cube(); c.move(scr.join(' '));
      expect(ours).toBe(c.asString());
      expect(validate(applyMoves(solvedState(), scr)).ok).toBe(true);
      expect(isSolved(applyMoves(applyMoves(solvedState(), scr), invertAlg(scr)))).toBe(true);
    }
  });
  it('detects twisted corner and flipped edge', () => {
    const s = solvedState();
    const t = s.slice(); [t[8], t[9], t[20]] = [s[9], s[20], s[8]]; // twist URF
    expect(validate(t).ok).toBe(false);
    const e = s.slice(); [e[7], e[19]] = [s[19], s[7]];
    expect(validate(e).ok).toBe(false);
  });
});

describe('wide and slice moves', () => {
  it('r = R M\', f = F S, u = U E\'', () => {
    const s = applyMoves(solvedState(), "R U F'");
    expect(Array.from(applyMoves(s, ['r']))).toEqual(Array.from(applyMoves(s, ['R', "M'"])));
    expect(Array.from(applyMoves(s, ['f']))).toEqual(Array.from(applyMoves(s, ['F', 'S'])));
    expect(Array.from(applyMoves(s, ['u']))).toEqual(Array.from(applyMoves(s, ['U', "E'"])));
    expect(Array.from(applyMoves(s, ['l']))).toEqual(Array.from(applyMoves(s, ['L', 'M'])));
    expect(Array.from(applyMoves(s, ['d']))).toEqual(Array.from(applyMoves(s, ['D', 'E'])));
    expect(Array.from(applyMoves(s, ['b']))).toEqual(Array.from(applyMoves(s, ['B', "S'"])));
    // r = L x (whole-cube equivalence)
    expect(Array.from(applyMoves(s, ['r']))).toEqual(Array.from(applyMoves(s, ['L', 'x'])));
  });
});
