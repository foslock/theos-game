import { describe, expect, it } from 'vitest';
import {
  BOOSTER_S,
  clickBooster,
  clickCar,
  inLoop,
  LAP_LENGTH,
  LOOP_CENTRE,
  LOOP_END,
  LOOP_START,
  newRace,
  pose,
  RACE,
  START_S,
  step,
  TRACK,
  type RaceEvent,
  type RaceState,
} from '../src/puzzles/race';

/** Runs the car for `seconds`, calling `act` each tick, and collects what happened. */
function run(r: RaceState, seconds: number, act?: (r: RaceState, t: number) => void): RaceEvent[] {
  const out: RaceEvent[] = [];
  const dt = 1 / 30;
  for (let t = 0; t < seconds; t += dt) {
    act?.(r, t);
    out.push(...step(r, dt));
    if (r.won) break;
  }
  return out;
}

describe('the track', () => {
  it('starts on the near straight, with the booster ahead of the car', () => {
    const p = pose(START_S);
    expect(p.y).toBe(TRACK.straight.bottom);
    expect(p.x).toBe(TRACK.start.x);
    expect(p.angle).toBeCloseTo(0, 5); // heading right
    expect(BOOSTER_S.from).toBeGreaterThan(START_S);
  });

  it('runs the loop leftward along the far straight: in at the bottom, up the left side, over the top', () => {
    const entry = pose(LOOP_START);
    expect(entry.inLoop).toBe(true);
    expect(entry.x).toBeCloseTo(TRACK.loop.x, 5);
    expect(entry.y).toBeCloseTo(TRACK.straight.top, 5);
    const quarter = pose(LOOP_START + (LOOP_END - LOOP_START) / 4);
    expect(quarter.x).toBeCloseTo(LOOP_CENTRE.x - TRACK.loop.r, 5);
    const top = pose(LOOP_START + (LOOP_END - LOOP_START) / 2);
    expect(top.y).toBeCloseTo(LOOP_CENTRE.y - TRACK.loop.r, 5);
    // Just before the loop the car is on the far straight heading left, and again just after it.
    for (const s of [LOOP_START - 1, LOOP_END + 1]) {
      const p = pose(s);
      expect(p.inLoop).toBe(false);
      expect(p.y).toBeCloseTo(TRACK.straight.top, 5);
      expect(Math.abs(Math.abs(p.angle) - Math.PI)).toBeLessThan(0.01);
    }
  });

  it('wraps: a lap later is the same place', () => {
    for (const s of [0, START_S, LOOP_START + 10, 700]) {
      const a = pose(s);
      const b = pose(s + LAP_LENGTH);
      expect(b.x).toBeCloseTo(a.x, 6);
      expect(b.y).toBeCloseTo(a.y, 6);
    }
  });
});

describe('pushing the car', () => {
  it('gets it rolling and it slows to a stop on its own', () => {
    const r = newRace();
    clickCar(r);
    expect(r.v).toBe(RACE.CLICK_KICK);
    const events = run(r, 15);
    expect(events).toContain('stop');
    expect(r.v).toBe(0);
    expect(r.laps).toBe(0);
  });

  it('cannot push it past the pushing limit, and never slows a faster car', () => {
    const r = newRace();
    for (let i = 0; i < 10; i++) clickCar(r);
    expect(r.v).toBe(RACE.CLICK_MAX);
    r.v = RACE.BOOST_V;
    clickCar(r);
    expect(r.v).toBe(RACE.BOOST_V);
  });

  it('is not enough for the loop: the car rolls back out and stops', () => {
    const r = newRace();
    expect(RACE.CLICK_MAX).toBeLessThan(RACE.LOOP_ENTRY_MIN);
    // Keep it at full push speed right up to the loop's mouth.
    const events = run(r, 20, (r) => {
      if (!inLoop(r.s) && r.v >= 0 && r.v < RACE.CLICK_MAX) clickCar(r);
    });
    expect(events).toContain('rollback');
    expect(events.filter((e) => e === 'lap')).toHaveLength(0);
  });
});

describe('the booster', () => {
  it('flings a car passing over it while on, then switches itself off', () => {
    const r = newRace();
    clickCar(r);
    clickCar(r);
    clickBooster(r);
    const events = run(r, 4);
    expect(events).toContain('boost');
    expect(events).toContain('boosterOff');
    expect(r.boosterLeft).toBe(0);
  });

  it('gets the car through the loop with room to spare', () => {
    const r = newRace();
    clickCar(r);
    clickCar(r);
    clickBooster(r);
    let slowest = Infinity;
    let wasInLoop = false;
    const events = run(r, 6, (r) => {
      if (inLoop(r.s)) {
        wasInLoop = true;
        slowest = Math.min(slowest, r.v);
      }
    });
    expect(wasInLoop).toBe(true);
    expect(slowest).toBeGreaterThan(60);
    expect(events).not.toContain('rollback');
    expect(events.filter((e) => e === 'boost')).toHaveLength(1);
  });

  it('is not enough on its own for a whole lap: the car stops before it gets back round', () => {
    const r = newRace();
    clickCar(r);
    clickCar(r);
    clickBooster(r);
    const events = run(r, 20);
    expect(events).toContain('lap');
    expect(events).toContain('stop');
    expect(r.laps).toBe(0);
  });
});

describe('winning', () => {
  it('takes three laps in one run: push it along, boost it before the loop', () => {
    const r = newRace();
    const events = run(r, 60, (r) => {
      // A player who keeps the car rolling and hits the booster as the car comes up to it.
      if (r.v >= 0 && r.v < 150 && !inLoop(r.s)) clickCar(r);
      const toBooster = BOOSTER_S.from - r.s;
      if (toBooster > 0 && toBooster < 120 && r.boosterLeft === 0) clickBooster(r);
    });
    expect(events.filter((e) => e === 'lap')).toHaveLength(3);
    expect(events).toContain('win');
    expect(r.won).toBe(true);
  });

  it('starts the laps over when the car stops', () => {
    const r = newRace();
    clickCar(r);
    clickCar(r);
    clickBooster(r);
    run(r, 20);
    expect(r.laps).toBe(0);
    expect(r.progress).toBe(0);
  });
});
