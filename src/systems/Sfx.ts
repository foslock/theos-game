import { getSettings } from '../state/Settings';

export type SfxName = 'click' | 'pickup' | 'locked' | 'open' | 'boing' | 'squeak' | 'ding' | 'step' | 'menu' | 'success' | 'boot';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** The one shared context; browsers cap how many a page may open. */
export function audioContext(): AudioContext | null {
  return audio();
}

/** Call from a user gesture so browsers allow audio. */
export function unlockAudio(): void {
  const a = audio();
  if (a && a.state === 'suspended') void a.resume();
}

let unlockInstalled = false;

/**
 * Resumes the context on the first real interaction with the page.
 *
 * This has to be a DOM listener. Safari only honours `resume()` inside the task of a genuine user
 * gesture, and neither of the places that looked like one qualifies: Phaser dispatches its input
 * from a requestAnimationFrame loop, and awaiting the power-on promise continues in a microtask
 * after the click handler has returned. Both leave the context suspended for good — silent, though
 * the browser still shows the tab as having audio.
 *
 * Creating the context here also helps: opened inside a gesture, it starts out running.
 */
export function installAudioUnlock(): void {
  if (unlockInstalled || typeof document === 'undefined') return;
  unlockInstalled = true;
  const events = ['pointerdown', 'touchend', 'mousedown', 'keydown'] as const;
  const stop = (): void => {
    for (const e of events) document.removeEventListener(e, resume, true);
  };
  function resume(): void {
    const a = audio();
    if (!a) return stop();
    if (a.state === 'running') return stop();
    // `resume` settles asynchronously, so keep listening until the state actually flips.
    void a.resume().then(() => {
      if (a.state === 'running') stop();
    });
  }
  // Capture phase, so nothing further up can swallow the gesture first.
  for (const e of events) document.addEventListener(e, resume, true);
}

interface Tone {
  freq: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

const PATTERNS: Record<SfxName, Tone[]> = {
  click: [{ freq: 900, dur: 0.05, type: 'square', gain: 0.3 }],
  menu: [{ freq: 600, to: 900, dur: 0.08, type: 'square', gain: 0.3 }],
  pickup: [
    { freq: 520, dur: 0.07, type: 'square' },
    { freq: 780, dur: 0.07, type: 'square', delay: 0.07 },
    { freq: 1040, dur: 0.1, type: 'square', delay: 0.14 },
  ],
  success: [
    { freq: 523, dur: 0.1, type: 'triangle' },
    { freq: 659, dur: 0.1, type: 'triangle', delay: 0.1 },
    { freq: 784, dur: 0.1, type: 'triangle', delay: 0.2 },
    { freq: 1046, dur: 0.25, type: 'triangle', delay: 0.3 },
  ],
  locked: [
    { freq: 220, dur: 0.12, type: 'sawtooth', gain: 0.35 },
    { freq: 180, dur: 0.18, type: 'sawtooth', gain: 0.35, delay: 0.13 },
  ],
  open: [{ freq: 300, to: 500, dur: 0.15, type: 'triangle' }],
  boing: [{ freq: 500, to: 120, dur: 0.3, type: 'sine', gain: 0.5 }],
  squeak: [{ freq: 1200, to: 1700, dur: 0.12, type: 'sine', gain: 0.35 }],
  ding: [{ freq: 1568, dur: 0.35, type: 'sine', gain: 0.35 }],
  step: [{ freq: 140, dur: 0.04, type: 'triangle', gain: 0.15 }],
  // Power-on "boop": a quick upward blip into a soft, ringing major chord.
  boot: [
    { freq: 392, to: 784, dur: 0.16, type: 'sine', gain: 0.5 },
    { freq: 523, dur: 1.3, type: 'sine', gain: 0.22, delay: 0.1 },
    { freq: 659, dur: 1.3, type: 'sine', gain: 0.18, delay: 0.1 },
    { freq: 784, dur: 1.4, type: 'sine', gain: 0.16, delay: 0.1 },
    { freq: 1047, dur: 1.2, type: 'triangle', gain: 0.08, delay: 0.12 },
  ],
};

export function playSfx(name: SfxName): void {
  const a = audio();
  if (!a) return;
  const master = getSettings().sfxVolume;
  if (master <= 0) return;
  const now = a.currentTime;
  for (const t of PATTERNS[name]) {
    const osc = a.createOscillator();
    const g = a.createGain();
    const start = now + (t.delay ?? 0);
    osc.type = t.type ?? 'square';
    osc.frequency.setValueAtTime(t.freq, start);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, start + t.dur);
    const peak = (t.gain ?? 0.4) * master;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(g).connect(a.destination);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }
}
