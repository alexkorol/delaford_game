import bus from './utilities/bus.js';
import { getMonsterDefinition, getAbilityDefinition } from './config/combat/index.js';
import { createMonsterBehavior } from './ai/monster-behavior.js';

const DEFAULT_TICK_INTERVAL = 1000;
const DEFAULT_RESISTANCE_VALUE = 0.25;
const DEFAULT_WEAKNESS_VALUE = -0.25;

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

const normaliseNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normaliseDamageType = (damageType) => {
  if (typeof damageType !== 'string') {
    return 'physical';
  }

  const lower = damageType.trim().toLowerCase();
  return lower || 'physical';
};

const resolveResistanceValue = (value, fallback = 0) => {
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return fallback;
};

const clampResistance = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const clamped = Math.max(-0.95, Math.min(0.95, value));
  return Math.round(clamped * 1000) / 1000;
};

const createHealthState = (entity = {}, baseStats = {}) => {
  const statsHealth = normaliseNumber(entity?.stats?.health, baseStats?.health);
  const max = normaliseNumber(entity?.health?.max, statsHealth || baseStats?.health || 1);
  const current = normaliseNumber(entity?.health?.current, max);

  return {
    max: Math.max(1, Math.round(max)),
    current: Math.max(0, Math.round(Math.min(current, max))),
  };
};

const createResistanceProfile = (base = {}, entity = {}, options = {}) => {
  const resistanceValue = options.defaultResistance ?? DEFAULT_RESISTANCE_VALUE;
  const weaknessValue = options.defaultWeakness ?? DEFAULT_WEAKNESS_VALUE;

  const resistanceMap = new Map();

  const applyArray = (collection, value) => {
    if (!Array.isArray(collection)) {
      return;
    }

    collection.forEach((entry) => {
      if (typeof entry !== 'string') {
        return;
      }

      const key = normaliseDamageType(entry);
      const current = resistanceMap.get(key) || 0;
      resistanceMap.set(key, clampResistance(current + value));
    });
  };

  const applyObject = (collection = {}) => {
    Object.entries(collection).forEach(([key, value]) => {
      if (typeof key !== 'string') {
        return;
      }

      const resolved = resolveResistanceValue(value, 0);
      const normalised = normaliseDamageType(key);
      const current = resistanceMap.get(normalised) || 0;
      resistanceMap.set(normalised, clampResistance(current + resolved));
    });
  };

  applyArray(base?.resistances, resistanceValue);
  applyArray(entity?.resistances, resistanceValue);
  applyArray(entity?.stats?.resistances, resistanceValue);

  applyArray(base?.weaknesses, weaknessValue);
  applyArray(entity?.weaknesses, weaknessValue);
  applyArray(entity?.stats?.weaknesses, weaknessValue);

  if (base?.resistanceValues) {
    applyObject(base.resistanceValues);
  }
  if (entity?.resistanceValues) {
    applyObject(entity.resistanceValues);
  }
  if (entity?.stats?.resistanceValues) {
    applyObject(entity.stats.resistanceValues);
  }
  if (entity?.resistances && !Array.isArray(entity.resistances)) {
    applyObject(entity.resistances);
  }
  if (entity?.weaknesses && !Array.isArray(entity.weaknesses)) {
    applyObject(entity.weaknesses);
  }

  return resistanceMap;
};

const buildBaseStats = (base = {}, entity = {}) => {
  const stats = {
    attack: 0,
    defense: 0,
    speed: 0,
    ...clone(base?.stats || {}),
    ...clone(entity?.stats || {}),
  };

  stats.attack = normaliseNumber(stats.attack, 0);
  stats.defense = normaliseNumber(stats.defense, 0);
  stats.speed = normaliseNumber(stats.speed, 0);

  if (!Number.isFinite(stats.health) && Number.isFinite(base?.stats?.health)) {
    stats.health = normaliseNumber(base.stats.health, 1);
  } else if (Number.isFinite(stats.health)) {
    stats.health = normaliseNumber(stats.health, 1);
  }

  return stats;
};

const computeHitChance = (attack, defense) => {
  const attackScore = Math.max(1, attack);
  const defenseScore = Math.max(1, defense);
  const ratio = attackScore / (attackScore + defenseScore);
  return Math.min(0.95, Math.max(0.05, Math.round(ratio * 1000) / 1000));
};

const createLogger = (label = 'CombatEngine') => {
  if (typeof console === 'undefined') {
    return null;
  }

  const prefix = `[${label}]`;

  return {
    log: (...args) => {
      if (typeof console.debug === 'function') {
        console.debug(prefix, ...args);
        return;
      }
      if (typeof console.log === 'function') {
        console.log(prefix, ...args);
      }
    },
    warn: (...args) => {
      if (typeof console.warn === 'function') {
        console.warn(prefix, ...args);
        return;
      }
      if (typeof console.log === 'function') {
        console.log(prefix, ...args);
      }
    },
    error: (...args) => {
      if (typeof console.error === 'function') {
        console.error(prefix, ...args);
        return;
      }
      if (typeof console.warn === 'function') {
        console.warn(prefix, ...args);
        return;
      }
      if (typeof console.log === 'function') {
        console.log(prefix, ...args);
      }
    },
  };
};

class CombatEngine {
  constructor(options = {}) {
    this.options = {
      defaultResistance: DEFAULT_RESISTANCE_VALUE,
      defaultWeakness: DEFAULT_WEAKNESS_VALUE,
      ...options,
    };

    this.random = typeof options.random === 'function' ? options.random : () => Math.random();
    this.bus = options.bus || bus;
    this.entities = new Map();
    this.effects = new Map();
    this.behaviors = new Map();

    this.resolveAbilityDefinition = typeof options.resolveAbility === 'function'
      ? options.resolveAbility
      : (id) => getAbilityDefinition(id);

    this.behaviorFactory = typeof options.behaviorFactory === 'function'
      ? options.behaviorFactory
      : (behaviorId, behaviorOptions = {}) => createMonsterBehavior(behaviorId, {
        resolveAbility: this.resolveAbilityDefinition,
        random: this.random,
        ...behaviorOptions,
      });

    this.logger = options.logger || createLogger('CombatEngineAI');
    this.enableBehaviorLogs = Boolean(options.enableBehaviorLogs);

    this.defaultAttackCooldownMs = Math.max(300, normaliseNumber(options.defaultAttackCooldownMs, 1200));
    this.defaultMoveCooldownMs = Math.max(200, normaliseNumber(options.defaultMoveCooldownMs, 600));
    this.defaultCastCooldownMs = Math.max(400, normaliseNumber(options.defaultCastCooldownMs, 1500));
  }

  registerEntity(entity) {
    if (!entity || !entity.id) {
      return null;
    }

    const templateId = entity.templateId || entity.monsterId || null;
    const base = entity.kind === 'monster' || templateId
      ? getMonsterDefinition(templateId || entity.id) || null
      : null;

    const stats = buildBaseStats(base, entity);
    const health = createHealthState(entity, base?.stats || {});
    const resistances = createResistanceProfile(base, entity, this.options);
    const abilityIds = Array.isArray(entity.abilityIds)
      ? entity.abilityIds.filter((id) => typeof id === 'string')
      : Array.isArray(base?.abilityIds)
        ? base.abilityIds.filter((id) => typeof id === 'string')
        : [];
    const behaviorId = entity.behavior || base?.behavior || null;

    const record = {
      id: entity.id,
      name: entity.name || base?.name || entity.id,
      kind: entity.kind || (base ? 'monster' : 'player'),
      stats,
      modifiers: {},
      resistances,
      health,
      state: entity.state || 'alive',
      metadata: clone(entity.metadata || {}),
      abilityIds,
      behavior: behaviorId,
    };

    this.entities.set(record.id, record);
    if (record.kind === 'monster' && behaviorId) {
      this.attachBehavior(record, { behaviorId, definition: base });
    }
    this.emitEntityUpdate(record);
    return this.getEntity(record.id);
  }

  unregisterEntity(entityId) {
    if (!this.entities.has(entityId)) {
      return false;
    }

    this.entities.delete(entityId);
    this.behaviors.delete(entityId);
    [...this.effects.values()].forEach((instance) => {
      if (instance.targetId === entityId || instance.sourceId === entityId) {
        this.effects.delete(instance.instanceId);
      }
    });
    return true;
  }

  getEntity(entityId) {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return null;
    }

    return {
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      stats: clone(entity.stats),
      modifiers: clone(entity.modifiers),
      resistances: new Map(entity.resistances),
      health: clone(entity.health),
      state: entity.state,
      metadata: clone(entity.metadata),
      abilityIds: Array.isArray(entity.abilityIds) ? [...entity.abilityIds] : [],
      behavior: entity.behavior || null,
    };
  }

  listEntities() {
    return [...this.entities.keys()].map((id) => this.getEntity(id));
  }

  getOpponents(entityId) {
    const source = this.entities.get(entityId);
    if (!source) {
      return [];
    }

    return [...this.entities.values()]
      .filter((entry) => entry.id !== entityId && entry.state !== 'dead' && entry.kind !== source.kind)
      .map((entry) => this.getEntity(entry.id));
  }

  attachBehavior(record, context = {}) {
    if (!record || typeof this.behaviorFactory !== 'function') {
      return null;
    }

    const behaviorId = context.behaviorId || record.behavior;
    if (!behaviorId) {
      return null;
    }

    try {
      const controller = this.behaviorFactory(behaviorId, {
        entityId: record.id,
        definition: context.definition || null,
      });

      if (!controller || typeof controller.update !== 'function') {
        return null;
      }

      this.behaviors.set(record.id, controller);

      if (this.enableBehaviorLogs && this.logger?.log) {
        this.logger.log(`Attached behavior '${behaviorId}' to entity '${record.id}'`);
      }

      return controller;
    } catch (error) {
      if (this.logger?.error) {
        this.logger.error('Failed to attach behavior', behaviorId, error);
      }
      return null;
    }
  }

  listActiveEffects(targetId = null) {
    const entries = [...this.effects.values()].filter((instance) => {
      if (!targetId) {
        return true;
      }
      return instance.targetId === targetId;
    });

    return entries.map((instance) => ({
      instanceId: instance.instanceId,
      effect: { ...instance.effect },
      sourceId: instance.sourceId,
      targetId: instance.targetId,
      stacks: instance.stacks,
      maxStacks: instance.maxStacks,
      tickInterval: instance.tickInterval,
      timeUntilTick: instance.timeUntilTick,
      remaining: instance.remaining,
    }));
  }

  getEffectiveStat(entity, stat) {
    const base = normaliseNumber(entity.stats?.[stat], 0);
    const modifier = normaliseNumber(entity.modifiers?.[stat], 0);
    return base + modifier;
  }

  getResistance(entity, damageType) {
    if (!entity) {
      return 0;
    }

    const key = normaliseDamageType(damageType);
    return entity.resistances.get(key) || 0;
  }

  setResistance(entityId, damageType, value) {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return null;
    }

    const key = normaliseDamageType(damageType);
    entity.resistances.set(key, clampResistance(resolveResistanceValue(value, 0)));
    this.emitEntityUpdate(entity);
    return this.getEntity(entityId);
  }

  performAttack(payload = {}) {
    const attacker = this.entities.get(payload.attackerId);
    const defender = this.entities.get(payload.defenderId);

    if (!attacker || !defender) {
      return { hit: false, reason: 'invalid-entity' };
    }

    if (defender.state === 'dead') {
      return { hit: false, reason: 'target-dead' };
    }

    const attackerAttack = this.getEffectiveStat(attacker, 'attack');
    const defenderDefense = this.getEffectiveStat(defender, 'defense');

    const hitChance = computeHitChance(attackerAttack, defenderDefense);
    const roll = this.random();
    const hit = roll <= hitChance;

    const damageType = normaliseDamageType(payload.damageType || 'physical');

    const result = {
      kind: 'attack',
      attackerId: attacker.id,
      defenderId: defender.id,
      damageType,
      hit,
      roll,
      hitChance,
      damage: 0,
    };

    if (!hit) {
      const missEvent = { ...result, kind: 'miss' };
      this.emitEvent(missEvent);
      return missEvent;
    }

    const baseDamage = resolveResistanceValue(payload.baseDamage, attackerAttack);
    const rawDamage = this.computeRawDamage(baseDamage, attackerAttack);
    const mitigated = this.applyMitigation(rawDamage, defender, damageType);
    const appliedDamage = this.applyDamage(defender, mitigated);

    const attackEvent = { ...result, damage: appliedDamage };
    this.emitEvent(attackEvent);
    return attackEvent;
  }

  computeRawDamage(baseDamage, attackStat) {
    const base = Math.max(0, resolveResistanceValue(baseDamage, attackStat));
    const scaling = Math.max(0, attackStat * 0.5);
    const damage = base + scaling;
    return Math.max(0, Math.round(damage));
  }

  applyMitigation(damage, defender, damageType) {
    const defenseStat = this.getEffectiveStat(defender, 'defense');
    const defenseMitigation = defenseStat <= 0 ? 0 : defenseStat / (defenseStat + 100);
    const afterDefense = damage * (1 - defenseMitigation);
    const resistanceValue = this.getResistance(defender, damageType);
    const afterResistance = afterDefense * (1 - resistanceValue);
    return Math.max(0, afterResistance);
  }

  applyDamage(defender, amount) {
    const damage = Math.max(0, Math.round(amount));
    defender.health.current = Math.max(0, defender.health.current - damage);

    if (defender.health.current <= 0) {
      defender.state = 'dead';
    }

    this.emitEntityUpdate(defender);

    if (damage > 0) {
      this.emitEvent({
        kind: 'damage',
        targetId: defender.id,
        amount: damage,
        remainingHealth: defender.health.current,
      });
    }

    return damage;
  }

  applyHealing(targetId, amount) {
    const target = this.entities.get(targetId);
    if (!target) {
      return 0;
    }

    const heal = Math.max(0, Math.round(amount));
    if (heal <= 0) {
      return 0;
    }

    const previous = target.health.current;
    target.health.current = Math.min(target.health.max, target.health.current + heal);
    if (target.health.current > 0 && target.state === 'dead') {
      target.state = 'alive';
    }

    const applied = target.health.current - previous;
    if (applied > 0) {
      this.emitEntityUpdate(target);
      this.emitEvent({
        kind: 'heal',
        targetId: target.id,
        amount: applied,
        remainingHealth: target.health.current,
      });
    }

    return applied;
  }

  applyEffect(options = {}) {
    const { effect, sourceId, targetId } = options;
    if (!effect || !effect.id || !targetId) {
      return null;
    }

    const target = this.entities.get(targetId);
    if (!target) {
      return null;
    }

    const source = sourceId ? this.entities.get(sourceId) : null;
    const stacking = options.stacking || effect.stacking || 'refresh';
    const maxStacks = options.maxStacks || effect.maxStacks || (stacking === 'stack' ? 3 : 1);
    const tickInterval = options.tickInterval || effect.tickInterval || DEFAULT_TICK_INTERVAL;
    const duration = effect.duration || options.duration || 0;

    if (!duration) {
      return this.resolveImmediateEffect({ effect, source, target, sourceId, targetId });
    }

    const instanceId = `${targetId}:${effect.id}`;
    const existing = this.effects.get(instanceId);

    if (existing) {
      if (stacking === 'stack') {
        existing.stacks = Math.min(maxStacks, existing.stacks + 1);
        existing.remaining = Math.max(existing.remaining, duration);
      } else {
        existing.remaining = duration;
        existing.stacks = Math.min(maxStacks, existing.stacks + 1);
        existing.stacks = Math.min(existing.stacks, maxStacks);
      }
      existing.tickInterval = tickInterval;
      this.emitEvent({
        kind: 'effect-updated',
        effectId: effect.id,
        targetId,
        stacks: existing.stacks,
      });
      return clone(existing);
    }

    const instance = {
      instanceId,
      effect: { ...effect },
      sourceId: source ? source.id : sourceId || null,
      targetId,
      stacks: stacking === 'stack' ? 1 : Math.min(1, maxStacks),
      maxStacks,
      tickInterval,
      timeUntilTick: tickInterval,
      remaining: duration,
    };

    if (effect.type === 'buff' || effect.type === 'debuff') {
      this.applyModifierEffect(instance, { effect, target, stacking });
    }

    this.effects.set(instanceId, instance);
    this.emitEvent({
      kind: 'effect-applied',
      effectId: effect.id,
      targetId,
      sourceId: instance.sourceId,
      stacks: instance.stacks,
    });
    return clone(instance);
  }

  resolveImmediateEffect({ effect, target, targetId, source, sourceId }) {
    switch (effect.type) {
    case 'damage': {
      const attackerAttack = source ? this.getEffectiveStat(source, 'attack') : effect.magnitude;
      const baseDamage = resolveResistanceValue(effect.magnitude, attackerAttack);
      const rawDamage = this.computeRawDamage(baseDamage, attackerAttack);
      const mitigated = this.applyMitigation(rawDamage, target, effect.damageType);
      const applied = this.applyDamage(target, mitigated);
      this.emitEvent({
        kind: 'effect-damage',
        effectId: effect.id,
        sourceId: sourceId || null,
        targetId,
        amount: applied,
      });
      return applied;
    }
    case 'heal': {
      const applied = this.applyHealing(targetId, effect.magnitude);
      this.emitEvent({
        kind: 'effect-heal',
        effectId: effect.id,
        sourceId: sourceId || null,
        targetId,
        amount: applied,
      });
      return applied;
    }
    case 'buff':
    case 'debuff': {
      this.applyModifierEffect(null, { effect, target });
      return effect.magnitude;
    }
    default:
      return 0;
    }
  }

  applyModifierEffect(instance, context = {}) {
    const { effect, target } = context;
    if (!effect || !target) {
      return;
    }

    const direction = effect.type === 'debuff' ? -1 : 1;
    const modifierValue = direction * resolveResistanceValue(effect.magnitude, 0);

    if (effect.stat) {
      const current = target.modifiers[effect.stat] || 0;
      target.modifiers[effect.stat] = current + modifierValue;
      this.emitEntityUpdate(target);
    }

    if (effect.damageType) {
      const existing = target.resistances.get(normaliseDamageType(effect.damageType)) || 0;
      target.resistances.set(
        normaliseDamageType(effect.damageType),
        clampResistance(existing + (modifierValue / 100)),
      );
      this.emitEntityUpdate(target);
    }

    if (instance) {
      instance.modifier = modifierValue;
      instance.stat = effect.stat || null;
      instance.resistanceType = effect.damageType ? normaliseDamageType(effect.damageType) : null;
    }
  }

  advanceTime(deltaMs, context = {}) {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return [];
    }

    const expired = [];

    this.effects.forEach((instance, key) => {
      instance.remaining -= deltaMs;
      instance.timeUntilTick -= deltaMs;

      while (instance.timeUntilTick <= 0 && instance.remaining >= -1) {
        this.resolveEffectTick(instance);
        instance.timeUntilTick += instance.tickInterval;
      }

      if (instance.remaining <= 0) {
        expired.push(instance);
        this.effects.delete(key);
      }
    });

    expired.forEach((instance) => {
      this.handleEffectExpiry(instance);
    });

    this.processBehaviors(deltaMs, context);

    return expired.map((instance) => ({ ...instance }));
  }

  processBehaviors(deltaMs, context = {}) {
    if (!this.behaviors.size) {
      return;
    }

    this.behaviors.forEach((controller, entityId) => {
      const record = this.entities.get(entityId);
      if (!record || record.state === 'dead' || !controller || typeof controller.update !== 'function') {
        return;
      }

      try {
        const action = controller.update({
          deltaMs,
          entity: this.getEntity(entityId),
          context,
          engine: this,
          getOpponents: () => this.getOpponents(entityId),
          resolveAbility: this.resolveAbilityDefinition,
          random: this.random,
        });

        if (!action) {
          return;
        }

        this.applyBehaviorAction(record, action, controller);
      } catch (error) {
        if (this.logger?.error) {
          this.logger.error('AI behavior update failed', entityId, error);
        }

        this.emitEvent({
          kind: 'ai-error',
          entityId,
          message: error?.message || 'behavior-update-failed',
        });
      }
    });
  }

  applyBehaviorAction(record, action, controller) {
    if (!record || !action) {
      return;
    }

    const resolution = { success: false };

    switch (action.type) {
    case 'attack': {
      if (!action.targetId) {
        resolution.reason = 'invalid-target';
        resolution.cooldownMs = this.defaultAttackCooldownMs;
        break;
      }

      const baseDamage = Number.isFinite(action.baseDamage)
        ? action.baseDamage
        : this.getEffectiveStat(record, 'attack');

      const result = this.performAttack({
        attackerId: record.id,
        defenderId: action.targetId,
        damageType: action.damageType || 'physical',
        baseDamage,
      });

      resolution.success = Boolean(result.hit);
      resolution.targetId = action.targetId;
      resolution.cooldownMs = Number.isFinite(action.cooldownMs)
        ? action.cooldownMs
        : this.defaultAttackCooldownMs;

      this.emitEvent({
        kind: 'ai-action',
        action: 'attack',
        sourceId: record.id,
        targetId: action.targetId,
        result,
        reason: action.reason || null,
      });
      break;
    }
    case 'cast': {
      const castResult = this.executeAbilityAction(record, action);
      resolution.success = castResult.success;
      resolution.targetId = castResult.targetId || action.targetId || null;
      resolution.cooldownMs = Number.isFinite(action.cooldownMs)
        ? action.cooldownMs
        : (Number.isFinite(castResult.cooldownMs)
          ? castResult.cooldownMs
          : this.defaultCastCooldownMs);
      resolution.abilityCooldownMs = Number.isFinite(action.abilityCooldownMs)
        ? action.abilityCooldownMs
        : castResult.abilityCooldownMs;
      break;
    }
    case 'move': {
      record.metadata = record.metadata || {};
      record.metadata.intent = {
        type: 'move',
        targetId: action.targetId || null,
        destination: action.destination || null,
        reason: action.reason || null,
        distance: Number.isFinite(action.distance) ? action.distance : null,
        timestamp: Date.now(),
      };

      resolution.success = true;
      resolution.targetId = action.targetId || null;
      resolution.cooldownMs = Number.isFinite(action.cooldownMs)
        ? action.cooldownMs
        : this.defaultMoveCooldownMs;

      this.emitEntityUpdate(record);
      this.emitEvent({
        kind: 'ai-action',
        action: 'move',
        sourceId: record.id,
        targetId: action.targetId || null,
        destination: action.destination || null,
        reason: action.reason || null,
        distance: Number.isFinite(action.distance) ? action.distance : null,
      });
      break;
    }
    default:
      return;
    }

    if (controller && typeof controller.onActionResolved === 'function') {
      controller.onActionResolved(action, resolution);
    }
  }

  executeAbilityAction(record, action) {
    const abilityId = action?.abilityId;
    if (!abilityId) {
      return { success: false, reason: 'missing-ability' };
    }

    const ability = this.resolveAbilityDefinition(abilityId);
    if (!ability) {
      if (this.logger?.warn) {
        this.logger.warn(`Unknown ability '${abilityId}' used by ${record.id}`);
      }
      return { success: false, reason: 'unknown-ability' };
    }

    const targetId = action.targetId || record.id;
    const target = this.entities.get(targetId);
    if (!target || target.state === 'dead') {
      return { success: false, reason: 'invalid-target' };
    }

    const effects = Array.isArray(ability.effects) ? ability.effects : [];
    effects.forEach((effect) => {
      const descriptor = this.normaliseAbilityEffect(ability, effect, action);
      if (!descriptor) {
        return;
      }

      this.applyEffect({
        effect: descriptor,
        sourceId: record.id,
        targetId,
        stacking: descriptor.stacking || action.stacking || 'refresh',
        tickInterval: descriptor.tickInterval,
      });
    });

    this.emitEvent({
      kind: 'ai-action',
      action: 'cast',
      sourceId: record.id,
      targetId,
      abilityId: ability.id,
      abilityName: ability.name,
      reason: action.reason || null,
    });

    const cooldown = Number.isFinite(ability.cooldown) ? ability.cooldown : this.defaultCastCooldownMs;

    return {
      success: true,
      ability,
      targetId,
      cooldownMs: cooldown,
      abilityCooldownMs: cooldown,
    };
  }

  normaliseAbilityEffect(ability, effect, action = {}) {
    if (!ability || !effect) {
      return null;
    }

    const magnitude = resolveResistanceValue(effect.magnitude ?? effect.amount, 0);
    const duration = resolveResistanceValue(effect.duration ?? effect.durationMs, 0);
    const tickInterval = resolveResistanceValue(
      effect.tickInterval ?? effect.tickIntervalMs ?? (duration > 0 ? DEFAULT_TICK_INTERVAL : 0),
      duration > 0 ? DEFAULT_TICK_INTERVAL : 0,
    );

    return {
      id: `${ability.id}:${effect.id || effect.type}`,
      type: effect.type || 'generic',
      magnitude,
      duration,
      damageType: effect.damageType,
      tickInterval: duration > 0 ? Math.max(250, tickInterval) : 0,
      stacking: effect.stacking || action.stacking || 'refresh',
    };
  }

  resolveEffectTick(instance) {
    const target = this.entities.get(instance.targetId);
    if (!target) {
      return;
    }

    const stacks = Math.max(1, instance.stacks || 1);
    const magnitude = resolveResistanceValue(instance.effect.magnitude, 0) * stacks;

    switch (instance.effect.type) {
    case 'damage': {
      const rawDamage = this.computeRawDamage(magnitude, magnitude);
      const mitigated = this.applyMitigation(rawDamage, target, instance.effect.damageType);
      const applied = this.applyDamage(target, mitigated);
      this.emitEvent({
        kind: 'effect-tick',
        tickType: 'damage',
        effectId: instance.effect.id,
        targetId: instance.targetId,
        amount: applied,
        stacks,
      });
      break;
    }
    case 'heal': {
      const applied = this.applyHealing(instance.targetId, magnitude);
      this.emitEvent({
        kind: 'effect-tick',
        tickType: 'heal',
        effectId: instance.effect.id,
        targetId: instance.targetId,
        amount: applied,
        stacks,
      });
      break;
    }
    default:
      break;
    }
  }

  handleEffectExpiry(instance) {
    const target = this.entities.get(instance.targetId);

    if ((instance.effect.type === 'buff' || instance.effect.type === 'debuff') && target) {
      if (instance.stat) {
        const current = target.modifiers[instance.stat] || 0;
        target.modifiers[instance.stat] = current - (instance.modifier || 0);
      }

      if (instance.resistanceType) {
        const current = target.resistances.get(instance.resistanceType) || 0;
        target.resistances.set(
          instance.resistanceType,
          clampResistance(current - ((instance.modifier || 0) / 100)),
        );
      }

      this.emitEntityUpdate(target);
    }

    this.emitEvent({
      kind: 'effect-expired',
      effectId: instance.effect.id,
      targetId: instance.targetId,
    });
  }

  emitEvent(event) {
    const payload = {
      ...event,
      timestamp: event.timestamp || Date.now(),
    };
    this.bus.$emit('COMBAT:EVENT', payload);
    return payload;
  }

  emitEntityUpdate(entity) {
    this.bus.$emit('COMBAT:ENTITY_UPDATED', {
      entity: {
        id: entity.id,
        name: entity.name,
        kind: entity.kind,
        stats: clone(entity.stats),
        modifiers: clone(entity.modifiers),
        health: clone(entity.health),
        resistances: new Map(entity.resistances),
        state: entity.state,
        abilityIds: Array.isArray(entity.abilityIds) ? [...entity.abilityIds] : [],
        metadata: clone(entity.metadata),
        behavior: entity.behavior || null,
      },
    });
  }
}

export default CombatEngine;
