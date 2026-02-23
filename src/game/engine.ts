import { attemptSrsPlusRotation } from './rotation/srsPlus';
import { calculateScore } from './scoring';
import { DEFAULT_HANDLING, normalizeHandling } from './storage';

import type {
  ActivePiece,
  EngineConfig,
  GameAction,
  GameEngine,
  GameSnapshot,
  GameStatus,
  PieceType,
  Point,
  Rotation,
  TSpinType,
} from './types';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 40;
export const HIDDEN_ROWS = 20;
export const VISIBLE_ROWS = 20;
export const NEXT_PREVIEW_COUNT = 5;

const FRAME_MS = 1000 / 60;
const LOCK_DELAY_MS = 500;
const LOCK_RESET_LIMIT = 15;
const SPAWN_X = 3;
const SPAWN_Y = 18;

const PIECE_ORDER: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

type Board = (PieceType | null)[][];

interface InternalState {
  status: GameStatus;
  board: Board;
  active: ActivePiece | null;
  hold: PieceType | null;
  canHold: boolean;
  queue: PieceType[];
  bag: PieceType[];
  score: number;
  lines: number;
  level: number;
  goal: number;
  combo: number;
  b2bChain: number;
  handling: typeof DEFAULT_HANDLING;
  softDropActive: boolean;
  gravityCarry: number;
  random: () => number;
}

const createEmptyRow = (): (PieceType | null)[] => Array.from({ length: BOARD_WIDTH }, () => null);

const createEmptyBoard = (): Board => Array.from({ length: BOARD_HEIGHT }, () => createEmptyRow());

export const createShuffledBag = (random: () => number): PieceType[] => {
  const bag = [...PIECE_ORDER];

  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = bag[index];
    bag[index] = bag[swapIndex];
    bag[swapIndex] = current;
  }

  return bag;
};

const PIECE_CELLS: Record<PieceType, readonly (readonly Point[])[]> = {
  I: [
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ],
    [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
    ],
    [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
    ],
  ],
  O: [
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  ],
  T: [
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  ],
  S: [
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  ],
  Z: [
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
    ],
  ],
  J: [
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ],
  ],
  L: [
    [
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
    ],
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  ],
};

export const gravityForLevel = (level: number): number => {
  const base = [
    0,
    0.01667,
    0.021017,
    0.026977,
    0.035256,
    0.04693,
    0.06361,
    0.0879,
    0.1236,
    0.1775,
    0.2598,
    0.388,
    0.59,
    0.92,
    1.46,
    2.36,
  ];

  if (level <= 15) {
    return base[Math.max(level, 1)];
  }

  let gravity = base[15];
  for (let lv = 16; lv <= level; lv += 1) {
    gravity *= 1.2;
  }

  return gravity;
};

export const linesToLevel = (lines: number): number => {
  if (lines < 150) {
    return Math.floor(lines / 10) + 1;
  }

  return 16 + Math.floor((lines - 150) / 10);
};

export const levelGoalLines = (level: number): number => {
  if (level <= 15) {
    return level * 10;
  }

  return 150 + (level - 15) * 10;
};

const pieceCellsFor = (pieceType: PieceType, rotation: Rotation): readonly Point[] => PIECE_CELLS[pieceType][rotation];

const getAbsoluteCells = (piece: ActivePiece): Point[] =>
  pieceCellsFor(piece.type, piece.rotation).map((cell) => ({ x: piece.x + cell.x, y: piece.y + cell.y }));

const createActivePiece = (pieceType: PieceType): ActivePiece => ({
  type: pieceType,
  x: SPAWN_X,
  y: SPAWN_Y,
  rotation: 0,
  lockDelayMs: 0,
  lockResets: 0,
  lastAction: 'none',
  lastKickIndex: null,
  softDropCells: 0,
  hardDropCells: 0,
});

const isOutOfBounds = (x: number, y: number): boolean => x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT;

const isCellBlocked = (board: Board, x: number, y: number): boolean => {
  if (isOutOfBounds(x, y)) {
    return true;
  }

  if (y < 0) {
    return false;
  }

  return board[y][x] !== null;
};

const collides = (board: Board, piece: ActivePiece): boolean =>
  getAbsoluteCells(piece).some((cell) => isCellBlocked(board, cell.x, cell.y));

const isGrounded = (board: Board, piece: ActivePiece): boolean => {
  const moved = {
    ...piece,
    y: piece.y + 1,
  };

  return collides(board, moved);
};

const normalizeVisiblePoint = (point: Point): Point | null => {
  const visibleY = point.y - HIDDEN_ROWS;

  if (visibleY < 0 || visibleY >= VISIBLE_ROWS) {
    return null;
  }

  return { x: point.x, y: visibleY };
};

const computeGhostCells = (board: Board, active: ActivePiece | null): Point[] => {
  if (!active) {
    return [];
  }

  const ghost = { ...active };

  while (!collides(board, { ...ghost, y: ghost.y + 1 })) {
    ghost.y += 1;
  }

  return getAbsoluteCells(ghost)
    .map(normalizeVisiblePoint)
    .filter((point): point is Point => point !== null);
};

const detectTSpin = (board: Board, piece: ActivePiece): TSpinType => {
  if (piece.type !== 'T' || piece.lastAction !== 'rotate') {
    return 'none';
  }

  const pivot = {
    x: piece.x + 1,
    y: piece.y + 1,
  };

  const corners: Point[] = [
    { x: pivot.x - 1, y: pivot.y - 1 },
    { x: pivot.x + 1, y: pivot.y - 1 },
    { x: pivot.x - 1, y: pivot.y + 1 },
    { x: pivot.x + 1, y: pivot.y + 1 },
  ];

  const occupiedCorners = corners.filter((corner) => isCellBlocked(board, corner.x, corner.y)).length;
  if (occupiedCorners < 3) {
    return 'none';
  }

  const frontCornerIndexes: Record<Rotation, [number, number]> = {
    0: [0, 1],
    1: [1, 3],
    2: [2, 3],
    3: [0, 2],
  };

  const [firstFront, secondFront] = frontCornerIndexes[piece.rotation];
  const frontOccupied = [corners[firstFront], corners[secondFront]].filter((corner) =>
    isCellBlocked(board, corner.x, corner.y),
  ).length;

  if (frontOccupied === 2) {
    return 'full';
  }

  return 'mini';
};

const clearLines = (board: Board): number => {
  const filledRows: number[] = [];

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    if (board[y].every((cell) => cell !== null)) {
      filledRows.push(y);
    }
  }

  if (filledRows.length === 0) {
    return 0;
  }

  for (const rowIndex of [...filledRows].reverse()) {
    board.splice(rowIndex, 1);
    board.unshift(createEmptyRow());
  }

  return filledRows.length;
};

const isPerfectClear = (board: Board): boolean => board.every((row) => row.every((cell) => cell === null));

const createInitialState = (random: () => number, handling = DEFAULT_HANDLING): InternalState => ({
  status: 'ready',
  board: createEmptyBoard(),
  active: null,
  hold: null,
  canHold: true,
  queue: [],
  bag: [],
  score: 0,
  lines: 0,
  level: 1,
  goal: 10,
  combo: -1,
  b2bChain: 0,
  handling,
  softDropActive: false,
  gravityCarry: 0,
  random,
});

export const createGameEngine = (config?: EngineConfig): GameEngine => {
  let state = createInitialState(config?.random ?? Math.random, normalizeHandling(config?.handling ?? {}));

  const fillQueue = (targetLength: number): void => {
    while (state.queue.length < targetLength) {
      if (state.bag.length === 0) {
        state.bag = createShuffledBag(state.random);
      }

      const nextType = state.bag.shift();
      if (!nextType) {
        break;
      }
      state.queue.push(nextType);
    }
  };

  const spawnFromQueue = (): boolean => {
    fillQueue(NEXT_PREVIEW_COUNT + 1);
    const nextType = state.queue.shift();

    if (!nextType) {
      return false;
    }

    const spawned = createActivePiece(nextType);

    if (collides(state.board, spawned)) {
      state.active = null;
      state.status = 'gameover';
      return false;
    }

    state.active = spawned;
    return true;
  };

  const resetForNewRun = (): void => {
    state = createInitialState(state.random, state.handling);
    fillQueue(NEXT_PREVIEW_COUNT + 1);
    spawnFromQueue();
    state.status = 'running';
  };

  const maybeResetLockTimer = (): void => {
    if (!state.active) {
      return;
    }

    if (state.active.lockResets >= LOCK_RESET_LIMIT) {
      return;
    }

    if (isGrounded(state.board, state.active)) {
      state.active.lockDelayMs = 0;
      state.active.lockResets += 1;
    }
  };

  const tryShift = (dx: number, dy: number, fromPlayerInput: boolean): boolean => {
    if (!state.active) {
      return false;
    }

    const next = {
      ...state.active,
      x: state.active.x + dx,
      y: state.active.y + dy,
    };

    if (collides(state.board, next)) {
      return false;
    }

    const wasGrounded = isGrounded(state.board, state.active);

    state.active.x = next.x;
    state.active.y = next.y;
    state.active.lastKickIndex = null;

    if (dy !== 0) {
      state.active.lastAction = 'none';
    } else if (fromPlayerInput) {
      state.active.lastAction = 'move';
    }

    if (fromPlayerInput && wasGrounded) {
      maybeResetLockTimer();
    }

    return true;
  };

  const lockActivePiece = (): void => {
    if (!state.active) {
      return;
    }

    const lockedPiece = state.active;
    for (const cell of getAbsoluteCells(lockedPiece)) {
      if (cell.y >= 0 && cell.y < BOARD_HEIGHT && cell.x >= 0 && cell.x < BOARD_WIDTH) {
        state.board[cell.y][cell.x] = lockedPiece.type;
      }
    }

    const tspin = detectTSpin(state.board, lockedPiece);
    const linesCleared = clearLines(state.board);
    const perfectClear = isPerfectClear(state.board);

    if (linesCleared > 0) {
      state.combo += 1;
    } else {
      state.combo = -1;
    }

    const scoreBreakdown = calculateScore({
      level: state.level,
      lines: linesCleared,
      tspin,
      b2bActive: state.b2bChain > 0,
      combo: state.combo,
      perfectClear,
      softDropCells: lockedPiece.softDropCells,
      hardDropCells: lockedPiece.hardDropCells,
    });

    state.score += scoreBreakdown.total;

    if (linesCleared > 0) {
      if (scoreBreakdown.difficult) {
        state.b2bChain += 1;
      } else {
        state.b2bChain = 0;
      }
    }

    state.lines += linesCleared;
    state.level = linesToLevel(state.lines);
    state.goal = levelGoalLines(state.level);
    state.canHold = true;
    state.gravityCarry = 0;

    spawnFromQueue();
  };

  const tryRotate = (direction: 'cw' | 'ccw' | '180'): boolean => {
    if (!state.active) {
      return false;
    }

    const wasGrounded = isGrounded(state.board, state.active);

    const result = attemptSrsPlusRotation({
      pieceType: state.active.type,
      x: state.active.x,
      y: state.active.y,
      rotation: state.active.rotation,
      direction,
      cellsFor: pieceCellsFor,
      isBlocked: (x, y) => isCellBlocked(state.board, x, y),
    });

    if (!result.success) {
      return false;
    }

    state.active.x = result.x;
    state.active.y = result.y;
    state.active.rotation = result.rotation;
    state.active.lastAction = 'rotate';
    state.active.lastKickIndex = result.kickIndex;

    if (wasGrounded) {
      maybeResetLockTimer();
    }

    return true;
  };

  const hardDrop = (): boolean => {
    if (!state.active) {
      return false;
    }

    let dropped = 0;
    while (tryShift(0, 1, false)) {
      dropped += 1;
    }

    state.active.hardDropCells += dropped;
    if (dropped > 0) {
      state.active.lastAction = 'none';
    }

    lockActivePiece();
    return true;
  };

  const doHold = (): boolean => {
    if (!state.active || !state.canHold) {
      return false;
    }

    const currentType = state.active.type;

    if (state.hold) {
      const swapType = state.hold;
      state.hold = currentType;
      state.active = createActivePiece(swapType);

      if (collides(state.board, state.active)) {
        state.active = null;
        state.status = 'gameover';
        return false;
      }
    } else {
      state.hold = currentType;
      state.active = null;
      spawnFromQueue();
    }

    state.canHold = false;
    state.gravityCarry = 0;
    return true;
  };

  const handleActionWhileRunning = (action: GameAction): boolean => {
    switch (action.type) {
      case 'moveLeft':
        return tryShift(-1, 0, true);
      case 'moveRight':
        return tryShift(1, 0, true);
      case 'rotateCW':
        return tryRotate('cw');
      case 'rotateCCW':
        return tryRotate('ccw');
      case 'rotate180':
        return tryRotate('180');
      case 'hardDrop':
        return hardDrop();
      case 'hold':
        return doHold();
      default:
        return false;
    }
  };

  const dispatch = (action: GameAction): boolean => {
    if (action.type === 'setHandling') {
      state.handling = normalizeHandling(action.payload);
      return true;
    }

    if (action.type === 'restart') {
      resetForNewRun();
      return true;
    }

    if (action.type === 'start') {
      if (state.status === 'paused') {
        state.status = 'running';
        return true;
      }

      if (state.status === 'ready' || state.status === 'gameover') {
        resetForNewRun();
        return true;
      }

      return false;
    }

    if (action.type === 'togglePause') {
      if (state.status === 'running') {
        state.status = 'paused';
        return true;
      }

      if (state.status === 'paused') {
        state.status = 'running';
        return true;
      }

      return false;
    }

    if (state.status !== 'running') {
      return false;
    }

    return handleActionWhileRunning(action);
  };

  const tick = (dtMs: number): void => {
    if (state.status !== 'running' || !state.active) {
      return;
    }

    const gravity = gravityForLevel(state.level);
    const effectiveGravity = state.softDropActive ? Math.max(gravity, state.handling.sdfG) : gravity;
    state.gravityCarry += (effectiveGravity * dtMs) / FRAME_MS;

    while (state.gravityCarry >= 1 && state.active) {
      const moved = tryShift(0, 1, false);
      if (!moved) {
        state.gravityCarry = 0;
        break;
      }

      if (state.softDropActive) {
        state.active.softDropCells += 1;
      }

      state.gravityCarry -= 1;
    }

    if (!state.active) {
      return;
    }

    if (isGrounded(state.board, state.active)) {
      state.active.lockDelayMs += dtMs;

      if (state.active.lockDelayMs >= LOCK_DELAY_MS) {
        lockActivePiece();
      }
    } else {
      state.active.lockDelayMs = 0;
    }
  };

  const setSoftDropActive = (active: boolean): void => {
    state.softDropActive = active;
  };

  const getHandling = () => ({ ...state.handling });

  const getSnapshot = (): GameSnapshot => {
    const visibleBoard = state.board.slice(HIDDEN_ROWS).map((row) => [...row]);
    const activeCells = state.active
      ? getAbsoluteCells(state.active)
          .map(normalizeVisiblePoint)
          .filter((point): point is Point => point !== null)
      : [];

    return {
      status: state.status,
      boardVisible: visibleBoard,
      activeCells,
      activeType: state.active?.type ?? null,
      ghostCells: computeGhostCells(state.board, state.active),
      hold: state.hold,
      next: state.queue.slice(0, NEXT_PREVIEW_COUNT),
      score: state.score,
      level: state.level,
      lines: state.lines,
      goal: state.goal,
      combo: state.combo,
      b2bChain: state.b2bChain,
      handling: { ...state.handling },
    };
  };

  fillQueue(NEXT_PREVIEW_COUNT + 1);

  return {
    dispatch,
    tick,
    setSoftDropActive,
    getSnapshot,
    getHandling,
  };
};
