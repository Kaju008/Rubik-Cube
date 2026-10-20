// Colour maths for reading stickers from camera frames.
export type RGB = [number, number, number];
export type Lab = [number, number, number];
export type ColorName = 'white' | 'yellow' | 'red' | 'orange' | 'green' | 'blue';
export const COLOR_NAMES: ColorName[] = ['white', 'yellow', 'red', 'orange', 'green', 'blue'];

/** Midnight Toybox display palette for stickers. */
export const PALETTE: Record<ColorName, string> = {
  white: '#F4F1EA',
  yellow: '#FFD93B',
  red: '#FF3B4E',
  orange: '#FF8A1F',
  green: '#22D17A',
  blue: '#2F7BFF',
};

/** Typical camera Lab values used to name centre colours (refined by the real centres on each scan). */
const REF_LAB: Record<ColorName, Lab> = {
  white: [88, 0, 4],
  yellow: [84, -4, 72],
  red: [48, 62, 38],
  orange: [64, 42, 66],
  green: [62, -55, 35],
  blue: [44, 8, -52],
};

export function rgbToLab([r, g, b]: RGB): Lab {
  const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function rgbToHsv([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

/** Lab distance that cares less about brightness (lighting changes between faces). */
export function labDist(a: Lab, b: Lab): number {
  const dL = (a[0] - b[0]) * 0.45;
  return Math.sqrt(dL * dL + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/** Fast single-sticker guess for the live preview. */
export function guessColor(rgb: RGB): ColorName | null {
  const [h, s, v] = rgbToHsv(rgb);
  if (v < 0.16) return null;
  if (s < 0.24 && v > 0.42) return 'white';
  if (s < 0.3) return v > 0.6 ? 'white' : null;
  if (h < 13 || h >= 330) return 'red';
  if (h < 38) return 'orange';
  if (h < 72) return 'yellow';
  if (h < 170) return 'green';
  if (h < 265) return 'blue';
  return h < 300 ? 'blue' : 'red';
}

export function nearestName(lab: Lab): ColorName {
  let best: ColorName = 'white', bd = Infinity;
  for (const n of COLOR_NAMES) { const d = labDist(lab, REF_LAB[n]); if (d < bd) { bd = d; best = n; } }
  return best;
}

export const refLab = (n: ColorName) => REF_LAB[n];

export interface CellSample { rgb: RGB; lab: Lab; spread: number }

/**
 * Sample the 3×3 grid from raw (un-mirrored) image data.
 * The grid square is centred at (cx, cy) (default: frame centre) with side = size, in image pixels.
 */
export function sampleGrid(data: ImageData, size: number, cxIn?: number, cyIn?: number): CellSample[] {
  const { width: W, height: H } = data;
  const x0 = (cxIn ?? W / 2) - size / 2, y0 = (cyIn ?? H / 2) - size / 2, cell = size / 3;
  const out: CellSample[] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const cx = x0 + (c + 0.5) * cell, cy = y0 + (r + 0.5) * cell, half = cell * 0.2;
      const rs: number[] = [], gs: number[] = [], bs: number[] = [];
      const step = Math.max(1, Math.floor(half / 5));
      for (let y = Math.floor(cy - half); y <= cy + half; y += step)
        for (let x = Math.floor(cx - half); x <= cx + half; x += step) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const i = (y * W + x) * 4;
          rs.push(data.data[i]); gs.push(data.data[i + 1]); bs.push(data.data[i + 2]);
        }
      const med = (a: number[]) => { const s = [...a].sort((p, q) => p - q); return s[Math.floor(s.length / 2)] ?? 0; };
      const rgb: RGB = [med(rs), med(gs), med(bs)];
      const spread = (rs.reduce((m, x) => m + Math.abs(x - rgb[0]), 0) + gs.reduce((m, x) => m + Math.abs(x - rgb[1]), 0) + bs.reduce((m, x) => m + Math.abs(x - rgb[2]), 0)) / Math.max(1, rs.length * 3);
      out.push({ rgb, lab: rgbToLab(rgb), spread });
    }
  return out;
}

/** Standard colour scheme in Kociemba face order (U R F D L B) when held yellow-up, white-down, red-front. */
export const STANDARD_NAMES: ColorName[] = ['yellow', 'green', 'red', 'white', 'blue', 'orange'];
export const colorsFor = (names: ColorName[]) => names.map((n) => PALETTE[n]);
