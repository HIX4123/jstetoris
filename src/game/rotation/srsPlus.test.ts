import { describe, expect, it } from 'vitest';

import { pieceCellsFor } from '../engine';
import { attemptSrsPlusRotation, getKickTests } from './srsPlus';

import type { PieceType } from '../types';

describe('SRS+ rotation', () => {
  it('provides kick tests for I piece', () => {
    const kicks = getKickTests('I', 0, 'cw');
    expect(kicks.length).toBeGreaterThan(1);
    expect(kicks[0]).toEqual({ x: 0, y: 0 });
  });

  it('kicks away from wall when rotating T near left edge', () => {
    const result = attemptSrsPlusRotation({
      pieceType: 'T',
      x: -1,
      y: 18,
      rotation: 0,
      direction: 'cw',
      cellsFor: pieceCellsFor,
      isBlocked: (x, y) => x < 0 || x >= 10 || y >= 40,
    });

    expect(result.success).toBe(true);
    expect(result.rotation).toBe(1);
  });

  it('does not include downward 180 kicks for vertical S piece states', () => {
    const clockwiseVerticalKicks = getKickTests('S', 1, '180');
    const counterClockwiseVerticalKicks = getKickTests('S', 3, '180');

    expect(clockwiseVerticalKicks.every((kick) => kick.y >= 0)).toBe(true);
    expect(counterClockwiseVerticalKicks.every((kick) => kick.y >= 0)).toBe(true);
  });

  it('applies the same vertical 180 down-kick restriction to other JLSTZ pieces', () => {
    const otherPieces: PieceType[] = ['T', 'Z'];

    for (const pieceType of otherPieces) {
      expect(getKickTests(pieceType, 1, '180').every((kick) => kick.y >= 0)).toBe(true);
      expect(getKickTests(pieceType, 3, '180').every((kick) => kick.y >= 0)).toBe(true);
    }
  });

  it('does not down-kick an S piece into an SRS-X-style 180 tuck', () => {
    const boardWithoutActive = [
      '..........',
      '..####....',
      '#..#######',
      '##.#######',
    ];

    const result = attemptSrsPlusRotation({
      pieceType: 'S',
      x: 0,
      y: 0,
      rotation: 3,
      direction: '180',
      cellsFor: pieceCellsFor,
      isBlocked: (x, y) =>
        x < 0 ||
        x >= 10 ||
        y >= boardWithoutActive.length ||
        (y >= 0 && boardWithoutActive[y][x] === '#'),
    });

    expect(result).not.toMatchObject({
      success: true,
      x: 0,
      y: 1,
      rotation: 1,
    });
  });
});
