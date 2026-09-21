import Phaser from 'phaser';
import { GAME_WIDTH, SCENE_HEIGHT } from '../config';
import { FLAGS, getFlag, hasItem, removeItem, setFlag } from '../state/GameState';
import { store } from '../state/Store';
import { Rng, randomSeed } from '../systems/Rng';
import { playSfx } from '../systems/Sfx';
import { playMusic } from '../systems/Music';
import { pointerVerb } from '../ui/text';
import { showPanel } from '../ui/MinigamePanel';
import type { GameScene } from '../scenes/GameScene';
import { altitudeAt, cameraScroll, CHARGE_SECONDS, flightOver, flightSeconds, heightFor, PX_PER_METER, resultLine, SIGHTS, sightFlipped, skySpots, type Sight } from './rocket';
import { beatLine, recallLine, recordResult } from './records';

/** Where the launcher stands on the lawn (its feet), and its parts in scene pixels. */
export const LAUNCHER = {
  at: { x: 500, y: 350 },
  /** Top of the launch tube, where the rocket's base sits. */
  tube: { x: 474, y: 288 },
  /** The launch tube leans a little to the left (its top is left of its base), and so does the rocket on it. */
  tubeTilt: -14,
  /** Middle of the red pad, where Theo's feet land when he stomps. */
  pad: { x: 493, y: 336 },
  /** Where Theo waits while the player pumps, and where Lucy watches from. */
  stand: { x: 540, y: 354 },
  lucy: { x: 428, y: 356 },
  /** Where the rocket comes down, beside them. */
  landing: { x: 575, y: 348 },
};

const ROCKET_KEY = 'rocket_flying';
/** The sky above the yard: its colour at the top of the art, fading to the deep blue of the upper air. */
const SKY_LOW = 0x77bfe5;
const SKY_HIGH = 0x1c2c6e;
/** Metres above which stars come out. */
const STARS_ABOVE = 180;
type Phase = 'idle' | 'charge' | 'stomp' | 'flight' | 'landed';

/**
 * The stomp rocket in the backyard. Click as fast as you can for five seconds, Theo jumps on the
 * pad, and the rocket climbs nine metres for every click while the camera follows it up past
 * clouds and birds, then falls back to the lawn beside the kids.
 */
export class StompRocketController {
  private phase: Phase = 'idle';
  private clicks = 0;
  private elapsed = 0;
  private flightT = 0;
  private height = 0;
  private rocket?: Phaser.GameObjects.Image;
  /** Half the rocket's height: in flight it turns about its middle, so its base sits this far below its centre. */
  private rocketHalf = 0;
  private sky: Phaser.GameObjects.GameObject[] = [];
  private objects: Phaser.GameObjects.GameObject[] = [];
  private birds: { sprite: Phaser.GameObjects.Sprite; speed: number }[] = [];
  /** The sights that were built this flight, each with how it moves. */
  private sights: { img: Phaser.GameObjects.Image; sight: Sight; vx: number; light?: Phaser.GameObjects.Rectangle; baseY: number }[] = [];
  private skyT = 0;
  private firstRun = false;

  constructor(private scene: GameScene) {}

  get active(): boolean {
    return this.phase !== 'idle';
  }

  /**
   * Once the rocket has been launched it lives on the launcher, so the backyard shows it there
   * whenever the room is built.
   */
  roomBuilt(): void {
    if (getFlag(store.get(), FLAGS.stompRocketDone)) this.placeRocketOnTube();
  }

  /** Clicking the launcher: play with the rocket, or remember where it is without it. */
  async launcherClicked(): Promise<void> {
    if (this.active) return;
    const state = store.get();
    if (!hasItem(state, 'stomp_rocket') && !getFlag(state, FLAGS.stompRocketDone)) {
      playSfx('locked');
      store.update((s) => setFlag(s, FLAGS.stompRocketHinted));
      await this.scene.sayTheo("The stomp rocket launcher! But the rocket is missing... I think I saw it in Dad's garage.");
      return;
    }
    await this.start();
  }

  private async start(): Promise<void> {
    this.phase = 'stomp'; // busy until the wind-up begins
    this.clicks = 0;
    this.elapsed = 0;
    this.firstRun = !getFlag(store.get(), FLAGS.stompRocketDone);
    playMusic('minigame');
    this.scene.capturePointer({ down: () => this.onDown(), up: () => {} }, 'rocket');
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    await Promise.all([this.scene.moveTheo(LAUNCHER.stand), this.scene.moveLucy(LAUNCHER.lucy)]);
    this.scene.lucy?.face(1);
    // The first time, the rocket comes out of the backpack as it goes onto the tube, and belongs
    // to the launcher from here on.
    if (this.firstRun) {
      store.update((s) => {
        removeItem(s, 'stomp_rocket');
        setFlag(s, FLAGS.stompRocketDone);
      });
    }
    this.placeRocketOnTube();
    // On a repeat launch Lucy names the height to beat before the wind-up starts.
    const best = this.firstRun ? null : recallLine(store.get(), 'rocket');
    if (best) await this.scene.sayLucy(best);
    await this.scene.sayLucy(`${pointerVerb()} as fast as you can to pump it up!`);
    this.phase = 'charge';
    this.renderPanel();
  }

  private placeRocketOnTube(): void {
    const key = this.scene.textures.exists(ROCKET_KEY) ? ROCKET_KEY : 'item_stomp_rocket';
    this.rocket?.destroy();
    this.rocket = this.scene.add.image(LAUNCHER.tube.x, LAUNCHER.tube.y, key).setOrigin(0.5, 1).setAngle(LAUNCHER.tubeTilt).setDepth(LAUNCHER.at.y + 1);
    if (key !== ROCKET_KEY) this.rocket.setScale(1.6);
    this.rocketHalf = this.rocket.displayHeight / 2;
    // Belongs to the room, so it is cleared with the rest of it when the party leaves.
    this.scene.keepInRoom(this.rocket);
  }

  private onDown(): void {
    if (this.phase !== 'charge') return;
    this.clicks++;
    playSfx('click');
    // Theo bounces with every pump.
    const sprite = this.scene.theo.sprite;
    if (!this.scene.tweens.isTweening(sprite)) {
      this.scene.tweens.add({ targets: sprite, y: sprite.y - 5, duration: 70, yoyo: true });
    }
    this.renderPanel();
  }

  private update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    if (this.phase === 'charge') {
      this.elapsed += dt;
      this.renderPanel();
      if (this.elapsed >= CHARGE_SECONDS) void this.stomp();
    } else if (this.phase === 'flight') {
      this.flightT += dt;
      const metres = altitudeAt(this.height, this.flightT);
      this.placeRocket(metres);
      if (flightOver(this.height, this.flightT)) void this.land();
    }
  }

  /** Time's up: Theo jumps onto the pad and the rocket goes. */
  private async stomp(): Promise<void> {
    this.phase = 'stomp';
    this.height = heightFor(this.clicks);
    // The wind-up readouts go; the altitude counter takes over once it flies.
    showPanel(this.scene, { title: 'Stomp!', big: `${this.clicks} ${this.clicks === 1 ? 'pump' : 'pumps'}` });
    const theo = this.scene.theo;
    theo.face(-1);
    await new Promise<void>((resolve) =>
      this.scene.tweens.add({
        targets: theo.sprite,
        x: LAUNCHER.pad.x,
        y: LAUNCHER.pad.y - 26,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => resolve(),
      }),
    );
    await new Promise<void>((resolve) =>
      this.scene.tweens.add({ targets: theo.sprite, y: LAUNCHER.pad.y, duration: 120, ease: 'Quad.easeIn', onComplete: () => resolve() }),
    );
    theo.setPosition(LAUNCHER.pad.x, LAUNCHER.pad.y);
    // Standing on the pad, he is in front of the launcher and the rocket on it.
    theo.sprite.setDepth(LAUNCHER.at.y + 2);
    playSfx('stomp');
    this.scene.cameras.main.shake(120, 0.004);
    if (this.height === 0) {
      // No clicks: a sad little hop off the tube.
      await this.scene.sayTheo(resultLine(0));
      this.finish();
      return;
    }
    playSfx('whoosh');
    // From here it turns about its middle, so its centre starts half a rocket above the tube.
    this.rocket?.setOrigin(0.5, 0.5).setPosition(LAUNCHER.tube.x, LAUNCHER.tube.y - this.rocketHalf);
    this.buildSky();
    this.showAltitude(0);
    this.flightT = 0;
    this.phase = 'flight';
  }

  /** The column of sky the rocket climbs through: a darkening gradient, clouds, birds and stars. */
  private buildSky(): void {
    const scene = this.scene;
    const heightPx = this.height * PX_PER_METER + 300;
    const key = 'flight_sky';
    if (!scene.textures.exists(key)) {
      const tex = scene.textures.createCanvas(key, 4, 256);
      if (tex) {
        const ctx = tex.context;
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0, `#${SKY_HIGH.toString(16).padStart(6, '0')}`);
        grad.addColorStop(1, `#${SKY_LOW.toString(16).padStart(6, '0')}`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 4, 256);
        tex.refresh();
      }
    }
    const skyTop = -heightPx - SCENE_HEIGHT;
    const sky = scene.add.image(0, skyTop, key).setOrigin(0).setDepth(-1).setDisplaySize(GAME_WIDTH, -skyTop);
    this.sky.push(sky);
    const rng = new Rng(randomSeed());
    const spots = skySpots(rng, heightPx);
    for (const c of spots.clouds) {
      const cloud = scene.add.image(c.x, c.y, `intro_cloud_${rng.int(0, 2)}`).setDepth(-0.5).setAlpha(0.95);
      // Far clouds drift by more slowly, which gives the climb some depth.
      cloud.setScrollFactor(rng.next() < 0.4 ? 0.7 : 1);
      this.sky.push(cloud);
    }
    if (scene.textures.exists('bird')) {
      for (const b of spots.birds) {
        const sprite = scene.add.sprite(b.x, b.y, 'bird', 0).setDepth(-0.4).setScale(0.6);
        const dir = rng.next() < 0.5 ? -1 : 1;
        sprite.setFlipX(dir < 0);
        if (!scene.anims.exists('ambient_bird')) scene.anims.create({ key: 'ambient_bird', frames: scene.anims.generateFrameNumbers('bird', { start: 0, end: 1 }), frameRate: 6, repeat: -1 });
        sprite.play('ambient_bird');
        this.birds.push({ sprite, speed: dir * rng.int(30, 60) });
        this.sky.push(sprite);
      }
    }
    // Sights hang at their own altitudes; the rocket only meets the ones it climbs past.
    for (const sight of SIGHTS) {
      if (!scene.textures.exists(sight.key) || sight.metres * PX_PER_METER > heightPx) continue;
      const y = LAUNCHER.tube.y - sight.metres * PX_PER_METER;
      const img = scene.add.image(0, y, sight.key).setDepth(-0.3);
      const fromLeft = rng.next() < 0.5;
      if (sight.drift === 0) {
        // Hangs there: anywhere across the sky, far enough in to be whole on screen.
        const margin = Math.min(img.width / 2 + 40, GAME_WIDTH / 2 - 8);
        img.x = rng.int(margin, GAME_WIDTH - margin);
      } else {
        // Crosses: comes in off one edge, mirrored if the art is not drawn facing that way.
        img.x = fromLeft ? -img.width : GAME_WIDTH + img.width;
        img.setFlipX(sightFlipped(sight, fromLeft ? 1 : -1));
      }
      let light: Phaser.GameObjects.Rectangle | undefined;
      if (sight.light) {
        light = scene.add.rectangle(img.x, y - img.height / 2 - 2, 2, 2, 0xff3030).setDepth(-0.2);
        this.sky.push(light);
      }
      this.sights.push({ img, sight, vx: (fromLeft ? 1 : -1) * sight.drift, light, baseY: y });
      this.sky.push(img);
    }
    if (this.height > STARS_ABOVE) {
      const stars = scene.add.graphics().setDepth(-0.9);
      stars.fillStyle(0xffffff, 0.9);
      for (let y = skyTop; y < -STARS_ABOVE * PX_PER_METER; y += rng.int(18, 40)) stars.fillRect(rng.int(0, GAME_WIDTH), y, rng.next() < 0.3 ? 2 : 1, 1);
      this.sky.push(stars);
    }
  }

  private placeRocket(metres: number): void {
    if (!this.rocket) return;
    const y = LAUNCHER.tube.y - this.rocketHalf - metres * PX_PER_METER;
    const up = this.upSeconds();
    // Straightens up as it leaves the tube, then tumbles nose-over-tail about its middle at the
    // top of the flight and comes down tail first.
    const angle = this.flightT < up ? LAUNCHER.tubeTilt * Math.max(0, 1 - metres / 20) : -180 * Phaser.Math.Easing.Sine.InOut(Math.min(1, (this.flightT - up) / 0.9));
    this.rocket.setPosition(LAUNCHER.tube.x + this.driftX(metres), y).setAngle(angle).setDepth(900);
    const scroll = cameraScroll(y - 40);
    this.scene.cameras.main.setScroll(0, scroll);
    for (const b of this.birds) b.sprite.x += b.speed / 60;
    this.moveSights(1 / 60);
    this.showAltitude(Math.round(metres));
  }

  private lastShown = -1;

  /** The altitude readout in the backpack bar, redrawn only when the number changes. */
  private showAltitude(metres: number): void {
    if (metres === this.lastShown) return;
    this.lastShown = metres;
    showPanel(this.scene, { title: 'Up it goes!', big: `${metres} m` });
  }

  /** The crossing sights drift and some of them bob; the satellite's light blinks; the rest hang still. */
  private moveSights(dt: number): void {
    this.skyT += dt;
    for (const s of this.sights) {
      s.img.x += s.vx * dt;
      if (s.sight.bob) s.img.y = s.baseY + Math.sin(this.skyT * 3) * s.sight.bob;
      if (s.vx !== 0) {
        // Wrap round so even a slow climb gets to see it go by.
        const edge = s.img.width + 20;
        if (s.vx > 0 && s.img.x > GAME_WIDTH + edge) s.img.x = -edge;
        if (s.vx < 0 && s.img.x < -edge) s.img.x = GAME_WIDTH + edge;
      }
      if (s.light) s.light.setPosition(s.img.x, s.img.y - s.img.height / 2 - 2).setVisible(Math.floor(this.skyT * 2) % 2 === 0);
    }
  }

  private upSeconds(): number {
    return flightSeconds(this.height).up;
  }

  /** The rocket wanders a little sideways on the way down so it lands beside the kids. */
  private driftX(metres: number): number {
    if (this.flightT <= this.upSeconds()) return 0;
    const k = 1 - metres / Math.max(1, this.height);
    return (LAUNCHER.landing.x - LAUNCHER.tube.x) * Math.min(1, k);
  }

  private async land(): Promise<void> {
    this.phase = 'landed';
    this.scene.cameras.main.setScroll(0, 0);
    this.rocket?.setOrigin(0.5, 1).setPosition(LAUNCHER.landing.x, LAUNCHER.landing.y).setAngle(100).setDepth(LAUNCHER.landing.y);
    playSfx('boing');
    this.scene.cameras.main.shake(100, 0.003);
    this.showAltitude(this.height);
    this.scene.lucy?.celebrate();
    await this.scene.sayTheo(resultLine(this.height));
    let result: ReturnType<typeof recordResult> = 'kept';
    store.update((s) => {
      result = recordResult(s, 'rocket', this.height);
    });
    const brag = beatLine('rocket', result, this.height);
    if (brag) await this.scene.sayLucy(brag);
    if (this.firstRun) {
      await this.scene.sayLucy(`Again! ${pointerVerb()} the launcher whenever you want to do it again!`);
      await this.scene.sayWhatsNext();
    }
    this.finish();
  }

  /** The rocket goes back onto the launcher, ready for next time, and the yard is the player's again. */
  private finish(): void {
    const landed = this.rocket;
    this.rocket = undefined;
    if (landed) {
      this.scene.tweens.add({
        targets: landed,
        alpha: 0,
        duration: 350,
        onComplete: () => {
          landed.destroy();
          this.placeRocketOnTube();
        },
      });
    }
    this.stop();
  }

  /** The wind-up in the backpack bar: the pump count and the time left, a bar that empties over the five seconds. */
  private renderPanel(): void {
    const left = Math.max(0, 1 - this.elapsed / CHARGE_SECONDS);
    showPanel(this.scene, {
      title: 'Pump it up!',
      text: `${pointerVerb()} as fast as you can!`,
      big: `${this.clicks} ${this.clicks === 1 ? 'pump' : 'pumps'}`,
      meter: { value: left, color: left > 0.3 ? 0x5dc05a : 0xd94b3a },
    });
  }

  /** Ends the game in whatever state it is in and gives the yard back. */
  stop(): void {
    if (this.phase === 'idle') return;
    this.phase = 'idle';
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.scene.cameras.main.setScroll(0, 0);
    this.scene.capturePointer(null);
    if (this.scene.scene.isActive()) playMusic('main');
    // A rocket still in the air (the game was cut short) goes back on the tube.
    if (this.rocket && this.rocket.originY !== 1) {
      this.rocket.destroy();
      this.rocket = undefined;
      if (getFlag(store.get(), FLAGS.stompRocketDone)) this.placeRocketOnTube();
    }
    for (const o of [...this.objects, ...this.sky]) o.destroy();
    this.objects = [];
    this.sky = [];
    this.birds = [];
    this.sights = [];
    this.skyT = 0;
    this.lastShown = -1;
    showPanel(this.scene, null);
    this.scene.theo.idle();
  }
}
