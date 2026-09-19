import type { Room } from './types';

export const playhouse: Room = {
  id: 'playhouse',
  name: 'Playhouse',
  background: 'bg_playhouse',
  ambientFrames: 1,
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
      condition: { flag: 'basketballDone' },
      lockedComment: 'Lucy wants to play basketball first. The sport court is past the backyard.',
    },
  ],
  ambient: [
    // Dust in the light from the side window, the odd bird passing its panes, and steam off the teapot.
    { kind: 'motes', area: { x: 40, y: 140, w: 120, h: 130 }, count: 18, drift: { x: 6, y: 5 } },
    { kind: 'passerby', key: 'bird', area: { x: 46, y: 146, w: 89, h: 77 }, every: [9, 18] },
    { kind: 'occluder', key: 'playhouse_window_frame', at: { x: 34, y: 134 } },
    { kind: 'steam', at: { x: 148, y: 242 } },
  ],
  hotspots: [
    { kind: 'pickup', id: 'garage_key', item: 'garage_key', zone: { x: 470, y: 300, w: 30, h: 24 }, walkTo: { x: 470, y: 345 } },
    { kind: 'decoration', id: 'tea_set', zone: { x: 95, y: 240, w: 105, h: 34 }, lines: ['Clink! Tea time!', 'One cup for me and one for Mr. Bear.', 'Pretend tea. Slurp!'], sfx: 'ding' },
    { kind: 'decoration', id: 'table', zone: { x: 65, y: 275, w: 150, h: 85 }, lines: ['A little table, just my size.', 'We have tea parties here.', 'Lucy bumped her head on it once.'], sfx: 'click' },
    { kind: 'decoration', id: 'window', zone: { x: 30, y: 120, w: 130, h: 110 }, lines: ['I can see the whole yard from here.', 'The trees are waving at us.', 'Sometimes a bird lands right there.'], sfx: 'click' },
    { kind: 'decoration', id: 'teddy', zone: { x: 220, y: 215, w: 60, h: 105 }, lines: ['Hi, Mr. Bear!', 'Mr. Bear is very good at waiting.', 'He needs a hug.'], sfx: 'squeak' },
  ],
};
