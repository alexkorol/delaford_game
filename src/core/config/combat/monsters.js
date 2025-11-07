// Monster configuration entries used to enrich server payloads.

/** @typedef {import('./schema.js').MonsterDefinition} MonsterDefinition */

/**
 * @type {MonsterDefinition[]}
 */
export const MONSTERS = [
  {
    id: 'forest-slime',
    name: 'Forest Slime',
    level: 3,
    behavior: 'defensive',
    resistances: ['poison'],
    weaknesses: ['fire'],
    stats: {
      health: 120,
      mana: 0,
      attack: 9,
      defense: 6,
      speed: 1.2,
    },
    abilityIds: ['poison-cloud'],
    lootTable: [
      { itemId: 'iron-longblade', chance: 0.05 },
      { itemId: 'spell-healing-mist', chance: 0.12 },
    ],
    graphics: {
      tileset: 'monsters',
      column: 2,
      row: 1,
    },
    description: 'A docile slime that retaliates when cornered in the forest canopy.',
  },
  {
    id: 'ember-wisp',
    name: 'Ember Wisp',
    level: 6,
    behavior: 'caster',
    resistances: ['fire'],
    weaknesses: ['ice', 'water'],
    stats: {
      health: 160,
      mana: 60,
      attack: 14,
      defense: 8,
      speed: 1.6,
    },
    abilityIds: ['fireball'],
    lootTable: [
      { itemId: 'apprentice-focus', chance: 0.08 },
      { itemId: 'spell-fireball', chance: 0.18 },
    ],
    graphics: {
      tileset: 'monsters',
      column: 6,
      row: 0,
    },
    description: 'A flickering mote of wildfire drawn to unwary travellers.',
  },
  {
    id: 'stone-sentinel',
    name: 'Stone Sentinel',
    level: 10,
    behavior: 'aggressive',
    resistances: ['physical'],
    weaknesses: ['lightning'],
    stats: {
      health: 420,
      mana: 20,
      attack: 28,
      defense: 32,
      speed: 0.9,
    },
    abilityIds: ['melee-combo'],
    lootTable: [
      { itemId: 'iron-longblade', chance: 0.18 },
      { itemId: 'spell-healing-mist', chance: 0.1 },
      { itemId: 'apprentice-focus', chance: 0.04 },
    ],
    graphics: {
      tileset: 'monsters',
      column: 4,
      row: 3,
    },
    description: 'Ancient guardians that relentlessly hammer intruders with heavy blows.',
  },
  {
    id: 'shadow-stalker',
    name: 'Shadow Stalker',
    level: 12,
    behavior: 'skirmisher',
    resistances: ['dark'],
    weaknesses: ['radiant', 'fire'],
    stats: {
      health: 260,
      mana: 80,
      attack: 22,
      defense: 18,
      speed: 2.4,
    },
    abilityIds: ['poison-cloud', 'fireball'],
    lootTable: [
      { itemId: 'spell-fireball', chance: 0.16 },
      { itemId: 'apprentice-focus', chance: 0.12 },
      { itemId: 'spell-healing-mist', chance: 0.08 },
    ],
    graphics: {
      tileset: 'monsters',
      column: 7,
      row: 2,
    },
    description: 'A rogue assassin that darts between shadows striking with toxins and flame.',
  },
];

export default MONSTERS;
