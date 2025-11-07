import { DEFAULT_INPUT_LAYOUTS, normaliseInputLayout } from '../input/input-layout.js';

const DEFAULT_LAYOUT = normaliseInputLayout(DEFAULT_INPUT_LAYOUTS['keyboard-wasd-mouse']);

export const MOVEMENT_BINDINGS = {
  up: [...DEFAULT_LAYOUT.movement.up],
  down: [...DEFAULT_LAYOUT.movement.down],
  left: [...DEFAULT_LAYOUT.movement.left],
  right: [...DEFAULT_LAYOUT.movement.right],
};

export const DIAGONAL_BINDINGS = DEFAULT_LAYOUT.diagonals.map((entry) => [...entry]);

export const SKILL_BINDINGS = DEFAULT_LAYOUT.actions
  .filter((action) => action.actionType === 'ability')
  .map((action) => ({
    id: action.abilityId || action.id,
    keys: [...(action.inputs.keys || [])],
    type: action.trigger,
  }));

export const MOVEMENT_REPEAT = { ...DEFAULT_LAYOUT.repeat };

export const DEFAULT_INPUT_SCHEMES = DEFAULT_INPUT_LAYOUTS;

export default {
  MOVEMENT_BINDINGS,
  DIAGONAL_BINDINGS,
  SKILL_BINDINGS,
  MOVEMENT_REPEAT,
  DEFAULT_INPUT_SCHEMES,
};
