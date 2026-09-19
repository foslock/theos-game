import { describe, expect, it } from 'vitest';
import { endingTriggers, entersHouse, morningDone } from '../src/puzzles/ending';
import { FLAGS, newGameState, setFlag } from '../src/state/GameState';
import { ROOM_IDS } from '../src/data/rooms';
import { edges } from '../src/data/graph';

function finished() {
  const s = newGameState(1);
  s.currentRoom = 'backyard';
  for (const f of [FLAGS.basketballDone, FLAGS.stompRocketDone, FLAGS.slideDone]) setFlag(s, f);
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

  it('needs all three mini-games won', () => {
    const s = newGameState(1);
    expect(morningDone(s)).toBe(false);
    setFlag(s, FLAGS.basketballDone);
    setFlag(s, FLAGS.slideDone);
    expect(morningDone(s)).toBe(false);
    setFlag(s, FLAGS.stompRocketDone);
    expect(morningDone(s)).toBe(true);
  });

  it('plays only when coming home with the morning done', () => {
    expect(endingTriggers('backyard', 'kitchen', finished())).toBe(true);
    expect(endingTriggers('backyard', 'sport_court', finished())).toBe(false);
    expect(endingTriggers('backyard', 'kitchen', newGameState(1))).toBe(false);
  });
});
