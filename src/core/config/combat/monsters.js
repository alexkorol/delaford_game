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
    abilityIds: ['cleaving-strike'],
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
    behavior: 'aggressive',
    resistances: ['fire'],
    weaknesses: ['ice', 'water'],
    stats: {
      health: 160,
      mana: 60,
      attack: 14,
      defense: 8,
      speed: 1.6,
    },
    abilityIds: ['arcane-bolt'],
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
];

export default MONSTERS;
