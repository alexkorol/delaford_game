export const DEFAULT_FACING_DIRECTION = 'down';

export const PLAYER_ANIMATION_STATES = ['idle', 'run', 'attack', 'dash', 'hurt'];

export const DEFAULT_ANIMATION_DURATIONS = {
  idle: 0,
  run: 0,
  attack: 450,
  dash: 300,
  hurt: 500,
};

export const DEFAULT_ANIMATION_HOLDS = {
  attack: 'idle',
  dash: 'run',
  hurt: 'idle',
};

export const GLOBAL_COOLDOWN_MS = 350;
export const INPUT_BUFFER_MS = 250;
export const COMBO_WINDOW_MS = 900;

export const DEFAULT_SKILL_IDS = {
  primary: 'primary-attack',
  secondary: 'secondary-attack',
  dash: 'dash',
  ability1: 'ability-1',
  ability2: 'ability-2',
  ability3: 'ability-3',
  ability4: 'ability-4',
};

export default {
  DEFAULT_FACING_DIRECTION,
  PLAYER_ANIMATION_STATES,
  DEFAULT_ANIMATION_DURATIONS,
  DEFAULT_ANIMATION_HOLDS,
  GLOBAL_COOLDOWN_MS,
  INPUT_BUFFER_MS,
  COMBO_WINDOW_MS,
  DEFAULT_SKILL_IDS,
};
