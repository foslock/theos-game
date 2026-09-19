import { describe, expect, it } from 'vitest';
import { buildWalkMap, clearLine, findPath } from '../src/systems/Pathfind';
import { bathroom } from '../src/data/rooms/bathroom';

describe('bathroom walk-in', () => {
  it('routes below the bathtub instead of across it', () => {
    const map = buildWalkMap(bathroom);
    const from = bathroom.exits[0].walkTo;
    const path = findPath(map, from, bathroom.restPoint);
    let prev = from;
    for (const p of path) {
      expect(clearLine(map, prev, p)).toBe(true);
      prev = p;
    }
    // every waypoint under the tub's x-range must be below the block under its feet (y 372)
    for (const p of path.slice(0, -1)) if (p.x >= 372 && p.x < 562) expect(p.y).toBeGreaterThanOrEqual(372);
  });
});
