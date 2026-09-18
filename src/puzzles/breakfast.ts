import type { ItemId } from '../data/items';
import type { GameState } from '../state/GameState';
import { hasItem } from '../state/GameState';
import type { Rng } from '../systems/Rng';

export const BREAKFAST_ITEMS: readonly ItemId[] = ['spoon', 'bowl', 'cereal', 'milk'];

export type ContainerCategory = 'drawer' | 'cabinet' | 'fridge' | 'other';

export interface ContainerSpec {
  id: string;
  category: ContainerCategory;
}

export type Gag = 'frog' | 'pots' | 'mouse' | 'socks' | 'empty' | 'spider' | 'ball';
export const GAGS: readonly Gag[] = ['frog', 'pots', 'mouse', 'socks', 'empty', 'spider', 'ball'];

export type BreakfastContent = { type: 'item'; item: ItemId } | { type: 'decoy'; gag: Gag };

export interface BreakfastState {
  /** containerId -> what is inside. */
  placements: Record<string, BreakfastContent>;
  /** Containers the player has opened at least once. */
  opened: string[];
  delivered: boolean;
}

/**
 * Randomly assigns the four breakfast items to containers, honouring the spec:
 * spoon in a drawer, bowl and cereal in (distinct) cabinets, milk in the fridge.
 * Every other container gets a decoy gag.
 */
export function generateBreakfast(rng: Rng, containers: readonly ContainerSpec[]): BreakfastState {
  const drawers = containers.filter((c) => c.category === 'drawer').map((c) => c.id);
  const cabinets = containers.filter((c) => c.category === 'cabinet').map((c) => c.id);
  const fridges = containers.filter((c) => c.category === 'fridge').map((c) => c.id);
  if (drawers.length < 1 || cabinets.length < 2 || fridges.length < 1) {
    throw new Error('Breakfast puzzle needs at least 1 drawer, 2 cabinets and 1 fridge');
  }

  const placements: Record<string, BreakfastContent> = {};
  placements[rng.pick(drawers)] = { type: 'item', item: 'spoon' };
  const [bowlCab, cerealCab] = rng.shuffle(cabinets);
  placements[bowlCab] = { type: 'item', item: 'bowl' };
  placements[cerealCab] = { type: 'item', item: 'cereal' };
  placements[rng.pick(fridges)] = { type: 'item', item: 'milk' };

  const gagPool = rng.shuffle(GAGS);
  let g = 0;
  for (const c of containers) {
    if (!placements[c.id]) {
      placements[c.id] = { type: 'decoy', gag: gagPool[g % gagPool.length] };
      g++;
    }
  }

  return { placements, opened: [], delivered: false };
}

export function missingBreakfastItems(state: GameState): ItemId[] {
  return BREAKFAST_ITEMS.filter((id) => !hasItem(state, id));
}

export function hasAllBreakfastItems(state: GameState): boolean {
  return missingBreakfastItems(state).length === 0;
}

/** Lucy's line when asked what she still needs. */
export function lucyRequestLine(missing: readonly ItemId[]): string {
  const names: Record<string, string> = { spoon: 'a spoon', bowl: 'a bowl', cereal: 'the cereal', milk: 'the milk' };
  if (missing.length === 0) return "Yay, that's everything! Let's eat!";
  const list = missing.map((m) => names[m]);
  const joined = list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
  return `I'm hungry, Theo! We still need ${joined}.`;
}

export function gagLine(gag: Gag): string {
  switch (gag) {
    case 'frog':
      return 'Whoa! A frog! How did you get in there?';
    case 'pots':
      return 'CLANG! Just a bunch of noisy pots.';
    case 'mouse':
      return 'Eek! A little mouse. Hi, mouse!';
    case 'socks':
      return "Socks? Who keeps socks in the kitchen?";
    case 'empty':
      return 'Nothing in here but crumbs.';
    case 'spider':
      return 'A spider! Okay, okay, you can stay.';
    case 'ball':
      return 'A bouncy ball... not breakfast.';
  }
}
