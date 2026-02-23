import type { HandlingConfig } from './types';

const STORAGE_KEY = 'tetris_handling_v1';
const HIGH_SCORE_KEY = 'tetris_high_score_v1';

const DAS_RANGE = { min: 0, max: 300 };
const ARR_RANGE = { min: 0, max: 100 };
const SDF_RANGE = { min: 1, max: 40 };

export const DEFAULT_HANDLING: HandlingConfig = {
  dasMs: 100,
  arrMs: 0,
  sdfG: 20,
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

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

export const handlingRanges = {
  dasMs: DAS_RANGE,
  arrMs: ARR_RANGE,
  sdfG: SDF_RANGE,
};
