import Phaser from 'phaser';
import { FADE_MS, GAME_WIDTH, SCENE_HEIGHT } from '../config';
import { FLAGS, getFlag, setFlag } from '../state/GameState';
import { beatLine, recallLine, recordResult } from '../puzzles/records';
import { store } from '../state/Store';
import { Dialogue } from '../systems/Dialogue';
import { Ambience } from '../systems/Ambience';
import { DitherFade } from '../systems/DitherFade';
import { playMusic } from '../systems/Music';
import { Rng } from '../systems/Rng';
import { playSfx, unlockAudio } from '../systems/Sfx';
import { arrowCursor, setCursor } from '../systems/Cursor';
import { pointerVerb } from '../ui/text';
import { showPanel } from '../ui/MinigamePanel';
import {
  generateCourse,
  halfWidthAt,
  hits,
  MAX_HITS,
  moveLane,
  obstacleD,
  placeOnSlide,
  RIDER_D,
  SLIDE,
  type Course,
  type Lane,
  type Obstacle,
} from '../puzzles/slide';

/** Lucy sits just in front of Theo, a little nearer the camera. */
const LUCY_D = RIDER_D + 0.05;
const LANE_CHANGE_MS = 170;
/** Seconds from the start before the first obstacle can matter; the steering tip shows meanwhile. */
const INTRO_HOLD_MS = 1800;
const STRIPE_COUNT = 7;
/** How long the riders take to run out the rest of the slide after the last obstacle. */
const RUN_OUT_MS = 2200;
/** Where they come to rest: the far end of the slide, as small as the perspective makes them. */
const RUN_OUT_D = 0.06;
/** The riders' two seated frames alternate at this rate: a slow, happy wave on the way down. */
const RIDER_FRAME_RATE = 2;

interface Rider {
  sprite: Phaser.GameObjects.Sprite;
  d: number;
}

interface Live {
  ob: Obstacle;
  image: Phaser.GameObjects.Image;
  resolved: boolean;
}

interface SlideData {
  attempt?: number;
}

/**
 * The slide ride: a run down the playground slide seen from the bottom, steering Theo and Lucy
 * around leaves and mud. Runs in place of the room scene and hands back to it when the ride is
 * over. Three bumps and the ride restarts from the top.
 */
export class SlideScene extends Phaser.Scene {
  private course!: Course;
  private live: Live[] = [];
  private next = 0;
  private now = 0;
  private running = false;
  private lane: Lane = 0;
  private hitCount = 0;
  private theo!: Rider;
  private lucy!: Rider;
  private surface!: Phaser.GameObjects.Graphics;
  private stripes: number[] = [];
  private dialogue!: Dialogue;
  private fade!: DitherFade;
  private ambience?: Ambience;
  private attempt = 0;
  private shaking = false;
  private placeholderBackdrop = true;
  /** Set while the riders run out to the end of the slide: the ride is over but the slide still moves. */
  private finishing = false;

  constructor() {
    super('Slide');
  }

  create(data: SlideData = {}): void {
    this.attempt = data.attempt ?? 0;
    this.live = [];
    this.next = 0;
    this.now = 0;
    this.lane = 0;
    this.hitCount = 0;
    this.running = false;
    this.finishing = false;
    this.shaking = false;
    playMusic('minigame');
    setCursor(this, 'wait');
    this.dialogue = new Dialogue(this);
    this.course = generateCourse(new Rng(store.get().seed).fork(`slide:${this.attempt}`));

    this.add.image(0, 0, 'bg_slide').setOrigin(0).setDepth(0);
    // The same leaves that drift through the playground fall past the slide too.
    this.ambience = new Ambience(this, [{ kind: 'leaves', key: 'leaf', area: { x: 20, y: -10, w: 600, h: 410 }, every: [3, 7] }]);
    // The placeholder backdrop is a canvas drawn in code; real art arrives as an image file.
    this.placeholderBackdrop = !!this.textures.get('bg_slide').source[0]?.isCanvas;
    this.surface = this.add.graphics().setDepth(1);
    this.stripes = Array.from({ length: STRIPE_COUNT }, (_, i) => i / STRIPE_COUNT);
    this.drawSlide();

    this.theo = this.makeRider('theo', RIDER_D);
    this.lucy = this.makeRider('lucy', LUCY_D);
    this.placeRiders();

    this.renderPanel();

    this.fade = new DitherFade(this, GAME_WIDTH, SCENE_HEIGHT);
    this.fade.setBlack();
    void this.fade.in(FADE_MS);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      unlockAudio();
      if (p.y > SCENE_HEIGHT || !this.running) return;
      this.steer(p.x < GAME_WIDTH / 2 ? -1 : 1);
      this.updateCursor(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.updateCursor(p));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.dialogue.clear();
      this.fade.destroy();
      this.ambience?.destroy();
      this.ambience = undefined;
      showPanel(this, null);
      setCursor(this, 'default');
    });

    void this.begin();
  }

  private async begin(): Promise<void> {
    // A ride down a slide they have already beaten starts with the bumps to beat, said in full
    // before anything moves; the steering tip then rides along with them.
    const again = this.attempt === 0 && getFlag(store.get(), FLAGS.slideDone) ? recallLine(store.get(), 'slide') : null;
    if (again) await this.sayLucy(again);
    if (!this.scene.isActive()) return;
    const tip = this.attempt === 0 ? `${pointerVerb()} left or right to steer! Watch out for leaves and mud.` : 'Ready? Here we go!';
    void this.sayLucy(tip, INTRO_HOLD_MS);
    this.running = true;
    this.updateCursor(this.input.activePointer);
  }

  /** A bubble over Lucy, who rides just behind Theo. */
  private sayLucy(text: string, duration?: number): Promise<void> {
    return this.dialogue.say(text, this.lucy.sprite.x, this.lucy.sprite.y - this.lucy.sprite.displayHeight, { fill: 0xffe3f0, duration, voice: 'lucy' });
  }

  /**
   * The cursor says which way a click would steer: a left arrow over the left half of the slide,
   * a right arrow over the right half, greyed out when the riders are already against that rail.
   * Off the slide, or once the ride is over, it is the usual wait/default cursor.
   */
  private updateCursor(p: Phaser.Input.Pointer): void {
    if (!this.running) {
      setCursor(this, this.finishing ? 'wait' : 'default');
      return;
    }
    if (p.y > SCENE_HEIGHT) {
      setCursor(this, 'default');
      return;
    }
    const dir = p.x < GAME_WIDTH / 2 ? -1 : 1;
    setCursor(this, arrowCursor(dir < 0 ? 'left' : 'right', moveLane(this.lane, dir) === this.lane));
  }

  /**
   * Uses the seated, seen-from-behind art when it exists (two frames, hands down and arms up,
   * looped as a cheer), otherwise the idle frame.
   */
  private makeRider(key: 'theo' | 'lucy', d: number): Rider {
    const seated = `${key}_slide`;
    const sprite = this.textures.exists(seated) ? this.add.sprite(0, 0, seated, 0) : this.add.sprite(0, 0, key, 0).play(`${key}_idle`);
    if (this.textures.exists(seated) && this.textures.get(seated).frameTotal - 1 >= 2) {
      if (!this.anims.exists(seated)) {
        this.anims.create({ key: seated, frames: this.anims.generateFrameNumbers(seated, { start: 0, end: 1 }), frameRate: RIDER_FRAME_RATE, repeat: -1 });
      }
      sprite.play(seated);
    }
    sprite.setOrigin(0.5, 1);
    return { sprite, d };
  }

  private placeRiders(): void {
    for (const r of [this.theo, this.lucy]) {
      const p = placeOnSlide(r.d, this.lane);
      r.sprite.setPosition(Math.round(p.x), Math.round(p.y)).setScale(p.scale).setDepth(10 + r.d * 100);
    }
  }

  private steer(dir: -1 | 1): void {
    const lane = moveLane(this.lane, dir);
    if (lane === this.lane) return;
    this.lane = lane;
    playSfx('squeak');
    for (const r of [this.theo, this.lucy]) {
      const p = placeOnSlide(r.d, lane);
      this.tweens.add({ targets: r.sprite, x: p.x, duration: LANE_CHANGE_MS, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: r.sprite, angle: dir * 9, duration: LANE_CHANGE_MS / 2, yoyo: true });
    }
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.ambience?.update(dt);
    if (this.finishing) {
      this.drawSlide(dt);
      return;
    }
    if (!this.running) return;
    this.now += dt;
    this.drawSlide(dt);

    // Obstacles enter in course order as their time comes.
    while (this.next < this.course.obstacles.length && this.course.obstacles[this.next].at <= this.now) {
      const ob = this.course.obstacles[this.next++];
      const image = this.add.image(0, 0, ob.kind === 'leaf' ? 'obstacle_leaf' : 'obstacle_mud').setOrigin(0.5, 0.8);
      this.live.push({ ob, image, resolved: false });
    }
    for (const l of this.live) {
      const d = obstacleD(l.ob, this.now);
      const p = placeOnSlide(d, l.ob.lane);
      l.image.setPosition(Math.round(p.x), Math.round(p.y)).setScale(p.scale).setDepth(10 + d * 100);
      if (!l.resolved && hits(l.ob, this.lane, this.now)) {
        l.resolved = true;
        this.bump();
      } else if (!l.resolved && d > RIDER_D) {
        l.resolved = true;
      }
    }
    this.live = this.live.filter((l) => {
      if (obstacleD(l.ob, this.now) <= 1.2) return true;
      l.image.destroy();
      return false;
    });

    if (this.hitCount >= MAX_HITS) void this.lose();
    else if (this.now >= this.course.seconds) void this.win();
  }

  private bump(): void {
    this.hitCount++;
    playSfx('boing');
    this.renderPanel();
    if (!this.shaking) {
      this.shaking = true;
      this.cameras.main.shake(220, 0.006, false, () => (this.shaking = false));
    }
    for (const r of [this.theo, this.lucy]) {
      this.tweens.add({ targets: r.sprite, angle: this.lane <= 0 ? -14 : 14, duration: 90, yoyo: true, repeat: 1 });
    }
    void this.dialogue.say(this.hitCount < MAX_HITS ? 'Oof!' : 'Whoa!', this.theo.sprite.x, this.theo.sprite.y - this.theo.sprite.displayHeight, { duration: 700, voice: 'theo' });
  }

  private async lose(): Promise<void> {
    this.running = false;
    setCursor(this, 'wait');
    await this.sayLucy("Too many bumps! Let's climb back up and try again.");
    await this.fade.out(FADE_MS);
    this.scene.restart({ attempt: this.attempt + 1 } satisfies SlideData);
  }

  private async win(): Promise<void> {
    this.running = false;
    this.finishing = true;
    setCursor(this, 'wait');
    for (const l of this.live) l.image.destroy();
    this.live = [];
    await this.runOut();
    this.finishing = false;
    playSfx('success');
    const bumps = this.hitCount;
    let result: ReturnType<typeof recordResult> = 'kept';
    store.update((s) => {
      setFlag(s, FLAGS.slideDone);
      result = recordResult(s, 'slide', bumps);
    });
    await this.dialogue.say('Wheee! We made it all the way down!', this.theo.sprite.x, this.theo.sprite.y - this.theo.sprite.displayHeight, { voice: 'theo' });
    const brag = beatLine('slide', result, bumps);
    if (brag) await this.sayLucy(brag);
    await this.fade.out(FADE_MS);
    this.scene.start('Game', { afterSlide: true });
  }

  /**
   * The riders slide away down the rest of the slide, shrinking with the perspective until they
   * sit at its far end. Lucy keeps her place just behind Theo the whole way.
   */
  private runOut(): Promise<void> {
    const gap = this.lucy.d - this.theo.d;
    const ride = { d: this.theo.d };
    return new Promise((resolve) => {
      this.tweens.add({
        targets: ride,
        d: RUN_OUT_D,
        duration: RUN_OUT_MS,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          this.theo.d = ride.d;
          this.lucy.d = ride.d + gap;
          this.placeRiders();
        },
        onComplete: () => resolve(),
      });
    });
  }

  /**
   * The slide's motion: stripes that run down it so the ride reads as moving, plus faint lane
   * guides. The bed and rails themselves are only drawn over the code-drawn placeholder
   * backdrop; the real backdrop has the slide painted in, at the geometry in `SLIDE`.
   */
  private drawSlide(dt = 0): void {
    const g = this.surface;
    const { top, bottom, cx } = SLIDE;
    const farHalf = halfWidthAt(top);
    const nearHalf = halfWidthAt(bottom);
    g.clear();
    if (this.placeholderBackdrop) {
      // Rails first, a touch wider than the bed.
      g.fillStyle(0x6f767c, 1);
      g.fillPoints([{ x: cx - farHalf - 6, y: top }, { x: cx + farHalf + 6, y: top }, { x: cx + nearHalf + 12, y: bottom }, { x: cx - nearHalf - 12, y: bottom }], true);
      g.fillStyle(0xc9ced3, 1);
      g.fillPoints([{ x: cx - farHalf, y: top }, { x: cx + farHalf, y: top }, { x: cx + nearHalf, y: bottom }, { x: cx - nearHalf, y: bottom }], true);
    }
    // Stripes fall toward the camera at the riders' pace.
    for (let i = 0; i < this.stripes.length; i++) {
      this.stripes[i] += dt * 0.5;
      if (this.stripes[i] > 1) this.stripes[i] -= 1;
      const p = placeOnSlide(this.stripes[i], 0);
      const hw = halfWidthAt(p.y) - 4;
      g.fillStyle(0xffffff, this.placeholderBackdrop ? 0.8 : 0.35);
      g.fillRect(Math.round(cx - hw), Math.round(p.y), Math.round(hw * 2), 2);
    }
    // Lane guides, faint, so "left" and "right" have somewhere to be.
    g.lineStyle(1, 0xffffff, 0.25);
    for (const lane of [-0.5, 0.5]) {
      g.beginPath();
      g.moveTo(cx + lane * farHalf * 2 * SLIDE.laneSpread, top);
      g.lineTo(cx + lane * nearHalf * 2 * SLIDE.laneSpread, bottom);
      g.strokePath();
    }
  }

  /** In the backpack bar: what to do, and a heart for every bump the riders can still take. */
  private renderPanel(): void {
    showPanel(this, {
      title: 'The slide',
      text: `${pointerVerb()} left or right to steer. Dodge the leaves and the mud!`,
      icons: { key: 'heart', count: MAX_HITS - this.hitCount, total: MAX_HITS },
    });
  }
}
