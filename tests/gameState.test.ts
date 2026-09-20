import { describe, it, expect } from 'vitest';
import { newGameState, addItem, removeItem, itemCount, markPickedUp, isPickedUp } from '../src/state/GameState';
import { MAX_INVENTORY_SLOTS } from '../src/config';

describe('inventory', () => {
  it('stacks basketballs up to 3 in one slot', () => {
    const s = newGameState(1);
    expect(addItem(s, 'basketball')).toBe(true);
    expect(addItem(s, 'basketball')).toBe(true);
    expect(addItem(s, 'basketball')).toBe(true);
    expect(addItem(s, 'basketball')).toBe(false);
    expect(s.inventory.length).toBe(1);
    expect(itemCount(s, 'basketball')).toBe(3);
  });
  it('does not stack non-stackable items and caps at 8 slots', () => {
    const s = newGameState(1);
    const ids = ['spoon', 'bowl', 'cereal', 'milk', 'stomp_rocket', 'kitchen_door_key', 'garage_key', 'playhouse_key', 'toy_car'] as const;
    const results = ids.map((id) => addItem(s, id));
    expect(results.slice(0, MAX_INVENTORY_SLOTS).every(Boolean)).toBe(true);
    expect(results[MAX_INVENTORY_SLOTS]).toBe(false);
  });
  it('removes items and empties slots', () => {
    const s = newGameState(1);
    addItem(s, 'milk');
    expect(removeItem(s, 'milk')).toBe(true);
    expect(removeItem(s, 'milk')).toBe(false);
    expect(s.inventory.length).toBe(0);
  });
  it('tracks picked-up hotspots per room', () => {
    const s = newGameState(1);
    markPickedUp(s, 'bedroom', 'stomp_rocket');
    markPickedUp(s, 'bedroom', 'stomp_rocket');
    expect(isPickedUp(s, 'bedroom', 'stomp_rocket')).toBe(true);
    expect(isPickedUp(s, 'kitchen', 'stomp_rocket')).toBe(false);
    expect(s.pickedUp.length).toBe(1);
  });
});
