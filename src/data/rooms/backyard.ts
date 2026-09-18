import type { Room } from './types';

export const backyard: Room = {
  id: 'backyard',
  name: 'Backyard',
  background: 'bg_backyard',
  ambientFrames: 2,
  restPoint: { x: 320, y: 330 },
  lucyRestPoint: { x: 270, y: 335 },
  palette: { wall: '#8fd0f0', floor: '#5daa4a', accent: '#c96a2b' },
  exits: [
    { to: 'kitchen', zone: { x: 280, y: 150, w: 82, h: 110 }, walkTo: { x: 320, y: 285 }, direction: 'up' },
    { to: 'sport_court', zone: { x: 585, y: 180, w: 55, h: 210 }, walkTo: { x: 600, y: 340 }, direction: 'right' },
    {
      to: 'playhouse',
      zone: { x: 5, y: 185, w: 75, h: 95 },
      walkTo: { x: 65, y: 300 },
      direction: 'left',
      condition: { hasItem: 'playhouse_key' },
      lockedComment: "The playhouse door is locked. Maybe the key is in the little mailbox?",
    },
  ],
  hotspots: [
    {
      kind: 'pickup',
      id: 'playhouse_key',
      item: 'playhouse_key',
      hidden: true,
      zone: { x: 86, y: 212, w: 28, h: 50 },
      walkTo: { x: 100, y: 300 },
      foundComment: 'A key! It was in the mailbox.',
    },
    { kind: 'decoration', id: 'sprinkler', zone: { x: 362, y: 266, w: 66, h: 30 }, lines: ['Tsk tsk tsk tsk... the sprinkler is off for now.'], sfx: 'squeak' },
    { kind: 'decoration', id: 'tree', zone: { x: 430, y: 50, w: 135, h: 220 }, lines: ['The leaves are rustling.'], sfx: 'ding' },
    { kind: 'decoration', id: 'bird', zone: { x: 112, y: 285, w: 44, h: 32 }, lines: ['Tweet tweet!'], sfx: 'squeak' },
    { kind: 'decoration', id: 'house', zone: { x: 110, y: 20, w: 300, h: 130 }, lines: ["That's my house!", 'Mom and Dad will be home soon.'], sfx: 'ding' },
  ],
};
