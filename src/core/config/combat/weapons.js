// Weapon configuration definitions for the combat subsystem.

/** @typedef {import('./schema.js').WeaponDefinition} WeaponDefinition */

/**
 * @type {WeaponDefinition[]}
 */
export const WEAPONS = [
  {
    id: 'iron-longblade',
    name: 'Iron Longblade',
    description: 'A reliable sword favoured by novice adventurers.',
    weaponClass: 'melee',
    damageType: 'physical',
    damageRange: [12, 18],
    attackSpeed: 1800,
    weight: 6,
    twoHanded: false,
    abilityIds: ['cleaving-strike'],
    graphics: {
      tileset: 'weapons',
      column: 1,
      row: 2,
    },
    stackable: false,
    maxStack: 1,
    rarity: 'common',
  },
  {
    id: 'oak-longbow',
    name: 'Oak Longbow',
    description: 'A finely crafted bow capable of impressive range.',
    weaponClass: 'ranged',
    damageType: 'physical',
    damageRange: [10, 16],
    attackSpeed: 2200,
    weight: 4,
    range: 6,
    abilityIds: ['pinning-shot'],
    graphics: {
      tileset: 'weapons',
      column: 7,
      row: 1,
    },
    stackable: false,
    maxStack: 1,
    rarity: 'uncommon',
  },
  {
    id: 'apprentice-focus',
    name: 'Apprentice Focus',
    description: 'A focus crystal attuned to the arcane currents.',
    weaponClass: 'magic',
    damageType: 'arcane',
    damageRange: [8, 14],
    attackSpeed: 1600,
    weight: 2,
    abilityIds: ['arcane-bolt', 'vital-surge'],
    graphics: {
      tileset: 'weapons',
      column: 10,
      row: 0,
    },
    stackable: false,
    maxStack: 1,
    rarity: 'uncommon',
  },
];

export default WEAPONS;
