import { describe, expect, it } from 'vitest';
import { ROOMS } from '../src/data/rooms';
import { placeRoom, spotIndex } from '../src/puzzles/spots';
import { hitRects, pick } from '../src/systems/Hitbox';

/*
 * The whole of the little table starts the tea party: the tea set on it, the table top and the
 * legs under it. The floor between the legs stays open, because the garage key may be hidden
 * there and has to stay findable.
 */

const room = ROOMS.playhouse;
const tea = room.hotspots.find((h) => h.id === 'tea_set')!;
/** The spot under the table, as the room data lists it. */
const key = room.hotspots.find((h) => h.id === 'garage_key')!;
const underTable = key.kind === 'pickup' ? key.spots!.find((s) => s.where === 'under the table')! : undefined!;

describe('the playhouse table', () => {
  it('has no separate furniture hotspot left on it', () => {
    expect(room.hotspots.find((h) => h.id === 'table')).toBeUndefined();
  });

  it('starts the tea party from the table top and from every leg', () => {
    const [top, ...legs] = hitRects(tea);
    for (const rect of [top, ...legs]) {
      for (const [x, y] of [
        [rect.x + 1, rect.y + 1],
        [rect.x + rect.w / 2, rect.y + rect.h / 2],
        [rect.x + rect.w - 1, rect.y + rect.h - 1],
      ]) {
        expect(pick(room.hotspots, x, y)?.id, `table part at ${x},${y}`).toBe('tea_set');
      }
    }
  });

  it('covers the table top and three legs, and nothing else', () => {
    const rects = hitRects(tea);
    expect(rects).toHaveLength(4);
    // The gap between the legs is not part of it.
    const gap = { x: 100, y: 344 };
    expect(rects.some((r) => gap.x >= r.x && gap.x <= r.x + r.w && gap.y >= r.y && gap.y <= r.y + r.h)).toBe(false);
  });

  it('still lets the key be picked up from under the table', () => {
    const z = underTable.zone;
    const placed = { ...room, hotspots: room.hotspots.map((h) => (h.id === 'garage_key' ? { ...h, zone: z } : h)) };
    for (const [x, y] of [
      [z.x + 1, z.y + 1],
      [z.x + z.w / 2, z.y + z.h / 2],
      [z.x + z.w - 1, z.y + z.h - 1],
    ]) {
      expect(pick(placed.hotspots, x, y)?.id, `key under the table at ${x},${y}`).toBe('garage_key');
    }
  });

  it('puts the key under the table on some seeds, so that case is real', () => {
    const idx = key.kind === 'pickup' ? key.spots!.indexOf(underTable) : -1;
    const seeds = [];
    for (let seed = 0; seed < 60; seed++) if (spotIndex(seed, 'playhouse', 'garage_key', 3) === idx) seeds.push(seed);
    expect(seeds.length).toBeGreaterThan(0);
    // And on such a seed the placed room still resolves both.
    const placed = placeRoom(room, seeds[0]);
    const z = underTable.zone;
    expect(pick(placed.hotspots, z.x + z.w / 2, z.y + z.h / 2)?.id).toBe('garage_key');
  });
});
