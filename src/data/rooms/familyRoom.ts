import type { Room } from './types';

export const familyRoom: Room = {
  id: 'family_room',
  name: 'Family Room',
  background: 'bg_family_room',
  ambientFrames: 2,
  restPoint: { x: 320, y: 330 },
  lucyRestPoint: { x: 270, y: 335 },
  palette: { wall: '#c9a27a', floor: '#7a4f2c', accent: '#3f6e4a' },
  exits: [
    { to: 'kitchen', zone: { x: 0, y: 70, w: 50, h: 320 }, walkTo: { x: 40, y: 340 }, direction: 'left' },
    {
      to: 'garage',
      zone: { x: 590, y: 170, w: 50, h: 215 },
      walkTo: { x: 600, y: 340 },
      direction: 'right',
      condition: { hasItem: 'garage_key' },
      lockedComment: "The garage door is locked tight.",
    },
  ],
  hotspots: [
    { kind: 'pickup', id: 'kitchen_door_key', item: 'kitchen_door_key', zone: { x: 372, y: 268, w: 30, h: 22 }, walkTo: { x: 387, y: 338 } },
    { kind: 'pickup', id: 'toy_bus', item: 'toy_bus', zone: { x: 520, y: 272, w: 50, h: 34 }, walkTo: { x: 500, y: 340 } },
    // The screen itself; the old box sat 11px left of it and clipped its right edge.
    { kind: 'decoration', id: 'tv', zone: { x: 330, y: 108, w: 94, h: 84 }, lines: ['Static... Static...', "Nothing good is on."], sfx: 'click' },
    {
      kind: 'decoration',
      id: 'couch',
      zone: { x: 425, y: 185, w: 94, h: 95 },
      // Cushioned back, then the seat and the near armrest reaching further right.
      parts: [
        { x: 428, y: 186, w: 72, h: 56 },
        { x: 428, y: 230, w: 91, h: 50 },
      ],
      lines: ['Comfy!'],
      sfx: 'boing',
    },
    {
      kind: 'decoration',
      id: 'armchair',
      zone: { x: 255, y: 195, w: 90, h: 90 },
      // Tall back on the left, wider seat and arms below; the top right of the box is open floor.
      parts: [
        { x: 255, y: 195, w: 58, h: 62 },
        { x: 255, y: 235, w: 90, h: 50 },
      ],
      lines: ['Bouncy checkered chair!'],
      sfx: 'boing',
    },
    {
      kind: 'decoration',
      id: 'fireplace',
      zone: { x: 215, y: 152, w: 85, h: 68 },
      // Mantel shelf, plus the sliver of firebox the armchair does not stand in front of.
      parts: [
        { x: 215, y: 152, w: 85, h: 14 },
        { x: 226, y: 170, w: 25, h: 50 },
      ],
      lines: ['No fire today. Too warm!'],
      sfx: 'click',
    },
    { kind: 'decoration', id: 'window_seat', zone: { x: 490, y: 90, w: 90, h: 90 }, lines: ['I can see the backyard from here.'], sfx: 'ding' },
    { kind: 'decoration', id: 'bookshelf', zone: { x: 115, y: 45, w: 85, h: 190 }, lines: ['So many books!'], sfx: 'ding' },
  ],
};
