/**
 * The Macintosh "frame" around the game: a pixel-art case whose screen hole is transparent,
 * with the Phaser canvas mounted behind it. Handles centring, window resizing, the vignette
 * on the glass, and the power-on animation.
 */

import { pointerVerb } from './ui/text';

export interface FrameMeta {
  width: number;
  height: number;
  hole: { x: number; y: number; w: number; h: number };
  screen: { x: number; y: number; w: number; h: number };
  /** Corner radius of the CRT glass, in frame-image pixels. */
  screenRadius?: number;
}

export interface Frame {
  /** Element to hand Phaser as its parent. */
  parent: HTMLElement;
  /** Resolves on the first click or key press, once audio may start. */
  waitForPowerOn(): Promise<void>;
  /** Plays the CRT switch-on stretch. Resolves when the picture fills the screen. */
  powerOn(): Promise<void>;
  /** Re-run the layout (call after the game exists so Phaser can refresh too). */
  layout(): void;
  /** Called after every layout the frame runs itself (window resized, phone turned), so the game can refresh its canvas. */
  onLayout(fn: () => void): void;
  /**
   * Zoom the view onto the screen so it fills the window with just a rim of bezel showing,
   * animating from the whole-Mac view. `onFrame` is called every animation frame so the game
   * can refresh its canvas size while the screen grows.
   */
  zoomToScreen(onFrame: () => void): Promise<void>;
}

const MARGIN = 12;
/** Bezel to keep visible around the screen when zoomed in, in frame-image pixels. */
const ZOOM_BEZEL = { x: 34, top: 34, bottom: 40 };
/**
 * On a phone the screen is what matters: no margin and only a sliver of bezel, so a sideways
 * phone shows the picture as large as its short side allows.
 */
const PHONE_MAX_SIDE = 600;
const PHONE_MARGIN = 0;
const PHONE_BEZEL = { x: 6, top: 6, bottom: 6 };
/**
 * A phone reports its old size for a moment after being turned, and the browser chrome settles
 * a beat later still, so the layout runs again at these delays after any resize.
 */
const SETTLE_MS = [80, 250, 600];
const ZOOM_MS = 900;
const FRAME_URL = 'assets/frame/mac.png';
const META_URL = 'assets/frame/mac.json';

/** Game canvas is 640x480; the scanline pitch follows the on-screen size of a game pixel. */
const GAME_W = 640;
const GAME_H = 480;

/** Smallest tile WebKit will still tile: below ~1px it paints the gradient once instead of repeating. */
const MIN_SCAN_PX = 2;
/** The grille cycles through three colour stops, so it needs a pixel each to read as stripes. */
const MIN_GRILLE_PX = 3;

/**
 * Tile sizes for the two CRT background layers: a scanline every 2 game rows and a grille stripe
 * every 3 game columns when the screen is big enough, otherwise every whole number of game rows
 * or columns that keeps the tile at least the minimum size. Keeping the pitch a whole number of
 * game pixels is what makes the effect look the same however the screen is sized: a plain
 * clamp put the lines at 2px whatever the scale, so they beat against the pixel rows and read
 * as a different pattern in each orientation of a phone.
 */
export function crtPitch(w: number, h: number): { scan: number; grille: number } {
  const rowPx = h / GAME_H;
  const colPx = w / GAME_W;
  const scanRows = Math.max(2, Math.ceil(MIN_SCAN_PX / rowPx));
  const grilleCols = Math.max(3, Math.ceil(MIN_GRILLE_PX / colPx));
  return { scan: scanRows * rowPx, grille: grilleCols * colPx };
}

/**
 * The part of the window the page can actually use. On phones the layout viewport can be bigger
 * than what is on screen while the browser's bars are showing, and lags a turn of the phone;
 * the visual viewport is what is really visible right now.
 */
function viewport(): { x: number; y: number; w: number; h: number } {
  const vv = window.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) return { x: vv.offsetLeft, y: vv.offsetTop, w: vv.width, h: vv.height };
  return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
}

function sizeCrt(crt: HTMLElement, w: number, h: number): void {
  const { scan, grille } = crtPitch(w, h);
  crt.style.backgroundSize = `100% ${scan.toFixed(3)}px, ${grille.toFixed(3)}px 100%`;
}

/** Shows or hides the CRT overlay. Safe to call before the frame exists. */
export function applyCrtSetting(enabled: boolean): void {
  document.getElementById('screen')?.classList.toggle('crt-off', !enabled);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, id: string, parent: HTMLElement): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.id = id;
  parent.appendChild(e);
  return e;
}

async function loadMeta(): Promise<FrameMeta | null> {
  try {
    const r = await fetch(META_URL);
    if (!r.ok) return null;
    return (await r.json()) as FrameMeta;
  } catch {
    return null;
  }
}

/**
 * Builds the frame DOM inside `#stage` and reveals it once the case art is on screen, so the
 * screen and its prompt never show against an empty page. Falls back to a plain centred canvas
 * if the art is missing.
 */
export async function mountFrame(): Promise<Frame> {
  const stage = document.getElementById('stage')!;
  const meta = await loadMeta();

  const mac = el('div', 'mac', stage);
  const screen = el('div', 'screen', mac);
  const game = el('div', 'game', screen);
  const flash = el('div', 'flash', screen);
  const vignette = el('div', 'vignette', screen);
  const crt = el('div', 'crt', screen);
  const power = el('div', 'power', screen);
  power.textContent = `${pointerVerb()} to turn on`;
  if (meta) {
    const bezel = el('img', 'bezel', mac);
    bezel.alt = '';
    bezel.draggable = false;
    await new Promise<void>((resolve) => {
      bezel.addEventListener('load', () => resolve(), { once: true });
      bezel.addEventListener('error', () => resolve(), { once: true });
      bezel.src = FRAME_URL;
    });
  } else {
    mac.classList.add('bare');
  }

  let zoomed = false;
  const listeners: (() => void)[] = [];
  const layout = (): void => {
    const view = viewport();
    const vw = view.w;
    const vh = view.h;
    if (!meta) {
      // No frame art: the screen is the whole window and Phaser centres the canvas in it.
      Object.assign(mac.style, { left: `${view.x}px`, top: `${view.y}px`, width: `${vw}px`, height: `${vh}px` });
      Object.assign(screen.style, { left: '0px', top: '0px', width: `${vw}px`, height: `${vh}px` });
      sizeCrt(crt, vw, vh);
      return;
    }
    const phone = Math.min(vw, vh) < PHONE_MAX_SIDE;
    const margin = phone ? PHONE_MARGIN : MARGIN;
    const bezel = phone ? PHONE_BEZEL : ZOOM_BEZEL;
    // What we fit to the window: the whole case, or just the screen plus a rim of bezel.
    const focus = zoomed
      ? { x: meta.hole.x - bezel.x, y: meta.hole.y - bezel.top, w: meta.hole.w + bezel.x * 2, h: meta.hole.h + bezel.top + bezel.bottom }
      : { x: 0, y: 0, w: meta.width, h: meta.height };
    const s = Math.max(0.25, Math.floor(Math.min((vw - margin * 2) / focus.w, (vh - margin * 2) / focus.h) * 100) / 100);
    const w = Math.round(meta.width * s);
    const h = Math.round(meta.height * s);
    const left = Math.round(view.x + (vw - focus.w * s) / 2 - focus.x * s);
    const top = Math.round(view.y + (vh - focus.h * s) / 2 - focus.y * s);
    Object.assign(mac.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` });
    const sc = meta.screen;
    Object.assign(screen.style, {
      left: `${Math.round(sc.x * s)}px`,
      top: `${Math.round(sc.y * s)}px`,
      width: `${Math.round(sc.w * s)}px`,
      height: `${Math.round(sc.h * s)}px`,
      borderRadius: `${Math.round((meta.screenRadius ?? 0) * s)}px`,
    });
    sizeCrt(crt, Math.round(sc.w * s), Math.round(sc.h * s));
  };
  const relayout = (): void => {
    layout();
    for (const fn of listeners) fn();
  };
  let settle: number[] = [];
  /** Lays out now and again shortly after, since a phone's reported size trails the turn. */
  const onViewportChange = (): void => {
    relayout();
    for (const t of settle) window.clearTimeout(t);
    settle = SETTLE_MS.map((ms) => window.setTimeout(relayout, ms));
  };
  layout();
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', onViewportChange);
  window.visualViewport?.addEventListener('resize', onViewportChange);
  window.visualViewport?.addEventListener('scroll', onViewportChange);

  // Screen starts dark, picture collapsed to a line until power-on.
  game.classList.add('off');
  vignette.style.opacity = '0';
  stage.classList.add('ready');

  const waitForPowerOn = (): Promise<void> =>
    new Promise((resolve) => {
      const go = () => {
        stage.removeEventListener('pointerdown', go);
        window.removeEventListener('keydown', go);
        resolve();
      };
      stage.addEventListener('pointerdown', go);
      window.addEventListener('keydown', go);
    });

  const powerOn = (): Promise<void> =>
    new Promise((resolve) => {
      power.remove();
      // A bright line snaps open vertically, then settles; the glass vignette fades in with it.
      flash.classList.add('on');
      requestAnimationFrame(() => {
        game.classList.remove('off');
        game.classList.add('warming');
        vignette.style.opacity = '1';
      });
      window.setTimeout(() => {
        game.classList.remove('warming');
        flash.classList.remove('on');
        resolve();
      }, 700);
    });

  const zoomToScreen = (onFrame: () => void): Promise<void> =>
    new Promise((resolve) => {
      if (!meta || zoomed) return resolve();
      zoomed = true;
      mac.classList.add('zooming');
      layout();
      const started = performance.now();
      const tick = () => {
        onFrame();
        if (performance.now() - started < ZOOM_MS + 50) requestAnimationFrame(tick);
        else {
          mac.classList.remove('zooming');
          onFrame();
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });

  return { parent: game, waitForPowerOn, powerOn, layout, onLayout: (fn) => listeners.push(fn), zoomToScreen };
}
