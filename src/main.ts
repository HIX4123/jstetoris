import './styles/main.scss';

import { createGameEngine } from './game/engine';
import { createInputController } from './game/input';
import { createRenderer } from './game/render';
import {
  loadHandling,
  loadHighScore,
  normalizeHandling,
  saveHandling,
  saveHighScore,
} from './game/storage';

const initialHandling = loadHandling();
let highScore = loadHighScore();

const engine = createGameEngine({
  handling: initialHandling,
});

const renderer = createRenderer();
renderer.setHandlingInputs(initialHandling);

renderer.bindControls({
  onStart: () => {
    engine.dispatch({ type: 'start' });
  },
  onPause: () => {
    engine.dispatch({ type: 'togglePause' });
  },
  onRestart: () => {
    engine.dispatch({ type: 'restart' });
  },
  onHandlingChange: (nextHandling) => {
    const normalized = normalizeHandling(nextHandling);
    engine.dispatch({ type: 'setHandling', payload: normalized });
    renderer.setHandlingInputs(normalized);
    saveHandling(normalized);
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

  if (snapshot.score > highScore) {
    highScore = snapshot.score;
    saveHighScore(highScore);
  }

  renderer.render(snapshot, highScore);

  window.requestAnimationFrame(loop);
};

renderer.render(engine.getSnapshot(), highScore);
window.requestAnimationFrame(loop);

window.addEventListener('beforeunload', () => {
  input.destroy();
});
