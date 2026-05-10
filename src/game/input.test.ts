import { describe, expect, it } from 'vitest';

import { createInputController } from './input';

import type { GameAction, HandlingConfig } from './types';

const DEFAULT_HANDLING: HandlingConfig = {
  dasMs: 100,
  arrMs: 100,
  sdfG: 20,
};

const keyboardEvent = (type: 'keydown' | 'keyup', code: string, repeat = false): Event => {
  const event = new Event(type, { cancelable: true }) as KeyboardEvent;
  Object.defineProperty(event, 'code', { value: code });
  Object.defineProperty(event, 'repeat', { value: repeat });
  return event;
};

const createTestController = (
  options: {
    handling?: HandlingConfig;
    isRunning?: boolean;
    dispatchResult?: boolean;
  } = {},
) => {
  const target = new EventTarget();
  const actions: GameAction[] = [];
  const controller = createInputController({
    target: target as Window,
    dispatch: (action) => {
      actions.push(action);
      return options.dispatchResult ?? true;
    },
    getHandling: () => options.handling ?? DEFAULT_HANDLING,
    isRunning: () => options.isRunning ?? true,
  });

  return { actions, controller, target };
};

describe('input controller', () => {
  it('dispatches rotation once while a rotation key is held', () => {
    const { actions, controller, target } = createTestController();

    target.dispatchEvent(keyboardEvent('keydown', 'KeyX'));
    target.dispatchEvent(keyboardEvent('keydown', 'KeyX'));
    target.dispatchEvent(keyboardEvent('keydown', 'KeyX', true));

    expect(actions).toEqual([{ type: 'rotateCW' }]);

    target.dispatchEvent(keyboardEvent('keyup', 'KeyX'));
    target.dispatchEvent(keyboardEvent('keydown', 'KeyX'));

    expect(actions).toEqual([{ type: 'rotateCW' }, { type: 'rotateCW' }]);

    controller.destroy();
  });

  it('ignores repeated keydown events for discrete actions', () => {
    const { actions, controller, target } = createTestController();

    target.dispatchEvent(keyboardEvent('keydown', 'Space', true));
    target.dispatchEvent(keyboardEvent('keydown', 'KeyC', true));
    target.dispatchEvent(keyboardEvent('keydown', 'KeyP', true));

    expect(actions).toEqual([]);

    target.dispatchEvent(keyboardEvent('keydown', 'Space'));
    target.dispatchEvent(keyboardEvent('keydown', 'Space', true));

    expect(actions).toEqual([{ type: 'hardDrop' }]);

    controller.destroy();
  });

  it('leaves horizontal auto-repeat to the update loop', () => {
    const { actions, controller, target } = createTestController();

    target.dispatchEvent(keyboardEvent('keydown', 'ArrowLeft'));
    target.dispatchEvent(keyboardEvent('keydown', 'ArrowLeft'));
    target.dispatchEvent(keyboardEvent('keydown', 'ArrowLeft', true));

    expect(actions).toEqual([{ type: 'moveLeft' }]);

    controller.update(99);
    expect(actions).toEqual([{ type: 'moveLeft' }]);

    controller.update(1);
    controller.update(99);
    expect(actions).toEqual([{ type: 'moveLeft' }, { type: 'moveLeft' }]);

    controller.destroy();
  });
});
