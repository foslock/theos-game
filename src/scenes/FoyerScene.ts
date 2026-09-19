import Phaser from 'phaser';
import { FADE_MS, GAME_HEIGHT, GAME_WIDTH, SCENE_HEIGHT, WALK_SPEED } from '../config';
import { FOYER } from '../data/foyer';
import type { Pt } from '../data/rooms/types';
import { Ambience } from '../systems/Ambience';
import { Dialogue } from '../systems/Dialogue';
import { DitherFade } from '../systems/DitherFade';
import { playMusic, stopMusic } from '../systems/Music';
import { playSfx } from '../systems/Sfx';
import { setCursor } from '../systems/Cursor';
import { ditherFrames } from '../placeholders/dither';

const PARENTS_LINE = "We've missed you, tell us all about your morning...";
const RUN_SPEED = WALK_SPEED * 1.7;
/** Lucy sets off this long after Theo. */
const LUCY_DELAY_MS = 220;
/** How long each kid's shout stays up. */
const CALL_MS = 900;
const HOPS = 3;
/** How high each hop goes. */
const HOP_HEIGHT = 16;
const HOP_MS = 360;
/** How long the family stands together after the parents speak before the day closes. */
const LINGER_MS = 900;
/** The whole screen, HUD included, dithers to black this slowly. */
const CLOSE_MS = 2600;
/** "The End": the steps of its dither in and out, how long it stays, and the pause before the menu. */
const END_LEVELS = 10;
const END_STEP_MS = 130;
const END_HOLD_MS = 3200;
const END_GAP_MS = 700;
const MENU_FADE_MS = 1400;

/**
 * Back-view sheets for the kids (`theo_back`, `lucy_back`): one row of frames, the standing
 * pose first, then the running cycle, then two moments of a jump. The jump itself is a tween:
 * PixelLab's jump template turned Theo round to face the camera on half its frames, so only
 * the two that keep his back turned are used, one on the way up and one at the top.
 */
const BACK = { stand: 0, runStart: 1, runEnd: 6, takeOff: 7, apex: 8 } as const;

/**
 * The ending. The party comes home to find Mom and Dad waiting in the front hall; the kids run
 * in and bounce with joy, the parents ask about the morning, and the day closes on "The End"
 * before the menu comes back. Plays through on its own with nothing to click. The save is left
 * exactly as it was outside: Resume Game goes back to the yard.
 */
export class FoyerScene extends Phaser.Scene {
  private dialogue!: Dialogue;
  private fade!: DitherFade;
  private ambience?: Ambience;
  private generation = 0;

  constructor() {
    super('Foyer');
  }

  create(): void {
    this.generation++;
    const gen = this.generation;
    playMusic('homecoming');
    setCursor(this, 'wait');
    this.dialogue = new Dialogue(this);
    this.registry.set('hudQuiet', false);
    this.scene.launch('Hud');
    // Above the HUD, so the closing fade covers the whole screen, backpack bar and all.
    this.scene.bringToTop();

    this.buildRoom();
    // Covers the HUD as well as the room, so the fade-in is only over the scene area.
    this.fade = new DitherFade(this, GAME_WIDTH, GAME_HEIGHT);
    this.fade.setBlack();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.generation++;
      this.dialogue.clear();
      this.fade.destroy();
      this.ambience?.destroy();
      this.ambience = undefined;
      setCursor(this, 'default');
    });
    void this.play(gen);
  }

  update(_time: number, deltaMs: number): void {
    this.ambience?.update(Math.min(deltaMs / 1000, 0.1));
  }

  private stale(gen: number): boolean {
    return gen !== this.generation;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  private tween(target: Phaser.GameObjects.GameObject, props: Record<string, number>, duration: number, ease = 'Linear'): Promise<void> {
    return new Promise((resolve) => this.tweens.add({ targets: target, ...props, duration, ease, onComplete: () => resolve() }));
  }

  // ---------- The room ----------

  private buildRoom(): void {
    if (this.textures.exists(FOYER.background)) {
      this.add.image(0, 0, FOYER.background).setOrigin(0).setDepth(0);
    } else {
      const g = this.add.graphics().setDepth(0);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(FOYER.palette.wall).color, 1);
      g.fillRect(0, 0, GAME_WIDTH, 280);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(FOYER.palette.floor).color, 1);
      g.fillRect(0, 280, GAME_WIDTH, SCENE_HEIGHT - 280);
    }
    this.ambience = new Ambience(this, FOYER.ambient);
    const p = FOYER.parents;
    if (this.textures.exists('parents')) {
      this.add.image(p.x, p.y, 'parents').setOrigin(0.5, 1).setDepth(p.y);
    } else {
      // Two tall stand-ins until the art arrives.
      const g = this.add.graphics().setDepth(p.y);
      g.fillStyle(0x4a6fa5, 1);
      g.fillRect(p.x - 64, p.y - 170, 56, 170);
      g.fillStyle(0xf2d15c, 1);
      g.fillRect(p.x + 4, p.y - 160, 52, 160);
    }
  }

  /** A kid seen from behind, run and jump frames when the sheet exists, otherwise the usual walk. */
  private makeKid(key: 'theo' | 'lucy', at: Pt): Phaser.GameObjects.Sprite {
    const sheet = `${key}_back`;
    const sprite = this.textures.exists(sheet) ? this.add.sprite(at.x, at.y, sheet, 0) : this.add.sprite(at.x, at.y, key, 0);
    sprite.setOrigin(0.5, 1).setDepth(at.y);
    // The scene sits above the HUD, so the run-in from below the frame has to be clipped to the room.
    const mask = this.make.graphics({}, false);
    mask.fillStyle(0xffffff, 1);
    mask.fillRect(0, 0, GAME_WIDTH, SCENE_HEIGHT);
    sprite.setMask(mask.createGeometryMask());
    this.ensureAnimations(key);
    return sprite;
  }

  private ensureAnimations(key: 'theo' | 'lucy'): void {
    const sheet = `${key}_back`;
    if (!this.textures.exists(sheet)) return;
    const total = this.textures.get(sheet).frameTotal - 1;
    if (!this.anims.exists(`${sheet}_run`) && total > BACK.runEnd) {
      this.anims.create({ key: `${sheet}_run`, frames: this.anims.generateFrameNumbers(sheet, { start: BACK.runStart, end: BACK.runEnd }), frameRate: 12, repeat: -1 });
    }
  }

  /** Shows one frame of the back-view sheet, if there is one; the fallback sheet has no such poses. */
  private showBack(sprite: Phaser.GameObjects.Sprite, key: 'theo' | 'lucy', frame: number): void {
    const sheet = `${key}_back`;
    if (!this.textures.exists(sheet) || this.textures.get(sheet).frameTotal - 1 <= frame) return;
    sprite.anims.stop();
    sprite.setTexture(sheet, frame);
  }

  // ---------- The story ----------

  private async play(gen: number): Promise<void> {
    const theo = this.makeKid('theo', { x: FOYER.theoStop.x, y: FOYER.runFromY });
    const lucy = this.makeKid('lucy', { x: FOYER.lucyStop.x, y: FOYER.runFromY + 30 });
    await this.fade.in(FADE_MS);
    if (this.stale(gen)) return;
    await this.wait(300);
    if (this.stale(gen)) return;

    const lucyRun = new Promise<void>((resolve) => {
      this.time.delayedCall(LUCY_DELAY_MS, () => void this.runIn(lucy, 'lucy', FOYER.lucyStop, false).then(resolve));
    });
    await Promise.all([this.runIn(theo, 'theo', FOYER.theoStop, true), lucyRun]);
    if (this.stale(gen)) return;

    // One name each, then the two of them bounce.
    await this.dialogue.say('Mom!', theo.x, theo.y - theo.displayHeight, { duration: CALL_MS, voice: 'theo' });
    if (this.stale(gen)) return;
    await this.dialogue.say('Dad!', lucy.x, lucy.y - lucy.displayHeight, { duration: CALL_MS, fill: 0xffe3f0, voice: 'lucy' });
    if (this.stale(gen)) return;

    // Bouncing with joy: Lucy lands a little after Theo each time.
    const lucyHops = new Promise<void>((resolve) => {
      this.time.delayedCall(120, () => void this.hop(lucy, 'lucy').then(resolve));
    });
    await Promise.all([this.hop(theo, 'theo'), lucyHops]);
    if (this.stale(gen)) return;

    const p = FOYER.parents;
    const top = this.textures.exists('parents') ? this.textures.get('parents').getSourceImage().height : 170;
    await this.dialogue.say(PARENTS_LINE, p.x, p.y - top, { fill: 0xfff3d6, voice: 'parents' });
    if (this.stale(gen)) return;
    await this.wait(LINGER_MS);
    if (this.stale(gen)) return;

    await this.fade.out(CLOSE_MS);
    if (this.stale(gen)) return;
    stopMusic();
    this.ambience?.destroy();
    this.ambience = undefined;
    await this.wait(END_GAP_MS);
    if (this.stale(gen)) return;
    await this.theEnd(gen);
    if (this.stale(gen)) return;
    this.scene.stop('Hud');
    this.scene.start('Intro', { menu: true, fadeInMs: MENU_FADE_MS });
  }

  /** Runs straight up the hall from below the frame to `to`, footsteps optional. */
  private runIn(sprite: Phaser.GameObjects.Sprite, key: 'theo' | 'lucy', to: Pt, steps: boolean): Promise<void> {
    const run = `${key}_back_run`;
    if (this.anims.exists(run)) sprite.play(run);
    else {
      sprite.play(`${key}_walk`);
      sprite.anims.timeScale = RUN_SPEED / WALK_SPEED;
    }
    const stepTimer = steps ? this.time.addEvent({ delay: 150, loop: true, callback: () => playSfx('step') }) : undefined;
    const dist = Math.hypot(to.x - sprite.x, to.y - sprite.y);
    return new Promise((resolve) => {
      this.tweens.add({
        targets: sprite,
        x: to.x,
        y: to.y,
        duration: (dist / RUN_SPEED) * 1000,
        onUpdate: () => sprite.setDepth(sprite.y),
        onComplete: () => {
          stepTimer?.remove(false);
          sprite.setPosition(to.x, to.y).setDepth(to.y);
          sprite.anims.timeScale = 1;
          this.stand(sprite, key);
          resolve();
        },
      });
    });
  }

  /** The standing-with-back-turned frame, or the plain idle when there is no back-view sheet. */
  private stand(sprite: Phaser.GameObjects.Sprite, key: 'theo' | 'lucy'): void {
    if (this.textures.exists(`${key}_back`)) this.showBack(sprite, key, BACK.stand);
    else sprite.play(`${key}_idle`);
  }

  /** A few jumps on the spot: arms out on the way up, arms up at the top, and back down to standing. */
  private async hop(sprite: Phaser.GameObjects.Sprite, key: 'theo' | 'lucy'): Promise<void> {
    const y = sprite.y;
    for (let i = 0; i < HOPS; i++) {
      playSfx('boing');
      this.showBack(sprite, key, BACK.takeOff);
      await this.tween(sprite, { y: y - HOP_HEIGHT }, HOP_MS / 2, 'Quad.easeOut');
      if (!sprite.active) return;
      this.showBack(sprite, key, BACK.apex);
      await this.tween(sprite, { y }, HOP_MS / 2, 'Quad.easeIn');
      if (!sprite.active) return;
      this.showBack(sprite, key, BACK.stand);
      await this.wait(90);
      if (!sprite.active) return;
    }
    this.stand(sprite, key);
  }

  /** "The End" dithers in over black with the closing chord, holds, and dithers back out. */
  private async theEnd(gen: number): Promise<void> {
    const w = 400;
    const h = 80;
    const frames = ditherFrames(
      w,
      h,
      (ctx) => {
        ctx.font = '32px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#3a1d00';
        ctx.strokeText('The End', w / 2, h / 2);
        ctx.fillStyle = '#fff3b0';
        ctx.fillText('The End', w / 2, h / 2);
      },
      END_LEVELS,
    );
    const keys = frames.map((c, i) => {
      const key = `the_end_${i}`;
      if (this.textures.exists(key)) this.textures.remove(key);
      this.textures.addCanvas(key, c);
      return key;
    });
    // Above the fade, which is what everything else is hidden behind by now.
    const img = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, keys[0]).setDepth(6000);
    playSfx('theEnd');
    for (let level = 1; level <= END_LEVELS; level++) {
      img.setTexture(keys[level]);
      await this.wait(END_STEP_MS);
      if (this.stale(gen)) return;
    }
    await this.wait(END_HOLD_MS);
    if (this.stale(gen)) return;
    for (let level = END_LEVELS - 1; level >= 0; level--) {
      img.setTexture(keys[level]);
      await this.wait(END_STEP_MS);
      if (this.stale(gen)) return;
    }
    img.destroy();
    await this.wait(END_GAP_MS);
  }
}
