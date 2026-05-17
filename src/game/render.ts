import { NEXT_PREVIEW_COUNT } from './engine';
import { handlingRanges } from './storage';

import type { ClearFeedback, GameSnapshot, HandlingConfig, LeaderboardEntry, PieceType, Point } from './types';

interface RendererBindings {
  onStart: () => void;
  onPause: () => void;
  onRestart: () => void;
  onHandlingChange: (handling: HandlingConfig) => void;
  onLeaderboardSubmit: (name: string) => void;
}

export interface GameRenderer {
  render: (snapshot: GameSnapshot, highScore: number) => void;
  bindControls: (bindings: RendererBindings) => void;
  setHandlingInputs: (handling: HandlingConfig) => void;
  renderLeaderboard: (entries: LeaderboardEntry[]) => void;
  showLeaderboardPrompt: (score: number) => void;
}

const PREVIEW_CELLS: Record<PieceType, Point[]> = {
  I: [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
  ],
  O: [
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ],
  T: [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  S: [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  Z: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  J: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  L: [
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
};

const toneClass = (pieceType: PieceType): string => `tone-${pieceType.toLowerCase()}`;
const TOAST_DURATION_MS = 1200;
const MAX_DAMAGE_PULSE_ATTACK = 10;
const LEADERBOARD_LIMIT = 20;
const PERFECT_CLEAR_LABEL = 'ALL\nCLEAR';
const LINE_CLEAR_LABELS: Record<ClearFeedback['lines'], string> = {
  1: 'SINGLE',
  2: 'DOUBLE',
  3: 'TRIPLE',
  4: 'QUAD',
};

const createCellGrid = (container: HTMLElement, count: number, className: string): HTMLDivElement[] => {
  const fragment = document.createDocumentFragment();
  const cells: HTMLDivElement[] = [];

  for (let index = 0; index < count; index += 1) {
    const cell = document.createElement('div');
    cell.className = className;
    cell.setAttribute('aria-hidden', 'true');
    fragment.append(cell);
    cells.push(cell);
  }

  container.replaceChildren(fragment);

  return cells;
};

const setText = (node: HTMLElement, value: string): void => {
  if (node.textContent !== value) {
    node.textContent = value;
  }
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const damagePulseBackground = (attack: number): string => {
  const intensity = clamp(attack / MAX_DAMAGE_PULSE_ATTACK, 0, 1);
  const lightness = 82 - 22 * intensity;
  const chroma = 0.12 + 0.08 * intensity;
  const hue = 205 - 175 * intensity;
  const alpha = 16 + 16 * intensity;

  return `oklch(${lightness.toFixed(2)}% ${chroma.toFixed(3)} ${hue.toFixed(1)}deg / ${alpha.toFixed(2)}%)`;
};

const clearLabelFor = (feedback: ClearFeedback): string => {
  if (feedback.perfectClear) {
    return 'PERFECT CLEAR';
  }

  if (feedback.tspin === 'mini') {
    return `T-SPIN MINI ${LINE_CLEAR_LABELS[feedback.lines]}`;
  }

  if (feedback.tspin === 'full') {
    return `T-SPIN ${LINE_CLEAR_LABELS[feedback.lines]}`;
  }

  return LINE_CLEAR_LABELS[feedback.lines];
};

export const createRenderer = (): GameRenderer => {
  const boardGrid = document.querySelector<HTMLDivElement>('#board-grid');
  const nextGrids = [...document.querySelectorAll<HTMLDivElement>('.next-grid')];
  const holdGrid = document.querySelector<HTMLDivElement>('#hold-grid');

  const scoreValue = document.querySelector<HTMLElement>('#score-value');
  const highScoreValue = document.querySelector<HTMLElement>('#high-score-value');
  const levelValue = document.querySelector<HTMLElement>('#level-value');
  const linesValue = document.querySelector<HTMLElement>('#lines-value');
  const goalValue = document.querySelector<HTMLElement>('#goal-value');
  const clearToast = document.querySelector<HTMLElement>('#clear-toast');
  const comboToast = document.querySelector<HTMLElement>('#combo-toast');
  const b2bToast = document.querySelector<HTMLElement>('#b2b-toast');
  const perfectClearToast = document.querySelector<HTMLElement>('#perfect-clear-toast');
  const leaderboardList = document.querySelector<HTMLOListElement>('#leaderboard-list');
  const leaderboardPrompt = document.querySelector<HTMLElement>('#leaderboard-prompt');
  const leaderboardPromptScore = document.querySelector<HTMLElement>('#leaderboard-prompt-score');
  const leaderboardForm = document.querySelector<HTMLFormElement>('#leaderboard-form');
  const leaderboardNameInput = document.querySelector<HTMLInputElement>('#leaderboard-name-input');

  const startButton = document.querySelector<HTMLButtonElement>('#start-btn');
  const pauseButton = document.querySelector<HTMLButtonElement>('#pause-btn');
  const restartButton = document.querySelector<HTMLButtonElement>('#restart-btn');

  const dasInput = document.querySelector<HTMLInputElement>('#das-input');
  const arrInput = document.querySelector<HTMLInputElement>('#arr-input');
  const sdfInput = document.querySelector<HTMLInputElement>('#sdf-input');

  if (
    !boardGrid ||
    nextGrids.length !== NEXT_PREVIEW_COUNT ||
    !holdGrid ||
    !scoreValue ||
    !highScoreValue ||
    !levelValue ||
    !linesValue ||
    !goalValue ||
    !clearToast ||
    !comboToast ||
    !b2bToast ||
    !perfectClearToast ||
    !leaderboardList ||
    !leaderboardPrompt ||
    !leaderboardPromptScore ||
    !leaderboardForm ||
    !leaderboardNameInput ||
    !startButton ||
    !pauseButton ||
    !restartButton ||
    !dasInput ||
    !arrInput ||
    !sdfInput
  ) {
    throw new Error('Renderer targets are missing');
  }

  const boardCells = createCellGrid(boardGrid, 200, 'cell');
  const nextCells = nextGrids.map((grid) => createCellGrid(grid, 16, 'preview-cell'));
  const holdCells = createCellGrid(holdGrid, 16, 'preview-cell');

  dasInput.min = `${handlingRanges.dasMs.min}`;
  dasInput.max = `${handlingRanges.dasMs.max}`;
  arrInput.min = `${handlingRanges.arrMs.min}`;
  arrInput.max = `${handlingRanges.arrMs.max}`;
  sdfInput.min = `${handlingRanges.sdfG.min}`;
  sdfInput.max = `${handlingRanges.sdfG.max}`;

  const paintPreview = (cells: HTMLDivElement[], pieceType: PieceType | null): void => {
    cells.forEach((cell) => {
      cell.className = 'preview-cell';
    });

    if (!pieceType) {
      return;
    }

    for (const point of PREVIEW_CELLS[pieceType]) {
      const index = point.y * 4 + point.x;
      const cell = cells[index];
      if (!cell) {
        continue;
      }

      cell.className = `preview-cell ${toneClass(pieceType)} is-active`;
    }
  };

  const setHandlingInputs = (handling: HandlingConfig): void => {
    dasInput.value = `${handling.dasMs}`;
    arrInput.value = `${handling.arrMs}`;
    sdfInput.value = `${handling.sdfG}`;
  };

  const hideLeaderboardPrompt = (): void => {
    leaderboardPrompt.hidden = true;
    leaderboardNameInput.value = '';
  };

  const showLeaderboardPrompt = (score: number): void => {
    setText(leaderboardPromptScore, `${score}`);
    leaderboardNameInput.value = '';
    leaderboardPrompt.hidden = false;
    window.requestAnimationFrame(() => {
      leaderboardNameInput.focus();
      leaderboardNameInput.select();
    });
  };

  const renderLeaderboard = (entries: LeaderboardEntry[]): void => {
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < LEADERBOARD_LIMIT; index += 1) {
      const entry = entries[index];
      const item = document.createElement('li');
      item.className = entry ? 'leaderboard-item' : 'leaderboard-item is-empty';

      const rank = document.createElement('span');
      rank.className = 'leaderboard-rank';
      rank.textContent = `${index + 1}`;

      const name = document.createElement('span');
      name.className = 'leaderboard-name';
      name.textContent = entry?.name ?? '-';

      const score = document.createElement('span');
      score.className = 'leaderboard-score';
      score.textContent = entry ? `${entry.score}` : '-';

      const detail = document.createElement('span');
      detail.className = 'leaderboard-detail';
      detail.textContent = entry ? `Lv ${entry.level} / ${entry.lines}L` : '';

      item.append(rank, name, score, detail);
      fragment.append(item);
    }

    leaderboardList.replaceChildren(fragment);
  };

  let prevCombo = -1;
  let prevB2b = 0;
  let prevClearFeedbackId = 0;
  let prevScore = 0;
  let clearToastUntilMs = 0;
  let comboToastUntilMs = 0;
  let b2bToastUntilMs = 0;
  let perfectClearToastUntilMs = 0;
  let comboToastValue = 0;
  let b2bToastValue = 0;

  const restartAnimation = (element: HTMLElement, className: string): void => {
    element.classList.remove(className);
    element.getBoundingClientRect();
    element.classList.add(className);
  };

  const triggerBoardPulse = (feedback: ClearFeedback): void => {
    if (feedback.attack <= 0) {
      return;
    }

    const strongClear = feedback.perfectClear || feedback.difficult;
    boardGrid.classList.remove('is-clear-pulsing', 'is-clear-pulsing-strong');
    boardGrid.style.setProperty('--clear-pulse-bg', damagePulseBackground(feedback.attack));
    boardGrid.getBoundingClientRect();
    boardGrid.classList.add(strongClear ? 'is-clear-pulsing-strong' : 'is-clear-pulsing');
  };

  const triggerBoardShake = (): void => {
    boardGrid.classList.remove('is-b2b-shaking');
    boardGrid.getBoundingClientRect();
    boardGrid.classList.add('is-b2b-shaking');
  };

  boardGrid.addEventListener('animationend', (event) => {
    if (event.animationName === 'b2b-board-shake') {
      boardGrid.classList.remove('is-b2b-shaking');
    }

    if (event.animationName === 'clear-board-pulse') {
      boardGrid.classList.remove('is-clear-pulsing', 'is-clear-pulsing-strong');
    }
  });

  const bindControls = (bindings: RendererBindings): void => {
    startButton.addEventListener('click', bindings.onStart);
    pauseButton.addEventListener('click', bindings.onPause);
    restartButton.addEventListener('click', bindings.onRestart);

    const onHandlingInput = (): void => {
      bindings.onHandlingChange({
        dasMs: Number(dasInput.value),
        arrMs: Number(arrInput.value),
        sdfG: Number(sdfInput.value),
      });
    };

    dasInput.addEventListener('change', onHandlingInput);
    arrInput.addEventListener('change', onHandlingInput);
    sdfInput.addEventListener('change', onHandlingInput);

    leaderboardForm.addEventListener('submit', (event) => {
      event.preventDefault();
      bindings.onLeaderboardSubmit(leaderboardNameInput.value);
      hideLeaderboardPrompt();
    });

    leaderboardNameInput.addEventListener('keydown', (event) => {
      event.stopPropagation();
    });

    leaderboardNameInput.addEventListener('keyup', (event) => {
      event.stopPropagation();
    });
  };

  const render = (snapshot: GameSnapshot, highScore: number): void => {
    const now = performance.now();
    const locked = new Array<PieceType | null>(200).fill(null);
    const ghostMask = new Array<boolean>(200).fill(false);
    const activeMask = new Array<boolean>(200).fill(false);

    for (let y = 0; y < snapshot.boardVisible.length; y += 1) {
      for (let x = 0; x < snapshot.boardVisible[y].length; x += 1) {
        locked[y * 10 + x] = snapshot.boardVisible[y][x];
      }
    }

    for (const point of snapshot.ghostCells) {
      const index = point.y * 10 + point.x;
      if (index >= 0 && index < ghostMask.length) {
        ghostMask[index] = true;
      }
    }

    for (const point of snapshot.activeCells) {
      const index = point.y * 10 + point.x;
      if (index >= 0 && index < activeMask.length) {
        activeMask[index] = true;
      }
    }

    for (let index = 0; index < boardCells.length; index += 1) {
      const cell = boardCells[index];
      cell.className = 'cell';

      const lockedPiece = locked[index];
      if (lockedPiece) {
        cell.classList.add(toneClass(lockedPiece), 'is-locked');
      }

      if (!lockedPiece && ghostMask[index] && !activeMask[index]) {
        cell.classList.add('is-ghost');
      }

      if (activeMask[index] && snapshot.activeType) {
        cell.classList.add(toneClass(snapshot.activeType), 'is-active');
      }
    }

    for (let index = 0; index < nextCells.length; index += 1) {
      paintPreview(nextCells[index], snapshot.next[index] ?? null);
    }

    paintPreview(holdCells, snapshot.hold);

    if (snapshot.score > prevScore) {
      restartAnimation(scoreValue, 'is-score-popping');
    }

    setText(scoreValue, `${snapshot.score}`);
    setText(highScoreValue, `${highScore}`);
    setText(levelValue, `${snapshot.level}`);
    setText(linesValue, `${snapshot.lines}`);
    setText(goalValue, `${snapshot.goal}`);
    boardGrid.classList.toggle('is-paused', snapshot.status === 'paused');

    if (snapshot.status !== 'gameover' && !leaderboardPrompt.hidden) {
      hideLeaderboardPrompt();
    }

    if (!snapshot.lastClearFeedback) {
      prevClearFeedbackId = 0;
    } else if (snapshot.lastClearFeedback.id !== prevClearFeedbackId) {
      const feedback = snapshot.lastClearFeedback;
      const strongClear = feedback.perfectClear || feedback.difficult || feedback.lines === 4;
      prevClearFeedbackId = feedback.id;

      if (feedback.perfectClear) {
        clearToastUntilMs = 0;
        perfectClearToastUntilMs = now + TOAST_DURATION_MS;
        setText(perfectClearToast, PERFECT_CLEAR_LABEL);
        perfectClearToast.hidden = false;
        restartAnimation(perfectClearToast, 'is-showing');
      } else {
        clearToastUntilMs = now + TOAST_DURATION_MS;
        clearToast.classList.toggle('is-major', strongClear);
        setText(clearToast, clearLabelFor(feedback));
      }

      triggerBoardPulse(feedback);
    }

    if (snapshot.combo > prevCombo && snapshot.combo > 0) {
      comboToastValue = snapshot.combo;
      comboToastUntilMs = now + TOAST_DURATION_MS;
      setText(comboToast, `COMBO x${comboToastValue}`);
    }

    if (snapshot.b2bChain > prevB2b && snapshot.b2bChain > 0) {
      b2bToastValue = snapshot.b2bChain;
      b2bToastUntilMs = now + TOAST_DURATION_MS;
      setText(b2bToast, `B2B x${b2bToastValue}`);
      triggerBoardShake();
    }

    clearToast.hidden = now >= clearToastUntilMs;
    comboToast.hidden = now >= comboToastUntilMs;
    b2bToast.hidden = now >= b2bToastUntilMs;
    perfectClearToast.hidden = now >= perfectClearToastUntilMs;

    if (perfectClearToast.hidden) {
      perfectClearToast.classList.remove('is-showing');
    }

    prevScore = snapshot.score;
    prevCombo = snapshot.combo;
    prevB2b = snapshot.b2bChain;
  };

  return {
    render,
    bindControls,
    setHandlingInputs,
    renderLeaderboard,
    showLeaderboardPrompt,
  };
};
