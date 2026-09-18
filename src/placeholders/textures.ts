import Phaser from 'phaser';
import { ROOMS, ROOM_IDS, type Room } from '../data/rooms';
import { ITEMS, ITEM_IDS } from '../data/items';
import { GAME_WIDTH, SCENE_HEIGHT } from '../config';

export const CHARACTERS = {
  theo: { w: 64, h: 96, body: '#3a7bd5', pants: '#2b4a8a', skin: '#f5cfa0', hair: '#5a3a1a' },
  lucy: { w: 48, h: 72, body: '#e56aa0', pants: '#9a3d6b', skin: '#f5cfa0', hair: '#d9b24c' },
} as const;
export type CharacterKey = keyof typeof CHARACTERS;

/** Frame indexes shared by placeholder and real art sheets. */
export const CHAR_IDLE_FRAMES = [0, 1];
export const CHAR_WALK_FRAMES = [2, 3, 4, 5];

function canvas(scene: Phaser.Scene, key: string, w: number, h: number): { ctx: CanvasRenderingContext2D; tex: Phaser.Textures.CanvasTexture } | null {
  if (scene.textures.exists(key)) return null;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return null;
  const ctx = tex.context;
  ctx.imageSmoothingEnabled = false;
  return { ctx, tex };
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function ditherBand(ctx: CanvasRenderingContext2D, y: number, h: number, a: string, b: string): void {
  for (let yy = 0; yy < h; yy++) {
    for (let x = 0; x < GAME_WIDTH; x += 2) {
      ctx.fillStyle = (x / 2 + yy) % 2 === 0 ? a : b;
      ctx.fillRect(x + ((yy & 1) ? 1 : 0), y + yy, 1, 1);
    }
  }
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = '#000'): void {
  ctx.font = '10px monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawRoomBackground(scene: Phaser.Scene, room: Room, frame: number): void {
  const key = `${room.background}_${frame}`;
  const c = canvas(scene, key, GAME_WIDTH, SCENE_HEIGHT);
  if (!c) return;
  const { ctx, tex } = c;
  const { wall, floor, accent } = room.palette;
  const horizon = 280;

  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, GAME_WIDTH, horizon);
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizon, GAME_WIDTH, SCENE_HEIGHT - horizon);
  ditherBand(ctx, horizon, 10, wall, floor);
  ctx.fillStyle = shade(floor, -30);
  ctx.fillRect(0, SCENE_HEIGHT - 6, GAME_WIDTH, 6);

  // Ambient variation: three highlight squares drift between frames.
  ctx.fillStyle = shade(wall, 28);
  for (let i = 0; i < 3; i++) {
    const hx = 80 + i * 200 + frame * 6;
    ctx.fillRect(hx, 30 + i * 12, 14, 6);
  }

  for (const exit of room.exits) {
    const z = exit.zone;
    ctx.fillStyle = shade(accent, -40);
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.fillStyle = shade(accent, 20);
    ctx.fillRect(z.x + 3, z.y + 3, z.w - 6, z.h - 6);
    const arrow = { up: '^', down: 'v', left: '<', right: '>' }[exit.direction];
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'top';
    ctx.fillText(arrow, z.x + z.w / 2 - 5, z.y + z.h / 2 - 8);
    label(ctx, ROOMS[exit.to].name, z.x + 4, z.y + z.h - 14);
  }

  for (const h of room.hotspots) {
    const z = h.zone;
    if (h.kind === 'container') {
      ctx.fillStyle = shade(accent, -20);
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.fillStyle = accent;
      ctx.fillRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4);
      ctx.fillStyle = '#222';
      ctx.fillRect(z.x + z.w / 2 - 4, z.y + z.h / 2 - 1, 8, 3);
      if (z.h >= 40) label(ctx, h.label, z.x + 4, z.y + 4);
    } else if (h.kind === 'decoration') {
      ctx.strokeStyle = shade(wall, -60);
      ctx.lineWidth = 2;
      ctx.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2);
      ctx.fillStyle = shade(wall, -15);
      ctx.fillRect(z.x + 3, z.y + 3, z.w - 6, z.h - 6);
      label(ctx, h.id, z.x + 4, z.y + 4);
    } else if (h.kind === 'talk') {
      ctx.fillStyle = shade(floor, -40);
      ctx.fillRect(z.x, z.y + z.h - 30, z.w, 30);
      label(ctx, 'table', z.x + 4, z.y + z.h - 26, '#fff');
    }
  }

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  ctx.fillText(room.name, 8, 6);
  ctx.fillStyle = '#fff';
  ctx.fillText(room.name, 7, 5);

  tex.refresh();
}

function drawCharacter(scene: Phaser.Scene, key: CharacterKey): void {
  const c = CHARACTERS[key];
  const frames = 6;
  const t = canvas(scene, key, c.w * frames, c.h);
  if (!t) return;
  const { ctx, tex } = t;
  for (let f = 0; f < frames; f++) {
    const ox = f * c.w;
    const bob = f === 1 ? 1 : 0;
    const walk = f >= 2 ? f - 2 : -1;
    const legOffset = walk < 0 ? 0 : [4, 0, -4, 0][walk];
    const headW = Math.round(c.w * 0.6);
    const headH = Math.round(c.h * 0.32);
    const bodyW = Math.round(c.w * 0.55);
    const bodyH = Math.round(c.h * 0.36);
    const legH = c.h - headH - bodyH;
    const cx = ox + c.w / 2;

    // legs
    ctx.fillStyle = c.pants;
    ctx.fillRect(cx - bodyW / 2 + 2 + legOffset / 2, headH + bodyH + bob, 6, legH - bob);
    ctx.fillRect(cx + bodyW / 2 - 8 - legOffset / 2, headH + bodyH + bob, 6, legH - bob);
    // body
    ctx.fillStyle = c.body;
    ctx.fillRect(cx - bodyW / 2, headH + bob, bodyW, bodyH);
    // arms
    ctx.fillStyle = c.skin;
    ctx.fillRect(cx - bodyW / 2 - 4, headH + 4 + bob + (walk >= 0 ? legOffset / 2 : 0), 4, bodyH - 8);
    ctx.fillRect(cx + bodyW / 2, headH + 4 + bob - (walk >= 0 ? legOffset / 2 : 0), 4, bodyH - 8);
    // head
    ctx.fillStyle = c.skin;
    ctx.fillRect(cx - headW / 2, 2 + bob, headW, headH - 2);
    ctx.fillStyle = c.hair;
    ctx.fillRect(cx - headW / 2, bob, headW, 5);
    ctx.fillRect(cx - headW / 2, bob, 3, headH * 0.6);
    // eyes + smile
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - 5, 9 + bob, 2, 2);
    ctx.fillRect(cx + 3, 9 + bob, 2, 2);
    ctx.fillRect(cx - 3, headH - 6 + bob, 6, 1);
    // outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - headW / 2 + 0.5, 0.5 + bob, headW - 1, headH - 1);
    ctx.strokeRect(cx - bodyW / 2 + 0.5, headH + 0.5 + bob, bodyW - 1, bodyH - 1);

    tex.add(f, 0, ox, 0, c.w, c.h);
  }
  tex.refresh();
}

function drawItemIcons(scene: Phaser.Scene): void {
  for (const id of ITEM_IDS) {
    const def = ITEMS[id];
    const t = canvas(scene, `item_${id}`, 24, 24);
    if (!t) continue;
    const { ctx, tex } = t;
    ctx.fillStyle = '#000';
    ctx.fillRect(2, 2, 20, 20);
    ctx.fillStyle = def.color;
    ctx.fillRect(4, 4, 16, 16);
    ctx.fillStyle = shade(def.color, 50);
    ctx.fillRect(5, 5, 4, 2);
    ctx.font = 'bold 12px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(def.glyph, 12, 13);
    tex.refresh();
  }
}

function drawBackpack(scene: Phaser.Scene): void {
  const t = canvas(scene, 'backpack', 48, 44);
  if (!t) return;
  const { ctx, tex } = t;
  ctx.fillStyle = '#000';
  ctx.fillRect(6, 6, 36, 36);
  ctx.fillStyle = '#7a4a1e';
  ctx.fillRect(8, 8, 32, 32);
  ctx.fillStyle = '#a5692c';
  ctx.fillRect(12, 22, 24, 14);
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(14, 4, 6, 8);
  ctx.fillRect(28, 4, 6, 8);
  ctx.fillRect(22, 26, 4, 4);
  tex.refresh();
}

function drawGlint(scene: Phaser.Scene): void {
  const t = canvas(scene, 'glint', 12, 12);
  if (!t) return;
  const { ctx, tex } = t;
  ctx.fillStyle = '#fff';
  ctx.fillRect(5, 0, 2, 12);
  ctx.fillRect(0, 5, 12, 2);
  ctx.fillRect(3, 3, 6, 6);
  ctx.fillStyle = '#fff59a';
  ctx.fillRect(4, 4, 4, 4);
  tex.refresh();
}

function drawSlot(scene: Phaser.Scene): void {
  const t = canvas(scene, 'slot', 36, 36);
  if (!t) return;
  const { ctx, tex } = t;
  ctx.fillStyle = '#3b2a1a';
  ctx.fillRect(0, 0, 36, 36);
  ctx.fillStyle = '#6b4c2a';
  ctx.fillRect(2, 2, 32, 32);
  ctx.fillStyle = '#4e371f';
  ctx.fillRect(4, 4, 28, 28);
  tex.refresh();
}

/** Generates every texture the game needs that was not loaded from the asset manifest. */
export function buildPlaceholderTextures(scene: Phaser.Scene): void {
  for (const id of ROOM_IDS) {
    const room = ROOMS[id];
    for (let f = 0; f < room.ambientFrames; f++) drawRoomBackground(scene, room, f);
  }
  drawCharacter(scene, 'theo');
  drawCharacter(scene, 'lucy');
  drawItemIcons(scene);
  drawBackpack(scene);
  drawGlint(scene);
  drawSlot(scene);
}
