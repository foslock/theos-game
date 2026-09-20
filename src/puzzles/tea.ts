import type { Rng } from '../systems/Rng';

/*
 * The tea party in the playhouse, without any Phaser in it. Two teapots pour a fixed amount: the
 * big one three, the small one two. Each level sets out three cups marked with how much they
 * hold, and every cup must be filled to exactly its number. Pouring past the mark, or leaving a
 * cup one short (no pot pours one), spills the level and it starts again with the same cups. The
 * first level's cups take one pour each (twos and threes); the next two ask for bigger numbers
 * that need planning, up to nine. Filling the last level wins.
 */

export type PotSize = 3 | 2;
export const POTS: readonly PotSize[] = [3, 2];
export const CUPS_PER_LEVEL: readonly number[] = [3, 3, 3];
/** The amounts a level's cups are drawn from: one pour each, then sums of two, then sums of three. */
export const LEVEL_VALUES: readonly (readonly number[])[] = [
  [2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
export const MIN_CUP = 2;
export const MAX_CUP = 9;

export interface Cup {
  value: number;
  filled: number;
}

export interface TeaState {
  /** Index into CUPS_PER_LEVEL. */
  level: number;
  cups: Cup[];
  /** The teapot in hand, if any. */
  pot: PotSize | null;
  won: boolean;
}

export type TeaEvent = 'pour' | 'cupFull' | 'overflow' | 'short' | 'levelDone' | 'won';

/**
 * Deals a level: its cups take amounts from the level's pool, all different while the pool has
 * enough, and never all the same.
 */
export function dealLevel(rng: Rng, level: number): Cup[] {
  const n = CUPS_PER_LEVEL[level];
  const pool = LEVEL_VALUES[level];
  if (!n || !pool) throw new Error(`No tea level ${level}`);
  const values = rng.shuffle(pool).slice(0, n);
  while (values.length < n) values.push(rng.pick(pool));
  return rng.shuffle(values).map((value) => ({ value, filled: 0 }));
}

export function newTea(rng: Rng): TeaState {
  return { level: 0, cups: dealLevel(rng, 0), pot: null, won: false };
}

export function pickPot(state: TeaState, pot: PotSize): void {
  if (!state.won) state.pot = pot;
}

export function cupsLeft(state: TeaState): number {
  return state.cups.filter((c) => c.filled < c.value).length;
}

/**
 * Pours the pot in hand into a cup. Reports what happened; after `overflow` or `short` the level
 * is spilled and the caller should `resetLevel`. A full cup takes no more.
 */
export function pour(state: TeaState, cupIndex: number): TeaEvent[] {
  const cup = state.cups[cupIndex];
  if (!cup || state.pot === null || state.won || cup.filled >= cup.value) return [];
  cup.filled += state.pot;
  const events: TeaEvent[] = ['pour'];
  if (cup.filled > cup.value) {
    events.push('overflow');
    return events;
  }
  const left = cup.value - cup.filled;
  if (left === 1) {
    events.push('short');
    return events;
  }
  if (left === 0) events.push('cupFull');
  if (state.cups.every((c) => c.filled === c.value)) {
    if (state.level >= CUPS_PER_LEVEL.length - 1) {
      state.won = true;
      events.push('won');
    } else {
      events.push('levelDone');
    }
  }
  return events;
}

/** The level starts over: the same cups, empty again, no pot in hand. */
export function resetLevel(state: TeaState): void {
  for (const c of state.cups) c.filled = 0;
  state.pot = null;
}

export function nextLevel(state: TeaState, rng: Rng): void {
  if (state.won || state.level >= CUPS_PER_LEVEL.length - 1) return;
  state.level += 1;
  state.cups = dealLevel(rng, state.level);
  state.pot = null;
}

/** Whether a cup can still be filled exactly from where it is: every amount but one can. */
export function fillable(cup: Cup): boolean {
  const left = cup.value - cup.filled;
  return left === 0 || left >= 2;
}

export function levelText(state: TeaState): string {
  return `Level ${state.level + 1} of ${CUPS_PER_LEVEL.length}`;
}

export function cupsText(state: TeaState): string {
  const n = cupsLeft(state);
  return n === 0 ? 'All full!' : `${n} ${n === 1 ? 'cup' : 'cups'} to fill`;
}

/** What Theo says when a level spills. */
export function spillLine(event: 'overflow' | 'short'): string {
  return event === 'overflow' ? "Whoops, too much! It spilled. Let's start again." : "Uh oh, only one more would fit, and no pot pours one. Let's start again.";
}
