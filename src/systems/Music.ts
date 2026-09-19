import type { RoomId } from '../data/rooms';
import { getSettings } from '../state/Settings';
import { audioContext } from './Sfx';

/**
 * Chiptune loops built from oscillators rather than audio files, the same way the sound effects
 * are. Nothing to download, and the melodies live here as data so they can be read and changed.
 *
 * A tune is two voices on a grid of eighth notes. Each step is a note name, `.` to hold the note
 * before it, or `-` for silence; `|` marks a bar and is ignored. Melodies stay on the five-note
 * pentatonic scale of their key, which is what keeps them from clashing however they line up.
 *
 * The bass just holds the root of each bar — twice a bar in the quicker rooms — so it grounds the
 * melody without becoming a second tune competing with it.
 */
export type TuneName = RoomId | 'title' | 'slide';

interface Tune {
  bpm: number;
  /** Waveform for the melody. The bass is always a sine so it stays round underneath it. */
  wave: OscillatorType;
  lead: string;
  bass: string;
}

export const TUNES: Record<TuneName, Tune> = {
  // Bright and a little ceremonial, for the Mac booting into the title.
  title: {
    bpm: 108,
    wave: 'triangle',
    lead: 'G4 .  A4 .  C5 .  A4 . | G4 .  E4 .  G4 .  .  . | A4 .  C5 .  D5 .  C5 . | A4 .  G4 .  .  .  .  .',
    bass: 'C3  .  .  .  .  .  .  . | A2  .  .  .  .  .  .  . | F2  .  .  .  .  .  .  . | G2  .  .  .  .  .  .  .',
  },
  // Slow and sleepy: this one plays over Theo waking up.
  bedroom: {
    bpm: 76,
    wave: 'sine',
    lead: 'E4 .  .  .  G4 .  .  . | A4 .  .  .  G4 .  .  . | E4 .  .  .  D4 .  .  . | C4 .  .  .  .  .  .  .',
    bass: 'C3  .  .  .  .  .  .  . | A2  .  .  .  .  .  .  . | F2  .  .  .  .  .  .  . | G2  .  .  .  .  .  .  .',
  },
  // Short plinks, like water dripping.
  bathroom: {
    bpm: 118,
    wave: 'triangle',
    lead: 'C5 -  E5 -  G5 -  E5 - | C5 -  D5 -  E5 -  -  - | G5 -  E5 -  D5 -  C5 - | A4 -  C5 -  -  -  -  -',
    bass: 'C3  .  .  .  C3  .  .  . | A2  .  .  .  A2  .  .  . | F2  .  .  .  F2  .  .  . | G2  .  .  .  G2  .  .  .',
  },
  // Warm and busy, in F, for the room where breakfast gets made.
  kitchen: {
    bpm: 104,
    wave: 'triangle',
    lead: 'F4 .  A4 .  C5 .  A4 . | G4 .  F4 .  D4 .  F4 . | A4 .  C5 .  D5 .  C5 . | A4 .  F4 .  .  .  .  .',
    bass: 'F2  .  .  .  .  .  .  . | D3  .  .  .  .  .  .  . | Bb2  .  .  .  .  .  .  . | C3  .  .  .  .  .  .  .',
  },
  // Cosy, unhurried, in G.
  family_room: {
    bpm: 96,
    wave: 'sine',
    lead: 'D4 .  G4 .  B4 .  G4 . | A4 .  B4 .  D5 .  B4 . | G4 .  E4 .  D4 .  E4 . | G4 .  .  .  .  .  .  .',
    bass: 'G2  .  .  .  .  .  .  . | E3  .  .  .  .  .  .  . | C3  .  .  .  .  .  .  . | D3  .  .  .  .  .  .  .',
  },
  // Minor key and a bit clunky: the one room that feels like somewhere you are not meant to be.
  garage: {
    bpm: 92,
    wave: 'triangle',
    lead: 'A4 .  C5 .  A4 .  G4 . | E4 .  G4 .  A4 .  .  . | D5 .  C5 .  A4 .  G4 . | E4 .  .  .  A4 .  .  .',
    bass: 'A2  .  .  .  .  .  .  . | F2  .  .  .  .  .  .  . | G2  .  .  .  .  .  .  . | A2  .  .  .  .  .  .  .',
  },
  // Open and airy, in D, for stepping outside.
  backyard: {
    bpm: 108,
    wave: 'sine',
    lead: 'A4 .  B4 .  D5 .  B4 . | A4 .  F#4 . A4 .  .  . | B4 .  D5 .  E5 .  D5 . | B4 .  A4 .  .  .  .  .',
    bass: 'D3  .  .  .  .  .  .  . | B2  .  .  .  .  .  .  . | G2  .  .  .  .  .  .  . | A2  .  .  .  .  .  .  .',
  },
  // Quick and bouncy, like a ball being dribbled.
  sport_court: {
    bpm: 124,
    wave: 'triangle',
    lead: 'G4 -  B4 -  D5 -  B4 - | G4 -  A4 -  B4 -  -  - | D5 -  E5 -  D5 -  B4 - | A4 -  G4 -  -  -  -  -',
    bass: 'G2  .  .  .  G2  .  .  . | E2  .  .  .  E2  .  .  . | C3  .  .  .  C3  .  .  . | D3  .  .  .  D3  .  .  .',
  },
  // High and delicate, like a wind-up music box.
  playhouse: {
    bpm: 100,
    wave: 'sine',
    lead: 'C5 .  D5 .  E5 .  G5 . | E5 .  D5 .  C5 .  .  . | A4 .  C5 .  D5 .  E5 . | D5 .  C5 .  .  .  .  .',
    bass: 'C3  .  .  .  .  .  .  . | F2  .  .  .  .  .  .  . | A2  .  .  .  .  .  .  . | G2  .  .  .  .  .  .  .',
  },
  // Racing along, for the ride down the slide.
  slide: {
    bpm: 144,
    wave: 'triangle',
    lead: 'C5 -  E5 -  G5 -  E5 - | A5 -  G5 -  E5 -  D5 - | C5 -  D5 -  E5 -  G5 - | A5 -  G5 -  -  -  -  -',
    bass: 'C3  .  .  .  C3  .  .  . | F2  .  .  .  F2  .  .  . | A2  .  .  .  A2  .  .  . | G2  .  .  .  G2  .  .  .',
  },
  // The happiest and fastest of them.
  playground: {
    bpm: 128,
    wave: 'triangle',
    lead: 'G4 -  A4 -  C5 -  D5 - | E5 -  D5 -  C5 -  A4 - | G4 -  A4 -  C5 -  A4 - | G4 -  E4 -  G4 -  -  -',
    bass: 'C3  .  .  .  C3  .  .  . | F2  .  .  .  F2  .  .  . | A2  .  .  .  A2  .  .  . | G2  .  .  .  G2  .  .  .',
  },
};

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Equal-tempered frequency for a name like `C4`, `F#4` or `Bb2`. Throws on anything unparseable. */
export function noteFrequency(note: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
  if (!m) throw new Error(`Bad note: ${note}`);
  const semitone = SEMITONES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  // MIDI 69 is A4 = 440Hz.
  const midi = (Number(m[3]) + 1) * 12 + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}

export interface Step {
  note: string;
  /** Length in steps, counting the holds that follow it. */
  length: number;
}

/**
 * One entry per step: the note that starts there, or null. A hold lengthens the note it follows
 * rather than adding a step of its own, and a rest ends the note so a later hold cannot revive it.
 */
export function parseVoice(voice: string): (Step | null)[] {
  const steps: (Step | null)[] = [];
  let sounding: Step | null = null;
  for (const token of voice.split(/\s+/).filter((t) => t && t !== '|')) {
    if (token === '.') {
      if (sounding) sounding.length++;
      steps.push(null);
    } else if (token === '-') {
      sounding = null;
      steps.push(null);
    } else {
      noteFrequency(token); // rejects a typo here rather than silently going quiet
      sounding = { note: token, length: 1 };
      steps.push(sounding);
    }
  }
  return steps;
}

const LOOKAHEAD_S = 0.25;
const TICK_MS = 40;

interface Playing {
  name: TuneName;
  lead: (Step | null)[];
  bass: (Step | null)[];
  stepDuration: number;
  step: number;
  nextTime: number;
  gain: GainNode;
  /** Kept so the whole chain can be torn down, not just its head. */
  out: AudioNode;
  timer: number;
}

let playing: Playing | null = null;

function voiceGain(ctx: AudioContext, target: GainNode, gain: number): GainNode {
  const g = ctx.createGain();
  g.gain.value = gain;
  g.connect(target);
  return g;
}

/**
 * One note, shaped to be heard for a while rather than plucked. The envelope eases in and out with
 * linear ramps that reach true zero: an exponential ramp can only approach it, so cutting the
 * oscillator afterwards left a click on every note.
 */
function scheduleNote(ctx: AudioContext, out: GainNode, wave: OscillatorType, note: string, at: number, duration: number): void {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(noteFrequency(note), at);

  // A little silence at the end still separates repeated notes, but far less than a hard pluck.
  const sounding = Math.max(0.05, duration * 0.92);
  const attack = Math.min(0.04, sounding * 0.3);
  const release = Math.min(0.14, sounding * 0.45);
  const body = Math.max(0, sounding - attack - release);
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(1, at + attack);
  // Sag gently through the note so it has shape without dying away.
  env.gain.linearRampToValueAtTime(0.7, at + attack + body);
  env.gain.linearRampToValueAtTime(0, at + sounding);

  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + sounding + 0.02);
}

/**
 * Starts a room's loop, replacing whatever was playing. Calling it with the tune already playing
 * does nothing, so re-entering a room does not restart the music mid-phrase.
 */
export function playMusic(name: TuneName): void {
  if (playing?.name === name) return;
  const ctx = audioContext();
  if (!ctx) return;
  stopMusic();

  const tune = TUNES[name];
  const master = ctx.createGain();
  master.gain.value = 0;
  // Rolls off the upper harmonics that made these piercing, especially the melodies up near G5.
  const warmth = ctx.createBiquadFilter();
  warmth.type = 'lowpass';
  warmth.frequency.value = 2000;
  warmth.Q.value = 0.4;
  master.connect(warmth).connect(ctx.destination);

  // Sits under the sound effects, which peak around 0.3-0.5, without being inaudible beside them.
  const lead = voiceGain(ctx, master, 0.16);
  const bass = voiceGain(ctx, master, 0.13);
  const state: Playing = {
    name,
    lead: parseVoice(tune.lead),
    bass: parseVoice(tune.bass),
    stepDuration: 30 / tune.bpm, // an eighth note
    step: 0,
    nextTime: ctx.currentTime + 0.08,
    gain: master,
    out: warmth,
    timer: 0,
  };

  const tick = () => {
    const volume = getSettings().musicVolume;
    // Ramp rather than jump so dragging the volume slider does not click.
    master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.1);
    while (state.nextTime < ctx.currentTime + LOOKAHEAD_S) {
      if (volume > 0) {
        const l = state.lead[state.step];
        if (l) scheduleNote(ctx, lead, tune.wave, l.note, state.nextTime, l.length * state.stepDuration);
        const b = state.bass[state.step];
        if (b) scheduleNote(ctx, bass, 'sine', b.note, state.nextTime, b.length * state.stepDuration);
      }
      state.nextTime += state.stepDuration;
      state.step = (state.step + 1) % state.lead.length;
    }
  };
  tick();
  state.timer = window.setInterval(tick, TICK_MS);
  playing = state;
}

export function stopMusic(): void {
  if (!playing) return;
  window.clearInterval(playing.timer);
  const ctx = audioContext();
  if (ctx) {
    // Fade out so the loop does not end on a click, then drop the node.
    playing.gain.gain.cancelScheduledValues(ctx.currentTime);
    playing.gain.gain.setValueAtTime(playing.gain.gain.value, ctx.currentTime);
    playing.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    const { gain: dyingGain, out: dyingOut } = playing;
    window.setTimeout(() => {
      dyingGain.disconnect();
      dyingOut.disconnect();
    }, 400);
  }
  playing = null;
}
