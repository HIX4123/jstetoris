import { describe, expect, it } from 'vitest';

import { attemptSrsPlusRotation, getKickTests } from './srsPlus';

import type { PieceType, Point, Rotation } from '../types';

const cellsFor = (pieceType: PieceType, rotation: Rotation): readonly Point[] => {
  if (pieceType !== 'T') {
    return [];
  }

  const cells: Record<Rotation, Point[]> = {
    0: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    1: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    2: [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    3: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  };

  return cells[rotation];
};

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
      cellsFor,
      isBlocked: (x, y) => x < 0 || x >= 10 || y >= 40,
    });

    expect(result.success).toBe(true);
    expect(result.rotation).toBe(1);
  });
});
