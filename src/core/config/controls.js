export const MOVEMENT_BINDINGS = {
  up: ['w', 'arrowup'],
  down: ['s', 'arrowdown'],
  left: ['a', 'arrowleft'],
  right: ['d', 'arrowright'],
};

export const DIAGONAL_BINDINGS = [
  ['up', 'right', 'up-right'],
  ['down', 'right', 'down-right'],
  ['up', 'left', 'up-left'],
  ['down', 'left', 'down-left'],
];

export const SKILL_BINDINGS = [
  {
    id: 'primary-attack',
    keys: [' '],
    type: 'press',
  },
  {
    id: 'dash',
    keys: ['shift'],
    type: 'press',
  },
  {
    id: 'ability-1',
    keys: ['q'],
    type: 'press',
  },
  {
    id: 'ability-2',
    keys: ['e'],
    type: 'press',
  },
  {
    id: 'ability-3',
    keys: ['r'],
    type: 'press',
  },
  {
    id: 'ability-4',
    keys: ['f'],
    type: 'press',
  },
];

export const MOVEMENT_REPEAT = {
  initialDelayMs: 150,
  repeatDelayMs: 110,
};

export default {
  MOVEMENT_BINDINGS,
  DIAGONAL_BINDINGS,
  SKILL_BINDINGS,
  MOVEMENT_REPEAT,
};
