import type Phaser from 'phaser';
import { HINT_GLINT_MS, HINT_SPEAK_MS } from '../config';
import type { Room, RoomId } from '../data/rooms';
import type { ItemId } from '../data/items';
import { FLAGS, getFlag, hasItem, isPickedUp, isUnlocked, itemCount, type GameState } from '../state/GameState';
import { pointerVerb } from '../ui/text';
import { BALLS_NEEDED } from '../puzzles/basketball';
import { inLucysWords } from '../puzzles/spots';
import { gameDone, lucyNextLine, MINIGAMES, type MiniGame } from '../puzzles/progress';

/** Where a seeded pickup is this playthrough, in Theo's words, when the room has been placed. */
function whereIn(room: Room, hotspotId: string): string | undefined {
  const h = room.hotspots.find((x) => x.kind === 'pickup' && x.id === hotspotId);
  return h && h.kind === 'pickup' ? h.where : undefined;
}

/**
 * Idle-hint schedule. After the player has done nothing for a while the things they still
 * need glint (`onGlint`); at the full interval Theo speaks a hint and the glints show again
 * (`onSpeak`). The cycle then repeats on the speak interval until an interaction resets it.
 */
export class HintTimer {
  private glintEvent?: Phaser.Time.TimerEvent;
  private speakEvent?: Phaser.Time.TimerEvent;

  constructor(
    private scene: Phaser.Scene,
    private onGlint: () => void,
    private onSpeak: () => void,
  ) {}

  reset(): void {
    this.stop();
    this.arm();
  }

  private arm(): void {
    this.glintEvent = this.scene.time.delayedCall(HINT_GLINT_MS, () => this.onGlint());
    this.speakEvent = this.scene.time.delayedCall(HINT_SPEAK_MS, () => {
      this.onSpeak();
      this.arm();
    });
  }

  stop(): void {
    this.glintEvent?.remove(false);
    this.speakEvent?.remove(false);
    this.glintEvent = undefined;
    this.speakEvent = undefined;
  }
}

/**
 * Whether a key is still worth nagging about: once its door has been opened the key is spent, so
 * not holding it is the finished state, not the unsolved one.
 */
function stillNeeds(state: GameState, key: ItemId, from: RoomId, to: RoomId): boolean {
  return !isUnlocked(state, from, to) && !hasItem(state, key);
}

/**
 * A nudge toward the basketball hidden in this room, once Lucy has asked for the balls. Before
 * that the ball is just something to find; afterwards it is what the player is looking for.
 */
function ballHint(room: Room, state: GameState): string | null {
  if (!getFlag(state, FLAGS.basketballHunt) || getFlag(state, FLAGS.basketballDone)) return null;
  if (!room.hotspots.some((h) => h.kind === 'pickup' && h.id === 'basketball')) return null;
  if (isPickedUp(state, room.id, 'basketball')) return null;
  return 'I think a basketball is hiding somewhere in here.';
}

/** A spoken nudge appropriate to where the player is and what they still need. */
export function hintLine(room: Room, state: GameState): string | null {
  const backpack = getFlag(state, FLAGS.hasBackpack);
  const breakfast = getFlag(state, FLAGS.breakfastDone);
  const hoops = getFlag(state, FLAGS.basketballDone);
  switch (room.id) {
    case 'bedroom':
      if (!backpack) return 'I should grab my backpack before I head downstairs.';
      if (getFlag(state, FLAGS.raceHinted) && !isPickedUp(state, 'bedroom', 'toy_car'))
        return `My race car should be ${whereIn(room, 'toy_car') ?? 'somewhere in here'}.`;
      if (hasItem(state, 'toy_car') && !getFlag(state, FLAGS.raceDone)) return "I've got my race car! I could race it on my track.";
      return ballHint(room, state);
    case 'bathroom':
      return backpack ? null : 'My backpack is back in my room.';
    case 'kitchen':
      if (!breakfast) return 'Lucy needs breakfast. Let me look in the drawers, cabinets and the fridge.';
      if (stillNeeds(state, 'kitchen_door_key', 'kitchen', 'backyard'))
        return 'The back door is locked. Maybe the key is somewhere in the family room.';
      return null;
    case 'family_room':
      if (stillNeeds(state, 'kitchen_door_key', 'kitchen', 'backyard'))
        return 'Hmm, I think Mom keeps the back door key around here somewhere.';
      return ballHint(room, state);
    case 'garage':
      if (getFlag(state, FLAGS.stompRocketHinted) && !getFlag(state, FLAGS.stompRocketDone) && !isPickedUp(state, 'garage', 'stomp_rocket'))
        return `My stomp rocket! It was ${whereIn(room, 'stomp_rocket') ?? 'in here'} all along.`;
      return ballHint(room, state) ?? (getFlag(state, FLAGS.memoryDone) ? null : "I wonder what Dad keeps in all those boxes on the shelves.");
    case 'backyard':
      if (stillNeeds(state, 'playhouse_key', 'backyard', 'playhouse')) return 'The playhouse key might be in the little mailbox.';
      if (hasItem(state, 'stomp_rocket')) return "We've got the rocket! Let's put it on the launcher.";
      if (getFlag(state, FLAGS.stompRocketHinted) && !hasItem(state, 'stomp_rocket') && !getFlag(state, FLAGS.stompRocketDone))
        return "The stomp rocket is in Dad's garage somewhere.";
      return null;
    case 'sport_court':
      if (hoops) return null;
      if (itemCount(state, 'basketball') < BALLS_NEEDED)
        return 'We need three basketballs to play. I think I saw some around the house: my room, the family room, the garage...';
      return "We've got all three balls! Let's shoot at a hoop.";
    case 'playhouse':
      if (stillNeeds(state, 'garage_key', 'family_room', 'garage')) return `Is that the garage key ${whereIn(room, 'garage_key') ?? 'over there'}?`;
      if (!hoops) return 'The playground is through there, but Lucy wants to play basketball first.';
      // The tea party is for after the slide, so the playground stays the thing to do first.
      if (getFlag(state, FLAGS.slideDone) && !getFlag(state, FLAGS.teaDone)) return 'Lucy keeps looking at her tea set. Maybe she wants a tea party.';
      return null;
    case 'playground':
      return getFlag(state, FLAGS.slideDone) ? null : "Let's go down the slide!";
    default:
      return null;
  }
}

/** The game each room holds, so Lucy can point at the one right here before any other. */
const ROOM_GAMES: Partial<Record<RoomId, MiniGame['id']>> = {
  sport_court: 'basketball',
  backyard: 'rocket',
  playground: 'slide',
  playhouse: 'tea',
  garage: 'memory',
  bedroom: 'race',
};

/**
 * What Lucy says when Theo asks her. First whatever is in the way right now (the backpack,
 * breakfast, a key, a ball or the rocket hidden in this room), then the game in this room if it
 * is still to be won, otherwise the next game still to do wherever it is, and at the end of the
 * day a word about heading home.
 */
export function lucyHintLine(room: Room, state: GameState): string {
  if (!getFlag(state, FLAGS.hasBackpack)) return room.id === 'bedroom' ? "Theo, don't forget your backpack!" : 'Your backpack is in your room, silly.';
  if (!getFlag(state, FLAGS.breakfastDone)) return room.id === 'kitchen' ? "I'm hungry! Look in the drawers and cabinets." : "I'm hungry! Let's make breakfast in the kitchen.";
  // Things to find in this room before anything else.
  const hoops = getFlag(state, FLAGS.basketballDone);
  const ballHere = room.hotspots.some((h) => h.kind === 'pickup' && h.id === 'basketball') && !isPickedUp(state, room.id, 'basketball');
  const wantsBalls = getFlag(state, FLAGS.basketballHunt) && !hoops && itemCount(state, 'basketball') < BALLS_NEEDED;
  if (wantsBalls && ballHere) return 'I think a basketball is hiding in here somewhere!';
  if (room.id === 'garage' && getFlag(state, FLAGS.stompRocketHinted) && !getFlag(state, FLAGS.stompRocketDone) && !isPickedUp(state, 'garage', 'stomp_rocket')) {
    const where = whereIn(room, 'stomp_rocket');
    return where ? `Your rocket is ${inLucysWords(where)}!` : 'Your rocket is in here somewhere!';
  }
  if (room.id === 'bedroom' && getFlag(state, FLAGS.raceHinted) && !isPickedUp(state, 'bedroom', 'toy_car')) {
    const where = whereIn(room, 'toy_car');
    return where ? `Your race car is ${inLucysWords(where)}!` : 'Your race car is in here somewhere!';
  }
  // The key to the yard, if it still has to be found.
  if (stillNeeds(state, 'kitchen_door_key', 'kitchen', 'backyard')) {
    return room.id === 'family_room' ? 'Mom keeps the back door key around here somewhere!' : 'The back door is locked. Maybe the key is in the family room?';
  }
  if (room.id === 'backyard' && stillNeeds(state, 'playhouse_key', 'backyard', 'playhouse')) return 'The playhouse key might be in the little mailbox!';
  if (room.id === 'playhouse' && stillNeeds(state, 'garage_key', 'family_room', 'garage')) {
    const where = whereIn(room, 'garage_key');
    return where ? `Is that a key ${inLucysWords(where)}?` : 'Is that a key over there?';
  }
  // The game right here, if it is still to be won.
  const here = MINIGAMES.find((g) => g.id === ROOM_GAMES[room.id]);
  if (here && !gameDone(state, here)) {
    if (here.id === 'basketball') {
      if (itemCount(state, 'basketball') < BALLS_NEEDED) return 'We need three basketballs! Look around the house.';
      return `${pointerVerb()} a hoop and shoot!`;
    }
    if (here.id === 'rocket' && !hasItem(state, 'stomp_rocket') && !getFlag(state, FLAGS.stompRocketDone) && !getFlag(state, FLAGS.stompRocketHinted)) {
      return `${pointerVerb()} the launcher! I want to see the rocket fly!`;
    }
    if (here.id === 'slide') return hoops ? "Let's go down the slide! Wheee!" : "The slide is right there, but let's play basketball first!";
    return here.lucy(state);
  }
  // Otherwise the next game still to do, wherever it is.
  return lucyNextLine(state);
}
