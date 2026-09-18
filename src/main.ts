import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { IntroScene } from './scenes/IntroScene';
import { StoryScene } from './scenes/StoryScene';
import { LoadScene } from './scenes/LoadScene';
import { SettingsScene } from './scenes/SettingsScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';

import { store } from './state/Store';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, IntroScene, StoryScene, LoadScene, SettingsScene, GameScene, HudScene],
});

if (import.meta.env.DEV) {
  // Debug handle for poking at the running game from the browser console.
  (window as unknown as { __theo: unknown }).__theo = { game, store };
}
