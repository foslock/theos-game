import type { Room } from './types';

export const playhouse: Room = {
  id: 'playhouse',
  name: 'Playhouse',
  background: 'bg_playhouse',
  ambientFrames: 2,
  restPoint: { x: 320, y: 330 },
  lucyRestPoint: { x: 270, y: 335 },
  palette: { wall: '#f4c2d7', floor: '#b98c5a', accent: '#7b4fb0' },
  exits: [
    { to: 'backyard', zone: { x: 590, y: 105, w: 50, h: 285 }, walkTo: { x: 600, y: 345 }, direction: 'right' },
    {
      to: 'playground',
      zone: { x: 367, y: 200, w: 68, h: 100 },
      walkTo: { x: 400, y: 305 },
      direction: 'up',
      condition: { never: true },
      lockedComment: "The playground is for another day!",
    },
  ],
  hotspots: [
    { kind: 'pickup', id: 'garage_key', item: 'garage_key', zone: { x: 470, y: 300, w: 30, h: 24 }, walkTo: { x: 470, y: 345 } },
    { kind: 'decoration', id: 'tea_set', zone: { x: 95, y: 240, w: 105, h: 34 }, lines: ['Clink! Tea time!'], sfx: 'ding' },
    { kind: 'decoration', id: 'table', zone: { x: 65, y: 275, w: 150, h: 85 }, lines: ['A little table, just my size.'], sfx: 'click' },
    { kind: 'decoration', id: 'window', zone: { x: 30, y: 120, w: 130, h: 110 }, lines: ['I can see the whole yard from here.'], sfx: 'click' },
    { kind: 'decoration', id: 'teddy', zone: { x: 220, y: 215, w: 60, h: 105 }, lines: ["Hi, Mr. Bear!"], sfx: 'squeak' },
  ],
};
