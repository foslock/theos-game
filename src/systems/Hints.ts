import type Phaser from 'phaser';
import { HINT_GLINT_MS, HINT_SPEAK_MS } from '../config';
import type { Room, RoomId } from '../data/rooms';
import type { ItemId } from '../data/items';
import { FLAGS, getFlag, hasItem, isUnlocked, type GameState } from '../state/GameState';

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

/** A spoken nudge appropriate to where the player is and what they still need. */
export function hintLine(room: Room, state: GameState): string | null {
  const backpack = getFlag(state, FLAGS.hasBackpack);
  const breakfast = getFlag(state, FLAGS.breakfastDone);
  switch (room.id) {
    case 'bedroom':
      return backpack ? null : 'I should grab my backpack before I head downstairs.';
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
      return null;
    case 'backyard':
      if (stillNeeds(state, 'playhouse_key', 'backyard', 'playhouse')) return 'The playhouse key might be in the little mailbox.';
      return null;
    case 'playhouse':
      if (stillNeeds(state, 'garage_key', 'family_room', 'garage')) return "Is that the garage key on the floor?";
      return null;
    default:
      return null;
  }
}
