import { describe, expect, it } from 'vitest';
import { canTravel, findExit, reachable } from '../src/data/graph';
import { requiredItem } from '../src/systems/Conditions';
import { hintLine } from '../src/systems/Hints';
import { ROOMS } from '../src/data/rooms';
import { addItem, hasItem, isUnlocked, markUnlocked, newGameState, removeItem, setFlag } from '../src/state/GameState';
import { parseSave, serialize } from '../src/state/SaveManager';

/** What GameScene does when Theo opens a locked door: spend the key, remember the door. */
function openDoor(state: ReturnType<typeof newGameState>, from: 'kitchen' | 'family_room' | 'backyard', to: 'backyard' | 'garage' | 'playhouse') {
  const exit = findExit(from, to)!;
  const key = requiredItem(exit.condition)!;
  removeItem(state, key);
  markUnlocked(state, from, to);
  return key;
}

describe('which conditions are a lock a key opens', () => {
  it('reads the key off a door gated on nothing else', () => {
    expect(requiredItem(findExit('kitchen', 'backyard')!.condition)).toBe('kitchen_door_key');
    expect(requiredItem(findExit('family_room', 'garage')!.condition)).toBe('garage_key');
    expect(requiredItem(findExit('backyard', 'playhouse')!.condition)).toBe('playhouse_key');
  });

  it('leaves doors that are not key locks alone', () => {
    // Gated on having the backpack, which the player keeps.
    expect(requiredItem(findExit('bedroom', 'kitchen')!.condition)).toBeUndefined();
    // Gated on breakfast being made.
    expect(requiredItem(findExit('kitchen', 'family_room')!.condition)).toBeUndefined();
    expect(requiredItem(findExit('playhouse', 'playground')!.condition)).toBeUndefined();
    expect(requiredItem(undefined)).toBeUndefined();
  });

  it('never spends a key on a door the player walks back through', () => {
    for (const [from, to] of [
      ['backyard', 'kitchen'],
      ['garage', 'family_room'],
      ['playhouse', 'backyard'],
    ] as const) {
      expect(requiredItem(findExit(from, to)!.condition)).toBeUndefined();
    }
  });
});

describe('the kitchen before breakfast', () => {
  it('lets Theo back to his room but nowhere else until Lucy has eaten', () => {
    const s = newGameState(1);
    setFlag(s, 'hasBackpack');
    expect(canTravel('kitchen', 'bedroom', s)).toBe(true);
    expect(canTravel('kitchen', 'family_room', s)).toBe(false);
    expect(findExit('kitchen', 'family_room')!.lockedComment).toBeTruthy();
    // The back door key lives in the family room, so the yard is out of reach too.
    expect(ROOMS.family_room.hotspots.some((h) => h.kind === 'pickup' && h.item === 'kitchen_door_key')).toBe(true);
    expect(canTravel('kitchen', 'backyard', s)).toBe(false);
    setFlag(s, 'breakfastDone');
    expect(canTravel('kitchen', 'family_room', s)).toBe(true);
  });
});

describe('unlocking a door', () => {
  it('spends the key and keeps the door open afterwards', () => {
    const s = newGameState(1);
    addItem(s, 'kitchen_door_key');
    expect(canTravel('kitchen', 'backyard', s)).toBe(true);

    openDoor(s, 'kitchen', 'backyard');
    expect(hasItem(s, 'kitchen_door_key')).toBe(false);
    expect(isUnlocked(s, 'kitchen', 'backyard')).toBe(true);
    expect(canTravel('kitchen', 'backyard', s)).toBe(true);
  });

  it('opens from either side, since it is one door', () => {
    const s = newGameState(1);
    markUnlocked(s, 'kitchen', 'backyard');
    expect(isUnlocked(s, 'backyard', 'kitchen')).toBe(true);
  });

  it('leaves other locked doors shut', () => {
    const s = newGameState(1);
    addItem(s, 'kitchen_door_key');
    openDoor(s, 'kitchen', 'backyard');
    expect(canTravel('family_room', 'garage', s)).toBe(false);
    expect(canTravel('backyard', 'playhouse', s)).toBe(false);
  });

  it('still reaches everywhere once every door has been opened and its key spent', () => {
    const s = newGameState(1);
    setFlag(s, 'hasBackpack');
    setFlag(s, 'breakfastDone');
    for (const [from, to] of [
      ['kitchen', 'backyard'],
      ['family_room', 'garage'],
      ['backyard', 'playhouse'],
    ] as const) {
      addItem(s, requiredItem(findExit(from, to)!.condition)!);
      openDoor(s, from, to);
    }
    expect(s.inventory).toEqual([]);
    expect(reachable('bedroom', s).size).toBe(8);
  });
});

describe('hints after a key is spent', () => {
  it('stops asking for a key whose door is already open', () => {
    const s = newGameState(1);
    setFlag(s, 'breakfastDone');
    expect(hintLine(ROOMS.kitchen, s)).toMatch(/back door is locked/);
    expect(hintLine(ROOMS.family_room, s)).toMatch(/back door key/);

    addItem(s, 'kitchen_door_key');
    openDoor(s, 'kitchen', 'backyard');
    expect(hintLine(ROOMS.kitchen, s)).toBeNull();
    expect(hintLine(ROOMS.family_room, s)).toBeNull();
  });
});

describe('saving unlocked doors', () => {
  it('survives a round trip', () => {
    const s = newGameState(7);
    markUnlocked(s, 'kitchen', 'backyard');
    expect(parseSave(serialize(s)).unlocked).toEqual(s.unlocked);
  });

  it('loads a save written before doors could be unlocked', () => {
    const s = newGameState(7);
    const raw = JSON.parse(serialize(s)) as Record<string, unknown>;
    delete raw.unlocked;
    expect(parseSave(JSON.stringify(raw)).unlocked).toEqual([]);
  });
});
