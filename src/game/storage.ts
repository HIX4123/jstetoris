import type { HandlingConfig, LeaderboardEntry } from './types';

const STORAGE_KEY = 'tetris_handling_v1';
const HIGH_SCORE_KEY = 'tetris_high_score_v1';
const LEADERBOARD_KEY = 'tetris_leaderboard_v1';
const LEADERBOARD_LIMIT = 20;
const LEADERBOARD_NAME_MAX_LENGTH = 12;
const DEFAULT_LEADERBOARD_NAME = 'PLAYER';

const DAS_RANGE = { min: 0, max: 300 };
const ARR_RANGE = { min: 0, max: 100 };
const SDF_RANGE = { min: 1, max: 40 };

export const DEFAULT_HANDLING: HandlingConfig = {
  dasMs: 100,
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

const compareLeaderboardEntries = (a: LeaderboardEntry, b: LeaderboardEntry): number =>
  b.score - a.score || a.createdAt - b.createdAt;

const normalizeLeaderboardEntry = (value: unknown): LeaderboardEntry | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const score = normalizeInteger(value.score, 0);
  const level = normalizeInteger(value.level, 1);
  const lines = normalizeInteger(value.lines, 0);
  const createdAt = normalizeInteger(value.createdAt, 0);

  if (!id || score === null || level === null || lines === null || createdAt === null) {
    return null;
  }

  return {
    id,
    name: normalizeLeaderboardName(value.name),
    score,
    level,
    lines,
    createdAt,
  };
};

const normalizeLeaderboardEntries = (entries: unknown): LeaderboardEntry[] => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map(normalizeLeaderboardEntry)
    .filter((entry): entry is LeaderboardEntry => entry !== null)
    .sort(compareLeaderboardEntries)
    .slice(0, LEADERBOARD_LIMIT);
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

export const loadHighScore = (): number => {
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

export const saveHighScore = (score: number): void => {
  try {
    const normalized = Math.max(0, Math.floor(score));
    globalThis.localStorage?.setItem(HIGH_SCORE_KEY, `${normalized}`);
  } catch {
    // Storage failure should not break gameplay.
  }
};

export const loadLeaderboard = (): LeaderboardEntry[] => {
  try {
    const raw = globalThis.localStorage?.getItem(LEADERBOARD_KEY);

    if (!raw) {
      return [];
    }

    return normalizeLeaderboardEntries(JSON.parse(raw));
  } catch {
    return [];
  }
};

export const saveLeaderboard = (entries: LeaderboardEntry[]): void => {
  try {
    globalThis.localStorage?.setItem(LEADERBOARD_KEY, JSON.stringify(normalizeLeaderboardEntries(entries)));
  } catch {
    // Storage failure should not break gameplay.
  }
};

export const qualifiesForLeaderboard = (entries: LeaderboardEntry[], score: number): boolean => {
  const normalizedScore = normalizeInteger(score, 0);

  if (normalizedScore === null) {
    return false;
  }

  const normalizedEntries = normalizeLeaderboardEntries(entries);
  return normalizedEntries.length < LEADERBOARD_LIMIT || normalizedScore > normalizedEntries[LEADERBOARD_LIMIT - 1].score;
};

export const insertLeaderboardEntry = (
  entries: LeaderboardEntry[],
  entry: LeaderboardEntry,
): LeaderboardEntry[] => normalizeLeaderboardEntries([...entries, entry]);

export const handlingRanges = {
  dasMs: DAS_RANGE,
  arrMs: ARR_RANGE,
  sdfG: SDF_RANGE,
};
