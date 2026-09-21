import type { GameState } from '../state/GameState';

/*
 * Each mini-game's personal best, kept in the save. Winning is never gated on them: they are a
 * keepsake the kids talk about, so a game that has been won already has something to aim at the
 * next time it is played. Every game scores one number; some are better high (how far the rocket
 * went), some better low (how few bumps, spills, shots or seconds).
 */

export type RecordId = 'basketball' | 'rocket' | 'slide' | 'tea' | 'memory' | 'race';

export interface RecordSpec {
  id: RecordId;
  /** Which way counts as better. */
  better: 'higher' | 'lower';
  /** Lucy, at the start of a game that has been won before. */
  recall: (v: number) => string;
  /** Lucy, when the game has just been won by more than ever before. */
  beat: (v: number) => string;
  /** Lucy, on a score that cannot be bettered, said instead of `beat`. */
  perfect?: (v: number) => string | null;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** How many goes, the way a child says it. */
function times(n: number): string {
  return n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`;
}

/** Seconds to one decimal place, without a trailing ".0" looking like a typo. */
export function seconds(v: number): string {
  return `${v.toFixed(1)} seconds`;
}

export const RECORDS: readonly RecordSpec[] = [
  {
    id: 'basketball',
    better: 'lower',
    recall: (v) => `Last time you got every hoop in ${plural(v, 'shot')}!`,
    beat: (v) => `Every hoop in ${plural(v, 'shot')} — your best ever!`,
    perfect: (v) => (v === 3 ? 'Three shots, three hoops! Nobody can do better than that!' : null),
  },
  {
    id: 'rocket',
    better: 'higher',
    recall: (v) => `Your best is ${v} meters! Can we go higher?`,
    beat: (v) => `${v} meters — higher than it has ever gone!`,
  },
  {
    id: 'slide',
    better: 'lower',
    recall: (v) => (v === 0 ? 'Last time we got all the way down without one single bump!' : `Last time we only had ${plural(v, 'bump')}. Can we do better?`),
    beat: (v) => `Only ${plural(v, 'bump')} — our best ride yet!`,
    perfect: (v) => (v === 0 ? 'Not one single bump! That was our best ride ever!' : null),
  },
  {
    id: 'tea',
    better: 'lower',
    recall: (v) => (v === 0 ? 'Last time you filled every cup without spilling a drop!' : `Last time you only spilled ${times(v)}. Can we do better?`),
    beat: (v) => `Only ${plural(v, 'spill')} — your best tea party yet!`,
    perfect: (v) => (v === 0 ? 'Not one drop spilled! The best tea party ever!' : null),
  },
  {
    id: 'memory',
    better: 'lower',
    recall: (v) => `Your best is ${plural(v, 'peek')}. Can we remember better than that?`,
    beat: (v) => `Only ${plural(v, 'peek')} — your best ever!`,
  },
  {
    id: 'race',
    better: 'lower',
    recall: (v) => `Your fastest three laps was ${seconds(v)}! Can we go faster?`,
    beat: (v) => `${seconds(v)} — a brand new track record!`,
  },
];

export function recordSpec(id: RecordId): RecordSpec {
  const spec = RECORDS.find((r) => r.id === id);
  if (!spec) throw new Error(`No record called ${id}`);
  return spec;
}

export function bestOf(state: GameState, id: RecordId): number | undefined {
  return state.records?.[id];
}

export type RecordResult = 'first' | 'beat' | 'kept';

/** True when `value` is better than `best` for this game (a tie is not a new best). */
export function isBetter(id: RecordId, value: number, best: number): boolean {
  return recordSpec(id).better === 'higher' ? value > best : value < best;
}

/**
 * Books a finished game's score. `first` the first time the game is won, `beat` when the score
 * is better than every one before it, `kept` when the old best stands. Mutates `state`; callers
 * wrap it in a `store.update`.
 */
export function recordResult(state: GameState, id: RecordId, value: number): RecordResult {
  if (!state.records) state.records = {};
  const best = state.records[id];
  if (best === undefined) {
    state.records[id] = value;
    return 'first';
  }
  if (isBetter(id, value, best)) {
    state.records[id] = value;
    return 'beat';
  }
  return 'kept';
}

/** What Lucy says at the start of a replay, if there is a best worth mentioning. */
export function recallLine(state: GameState, id: RecordId): string | null {
  const best = bestOf(state, id);
  return best === undefined ? null : recordSpec(id).recall(best);
}

/**
 * What Lucy says at the end, given what `recordResult` returned and the score. Nothing on the
 * first win (the game has its own line for that) or when the old best stands.
 */
export function beatLine(id: RecordId, result: RecordResult, value: number): string | null {
  if (result !== 'beat') return null;
  const spec = recordSpec(id);
  return spec.perfect?.(value) ?? spec.beat(value);
}
