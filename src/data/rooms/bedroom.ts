import type { Room } from './types';

/** The toy race track on the carpet by the desk: a prop, a mini-game and something feet go round. */
export const TRACK = {
  /** Where the prop's bottom-centre sits (the art is 112x72 with a few clear rows top and bottom). */
  at: { x: 500, y: 396 },
  zone: { x: 446, y: 328, w: 106, h: 62 },
  walkTo: { x: 500, y: 322 },
  /** Where the car sits on the near straight of the prop once it lives there. */
  car: { x: 478, y: 380 },
};

/**
 * The bed, an overlay because the room art has no bed in it. All three poses share one
 * silhouette, which is what lets them swap without the frame appearing to move.
 */
export const BED = {
  at: { x: 124, y: 196 },
  /**
   * Just short of the top of the walkable floor (y 280), so everyone on the floor is drawn in
   * front of the bed however close to its foot they stand. What the bed hides is drawn behind it.
   */
  depth: 279,
};

export const bedroom: Room = {
  id: 'bedroom',
  name: "Theo's Bedroom",
  background: 'bg_bedroom',
  ambientFrames: 1,
  restPoint: { x: 320, y: 330 },
  palette: { wall: '#6b8fd6', floor: '#a97c50', accent: '#e8d36a' },
  props: [{ key: 'toy_track', at: TRACK.at }],
  // Feet keep off the track; the click zone is the mini-game hotspot below.
  obstacles: [{ x: TRACK.zone.x, y: TRACK.zone.y + 4, w: TRACK.zone.w, h: TRACK.zone.h - 4 }],
  exits: [
    { to: 'bathroom', zone: { x: 0, y: 60, w: 90, h: 320 }, walkTo: { x: 50, y: 350 }, direction: 'left' },
    {
      to: 'kitchen',
      zone: { x: 565, y: 100, w: 75, h: 280 },
      walkTo: { x: 600, y: 355 },
      direction: 'down',
      condition: { flag: 'hasBackpack' },
      lockedComment: "I should grab my backpack before I go downstairs.",
    },
  ],
  ambient: [
    // Dust drifting in the light from the window.
    { kind: 'motes', area: { x: 282, y: 122, w: 82, h: 118 }, count: 18, drift: { x: -5, y: 5 } },
  ],
  hotspots: [
    { kind: 'backpack', id: 'backpack', zone: { x: 378, y: 318, w: 52, h: 56 }, walkTo: { x: 360, y: 380 } },
    {
      kind: 'pickup',
      id: 'toy_car',
      item: 'toy_car',
      zone: { x: 236, y: 352, w: 24, h: 24 },
      walkTo: { x: 262, y: 386 },
      condition: { flag: 'hasBackpack' },
      refusalComment: 'My race car! But I need my backpack to carry it.',
      foundComment: 'My race car! I can race it on my track over there.',
      spots: [
        // Out in the middle of the carpet.
        { zone: { x: 236, y: 352, w: 24, h: 24 }, walkTo: { x: 262, y: 386 }, where: 'in the middle of the carpet' },
        // In front of the little table under the window.
        { zone: { x: 300, y: 276, w: 24, h: 24 }, walkTo: { x: 290, y: 318 }, where: 'under the little table' },
        // Down by the foot of the bed.
        { zone: { x: 190, y: 372, w: 24, h: 24 }, walkTo: { x: 226, y: 392 }, where: 'down by my bed' },
      ],
    },
    {
      kind: 'decoration',
      id: 'bed',
      zone: { x: 128, y: 206, w: 154, h: 122 },
      // The footboard's near corner is cut on the diagonal, so the carpet beside it is open.
      parts: [
        { x: 128, y: 206, w: 154, h: 74 },
        { x: 128, y: 280, w: 112, h: 24 },
        { x: 128, y: 304, w: 80, h: 24 },
      ],
      lines: ['Boing! Boing!', 'My bed is super bouncy.', 'Not sleepy. It is morning!'],
      sfx: 'boing',
    },
    { kind: 'decoration', id: 'lamp', zone: { x: 288, y: 192, w: 46, h: 80 }, lines: ['Click! Lights on. Click! Lights off.', 'Click! Off. Click! On.', 'The lampshade is warm.'], sfx: 'click' },
    { kind: 'decoration', id: 'window', zone: { x: 280, y: 115, w: 80, h: 76 }, lines: ["It's a beautiful morning outside!", 'I can see the backyard from up here.', 'The birds are singing.'], sfx: 'ding' },
    {
      kind: 'pickup',
      id: 'basketball',
      item: 'basketball',
      zone: { x: 446, y: 278, w: 13, h: 24 },
      peek: { at: { x: 455, y: 290 }, cover: { x: 459, y: 276, w: 14, h: 26 } },
      walkTo: { x: 430, y: 322 },
      condition: { flag: 'hasBackpack' },
      refusalComment: 'A basketball! But I need my backpack to carry it.',
      foundComment: 'A basketball! It was hiding in my room.',
      spots: [
        // Rolled in behind the desk: only its left half shows on the carpet.
        { zone: { x: 446, y: 278, w: 13, h: 24 }, peek: { at: { x: 455, y: 290 }, cover: { x: 459, y: 276, w: 14, h: 26 } }, walkTo: { x: 430, y: 322 }, where: 'behind my desk' },
        // Tucked under the foot of the bed, which is an overlay, so it hides the ball on its own.
        { zone: { x: 252, y: 288, w: 20, h: 12 }, peek: { at: { x: 261, y: 289 }, depth: BED.depth - 1 }, walkTo: { x: 275, y: 334 }, where: 'under the foot of my bed' },
        // Behind the front leg of the desk chair (the leg is x 412-418).
        { zone: { x: 394, y: 268, w: 18, h: 24 }, peek: { at: { x: 406, y: 280 }, cover: { x: 412, y: 266, w: 7, h: 26 } }, walkTo: { x: 380, y: 320 }, where: 'under my chair' },
      ],
    },
    // Starts at the desk's real left edge so the ball peeking out beside it is its own target.
    { kind: 'decoration', id: 'desk', zone: { x: 459, y: 120, w: 101, h: 200 }, lines: ['My big desk. So many crayons!', 'Scribble scribble.', 'I drew a rocket on this paper.'], sfx: 'click' },
    { kind: 'minigame', id: 'race_track', game: 'race', zone: TRACK.zone, walkTo: TRACK.walkTo },
  ],
};
