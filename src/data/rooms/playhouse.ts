import type { Room } from './types';

export const playhouse: Room = {
  id: 'playhouse',
  name: 'Playhouse',
  background: 'bg_playhouse',
  ambientFrames: 1,
  restPoint: { x: 320, y: 330 },
  lucyRestPoint: { x: 270, y: 335 },
  palette: { wall: '#f4c2d7', floor: '#b98c5a', accent: '#7b4fb0' },
  // Feet stay off the table top (it is the tea party's click zone, not furniture) and out from
  // under it, even though the space between its legs can be clicked.
  obstacles: [
    { x: 65, y: 275, w: 150, h: 54 },
    { x: 65, y: 329, w: 150, h: 31 },
  ],
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
    // The kids' own sign over the playground door, nailed up crooked. The door frame starts at
    // y 200, so the sign's lowest corner clears it.
    { kind: 'prop', key: 'sign_playground', at: { x: 401, y: 174 }, angle: -7 },
  ],
  hotspots: [
    {
      kind: 'pickup',
      id: 'garage_key',
      item: 'garage_key',
      zone: { x: 470, y: 300, w: 30, h: 24 },
      walkTo: { x: 470, y: 345 },
      spots: [
        // On the floor beside the playground door.
        { zone: { x: 470, y: 300, w: 30, h: 24 }, walkTo: { x: 470, y: 345 }, where: 'on the floor by the little door' },
        // On the rug, in front of Mr. Bear.
        { zone: { x: 218, y: 350, w: 24, h: 24 }, walkTo: { x: 232, y: 388 }, where: 'on the rug' },
        // On the floor under the table, between its legs.
        { zone: { x: 100, y: 332, w: 24, h: 24 }, walkTo: { x: 112, y: 385 }, where: 'under the table' },
      ],
    },
    // Lucy's tea set and the whole table top it stands on: the tea party game. The legs below
    // are scenery, and the floor between them is open, since a key hides there on some seeds.
    { kind: 'minigame', id: 'tea_set', game: 'tea', zone: { x: 65, y: 240, w: 150, h: 89 }, walkTo: { x: 150, y: 385 } },
    // The sign hangs at (401, 174) turned -7 degrees; the zone is the box that turn puts it in.
    {
      kind: 'decoration',
      id: 'playground_sign',
      zone: { x: 353, y: 154, w: 96, h: 40 },
      lines: ['I made that sign all by myself!', 'Dad let me use the big paints for it.', "That's how you spell playground. I checked."],
      sfx: 'click',
    },
    { kind: 'decoration', id: 'window', zone: { x: 30, y: 120, w: 130, h: 110 }, lines: ['I can see the whole yard from here.', 'The trees are waving at us.', 'Sometimes a bird lands right there.'], sfx: 'click' },
    { kind: 'decoration', id: 'teddy', zone: { x: 220, y: 215, w: 60, h: 105 }, lines: ['Hi, Mr. Bear!', 'Mr. Bear is very good at waiting.', 'He needs a hug.'], sfx: 'squeak' },
  ],
};
