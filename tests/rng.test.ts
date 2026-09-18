import { describe, it, expect } from 'vitest';
import { Rng } from '../src/systems/Rng';

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(1234), b = new Rng(1234);
    for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next());
  });
  it('int stays within bounds', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
  it('shuffle is a permutation', () => {
    const out = new Rng(3).shuffle([1, 2, 3, 4, 5]);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('fork gives independent but deterministic streams', () => {
    expect(new Rng(9).fork('a').next()).toBe(new Rng(9).fork('a').next());
    expect(new Rng(9).fork('a').next()).not.toBe(new Rng(9).fork('b').next());
  });
});
