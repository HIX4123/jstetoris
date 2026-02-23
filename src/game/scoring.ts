import type { ScoreBreakdown, ScoringEvent, TSpinType } from './types';

const LINE_CLEAR_BASE: Record<number, number> = {
  0: 0,
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

const TSPIN_BASE: Record<number, number> = {
  0: 400,
  1: 800,
  2: 1200,
  3: 1600,
};

const TSPIN_MINI_BASE: Record<number, number> = {
  0: 100,
  1: 200,
  2: 400,
};

const PERFECT_CLEAR_BASE: Record<number, number> = {
  1: 800,
  2: 1200,
  3: 1800,
  4: 2000,
};

const getBaseForTSpin = (lines: number, tspin: TSpinType): number => {
  if (tspin === 'full') {
    return TSPIN_BASE[lines] ?? 0;
  }

  if (tspin === 'mini') {
    return TSPIN_MINI_BASE[lines] ?? 0;
  }

  return LINE_CLEAR_BASE[lines] ?? 0;
};

export const isDifficultClear = (lines: number, tspin: TSpinType): boolean => {
  if (lines <= 0) {
    return false;
  }

  if (lines === 4) {
    return true;
  }

  return tspin !== 'none';
};

export const keepsBackToBack = (lines: number, tspin: TSpinType): boolean => {
  if (isDifficultClear(lines, tspin)) {
    return true;
  }

  return lines === 0 && tspin !== 'none';
};

export const calculateScore = (event: ScoringEvent): ScoreBreakdown => {
  const level = Math.max(event.level, 1);
  const base = getBaseForTSpin(event.lines, event.tspin) * level;
  const difficult = isDifficultClear(event.lines, event.tspin);
  const keepsB2B = keepsBackToBack(event.lines, event.tspin);
  const b2bBonus = difficult && event.b2bActive ? Math.floor(base * 0.5) : 0;
  const comboBonus = event.lines > 0 && event.combo > 0 ? 50 * event.combo * level : 0;

  let perfectClearBonus = 0;
  if (event.perfectClear && event.lines > 0) {
    const basePc = PERFECT_CLEAR_BASE[event.lines] ?? 0;
    const isB2bTetris = event.lines === 4 && event.b2bActive;
    perfectClearBonus = (isB2bTetris ? 3200 : basePc) * level;
  }

  const dropBonus = event.softDropCells + event.hardDropCells * 2;
  const total = base + b2bBonus + comboBonus + perfectClearBonus + dropBonus;

  return {
    base,
    b2bBonus,
    comboBonus,
    perfectClearBonus,
    dropBonus,
    total,
    difficult,
    keepsB2B,
  };
};
