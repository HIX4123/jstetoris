import './styles/main.scss';

import { createGameEngine } from './game/engine';
import { createInputController } from './game/input';
import { FORTY_LINES_TARGET } from './game/modes';
import { createRenderer } from './game/render';
import {
  insertLeaderboardEntry,
  isBetterMetric,
  loadBestMetric,
  loadHandling,
  loadLeaderboard,
  normalizeHandling,
  qualifiesForLeaderboard,
  saveBestMetric,
  saveHandling,
  saveLeaderboard,
} from './game/storage';

import type { GameModeId, GameSnapshot, GameStatus, LeaderboardCandidate, LeaderboardEntry } from './game/types';

const initialHandling = loadHandling();
let previousStatus: GameStatus = 'ready';
let leaderboardCandidate: LeaderboardCandidate | null = null;

const engine = createGameEngine({
  handling: initialHandling,
});

let currentMode: GameModeId = engine.getSnapshot().mode;
let bestMetric = loadBestMetric(currentMode);
let leaderboard = loadLeaderboard(currentMode);

const renderer = createRenderer();
renderer.setHandlingInputs(initialHandling);
renderer.renderLeaderboard(currentMode, leaderboard);

const createLeaderboardId = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const loadRecordsForMode = (mode: GameModeId): void => {
  currentMode = mode;
  bestMetric = loadBestMetric(mode);
  leaderboard = loadLeaderboard(mode);
  renderer.renderLeaderboard(mode, leaderboard);
};

const bestMetricValueForSnapshot = (snapshot: GameSnapshot): number | null => {
  if (snapshot.mode === 'fortyLines') {
    return snapshot.status === 'completed' ? snapshot.elapsedMs : null;
  }

  return snapshot.score;
};

const leaderboardCandidateForSnapshot = (snapshot: GameSnapshot): LeaderboardCandidate | null => {
  if (snapshot.mode === 'fortyLines') {
    if (snapshot.status !== 'completed' || snapshot.lines < FORTY_LINES_TARGET) {
      return null;
    }

    return {
      mode: snapshot.mode,
      score: snapshot.score,
      lines: snapshot.lines,
      elapsedMs: snapshot.elapsedMs,
    };
  }

  if (snapshot.mode === 'marathon' && snapshot.status !== 'gameover') {
    return null;
  }

  return {
    mode: snapshot.mode,
    score: snapshot.score,
    lines: snapshot.lines,
    elapsedMs: snapshot.elapsedMs,
  };
};

renderer.bindControls({
  onStart: () => {
    leaderboardCandidate = null;
    engine.dispatch({ type: 'start' });
  },
  onPause: () => {
    engine.dispatch({ type: 'togglePause' });
  },
  onRestart: () => {
    leaderboardCandidate = null;
    engine.dispatch({ type: 'restart' });
  },
  onModeChange: (mode) => {
    if (!engine.dispatch({ type: 'setMode', payload: mode })) {
      return;
    }

    leaderboardCandidate = null;
    loadRecordsForMode(mode);
    renderer.render(engine.getSnapshot(), bestMetric);
  },
  onHandlingChange: (nextHandling) => {
    const normalized = normalizeHandling(nextHandling);
    engine.dispatch({ type: 'setHandling', payload: normalized });
    renderer.setHandlingInputs(normalized);
    saveHandling(normalized);
  },
  onLeaderboardSubmit: (name) => {
    if (!leaderboardCandidate) {
      return;
    }

    const createdAt = Date.now();
    const entry: LeaderboardEntry = {
      id: createLeaderboardId(),
      mode: leaderboardCandidate.mode,
      name,
      score: leaderboardCandidate.score,
      lines: leaderboardCandidate.lines,
      elapsedMs: leaderboardCandidate.elapsedMs,
      createdAt,
    };

    leaderboard = insertLeaderboardEntry(leaderboardCandidate.mode, leaderboard, entry);
    saveLeaderboard(leaderboardCandidate.mode, leaderboard);
    renderer.renderLeaderboard(leaderboardCandidate.mode, leaderboard);
    leaderboardCandidate = null;
  },
});

const input = createInputController({
  target: window,
  dispatch: (action) => engine.dispatch(action),
  getHandling: () => engine.getHandling(),
  isRunning: () => engine.getSnapshot().status === 'running',
});

let lastTimestamp = performance.now();

const loop = (timestamp: number): void => {
  const dtMs = Math.min(timestamp - lastTimestamp, 50);
  lastTimestamp = timestamp;

  input.update(dtMs);
  engine.setSoftDropActive(input.isSoftDropActive());
  engine.tick(dtMs);
  const snapshot = engine.getSnapshot();
  const justEnded =
    (snapshot.status === 'gameover' || snapshot.status === 'completed') &&
    (previousStatus === 'running' || previousStatus === 'paused');
  const nextBestMetric = bestMetricValueForSnapshot(snapshot);

  if (nextBestMetric !== null && isBetterMetric(snapshot.mode, nextBestMetric, bestMetric)) {
    bestMetric = nextBestMetric;
    saveBestMetric(snapshot.mode, nextBestMetric);
  }

  if (justEnded) {
    const candidate = leaderboardCandidateForSnapshot(snapshot);

    if (candidate && qualifiesForLeaderboard(snapshot.mode, leaderboard, candidate)) {
      leaderboardCandidate = candidate;
      renderer.showLeaderboardPrompt(candidate);
    } else {
      leaderboardCandidate = null;
    }
  } else if (snapshot.status !== 'gameover' && snapshot.status !== 'completed') {
    leaderboardCandidate = null;
  }

  if (snapshot.mode !== currentMode) {
    loadRecordsForMode(snapshot.mode);
  }

  renderer.render(snapshot, bestMetric);
  previousStatus = snapshot.status;

  window.requestAnimationFrame(loop);
};

renderer.render(engine.getSnapshot(), bestMetric);
window.requestAnimationFrame(loop);

window.addEventListener('beforeunload', () => {
  input.destroy();
});
