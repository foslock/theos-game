import type Phaser from 'phaser';
import { kitchenContainers } from '../data/rooms/kitchen';
import type { ContainerHotspot } from '../data/rooms';
import { ITEMS } from '../data/items';
import { addItem, FLAGS, isPickedUp, markPickedUp, removeItem, setFlag } from '../state/GameState';
import { store } from '../state/Store';
import { Rng } from '../systems/Rng';
import { playSfx } from '../systems/Sfx';
import { BREAKFAST_ITEMS, gagLine, GAG_SPECS, generateBreakfast, hasAllBreakfastItems, lucyRequestLine, missingBreakfastItems, type Gag, type GagExit, type BreakfastState } from './breakfast';
import { GAME_WIDTH } from '../config';
import type { GameScene } from '../scenes/GameScene';

/** The kitchen floor in front of the units: where something that jumps out lands. */
const GAG_FLOOR = 372;
/** Over the room but under the speech bubbles. */
const GAG_DEPTH = 880;
/**
 * The run for the door, by what popped out: how long it takes to cross the kitchen, how high it
 * hops on the way (a scurry barely leaves the floor) and how much it spins doing it.
 */
const GAG_TRAVEL: Record<GagExit, { ms: number; hop: number; spin: number }> = {
  hop: { ms: 1100, hop: 30, spin: 0 },
  scurry: { ms: 700, hop: 3, spin: 0 },
  bounce: { ms: 1000, hop: 22, spin: 360 },
  roll: { ms: 1200, hop: 0, spin: 540 },
  flutter: { ms: 900, hop: 4, spin: 0 },
};

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
   * What was in the cupboard pops out, drops to the floor and leaves the kitchen the way its
   * kind does. A gag with no art (or none drawn yet) simply keeps to Theo's line.
   */
  private async runGag(gag: Gag, x: number, y: number): Promise<void> {
    const spec = GAG_SPECS[gag];
    const scene = this.scene;
    if (!spec.key || !scene.textures.exists(spec.key)) return;
    const full = spec.scale ?? 1;
    const img = scene.add.image(x, y, spec.key).setDepth(GAG_DEPTH).setScale(full * 0.3);
    scene.keepInRoom(img);
    // It heads for whichever side of the kitchen it is nearer.
    const dir: 1 | -1 = x < GAME_WIDTH / 2 ? -1 : 1;
    img.setFlipX(dir < 0);
    await this.tween(img, { y: y - 20, scale: full }, 220, 'Back.easeOut');
    if (!img.scene) return;
    // Socks have no legs: they see-saw down instead of landing on their feet.
    if (spec.exit === 'flutter') await this.tween(img, { y: GAG_FLOOR, angle: dir * 20 }, 700, 'Sine.easeIn');
    else await this.tween(img, { y: GAG_FLOOR }, 240, 'Quad.easeIn');
    if (!img.scene) return;
    const travel = GAG_TRAVEL[spec.exit];
    if (travel.hop) scene.tweens.add({ targets: img, y: GAG_FLOOR - travel.hop, duration: Math.max(120, travel.ms / 5), yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
    if (travel.spin) scene.tweens.add({ targets: img, angle: dir * travel.spin, duration: travel.ms, ease: 'Linear' });
    await this.tween(img, { x: dir < 0 ? -img.displayWidth : GAME_WIDTH + img.displayWidth }, travel.ms, 'Linear');
    if (!img.scene) return;
    scene.tweens.killTweensOf(img);
    img.destroy();
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
