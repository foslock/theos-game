import type Phaser from 'phaser';
import { ditherFrames } from '../placeholders/dither';

const LEVELS = 10;
const KEY = 'fade_dither';

/** Makes sure the black dither textures exist (one per level). Cheap to call repeatedly. */
function ensureTextures(scene: Phaser.Scene, width: number, height: number): void {
  if (scene.textures.exists(`${KEY}_${LEVELS}`)) return;
  const frames = ditherFrames(width, height, (ctx) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
  }, LEVELS);
  frames.forEach((c, i) => scene.textures.addCanvas(`${KEY}_${i}`, c));
}

/**
 * A full-scene fade to and from black that steps through a Bayer dither instead of blending,
 * the way 90s adventure games changed rooms. One instance per scene; it keeps a single image
 * on top of everything and hides it when fully clear.
 */
export class DitherFade {
  private image: Phaser.GameObjects.Image;
  private level = 0;
  private timer?: Phaser.Time.TimerEvent;

  constructor(private scene: Phaser.Scene, width: number, height: number, depth = 5000) {
    ensureTextures(scene, width, height);
    this.image = scene.add.image(0, 0, `${KEY}_0`).setOrigin(0).setDepth(depth).setVisible(false).setScrollFactor(0);
  }

  /** Jump straight to fully black (used before a fade-in on scene start). */
  setBlack(): void {
    this.set(LEVELS);
  }

  /** Fade to black over `ms`. */
  out(ms: number): Promise<void> {
    return this.run(LEVELS, ms);
  }

  /** Fade from black to clear over `ms`. */
  in(ms: number): Promise<void> {
    return this.run(0, ms);
  }

  private set(level: number): void {
    this.level = level;
    // A fade asked for after the scene shut down has nothing to draw on.
    if (!this.image.active) return;
    this.image.setTexture(`${KEY}_${level}`).setVisible(level > 0);
  }

  private run(target: number, ms: number): Promise<void> {
    this.timer?.remove(false);
    const steps = Math.abs(target - this.level);
    if (!steps || !this.image.active) return Promise.resolve();
    const stepMs = Math.max(16, ms / steps);
    const dir = Math.sign(target - this.level);
    return new Promise((resolve) => {
      this.timer = this.scene.time.addEvent({
        delay: stepMs,
        repeat: steps - 1,
        callback: () => {
          this.set(this.level + dir);
          if (this.level === target) resolve();
        },
      });
    });
  }

  destroy(): void {
    this.timer?.remove(false);
    this.image.destroy();
  }
}
