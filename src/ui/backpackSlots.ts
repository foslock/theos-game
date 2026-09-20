import { HUD_HEIGHT, SCENE_HEIGHT } from '../config';
import { ITEMS, type ItemId } from '../data/items';
import type { GameState } from '../state/GameState';

/** The backpack grid in the bar under the scene: four slots across, two down. */
export const SLOT = 36;
export const GAP = 4;
export const COLS = 4;
export const ROWS = 2;
/** Top-left of the grid. */
export const GRID_X = 16 + 56;
export const GRID_Y = SCENE_HEIGHT + (HUD_HEIGHT - (ROWS * SLOT + GAP)) / 2;

/** The centre of slot `index`, for things flying into the backpack. */
export function slotCentre(index: number): { x: number; y: number } {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return { x: GRID_X + col * (SLOT + GAP) + SLOT / 2, y: GRID_Y + row * (SLOT + GAP) + SLOT / 2 };
}

/** The slot an item would go into: its stack if it already has one, otherwise the next free slot. */
export function slotFor(state: GameState, item: ItemId): number {
  const existing = state.inventory.findIndex((e) => e.item === item && ITEMS[item].stackable);
  return existing >= 0 ? existing : Math.min(state.inventory.length, COLS * ROWS - 1);
}
