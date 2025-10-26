const RARITIES = {
  common: {
    id: 'common',
    label: 'Common',
    color: '#c9c6bf',
    attributeMultiplier: 1,
    healthMultiplier: 1,
    damageMultiplier: 1,
    attackSpeedMultiplier: 1,
    respawnMultiplier: 1,
  },
  uncommon: {
    id: 'uncommon',
    label: 'Uncommon',
    color: '#4fb175',
    attributeMultiplier: 1.1,
    healthMultiplier: 1.2,
    damageMultiplier: 1.15,
    attackSpeedMultiplier: 0.95,
    respawnMultiplier: 1.1,
  },
  rare: {
    id: 'rare',
    label: 'Rare',
    color: '#3e6ad1',
    attributeMultiplier: 1.25,
    healthMultiplier: 1.35,
    damageMultiplier: 1.3,
    attackSpeedMultiplier: 0.9,
    respawnMultiplier: 1.3,
  },
  elite: {
    id: 'elite',
    label: 'Elite',
    color: '#c43ddb',
    attributeMultiplier: 1.45,
    healthMultiplier: 1.65,
    damageMultiplier: 1.55,
    attackSpeedMultiplier: 0.85,
    respawnMultiplier: 1.5,
  },
};

export function getRarity(id) {
  return RARITIES[id] || RARITIES.common;
}

export default RARITIES;
