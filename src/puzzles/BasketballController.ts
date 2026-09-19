import Phaser from 'phaser';
import type { Pt } from '../data/rooms';
import { FLAGS, getFlag, itemCount, removeItem, setFlag } from '../state/GameState';
import { store } from '../state/Store';
import { Rng } from '../systems/Rng';
import { playSfx } from '../systems/Sfx';
import { playMusic } from '../systems/Music';
import { FONT, pointerVerb, TEXT_FONT } from '../ui/text';
import type { GameScene } from '../scenes/GameScene';
import {
  BALL_RADIUS,
  BALLS_NEEDED,
  currentHoop,
  handOf,
  newBasketballGame,
  recordShot,
  shotLine,
  stepBall,
  throwBall,
  triesLeft,
  type Ball,
  type BasketballGame,
  HOOPS,
  NET_DEPTH,
  type HoopSpec,
  type Outcome,
} from './basketball';

/** The hoop game is only ever the same run once each lobby, so the ball never sits in one place. */
const METER_W = 10;
const METER_H = 72;
/** Where Lucy watches from, relative to Theo's shooting spot. */
const LUCY_OFFSET: Pt = { x: -62, y: 6 };
/** Largest step the ball physics takes; a slow frame is split rather than letting the ball tunnel through the rim. */
const MAX_STEP = 1 / 90;
/** How far the ball shrinks over its flight, so it reads as going away toward the hoop. */
const FAR_SCALE = 0.72;
/**
 * Draw order around the hoops. The rims and nets are cut out of the court art and drawn again at
 * NET_LAYER, so a ball dropping through sits behind them and everything else in front.
 */
const NET_LAYER = 6;
/** Theo turned toward the hoops: frame 0 holds the ball up, frame 1 is the follow-through with no ball. */
const SHOOT_SHEET = 'theo_shoot';
const BALL_BEHIND_NET = NET_LAYER - 1;
const BALL_IN_FRONT = NET_LAYER + 1;

type Phase = 'idle' | 'aim' | 'charge' | 'flight' | 'between';

/**
 * Runs the hoop mini-game inside the Sport Court. Hold the pointer to wind up, let go to shoot;
 * the ball flies to the current hoop and the pure module decides whether it went in.
 */
export class BasketballController {
  private game: BasketballGame | null = null;
  private phase: Phase = 'idle';
  private power = 0;
  private meterDir = 1;
  private ball: Ball | null = null;
  private ballImage?: Phaser.GameObjects.Image;
  private meter?: Phaser.GameObjects.Graphics;
  private panel?: Phaser.GameObjects.Container;
  private rng = new Rng(1);
  /** Playing again after the hoops have already been beaten: the balls live at the court now. */
  private replay = false;
  /** Objects that live for the whole game, cleared together when it ends. */
  private objects: Phaser.GameObjects.GameObject[] = [];

  constructor(private scene: GameScene) {}

  get active(): boolean {
    return this.phase !== 'idle';
  }

  /**
   * Clicking a hoop: play if the balls are all here, otherwise explain what is missing. Once the
   * hoops have been beaten the balls stay at the court, so the game can be played again any time.
   */
  async hoopClicked(): Promise<void> {
    if (this.active) return;
    const state = store.get();
    const replay = getFlag(state, FLAGS.basketballDone);
    const n = itemCount(state, 'basketball');
    if (!replay && n < BALLS_NEEDED) {
      playSfx('locked');
      if (n === 0) await this.scene.sayTheo('I need basketballs to play! I think there are some around the house.');
      else await this.scene.sayTheo(`I've got ${n === 1 ? 'one basketball' : 'two basketballs'}, but I need three.`);
      return;
    }
    if (replay) await this.scene.sayLucy('Basketball again? Yay!');
    await this.start(replay);
  }

  private async start(replay: boolean): Promise<void> {
    this.replay = replay;
    const seed = store.get().seed;
    this.rng = new Rng(seed).fork(`basketball:${Date.now()}`);
    this.game = newBasketballGame(new Rng(seed).fork('basketball'));
    this.phase = 'between';
    playMusic('minigame');
    this.scene.capturePointer({ down: () => this.onDown(), up: () => this.onUp() });
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.meter = this.scene.add.graphics().setDepth(960);
    this.objects.push(this.meter);
    for (const hoop of HOOPS) {
      if (!this.scene.textures.exists(hoop.net.key)) continue;
      this.objects.push(this.scene.add.image(hoop.net.x, hoop.net.y, hoop.net.key).setOrigin(0).setDepth(NET_LAYER));
    }
    await this.takePosition();
    if (!replay) await this.scene.sayLucy(`${pointerVerb() === 'Tap' ? 'Touch' : 'Press'} and hold to wind up, let go to shoot!`);
    this.beginAttempt();
  }

  /** Theo walks to his spot for the current hoop; Lucy stands off to his left to watch. */
  private async takePosition(): Promise<void> {
    if (!this.game) return;
    const stand = this.game.stands[this.game.hoop];
    await Promise.all([this.scene.moveTheo(stand), this.scene.moveLucy({ x: stand.x + LUCY_OFFSET.x, y: stand.y + LUCY_OFFSET.y })]);
    this.scene.lucy?.face(1);
    this.renderPanel();
  }

  /** Whether the drawn shooting pose exists; without it the ball is drawn at his hands instead. */
  private get posed(): boolean {
    return this.scene.textures.exists(SHOOT_SHEET);
  }

  private beginAttempt(): void {
    if (!this.game) return;
    const hand = handOf(this.game.stands[this.game.hoop]);
    this.ballImage?.destroy();
    this.ballImage = undefined;
    // The pose already has the ball in his hands; the separate ball only appears when he lets go.
    if (this.posed) this.scene.theo.pose(SHOOT_SHEET, 0);
    else this.ballImage = this.scene.add.image(hand.x, hand.y, 'item_basketball').setDepth(this.scene.theo.y + 1);
    this.power = 0;
    this.meterDir = 1;
    this.phase = 'aim';
    this.renderPanel();
    this.drawMeter();
  }

  private onDown(): void {
    if (this.phase !== 'aim') return;
    this.phase = 'charge';
    this.power = 0;
    this.meterDir = 1;
    playSfx('click');
  }

  private onUp(): void {
    if (this.phase !== 'charge' || !this.game) return;
    this.phase = 'flight';
    const hand = handOf(this.game.stands[this.game.hoop]);
    this.ball = throwBall(hand, this.power);
    if (this.posed) {
      this.scene.theo.pose(SHOOT_SHEET, 1);
      this.ballImage = this.scene.add.image(hand.x, hand.y, 'item_basketball').setDepth(this.scene.theo.y + 1);
    }
    playSfx('boing');
    // A little hop as the ball leaves his hands.
    const sprite = this.scene.theo.sprite;
    this.scene.tweens.add({ targets: sprite, y: sprite.y - 8, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
  }

  private update(_time: number, deltaMs: number): void {
    if (!this.game) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    const hoop = currentHoop(this.game);
    if (this.phase === 'charge') {
      this.power += (this.meterDir * dt) / hoop.meterSeconds;
      if (this.power >= 1) {
        this.power = 1;
        this.meterDir = -1;
      } else if (this.power <= 0) {
        this.power = 0;
        this.meterDir = 1;
      }
      // The ball lifts a touch as he winds up (the whole pose, when he is drawn holding it).
      const hand = handOf(this.game.stands[this.game.hoop]);
      const lift = Math.round(this.power * 6);
      if (this.posed) this.scene.theo.sprite.setY(this.game.stands[this.game.hoop].y - lift);
      else this.ballImage?.setPosition(hand.x, hand.y - lift);
      this.drawMeter();
    } else if (this.phase === 'flight' && this.ball) {
      const ball = this.ball;
      let left = dt;
      while (left > 0 && ball.phase !== 'done') {
        const step = Math.min(left, MAX_STEP);
        stepBall(ball, hoop, step);
        left -= step;
      }
      this.placeBall(ball, hoop);
      if (ball.phase === 'done') void this.finishShot(ball.outcome ?? 'short');
      else if (ball.outcome === 'made' && ball.phase === 'net' && this.ballImage && !this.ballImage.getData('swished')) {
        this.ballImage.setData('swished', true);
        this.swish(hoop);
      }
    }
  }

  private placeBall(ball: Ball, hoop: HoopSpec): void {
    if (!this.ballImage || !this.game) return;
    const from = handOf(this.game.stands[this.game.hoop]);
    const travelled = Phaser.Math.Clamp((ball.x - from.x) / (hoop.rim.x - from.x), 0, 1);
    this.ballImage.setPosition(Math.round(ball.x), Math.round(ball.y)).setScale(1 - (1 - FAR_SCALE) * travelled);
    // In front of Theo while it is still near him; once it has gone in, behind the rim and net
    // until it has dropped out of the bottom of the net.
    const inNet = ball.outcome === 'made' && ball.y < hoop.rim.y + NET_DEPTH + BALL_RADIUS;
    this.ballImage.setDepth(inNet ? BALL_BEHIND_NET : travelled < 0.5 ? this.scene.theo.y + 1 : BALL_IN_FRONT);
  }

  private swish(hoop: HoopSpec): void {
    playSfx('success');
    this.scene.lucy?.celebrate();
    const text = this.scene.add.text(hoop.rim.x, hoop.rim.y - 30, 'SWISH!', { ...FONT, color: '#fff3b0', stroke: '#3a1d00', strokeThickness: 4 }).setOrigin(0.5).setDepth(970);
    this.scene.tweens.add({ targets: text, y: text.y - 24, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => text.destroy() });
  }

  private async finishShot(outcome: Outcome): Promise<void> {
    if (!this.game || this.phase !== 'flight') return;
    this.phase = 'between';
    this.ball = null;
    // The reading stays up while the ball flies, then goes away until the next wind-up.
    this.meter?.setVisible(false);
    const img = this.ballImage;
    this.ballImage = undefined;
    if (img) this.scene.tweens.add({ targets: img, alpha: 0, duration: 350, delay: 250, onComplete: () => img.destroy() });
    if (outcome !== 'made') playSfx('locked');
    const progress = recordShot(this.game, outcome);
    this.renderPanel();
    await this.scene.sayTheo(shotLine(outcome, this.rng));
    switch (progress) {
      case 'again':
        this.beginAttempt();
        return;
      case 'next':
        await this.scene.sayLucy(`Now the ${currentHoop(this.game).name}!`);
        await this.takePosition();
        this.beginAttempt();
        return;
      case 'won':
        await this.win();
        return;
      case 'lost':
        await this.scene.sayLucy("Aww, no basket that time. Let's catch our breath and try again!");
        this.stop();
        await this.scene.sayTheo(`${pointerVerb()} a hoop when we're ready to try again.`);
        return;
    }
  }

  private async win(): Promise<void> {
    const replay = this.replay;
    if (!replay) {
      store.update((s) => {
        removeItem(s, 'basketball', itemCount(s, 'basketball'));
        setFlag(s, FLAGS.basketballDone);
      });
    }
    playSfx('success');
    this.scene.lucy?.celebrate();
    this.stop();
    if (replay) {
      await this.scene.sayLucy('Every hoop again! You are so good at this!');
      await this.scene.sayTheo(`${pointerVerb()} a hoop whenever you want another game.`);
      return;
    }
    await this.scene.sayLucy('Yay! You got every hoop!');
    await this.scene.sayTheo("That was fun! Let's go to the playground next. It's just past the playhouse. We can play here again any time.");
  }

  /** Small card in the corner: which hoop, and a ball for every try left at it. */
  private renderPanel(): void {
    if (!this.game) return;
    this.panel?.destroy();
    const hoop = currentHoop(this.game);
    const tries = triesLeft(this.game);
    const label = this.scene.add.text(8, 6, `The ${hoop.name}`, { ...TEXT_FONT, color: '#fff3b0' }).setOrigin(0);
    const balls: Phaser.GameObjects.GameObject[] = [];
    for (let i = 0; i < tries; i++) balls.push(this.scene.add.image(14 + i * 22, 30, 'item_basketball').setScale(0.8));
    const w = Math.max(label.width, 22 * 3) + 16;
    const bg = this.scene.add.rectangle(0, 0, w, 42, 0x000000, 0.55).setOrigin(0);
    this.panel = this.scene.add.container(4, 4, [bg, label, ...balls]).setDepth(960);
    this.objects.push(this.panel);
  }

  private drawMeter(): void {
    if (!this.meter || !this.game) return;
    const stand = this.game.stands[this.game.hoop];
    const x = stand.x - 34;
    const top = stand.y - 100;
    const g = this.meter;
    g.clear();
    g.setVisible(this.phase === 'aim' || this.phase === 'charge');
    g.fillStyle(0x000000, 1);
    g.fillRect(x - 2, top - 2, METER_W + 4, METER_H + 4);
    g.fillStyle(0x3b2a1a, 1);
    g.fillRect(x, top, METER_W, METER_H);
    const h = Math.round(this.power * METER_H);
    const colour = this.power < 0.45 ? 0x5dc05a : this.power < 0.75 ? 0xf2c14e : 0xd94b3a;
    g.fillStyle(colour, 1);
    g.fillRect(x, top + METER_H - h, METER_W, h);
    // Tick marks every quarter, so a reading can be remembered.
    g.fillStyle(0x000000, 0.5);
    for (let i = 1; i < 4; i++) g.fillRect(x, top + Math.round((METER_H * i) / 4), METER_W, 1);
  }

  /** Ends the game, in whatever state it is in, and gives the room back to the player. */
  stop(): void {
    if (this.phase === 'idle') return;
    this.phase = 'idle';
    if (this.game) this.scene.theo.setPosition(this.game.stands[this.game.hoop].x, this.game.stands[this.game.hoop].y);
    this.scene.theo.idle();
    this.game = null;
    this.ball = null;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.scene.capturePointer(null);
    if (this.scene.scene.isActive()) playMusic('main');
    this.ballImage?.destroy();
    this.ballImage = undefined;
    for (const o of this.objects) o.destroy();
    this.objects = [];
    this.meter = undefined;
    this.panel = undefined;
  }
}
