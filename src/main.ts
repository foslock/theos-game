import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { IntroScene } from './scenes/IntroScene';
import { StoryScene } from './scenes/StoryScene';
import { LoadScene } from './scenes/LoadScene';
import { SettingsScene } from './scenes/SettingsScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { mountFrame } from './frame';
import { playSfx, unlockAudio } from './systems/Sfx';

import { store } from './state/Store';

async function start(): Promise<void> {
  const frame = await mountFrame();
  // Browsers only allow sound after a gesture, so the Mac waits to be switched on.
  await frame.waitForPowerOn();
  unlockAudio();
  playSfx('boot');

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: frame.parent,
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
  window.addEventListener('resize', () => {
    frame.layout();
    game.scale.refresh();
  });
  await frame.powerOn();
  // Pull in close on the screen so the picture, not the case, fills the window.
  await frame.zoomToScreen(() => game.scale.refresh());

  if (import.meta.env.DEV) {
    // Debug handle for poking at the running game from the browser console.
    (window as unknown as { __theo: unknown }).__theo = { game, store };
  }
}

void start();
