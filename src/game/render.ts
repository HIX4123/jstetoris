import { NEXT_PREVIEW_COUNT } from './engine';
import { handlingRanges } from './storage';

import type { GameSnapshot, HandlingConfig, PieceType, Point } from './types';

interface RendererBindings {
  onStart: () => void;
  onPause: () => void;
  onRestart: () => void;
  onHandlingChange: (handling: HandlingConfig) => void;
}

export interface GameRenderer {
  render: (snapshot: GameSnapshot, highScore: number) => void;
  bindControls: (bindings: RendererBindings) => void;
  setHandlingInputs: (handling: HandlingConfig) => void;
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

export const createRenderer = (): GameRenderer => {
  const boardGrid = document.querySelector<HTMLDivElement>('#board-grid');
  const nextGrids = [...document.querySelectorAll<HTMLDivElement>('.next-grid')];
  const holdGrid = document.querySelector<HTMLDivElement>('#hold-grid');

  const scoreValue = document.querySelector<HTMLElement>('#score-value');
  const highScoreValue = document.querySelector<HTMLElement>('#high-score-value');
  const levelValue = document.querySelector<HTMLElement>('#level-value');
  const linesValue = document.querySelector<HTMLElement>('#lines-value');
  const goalValue = document.querySelector<HTMLElement>('#goal-value');
  const comboToast = document.querySelector<HTMLElement>('#combo-toast');
  const b2bToast = document.querySelector<HTMLElement>('#b2b-toast');

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
    !comboToast ||
    !b2bToast ||
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

  let prevCombo = -1;
  let prevB2b = 0;
  let comboToastUntilMs = 0;
  let b2bToastUntilMs = 0;
  let comboToastValue = 0;
  let b2bToastValue = 0;

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

    setText(scoreValue, `${snapshot.score}`);
    setText(highScoreValue, `${highScore}`);
    setText(levelValue, `${snapshot.level}`);
    setText(linesValue, `${snapshot.lines}`);
    setText(goalValue, `${snapshot.goal}`);
    boardGrid.classList.toggle('is-paused', snapshot.status === 'paused');

    if (snapshot.combo > prevCombo && snapshot.combo > 0) {
      comboToastValue = snapshot.combo;
      comboToastUntilMs = now + TOAST_DURATION_MS;
      setText(comboToast, `COMBO x${comboToastValue}`);
    }

    if (snapshot.b2bChain > prevB2b && snapshot.b2bChain > 0) {
      b2bToastValue = snapshot.b2bChain;
      b2bToastUntilMs = now + TOAST_DURATION_MS;
      setText(b2bToast, `B2B x${b2bToastValue}`);
    }

    comboToast.hidden = now >= comboToastUntilMs;
    b2bToast.hidden = now >= b2bToastUntilMs;

    prevCombo = snapshot.combo;
    prevB2b = snapshot.b2bChain;
  };

  return {
    render,
    bindControls,
    setHandlingInputs,
  };
};
