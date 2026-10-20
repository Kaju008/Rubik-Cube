// Speedcubing stats: WCA-style trimmed averages, PBs, levels and daily streak.
export type Penalty = 0 | 2 | 'dnf';
export interface Solve { id: string; ms: number; penalty: Penalty; scramble: string; at: number }

export const eff = (s: Solve) => (s.penalty === 'dnf' ? Infinity : s.ms + (s.penalty === 2 ? 2000 : 0));

/** Average of the last n solves ending at index `end` (exclusive). Trims best & worst 5% (1 each for ao5/ao12). */
export function avgOf(solves: Solve[], n: number, end = solves.length): number | null {
  if (end < n) return null;
  const times = solves.slice(end - n, end).map(eff).sort((a, b) => a - b);
  const trim = Math.max(1, Math.ceil(n * 0.05));
  const mid = times.slice(trim, n - trim);
  if (mid.some((t) => !isFinite(t))) return Infinity;
  return mid.reduce((a, b) => a + b, 0) / mid.length;
}

export function bestAvg(solves: Solve[], n: number): number | null {
  let best: number | null = null;
  for (let e = n; e <= solves.length; e++) {
    const a = avgOf(solves, n, e)!;
    if (best === null || a < best) best = a;
  }
  return best;
}

export function bestSingle(solves: Solve[]): number | null {
  const t = solves.map(eff).filter(isFinite);
  return t.length ? Math.min(...t) : null;
}

export function mean(solves: Solve[]): number | null {
  const t = solves.map(eff).filter(isFinite);
  return t.length ? t.reduce((a, b) => a + b, 0) / t.length : null;
}

export function fmt(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '–';
  if (!isFinite(ms)) return 'DNF';
  const cs = Math.floor(ms / 10);
  const s = Math.floor(cs / 100), m = Math.floor(s / 60);
  const hund = String(cs % 100).padStart(2, '0');
  return m ? `${m}:${String(s % 60).padStart(2, '0')}.${hund}` : `${s}.${hund}`;
}

export function streakDays(solves: Solve[], now = Date.now()): number {
  const days = new Set(solves.map((s) => new Date(s.at).toDateString()));
  let n = 0;
  const d = new Date(now);
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1); // today not done yet: count up to yesterday
  while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export interface Level { name: string; ms: number; tip: string; learn?: string }
export const LEVELS: Level[] = [
  { name: 'Starter', ms: Infinity, tip: 'Finish any timed solve to get on the board.', learn: 'cross' },
  { name: 'Sub-3:00', ms: 180000, tip: 'Know all 7 beginner stages without looking anything up.', learn: 'twist' },
  { name: 'Sub-2:00', ms: 120000, tip: 'Build the cross straight on the bottom. Stop flipping the cube.', learn: 'cross' },
  { name: 'Sub-1:30', ms: 90000, tip: 'Learn 2-look OLL: 10 algorithms, a huge time saver.', learn: 'oll2' },
  { name: 'Sub-1:00', ms: 60000, tip: 'Learn 2-look PLL and use finger tricks instead of wrist turns.', learn: 'pll2' },
  { name: 'Sub-45', ms: 45000, tip: 'Start F2L: pair corners and edges instead of solving layer by layer.', learn: 'f2l' },
  { name: 'Sub-30', ms: 30000, tip: 'Learn full PLL and practise lookahead. Slow down to speed up.', learn: 'pllfull' },
  { name: 'Sub-20', ms: 20000, tip: 'Plan the whole cross in inspection. Learn full OLL.', learn: 'faster' },
  { name: 'Sub-15', ms: 15000, tip: 'You are elite. Efficient F2L and zero pauses.', learn: 'faster' },
];

/** Level reached = the fastest target your record beats. Record = best ao5, or best single before 5 solves. */
export function levelFor(solves: Solve[]) {
  const record = solves.length >= 5 ? bestAvg(solves, 5) : bestSingle(solves);
  let idx = -1;
  if (record !== null && isFinite(record)) LEVELS.forEach((l, i) => { if (record < l.ms) idx = i; });
  if (solves.length && idx < 0) idx = 0;
  const cur = idx >= 0 ? LEVELS[idx] : null;
  const next = LEVELS[idx + 1] ?? null;
  return { record, cur, next, idx };
}

const KEY = 'cubr.speed.v1';
export function loadSolves(): Solve[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function saveSolves(s: Solve[]) { try { localStorage.setItem(KEY, JSON.stringify(s.slice(-1000))); } catch { /* private mode */ } }
