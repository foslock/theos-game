import type Phaser from 'phaser';
import { ditherFrames } from '../placeholders/dither';

let nextId = 0;

/**
 * Draws `draw` into a canvas and reveals it at (x, y) with a Bayer-dither fade, the way
 * 90s adventure games faded UI in. Resolves with the finished image; destroy it yourself
 * (or swap it for a live object) when done. Uses `levels + 1` textures, cleaned up on resolve.
 */
export function ditherIn(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  opts: { levels?: number; stepMs?: number; depth?: number; delayMs?: number } = {},
): Promise<Phaser.GameObjects.Image> {
  const levels = opts.levels ?? 8;
  const stepMs = opts.stepMs ?? 60;
  const frames = ditherFrames(width, height, draw, levels);
  const id = nextId++;
  const keys = frames.map((c, i) => {
    const key = `dither_${id}_${i}`;
    scene.textures.addCanvas(key, c);
    return key;
  });
  const img = scene.add.image(x, y, keys[0]).setDepth(opts.depth ?? 0);
  return new Promise((resolve) => {
    let level = 0;
    const step = () => {
      level++;
      if (!img.scene) return; // scene shut down mid-fade
      img.setTexture(keys[Math.min(level, levels)]);
      if (level < levels) scene.time.delayedCall(stepMs, step);
      else {
        // Keep the final texture; drop the intermediate ones.
        for (let i = 0; i < levels; i++) scene.textures.remove(keys[i]);
        resolve(img);
      }
    };
    scene.time.delayedCall(opts.delayMs ?? 0, step);
  });
}

/** Draws the same chunky button look as `makeButton`, for dither-revealing before the live button appears. */
export function drawButtonFace(ctx: CanvasRenderingContext2D, w: number, h: number, label: string, fontSize = 14): void {
  const ox = 2;
  const oy = 2;
  ctx.fillStyle = '#000';
  ctx.fillRect(ox + 2, oy + 2, w, h);
  ctx.fillStyle = '#d9973b';
  ctx.fillRect(ox, oy, w, h);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.strokeRect(ox + 1, oy + 1, w - 2, h - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(ox + 2, oy + 2, w - 4, 3);
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1a0d00';
  ctx.fillText(label, ox + w / 2, oy + h / 2 + 1);
}
