import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, SCENE_HEIGHT } from '../config';
import { ITEMS, type ItemId } from '../data/items';
import { FLAGS, getFlag, type GameState } from '../state/GameState';
import { store } from '../state/Store';
import { exportToFile } from '../state/SaveManager';
import { makeButton } from '../ui/Button';
import { FONT, TEXT_FONT, TEXT_LINE_SPACING } from '../ui/text';
import { PANEL_KEY, type MinigamePanel } from '../ui/MinigamePanel';
import { COLS, GAP, GRID_X, GRID_Y, ROWS, SLOT } from '../ui/backpackSlots';

/** The strip between the item grid and the Save/Menu buttons, shared by the item detail and the mini-game panel. */
const STRIP_LEFT = 16 + 56 + COLS * SLOT + (COLS - 1) * GAP + 18;
const STRIP_RIGHT = GAME_WIDTH - 66 - 58 - 12;

/** Inventory bar under the scene, plus save/menu buttons. Runs in parallel with GameScene. */
export class HudScene extends Phaser.Scene {
  private slotLayer!: Phaser.GameObjects.Container;
  private detailLayer!: Phaser.GameObjects.Container;
  /** Item currently shown in the detail panel, if any. */
  private shownItem: ItemId | null = null;
  private unsubscribe?: () => void;

  constructor() {
    super('Hud');
  }

  create(): void {
    const g = this.add.graphics();
    g.fillStyle(0x2a1a0c, 1);
    g.fillRect(0, SCENE_HEIGHT, GAME_WIDTH, HUD_HEIGHT);
    g.fillStyle(0x5a3a1a, 1);
    g.fillRect(0, SCENE_HEIGHT, GAME_WIDTH, 3);

    this.slotLayer = this.add.container(0, 0);
    this.detailLayer = this.add.container(0, 0);

    makeButton(this, GAME_WIDTH - 66, SCENE_HEIGHT + 22, 'Save file', () => exportToFile(store.get()), { width: 116, height: 26 });
    makeButton(this, GAME_WIDTH - 66, SCENE_HEIGHT + 56, 'Menu', () => {
      // The slide ride and the ending run in place of the room scene, so they have to be stopped too.
      for (const key of ['Game', 'Slide', 'Race', 'Memory', 'Tea', 'Foyer']) if (this.scene.isActive(key)) this.scene.stop(key);
      this.scene.stop('Hud');
      this.scene.start('Intro', { menu: true });
    }, { width: 116, height: 26 });

    this.render(store.get());
    this.unsubscribe = store.subscribe((s) => this.render(s));
    // GameScene flips this while the wake-up intro plays so the prompt stays hidden until Theo is up.
    this.registry.events.on('changedata-hudQuiet', () => this.render(store.get()), this);
    // Mini-games put their readouts in the strip beside the backpack while they run. The first
    // time the key is set the registry announces it as new data rather than a change.
    this.registry.events.on(`changedata-${PANEL_KEY}`, () => this.renderDetail(), this);
    const onSet = (_parent: unknown, key: string) => {
      if (key === PANEL_KEY) this.renderDetail();
    };
    this.registry.events.on('setdata', onSet, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-hudQuiet', undefined, this);
      this.registry.events.off(`changedata-${PANEL_KEY}`, undefined, this);
      this.registry.events.off('setdata', onSet, this);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.());
  }

  private render(state: GameState): void {
    this.slotLayer.removeAll(true);
    if (!getFlag(state, FLAGS.hasBackpack)) {
      if (this.registry.get('hudQuiet')) return;
      // Twice the font's design size so it reads from across the room, which takes two lines to
      // stay clear of the Save/Menu buttons.
      this.slotLayer.add(
        this.add
          .text(16, SCENE_HEIGHT + HUD_HEIGHT / 2, 'Find your backpack\nto carry things!', { ...TEXT_FONT, fontSize: '16px', lineSpacing: 8, color: '#d9b98a' })
          .setOrigin(0, 0.5),
      );
      return;
    }
    const totalW = COLS * SLOT + (COLS - 1) * GAP;
    const x0 = GRID_X;
    const y0 = GRID_Y;
    this.slotLayer.add(this.add.image(16, SCENE_HEIGHT + HUD_HEIGHT / 2, 'backpack').setOrigin(0, 0.5));
    for (let i = 0; i < COLS * ROWS; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = x0 + col * (SLOT + GAP);
      const y = y0 + row * (SLOT + GAP);
      this.slotLayer.add(this.add.image(x, y, 'slot').setOrigin(0));
      const entry = state.inventory[i];
      if (entry) {
        this.slotLayer.add(this.add.image(x + SLOT / 2, y + SLOT / 2, `item_${entry.item}`));
        if (entry.count > 1) {
          this.slotLayer.add(this.add.text(x + SLOT - 3, y + SLOT - 2, `x${entry.count}`, { ...TEXT_FONT, stroke: '#000', strokeThickness: 2 }).setOrigin(1, 1));
        }
        const img = this.slotLayer.list[this.slotLayer.list.length - (entry.count > 1 ? 2 : 1)] as Phaser.GameObjects.Image;
        img.setInteractive({ useHandCursor: true });
        const name = ITEMS[entry.item].name;
        const tip = this.add.text(x + SLOT / 2, y - 4, name, { ...TEXT_FONT, backgroundColor: '#000' }).setOrigin(0.5, 1).setVisible(false);
        this.slotLayer.add(tip);
        img.on('pointerover', () => tip.setVisible(true));
        img.on('pointerout', () => tip.setVisible(false));
        img.on('pointerdown', () => this.toggleDetail(entry.item));
      }
    }
    void totalW;
    void GAME_HEIGHT;
    // Keep the detail panel in step with the backpack (the item may have been used up).
    if (this.shownItem && !state.inventory.some((e) => e.item === this.shownItem)) this.shownItem = null;
    this.renderDetail();
  }

  /** Click an item to see it big with a line about it; click it again to put the panel away. */
  private toggleDetail(item: ItemId): void {
    this.shownItem = this.shownItem === item ? null : item;
    this.renderDetail();
  }

  /**
   * The strip between the backpack grid and the buttons: a mini-game's panel while one is
   * running, otherwise the clicked item's big sprite, name and blurb.
   */
  private renderDetail(): void {
    this.detailLayer.removeAll(true);
    const panel = this.registry.get(PANEL_KEY) as MinigamePanel | null | undefined;
    if (panel) {
      this.renderPanel(panel);
      return;
    }
    if (!this.shownItem) return;
    const def = ITEMS[this.shownItem];
    const left = STRIP_LEFT;
    const right = STRIP_RIGHT;
    const midY = SCENE_HEIGHT + HUD_HEIGHT / 2;
    const big = this.add.image(left + 30, midY, `item_${this.shownItem}`).setScale(2.5);
    // Sits high in the bar: the longest descriptions wrap to three spaced lines and would
    // otherwise run off the bottom.
    const name = this.add.text(left + 68, midY - 22, def.name, { ...TEXT_FONT, color: '#fff3b0' }).setOrigin(0, 0.5);
    const blurb = this.add
      .text(left + 68, midY - 10, def.description, {
        ...TEXT_FONT,
        color: '#d9b98a',
        lineSpacing: TEXT_LINE_SPACING,
        wordWrap: { width: right - (left + 68) },
      })
      .setOrigin(0, 0);
    this.detailLayer.add([big, name, blurb]);
  }

  /** A mini-game's readouts, stacked top to bottom in the strip, with any buttons down its right. */
  private renderPanel(p: MinigamePanel): void {
    const left = STRIP_LEFT;
    let width = STRIP_RIGHT - STRIP_LEFT;
    const buttons = p.buttons ?? [];
    if (buttons.some((b) => b.icon)) {
      // Big picture buttons in a row from the right edge, nearly the height of the bar.
      const size = 66;
      const gap = 6;
      const cy = SCENE_HEIGHT + HUD_HEIGHT / 2;
      buttons.forEach((b, i) => {
        const cx = STRIP_RIGHT - size / 2 - (buttons.length - 1 - i) * (size + gap);
        this.detailLayer.add(makeButton(this, cx, cy, b.label, b.onClick, { width: size, height: size, disabled: b.disabled, fontSize: '16px', icon: b.icon ? { key: b.icon, scale: 1.5 } : undefined }));
      });
      width -= buttons.length * (size + gap) + 4;
    } else if (buttons.length) {
      // Plain text buttons down the right; the readouts keep to the left of them.
      const buttonW = 104;
      const bx = STRIP_RIGHT - buttonW / 2;
      const gap = 32;
      const y0 = SCENE_HEIGHT + HUD_HEIGHT / 2 - ((buttons.length - 1) * gap) / 2;
      buttons.forEach((b, i) => {
        this.detailLayer.add(makeButton(this, bx, y0 + i * gap, b.label, b.onClick, { width: buttonW, height: 26, disabled: b.disabled }));
      });
      width -= buttonW + 10;
    }
    let y = SCENE_HEIGHT + 9;
    if (p.title) {
      this.detailLayer.add(this.add.text(left, y, p.title, { ...TEXT_FONT, color: '#fff3b0' }).setOrigin(0));
      y += 15;
    }
    if (p.text) {
      const t = this.add.text(left, y, p.text, { ...TEXT_FONT, color: '#d9b98a', lineSpacing: TEXT_LINE_SPACING, wordWrap: { width } }).setOrigin(0);
      this.detailLayer.add(t);
      y += t.height + 4;
    }
    if (p.big) {
      this.detailLayer.add(this.add.text(left, y, p.big, { ...FONT, fontSize: '16px', color: '#fff3b0' }).setOrigin(0));
      y += 20;
    }
    if (p.meter) {
      const w = Math.min(width, 200);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.55);
      g.fillRect(left, y, w + 4, 10);
      g.fillStyle(p.meter.color, 1);
      g.fillRect(left + 2, y + 2, Math.round(w * Phaser.Math.Clamp(p.meter.value, 0, 1)), 6);
      this.detailLayer.add(g);
      y += 14;
    }
    if (p.icons) {
      const scale = p.icons.scale ?? 1;
      const step = 22 * scale;
      for (let i = 0; i < p.icons.total; i++) {
        const img = this.add.image(left + 10 * scale + i * step, y + 10 * scale, p.icons.key).setScale(scale);
        if (i >= p.icons.count) img.setAlpha(0.25);
        this.detailLayer.add(img);
      }
    }
  }
}
