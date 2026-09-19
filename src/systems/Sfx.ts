import { getSettings } from '../state/Settings';

export type SfxName = 'click' | 'pickup' | 'locked' | 'open' | 'boing' | 'squeak' | 'ding' | 'step' | 'menu' | 'success' | 'boot' | 'stomp' | 'whoosh' | 'theEnd';

let ctx: AudioContext | null = null;

/**
 * Declares this as playback audio rather than ambient.
 *
 * iOS silences a Web Audio graph whenever the hardware mute switch is on — the context still
 * reports itself as running and nothing looks wrong, there is simply no sound. Media elements are
 * exempt but oscillators are not, so a game that synthesises everything is silent on a muted
 * phone. Safari 16.4 added this to opt out; older versions ignore it.
 */
function claimPlaybackSession(): void {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) session.type = 'playback';
}

function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    claimPlaybackSession();
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
  // A foot landing on the stomp pad: a low thud.
  stomp: [{ freq: 110, to: 60, dur: 0.14, type: 'triangle', gain: 0.5 }],
  // The rocket leaving the tube: a rising whistle that thins out.
  whoosh: [
    { freq: 220, to: 1400, dur: 0.7, type: 'sawtooth', gain: 0.18 },
    { freq: 330, to: 1800, dur: 0.6, type: 'sine', gain: 0.2, delay: 0.05 },
  ],
  // Power-on "boop": a quick upward blip into a soft, ringing major chord.
  boot: [
    { freq: 392, to: 784, dur: 0.16, type: 'sine', gain: 0.5 },
    { freq: 523, dur: 1.3, type: 'sine', gain: 0.22, delay: 0.1 },
    { freq: 659, dur: 1.3, type: 'sine', gain: 0.18, delay: 0.1 },
    { freq: 784, dur: 1.4, type: 'sine', gain: 0.16, delay: 0.1 },
    { freq: 1047, dur: 1.2, type: 'triangle', gain: 0.08, delay: 0.12 },
  ],
  // "The End": a C major chord arpeggiated up from C4, each note left ringing so they gather into the chord.
  theEnd: [
    { freq: 261.63, dur: 3.2, type: 'sine', gain: 0.3 },
    { freq: 329.63, dur: 3.0, type: 'sine', gain: 0.26, delay: 0.32 },
    { freq: 392.0, dur: 2.8, type: 'sine', gain: 0.24, delay: 0.64 },
    { freq: 523.25, dur: 2.6, type: 'sine', gain: 0.2, delay: 0.96 },
    { freq: 659.25, dur: 2.4, type: 'triangle', gain: 0.08, delay: 1.28 },
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

export type Voice = 'theo' | 'lucy' | 'parents';

/** Base pitches for the speech blips: Theo in the middle, Lucy up high, Mom and Dad down low. */
const VOICES: Record<Voice, { freq: number; type: OscillatorType }> = {
  theo: { freq: 330, type: 'square' },
  lucy: { freq: 620, type: 'triangle' },
  parents: { freq: 200, type: 'square' },
};
/** One blip a word, this far apart; long speeches are capped so the chatter never outlasts the bubble. */
const BLIP_GAP = 0.085;
const BLIP_MAX = 24;

/**
 * Chatter for a speech bubble: one short blip per word in the speaker's pitch, wandering a
 * little so it sounds like talking rather than a beep. Returns the seconds it will take.
 */
export function playVoice(voice: Voice, words: number): number {
  const a = audio();
  const n = Math.min(BLIP_MAX, Math.max(1, words));
  if (!a) return n * BLIP_GAP;
  const master = getSettings().sfxVolume;
  if (master <= 0) return n * BLIP_GAP;
  const v = VOICES[voice];
  const now = a.currentTime;
  for (let i = 0; i < n; i++) {
    const start = now + i * BLIP_GAP;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = v.type;
    // Each blip sits a few semitones either side of the base pitch, dipping at the end of a sentence.
    const wander = 2 ** ((Math.floor(Math.random() * 7) - 3) / 12);
    const freq = v.freq * wander * (i === n - 1 ? 0.85 : 1);
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.06, start + 0.03);
    const peak = 0.16 * master;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.055);
    osc.connect(g).connect(a.destination);
    osc.start(start);
    osc.stop(start + 0.07);
  }
  return n * BLIP_GAP;
}
