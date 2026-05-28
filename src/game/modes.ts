import type { GameModeId, GameRecordMetric } from './types';

export const DEFAULT_GAME_MODE: GameModeId = 'marathon';
export const FORTY_LINES_TARGET = 40;
export const BLITZ_DURATION_MS = 120_000;

export const GAME_MODE_IDS: readonly GameModeId[] = ['marathon', 'fortyLines', 'blitz'];

export const GAME_MODE_LABELS: Record<GameModeId, string> = {
  marathon: 'Marathon',
  fortyLines: '40 Lines',
  blitz: 'BLITZ',
};

export const GAME_MODE_RECORD_METRICS: Record<GameModeId, GameRecordMetric> = {
  marathon: 'score',
  fortyLines: 'time',
  blitz: 'score',
};

export const isGameModeId = (value: unknown): value is GameModeId =>
  typeof value === 'string' && GAME_MODE_IDS.includes(value as GameModeId);
