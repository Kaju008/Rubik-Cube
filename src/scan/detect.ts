// "Is there really a cube face in the box?" A cube face has dark plastic gaps between
// the stickers, and/or several clearly different sticker colours. Walls, faces and
// tables have neither, so they no longer get captured.
import type { CellSample } from './color';
import { guessColor } from './color';

export interface FaceCheck { present: boolean; gap: number; distinct: number; solid: number }

const lum = (d: Uint8ClampedArray, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

/** Fraction of points on the four inner grid lines that are darker than the stickers beside them. */
export function gapScore(img: { width: number; height: number; data: Uint8ClampedArray }, size: number): number {
  const { width: W, data } = img;
  const at = (x: number, y: number) => {
    const xi = Math.max(0, Math.min(W - 1, Math.round(x))), yi = Math.max(0, Math.min(img.height - 1, Math.round(y)));
    return lum(data, (yi * W + xi) * 4);
  };
  const band = size * 0.07, cell = size / 3;
  let dark = 0, total = 0;
  for (const line of [1, 2]) {
    for (const vertical of [true, false]) {
      for (let k = 0; k < 14; k++) {
        const along = size * (0.08 + (0.84 * k) / 13);
        const across = line * cell;
        let minY = 255;
        for (let o = -band; o <= band; o += 1.5) minY = Math.min(minY, vertical ? at(across + o, along) : at(along, across + o));
        const side = (o: number) => (vertical ? at(across + o, along) : at(along, across + o));
        const nb = Math.min(side(-cell * 0.42), side(cell * 0.42));
        total++;
        if (minY < 110 && minY < nb * 0.62) dark++;
      }
    }
  }
  return dark / total;
}

export function checkFace(img: { width: number; height: number; data: Uint8ClampedArray }, size: number, cells: CellSample[]): FaceCheck {
  const guesses = cells.map((c) => guessColor(c.rgb));
  const solid = cells.filter((c, q) => c.spread < 36 && guesses[q]).length;
  const distinct = new Set(guesses.filter(Boolean)).size;
  const gap = gapScore(img, size);
  const present = solid >= 7 && (gap >= 0.55 || (distinct >= 3 && solid === 9 && gap >= 0.25));
  return { present, gap, distinct, solid };
}
