import type { Rng } from '../systems/Rng';

/*
 * The playground slide, without any Phaser in it. Theo and Lucy ride toward the camera down a
 * slide drawn in perspective; leaves and mud patches appear at the far end and grow as they
 * come. The player steers one lane left or right per click. A course is generated up front
 * from the save's seed so it can be checked, and every course is beatable by construction.
 */

export type Lane = -1 | 0 | 1;
export const LANES: readonly Lane[] = [-1, 0, 1];
export type ObstacleKind = 'leaf' | 'mud';

export interface Obstacle {
  /** Seconds into the run when it appears at the far end. */
  at: number;
  lane: Lane;
  kind: ObstacleKind;
  /** Slide-lengths per second; the later in the run, the faster. */
  speed: number;
}

export interface Course {
  seconds: number;
  obstacles: Obstacle[];
}

export const RUN_SECONDS = 32;
export const MAX_HITS = 3;
/** Where the riders sit along the slide, 0 being the far end and 1 the bottom of the screen. */
export const RIDER_D = 0.82;
/** How close an obstacle has to get to the riders' position along the slide to count as a hit. */
export const HIT_WINDOW = 0.06;
const FIRST_AT = 2.5;
const LAST_MARGIN = 3;
const GAP_START = 1.7;
const GAP_END = 0.95;
const SPEED_START = 0.42;
const SPEED_END = 0.62;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Starts gentle and gets busier. Later on some arrivals come in pairs, which still leaves a lane
 * free; the gap between arrivals is always enough to change lanes twice.
 */
export function generateCourse(rng: Rng): Course {
  const obstacles: Obstacle[] = [];
  let t = FIRST_AT;
  while (t < RUN_SECONDS - LAST_MARGIN) {
    const progress = t / RUN_SECONDS;
    const pair = progress > 0.4 && rng.next() < 0.3;
    const lanes = rng.shuffle(LANES).slice(0, pair ? 2 : 1);
    const speed = lerp(SPEED_START, SPEED_END, progress);
    for (const lane of lanes) obstacles.push({ at: t, lane, kind: rng.next() < 0.6 ? 'leaf' : 'mud', speed });
    t += lerp(GAP_START, GAP_END, progress) + rng.next() * 0.3;
  }
  return { seconds: RUN_SECONDS, obstacles };
}

/** How far along the slide an obstacle is at `now`: below 0 it has not appeared yet, past 1 it is off the bottom. */
export function obstacleD(ob: Obstacle, now: number): number {
  return (now - ob.at) * ob.speed;
}

export function moveLane(lane: Lane, dir: -1 | 1): Lane {
  return Math.max(-1, Math.min(1, lane + dir)) as Lane;
}

/** True when the obstacle is at the riders right now and in their lane. */
export function hits(ob: Obstacle, lane: Lane, now: number): boolean {
  return ob.lane === lane && Math.abs(obstacleD(ob, now) - RIDER_D) <= HIT_WINDOW;
}

/**
 * The slide as painted in `bg_slide`: measured off the art, its bed runs from the platform grate
 * at the bottom of the scene up to its far end, narrowing with the perspective. The placeholder
 * backdrop draws its bed to the same numbers.
 */
export const SLIDE = { top: 240, bottom: 370, cx: 320, farHalf: 21, nearHalf: 122, laneSpread: 0.62 };

export interface Placement {
  x: number;
  y: number;
  scale: number;
}

/** Depth is squared so things move slowly while far away and rush past near the bottom. */
export function yOf(d: number): number {
  return SLIDE.top + (SLIDE.bottom - SLIDE.top) * d * d;
}

export function halfWidthAt(y: number): number {
  return SLIDE.farHalf + (SLIDE.nearHalf - SLIDE.farHalf) * ((y - SLIDE.top) / (SLIDE.bottom - SLIDE.top));
}

export function placeOnSlide(d: number, lane: Lane): Placement {
  const y = yOf(d);
  return { x: SLIDE.cx + lane * halfWidthAt(y) * SLIDE.laneSpread, y, scale: 0.18 + 0.82 * d * d };
}
