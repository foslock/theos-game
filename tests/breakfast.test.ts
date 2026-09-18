import { describe, it, expect } from 'vitest';
import { generateBreakfast, BREAKFAST_ITEMS, missingBreakfastItems, lucyRequestLine } from '../src/puzzles/breakfast';
import { kitchenContainers } from '../src/data/rooms/kitchen';
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
