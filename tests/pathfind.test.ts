import { describe, expect, it } from 'vitest';
import { buildWalkMap, clearLine, findPath, isWalkable, snapToWalkable } from '../src/systems/Pathfind';
import { bedroom } from '../src/data/rooms/bedroom';
import type { Room } from '../src/data/rooms';

const room: Room = {
  ...bedroom,
  hotspots: [
    { kind: 'decoration', id: 'table', zone: { x: 280, y: 200, w: 80, h: 140 } }, // reaches into the floor band (280-340)
    { kind: 'decoration', id: 'rug', zone: { x: 0, y: 300, w: 640, h: 100 }, walkable: true },
    { kind: 'pickup', id: 'key', item: 'garage_key', zone: { x: 300, y: 300, w: 24, h: 24 } },
  ],
};

describe('walk map', () => {
  const map = buildWalkMap(room);
  it('blocks furniture that reaches the floor but not rugs or pickups', () => {
    expect(map.obstacles).toEqual([{ x: 280, y: 280, w: 80, h: 60 }]);
    expect(isWalkable(map, 320, 300)).toBe(false);
    expect(isWalkable(map, 320, 360)).toBe(true);
  });
  it('keeps feet below the floor line and inside the screen', () => {
    expect(isWalkable(map, 320, 250)).toBe(false);
    expect(isWalkable(map, 4, 350)).toBe(false);
  });
  it('snaps a target on furniture to the nearest open floor', () => {
    const p = snapToWalkable(map, { x: 320, y: 300 });
    expect(isWalkable(map, p.x, p.y)).toBe(true);
    expect(Math.hypot(p.x - 320, p.y - 300)).toBeLessThanOrEqual(48);
  });
});

describe('findPath', () => {
  const map = buildWalkMap(room);
  it('walks straight when nothing is in the way', () => {
    expect(findPath(map, { x: 100, y: 360 }, { x: 500, y: 360 })).toEqual([{ x: 500, y: 360 }]);
  });
  it('routes around furniture and every leg stays on open floor', () => {
    const from = { x: 100, y: 300 };
    const to = { x: 500, y: 300 };
    const path = findPath(map, from, to);
    expect(path.length).toBeGreaterThan(1);
    expect(path[path.length - 1]).toEqual(to);
    let prev = from;
    for (const p of path) {
      expect(clearLine(map, prev, p)).toBe(true);
      prev = p;
    }
  });
});
