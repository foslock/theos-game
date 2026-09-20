import type { Room } from './types';

export const familyRoom: Room = {
  id: 'family_room',
  name: 'Family Room',
  background: 'bg_family_room',
  ambientFrames: 1,
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
  ambient: [
    // Golf on the television, and dust in the light from the bay window.
    { kind: 'frames', key: 'tv_golf', at: { x: 336, y: 128 }, rate: 1.1 },
    { kind: 'motes', area: { x: 470, y: 95, w: 110, h: 130 }, count: 18, drift: { x: -6, y: 4 } },
  ],
  hotspots: [
    {
      kind: 'pickup',
      id: 'kitchen_door_key',
      item: 'kitchen_door_key',
      zone: { x: 376, y: 222, w: 24, h: 24 },
      walkTo: { x: 388, y: 302 },
      spots: [
        // Left on the coffee table, in the middle of its top.
        { zone: { x: 376, y: 222, w: 24, h: 24 }, walkTo: { x: 388, y: 302 }, where: 'on the coffee table' },
        // Dropped on the rug in front of the couch.
        { zone: { x: 470, y: 284, w: 24, h: 24 }, walkTo: { x: 470, y: 322 }, where: 'on the rug by the couch' },
        // On the floor at the foot of the fireplace.
        { zone: { x: 200, y: 232, w: 24, h: 24 }, walkTo: { x: 215, y: 296 }, where: 'by the fireplace' },
      ],
    },
    {
      kind: 'pickup',
      id: 'basketball',
      item: 'basketball',
      zone: { x: 248, y: 246, w: 13, h: 24 },
      peek: { at: { x: 256, y: 258 }, cover: { x: 261, y: 244, w: 16, h: 26 } },
      walkTo: { x: 245, y: 300 },
      condition: { flag: 'hasBackpack' },
      refusalComment: 'A basketball! But I need my backpack to carry it.',
      foundComment: 'A basketball! It was hiding in the family room.',
      spots: [
        // Half hidden behind the armchair, peeking out over the rug on its left.
        { zone: { x: 248, y: 246, w: 13, h: 24 }, peek: { at: { x: 256, y: 258 }, cover: { x: 261, y: 244, w: 16, h: 26 } }, walkTo: { x: 245, y: 300 }, where: 'behind the chair' },
        // Behind the far arm of the couch (its edge is x 524), on the floor by the window.
        { zone: { x: 524, y: 242, w: 14, h: 24 }, peek: { at: { x: 526, y: 254 }, cover: { x: 512, y: 240, w: 12, h: 28 } }, walkTo: { x: 540, y: 322 }, where: 'behind the couch' },
        // On the floor at the foot of the kitchen doorway's jamb.
        { zone: { x: 76, y: 276, w: 24, h: 24 }, walkTo: { x: 110, y: 330 }, where: 'by the door frame' },
      ],
    },
    // The screen itself; the old box sat 11px left of it and clipped its right edge.
    { kind: 'decoration', id: 'tv', zone: { x: 330, y: 108, w: 94, h: 84 }, lines: ["Golf! He's lining up a really long putt.", 'Shh... he needs to concentrate. Will it go in?', 'That green looks so bouncy.'], sfx: 'click' },
    {
      kind: 'decoration',
      id: 'couch',
      zone: { x: 425, y: 185, w: 94, h: 95 },
      // Cushioned back, then the seat and the near armrest reaching further right.
      parts: [
        { x: 428, y: 186, w: 72, h: 56 },
        { x: 428, y: 230, w: 91, h: 50 },
      ],
      lines: ['Comfy!', 'Squish squish. The cushions are so soft.', "That's where Dad reads the paper."],
      sfx: 'boing',
    },
    {
      kind: 'decoration',
      id: 'armchair',
      // Starts at the chair's real left edge so the ball peeking out beside it is its own target.
      zone: { x: 261, y: 195, w: 84, h: 90 },
      // Tall back on the left, wider seat and arms below; the top right of the box is open floor.
      parts: [
        { x: 261, y: 195, w: 52, h: 62 },
        { x: 261, y: 235, w: 84, h: 50 },
      ],
      lines: ['Bouncy checkered chair!', "That's Mom's chair.", 'Red and white, like a picnic blanket.'],
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
      lines: ['No fire today. Too warm!', 'In winter it crackles and pops.', "I'm not allowed to touch the fire poker."],
      sfx: 'click',
    },
    { kind: 'decoration', id: 'window_seat', zone: { x: 490, y: 90, w: 90, h: 90 }, lines: ['I can see the backyard from here.', 'The sun is shining on the cushions.', 'A good spot for looking at birds.'], sfx: 'ding' },
    { kind: 'decoration', id: 'bookshelf', zone: { x: 115, y: 45, w: 85, h: 190 }, lines: ['So many books!', 'The one with the bear is my favourite.', 'Lucy likes the one with the flaps.'], sfx: 'ding' },
  ],
};
