// Read the 3×3 sticker grid that sits on top of a <video> (object-fit: cover) straight from the camera frame.
import { CellSample, sampleGrid } from './color';

export function sampleUnderGrid(
  v: HTMLVideoElement, box: DOMRect, grid: DOMRect, mirrored: boolean, ctx: CanvasRenderingContext2D, N = 192,
): CellSample[] | null {
  if (v.readyState < 2 || !v.videoWidth) return null;
  const vw = v.videoWidth, vh = v.videoHeight;
  const scale = Math.max(box.width / vw, box.height / vh);
  const ox = (box.width - vw * scale) / 2, oy = (box.height - vh * scale) / 2;
  let gx = (grid.left + grid.width / 2 - box.left - ox) / scale;
  const gy = (grid.top + grid.height / 2 - box.top - oy) / scale;
  if (mirrored) gx = vw - gx;
  const gs = grid.width / scale;
  ctx.canvas.width = N; ctx.canvas.height = N;
  ctx.drawImage(v, gx - gs / 2, gy - gs / 2, gs, gs, 0, 0, N, N);
  return sampleGrid(ctx.getImageData(0, 0, N, N), N);
}
