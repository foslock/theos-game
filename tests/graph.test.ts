import { describe, it, expect } from 'vitest';
import { edges, findExit, canTravel, reachable } from '../src/data/graph';
import { ROOMS, ROOM_IDS } from '../src/data/rooms';
import { newGameState, addItem, setFlag } from '../src/state/GameState';

describe('scene graph', () => {
  it('matches the spec adjacency table', () => {
    const set = new Set(edges().map((e) => `${e.from}->${e.to}`));
    const expected = [
      'bedroom->bathroom', 'bedroom->kitchen',
      'bathroom->bedroom',
      'kitchen->family_room', 'kitchen->backyard', 'kitchen->bedroom',
      'family_room->kitchen', 'family_room->garage',
      'garage->family_room',
      'backyard->sport_court', 'backyard->playhouse', 'backyard->kitchen',
      'sport_court->backyard',
      'playhouse->backyard', 'playhouse->playground',
      'playground->playhouse',
    ];
    for (const e of expected) expect(set.has(e), e).toBe(true);
    expect(set.size).toBe(expected.length);
  });

  it('every exit has a reverse exit so entry animations have a spawn point', () => {
    for (const e of edges()) {
      expect(findExit(e.to, e.from), `${e.to} has no exit back to ${e.from}`).toBeDefined();
    }
  });

  it('every exit zone and walkTo lies inside the scene area', () => {
    for (const id of ROOM_IDS) {
      for (const ex of ROOMS[id].exits) {
        expect(ex.zone.x).toBeGreaterThanOrEqual(0);
        expect(ex.zone.y).toBeGreaterThanOrEqual(0);
        expect(ex.zone.x + ex.zone.w).toBeLessThanOrEqual(640);
        expect(ex.zone.y + ex.zone.h).toBeLessThanOrEqual(400);
        expect(ex.walkTo.y).toBeLessThanOrEqual(400);
      }
    }
  });

  it('gates match the spec', () => {
    const s = newGameState(1);
    expect(canTravel('bedroom', 'kitchen', s)).toBe(false);
    setFlag(s, 'hasBackpack');
    expect(canTravel('bedroom', 'kitchen', s)).toBe(true);
    expect(canTravel('kitchen', 'backyard', s)).toBe(false);
    addItem(s, 'kitchen_door_key');
    expect(canTravel('kitchen', 'backyard', s)).toBe(true);
    expect(canTravel('family_room', 'garage', s)).toBe(false);
    addItem(s, 'garage_key');
    expect(canTravel('family_room', 'garage', s)).toBe(true);
    expect(canTravel('backyard', 'playhouse', s)).toBe(false);
    addItem(s, 'playhouse_key');
    expect(canTravel('backyard', 'playhouse', s)).toBe(true);
    expect(canTravel('playhouse', 'playground', s)).toBe(false);
  });

  it('fresh game only reaches bedroom and bathroom; full keys reach all but playground', () => {
    const s = newGameState(1);
    expect([...reachable('bedroom', s)].sort()).toEqual(['bathroom', 'bedroom']);
    setFlag(s, 'hasBackpack');
    addItem(s, 'kitchen_door_key');
    addItem(s, 'garage_key');
    addItem(s, 'playhouse_key');
    const r = reachable('bedroom', s);
    expect(r.size).toBe(8);
    expect(r.has('playground')).toBe(false);
  });
});

describe('room layout', () => {
  const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  it('no two clickable zones overlap in any room', () => {
    const bad: string[] = [];
    for (const id of ROOM_IDS) {
      const zones = [
        ...ROOMS[id].exits.map((e) => ({ id: `exit:${e.to}`, zone: e.zone })),
        ...ROOMS[id].hotspots.map((h) => ({ id: h.id, zone: h.zone })),
      ];
      for (let i = 0; i < zones.length; i++) {
        for (let j = i + 1; j < zones.length; j++) {
          if (overlaps(zones[i].zone, zones[j].zone)) bad.push(`${id}: ${zones[i].id} overlaps ${zones[j].id}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('hotspot ids are unique within a room', () => {
    for (const id of ROOM_IDS) {
      const ids = ROOMS[id].hotspots.map((h) => h.id);
      expect(new Set(ids).size, id).toBe(ids.length);
    }
  });
});
