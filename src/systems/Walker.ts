import Phaser from 'phaser';
import { WALK_SPEED } from '../config';
import type { Pt } from '../data/rooms';
import { CHAR_IDLE_FRAMES, CHAR_WALK_FRAMES, type CharacterKey } from '../placeholders/textures';
import { playSfx } from './Sfx';

/** Registers idle/walk animations for both characters. Safe to call more than once. */
export function createCharacterAnimations(scene: Phaser.Scene): void {
  for (const key of ['theo', 'lucy'] as CharacterKey[]) {
    if (!scene.anims.exists(`${key}_idle`)) {
      scene.anims.create({
        key: `${key}_idle`,
        frames: CHAR_IDLE_FRAMES.map((frame) => ({ key, frame })),
        frameRate: 1.5,
        repeat: -1,
      });
    }
    // Lucy has an extra two-frame clap on its own sheet; Theo has no equivalent.
    if (key === 'lucy' && scene.textures.exists('lucy_clap') && !scene.anims.exists('lucy_clap')) {
      scene.anims.create({
        key: 'lucy_clap',
        frames: [0, 1, 0, 1, 0, 1].map((frame) => ({ key: 'lucy_clap', frame })),
        frameRate: 7,
        repeat: 0,
      });
    }
    if (!scene.anims.exists(`${key}_walk`)) {
      scene.anims.create({
        key: `${key}_walk`,
        frames: CHAR_WALK_FRAMES.map((frame) => ({ key, frame })),
        frameRate: 8,
        repeat: -1,
      });
    }
  }
}

/** A walking character. Position is the feet (origin 0.5, 1); depth follows y so lower is drawn in front. */
export class Character {
  readonly sprite: Phaser.GameObjects.Sprite;
  private tween?: Phaser.Tweens.Tween;
  private stepTimer?: Phaser.Time.TimerEvent;
  private resolveWalk?: () => void;

  constructor(private scene: Phaser.Scene, readonly key: CharacterKey, x: number, y: number) {
    this.sprite = scene.add.sprite(x, y, key, 0).setOrigin(0.5, 1);
    this.setPosition(x, y);
    this.idle();
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(Math.round(x), Math.round(y));
    this.sprite.setDepth(y);
  }

  /** Turns a walking sprite left or right. Idle frames face the player, so this is ignored while idle. */
  face(dx: number): void {
    if (dx !== 0 && this.sprite.anims.currentAnim?.key === `${this.key}_walk`) this.sprite.setFlipX(dx < 0);
  }

  /** Idle frames face the player, so any left-facing flip from walking is cleared. */
  idle(): void {
    this.sprite.setFlipX(false);
    this.sprite.play(`${this.key}_idle`, true);
  }

  /**
   * A few excited claps, then back to idle. Ignored while walking, so it never fights the walk
   * cycle, and it resolves as soon as the animation ends.
   */
  celebrate(): void {
    if (this.tween || !this.scene.anims.exists(`${this.key}_clap`)) return;
    this.sprite.setFlipX(false);
    this.sprite.play(`${this.key}_clap`, true);
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.idle());
  }

  /** Walks in a straight line. Prefer `walkPath` with a route from `findPath` so feet stay on the floor. */
  walkTo(x: number, y: number, withSteps = true): Promise<void> {
    return this.walkPath([{ x, y }], withSteps);
  }

  /** Walks through each waypoint in turn, facing along every segment. Resolves when the last one is reached. */
  walkPath(path: Pt[], withSteps = true, speed = WALK_SPEED): Promise<void> {
    this.stop();
    const points = path.filter((p, i) => {
      const prev = i === 0 ? { x: this.sprite.x, y: this.sprite.y } : path[i - 1];
      return Math.hypot(p.x - prev.x, p.y - prev.y) >= 2;
    });
    if (!points.length) {
      const last = path[path.length - 1];
      if (last) this.setPosition(last.x, last.y);
      this.idle();
      return Promise.resolve();
    }
    this.sprite.play(`${this.key}_walk`, true);
    this.sprite.anims.timeScale = speed / WALK_SPEED;
    if (withSteps) {
      this.stepTimer = this.scene.time.addEvent({ delay: Math.round(260 * (WALK_SPEED / speed)), loop: true, callback: () => playSfx('step') });
    }
    return new Promise((resolve) => {
      this.resolveWalk = resolve;
      const finish = () => {
        this.tween = undefined;
        this.stepTimer?.remove(false);
        this.stepTimer = undefined;
        const last = points[points.length - 1];
        this.setPosition(last.x, last.y);
        this.sprite.anims.timeScale = 1;
        this.idle();
        const r = this.resolveWalk;
        this.resolveWalk = undefined;
        r?.();
      };
      const segment = (i: number) => {
        if (i >= points.length) return finish();
        const p = points[i];
        const dx = p.x - this.sprite.x;
        const dist = Math.hypot(dx, p.y - this.sprite.y);
        this.face(dx);
        this.tween = this.scene.tweens.add({
          targets: this.sprite,
          x: p.x,
          y: p.y,
          duration: (dist / speed) * 1000,
          onUpdate: () => this.sprite.setDepth(this.sprite.y),
          onComplete: () => segment(i + 1),
        });
      };
      segment(0);
    });
  }

  stop(): void {
    this.tween?.stop();
    this.tween = undefined;
    this.stepTimer?.remove(false);
    this.stepTimer = undefined;
    const r = this.resolveWalk;
    this.resolveWalk = undefined;
    r?.();
  }

  destroy(): void {
    this.stop();
    this.sprite.destroy();
  }
}
