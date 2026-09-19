import { describe, expect, it } from 'vitest';
import { buildWalkMap, clearLine, findPath, isWalkable } from '../src/systems/Pathfind';
import { playground } from '../src/data/rooms/playground';

/**
 * The climbing frame's ladder reaches almost to the bottom of the playground art, so the party
 * rests on the gravel just inside the entrance and must never be routed across the ladder.
 */
describe('playground floor', () => {
  const map = buildWalkMap(playground);
  const ladder = playground.obstacles!.find((o) => o.w > 100 && o.x < 300)!;

  it('keeps every walk-to target on open floor', () => {
    const targets = [
      playground.restPoint,
      playground.lucyRestPoint!,
      ...playground.exits.map((e) => e.walkTo),
      ...playground.hotspots.flatMap((h) => ('walkTo' in h && h.walkTo ? [h.walkTo] : [])),
    ];
    for (const t of targets) expect(isWalkable(map, t.x, t.y), `${t.x},${t.y}`).toBe(true);
  });

  it('rests the party just inside the entrance, short of the ladder', () => {
    const entry = playground.exits[0].walkTo;
    for (const p of [playground.restPoint, playground.lucyRestPoint!]) {
      expect(p.y).toBeGreaterThan(entry.y);
      expect(p.x + 24).toBeLessThan(ladder.x);
    }
  });

  it('walks in from the playhouse and over to the slide without crossing the ladder', () => {
    const entry = playground.exits[0].walkTo;
    const slide = playground.hotspots.find((h) => h.id === 'slide')!;
    for (const [from, to] of [
      [entry, playground.restPoint],
      [playground.restPoint, (slide as { walkTo: { x: number; y: number } }).walkTo],
    ] as const) {
      let prev = from;
      for (const p of findPath(map, from, to)) {
        expect(clearLine(map, prev, p)).toBe(true);
        expect(p.x < ladder.x || p.x >= ladder.x + ladder.w).toBe(true);
        prev = p;
      }
    }
  });
});
