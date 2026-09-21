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

export type Gag = 'frog' | 'pots' | 'mouse' | 'empty' | 'spider' | 'ball';
export const GAGS: readonly Gag[] = ['frog', 'pots', 'mouse', 'empty', 'spider', 'ball'];

/**
 * How a gag leaves the kitchen once it has popped out of its cupboard. Each one goes the way
 * that thing would: the frog hops along the floor and out of the room, the mouse tears round in
 * two panicked circles and then bolts past the camera and off the bottom, the spider climbs the
 * wall and off the top, and the ball bounces away to the left.
 */
export type GagExit = 'hop' | 'dash' | 'climb' | 'bounce';

/** What a gag puts on screen. A gag without one is heard and talked about but never seen. */
export interface GagSprite {
  key: string;
  exit: GagExit;
  /** Which way the art is drawn, so it can be mirrored to face the way it goes. */
  faces?: 'left' | 'right';
  /** How big it is against the room, since the art is drawn at its own size. */
  scale?: number;
}

export interface GagSpec {
  /** Left out for the gags that are only a noise and a line: an empty cupboard, a clatter of pots. */
  sprite?: GagSprite;
  /** What it sounds like coming out. */
  sfx: SfxName;
  line: string;
}

/**
 * The gags, with what Theo says and what the thing does about being found. The live ones bolt
 * for the way out that suits them; the pots are heard and never seen, and an empty cupboard is
 * just the line.
 */
export const GAG_SPECS: Record<Gag, GagSpec> = {
  // Drawn facing left: his tongue and his lean are to the left, so a leftward hop needs no mirror.
  frog: { sprite: { key: 'gag_frog', exit: 'hop', faces: 'left' }, sfx: 'boing', line: 'Whoa! A frog! How did you get in there?' },
  // A clatter from inside the cupboard: nothing comes out, so there is nothing to draw.
  pots: { sfx: 'locked', line: 'CLANG! Just a bunch of noisy pots.' },
  mouse: { sprite: { key: 'gag_mouse', exit: 'dash', faces: 'right' }, sfx: 'squeak', line: 'Eek! A little mouse. Hi, mouse!' },
  empty: { sfx: 'open', line: 'Nothing in here but crumbs.' },
  spider: { sprite: { key: 'gag_spider', exit: 'climb', scale: 0.8 }, sfx: 'squeak', line: 'A spider! Okay, okay, you can stay.' },
  ball: { sprite: { key: 'gag_ball', exit: 'bounce' }, sfx: 'boing', line: 'A bouncy ball... not breakfast.' },
};

/**
 * The gags with something to see. Every kitchen gets all of them, one cupboard each, so a
 * playthrough never misses the frog or the bouncy ball.
 */
export const SEEN_GAGS: readonly Gag[] = GAGS.filter((g) => !!GAG_SPECS[g].sprite);
/** The rest: a clatter, a bare cupboard. They fill whatever cupboards are left over. */
export const UNSEEN_GAGS: readonly Gag[] = GAGS.filter((g) => !GAG_SPECS[g].sprite);

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

  // Every gag worth seeing gets a cupboard of its own, in a random one, and whatever cupboards
  // are left over get a clatter or nothing. With fewer spare cupboards than there are things to
  // see, the ones that miss out are the last of a shuffle, so it is a different one each game.
  const spare = rng.shuffle(containers.filter((c) => !placements[c.id]).map((c) => c.id));
  const seen = rng.shuffle(SEEN_GAGS);
  const rest = rng.shuffle(UNSEEN_GAGS);
  spare.forEach((id, i) => {
    placements[id] = { type: 'decoy', gag: i < seen.length ? seen[i] : rest[(i - seen.length) % rest.length] };
  });

  return { placements, opened: [], delivered: false };
}

/**
 * Gives a gag to any container that has been added to the room since the layout was written, so
 * a cupboard added in a later version is not silently empty in an old save. Returns whether
 * anything was filled in, so the caller knows to save.
 */
/**
 * Replaces anything in the layout the game no longer has (the socks that used to be in a
 * cupboard) with a bare cupboard, so an old save does not ask for a gag that has been dropped.
 * Returns whether anything was changed.
 */
export function dropUnknownGags(state: BreakfastState): boolean {
  let changed = false;
  for (const [id, content] of Object.entries(state.placements)) {
    if (content.type === 'decoy' && !GAGS.includes(content.gag)) {
      state.placements[id] = { type: 'decoy', gag: 'empty' };
      changed = true;
    }
  }
  return changed;
}

export function fillMissingContainers(state: BreakfastState, rng: Rng, containers: readonly ContainerSpec[]): boolean {
  const missing = containers.filter((c) => !state.placements[c.id]);
  if (!missing.length) return false;
  // A cupboard added later gets a clatter or nothing, so it cannot double up on a creature
  // that has already been dealt.
  const pool = rng.shuffle(UNSEEN_GAGS);
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
export function gagFlipped(sprite: GagSprite, dir: -1 | 1): boolean {
  if (!sprite.faces) return false;
  return (dir > 0) !== (sprite.faces === 'right');
}
