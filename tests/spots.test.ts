import { describe, expect, it } from 'vitest';
import { ROOMS, ROOM_IDS, type PickupHotspot } from '../src/data/rooms';
import { inLucysWords, placePickup, placeRoom, spotIndex, whereIs } from '../src/puzzles/spots';
import { buildWalkMap, isWalkable } from '../src/systems/Pathfind';
import { hintLine, lucyHintLine } from '../src/systems/Hints';
import { newGameState, setFlag } from '../src/state/GameState';

/** The pickups that move around, by room. */
const seeded = ROOM_IDS.flatMap((id) => ROOMS[id].hotspots.filter((h): h is PickupHotspot => h.kind === 'pickup' && !!h.spots?.length).map((h) => ({ room: id, h })));

describe('seeded item spots', () => {
  it('covers the stomp rocket, the three basketballs and both keys, with three places each', () => {
    const ids = seeded.map(({ room, h }) => `${room}:${h.id}`).sort();
    expect(ids).toEqual(['bedroom:basketball', 'bedroom:toy_car', 'family_room:basketball', 'family_room:kitchen_door_key', 'garage:basketball', 'garage:stomp_rocket', 'playhouse:garage_key'].sort());
    for (const { h } of seeded) expect(h.spots).toHaveLength(3);
  });

  it('picks the same spot for a seed every time, and reaches every spot across seeds', () => {
    for (const { room, h } of seeded) {
      const seen = new Set<number>();
      for (let seed = 0; seed < 60; seed++) {
        const a = spotIndex(seed, room, h.id, h.spots!.length);
        expect(spotIndex(seed, room, h.id, h.spots!.length)).toBe(a);
        seen.add(a);
      }
      expect(seen.size, `${room}:${h.id}`).toBe(3);
    }
  });

  it('does not deal every item the same spot number', () => {
    // Items roll independently, so a seed does not put everything in its first place.
    const seeds = Array.from({ length: 40 }, (_, i) => i * 7919);
    const allSame = seeds.filter((seed) => {
      const idx = seeded.map(({ room, h }) => spotIndex(seed, room, h.id, 3));
      return idx.every((i) => i === idx[0]);
    });
    expect(allSame.length).toBeLessThan(seeds.length / 4);
  });

  it('pins a pickup to its spot, replacing the template zone, walk-to and peek', () => {
    const ball = ROOMS.bedroom.hotspots.find((h) => h.id === 'basketball') as PickupHotspot;
    for (let i = 0; i < 3; i++) {
      const seed = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find((s) => spotIndex(s, 'bedroom', 'basketball', 3) === i)!;
      const placed = placePickup(ball, seed, 'bedroom');
      const spot = ball.spots![i];
      expect(placed.zone).toEqual(spot.zone);
      expect(placed.walkTo).toEqual(spot.walkTo);
      expect(placed.peek).toEqual(spot.peek);
      expect(placed.where).toBe(spot.where);
      expect(placed.spots).toBeUndefined();
      expect(placed.item).toBe('basketball');
    }
  });

  it('leaves pickups without spots alone', () => {
    const key = ROOMS.backyard.hotspots.find((h) => h.id === 'playhouse_key') as PickupHotspot;
    expect(placePickup(key, 5, 'backyard')).toBe(key);
  });

  it('keeps every spot walkable-to on every room floor', () => {
    for (const { room, h } of seeded) {
      const map = buildWalkMap(ROOMS[room]);
      for (const spot of h.spots!) {
        const to = spot.walkTo ?? h.walkTo;
        expect(to, `${room}:${h.id} ${spot.where}`).toBeDefined();
        expect(isWalkable(map, to!.x, to!.y), `${room}:${h.id} ${spot.where} (${to!.x},${to!.y})`).toBe(true);
      }
    }
  });

  it('keeps a peeking spot zone inside the drawn sprite', () => {
    for (const { room, h } of seeded) {
      for (const spot of h.spots!) {
        if (!spot.peek) continue;
        const { at } = spot.peek;
        const z = spot.zone;
        // A 24px item centred at `at`: the visible zone must lie within it.
        expect(z.x, `${room}:${h.id} ${spot.where}`).toBeGreaterThanOrEqual(at.x - 12);
        expect(z.x + z.w).toBeLessThanOrEqual(at.x + 12);
        expect(z.y).toBeGreaterThanOrEqual(at.y - 12);
        expect(z.y + z.h).toBeLessThanOrEqual(at.y + 12);
      }
    }
  });
});

describe('hints know where things are this time', () => {
  it('say where the rocket is, in each voice', () => {
    for (let seed = 0; seed < 6; seed++) {
      const room = placeRoom(ROOMS.garage, seed);
      const where = whereIs(ROOMS.garage, seed, 'stomp_rocket')!;
      const s = newGameState(seed);
      setFlag(s, 'hasBackpack');
      setFlag(s, 'breakfastDone');
      setFlag(s, 'stompRocketHinted');
      expect(hintLine(room, s)).toContain(where);
      expect(lucyHintLine(room, s)).toContain(inLucysWords(where));
    }
  });

  it('turn "my" into "your" for Lucy', () => {
    expect(inLucysWords('at the foot of my bed')).toBe('at the foot of your bed');
    expect(inLucysWords('under my window')).toBe('under your window');
    expect(inLucysWords('behind the chair')).toBe('behind the chair');
  });
});
