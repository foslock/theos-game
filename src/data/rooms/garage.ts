import type { Room } from './types';

export const garage: Room = {
  id: 'garage',
  name: 'Garage',
  background: 'bg_garage',
  ambientFrames: 2,
  restPoint: { x: 320, y: 340 },
  lucyRestPoint: { x: 270, y: 345 },
  palette: { wall: '#8c8c8c', floor: '#5c5c5c', accent: '#d94b3a' },
  exits: [{ to: 'family_room', zone: { x: 15, y: 15, w: 80, h: 270 }, walkTo: { x: 75, y: 305 }, direction: 'left' }],
  hotspots: [
    { kind: 'decoration', id: 'car', zone: { x: 440, y: 140, w: 200, h: 210 }, lines: ['HONK HONK!', 'Beep beep!'], sfx: 'ding' },
    { kind: 'decoration', id: 'toolbox', zone: { x: 10, y: 320, w: 105, h: 75 }, lines: ['Clank clank. Tools!'], sfx: 'click' },
    { kind: 'decoration', id: 'bike', zone: { x: 185, y: 180, w: 110, h: 95 }, lines: ['Ring ring!'], sfx: 'squeak' },
    { kind: 'decoration', id: 'shelves', zone: { x: 100, y: 45, w: 140, h: 130 }, lines: ["Paint cans and boxes. That's Dad's stuff."], sfx: 'click' },
    { kind: 'decoration', id: 'garage_door', zone: { x: 300, y: 70, w: 270, h: 68 }, lines: ["Rrrrumble! It only opens for Dad's car."], sfx: 'ding' },
  ],
};
