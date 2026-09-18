import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, SCENE_HEIGHT } from '../config';
import { ITEMS, type ItemId } from '../data/items';
import { FLAGS, getFlag, type GameState } from '../state/GameState';
import { store } from '../state/Store';
import { exportToFile } from '../state/SaveManager';
import { makeButton } from '../ui/Button';
import { TEXT_FONT, TEXT_LINE_SPACING } from '../ui/text';

const SLOT = 36;
const GAP = 4;
const COLS = 4;
const ROWS = 2;

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
      this.scene.stop('Game');
      this.scene.stop('Hud');
      this.scene.start('Intro', { menu: true });
    }, { width: 116, height: 26 });

    this.render(store.get());
    this.unsubscribe = store.subscribe((s) => this.render(s));
    // GameScene flips this while the wake-up intro plays so the prompt stays hidden until Theo is up.
    this.registry.events.on('changedata-hudQuiet', () => this.render(store.get()), this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.registry.events.off('changedata-hudQuiet', undefined, this));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.());
  }

  private render(state: GameState): void {
    this.slotLayer.removeAll(true);
    if (!getFlag(state, FLAGS.hasBackpack)) {
      if (this.registry.get('hudQuiet')) return;
      this.slotLayer.add(this.add.text(16, SCENE_HEIGHT + HUD_HEIGHT / 2, 'Find your backpack to carry things!', { ...TEXT_FONT, color: '#d9b98a' }).setOrigin(0, 0.5));
      return;
    }
    const totalW = COLS * SLOT + (COLS - 1) * GAP;
    const x0 = 16 + 56;
    const y0 = SCENE_HEIGHT + (HUD_HEIGHT - (ROWS * SLOT + GAP)) / 2;
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

  /** Big sprite, name and blurb in the empty strip between the backpack grid and the buttons. */
  private renderDetail(): void {
    this.detailLayer.removeAll(true);
    if (!this.shownItem) return;
    const def = ITEMS[this.shownItem];
    const left = 16 + 56 + COLS * SLOT + (COLS - 1) * GAP + 18; // just right of the grid
    const right = GAME_WIDTH - 66 - 58 - 12; // just left of the Save/Menu buttons
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
}
