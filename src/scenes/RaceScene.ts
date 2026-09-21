import Phaser from 'phaser';
import { FADE_MS, GAME_WIDTH, SCENE_HEIGHT } from '../config';
import { FLAGS, setFlag } from '../state/GameState';
import { store } from '../state/Store';
import { Dialogue } from '../systems/Dialogue';
import { DitherFade } from '../systems/DitherFade';
import { playMusic } from '../systems/Music';
import { playSfx, startHum, stopHum, unlockAudio } from '../systems/Sfx';
import { setCursor } from '../systems/Cursor';
import { makeButton } from '../ui/Button';
import { pointerVerb } from '../ui/text';
import { showPanel } from '../ui/MinigamePanel';
import {
  boosterOn,
  clickBooster,
  clickCar,
  lapText,
  LOOP_CENTRE,
  newRace,
  pose,
  startAt,
  step,
  stopLine,
  TRACK,
  type RaceState,
} from '../puzzles/race';
import { Rng } from '../systems/Rng';
import { beatLine, recallLine, recordResult, seconds } from '../puzzles/records';

/** The booster's lamp blinks this many times a second while it runs. */
const BLINK_HZ = 8;
/** While the booster runs, a puff of exhaust leaves its rollers this often, in seconds. */
const PUFF_EVERY = 0.08;
/**
 * Where the car's wheels sit in the loop: just inside the near rail, which is drawn over them,
 * so the body shows and only the wheels are tucked behind the rail.
 */
const LOOP_CONTACT = TRACK.loop.r - TRACK.loop.band / 2 + 2;

interface RaceData {
  /** The player has been here before this session: skip the instructions. */
  again?: boolean;
}

/**
 * The toy race track on Theo's floor, seen close up. Two buttons in the backpack bar drive it:
 * Push shoves the car along, and Booster switches the booster on for a moment (its lamp blinks
 * green and it hums) so a car passing over it is flung round the loop-the-loop. Three laps
 * without stopping wins. Runs in place of the room scene and hands back to it when the race is
 * over or the player leaves.
 */
export class RaceScene extends Phaser.Scene {
  private race!: RaceState;
  private carTop!: Phaser.GameObjects.Image;
  private carSide!: Phaser.GameObjects.Image;
  private loopFront?: Phaser.GameObjects.Image;
  private light!: Phaser.GameObjects.Graphics;
  private dialogue!: Dialogue;
  private fade!: DitherFade;
  private running = false;
  private leaving = false;
  /** The lamp as drawn: blinking while the booster runs. */
  private lit = false;
  private blinkT = 0;
  /** Time to the next puff out of the booster while it runs. */
  private puffT = 0;
  /** Seconds since the car was first pushed on this run; the clock stops when it stops. */
  private runTime = 0;
  private timing = false;

  constructor() {
    super('Race');
  }

  create(data: RaceData = {}): void {
    // The car is parked a little either side of the start line, the same spot all playthrough.
    this.race = newRace(startAt(new Rng(store.get().seed).fork('race')));
    this.running = false;
    this.runTime = 0;
    this.timing = false;
    this.leaving = false;
    this.lit = false;
    this.blinkT = 0;
    playMusic('minigame');
    setCursor(this, 'wait');
    this.dialogue = new Dialogue(this);

    this.add.image(0, 0, 'bg_race_0').setOrigin(0).setDepth(0);
    this.light = this.add.graphics().setDepth(5);
    this.drawLight();
    // Seen from above on the flat, and side-on in the loop; the loop's near rail goes over it there.
    this.carTop = this.add.image(0, 0, 'car_top').setDepth(25);
    this.carSide = this.add.image(0, 0, 'car_side').setOrigin(0.5, 0.9).setFlipX(true).setDepth(15).setVisible(false);
    if (this.textures.exists('race_loop_front')) {
      this.loopFront = this.add.image(TRACK.loopFront.x, TRACK.loopFront.y, 'race_loop_front').setOrigin(0).setDepth(20).setVisible(false);
    }
    this.placeCar();

    makeButton(this, GAME_WIDTH - 44, 18, 'Done', () => void this.leave(false), { width: 72, height: 24 });

    this.fade = new DitherFade(this, GAME_WIDTH, SCENE_HEIGHT);
    this.fade.setBlack();
    void this.fade.in(FADE_MS);

    this.input.on('pointerdown', () => unlockAudio());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopHum();
      showPanel(this, null);
      this.dialogue.clear();
      this.fade.destroy();
      setCursor(this, 'default');
    });

    void this.begin(!!data.again);
  }

  private verb(): string {
    return pointerVerb();
  }

  private async begin(again: boolean): Promise<void> {
    this.renderPanel();
    if (!again) {
      await this.dialogue.sayOffscreen(`Three laps! ${this.verb()} Push to get the car going, and ${this.verb().toLowerCase()} Boost just before the car reaches the booster to zoom round the loop!`, { voice: 'theo' });
    } else {
      // Lucy calls out the time to beat from the doorway.
      const best = recallLine(store.get(), 'race');
      if (best) await this.dialogue.sayOffscreen(best, { fill: 0xffe3f0, voice: 'lucy' });
    }
    this.running = true;
    setCursor(this, 'default');
  }

  private renderPanel(): void {
    showPanel(this, {
      title: 'Race track',
      big: lapText(this.race),
      buttons: [
        { label: 'Push', icon: 'item_toy_car', onClick: () => this.push() },
        { label: 'Boost', icon: 'booster_icon', onClick: () => this.boost() },
      ],
    });
  }

  /** The Push button: a shove along the track. */
  private push(): void {
    if (!this.running) return;
    // The clock runs from the first push of a run.
    this.timing = true;
    clickCar(this.race);
    playSfx('push');
    // A little squash, so the push is felt, and a puff of dust behind the car.
    const car = this.carTop.visible ? this.carTop : this.carSide;
    if (!this.tweens.isTweening(car)) this.tweens.add({ targets: car, scaleX: 0.85, duration: 60, yoyo: true });
    this.poof();
  }

  /** Three puffs behind the car, thrown back along the track, growing and fading as they go. */
  private poof(): void {
    if (!this.textures.exists('poof')) return;
    const p = pose(this.race.s);
    const car = this.carTop.visible ? this.carTop : this.carSide;
    const back = { x: -Math.cos(p.angle), y: -Math.sin(p.angle) };
    for (let i = 0; i < 3; i++) {
      const spread = (i - 1) * 5;
      const x = car.x + back.x * 12 - back.y * spread;
      const y = car.y + back.y * 12 + back.x * spread;
      const puff = this.add.image(x, y, 'poof').setDepth(car.depth - 1).setScale(0.5).setAlpha(0.9);
      this.tweens.add({
        targets: puff,
        x: x + back.x * 14,
        y: y + back.y * 14,
        scale: 1.4 + i * 0.2,
        alpha: 0,
        duration: 380,
        delay: i * 50,
        ease: 'Quad.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
  }

  /** The Booster button: the booster runs for a moment, lamp blinking, motor humming. */
  private boost(): void {
    if (!this.running) return;
    clickBooster(this.race);
    playSfx('click');
    startHum();
    this.blinkT = 0;
    this.setLight(true);
  }

  update(_time: number, deltaMs: number): void {
    if (!this.running) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    if (this.timing) this.runTime += dt;
    if (boosterOn(this.race)) {
      this.blinkT += dt;
      this.setLight(Math.floor(this.blinkT * BLINK_HZ) % 2 === 0);
      this.puffT -= dt;
      if (this.puffT <= 0) {
        this.puffT = PUFF_EVERY;
        this.boosterPuff();
      }
    }
    for (const e of step(this.race, dt)) {
      switch (e) {
        case 'boost':
          playSfx('vroom');
          break;
        case 'boosterOff':
          stopHum();
          this.setLight(false);
          break;
        case 'lap':
          playSfx('ding');
          this.renderPanel();
          break;
        case 'rollback':
          playSfx('squeak');
          break;
        case 'stop':
          // The laps start over, and so does the clock.
          this.runTime = 0;
          this.timing = false;
          this.renderPanel();
          void this.dialogue.sayOffscreen(stopLine(this.race.rolledBack, this.race.laps), { voice: 'theo', duration: 1800 });
          break;
        case 'win':
          void this.win();
          break;
      }
    }
    this.placeCar();
  }

  /** Puts the right car sprite where the physics says, turned to the track. */
  private placeCar(): void {
    const p = pose(this.race.s);
    if (p.inLoop) {
      // Side-on, wheels to the rail: at the bottom it faces left and upright, then it climbs
      // the left side, goes over the top upside down and comes down the right.
      const x = LOOP_CENTRE.x - LOOP_CONTACT * Math.sin(p.phi);
      const y = LOOP_CENTRE.y + LOOP_CONTACT * Math.cos(p.phi);
      this.carSide.setPosition(x, y).setRotation(p.phi).setVisible(true);
      this.carTop.setVisible(false);
      this.loopFront?.setVisible(true);
    } else {
      // Seen from above the car has a top and a bottom, so heading left it is mirrored rather than
      // turned right round, which would put it on its roof along the far straight.
      const left = Math.abs(p.angle) > Math.PI / 2;
      this.carTop
        .setPosition(Math.round(p.x), Math.round(p.y))
        .setFlipX(left)
        .setRotation(left ? p.angle + Math.PI : p.angle)
        .setVisible(true);
      this.carSide.setVisible(false);
      this.loopFront?.setVisible(false);
    }
  }

  /** A puff of exhaust off the booster's rollers, blown along the track the way it flings the car. */
  private boosterPuff(): void {
    if (!this.textures.exists('poof')) return;
    const x = Phaser.Math.Between(TRACK.booster.x0, TRACK.booster.x1);
    const y = TRACK.straight.bottom + Phaser.Math.Between(-6, 6);
    const puff = this.add.image(x, y, 'poof').setDepth(24).setScale(0.8).setAlpha(0.95);
    this.tweens.add({
      targets: puff,
      x: x + 30,
      y: y - 6,
      scale: 1.8,
      alpha: 0,
      duration: 480,
      ease: 'Quad.easeOut',
      onComplete: () => puff.destroy(),
    });
  }

  private setLight(on: boolean): void {
    if (this.lit === on) return;
    this.lit = on;
    this.drawLight();
  }

  /** The booster's lamp: dark red at rest, bright green with a glow while it runs. */
  private drawLight(): void {
    const g = this.light;
    const { x, y } = TRACK.light;
    g.clear();
    if (this.lit) {
      g.fillStyle(0x7dff6a, 0.35);
      g.fillRect(x - 5, y - 5, 12, 12);
    }
    g.fillStyle(0x000000, 1);
    g.fillRect(x - 3, y - 3, 8, 8);
    g.fillStyle(this.lit ? 0x5dff4a : 0x6a1a1a, 1);
    g.fillRect(x - 2, y - 2, 6, 6);
    g.fillStyle(this.lit ? 0xd8ffd0 : 0x8a3a3a, 1);
    g.fillRect(x - 1, y - 1, 2, 1);
  }

  private async win(): Promise<void> {
    this.running = false;
    stopHum();
    this.setLight(false);
    setCursor(this, 'wait');
    playSfx('success');
    this.timing = false;
    const time = Math.round(this.runTime * 10) / 10;
    let result: ReturnType<typeof recordResult> = 'kept';
    store.update((s) => {
      setFlag(s, FLAGS.raceDone);
      result = recordResult(s, 'race', time);
    });
    showPanel(this, { title: 'Race track', big: seconds(time) });
    await this.dialogue.sayOffscreen(`Three whole laps in ${seconds(time)}! What a race car!`, { voice: 'theo' });
    const brag = beatLine('race', result, time);
    if (brag) await this.dialogue.sayOffscreen(brag, { fill: 0xffe3f0, voice: 'lucy' });
    await this.leave(true);
  }

  /** Back to the bedroom, the car left on its track. */
  private async leave(won: boolean): Promise<void> {
    if (this.leaving) return;
    this.leaving = true;
    this.running = false;
    stopHum();
    setCursor(this, 'wait');
    await this.fade.out(FADE_MS);
    this.scene.start('Game', { afterMinigame: true, cheer: won ? 'Vroom vroom! Again!' : undefined });
  }

}
