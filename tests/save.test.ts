import { describe, it, expect } from 'vitest';
import { parseSave, serialize, SaveError } from '../src/state/SaveManager';
import { newGameState, addItem, setFlag, markPickedUp } from '../src/state/GameState';

describe('save round trip', () => {
  it('serializes and parses back to an equal state', () => {
    const s = newGameState(42);
    s.currentRoom = 'kitchen';
    s.previousRoom = 'bedroom';
    s.lucyJoined = true;
    addItem(s, 'spoon');
    addItem(s, 'basketball');
    addItem(s, 'basketball');
    setFlag(s, 'hasBackpack');
    markPickedUp(s, 'kitchen', 'drawer_1');
    s.puzzles.breakfast = { placements: { drawer_1: { type: 'item', item: 'spoon' } }, opened: ['drawer_1'], delivered: false };
    const back = parseSave(serialize(s));
    const { savedAt: _a, ...expected } = s;
    const { savedAt: _b, ...actual } = back;
    expect(actual).toEqual(expected);
  });

  it('rejects garbage', () => {
    expect(() => parseSave('not json')).toThrow(SaveError);
    expect(() => parseSave('[]')).toThrow(SaveError);
    expect(() => parseSave('{"seed":1,"currentRoom":"moon","inventory":[],"flags":{}}')).toThrow(SaveError);
    expect(() => parseSave('{"seed":1,"currentRoom":"bedroom","inventory":[{"item":"laser"}],"flags":{}}')).toThrow(SaveError);
    expect(() => parseSave('{"version":99,"seed":1,"currentRoom":"bedroom","inventory":[],"flags":{}}')).toThrow(SaveError);
  });

  it('fills defaults for a minimal older save', () => {
    const s = parseSave('{"seed":5,"currentRoom":"garage","inventory":[],"flags":{}}');
    expect(s.version).toBe(1);
    expect(s.previousRoom).toBeNull();
    expect(s.pickedUp).toEqual([]);
    expect(s.lucyJoined).toBe(false);
  });
});
