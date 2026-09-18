import { ROOMS, ROOM_IDS, type Exit, type RoomId } from './rooms';
import { isUnlocked, type GameState } from '../state/GameState';
import { evaluate } from '../systems/Conditions';

export interface Edge {
  from: RoomId;
  to: RoomId;
  exit: Exit;
}

/** Every directed edge in the scene graph, derived from room exit definitions. */
export function edges(): Edge[] {
  const out: Edge[] = [];
  for (const id of ROOM_IDS) {
    for (const exit of ROOMS[id].exits) out.push({ from: id, to: exit.to, exit });
  }
  return out;
}

export function neighbors(from: RoomId): RoomId[] {
  return ROOMS[from].exits.map((e) => e.to);
}

export function findExit(from: RoomId, to: RoomId): Exit | undefined {
  return ROOMS[from].exits.find((e) => e.to === to);
}

/**
 * Whether an exit can be walked through: a door that has already been unlocked stays open even
 * once its key has been spent.
 */
export function exitOpen(from: RoomId, exit: Exit, state: GameState): boolean {
  return isUnlocked(state, from, exit.to) || evaluate(exit.condition, state);
}

export function canTravel(from: RoomId, to: RoomId, state: GameState): boolean {
  const exit = findExit(from, to);
  return !!exit && exitOpen(from, exit, state);
}

/** Rooms reachable from `from` given the current state (BFS). */
export function reachable(from: RoomId, state: GameState): Set<RoomId> {
  const seen = new Set<RoomId>([from]);
  const queue: RoomId[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const exit of ROOMS[cur].exits) {
      if (!seen.has(exit.to) && exitOpen(cur, exit, state)) {
        seen.add(exit.to);
        queue.push(exit.to);
      }
    }
  }
  return seen;
}
