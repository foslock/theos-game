import { ITEMS, type ItemId } from '../data/items';
import type { RoomId } from '../data/rooms/types';
import { MAX_INVENTORY_SLOTS, SAVE_VERSION } from '../config';
import type { BreakfastState } from '../puzzles/breakfast';

export interface InventoryEntry {
  item: ItemId;
  count: number;
}

export interface GameState {
  version: number;
  seed: number;
  currentRoom: RoomId;
  previousRoom: RoomId | null;
  lucyJoined: boolean;
  inventory: InventoryEntry[];
  flags: Record<string, boolean>;
  /** Hotspot ids (room-qualified) that have already been taken/consumed. */
  pickedUp: string[];
  /** Doors whose key has been used, so they stay open for the rest of the playthrough. */
  unlocked: string[];
  puzzles: {
    breakfast?: BreakfastState;
  };
  savedAt: string;
}

export const FLAGS = {
  hasBackpack: 'hasBackpack',
  breakfastDone: 'breakfastDone',
  stompRocketHinted: 'stompRocketHinted',
} as const;

export function newGameState(seed: number): GameState {
  return {
    version: SAVE_VERSION,
    seed,
    currentRoom: 'bedroom',
    previousRoom: null,
    lucyJoined: false,
    inventory: [],
    flags: {},
    pickedUp: [],
    unlocked: [],
    puzzles: {},
    savedAt: new Date().toISOString(),
  };
}

export function hasItem(state: GameState, id: ItemId, count = 1): boolean {
  const entry = state.inventory.find((e) => e.item === id);
  return !!entry && entry.count >= count;
}

export function itemCount(state: GameState, id: ItemId): number {
  return state.inventory.find((e) => e.item === id)?.count ?? 0;
}

/** Adds one of `id`. Returns false if there is no room (spec says this should never happen in practice). */
export function addItem(state: GameState, id: ItemId): boolean {
  const def = ITEMS[id];
  const entry = state.inventory.find((e) => e.item === id);
  if (entry && def.stackable) {
    if (entry.count >= (def.maxStack ?? Infinity)) return false;
    entry.count += 1;
    return true;
  }
  if (state.inventory.length >= MAX_INVENTORY_SLOTS) return false;
  state.inventory.push({ item: id, count: 1 });
  return true;
}

export function removeItem(state: GameState, id: ItemId, count = 1): boolean {
  const idx = state.inventory.findIndex((e) => e.item === id);
  if (idx < 0 || state.inventory[idx].count < count) return false;
  state.inventory[idx].count -= count;
  if (state.inventory[idx].count <= 0) state.inventory.splice(idx, 1);
  return true;
}

export function getFlag(state: GameState, name: string): boolean {
  return state.flags[name] === true;
}

export function setFlag(state: GameState, name: string, value = true): void {
  state.flags[name] = value;
}

export function hotspotKey(room: RoomId, hotspotId: string): string {
  return `${room}:${hotspotId}`;
}

export function isPickedUp(state: GameState, room: RoomId, hotspotId: string): boolean {
  return state.pickedUp.includes(hotspotKey(room, hotspotId));
}

export function markPickedUp(state: GameState, room: RoomId, hotspotId: string): void {
  const key = hotspotKey(room, hotspotId);
  if (!state.pickedUp.includes(key)) state.pickedUp.push(key);
}

/** Identifies a door by the rooms it joins, so both sides of it share one unlocked state. */
export function doorKey(from: RoomId, to: RoomId): string {
  return [from, to].sort().join('<->');
}

export function isUnlocked(state: GameState, from: RoomId, to: RoomId): boolean {
  return state.unlocked.includes(doorKey(from, to));
}

export function markUnlocked(state: GameState, from: RoomId, to: RoomId): void {
  const key = doorKey(from, to);
  if (!state.unlocked.includes(key)) state.unlocked.push(key);
}
