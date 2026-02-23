import type { PieceType, Point, Rotation } from '../types';

export type RotationDirection = 'cw' | 'ccw' | '180';

export interface RotationAttempt {
  pieceType: PieceType;
  x: number;
  y: number;
  rotation: Rotation;
  direction: RotationDirection;
  cellsFor: (pieceType: PieceType, rotation: Rotation) => readonly Point[];
  isBlocked: (x: number, y: number) => boolean;
}

export interface RotationResult {
  success: boolean;
  x: number;
  y: number;
  rotation: Rotation;
  kickIndex: number | null;
}

type KickMap = Record<string, readonly Point[]>;

const JLSTZ_90_KICKS: KickMap = {
  '0>1': [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: -2 },
    { x: -1, y: -2 },
  ],
  '1>0': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
  ],
  '1>2': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
  ],
  '2>1': [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: -2 },
    { x: -1, y: -2 },
  ],
  '2>3': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: -2 },
    { x: 1, y: -2 },
  ],
  '3>2': [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: 2 },
    { x: -1, y: 2 },
  ],
  '3>0': [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: 2 },
    { x: -1, y: 2 },
  ],
  '0>3': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: -2 },
    { x: 1, y: -2 },
  ],
};

const I_90_KICKS: KickMap = {
  '0>1': [
    { x: 0, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: -1 },
    { x: 1, y: 2 },
  ],
  '1>0': [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 1 },
    { x: -1, y: -2 },
  ],
  '1>2': [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 2 },
    { x: 2, y: -1 },
  ],
  '2>1': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: -2 },
    { x: -2, y: 1 },
  ],
  '2>3': [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 1 },
    { x: -1, y: -2 },
  ],
  '3>2': [
    { x: 0, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: -1 },
    { x: 1, y: 2 },
  ],
  '3>0': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: -2 },
    { x: -2, y: 1 },
  ],
  '0>3': [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 2 },
    { x: 2, y: -1 },
  ],
};

const JLSTZ_180_KICKS: KickMap = {
  '0>2': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: 0, y: -1 },
    { x: 2, y: 0 },
    { x: -2, y: 0 },
  ],
  '2>0': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: -1 },
    { x: 0, y: 1 },
    { x: 2, y: 0 },
    { x: -2, y: 0 },
  ],
  '1>3': [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: -1 },
    { x: -1, y: -1 },
  ],
  '3>1': [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
  ],
};

const I_180_KICKS: KickMap = {
  '0>2': [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 2 },
    { x: 2, y: -1 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ],
  '2>0': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: -2 },
    { x: -2, y: 1 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ],
  '1>3': [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 2 },
    { x: -2, y: -1 },
  ],
  '3>1': [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: -2 },
    { x: 2, y: 1 },
  ],
};

const O_KICK: readonly Point[] = [{ x: 0, y: 0 }];

const CW_ROTATION: Rotation[] = [1, 2, 3, 0];
const CCW_ROTATION: Rotation[] = [3, 0, 1, 2];
const DOUBLE_ROTATION: Rotation[] = [2, 3, 0, 1];

const rotationKey = (from: Rotation, to: Rotation): string => `${from}>${to}`;

const getTargetRotation = (rotation: Rotation, direction: RotationDirection): Rotation => {
  if (direction === 'cw') {
    return CW_ROTATION[rotation];
  }

  if (direction === 'ccw') {
    return CCW_ROTATION[rotation];
  }

  return DOUBLE_ROTATION[rotation];
};

export const getKickTests = (
  pieceType: PieceType,
  from: Rotation,
  direction: RotationDirection,
): readonly Point[] => {
  const to = getTargetRotation(from, direction);

  if (pieceType === 'O') {
    return O_KICK;
  }

  const key = rotationKey(from, to);

  if (direction === '180') {
    return pieceType === 'I' ? I_180_KICKS[key] ?? O_KICK : JLSTZ_180_KICKS[key] ?? O_KICK;
  }

  return pieceType === 'I' ? I_90_KICKS[key] ?? O_KICK : JLSTZ_90_KICKS[key] ?? O_KICK;
};

export const attemptSrsPlusRotation = ({
  pieceType,
  x,
  y,
  rotation,
  direction,
  cellsFor,
  isBlocked,
}: RotationAttempt): RotationResult => {
  const targetRotation = getTargetRotation(rotation, direction);
  const targetCells = cellsFor(pieceType, targetRotation);
  const kickTests = getKickTests(pieceType, rotation, direction);

  for (let index = 0; index < kickTests.length; index += 1) {
    const kick = kickTests[index];
    const testX = x + kick.x;
    const testY = y - kick.y;

    const blocked = targetCells.some((cell) => isBlocked(testX + cell.x, testY + cell.y));

    if (!blocked) {
      return {
        success: true,
        x: testX,
        y: testY,
        rotation: targetRotation,
        kickIndex: index,
      };
    }
  }

  return {
    success: false,
    x,
    y,
    rotation,
    kickIndex: null,
  };
};
