import type { Pt } from './rooms/types';
import type { AmbientSpec } from '../systems/Ambience';

/**
 * Where everything stands in the front hall for the ending. Not a `Room`: nothing here is
 * clickable, the scene plays through on its own. Positions are feet (origin 0.5, 1) measured
 * against `public/assets/foyer/bg_0.png`.
 */
export const FOYER = {
  background: 'bg_foyer',
  /** Mom and Dad, in front of the door beside the foot of the stairs. */
  parents: { x: 330, y: 326 } as Pt,
  /** Where the kids stop, a step short of their parents; Lucy a little nearer the camera. */
  theoStop: { x: 302, y: 368 } as Pt,
  lucyStop: { x: 360, y: 376 } as Pt,
  /** They run in from below the bottom edge; Lucy a beat behind Theo. */
  runFromY: 520,
  ambient: [
    // Motes catching the light from the sidelight by the front door and the window on the stair landing;
    // the patch by the door reaches onto the gold wall beside the trim, where the specks show best.
    { kind: 'motes', area: { x: 364, y: 140, w: 72, h: 140 }, count: 18, drift: { x: -3, y: 4 } },
    { kind: 'motes', area: { x: 194, y: 44, w: 44, h: 60 }, count: 10, drift: { x: 2, y: 3 } },
    // And a slow haze around the chandelier.
    { kind: 'motes', area: { x: 240, y: 10, w: 150, h: 110 }, count: 12, drift: { x: 2, y: 2 } },
  ] as AmbientSpec[],
  /** Placeholder colours until the art exists. */
  palette: { wall: '#d9b25c', floor: '#c98a3e', accent: '#f4efe6' },
};
