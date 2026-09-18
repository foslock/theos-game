/**
 * The Macintosh "frame" around the game: a pixel-art case whose screen hole is transparent,
 * with the Phaser canvas mounted behind it. Handles centring, window resizing, the vignette
 * on the glass, and the power-on animation.
 */

export interface FrameMeta {
  width: number;
  height: number;
  hole: { x: number; y: number; w: number; h: number };
  screen: { x: number; y: number; w: number; h: number };
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
const ZOOM_MS = 900;
const FRAME_URL = 'assets/frame/mac.png';
const META_URL = 'assets/frame/mac.json';

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

/** Builds the frame DOM inside `#stage`. Falls back to a plain centred canvas if the art is missing. */
export async function mountFrame(): Promise<Frame> {
  const stage = document.getElementById('stage')!;
  const meta = await loadMeta();

  const mac = el('div', 'mac', stage);
  const screen = el('div', 'screen', mac);
  const game = el('div', 'game', screen);
  const flash = el('div', 'flash', screen);
  const vignette = el('div', 'vignette', screen);
  const power = el('div', 'power', screen);
  power.textContent = 'Click to turn on';
  if (meta) {
    const bezel = el('img', 'bezel', mac);
    bezel.src = FRAME_URL;
    bezel.alt = '';
    bezel.draggable = false;
  } else {
    mac.classList.add('bare');
  }

  let zoomed = false;
  const layout = (): void => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!meta) {
      // No frame art: the screen is the whole window and Phaser centres the canvas in it.
      Object.assign(mac.style, { left: '0px', top: '0px', width: `${vw}px`, height: `${vh}px` });
      Object.assign(screen.style, { left: '0px', top: '0px', width: `${vw}px`, height: `${vh}px` });
      return;
    }
    // What we fit to the window: the whole case, or just the screen plus a rim of bezel.
    const focus = zoomed
      ? { x: meta.hole.x - ZOOM_BEZEL.x, y: meta.hole.y - ZOOM_BEZEL.top, w: meta.hole.w + ZOOM_BEZEL.x * 2, h: meta.hole.h + ZOOM_BEZEL.top + ZOOM_BEZEL.bottom }
      : { x: 0, y: 0, w: meta.width, h: meta.height };
    const s = Math.max(0.25, Math.floor(Math.min((vw - MARGIN * 2) / focus.w, (vh - MARGIN * 2) / focus.h) * 100) / 100);
    const w = Math.round(meta.width * s);
    const h = Math.round(meta.height * s);
    const left = Math.round((vw - focus.w * s) / 2 - focus.x * s);
    const top = Math.round((vh - focus.h * s) / 2 - focus.y * s);
    Object.assign(mac.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` });
    const sc = meta.screen;
    Object.assign(screen.style, {
      left: `${Math.round(sc.x * s)}px`,
      top: `${Math.round(sc.y * s)}px`,
      width: `${Math.round(sc.w * s)}px`,
      height: `${Math.round(sc.h * s)}px`,
    });
  };
  layout();
  window.addEventListener('resize', layout);

  // Screen starts dark, picture collapsed to a line until power-on.
  game.classList.add('off');
  vignette.style.opacity = '0';

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

  return { parent: game, waitForPowerOn, powerOn, layout, zoomToScreen };
}
