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
    } else if (h.kind === 'decoration' || h.kind === 'minigame') {
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

/** The race track's booster as a button picture: a blue box with a green lamp and a lightning bolt. */
function drawBoosterIcon(scene: Phaser.Scene): void {
  const t = canvas(scene, 'booster_icon', 24, 24);
  if (!t) return;
  const { ctx, tex } = t;
  ctx.fillStyle = '#000';
  ctx.fillRect(2, 6, 20, 16);
  ctx.fillStyle = '#3482e4';
  ctx.fillRect(3, 7, 18, 14);
  ctx.fillStyle = '#6eb4fa';
  ctx.fillRect(3, 7, 18, 3);
  ctx.fillStyle = '#1e54aa';
  ctx.fillRect(3, 18, 18, 3);
  // the lamp
  ctx.fillStyle = '#000';
  ctx.fillRect(14, 2, 6, 6);
  ctx.fillStyle = '#5dff4a';
  ctx.fillRect(15, 3, 4, 4);
  ctx.fillStyle = '#d8ffd0';
  ctx.fillRect(15, 3, 2, 1);
  // the bolt
  ctx.fillStyle = '#ffd43a';
  ctx.fillRect(9, 9, 3, 4);
  ctx.fillRect(7, 12, 5, 2);
  ctx.fillRect(9, 14, 3, 4);
  tex.refresh();
}

/** A little puff of dust for the race car's push: a pale blob with a darker rim. */
function drawPoof(scene: Phaser.Scene): void {
  const t = canvas(scene, 'poof', 12, 12);
  if (!t) return;
  const { ctx, tex } = t;
  ctx.fillStyle = '#7a7466';
  ctx.fillRect(3, 1, 6, 10);
  ctx.fillRect(1, 3, 10, 6);
  ctx.fillStyle = '#e8e2d2';
  ctx.fillRect(4, 2, 4, 8);
  ctx.fillRect(2, 4, 8, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(4, 4, 3, 2);
  tex.refresh();
}

/** Stand-ins for the memory game: a shelf wall, a closed and an open box, and eight coloured things. */
function drawMemoryPlaceholders(scene: Phaser.Scene): void {
  const bg = canvas(scene, 'bg_memory_0', GAME_WIDTH, SCENE_HEIGHT);
  if (bg) {
    const { ctx, tex } = bg;
    ctx.fillStyle = '#c9b48a';
    ctx.fillRect(0, 0, GAME_WIDTH, SCENE_HEIGHT);
    ctx.fillStyle = '#6a6a6a';
    ctx.fillRect(0, 370, GAME_WIDTH, 30);
    for (const y of [118, 196, 274, 352]) {
      ctx.fillStyle = '#000';
      ctx.fillRect(56, y, 528, 12);
      ctx.fillStyle = '#8a5a2a';
      ctx.fillRect(58, y + 1, 524, 10);
    }
    tex.refresh();
  }
  for (const [key, open] of [['box_closed', false], ['box_open', true]] as const) {
    const t = canvas(scene, key, 64, 52);
    if (!t) continue;
    const { ctx, tex } = t;
    ctx.fillStyle = '#000';
    ctx.fillRect(4, 10, 56, 42);
    ctx.fillStyle = open ? '#3a2a18' : '#c48a4a';
    ctx.fillRect(6, 12, 52, 38);
    ctx.fillStyle = '#c48a4a';
    if (open) {
      ctx.fillRect(0, 2, 12, 14);
      ctx.fillRect(52, 2, 12, 14);
    } else {
      ctx.fillStyle = '#e0c090';
      ctx.fillRect(30, 12, 4, 38);
    }
    tex.refresh();
  }
  const things: [string, string][] = [
    ['hammer', '#8a6a4a'],
    ['wrench', '#a0a0b0'],
    ['paint', '#d03030'],
    ['flashlight', '#e8c030'],
    ['ball', '#a0e030'],
    ['tape', '#3070d0'],
    ['bulb', '#fff0a0'],
    ['can', '#40a060'],
  ];
  for (const [name, color] of things) {
    const t = canvas(scene, `mem_${name}`, 24, 24);
    if (!t) continue;
    const { ctx, tex } = t;
    ctx.fillStyle = '#000';
    ctx.fillRect(2, 2, 20, 20);
    ctx.fillStyle = color;
    ctx.fillRect(4, 4, 16, 16);
    ctx.font = 'bold 12px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(name[0].toUpperCase(), 12, 13);
    tex.refresh();
  }
}

/** Stand-ins for the tea party: a table, a teapot and a teacup. */
function drawTeaPlaceholders(scene: Phaser.Scene): void {
  const bg = canvas(scene, 'bg_tea_0', GAME_WIDTH, SCENE_HEIGHT);
  if (bg) {
    const { ctx, tex } = bg;
    ctx.fillStyle = '#b98c5a';
    ctx.fillRect(0, 0, GAME_WIDTH, SCENE_HEIGHT);
    ctx.fillStyle = '#000';
    ctx.fillRect(40, 150, 560, 230);
    ctx.fillStyle = '#d9a86a';
    ctx.fillRect(42, 152, 556, 226);
    tex.refresh();
  }
  const pot = canvas(scene, 'teapot', 64, 56);
  if (pot) {
    const { ctx, tex } = pot;
    ctx.fillStyle = '#000';
    ctx.fillRect(8, 14, 48, 40);
    ctx.fillRect(26, 6, 12, 10);
    ctx.fillRect(54, 20, 10, 14);
    ctx.fillStyle = '#f4a6c4';
    ctx.fillRect(10, 16, 44, 36);
    ctx.fillRect(28, 8, 8, 8);
    ctx.fillRect(56, 22, 6, 10);
    tex.refresh();
  }
  // Four cups, each with more tea in it.
  const fills = { teacup_empty: 0, teacup_partial: 0.45, teacup_full: 0.85, teacup_over: 1.3 };
  for (const [key, fill] of Object.entries(fills)) {
    const cup = canvas(scene, key, 56, 48);
    if (!cup) continue;
    const { ctx, tex } = cup;
    ctx.fillStyle = '#000';
    ctx.fillRect(6, 38, 44, 8);
    ctx.fillRect(12, 8, 32, 32);
    ctx.fillStyle = '#f4a6c4';
    ctx.fillRect(8, 40, 40, 4);
    ctx.fillRect(14, 10, 28, 28);
    if (fill > 0) {
      ctx.fillStyle = '#8e4f22';
      const h = Math.round(24 * Math.min(1, fill));
      ctx.fillRect(16, 36 - h, 24, h);
      // over the brim: tea down the sides and on the saucer
      if (fill > 1) {
        ctx.fillRect(10, 12, 4, 26);
        ctx.fillRect(42, 12, 4, 22);
        ctx.fillRect(8, 40, 40, 3);
      }
    }
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

/** A little red heart for the slide ride's bumps-left counter. */
function drawHeart(scene: Phaser.Scene): void {
  const t = canvas(scene, 'heart', 16, 14);
  if (!t) return;
  const { ctx, tex } = t;
  const rows = ['.XX..XX.', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..', '...XX...'];
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c !== 'X') return;
      ctx.fillStyle = '#000';
      ctx.fillRect(x * 2, y * 2, 2, 2);
    });
  });
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c !== 'X') return;
      ctx.fillStyle = y < 2 && x < 3 ? '#ff8a8a' : '#d94b3a';
      ctx.fillRect(x * 2 + 0.5, y * 2 + 0.5, 1, 1);
    });
  });
  tex.refresh();
}

/** What the riders dodge on the slide: a drift of leaves and a splat of mud, big enough to read at a distance. */
function drawObstacles(scene: Phaser.Scene): void {
  const leaf = canvas(scene, 'obstacle_leaf', 52, 32);
  if (leaf) {
    const { ctx, tex } = leaf;
    const leaves: [number, number, string][] = [
      [4, 14, '#c8651e'],
      [14, 6, '#e0902a'],
      [26, 12, '#a8471a'],
      [10, 20, '#d9a13a'],
      [22, 21, '#c8651e'],
      [36, 8, '#e0902a'],
      [38, 19, '#d9a13a'],
      [30, 3, '#a8471a'],
    ];
    for (const [x, y, colour] of leaves) {
      ctx.fillStyle = '#3a1d00';
      ctx.fillRect(x - 1, y - 1, 13, 10);
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, 11, 8);
      ctx.fillStyle = shade(colour, 40);
      ctx.fillRect(x + 2, y + 1, 4, 2);
      ctx.fillStyle = shade(colour, -40);
      ctx.fillRect(x + 5, y + 2, 1, 5);
    }
    tex.refresh();
  }
  const mud = canvas(scene, 'obstacle_mud', 60, 26);
  if (mud) {
    const { ctx, tex } = mud;
    ctx.fillStyle = '#2a1608';
    ctx.fillRect(3, 7, 54, 16);
    ctx.fillRect(9, 3, 20, 4);
    ctx.fillRect(34, 20, 16, 4);
    ctx.fillRect(40, 4, 10, 3);
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(6, 8, 48, 13);
    ctx.fillRect(11, 5, 16, 3);
    ctx.fillRect(42, 6, 6, 2);
    ctx.fillRect(36, 21, 12, 2);
    ctx.fillStyle = '#8a5a34';
    ctx.fillRect(12, 10, 10, 3);
    ctx.fillRect(36, 13, 8, 3);
    ctx.fillStyle = '#4a2a14';
    ctx.fillRect(24, 15, 14, 4);
    tex.refresh();
  }
}

/** Backdrop for the slide ride: sky, a band of trees and the gravel either side of the slide. */
function drawSlideBackdrop(scene: Phaser.Scene): void {
  const t = canvas(scene, 'bg_slide', GAME_WIDTH, SCENE_HEIGHT);
  if (!t) return;
  const { ctx, tex } = t;
  ctx.fillStyle = '#9fd8f0';
  ctx.fillRect(0, 0, GAME_WIDTH, 130);
  ditherBand(ctx, 120, 10, '#9fd8f0', '#3f7a3a');
  ctx.fillStyle = '#3f7a3a';
  ctx.fillRect(0, 130, GAME_WIDTH, 140);
  // Round canopy blobs in two greens, a little lighter toward the sky.
  const blobs: [number, number, number, string][] = [
    [40, 120, 46, '#5a9a48'],
    [130, 105, 60, '#4a8a40'],
    [230, 120, 48, '#5a9a48'],
    [410, 115, 52, '#4a8a40'],
    [510, 100, 62, '#5a9a48'],
    [610, 125, 48, '#4a8a40'],
  ];
  for (const [x, y, r, colour] of blobs) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Trunks down into the gravel.
  ctx.fillStyle = '#5a3a1a';
  for (const x of [60, 150, 250, 400, 500, 600]) ctx.fillRect(x - 6, 190, 12, 90);
  ditherBand(ctx, 270, 12, '#3f7a3a', '#8a6d55');
  ctx.fillStyle = '#8a6d55';
  ctx.fillRect(0, 282, GAME_WIDTH, SCENE_HEIGHT - 282);
  ctx.fillStyle = '#7a5d47';
  for (let i = 0; i < 90; i++) ctx.fillRect((i * 97) % GAME_WIDTH, 286 + ((i * 53) % 110), 3, 2);
  tex.refresh();
}

/** One bright speck for dust motes. */
function drawMote(scene: Phaser.Scene): void {
  const t = canvas(scene, 'mote', 2, 2);
  if (!t) return;
  t.ctx.fillStyle = '#fff8d0';
  t.ctx.fillRect(0, 0, 2, 2);
  t.tex.refresh();
}

/** Soft warm light for hanging lamps: a radial falloff drawn once and blended additively. */
function drawGlow(scene: Phaser.Scene): void {
  const size = 120;
  const t = canvas(scene, 'glow', size, size);
  if (!t) return;
  const grad = t.ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 210, 120, 0.9)');
  grad.addColorStop(0.45, 'rgba(255, 170, 80, 0.35)');
  grad.addColorStop(1, 'rgba(255, 140, 60, 0)');
  t.ctx.fillStyle = grad;
  t.ctx.fillRect(0, 0, size, size);
  t.tex.refresh();
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
  drawBoosterIcon(scene);
  drawPoof(scene);
  drawMemoryPlaceholders(scene);
  drawTeaPlaceholders(scene);
  drawSlot(scene);
  drawHeart(scene);
  drawMote(scene);
  drawGlow(scene);
  drawObstacles(scene);
  drawSlideBackdrop(scene);
}
