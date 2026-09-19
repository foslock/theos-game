import { describe, expect, it } from 'vitest';
import { altitudeAt, cameraScroll, CHARGE_SECONDS, flightOver, flightSeconds, heightFor, METERS_PER_CLICK, resultLine, skySpots } from '../src/puzzles/rocket';
import { Rng } from '../src/systems/Rng';

describe('winding up', () => {
  it('gives nine metres a click', () => {
    expect(METERS_PER_CLICK).toBe(9);
    expect(heightFor(0)).toBe(0);
    expect(heightFor(1)).toBe(9);
    expect(heightFor(12)).toBe(108);
    expect(CHARGE_SECONDS).toBe(5);
  });
});

describe('the flight', () => {
  it('rises to the peak, then comes all the way back down', () => {
    for (const h of [9, 108, 360]) {
      const { up, down } = flightSeconds(h);
      expect(altitudeAt(h, 0)).toBe(0);
      expect(altitudeAt(h, up)).toBeCloseTo(h, 6);
      expect(altitudeAt(h, up + down)).toBe(0);
      expect(flightOver(h, up + down)).toBe(true);
      expect(flightOver(h, up)).toBe(false);
      let prev = -1;
      for (let t = 0; t <= up; t += up / 20) {
        const a = altitudeAt(h, t);
        expect(a).toBeGreaterThanOrEqual(prev);
        prev = a;
      }
      for (let t = up; t <= up + down; t += down / 20) {
        const a = altitudeAt(h, t);
        expect(a).toBeLessThanOrEqual(prev + 1e-9);
        prev = a;
      }
    }
  });

  it('takes longer the higher it goes, but not forever', () => {
    expect(flightSeconds(9).up).toBeLessThan(flightSeconds(200).up);
    expect(flightSeconds(5000).up).toBe(6);
  });
});

describe('the camera', () => {
  it('stays on the yard until the rocket is high, then follows it', () => {
    expect(cameraScroll(300)).toBe(0);
    expect(cameraScroll(130)).toBe(0);
    expect(cameraScroll(-500)).toBe(-630);
  });

  it('fills the column of sky with clouds and birds', () => {
    const spots = skySpots(new Rng(4), 2000);
    expect(spots.clouds.length).toBeGreaterThan(8);
    expect(spots.birds.length).toBeGreaterThan(2);
    for (const p of [...spots.clouds, ...spots.birds]) {
      expect(p.y).toBeLessThan(0);
      expect(p.y).toBeGreaterThan(-2000 - 300);
    }
  });
});

describe('what Theo says', () => {
  it('has a line for a dud and for a great one', () => {
    expect(resultLine(0)).toMatch(/click/);
    expect(resultLine(108)).toMatch(/108/);
    expect(resultLine(270)).toMatch(/270/);
  });
});
