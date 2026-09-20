import type { Rng } from '../systems/Rng';

/*
 * The memory game in the garage, without any Phaser in it. Boxes on the shelves hide pairs of
 * things; the player opens two at a time. A matching pair stays open for good, a mismatch closes
 * again. Three levels: a 2x2 of boxes, a 3x3 with the middle left empty, then a 4x4. Finding
 * every pair on the 4x4 wins.
 */

export type MemoryItem = 'hammer' | 'wrench' | 'paint' | 'flashlight' | 'ball' | 'tape' | 'bulb' | 'can';
export const MEMORY_ITEMS: readonly MemoryItem[] = ['hammer', 'wrench', 'paint', 'flashlight', 'ball', 'tape', 'bulb', 'can'];

/** What the things are called when Theo finds a pair. */
export const ITEM_NAMES: Record<MemoryItem, string> = {
  hammer: 'hammers',
  wrench: 'wrenches',
  paint: 'paint cans',
  flashlight: 'flashlights',
  ball: 'tennis balls',
  tape: 'rolls of tape',
  bulb: 'light bulbs',
  can: 'watering cans',
};

export interface LevelSpec {
  cols: number;
  rows: number;
  pairs: number;
  /** Cells left empty. */
  skip?: { col: number; row: number }[];
}

export const LEVELS: readonly LevelSpec[] = [
  { cols: 2, rows: 2, pairs: 2 },
  { cols: 3, rows: 3, pairs: 4, skip: [{ col: 1, row: 1 }] },
  { cols: 4, rows: 4, pairs: 8 },
];

export type BoxState = 'closed' | 'open' | 'matched';

export interface Box {
  col: number;
  row: number;
  item: MemoryItem;
  state: BoxState;
}

export interface MemoryState {
  /** Index into LEVELS. */
  level: number;
  boxes: Box[];
  /** Boxes open but not yet matched, in the order they were opened; never more than two. */
  open: number[];
  won: boolean;
}

export type MemoryEvent = 'open' | 'match' | 'mismatch' | 'levelDone' | 'won';

/** Deals a level: `pairs` different things, two of each, shuffled into the grid's cells. */
export function dealLevel(rng: Rng, level: number): Box[] {
  const spec = LEVELS[level];
  if (!spec) throw new Error(`No memory level ${level}`);
  const kinds = rng.shuffle(MEMORY_ITEMS).slice(0, spec.pairs);
  const items = rng.shuffle([...kinds, ...kinds]);
  const boxes: Box[] = [];
  let i = 0;
  for (let row = 0; row < spec.rows; row++) {
    for (let col = 0; col < spec.cols; col++) {
      if (spec.skip?.some((s) => s.col === col && s.row === row)) continue;
      boxes.push({ col, row, item: items[i++], state: 'closed' });
    }
  }
  if (i !== items.length) throw new Error(`Level ${level} has ${i} cells for ${items.length} things`);
  return boxes;
}

export function newMemory(rng: Rng): MemoryState {
  return { level: 0, boxes: dealLevel(rng, 0), open: [], won: false };
}

export function pairsTotal(state: MemoryState): number {
  return LEVELS[state.level].pairs;
}

export function pairsFound(state: MemoryState): number {
  return state.boxes.filter((b) => b.state === 'matched').length / 2;
}

/** A closed box the player can open right now: not while a mismatched pair is still showing. */
export function canOpen(state: MemoryState, i: number): boolean {
  const box = state.boxes[i];
  return !!box && !state.won && box.state === 'closed' && state.open.length < 2;
}

/**
 * Opens a box. The second box of a pair settles it: a match stays open for good; a mismatch is
 * reported and both stay showing until `closeMismatch`, so the player gets a look at them.
 */
export function openBox(state: MemoryState, i: number): MemoryEvent[] {
  if (!canOpen(state, i)) return [];
  const box = state.boxes[i];
  box.state = 'open';
  state.open.push(i);
  const events: MemoryEvent[] = ['open'];
  if (state.open.length < 2) return events;
  const [a, b] = state.open.map((k) => state.boxes[k]);
  if (a.item !== b.item) {
    events.push('mismatch');
    return events;
  }
  a.state = 'matched';
  b.state = 'matched';
  state.open = [];
  events.push('match');
  if (state.boxes.every((x) => x.state === 'matched')) {
    if (state.level >= LEVELS.length - 1) {
      state.won = true;
      events.push('won');
    } else {
      events.push('levelDone');
    }
  }
  return events;
}

/** Puts a mismatched pair back: both boxes close. */
export function closeMismatch(state: MemoryState): void {
  for (const k of state.open) if (state.boxes[k].state === 'open') state.boxes[k].state = 'closed';
  state.open = [];
}

/** Deals the next level. Call after `levelDone`. */
export function nextLevel(state: MemoryState, rng: Rng): void {
  if (state.won || state.level >= LEVELS.length - 1) return;
  state.level += 1;
  state.boxes = dealLevel(rng, state.level);
  state.open = [];
}

export function levelText(state: MemoryState): string {
  return `Level ${state.level + 1} of ${LEVELS.length}`;
}

export function pairsText(state: MemoryState): string {
  return `Pairs ${pairsFound(state)} of ${pairsTotal(state)}`;
}
