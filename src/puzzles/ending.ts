import type { RoomId } from '../data/rooms/types';
import { FLAGS, getFlag, type GameState } from '../state/GameState';

/** The rooms inside the house. Everywhere else is the yard. */
export const INDOOR_ROOMS: ReadonlySet<RoomId> = new Set<RoomId>(['bedroom', 'bathroom', 'kitchen', 'family_room', 'garage']);

/** True for an exit that leads from the yard back into the house. */
export function entersHouse(from: RoomId, to: RoomId): boolean {
  return !INDOOR_ROOMS.has(from) && INDOOR_ROOMS.has(to);
}

/** The three mini-games that make up the morning. */
export const MINIGAME_FLAGS = [FLAGS.basketballDone, FLAGS.stompRocketDone, FLAGS.slideDone] as const;

/** Whether every mini-game has been won, which is what makes coming home the end of the day. */
export function morningDone(state: GameState): boolean {
  return MINIGAME_FLAGS.every((f) => getFlag(state, f));
}

/**
 * Whether walking through `from` → `to` should play the ending instead of changing rooms: coming
 * back into the house once the morning is done. The save is left as it was in the yard, so
 * Resume Game puts the player back outside rather than in the finished story.
 */
export function endingTriggers(from: RoomId, to: RoomId, state: GameState): boolean {
  return entersHouse(from, to) && morningDone(state);
}
