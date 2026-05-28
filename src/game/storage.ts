import { DEFAULT_GAME_MODE, GAME_MODE_IDS, GAME_MODE_RECORD_METRICS, isGameModeId } from './modes';

import type { GameModeId, HandlingConfig, LeaderboardCandidate, LeaderboardEntry } from './types';

const STORAGE_KEY = 'tetris_handling_v1';
const HIGH_SCORE_KEY = 'tetris_high_score_v1';
const LEADERBOARD_KEY = 'tetris_leaderboard_v1';
const BEST_RECORDS_KEY = 'tetris_best_records_by_mode_v2';
const LEADERBOARDS_KEY = 'tetris_leaderboards_by_mode_v2';
const LEADERBOARD_LIMIT = 20;
const LEADERBOARD_NAME_MAX_LENGTH = 12;
const DEFAULT_LEADERBOARD_NAME = 'PLAYER';

const DAS_RANGE = { min: 0, max: 300 };
const ARR_RANGE = { min: 0, max: 100 };
const SDF_RANGE = { min: 1, max: 40 };

export const DEFAULT_HANDLING: HandlingConfig = {
  dasMs: 165,
  arrMs: 0,
  sdfG: 20,
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeInteger = (value: unknown, min: number): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(min, Math.floor(parsed));
};

const normalizeLeaderboardName = (name: unknown): string => {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  return (trimmed || DEFAULT_LEADERBOARD_NAME).slice(0, LEADERBOARD_NAME_MAX_LENGTH);
};

const readJson = (key: string): unknown => {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage failure should not break gameplay.
  }
};

const normalizeMetricForMode = (mode: GameModeId, value: unknown): number | null => {
  const normalized = normalizeInteger(value, 0);

  if (normalized === null) {
    return null;
  }

  if (GAME_MODE_RECORD_METRICS[mode] === 'time' && normalized <= 0) {
    return null;
  }

  return normalized;
};

const createEmptyBestMetrics = (): Record<GameModeId, number | null> => ({
  marathon: null,
  fortyLines: null,
  blitz: null,
});

const createEmptyLeaderboards = (): Record<GameModeId, LeaderboardEntry[]> => ({
  marathon: [],
  fortyLines: [],
  blitz: [],
});

const compareLeaderboardEntries = (mode: GameModeId) => (a: LeaderboardEntry, b: LeaderboardEntry): number => {
  if (GAME_MODE_RECORD_METRICS[mode] === 'time') {
    return a.elapsedMs - b.elapsedMs || b.score - a.score || a.createdAt - b.createdAt;
  }

  return b.score - a.score || a.createdAt - b.createdAt;
};

const normalizeLeaderboardEntry = (value: unknown, fallbackMode: GameModeId): LeaderboardEntry | null => {
  if (!isRecord(value)) {
    return null;
  }

  const mode = isGameModeId(value.mode) ? value.mode : fallbackMode;
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const score = normalizeInteger(value.score, 0);
  const lines = normalizeInteger(value.lines, 0);
  const elapsedMs = normalizeInteger(value.elapsedMs, 0) ?? 0;
  const createdAt = normalizeInteger(value.createdAt, 0);

  if (!id || score === null || lines === null || createdAt === null) {
    return null;
  }

  if (GAME_MODE_RECORD_METRICS[mode] === 'time' && elapsedMs <= 0) {
    return null;
  }

  return {
    id,
    mode,
    name: normalizeLeaderboardName(value.name),
    score,
    lines,
    elapsedMs,
    createdAt,
  };
};

const normalizeLeaderboardEntries = (mode: GameModeId, entries: unknown): LeaderboardEntry[] => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => normalizeLeaderboardEntry(entry, mode))
    .filter((entry): entry is LeaderboardEntry => entry !== null && entry.mode === mode)
    .sort(compareLeaderboardEntries(mode))
    .slice(0, LEADERBOARD_LIMIT);
};

const loadLegacyHighScore = (): number => {
  try {
    const raw = globalThis.localStorage?.getItem(HIGH_SCORE_KEY);
    const parsed = raw ? Number(raw) : 0;

    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(0, Math.floor(parsed));
  } catch {
    return 0;
  }
};

const loadLegacyLeaderboard = (): LeaderboardEntry[] => {
  const parsed = readJson(LEADERBOARD_KEY);
  return normalizeLeaderboardEntries(DEFAULT_GAME_MODE, parsed);
};

const normalizeBestMetrics = (value: unknown): Record<GameModeId, number | null> => {
  const metrics = createEmptyBestMetrics();

  if (!isRecord(value)) {
    metrics.marathon = loadLegacyHighScore();
    return metrics;
  }

  for (const mode of GAME_MODE_IDS) {
    metrics[mode] = normalizeMetricForMode(mode, value[mode]);
  }

  if (metrics.marathon === null) {
    metrics.marathon = loadLegacyHighScore();
  }

  return metrics;
};

const loadBestMetrics = (): Record<GameModeId, number | null> => normalizeBestMetrics(readJson(BEST_RECORDS_KEY));

const loadLeaderboards = (): Record<GameModeId, LeaderboardEntry[]> => {
  const parsed = readJson(LEADERBOARDS_KEY);
  const leaderboards = createEmptyLeaderboards();

  if (!isRecord(parsed)) {
    leaderboards.marathon = loadLegacyLeaderboard();
    return leaderboards;
  }

  for (const mode of GAME_MODE_IDS) {
    leaderboards[mode] = normalizeLeaderboardEntries(mode, parsed[mode]);
  }

  return leaderboards;
};

export const normalizeHandling = (partial: Partial<HandlingConfig>): HandlingConfig => ({
  dasMs: clamp(
    Number.isFinite(partial.dasMs) ? Math.round(partial.dasMs ?? DEFAULT_HANDLING.dasMs) : DEFAULT_HANDLING.dasMs,
    DAS_RANGE.min,
    DAS_RANGE.max,
  ),
  arrMs: clamp(
    Number.isFinite(partial.arrMs) ? Math.round(partial.arrMs ?? DEFAULT_HANDLING.arrMs) : DEFAULT_HANDLING.arrMs,
    ARR_RANGE.min,
    ARR_RANGE.max,
  ),
  sdfG: clamp(
    Number.isFinite(partial.sdfG) ? Number(partial.sdfG ?? DEFAULT_HANDLING.sdfG) : DEFAULT_HANDLING.sdfG,
    SDF_RANGE.min,
    SDF_RANGE.max,
  ),
});

export const loadHandling = (): HandlingConfig => {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);

    if (!raw) {
      return { ...DEFAULT_HANDLING };
    }

    const parsed = JSON.parse(raw) as Partial<HandlingConfig>;
    return normalizeHandling(parsed);
  } catch {
    return { ...DEFAULT_HANDLING };
  }
};

export const saveHandling = (handling: HandlingConfig): void => {
  try {
    const normalized = normalizeHandling(handling);
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Storage failure should not break gameplay.
  }
};

export const loadBestMetric = (mode: GameModeId): number | null => {
  const metric = loadBestMetrics()[mode];

  if (GAME_MODE_RECORD_METRICS[mode] === 'score') {
    return metric ?? 0;
  }

  return metric;
};

export const saveBestMetric = (mode: GameModeId, value: number): void => {
  const normalized = normalizeMetricForMode(mode, value);

  if (normalized === null) {
    return;
  }

  const metrics = loadBestMetrics();
  metrics[mode] = normalized;
  writeJson(BEST_RECORDS_KEY, metrics);
};

export const isBetterMetric = (mode: GameModeId, value: number, current: number | null): boolean => {
  const normalized = normalizeMetricForMode(mode, value);

  if (normalized === null) {
    return false;
  }

  if (current === null) {
    return true;
  }

  return GAME_MODE_RECORD_METRICS[mode] === 'time' ? normalized < current : normalized > current;
};

export const loadHighScore = (mode: GameModeId = DEFAULT_GAME_MODE): number => loadBestMetric(mode) ?? 0;

export const saveHighScore = (score: number, mode: GameModeId = DEFAULT_GAME_MODE): void => {
  saveBestMetric(mode, score);
};

export const loadLeaderboard = (mode: GameModeId = DEFAULT_GAME_MODE): LeaderboardEntry[] => loadLeaderboards()[mode];

export const saveLeaderboard = (mode: GameModeId, entries: LeaderboardEntry[]): void => {
  const leaderboards = loadLeaderboards();
  leaderboards[mode] = normalizeLeaderboardEntries(mode, entries);
  writeJson(LEADERBOARDS_KEY, leaderboards);
};

export const qualifiesForLeaderboard = (
  mode: GameModeId,
  entries: LeaderboardEntry[],
  candidate: LeaderboardCandidate,
): boolean => {
  const normalizedScore = normalizeInteger(candidate.score, 0);
  const normalizedLines = normalizeInteger(candidate.lines, 0);
  const normalizedElapsedMs = normalizeInteger(candidate.elapsedMs, 0);

  if (normalizedScore === null || normalizedLines === null || normalizedElapsedMs === null) {
    return false;
  }

  const candidateEntry: LeaderboardEntry = {
    id: 'candidate',
    mode,
    name: DEFAULT_LEADERBOARD_NAME,
    score: normalizedScore,
    lines: normalizedLines,
    elapsedMs: normalizedElapsedMs,
    createdAt: Number.MAX_SAFE_INTEGER,
  };

  if (GAME_MODE_RECORD_METRICS[mode] === 'time' && candidateEntry.elapsedMs <= 0) {
    return false;
  }

  const normalizedEntries = normalizeLeaderboardEntries(mode, entries);
  return (
    normalizedEntries.length < LEADERBOARD_LIMIT ||
    compareLeaderboardEntries(mode)(candidateEntry, normalizedEntries[LEADERBOARD_LIMIT - 1]) < 0
  );
};

export const insertLeaderboardEntry = (
  mode: GameModeId,
  entries: LeaderboardEntry[],
  entry: LeaderboardEntry,
): LeaderboardEntry[] => normalizeLeaderboardEntries(mode, [...entries, { ...entry, mode }]);

export const handlingRanges = {
  dasMs: DAS_RANGE,
  arrMs: ARR_RANGE,
  sdfG: SDF_RANGE,
};
