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
    s.records = { rocket: 216, slide: 0, race: 18.4 };
    const back = parseSave(serialize(s));
    const { savedAt: _a, ...expected } = s;
    const { savedAt: _b, ...actual } = back;
    expect(actual).toEqual(expected);
  });

  it('rejects garbage', () => {
    expect(() => parseSave('not json')).toThrow(SaveError);
    expect(() => parseSave('[]')).toThrow(SaveError);
    expect(() => parseSave('{"seed":1,"currentRoom":"moon","inventory":[],"flags":{}}')).toThrow(SaveError);
    expect(() => parseSave('{"seed":1,"currentRoom":"bedroom","inventory":[{"count":1}],"flags":{}}')).toThrow(SaveError);
    expect(() => parseSave('{"version":99,"seed":1,"currentRoom":"bedroom","inventory":[],"flags":{}}')).toThrow(SaveError);
  });

  it('leaves behind things the game no longer has, rather than refusing the save', () => {
    // The family room's toy bus was removed on 2026-09-20; a save carrying one still loads without it.
    const s = parseSave('{"seed":1,"currentRoom":"family_room","inventory":[{"item":"toy_bus","count":1},{"item":"spoon","count":1}],"flags":{}}');
    expect(s.inventory).toEqual([{ item: 'spoon', count: 1 }]);
  });

  it('carries a rocket taken from the old bedroom spot over to the garage', () => {
    const s = parseSave('{"seed":1,"currentRoom":"backyard","inventory":[{"item":"stomp_rocket","count":1}],"flags":{},"pickedUp":["bedroom:stomp_rocket"]}');
    expect(s.pickedUp).toContain('garage:stomp_rocket');
    const fresh = parseSave('{"seed":1,"currentRoom":"garage","inventory":[],"flags":{},"pickedUp":[]}');
    expect(fresh.pickedUp).toEqual([]);
  });

  it('keeps only real numbers among the records', () => {
    const s = parseSave('{"seed":5,"currentRoom":"garage","inventory":[],"flags":{},"records":{"rocket":216,"slide":"lots","race":null}}');
    expect(s.records).toEqual({ rocket: 216 });
  });

  it('fills defaults for a minimal older save', () => {
    const s = parseSave('{"seed":5,"currentRoom":"garage","inventory":[],"flags":{}}');
    expect(s.version).toBe(1);
    // A save from before the games kept records simply has none.
    expect(s.records).toEqual({});
    expect(s.previousRoom).toBeNull();
    expect(s.pickedUp).toEqual([]);
    expect(s.lucyJoined).toBe(false);
  });
});
