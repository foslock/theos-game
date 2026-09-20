import type Phaser from 'phaser';

/**
 * What a mini-game shows in the backpack bar, in the strip to the right of the item grid: a
 * title, a line of help or a reading, a bigger readout, a bar, or a row of icons that fade as
 * they are used up, and buttons for games driven from the bar. Set it with `showPanel`; the HUD
 * scene draws it and hides the item detail meanwhile. Clear it with null when the game ends.
 */
export interface MinigamePanel {
  title?: string;
  text?: string;
  /** A larger readout: "123 m", "Lap 2 of 3". */
  big?: string;
  meter?: { value: number; color: number };
  icons?: { key: string; count: number; total: number; scale?: number };
  /**
   * Buttons at the right of the strip. With icons they are big squares side by side, the
   * picture saying what each does; without, plain text buttons stacked top to bottom.
   */
  buttons?: { label: string; onClick: () => void; disabled?: boolean; icon?: string }[];
}

export const PANEL_KEY = 'minigamePanel';

export function showPanel(scene: Phaser.Scene, panel: MinigamePanel | null): void {
  scene.registry.set(PANEL_KEY, panel);
}
