import type { Pt } from '../data/rooms';
import type { Rng } from '../systems/Rng';

/*
 * The stomp rocket, without any Phaser in it: how clicks become height, and where the rocket is
 * at any moment of its flight. The controller owns the sprites, the camera and the pointer.
 */

/** Every click during the wind-up adds this much to the launch height. */
export const METERS_PER_CLICK = 9;
/** How long the player has to click. */
export const CHARGE_SECONDS = 5;
/** Screen pixels per metre of altitude: what the camera scrolls by. */
export const PX_PER_METER = 8;
/** The camera starts following once the rocket is this far from the top of the scene. */
export const FOLLOW_FROM = 130;

export function heightFor(clicks: number): number {
  return Math.max(0, Math.round(clicks)) * METERS_PER_CLICK;
}

/** Seconds up and seconds down for a flight to `height` metres: a taller flight takes longer, within reason. */
export function flightSeconds(height: number): { up: number; down: number } {
  const up = Math.min(6, 1.6 + height / 90);
  return { up, down: up * 0.85 };
}

/**
 * Altitude in metres `t` seconds after launch: the rocket decelerates up to its peak, hangs for
 * a moment, then accelerates back down. Never below zero.
 */
export function altitudeAt(height: number, t: number): number {
  const { up, down } = flightSeconds(height);
  if (t <= 0) return 0;
  if (t <= up) {
    const k = 1 - t / up;
    return height * (1 - k * k);
  }
  const d = (t - up) / down;
  if (d >= 1) return 0;
  return height * (1 - d * d);
}

export function flightOver(height: number, t: number): boolean {
  const { up, down } = flightSeconds(height);
  return t >= up + down;
}

/** Vertical camera scroll for a rocket at world `y`: follows it up, never below the ground view. */
export function cameraScroll(rocketY: number): number {
  return Math.min(0, rocketY - FOLLOW_FROM);
}

export interface SkySpots {
  clouds: Pt[];
  birds: Pt[];
}

/** Clouds and birds scattered through the column of sky the rocket will climb. */
export function skySpots(rng: Rng, heightPx: number): SkySpots {
  const top = -heightPx - 260;
  const clouds: Pt[] = [];
  const birds: Pt[] = [];
  for (let y = -120; y > top; y -= rng.int(110, 190)) clouds.push({ x: rng.int(-40, 640), y });
  for (let y = -200; y > top; y -= rng.int(260, 520)) birds.push({ x: rng.int(0, 640), y });
  return { clouds, birds };
}

/** Lines after a flight, by how it went. */
export function resultLine(height: number): string {
  if (height === 0) return "It didn't even leave the tube! We have to click to pump it up.";
  if (height < 90) return `${height} meters! Not bad for a first try.`;
  if (height < 200) return `Wow, ${height} meters! It nearly touched the clouds!`;
  return `${height} METERS! That was almost outer space!`;
}
