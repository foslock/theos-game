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
  | 'toy_car';

export interface ItemDef {
  id: ItemId;
  name: string;
  /** Placeholder icon colour until PixelLab icons exist. */
  color: string;
  /** Short glyph drawn on the placeholder icon. */
  glyph: string;
  stackable?: boolean;
  maxStack?: number;
  /** One line shown in the backpack when the item is clicked. */
  description: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  spoon: { id: 'spoon', name: 'Spoon', color: '#c0c0c0', glyph: 'S', description: "A shiny spoon. Perfect for scooping up cereal." },
  bowl: { id: 'bowl', name: 'Bowl', color: '#4aa3df', glyph: 'B', description: "A blue bowl, waiting for something yummy." },
  cereal: { id: 'cereal', name: 'Cereal', color: '#e0a030', glyph: 'C', description: "A box of sunny-O's, Lucy's favourite." },
  milk: { id: 'milk', name: 'Milk', color: '#f4f4f4', glyph: 'M', description: "Cold milk from the fridge. Don't spill it!" },
  basketball: { id: 'basketball', name: 'Basketball', color: '#e06a1c', glyph: 'O', stackable: true, maxStack: 3, description: "A bouncy orange basketball. Swish!" },
  stomp_rocket: { id: 'stomp_rocket', name: 'Stomp Rocket', color: '#d43a3a', glyph: 'R', description: "Stomp the pad and the rocket zooms up!" },
  kitchen_door_key: { id: 'kitchen_door_key', name: 'Kitchen Door Key', color: '#d6b83c', glyph: 'K', description: "The gold key that opens the kitchen door to the backyard." },
  garage_key: { id: 'garage_key', name: 'Garage Key', color: '#9a9a9a', glyph: 'G', description: "The silver key to Dad's garage." },
  playhouse_key: { id: 'playhouse_key', name: 'Playhouse Key', color: '#c97a2b', glyph: 'P', description: "A little brass key with a heart. It fits the playhouse door." },
  toy_car: { id: 'toy_car', name: 'Race Car', color: '#f07a1c', glyph: 'V', description: "Theo's orange race car. It belongs on the track in his room. Vroom!" },
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
