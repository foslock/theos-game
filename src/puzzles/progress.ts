import type { RoomId } from '../data/rooms/types';
import { FLAGS, getFlag, hasItem, type GameState } from '../state/GameState';

/** The rooms inside the house. Everywhere else is the yard. */
export const INDOOR_ROOMS: ReadonlySet<RoomId> = new Set<RoomId>(['bedroom', 'bathroom', 'kitchen', 'family_room', 'garage']);

/*
 * The day's games, in the order the kids are nudged toward them. Once one is won, Theo or Lucy
 * points at the next one still to do; once the last is won, it is time to head home.
 */

export interface MiniGame {
  id: 'basketball' | 'rocket' | 'slide' | 'tea' | 'memory' | 'race';
  flag: string;
  /** Theo's nudge toward it. */
  theo: (state: GameState) => string;
  /** Lucy's. */
  lucy: (state: GameState) => string;
}

export const MINIGAMES: readonly MiniGame[] = [
  {
    id: 'basketball',
    flag: FLAGS.basketballDone,
    theo: () => "Let's go play basketball! The sport court is past the backyard.",
    lucy: () => "Let's play basketball next! The sport court is past the backyard!",
  },
  {
    id: 'rocket',
    flag: FLAGS.stompRocketDone,
    theo: (s) => (hasItem(s, 'stomp_rocket') ? "Let's fire the stomp rocket in the backyard!" : "Let's fire the stomp rocket in the backyard! I think the rocket is in Dad's garage."),
    lucy: (s) => (hasItem(s, 'stomp_rocket') ? 'Stomp rocket time! Put it on the launcher in the backyard!' : "The stomp rocket! It's in Dad's garage, then the launcher is in the backyard!"),
  },
  {
    id: 'slide',
    flag: FLAGS.slideDone,
    theo: () => "Let's go down the slide! The playground is through the playhouse.",
    lucy: () => 'Slide time! The playground is through the playhouse!',
  },
  {
    id: 'tea',
    flag: FLAGS.teaDone,
    theo: () => 'Lucy wants a tea party at the little table in the playhouse.',
    lucy: () => 'Tea party at my little table in the playhouse! Will you pour?',
  },
  {
    id: 'memory',
    flag: FLAGS.memoryDone,
    theo: () => "I wonder what's in all those boxes on the shelves in Dad's garage.",
    lucy: () => "Let's peek in the boxes on the shelves in Dad's garage!",
  },
  {
    id: 'race',
    flag: FLAGS.raceDone,
    theo: () => 'I could race my car on the track in my room!',
    lucy: () => 'Race your car on the track in your room! I want to see it loop!',
  },
];

/** Every game's flag, for the ending to check. */
export const MINIGAME_FLAGS: readonly string[] = MINIGAMES.map((g) => g.flag);

export function gameDone(state: GameState, game: MiniGame): boolean {
  return getFlag(state, game.flag);
}

/** Whether the game a hotspot starts has already been won. */
export function gameDoneById(state: GameState, id: MiniGame['id']): boolean {
  const game = MINIGAMES.find((g) => g.id === id);
  return !!game && gameDone(state, game);
}

export function allGamesDone(state: GameState): boolean {
  return MINIGAMES.every((g) => gameDone(state, g));
}

/** The first game still to be won, in nudging order. */
export function nextGame(state: GameState): MiniGame | undefined {
  return MINIGAMES.find((g) => !gameDone(state, g));
}

export const HOME_SOON = 'What a day! Mom and Dad will be home soon.';
/** The same moment indoors: they are already home, just through the door. */
export const HOME_NOW = "What a day! I think I hear Mom and Dad. Let's go see them!";

/** The day is done: the line for where the kids are, outside or already in the house. */
export function dayDoneLine(state: GameState): string {
  return INDOOR_ROOMS.has(state.currentRoom) ? HOME_NOW : HOME_SOON;
}

/** What Theo says once a game is won: where to go next, or that the day is done. */
export function afterGameLine(state: GameState): string {
  const next = nextGame(state);
  return next ? next.theo(state) : dayDoneLine(state);
}

/** Lucy's version, for when Theo asks her with nothing left to do in a room. */
export function lucyNextLine(state: GameState): string {
  const next = nextGame(state);
  if (next) return next.lucy(state);
  return INDOOR_ROOMS.has(state.currentRoom) ? "Mom and Dad are home! Let's go see them!" : "Let's go home! Mom and Dad will be back soon!";
}
