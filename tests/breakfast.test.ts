import { describe, it, expect } from 'vitest';
import { generateBreakfast, BREAKFAST_ITEMS, fillMissingContainers, GAGS, GAG_SPECS, gagFlipped, gagLine, missingBreakfastItems, lucyRequestLine } from '../src/puzzles/breakfast';
import { kitchenContainers } from '../src/data/rooms/kitchen';
import { pick } from '../src/systems/Hitbox';
import { Rng } from '../src/systems/Rng';
import { newGameState, addItem } from '../src/state/GameState';

describe('breakfast placement', () => {
  it('satisfies the spec constraints for many seeds', () => {
    const byId = Object.fromEntries(kitchenContainers.map((c) => [c.id, c.category]));
    for (let seed = 0; seed < 500; seed++) {
      const st = generateBreakfast(new Rng(seed), kitchenContainers);
      const where: Record<string, string> = {};
      for (const [cid, content] of Object.entries(st.placements)) {
        if (content.type === 'item') {
          expect(where[content.item], `item ${content.item} placed twice (seed ${seed})`).toBeUndefined();
          where[content.item] = cid;
        }
      }
      for (const item of BREAKFAST_ITEMS) expect(where[item], `${item} missing (seed ${seed})`).toBeDefined();
      expect(byId[where.spoon]).toBe('drawer');
      expect(byId[where.bowl]).toBe('cabinet');
      expect(byId[where.cereal]).toBe('cabinet');
      expect(byId[where.milk]).toBe('fridge');
      expect(Object.keys(st.placements).length).toBe(kitchenContainers.length);
    }
  });

  it('different seeds produce different layouts', () => {
    const layouts = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      const st = generateBreakfast(new Rng(seed), kitchenContainers);
      layouts.add(JSON.stringify(Object.entries(st.placements).filter(([, c]) => c.type === 'item')));
    }
    expect(layouts.size).toBeGreaterThan(5);
  });

  it('reports missing items and phrases Lucy\'s request', () => {
    const s = newGameState(1);
    expect(missingBreakfastItems(s)).toEqual(['spoon', 'bowl', 'cereal', 'milk']);
    addItem(s, 'spoon');
    addItem(s, 'milk');
    expect(missingBreakfastItems(s)).toEqual(['bowl', 'cereal']);
    expect(lucyRequestLine(['bowl', 'cereal'])).toContain('a bowl and the cereal');
    expect(lucyRequestLine([])).toContain('everything');
  });
});

describe('the gags in the cupboards', () => {
  it('gives every gag a line, a sound and a way out', () => {
    for (const gag of GAGS) {
      const spec = GAG_SPECS[gag];
      expect(gagLine(gag)).toBe(spec.line);
      expect(spec.line.length).toBeGreaterThan(0);
      expect(spec.sfx.length).toBeGreaterThan(0);
      expect(spec.exit).toBeTruthy();
    }
  });

  it('gives every gag but the empty cupboard something that pops out, each its own sprite', () => {
    const keys = GAGS.map((g) => GAG_SPECS[g].key).filter(Boolean);
    expect(GAG_SPECS.empty.key).toBeUndefined();
    expect(keys).toHaveLength(GAGS.length - 1);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('the way each gag leaves', () => {
  it('sends each live thing out the way that thing would go', () => {
    expect(GAG_SPECS.frog.exit).toBe('hop');
    expect(GAG_SPECS.mouse.exit).toBe('dash');
    expect(GAG_SPECS.spider.exit).toBe('climb');
    expect(GAG_SPECS.ball.exit).toBe('bounce');
  });

  it('mirrors the art of the ones that run along the floor', () => {
    // Drawn facing right: heading left it is mirrored, heading right it is left alone.
    expect(GAG_SPECS.frog.faces).toBe('right');
    expect(gagFlipped(GAG_SPECS.frog, -1)).toBe(true);
    expect(gagFlipped(GAG_SPECS.frog, 1)).toBe(false);
  });

  it('never mirrors a gag with no facing of its own', () => {
    expect(GAG_SPECS.ball.faces).toBeUndefined();
    expect(gagFlipped(GAG_SPECS.ball, -1)).toBe(false);
    expect(gagFlipped(GAG_SPECS.ball, 1)).toBe(false);
  });

  it('gives every gag an exit the controller knows how to run', () => {
    const known = ['hop', 'dash', 'climb', 'bounce', 'roll', 'flutter'];
    for (const gag of GAGS) expect(known).toContain(GAG_SPECS[gag].exit);
  });
});

describe('the kitchen units answer over their whole fronts', () => {
  /*
   * The art draws three drawer fronts in the left column, with edges measured off bg_0.png at
   * y 193, 217, 243 and 268. Every row of every front has to resolve to a container: the bottom
   * one used to answer only down to y 258, where the hit tolerance below drawer_2 ran out, so
   * its lower half did nothing.
   */
  const LEFT_COLUMN_X = 155;
  const FRONTS = [
    { name: 'top', from: 196, to: 215 },
    { name: 'middle', from: 220, to: 241 },
    { name: 'bottom', from: 246, to: 266 },
  ];

  it('gives every row of every drawer front a container to open', () => {
    for (const front of FRONTS) {
      for (let y = front.from; y <= front.to; y++) {
        const hit = pick(kitchenContainers, LEFT_COLUMN_X, y);
        expect(hit?.category, `${front.name} drawer front at y ${y}`).toBe('drawer');
      }
    }
  });

  it('gives each of the three fronts a drawer of its own', () => {
    const ids = FRONTS.map((f) => pick(kitchenContainers, LEFT_COLUMN_X, Math.round((f.from + f.to) / 2))?.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids).not.toContain(undefined);
  });

  it('keeps the bottom front out of the floor below it', () => {
    // Well under the units is nobody's business.
    expect(pick(kitchenContainers, LEFT_COLUMN_X, 300)).toBeUndefined();
  });
});

describe('a cupboard added after the save was written', () => {
  it('is given something rather than staying empty for good', () => {
    const st = generateBreakfast(new Rng(7), kitchenContainers);
    const added = [...kitchenContainers, { id: 'drawer_9', category: 'drawer' as const }];
    expect(fillMissingContainers(st, new Rng(7), added)).toBe(true);
    expect(st.placements.drawer_9).toEqual({ type: 'decoy', gag: expect.any(String) });
    // The cupboards that were already there keep whatever was in them.
    const again = JSON.parse(JSON.stringify(st.placements));
    expect(fillMissingContainers(st, new Rng(7), added)).toBe(false);
    expect(st.placements).toEqual(again);
  });

  it('never turns a breakfast item into a gag', () => {
    const st = generateBreakfast(new Rng(11), kitchenContainers);
    const items = Object.entries(st.placements).filter(([, c]) => c.type === 'item');
    fillMissingContainers(st, new Rng(11), [...kitchenContainers, { id: 'drawer_9', category: 'drawer' as const }]);
    for (const [id, content] of items) expect(st.placements[id]).toEqual(content);
  });
});
