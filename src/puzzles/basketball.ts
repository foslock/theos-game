import { GAME_WIDTH } from '../config';
import type { Pt, Rect } from '../data/rooms';
import type { Rng } from '../systems/Rng';

/*
 * The hoop mini-game, without any Phaser in it. The scene controller owns the sprites and the
 * pointer; everything that decides what a shot does lives here so it can be tested.
 *
 * A shot is a plain ballistic arc in screen space. Every throw leaves Theo's hands at the same
 * angle, so the only thing the player controls is how hard, which is what the power meter sets.
 */

export const BALLS_NEEDED = 3;
export const TRIES_PER_HOOP = 3;

/** Pixels per second squared. */
export const GRAVITY = 900;
export const LAUNCH_ANGLE = (65 * Math.PI) / 180;
export const BALL_RADIUS = 11;
/** Where a thrown ball comes to rest: the court just in front of the hoops. */
export const FLOOR_Y = 300;
/** Feet height Theo shoots from. */
export const STAND_Y = 345;
/** The ball leaves his hands here, relative to his feet: where the ball sits in his shooting pose. */
export const HAND_OFFSET: Pt = { x: 14, y: -78 };
/** How far Theo's spot may shift per playthrough, so the winning power is never quite the same. */
export const STAND_JITTER = 12;
/** How deep the net hangs below the rim; a made ball drops this far before it is free again. */
export const NET_DEPTH = 22;
const NET_DROP_SPEED = 90;

export interface HoopSpec {
  id: string;
  name: string;
  /** Centre of the rim, in scene pixels. */
  rim: Pt;
  /** The face of the backboard: a ball flying over the rim bounces off this. */
  board: Rect;
  /** How far in front of the rim Theo stands. Further back for the taller hoops. */
  standOff: number;
  /** Half-height of the window through the rim that counts, in pixels. */
  tolerance: number;
  /** Seconds for the power meter to run from empty to full (and the same back down). */
  meterSeconds: number;
  /** The rim and net cut out of the court art, drawn over a ball that is dropping through them. */
  net: { key: string; x: number; y: number };
}

/** Measured off the sport court art: the rims sit on the left of each backboard, facing the court. */
export const HOOPS: readonly HoopSpec[] = [
  { id: 'hoop_low', name: 'little hoop', rim: { x: 422, y: 175 }, board: { x: 434, y: 148, w: 18, h: 38 }, standOff: 150, tolerance: 12, meterSeconds: 1.4, net: { key: 'net_low', x: 408, y: 170 } },
  { id: 'hoop_mid', name: 'medium hoop', rim: { x: 484, y: 149 }, board: { x: 498, y: 118, w: 18, h: 40 }, standOff: 170, tolerance: 10, meterSeconds: 1.15, net: { key: 'net_mid', x: 467, y: 143 } },
  { id: 'hoop_high', name: 'tall hoop', rim: { x: 547, y: 118 }, board: { x: 559, y: 78, w: 26, h: 50 }, standOff: 190, tolerance: 8, meterSeconds: 0.95, net: { key: 'net_high', x: 532, y: 111 } },
];

export function standFor(hoop: HoopSpec, jitter = 0): Pt {
  return { x: hoop.rim.x - hoop.standOff + jitter, y: STAND_Y };
}

export function handOf(stand: Pt): Pt {
  return { x: stand.x + HAND_OFFSET.x, y: stand.y + HAND_OFFSET.y };
}

/** Launch speed that carries a ball from `from` through the centre of the rim at the fixed angle. */
export function perfectSpeed(from: Pt, rim: Pt): number {
  const run = rim.x - from.x;
  const rise = from.y - rim.y;
  const tan = Math.tan(LAUNCH_ANGLE);
  const cos2 = Math.cos(LAUNCH_ANGLE) ** 2;
  const drop = run * tan - rise;
  if (run <= 0 || drop <= 0) throw new Error('Hoop is out of reach at this angle');
  return Math.sqrt((GRAVITY * run * run) / (2 * cos2 * drop));
}

/**
 * What the meter maps to. An empty meter falls well short of the little hoop and a full one
 * sails past the tall one: the little hoop wants about 30% and the tall about 80%.
 */
const METER = (() => {
  const first = HOOPS[0];
  const last = HOOPS[HOOPS.length - 1];
  const low = perfectSpeed(handOf(standFor(first)), first.rim);
  const high = perfectSpeed(handOf(standFor(last)), last.rim);
  const span = (high - low) / 0.5;
  return { min: low - 0.3 * span, span };
})();

export function launchSpeed(power: number): number {
  return METER.min + Math.min(1, Math.max(0, power)) * METER.span;
}

/** The meter reading that would put a ball from `from` dead centre through `rim`. */
export function perfectPower(from: Pt, rim: Pt): number {
  return (perfectSpeed(from, rim) - METER.min) / METER.span;
}

export type Outcome = 'made' | 'short' | 'long';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** flight: still to be decided; net: dropping through the hoop; bounce: out, settling; done: at rest. */
  phase: 'flight' | 'net' | 'bounce' | 'done';
  outcome: Outcome | null;
}

export function throwBall(from: Pt, power: number): Ball {
  const v = launchSpeed(power);
  return { x: from.x, y: from.y, vx: v * Math.cos(LAUNCH_ANGLE), vy: -v * Math.sin(LAUNCH_ANGLE), phase: 'flight', outcome: null };
}

/** Advances the ball by `dt` seconds. The moment it crosses the rim's plane decides the shot. */
export function stepBall(b: Ball, hoop: HoopSpec, dt: number): void {
  if (b.phase === 'done') return;
  if (b.phase === 'net') {
    b.y += NET_DROP_SPEED * dt;
    if (b.y >= hoop.rim.y + NET_DEPTH) {
      b.phase = 'bounce';
      b.vx = 0;
      b.vy = 40;
    }
    return;
  }
  const px = b.x;
  const py = b.y;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.vy += GRAVITY * dt;

  if (b.phase === 'flight') {
    if (px < hoop.rim.x && b.x >= hoop.rim.x) {
      const t = (hoop.rim.x - px) / (b.x - px);
      const yAtRim = py + (b.y - py) * t;
      if (b.vy > 0 && Math.abs(yAtRim - hoop.rim.y) <= hoop.tolerance) {
        b.outcome = 'made';
        b.phase = 'net';
        b.x = hoop.rim.x;
        b.y = hoop.rim.y + 2;
        b.vx = 0;
        b.vy = 0;
        return;
      }
      if (yAtRim > hoop.rim.y) {
        // Clanks off the front of the rim and drops back toward Theo.
        b.outcome = 'short';
        b.phase = 'bounce';
        b.x = hoop.rim.x - BALL_RADIUS;
        b.y = yAtRim;
        b.vx = -Math.abs(b.vx) * 0.35;
        b.vy = -Math.abs(b.vy) * 0.25;
        return;
      }
      // Over the rim: still flying, and the backboard is next.
    }
    const bd = hoop.board;
    if (b.vx > 0 && b.x + BALL_RADIUS >= bd.x && b.x <= bd.x + bd.w && b.y >= bd.y && b.y <= bd.y + bd.h) {
      b.outcome = 'long';
      b.phase = 'bounce';
      b.x = bd.x - BALL_RADIUS;
      b.vx = -Math.abs(b.vx) * 0.4;
      b.vy *= 0.6;
      return;
    }
  }

  if (b.y >= FLOOR_Y) {
    b.y = FLOOR_Y;
    if (!b.outcome) b.outcome = b.x < hoop.rim.x ? 'short' : 'long';
    b.phase = 'bounce';
    b.vy = -Math.abs(b.vy) * 0.45;
    b.vx *= 0.6;
    if (Math.abs(b.vy) < 60) {
      b.phase = 'done';
      b.vx = 0;
      b.vy = 0;
    }
  }
  if (b.x > GAME_WIDTH + 30 || b.x < -30) {
    if (!b.outcome) b.outcome = b.x < 0 ? 'short' : 'long';
    b.phase = 'done';
  }
}

/** Runs a whole shot to rest. Used by tests and for checking a hoop is winnable. */
export function simulateShot(from: Pt, hoop: HoopSpec, power: number, dt = 1 / 60, maxSeconds = 8): { outcome: Outcome; path: Pt[] } {
  const b = throwBall(from, power);
  const path: Pt[] = [{ x: b.x, y: b.y }];
  for (let t = 0; t < maxSeconds && b.phase !== 'done'; t += dt) {
    stepBall(b, hoop, dt);
    path.push({ x: b.x, y: b.y });
  }
  return { outcome: b.outcome ?? 'short', path };
}

export interface BasketballGame {
  /** Index into HOOPS. */
  hoop: number;
  /** Shots taken at the current hoop. */
  tries: number;
  /** Shots taken at every hoop this game: what the record counts. */
  shots: number;
  /** Where Theo stands for each hoop this playthrough. */
  stands: Pt[];
}

export function newBasketballGame(rng: Rng): BasketballGame {
  return { hoop: 0, tries: 0, shots: 0, stands: HOOPS.map((h) => standFor(h, rng.int(-STAND_JITTER, STAND_JITTER))) };
}

export type Progress = 'again' | 'next' | 'won' | 'lost';

/**
 * Books a shot and says what happens next. One basket is enough to move on to the next hoop;
 * three misses in a row at any hoop loses the game.
 */
export function recordShot(game: BasketballGame, outcome: Outcome): Progress {
  game.tries++;
  game.shots++;
  if (outcome === 'made') {
    if (game.hoop === HOOPS.length - 1) return 'won';
    game.hoop++;
    game.tries = 0;
    return 'next';
  }
  return game.tries < TRIES_PER_HOOP ? 'again' : 'lost';
}

export function currentHoop(game: BasketballGame): HoopSpec {
  return HOOPS[game.hoop];
}

export function triesLeft(game: BasketballGame): number {
  return TRIES_PER_HOOP - game.tries;
}

const LINES: Record<Outcome, string[]> = {
  made: ['Swish!', 'He shoots, he scores!', 'Nothing but net!'],
  short: ['Too soft! A little harder.', 'Not enough oomph!', 'Almost. Wind up a bit more.'],
  long: ['Too hard! A little softer.', 'Whoa, too strong!', 'Easy there! Not so hard.'],
};

export function shotLine(outcome: Outcome, rng: Rng): string {
  return rng.pick(LINES[outcome]);
}
