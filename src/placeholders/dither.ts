/** 4x4 Bayer matrix, values 0..15. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * Renders `draw` once, then produces `levels + 1` canvases where pixels are revealed
 * in Bayer-ordered-dither steps (level 0 = nothing, level `levels` = everything).
 * Stepping through these gives the classic 90s dithered fade.
 */
export function ditherFrames(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, levels = 8): HTMLCanvasElement[] {
  const src = document.createElement('canvas');
  src.width = width;
  src.height = height;
  const sctx = src.getContext('2d')!;
  sctx.imageSmoothingEnabled = false;
  draw(sctx);
  const data = sctx.getImageData(0, 0, width, height);

  const frames: HTMLCanvasElement[] = [];
  for (let level = 0; level <= levels; level++) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const cctx = c.getContext('2d')!;
    const out = cctx.createImageData(width, height);
    const threshold = (level / levels) * 16;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (data.data[i + 3] > 0 && BAYER[y & 3][x & 3] < threshold) {
          out.data[i] = data.data[i];
          out.data[i + 1] = data.data[i + 1];
          out.data[i + 2] = data.data[i + 2];
          out.data[i + 3] = data.data[i + 3];
        }
      }
    }
    cctx.putImageData(out, 0, 0);
    frames.push(c);
  }
  return frames;
}
