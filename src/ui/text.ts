import type Phaser from 'phaser';

export const FONT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#ffffff',
};

export const TITLE_FONT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '28px',
  fontStyle: 'bold',
  color: '#fff3b0',
  stroke: '#3a1d00',
  strokeThickness: 4,
};

/**
 * The verb for "activate this": "Tap" when the primary pointer is a finger, else "Click".
 * An unsupported query reports no match, so anything we cannot identify gets "Click".
 */
export function pointerVerb(): 'Tap' | 'Click' {
  return window.matchMedia('(pointer: coarse)').matches ? 'Tap' : 'Click';
}

export const SPEECH_FONT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#000000',
  wordWrap: { width: 220 },
};
