import { v4 as uuid } from 'uuid';
import Socket from '#server/socket.js';
import UI from '#shared/ui.js';
import config from '#server/config.js';
import world from './world.js';
import Player from './player.js';
import monsterDefinitions from './data/monsters/index.js';
import { getArchetype } from './monsters/archetypes.js';
import { getRarity } from './monsters/rarities.js';
import {
  ATTRIBUTE_IDS,
  createCharacterState,
  syncShortcuts,
  applyDamage as applyStatDamage,
  applyHealing as applyStatHealing,
  toClientPayload as statsToClientPayload,
} from '#shared/stats/index.js';
import {
  DEFAULT_FACING_DIRECTION,
  DEFAULT_ANIMATION_DURATIONS,
  DEFAULT_ANIMATION_HOLDS,
} from '#shared/combat.js';

const BASE_MOVE_DURATION = 150;

const directionVectors = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const diagonalDirections = {
  up: ['up-left', 'up-right'],
  down: ['down-left', 'down-right'],
  left: ['up-left', 'down-left'],
  right: ['up-right', 'down-right'],
};

const DEFAULT_RESPAWN = {
  delayMs: 20000,
  healthFraction: 1,
  manaFraction: 1,
};

const DEFAULT_BEHAVIOUR = {
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

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function computeStepDuration(direction, options = {}) {
  const vector = directionVectors[direction];
  if (!vector) {
    return 0;
  }

  const diagonal = Math.abs(vector.x) === 1 && Math.abs(vector.y) === 1;
  const multiplier = diagonal ? Math.SQRT2 : 1;
  const speed = Number.isFinite(options.speedMultiplier) ? options.speedMultiplier : 1;
  return Math.round((BASE_MOVE_DURATION * multiplier) / speed);
}

function euclideanDistance(a, b) {
  const dx = (a.x || 0) - (b.x || 0);
  const dy = (a.y || 0) - (b.y || 0);
  return Math.sqrt((dx * dx) + (dy * dy));
}

function manhattanDistance(a, b) {
  return Math.abs((a.x || 0) - (b.x || 0)) + Math.abs((a.y || 0) - (b.y || 0));
}

function resolveDirection(from, to) {
  const dx = (to.x || 0) - (from.x || 0);
  const dy = (to.y || 0) - (from.y || 0);

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  if (dy !== 0) {
    return dy > 0 ? 'down' : 'up';
  }
  return null;
}

function pickSecondaryDirection(primary, from, to) {
  if (!primary) {
    return null;
  }

  const candidates = diagonalDirections[primary] || [];
  if (!candidates.length) {
    return null;
  }

  const dx = (to.x || 0) - (from.x || 0);
  const dy = (to.y || 0) - (from.y || 0);

  return candidates.find((direction) => {
    if (direction === 'up-left') {
      return dx < 0 && dy < 0;
    }
    if (direction === 'up-right') {
      return dx > 0 && dy < 0;
    }
    if (direction === 'down-left') {
      return dx < 0 && dy > 0;
    }
    if (direction === 'down-right') {
      return dx > 0 && dy > 0;
    }
    return false;
  }) || null;
}

function clone(value) {
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
}

class Monster {
  constructor(definition = {}) {
    this.templateId = definition.id || null;
    this.id = definition.instanceId || this.templateId || uuid();
    this.uuid = uuid();
    this.name = definition.name || 'Monster';
    this.level = Number.isFinite(definition.level) ? definition.level : 1;
    this.sceneId = definition.sceneId || world.defaultTownId;
    this.archetypeId = definition.archetype || 'brute';
    this.rarityId = definition.rarity || 'common';
    this.spawn = {
      x: definition.spawn && Number.isFinite(definition.spawn.x) ? definition.spawn.x : 0,
      y: definition.spawn && Number.isFinite(definition.spawn.y) ? definition.spawn.y : 0,
      radius: definition.spawn && Number.isFinite(definition.spawn.radius) ? definition.spawn.radius : 0,
    };
    this.x = this.spawn.x;
    this.y = this.spawn.y;
    this.column = definition.graphic && Number.isFinite(definition.graphic.column)
      ? definition.graphic.column
      : 0;
    this.row = definition.graphic && Number.isFinite(definition.graphic.row)
      ? definition.graphic.row
      : 0;

    this.behaviour = this.buildBehaviour(definition.behaviour);
    this.respawn = this.buildRespawn(definition.respawn);
    this.rewards = clone(definition.rewards) || {};

    this.state = {
      mode: 'idle',
      targetId: null,
      lastDecisionAt: 0,
      lastStepAt: 0,
      lastAttackAt: 0,
      lastBroadcastAt: 0,
      pendingAttack: null,
      patrolTarget: this.pickPatrolTarget(),
      respawnAt: null,
    };

    this.movementStep = {
      sequence: 0,
      startedAt: Date.now(),
      duration: 0,
      direction: null,
      blocked: false,
    };

    this.animation = this.createInitialAnimation();

    this.stats = this.buildStats(definition.attributes);
    syncShortcuts(this.stats, this);
  }

  get rarity() {
    return getRarity(this.rarityId);
  }

  get archetype() {
    return getArchetype(this.archetypeId);
  }

  get activeScene() {
    return world.getScene(this.sceneId);
  }

  get activeMap() {
    const scene = this.activeScene;
    if (scene && scene.map) {
      return scene.map;
    }
    return world.map || { background: [], foreground: [] };
  }

  get isAlive() {
    return this.stats
      && this.stats.lifecycle
      && this.stats.lifecycle.state !== 'permadead'
      && this.stats.resources
      && this.stats.resources.health
      && this.stats.resources.health.current > 0;
  }

  buildBehaviour(overrides = {}) {
    const archetype = this.archetype;
    const rarity = this.rarity;

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
  }

  buildRespawn(overrides = {}) {
    const rarity = this.rarity;
    const respawn = {
      ...DEFAULT_RESPAWN,
      ...(overrides || {}),
    };

    const multiplier = rarity && rarity.respawnMultiplier ? rarity.respawnMultiplier : 1;
    respawn.delayMs = Math.round(respawn.delayMs * multiplier);
    respawn.healthFraction = clamp(Number.isFinite(respawn.healthFraction) ? respawn.healthFraction : 1, 0, 1);
    respawn.manaFraction = clamp(Number.isFinite(respawn.manaFraction) ? respawn.manaFraction : 1, 0, 1);

    return respawn;
  }

  buildStats(attributeOverrides = {}) {
    const archetype = this.archetype;
    const rarity = this.rarity;
    const level = Math.max(1, this.level || 1);

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
  }

  createInitialAnimation(overrides = {}) {
    const direction = overrides.direction || DEFAULT_FACING_DIRECTION;
    return {
      state: overrides.state || 'idle',
      direction,
      sequence: Number.isFinite(overrides.sequence) ? overrides.sequence : 0,
      startedAt: Number.isFinite(overrides.startedAt) ? overrides.startedAt : Date.now(),
      duration: Number.isFinite(overrides.duration) ? overrides.duration : 0,
      speed: Number.isFinite(overrides.speed) ? overrides.speed : 1,
      skillId: overrides.skillId || null,
      holdState: overrides.holdState || null,
    };
  }

  setFacing(direction) {
    if (!direction) {
      return this.facing || DEFAULT_FACING_DIRECTION;
    }
    this.facing = direction;
    return this.facing;
  }

  setAnimationState(state, options = {}) {
    const resolvedState = state || 'idle';
    const direction = options.direction || this.facing || DEFAULT_FACING_DIRECTION;
    const now = Number.isFinite(options.startedAt) ? options.startedAt : Date.now();
    const previousSequence = this.animation && typeof this.animation.sequence === 'number'
      ? this.animation.sequence
      : 0;
    const sequence = Number.isFinite(options.sequence) ? options.sequence : previousSequence + 1;
    const duration = Number.isFinite(options.duration)
      ? options.duration
      : (DEFAULT_ANIMATION_DURATIONS[resolvedState] || 0);
    const holdState = options.holdState !== undefined
      ? options.holdState
      : (DEFAULT_ANIMATION_HOLDS[resolvedState] || null);

    this.animation = {
      state: resolvedState,
      direction,
      sequence,
      startedAt: now,
      duration,
      speed: Number.isFinite(options.speed) ? options.speed : 1,
      skillId: options.skillId || null,
      holdState,
    };

    return this.animation;
  }

  pickPatrolTarget() {
    if (!this.behaviour || !this.behaviour.patrolRadius) {
      return { x: this.spawn.x, y: this.spawn.y };
    }

    const radius = this.behaviour.patrolRadius;
    const offsetX = UI.getRandomInt(-radius, radius);
    const offsetY = UI.getRandomInt(-radius, radius);
    return {
      x: clamp(this.spawn.x + offsetX, 0, config.map.size.x - 1),
      y: clamp(this.spawn.y + offsetY, 0, config.map.size.y - 1),
    };
  }

  canStep(direction) {
    if (!direction) {
      return false;
    }

    const mapLayers = this.activeMap || {};
    const background = mapLayers.background || [];
    const foreground = mapLayers.foreground || [];

    if (!background.length) {
      return false;
    }

    const tileIndexBg = UI.getFutureTileID(background, this.x, this.y, direction);
    const tileIndexFg = UI.getFutureTileID(foreground, this.x, this.y, direction) - 252;

    const canWalkThrough = UI.tileWalkable(tileIndexBg)
      && UI.tileWalkable(tileIndexFg, 'foreground');

    if (!canWalkThrough) {
      return false;
    }

    const vector = directionVectors[direction];
    if (!vector) {
      return false;
    }

    const targetX = this.x + vector.x;
    const targetY = this.y + vector.y;

    if (targetX < 0 || targetX >= config.map.size.x || targetY < 0 || targetY >= config.map.size.y) {
      return false;
    }

    const distanceFromSpawn = euclideanDistance({ x: targetX, y: targetY }, this.spawn);
    if (this.behaviour && this.behaviour.leash && distanceFromSpawn > this.behaviour.leash) {
      return false;
    }

    return true;
  }

  step(direction, now = Date.now()) {
    if (!this.canStep(direction)) {
      this.movementStep = {
        sequence: this.movementStep.sequence + 1,
        startedAt: now,
        duration: 0,
        direction: null,
        blocked: true,
      };
      this.setAnimationState('idle', { direction, startedAt: now });
      return false;
    }

    const vector = directionVectors[direction];
    const stepDuration = computeStepDuration(direction, { speedMultiplier: this.behaviour.stepSpeedMultiplier || 1 });

    this.x += vector.x;
    this.y += vector.y;

    this.movementStep = {
      sequence: this.movementStep.sequence + 1,
      startedAt: now,
      duration: stepDuration,
      direction,
      blocked: false,
    };

    this.state.lastStepAt = now;
    this.setFacing(direction);
    this.setAnimationState('run', { direction, duration: stepDuration, startedAt: now });
    return true;
  }

  rollDamage() {
    const archetype = this.archetype || {};
    const rarity = this.rarity || {};
    const totals = this.stats && this.stats.attributes ? this.stats.attributes.total : {};

    let min = archetype.damage && Number.isFinite(archetype.damage.baseMin)
      ? archetype.damage.baseMin
      : 1;
    let max = archetype.damage && Number.isFinite(archetype.damage.baseMax)
      ? archetype.damage.baseMax
      : min + 2;

    if (archetype.damage && Number.isFinite(archetype.damage.scalingPerStrength)) {
      const strength = totals.strength || 0;
      min += strength * (archetype.damage.scalingPerStrength * 0.5);
      max += strength * archetype.damage.scalingPerStrength;
    }

    if (archetype.damage && Number.isFinite(archetype.damage.scalingPerDexterity)) {
      const dexterity = totals.dexterity || 0;
      min += dexterity * (archetype.damage.scalingPerDexterity * 0.35);
      max += dexterity * archetype.damage.scalingPerDexterity;
    }

    if (archetype.damage && Number.isFinite(archetype.damage.scalingPerIntelligence)) {
      const intelligence = totals.intelligence || 0;
      min += intelligence * (archetype.damage.scalingPerIntelligence * 0.4);
      max += intelligence * archetype.damage.scalingPerIntelligence;
    }

    const damageMultiplier = (this.behaviour && this.behaviour.attack && this.behaviour.attack.damageMultiplier)
      ? this.behaviour.attack.damageMultiplier
      : 1;
    const rarityMultiplier = rarity.damageMultiplier || 1;

    min *= damageMultiplier * rarityMultiplier;
    max *= damageMultiplier * rarityMultiplier;

    const rolled = UI.getRandomInt(Math.max(1, Math.floor(min)), Math.max(1, Math.ceil(max)));
    return Math.max(1, rolled);
  }

  resolveTarget(now = Date.now()) {
    const scenePlayers = world.getScenePlayers(this.sceneId);
    if (!scenePlayers.length) {
      this.state.targetId = null;
      return null;
    }

    const aggressionRange = this.behaviour.aggressionRange || DEFAULT_BEHAVIOUR.aggressionRange;
    const pursuitRange = this.behaviour.pursuitRange || aggressionRange + 2;

    const currentTarget = this.state.targetId
      ? scenePlayers.find(player => player && player.uuid === this.state.targetId)
      : null;

    if (currentTarget && currentTarget.stats && currentTarget.stats.resources.health.current > 0) {
      const distance = manhattanDistance(this, currentTarget);
      if (distance <= pursuitRange) {
        return currentTarget;
      }
    }

    const viable = scenePlayers
      .filter((player) => {
        if (!player || !player.stats || !player.stats.resources) {
          return false;
        }
        if (player.stats.resources.health.current <= 0) {
          return false;
        }
        const distance = manhattanDistance(this, player);
        return distance <= aggressionRange;
      })
      .sort((a, b) => manhattanDistance(this, a) - manhattanDistance(this, b));

    const nextTarget = viable[0] || null;

    this.state.targetId = nextTarget ? nextTarget.uuid : null;
    if (!nextTarget) {
      this.state.mode = 'idle';
      this.state.pendingAttack = null;
    }
    return nextTarget;
  }

  tryAttack(target, now = Date.now()) {
    if (!target || !this.isAlive) {
      return false;
    }

    const attack = this.behaviour.attack || DEFAULT_BEHAVIOUR.attack;
    const sinceLastAttack = now - (this.state.lastAttackAt || 0);

    if (this.state.pendingAttack && now >= this.state.pendingAttack.resolveAt) {
      this.resolvePendingAttack(now);
    }

    if (this.state.pendingAttack) {
      return false;
    }

    if (sinceLastAttack < attack.intervalMs) {
      return false;
    }

    const distance = manhattanDistance(this, target);
    if (distance > 1) {
      return false;
    }

    const direction = resolveDirection(this, target) || this.facing || DEFAULT_FACING_DIRECTION;
    this.setFacing(direction);

    const damage = this.rollDamage();
    const resolveAt = now + attack.windupMs;

    this.setAnimationState('attack', {
      direction,
      duration: attack.windupMs,
      startedAt: now,
      holdState: 'idle',
      skillId: 'monster:attack',
    });

    this.state.pendingAttack = {
      targetId: target.uuid,
      resolveAt,
      damage,
    };

    this.state.lastAttackAt = now;
    return true;
  }

  resolvePendingAttack(now = Date.now()) {
    const payload = this.state.pendingAttack;
    if (!payload) {
      return false;
    }

    const scenePlayers = world.getScenePlayers(this.sceneId);
    const target = scenePlayers.find(player => player.uuid === payload.targetId);
    this.state.pendingAttack = null;

    if (!target) {
      return false;
    }

    const distance = manhattanDistance(this, target);
    if (distance > 1) {
      return false;
    }

    const nowTs = now;
    const result = target.applyDamage(payload.damage, { allowCheatDeath: true, now: nowTs });
    syncShortcuts(target.stats, target);

    if (result) {
      target.setAnimationState('hurt', { direction: target.facing, startedAt: nowTs });
      Player.broadcastAnimation(target);
      Player.broadcastStats(target);

      if (result.type === 'death' || result.type === 'permadeath') {
        this.state.mode = 'idle';
        this.state.targetId = null;
      }
    }

    return true;
  }

  patrol(now = Date.now()) {
    if (!this.behaviour.patrolRadius) {
      return false;
    }

    if (!this.state.patrolTarget) {
      this.state.patrolTarget = this.pickPatrolTarget();
    }

    const distance = manhattanDistance(this, this.state.patrolTarget);
    if (distance <= 0) {
      if (now - (this.state.lastDecisionAt || 0) > this.behaviour.patrolIntervalMs) {
        this.state.patrolTarget = this.pickPatrolTarget();
        this.state.lastDecisionAt = now;
      }
      this.setAnimationState('idle', { direction: this.facing, startedAt: now });
      return false;
    }

    if (now - (this.state.lastStepAt || 0) < this.behaviour.stepIntervalMs) {
      return false;
    }

    const direction = resolveDirection(this, this.state.patrolTarget);
    if (this.step(direction, now)) {
      return true;
    }

    const secondary = pickSecondaryDirection(direction, this, this.state.patrolTarget);
    if (secondary) {
      return this.step(secondary, now);
    }

    return false;
  }

  pursue(target, now = Date.now()) {
    if (!target) {
      return false;
    }

    if (now - (this.state.lastStepAt || 0) < this.behaviour.stepIntervalMs) {
      return false;
    }

    const direction = resolveDirection(this, target);
    if (this.step(direction, now)) {
      return true;
    }

    const secondary = pickSecondaryDirection(direction, this, target);
    if (secondary) {
      return this.step(secondary, now);
    }

    return false;
  }

  returnToSpawn(now = Date.now()) {
    const atSpawn = this.x === this.spawn.x && this.y === this.spawn.y;
    if (atSpawn) {
      this.setAnimationState('idle', { direction: this.facing, startedAt: now });
      return false;
    }

    if (now - (this.state.lastStepAt || 0) < this.behaviour.stepIntervalMs) {
      return false;
    }

    const direction = resolveDirection(this, this.spawn);
    if (this.step(direction, now)) {
      return true;
    }

    const secondary = pickSecondaryDirection(direction, this, this.spawn);
    if (secondary) {
      return this.step(secondary, now);
    }

    return false;
  }

  update(now = Date.now()) {
    if (!this.isAlive) {
      if (!this.state.respawnAt) {
        this.state.respawnAt = now + this.respawn.delayMs;
      } else if (now >= this.state.respawnAt) {
        this.respawnNow(now);
        return true;
      }
      return false;
    }

    if (this.state.pendingAttack && now >= this.state.pendingAttack.resolveAt) {
      this.resolvePendingAttack(now);
    }

    const target = this.resolveTarget(now);

    if (target) {
      this.state.mode = 'engaged';
      const distance = manhattanDistance(this, target);
      if (distance <= 1) {
        return this.tryAttack(target, now);
      }
      return this.pursue(target, now);
    }

    const distanceFromSpawn = euclideanDistance(this, this.spawn);
    if (distanceFromSpawn > 0.5) {
      this.state.mode = 'returning';
      return this.returnToSpawn(now);
    }

    this.state.mode = 'patrolling';
    return this.patrol(now);
  }

  takeDamage(amount, options = {}) {
    if (!this.stats) {
      this.stats = this.buildStats();
    }

    const result = applyStatDamage(this.stats, amount, options);
    syncShortcuts(this.stats, this);

    if (result && (result.type === 'death' || result.type === 'permadeath')) {
      this.handleDeath(options.now || Date.now());
    }

    return result;
  }

  heal(amount, options = {}) {
    if (!this.stats) {
      this.stats = this.buildStats();
    }

    const result = applyStatHealing(this.stats, amount, options);
    syncShortcuts(this.stats, this);
    return result;
  }

  handleDeath(now = Date.now()) {
    this.state.mode = 'dead';
    this.state.pendingAttack = null;
    this.state.respawnAt = now + this.respawn.delayMs;
    this.setAnimationState('hurt', { direction: this.facing, startedAt: now });
  }

  respawnNow(now = Date.now()) {
    this.stats.lifecycle.state = 'alive';
    this.stats.resources.health.current = Math.max(
      1,
      Math.round(this.stats.resources.health.max * this.respawn.healthFraction),
    );
    this.stats.resources.mana.current = Math.round(
      this.stats.resources.mana.max * this.respawn.manaFraction,
    );
    syncShortcuts(this.stats, this);
    this.x = this.spawn.x;
    this.y = this.spawn.y;
    this.state.mode = 'idle';
    this.state.targetId = null;
    this.state.respawnAt = null;
    this.state.pendingAttack = null;
    this.state.patrolTarget = this.pickPatrolTarget();
    this.setAnimationState('idle', { startedAt: now, direction: this.facing || DEFAULT_FACING_DIRECTION });
  }

  toJSON() {
    return {
      id: this.id,
      uuid: this.uuid,
      templateId: this.templateId,
      name: this.name,
      level: this.level,
      sceneId: this.sceneId,
      archetype: this.archetypeId,
      rarity: this.rarityId,
      x: this.x,
      y: this.y,
      spawn: this.spawn,
      column: this.column,
      row: this.row,
      behaviour: {
        aggressionRange: this.behaviour.aggressionRange,
        pursuitRange: this.behaviour.pursuitRange,
        leash: this.behaviour.leash,
        patrolRadius: this.behaviour.patrolRadius,
        attack: this.behaviour.attack,
      },
      stats: statsToClientPayload(this.stats),
      movementStep: this.movementStep,
      animation: this.animation,
      state: {
        mode: this.state.mode,
        targetId: this.state.targetId,
      },
      rewards: this.rewards,
      rarityLabel: this.rarity.label,
      rarityColor: this.rarity.color,
      archetypeLabel: this.archetype.label,
    };
  }

  static load() {
    const scene = world.getDefaultTown();
    const monsters = monsterDefinitions.map(definition => new Monster(definition));
    scene.monsters = monsters;
    world.monsters = monsters;

    const respawns = scene.respawns || {
      items: [],
      monsters: [],
      resources: [],
    };
    respawns.monsters = monsterDefinitions.map(definition => ({
      id: definition.id,
      spawn: clone(definition.spawn),
      respawn: clone(definition.respawn),
      archetype: definition.archetype,
      rarity: definition.rarity,
    }));
    scene.respawns = respawns;
    world.respawns = respawns;

    Monster.broadcast(scene.monsters);
    return monsters;
  }

  static broadcast(monsters, options = {}) {
    if (!Array.isArray(monsters) || monsters.length === 0) {
      return;
    }

    const payload = monsters.map(monster => monster.toJSON());
    const meta = {
      movements: monsters.map(monster => ({
        id: monster.id,
        uuid: monster.uuid,
        movementStep: monster.movementStep,
      })),
      animations: monsters.map(monster => ({
        id: monster.id,
        uuid: monster.uuid,
        animation: monster.animation,
      })),
      sentAt: Date.now(),
    };

    Socket.broadcast('monster:state', payload, options.players || null, { meta });
  }

  static tick(options = {}) {
    const now = Date.now();
    const scene = world.getDefaultTown();
    if (!scene || !Array.isArray(scene.monsters)) {
      return;
    }

    let dirty = false;
    scene.monsters.forEach((monster) => {
      const updated = monster.update(now);
      dirty = dirty || updated;
    });

    if (dirty || options.forceBroadcast) {
      Monster.broadcast(scene.monsters, options);
    }
  }
}

export default Monster;
