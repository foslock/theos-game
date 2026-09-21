import { describe, expect, it } from 'vitest';
import { beatLine, bestOf, isBetter, recallLine, recordResult, RECORDS, recordSpec, seconds } from '../src/puzzles/records';
import { newGameState, type GameState } from '../src/state/GameState';

function fresh(): GameState {
  return newGameState(1);
}

describe('records', () => {
  it('starts a game with no best at all', () => {
    const s = fresh();
    for (const spec of RECORDS) {
      expect(bestOf(s, spec.id)).toBeUndefined();
      expect(recallLine(s, spec.id)).toBeNull();
    }
  });

  it('keeps the first score, then only better ones', () => {
    const s = fresh();
    expect(recordResult(s, 'rocket', 120)).toBe('first');
    expect(recordResult(s, 'rocket', 90)).toBe('kept');
    expect(bestOf(s, 'rocket')).toBe(120);
    expect(recordResult(s, 'rocket', 210)).toBe('beat');
    expect(bestOf(s, 'rocket')).toBe(210);
  });

  it('counts down for the games where less is better', () => {
    const s = fresh();
    expect(recordResult(s, 'slide', 2)).toBe('first');
    expect(recordResult(s, 'slide', 3)).toBe('kept');
    expect(recordResult(s, 'slide', 0)).toBe('beat');
    expect(bestOf(s, 'slide')).toBe(0);
  });

  it('does not call a tie a new best', () => {
    const s = fresh();
    recordResult(s, 'memory', 40);
    expect(recordResult(s, 'memory', 40)).toBe('kept');
    expect(isBetter('memory', 40, 40)).toBe(false);
    expect(isBetter('rocket', 40, 40)).toBe(false);
  });

  it('only brags when the best has just been beaten', () => {
    expect(beatLine('race', 'first', 20)).toBeNull();
    expect(beatLine('race', 'kept', 20)).toBeNull();
    expect(beatLine('race', 'beat', 20)).toContain('20.0 seconds');
  });

  it('has something for Lucy to say about every game', () => {
    const s = fresh();
    for (const spec of RECORDS) {
      recordResult(s, spec.id, spec.better === 'higher' ? 100 : 2);
      expect(recallLine(s, spec.id)).toBeTruthy();
      expect(beatLine(spec.id, 'beat', spec.better === 'higher' ? 100 : 2)).toBeTruthy();
    }
  });

  it('says the unbeatable scores are unbeatable', () => {
    expect(beatLine('slide', 'beat', 0)).toBe(recordSpec('slide').perfect?.(0));
    expect(beatLine('basketball', 'beat', 3)).toContain('Three shots');
    // One over the floor is a best like any other.
    expect(beatLine('basketball', 'beat', 4)).toBe(recordSpec('basketball').beat(4));
  });

  it('writes seconds to one decimal place', () => {
    expect(seconds(18)).toBe('18.0 seconds');
    expect(seconds(18.44)).toBe('18.4 seconds');
  });
});
