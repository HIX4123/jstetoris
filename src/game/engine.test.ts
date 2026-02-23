import { describe, expect, it } from 'vitest';

import { createShuffledBag, gravityForLevel, levelGoalLines, linesToLevel } from './engine';

describe('engine helpers', () => {
  it('builds 7-bag with unique pieces', () => {
    const bag = createShuffledBag(() => 0.42);
    expect(bag).toHaveLength(7);
    expect(new Set(bag).size).toBe(7);
  });

  it('converts lines to level and goal correctly', () => {
    expect(linesToLevel(0)).toBe(1);
    expect(linesToLevel(149)).toBe(15);
    expect(linesToLevel(150)).toBe(16);

    expect(levelGoalLines(1)).toBe(10);
    expect(levelGoalLines(15)).toBe(150);
    expect(levelGoalLines(16)).toBe(160);
  });

  it('increases gravity after level 15', () => {
    expect(gravityForLevel(16)).toBeGreaterThan(gravityForLevel(15));
    expect(gravityForLevel(17)).toBeGreaterThan(gravityForLevel(16));
  });
});
