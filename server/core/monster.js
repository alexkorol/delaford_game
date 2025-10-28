import { v4 as uuid } from 'uuid';
import Socket from '#server/socket.js';
import world from './world.js';
import Player from './player.js';
import monsterDefinitions from './data/monsters/index.js';
import { getArchetype } from './monsters/archetypes.js';
import { getRarity } from './monsters/rarities.js';
import { syncShortcuts, toClientPayload as statsToClientPayload } from '#shared/stats/index.js';
import createMonsterCombatController from '#server/core/entities/monster/combat-controller.js';
import createMonsterMovementHandler, {
  euclideanDistance,
  manhattanDistance,
} from '#server/core/entities/monster/movement-handler.js';
import createMonsterStatsManager, {
  clone,
} from '#server/core/entities/monster/stats-manager.js';


class Monster {
  constructor(definition = {}) {
    this.movement = createMonsterMovementHandler(this);
    this.statsManager = createMonsterStatsManager(this);
    this.combatController = createMonsterCombatController(this);

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

    this.behaviour = this.statsManager.buildBehaviour(definition.behaviour);
    this.respawn = this.statsManager.buildRespawn(definition.respawn);
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
    return this.statsManager.buildBehaviour(overrides);
  }

  buildRespawn(overrides = {}) {
    return this.statsManager.buildRespawn(overrides);
  }

  buildStats(attributeOverrides = {}) {
    return this.statsManager.buildStats(attributeOverrides);
  }

  createInitialAnimation(overrides = {}) {
    return this.movement.createInitialAnimation(overrides);
  }

  setFacing(direction) {
    return this.movement.setFacing(direction);
  }

  setAnimationState(state, options = {}) {
    return this.movement.setAnimationState(state, options);
  }

  pickPatrolTarget() {
    return this.movement.pickPatrolTarget();
  }

  canStep(direction) {
    return this.movement.canStep(direction);
  }

  step(direction, now = Date.now()) {
    return this.movement.step(direction, now);
  }

  rollDamage() {
    return this.combatController.rollDamage();
  }

  resolveTarget(now = Date.now()) {
    return this.combatController.resolveTarget(now);
  }

  tryAttack(target, now = Date.now()) {
    return this.combatController.tryAttack(target, now);
  }

  resolvePendingAttack(now = Date.now()) {
    const outcome = this.combatController.resolvePendingAttack(now);
    if (!outcome) {
      return false;
    }

    const { target, result } = outcome;
    syncShortcuts(target.stats, target);
    Player.broadcastAnimation(target);
    Player.broadcastStats(target);

    return true;
  }

  patrol(now = Date.now()) {
    return this.movement.patrol(now);
  }

  pursue(target, now = Date.now()) {
    return this.movement.pursue(target, now);
  }

  returnToSpawn(now = Date.now()) {
    return this.movement.returnToSpawn(now);
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
    return this.statsManager.takeDamage(amount, options);
  }

  heal(amount, options = {}) {
    return this.statsManager.heal(amount, options);
  }

  handleDeath(now = Date.now()) {
    return this.statsManager.handleDeath(now);
  }

  respawnNow(now = Date.now()) {
    return this.statsManager.respawnNow(now);
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
