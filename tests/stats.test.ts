import { describe, it, expect } from 'vitest';
import { avgOf, bestAvg, bestSingle, fmt, levelFor, streakDays, Solve } from '../src/speed/stats';
const mk = (ms: number, penalty: Solve['penalty'] = 0, at = Date.now()): Solve => ({ id: String(Math.random()), ms, penalty, scramble: '', at });

describe('stats', () => {
  it('ao5 trims best and worst', () => {
    const s = [10, 20, 30, 40, 1000].map((x) => mk(x * 1000));
    expect(avgOf(s, 5)).toBe(30000);
  });
  it('one DNF is trimmed, two DNFs make DNF', () => {
    expect(avgOf([mk(10000), mk(20000), mk(30000), mk(40000), mk(1, 'dnf')], 5)).toBe(30000);
    expect(avgOf([mk(10000), mk(20000), mk(30000), mk(1, 'dnf'), mk(1, 'dnf')], 5)).toBe(Infinity);
  });
  it('+2 counts', () => expect(bestSingle([mk(10000, 2)])).toBe(12000));
  it('best rolling ao5', () => {
    const s = [60, 50, 40, 30, 20, 90, 90].map((x) => mk(x * 1000));
    expect(bestAvg(s, 5)).toBe(40000);
  });
  it('formats', () => { expect(fmt(9876)).toBe('9.87'); expect(fmt(83456)).toBe('1:23.45'); expect(fmt(Infinity)).toBe('DNF'); });
  it('levels', () => {
    expect(levelFor([]).cur).toBe(null);
    expect(levelFor([mk(200000)]).cur!.name).toBe('Starter');
    expect(levelFor([mk(50000)]).cur!.name).toBe('Sub-1:00');
  });
  it('streak', () => {
    const day = 86400000, now = Date.now();
    expect(streakDays([mk(1, 0, now), mk(1, 0, now - day), mk(1, 0, now - 3 * day)], now)).toBe(2);
  });
});
