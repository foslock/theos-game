import { describe, it, expect } from 'vitest';
import { edges, findExit, canTravel, reachable } from '../src/data/graph';
import { overlaps, partsWithinZone } from '../src/systems/Hitbox';
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
    expect(canTravel('kitchen', 'family_room', s)).toBe(false);
    setFlag(s, 'breakfastDone');
    expect(canTravel('kitchen', 'family_room', s)).toBe(true);
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
    setFlag(s, 'basketballDone');
    expect(canTravel('playhouse', 'playground', s)).toBe(true);
  });

  it('fresh game only reaches bedroom and bathroom; full keys reach all but playground, which the hoop game opens', () => {
    const s = newGameState(1);
    expect([...reachable('bedroom', s)].sort()).toEqual(['bathroom', 'bedroom']);
    setFlag(s, 'hasBackpack');
    // Until breakfast is made the kitchen is as far as it goes: the back door key is behind that gate.
    expect([...reachable('bedroom', s)].sort()).toEqual(['bathroom', 'bedroom', 'kitchen']);
    setFlag(s, 'breakfastDone');
    addItem(s, 'kitchen_door_key');
    addItem(s, 'garage_key');
    addItem(s, 'playhouse_key');
    const r = reachable('bedroom', s);
    expect(r.size).toBe(8);
    expect(r.has('playground')).toBe(false);
    setFlag(s, 'basketballDone');
    expect(reachable('bedroom', s).size).toBe(9);
  });
});

describe('room layout', () => {
  // Every place a seeded pickup could be counts, so no layout the seed deals can clash.
  const footprints = (id: (typeof ROOM_IDS)[number]) => [
    ...ROOMS[id].exits.map((e) => ({ id: `exit:${e.to}`, box: e })),
    ...ROOMS[id].hotspots.flatMap((h) =>
      h.kind === 'pickup' && h.spots?.length ? h.spots.map((s, i) => ({ id: `${h.id}#${i} (${s.where})`, box: { zone: s.zone } })) : [{ id: h.id, box: h }],
    ),
  ];

  /**
   * A click resolves to the single nearest footprint, so two that share a pixel would make the
   * target ambiguous there. Shapes may sit close: the pick tolerance covers the gap between them.
   */
  it('no two clickable footprints overlap in any room', () => {
    const bad: string[] = [];
    for (const id of ROOM_IDS) {
      const items = footprints(id);
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          if (overlaps(items[i].box, items[j].box)) bad.push(`${id}: ${items[i].id} overlaps ${items[j].id}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps every shape inside the bounding box the game measures from', () => {
    const bad: string[] = [];
    for (const id of ROOM_IDS) {
      for (const { id: hid, box } of footprints(id)) if (!partsWithinZone(box)) bad.push(`${id}: ${hid}`);
    }
    expect(bad).toEqual([]);
  });

  it('gives every decoration Theo comments on three lines to cycle through', () => {
    for (const id of ROOM_IDS) {
      for (const h of ROOMS[id].hotspots) {
        if (h.kind === 'decoration' && h.lines?.length) expect(h.lines.length, `${id}: ${h.id}`).toBe(3);
      }
    }
  });

  it('hotspot ids are unique within a room', () => {
    for (const id of ROOM_IDS) {
      const ids = ROOMS[id].hotspots.map((h) => h.id);
      expect(new Set(ids).size, id).toBe(ids.length);
    }
  });
});
