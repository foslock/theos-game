import type { Room } from './types';

export const sportCourt: Room = {
  id: 'sport_court',
  name: 'Sport Court',
  background: 'bg_sport_court',
  ambientFrames: 2,
  restPoint: { x: 320, y: 340 },
  lucyRestPoint: { x: 270, y: 345 },
  palette: { wall: '#8fd0f0', floor: '#3e8a5a', accent: '#f0f0f0' },
  exits: [{ to: 'backyard', zone: { x: 0, y: 180, w: 48, h: 200 }, walkTo: { x: 40, y: 340 }, direction: 'left' }],
  hotspots: [
    { kind: 'decoration', id: 'hoop_low', zone: { x: 410, y: 150, w: 45, h: 120 }, lines: ['A little hoop, just my size.'], sfx: 'boing' },
    { kind: 'decoration', id: 'hoop_mid', zone: { x: 463, y: 115, w: 60, h: 155 }, lines: ['A medium hoop.'], sfx: 'boing' },
    { kind: 'decoration', id: 'hoop_high', zone: { x: 535, y: 75, w: 55, h: 195 }, lines: ['Wow, that one is high!'], sfx: 'boing' },
    { kind: 'decoration', id: 'bench', zone: { x: 70, y: 220, w: 75, h: 52 }, lines: ['A good spot to rest.'], sfx: 'click' },
  ],
};
