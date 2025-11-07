import bus from './utilities/bus.js';
import {
  buildCombatState,
  cloneCombatState,
  mergeCombatState,
  applyCombatState,
  updateEntityResources,
} from './utilities/combat-state.js';

const DEFAULT_TICK_INTERVAL_MS = 1000;

const normaliseNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clone = (value) => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => clone(entry));
  }

  return Object.keys(value).reduce((acc, key) => {
    acc[key] = clone(value[key]);
    return acc;
  }, {});
};

const ensureCombatState = (entity) => {
  if (!entity || typeof entity !== 'object') {
    return null;
  }

  const baseStats = entity.stats || {};
  const state = entity.combatState ? mergeCombatState(buildCombatState(entity, baseStats), entity.combatState) : buildCombatState(entity, baseStats);
  applyCombatState(entity, state);
  return entity.combatState;
};

const ensureAbilityMap = (lookup = {}) => {
  if (lookup instanceof Map) {
    return lookup;
  }

  if (Array.isArray(lookup)) {
    return new Map(lookup.map((ability) => [ability.id, ability]));
  }

  if (lookup && typeof lookup === 'object') {
    return new Map(Object.entries(lookup));
  }

  return new Map();
};

const resolveAbilityId = (ability) => {
  if (!ability) {
    return '';
  }

  if (typeof ability === 'string') {
    return ability.trim();
  }

  return typeof ability.id === 'string' ? ability.id.trim() : '';
};

const resolveEntityId = (entity) => {
  if (!entity) {
    return '';
  }

  if (typeof entity === 'string') {
    return entity.trim();
  }

  if (typeof entity.id === 'string') {
    return entity.id.trim();
  }

  if (typeof entity.uuid === 'string') {
    return entity.uuid.trim();
  }

  return '';
};

const cloneEffectDescriptor = (abilityId, effect, overrides = {}) => {
  if (!effect || typeof effect !== 'object') {
    return null;
  }

  const durationMs = Math.max(0, normaliseNumber(overrides.durationMs ?? effect.duration ?? 0, 0));
  const tickIntervalMs = Math.max(0, normaliseNumber(overrides.tickIntervalMs ?? overrides.intervalMs ?? 0, 0));
  const magnitude = normaliseNumber(overrides.magnitude ?? effect.magnitude ?? effect.amount ?? 0, 0);

  return {
    id: `${abilityId}:${effect.id || effect.type}`,
    type: effect.type || 'generic',
    magnitude,
    durationMs,
    remainingDurationMs: durationMs,
    tickIntervalMs,
    sourceAbilityId: abilityId,
  };
};

class AbilityManager {
  constructor(options = {}) {
    const abilityResolver = options.resolveAbility;
    const abilityCollection = options.abilities || null;

    this.bus = options.bus || bus;
    this.entities = new Map();
    this.queue = [];

    this.tickIntervalMs = Math.max(16, normaliseNumber(options.tickIntervalMs, DEFAULT_TICK_INTERVAL_MS));
    this.tickAccumulatorMs = 0;

    this.abilityLookup = ensureAbilityMap(abilityCollection);
    this.resolveAbility = typeof abilityResolver === 'function'
      ? abilityResolver
      : (id) => this.abilityLookup.get(id) || null;

    this.defaultCooldownMs = Math.max(0, normaliseNumber(options.defaultCooldownMs, 0));
  }

  registerAbilityCollection(collection) {
    this.abilityLookup = ensureAbilityMap(collection);
  }

  registerEntity(entity) {
    if (!entity || typeof entity !== 'object') {
      return null;
    }

    const id = entity.uuid || entity.id;
    if (!id) {
      return null;
    }

    const combatState = ensureCombatState(entity);

    const record = this.entities.get(id) || {
      id,
      entity,
      combatState: cloneCombatState(combatState),
      cooldowns: new Map(),
      activeEffects: [],
    };

    record.entity = entity;
    record.combatState = cloneCombatState(combatState);
    record.activeEffects = Array.isArray(combatState.activeEffects)
      ? combatState.activeEffects.map((effect) => ({ ...effect }))
      : [];

    this.entities.set(id, record);
    this.syncEntity(record);
    return record;
  }

  unregisterEntity(entityId) {
    this.entities.delete(entityId);
  }

  queueAbility(casterId, abilityId, payload = {}) {
    const resolvedCasterId = resolveEntityId(casterId);
    const resolvedAbilityId = resolveAbilityId(abilityId);

    if (!resolvedCasterId || !resolvedAbilityId) {
      return false;
    }

    this.queue.push({
      casterId: resolvedCasterId,
      abilityId: resolvedAbilityId,
      payload: { ...payload },
      enqueuedAt: Date.now(),
    });

    return true;
  }

  canPayResourceCosts(record, ability) {
    if (!record || !ability) {
      return false;
    }

    const costs = ability.resourceCost || {};
    const resources = record.combatState.resources || {};

    return Object.entries(costs).every(([resourceId, amount]) => {
      const meter = resources[resourceId];
      if (!meter) {
        return Number(amount) === 0;
      }

      return meter.current >= Number(amount);
    });
  }

  payResourceCosts(record, ability) {
    const costs = ability.resourceCost || {};
    const resources = clone(record.combatState.resources || {});

    Object.entries(costs).forEach(([resourceId, amount]) => {
      const meter = resources[resourceId];
      if (!meter) {
        return;
      }

      const cost = Math.max(0, Number(amount));
      meter.current = Math.max(0, meter.current - cost);
    });

    record.combatState.resources = resources;
    updateEntityResources(record.entity, resources);
  }

  startCooldown(record, ability) {
    const cooldownMs = Math.max(0, Number(ability.cooldown || this.defaultCooldownMs));
    if (cooldownMs <= 0) {
      return;
    }

    record.combatState.cooldowns.abilities[ability.id] = {
      duration: cooldownMs,
      remaining: cooldownMs,
    };

    record.entity.cooldowns = record.entity.cooldowns || {};
    record.entity.cooldowns.abilities = {
      ...(record.entity.cooldowns.abilities || {}),
      [ability.id]: {
        duration: cooldownMs,
        remaining: cooldownMs,
      },
    };
  }

  isAbilityOnCooldown(record, abilityId) {
    const cooldowns = record && record.combatState && record.combatState.cooldowns;
    const entry = cooldowns && cooldowns.abilities ? cooldowns.abilities[abilityId] : null;
    return Boolean(entry && entry.remaining > 0);
  }

  processQueue() {
    if (!this.queue.length) {
      return;
    }

    const pending = [...this.queue];
    this.queue.length = 0;

    pending.forEach((entry) => {
      const record = this.entities.get(entry.casterId);
      if (!record) {
        return;
      }

      const ability = this.resolveAbility(entry.abilityId);
      if (!ability || this.isAbilityOnCooldown(record, ability.id)) {
        return;
      }

      if (!this.canPayResourceCosts(record, ability)) {
        return;
      }

      this.payResourceCosts(record, ability);
      this.startCooldown(record, ability);

      this.applyAbilityEffects(record, ability, entry.payload);

      if (this.bus && typeof this.bus.$emit === 'function') {
        this.bus.$emit('ability:cast', {
          casterId: record.id,
          abilityId: ability.id,
          payload: entry.payload,
        });
      }
    });
  }

  applyAbilityEffects(record, ability, payload = {}) {
    const effects = Array.isArray(ability.effects) ? ability.effects : [];

    effects.forEach((effect) => {
      const targetId = resolveEntityId(payload.targetId) || record.id;
      const target = this.entities.get(targetId);
      if (!target) {
        return;
      }

      const durationMs = Math.max(0, Number(effect.duration || 0));
      if (durationMs > 0 && ['damage', 'heal'].includes(effect.type)) {
        const tickIntervalMs = effect.tickIntervalMs
          ? Math.max(50, Number(effect.tickIntervalMs))
          : this.tickIntervalMs;

        const descriptor = cloneEffectDescriptor(ability.id, effect, {
          durationMs,
          tickIntervalMs,
          magnitude: effect.magnitude,
        });

        if (descriptor) {
          descriptor.type = effect.type;
          descriptor.targetId = target.id;
          descriptor.remainingDurationMs = durationMs;
          descriptor.nextTickInMs = 0;
          descriptor.totalDurationMs = durationMs;
          descriptor.amountPerTick = this.computeTickAmount(effect.magnitude, durationMs, tickIntervalMs);

          target.activeEffects.push(descriptor);
          this.syncEntity(target);
        }
        return;
      }

      if (effect.type === 'damage') {
        this.applyDirectDamage(target, effect.magnitude, ability);
      } else if (effect.type === 'heal') {
        this.applyDirectHeal(target, effect.magnitude, ability);
      }
    });
  }

  computeTickAmount(magnitude, durationMs, tickIntervalMs) {
    if (!Number.isFinite(magnitude) || magnitude === 0) {
      return 0;
    }

    const totalTicks = Math.max(1, Math.round(durationMs / tickIntervalMs));
    return magnitude / totalTicks;
  }

  applyDirectDamage(record, magnitude, ability) {
    if (!record || !Number.isFinite(magnitude) || magnitude <= 0) {
      return;
    }

    const resources = clone(record.combatState.resources || {});
    if (!resources.health) {
      return;
    }

    resources.health.current = Math.max(0, resources.health.current - magnitude);
    record.combatState.resources = resources;
    updateEntityResources(record.entity, resources);
    this.syncEntity(record);

    if (this.bus && typeof this.bus.$emit === 'function') {
      this.bus.$emit('ability:effect:damage', {
        targetId: record.id,
        amount: magnitude,
        abilityId: ability?.id || null,
      });
    }
  }

  applyDirectHeal(record, magnitude, ability) {
    if (!record || !Number.isFinite(magnitude) || magnitude <= 0) {
      return;
    }

    const resources = clone(record.combatState.resources || {});
    if (!resources.health) {
      return;
    }

    const meter = resources.health;
    meter.current = Math.min(meter.max, meter.current + magnitude);
    record.combatState.resources = resources;
    updateEntityResources(record.entity, resources);
    this.syncEntity(record);

    if (this.bus && typeof this.bus.$emit === 'function') {
      this.bus.$emit('ability:effect:heal', {
        targetId: record.id,
        amount: magnitude,
        abilityId: ability?.id || null,
      });
    }
  }

  updateCooldowns(deltaMs) {
    this.entities.forEach((record) => {
      const { abilities } = record.combatState.cooldowns;
      Object.entries(abilities).forEach(([abilityId, cooldown]) => {
        const remaining = Math.max(0, Math.round(cooldown.remaining - deltaMs));
        cooldown.remaining = remaining;

        if (remaining <= 0) {
          cooldown.remaining = 0;
        }
      });

      record.entity.cooldowns = {
        ...(record.entity.cooldowns || {}),
        abilities: { ...abilities },
      };
    });
  }

  tickEffects(deltaMs) {
    this.tickAccumulatorMs += deltaMs;

    if (this.tickAccumulatorMs < this.tickIntervalMs) {
      return;
    }

    const iterations = Math.floor(this.tickAccumulatorMs / this.tickIntervalMs);
    this.tickAccumulatorMs -= iterations * this.tickIntervalMs;

    for (let i = 0; i < iterations; i += 1) {
      this.entities.forEach((record) => {
        const remainingEffects = [];

        record.activeEffects.forEach((effect) => {
          const updated = { ...effect };
          updated.remainingDurationMs = Math.max(0, updated.remainingDurationMs - this.tickIntervalMs);
          updated.nextTickInMs = Math.max(0, (updated.nextTickInMs || 0) - this.tickIntervalMs);

          if (updated.nextTickInMs <= 0) {
            this.resolveEffectTick(record, updated);
            updated.nextTickInMs = effect.tickIntervalMs || this.tickIntervalMs;
          }

          if (updated.remainingDurationMs > 0) {
            remainingEffects.push(updated);
          }
        });

        record.activeEffects = remainingEffects;
        this.syncEntity(record);
      });
    }
  }

  resolveEffectTick(record, effect) {
    if (!record || !effect) {
      return;
    }

    const amount = Number(effect.amountPerTick || effect.magnitude || 0);
    if (!Number.isFinite(amount) || amount === 0) {
      return;
    }

    if (effect.type === 'damage') {
      this.applyDirectDamage(record, Math.abs(amount), { id: effect.sourceAbilityId });
    } else if (effect.type === 'heal') {
      this.applyDirectHeal(record, Math.abs(amount), { id: effect.sourceAbilityId });
    }
  }

  update(deltaSeconds = 0) {
    const deltaMs = Math.max(0, deltaSeconds * 1000);
    this.updateCooldowns(deltaMs);
    this.processQueue();
    this.tickEffects(deltaMs);
    this.entities.forEach((record) => {
      this.syncEntity(record);
    });
  }

  syncEntity(record) {
    if (!record) {
      return;
    }

    record.combatState.activeEffects = record.activeEffects.map((effect) => ({ ...effect }));
    applyCombatState(record.entity, record.combatState);
  }
}

export default AbilityManager;
export { ensureCombatState, mergeCombatState };
