import type { Pt, Rect, Room } from '../data/rooms';
import { GAME_WIDTH, SCENE_HEIGHT } from '../config';
import { hitRects } from './Hitbox';

/** Default top of the walkable floor band (feet may not go above this). */
export const DEFAULT_FLOOR_TOP = 280;
const FLOOR_BOTTOM = SCENE_HEIGHT - 4;
const EDGE_MARGIN = 12;
const CELL = 8;

/** The area a character's feet may occupy: the floor band minus furniture. */
export interface WalkMap {
  top: number;
  bottom: number;
  obstacles: Rect[];
}

function intersect(a: Rect, top: number, bottom: number): Rect | null {
  const y0 = Math.max(a.y, top);
  const y1 = Math.min(a.y + a.h, bottom);
  if (y1 <= y0) return null;
  return { x: a.x, y: y0, w: a.w, h: y1 - y0 };
}

/**
 * Builds the walk map for a room. Furniture (decorations and containers) that reaches
 * into the floor band blocks feet; exits, pickups and people never do. Rooms can add
 * explicit `obstacles` or move the floor line with `floorTop`.
 */
export function buildWalkMap(room: Room): WalkMap {
  const top = room.floorTop ?? DEFAULT_FLOOR_TOP;
  const bottom = FLOOR_BOTTOM;
  const obstacles: Rect[] = [];
  for (const h of room.hotspots) {
    if (h.kind !== 'decoration' && h.kind !== 'container') continue;
    if (h.walkable) continue;
    // Shaped furniture blocks only where it actually stands, so feet can pass under an overhang.
    for (const part of hitRects(h)) {
      const r = intersect(part, top, bottom);
      if (r) obstacles.push(r);
    }
  }
  for (const r of room.obstacles ?? []) {
    const c = intersect(r, top, bottom);
    if (c) obstacles.push(c);
  }
  return { top, bottom, obstacles };
}

function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export function isWalkable(map: WalkMap, x: number, y: number): boolean {
  if (x < EDGE_MARGIN || x > GAME_WIDTH - EDGE_MARGIN) return false;
  if (y < map.top || y > map.bottom) return false;
  for (const r of map.obstacles) if (inRect(r, x, y)) return false;
  return true;
}

/** True if the straight segment between two points stays on walkable ground. */
export function clearLine(map: WalkMap, a: Pt, b: Pt): boolean {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(dist / 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!isWalkable(map, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

/** Nearest walkable point to `p`, searching outward in rings; `p` itself if already fine. */
export function snapToWalkable(map: WalkMap, p: Pt): Pt {
  if (isWalkable(map, p.x, p.y)) return p;
  let best: Pt | null = null;
  let bestD = Infinity;
  for (let radius = CELL; radius <= GAME_WIDTH && !best; radius += CELL) {
    for (let dx = -radius; dx <= radius; dx += CELL) {
      for (let dy = -radius; dy <= radius; dy += CELL) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const x = p.x + dx;
        const y = p.y + dy;
        if (!isWalkable(map, x, y)) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = { x, y };
        }
      }
    }
  }
  return best ?? { x: p.x, y: map.bottom };
}

interface Node {
  cx: number;
  cy: number;
  g: number;
  f: number;
  parent: Node | null;
}

/**
 * Finds a walking route from `from` to `to` that keeps feet on open floor.
 * Returns the waypoints to visit after `from` (the final one is `to`, snapped to the floor
 * if it was on furniture). A direct line is used whenever it is clear.
 */
export function findPath(map: WalkMap, from: Pt, to: Pt): Pt[] {
  const start = snapToWalkable(map, from);
  const goal = snapToWalkable(map, to);
  if (clearLine(map, start, goal)) return [goal];

  const cols = Math.ceil(GAME_WIDTH / CELL);
  const rows = Math.ceil((map.bottom - map.top) / CELL) + 1;
  const toCell = (p: Pt) => ({ cx: Math.round(p.x / CELL), cy: Math.round((p.y - map.top) / CELL) });
  const toPt = (cx: number, cy: number): Pt => ({ x: cx * CELL, y: map.top + cy * CELL });
  const s = toCell(start);
  const g = toCell(goal);
  const key = (cx: number, cy: number) => cy * cols + cx;
  const h = (cx: number, cy: number) => Math.hypot(cx - g.cx, cy - g.cy);

  const open: Node[] = [{ cx: s.cx, cy: s.cy, g: 0, f: h(s.cx, s.cy), parent: null }];
  const closed = new Set<number>();
  const bestG = new Map<number, number>([[key(s.cx, s.cy), 0]]);
  let found: Node | null = null;

  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.cx === g.cx && cur.cy === g.cy) {
      found = cur;
      break;
    }
    closed.add(key(cur.cx, cur.cy));
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = cur.cx + dx;
        const ny = cur.cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const k = key(nx, ny);
        if (closed.has(k)) continue;
        const p = toPt(nx, ny);
        const isGoal = nx === g.cx && ny === g.cy;
        if (!isGoal && !isWalkable(map, p.x, p.y)) continue;
        // no corner cutting through furniture
        if (dx && dy && (!isWalkable(map, toPt(cur.cx + dx, cur.cy).x, toPt(cur.cx + dx, cur.cy).y) || !isWalkable(map, toPt(cur.cx, cur.cy + dy).x, toPt(cur.cx, cur.cy + dy).y))) continue;
        const ng = cur.g + Math.hypot(dx, dy);
        if (ng >= (bestG.get(k) ?? Infinity)) continue;
        bestG.set(k, ng);
        open.push({ cx: nx, cy: ny, g: ng, f: ng + h(nx, ny), parent: cur });
      }
    }
  }

  if (!found) return [goal];
  const cells: Pt[] = [];
  for (let n: Node | null = found; n; n = n.parent) cells.push(toPt(n.cx, n.cy));
  cells.reverse();
  cells[cells.length - 1] = goal;

  // String-pull: keep only the waypoints needed to keep every segment clear.
  const path: Pt[] = [];
  let anchor = start;
  let i = 1;
  while (i < cells.length) {
    let j = i;
    while (j + 1 < cells.length && clearLine(map, anchor, cells[j + 1])) j++;
    path.push(cells[j]);
    anchor = cells[j];
    i = j + 1;
  }
  if (!path.length || path[path.length - 1] !== goal) path.push(goal);
  return path;
}
