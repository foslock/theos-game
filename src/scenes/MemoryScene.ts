import Phaser from 'phaser';
import { FADE_MS, GAME_WIDTH, SCENE_HEIGHT } from '../config';
import { FLAGS, setFlag } from '../state/GameState';
import { store } from '../state/Store';
import { beatLine, recallLine, recordResult } from '../puzzles/records';
import { Dialogue } from '../systems/Dialogue';
import { DitherFade } from '../systems/DitherFade';
import { playMusic } from '../systems/Music';
import { Rng, randomSeed } from '../systems/Rng';
import { playSfx, unlockAudio } from '../systems/Sfx';
import { setCursor } from '../systems/Cursor';
import { makeButton } from '../ui/Button';
import { pointerVerb } from '../ui/text';
import { showPanel } from '../ui/MinigamePanel';
import { closeMismatch, ITEM_NAMES, LEVELS, levelText, newMemory, nextLevel, openBox, pairsText, type MemoryState } from '../puzzles/memory';

/**
 * The shelf wall: where each shelf's top surface is (boxes stand on it), and how far across
 * the boxes may spread. Measured from the art.
 */
export const SHELVES = {
  /**
   * Where a box's bottom corner sits on each shelf, top shelf first. The shelves' top surfaces
   * are at 79, 151, 220 and 291; the boxes stand at the front edge, so their front corner hangs
   * just over the shelf's lip and their side edges rest along its surface. Higher than this and
   * the shelf shows under the box's sides, which reads as floating.
   */
  y: [101, 173, 242, 313],
  left: 70,
  right: 570,
};
/** The box art's canvas, and how much bigger it is drawn: as big as the shelf spacing allows. */
const BOX = { w: 64, h: 52 };
const BOX_SCALE = 1.25;
/**
 * Dad's boxes are not all the same box. Each one on the shelves is dealt one of these, so a wall
 * of them has some variety without any being mirrored: a mirrored box is lit from the wrong
 * side, and the light in this room comes from the left.
 *
 * `base` is how far down its picture the box's bottom corner sits, measured off the art, so
 * every variant stands on the shelf rather than hovering over it or sinking into it. The open
 * picture of a variant is the same box with its flaps folded out.
 */
interface BoxArt {
  closed: string;
  open: string;
  base: { closed: number; open: number };
}

const BOX_ARTS: readonly BoxArt[] = [
  { closed: 'box_closed', open: 'box_open', base: { closed: 49 / 52, open: 1 } },
  { closed: 'box_closed_1', open: 'box_open_1', base: { closed: 45 / 52, open: 1 } },
  { closed: 'box_closed_2', open: 'box_open_2', base: { closed: 45 / 52, open: 1 } },
];
/** The most room a box gets across a shelf. */
const MAX_PITCH = 150;
/** How long a mismatched pair stays showing before the boxes close. */
const MISMATCH_MS = 900;
/** Pause after a level is cleared before the next one is dealt. */
const LEVEL_DONE_MS = 1400;
/** How much bigger the things in the boxes are drawn than their 24px icons. */
const ITEM_SCALE = 2.7;

interface BoxView {
  index: number;
  image: Phaser.GameObjects.Image;
  item: Phaser.GameObjects.Image;
  rect: Phaser.Geom.Rectangle;
  /** Which of Dad's boxes this one is, closed and open. */
  art: BoxArt;
}

interface MemoryData {
  again?: boolean;
}

/**
 * The garage's memory game: pairs of Dad's things hide in boxes on the shelves, and the player
 * opens two at a time to find them. Three levels, bigger each time. Runs in place of the room
 * scene and hands back to it when the last level is cleared or the player leaves.
 */
export class MemoryScene extends Phaser.Scene {
  private state!: MemoryState;
  private rng!: Rng;
  /** Boxes opened across all three levels: what the record counts. */
  private peeks = 0;
  private views: BoxView[] = [];
  private dialogue!: Dialogue;
  private fade!: DitherFade;
  private running = false;
  private leaving = false;
  /** Set while a mismatch is showing or a level is changing over. */
  private settling = false;

  constructor() {
    super('Memory');
  }

  create(data: MemoryData = {}): void {
    this.rng = new Rng(store.get().seed).fork(`memory:${randomSeed()}`);
    this.peeks = 0;
    this.state = newMemory(this.rng);
    this.views = [];
    this.running = false;
    this.leaving = false;
    this.settling = false;
    playMusic('minigame');
    setCursor(this, 'wait');
    this.dialogue = new Dialogue(this);

    this.add.image(0, 0, 'bg_memory_0').setOrigin(0).setDepth(0);
    this.buildBoxes();
    makeButton(this, GAME_WIDTH - 44, 18, 'Done', () => void this.leave(false), { width: 72, height: 24 });

    this.fade = new DitherFade(this, GAME_WIDTH, SCENE_HEIGHT);
    this.fade.setBlack();
    void this.fade.in(FADE_MS);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.updateCursor(p));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      showPanel(this, null);
      this.dialogue.clear();
      this.fade.destroy();
      this.views = [];
      setCursor(this, 'default');
    });

    void this.begin(!!data.again);
  }

  private async begin(again: boolean): Promise<void> {
    this.renderPanel();
    if (!again) {
      await this.dialogue.sayOffscreen(`${pointerVerb()} two boxes to open them. If what's inside matches, they stay open!`, { voice: 'theo' });
    } else {
      // Lucy calls out the peeks to beat before the first box is opened.
      const best = recallLine(store.get(), 'memory');
      if (best) await this.dialogue.sayOffscreen(best, { fill: 0xffe3f0, voice: 'lucy' });
    }
    this.running = true;
    this.updateCursor(this.input.activePointer);
  }

  private renderPanel(): void {
    showPanel(this, { title: 'Memory boxes', text: levelText(this.state), big: pairsText(this.state) });
  }

  /** One of Dad's boxes, at random, but only the ones whose art is actually there. */
  private pickArt(): BoxArt {
    const drawn = BOX_ARTS.filter((a) => this.textures.exists(a.closed) && this.textures.exists(a.open));
    return this.rng.pick(drawn.length ? drawn : BOX_ARTS);
  }

  /** Lays the level's boxes out on the shelves, centred: fewer rows use the middle shelves. */
  private buildBoxes(): void {
    for (const v of this.views) {
      v.image.destroy();
      v.item.destroy();
    }
    this.views = [];
    const spec = LEVELS[this.state.level];
    // Boxes spread across the shelves, but never further apart than this, so a small level stays together.
    const pitch = Math.min(MAX_PITCH, (SHELVES.right - SHELVES.left) / spec.cols);
    const left = (SHELVES.left + SHELVES.right) / 2 - (pitch * spec.cols) / 2;
    const firstShelf = Math.floor((SHELVES.y.length - spec.rows) / 2);
    this.state.boxes.forEach((box, index) => {
      const cx = Math.round(left + pitch * (box.col + 0.5));
      const bottom = SHELVES.y[firstShelf + box.row];
      const w = BOX.w * BOX_SCALE;
      const h = BOX.h * BOX_SCALE;
      const art = this.pickArt();
      const image = this.add.image(cx, bottom, art.closed).setOrigin(0.5, art.base.closed).setScale(BOX_SCALE).setDepth(10 + box.row);
      const item = this.add
        .image(cx, bottom - h / 2 - 4, `mem_${box.item}`)
        .setScale(ITEM_SCALE)
        .setDepth(10 + box.row + 0.5)
        .setVisible(false);
      const rect = new Phaser.Geom.Rectangle(cx - w / 2, bottom - h, w, h);
      this.views.push({ index, image, item, rect, art });
    });
    this.refresh();
  }

  /** Shows each box as the state says: closed, or open with its thing in view. */
  private refresh(): void {
    for (const v of this.views) {
      const box = this.state.boxes[v.index];
      const open = box.state !== 'closed';
      v.image.setTexture(open ? v.art.open : v.art.closed).setOrigin(0.5, open ? v.art.base.open : v.art.base.closed);
      v.item.setVisible(open);
    }
  }

  private boxAt(p: Phaser.Input.Pointer): BoxView | undefined {
    return this.views.find((v) => v.rect.contains(p.x, p.y));
  }

  private updateCursor(p: Phaser.Input.Pointer): void {
    if (!this.running || this.settling) {
      setCursor(this, this.running ? 'default' : 'wait');
      return;
    }
    const v = p.y <= SCENE_HEIGHT ? this.boxAt(p) : undefined;
    setCursor(this, v && this.state.boxes[v.index].state === 'closed' ? 'grab' : 'default');
  }

  private onDown(p: Phaser.Input.Pointer): void {
    unlockAudio();
    if (!this.running || this.settling || p.y > SCENE_HEIGHT) return;
    const v = this.boxAt(p);
    if (!v) return;
    const events = openBox(this.state, v.index);
    if (!events.length) return;
    this.peeks++;
    playSfx('open');
    // The lid flips up: a quick stretch on the box as it opens.
    this.tweens.add({ targets: v.image, scaleY: BOX_SCALE * 1.08, duration: 70, yoyo: true });
    this.refresh();
    this.renderPanel();
    for (const e of events) {
      if (e === 'mismatch') void this.mismatch();
      else if (e === 'match') void this.match(v.index);
      else if (e === 'levelDone') void this.levelDone();
      else if (e === 'won') void this.win();
    }
    this.updateCursor(p);
  }

  private async mismatch(): Promise<void> {
    this.settling = true;
    await this.wait(MISMATCH_MS);
    if (!this.running) return;
    playSfx('locked');
    closeMismatch(this.state);
    this.refresh();
    this.settling = false;
    this.updateCursor(this.input.activePointer);
  }

  private async match(index: number): Promise<void> {
    playSfx('ding');
    const item = this.state.boxes[index].item;
    // The pair hops in their boxes.
    for (const v of this.views) {
      if (this.state.boxes[v.index].item === item) this.tweens.add({ targets: v.item, y: v.item.y - 8, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
    }
    if (!this.state.won && this.state.boxes.some((b) => b.state !== 'matched')) {
      void this.dialogue.sayOffscreen(`Two ${ITEM_NAMES[item]}!`, { voice: 'theo', duration: 1200 });
    }
  }

  private async levelDone(): Promise<void> {
    this.settling = true;
    playSfx('success');
    await this.dialogue.sayOffscreen(this.state.level === 0 ? 'All matched! Now more boxes!' : 'Got them all! One more shelf-full!', { voice: 'theo', duration: LEVEL_DONE_MS });
    if (!this.running) return;
    nextLevel(this.state, this.rng);
    this.buildBoxes();
    this.renderPanel();
    this.settling = false;
    this.updateCursor(this.input.activePointer);
  }

  private async win(): Promise<void> {
    this.running = false;
    setCursor(this, 'wait');
    playSfx('success');
    const peeks = this.peeks;
    let result: ReturnType<typeof recordResult> = 'kept';
    store.update((s) => {
      setFlag(s, FLAGS.memoryDone);
      result = recordResult(s, 'memory', peeks);
    });
    showPanel(this, { title: 'Memory boxes', big: 'All matched!' });
    await this.dialogue.sayOffscreen("Every single pair! I remembered them all!", { voice: 'theo' });
    const brag = beatLine('memory', result, peeks);
    if (brag) await this.dialogue.sayOffscreen(brag, { fill: 0xffe3f0, voice: 'lucy' });
    await this.leave(true);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  /** Back to the garage. */
  private async leave(won: boolean): Promise<void> {
    if (this.leaving) return;
    this.leaving = true;
    this.running = false;
    setCursor(this, 'wait');
    await this.fade.out(FADE_MS);
    this.scene.start('Game', { afterMinigame: true, cheer: won ? 'You remembered everything! Yay!' : undefined });
  }
}
