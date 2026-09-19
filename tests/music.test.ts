import { describe, expect, it } from 'vitest';
import { noteFrequency, parseVoice, TUNES, type TuneName } from '../src/systems/Music';
import { ROOM_IDS } from '../src/data/rooms';

const names = Object.keys(TUNES) as TuneName[];

describe('note names', () => {
  it('tunes to concert pitch', () => {
    expect(noteFrequency('A4')).toBeCloseTo(440, 5);
    expect(noteFrequency('A3')).toBeCloseTo(220, 5);
    expect(noteFrequency('C4')).toBeCloseTo(261.626, 2);
    expect(noteFrequency('C5')).toBeCloseTo(523.251, 2);
  });

  it('handles sharps and flats', () => {
    expect(noteFrequency('F#4')).toBeCloseTo(369.994, 2);
    expect(noteFrequency('Bb2')).toBeCloseTo(116.541, 2);
    expect(noteFrequency('A#4')).toBeCloseTo(noteFrequency('Bb4'), 5);
  });

  it('refuses a typo instead of going silent', () => {
    expect(() => noteFrequency('H4')).toThrow();
    expect(() => noteFrequency('C')).toThrow();
    expect(() => noteFrequency('')).toThrow();
  });
});

describe('reading a voice', () => {
  it('gives one entry per step', () => {
    expect(parseVoice('C4 . - E4').length).toBe(4);
    expect(parseVoice('C4 . | - E4').length).toBe(4); // bar marks do not take a step
  });

  it('folds a hold into the note it extends', () => {
    const v = parseVoice('C4 . . . E4 .');
    expect(v[0]).toEqual({ note: 'C4', length: 4 });
    expect(v[1]).toBeNull();
    expect(v[4]).toEqual({ note: 'E4', length: 2 });
  });

  it('will not let a hold revive a note across a rest', () => {
    const v = parseVoice('C4 - .');
    expect(v[0]).toEqual({ note: 'C4', length: 1 });
    expect(v[2]).toBeNull();
  });
});

describe('the room loops', () => {
  it('covers every room, plus the title screen and the slide ride', () => {
    for (const id of ROOM_IDS) expect(TUNES[id], id).toBeDefined();
    expect(TUNES.title).toBeDefined();
    expect(TUNES.slide).toBeDefined();
    expect(names.length).toBe(ROOM_IDS.length + 2);
  });

  it('keeps both voices the same length, in whole bars', () => {
    for (const name of names) {
      const lead = parseVoice(TUNES[name].lead);
      const bass = parseVoice(TUNES[name].bass);
      expect(lead.length, `${name} lead`).toBe(bass.length);
      expect(lead.length % 8, `${name} is not whole bars`).toBe(0);
      expect(lead.length).toBeGreaterThanOrEqual(16);
    }
  });

  it('stays in key: no loop wanders past six different pitch classes', () => {
    for (const name of names) {
      const classes = new Set<string>();
      for (const voice of [TUNES[name].lead, TUNES[name].bass]) {
        for (const step of parseVoice(voice)) if (step) classes.add(step.note.replace(/-?\d$/, ''));
      }
      expect([...classes].sort(), `${name} uses ${classes.size} pitch classes`).toHaveLength(classes.size);
      expect(classes.size, `${name} looks out of key`).toBeLessThanOrEqual(6);
    }
  });

  it('stays in a register a small speaker can actually play', () => {
    for (const name of names) {
      for (const voice of [TUNES[name].lead, TUNES[name].bass]) {
        for (const step of parseVoice(voice)) {
          if (!step) continue;
          const f = noteFrequency(step.note);
          expect(f, `${name}: ${step.note}`).toBeGreaterThan(70);
          expect(f, `${name}: ${step.note}`).toBeLessThan(1400);
        }
      }
    }
  });

  it('leaves no dead loop: every tune actually has notes in both voices', () => {
    for (const name of names) {
      expect(parseVoice(TUNES[name].lead).filter(Boolean).length, `${name} lead`).toBeGreaterThan(3);
      expect(parseVoice(TUNES[name].bass).filter(Boolean).length, `${name} bass`).toBeGreaterThan(3);
    }
  });

  it('keeps the bass to one root per bar, or two of the same', () => {
    for (const name of names) {
      const bass = parseVoice(TUNES[name].bass);
      for (let bar = 0; bar < bass.length / 8; bar++) {
        const attacks = bass.slice(bar * 8, bar * 8 + 8).filter((s): s is NonNullable<typeof s> => !!s);
        expect(attacks.length, `${name} bar ${bar + 1} has ${attacks.length} bass notes`).toBeGreaterThanOrEqual(1);
        expect(attacks.length, `${name} bar ${bar + 1} has ${attacks.length} bass notes`).toBeLessThanOrEqual(2);
        // Every attack in a bar is the same note: a root holding the bar down, not a bass melody.
        expect(new Set(attacks.map((a) => a.note)).size, `${name} bar ${bar + 1} changes root mid-bar`).toBe(1);
      }
    }
  });

  it('never leaves the melody harsh: no square waves', () => {
    for (const name of names) expect(['sine', 'triangle'], name).toContain(TUNES[name].wave);
  });

  it('runs at a tempo that loops in a few seconds, not half a minute', () => {
    for (const name of names) {
      const tune = TUNES[name];
      expect(tune.bpm, name).toBeGreaterThanOrEqual(60);
      expect(tune.bpm, name).toBeLessThanOrEqual(160);
      const seconds = parseVoice(tune.lead).length * (30 / tune.bpm);
      expect(seconds, `${name} loops every ${seconds.toFixed(1)}s`).toBeLessThan(20);
    }
  });
});
