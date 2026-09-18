export type ItemId =
  | 'spoon'
  | 'bowl'
  | 'cereal'
  | 'milk'
  | 'basketball'
  | 'stomp_rocket'
  | 'kitchen_door_key'
  | 'garage_key'
  | 'playhouse_key'
  | 'toy_bus';

export interface ItemDef {
  id: ItemId;
  name: string;
  /** Placeholder icon colour until PixelLab icons exist. */
  color: string;
  /** Short glyph drawn on the placeholder icon. */
  glyph: string;
  stackable?: boolean;
  maxStack?: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  spoon: { id: 'spoon', name: 'Spoon', color: '#c0c0c0', glyph: 'S' },
  bowl: { id: 'bowl', name: 'Bowl', color: '#4aa3df', glyph: 'B' },
  cereal: { id: 'cereal', name: 'Cereal', color: '#e0a030', glyph: 'C' },
  milk: { id: 'milk', name: 'Milk', color: '#f4f4f4', glyph: 'M' },
  basketball: { id: 'basketball', name: 'Basketball', color: '#e06a1c', glyph: 'O', stackable: true, maxStack: 3 },
  stomp_rocket: { id: 'stomp_rocket', name: 'Stomp Rocket', color: '#d43a3a', glyph: 'R' },
  kitchen_door_key: { id: 'kitchen_door_key', name: 'Kitchen Door Key', color: '#d6b83c', glyph: 'K' },
  garage_key: { id: 'garage_key', name: 'Garage Key', color: '#9a9a9a', glyph: 'G' },
  playhouse_key: { id: 'playhouse_key', name: 'Playhouse Key', color: '#c97a2b', glyph: 'P' },
  toy_bus: { id: 'toy_bus', name: 'Toy Bus', color: '#f2d33a', glyph: 'T' },
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
