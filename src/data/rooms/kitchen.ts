import type { Room, ContainerHotspot } from './types';

// He stands well below the counter so his head clears the lowest drawers and cupboard door.
export const kitchenContainers: ContainerHotspot[] = [
  { kind: 'container', id: 'drawer_1', label: 'Drawer', category: 'drawer', zone: { x: 132, y: 195, w: 46, h: 22 }, walkTo: { x: 155, y: 372 } },
  { kind: 'container', id: 'drawer_2', label: 'Drawer', category: 'drawer', zone: { x: 132, y: 222, w: 46, h: 22 }, walkTo: { x: 155, y: 372 } },
  { kind: 'container', id: 'drawer_3', label: 'Drawer', category: 'drawer', zone: { x: 188, y: 195, w: 46, h: 22 }, walkTo: { x: 211, y: 372 } },
  { kind: 'container', id: 'cabinet_1', label: 'Cabinet', category: 'cabinet', zone: { x: 58, y: 22, w: 62, h: 62 }, walkTo: { x: 90, y: 372 } },
  { kind: 'container', id: 'cabinet_2', label: 'Cabinet', category: 'cabinet', zone: { x: 140, y: 22, w: 92, h: 100 }, walkTo: { x: 186, y: 372 } },
  { kind: 'container', id: 'cabinet_3', label: 'Cabinet', category: 'cabinet', zone: { x: 238, y: 22, w: 100, h: 56 }, walkTo: { x: 288, y: 372 } },
  { kind: 'container', id: 'cabinet_4', label: 'Cabinet', category: 'cabinet', zone: { x: 188, y: 222, w: 46, h: 48 }, walkTo: { x: 211, y: 372 } },
  { kind: 'container', id: 'fridge', label: 'Fridge', category: 'fridge', zone: { x: 236, y: 88, w: 104, h: 194 }, walkTo: { x: 288, y: 372 } },
];

export const kitchen: Room = {
  id: 'kitchen',
  name: 'Kitchen',
  background: 'bg_kitchen',
  ambientFrames: 1,
  restPoint: { x: 400, y: 330 },
  lucyRestPoint: { x: 505, y: 330 },
  palette: { wall: '#f2e2b8', floor: '#c9b48a', accent: '#8b5a2b' },
  exits: [
    { to: 'bedroom', zone: { x: 0, y: 0, w: 50, h: 300 }, walkTo: { x: 40, y: 320 }, direction: 'up' },
    {
      to: 'family_room',
      zone: { x: 590, y: 50, w: 50, h: 350 },
      walkTo: { x: 600, y: 340 },
      direction: 'right',
      // Breakfast comes first: the rest of the house (and the back door key in the family room)
      // waits until Lucy has eaten. Only the way back to the bedroom and bathroom stays open.
      condition: { flag: 'breakfastDone' },
      lockedComment: "Not yet! Lucy's hungry. Breakfast first, then we can go exploring.",
    },
    {
      to: 'backyard',
      zone: { x: 360, y: 45, w: 88, h: 225 },
      walkTo: { x: 400, y: 310 },
      direction: 'up',
      condition: { hasItem: 'kitchen_door_key' },
      lockedComment: "The back door is locked. Where did Mom put the key?",
    },
  ],
  ambient: [
    // The wall clock's second hand, and dust in the light from the back door.
    { kind: 'clock', centre: { x: 596, y: 12 }, length: 13 },
    // The oven's clock, right of its two knobs, blinking its colon.
    { kind: 'led', at: { x: 87, y: 102 }, text: '12:00' },
    { kind: 'motes', area: { x: 366, y: 60, w: 100, h: 210 }, count: 20, drift: { x: -5, y: 5 } },
  ],
  hotspots: [
    ...kitchenContainers,
    { kind: 'decoration', id: 'oven', zone: { x: 58, y: 95, w: 62, h: 150 }, lines: ["Hot! I'm not allowed to touch the oven.", 'Mom bakes cookies in there.', 'The little clock is blinking.'], sfx: 'click' },
    { kind: 'decoration', id: 'toaster', zone: { x: 150, y: 150, w: 42, h: 32 }, lines: ['POP! No toast, though.', 'It makes the bread all crunchy.', 'Careful, the top gets hot.'], sfx: 'boing' },
    { kind: 'decoration', id: 'clock', zone: { x: 575, y: 0, w: 42, h: 42 }, lines: ['Tick tock, tick tock.', 'The little hand goes round and round.', 'Is it lunchtime yet?'], sfx: 'click' },
  ],
};
