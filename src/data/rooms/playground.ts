import type { Room } from './types';

/** Stub: referenced by the spec's graph but not yet designed. Not reachable in the demo. */
export const playground: Room = {
  id: 'playground',
  name: 'Playground',
  background: 'bg_playground',
  ambientFrames: 1,
  restPoint: { x: 320, y: 330 },
  palette: { wall: '#8fd0f0', floor: '#d9c27a', accent: '#d94b3a' },
  exits: [{ to: 'playhouse', zone: { x: 0, y: 180, w: 48, h: 200 }, walkTo: { x: 40, y: 340 }, direction: 'left' }],
  hotspots: [
    { kind: 'decoration', id: 'climbing_frame', zone: { x: 150, y: 145, w: 150, h: 200 }, lines: ['Up, up, up!', 'I can climb this whole thing.'], sfx: 'click' },
    { kind: 'decoration', id: 'slide', zone: { x: 90, y: 262, w: 58, h: 58 }, lines: ['Wheeee!'], sfx: 'boing' },
    { kind: 'decoration', id: 'swing', zone: { x: 300, y: 90, w: 170, h: 200 }, lines: ['Push me higher!'], sfx: 'squeak' },
  ],
};
