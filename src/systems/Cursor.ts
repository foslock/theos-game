import type Phaser from 'phaser';
import type { Direction } from '../data/rooms';

export type CursorKind = 'default' | 'hand' | 'grab' | 'look' | 'talk' | 'wait' | `arrow_${Direction}` | `arrow_${Direction}_locked`;

const cache = new Map<CursorKind, string>();

function drawArrow(ctx: CanvasRenderingContext2D, dir: Direction, locked: boolean): void {
  ctx.save();
  ctx.translate(12, 12);
  const rot = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir];
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(9, 1);
  ctx.lineTo(3, 1);
  ctx.lineTo(3, 10);
  ctx.lineTo(-3, 10);
  ctx.lineTo(-3, 1);
  ctx.lineTo(-9, 1);
  ctx.closePath();
  ctx.fillStyle = locked ? '#8a8a8a' : '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  if (locked) {
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(8, 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHand(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  // pointing finger
  ctx.fillRect(9, 2, 6, 12);
  ctx.strokeRect(9, 2, 6, 12);
  // palm + folded fingers
  ctx.fillRect(4, 11, 16, 11);
  ctx.strokeRect(4, 11, 16, 11);
  ctx.beginPath();
  ctx.moveTo(9, 13);
  ctx.lineTo(9, 18);
  ctx.moveTo(14, 13);
  ctx.lineTo(14, 18);
  ctx.stroke();
}

function drawLook(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(10, 10, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(10, 10, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(15, 15);
  ctx.lineTo(21, 21);
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(15, 15);
  ctx.lineTo(21, 21);
  ctx.stroke();
}

function drawTalk(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(3, 3, 18, 12);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(7, 15);
  ctx.lineTo(7, 21);
  ctx.lineTo(13, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.fillRect(7, 8, 2, 2);
  ctx.fillRect(11, 8, 2, 2);
  ctx.fillRect(15, 8, 2, 2);
}

/** Grabbing hand for things that can be picked up: curled fingers over a palm, thumb to the side. */
function drawGrab(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  // palm
  ctx.beginPath();
  ctx.roundRect(5, 9, 15, 12, 3);
  ctx.fill();
  ctx.stroke();
  // four curled fingers along the top
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.roundRect(5 + i * 4, 4, 4, 7, 2);
    ctx.fill();
    ctx.stroke();
  }
  // thumb tucked across the left side
  ctx.beginPath();
  ctx.roundRect(2, 11, 6, 5, 2);
  ctx.fill();
  ctx.stroke();
  // knuckle line
  ctx.beginPath();
  ctx.moveTo(8, 14);
  ctx.lineTo(18, 14);
  ctx.stroke();
}

/** Faded analog wristwatch: shown while the characters are walking or talking and clicks are ignored. */
function drawWait(ctx: CanvasRenderingContext2D): void {
  ctx.globalAlpha = 0.55;
  // strap stubs
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(9, 1, 6, 4);
  ctx.fillRect(9, 19, 6, 4);
  // case
  ctx.beginPath();
  ctx.arc(12, 12, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  // hour ticks
  ctx.fillStyle = '#000';
  ctx.fillRect(11, 5, 2, 2);
  ctx.fillRect(11, 17, 2, 2);
  ctx.fillRect(5, 11, 2, 2);
  ctx.fillRect(17, 11, 2, 2);
  // hands (ten past ten)
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, 12);
  ctx.lineTo(12, 7);
  ctx.moveTo(12, 12);
  ctx.lineTo(16, 12);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function cursorCss(kind: CursorKind): string {
  if (kind === 'default') return 'default';
  let url = cache.get(kind);
  if (!url) {
    const c = document.createElement('canvas');
    c.width = 24;
    c.height = 24;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    if (kind === 'hand') drawHand(ctx);
    else if (kind === 'look') drawLook(ctx);
    else if (kind === 'talk') drawTalk(ctx);
    else if (kind === 'wait') drawWait(ctx);
    else if (kind === 'grab') drawGrab(ctx);
    else {
      const m = /^arrow_(up|down|left|right)(_locked)?$/.exec(kind)!;
      drawArrow(ctx, m[1] as Direction, !!m[2]);
    }
    url = c.toDataURL('image/png');
    cache.set(kind, url);
  }
  return `url(${url}) 12 12, auto`;
}

export function setCursor(scene: Phaser.Scene, kind: CursorKind): void {
  scene.input.setDefaultCursor(cursorCss(kind));
}

export function arrowCursor(dir: Direction, locked: boolean): CursorKind {
  return locked ? `arrow_${dir}_locked` : `arrow_${dir}`;
}
