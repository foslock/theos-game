import type { Rng } from '../systems/Rng';
import geometry from './race-track.json';

/*
 * The toy race track in Theo's room, without any Phaser in it. The car lives at an arc-length
 * position along the track and rolls with friction; the Push button gives it a shove, and the
 * booster on the near straight (switched on for a moment with its own button) flings it fast
 * enough for the loop-the-loop, which pushing alone never is. Three laps in one unbroken run
 * wins; if the car comes to a stop the laps start over.
 */

export interface Pt {
  x: number;
  y: number;
}

/** Where the car is and which way it faces. Angles are radians in screen space, 0 pointing right. */
export interface Pose extends Pt {
  angle: number;
  /** Inside the loop-the-loop, seen side-on instead of from above. */
  inLoop: boolean;
  /** How far round the loop, 0 at the bottom on the way in, 2π at the bottom on the way out. */
  phi: number;
}

export const TRACK = geometry;
export const LOOP_CENTRE: Pt = { x: TRACK.loop.x, y: TRACK.straight.top - TRACK.loop.r };
const LOOP_LENGTH = 2 * Math.PI * TRACK.loop.r;

/** The flat oval as a dense polyline with cumulative lengths, the loop left out; it is inserted at `loopAt`. */
interface Path {
  pts: Pt[];
  cum: number[];
  /** Arc length along the flat oval at which the loop begins. */
  loopAt: number;
  length: number;
}

function buildPath(): Path {
  const { straight: st, end } = TRACK;
  const pts: Pt[] = [];
  const cy = (st.top + st.bottom) / 2;
  // Bottom straight, left to right.
  for (let x = st.left; x <= st.right; x += 2) pts.push({ x, y: st.bottom });
  // Right end: from the bottom round to the top.
  const N = 180;
  for (let i = 1; i < N; i++) {
    const th = Math.PI / 2 - (i / N) * Math.PI;
    pts.push({ x: st.right + end.rx * Math.cos(th), y: cy + end.ry * Math.sin(th) });
  }
  // Top straight, right to left, noting where the loop's tangent point is.
  let loopAt = -1;
  for (let x = st.right; x >= st.left; x -= 2) {
    pts.push({ x, y: st.top });
    if (x === TRACK.loop.x) loopAt = pts.length - 1;
  }
  // Left end: from the top round to the bottom.
  for (let i = 1; i < N; i++) {
    const th = -Math.PI / 2 - (i / N) * Math.PI;
    pts.push({ x: st.left + end.rx * Math.cos(th), y: cy + end.ry * Math.sin(th) });
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  // Close the loop back to the first point.
  const last = pts[pts.length - 1];
  const length = cum[cum.length - 1] + Math.hypot(pts[0].x - last.x, pts[0].y - last.y);
  if (loopAt < 0) throw new Error('The loop must sit on an even x along the top straight');
  return { pts, cum, loopAt: cum[loopAt], length };
}

const PATH = buildPath();
/** Arc length of a whole lap, loop included. */
export const LAP_LENGTH = PATH.length + LOOP_LENGTH;
/** Where the loop begins and ends along the lap. */
export const LOOP_START = PATH.loopAt;
export const LOOP_END = PATH.loopAt + LOOP_LENGTH;
/** The start line painted on the near straight, where laps are counted from. */
export const START_S = TRACK.start.x - TRACK.straight.left;
/**
 * How far either side of the start line the car is parked, drawn from the save's seed. The run
 * still counts three track lengths of travel, so the flag stays where it is painted; what moves
 * is how much near straight the car has before the booster on its first pass.
 */
export const START_JITTER = 40;

/** Where the car is parked this playthrough. */
export function startAt(rng: Rng): number {
  return START_S + rng.int(-START_JITTER, START_JITTER);
}
/** The booster's stretch of the near straight. */
export const BOOSTER_S = { from: TRACK.booster.x0 - TRACK.straight.left, to: TRACK.booster.x1 - TRACK.straight.left };

function wrap(s: number): number {
  if (s >= 0 && s < LAP_LENGTH) return s;
  return ((s % LAP_LENGTH) + LAP_LENGTH) % LAP_LENGTH;
}

/** A point on the flat oval at arc length `f` (loop not counted), with its heading. */
function flatPose(f: number): Pose {
  const { pts, cum, length } = PATH;
  const t = ((f % length) + length) % length;
  // Binary search for the segment.
  let lo = 0;
  let hi = pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  const a = pts[lo];
  const b = pts[(lo + 1) % pts.length];
  const segLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const k = Math.min(1, (t - cum[lo]) / segLen);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, angle: Math.atan2(b.y - a.y, b.x - a.x), inLoop: false, phi: 0 };
}

/**
 * Where the car is for a position along the lap. In the loop the point is on the loop's
 * centreline: entering leftward at the bottom, up the left side, over the top and down the right.
 */
export function pose(s: number): Pose {
  const t = wrap(s);
  if (t >= LOOP_START && t < LOOP_END) {
    const phi = (t - LOOP_START) / TRACK.loop.r;
    const r = TRACK.loop.r;
    return { x: LOOP_CENTRE.x - r * Math.sin(phi), y: LOOP_CENTRE.y + r * Math.cos(phi), angle: phi + Math.PI, inLoop: true, phi };
  }
  return flatPose(t < LOOP_START ? t : t - LOOP_LENGTH);
}

/** Tuning: pixels and seconds. */
export const RACE = {
  /** Gravity felt in the loop. */
  G: 380,
  /** Air drag, per second. */
  MU: 0.25,
  /** Rolling resistance, constant slowing. */
  ROLL: 25,
  /** What one push adds, and the most pushing alone can get the car up to. */
  CLICK_KICK: 120,
  CLICK_MAX: 240,
  /** The speed the booster flings the car out at. */
  BOOST_V: 560,
  BOOSTER_SECONDS: 1.5,
  LAPS_TO_WIN: 3,
  /** The car has to be at least this fast at the loop's mouth to have a chance; slower and it rolls back. */
  get LOOP_ENTRY_MIN(): number {
    return Math.sqrt(4 * this.G * TRACK.loop.r);
  },
};

export type RaceEvent = 'lap' | 'stop' | 'boost' | 'boosterOff' | 'rollback' | 'win';

export interface RaceState {
  /** Position along the lap, wrapped. */
  s: number;
  /** Speed along the track; negative when rolling backwards out of the loop. */
  v: number;
  /** Distance travelled since the run started, unwrapped, so laps survive a roll-back. */
  progress: number;
  laps: number;
  /** Seconds the booster stays on, 0 when off. */
  boosterLeft: number;
  won: boolean;
  /** Set once the car has rolled back out of the loop this run, until it is pushed again. */
  rolledBack: boolean;
  /** The booster has already flung the car on this pass over it. */
  boosted: boolean;
}

export function newRace(start: number = START_S): RaceState {
  return { s: wrap(start), v: 0, progress: 0, laps: 0, boosterLeft: 0, won: false, rolledBack: false, boosted: false };
}

export function boosterOn(r: RaceState): boolean {
  return r.boosterLeft > 0;
}

/** A push: never past what pushing can reach, but never slowing a car that is already faster. */
export function clickCar(r: RaceState): void {
  if (r.won) return;
  const forward = Math.max(0, r.v);
  r.v = Math.min(forward + RACE.CLICK_KICK, Math.max(forward, RACE.CLICK_MAX));
  r.rolledBack = false;
}

export function clickBooster(r: RaceState): void {
  if (r.won) return;
  r.boosterLeft = RACE.BOOSTER_SECONDS;
}

export function inBooster(s: number): boolean {
  const t = wrap(s);
  return t >= BOOSTER_S.from && t <= BOOSTER_S.to;
}

export function inLoop(s: number): boolean {
  const t = wrap(s);
  return t >= LOOP_START && t < LOOP_END;
}

const SUBSTEP = 1 / 120;

/** Advances the car by `dt` seconds. Returns what happened, in order. */
export function step(r: RaceState, dt: number): RaceEvent[] {
  const events: RaceEvent[] = [];
  let remaining = Math.min(dt, 0.25);
  while (remaining > 0) {
    const h = Math.min(SUBSTEP, remaining);
    remaining -= h;
    if (r.boosterLeft > 0) {
      r.boosterLeft = Math.max(0, r.boosterLeft - h);
      if (r.boosterLeft === 0) events.push('boosterOff');
    }
    const wasMoving = r.v !== 0;
    // Gravity along the loop, then drag and rolling resistance against the motion.
    let a = 0;
    const looping = inLoop(r.s);
    if (looping) a -= RACE.G * Math.sin((wrap(r.s) - LOOP_START) / TRACK.loop.r);
    a -= RACE.MU * r.v;
    if (r.v > 0) a -= RACE.ROLL;
    else if (r.v < 0) a += RACE.ROLL;
    const v0 = r.v;
    r.v += a * h;
    // Rolling resistance stops a car, it never reverses one — except in the loop, where gravity can.
    if (!looping && v0 !== 0 && Math.sign(r.v) !== Math.sign(v0)) r.v = 0;
    if (looping && v0 >= 0 && r.v < 0 && !r.rolledBack) {
      r.rolledBack = true;
      events.push('rollback');
    }
    // The booster flings anything on it that is not already going faster, once per pass.
    const onBooster = inBooster(r.s);
    if (!onBooster) r.boosted = false;
    if (r.boosterLeft > 0 && onBooster && !r.boosted && r.v >= 0) {
      r.boosted = true;
      if (r.v < RACE.BOOST_V) {
        r.v = RACE.BOOST_V;
        events.push('boost');
      }
    }
    const ds = r.v * h;
    const before = r.progress;
    r.s = wrap(r.s + ds);
    r.progress += ds;
    // A lap is each full track length of forward progress; rolling back takes it away again.
    const lapsNow = Math.max(0, Math.floor(r.progress / LAP_LENGTH));
    if (lapsNow > Math.floor(Math.max(0, before) / LAP_LENGTH) && lapsNow > r.laps) {
      r.laps = lapsNow;
      events.push('lap');
      if (r.laps >= RACE.LAPS_TO_WIN && !r.won) {
        r.won = true;
        events.push('win');
        return events;
      }
    }
    if (wasMoving && r.v === 0 && !r.won) {
      // Stopped short: the run is over and the laps start again from here.
      events.push('stop');
      r.progress = 0;
      r.laps = 0;
      r.rolledBack = false;
    }
  }
  return events;
}

/** Lap readout for the panel. */
export function lapText(r: RaceState): string {
  return `Lap ${Math.min(r.laps + 1, RACE.LAPS_TO_WIN)} of ${RACE.LAPS_TO_WIN}`;
}

/** Theo's line when the car stops short, depending on how it went. */
export function stopLine(rolledBack: boolean, laps: number): string {
  if (rolledBack) return 'Not fast enough for the loop! The booster will do it.';
  if (laps > 0) return "Oops, it stopped! Let's start the laps again.";
  return 'It stopped. Give it a push!';
}
