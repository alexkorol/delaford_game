import { DEFAULT_FACING_DIRECTION } from '#shared/combat.js';
import {
  ATTRIBUTE_IDS,
  applyDamage as applyStatDamage,
  applyHealing as applyStatHealing,
  createCharacterState,
  syncShortcuts,
} from '#shared/stats/index.js';

export const DEFAULT_RESPAWN = {
  delayMs: 20000,
  healthFraction: 1,
  manaFraction: 1,
};

export const DEFAULT_BEHAVIOUR = {
  aggressionRange: 5,
  pursuitRange: 8,
  leash: 10,
  patrolRadius: 4,
  patrolIntervalMs: 5000,
  stepIntervalMs: 850,
  attack: {
    intervalMs: 1600,
    windupMs: 300,
    damageMultiplier: 1,
  },
};

export const clamp = (value, min, max) => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

export const clone = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(clone);
  }
  return Object.entries(value).reduce((acc, [key, entry]) => {
    acc[key] = clone(entry);
    return acc;
  }, {});
};

const buildBehaviour = (monster, overrides = {}) => {
  const archetype = monster.archetype;
  const rarity = monster.rarity;

  const base = clone(DEFAULT_BEHAVIOUR);
  const archetypeBehaviour = archetype && archetype.behaviour ? clone(archetype.behaviour) : {};

  const merged = {
    ...base,
    ...archetypeBehaviour,
    ...clone(overrides || {}),
  };

  merged.attack = {
    ...base.attack,
    ...(archetypeBehaviour && archetypeBehaviour.attack ? archetypeBehaviour.attack : {}),
    ...(overrides && overrides.attack ? overrides.attack : {}),
  };

  if (rarity && rarity.attackSpeedMultiplier) {
    merged.attack.intervalMs = Math.round(merged.attack.intervalMs * rarity.attackSpeedMultiplier);
  }

  merged.attack.intervalMs = Math.max(400, merged.attack.intervalMs || DEFAULT_BEHAVIOUR.attack.intervalMs);
  merged.attack.windupMs = Math.max(100, merged.attack.windupMs || DEFAULT_BEHAVIOUR.attack.windupMs);

  merged.patrolRadius = Math.max(0, Number.isFinite(merged.patrolRadius) ? merged.patrolRadius : 0);
  merged.leash = Math.max(merged.patrolRadius, Number.isFinite(merged.leash) ? merged.leash : 0);

  merged.patrolIntervalMs = Math.max(1000, merged.patrolIntervalMs || DEFAULT_BEHAVIOUR.patrolIntervalMs);
  merged.stepIntervalMs = Math.max(200, merged.stepIntervalMs || DEFAULT_BEHAVIOUR.stepIntervalMs);

  merged.aggressionRange = Math.max(1, merged.aggressionRange || DEFAULT_BEHAVIOUR.aggressionRange);
  merged.pursuitRange = Math.max(merged.aggressionRange, merged.pursuitRange || merged.aggressionRange + 2);

  return merged;
};

const buildRespawn = (monster, overrides = {}) => {
  const rarity = monster.rarity;
  const respawn = {
    ...DEFAULT_RESPAWN,
    ...(overrides || {}),
  };

  const multiplier = rarity && rarity.respawnMultiplier ? rarity.respawnMultiplier : 1;
  respawn.delayMs = Math.round(respawn.delayMs * multiplier);
  respawn.healthFraction = clamp(Number.isFinite(respawn.healthFraction) ? respawn.healthFraction : 1, 0, 1);
  respawn.manaFraction = clamp(Number.isFinite(respawn.manaFraction) ? respawn.manaFraction : 1, 0, 1);

  return respawn;
};

const buildStats = (monster, attributeOverrides = {}) => {
  const archetype = monster.archetype;
  const rarity = monster.rarity;
  const level = Math.max(1, monster.level || 1);

  const baseAttributes = {};
  ATTRIBUTE_IDS.forEach((attribute) => {
    const baseValue = archetype && archetype.baseAttributes
      ? archetype.baseAttributes[attribute]
      : 10;
    const scaling = archetype && archetype.scaling && archetype.scaling.perLevel
      ? archetype.scaling.perLevel[attribute] || 0
      : 0;
    const overrideBase = attributeOverrides && attributeOverrides.base
      ? attributeOverrides.base[attribute]
      : undefined;
    const rarityMultiplier = rarity && rarity.attributeMultiplier ? rarity.attributeMultiplier : 1;
    const computed = overrideBase !== undefined
      ? overrideBase
      : baseValue + ((level - 1) * scaling);

    baseAttributes[attribute] = Math.round(computed * rarityMultiplier);
  });

  const bonuses = attributeOverrides && attributeOverrides.bonuses
    ? clone(attributeOverrides.bonuses)
    : {};
  const equipment = attributeOverrides && attributeOverrides.equipment
    ? clone(attributeOverrides.equipment)
    : {};

  const state = createCharacterState({
    level,
    attributes: {
      base: baseAttributes,
      bonuses,
      equipment,
    },
    resources: {
      health: { allowZero: true },
      mana: {},
    },
    lifecycle: {
      mode: 'soft',
      state: 'alive',
      livesRemaining: 0,
    },
  });

  if (rarity && rarity.healthMultiplier && rarity.healthMultiplier !== 1) {
    const health = state.resources.health;
    health.max = Math.max(1, Math.round(health.max * rarity.healthMultiplier));
    health.current = health.max;
  }

  if (rarity && rarity.attributeMultiplier && rarity.attributeMultiplier !== 1) {
    ATTRIBUTE_IDS.forEach((attribute) => {
      const total = state.attributes.total[attribute] || 0;
      state.attributes.total[attribute] = Math.round(total);
    });
  }

  return state;
};

const takeDamage = (monster, amount, options = {}) => {
  if (!monster.stats) {
    monster.stats = buildStats(monster);
  }

  const result = applyStatDamage(monster.stats, amount, options);
  syncShortcuts(monster.stats, monster);

  if (result && (result.type === 'death' || result.type === 'permadeath')) {
    monster.statsManager.handleDeath(options.now || Date.now());
  }

  return result;
};

const heal = (monster, amount, options = {}) => {
  if (!monster.stats) {
    monster.stats = buildStats(monster);
  }

  const result = applyStatHealing(monster.stats, amount, options);
  syncShortcuts(monster.stats, monster);
  return result;
};

const handleDeath = (monster, now = Date.now()) => {
  monster.state.mode = 'dead';
  monster.state.pendingAttack = null;
  monster.state.respawnAt = now + monster.respawn.delayMs;
  monster.setAnimationState('hurt', { direction: monster.facing, startedAt: now });
};

const respawnNow = (monster, now = Date.now()) => {
  monster.stats.lifecycle.state = 'alive';
  monster.stats.resources.health.current = Math.max(
    1,
    Math.round(monster.stats.resources.health.max * monster.respawn.healthFraction),
  );
  monster.stats.resources.mana.current = Math.round(
    monster.stats.resources.mana.max * monster.respawn.manaFraction,
  );
  syncShortcuts(monster.stats, monster);
  monster.x = monster.spawn.x;
  monster.y = monster.spawn.y;
  monster.state.mode = 'idle';
  monster.state.targetId = null;
  monster.state.respawnAt = null;
  monster.state.pendingAttack = null;
  monster.state.patrolTarget = monster.movement.pickPatrolTarget();
  monster.setAnimationState('idle', { startedAt: now, direction: monster.facing || DEFAULT_FACING_DIRECTION });
};

const createMonsterStatsManager = (monster) => ({
  buildBehaviour: overrides => buildBehaviour(monster, overrides),
  buildRespawn: overrides => buildRespawn(monster, overrides),
  buildStats: overrides => buildStats(monster, overrides),
  takeDamage: (amount, options) => takeDamage(monster, amount, options),
  heal: (amount, options) => heal(monster, amount, options),
  handleDeath: now => handleDeath(monster, now),
  respawnNow: now => respawnNow(monster, now),
});

export default createMonsterStatsManager;
