import type { Room } from './types';

export const bathroom: Room = {
  id: 'bathroom',
  name: 'Bathroom',
  background: 'bg_bathroom',
  ambientFrames: 2,
  restPoint: { x: 320, y: 330 },
  palette: { wall: '#9fd4e0', floor: '#e6e6e6', accent: '#4e9ab0' },
  exits: [{ to: 'bedroom', zone: { x: 585, y: 0, w: 55, h: 400 }, walkTo: { x: 600, y: 370 }, direction: 'right' }],
  /** The bathtub has no hotspot (the duck is the clickable part) but feet must not cross it. */
  obstacles: [{ x: 372, y: 200, w: 190, h: 152 }],
  hotspots: [
    { kind: 'decoration', id: 'toilet', zone: { x: 25, y: 190, w: 150, h: 170 }, lines: ['Whooooosh!', 'Flush!'], sfx: 'squeak' },
    { kind: 'decoration', id: 'sink', zone: { x: 222, y: 172, w: 136, h: 140 }, lines: ['Splash splash!'], sfx: 'ding' },
    { kind: 'decoration', id: 'mirror', zone: { x: 212, y: 12, w: 148, h: 140 }, lines: ["Hi, me!", 'Looking good, Theo.'], sfx: 'click' },
    { kind: 'decoration', id: 'duck', zone: { x: 415, y: 230, w: 48, h: 42 }, lines: ['Squeak! Squeak!'], sfx: 'squeak' },
  ],
};
