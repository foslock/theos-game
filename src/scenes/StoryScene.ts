import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { ditherFrames } from '../placeholders/dither';

const LINES = ['One Saturday...', '...at the Lockwoods'];
const LEVELS = 10;
const STEP_MS = 70;
const HOLD_MS = 1500;
const GAP_MS = 600;

/**
 * Opening title cards for a new game: each line dither-fades in, holds, and dither-fades
 * out, then the game starts with the wake-up-in-bed intro. A click skips ahead.
 */
export class StoryScene extends Phaser.Scene {
  private skipped = false;

  constructor() {
    super('Story');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#000000');
    this.skipped = false;
    this.input.once('pointerdown', () => {
      this.skipped = true;
      this.begin();
    });
    void this.play();
  }

  private async play(): Promise<void> {
    await this.wait(500);
    for (let i = 0; i < LINES.length && !this.skipped; i++) {
      await this.showLine(LINES[i], i);
      if (!this.skipped) await this.wait(GAP_MS);
    }
    if (!this.skipped) this.begin();
  }

  private begin(): void {
    this.scene.start('Game', { wakeUp: true });
  }

  private async showLine(text: string, index: number): Promise<void> {
    const w = 560;
    const h = 60;
    const frames = ditherFrames(
      w,
      h,
      (ctx) => {
        ctx.font = '24px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#3a1d00';
        ctx.strokeText(text, w / 2, h / 2);
        ctx.fillStyle = '#fff3b0';
        ctx.fillText(text, w / 2, h / 2);
      },
      LEVELS,
    );
    const keys = frames.map((c, i) => {
      const key = `story_${index}_${i}`;
      if (this.textures.exists(key)) this.textures.remove(key);
      this.textures.addCanvas(key, c);
      return key;
    });
    const img = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, keys[0]);
    for (let level = 1; level <= LEVELS && !this.skipped; level++) {
      img.setTexture(keys[level]);
      await this.wait(STEP_MS);
    }
    if (!this.skipped) await this.wait(HOLD_MS);
    for (let level = LEVELS - 1; level >= 0 && !this.skipped; level--) {
      img.setTexture(keys[level]);
      await this.wait(STEP_MS);
    }
    img.destroy();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
