import { describe, expect, it } from 'vitest';
import { canOpen, closeMismatch, dealLevel, LEVELS, MEMORY_ITEMS, newMemory, nextLevel, openBox, pairsFound, type MemoryState } from '../src/puzzles/memory';
import { Rng } from '../src/systems/Rng';

describe('dealing a level', () => {
  it('fills every cell but the skipped ones with pairs of different things', () => {
    for (let level = 0; level < LEVELS.length; level++) {
      const spec = LEVELS[level];
      const boxes = dealLevel(new Rng(3), level);
      expect(boxes).toHaveLength(spec.cols * spec.rows - (spec.skip?.length ?? 0));
      expect(boxes).toHaveLength(spec.pairs * 2);
      const counts = new Map<string, number>();
      for (const b of boxes) counts.set(b.item, (counts.get(b.item) ?? 0) + 1);
      expect(counts.size).toBe(spec.pairs);
      for (const n of counts.values()) expect(n).toBe(2);
      for (const s of spec.skip ?? []) expect(boxes.some((b) => b.col === s.col && b.row === s.row)).toBe(false);
      for (const b of boxes) expect(MEMORY_ITEMS).toContain(b.item);
    }
  });

  it('is the same for a seed and different for another', () => {
    const a = JSON.stringify(dealLevel(new Rng(9), 2));
    expect(JSON.stringify(dealLevel(new Rng(9), 2))).toBe(a);
    expect(JSON.stringify(dealLevel(new Rng(10), 2))).not.toBe(a);
  });

  it('never needs more kinds of thing than there are', () => {
    for (const spec of LEVELS) expect(spec.pairs).toBeLessThanOrEqual(MEMORY_ITEMS.length);
  });
});

/** Opens matching boxes one pair at a time, the way a player with perfect memory would. */
function solveLevel(state: MemoryState): string[] {
  const events: string[] = [];
  while (state.boxes.some((b) => b.state !== 'matched') && !state.won) {
    const i = state.boxes.findIndex((b) => b.state === 'closed');
    const j = state.boxes.findIndex((b, k) => k !== i && b.state === 'closed' && b.item === state.boxes[i].item);
    events.push(...openBox(state, i), ...openBox(state, j));
    if (events[events.length - 1] === 'mismatch') throw new Error('solver mismatched');
  }
  return events;
}

describe('playing', () => {
  it('keeps a matched pair open and closes a mismatched one', () => {
    const rng = new Rng(4);
    const s = newMemory(rng);
    const i = 0;
    const j = s.boxes.findIndex((b, k) => k !== i && b.item !== s.boxes[i].item);
    expect(openBox(s, i)).toEqual(['open']);
    expect(openBox(s, j)).toEqual(['open', 'mismatch']);
    // Both stay showing, and nothing else opens, until the mismatch is put back.
    expect(s.boxes[i].state).toBe('open');
    expect(canOpen(s, s.boxes.findIndex((b) => b.state === 'closed'))).toBe(false);
    closeMismatch(s);
    expect(s.boxes[i].state).toBe('closed');
    expect(s.boxes[j].state).toBe('closed');
    const m = s.boxes.findIndex((b, k) => k !== i && b.item === s.boxes[i].item);
    expect(openBox(s, i)).toEqual(['open']);
    expect(openBox(s, m)).toEqual(['open', 'match']);
    expect(s.boxes[i].state).toBe('matched');
    expect(openBox(s, i)).toEqual([]); // matched boxes are done
    expect(pairsFound(s)).toBe(1);
  });

  it('moves through the three levels and wins on the last', () => {
    const rng = new Rng(11);
    const s = newMemory(rng);
    let events = solveLevel(s);
    expect(events).toContain('levelDone');
    expect(s.won).toBe(false);
    nextLevel(s, rng);
    expect(s.level).toBe(1);
    expect(s.boxes).toHaveLength(8);
    events = solveLevel(s);
    expect(events).toContain('levelDone');
    nextLevel(s, rng);
    expect(s.level).toBe(2);
    expect(s.boxes).toHaveLength(16);
    events = solveLevel(s);
    expect(events).toContain('won');
    expect(events).not.toContain('levelDone');
    expect(s.won).toBe(true);
    nextLevel(s, rng);
    expect(s.level).toBe(2);
  });
});
