import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_HANDLING,
  insertLeaderboardEntry,
  loadBestMetric,
  loadHandling,
  loadHighScore,
  loadLeaderboard,
  normalizeHandling,
  qualifiesForLeaderboard,
  saveBestMetric,
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

const createEntry = (partial: Partial<LeaderboardEntry>): LeaderboardEntry => ({
  id: 'entry',
  mode: 'marathon',
  name: 'PLAYER',
  score: 0,
  lines: 0,
  elapsedMs: 0,
  createdAt: 0,
  ...partial,
});

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

  it('saves and loads best times for 40 Lines', () => {
    saveBestMetric('fortyLines', 61_500.9);

    expect(loadBestMetric('fortyLines')).toBe(61_500);
    expect(loadBestMetric('blitz')).toBe(0);
  });

  it('falls back to 0 for invalid high score payload', () => {
    globalThis.localStorage.setItem('tetris_high_score_v1', 'NaN');
    expect(loadHighScore()).toBe(0);
  });

  it('sorts and roundtrips leaderboard entries by score then age', () => {
    const entries: LeaderboardEntry[] = [
      createEntry({ id: 'middle', name: 'MID', score: 200, lines: 8, createdAt: 2 }),
      createEntry({ id: 'newer-tie', name: 'NEW', score: 300, lines: 12, createdAt: 3 }),
      createEntry({ id: 'older-tie', name: 'OLD', score: 300, lines: 12, createdAt: 1 }),
    ];

    saveLeaderboard('marathon', entries);

    expect(loadLeaderboard().map((entry) => entry.id)).toEqual(['older-tie', 'newer-tie', 'middle']);
  });

  it('sorts 40 Lines leaderboard entries by fastest time', () => {
    const entries: LeaderboardEntry[] = [
      createEntry({ id: 'slow', mode: 'fortyLines', score: 200, lines: 40, elapsedMs: 72_000, createdAt: 1 }),
      createEntry({ id: 'fast', mode: 'fortyLines', score: 100, lines: 40, elapsedMs: 58_000, createdAt: 2 }),
      createEntry({ id: 'tie-old', mode: 'fortyLines', score: 300, lines: 40, elapsedMs: 60_000, createdAt: 1 }),
      createEntry({ id: 'tie-new', mode: 'fortyLines', score: 300, lines: 40, elapsedMs: 60_000, createdAt: 2 }),
    ];

    saveLeaderboard('fortyLines', entries);

    expect(loadLeaderboard('fortyLines').map((entry) => entry.id)).toEqual([
      'fast',
      'tie-old',
      'tie-new',
      'slow',
    ]);
  });

  it('keeps only the top 20 leaderboard entries', () => {
    const entries = Array.from({ length: 25 }, (_, index): LeaderboardEntry =>
      createEntry({
        id: `score-${index}`,
        score: index,
        createdAt: index,
      }),
    );

    const leaderboard = insertLeaderboardEntry(
      'marathon',
      entries,
      createEntry({
        id: 'bonus',
        name: 'ACE',
        score: 100,
        lines: 20,
        createdAt: 100,
      }),
    );

    expect(leaderboard).toHaveLength(20);
    expect(leaderboard[0].id).toBe('bonus');
    expect(leaderboard.at(-1)?.score).toBe(6);
  });

  it('normalizes leaderboard names and invalid numeric fields safely', () => {
    globalThis.localStorage.setItem(
      'tetris_leaderboard_v1',
      JSON.stringify([
        { id: 'bad-score', name: 'BAD', score: 'NaN', lines: 0, createdAt: 1 },
        { id: 'negative', name: '   ', score: -10, lines: -5, createdAt: -1 },
        { id: 'long-name', name: '  LONGPLAYERNAME  ', score: 10, lines: 3, createdAt: 2 },
      ]),
    );

    expect(loadLeaderboard()).toEqual([
      createEntry({ id: 'long-name', name: 'LONGPLAYERNA', score: 10, lines: 3, createdAt: 2 }),
      createEntry({ id: 'negative', name: 'PLAYER', score: 0, lines: 0, createdAt: 0 }),
    ]);
  });

  it('falls back to an empty leaderboard for invalid payload', () => {
    globalThis.localStorage.setItem('tetris_leaderboard_v1', '{invalid');
    expect(loadLeaderboard()).toEqual([]);
  });

  it('detects whether a score qualifies for the top 20', () => {
    const fullLeaderboard = Array.from({ length: 20 }, (_, index): LeaderboardEntry =>
      createEntry({
        id: `entry-${index}`,
        score: 100 - index,
        createdAt: index,
      }),
    );

    expect(
      qualifiesForLeaderboard('marathon', fullLeaderboard.slice(0, 19), {
        mode: 'marathon',
        score: 0,
        lines: 0,
        elapsedMs: 0,
      }),
    ).toBe(true);
    expect(
      qualifiesForLeaderboard('marathon', fullLeaderboard, {
        mode: 'marathon',
        score: 82,
        lines: 0,
        elapsedMs: 0,
      }),
    ).toBe(true);
    expect(
      qualifiesForLeaderboard('marathon', fullLeaderboard, {
        mode: 'marathon',
        score: 81,
        lines: 0,
        elapsedMs: 0,
      }),
    ).toBe(false);
  });

  it('detects whether a 40 Lines time qualifies for the top 20', () => {
    const fullLeaderboard = Array.from({ length: 20 }, (_, index): LeaderboardEntry =>
      createEntry({
        id: `entry-${index}`,
        mode: 'fortyLines',
        lines: 40,
        elapsedMs: 60_000 + index,
        createdAt: index,
      }),
    );

    expect(
      qualifiesForLeaderboard('fortyLines', fullLeaderboard, {
        mode: 'fortyLines',
        score: 0,
        lines: 40,
        elapsedMs: 60_010,
      }),
    ).toBe(true);
    expect(
      qualifiesForLeaderboard('fortyLines', fullLeaderboard, {
        mode: 'fortyLines',
        score: 0,
        lines: 40,
        elapsedMs: 60_020,
      }),
    ).toBe(false);
  });
});
