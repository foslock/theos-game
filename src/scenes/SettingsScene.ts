import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { makeButton } from '../ui/Button';
import { FONT, TITLE_FONT } from '../ui/text';
import { getSettings, updateSettings } from '../state/Settings';
import { playSfx } from '../systems/Sfx';
import { applyCrtSetting } from '../frame';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1b2a4a');
    this.add.text(GAME_WIDTH / 2, 70, 'Settings', TITLE_FONT).setOrigin(0.5);

    this.volumeRow(160, 'Sound effects', 'sfxVolume', () => playSfx('ding'));
    this.volumeRow(220, 'Music', 'musicVolume');

    const crt = getSettings().crtEffect;
    makeButton(this, GAME_WIDTH / 2, 280, `CRT screen: ${crt ? 'On' : 'Off'}`, () => {
      const next = !getSettings().crtEffect;
      updateSettings({ crtEffect: next });
      applyCrtSetting(next);
      playSfx('click');
      this.scene.restart();
    });

    makeButton(this, GAME_WIDTH / 2, 330, this.scale.isFullscreen ? 'Exit fullscreen' : 'Fullscreen', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
      this.time.delayedCall(200, () => this.scene.restart());
    });

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 60, 'Back', () => this.scene.start('Intro', { menu: true }), { width: 120 });
  }

  private volumeRow(y: number, label: string, key: 'sfxVolume' | 'musicVolume', preview?: () => void): void {
    this.add.text(GAME_WIDTH / 2 - 200, y, label, { ...FONT, fontSize: '14px' }).setOrigin(0, 0.5);
    const value = this.add.text(GAME_WIDTH / 2 + 60, y, '', { ...FONT, fontSize: '14px' }).setOrigin(0.5);
    const render = () => value.setText(`${Math.round(getSettings()[key] * 10)}`);
    render();
    makeButton(this, GAME_WIDTH / 2 + 10, y, '-', () => {
      updateSettings({ [key]: Math.max(0, Math.round((getSettings()[key] - 0.1) * 10) / 10) });
      render();
      preview?.();
    }, { width: 32, height: 28 });
    makeButton(this, GAME_WIDTH / 2 + 110, y, '+', () => {
      updateSettings({ [key]: Math.min(1, Math.round((getSettings()[key] + 0.1) * 10) / 10) });
      render();
      preview?.();
    }, { width: 32, height: 28 });
  }
}
