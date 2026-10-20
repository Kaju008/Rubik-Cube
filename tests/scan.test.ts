import { describe, it, expect } from 'vitest';
import { applyMoves, solvedState, randomScramble } from '../src/cube/model';
import { fastValid, validate } from '../src/cube/pieces';
import { resolveScan, rotIndex, Capture } from '../src/scan/resolve';
import { refLab, ColorName, Lab } from '../src/scan/color';

const NAMES: ColorName[] = ['yellow', 'green', 'red', 'white', 'blue', 'orange'];
// approx sRGB for refs (only rgb used for the guess heuristic)
const RGB: Record<ColorName, [number, number, number]> = { white: [225, 225, 220], yellow: [235, 215, 40], red: [200, 30, 40], orange: [240, 120, 30], green: [30, 190, 90], blue: [30, 90, 210] };

function fakeCaptures(state: Uint8Array, rots: number[], order: number[], noise = 6): Capture[] {
  return order.map((face) => {
    const cells = new Array(9);
    for (let k = 0; k < 9; k++) {
      const name = NAMES[state[face * 9 + k]];
      const base = refLab(name);
      const lab = base.map((x) => x + (Math.random() - 0.5) * 2 * noise) as Lab;
      cells[rotIndex(k, rots[face])] = { lab, rgb: RGB[name], spread: 2 };
    }
    return { cells };
  });
}

describe('scan resolve', () => {
  it('fastValid agrees with validate', () => {
    for (let i = 0; i < 100; i++) {
      const s = applyMoves(solvedState(), randomScramble());
      expect(fastValid(s)).toBe(true);
      const t = s.slice(); const a = 1 + Math.floor(Math.random() * 8); const b = 46 - a; [t[a], t[b]] = [t[b], t[a]];
      expect(fastValid(t)).toBe(validate(t).ok);
    }
  });
  it('recovers state with rotated faces and shuffled order', () => {
    let ok = 0;
    for (let i = 0; i < 60; i++) {
      const s = applyMoves(solvedState(), randomScramble());
      const rots = [0, 0, 0, 0, 0, 0].map((_, f) => (f === 0 || f === 3 || i % 3 === 0 ? Math.floor(Math.random() * 4) : 0));
      const order = [2, 1, 5, 4, 0, 3].sort(() => Math.random() - 0.5);
      const res = resolveScan(fakeCaptures(s, rots, order));
      if (res.valid && Array.from(res.state).join() === Array.from(s).join()) ok++;
    }
    console.log('recovered', ok, '/ 60');
    expect(ok).toBeGreaterThanOrEqual(57);
  });
});
