export default [
  {
    id: 'ashen-wolf',
    name: 'Ashen Wolf',
    level: 4,
    archetype: 'skirmisher',
    rarity: 'common',
    sceneId: null,
    graphic: {
      column: 0,
      row: 0,
    },
    spawn: {
      x: 42,
      y: 118,
      radius: 4,
    },
    behaviour: {
      patrolRadius: 5,
      aggressionRange: 7,
    },
    rewards: {
      experience: 24,
    },
    respawn: {
      delayMs: 12000,
    },
  },
  {
    id: 'hollow-guard',
    name: 'Hollow Guard',
    level: 6,
    archetype: 'brute',
    rarity: 'uncommon',
    sceneId: null,
    graphic: {
      column: 1,
      row: 0,
    },
    spawn: {
      x: 55,
      y: 112,
      radius: 3,
    },
    behaviour: {
      aggressionRange: 6,
      patrolRadius: 3,
    },
    rewards: {
      experience: 48,
    },
    respawn: {
      delayMs: 18000,
    },
  },
  {
    id: 'ember-seer',
    name: 'Ember Seer',
    level: 8,
    archetype: 'mystic',
    rarity: 'rare',
    sceneId: null,
    graphic: {
      column: 2,
      row: 0,
    },
    spawn: {
      x: 61,
      y: 125,
      radius: 5,
    },
    behaviour: {
      aggressionRange: 8,
      pursuitRange: 12,
    },
    rewards: {
      experience: 120,
    },
    respawn: {
      delayMs: 26000,
    },
  },
];
