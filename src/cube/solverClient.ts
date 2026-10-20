import type { Solution } from './beginner';
import type { State } from './model';

export interface Solutions { beginner: Solution | null; fast: Solution | null; error: string | null }

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<number, (s: Solutions) => void>();

/** Start the solver in the background as soon as the app loads. */
export function warmUpSolver(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = new Promise((resolve) => {
    try {
      worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (ev) => {
        const d = ev.data;
        if (d.type === 'ready' || d.type === 'error') resolve();
        if (d.type === 'solution') {
          pending.get(d.id)?.(d as Solutions);
          pending.delete(d.id);
        }
      };
      worker.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  return readyPromise;
}

export async function solve(state: State): Promise<Solutions> {
  await warmUpSolver();
  if (!worker) {
    const { solveBeginner } = await import('./beginner');
    try { return { beginner: solveBeginner(state), fast: null, error: null }; }
    catch (e) { return { beginner: null, fast: null, error: String(e) }; }
  }
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker!.postMessage({ id, state: Array.from(state) });
  });
}
