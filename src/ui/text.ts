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

export const SPEECH_FONT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#000000',
  wordWrap: { width: 220 },
};
