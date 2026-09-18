import { describe, expect, it } from 'vitest';
import { buildWalkMap, clearLine, findPath, isWalkable } from '../src/systems/Pathfind';
import { bedroom } from '../src/data/rooms/bedroom';

/**
 * The bed is an overlay whose hotspot doubles as a walk blocker, so nudging it can strand the
 * spots Theo has to reach — in particular the stomp rocket, which he approaches along the narrow
 * strip of carpet below the bed.
 */
describe('bedroom floor', () => {
  const map = buildWalkMap(bedroom);

  it('keeps every walk-to target on open floor', () => {
    const targets = [
      bedroom.restPoint,
      ...bedroom.exits.map((e) => e.walkTo),
      ...bedroom.hotspots.flatMap((h) => ('walkTo' in h && h.walkTo ? [h.walkTo] : [])),
    ];
    for (const t of targets) expect(isWalkable(map, t.x, t.y)).toBe(true);
  });

  it('routes from where Theo lands after getting up to his resting spot', () => {
    const from = { x: 300, y: 344 };
    expect(isWalkable(map, from.x, from.y)).toBe(true);
    let prev = from;
    for (const p of findPath(map, from, bedroom.restPoint)) {
      expect(clearLine(map, prev, p)).toBe(true);
      prev = p;
    }
  });
});
