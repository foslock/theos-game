import type { ItemId } from '../items';
import type { Condition } from '../../systems/Conditions';

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

export interface Exit {
  to: RoomId;
  zone: Rect;
  /** Where the characters walk to before the fade, and where they appear when entering from `to`. */
  walkTo: Pt;
  direction: Direction;
  condition?: Condition;
  /** What Theo says when the exit is locked. */
  lockedComment?: string;
}

export interface PickupHotspot {
  kind: 'pickup';
  id: string;
  item: ItemId;
  zone: Rect;
  walkTo?: Pt;
  /** Requirement to be able to take it (e.g. having the backpack). */
  condition?: Condition;
  refusalComment?: string;
  /** Item is not drawn until a flag is set (used by puzzles). */
  hiddenUntilFlag?: string;
  /** The item is tucked inside something (a mailbox, a drawer): never drawn, found by clicking the zone. */
  hidden?: boolean;
  /** What Theo says on finding a hidden item. */
  foundComment?: string;
}

export interface ContainerHotspot {
  kind: 'container';
  id: string;
  label: string;
  /** Category used by puzzles to decide what can be inside. */
  category: 'drawer' | 'cabinet' | 'fridge' | 'other';
  zone: Rect;
  walkTo?: Pt;
  /** Set when the zone is not solid furniture (feet may cross it). */
  walkable?: boolean;
}

export interface DecorationHotspot {
  kind: 'decoration';
  id: string;
  zone: Rect;
  /** Lines Theo may say; one is chosen at random. */
  lines?: string[];
  sfx?: 'boing' | 'click' | 'squeak' | 'ding';
  /** Set when the zone is not solid furniture (feet may cross it), e.g. a rug or a window. */
  walkable?: boolean;
}

export interface TalkHotspot {
  kind: 'talk';
  id: string;
  zone: Rect;
  walkTo?: Pt;
  lines: string[];
}

export interface BackpackHotspot {
  kind: 'backpack';
  id: string;
  zone: Rect;
  walkTo?: Pt;
}

export type Hotspot = PickupHotspot | ContainerHotspot | DecorationHotspot | TalkHotspot | BackpackHotspot;

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
  /** Placeholder colours until PixelLab art exists. */
  palette: { wall: string; floor: string; accent: string };
}
