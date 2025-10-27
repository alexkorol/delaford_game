import {
  DEFAULT_FACING_DIRECTION,
  DEFAULT_ANIMATION_DURATIONS,
  DEFAULT_ANIMATION_HOLDS,
} from '@shared/combat.js';

const baseRows = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

const baseFrames = [0, 1, 2, 1];

export const PLAYER_SPRITE_CONFIG = {
  tileSize: 32,
  defaultState: 'idle',
  defaultDirection: DEFAULT_FACING_DIRECTION,
  states: {
    idle: {
      frames: [1],
      frameDuration: 480,
      rows: baseRows,
      loop: true,
      holdState: null,
    },
    run: {
      frames: baseFrames,
      frameDuration: 110,
      rows: baseRows,
      loop: true,
      holdState: null,
    },
    attack: {
      frames: [2, 1, 0, 1],
      frameDuration: 90,
      rows: baseRows,
      loop: false,
      holdState: DEFAULT_ANIMATION_HOLDS.attack,
      duration: DEFAULT_ANIMATION_DURATIONS.attack,
    },
    dash: {
      frames: [0, 2, 1, 2],
      frameDuration: 70,
      rows: baseRows,
      loop: false,
      holdState: DEFAULT_ANIMATION_HOLDS.dash,
      duration: DEFAULT_ANIMATION_DURATIONS.dash,
    },
    hurt: {
      frames: [2, 2, 1, 1],
      frameDuration: 120,
      rows: baseRows,
      loop: false,
      holdState: DEFAULT_ANIMATION_HOLDS.hurt,
      duration: DEFAULT_ANIMATION_DURATIONS.hurt,
    },
  },
};

export default PLAYER_SPRITE_CONFIG;
