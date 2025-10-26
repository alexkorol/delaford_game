const ARCHETYPES = {
  brute: {
    id: 'brute',
    label: 'Brute',
    description: 'Slow melee bruiser that hits hard and shrugs off blows.',
    baseAttributes: {
      strength: 16,
      dexterity: 8,
      intelligence: 6,
    },
    scaling: {
      perLevel: {
        strength: 2.2,
        dexterity: 0.6,
        intelligence: 0.4,
      },
    },
    behaviour: {
      aggressionRange: 6,
      pursuitRange: 8,
      leash: 10,
      patrolRadius: 4,
      patrolIntervalMs: 4500,
      stepIntervalMs: 900,
      attack: {
        intervalMs: 1600,
        windupMs: 350,
        damageMultiplier: 1.15,
      },
    },
    damage: {
      baseMin: 5,
      baseMax: 9,
      scalingPerStrength: 0.75,
    },
  },
  skirmisher: {
    id: 'skirmisher',
    label: 'Skirmisher',
    description: 'Mobile melee combatant that darts in and out of fights.',
    baseAttributes: {
      strength: 11,
      dexterity: 15,
      intelligence: 8,
    },
    scaling: {
      perLevel: {
        strength: 1.1,
        dexterity: 2.1,
        intelligence: 0.8,
      },
    },
    behaviour: {
      aggressionRange: 7,
      pursuitRange: 10,
      leash: 12,
      patrolRadius: 5,
      patrolIntervalMs: 3200,
      stepIntervalMs: 650,
      attack: {
        intervalMs: 1200,
        windupMs: 240,
        damageMultiplier: 0.9,
      },
    },
    damage: {
      baseMin: 4,
      baseMax: 7,
      scalingPerDexterity: 0.65,
    },
  },
  mystic: {
    id: 'mystic',
    label: 'Mystic',
    description: 'Ranged spellcaster relying on intelligence for damage.',
    baseAttributes: {
      strength: 7,
      dexterity: 10,
      intelligence: 17,
    },
    scaling: {
      perLevel: {
        strength: 0.6,
        dexterity: 1.0,
        intelligence: 2.4,
      },
    },
    behaviour: {
      aggressionRange: 9,
      pursuitRange: 11,
      leash: 12,
      patrolRadius: 3,
      patrolIntervalMs: 5200,
      stepIntervalMs: 1100,
      attack: {
        intervalMs: 1900,
        windupMs: 500,
        damageMultiplier: 1.35,
      },
    },
    damage: {
      baseMin: 6,
      baseMax: 10,
      scalingPerIntelligence: 0.9,
    },
  },
};

export function getArchetype(id) {
  return ARCHETYPES[id] || ARCHETYPES.brute;
}

export default ARCHETYPES;
