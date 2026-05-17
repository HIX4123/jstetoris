import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_HANDLING,
  insertLeaderboardEntry,
  loadHandling,
  loadHighScore,
  loadLeaderboard,
  normalizeHandling,
  qualifiesForLeaderboard,
  saveHandling,
  saveHighScore,
  saveLeaderboard,
} from './storage';

import type { LeaderboardEntry } from './types';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = [...this.values.keys()];
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('storage helpers', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
  });

  it('normalizes handling into allowed ranges', () => {
    const normalized = normalizeHandling({
      dasMs: 999,
      arrMs: -100,
      sdfG: 200,
    });

    expect(normalized).toEqual({
      dasMs: 300,
      arrMs: 0,
      sdfG: 40,
    });
  });

  it('roundtrips handling via localStorage', () => {
    saveHandling({
      dasMs: 120,
      arrMs: 5,
      sdfG: 18,
    });

    expect(loadHandling()).toEqual({
      dasMs: 120,
      arrMs: 5,
      sdfG: 18,
    });
  });

  it('falls back to defaults for invalid payload', () => {
    globalThis.localStorage.setItem('tetris_handling_v1', '{invalid');

    expect(loadHandling()).toEqual(DEFAULT_HANDLING);
  });

  it('saves and loads high score as non-negative integer', () => {
    saveHighScore(9876.9);
    expect(loadHighScore()).toBe(9876);
  });

  it('falls back to 0 for invalid high score payload', () => {
    globalThis.localStorage.setItem('tetris_high_score_v1', 'NaN');
    expect(loadHighScore()).toBe(0);
  });

  it('sorts and roundtrips leaderboard entries by score then age', () => {
    const entries: LeaderboardEntry[] = [
      { id: 'middle', name: 'MID', score: 200, level: 2, lines: 8, createdAt: 2 },
      { id: 'newer-tie', name: 'NEW', score: 300, level: 3, lines: 12, createdAt: 3 },
      { id: 'older-tie', name: 'OLD', score: 300, level: 3, lines: 12, createdAt: 1 },
    ];

    saveLeaderboard(entries);

    expect(loadLeaderboard().map((entry) => entry.id)).toEqual(['older-tie', 'newer-tie', 'middle']);
  });

  it('keeps only the top 20 leaderboard entries', () => {
    const entries = Array.from({ length: 25 }, (_, index): LeaderboardEntry => ({
      id: `score-${index}`,
      name: 'PLAYER',
      score: index,
      level: 1,
      lines: 0,
      createdAt: index,
    }));

    const leaderboard = insertLeaderboardEntry(entries, {
      id: 'bonus',
      name: 'ACE',
      score: 100,
      level: 4,
      lines: 20,
      createdAt: 100,
    });

    expect(leaderboard).toHaveLength(20);
    expect(leaderboard[0].id).toBe('bonus');
    expect(leaderboard.at(-1)?.score).toBe(6);
  });

  it('normalizes leaderboard names and invalid numeric fields safely', () => {
    globalThis.localStorage.setItem(
      'tetris_leaderboard_v1',
      JSON.stringify([
        { id: 'bad-score', name: 'BAD', score: 'NaN', level: 1, lines: 0, createdAt: 1 },
        { id: 'negative', name: '   ', score: -10, level: 0, lines: -5, createdAt: -1 },
        { id: 'long-name', name: '  LONGPLAYERNAME  ', score: 10, level: 2, lines: 3, createdAt: 2 },
      ]),
    );

    expect(loadLeaderboard()).toEqual([
      { id: 'long-name', name: 'LONGPLAYERNA', score: 10, level: 2, lines: 3, createdAt: 2 },
      { id: 'negative', name: 'PLAYER', score: 0, level: 1, lines: 0, createdAt: 0 },
    ]);
  });

  it('falls back to an empty leaderboard for invalid payload', () => {
    globalThis.localStorage.setItem('tetris_leaderboard_v1', '{invalid');
    expect(loadLeaderboard()).toEqual([]);
  });

  it('detects whether a score qualifies for the top 20', () => {
    const fullLeaderboard = Array.from({ length: 20 }, (_, index): LeaderboardEntry => ({
      id: `entry-${index}`,
      name: 'PLAYER',
      score: 100 - index,
      level: 1,
      lines: 0,
      createdAt: index,
    }));

    expect(qualifiesForLeaderboard(fullLeaderboard.slice(0, 19), 0)).toBe(true);
    expect(qualifiesForLeaderboard(fullLeaderboard, 82)).toBe(true);
    expect(qualifiesForLeaderboard(fullLeaderboard, 81)).toBe(false);
  });
});
