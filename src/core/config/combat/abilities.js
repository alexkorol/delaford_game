// Ability configuration values consumed by the client combat systems.
//
// The definitions lean on the shared schema types declared in schema.js via
// JSDoc annotations so that tooling can infer shapes without introducing a
// compile step.

/** @typedef {import('./schema.js').AbilityDefinition} AbilityDefinition */

/**
 * @type {AbilityDefinition[]}
 */
export const ABILITIES = [
  {
    id: 'cleaving-strike',
    name: 'Cleaving Strike',
    description: 'A wide, arcing swing that damages enemies in front of you.',
    category: 'active',
    cooldown: 6000,
    resourceCost: { stamina: 20 },
    effects: [
      {
        id: 'cleave-damage',
        type: 'damage',
        magnitude: 28,
        damageType: 'physical',
        description: 'Deals heavy physical damage in a frontal cone.',
      },
    ],
    tags: ['melee', 'aoe'],
  },
  {
    id: 'pinning-shot',
    name: 'Pinning Shot',
    description: 'Fires an arrow that slows the first enemy hit.',
    category: 'active',
    cooldown: 9000,
    resourceCost: { stamina: 15 },
    effects: [
      {
        id: 'pinning-shot-damage',
        type: 'damage',
        magnitude: 22,
        damageType: 'physical',
        description: 'Deals piercing damage to a single target.',
      },
      {
        id: 'pinning-shot-slow',
        type: 'control',
        magnitude: 40,
        duration: 5000,
        description: 'Reduces the target\'s movement speed for 5 seconds.',
      },
    ],
    tags: ['ranged', 'control'],
  },
  {
    id: 'arcane-bolt',
    name: 'Arcane Bolt',
    description: 'Channels arcane energy into a focused projectile.',
    category: 'active',
    cooldown: 4500,
    resourceCost: { mana: 18 },
    effects: [
      {
        id: 'arcane-bolt-damage',
        type: 'damage',
        magnitude: 30,
        damageType: 'arcane',
        description: 'Deals arcane damage to a single target.',
      },
    ],
    tags: ['magic', 'projectile'],
  },
  {
    id: 'vital-surge',
    name: 'Vital Surge',
    description: 'Channel restorative energy that mends wounds over time.',
    category: 'active',
    cooldown: 12000,
    resourceCost: { mana: 25 },
    effects: [
      {
        id: 'vital-surge-heal',
        type: 'heal',
        magnitude: 32,
        duration: 6000,
        description: 'Heals the target over 6 seconds.',
      },
      {
        id: 'vital-surge-fortify',
        type: 'buff',
        magnitude: 10,
        duration: 6000,
        stat: 'defense',
        description: 'Increases defense while the heal is active.',
      },
    ],
    tags: ['support', 'heal'],
  },
];

export default ABILITIES;
