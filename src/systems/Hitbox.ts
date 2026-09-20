import type { Hitbox, Rect } from '../data/rooms';

/**
 * How far outside its shape a footprint still answers a click, in scene pixels. This is what lets
 * the shapes stay honest to the art: they can hug an armchair's outline and a near miss still
 * counts. Only one footprint ever wins, so generosity never makes a click ambiguous.
 */
export const HIT_TOLERANCE = 14;

/** The rectangles a footprint actually occupies: its parts, or its bounding box if it has none. */
export function hitRects(h: Hitbox): Rect[] {
  return h.parts && h.parts.length ? h.parts : [h.zone];
}

function distanceToRect(r: Rect, x: number, y: number): number {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** 0 when the point is inside the footprint, otherwise the distance to its nearest edge. */
export function distanceTo(h: Hitbox, x: number, y: number): number {
  let best = Infinity;
  for (const r of hitRects(h)) {
    const d = distanceToRect(r, x, y);
    if (d === 0) return 0;
    if (d < best) best = d;
  }
  return best;
}

export function contains(h: Hitbox, x: number, y: number): boolean {
  return distanceTo(h, x, y) === 0;
}

/**
 * The footprint a click at this point belongs to: whichever is nearest, so long as it is within
 * the tolerance. Returns undefined when the point is not near anything. Ties go to whichever
 * came first, so a given point always resolves to the same target.
 *
 * A footprint with a longer `reach` answers from that far away, and the extra over the tolerance
 * is taken off its distance, so a small thing beats a large one it is next to (or hidden behind)
 * until the pointer is that far onto the large one.
 */
export function pick<T extends Hitbox>(items: readonly T[], x: number, y: number, tolerance = HIT_TOLERANCE): T | undefined {
  let best: T | undefined;
  let bestScore = Infinity;
  for (const item of items) {
    const d = distanceTo(item, x, y);
    const reach = Math.max(tolerance, item.reach ?? tolerance);
    if (d > reach) continue;
    const score = d - (reach - tolerance);
    if (score < bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

/** True when two footprints share any pixel, which would make a click between them ambiguous. */
export function overlaps(a: Hitbox, b: Hitbox): boolean {
  for (const r of hitRects(a)) {
    for (const s of hitRects(b)) {
      if (r.x < s.x + s.w && s.x < r.x + r.w && r.y < s.y + s.h && s.y < r.y + r.h) return true;
    }
  }
  return false;
}

/** True when every part sits inside the declared bounding box, which the rest of the game measures from. */
export function partsWithinZone(h: Hitbox): boolean {
  const z = h.zone;
  return hitRects(h).every((r) => r.x >= z.x && r.y >= z.y && r.x + r.w <= z.x + z.w && r.y + r.h <= z.y + z.h);
}
