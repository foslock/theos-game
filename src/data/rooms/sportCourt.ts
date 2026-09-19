import type { Room } from './types';

/**
 * The three hoops face the court from the right. Clicking any of them starts the hoop game once
 * all three basketballs are in the backpack; see `src/puzzles/basketball.ts` for where the rims
 * are and where Theo stands to shoot.
 */
export const sportCourt: Room = {
  id: 'sport_court',
  name: 'Sport Court',
  background: 'bg_sport_court',
  ambientFrames: 2,
  restPoint: { x: 320, y: 340 },
  lucyRestPoint: { x: 270, y: 345 },
  palette: { wall: '#8fd0f0', floor: '#3e8a5a', accent: '#f0f0f0' },
  exits: [{ to: 'backyard', zone: { x: 0, y: 180, w: 48, h: 200 }, walkTo: { x: 40, y: 340 }, direction: 'left' }],
  ambient: [
    // Clouds and birds behind the trees and hoops; a butterfly over the hedge.
    { kind: 'clouds', keys: ['intro_cloud_1', 'intro_cloud_2', 'intro_cloud_0'], band: [8, 70], speed: 6 },
    { kind: 'birds', key: 'bird', band: [14, 80], every: [12, 24], scale: 0.55, gap: [34, 64], speed: [78, 100] },
    { kind: 'occluder', key: 'court_sky', at: { x: 0, y: 0 } },
    { kind: 'flutter', key: 'butterfly', area: { x: 60, y: 150, w: 330, h: 60 }, rate: 7, speed: 24 },
  ],
  hotspots: [
    { kind: 'minigame', id: 'hoop_low', game: 'basketball', zone: { x: 408, y: 146, w: 46, h: 118 } },
    { kind: 'minigame', id: 'hoop_mid', game: 'basketball', zone: { x: 462, y: 114, w: 56, h: 152 } },
    { kind: 'minigame', id: 'hoop_high', game: 'basketball', zone: { x: 531, y: 76, w: 56, h: 196 } },
    { kind: 'decoration', id: 'bench', zone: { x: 70, y: 220, w: 75, h: 52 }, lines: ['A good spot to rest.'], sfx: 'click' },
  ],
};
