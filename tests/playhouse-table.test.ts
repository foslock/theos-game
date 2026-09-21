import { describe, expect, it } from 'vitest';
import { ROOMS } from '../src/data/rooms';
import { placeRoom, spotIndex } from '../src/puzzles/spots';
import { hitRects, pick } from '../src/systems/Hitbox';

/*
 * The tea set and the whole table top start the tea party. The legs below are scenery with no
 * hotspot of their own, and the floor between them stays open, because the garage key may be
 * hidden there and has to stay findable.
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

  it('starts the tea party from anywhere on the table top', () => {
    const [top] = hitRects(tea);
    for (let x = top.x + 1; x < top.x + top.w; x += 12) {
      for (let y = top.y + 1; y < top.y + top.h; y += 12) {
        expect(pick(room.hotspots, x, y)?.id, `table top at ${x},${y}`).toBe('tea_set');
      }
    }
  });

  it('is the table top alone: the legs below are scenery', () => {
    const rects = hitRects(tea);
    expect(rects).toHaveLength(1);
    expect(rects[0]).toEqual({ x: 65, y: 240, w: 150, h: 89 });
    // Well down a leg is nobody's business, though the tolerance still covers just under the top.
    for (const [x, y] of [
      [75, 352],
      [148, 352],
      [205, 352],
    ]) {
      expect(pick(room.hotspots, x, y), `leg at ${x},${y}`).toBeUndefined();
    }
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
