import type { Room, RoomId } from './types';
import { bedroom } from './bedroom';
import { bathroom } from './bathroom';
import { kitchen } from './kitchen';
import { familyRoom } from './familyRoom';
import { garage } from './garage';
import { backyard } from './backyard';
import { sportCourt } from './sportCourt';
import { playhouse } from './playhouse';
import { playground } from './playground';

export * from './types';

export const ROOMS: Record<RoomId, Room> = {
  bedroom,
  bathroom,
  kitchen,
  family_room: familyRoom,
  garage,
  backyard,
  sport_court: sportCourt,
  playhouse,
  playground,
};

export const ROOM_IDS = Object.keys(ROOMS) as RoomId[];

export function getRoom(id: RoomId): Room {
  const room = ROOMS[id];
  if (!room) throw new Error(`Unknown room: ${id}`);
  return room;
}
