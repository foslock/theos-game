import type { Room } from './types';

/**
 * Reached through the playhouse once the hoop game is won. Clicking anywhere on the slide
 * structure starts the slide ride. The climbing frame's ladder runs almost to the bottom edge of the art, so the party
 * stays on the strip of gravel just inside the entrance instead of crossing the scene; the
 * ladder, the slide's foot and the bushes on the right are blocked off so feet never walk over
 * them.
 */
export const playground: Room = {
  id: 'playground',
  name: 'Playground',
  background: 'bg_playground',
  ambientFrames: 1,
  restPoint: { x: 62, y: 372 },
  lucyRestPoint: { x: 116, y: 378 },
  palette: { wall: '#8fd0f0', floor: '#d9c27a', accent: '#d94b3a' },
  exits: [{ to: 'playhouse', zone: { x: 0, y: 180, w: 48, h: 200 }, walkTo: { x: 40, y: 340 }, direction: 'left' }],
  obstacles: [
    // The slide's lip and legs, then the post holding its top up.
    { x: 84, y: 280, w: 66, h: 42 },
    { x: 154, y: 280, w: 22, h: 86 },
    // The ladder, all the way down to the bottom of the scene.
    { x: 198, y: 280, w: 124, h: 120 },
    // Bushes along the right.
    { x: 378, y: 280, w: 262, h: 120 },
  ],
  ambient: [
    // The empty swing rocks; leaves drift down now and then.
    // Chain tops sit on the underside of the sloping bar.
    { kind: 'swing', chains: [{ x: 396, y: 125 }, { x: 418, y: 130 }], length: 108, amplitude: 4, period: 3.6 },
    { kind: 'leaves', key: 'leaf', area: { x: 20, y: -10, w: 600, h: 400 }, every: [4, 9] },
  ],
  hotspots: [
    // The whole structure starts the ride: the platform and its railings, the chute down to
    // the left, and the ladder. The ladder's upper part stops short of the swing beside it.
    {
      kind: 'minigame',
      id: 'slide',
      game: 'slide',
      zone: { x: 86, y: 145, w: 234, h: 255 },
      parts: [
        { x: 150, y: 145, w: 150, h: 120 },
        { x: 86, y: 225, w: 90, h: 95 },
        { x: 195, y: 260, w: 105, h: 50 },
        { x: 195, y: 310, w: 125, h: 90 },
      ],
      walkTo: { x: 118, y: 342 },
    },
    { kind: 'decoration', id: 'swing', zone: { x: 300, y: 90, w: 170, h: 200 }, lines: ['Push me higher!'], sfx: 'squeak' },
    // The big bushes in the bottom-right corner, below the swing.
    { kind: 'decoration', id: 'bushes', zone: { x: 380, y: 300, w: 260, h: 100 }, lines: ['Rustle rustle! Something is hiding in there.', 'The leaves tickle!', 'Shh... I think a bunny lives in here.'], sfx: 'squeak' },
  ],
};
