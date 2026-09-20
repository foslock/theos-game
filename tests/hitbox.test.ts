import { describe, expect, it } from 'vitest';
import { contains, distanceTo, HIT_TOLERANCE, hitRects, pick } from '../src/systems/Hitbox';

const plain = { zone: { x: 100, y: 100, w: 40, h: 40 } };
/** An L: a tall left arm and a short foot, with the top-right corner cut out. */
const shaped = {
  zone: { x: 200, y: 100, w: 60, h: 60 },
  parts: [
    { x: 200, y: 100, w: 20, h: 60 },
    { x: 220, y: 140, w: 40, h: 20 },
  ],
};

describe('hit shapes', () => {
  it('falls back to the bounding box when no parts are given', () => {
    expect(hitRects(plain)).toEqual([plain.zone]);
    expect(contains(plain, 120, 120)).toBe(true);
    expect(contains(plain, 145, 120)).toBe(false);
  });

  it('only covers the declared parts, not the whole box', () => {
    expect(contains(shaped, 210, 110)).toBe(true); // in the arm
    expect(contains(shaped, 240, 150)).toBe(true); // in the foot
    expect(contains(shaped, 250, 110)).toBe(false); // the cut-out corner
  });

  it('measures distance from the nearest part', () => {
    expect(distanceTo(shaped, 210, 110)).toBe(0);
    expect(distanceTo(shaped, 226, 110)).toBe(6); // 6px right of the arm
  });
});

describe('picking a target', () => {
  it('forgives a near miss but not a wild one', () => {
    expect(pick([plain], 148, 120)?.zone).toBe(plain.zone); // 8px out
    expect(pick([plain], 100 + 40 + HIT_TOLERANCE + 2, 120)).toBeUndefined();
  });

  it('leaves the cut-out corner alone once it is well clear of the shape', () => {
    // This is the point of shaping: the empty corner of the bounding box is not clickable...
    expect(pick([shaped], 250, 110)).toBeUndefined(); // 30px from any part
    // ...but the tolerance still covers the gap just outside an edge.
    expect(pick([shaped], 230, 132)?.zone).toBe(shaped.zone); // 8px above the foot
  });

  it('never returns two targets for one point: the nearest always wins', () => {
    const left = { zone: { x: 0, y: 0, w: 50, h: 50 } };
    const right = { zone: { x: 70, y: 0, w: 50, h: 50 } };
    expect(pick([left, right], 55, 25)).toBe(left); // 5px from left, 15px from right
    expect(pick([left, right], 66, 25)).toBe(right); // 16px from left, 4px from right
    expect(pick([right, left], 55, 25)).toBe(left); // order does not change the winner
  });

  it('resolves a tie the same way every time', () => {
    const a = { zone: { x: 0, y: 0, w: 10, h: 10 } };
    const b = { zone: { x: 20, y: 0, w: 10, h: 10 } };
    expect(pick([a, b], 15, 5)).toBe(a);
    expect(pick([a, b], 15, 5)).toBe(a);
  });

  it('lets a small footprint with a longer reach win over a big one it is tucked against', () => {
    // A half-hidden ball showing 12px beside a desk; the ball reaches 30px, the desk the usual 14.
    const desk = { zone: { x: 200, y: 100, w: 100, h: 200 } };
    const ball = { zone: { x: 188, y: 150, w: 12, h: 24 }, reach: 30 };
    expect(pick([desk, ball], 194, 160)).toBe(ball); // on the ball
    expect(pick([desk, ball], 210, 160)).toBe(ball); // 10px onto the desk, where the rest of the ball is
    expect(pick([desk, ball], 230, 160)).toBe(desk); // 30px onto the desk: that is the desk
    expect(pick([desk, ball], 165, 160)).toBe(ball); // 23px out on the open floor, beyond the usual tolerance
    expect(pick([desk, ball], 150, 160)).toBeUndefined(); // 38px out: nothing
    // A reach shorter than the tolerance changes nothing.
    expect(pick([{ ...ball, reach: 4 }], 188 - 10, 160)).toBeDefined();
  });
});
