import type { Room } from './types';

export const garage: Room = {
  id: 'garage',
  name: 'Garage',
  background: 'bg_garage',
  ambientFrames: 1,
  restPoint: { x: 320, y: 340 },
  lucyRestPoint: { x: 270, y: 345 },
  palette: { wall: '#8c8c8c', floor: '#5c5c5c', accent: '#d94b3a' },
  exits: [{ to: 'family_room', zone: { x: 15, y: 15, w: 80, h: 270 }, walkTo: { x: 75, y: 305 }, direction: 'left' }],
  // Feet stay out from under the car, even where its click shape leaves the shadow open.
  obstacles: [{ x: 440, y: 296, w: 90, h: 56 }],
  ambient: [
    // The hanging lamp sways and stutters; a moth keeps it company.
    { kind: 'rock', key: 'garage_lamp', at: { x: 388, y: 0 }, pivot: { x: 420, y: 0 }, amplitude: 3, period: 3.4, glow: { x: 0, y: 54 } },
    { kind: 'flutter', key: 'moth', area: { x: 392, y: 34, w: 60, h: 46 }, rate: 10, speed: 34 },
  ],
  hotspots: [
    {
      kind: 'decoration',
      id: 'car',
      zone: { x: 440, y: 140, w: 200, h: 210 },
      // Body and back wheel, then the front wheel: the shadow under the car between them is open.
      parts: [
        { x: 440, y: 140, w: 200, h: 160 },
        { x: 525, y: 300, w: 115, h: 50 },
      ],
      lines: ['HONK HONK!', 'Beep beep!', "Dad's car. It's really red."],
      sfx: 'ding',
    },
    { kind: 'decoration', id: 'toolbox', zone: { x: 10, y: 320, w: 105, h: 75 }, lines: ['Clank clank. Tools!', 'Hammers and wrenches and screwy things.', 'Dad fixes stuff with these.'], sfx: 'click' },
    {
      kind: 'pickup',
      id: 'basketball',
      item: 'basketball',
      zone: { x: 117, y: 354, w: 13, h: 24 },
      peek: { at: { x: 118, y: 366 }, cover: { x: 104, y: 352, w: 13, h: 28 } },
      walkTo: { x: 150, y: 388 },
      condition: { flag: 'hasBackpack' },
      refusalComment: 'A basketball! But I need my backpack to carry it.',
      foundComment: 'A basketball! It was hiding in the garage.',
      spots: [
        // Behind the toolbox, with its right side showing on the floor beside it.
        { zone: { x: 117, y: 354, w: 13, h: 24 }, peek: { at: { x: 118, y: 366 }, cover: { x: 104, y: 352, w: 13, h: 28 } }, walkTo: { x: 150, y: 388 }, where: "behind Dad's toolbox" },
        // Behind the bottom box of the shelves (its edge is x 176), showing in the gap before the bike's wheel.
        { zone: { x: 176, y: 250, w: 9, h: 24 }, peek: { at: { x: 178, y: 262 }, cover: { x: 160, y: 248, w: 16, h: 28 } }, walkTo: { x: 185, y: 320 }, where: 'behind the boxes' },
        // In the shadow under the car, behind its front wheel.
        { zone: { x: 506, y: 316, w: 19, h: 24 }, peek: { at: { x: 518, y: 328 }, cover: { x: 526, y: 314, w: 5, h: 28 } }, walkTo: { x: 490, y: 372 }, where: "under Dad's car" },
      ],
    },
    {
      kind: 'pickup',
      id: 'stomp_rocket',
      item: 'stomp_rocket',
      zone: { x: 330, y: 290, w: 24, h: 24 },
      walkTo: { x: 342, y: 332 },
      condition: { flag: 'hasBackpack' },
      refusalComment: "My stomp rocket! But I need something to carry it in...",
      // Once launched it lives on the launcher in the backyard, so it is not lying here as well.
      goneWhenFlag: 'stompRocketDone',
      spots: [
        // On the floor in front of the garage door.
        { zone: { x: 330, y: 290, w: 24, h: 24 }, walkTo: { x: 342, y: 332 }, where: 'in front of the garage door' },
        // Beside the toolbox.
        { zone: { x: 150, y: 322, w: 24, h: 24 }, walkTo: { x: 170, y: 362 }, where: "next to Dad's toolbox" },
        // By the back wheel of the car.
        { zone: { x: 408, y: 300, w: 24, h: 24 }, walkTo: { x: 396, y: 340 }, where: "by Dad's car" },
      ],
    },
    { kind: 'decoration', id: 'bike', zone: { x: 185, y: 180, w: 110, h: 95 }, lines: ['Ring ring!', 'The wheels go round and round.', "One day I'll ride a bike this big."], sfx: 'squeak' },
    // Dad's boxes on the shelves: the memory game. The whole unit answers, top to bottom. The
    // lower half is narrower: right of x 175 is the bike, and the basketball hides in the gap
    // between the bottom box and the bike's wheel.
    {
      kind: 'minigame',
      id: 'shelves',
      game: 'memory',
      zone: { x: 100, y: 45, w: 140, h: 242 },
      parts: [
        { x: 100, y: 45, w: 140, h: 130 },
        { x: 100, y: 175, w: 75, h: 112 },
      ],
      walkTo: { x: 150, y: 310 },
    },
    { kind: 'decoration', id: 'garage_door', zone: { x: 300, y: 70, w: 270, h: 68 }, lines: ["Rrrrumble! It only opens for Dad's car.", 'It goes up and up and up.', 'It is way too heavy for me.'], sfx: 'ding' },
  ],
};
