import { describe, it, expect } from 'vitest';
import { evaluate } from '../src/systems/Conditions';
import { newGameState, addItem, setFlag } from '../src/state/GameState';

describe('evaluate', () => {
  it('treats undefined as open', () => {
    expect(evaluate(undefined, newGameState(1))).toBe(true);
  });
  it('never is always false', () => {
    expect(evaluate({ never: true }, newGameState(1))).toBe(false);
  });
  it('hasItem checks inventory and count', () => {
    const s = newGameState(1);
    expect(evaluate({ hasItem: 'garage_key' }, s)).toBe(false);
    addItem(s, 'garage_key');
    expect(evaluate({ hasItem: 'garage_key' }, s)).toBe(true);
    addItem(s, 'basketball');
    addItem(s, 'basketball');
    expect(evaluate({ hasItem: 'basketball', count: 3 }, s)).toBe(false);
    addItem(s, 'basketball');
    expect(evaluate({ hasItem: 'basketball', count: 3 }, s)).toBe(true);
  });
  it('flag, all, any', () => {
    const s = newGameState(1);
    expect(evaluate({ flag: 'x' }, s)).toBe(false);
    setFlag(s, 'x');
    expect(evaluate({ flag: 'x' }, s)).toBe(true);
    expect(evaluate({ all: [{ flag: 'x' }, { hasItem: 'milk' }] }, s)).toBe(false);
    expect(evaluate({ any: [{ flag: 'x' }, { hasItem: 'milk' }] }, s)).toBe(true);
  });
});
