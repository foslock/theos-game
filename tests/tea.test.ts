import { describe, expect, it } from 'vitest';
import { CUPS_PER_LEVEL, dealLevel, fillable, LEVEL_VALUES, MAX_CUP, MIN_CUP, newTea, nextLevel, pickPot, pour, resetLevel, type TeaState } from '../src/puzzles/tea';
import { Rng } from '../src/systems/Rng';

describe('dealing cups', () => {
  it('sets out three cups a level from that level\'s amounts, never all the same', () => {
    for (let level = 0; level < CUPS_PER_LEVEL.length; level++) {
      const pool = LEVEL_VALUES[level];
      for (let seed = 0; seed < 40; seed++) {
        const cups = dealLevel(new Rng(seed), level);
        expect(cups).toHaveLength(3);
        const distinct = new Set(cups.map((c) => c.value)).size;
        expect(distinct).toBe(Math.min(3, pool.length));
        for (const c of cups) {
          expect(pool).toContain(c.value);
          expect(c.value).toBeGreaterThanOrEqual(MIN_CUP);
          expect(c.value).toBeLessThanOrEqual(MAX_CUP);
          expect(c.filled).toBe(0);
        }
      }
    }
  });

  it('starts with single pours and works up to nine', () => {
    expect(LEVEL_VALUES[0]).toEqual([2, 3]);
    expect(Math.max(...LEVEL_VALUES[LEVEL_VALUES.length - 1])).toBe(9);
    for (let i = 1; i < LEVEL_VALUES.length; i++) expect(Math.min(...LEVEL_VALUES[i])).toBeGreaterThan(Math.max(...LEVEL_VALUES[i - 1]));
  });

  it('every cup can be filled exactly with twos and threes', () => {
    for (let v = MIN_CUP; v <= MAX_CUP; v++) {
      let ok = false;
      for (let threes = 0; threes * 3 <= v; threes++) if ((v - threes * 3) % 2 === 0) ok = true;
      expect(ok, `${v}`).toBe(true);
      expect(fillable({ value: v, filled: 0 })).toBe(true);
    }
    expect(fillable({ value: 4, filled: 3 })).toBe(false);
  });
});

/** Fills every cup the safe way: a three whenever what is left is odd or at least six, otherwise a two. */
function solve(s: TeaState): string[] {
  const events: string[] = [];
  s.cups.forEach((cup, i) => {
    while (cup.filled < cup.value) {
      const left = cup.value - cup.filled;
      pickPot(s, left % 2 === 1 || left >= 6 ? 3 : 2);
      events.push(...pour(s, i));
    }
  });
  return events;
}

describe('pouring', () => {
  it('fills a 5 with the big pot then the small one', () => {
    const s: TeaState = { level: 0, cups: [{ value: 5, filled: 0 }, { value: 2, filled: 0 }], pot: null, won: false };
    expect(pour(s, 0)).toEqual([]); // no pot in hand
    pickPot(s, 3);
    expect(pour(s, 0)).toEqual(['pour']);
    pickPot(s, 2);
    expect(pour(s, 0)).toEqual(['pour', 'cupFull']);
    expect(pour(s, 0)).toEqual([]); // full cups take no more
    expect(pour(s, 1)).toEqual(['pour', 'cupFull', 'levelDone']);
  });

  it('spills on too much, and on a cup left one short', () => {
    const s: TeaState = { level: 0, cups: [{ value: 2, filled: 0 }, { value: 4, filled: 0 }], pot: null, won: false };
    pickPot(s, 3);
    expect(pour(s, 0)).toEqual(['pour', 'overflow']);
    resetLevel(s);
    expect(s.cups.map((c) => c.filled)).toEqual([0, 0]);
    expect(s.pot).toBeNull();
    pickPot(s, 3);
    expect(pour(s, 1)).toEqual(['pour', 'short']);
  });

  it('runs through three levels and wins on the last', () => {
    const rng = new Rng(8);
    const s = newTea(rng);
    expect(solve(s)).toContain('levelDone');
    nextLevel(s, rng);
    expect(s.cups).toHaveLength(3);
    expect(solve(s)).toContain('levelDone');
    nextLevel(s, rng);
    expect(s.level).toBe(2);
    expect(s.cups).toHaveLength(3);
    const events = solve(s);
    expect(events).toContain('won');
    expect(s.won).toBe(true);
  });
});
