export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 480;
export const SCENE_HEIGHT = 400;
export const HUD_HEIGHT = 80;

export const GAME_TITLE = "Theo's Game";

/** Idle time before hint glints first appear on the things the player still needs. */
export const HINT_GLINT_MS = 30_000;
/** Idle time before Theo says a hint out loud (glints show again); repeats on this interval. */
export const HINT_SPEAK_MS = 60_000;
export const FADE_MS = 350;
/** Render/update rate cap. Kept low on purpose for a classic 90s feel. */
export const FRAME_RATE = 30;
export const WALK_SPEED = 110; // pixels per second
export const AMBIENT_FRAME_MS = 900;

export const SAVE_KEY = 'theos-game.autosave';
export const SETTINGS_KEY = 'theos-game.settings';
export const SAVE_VERSION = 1;
export const MAX_INVENTORY_SLOTS = 8;
