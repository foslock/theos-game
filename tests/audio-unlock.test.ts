import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The context must be resumed from inside a real DOM event handler: Safari ignores `resume()`
 * anywhere else, which left the game completely silent.
 */
type Handler = (e: unknown) => void;

function fakeDocument() {
  const handlers = new Map<string, Set<Handler>>();
  return {
    addEventListener(type: string, fn: Handler) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: Handler) {
      handlers.get(type)?.delete(fn);
    },
    dispatch(type: string) {
      for (const fn of [...(handlers.get(type) ?? [])]) fn({});
    },
    count(type: string) {
      return handlers.get(type)?.size ?? 0;
    },
  };
}

describe('resuming the audio context', () => {
  let doc: ReturnType<typeof fakeDocument>;
  let resume: ReturnType<typeof vi.fn>;
  let state: string;

  beforeEach(async () => {
    vi.resetModules();
    doc = fakeDocument();
    state = 'suspended';
    resume = vi.fn(() => {
      state = 'running';
      return Promise.resolve();
    });
    vi.stubGlobal('document', doc);
    vi.stubGlobal('navigator', { audioSession: { type: 'auto' } });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
    vi.stubGlobal(
      'AudioContext',
      function () {
        return { get state() { return state; }, resume, currentTime: 0, destination: {} };
      },
    );
  });

  it('does nothing until the page is actually touched', async () => {
    const { installAudioUnlock } = await import('../src/systems/Sfx');
    installAudioUnlock();
    expect(resume).not.toHaveBeenCalled();
    expect(doc.count('pointerdown')).toBe(1);
  });

  it('resumes on the first gesture', async () => {
    const { installAudioUnlock } = await import('../src/systems/Sfx');
    installAudioUnlock();
    doc.dispatch('pointerdown');
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it('listens for a key press and a touch too, not just a click', async () => {
    const { installAudioUnlock } = await import('../src/systems/Sfx');
    installAudioUnlock();
    for (const type of ['pointerdown', 'touchend', 'mousedown', 'keydown']) expect(doc.count(type), type).toBe(1);
  });

  it('stops listening once the context is running', async () => {
    const { installAudioUnlock } = await import('../src/systems/Sfx');
    installAudioUnlock();
    doc.dispatch('pointerdown');
    await Promise.resolve();
    await Promise.resolve();
    expect(doc.count('pointerdown')).toBe(0);
  });

  it('keeps trying while the context stays suspended', async () => {
    resume = vi.fn(() => Promise.resolve()); // never flips to running
    vi.stubGlobal('AudioContext', function () {
      return { get state() { return 'suspended'; }, resume, currentTime: 0, destination: {} };
    });
    const { installAudioUnlock } = await import('../src/systems/Sfx');
    installAudioUnlock();
    doc.dispatch('pointerdown');
    await Promise.resolve();
    doc.dispatch('pointerdown');
    expect(resume).toHaveBeenCalledTimes(2);
    expect(doc.count('pointerdown')).toBe(1);
  });

  it('installs only once however many times it is called', async () => {
    const { installAudioUnlock } = await import('../src/systems/Sfx');
    installAudioUnlock();
    installAudioUnlock();
    installAudioUnlock();
    expect(doc.count('pointerdown')).toBe(1);
  });

  it('claims a playback session so a muted iPhone still plays', async () => {
    const { installAudioUnlock } = await import('../src/systems/Sfx');
    installAudioUnlock();
    doc.dispatch('pointerdown');
    expect((navigator as Navigator & { audioSession?: { type: string } }).audioSession?.type).toBe('playback');
  });

  it('copes where the browser has no audioSession at all', async () => {
    vi.stubGlobal('navigator', {});
    const { installAudioUnlock } = await import('../src/systems/Sfx');
    installAudioUnlock();
    expect(() => doc.dispatch('pointerdown')).not.toThrow();
    expect(resume).toHaveBeenCalled();
  });
});
