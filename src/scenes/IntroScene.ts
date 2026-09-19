import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { FONT, pointerVerb } from '../ui/text';
import { makeButton } from '../ui/Button';
import { ditherIn, drawButtonFace } from '../ui/DitherReveal';
import { unlockAudio } from '../systems/Sfx';
import { playMusic } from '../systems/Music';
import { hasAutosave, loadAutosave, clearAutosave } from '../state/SaveManager';
import { store } from '../state/Store';
import { newGameState } from '../state/GameState';
import { randomSeed } from '../systems/Rng';
import { DitherFade } from '../systems/DitherFade';

const CLOUD_KEYS = ['intro_cloud_0', 'intro_cloud_1', 'intro_cloud_2'];
/** Window positions in `intro_house` texture pixels that catch the morning light. */
const WINDOW_GLINTS: [number, number][] = [
  [105, 75],
  [150, 85],
  [170, 113],
];
const BUTTON_W = 200;
const BUTTON_H = 32;
const BUTTON_GAP = 36;
/** Buttons live in the bottom third of the screen, stacked upward from here. */
const BUTTONS_BOTTOM = GAME_HEIGHT - 42;

interface IntroData {
  /** Skip the title reveal and go straight to the menu (used when coming back from the game or sub-screens). */
  menu?: boolean;
  /** Dither in from black over this many ms (the ending fades back to the menu this way). */
  fadeInMs?: number;
}

/**
 * Title screen and main menu on one backdrop: the house stays still while pixel clouds drift
 * across the sky behind it and a window glints now and then. A click dither-fades the menu
 * buttons in over the same scene; the house itself is the title.
 */
export class IntroScene extends Phaser.Scene {
  private menuObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Intro');
  }

  create(data: IntroData = {}): void {
    playMusic('menu');
    this.menuObjects = [];
    this.cameras.main.setBackgroundColor('#f7c9a0');

    const house = this.textures.exists('intro_house')
      ? this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'intro_house')
      : this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 344, 192, 0x6b8fd6);
    const scale = Math.max(GAME_WIDTH / house.width, GAME_HEIGHT / house.height);
    house.setScale(scale).setDepth(0);
    const left = house.x - (house.width * scale) / 2;
    const top = house.y - (house.height * scale) / 2;
    const toScreen = (tx: number, ty: number): [number, number] => [left + tx * scale, top + ty * scale];

    this.addClouds(scale, top);

    // The cutout (house and trees with a transparent sky) sits above the clouds so they pass behind it.
    if (this.textures.exists('intro_house_cutout')) {
      this.add.image(house.x, house.y, 'intro_house_cutout').setScale(scale).setDepth(2);
    }

    this.addWindowGlints(scale, toScreen);

    if (data.fadeInMs) {
      const fade = new DitherFade(this, GAME_WIDTH, GAME_HEIGHT);
      fade.setBlack();
      void fade.in(data.fadeInMs);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => fade.destroy());
    }

    if (data.menu) {
      this.showMenu();
      return;
    }

    const prompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, `${pointerVerb()} to start`, { ...FONT, stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0);
    const blink = this.tweens.add({ targets: prompt, alpha: 1, duration: 300, yoyo: true, hold: 500, repeat: -1, delay: 1200 });

    this.input.once('pointerdown', () => {
      unlockAudio();
      blink.stop();
      this.tweens.add({ targets: prompt, alpha: 0, duration: 150, onComplete: () => prompt.destroy() });
      this.showMenu();
    });
  }

  // ---------- Backdrop ----------

  /** Pixel clouds drifting left to right across the sky band, each on its own slow loop. */
  private addClouds(scale: number, top: number): void {
    const keys = CLOUD_KEYS.filter((k) => this.textures.exists(k));
    if (!keys.length) return;
    const lanes = [18, 42, 70, 30, 56];
    for (let i = 0; i < 5; i++) {
      const key = keys[i % keys.length];
      const cloud = this.add.image(0, top + lanes[i] * scale, key).setScale(scale).setDepth(1).setAlpha(0.95);
      const w = cloud.displayWidth;
      const duration = 55000 + i * 9000;
      const startX = (i / 5) * (GAME_WIDTH + w) - w / 2;
      cloud.x = startX;
      // Finish the current pass from wherever it starts, then loop full passes.
      const firstDuration = duration * ((GAME_WIDTH + w / 2 - startX) / (GAME_WIDTH + w));
      this.tweens.add({
        targets: cloud,
        x: GAME_WIDTH + w / 2,
        duration: firstDuration,
        onComplete: () => {
          cloud.x = -w / 2;
          this.tweens.add({ targets: cloud, x: GAME_WIDTH + w / 2, duration, repeat: -1, onRepeat: () => (cloud.x = -w / 2) });
        },
      });
    }
  }

  /** A sparkle on one of the windows every few seconds. */
  private addWindowGlints(scale: number, toScreen: (tx: number, ty: number) => [number, number]): void {
    if (!this.textures.exists('glint')) return;
    let next = 0;
    const flash = () => {
      const [tx, ty] = WINDOW_GLINTS[next % WINDOW_GLINTS.length];
      next++;
      const [x, y] = toScreen(tx, ty);
      const g = this.add.image(x, y, 'glint').setDepth(3).setScale(0).setAlpha(0.95);
      this.tweens.add({
        targets: g,
        scale: scale * 0.9,
        angle: 90,
        duration: 420,
        yoyo: true,
        ease: 'Sine.easeInOut',
        onComplete: () => g.destroy(),
      });
      this.time.delayedCall(Phaser.Math.Between(2200, 4200), flash);
    };
    this.time.delayedCall(1500, flash);
  }

  // ---------- Menu ----------

  /** Dither-fades the menu buttons in over the backdrop, top to bottom, then makes them live. */
  private showMenu(): void {
    const items: { label: string; action: () => void }[] = [];
    const resume = hasAutosave();
    if (resume) items.push({ label: 'Resume Game', action: () => this.resume() });
    items.push({ label: 'New Game', action: () => (resume ? this.confirmNewGame() : this.newGame()) });
    items.push({ label: 'Load Game', action: () => this.scene.start('Load') });
    items.push({ label: 'Settings', action: () => this.scene.start('Settings') });

    const topY = BUTTONS_BOTTOM - (items.length - 1) * BUTTON_GAP;
    items.forEach((item, i) => {
      const y = topY + i * BUTTON_GAP;
      void ditherIn(
        this,
        GAME_WIDTH / 2 + 1,
        y + 1,
        BUTTON_W + 4,
        BUTTON_H + 4,
        (ctx) => drawButtonFace(ctx, BUTTON_W, BUTTON_H, item.label),
        { levels: 8, stepMs: 55, depth: 20, delayMs: 120 * i },
      ).then((img) => {
        if (!img.scene) return;
        img.destroy();
        const b = makeButton(this, GAME_WIDTH / 2, y, item.label, item.action, { width: BUTTON_W, height: BUTTON_H }).setDepth(20);
        this.menuObjects.push(b);
      });
    });

    const version = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 12, 'Demo build', { ...FONT, color: '#fff3b0', stroke: '#000', strokeThickness: 2 })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);
    this.tweens.add({ targets: version, alpha: 1, duration: 400, delay: 120 * items.length + 400 });
    this.menuObjects.push(version);
  }

  private resume(): void {
    const s = loadAutosave();
    if (!s) return this.newGame();
    store.set(s);
    this.scene.start('Game');
  }

  private newGame(): void {
    clearAutosave();
    store.set(newGameState(randomSeed()));
    this.scene.start('Story');
  }

  private confirmNewGame(): void {
    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0).setDepth(50).setInteractive();
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 400, 150, 0x2b1d10).setStrokeStyle(3, 0xf2c14e).setDepth(51);
    const text = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'Start over? Your saved game\nwill be replaced.', { ...FONT, align: 'center' })
      .setOrigin(0.5)
      .setDepth(52);
    const yes = makeButton(this, GAME_WIDTH / 2 - 95, GAME_HEIGHT / 2 + 30, 'Yes, start over', () => this.newGame(), { width: 180 }).setDepth(52);
    const no = makeButton(
      this,
      GAME_WIDTH / 2 + 95,
      GAME_HEIGHT / 2 + 30,
      'Keep my game',
      () => [overlay, panel, text, yes, no].forEach((o) => o.destroy()),
      { width: 180 },
    ).setDepth(52);
  }
}
