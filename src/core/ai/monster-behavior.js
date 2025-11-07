import { getAbilityDefinition } from '../config/combat/index.js';

const DEFAULT_DECISION_COOLDOWN_MS = 1200;
const DEFAULT_MOVE_COOLDOWN_MS = 600;
const DEFAULT_MELEE_RANGE = 1.5;
const DEFAULT_RANGED_RANGE = 6;

const normaliseNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const resolvePosition = (entity, context = {}) => {
  if (!entity) {
    return { x: 0, y: 0, valid: false };
  }

  const fromContext = (() => {
    if (context.positions instanceof Map) {
      return context.positions.get(entity.id);
    }

    if (context.positions && typeof context.positions === 'object') {
      return context.positions[entity.id];
    }

    return null;
  })();

  const positionCandidates = [
    fromContext,
    entity.metadata?.position,
    entity.metadata?.coordinates,
    entity.metadata?.location,
  ];

  for (let index = 0; index < positionCandidates.length; index += 1) {
    const candidate = positionCandidates[index];
    const x = Number(candidate?.x);
    const y = Number(candidate?.y);

    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y, valid: true };
    }
  }

  return { x: 0, y: 0, valid: false };
};

const computeDistance = (source, target, context = {}) => {
  const sourcePosition = resolvePosition(source, context);
  const targetPosition = resolvePosition(target, context);

  if (!sourcePosition.valid || !targetPosition.valid) {
    return {
      known: false,
      value: 0,
      sourcePosition: sourcePosition.valid ? sourcePosition : null,
      targetPosition: targetPosition.valid ? targetPosition : null,
    };
  }

  const deltaX = targetPosition.x - sourcePosition.x;
  const deltaY = targetPosition.y - sourcePosition.y;
  const value = Math.hypot(deltaX, deltaY);

  return {
    known: true,
    value,
    sourcePosition,
    targetPosition,
  };
};

const createBaseController = (behaviorId, options = {}) => {
  const state = {
    decisionCooldownMs: normaliseNumber(options.initialCooldownMs, 0),
    abilityCooldowns: new Map(),
    lastTargetId: null,
  };

  const controller = {
    id: behaviorId,
    options: {
      defaultDecisionCooldownMs: normaliseNumber(
        options.defaultDecisionCooldownMs,
        DEFAULT_DECISION_COOLDOWN_MS,
      ),
      defaultAbilityCooldownMs: normaliseNumber(options.defaultAbilityCooldownMs, 4000),
      resolveAbility: options.resolveAbility || getAbilityDefinition,
      random: options.random,
      ...options,
    },
    state,
    tick(deltaMs = 0) {
      const delta = Math.max(0, normaliseNumber(deltaMs, 0));
      state.decisionCooldownMs = Math.max(0, state.decisionCooldownMs - delta);

      if (state.abilityCooldowns.size === 0) {
        return;
      }

      const updates = [];
      state.abilityCooldowns.forEach((remaining, abilityId) => {
        const next = Math.max(0, normaliseNumber(remaining, 0) - delta);
        updates.push([abilityId, next]);
      });

      updates.forEach(([abilityId, next]) => {
        if (next <= 0) {
          state.abilityCooldowns.delete(abilityId);
        } else {
          state.abilityCooldowns.set(abilityId, next);
        }
      });
    },
    ready() {
      return state.decisionCooldownMs <= 0;
    },
    setDecisionCooldown(ms) {
      const value = Number.isFinite(ms)
        ? Math.max(0, ms)
        : this.options.defaultDecisionCooldownMs;
      state.decisionCooldownMs = value;
    },
    canUseAbility(abilityId) {
      if (!abilityId) {
        return false;
      }

      const remaining = state.abilityCooldowns.get(abilityId);
      return !Number.isFinite(remaining) || remaining <= 0;
    },
    startAbilityCooldown(abilityId, cooldownMs) {
      if (!abilityId) {
        return;
      }

      const value = Number.isFinite(cooldownMs)
        ? Math.max(0, cooldownMs)
        : this.options.defaultAbilityCooldownMs;

      if (value <= 0) {
        state.abilityCooldowns.delete(abilityId);
      } else {
        state.abilityCooldowns.set(abilityId, value);
      }
    },
    rememberTarget(targetId) {
      if (targetId) {
        state.lastTargetId = targetId;
      }
    },
    getLastTarget() {
      return state.lastTargetId;
    },
    resolveAbilityCooldown(abilityId) {
      if (!abilityId) {
        return this.options.defaultAbilityCooldownMs;
      }

      const resolver = this.options.resolveAbility;
      if (typeof resolver !== 'function') {
        return this.options.defaultAbilityCooldownMs;
      }

      const ability = resolver(abilityId);
      if (!ability) {
        return this.options.defaultAbilityCooldownMs;
      }

      return Math.max(0, normaliseNumber(ability.cooldown, this.options.defaultAbilityCooldownMs));
    },
    onActionResolved(action, resolution = {}) {
      const targetId = resolution.targetId || action?.targetId || null;
      if (targetId) {
        this.rememberTarget(targetId);
      }

      const decisionCooldown = Number.isFinite(resolution.cooldownMs)
        ? resolution.cooldownMs
        : (Number.isFinite(action?.cooldownMs)
          ? action.cooldownMs
          : this.options.defaultDecisionCooldownMs);

      this.setDecisionCooldown(decisionCooldown);

      if (action?.abilityId) {
        const abilityCooldown = Number.isFinite(resolution.abilityCooldownMs)
          ? resolution.abilityCooldownMs
          : (Number.isFinite(action.abilityCooldownMs)
            ? action.abilityCooldownMs
            : this.resolveAbilityCooldown(action.abilityId));
        this.startAbilityCooldown(action.abilityId, abilityCooldown);
      }
    },
    update() {
      return null;
    },
  };

  return controller;
};

const selectTarget = (context, controller, options = {}) => {
  const opponents = typeof context.getOpponents === 'function'
    ? context.getOpponents()
    : [];

  const living = opponents.filter((opponent) => opponent && opponent.state !== 'dead');
  if (living.length === 0) {
    return null;
  }

  const lastTargetId = controller.getLastTarget();
  const existing = lastTargetId
    ? living.find((candidate) => candidate.id === lastTargetId)
    : null;

  const distanceEntries = living.map((candidate) => ({
    target: candidate,
    distance: computeDistance(context.entity, candidate, context.context),
  }));

  const preferClosest = options.preferClosest ?? true;

  if (existing && existing.state !== 'dead') {
    const existingDistance = distanceEntries.find((entry) => entry.target.id === existing.id);
    return existingDistance || { target: existing, distance: { known: false, value: 0 } };
  }

  if (preferClosest) {
    const known = distanceEntries.filter((entry) => entry.distance.known);
    if (known.length > 0) {
      known.sort((a, b) => a.distance.value - b.distance.value);
      return known[0];
    }
  }

  const random = typeof context.random === 'function'
    ? context.random()
    : Math.random();
  const index = Math.floor(random * living.length) % living.length;
  return distanceEntries[index];
};

const pickAbility = (entity, controller, resolveAbility) => {
  const abilityIds = Array.isArray(entity.abilityIds) ? entity.abilityIds : [];
  if (!abilityIds.length) {
    return null;
  }

  const priority = Array.isArray(controller.options.prioritisedAbilities)
    && controller.options.prioritisedAbilities.length
    ? controller.options.prioritisedAbilities.filter((id) => abilityIds.includes(id))
    : abilityIds;

  for (let index = 0; index < priority.length; index += 1) {
    const abilityId = priority[index];
    if (!controller.canUseAbility(abilityId)) {
      continue;
    }

    const ability = typeof resolveAbility === 'function'
      ? resolveAbility(abilityId)
      : getAbilityDefinition(abilityId);

    if (!ability) {
      continue;
    }

    if (controller.options.offensiveTags?.length) {
      const matches = Array.isArray(ability.tags)
        && ability.tags.some((tag) => controller.options.offensiveTags.includes(tag));
      if (!matches) {
        continue;
      }
    }

    return { abilityId, ability };
  }

  return null;
};

const createAggressiveBehavior = (options = {}) => {
  const controller = createBaseController('aggressive', options);
  const meleeRange = normaliseNumber(options.meleeRange, DEFAULT_MELEE_RANGE);

  controller.update = (context) => {
    controller.tick(context.deltaMs);
    if (!controller.ready()) {
      return null;
    }

    const selection = selectTarget(context, controller);
    if (!selection) {
      return null;
    }

    const { target, distance } = selection;

    if (!distance.known || distance.value <= meleeRange + normaliseNumber(options.rangeBuffer, 0.25)) {
      return {
        type: 'attack',
        targetId: target.id,
        baseDamage: context.entity.stats?.attack || 0,
        reason: distance.known ? 'melee-range' : 'distance-unknown',
        cooldownMs: options.attackCooldownMs,
      };
    }

    return {
      type: 'move',
      targetId: target.id,
      destination: distance.targetPosition || null,
      distance: distance.value,
      reason: 'close-distance',
      cooldownMs: options.moveCooldownMs ?? DEFAULT_MOVE_COOLDOWN_MS,
    };
  };

  return controller;
};

const createDefensiveBehavior = (options = {}) => {
  const controller = createBaseController('defensive', options);
  const counterRange = normaliseNumber(options.counterRange, DEFAULT_MELEE_RANGE + 0.5);
  const retreatThreshold = normaliseNumber(options.retreatThreshold, 0.35);

  controller.update = (context) => {
    controller.tick(context.deltaMs);
    if (!controller.ready()) {
      return null;
    }

    const selection = selectTarget(context, controller);
    if (!selection) {
      return null;
    }

    const { target, distance } = selection;
    const health = context.entity.health || {};
    const current = normaliseNumber(health.current, health.max || 1);
    const max = Math.max(1, normaliseNumber(health.max, 1));
    const healthRatio = Math.max(0, Math.min(1, current / max));

    if (healthRatio < retreatThreshold && (!distance.known || distance.value <= counterRange)) {
      return {
        type: 'move',
        targetId: target.id,
        destination: distance.sourcePosition || null,
        distance: distance.value,
        reason: 'create-space',
        cooldownMs: options.moveCooldownMs ?? DEFAULT_MOVE_COOLDOWN_MS,
      };
    }

    if (!distance.known || distance.value <= counterRange) {
      return {
        type: 'attack',
        targetId: target.id,
        baseDamage: context.entity.stats?.attack || 0,
        reason: 'counter-attack',
        cooldownMs: options.attackCooldownMs,
      };
    }

    return null;
  };

  return controller;
};

const createCasterBehavior = (options = {}) => {
  const controller = createBaseController('caster', options);
  const rangedRange = normaliseNumber(options.rangedRange, DEFAULT_RANGED_RANGE);

  controller.update = (context) => {
    controller.tick(context.deltaMs);
    if (!controller.ready()) {
      return null;
    }

    const selection = selectTarget(context, controller, { preferClosest: true });
    if (!selection) {
      return null;
    }

    const { target, distance } = selection;
    const abilitySelection = pickAbility(
      context.entity,
      controller,
      context.resolveAbility,
    );

    if (abilitySelection && (!distance.known || distance.value <= rangedRange)) {
      const abilityRange = controller.options.abilityRanges?.[abilitySelection.abilityId]
        ?? rangedRange;

      if (!distance.known || distance.value <= abilityRange) {
        return {
          type: 'cast',
          targetId: target.id,
          abilityId: abilitySelection.abilityId,
          reason: 'offensive-cast',
          cooldownMs: abilitySelection.ability?.cooldown,
          abilityCooldownMs: abilitySelection.ability?.cooldown,
        };
      }
    }

    if (!distance.known || distance.value <= normaliseNumber(options.fallbackRange, DEFAULT_MELEE_RANGE)) {
      return {
        type: 'attack',
        targetId: target.id,
        baseDamage: (context.entity.stats?.attack || 0) * 0.75,
        reason: 'fallback-strike',
        cooldownMs: options.attackCooldownMs,
      };
    }

    return {
      type: 'move',
      targetId: target.id,
      destination: distance.targetPosition || null,
      distance: distance.value,
      reason: 'kite-into-range',
      cooldownMs: options.moveCooldownMs ?? DEFAULT_MOVE_COOLDOWN_MS,
    };
  };

  return controller;
};

const createSkirmisherBehavior = (options = {}) => {
  const controller = createBaseController('skirmisher', options);
  const preferredRange = normaliseNumber(options.preferredRange, 3.5);

  controller.update = (context) => {
    controller.tick(context.deltaMs);
    if (!controller.ready()) {
      return null;
    }

    const selection = selectTarget(context, controller, { preferClosest: true });
    if (!selection) {
      return null;
    }

    const { target, distance } = selection;
    const abilitySelection = pickAbility(
      context.entity,
      controller,
      context.resolveAbility,
    );

    if (abilitySelection && (!distance.known || distance.value <= preferredRange + 1)) {
      return {
        type: 'cast',
        targetId: target.id,
        abilityId: abilitySelection.abilityId,
        reason: distance.known && distance.value < preferredRange
          ? 'burst-before-retreat'
          : 'engage-at-range',
        cooldownMs: abilitySelection.ability?.cooldown,
        abilityCooldownMs: abilitySelection.ability?.cooldown,
      };
    }

    if (distance.known) {
      if (distance.value > preferredRange + 1) {
        return {
          type: 'move',
          targetId: target.id,
          destination: distance.targetPosition || null,
          distance: distance.value,
          reason: 'close-gap',
          cooldownMs: options.moveCooldownMs ?? DEFAULT_MOVE_COOLDOWN_MS,
        };
      }

      if (distance.value < preferredRange - 0.5) {
        return {
          type: 'move',
          targetId: target.id,
          destination: distance.sourcePosition || null,
          distance: distance.value,
          reason: 'create-distance',
          cooldownMs: options.moveCooldownMs ?? DEFAULT_MOVE_COOLDOWN_MS,
        };
      }
    }

    return {
      type: 'attack',
      targetId: target.id,
      baseDamage: context.entity.stats?.attack || 0,
      reason: 'skirmish-strike',
      cooldownMs: options.attackCooldownMs,
    };
  };

  return controller;
};

const BEHAVIOR_FACTORIES = {
  aggressive: createAggressiveBehavior,
  defensive: createDefensiveBehavior,
  caster: createCasterBehavior,
  skirmisher: createSkirmisherBehavior,
};

export const createMonsterBehavior = (behaviorId, options = {}) => {
  if (!behaviorId || typeof behaviorId !== 'string') {
    return null;
  }

  const key = behaviorId.trim().toLowerCase();
  const factory = BEHAVIOR_FACTORIES[key];
  if (typeof factory !== 'function') {
    return null;
  }

  return factory({ ...options, behaviorId: key });
};

export const listKnownBehaviors = () => Object.keys(BEHAVIOR_FACTORIES);

export default createMonsterBehavior;
