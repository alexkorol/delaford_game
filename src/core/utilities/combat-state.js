const clampNumber = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
};

const cloneMeter = (meter = {}, fallbackMax = 0, options = {}) => {
  const allowZero = options.allowZero === true;
  const defaultCurrent = options.defaultCurrent;

  const resolvedMax = Math.max(allowZero ? 0 : 1, Math.round(clampNumber(meter.max, fallbackMax)));
  const rawCurrent = meter.current;
  const resolvedCurrent = Number.isFinite(rawCurrent)
    ? rawCurrent
    : (Number.isFinite(defaultCurrent) ? defaultCurrent : resolvedMax);

  const min = allowZero ? 0 : 1;
  const clamped = Math.min(Math.max(resolvedCurrent, min), resolvedMax);

  return {
    current: clamped,
    max: resolvedMax,
  };
};

const cloneAdditionalResource = (resource, fallback = 0) => {
  if (!resource || typeof resource !== 'object') {
    return {
      current: Math.max(0, Math.round(fallback)),
      max: Math.max(0, Math.round(fallback)),
    };
  }

  const max = Math.max(0, Math.round(clampNumber(resource.max, fallback)));
  const current = Number.isFinite(resource.current)
    ? resource.current
    : (Number.isFinite(resource.value) ? resource.value : max);

  return {
    current: Math.max(0, Math.min(current, max)),
    max,
  };
};

const cloneResourceMap = (resources = {}) => Object.entries(resources).reduce((acc, [key, value]) => {
  if (value && typeof value === 'object') {
    acc[key] = { ...value };
  }
  return acc;
}, {});

const normaliseCooldownEntry = (entry) => {
  if (entry === null || entry === undefined) {
    return null;
  }

  if (typeof entry === 'number') {
    if (!Number.isFinite(entry) || entry <= 0) {
      return null;
    }

    const value = Math.round(entry);
    return { duration: value, remaining: value };
  }

  if (typeof entry !== 'object') {
    return null;
  }

  const duration = Math.max(0, Math.round(clampNumber(entry.duration, clampNumber(entry.max, clampNumber(entry.total, 0)))));
  const remaining = Math.max(0, Math.round(clampNumber(entry.remaining, clampNumber(entry.value, duration))));

  if (duration <= 0 && remaining <= 0) {
    return null;
  }

  return { duration, remaining };
};

const normaliseAbilityCooldowns = (cooldowns = {}) => {
  const map = {};
  Object.entries(cooldowns).forEach(([abilityId, value]) => {
    const resolvedId = typeof abilityId === 'string' ? abilityId.trim() : '';
    const normalised = normaliseCooldownEntry(value);
    if (resolvedId && normalised) {
      map[resolvedId] = normalised;
    }
  });
  return map;
};

const cloneEffectState = (effect) => {
  if (!effect || typeof effect !== 'object') {
    return null;
  }

  const id = typeof effect.id === 'string' && effect.id.trim()
    ? effect.id.trim()
    : null;

  const magnitude = Number.isFinite(effect.magnitude)
    ? effect.magnitude
    : Number.isFinite(effect.amount)
      ? effect.amount
      : 0;

  const durationMs = Math.max(0, Math.round(clampNumber(effect.durationMs, clampNumber(effect.duration, 0))));
  const remainingMs = Math.max(0, Math.round(clampNumber(effect.remainingDurationMs, durationMs)));
  const tickMs = Math.max(0, Math.round(clampNumber(effect.tickIntervalMs, clampNumber(effect.intervalMs, 0))));

  return {
    id,
    type: effect.type || 'generic',
    magnitude,
    durationMs,
    remainingDurationMs: remainingMs,
    tickIntervalMs: tickMs,
    sourceAbilityId: effect.sourceAbilityId || effect.abilityId || null,
    appliedAt: effect.appliedAt || null,
    stacks: Number.isFinite(effect.stacks) ? Math.max(1, Math.round(effect.stacks)) : 1,
    targetId: effect.targetId || null,
  };
};

export const buildResourceSnapshot = (stats = {}, overrides = {}) => {
  const statsHealth = Number.isFinite(stats.health) ? stats.health : 1;
  const statsMana = Number.isFinite(stats.mana) ? stats.mana : 0;
  const statsStamina = Number.isFinite(stats.stamina)
    ? stats.stamina
    : Number.isFinite(stats.energy)
      ? stats.energy
      : 0;

  const healthSource = overrides.health || overrides.hp || {};
  const manaSource = overrides.mana || overrides.mp || {};
  const staminaSource = overrides.stamina || overrides.energy || {};

  const allowZeroHealth = healthSource.allowZero === true || healthSource.current === 0;

  const health = cloneMeter(healthSource, statsHealth, {
    allowZero: allowZeroHealth,
    defaultCurrent: statsHealth,
  });

  const mana = cloneMeter(manaSource, statsMana, {
    allowZero: true,
    defaultCurrent: statsMana,
  });

  const stamina = cloneMeter(staminaSource, statsStamina, {
    allowZero: true,
    defaultCurrent: statsStamina,
  });

  const resources = {
    health,
    mana,
  };

  if (stamina.max > 0 || stamina.current > 0) {
    resources.stamina = stamina;
  }

  Object.entries(overrides).forEach(([key, value]) => {
    if (['health', 'hp', 'mana', 'mp', 'stamina', 'energy'].includes(key)) {
      return;
    }

    if (value && typeof value === 'object') {
      resources[key] = cloneAdditionalResource(value, 0);
    }
  });

  return resources;
};

export const buildCooldownSnapshot = (cooldowns = {}) => ({
  global: Math.max(0, Math.round(clampNumber(cooldowns.global, 0))),
  abilities: normaliseAbilityCooldowns(cooldowns.abilities || {}),
});

export const buildCombatState = (entity = {}, baseStats = {}) => {
  const stats = entity.stats || {};
  const resourceStats = {
    health: Number.isFinite(stats.health)
      ? stats.health
      : Number.isFinite(baseStats.health)
        ? baseStats.health
        : Number.isFinite(stats?.resources?.health?.max)
          ? stats.resources.health.max
          : 1,
    mana: Number.isFinite(stats.mana)
      ? stats.mana
      : Number.isFinite(baseStats.mana)
        ? baseStats.mana
        : Number.isFinite(stats?.resources?.mana?.max)
          ? stats.resources.mana.max
          : 0,
    stamina: Number.isFinite(stats.stamina)
      ? stats.stamina
      : Number.isFinite(baseStats.stamina)
        ? baseStats.stamina
        : Number.isFinite(stats?.resources?.stamina?.max)
          ? stats.resources.stamina.max
          : 100,
  };

  const resourceOverrides = entity.resources
    || (entity.stats && entity.stats.resources)
    || {};

  const combatResources = buildResourceSnapshot(resourceStats, resourceOverrides);
  const cooldownSnapshot = buildCooldownSnapshot(entity.cooldowns || {});

  const effects = Array.isArray(entity.activeEffects)
    ? entity.activeEffects
      .map((effect) => cloneEffectState(effect))
      .filter((effect) => effect !== null)
    : [];

  return {
    resources: combatResources,
    cooldowns: cooldownSnapshot,
    activeEffects: effects,
    lastUpdatedAt: Date.now(),
  };
};

export const cloneCombatState = (state = null) => {
  if (!state) {
    return {
      resources: {},
      cooldowns: { global: 0, abilities: {} },
      activeEffects: [],
      lastUpdatedAt: Date.now(),
    };
  }

  return {
    resources: cloneResourceMap(state.resources || {}),
    cooldowns: {
      global: Math.max(0, Math.round(clampNumber(state.cooldowns?.global, 0))),
      abilities: normaliseAbilityCooldowns(state.cooldowns?.abilities || {}),
    },
    activeEffects: Array.isArray(state.activeEffects)
      ? state.activeEffects
        .map((effect) => cloneEffectState(effect))
        .filter((effect) => effect !== null)
      : [],
    lastUpdatedAt: Date.now(),
  };
};

export const mergeCombatState = (previous = null, incoming = null) => {
  if (!previous && !incoming) {
    return cloneCombatState();
  }

  if (!previous) {
    return cloneCombatState(incoming);
  }

  if (!incoming) {
    return cloneCombatState(previous);
  }

  const previousState = cloneCombatState(previous);
  const incomingState = cloneCombatState(incoming);

  const mergedResources = { ...previousState.resources };
  Object.entries(incomingState.resources).forEach(([key, meter]) => {
    const fallback = previousState.resources[key] || {};
    mergedResources[key] = {
      current: Number.isFinite(meter.current) ? meter.current : fallback.current,
      max: Number.isFinite(meter.max) ? meter.max : fallback.max,
    };
  });

  const mergedAbilities = { ...previousState.cooldowns.abilities };
  Object.entries(incomingState.cooldowns.abilities).forEach(([abilityId, entry]) => {
    mergedAbilities[abilityId] = entry;
  });

  const mergedEffects = incomingState.activeEffects.length
    ? incomingState.activeEffects
    : previousState.activeEffects;

  return {
    resources: mergedResources,
    cooldowns: {
      global: incomingState.cooldowns.global ?? previousState.cooldowns.global,
      abilities: mergedAbilities,
    },
    activeEffects: mergedEffects,
    lastUpdatedAt: Date.now(),
  };
};

export const applyCombatState = (entity, state = null) => {
  if (!entity || typeof entity !== 'object') {
    return entity;
  }

  const snapshot = cloneCombatState(state || entity.combatState);
  entity.combatState = snapshot;

  if (!entity.stats || typeof entity.stats !== 'object') {
    entity.stats = {};
  }

  entity.stats.resources = Object.entries(snapshot.resources).reduce((acc, [key, meter]) => {
    acc[key] = { ...meter };
    return acc;
  }, {});

  if (snapshot.resources.health) {
    entity.hp = { ...snapshot.resources.health };
  }

  if (snapshot.resources.mana) {
    entity.mana = { ...snapshot.resources.mana };
  }

  if (snapshot.resources.stamina) {
    entity.stamina = { ...snapshot.resources.stamina };
  }

  entity.cooldowns = {
    global: snapshot.cooldowns.global,
    abilities: { ...snapshot.cooldowns.abilities },
  };

  return entity;
};

export const updateEntityResources = (entity, resources = {}) => {
  if (!entity || typeof entity !== 'object') {
    return;
  }

  const cloneResources = Object.entries(resources).reduce((acc, [key, meter]) => {
    if (!meter || typeof meter !== 'object') {
      return acc;
    }

    acc[key] = {
      current: Number.isFinite(meter.current) ? meter.current : 0,
      max: Number.isFinite(meter.max) ? meter.max : 0,
    };
    return acc;
  }, {});

  entity.combatState = entity.combatState || {};
  entity.combatState.resources = {
    ...(entity.combatState.resources || {}),
    ...cloneResources,
  };

  if (!entity.stats || typeof entity.stats !== 'object') {
    entity.stats = {};
  }

  entity.stats.resources = Object.entries(entity.combatState.resources).reduce((acc, [key, meter]) => {
    acc[key] = { ...meter };
    return acc;
  }, {});

  if (entity.combatState.resources.health) {
    entity.hp = { ...entity.combatState.resources.health };
  }

  if (entity.combatState.resources.mana) {
    entity.mana = { ...entity.combatState.resources.mana };
  }

  if (entity.combatState.resources.stamina) {
    entity.stamina = { ...entity.combatState.resources.stamina };
  }
};

export default {
  buildCombatState,
  cloneCombatState,
  mergeCombatState,
  applyCombatState,
  updateEntityResources,
  buildResourceSnapshot,
  buildCooldownSnapshot,
};
