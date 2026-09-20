import Phaser from 'phaser';
import { GAME_WIDTH, SCENE_HEIGHT } from '../config';
import { SPEECH_FONT } from '../ui/text';
import { playVoice, type Voice } from './Sfx';

export interface SayOptions {
  duration?: number;
  fill?: number;
  /** Whose voice chatters while the bubble is up. */
  voice?: Voice;
}

/** Comic-style speech bubbles anchored above a point. Only one bubble is shown at a time. */
export class Dialogue {
  private container?: Phaser.GameObjects.Container;
  private timer?: Phaser.Time.TimerEvent;
  private resolver?: () => void;

  constructor(private scene: Phaser.Scene) {}

  say(text: string, x: number, y: number, opts: SayOptions = {}): Promise<void> {
    this.clear();
    const t = this.scene.add.text(0, 0, text, SPEECH_FONT);
    const w = Math.ceil(t.width) + 24;
    const h = Math.ceil(t.height) + 18;
    const cx = Phaser.Math.Clamp(x, w / 2 + 6, GAME_WIDTH - w / 2 - 6);
    const cy = Math.max(y, h + 24);

    const g = this.scene.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-w / 2 + 3, -h - 14 + 3, w, h, 4);
    g.fillStyle(opts.fill ?? 0xffffff, 1);
    g.fillRoundedRect(-w / 2, -h - 14, w, h, 4);
    g.lineStyle(2, 0x000000, 1);
    g.strokeRoundedRect(-w / 2, -h - 14, w, h, 4);
    // tail
    const tailX = Phaser.Math.Clamp(x - cx, -w / 2 + 12, w / 2 - 12);
    g.fillStyle(opts.fill ?? 0xffffff, 1);
    g.fillTriangle(tailX - 6, -14, tailX + 6, -14, tailX, -2);
    g.lineStyle(2, 0x000000, 1);
    g.beginPath();
    g.moveTo(tailX - 6, -14);
    g.lineTo(tailX, -2);
    g.lineTo(tailX + 6, -14);
    g.strokePath();

    t.setPosition(-w / 2 + 12, -h - 14 + 9);
    this.container = this.scene.add.container(cx, cy, [g, t]).setDepth(1000);
    if (opts.voice) playVoice(opts.voice, text.split(/\s+/).filter(Boolean).length);

    const duration = opts.duration ?? Math.max(1400, 55 * text.length);
    return new Promise((resolve) => {
      this.resolver = resolve;
      this.timer = this.scene.time.delayedCall(duration, () => this.clear());
    });
  }

  /**
   * A line from someone who is not on screen (Theo during the race or the memory boxes): the
   * bubble sits centred just above the backpack bar, its tail pointing down at it.
   */
  sayOffscreen(text: string, opts: SayOptions = {}): Promise<void> {
    return this.say(text, GAME_WIDTH / 2, SCENE_HEIGHT + 2, opts);
  }

  clear(): void {
    this.timer?.remove(false);
    this.timer = undefined;
    this.container?.destroy();
    this.container = undefined;
    const r = this.resolver;
    this.resolver = undefined;
    r?.();
  }
}
