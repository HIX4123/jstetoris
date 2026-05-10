import { describe, expect, it } from 'vitest';

import { calculateAttack, calculateScore, isDifficultClear, keepsBackToBack } from './scoring';

import type { ScoringEvent } from './types';

const createScoreEvent = (overrides: Partial<ScoringEvent>): ScoringEvent => ({
  level: 1,
  lines: 0,
  tspin: 'none',
  b2bActive: false,
  combo: 0,
  perfectClear: false,
  softDropCells: 0,
  hardDropCells: 0,
  ...overrides,
});

describe('calculateScore', () => {
  it('uses TETR.IO solo line clear scores', () => {
    expect(calculateScore(createScoreEvent({ lines: 4 })).base).toBe(800);
    expect(calculateScore(createScoreEvent({ lines: 4 })).total).toBe(800);
  });

  it('applies level multiplier and B2B bonus to difficult clears', () => {
    const score = calculateScore(
      createScoreEvent({
        level: 2,
        lines: 4,
        b2bActive: true,
      }),
    );

    expect(score.base).toBe(1600);
    expect(score.b2bBonus).toBe(800);
    expect(score.total).toBe(2400);
  });

  it('scores T-Spin doubles using the solo table', () => {
    const score = calculateScore(
      createScoreEvent({
        lines: 2,
        tspin: 'full',
      }),
    );

    expect(score.base).toBe(1200);
    expect(score.total).toBe(1200);
  });

  it('includes combo and drop points', () => {
    const score = calculateScore(
      createScoreEvent({
        level: 3,
        lines: 1,
        combo: 2,
        softDropCells: 4,
        hardDropCells: 5,
      }),
    );

    expect(score.base).toBe(300);
    expect(score.comboBonus).toBe(300);
    expect(score.dropBonus).toBe(14);
    expect(score.total).toBe(614);
  });

  it('adds TETR.IO all clear score regardless of cleared line count', () => {
    const score = calculateScore(
      createScoreEvent({
        level: 2,
        lines: 2,
        perfectClear: true,
      }),
    );

    expect(score.base).toBe(600);
    expect(score.allClearBonus).toBe(7000);
    expect(score.total).toBe(7600);
  });
});

describe('calculateAttack', () => {
  it('uses TETR.IO-style base attack values', () => {
    expect(
      calculateAttack({
        lines: 1,
        tspin: 'none',
        b2bActive: false,
        combo: 0,
        perfectClear: false,
        surgeAttack: 0,
      }).total,
    ).toBe(0);

    expect(
      calculateAttack({
        lines: 2,
        tspin: 'none',
        b2bActive: false,
        combo: 0,
        perfectClear: false,
        surgeAttack: 0,
      }).total,
    ).toBe(1);

    expect(
      calculateAttack({
        lines: 3,
        tspin: 'none',
        b2bActive: false,
        combo: 0,
        perfectClear: false,
        surgeAttack: 0,
      }).total,
    ).toBe(2);

    expect(
      calculateAttack({
        lines: 4,
        tspin: 'none',
        b2bActive: false,
        combo: 0,
        perfectClear: false,
        surgeAttack: 0,
      }).total,
    ).toBe(4);
  });

  it('scores T-Spins by attack instead of guideline points', () => {
    const attack = calculateAttack({
      lines: 2,
      tspin: 'full',
      b2bActive: false,
      combo: 0,
      perfectClear: false,
      surgeAttack: 0,
    });

    expect(attack.baseAttack).toBe(4);
    expect(attack.total).toBe(4);
  });

  it('uses logarithmic fallback for combo attacks with zero base attack', () => {
    const attack = calculateAttack({
      lines: 1,
      tspin: 'none',
      b2bActive: false,
      combo: 2,
      perfectClear: false,
      surgeAttack: 0,
    });

    expect(attack.baseAttack).toBe(0);
    expect(attack.comboAttack).toBe(1);
    expect(attack.total).toBe(1);
  });

  it('multiplies large attacks during combos', () => {
    const attack = calculateAttack({
      lines: 4,
      tspin: 'none',
      b2bActive: false,
      combo: 2,
      perfectClear: false,
      surgeAttack: 0,
    });

    expect(attack.baseAttack).toBe(4);
    expect(attack.comboAttack).toBe(6);
    expect(attack.total).toBe(6);
  });

  it('adds one attack for active B2B difficult clears', () => {
    const attack = calculateAttack({
      lines: 2,
      tspin: 'full',
      b2bActive: true,
      combo: 0,
      perfectClear: false,
      surgeAttack: 0,
    });

    expect(attack.comboAttack).toBe(4);
    expect(attack.b2bAttack).toBe(1);
    expect(attack.total).toBe(5);
  });

  it('keeps all clear attack configurable and tracks surge release', () => {
    const attack = calculateAttack({
      lines: 2,
      tspin: 'none',
      b2bActive: false,
      combo: 0,
      perfectClear: true,
      surgeAttack: 8,
    });

    expect(attack.allClearAttack).toBe(0);
    expect(attack.surgeAttack).toBe(8);
    expect(attack.total).toBe(9);
  });

  it('classifies B2B keep and break cases', () => {
    expect(isDifficultClear(4, 'none')).toBe(true);
    expect(isDifficultClear(1, 'full')).toBe(true);
    expect(isDifficultClear(2, 'mini')).toBe(true);
    expect(isDifficultClear(2, 'none')).toBe(false);

    expect(keepsBackToBack(0, 'full')).toBe(true);
    expect(keepsBackToBack(2, 'none')).toBe(false);
    expect(keepsBackToBack(2, 'none', true)).toBe(true);
  });
});
