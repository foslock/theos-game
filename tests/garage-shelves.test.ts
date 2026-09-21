import { describe, expect, it } from 'vitest';
import { ROOMS } from '../src/data/rooms';
import { hitRects, overlaps, pick } from '../src/systems/Hitbox';

/*
 * The whole shelving unit starts the memory game, not just the top of it. Its lower half is
 * narrower than its top: the bike stands to the right of it, and the basketball hides in the gap
 * between the bottom box and the bike's wheel, so neither may be swallowed.
 */

const room = ROOMS.garage;
const shelves = room.hotspots.find((h) => h.id === 'shelves')!;
const bike = room.hotspots.find((h) => h.id === 'bike')!;
const ball = room.hotspots.find((h) => h.id === 'basketball')!;
const door = room.hotspots.find((h) => h.id === 'garage_door')!;
const car = room.hotspots.find((h) => h.id === 'car')!;
/** The spot behind the bottom box, as the room data lists it. */
const behindBoxes = ball.kind === 'pickup' ? ball.spots!.find((s) => s.where === 'behind the boxes')! : undefined!;

describe('the garage shelves', () => {
  it('answers from the top shelf all the way down to the bottom box', () => {
    // Measured off the art: the paint cans sit at y 204-235 and the bottom box at y 244-286.
    for (const [x, y] of [
      [150, 60],
      [150, 140],
      [140, 210],
      [140, 260],
      [120, 283],
    ]) {
      expect(pick(room.hotspots, x, y)?.id, `shelving at ${x},${y}`).toBe('shelves');
    }
  });

  it('leaves the bike alone', () => {
    for (const [x, y] of [
      [240, 220],
      [280, 250],
    ]) {
      expect(pick(room.hotspots, x, y)?.id, `bike at ${x},${y}`).toBe('bike');
    }
    // The top of the shelving reaches past the bike's left edge, but the bike stands lower, so
    // the two never share a pixel.
    expect(overlaps(shelves, bike)).toBe(false);
  });

  it('leaves the gap where the basketball hides', () => {
    const z = behindBoxes.zone;
    for (const r of hitRects(shelves)) {
      const clear = r.x + r.w <= z.x || r.x >= z.x + z.w || r.y + r.h <= z.y || r.y >= z.y + z.h;
      expect(clear, `shelf part ${JSON.stringify(r)} covers the ball's gap`).toBe(true);
    }
  });

  it('stops short of the floor where the rocket and the toolbox are', () => {
    const rocketSpot = { y: 322 };
    for (const r of hitRects(shelves)) expect(r.y + r.h).toBeLessThan(rocketSpot.y);
  });
});

describe('the garage door', () => {
  it('answers across the top and all the way down the side left of the car', () => {
    // Measured off the art: the door runs from y 70 to where it meets the concrete at y 252.
    for (const [x, y] of [
      [320, 80],
      [500, 100],
      [320, 150],
      [400, 200],
      [320, 248],
    ]) {
      expect(pick(room.hotspots, x, y)?.id, `door at ${x},${y}`).toBe('garage_door');
    }
  });

  it('leaves the car alone', () => {
    expect(overlaps(door, car)).toBe(false);
    for (const [x, y] of [
      [500, 200],
      [560, 280],
    ]) {
      expect(pick(room.hotspots, x, y)?.id, `car at ${x},${y}`).toBe('car');
    }
  });

  it('stops where the door meets the floor', () => {
    for (const r of hitRects(door)) expect(r.y + r.h).toBeLessThanOrEqual(252);
    // The rocket lies on the concrete in front of it and stays its own thing.
    const rocket = room.hotspots.find((h) => h.id === 'stomp_rocket')!;
    const z = rocket.zone;
    expect(pick(room.hotspots, z.x + z.w / 2, z.y + z.h / 2)?.id).toBe('stomp_rocket');
  });
});
