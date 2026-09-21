import type { ItemId } from '../data/items';
import type { GameState } from '../state/GameState';
import { hasItem } from '../state/GameState';
import type { Rng } from '../systems/Rng';
import type { SfxName } from '../systems/Sfx';

export const BREAKFAST_ITEMS: readonly ItemId[] = ['spoon', 'bowl', 'cereal', 'milk'];

export type ContainerCategory = 'drawer' | 'cabinet' | 'fridge' | 'other';

export interface ContainerSpec {
  id: string;
  category: ContainerCategory;
}

export type Gag = 'frog' | 'pots' | 'mouse' | 'socks' | 'empty' | 'spider' | 'ball';
export const GAGS: readonly Gag[] = ['frog', 'pots', 'mouse', 'socks', 'empty', 'spider', 'ball'];

/**
 * How a gag leaves the kitchen once it has popped out of its cupboard. Each one goes the way
 * that thing would: the frog hops along the floor and out of the room, the mouse bolts past the
 * camera and off the bottom, the spider climbs the wall and off the top, the ball bounces away
 * to the left, the pots roll and the socks flop.
 */
export type GagExit = 'hop' | 'dash' | 'climb' | 'bounce' | 'roll' | 'flutter';

export interface GagSpec {
  /** The sprite that pops out. An empty cupboard has none, and neither has one whose art is missing. */
  key?: string;
  exit: GagExit;
  /** What it sounds like coming out. */
  sfx: SfxName;
  /** Which way the art is drawn, so it can be mirrored to face the way it goes. */
  faces?: 'left' | 'right';
  /** How big it is against the room, since the art is drawn at its own size. */
  scale?: number;
  line: string;
}

/**
 * The gags, with what Theo says and what the thing does about being found: the live ones make
 * for the nearest door, and the rest clatter or flop onto the floor and go from there.
 */
export const GAG_SPECS: Record<Gag, GagSpec> = {
  frog: { key: 'gag_frog', exit: 'hop', sfx: 'boing', faces: 'right', line: 'Whoa! A frog! How did you get in there?' },
  pots: { key: 'gag_pots', exit: 'roll', sfx: 'locked', line: 'CLANG! Just a bunch of noisy pots.' },
  mouse: { key: 'gag_mouse', exit: 'dash', sfx: 'squeak', faces: 'right', line: 'Eek! A little mouse. Hi, mouse!' },
  socks: { key: 'gag_socks', exit: 'flutter', sfx: 'open', line: 'Socks? Who keeps socks in the kitchen?' },
  empty: { exit: 'flutter', sfx: 'open', line: 'Nothing in here but crumbs.' },
  spider: { key: 'gag_spider', exit: 'climb', sfx: 'squeak', scale: 0.8, line: 'A spider! Okay, okay, you can stay.' },
  ball: { key: 'gag_ball', exit: 'bounce', sfx: 'boing', line: 'A bouncy ball... not breakfast.' },
};

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

/**
 * Gives a gag to any container that has been added to the room since the layout was written, so
 * a cupboard added in a later version is not silently empty in an old save. Returns whether
 * anything was filled in, so the caller knows to save.
 */
export function fillMissingContainers(state: BreakfastState, rng: Rng, containers: readonly ContainerSpec[]): boolean {
  const missing = containers.filter((c) => !state.placements[c.id]);
  if (!missing.length) return false;
  const pool = rng.shuffle(GAGS);
  missing.forEach((c, i) => {
    state.placements[c.id] = { type: 'decoy', gag: pool[i % pool.length] };
  });
  return true;
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
  return GAG_SPECS[gag].line;
}

/** Whether a gag's art has to be mirrored to face the way it is heading. */
export function gagFlipped(spec: GagSpec, dir: -1 | 1): boolean {
  if (!spec.faces) return false;
  return (dir > 0) !== (spec.faces === 'right');
}
