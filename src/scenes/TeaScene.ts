import Phaser from 'phaser';
import { FADE_MS, GAME_WIDTH, SCENE_HEIGHT } from '../config';
import { FLAGS, setFlag } from '../state/GameState';
import { store } from '../state/Store';
import { Dialogue } from '../systems/Dialogue';
import { Ambience } from '../systems/Ambience';
import { DitherFade } from '../systems/DitherFade';
import { playMusic } from '../systems/Music';
import { Rng, randomSeed } from '../systems/Rng';
import { playSfx, unlockAudio } from '../systems/Sfx';
import { setCursor } from '../systems/Cursor';
import { makeButton } from '../ui/Button';
import { FONT } from '../ui/text';
import { showPanel } from '../ui/MinigamePanel';
import { cupsText, levelText, newTea, nextLevel, pickPot, POTS, pour, resetLevel, spillLine, type PotSize, type TeaState } from '../puzzles/tea';

/** Where things stand on the table, measured from the art: the pots along the back, the cups along the front. */
export const TABLE = {
  /** The table top runs from y 266 (its back edge) to 371 (its front edge), x 102 to 536. */
  potY: 292,
  cupY: 352,
  /** The cups spread between these, centred. */
  left: 120,
  right: 520,
  /** The pots sit either side of the middle, this far out. */
  potSpread: 75,
};
/**
 * The art's sizes. The pot art has clear rows under it, so its base is this far down the image,
 * and its round body (where the number goes) is centred this far above the base.
 */
const POT = { w: 64, h: 56, baseY: 46 / 56, bodyY: 17 / 56 };
/** The spout's tip, as fractions of the pot's drawn width and height from its base pivot. */
const SPOUT = { x: 0.44, y: -0.5 };
/** How far the pot tips to pour, clockwise so the spout dips. */
const POUR_ANGLE = 55;
/** Drawing order: pots on the table, cups in front of them, and whichever pot is in hand over everything, with its stream over that (steam is 25). */
const POT_DEPTH = 10;
const HELD_DEPTH = 40;
const CUP = { w: 56, h: 48 };
/** The cup drawn at each amount of tea: empty, part way (under its mark), full, and spilling over. */
const CUP_TEXTURES = { empty: 'teacup_empty', partial: 'teacup_partial', full: 'teacup_full', over: 'teacup_over' } as const;
/** The teapots' sizes for what they pour, and the cups' for what they hold. */
const POT_SCALE: Record<PotSize, number> = { 3: 1.8, 2: 1.3 };
const cupScale = (value: number): number => 0.85 + value * 0.1;
const TEA = 0x8e4f22;
const POUR_MS = 520;
const SPILL_MS = 1600;
/** Embossed numbers: a light copy up and left, a dark copy down and right, the digit between. */
const EMBOSS = { light: '#ffe4ee', dark: '#4a1428', main: '#8c2a52' };

interface PotView {
  size: PotSize;
  /** The pot and its number together, so they lift and tip as one. */
  node: Phaser.GameObjects.Container;
  home: { x: number; y: number };
  rect: Phaser.Geom.Rectangle;
}

interface CupView {
  index: number;
  image: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Container;
  /** The three copies of the digit, so the number can change. */
  digits: Phaser.GameObjects.Text[];
  rect: Phaser.Geom.Rectangle;
}

interface TeaData {
  again?: boolean;
}

/**
 * The playhouse tea party: two teapots that pour three and two, and cups marked with what they
 * hold. Pick a pot, then a cup; fill every cup exactly. Runs in place of the room scene and
 * hands back when the last level is done or the player leaves.
 */
export class TeaScene extends Phaser.Scene {
  private state!: TeaState;
  private rng!: Rng;
  private pots: PotView[] = [];
  private cups: CupView[] = [];
  private stream!: Phaser.GameObjects.Graphics;
  private dialogue!: Dialogue;
  private fade!: DitherFade;
  private running = false;
  private leaving = false;
  /** Set while a pour, a spill or a level change is playing out. */
  private settling = false;
  /** The held pot's gentle rocking, while it is in hand and not pouring. */
  private sway?: Phaser.Tweens.Tween;
  /** Wisps off the full cups, one effect per cup, kept while the cup stays full so the steam never restarts. */
  private steam = new Map<number, Ambience>();

  constructor() {
    super('Tea');
  }

  create(data: TeaData = {}): void {
    this.rng = new Rng(store.get().seed).fork(`tea:${randomSeed()}`);
    this.state = newTea(this.rng);
    this.pots = [];
    this.cups = [];
    this.running = false;
    this.leaving = false;
    this.settling = false;
    playMusic('minigame');
    setCursor(this, 'wait');
    this.dialogue = new Dialogue(this);

    this.add.image(0, 0, 'bg_tea_0').setOrigin(0).setDepth(0);
    this.stream = this.add.graphics().setDepth(HELD_DEPTH + 1);
    this.buildPots();
    this.buildCups();
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
      this.stopSway();
      this.clearSteam();
      this.pots = [];
      this.cups = [];
      setCursor(this, 'default');
    });

    void this.begin(!!data.again);
  }

  private async begin(again: boolean): Promise<void> {
    this.renderPanel();
    if (!again) {
      await this.dialogue.sayOffscreen('Tea time! Fill every cup right up to its number. The big pot pours three, the little pot pours two!', { fill: 0xffe3f0, voice: 'lucy' });
    }
    this.running = true;
    this.updateCursor(this.input.activePointer);
  }

  private renderPanel(): void {
    showPanel(this, {
      title: 'Tea party',
      text: `${levelText(this.state)}. Pick a teapot, then a cup.`,
      big: cupsText(this.state),
    });
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    for (const s of this.steam.values()) s.update(dt);
  }

  /** A number drawn three times so it looks pressed into the china. */
  private emboss(x: number, y: number, value: number, size: number): { node: Phaser.GameObjects.Container; digits: Phaser.GameObjects.Text[] } {
    const style = { ...FONT, fontSize: `${size}px` };
    const light = this.add.text(-1, -1, String(value), { ...style, color: EMBOSS.light }).setOrigin(0.5);
    const dark = this.add.text(1, 1, String(value), { ...style, color: EMBOSS.dark }).setOrigin(0.5);
    const main = this.add.text(0, 0, String(value), { ...style, color: EMBOSS.main }).setOrigin(0.5);
    return { node: this.add.container(x, y, [light, dark, main]), digits: [light, dark, main] };
  }

  /** Where the pot's spout is on screen for a given tilt, from its base pivot. */
  private spoutAt(v: PotView, x: number, y: number, angleDeg: number): { x: number; y: number } {
    const scale = POT_SCALE[v.size];
    const sx = SPOUT.x * POT.w * scale;
    const sy = SPOUT.y * POT.h * scale;
    const a = Phaser.Math.DegToRad(angleDeg);
    return { x: x + sx * Math.cos(a) - sy * Math.sin(a), y: y + sx * Math.sin(a) + sy * Math.cos(a) };
  }

  private buildPots(): void {
    POTS.forEach((size, i) => {
      const scale = POT_SCALE[size];
      const x = GAME_WIDTH / 2 + (i === 0 ? -1 : 1) * TABLE.potSpread;
      const y = TABLE.potY;
      // The container's origin is the pot's base, so it tips about that. The art has its spout on
      // the left; mirrored, the spout is on the right, which is the side the pot tips toward.
      const image = this.add.image(0, 0, 'teapot').setOrigin(0.5, POT.baseY).setScale(scale).setFlipX(true);
      const label = this.emboss(0, -POT.h * scale * POT.bodyY, size, 32).node;
      const node = this.add.container(x, y, [image, label]).setDepth(POT_DEPTH);
      const w = POT.w * scale;
      const h = POT.h * scale * POT.baseY;
      this.pots.push({ size, node, home: { x, y }, rect: new Phaser.Geom.Rectangle(x - w / 2, y - h, w, h) });
    });
  }

  /** Sets the level's cups out along the front of the table, centred, each as big as its number. */
  private buildCups(): void {
    for (const c of this.cups) {
      c.image.destroy();
      c.label.destroy();
    }
    this.cups = [];
    this.clearSteam();
    const n = this.state.cups.length;
    const pitch = Math.min(140, (TABLE.right - TABLE.left) / n);
    const left = GAME_WIDTH / 2 - (pitch * n) / 2;
    this.state.cups.forEach((cup, index) => {
      const scale = cupScale(cup.value);
      const x = Math.round(left + pitch * (index + 0.5));
      const y = TABLE.cupY;
      const image = this.add.image(x, y, CUP_TEXTURES.empty).setOrigin(0.5, 1).setScale(scale).setDepth(20);
      const h = CUP.h * scale;
      const { node: label, digits } = this.emboss(x, y - h * 0.5, cup.value, 24);
      label.setDepth(22);
      const w = CUP.w * scale;
      this.cups.push({ index, image, label, digits, rect: new Phaser.Geom.Rectangle(x - w / 2, y - h, w, h) });
    });
    this.drawCups();
  }

  /**
   * Each cup shows the picture for how full it is (empty, part way, full, or spilling over) and
   * the amount still to pour; a full cup loses its number and steams.
   */
  private drawCups(): void {
    for (const c of this.cups) {
      const cup = this.state.cups[c.index];
      const key = cup.filled > cup.value ? CUP_TEXTURES.over : cup.filled === 0 ? CUP_TEXTURES.empty : cup.filled < cup.value ? CUP_TEXTURES.partial : CUP_TEXTURES.full;
      if (this.textures.exists(key)) c.image.setTexture(key);
      const left = Math.max(0, cup.value - cup.filled);
      for (const d of c.digits) d.setText(String(left));
      c.label.setVisible(left > 0);
      // Steam starts when a cup is exactly full and keeps going until it is emptied again; a
      // spilled cup shows its mess instead.
      const full = cup.filled === cup.value;
      if (full && !this.steam.has(c.index)) {
        this.steam.set(c.index, new Ambience(this, [{ kind: 'steam', at: { x: c.image.x - 2, y: c.rect.y + 6 }, bold: true, depth: 25 }]));
      } else if (!full && this.steam.has(c.index)) {
        this.steam.get(c.index)!.destroy();
        this.steam.delete(c.index);
      }
    }
  }

  private clearSteam(): void {
    for (const s of this.steam.values()) s.destroy();
    this.steam.clear();
  }

  private potAt(p: Phaser.Input.Pointer): PotView | undefined {
    return this.pots.find((v) => v.rect.contains(p.x, p.y));
  }

  private cupAt(p: Phaser.Input.Pointer): CupView | undefined {
    return this.cups.find((v) => v.rect.contains(p.x, p.y));
  }

  private updateCursor(p: Phaser.Input.Pointer): void {
    if (!this.running || this.settling) {
      setCursor(this, this.running ? 'default' : 'wait');
      return;
    }
    if (p.y > SCENE_HEIGHT) {
      setCursor(this, 'default');
      return;
    }
    // Picking a pot up is the grabbing hand. Holding one, the pointer becomes the pouring pot only
    // over a cup that can still take tea; everywhere else it is the plain pointer.
    const cup = this.cupAt(p);
    const canTake = !!cup && this.state.cups[cup.index].filled < this.state.cups[cup.index].value;
    setCursor(this, this.potAt(p) ? 'grab' : this.state.pot !== null && canTake ? 'teapot' : 'default');
  }

  private onDown(p: Phaser.Input.Pointer): void {
    unlockAudio();
    if (!this.running || this.settling || p.y > SCENE_HEIGHT) return;
    const pot = this.potAt(p);
    if (pot) {
      pickPot(this.state, pot.size);
      playSfx('click');
      this.showHeldPot();
      this.updateCursor(p);
      return;
    }
    const cup = this.cupAt(p);
    if (!cup || this.state.pot === null) return;
    void this.pourInto(cup);
  }

  /** The pot in hand lifts a little and tips, number and all, then rocks gently; the other sits back down. */
  private showHeldPot(): void {
    this.stopSway();
    for (const v of this.pots) {
      const held = v.size === this.state.pot;
      // In hand it comes to the front, over the cups and their steam; put down it goes back behind them.
      v.node.setDepth(held ? HELD_DEPTH : POT_DEPTH);
      this.tweens.add({
        targets: v.node,
        y: held ? v.home.y - 12 : v.home.y,
        angle: held ? 12 : 0,
        duration: 140,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (held && this.state.pot === v.size && !this.settling) this.startSway(v);
        },
      });
    }
  }

  private startSway(v: PotView): void {
    this.stopSway();
    this.sway = this.tweens.add({ targets: v.node, angle: { from: 16, to: 7 }, y: v.home.y - 10, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private stopSway(): void {
    this.sway?.stop();
    this.sway = undefined;
  }

  /** The held pot swings over the cup, tips, and the tea rises; then whatever the pour meant. */
  private async pourInto(cup: CupView): Promise<void> {
    const potView = this.pots.find((v) => v.size === this.state.pot);
    if (!potView) return;
    this.settling = true;
    this.stopSway();
    setCursor(this, 'wait');
    const events = pour(this.state, cup.index);
    if (!events.length) {
      this.settling = false;
      return;
    }
    // The pot tips over the cup with its spout just above the rim: work back from the spout to where the base goes.
    const rim = { x: cup.image.x, y: cup.rect.y - 8 };
    const tip = this.spoutAt(potView, 0, 0, POUR_ANGLE);
    const over = { x: rim.x - tip.x, y: rim.y - tip.y };
    await this.tween(potView.node, { x: over.x, y: over.y, angle: POUR_ANGLE }, 220);
    playSfx('pour');
    // A stream from the spout down into the cup; part way through, the cup shows its new level.
    const spout = rim;
    let swapped = false;
    await new Promise<void>((resolve) => {
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: POUR_MS,
        onUpdate: (tw) => {
          const t = tw.getValue() ?? 0;
          if (t > 0.55 && !swapped) {
            swapped = true;
            this.drawCups();
          }
          this.stream.clear();
          this.stream.lineStyle(3, TEA, 0.95);
          this.stream.lineBetween(spout.x, spout.y, spout.x, cup.rect.y + 8);
        },
        onComplete: () => resolve(),
      });
    });
    this.stream.clear();
    this.drawCups();
    await this.tween(potView.node, { x: potView.home.x, y: potView.home.y - 12, angle: 12 }, 220);
    if (this.state.pot === potView.size) this.startSway(potView);
    this.renderPanel();

    if (events.includes('overflow')) {
      await this.spill(cup, 'overflow');
    } else if (events.includes('short')) {
      await this.spill(cup, 'short');
    } else if (events.includes('won')) {
      await this.win();
      return;
    } else if (events.includes('levelDone')) {
      await this.levelDone();
    } else if (events.includes('cupFull')) {
      playSfx('ding');
    }
    if (!this.running) return;
    this.settling = false;
    this.updateCursor(this.input.activePointer);
  }

  /** Tea over the brim (or a cup that can never be finished): a word from Theo and the level over again. */
  private async spill(cup: CupView, why: 'overflow' | 'short'): Promise<void> {
    playSfx('locked');
    if (why === 'overflow') {
      // A puddle spreads on the table under the cup.
      const puddle = this.add.graphics().setDepth(19);
      puddle.fillStyle(TEA, 0.8);
      puddle.fillEllipse(cup.image.x, cup.image.y + 3, cup.rect.width * 1.6, 12);
      this.tweens.add({ targets: puddle, alpha: 0, delay: SPILL_MS - 400, duration: 400, onComplete: () => puddle.destroy() });
    }
    await this.dialogue.sayOffscreen(spillLine(why), { voice: 'theo', duration: SPILL_MS });
    if (!this.running) return;
    resetLevel(this.state);
    this.drawCups();
    this.showHeldPot();
    this.renderPanel();
  }

  private async levelDone(): Promise<void> {
    playSfx('success');
    await this.dialogue.sayOffscreen(this.state.level === 0 ? 'Every cup just right! More cups!' : 'All full! One more round!', { fill: 0xffe3f0, voice: 'lucy', duration: 1500 });
    if (!this.running) return;
    nextLevel(this.state, this.rng);
    this.buildCups();
    this.showHeldPot();
    this.renderPanel();
  }

  private async win(): Promise<void> {
    this.running = false;
    setCursor(this, 'wait');
    playSfx('success');
    store.update((s) => setFlag(s, FLAGS.teaDone));
    showPanel(this, { title: 'Tea party', big: 'Every cup full!' });
    await this.dialogue.sayOffscreen('A perfect tea party! Thank you, Theo!', { fill: 0xffe3f0, voice: 'lucy' });
    await this.leave(true);
  }

  private tween(target: Phaser.GameObjects.GameObject, props: Record<string, number>, duration: number): Promise<void> {
    return new Promise((resolve) => this.tweens.add({ targets: target, ...props, duration, ease: 'Sine.easeInOut', onComplete: () => resolve() }));
  }

  private async leave(won: boolean): Promise<void> {
    if (this.leaving) return;
    this.leaving = true;
    this.running = false;
    setCursor(this, 'wait');
    await this.fade.out(FADE_MS);
    this.scene.start('Game', { afterMinigame: true, cheer: won ? 'Best tea party ever!' : undefined });
  }
}
