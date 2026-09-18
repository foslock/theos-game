import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, SCENE_HEIGHT } from '../config';
import { ITEMS } from '../data/items';
import { FLAGS, getFlag, type GameState } from '../state/GameState';
import { store } from '../state/Store';
import { exportToFile } from '../state/SaveManager';
import { makeButton } from '../ui/Button';
import { FONT } from '../ui/text';

const SLOT = 36;
const GAP = 4;
const COLS = 4;
const ROWS = 2;

/** Inventory bar under the scene, plus save/menu buttons. Runs in parallel with GameScene. */
export class HudScene extends Phaser.Scene {
  private slotLayer!: Phaser.GameObjects.Container;
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

    makeButton(this, GAME_WIDTH - 60, SCENE_HEIGHT + 22, 'Save file', () => exportToFile(store.get()), { width: 100, height: 26, fontSize: '12px' });
    makeButton(this, GAME_WIDTH - 60, SCENE_HEIGHT + 56, 'Menu', () => {
      this.scene.stop('Game');
      this.scene.stop('Hud');
      this.scene.start('Intro', { menu: true });
    }, { width: 100, height: 26, fontSize: '12px' });

    this.render(store.get());
    this.unsubscribe = store.subscribe((s) => this.render(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.());
  }

  private render(state: GameState): void {
    this.slotLayer.removeAll(true);
    if (!getFlag(state, FLAGS.hasBackpack)) {
      this.slotLayer.add(this.add.text(16, SCENE_HEIGHT + HUD_HEIGHT / 2, 'Find your backpack to carry things!', { ...FONT, color: '#d9b98a' }).setOrigin(0, 0.5));
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
          this.slotLayer.add(this.add.text(x + SLOT - 3, y + SLOT - 2, `x${entry.count}`, { ...FONT, fontSize: '10px', stroke: '#000', strokeThickness: 2 }).setOrigin(1, 1));
        }
        const img = this.slotLayer.list[this.slotLayer.list.length - (entry.count > 1 ? 2 : 1)] as Phaser.GameObjects.Image;
        img.setInteractive({ useHandCursor: true });
        const name = ITEMS[entry.item].name;
        const tip = this.add.text(x + SLOT / 2, y - 4, name, { ...FONT, fontSize: '10px', backgroundColor: '#000' }).setOrigin(0.5, 1).setVisible(false);
        this.slotLayer.add(tip);
        img.on('pointerover', () => tip.setVisible(true));
        img.on('pointerout', () => tip.setVisible(false));
      }
    }
    void totalW;
    void GAME_HEIGHT;
  }
}
