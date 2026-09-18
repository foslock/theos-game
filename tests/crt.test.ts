import { describe, expect, it } from 'vitest';
import { crtPitch } from '../src/frame';

/**
 * A sub-pixel tile makes WebKit paint the gradient once instead of repeating it, which turned
 * the CRT overlay into a single dark band on phones.
 */
describe('crtPitch', () => {
  const sizes = [
    { label: 'phone portrait', w: 278, h: 218 },
    { label: 'phone landscape', w: 162, h: 127 },
    { label: 'desktop', w: 481, h: 377 },
  ];

  for (const { label, w, h } of sizes) {
    it(`keeps both tiles tileable on ${label}`, () => {
      const { scan, grille } = crtPitch(w, h);
      expect(scan).toBeGreaterThanOrEqual(2);
      expect(grille).toBeGreaterThanOrEqual(3);
    });
  }

  it('tracks game pixels once the screen is large enough to', () => {
    const { scan, grille } = crtPitch(1280, 960);
    expect(scan).toBeCloseTo(4);
    expect(grille).toBeCloseTo(6);
  });
});
