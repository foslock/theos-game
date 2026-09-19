import type Phaser from 'phaser';
import type { Rect, Room } from '../data/rooms';
import { AMBIENT_FRAME_MS } from '../config';

/** Draws the room background and slowly cycles its ambient frames. */
export class AmbientBackground {
  readonly image: Phaser.GameObjects.Image;
  private frame = 0;
  private timer?: Phaser.Time.TimerEvent;
  /** Patches of the background drawn again on top of things, so they can hide behind furniture. */
  private covers: { image: Phaser.GameObjects.Image; rect: Rect }[] = [];

  constructor(private scene: Phaser.Scene, private room: Room) {
    this.image = scene.add.image(0, 0, this.key(0)).setOrigin(0).setDepth(0);
    if (room.ambientFrames > 1) {
      this.timer = scene.time.addEvent({
        delay: AMBIENT_FRAME_MS,
        loop: true,
        callback: () => {
          this.frame = (this.frame + 1) % this.room.ambientFrames;
          const key = this.key(this.frame);
          this.image.setTexture(key);
          for (const c of this.covers) c.image.setTexture(key).setCrop(c.rect.x, c.rect.y, c.rect.w, c.rect.h);
        },
      });
    }
  }

  /**
   * Redraws one rectangle of the background at `depth`, so anything drawn below that depth is
   * hidden where the rectangle is. The patch follows the ambient frames like the rest of the room.
   */
  cover(rect: Rect, depth: number): Phaser.GameObjects.Image {
    const image = this.scene.add.image(0, 0, this.key(this.frame)).setOrigin(0).setDepth(depth).setCrop(rect.x, rect.y, rect.w, rect.h);
    this.covers.push({ image, rect });
    return image;
  }

  private key(frame: number): string {
    const k = `${this.room.background}_${frame}`;
    return this.scene.textures.exists(k) ? k : `${this.room.background}_0`;
  }

  destroy(): void {
    this.timer?.remove();
    this.image.destroy();
    for (const c of this.covers) c.image.destroy();
    this.covers = [];
  }
}
