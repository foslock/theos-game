import type { Room } from './types';

export const bedroom: Room = {
  id: 'bedroom',
  name: "Theo's Bedroom",
  background: 'bg_bedroom',
  ambientFrames: 2,
  restPoint: { x: 320, y: 330 },
  palette: { wall: '#6b8fd6', floor: '#a97c50', accent: '#e8d36a' },
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
  hotspots: [
    { kind: 'backpack', id: 'backpack', zone: { x: 378, y: 318, w: 52, h: 56 }, walkTo: { x: 360, y: 380 } },
    {
      kind: 'pickup',
      id: 'stomp_rocket',
      item: 'stomp_rocket',
      zone: { x: 125, y: 112, w: 40, h: 50 },
      walkTo: { x: 150, y: 335 },
      condition: { flag: 'hasBackpack' },
      refusalComment: "My stomp rocket! But I need something to carry it in...",
    },
    { kind: 'decoration', id: 'bed', zone: { x: 128, y: 206, w: 154, h: 122 }, lines: ['Boing! Boing!', 'My bed is super bouncy.'], sfx: 'boing' },
    { kind: 'decoration', id: 'lamp', zone: { x: 288, y: 192, w: 46, h: 80 }, lines: ['Click! Lights on. Click! Lights off.'], sfx: 'click' },
    { kind: 'decoration', id: 'window', zone: { x: 280, y: 115, w: 80, h: 76 }, lines: ["It's a beautiful morning outside!"], sfx: 'ding' },
    { kind: 'decoration', id: 'desk', zone: { x: 450, y: 120, w: 110, h: 200 }, lines: ['My big desk. So many crayons!', 'Scribble scribble.'], sfx: 'click' },
  ],
};
