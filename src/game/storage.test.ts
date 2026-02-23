import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_HANDLING,
  loadHandling,
  loadHighScore,
  normalizeHandling,
  saveHandling,
  saveHighScore,
} from './storage';

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
});
