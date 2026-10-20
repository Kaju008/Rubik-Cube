import { describe, it, expect } from 'vitest';
import { checkFace } from '../src/scan/detect';
import { sampleGrid } from '../src/scan/color';

const N = 192;
function img(paint: (x: number, y: number) => [number, number, number]) {
  const data = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const [r, g, b] = paint(x, y); const i = (y * N + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255; }
  return { width: N, height: N, data } as unknown as ImageData;
}
const COLS: [number, number, number][] = [[220, 30, 40], [30, 190, 90], [250, 210, 40], [240, 240, 235], [30, 90, 230], [250, 130, 20]];
function cubeFace(seed: number, scale = 1, shift = 0) {
  return img((x, y) => {
    const u = (x - N / 2 - shift) / scale + N / 2, v = (y - N / 2) / scale + N / 2;
    if (u < 0 || v < 0 || u >= N || v >= N) return [140, 120, 100];
    const c = N / 3, gx = u % c, gy = v % c;
    if (gx < 8 || gx > c - 8 || gy < 8 || gy > c - 8) return [15, 15, 18];
    return COLS[(Math.floor(u / c) * 3 + Math.floor(v / c) + seed) % 6];
  });
}
const run = (im: ImageData) => checkFace(im, N, sampleGrid(im, N));

describe('cube detection', () => {
  it('finds a real cube face, mixed or solved', () => {
    expect(run(cubeFace(0)).present).toBe(true);
    expect(run(cubeFace(3)).present).toBe(true);
    expect(run(img((x, y) => { const c = N / 3; return x % c < 8 || y % c < 8 || x % c > c - 8 || y % c > c - 8 ? [12, 12, 12] : [230, 30, 40]; })).present).toBe(true);
  });
  it('tolerates a slightly bigger cube or slightly off-centre', () => {
    expect(run(cubeFace(1, 1.08)).present).toBe(true);
    expect(run(cubeFace(2, 1, 6)).present).toBe(true);
  });
  it('ignores walls, tables and noise', () => {
    expect(run(img(() => [235, 228, 210])).present).toBe(false);                      // plain wall
    expect(run(img((x) => [180 + (x % 40), 150, 110])).present).toBe(false);          // wood table
    expect(run(img((x, y) => [y < 96 ? 240 : 200, 200, x < 96 ? 60 : 190])).present).toBe(false); // big colour blocks
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    expect(run(img(() => [rnd() * 255, rnd() * 255, rnd() * 255])).present).toBe(false); // noise
  });
});
