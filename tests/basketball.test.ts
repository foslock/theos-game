import { describe, expect, it } from 'vitest';
import {
  BALLS_NEEDED,
  currentHoop,
  handOf,
  HOOPS,
  launchSpeed,
  newBasketballGame,
  perfectPower,
  recordShot,
  simulateShot,
  standFor,
  STAND_JITTER,
  TRIES_PER_HOOP,
  triesLeft,
} from '../src/puzzles/basketball';
import { hintLine, lucyHintLine } from '../src/systems/Hints';
import { ROOMS, ROOM_IDS } from '../src/data/rooms';
import { Rng } from '../src/systems/Rng';
import { addItem, markUnlocked, newGameState, setFlag } from '../src/state/GameState';

describe('the power meter', () => {
  it('runs from too soft for the little hoop to too hard for the tall one', () => {
    expect(launchSpeed(0)).toBeLessThan(launchSpeed(1));
    for (const hoop of HOOPS) {
      const p = perfectPower(handOf(standFor(hoop)), hoop.rim);
      expect(p, hoop.id).toBeGreaterThan(0.2);
      expect(p, hoop.id).toBeLessThan(0.9);
    }
  });

  it('wants more power the taller the hoop', () => {
    const powers = HOOPS.map((h) => perfectPower(handOf(standFor(h)), h.rim));
    for (let i = 1; i < powers.length; i++) expect(powers[i]).toBeGreaterThan(powers[i - 1]);
  });
});

describe('a shot', () => {
  it('goes in at the perfect power, from wherever Theo happens to stand', () => {
    for (const hoop of HOOPS) {
      for (const jitter of [-STAND_JITTER, 0, STAND_JITTER]) {
        const from = handOf(standFor(hoop, jitter));
        expect(simulateShot(from, hoop, perfectPower(from, hoop.rim)).outcome, `${hoop.id} @${jitter}`).toBe('made');
      }
    }
  });

  it('falls short when soft and sails long when hard', () => {
    for (const hoop of HOOPS) {
      const from = handOf(standFor(hoop));
      const p = perfectPower(from, hoop.rim);
      expect(simulateShot(from, hoop, p - 0.2).outcome, hoop.id).toBe('short');
      expect(simulateShot(from, hoop, 0).outcome, hoop.id).toBe('short');
      expect(simulateShot(from, hoop, p + 0.2).outcome, hoop.id).toBe('long');
      expect(simulateShot(from, hoop, 1).outcome, hoop.id).toBe('long');
    }
  });

  it('forgives a little either side, and less for the taller hoops', () => {
    const windows = HOOPS.map((hoop) => {
      const from = handOf(standFor(hoop));
      const p = perfectPower(from, hoop.rim);
      let lo = p;
      let hi = p;
      while (lo > 0 && simulateShot(from, hoop, lo - 0.005).outcome === 'made') lo -= 0.005;
      while (hi < 1 && simulateShot(from, hoop, hi + 0.005).outcome === 'made') hi += 0.005;
      return hi - lo;
    });
    for (const w of windows) {
      expect(w).toBeGreaterThan(0.04);
      expect(w).toBeLessThan(0.25);
    }
    expect(windows[2]).toBeLessThanOrEqual(windows[0]);
  });

  it('always comes to rest', () => {
    for (const hoop of HOOPS) {
      const from = handOf(standFor(hoop));
      for (let p = 0; p <= 1; p += 0.05) {
        const { path } = simulateShot(from, hoop, p);
        expect(path.length, `${hoop.id} @${p}`).toBeLessThan(8 * 60);
      }
    }
  });
});

describe('the game', () => {
  it('moves on after one basket and ends after three misses at any hoop', () => {
    const g = newBasketballGame(new Rng(3));
    expect(currentHoop(g).id).toBe('hoop_low');
    expect(triesLeft(g)).toBe(TRIES_PER_HOOP);
    expect(recordShot(g, 'short')).toBe('again');
    expect(recordShot(g, 'made')).toBe('next');
    expect(currentHoop(g).id).toBe('hoop_mid');
    expect(triesLeft(g)).toBe(TRIES_PER_HOOP);
    expect(recordShot(g, 'long')).toBe('again');
    expect(recordShot(g, 'long')).toBe('again');
    expect(recordShot(g, 'long')).toBe('lost');
  });

  it('is won by a basket at every hoop', () => {
    const g = newBasketballGame(new Rng(3));
    expect(recordShot(g, 'made')).toBe('next');
    expect(recordShot(g, 'made')).toBe('next');
    expect(recordShot(g, 'made')).toBe('won');
  });

  it('puts Theo somewhere a little different each playthrough, but always on the court', () => {
    const spots = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const g = newBasketballGame(new Rng(seed));
      spots.add(g.stands.map((s) => s.x).join(','));
      g.stands.forEach((s, i) => expect(Math.abs(s.x - standFor(HOOPS[i]).x)).toBeLessThanOrEqual(STAND_JITTER));
    }
    expect(spots.size).toBeGreaterThan(5);
  });
});

describe('the hunt', () => {
  it('hides one ball in each of the three rooms, half tucked behind furniture', () => {
    const rooms = ROOM_IDS.filter((id) => ROOMS[id].hotspots.some((h) => h.kind === 'pickup' && h.item === 'basketball'));
    expect(rooms.sort()).toEqual(['bedroom', 'family_room', 'garage']);
    expect(rooms.length).toBe(BALLS_NEEDED);
    for (const id of rooms) {
      const ball = ROOMS[id].hotspots.find((h) => h.kind === 'pickup' && h.item === 'basketball');
      expect(ball?.kind === 'pickup' && ball.peek, id).toBeTruthy();
    }
  });

  it('only nags about the balls once Lucy has asked for them', () => {
    const s = newGameState(1);
    setFlag(s, 'hasBackpack');
    expect(hintLine(ROOMS.garage, s)).toBeNull();
    setFlag(s, 'basketballHunt');
    expect(hintLine(ROOMS.garage, s)).toMatch(/basketball/);
    expect(hintLine(ROOMS.sport_court, s)).toMatch(/three basketballs/);
    for (let i = 0; i < BALLS_NEEDED; i++) addItem(s, 'basketball');
    expect(hintLine(ROOMS.sport_court, s)).toMatch(/all three/);
    // The garage key on the playhouse floor comes first; once that door is open, the playground gate is the hint.
    expect(hintLine(ROOMS.playhouse, s)).toMatch(/garage key/);
    markUnlocked(s, 'family_room', 'garage');
    expect(hintLine(ROOMS.playhouse, s)).toMatch(/basketball first/);
    setFlag(s, 'basketballDone');
    expect(hintLine(ROOMS.sport_court, s)).toBeNull();
    expect(hintLine(ROOMS.garage, s)).toBeNull();
    expect(hintLine(ROOMS.playhouse, s)).toBeNull();
    expect(hintLine(ROOMS.playground, s)).toMatch(/slide/);
  });
});

describe('asking Lucy', () => {
  it('points at the next thing to do in every room', () => {
    const s = newGameState(1);
    expect(lucyHintLine(ROOMS.bedroom, s)).toMatch(/backpack/);
    setFlag(s, 'hasBackpack');
    expect(lucyHintLine(ROOMS.kitchen, s)).toMatch(/drawers/);
    setFlag(s, 'breakfastDone');
    expect(lucyHintLine(ROOMS.kitchen, s)).toMatch(/key/);
    expect(lucyHintLine(ROOMS.family_room, s)).toMatch(/key/);
    markUnlocked(s, 'kitchen', 'backyard');
    expect(lucyHintLine(ROOMS.backyard, s)).toMatch(/mailbox/);
    markUnlocked(s, 'backyard', 'playhouse');
    expect(lucyHintLine(ROOMS.backyard, s)).toMatch(/basketball/);
    setFlag(s, 'basketballHunt');
    expect(lucyHintLine(ROOMS.garage, s)).toMatch(/basketball/);
    expect(lucyHintLine(ROOMS.sport_court, s)).toMatch(/three/);
    for (let i = 0; i < BALLS_NEEDED; i++) addItem(s, 'basketball');
    expect(lucyHintLine(ROOMS.sport_court, s)).toMatch(/hoop/);
    setFlag(s, 'basketballDone');
    markUnlocked(s, 'family_room', 'garage');
    expect(lucyHintLine(ROOMS.playhouse, s)).toMatch(/playground/);
    expect(lucyHintLine(ROOMS.playground, s)).toMatch(/slide/);
    for (const id of ROOM_IDS) expect(lucyHintLine(ROOMS[id], s).length).toBeGreaterThan(0);
  });
});
