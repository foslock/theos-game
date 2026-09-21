import { describe, expect, it } from 'vitest';
import { afterGameLine, allGamesDone, FIND_LUCY, gameDoneById, HOME_NOW, HOME_SOON, lucyNextLine, MINIGAMES, nextGame } from '../src/puzzles/progress';
import { addItem, newGameState, setFlag } from '../src/state/GameState';

describe('what to play next', () => {
  it('walks through the six games in order and ends with heading home', () => {
    const s = newGameState(1);
    s.lucyJoined = true;
    s.currentRoom = 'backyard';
    expect(MINIGAMES).toHaveLength(6);
    for (const g of MINIGAMES) {
      expect(nextGame(s)?.id).toBe(g.id);
      expect(afterGameLine(s)).toBe(g.theo(s));
      expect(lucyNextLine(s)).toBe(g.lucy(s));
      expect(afterGameLine(s)).not.toBe(HOME_SOON);
      setFlag(s, g.flag);
    }
    expect(allGamesDone(s)).toBe(true);
    expect(nextGame(s)).toBeUndefined();
    expect(afterGameLine(s)).toBe(HOME_SOON);
  });

  it('says to go and see Mom and Dad when the last game was won inside the house', () => {
    const s = newGameState(1);
    s.lucyJoined = true;
    for (const g of MINIGAMES) setFlag(s, g.flag);
    s.currentRoom = 'garage';
    expect(afterGameLine(s)).toBe(HOME_NOW);
    expect(lucyNextLine(s)).toMatch(/see them/);
    s.currentRoom = 'backyard';
    expect(afterGameLine(s)).toBe(HOME_SOON);
    expect(lucyNextLine(s)).toMatch(/home/);
  });

  it('sends Theo to find Lucy, not to another game, while she is still asleep', () => {
    const s = newGameState(1);
    setFlag(s, 'raceDone');
    expect(afterGameLine(s)).toBe(FIND_LUCY);
    // Once she is up, the day's list takes over again.
    s.lucyJoined = true;
    expect(afterGameLine(s)).toBe(nextGame(s)?.theo(s));
  });

  it('skips games already won, whatever the order', () => {
    const s = newGameState(1);
    setFlag(s, 'basketballDone');
    setFlag(s, 'slideDone');
    expect(nextGame(s)?.id).toBe('rocket');
    setFlag(s, 'stompRocketDone');
    expect(nextGame(s)?.id).toBe('tea');
  });

  it('only sends Theo to the garage for the rocket when he is not carrying it', () => {
    const s = newGameState(1);
    s.lucyJoined = true;
    setFlag(s, 'basketballDone');
    expect(afterGameLine(s)).toMatch(/garage/);
    addItem(s, 'stomp_rocket');
    expect(afterGameLine(s)).not.toMatch(/garage/);
  });
});

describe('whether the game behind a hotspot is already won', () => {
  it('is false until that game\'s flag is set, and only for that game', () => {
    const s = newGameState(1);
    for (const g of MINIGAMES) expect(gameDoneById(s, g.id)).toBe(false);
    setFlag(s, MINIGAMES[0].flag);
    expect(gameDoneById(s, MINIGAMES[0].id)).toBe(true);
    for (const g of MINIGAMES.slice(1)) expect(gameDoneById(s, g.id)).toBe(false);
  });

  it('covers every game a hotspot can name', () => {
    const s = newGameState(1);
    for (const g of MINIGAMES) setFlag(s, g.flag);
    // The hotspot type's union and the nudging list have to stay in step.
    for (const id of ['basketball', 'slide', 'rocket', 'race', 'memory', 'tea'] as const) {
      expect(gameDoneById(s, id)).toBe(true);
    }
  });
});
