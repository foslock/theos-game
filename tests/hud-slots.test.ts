import { describe, expect, it } from 'vitest';
import { slotCentre, slotFor } from '../src/ui/backpackSlots';
import { addItem, newGameState } from '../src/state/GameState';
import { SCENE_HEIGHT } from '../src/config';

describe('where a picked-up thing flies to', () => {
  it('goes to the next free slot, left to right then down', () => {
    const s = newGameState(1);
    expect(slotFor(s, 'spoon')).toBe(0);
    addItem(s, 'spoon');
    expect(slotFor(s, 'bowl')).toBe(1);
    for (const id of ['bowl', 'cereal', 'milk'] as const) addItem(s, id);
    expect(slotFor(s, 'toy_car')).toBe(4); // second row
    const a = slotCentre(0);
    const b = slotCentre(1);
    const e = slotCentre(4);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.y).toBe(a.y);
    expect(e.x).toBe(a.x);
    expect(e.y).toBeGreaterThan(a.y);
    expect(a.y).toBeGreaterThan(SCENE_HEIGHT);
  });

  it('joins a stack that is already there', () => {
    const s = newGameState(1);
    addItem(s, 'spoon');
    addItem(s, 'basketball');
    addItem(s, 'bowl');
    expect(slotFor(s, 'basketball')).toBe(1);
    expect(slotFor(s, 'milk')).toBe(3);
  });
});
