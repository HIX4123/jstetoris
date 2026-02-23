import type { GameAction, HandlingConfig } from './types';

interface InputControllerConfig {
  target: Window;
  dispatch: (action: GameAction) => boolean;
  getHandling: () => HandlingConfig;
  isRunning: () => boolean;
}

export interface InputController {
  update: (dtMs: number) => void;
  destroy: () => void;
  isSoftDropActive: () => boolean;
}

type HorizontalOwner = 'left' | 'right' | null;

const HANDLED_CODES = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowDown',
  'ArrowUp',
  'Space',
  'KeyZ',
  'KeyX',
  'KeyA',
  'KeyC',
  'ShiftLeft',
  'ShiftRight',
  'KeyP',
  'KeyR',
  'Enter',
]);

export const createInputController = ({ target, dispatch, getHandling, isRunning }: InputControllerConfig): InputController => {
  const pressed = new Set<string>();
  let horizontalOwner: HorizontalOwner = null;
  let dasElapsedMs = 0;
  let arrElapsedMs = 0;

  const resetHorizontalTimers = (): void => {
    dasElapsedMs = 0;
    arrElapsedMs = 0;
  };

  const moveByOwner = (): boolean => {
    if (horizontalOwner === 'left') {
      return dispatch({ type: 'moveLeft' });
    }

    if (horizontalOwner === 'right') {
      return dispatch({ type: 'moveRight' });
    }

    return false;
  };

  const handoffOwnerIfNeeded = (): void => {
    const leftPressed = pressed.has('ArrowLeft');
    const rightPressed = pressed.has('ArrowRight');

    if (leftPressed && rightPressed) {
      return;
    }

    if (leftPressed) {
      horizontalOwner = 'left';
      resetHorizontalTimers();
      dispatch({ type: 'moveLeft' });
      return;
    }

    if (rightPressed) {
      horizontalOwner = 'right';
      resetHorizontalTimers();
      dispatch({ type: 'moveRight' });
      return;
    }

    horizontalOwner = null;
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!HANDLED_CODES.has(event.code)) {
      return;
    }

    event.preventDefault();

    if (pressed.has(event.code)) {
      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight' || event.code === 'ArrowDown') {
        return;
      }
    }

    pressed.add(event.code);

    switch (event.code) {
      case 'Enter':
        dispatch({ type: 'start' });
        return;
      case 'KeyP':
        dispatch({ type: 'togglePause' });
        return;
      case 'KeyR':
        dispatch({ type: 'restart' });
        return;
      case 'ArrowLeft':
        horizontalOwner = 'left';
        resetHorizontalTimers();
        dispatch({ type: 'moveLeft' });
        return;
      case 'ArrowRight':
        horizontalOwner = 'right';
        resetHorizontalTimers();
        dispatch({ type: 'moveRight' });
        return;
      case 'ArrowUp':
      case 'KeyX':
        dispatch({ type: 'rotateCW' });
        return;
      case 'KeyZ':
        dispatch({ type: 'rotateCCW' });
        return;
      case 'KeyA':
        dispatch({ type: 'rotate180' });
        return;
      case 'Space':
        dispatch({ type: 'hardDrop' });
        return;
      case 'KeyC':
      case 'ShiftLeft':
      case 'ShiftRight':
        dispatch({ type: 'hold' });
        return;
      default:
        return;
    }
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    if (!HANDLED_CODES.has(event.code)) {
      return;
    }

    pressed.delete(event.code);

    if (event.code === 'ArrowLeft' && horizontalOwner === 'left') {
      handoffOwnerIfNeeded();
      return;
    }

    if (event.code === 'ArrowRight' && horizontalOwner === 'right') {
      handoffOwnerIfNeeded();
    }
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);

  const update = (dtMs: number): void => {
    if (!isRunning() || !horizontalOwner) {
      return;
    }

    const keyCode = horizontalOwner === 'left' ? 'ArrowLeft' : 'ArrowRight';
    if (!pressed.has(keyCode)) {
      handoffOwnerIfNeeded();
      return;
    }

    const handling = getHandling();
    dasElapsedMs += dtMs;

    if (dasElapsedMs < handling.dasMs) {
      return;
    }

    if (handling.arrMs === 0) {
      while (moveByOwner()) {
        // ARR 0 means instant auto-repeat to the nearest wall/obstacle.
      }
      return;
    }

    arrElapsedMs += dtMs;
    while (arrElapsedMs >= handling.arrMs) {
      arrElapsedMs -= handling.arrMs;
      const moved = moveByOwner();
      if (!moved) {
        break;
      }
    }
  };

  return {
    update,
    destroy: () => {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
    },
    isSoftDropActive: () => pressed.has('ArrowDown'),
  };
};
