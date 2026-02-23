import { describe, expect, it } from 'vitest';

import { calculateScore } from './scoring';

describe('calculateScore', () => {
  it('calculates back-to-back tetris with level multiplier', () => {
    const breakdown = calculateScore({
      level: 2,
      lines: 4,
      tspin: 'none',
      b2bActive: true,
      combo: 0,
      perfectClear: false,
      softDropCells: 0,
      hardDropCells: 0,
    });

    expect(breakdown.base).toBe(1600);
    expect(breakdown.b2bBonus).toBe(800);
    expect(breakdown.total).toBe(2400);
  });

  it('includes combo and drop points', () => {
    const breakdown = calculateScore({
      level: 3,
      lines: 1,
      tspin: 'none',
      b2bActive: false,
      combo: 2,
      perfectClear: false,
      softDropCells: 4,
      hardDropCells: 5,
    });

    expect(breakdown.base).toBe(300);
    expect(breakdown.comboBonus).toBe(300);
    expect(breakdown.dropBonus).toBe(14);
    expect(breakdown.total).toBe(614);
  });

  it('applies perfect clear bonus for b2b tetris', () => {
    const breakdown = calculateScore({
      level: 1,
      lines: 4,
      tspin: 'none',
      b2bActive: true,
      combo: 0,
      perfectClear: true,
      softDropCells: 0,
      hardDropCells: 0,
    });

    expect(breakdown.perfectClearBonus).toBe(3200);
    expect(breakdown.total).toBe(4400);
  });
});
