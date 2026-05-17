import { describe, expect, it } from 'vitest';

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  TETRA_LEAGUE_GRAVITY_MARGIN_MS,
  TETRA_LEAGUE_MAX_GRAVITY_G,
  createGameEngine,
  createShuffledBag,
  gravityForElapsedMs,
} from './engine';

import type { GameAction, GameEngine, PieceType } from './types';

const FRAME_MS = 1000 / 60;

const createDeterministicEngine = (): GameEngine =>
  createGameEngine({
    handling: { sdfG: 40 },
    random: () => 0,
  });

const dropActiveToGround = (engine: GameEngine): void => {
  engine.setSoftDropActive(true);
  engine.tick(FRAME_MS);
  engine.setSoftDropActive(false);
};

const expectActiveType = (engine: GameEngine, activeType: PieceType): void => {
  expect(engine.getSnapshot().activeType).toBe(activeType);
};

const createAlmostQuadBoard = (): (PieceType | null)[][] => {
  const board = Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null as PieceType | null),
  );

  for (let y = BOARD_HEIGHT - 4; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      board[y][x] = x === 5 ? null : 'O';
    }
  }

  return board;
};

const createAlmostSingleBoardForO = (): (PieceType | null)[][] => {
  const board = Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null as PieceType | null),
  );

  for (let x = 0; x < BOARD_WIDTH; x += 1) {
    board[BOARD_HEIGHT - 1][x] = x === 4 || x === 5 ? null : 'O';
  }

  return board;
};

const exhaustLockResetsWithGroundedMoves = (engine: GameEngine, activeType: PieceType): void => {
  const moves: GameAction[] = [{ type: 'moveLeft' }, { type: 'moveRight' }];

  for (let index = 0; index < 15; index += 1) {
    expect(engine.dispatch(moves[index % moves.length])).toBe(true);
    engine.tick(490);
    expectActiveType(engine, activeType);
  }
};

describe('engine helpers', () => {
  it('builds 7-bag with unique pieces', () => {
    const bag = createShuffledBag(() => 0.42);
    expect(bag).toHaveLength(7);
    expect(new Set(bag).size).toBe(7);
  });

  it('uses TETRA LEAGUE elapsed-time gravity', () => {
    expect(gravityForElapsedMs(0)).toBe(0.02);
    expect(gravityForElapsedMs(TETRA_LEAGUE_GRAVITY_MARGIN_MS - 1)).toBe(0.02);
    expect(gravityForElapsedMs(TETRA_LEAGUE_GRAVITY_MARGIN_MS + 1000)).toBeCloseTo(0.0235);
    expect(gravityForElapsedMs(Number.MAX_SAFE_INTEGER)).toBe(TETRA_LEAGUE_MAX_GRAVITY_G);
  });

  it('keeps gravity based on elapsed time instead of cleared lines', () => {
    const engine = createGameEngine({
      initialBoard: createAlmostQuadBoard(),
      random: () => 0.999,
    });

    expect(engine.dispatch({ type: 'start' })).toBe(true);
    const initialGravity = engine.getSnapshot().gravityG;
    expect(engine.dispatch({ type: 'rotateCW' })).toBe(true);
    expect(engine.dispatch({ type: 'hardDrop' })).toBe(true);

    const snapshot = engine.getSnapshot();
    expect(snapshot.lines).toBe(4);
    expect(snapshot.gravityG).toBe(initialGravity);
  });

  it('resets grounded lock delay at most 15 times', () => {
    const engine = createDeterministicEngine();

    expect(engine.dispatch({ type: 'start' })).toBe(true);
    expectActiveType(engine, 'O');
    dropActiveToGround(engine);

    exhaustLockResetsWithGroundedMoves(engine, 'O');

    expect(engine.dispatch({ type: 'moveRight' })).toBe(true);
    engine.tick(20);

    expect(engine.getSnapshot().activeType).not.toBe('O');
  });

  it('prevents grounded pieces from becoming airborne after lock resets are exhausted', () => {
    const engine = createDeterministicEngine();

    expect(engine.dispatch({ type: 'start' })).toBe(true);
    expect(engine.dispatch({ type: 'hardDrop' })).toBe(true);
    expectActiveType(engine, 'T');
    dropActiveToGround(engine);

    exhaustLockResetsWithGroundedMoves(engine, 'T');

    expect(engine.dispatch({ type: 'rotateCCW' })).toBe(false);
    engine.tick(20);

    expect(engine.getSnapshot().activeType).not.toBe('T');
  });

  it('adds solo score for line clears and treats all clear as +2 B2B', () => {
    const engine = createGameEngine({
      initialBoard: createAlmostQuadBoard(),
      random: () => 0.999,
    });

    expect(engine.dispatch({ type: 'start' })).toBe(true);
    expectActiveType(engine, 'I');
    expect(engine.dispatch({ type: 'rotateCW' })).toBe(true);
    expect(engine.dispatch({ type: 'hardDrop' })).toBe(true);

    const snapshot = engine.getSnapshot();
    expect(snapshot.score).toBe(4336);
    expect(snapshot.lines).toBe(4);
    expect(snapshot.b2bChain).toBe(2);
    expect(snapshot.lastClearFeedback).toMatchObject({
      id: 1,
      lines: 4,
      tspin: 'none',
      perfectClear: true,
      attack: 4,
      combo: 0,
      b2bChain: 2,
      difficult: true,
    });
  });

  it('reports clear feedback for regular line clears', () => {
    const engine = createGameEngine({
      initialBoard: createAlmostSingleBoardForO(),
      random: () => 0,
    });

    expect(engine.dispatch({ type: 'start' })).toBe(true);
    expectActiveType(engine, 'O');
    expect(engine.dispatch({ type: 'hardDrop' })).toBe(true);

    const feedback = engine.getSnapshot().lastClearFeedback;
    expect(feedback).not.toBeNull();
    if (!feedback) {
      throw new Error('Expected clear feedback after a line clear');
    }

    expect(feedback).toMatchObject({
      id: 1,
      lines: 1,
      tspin: 'none',
      perfectClear: false,
      attack: 0,
      combo: 0,
      b2bChain: 0,
      difficult: false,
    });
  });

  it('does not report clear feedback for locks without line clears', () => {
    const engine = createDeterministicEngine();

    expect(engine.dispatch({ type: 'start' })).toBe(true);
    expect(engine.dispatch({ type: 'hardDrop' })).toBe(true);

    expect(engine.getSnapshot().lastClearFeedback).toBeNull();
  });
});
