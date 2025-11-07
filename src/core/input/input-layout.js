const NORMALISED_SPECIAL_KEYS = {
  space: ' ',
  spacebar: ' ',
};

export const normaliseInputKey = (rawKey) => {
  if (rawKey === null || rawKey === undefined) {
    return '';
  }

  if (typeof rawKey === 'number') {
    return String(rawKey);
  }

  const stringKey = `${rawKey}`;
  if (stringKey === ' ') {
    return ' ';
  }

  const lower = stringKey.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(NORMALISED_SPECIAL_KEYS, lower)) {
    return NORMALISED_SPECIAL_KEYS[lower];
  }

  return lower;
};

const normaliseMovementKeys = (keys) => {
  if (!Array.isArray(keys)) {
    return [];
  }

  const seen = new Set();
  keys.forEach((key) => {
    const normalised = normaliseInputKey(key);
    if (normalised) {
      seen.add(normalised);
    }
  });
  return [...seen];
};

const normaliseDiagonalEntry = (entry) => {
  if (Array.isArray(entry) && entry.length >= 3) {
    const [vertical, horizontal, diagonal] = entry;
    if (vertical && horizontal && diagonal) {
      return [String(vertical), String(horizontal), String(diagonal)];
    }
    return null;
  }

  if (entry && typeof entry === 'object') {
    const vertical = entry.vertical || entry.up;
    const horizontal = entry.horizontal || entry.right;
    const diagonal = entry.direction || entry.diagonal;
    if (vertical && horizontal && diagonal) {
      return [String(vertical), String(horizontal), String(diagonal)];
    }
  }

  return null;
};

const normaliseRepeat = (repeat = {}) => {
  const initialDelay = Number(repeat.initialDelayMs ?? repeat.initial ?? 150);
  const repeatDelay = Number(repeat.repeatDelayMs ?? repeat.repeat ?? 110);

  return {
    initialDelayMs: Number.isFinite(initialDelay) && initialDelay >= 0 ? initialDelay : 150,
    repeatDelayMs: Number.isFinite(repeatDelay) && repeatDelay >= 0 ? repeatDelay : 110,
  };
};

const normaliseAnalogEntry = (entry) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const id = typeof entry.id === 'string' && entry.id ? entry.id : 'left';
  const controls = typeof entry.controls === 'string' ? entry.controls : 'movement';
  const deadzoneValue = Number(entry.deadzone);
  const deadzone = Number.isFinite(deadzoneValue) && deadzoneValue >= 0 ? Math.min(deadzoneValue, 0.99) : 0.3;

  return {
    id,
    controls,
    deadzone,
  };
};

const createActionId = (action, fallbackIndex) => {
  if (typeof action.id === 'string' && action.id) {
    return action.id;
  }
  if (typeof action.abilityId === 'string' && action.abilityId) {
    return action.abilityId;
  }
  if (typeof action.actionId === 'string' && action.actionId) {
    return action.actionId;
  }
  return `action-${fallbackIndex}`;
};

const normaliseActionBinding = (action, index) => {
  if (!action || typeof action !== 'object') {
    return null;
  }

  const triggerRaw = action.trigger || action.type || 'press';
  const trigger = ['hold', 'toggle'].includes(triggerRaw) ? triggerRaw : 'press';
  const actionType = action.actionType || action.category || action.kind || (action.abilityId || action.ability)
    ? 'ability'
    : (action.actionId || action.id)
      ? 'action'
      : 'ability';

  const inputs = action.inputs && typeof action.inputs === 'object' ? action.inputs : {};
  const keyInputs = Array.isArray(inputs.keys) ? inputs.keys : action.keys;
  const buttonInputs = Array.isArray(inputs.buttons) ? inputs.buttons : action.buttons;

  const normalisedKeys = normaliseMovementKeys(keyInputs);
  const normalisedButtons = Array.isArray(buttonInputs)
    ? [...new Set(buttonInputs.map((button) => (button === null || button === undefined)
      ? ''
      : `${button}`.toLowerCase()).filter(Boolean))]
    : [];

  const abilityId = action.abilityId
    || action.ability
    || (actionType === 'ability' && typeof action.id === 'string' ? action.id : null);
  const actionId = action.actionId || (actionType === 'action' ? action.id : null);

  return {
    id: createActionId(action, index),
    label: typeof action.label === 'string' ? action.label : null,
    description: typeof action.description === 'string' ? action.description : null,
    trigger,
    actionType: actionType === 'action' ? 'action' : 'ability',
    abilityId: actionType === 'ability' ? abilityId || actionId : null,
    actionId: actionType === 'action' ? actionId || abilityId : null,
    inputs: {
      keys: normalisedKeys,
      buttons: normalisedButtons,
    },
  };
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const composeLayouts = (base, override) => {
  if (!override || typeof override !== 'object') {
    return clone(base);
  }

  const composed = clone(base);

  if (override.id) {
    composed.id = override.id;
  }

  if (override.label) {
    composed.label = override.label;
  }

  if (override.movement && typeof override.movement === 'object') {
    composed.movement = {
      ...composed.movement,
      ...Object.entries(override.movement).reduce((acc, [direction, keys]) => {
        acc[direction] = Array.isArray(keys) ? [...keys] : keys;
        return acc;
      }, {}),
    };
  }

  if (Array.isArray(override.diagonals) && override.diagonals.length) {
    composed.diagonals = [...override.diagonals];
  }

  const repeatOverride = override.repeat || override.movementRepeat;
  if (repeatOverride && typeof repeatOverride === 'object') {
    composed.repeat = {
      ...composed.repeat,
      ...repeatOverride,
    };
  }

  if (Array.isArray(override.actions) && override.actions.length) {
    composed.actions = [...override.actions];
  }

  if (Array.isArray(override.analogs)) {
    composed.analogs = [...override.analogs];
  }

  return composed;
};

export const DEFAULT_INPUT_LAYOUTS = {
  'keyboard-wasd-mouse': {
    id: 'keyboard-wasd-mouse',
    label: 'Keyboard — WASD & Mouse',
    movement: {
      up: ['w', 'arrowup'],
      down: ['s', 'arrowdown'],
      left: ['a', 'arrowleft'],
      right: ['d', 'arrowright'],
    },
    diagonals: [
      ['up', 'right', 'up-right'],
      ['down', 'right', 'down-right'],
      ['up', 'left', 'up-left'],
      ['down', 'left', 'down-left'],
    ],
    repeat: {
      initialDelayMs: 150,
      repeatDelayMs: 110,
    },
    actions: [
      {
        id: 'primary-attack',
        abilityId: 'primary-attack',
        trigger: 'press',
        inputs: { keys: [' '] },
      },
      {
        id: 'dash',
        abilityId: 'dash',
        trigger: 'press',
        inputs: { keys: ['shift'] },
      },
      {
        id: 'ability-1',
        abilityId: 'ability-1',
        trigger: 'press',
        inputs: { keys: ['q'] },
      },
      {
        id: 'ability-2',
        abilityId: 'ability-2',
        trigger: 'press',
        inputs: { keys: ['e'] },
      },
      {
        id: 'ability-3',
        abilityId: 'ability-3',
        trigger: 'press',
        inputs: { keys: ['r'] },
      },
      {
        id: 'ability-4',
        abilityId: 'ability-4',
        trigger: 'press',
        inputs: { keys: ['f'] },
      },
    ],
    analogs: [
      { id: 'left', controls: 'movement', deadzone: 0.3 },
    ],
  },
  'controller-standard': {
    id: 'controller-standard',
    label: 'Controller — Standard',
    movement: {
      up: ['dpadup'],
      down: ['dpaddown'],
      left: ['dpadleft'],
      right: ['dpadright'],
    },
    diagonals: [
      ['up', 'right', 'up-right'],
      ['down', 'right', 'down-right'],
      ['up', 'left', 'up-left'],
      ['down', 'left', 'down-left'],
    ],
    repeat: {
      initialDelayMs: 120,
      repeatDelayMs: 120,
    },
    actions: [
      {
        id: 'primary-attack',
        abilityId: 'primary-attack',
        trigger: 'press',
        inputs: { buttons: ['button0'] },
      },
      {
        id: 'dash',
        abilityId: 'dash',
        trigger: 'press',
        inputs: { buttons: ['button1'] },
      },
      {
        id: 'ability-1',
        abilityId: 'ability-1',
        trigger: 'press',
        inputs: { buttons: ['button4'] },
      },
      {
        id: 'ability-2',
        abilityId: 'ability-2',
        trigger: 'press',
        inputs: { buttons: ['button5'] },
      },
      {
        id: 'ability-3',
        abilityId: 'ability-3',
        trigger: 'press',
        inputs: { buttons: ['button2'] },
      },
      {
        id: 'ability-4',
        abilityId: 'ability-4',
        trigger: 'press',
        inputs: { buttons: ['button3'] },
      },
    ],
    analogs: [
      { id: 'left', controls: 'movement', deadzone: 0.25 },
    ],
  },
};

export const parseInputLayout = (source) => {
  if (!source) {
    return null;
  }

  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  if (typeof source === 'object') {
    return clone(source);
  }

  return null;
};

export const normaliseInputLayout = (layout = {}, fallbackId = 'keyboard-wasd-mouse') => {
  const baseLayout = DEFAULT_INPUT_LAYOUTS[fallbackId] || DEFAULT_INPUT_LAYOUTS['keyboard-wasd-mouse'];
  const composed = composeLayouts(baseLayout, layout);

  const movement = composed.movement || {};
  const diagonals = Array.isArray(composed.diagonals) ? composed.diagonals : [];
  const actions = Array.isArray(composed.actions) ? composed.actions : [];
  const analogs = Array.isArray(composed.analogs) ? composed.analogs : [];

  const normalisedMovement = {
    up: normaliseMovementKeys(movement.up || baseLayout.movement.up),
    down: normaliseMovementKeys(movement.down || baseLayout.movement.down),
    left: normaliseMovementKeys(movement.left || baseLayout.movement.left),
    right: normaliseMovementKeys(movement.right || baseLayout.movement.right),
  };

  const normalisedDiagonals = diagonals
    .map((entry) => normaliseDiagonalEntry(entry))
    .filter((entry) => entry && entry.every((value) => typeof value === 'string'));

  const normalisedActions = actions
    .map((action, index) => normaliseActionBinding(action, index))
    .filter((binding) => binding && (binding.inputs.keys.length || binding.inputs.buttons.length));

  const normalisedAnalogs = analogs
    .map((entry) => normaliseAnalogEntry(entry))
    .filter(Boolean);

  return {
    id: typeof composed.id === 'string' ? composed.id : baseLayout.id,
    label: typeof composed.label === 'string' ? composed.label : baseLayout.label,
    movement: normalisedMovement,
    diagonals: normalisedDiagonals.length ? normalisedDiagonals : [...baseLayout.diagonals],
    repeat: normaliseRepeat(composed.repeat || {}),
    actions: normalisedActions.length ? normalisedActions : baseLayout.actions.map((action, index) => normaliseActionBinding(action, index)).filter(Boolean),
    analogs: normalisedAnalogs,
  };
};

export const cloneInputLayout = (layout) => clone(layout);

export default {
  DEFAULT_INPUT_LAYOUTS,
  parseInputLayout,
  normaliseInputLayout,
  cloneInputLayout,
  normaliseInputKey,
};
