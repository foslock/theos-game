import Phaser from 'phaser';
import { FONT } from './text';
import { playSfx, unlockAudio } from '../systems/Sfx';

export interface ButtonOptions {
  width?: number;
  height?: number;
  disabled?: boolean;
  fontSize?: string;
  /** A picture on the button, drawn big above the label, for buttons that should read at a glance. */
  icon?: { key: string; scale?: number };
}

/** Chunky 90s-style text button. Origin is the centre. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const w = opts.width ?? 200;
  const h = opts.height ?? 32;
  const disabled = opts.disabled ?? false;

  const bg = scene.add.graphics();
  const draw = (hover: boolean) => {
    bg.clear();
    bg.fillStyle(0x000000, 1);
    bg.fillRect(-w / 2 + 2, -h / 2 + 2, w, h);
    bg.fillStyle(disabled ? 0x555555 : hover ? 0xf2c14e : 0xd9973b, 1);
    bg.fillRect(-w / 2, -h / 2, w, h);
    bg.lineStyle(2, 0x000000, 1);
    bg.strokeRect(-w / 2, -h / 2, w, h);
    bg.fillStyle(0xffffff, 0.35);
    bg.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 3);
  };
  draw(false);

  const parts: Phaser.GameObjects.GameObject[] = [bg];
  if (opts.icon && scene.textures.exists(opts.icon.key)) {
    // Picture up top, the label along the bottom edge.
    const scale = opts.icon.scale ?? 2;
    const icon = scene.add.image(0, -h / 2 + 6 + (24 * scale) / 2, opts.icon.key).setScale(scale);
    if (disabled) icon.setAlpha(0.5);
    parts.push(icon);
    parts.push(scene.add.text(0, h / 2 - 9, label, { ...FONT, fontSize: opts.fontSize ?? '16px', color: disabled ? '#999999' : '#1a0d00' }).setOrigin(0.5));
  } else {
    parts.push(scene.add.text(0, 0, label, { ...FONT, fontSize: opts.fontSize ?? '16px', color: disabled ? '#999999' : '#1a0d00' }).setOrigin(0.5));
  }

  const container = scene.add.container(x, y, parts);
  container.setSize(w, h);
  if (!disabled) {
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => draw(true));
    container.on('pointerout', () => draw(false));
    container.on('pointerdown', () => {
      unlockAudio();
      playSfx('menu');
      onClick();
    });
  }
  return container;
}
