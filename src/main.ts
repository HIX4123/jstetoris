import './styles/main.scss';

import { createGameEngine } from './game/engine';
import { createInputController } from './game/input';
import { createRenderer } from './game/render';
import {
  insertLeaderboardEntry,
  loadHandling,
  loadHighScore,
  loadLeaderboard,
  normalizeHandling,
  qualifiesForLeaderboard,
  saveHandling,
  saveHighScore,
  saveLeaderboard,
} from './game/storage';

import type { GameStatus, LeaderboardEntry } from './game/types';

interface LeaderboardCandidate {
  score: number;
  level: number;
  lines: number;
}

const initialHandling = loadHandling();
let highScore = loadHighScore();
let leaderboard = loadLeaderboard();
let previousStatus: GameStatus = 'ready';
let leaderboardCandidate: LeaderboardCandidate | null = null;

const engine = createGameEngine({
  handling: initialHandling,
});

const renderer = createRenderer();
renderer.setHandlingInputs(initialHandling);
renderer.renderLeaderboard(leaderboard);

const createLeaderboardId = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

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
      name,
      score: leaderboardCandidate.score,
      level: leaderboardCandidate.level,
      lines: leaderboardCandidate.lines,
      createdAt,
    };

    leaderboard = insertLeaderboardEntry(leaderboard, entry);
    saveLeaderboard(leaderboard);
    renderer.renderLeaderboard(leaderboard);
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
  const justGameOver =
    snapshot.status === 'gameover' && (previousStatus === 'running' || previousStatus === 'paused');

  if (snapshot.score > highScore) {
    highScore = snapshot.score;
    saveHighScore(highScore);
  }

  if (justGameOver && qualifiesForLeaderboard(leaderboard, snapshot.score)) {
    leaderboardCandidate = {
      score: snapshot.score,
      level: snapshot.level,
      lines: snapshot.lines,
    };
    renderer.showLeaderboardPrompt(snapshot.score);
  } else if (justGameOver) {
    leaderboardCandidate = null;
  }

  renderer.render(snapshot, highScore);
  previousStatus = snapshot.status;

  window.requestAnimationFrame(loop);
};

renderer.render(engine.getSnapshot(), highScore);
window.requestAnimationFrame(loop);

window.addEventListener('beforeunload', () => {
  input.destroy();
});
