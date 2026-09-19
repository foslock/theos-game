import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import type { Pt, Rect } from '../data/rooms/types';

/*
 * Small background animations layered over a room's art: motes in a sunbeam, a dripping tap, a
 * clock's second hand, clouds and birds behind the house. Each room lists the ones it wants as
 * data (`Room.ambient`), so adding one is a line in the room file. Everything draws between the
 * background (depth 0) and the characters, and an effect whose art is missing is skipped so the
 * placeholder build still runs.
 */

export type AmbientSpec =
  /** Dust motes drifting slowly through a patch of light. */
  | { kind: 'motes'; area: Rect; count?: number; drift?: Pt }
  /** A drop forms at `from`, falls to `y`, and splashes. */
  | { kind: 'drip'; from: Pt; y: number; every?: [number, number] }
  /** A second hand ticking round a painted clock face. */
  | { kind: 'clock'; centre: Pt; length: number; colour?: number }
  /** A little digital readout in 3x5 pixel digits, its colon blinking once a second: an oven clock. */
  | { kind: 'led'; at: Pt; text: string; colour?: number }
  /**
   * Something seen through glass sways: `layer` (the foliage with the mullions filled in) drifts
   * under `frame` (the window frame and mullions), so only the leaves appear to move.
   */
  | { kind: 'sway'; layer: string; at: Pt; frame: string; frameAt: Pt; amplitude?: number; period?: number }
  /** A screen showing a few frames on a loop with a little flicker, like a television. */
  | { kind: 'frames'; key: string; at: Pt; rate?: number }
  /** A cut-out that rocks around a pivot, like a hanging lamp. With `glow`, a warm light at that point (relative to the pivot) rocks with it and flickers. */
  | { kind: 'rock'; key: string; at: Pt; pivot: Pt; amplitude?: number; period?: number; glow?: Pt }
  /**
   * An empty swing drawn in code: two chains hang `length` from their tops on the bar (`chains`,
   * left then right, which may sit at different heights on a sloping bar) to a sling seat that
   * hangs in a half circle between them. Rocks gently.
   */
  | { kind: 'swing'; chains: [Pt, Pt]; length: number; amplitude?: number; period?: number }
  /** A two-frame flyer (moth, butterfly) wandering within an area. */
  | { kind: 'flutter'; key: string; area: Rect; rate?: number; speed?: number }
  /** A loose line of birds crossing the sky every so often: `scale` for distance, `gap` between them, `speed` in px/s. */
  | { kind: 'birds'; key: string; band: [number, number]; every?: [number, number]; scale?: number; gap?: [number, number]; speed?: [number, number] }
  /** Clouds drifting across the sky band. */
  | { kind: 'clouds'; keys: string[]; band: [number, number]; speed?: number }
  /** Painted-over parts of the art (house, trees, backboards) that clouds and birds pass behind. */
  | { kind: 'occluder'; key: string; at: Pt }
  /** A bird flying past a window: across `area`, drawn under the window's `frame`. */
  | { kind: 'passerby'; key: string; area: Rect; every?: [number, number] }
  /** Wisps rising from a spout or a cup. */
  | { kind: 'steam'; at: Pt }
  /** Leaves drifting down through an area now and then. */
  | { kind: 'leaves'; key: string; area: Rect; every?: [number, number] }
  /**
   * A bird on the ground that hops about and pecks. With a three-frame sheet (standing, hopping,
   * pecking) the frames are used; a single frame is tilted instead.
   */
  | { kind: 'hop'; key: string; at: Pt; range?: number };

/** Depths, all between the background and anything that stands on the floor. */
const LAYER = 1;
const MID = 1.5;
const FRONT = 2;
const FLYER = 2.5;

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

interface Effect {
  update(dt: number): void;
  destroy(): void;
}

/** Runs a room's ambient effects. Call `update` every frame and `destroy` when the room changes. */
export class Ambience {
  private effects: Effect[] = [];

  constructor(private scene: Phaser.Scene, specs: readonly AmbientSpec[]) {
    for (const spec of specs) {
      const e = this.build(spec);
      if (e) this.effects.push(e);
    }
  }

  update(dt: number): void {
    for (const e of this.effects) e.update(dt);
  }

  destroy(): void {
    for (const e of this.effects) e.destroy();
    this.effects = [];
  }

  private has(...keys: string[]): boolean {
    return keys.every((k) => this.scene.textures.exists(k));
  }

  private build(spec: AmbientSpec): Effect | null {
    const s = this.scene;
    switch (spec.kind) {
      case 'motes':
        return this.has('mote') ? new Motes(s, spec) : null;
      case 'drip':
        return new Drip(s, spec);
      case 'clock':
        return new Clock(s, spec);
      case 'led':
        return new Led(s, spec);
      case 'sway':
        return this.has(spec.layer, spec.frame) ? new Sway(s, spec) : null;
      case 'frames':
        return this.has(spec.key) ? new Frames(s, spec) : null;
      case 'rock':
        return this.has(spec.key) ? new Rock(s, spec) : null;
      case 'swing':
        return new Swing(s, spec);
      case 'flutter':
        return this.has(spec.key) ? new Flutter(s, spec) : null;
      case 'birds':
        return this.has(spec.key) ? new Birds(s, spec) : null;
      case 'clouds':
        return this.has(...spec.keys) ? new Clouds(s, spec) : null;
      case 'occluder':
        return this.has(spec.key) ? new Occluder(s, spec) : null;
      case 'passerby':
        return this.has(spec.key) ? new Passerby(s, spec) : null;
      case 'steam':
        return new Steam(s, spec);
      case 'leaves':
        return this.has(spec.key) ? new Leaves(s, spec) : null;
      case 'hop':
        return this.has(spec.key) ? new Hop(s, spec) : null;
    }
  }
}

/** Makes sure a two-or-more frame sheet has a looping animation and returns its key. */
function loopAnim(scene: Phaser.Scene, key: string, rate: number, frames?: number[]): string {
  const anim = `ambient_${key}`;
  if (!scene.anims.exists(anim)) {
    const total = scene.textures.get(key).frameTotal - 1;
    scene.anims.create({
      key: anim,
      frames: frames ? frames.map((frame) => ({ key, frame })) : scene.anims.generateFrameNumbers(key, { start: 0, end: Math.max(0, total - 1) }),
      frameRate: rate,
      repeat: -1,
    });
  }
  return anim;
}

class Motes implements Effect {
  private motes: { img: Phaser.GameObjects.Image; phase: number; speed: number }[] = [];
  private t = 0;

  constructor(scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'motes' }>) {
    const { area } = spec;
    for (let i = 0; i < (spec.count ?? 14); i++) {
      const img = scene.add.image(rand(area.x, area.x + area.w), rand(area.y, area.y + area.h), 'mote').setDepth(FRONT).setAlpha(0);
      this.motes.push({ img, phase: rand(0, Math.PI * 2), speed: rand(0.6, 1.4) });
    }
  }

  update(dt: number): void {
    this.t += dt;
    const { area } = this.spec;
    const drift = this.spec.drift ?? { x: -4, y: 5 };
    for (const m of this.motes) {
      m.img.x += (drift.x + Math.sin(this.t * m.speed + m.phase) * 3) * dt;
      m.img.y += drift.y * m.speed * dt;
      if (m.img.y > area.y + area.h) m.img.y = area.y;
      if (m.img.y < area.y) m.img.y = area.y + area.h;
      if (m.img.x < area.x) m.img.x = area.x + area.w;
      if (m.img.x > area.x + area.w) m.img.x = area.x;
      // Twinkle in and out so they read as catching the light rather than as a static speckle.
      m.img.setAlpha(0.25 + 0.45 * (0.5 + 0.5 * Math.sin(this.t * 1.7 * m.speed + m.phase)));
    }
  }

  destroy(): void {
    for (const m of this.motes) m.img.destroy();
  }
}

class Drip implements Effect {
  private g: Phaser.GameObjects.Graphics;
  private phase: 'wait' | 'form' | 'fall' | 'splash' = 'wait';
  private t = 0;
  private wait = 1.5;
  private y = 0;
  private vy = 0;

  constructor(scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'drip' }>) {
    this.g = scene.add.graphics().setDepth(FRONT);
  }

  update(dt: number): void {
    const { from } = this.spec;
    this.t += dt;
    const g = this.g;
    g.clear();
    switch (this.phase) {
      case 'wait':
        if (this.t >= this.wait) this.next('form');
        return;
      case 'form': {
        // The drop swells on the spout, then lets go.
        const r = Math.min(2.5, 0.8 + this.t * 1.6);
        g.fillStyle(0x9fd8f0, 1);
        g.fillCircle(from.x, from.y + r, r);
        g.fillStyle(0xffffff, 0.8);
        g.fillRect(from.x - 1, from.y + r - 1, 1, 1);
        if (this.t >= 1.1) {
          this.next('fall');
          this.y = from.y + 3;
          this.vy = 20;
        }
        return;
      }
      case 'fall':
        this.vy += 900 * dt;
        this.y += this.vy * dt;
        g.fillStyle(0x9fd8f0, 1);
        g.fillRect(from.x - 1, Math.round(this.y) - 3, 2, 4);
        if (this.y >= this.spec.y) this.next('splash');
        return;
      case 'splash': {
        const k = this.t / 0.3;
        if (k >= 1) {
          this.next('wait');
          const [lo, hi] = this.spec.every ?? [2, 5];
          this.wait = rand(lo, hi);
          return;
        }
        g.lineStyle(1, 0xffffff, 0.8 * (1 - k));
        g.strokeEllipse(from.x, this.spec.y, 4 + 10 * k, 2 + 4 * k);
        return;
      }
    }
  }

  private next(phase: Drip['phase']): void {
    this.phase = phase;
    this.t = 0;
  }

  destroy(): void {
    this.g.destroy();
  }
}

class Clock implements Effect {
  private g: Phaser.GameObjects.Graphics;
  private shown = -1;

  constructor(scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'clock' }>) {
    this.g = scene.add.graphics().setDepth(FRONT);
    this.update();
  }

  update(): void {
    // Real time, so the clock is right if anyone checks it against the one on the wall.
    const sec = new Date().getSeconds();
    if (sec === this.shown) return;
    this.shown = sec;
    const { centre, length } = this.spec;
    const a = (sec / 60) * Math.PI * 2 - Math.PI / 2;
    this.g.clear();
    this.g.lineStyle(1, this.spec.colour ?? 0xc0392b, 1);
    this.g.beginPath();
    this.g.moveTo(centre.x - Math.cos(a) * 3, centre.y - Math.sin(a) * 3);
    this.g.lineTo(centre.x + Math.cos(a) * length, centre.y + Math.sin(a) * length);
    this.g.strokePath();
  }

  destroy(): void {
    this.g.destroy();
  }
}

/** 3x5 pixel digits and a colon, one string of five rows per glyph. */
const LED_FONT: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '..#', '..#', '..#'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  ':': ['.', '#', '.', '#', '.'],
};

class Led implements Effect {
  private g: Phaser.GameObjects.Graphics;
  private shown = -1;

  constructor(scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'led' }>) {
    this.g = scene.add.graphics().setDepth(FRONT);
    this.draw(true);
  }

  update(): void {
    // The colon blinks with the seconds, so it keeps time with the wall clock.
    const on = new Date().getMilliseconds() < 500 ? 1 : 0;
    if (on === this.shown) return;
    this.shown = on;
    this.draw(on === 1);
  }

  private draw(colon: boolean): void {
    const g = this.g;
    g.clear();
    let x = this.spec.at.x;
    for (const ch of this.spec.text) {
      const rows = LED_FONT[ch];
      if (!rows) continue;
      const w = rows[0].length;
      if (ch !== ':' || colon) {
        g.fillStyle(this.spec.colour ?? 0x7fd4ff, 0.9);
        rows.forEach((row, ry) => {
          [...row].forEach((c, rx) => {
            if (c === '#') g.fillRect(x + rx, this.spec.at.y + ry, 1, 1);
          });
        });
      }
      x += w + 1;
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

class Sway implements Effect {
  private layer: Phaser.GameObjects.Image;
  private frame: Phaser.GameObjects.Image;
  private t = rand(0, 10);

  constructor(scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'sway' }>) {
    this.layer = scene.add.image(spec.at.x, spec.at.y, spec.layer).setOrigin(0).setDepth(LAYER);
    this.frame = scene.add.image(spec.frameAt.x, spec.frameAt.y, spec.frame).setOrigin(0).setDepth(FRONT);
  }

  update(dt: number): void {
    this.t += dt;
    const amp = this.spec.amplitude ?? 2;
    const period = this.spec.period ?? 3.6;
    const dx = Math.sin((this.t * Math.PI * 2) / period) * amp;
    const dy = Math.sin((this.t * Math.PI * 2) / (period * 1.9)) * amp * 0.4;
    this.layer.setPosition(Math.round(this.spec.at.x + dx), Math.round(this.spec.at.y + dy));
  }

  destroy(): void {
    this.layer.destroy();
    this.frame.destroy();
  }
}

class Frames implements Effect {
  private sprite: Phaser.GameObjects.Sprite;
  private t = 0;
  private next = 0;
  private frames: number;

  constructor(scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'frames' }>) {
    this.sprite = scene.add.sprite(spec.at.x, spec.at.y, spec.key, 0).setOrigin(0).setDepth(LAYER);
    this.frames = scene.textures.get(spec.key).frameTotal - 1;
    this.schedule();
  }

  private schedule(): void {
    const rate = this.spec.rate ?? 0.9;
    this.next = this.t + rand(rate * 0.7, rate * 1.3);
  }

  update(dt: number): void {
    this.t += dt;
    if (this.t >= this.next) {
      this.sprite.setFrame((Number(this.sprite.frame.name) + 1) % this.frames);
      this.schedule();
    }
    // Old sets flicker: a brief dim now and then.
    this.sprite.setAlpha(Math.random() < 0.04 ? 0.82 : 1);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}

class Rock implements Effect {
  private img: Phaser.GameObjects.Image;
  private glow?: Phaser.GameObjects.Image;
  private t = rand(0, 10);
  private dim = 0;

  constructor(scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'rock' }>) {
    const tex = scene.textures.get(spec.key).getSourceImage();
    const ox = (spec.pivot.x - spec.at.x) / tex.width;
    const oy = (spec.pivot.y - spec.at.y) / tex.height;
    if (spec.glow && scene.textures.exists('glow')) {
      this.glow = scene.add.image(spec.pivot.x + spec.glow.x, spec.pivot.y + spec.glow.y, 'glow').setDepth(LAYER).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
    }
    this.img = scene.add.image(spec.pivot.x, spec.pivot.y, spec.key).setOrigin(ox, oy).setDepth(FRONT);
  }

  update(dt: number): void {
    this.t += dt;
    const amp = this.spec.amplitude ?? 3;
    const period = this.spec.period ?? 3.2;
    const angle = Math.sin((this.t * Math.PI * 2) / period) * amp;
    this.img.setAngle(angle);
    if (this.glow && this.spec.glow) {
      // The light hangs off the same pivot, so it swings through the same arc.
      const a = Phaser.Math.DegToRad(angle);
      const { x, y } = this.spec.glow;
      this.glow.setPosition(this.spec.pivot.x + x * Math.cos(a) - y * Math.sin(a), this.spec.pivot.y + x * Math.sin(a) + y * Math.cos(a));
      // Mostly steady, with the odd short stutter.
      if (this.dim > 0) this.dim -= dt;
      else if (Math.random() < 0.008) this.dim = rand(0.05, 0.25);
      this.glow.setAlpha(this.dim > 0 ? 0.25 : 0.5 + Math.sin(this.t * 9) * 0.03);
      this.img.setAlpha(this.dim > 0 ? 0.85 : 1);
    }
  }

  destroy(): void {
    this.img.destroy();
    this.glow?.destroy();
  }
}

class Swing implements Effect {
  private g: Phaser.GameObjects.Graphics;
  private t = rand(0, 10);

  constructor(scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'swing' }>) {
    this.g = scene.add.graphics().setDepth(FRONT);
  }

  update(dt: number): void {
    this.t += dt;
    const { chains, length } = this.spec;
    const angle = Phaser.Math.DegToRad(Math.sin((this.t * Math.PI * 2) / (this.spec.period ?? 3.4)) * (this.spec.amplitude ?? 4));
    const sx = Math.sin(angle);
    const cy = Math.cos(angle);
    const ends = chains.map((top) => ({ x: top.x + sx * length, y: top.y + cy * length }));
    const g = this.g;
    g.clear();
    chains.forEach((top, i) => {
      g.lineStyle(3, 0x2a2a2a, 1);
      g.lineBetween(top.x, top.y, ends[i].x, ends[i].y);
      g.lineStyle(1, 0xb8bcc0, 1);
      g.lineBetween(top.x, top.y, ends[i].x, ends[i].y);
    });
    // The seat is a sling: a half circle slung between the chain ends, like the other swing's.
    const mx = (ends[0].x + ends[1].x) / 2;
    const my = (ends[0].y + ends[1].y) / 2;
    const r = Math.hypot(ends[1].x - ends[0].x, ends[1].y - ends[0].y) / 2;
    const tilt = Math.atan2(ends[1].y - ends[0].y, ends[1].x - ends[0].x);
    g.lineStyle(4, 0x141414, 1);
    g.beginPath();
    g.arc(mx, my, r, tilt, tilt + Math.PI, false);
    g.strokePath();
    g.lineStyle(1, 0x5a5a5a, 1);
    g.beginPath();
    g.arc(mx, my, r - 1, tilt + 0.3, tilt + Math.PI - 0.3, false);
    g.strokePath();
  }

  destroy(): void {
    this.g.destroy();
  }
}

class Flutter implements Effect {
  private sprite: Phaser.GameObjects.Sprite;
  private target: Pt;
  private v: Pt = { x: 0, y: 0 };
  private retarget = 0;

  constructor(scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'flutter' }>) {
    const { area } = spec;
    this.sprite = scene.add.sprite(rand(area.x, area.x + area.w), rand(area.y, area.y + area.h), spec.key, 0).setDepth(FLYER);
    this.sprite.play(loopAnim(scene, spec.key, spec.rate ?? 8));
    this.target = this.pick();
  }

  private pick(): Pt {
    const { area } = this.spec;
    return { x: rand(area.x, area.x + area.w), y: rand(area.y, area.y + area.h) };
  }

  update(dt: number): void {
    const speed = this.spec.speed ?? 28;
    this.retarget -= dt;
    const dx = this.target.x - this.sprite.x;
    const dy = this.target.y - this.sprite.y;
    if (this.retarget <= 0 || Math.hypot(dx, dy) < 4) {
      this.target = this.pick();
      this.retarget = rand(0.8, 2);
    }
    const d = Math.max(1, Math.hypot(dx, dy));
    // Ease toward the target so the path curves instead of darting.
    this.v.x += ((dx / d) * speed - this.v.x) * Math.min(1, dt * 2.5);
    this.v.y += ((dy / d) * speed - this.v.y) * Math.min(1, dt * 2.5);
    this.sprite.x += this.v.x * dt;
    this.sprite.y += this.v.y * dt;
    if (Math.abs(this.v.x) > 2) this.sprite.setFlipX(this.v.x < 0);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}

interface Flier {
  sprite: Phaser.GameObjects.Sprite;
  baseY: number;
  phase: number;
  speed: number;
}

class Birds implements Effect {
  private fliers: Flier[] = [];
  private wait: number;
  private t = 0;

  constructor(private scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'birds' }>) {
    const [lo, hi] = spec.every ?? [9, 18];
    this.wait = rand(2, lo);
    void hi;
  }

  private launch(): void {
    const [y0, y1] = this.spec.band;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const n = 3 + Math.floor(Math.random() * 3);
    const y = rand(y0, y1);
    const [s0, s1] = this.spec.speed ?? [38, 52];
    const [g0, g1] = this.spec.gap ?? [14, 26];
    const speed = rand(s0, s1);
    let back = 20;
    for (let i = 0; i < n; i++) {
      // A loose line: each bird trails the last a little further back and off to one side.
      if (i) back += rand(g0, g1);
      const x = dir > 0 ? -back : GAME_WIDTH + back;
      const sprite = this.scene.add.sprite(x, y + (i % 2 ? 1 : -1) * i * 3, this.spec.key, 0).setDepth(LAYER).setScale(this.spec.scale ?? 1);
      sprite.setFlipX(dir < 0);
      sprite.play({ key: loopAnim(this.scene, this.spec.key, 6), startFrame: i % 2 });
      this.fliers.push({ sprite, baseY: sprite.y, phase: rand(0, 6), speed: speed * dir });
    }
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.fliers.length) {
      this.wait -= dt;
      if (this.wait <= 0) {
        this.launch();
        const [lo, hi] = this.spec.every ?? [9, 18];
        this.wait = rand(lo, hi);
      }
      return;
    }
    for (const f of this.fliers) {
      f.sprite.x += f.speed * dt;
      f.sprite.y = f.baseY + Math.sin(this.t * 2 + f.phase) * 2;
    }
    // Only the far side counts: the back of the line starts well off the near edge.
    const gone = this.fliers.filter((f) => (f.speed > 0 ? f.sprite.x > GAME_WIDTH + 40 : f.sprite.x < -40));
    for (const f of gone) f.sprite.destroy();
    if (gone.length) this.fliers = this.fliers.filter((f) => !gone.includes(f));
  }

  destroy(): void {
    for (const f of this.fliers) f.sprite.destroy();
    this.fliers = [];
  }
}

class Clouds implements Effect {
  private clouds: { img: Phaser.GameObjects.Image; speed: number }[] = [];

  constructor(scene: Phaser.Scene, spec: Extract<AmbientSpec, { kind: 'clouds' }>) {
    const [y0, y1] = spec.band;
    spec.keys.forEach((key, i) => {
      const img = scene.add.image(rand(0, GAME_WIDTH), y0 + ((y1 - y0) * (i + 0.5)) / spec.keys.length, key).setDepth(LAYER).setAlpha(0.9);
      this.clouds.push({ img, speed: (spec.speed ?? 6) * rand(0.7, 1.3) });
    });
  }

  update(dt: number): void {
    for (const c of this.clouds) {
      c.img.x += c.speed * dt;
      if (c.img.x > GAME_WIDTH + c.img.width) c.img.x = -c.img.width;
    }
  }

  destroy(): void {
    for (const c of this.clouds) c.img.destroy();
  }
}

class Occluder implements Effect {
  private img: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, spec: Extract<AmbientSpec, { kind: 'occluder' }>) {
    this.img = scene.add.image(spec.at.x, spec.at.y, spec.key).setOrigin(0).setDepth(FRONT);
  }

  update(): void {}

  destroy(): void {
    this.img.destroy();
  }
}

class Passerby implements Effect {
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private wait: number;
  private dir = 1;
  private shape: Phaser.GameObjects.Graphics;
  private mask: Phaser.Display.Masks.GeometryMask;

  constructor(private scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'passerby' }>) {
    this.wait = rand(3, 8);
    // Only the glass shows the bird: outside the panes it is behind the wall.
    this.shape = scene.make.graphics({ x: 0, y: 0 }, false);
    this.shape.fillStyle(0xffffff, 1);
    this.shape.fillRect(spec.area.x, spec.area.y, spec.area.w, spec.area.h);
    this.mask = this.shape.createGeometryMask();
  }

  update(dt: number): void {
    const { area } = this.spec;
    if (!this.sprite) {
      this.wait -= dt;
      if (this.wait > 0) return;
      this.dir = Math.random() < 0.5 ? 1 : -1;
      const x = this.dir > 0 ? area.x - 16 : area.x + area.w + 16;
      this.sprite = this.scene.add.sprite(x, rand(area.y + 8, area.y + area.h - 8), this.spec.key, 0).setDepth(MID).setScale(0.75);
      this.sprite.setFlipX(this.dir < 0);
      this.sprite.play(loopAnim(this.scene, this.spec.key, 7));
      this.sprite.setMask(this.mask);
      return;
    }
    this.sprite.x += 55 * this.dir * dt;
    this.sprite.y -= 6 * dt;
    if (this.sprite.x < area.x - 20 || this.sprite.x > area.x + area.w + 20) {
      this.sprite.destroy();
      this.sprite = null;
      const [lo, hi] = this.spec.every ?? [8, 16];
      this.wait = rand(lo, hi);
    }
  }

  destroy(): void {
    this.sprite?.destroy();
    this.sprite = null;
    this.mask.destroy();
    this.shape.destroy();
  }
}

class Steam implements Effect {
  private g: Phaser.GameObjects.Graphics;
  private wisps: { x: number; y: number; age: number; life: number; phase: number }[] = [];
  private spawn = 0;

  constructor(scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'steam' }>) {
    this.g = scene.add.graphics().setDepth(FRONT);
  }

  update(dt: number): void {
    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.wisps.push({ x: this.spec.at.x + rand(-2, 2), y: this.spec.at.y, age: 0, life: rand(1.6, 2.4), phase: rand(0, 6) });
      this.spawn = rand(0.25, 0.45);
    }
    const g = this.g;
    g.clear();
    for (const w of this.wisps) {
      w.age += dt;
      w.y -= 14 * dt;
      w.x += Math.sin(w.age * 3 + w.phase) * 8 * dt;
      const k = w.age / w.life;
      const size = k < 0.5 ? 2 : 3;
      g.fillStyle(0xffffff, 0.55 * (1 - k));
      g.fillRect(Math.round(w.x) - 1, Math.round(w.y) - 1, size, size);
    }
    this.wisps = this.wisps.filter((w) => w.age < w.life);
  }

  destroy(): void {
    this.g.destroy();
  }
}

class Leaves implements Effect {
  private leaves: { img: Phaser.GameObjects.Image; t: number; phase: number; spin: number; fall: number }[] = [];
  private wait: number;
  private frames: number;

  constructor(private scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'leaves' }>) {
    this.frames = scene.textures.get(spec.key).frameTotal - 1;
    const [lo] = spec.every ?? [4, 9];
    this.wait = rand(1, lo);
  }

  update(dt: number): void {
    const { area } = this.spec;
    this.wait -= dt;
    if (this.wait <= 0) {
      const img = this.scene.add.image(rand(area.x, area.x + area.w), area.y, this.spec.key, Math.floor(Math.random() * Math.max(1, this.frames))).setDepth(FLYER);
      this.leaves.push({ img, t: 0, phase: rand(0, 6), spin: rand(-60, 60), fall: rand(18, 28) });
      const [lo, hi] = this.spec.every ?? [4, 9];
      this.wait = rand(lo, hi);
    }
    for (const l of this.leaves) {
      l.t += dt;
      l.img.y += l.fall * dt;
      l.img.x += Math.cos(l.t * 1.6 + l.phase) * 22 * dt;
      l.img.angle += l.spin * dt;
      const left = area.y + area.h - l.img.y;
      if (left < 20) l.img.setAlpha(Math.max(0, left / 20));
    }
    const done = this.leaves.filter((l) => l.img.y >= area.y + area.h);
    for (const l of done) l.img.destroy();
    if (done.length) this.leaves = this.leaves.filter((l) => !done.includes(l));
  }

  destroy(): void {
    for (const l of this.leaves) l.img.destroy();
    this.leaves = [];
  }
}

class Hop implements Effect {
  private sprite: Phaser.GameObjects.Sprite;
  private wait = rand(1, 3);
  private busy = false;
  private frames: number;

  constructor(private scene: Phaser.Scene, private spec: Extract<AmbientSpec, { kind: 'hop' }>) {
    this.sprite = scene.add.sprite(spec.at.x, spec.at.y, spec.key, 0).setOrigin(0.5, 1).setDepth(spec.at.y);
    this.frames = scene.textures.get(spec.key).frameTotal - 1;
  }

  /** Shows a pose: the sheet's frame when it has one, otherwise a tilt about the feet. */
  private pose(frame: number, tilt: number): void {
    if (this.frames > frame) this.sprite.setFrame(frame);
    else this.sprite.setAngle(this.sprite.flipX ? -tilt : tilt);
  }

  private stand(): void {
    if (this.frames > 1) this.sprite.setFrame(0);
    this.sprite.setAngle(0);
  }

  update(dt: number): void {
    if (this.busy) return;
    this.wait -= dt;
    if (this.wait > 0) return;
    this.busy = true;
    if (Math.random() < 0.55) void this.peck();
    else void this.hop();
  }

  private async peck(): Promise<void> {
    for (let i = 0; i < 2; i++) {
      this.pose(2, 28);
      await this.delay(280);
      this.stand();
      await this.delay(220);
    }
    this.rest();
  }

  private async hop(): Promise<void> {
    const range = this.spec.range ?? 22;
    const hops = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < hops; i++) {
      let dx = rand(-9, 9);
      if (Math.abs(this.sprite.x + dx - this.spec.at.x) > range) dx = -dx;
      this.sprite.setFlipX(dx < 0);
      this.pose(1, -10);
      await new Promise<void>((resolve) =>
        this.scene.tweens.add({ targets: this.sprite, x: this.sprite.x + dx, y: this.sprite.y - 5, duration: 130, yoyo: true, ease: 'Quad.easeOut', onComplete: () => resolve() }),
      );
      this.stand();
      await this.delay(150);
    }
    this.rest();
  }

  private rest(): void {
    this.busy = false;
    this.wait = rand(1.5, 4);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => this.scene.time.delayedCall(ms, resolve));
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
