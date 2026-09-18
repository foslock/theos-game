/** Small seeded PRNG (mulberry32) so puzzle layouts are reproducible from the save's seed. */
export class Rng {
  private a: number;

  constructor(seed: number) {
    this.a = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    this.a = (this.a + 0x6d2b79f5) >>> 0;
    let t = this.a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** Derive a child generator so subsystems don't consume each other's sequence. */
  fork(label: string): Rng {
    let h = this.a;
    for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 2654435761) >>> 0;
    return new Rng(h);
  }
}

export function randomSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
