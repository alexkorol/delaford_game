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
    id: 'melee-combo',
    name: 'Melee Combo',
    description: 'Chain three weapon strikes, finishing with a crushing blow.',
    category: 'active',
    cooldown: 4000,
    resourceCost: { stamina: 25 },
    effects: [
      {
        id: 'melee-combo-opening',
        type: 'damage',
        magnitude: 12,
        damageType: 'physical',
        description: 'Initial strike that staggers the foe.',
      },
      {
        id: 'melee-combo-followup',
        type: 'damage',
        magnitude: 16,
        damageType: 'physical',
        description: 'Second hit that drives the enemy back.',
      },
      {
        id: 'melee-combo-finisher',
        type: 'damage',
        magnitude: 24,
        damageType: 'physical',
        description: 'Heavy finishing strike that delivers the bulk of the damage.',
      },
    ],
    tags: ['melee', 'combo'],
  },
  {
    id: 'fireball',
    name: 'Fireball',
    description: 'Launch a blazing orb that explodes on impact and scorches enemies over time.',
    category: 'active',
    cooldown: 6000,
    resourceCost: { mana: 30 },
    effects: [
      {
        id: 'fireball-impact',
        type: 'damage',
        magnitude: 40,
        damageType: 'fire',
        description: 'Immediate fiery detonation at the target location.',
      },
      {
        id: 'fireball-burn',
        type: 'damage',
        magnitude: 20,
        duration: 5000,
        damageType: 'fire',
        description: 'Lingering flames that burn the target for 5 seconds.',
      },
    ],
    tags: ['magic', 'projectile', 'dot'],
  },
  {
    id: 'poison-cloud',
    name: 'Poison Cloud',
    description: 'Release a toxic mist that corrodes foes while revitalising nearby allies.',
    category: 'active',
    cooldown: 9000,
    resourceCost: { mana: 22 },
    effects: [
      {
        id: 'poison-cloud-corrosion',
        type: 'damage',
        magnitude: 18,
        duration: 9000,
        damageType: 'poison',
        description: 'Poisons enemies caught in the cloud, dealing damage over time.',
      },
      {
        id: 'poison-cloud-regrowth',
        type: 'heal',
        magnitude: 12,
        duration: 9000,
        description: 'Soothing spores that slowly mend the caster and allies.',
      },
    ],
    tags: ['poison', 'area', 'hot'],
  },
];

export default ABILITIES;
