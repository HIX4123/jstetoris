import type { AttackBreakdown, AttackEvent, ScoreBreakdown, ScoringEvent, TSpinType } from './types';

const LINE_CLEAR_SCORE: Record<number, number> = {
  0: 0,
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

const TSPIN_SCORE: Record<number, number> = {
  0: 400,
  1: 800,
  2: 1200,
  3: 1600,
  4: 2600,
};

const TSPIN_MINI_SCORE: Record<number, number> = {
  0: 100,
  1: 200,
  2: 400,
  3: 800,
  4: 1600,
};

const LINE_CLEAR_ATTACK: Record<number, number> = {
  0: 0,
  1: 0,
  2: 1,
  3: 2,
  4: 4,
};

const TSPIN_ATTACK: Record<number, number> = {
  0: 0,
  1: 2,
  2: 4,
  3: 6,
};

const TSPIN_MINI_ATTACK: Record<number, number> = {
  0: 0,
  1: 0,
  2: 1,
};

const ALL_CLEAR_SCORE = 3500;
const ALL_CLEAR_ATTACK = 0;

const getBaseScore = (lines: number, tspin: TSpinType): number => {
  if (tspin === 'full') {
    return TSPIN_SCORE[lines] ?? 0;
  }

  if (tspin === 'mini') {
    return TSPIN_MINI_SCORE[lines] ?? 0;
  }

  return LINE_CLEAR_SCORE[lines] ?? 0;
};

const getBaseAttack = (lines: number, tspin: TSpinType): number => {
  if (tspin === 'full') {
    return TSPIN_ATTACK[lines] ?? 0;
  }

  if (tspin === 'mini') {
    return TSPIN_MINI_ATTACK[lines] ?? 0;
  }

  return LINE_CLEAR_ATTACK[lines] ?? 0;
};

const applyComboMultiplier = (baseAttack: number, combo: number): number => {
  if (baseAttack > 0) {
    return Math.floor(baseAttack * (1 + 0.25 * Math.max(combo, 0)));
  }

  if (combo >= 2) {
    return Math.floor(Math.log(1 + 1.25 * combo));
  }

  return 0;
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

export const keepsBackToBack = (lines: number, tspin: TSpinType, perfectClear = false): boolean => {
  if (perfectClear) {
    return true;
  }

  if (lines === 0) {
    return true;
  }

  return isDifficultClear(lines, tspin);
};

export const calculateScore = (event: ScoringEvent): ScoreBreakdown => {
  const base = getBaseScore(event.lines, event.tspin);
  const difficult = isDifficultClear(event.lines, event.tspin);
  const keepsB2B = keepsBackToBack(event.lines, event.tspin, event.perfectClear);
  const b2bBonus = difficult && event.b2bActive ? Math.floor(base * 0.5) : 0;
  const comboBonus = event.lines > 0 && event.combo > 0 ? event.combo * 50 : 0;
  const allClearBonus = event.perfectClear && event.lines > 0 ? ALL_CLEAR_SCORE : 0;
  const dropBonus = event.softDropCells + event.hardDropCells * 2;
  const total = base + b2bBonus + comboBonus + allClearBonus + dropBonus;

  return {
    base,
    b2bBonus,
    comboBonus,
    allClearBonus,
    dropBonus,
    total,
    difficult,
    keepsB2B,
  };
};

export const calculateAttack = (event: AttackEvent): AttackBreakdown => {
  const baseAttack = getBaseAttack(event.lines, event.tspin);
  const comboAttack = applyComboMultiplier(baseAttack, event.combo);
  const difficult = isDifficultClear(event.lines, event.tspin);
  const keepsB2B = keepsBackToBack(event.lines, event.tspin, event.perfectClear);
  const b2bAttack = difficult && event.b2bActive ? 1 : 0;
  const allClearAttack = event.perfectClear && event.lines > 0 ? ALL_CLEAR_ATTACK : 0;
  const surgeAttack = Math.max(0, Math.floor(event.surgeAttack));
  const total = comboAttack + b2bAttack + allClearAttack + surgeAttack;

  return {
    baseAttack,
    comboAttack,
    b2bAttack,
    allClearAttack,
    surgeAttack,
    total,
    difficult,
    keepsB2B,
  };
};
