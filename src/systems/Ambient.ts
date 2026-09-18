import type Phaser from 'phaser';
import type { Room } from '../data/rooms';
import { AMBIENT_FRAME_MS } from '../config';

/** Draws the room background and slowly cycles its ambient frames. */
export class AmbientBackground {
  readonly image: Phaser.GameObjects.Image;
  private frame = 0;
  private timer?: Phaser.Time.TimerEvent;

  constructor(private scene: Phaser.Scene, private room: Room) {
    this.image = scene.add.image(0, 0, this.key(0)).setOrigin(0).setDepth(0);
    if (room.ambientFrames > 1) {
      this.timer = scene.time.addEvent({
        delay: AMBIENT_FRAME_MS,
        loop: true,
        callback: () => {
          this.frame = (this.frame + 1) % this.room.ambientFrames;
          this.image.setTexture(this.key(this.frame));
        },
      });
    }
  }

  private key(frame: number): string {
    const k = `${this.room.background}_${frame}`;
    return this.scene.textures.exists(k) ? k : `${this.room.background}_0`;
  }

  destroy(): void {
    this.timer?.remove();
    this.image.destroy();
  }
}
