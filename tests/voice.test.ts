import { describe, expect, it } from 'vitest';
import { playVoice } from '../src/systems/Sfx';

describe('speech blips', () => {
  it('last one blip a word, and cap long speeches', () => {
    // No AudioContext under vitest, so only the timing comes back.
    expect(playVoice('theo', 5)).toBeCloseTo(5 * 0.085, 6);
    expect(playVoice('lucy', 1)).toBeCloseTo(0.085, 6);
    expect(playVoice('lucy', 0)).toBeCloseTo(0.085, 6);
    expect(playVoice('theo', 200)).toBeCloseTo(24 * 0.085, 6);
  });
});
