import Phaser from 'phaser';
import { FRAME_RATE, GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { IntroScene } from './scenes/IntroScene';
import { StoryScene } from './scenes/StoryScene';
import { LoadScene } from './scenes/LoadScene';
import { SettingsScene } from './scenes/SettingsScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { SlideScene } from './scenes/SlideScene';
import { RaceScene } from './scenes/RaceScene';
import { MemoryScene } from './scenes/MemoryScene';
import { TeaScene } from './scenes/TeaScene';
import { FoyerScene } from './scenes/FoyerScene';
import { applyCrtSetting, mountFrame } from './frame';
import { loadFonts } from './ui/text';
import { getSettings } from './state/Settings';
import { audioContext, installAudioUnlock, playSfx, unlockAudio } from './systems/Sfx';
import { currentTune } from './systems/Music';

import { store } from './state/Store';

async function start(): Promise<void> {
  // Before anything can await: the listener must be in place for the very first tap on the page.
  installAudioUnlock();
  const [frame] = await Promise.all([mountFrame(), loadFonts()]);
  applyCrtSetting(getSettings().crtEffect);
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
    fps: { limit: FRAME_RATE },
    scale: {
      // The canvas is stretched by CSS to fill the Mac's screen exactly (its hole is a touch
      // squarer than 4:3, like a real CRT); Phaser only needs to track the bounds for input.
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
      // Fullscreen shows the whole Mac shell, not just the bare canvas, so the frame's own
      // layout keeps sizing the screen to whatever the display is.
      fullscreenTarget: 'stage',
    },
    scene: [BootScene, IntroScene, StoryScene, LoadScene, SettingsScene, GameScene, SlideScene, RaceScene, MemoryScene, TeaScene, FoyerScene, HudScene],
  });
  const relayout = () => {
    frame.layout();
    game.scale.refresh();
  };
  // The frame watches the window and the phone's orientation itself; the canvas follows each pass.
  frame.onLayout(() => game.scale.refresh());
  // Entering or leaving fullscreen resizes the viewport a moment after the event; catch both.
  for (const evt of ['fullscreenchange', 'webkitfullscreenchange']) {
    document.addEventListener(evt, () => {
      relayout();
      window.setTimeout(relayout, 120);
    });
  }
  await frame.powerOn();
  // Pull in close on the screen so the picture, not the case, fills the window.
  await frame.zoomToScreen(() => game.scale.refresh());
  // The title waits for this before it fades in, so the picture comes up on a settled screen.
  game.registry.set('screenReady', true);

  if (import.meta.env.DEV) {
    // Debug handle for poking at the running game from the browser console.
    (window as unknown as { __theo: unknown }).__theo = { game, store, audio: () => audioContext()?.state, music: currentTune };
  }
}

void start();
