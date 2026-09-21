import type Phaser from 'phaser';
import { kitchenContainers } from '../data/rooms/kitchen';
import type { ContainerHotspot } from '../data/rooms';
import { ITEMS } from '../data/items';
import { addItem, FLAGS, isPickedUp, markPickedUp, removeItem, setFlag } from '../state/GameState';
import { store } from '../state/Store';
import { Rng } from '../systems/Rng';
import { playSfx } from '../systems/Sfx';
import { BREAKFAST_ITEMS, fillMissingContainers, gagFlipped, gagLine, GAG_SPECS, generateBreakfast, hasAllBreakfastItems, lucyRequestLine, missingBreakfastItems, type Gag, type BreakfastState } from './breakfast';
import { GAME_WIDTH, SCENE_HEIGHT } from '../config';
import type { GameScene } from '../scenes/GameScene';

/** The kitchen floor in front of the units: where something that jumps out lands. */
const GAG_FLOOR = 372;
/** Over the room but under the speech bubbles. */
const GAG_DEPTH = 880;
/** The most hops or bounces before a gag is given up on and taken off the floor. */
const MAX_STEPS = 30;
/** How the frog springs: how far and how high a hop, and how long one takes. */
const HOP = { step: 44, height: 26, ms: 260 };
/** How the mouse bolts at the camera: how long it takes, how far it veers, and how much it grows. */
const DASH = { ms: 760, drift: 60, grow: 1.7 };
/** How long the spider takes to climb out of sight. */
const CLIMB = { ms: 1300 };
/** How the ball bounces away: the first bounce's height, what each one keeps, and where it gives up. */
const BOUNCE = { height: 36, least: 5, decay: 0.62, step: 66, ms: 320 };
const ROLL = { ms: 1200 };
const FLOP = { ms: 900 };

/** Where the empty bowl and spoon sit on the kitchen table once Lucy has eaten (icon centres). */
const TABLE_SETTING = { bowl: { x: 484, y: 221 }, spoon: { x: 506, y: 221 } };
/** The table's front edge, so the setting draws over the tabletop but behind anyone standing in front. */
const TABLE_DEPTH = 230;
/** How far from Lucy Theo stops to hand breakfast over. */
const HANDOVER_GAP = 52;

/** Glue between the pure breakfast puzzle logic and the Kitchen scene. */
export class BreakfastController {
  constructor(private scene: GameScene) {}

  /** Called once the kitchen is drawn: the table is already set if breakfast was eaten earlier. */
  roomBuilt(): void {
    if (store.get().puzzles.breakfast?.delivered) this.setTable();
  }

  /** The empty bowl and spoon left on the table: the sign that Lucy has had her breakfast. */
  private setTable(): void {
    for (const [item, at] of Object.entries(TABLE_SETTING)) {
      const key = `item_${item}`;
      if (!this.scene.textures.exists(key)) continue;
      this.scene.keepInRoom(this.scene.add.image(at.x, at.y, key).setDepth(TABLE_DEPTH));
    }
  }

  /** Creates the randomized layout on first visit, seeded from the save so reloads keep it. */
  ensureState(): BreakfastState {
    let st = store.get().puzzles.breakfast;
    if (!st) {
      store.update((s) => {
        s.puzzles.breakfast = generateBreakfast(new Rng(s.seed).fork('breakfast'), kitchenContainers);
      });
      st = store.get().puzzles.breakfast!;
    } else if (kitchenContainers.some((c) => !st!.placements[c.id])) {
      // A save written before a cupboard was added to the room: give the new one something.
      store.update((s) => {
        fillMissingContainers(s.puzzles.breakfast!, new Rng(s.seed).fork('breakfast:added'), kitchenContainers);
      });
      st = store.get().puzzles.breakfast!;
    }
    return st;
  }

  isOpened(id: string): boolean {
    return this.ensureState().opened.includes(id);
  }

  /** Called after Theo has walked to the container. */
  async openContainer(c: ContainerHotspot): Promise<void> {
    const st = this.ensureState();
    const content = st.placements[c.id];
    const firstTime = !st.opened.includes(c.id);
    store.update((s) => {
      const b = s.puzzles.breakfast!;
      if (!b.opened.includes(c.id)) b.opened.push(c.id);
    });
    playSfx('open');
    this.scene.showContainerOpen(c.id);

    const state = store.get();
    if (content?.type === 'item' && !isPickedUp(state, 'kitchen', c.id)) {
      const def = ITEMS[content.item];
      await this.scene.popItem(content.item, c.zone.x + c.zone.w / 2, c.zone.y + c.zone.h / 2);
      store.update((s) => {
        addItem(s, content.item);
        markPickedUp(s, 'kitchen', c.id);
      });
      playSfx('pickup');
      await this.scene.sayTheo(`Found the ${def.name.toLowerCase()}!`);
      if (hasAllBreakfastItems(store.get())) {
        await this.scene.sayTheo("That's everything for breakfast. Let's bring it to Lucy!");
        // He carries it straight over to her rather than waiting to be told.
        await this.walkToLucy();
        await this.deliver();
      }
    } else if (content?.type === 'decoy' && firstTime) {
      playSfx(GAG_SPECS[content.gag].sfx);
      // It bolts for the door while Theo is still talking about it.
      void this.runGag(content.gag, c.zone.x + c.zone.w / 2, c.zone.y + c.zone.h / 2);
      await this.scene.sayTheo(gagLine(content.gag));
    } else {
      await this.scene.sayTheo('Nothing else in there.');
    }
  }

  /**
   * What was in the cupboard pops out and leaves the kitchen the way its kind would. A gag with
   * no art (or none drawn yet) simply keeps to Theo's line.
   */
  private async runGag(gag: Gag, x: number, y: number): Promise<void> {
    const spec = GAG_SPECS[gag];
    const scene = this.scene;
    if (!spec.key || !scene.textures.exists(spec.key)) return;
    const full = spec.scale ?? 1;
    const img = scene.add.image(x, y, spec.key).setDepth(GAG_DEPTH).setScale(full * 0.3);
    scene.keepInRoom(img);
    // Whatever runs along the floor heads for whichever side of the kitchen it is nearer.
    const dir: 1 | -1 = x < GAME_WIDTH / 2 ? -1 : 1;
    img.setFlipX(gagFlipped(spec, dir));
    await this.tween(img, { y: y - 20, scale: full }, 220, 'Back.easeOut');
    if (!img.scene) return;
    switch (spec.exit) {
      case 'hop':
        await this.hopAway(img, dir, full);
        break;
      case 'dash':
        await this.dashPastCamera(img, dir, full);
        break;
      case 'climb':
        await this.climbAway(img);
        break;
      case 'bounce':
        await this.bounceAway(img);
        break;
      case 'roll':
        await this.rollAway(img, dir);
        break;
      case 'flutter':
        await this.flopAway(img, dir);
        break;
    }
    if (!img.scene) return;
    scene.tweens.killTweensOf(img);
    img.destroy();
  }

  /** Lands on the floor, then hops out of the room, squashing down before each spring. */
  private async hopAway(img: Phaser.GameObjects.Image, dir: -1 | 1, full: number): Promise<void> {
    await this.tween(img, { y: GAG_FLOOR }, 220, 'Quad.easeIn');
    for (let i = 0; i < MAX_STEPS && img.scene && img.x > -HOP.step && img.x < GAME_WIDTH + HOP.step; i++) {
      await this.tween(img, { scaleX: full * 1.2, scaleY: full * 0.8 }, 90, 'Quad.easeOut');
      if (!img.scene) return;
      // The spring and the flight happen together: it stretches as it leaves the floor.
      this.scene.tweens.add({ targets: img, y: GAG_FLOOR - HOP.height, duration: HOP.ms / 2, yoyo: true, ease: 'Quad.easeOut' });
      this.scene.tweens.add({ targets: img, scaleX: full, scaleY: full, duration: HOP.ms / 3, ease: 'Quad.easeOut' });
      await this.tween(img, { x: img.x + HOP.step * dir }, HOP.ms, 'Linear');
    }
  }

  /** Drops to the floor and bolts straight past the camera, growing as it comes. */
  private async dashPastCamera(img: Phaser.GameObjects.Image, dir: -1 | 1, full: number): Promise<void> {
    await this.tween(img, { y: GAG_FLOOR }, 200, 'Quad.easeIn');
    if (!img.scene) return;
    // Little legs going, and bigger the nearer it gets.
    this.scene.tweens.add({ targets: img, angle: dir * 7, duration: 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: img, scale: full * DASH.grow, duration: DASH.ms, ease: 'Quad.easeIn' });
    await this.tween(img, { x: img.x + dir * DASH.drift, y: SCENE_HEIGHT + 80 }, DASH.ms, 'Quad.easeIn');
  }

  /** Straight up the wall from the cupboard and off the top, legs working all the way. */
  private async climbAway(img: Phaser.GameObjects.Image): Promise<void> {
    this.scene.tweens.add({ targets: img, angle: 9, duration: 110, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    await this.tween(img, { y: -img.displayHeight }, CLIMB.ms, 'Linear');
  }

  /** Bounces away to the left, each bounce lower than the last, and rolls out of the room. */
  private async bounceAway(img: Phaser.GameObjects.Image): Promise<void> {
    await this.tween(img, { y: GAG_FLOOR }, 240, 'Quad.easeIn');
    let height = BOUNCE.height;
    for (let i = 0; i < MAX_STEPS && img.scene && img.x > 0 && height > BOUNCE.least; i++) {
      this.scene.tweens.add({ targets: img, y: GAG_FLOOR - height, duration: BOUNCE.ms / 2, yoyo: true, ease: 'Quad.easeOut' });
      this.scene.tweens.add({ targets: img, angle: img.angle - 120, duration: BOUNCE.ms, ease: 'Linear' });
      await this.tween(img, { x: img.x - BOUNCE.step }, BOUNCE.ms, 'Linear');
      height *= BOUNCE.decay;
    }
    if (!img.scene) return;
    // The last bounce can already have carried it out of the room; the roll must never pull it back.
    const exit = -img.displayWidth;
    if (img.x > exit) await this.tween(img, { x: exit, angle: img.angle - 200 }, 400, 'Linear');
  }

  /** Clatters onto the floor and rolls off, spinning. */
  private async rollAway(img: Phaser.GameObjects.Image, dir: -1 | 1): Promise<void> {
    await this.tween(img, { y: GAG_FLOOR }, 240, 'Quad.easeIn');
    if (!img.scene) return;
    this.scene.tweens.add({ targets: img, angle: dir * 540, duration: ROLL.ms, ease: 'Linear' });
    await this.tween(img, { x: this.offscreenX(img, dir) }, ROLL.ms, 'Linear');
  }

  /** No legs to run on: socks see-saw down to the floor and scoot off. */
  private async flopAway(img: Phaser.GameObjects.Image, dir: -1 | 1): Promise<void> {
    await this.tween(img, { y: GAG_FLOOR, angle: dir * 20 }, 700, 'Sine.easeIn');
    if (!img.scene) return;
    this.scene.tweens.add({ targets: img, y: GAG_FLOOR - 4, duration: 110, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
    await this.tween(img, { x: this.offscreenX(img, dir) }, FLOP.ms, 'Linear');
  }

  private offscreenX(img: Phaser.GameObjects.Image, dir: -1 | 1): number {
    return dir < 0 ? -img.displayWidth : GAME_WIDTH + img.displayWidth;
  }

  private tween(target: Phaser.GameObjects.Image, props: Record<string, number>, duration: number, ease: string): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({ targets: target, ...props, duration, ease, onComplete: () => resolve() });
    });
  }

  async talkToLucy(): Promise<void> {
    const st = this.ensureState();
    const state = store.get();
    if (st.delivered) {
      await this.scene.sayLucy('That was yummy! Can we go play outside now?');
      return;
    }
    if (hasAllBreakfastItems(state)) {
      // Only reachable from a save made with everything in the backpack: the walk-in delivers otherwise.
      await this.walkToLucy();
      await this.deliver();
      return;
    }
    await this.scene.sayLucy(lucyRequestLine(missingBreakfastItems(state)));
  }

  /** Theo goes and stands beside Lucy, on whichever side of her he is already on. */
  private async walkToLucy(): Promise<void> {
    const lucy = this.scene.lucy;
    if (!lucy) return;
    const side = this.scene.theo.x < lucy.x ? -1 : 1;
    await this.scene.moveTheo({ x: lucy.x + side * HANDOVER_GAP, y: lucy.y - 2 });
  }

  /** Hands breakfast over: the things leave the backpack, the bowl and spoon land on the table, and Lucy eats. */
  private async deliver(): Promise<void> {
    store.update((s) => {
      for (const id of BREAKFAST_ITEMS) removeItem(s, id);
      s.puzzles.breakfast!.delivered = true;
      setFlag(s, FLAGS.breakfastDone);
    });
    playSfx('success');
    this.setTable();
    await this.scene.sayLucy("Yay! Breakfast! Crunch crunch crunch...");
    await this.scene.sayLucy("All done! Let's go outside and play basketball!");
    await this.scene.sayTheo('The back door is locked though. I wonder where Mom put the key...');
  }
}
