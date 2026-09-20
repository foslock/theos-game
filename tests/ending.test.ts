import { describe, expect, it } from 'vitest';
import { endingTriggers, entersHouse, MINIGAME_FLAGS, morningDone } from '../src/puzzles/ending';
import { FLAGS, newGameState, setFlag } from '../src/state/GameState';
import { ROOM_IDS } from '../src/data/rooms';
import { edges } from '../src/data/graph';

function finished() {
  const s = newGameState(1);
  s.currentRoom = 'backyard';
  for (const f of MINIGAME_FLAGS) setFlag(s, f);
  return s;
}

describe('the ending', () => {
  it('knows which doors lead back into the house', () => {
    expect(entersHouse('backyard', 'kitchen')).toBe(true);
    expect(entersHouse('kitchen', 'backyard')).toBe(false);
    expect(entersHouse('family_room', 'garage')).toBe(false);
    expect(entersHouse('playhouse', 'playground')).toBe(false);
    // Every room is on one side or the other, so no exit is left undecided.
    for (const id of ROOM_IDS) expect(typeof entersHouse(id, 'kitchen')).toBe('boolean');
  });

  it('is the back door into the kitchen, and only that, on the current map', () => {
    const into = edges().filter((e) => entersHouse(e.from, e.to)).map((e) => `${e.from}->${e.to}`);
    expect(into).toEqual(['backyard->kitchen']);
  });

  it('needs every one of the six mini-games won', () => {
    const s = newGameState(1);
    expect(morningDone(s)).toBe(false);
    for (const f of [FLAGS.basketballDone, FLAGS.slideDone, FLAGS.stompRocketDone]) setFlag(s, f);
    expect(morningDone(s)).toBe(false); // the original three are no longer enough
    for (const f of [FLAGS.teaDone, FLAGS.memoryDone]) setFlag(s, f);
    expect(morningDone(s)).toBe(false);
    setFlag(s, FLAGS.raceDone);
    expect(morningDone(s)).toBe(true);
  });

  it('plays only when coming home with the morning done', () => {
    expect(endingTriggers('backyard', 'kitchen', finished())).toBe(true);
    expect(endingTriggers('backyard', 'sport_court', finished())).toBe(false);
    expect(endingTriggers('backyard', 'kitchen', newGameState(1))).toBe(false);
  });

  it('also plays on leaving the room when the last game was won indoors', () => {
    const s = finished();
    s.currentRoom = 'garage';
    expect(endingTriggers('garage', 'family_room', s)).toBe(true);
    s.currentRoom = 'bedroom';
    expect(endingTriggers('bedroom', 'kitchen', s)).toBe(true);
    expect(endingTriggers('bedroom', 'bathroom', s)).toBe(true);
    // Never out into the yard, and never before the day is done.
    expect(endingTriggers('kitchen', 'backyard', s)).toBe(false);
    const early = newGameState(1);
    early.currentRoom = 'garage';
    expect(endingTriggers('garage', 'family_room', early)).toBe(false);
  });
});
