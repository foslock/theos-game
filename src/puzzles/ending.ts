import type { RoomId } from '../data/rooms/types';
import type { GameState } from '../state/GameState';
import { allGamesDone, INDOOR_ROOMS, MINIGAME_FLAGS } from './progress';

export { INDOOR_ROOMS };

/** True for an exit that leads from the yard back into the house. */
export function entersHouse(from: RoomId, to: RoomId): boolean {
  return !INDOOR_ROOMS.has(from) && INDOOR_ROOMS.has(to);
}

/** The mini-games that make up the day, all six of them. */
export { MINIGAME_FLAGS };

/** Whether every mini-game has been won, which is what makes coming home the end of the day. */
export function morningDone(state: GameState): boolean {
  return allGamesDone(state);
}

/**
 * Whether walking through `from` → `to` should play the ending instead of changing rooms: with
 * the day done, any door that leads into or through the house. From the yard that is the back
 * door; when the last game was won indoors (the garage's boxes, the bedroom's track), it is
 * leaving that room. The save is left as it was, so Resume Game puts the player back where they
 * were rather than in the finished story.
 */
export function endingTriggers(_from: RoomId, to: RoomId, state: GameState): boolean {
  return INDOOR_ROOMS.has(to) && morningDone(state);
}
