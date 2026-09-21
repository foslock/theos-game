import { describe, expect, it } from 'vitest';
import { altitudeAt, cameraScroll, CHARGE_SECONDS, flightOver, flightSeconds, heightFor, METERS_PER_CLICK, resultLine, SIGHTS, sightFlipped, skySpots } from '../src/puzzles/rocket';
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

describe('things to spot on the way up', () => {
  it('hangs one at every fifty metres, with no gaps and none of them doubled up', () => {
    const metres = SIGHTS.map((s) => s.metres);
    expect(metres).toEqual([50, 100, 150, 200, 250, 300, 350, 400]);
    expect(new Set(SIGHTS.map((s) => s.key)).size).toBe(SIGHTS.length);
  });

  it('puts the first one within reach of a gentle pump', () => {
    // Someone managing only a click and a bit a second over the five seconds still meets the kite.
    expect(SIGHTS[0].metres).toBeLessThanOrEqual(heightFor(1.2 * CHARGE_SECONDS));
    for (const s of SIGHTS) expect(s.drift).toBeGreaterThanOrEqual(0);
  });

  it('has something to say about every height a rocket can reach', () => {
    for (const h of [0, 9, 89, 90, 199, 250, 299, 399, 450]) expect(resultLine(h).length).toBeGreaterThan(0);
    // The lines keep up with the sights: past the moon is not still "almost outer space".
    expect(resultLine(320)).not.toBe(resultLine(220));
    expect(resultLine(420)).not.toBe(resultLine(320));
  });
});

describe('which way a sight faces', () => {
  const plane = SIGHTS.find((s) => s.key === 'sky_plane')!;

  it('mirrors art drawn the wrong way round, so nothing flies backwards', () => {
    // The plane is drawn nose-left: going left it is left alone, going right it is mirrored.
    expect(plane.faces).toBe('left');
    expect(sightFlipped(plane, -70)).toBe(false);
    expect(sightFlipped(plane, 70)).toBe(true);
  });

  it('leaves art drawn nose-right alone when it goes right', () => {
    const facing = { key: 'x', metres: 100, drift: 70, faces: 'right' } as const;
    expect(sightFlipped(facing, 70)).toBe(false);
    expect(sightFlipped(facing, -70)).toBe(true);
  });

  it('never mirrors a symmetrical sight or one that hangs still', () => {
    const symmetric = { key: 'x', metres: 100, drift: 45 };
    expect(sightFlipped(symmetric, 45)).toBe(false);
    expect(sightFlipped(symmetric, -45)).toBe(false);
    expect(sightFlipped(plane, 0)).toBe(false);
  });

  it('gives every sight that crosses the sky a facing, or none if it is symmetrical', () => {
    for (const s of SIGHTS) {
      if (s.faces) expect(['left', 'right']).toContain(s.faces);
      if (s.drift === 0) expect(s.faces).toBeUndefined();
    }
  });
});
