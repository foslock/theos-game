import type Phaser from 'phaser';
import { kitchenContainers } from '../data/rooms/kitchen';
import type { ContainerHotspot } from '../data/rooms';
import { ITEMS } from '../data/items';
import { addItem, FLAGS, isPickedUp, markPickedUp, removeItem, setFlag } from '../state/GameState';
import { store } from '../state/Store';
import { Rng } from '../systems/Rng';
import { playSfx } from '../systems/Sfx';
import { BREAKFAST_ITEMS, dropUnknownGags, fillMissingContainers, gagFlipped, gagLine, GAG_SPECS, generateBreakfast, hasAllBreakfastItems, lucyRequestLine, missingBreakfastItems, type Gag, type GagSprite, type BreakfastState } from './breakfast';
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
/**
 * The lap of the floor it runs first. The circle is drawn flat, so it is an ellipse: `rx` across
 * and the shallower `ry` up and down, the way a ring on the ground looks from here.
 */
const CIRCLE = { rx: 34, ry: 15, ms: 780 };
/** How long the spider takes to climb out of sight. */
const CLIMB = { ms: 1300 };
/** How the ball bounces away: the first bounce's height, what each one keeps, and where it gives up. */
const BOUNCE = { height: 36, least: 5, decay: 0.62, step: 66, ms: 320 };

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
    } else {
      // A save written against an older kitchen: fill any cupboard that has been added since,
      // and empty any that holds a gag the game has dropped.
      store.update((s) => {
        const b = s.puzzles.breakfast!;
        fillMissingContainers(b, new Rng(s.seed).fork('breakfast:added'), kitchenContainers);
        dropUnknownGags(b);
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
   * What was in the cupboard pops out and leaves the kitchen the way its kind would. A gag that
   * is only a noise (the pots, a bare cupboard), or one whose art is not drawn yet, keeps to
   * Theo's line and puts nothing on screen.
   */
  private async runGag(gag: Gag, x: number, y: number): Promise<void> {
    const sprite = GAG_SPECS[gag].sprite;
    const scene = this.scene;
    if (!sprite || !scene.textures.exists(sprite.key)) return;
    const full = sprite.scale ?? 1;
    const img = scene.add.image(x, y, sprite.key).setDepth(GAG_DEPTH).setScale(full * 0.3);
    scene.keepInRoom(img);
    // Whatever runs along the floor heads for whichever side of the kitchen it is nearer.
    const dir: 1 | -1 = x < GAME_WIDTH / 2 ? -1 : 1;
    img.setFlipX(gagFlipped(sprite, dir));
    await this.tween(img, { y: y - 20, scale: full }, 220, 'Back.easeOut');
    if (!img.scene) return;
    switch (sprite.exit) {
      case 'hop':
        await this.hopAway(img, dir, full);
        break;
      case 'dash':
        await this.dashPastCamera(img, sprite, dir, full);
        break;
      case 'climb':
        await this.climbAway(img);
        break;
      case 'bounce':
        await this.bounceAway(img);
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

  /**
   * Drops to the floor, tears round in one panicked circle, then bolts straight past the camera,
   * growing as it comes.
   */
  private async dashPastCamera(img: Phaser.GameObjects.Image, sprite: GagSprite, dir: -1 | 1, full: number): Promise<void> {
    await this.tween(img, { y: GAG_FLOOR }, 200, 'Quad.easeIn');
    if (!img.scene) return;
    // Little legs going, all the way out of the room.
    this.scene.tweens.add({ targets: img, angle: dir * 7, duration: 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    await this.circleOnFloor(img, sprite, dir);
    if (!img.scene) return;
    // Bigger the nearer it gets.
    this.scene.tweens.add({ targets: img, scale: full * DASH.grow, duration: DASH.ms, ease: 'Quad.easeIn' });
    await this.tween(img, { x: img.x + dir * DASH.drift, y: SCENE_HEIGHT + 80 }, DASH.ms, 'Quad.easeIn');
  }

  /**
   * One quick lap of the floor from where it is standing, and back to the same spot. The circle
   * sits to the side it will leave by, so it sets off towards the camera and comes round; the
   * sprite turns to face whichever way it is running at the time.
   */
  private circleOnFloor(img: Phaser.GameObjects.Image, sprite: GagSprite, dir: -1 | 1): Promise<void> {
    const cx = img.x + dir * CIRCLE.rx;
    const cy = img.y;
    // Starting on the near side of the circle, it runs towards the camera first either way.
    const start = dir < 0 ? 0 : Math.PI;
    const sweep = (dir < 0 ? 1 : -1) * Math.PI * 2;
    const lap = { t: 0 };
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: lap,
        t: 1,
        duration: CIRCLE.ms,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (!img.scene) return;
          const a = start + sweep * lap.t;
          img.setPosition(cx + Math.cos(a) * CIRCLE.rx, cy + Math.sin(a) * CIRCLE.ry);
          // Its heading is the tangent; the sign of that is all the facing needs.
          img.setFlipX(gagFlipped(sprite, -Math.sin(a) * sweep > 0 ? 1 : -1));
        },
        onComplete: () => resolve(),
      });
    });
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
