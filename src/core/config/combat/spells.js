// Spell configuration entries powering spellbooks and scroll items.

/** @typedef {import('./schema.js').SpellDefinition} SpellDefinition */

/**
 * @type {SpellDefinition[]}
 */
export const SPELLS = [
  {
    id: 'spell-fireball',
    name: 'Fireball',
    description: 'Hurl a fiery orb that explodes on impact.',
    damageType: 'fire',
    castTime: 2500,
    cooldown: 8000,
    resourceCost: { mana: 30 },
    range: 7,
    abilityIds: ['fireball'],
    effects: [
      {
        id: 'fireball-impact',
        type: 'damage',
        magnitude: 40,
        damageType: 'fire',
        description: 'Deals fire damage to the primary target.',
      },
      {
        id: 'fireball-burn',
        type: 'damage',
        magnitude: 12,
        duration: 6000,
        damageType: 'fire',
        description: 'Applies a burning damage over time effect.',
      },
    ],
    itemizable: true,
    graphics: {
      tileset: 'general',
      column: 5,
      row: 3,
    },
    stackable: false,
    maxStack: 1,
  },
  {
    id: 'spell-healing-mist',
    name: 'Healing Mist',
    description: 'Envelop allies in a soothing restorative mist.',
    damageType: 'holy',
    castTime: 2000,
    cooldown: 12000,
    resourceCost: { mana: 35 },
    range: 5,
    abilityIds: ['poison-cloud'],
    effects: [
      {
        id: 'healing-mist-heal',
        type: 'heal',
        magnitude: 28,
        duration: 5000,
        description: 'Restores health to allies within the mist.',
      },
      {
        id: 'healing-mist-resist',
        type: 'buff',
        magnitude: 8,
        duration: 5000,
        stat: 'defense',
        description: 'Grants a modest defense increase while active.',
      },
    ],
    itemizable: true,
    graphics: {
      tileset: 'general',
      column: 1,
      row: 5,
    },
    stackable: false,
    maxStack: 1,
  },
];

export default SPELLS;
