import type { ItemId } from '../items';
import type { Condition } from '../../systems/Conditions';
import type { AmbientSpec } from '../../systems/Ambience';

export type RoomId =
  | 'bedroom'
  | 'bathroom'
  | 'kitchen'
  | 'family_room'
  | 'garage'
  | 'backyard'
  | 'sport_court'
  | 'playhouse'
  | 'playground';

export interface Pt {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * A clickable footprint. `zone` is the bounding box and is what the game measures from — where
 * an item pops, where a hint glints, what blocks feet. `parts` optionally describes the shape
 * inside it for things that are not rectangles, like an armchair or a staircase.
 *
 * Parts must stay within `zone` and must not reach into another hotspot's parts: a click picks
 * the single nearest footprint within a few pixels, so overlapping shapes would make which one
 * you get ambiguous. Being slightly tight is fine — that tolerance covers near misses.
 */
export interface Hitbox {
  zone: Rect;
  parts?: Rect[];
  /**
   * How far from its shape a click still counts, for small things that need to be forgiving
   * (defaults to the usual tolerance). Anything beyond the tolerance is also how far it wins
   * over a bigger footprint under the pointer, so a half-hidden ball can be taken by clicking
   * the furniture it is tucked behind.
   */
  reach?: number;
}

export interface Exit extends Hitbox {
  to: RoomId;
  /** Where the characters walk to before the fade, and where they appear when entering from `to`. */
  walkTo: Pt;
  direction: Direction;
  condition?: Condition;
  /** What Theo says when the exit is locked. */
  lockedComment?: string;
}

export interface PickupHotspot extends Hitbox {
  kind: 'pickup';
  id: string;
  item: ItemId;
  walkTo?: Pt;
  /** Requirement to be able to take it (e.g. having the backpack). */
  condition?: Condition;
  refusalComment?: string;
  /** Item is not drawn until a flag is set (used by puzzles). */
  hiddenUntilFlag?: string;
  /** Item is gone for good once a flag is set (the rocket, once it lives on its launcher). */
  goneWhenFlag?: string;
  /** The item is tucked inside something (a mailbox, a drawer): never drawn, found by clicking the zone. */
  hidden?: boolean;
  /** What Theo says on finding a hidden item. */
  foundComment?: string;
  /**
   * Tucked partly behind furniture: the sprite is centred at `at` rather than on the zone, and
   * the room's background is redrawn over `cover` to hide the rest of it. The zone is then just
   * the part that shows, which is what the player clicks. Without a `cover` the item is simply
   * drawn at `at`, for things hidden by an overlay the room draws itself (the bed).
   */
  peek?: Peek;
  /**
   * Places it could be. One is chosen from the save's seed (see `src/puzzles/spots.ts`) and its
   * fields replace `zone`, `walkTo` and `peek` above, which then only serve as the fallback.
   */
  spots?: ItemSpot[];
  /** Where it is, in Theo's words ("at the foot of my bed"), filled in from the chosen spot. */
  where?: string;
}

export interface Peek {
  at: Pt;
  cover?: Rect;
}

/** One of the places a pickup can be seeded. */
export interface ItemSpot {
  zone: Rect;
  walkTo?: Pt;
  peek?: Peek;
  /** Where it is, in Theo's words: "at the foot of my bed". Hints say it. */
  where: string;
}

export interface ContainerHotspot extends Hitbox {
  kind: 'container';
  id: string;
  label: string;
  /** Category used by puzzles to decide what can be inside. */
  category: 'drawer' | 'cabinet' | 'fridge' | 'other';
  walkTo?: Pt;
  /** Set when the zone is not solid furniture (feet may cross it). */
  walkable?: boolean;
}

export interface DecorationHotspot extends Hitbox {
  kind: 'decoration';
  id: string;
  /** Lines Theo may say; one is chosen at random. */
  lines?: string[];
  sfx?: 'boing' | 'click' | 'squeak' | 'ding';
  /** Set when the zone is not solid furniture (feet may cross it), e.g. a rug or a window. */
  walkable?: boolean;
}

export interface TalkHotspot extends Hitbox {
  kind: 'talk';
  id: string;
  walkTo?: Pt;
  lines: string[];
}

export interface BackpackHotspot extends Hitbox {
  kind: 'backpack';
  id: string;
  walkTo?: Pt;
}

export interface MinigameHotspot extends Hitbox {
  kind: 'minigame';
  id: string;
  game: 'basketball' | 'slide' | 'rocket' | 'race' | 'memory' | 'tea';
  walkTo?: Pt;
}

export type Hotspot = PickupHotspot | ContainerHotspot | DecorationHotspot | TalkHotspot | BackpackHotspot | MinigameHotspot;

export interface Room {
  id: RoomId;
  name: string;
  /** Texture key for the background. */
  background: string;
  /** Number of ambient frames the background texture set provides. */
  ambientFrames: number;
  restPoint: Pt;
  lucyRestPoint?: Pt;
  exits: Exit[];
  hotspots: Hotspot[];
  /** Top of the walkable floor band (feet never go above it). Defaults to 280. */
  floorTop?: number;
  /** Extra solid areas on the floor that feet must route around, beyond furniture hotspots. */
  obstacles?: Rect[];
  /** Little background animations layered over the art; see `src/systems/Ambience.ts`. */
  ambient?: AmbientSpec[];
  /** Things drawn over the art at a spot on the floor (feet at `at`), sorted with the characters. */
  props?: { key: string; at: Pt }[];
  /** Placeholder colours until PixelLab art exists. */
  palette: { wall: string; floor: string; accent: string };
}
