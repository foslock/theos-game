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
  ambient: [
    // The hanging lamp sways and stutters; a moth keeps it company.
    { kind: 'rock', key: 'garage_lamp', at: { x: 388, y: 0 }, pivot: { x: 420, y: 0 }, amplitude: 3, period: 3.4, glow: { x: 0, y: 54 } },
    { kind: 'flutter', key: 'moth', area: { x: 392, y: 34, w: 60, h: 46 }, rate: 10, speed: 34 },
  ],
  hotspots: [
    { kind: 'decoration', id: 'car', zone: { x: 440, y: 140, w: 200, h: 210 }, lines: ['HONK HONK!', 'Beep beep!', "Dad's car. It's really red."], sfx: 'ding' },
    { kind: 'decoration', id: 'toolbox', zone: { x: 10, y: 320, w: 105, h: 75 }, lines: ['Clank clank. Tools!', 'Hammers and wrenches and screwy things.', 'Dad fixes stuff with these.'], sfx: 'click' },
    // Behind the toolbox, with its right side showing on the floor beside it.
    {
      kind: 'pickup',
      id: 'basketball',
      item: 'basketball',
      zone: { x: 117, y: 354, w: 13, h: 24 },
      peek: { at: { x: 118, y: 366 }, cover: { x: 104, y: 352, w: 13, h: 28 } },
      walkTo: { x: 150, y: 388 },
      condition: { flag: 'hasBackpack' },
      refusalComment: 'A basketball! But I need my backpack to carry it.',
      foundComment: "A basketball! It was behind Dad's toolbox.",
    },
    { kind: 'decoration', id: 'bike', zone: { x: 185, y: 180, w: 110, h: 95 }, lines: ['Ring ring!', 'The wheels go round and round.', "One day I'll ride a bike this big."], sfx: 'squeak' },
    { kind: 'decoration', id: 'shelves', zone: { x: 100, y: 45, w: 140, h: 130 }, lines: ["Paint cans and boxes. That's Dad's stuff.", 'So many boxes. What is in them?', 'I can only reach the bottom shelf.'], sfx: 'click' },
    { kind: 'decoration', id: 'garage_door', zone: { x: 300, y: 70, w: 270, h: 68 }, lines: ["Rrrrumble! It only opens for Dad's car.", 'It goes up and up and up.', 'It is way too heavy for me.'], sfx: 'ding' },
  ],
};
