import type Phaser from 'phaser';
import { HINT_GLINT_MS, HINT_SPEAK_MS } from '../config';
import type { Room, RoomId } from '../data/rooms';
import type { ItemId } from '../data/items';
import { FLAGS, getFlag, hasItem, isPickedUp, isUnlocked, itemCount, type GameState } from '../state/GameState';
import { BALLS_NEEDED } from '../puzzles/basketball';

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
      if (getFlag(state, FLAGS.stompRocketHinted) && !isPickedUp(state, 'bedroom', 'stomp_rocket')) return 'My stomp rocket! It was up on the shelf all along.';
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
      return ballHint(room, state);
    case 'backyard':
      if (stillNeeds(state, 'playhouse_key', 'backyard', 'playhouse')) return 'The playhouse key might be in the little mailbox.';
      if (hasItem(state, 'stomp_rocket')) return "We've got the rocket! Let's put it on the launcher.";
      if (getFlag(state, FLAGS.stompRocketHinted) && !hasItem(state, 'stomp_rocket') && !getFlag(state, FLAGS.stompRocketDone))
        return 'The stomp rocket is up in my room, by the window.';
      return null;
    case 'sport_court':
      if (hoops) return null;
      if (itemCount(state, 'basketball') < BALLS_NEEDED)
        return 'We need three basketballs to play. I think I saw some around the house: my room, the family room, the garage...';
      return "We've got all three balls! Let's shoot at a hoop.";
    case 'playhouse':
      if (stillNeeds(state, 'garage_key', 'family_room', 'garage')) return "Is that the garage key on the floor?";
      if (!hoops) return 'The playground is through there, but Lucy wants to play basketball first.';
      return null;
    case 'playground':
      return getFlag(state, FLAGS.slideDone) ? null : "Let's go down the slide!";
    default:
      return null;
  }
}
