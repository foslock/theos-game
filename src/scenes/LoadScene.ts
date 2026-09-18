import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { makeButton } from '../ui/Button';
import { FONT, TITLE_FONT } from '../ui/text';
import { hasAutosave, loadAutosave, pickSaveFile } from '../state/SaveManager';
import { store } from '../state/Store';

export class LoadScene extends Phaser.Scene {
  private status!: Phaser.GameObjects.Text;

  constructor() {
    super('Load');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1b2a4a');
    this.add.text(GAME_WIDTH / 2, 70, 'Load Game', TITLE_FONT).setOrigin(0.5);

    const local = loadAutosave();
    const localLabel = local ? `Saved game (${local.currentRoom.replace('_', ' ')}, ${new Date(local.savedAt).toLocaleDateString()})` : 'No saved game on this computer';
    this.add.text(GAME_WIDTH / 2, 140, localLabel, { ...FONT, color: '#cfe0ff' }).setOrigin(0.5);
    makeButton(this, GAME_WIDTH / 2, 175, 'Load saved game', () => {
      const s = loadAutosave();
      if (!s) return;
      store.set(s);
      this.scene.start('Game');
    }, { disabled: !hasAutosave() });

    this.add.text(GAME_WIDTH / 2, 230, 'Or bring a save file from another computer:', { ...FONT, color: '#cfe0ff' }).setOrigin(0.5);
    makeButton(this, GAME_WIDTH / 2, 265, 'Load from file...', () => this.fromFile());

    this.status = this.add.text(GAME_WIDTH / 2, 310, '', { ...FONT, color: '#ff9b9b', align: 'center', wordWrap: { width: 500 } }).setOrigin(0.5);

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 60, 'Back', () => this.scene.start('Intro', { menu: true }), { width: 120 });
  }

  private fromFile(): void {
    this.status.setText('');
    pickSaveFile()
      .then((s) => {
        if (!s) return;
        store.set(s);
        this.scene.start('Game');
      })
      .catch((err: unknown) => {
        this.status.setText(`Could not load that file. ${err instanceof Error ? err.message : ''}`);
      });
  }
}
