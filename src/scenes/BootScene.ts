import Phaser from 'phaser';
import { buildPlaceholderTextures } from '../placeholders/textures';
import { createCharacterAnimations } from '../systems/Walker';

interface Manifest {
  images?: Record<string, { file?: string }>;
  spritesheets?: Record<string, { file?: string; frameWidth: number; frameHeight: number }>;
}

/** Loads any real art listed in the manifest, then fills every remaining texture with placeholders. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.json('manifest', 'assets/manifest.json');
  }

  create(): void {
    const manifest = (this.cache.json.get('manifest') ?? {}) as Manifest;
    for (const [key, entry] of Object.entries(manifest.images ?? {})) {
      if (entry.file) this.load.image(key, `assets/${entry.file}`);
    }
    for (const [key, entry] of Object.entries(manifest.spritesheets ?? {})) {
      if (entry.file) this.load.spritesheet(key, `assets/${entry.file}`, { frameWidth: entry.frameWidth, frameHeight: entry.frameHeight });
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      buildPlaceholderTextures(this);
      createCharacterAnimations(this);
      this.scene.start('Intro');
    });
    this.load.start();
  }
}
