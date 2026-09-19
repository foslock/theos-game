import type { Room } from './types';

export const backyard: Room = {
  id: 'backyard',
  name: 'Backyard',
  background: 'bg_backyard',
  ambientFrames: 1,
  restPoint: { x: 320, y: 330 },
  lucyRestPoint: { x: 270, y: 335 },
  palette: { wall: '#8fd0f0', floor: '#5daa4a', accent: '#c96a2b' },
  // The stomp rocket launcher stands on the lawn; the rocket for it is up in Theo's room.
  props: [{ key: 'stomp_launcher', at: { x: 500, y: 350 } }],
  obstacles: [{ x: 456, y: 300, w: 90, h: 52 }],
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
  ambient: [
    // Clouds and birds pass behind the house and trees; the robin potters about on the lawn.
    { kind: 'clouds', keys: ['intro_cloud_0', 'intro_cloud_1', 'intro_cloud_2'], band: [6, 60], speed: 5 },
    { kind: 'birds', key: 'bird', band: [12, 70], every: [10, 20], scale: 0.55, gap: [34, 64], speed: [78, 100] },
    { kind: 'occluder', key: 'backyard_sky', at: { x: 0, y: 0 } },
    { kind: 'hop', key: 'robin', at: { x: 136, y: 318 }, range: 22 },
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
    { kind: 'decoration', id: 'sprinkler', zone: { x: 362, y: 266, w: 66, h: 30 }, lines: ['Tsk tsk tsk tsk... the sprinkler is off for now.', 'It sprays water all over the grass.', 'Lucy loves running through it.'], sfx: 'squeak' },
    { kind: 'minigame', id: 'stomp_rocket', game: 'rocket', zone: { x: 456, y: 290, w: 90, h: 62 }, walkTo: { x: 540, y: 354 } },
    { kind: 'decoration', id: 'tree', zone: { x: 430, y: 50, w: 135, h: 220 }, lines: ['The leaves are rustling.', "It's the biggest tree in the whole yard.", 'I think a squirrel lives up there.'], sfx: 'ding' },
    { kind: 'decoration', id: 'bird', zone: { x: 112, y: 285, w: 44, h: 32 }, lines: ['Tweet tweet!', 'A robin! Hi, robin!', "He's looking for worms."], sfx: 'squeak' },
    { kind: 'decoration', id: 'house', zone: { x: 110, y: 20, w: 300, h: 130 }, lines: ["That's my house!", 'Mom and Dad will be home soon.', 'My room is up there, behind that window.'], sfx: 'ding' },
  ],
};
