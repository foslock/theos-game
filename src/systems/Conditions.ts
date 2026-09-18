import type { ItemId } from '../data/items';
import type { GameState } from '../state/GameState';
import { hasItem, getFlag } from '../state/GameState';

export type Condition =
  | { hasItem: ItemId; count?: number }
  | { flag: string }
  | { all: Condition[] }
  | { any: Condition[] }
  | { never: true };

/** Evaluates an exit/hotspot condition against the current state. Undefined means "open". */
export function evaluate(cond: Condition | undefined, state: GameState): boolean {
  if (!cond) return true;
  if ('never' in cond) return false;
  if ('hasItem' in cond) return hasItem(state, cond.hasItem, cond.count ?? 1);
  if ('flag' in cond) return getFlag(state, cond.flag);
  if ('all' in cond) return cond.all.every((c) => evaluate(c, state));
  if ('any' in cond) return cond.any.some((c) => evaluate(c, state));
  return false;
}
