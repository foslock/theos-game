import type Phaser from 'phaser';

/**
 * Two bitmap fonts, each only used at its 8px design grid or a multiple of it — at any other size
 * the glyphs land between pixels and go soft, which is the whole thing these replace.
 * Silkscreen carries the interface and Press Start 2P everything Theo and Lucy say.
 */
const UI_FAMILY = '"Silkscreen", monospace';
const TEXT_FAMILY = '"Press Start 2P", monospace';

/** Font families to wait for before any text is drawn; see `loadFonts`. */
export const FONT_FAMILIES = ['Silkscreen', 'Press Start 2P'];

/**
 * Bitmap fonts silently fall back to monospace if text is drawn before they arrive, so the game
 * waits on them. Resolves either way rather than blocking the game on a font.
 */
export async function loadFonts(): Promise<void> {
  try {
    await Promise.all(FONT_FAMILIES.map((f) => document.fonts.load(`16px "${f}"`)));
  } catch {
    // A missing font is a cosmetic problem; monospace still reads.
  }
}

/** Interface chrome: buttons, settings rows, menu prompts. 16px gives 10px capitals. */
export const FONT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: UI_FAMILY,
  fontSize: '16px',
  color: '#ffffff',
};

export const TITLE_FONT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: UI_FAMILY,
  fontSize: '24px',
  color: '#fff3b0',
  stroke: '#3a1d00',
  strokeThickness: 4,
};

/** Anything in the world's own voice: item names and descriptions, HUD prompts. */
export const TEXT_FONT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: TEXT_FAMILY,
  fontSize: '8px',
  color: '#ffffff',
};

/**
 * Press Start 2P sets its lines tight, which runs wrapped text together at 8px. Only worth
 * applying where text actually wraps — on a single line it just offsets the vertical centring.
 */
export const TEXT_LINE_SPACING = 5;

/**
 * What Theo and Lucy say. Twice the font's design size, so it reads from across the room, and
 * still crisp because it is an exact multiple; the wrap width keeps a bubble well inside the
 * 640px scene.
 */
export const SPEECH_FONT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: TEXT_FAMILY,
  fontSize: '16px',
  color: '#000000',
  lineSpacing: 8,
  wordWrap: { width: 400 },
};

/**
 * The verb for "activate this": "Tap" when the primary pointer is a finger, else "Click".
 * An unsupported query reports no match, so anything we cannot identify gets "Click".
 */
export function pointerVerb(): 'Tap' | 'Click' {
  // Outside a browser (the tests) there is no pointer to ask about.
  if (typeof window === 'undefined' || !window.matchMedia) return 'Click';
  return window.matchMedia('(pointer: coarse)').matches ? 'Tap' : 'Click';
}
