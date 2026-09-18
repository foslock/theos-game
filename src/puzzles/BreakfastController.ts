import { kitchenContainers } from '../data/rooms/kitchen';
import type { ContainerHotspot } from '../data/rooms';
import { ITEMS } from '../data/items';
import { addItem, FLAGS, isPickedUp, markPickedUp, removeItem, setFlag } from '../state/GameState';
import { store } from '../state/Store';
import { Rng } from '../systems/Rng';
import { playSfx } from '../systems/Sfx';
import { BREAKFAST_ITEMS, gagLine, generateBreakfast, hasAllBreakfastItems, lucyRequestLine, missingBreakfastItems, type BreakfastState } from './breakfast';
import type { GameScene } from '../scenes/GameScene';

/** Glue between the pure breakfast puzzle logic and the Kitchen scene. */
export class BreakfastController {
  constructor(private scene: GameScene) {}

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
      }
    } else if (content?.type === 'decoy' && firstTime) {
      playSfx('boing');
      await this.scene.sayTheo(gagLine(content.gag));
    } else {
      await this.scene.sayTheo('Nothing else in there.');
    }
  }

  async talkToLucy(): Promise<void> {
    const st = this.ensureState();
    const state = store.get();
    if (st.delivered) {
      await this.scene.sayLucy('That was yummy! Can we go play outside now?');
      return;
    }
    if (hasAllBreakfastItems(state)) {
      store.update((s) => {
        for (const id of BREAKFAST_ITEMS) removeItem(s, id);
        s.puzzles.breakfast!.delivered = true;
        setFlag(s, FLAGS.breakfastDone);
      });
      playSfx('success');
      await this.scene.sayLucy("Yay! Breakfast! Crunch crunch crunch...");
      await this.scene.sayLucy("All done! Let's go outside and play basketball!");
      await this.scene.sayTheo('The back door is locked though. I wonder where Mom put the key...');
      return;
    }
    await this.scene.sayLucy(lucyRequestLine(missingBreakfastItems(state)));
  }
}
