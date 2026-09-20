import type { PickupHotspot, Room, RoomId } from '../data/rooms/types';
import { Rng } from '../systems/Rng';

/*
 * Where the loose items are this time. A pickup may list several `spots` it could be seeded in;
 * one is chosen from the save's seed, so a playthrough always finds each thing in the same place
 * but the next game may not. Pure: the room data stays the template, and `placeRoom` returns a
 * copy with each such pickup pinned to its spot.
 */

/** Index of the spot a pickup gets in this playthrough. Stable for a seed, independent per item. */
export function spotIndex(seed: number, room: RoomId, hotspotId: string, count: number): number {
  if (count <= 1) return 0;
  return new Rng(seed).fork(`spot:${room}:${hotspotId}`).int(0, count - 1);
}

/** The pickup with its chosen spot's fields in place of the template's. */
export function placePickup(h: PickupHotspot, seed: number, room: RoomId): PickupHotspot {
  if (!h.spots?.length) return h;
  const spot = h.spots[spotIndex(seed, room, h.id, h.spots.length)];
  const { spots: _spots, ...rest } = h;
  void _spots;
  // A spot without a peek is out in the open even if the template peeks; a spot's walkTo is optional.
  const { peek: _peek, ...base } = rest;
  void _peek;
  return { ...base, zone: spot.zone, walkTo: spot.walkTo ?? h.walkTo, ...(spot.peek ? { peek: spot.peek } : {}), where: spot.where };
}

/** The room as it is this playthrough: every seeded pickup pinned to one spot. */
export function placeRoom(room: Room, seed: number): Room {
  return { ...room, hotspots: room.hotspots.map((h) => (h.kind === 'pickup' ? placePickup(h, seed, room.id) : h)) };
}

/** Where a pickup is this playthrough, in Theo's words, if it is one that moves around. */
export function whereIs(room: Room, seed: number, hotspotId: string): string | undefined {
  const h = room.hotspots.find((x) => x.kind === 'pickup' && x.id === hotspotId);
  if (!h || h.kind !== 'pickup') return undefined;
  return h.where ?? (h.spots?.length ? placePickup(h, seed, room.id).where : undefined);
}

/** The same place in Lucy's words: "my bed" becomes "your bed". */
export function inLucysWords(where: string): string {
  return where.replace(/\bmy\b/g, 'your').replace(/\bMy\b/g, 'Your');
}
