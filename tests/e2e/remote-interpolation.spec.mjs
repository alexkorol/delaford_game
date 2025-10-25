import { test, expect } from '@playwright/test';
import MovementController from '../../src/core/utilities/movement-controller.js';
import { TILE_SIZE } from '../../src/core/config/movement.js';

test('remote interpolation reaches destination after eta', async () => {
  const controller = new MovementController();
  controller.initialise(0, 0, 0);

  const step = {
    startedAt: 0,
    duration: 150,
    sequence: 1,
  };

  controller.applyServerStep(1, 0, step, { sentAt: 0, receivedAt: 0 });

  const endPosition = controller.update(step.duration + 10);
  expect(endPosition.x).toBeCloseTo((1.5 * TILE_SIZE), 5);
  expect(endPosition.y).toBeCloseTo((0.5 * TILE_SIZE), 5);
});

