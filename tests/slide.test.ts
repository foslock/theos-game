import { describe, expect, it } from 'vitest';
import { generateCourse, hits, HIT_WINDOW, LANES, moveLane, obstacleD, placeOnSlide, RIDER_D, RUN_SECONDS, SLIDE } from '../src/puzzles/slide';
import { Rng } from '../src/systems/Rng';

describe('a course', () => {
  it('always leaves a lane free and time to reach it', () => {
    for (let seed = 0; seed < 200; seed++) {
      const course = generateCourse(new Rng(seed));
      expect(course.obstacles.length).toBeGreaterThan(10);
      const groups = new Map<number, Set<number>>();
      for (const ob of course.obstacles) {
        expect(ob.at).toBeGreaterThan(1);
        expect(ob.at).toBeLessThan(RUN_SECONDS);
        expect(LANES).toContain(ob.lane);
        if (!groups.has(ob.at)) groups.set(ob.at, new Set());
        groups.get(ob.at)!.add(ob.lane);
      }
      const times = [...groups.keys()].sort((a, b) => a - b);
      for (const t of times) expect(groups.get(t)!.size, `seed ${seed} at ${t}`).toBeLessThan(LANES.length);
      // Arrivals at the riders are as far apart as departures, and two lane changes take well under a second.
      for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThan(0.8);
    }
  });

  it('is the same for the same seed and different for another', () => {
    const a = JSON.stringify(generateCourse(new Rng(5)));
    expect(JSON.stringify(generateCourse(new Rng(5)))).toBe(a);
    expect(JSON.stringify(generateCourse(new Rng(6)))).not.toBe(a);
  });
});

describe('steering', () => {
  it('moves one lane at a time and stops at the rails', () => {
    expect(moveLane(0, -1)).toBe(-1);
    expect(moveLane(-1, -1)).toBe(-1);
    expect(moveLane(-1, 1)).toBe(0);
    expect(moveLane(1, 1)).toBe(1);
  });

  it('only counts a bump in the riders lane as it reaches them', () => {
    const ob = { at: 2, lane: 1 as const, kind: 'leaf' as const, speed: 0.5 };
    const arrival = ob.at + RIDER_D / ob.speed;
    expect(obstacleD(ob, arrival)).toBeCloseTo(RIDER_D, 5);
    expect(hits(ob, 1, arrival)).toBe(true);
    expect(hits(ob, 0, arrival)).toBe(false);
    expect(hits(ob, 1, arrival - (HIT_WINDOW * 2) / ob.speed)).toBe(false);
    expect(hits(ob, 1, ob.at)).toBe(false);
  });
});

describe('perspective', () => {
  it('draws far things small near the top and near things big at the bottom, inside the slide', () => {
    const far = placeOnSlide(0, 0);
    const near = placeOnSlide(1, 0);
    expect(far.y).toBe(SLIDE.top);
    expect(near.y).toBe(SLIDE.bottom);
    expect(far.scale).toBeLessThan(near.scale);
    for (const lane of LANES) {
      for (const d of [0, 0.5, RIDER_D, 1]) {
        const p = placeOnSlide(d, lane);
        expect(p.x).toBeGreaterThanOrEqual(SLIDE.cx - SLIDE.nearHalf);
        expect(p.x).toBeLessThanOrEqual(SLIDE.cx + SLIDE.nearHalf);
      }
    }
    expect(placeOnSlide(RIDER_D, -1).x).toBeLessThan(placeOnSlide(RIDER_D, 1).x);
  });
});
