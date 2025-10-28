import { euclideanDistance, manhattanDistance } from '../movement-handler.js';

const markDirty = (entity, dirty) => {
  if (!dirty) {
    return false;
  }
  const lifecycle = entity.getComponent('lifecycle');
  if (lifecycle) {
    lifecycle.dirty = true;
  }
  return true;
};

const ensureRespawn = (monster, now) => {
  if (monster.state.respawnAt && now < monster.state.respawnAt) {
    return false;
  }
  monster.respawnNow(now);
  return true;
};

const handleDeathState = (monster, entity, now) => {
  if (!monster.state.respawnAt) {
    monster.state.respawnAt = now + monster.respawn.delayMs;
    return markDirty(entity, true);
  }

  if (now >= monster.state.respawnAt) {
    return markDirty(entity, ensureRespawn(monster, now));
  }

  return false;
};

const createMeleeBehaviourSystem = (entity, monster) => (world, _delta, context = {}) => {
  const now = context.now || Date.now();
  const lifecycle = entity.getComponent('lifecycle');
  if (lifecycle) {
    lifecycle.dirty = false;
  }

  if (!monster.isAlive) {
    handleDeathState(monster, entity, now);
    return;
  }

  let dirty = false;

  if (monster.state.pendingAttack && now >= monster.state.pendingAttack.resolveAt) {
    dirty = monster.resolvePendingAttack(now) || dirty;
  }

  const target = monster.resolveTarget(now);
  if (target) {
    monster.state.mode = 'engaged';
    const distance = manhattanDistance(monster, target);
    if (distance <= 1) {
      dirty = monster.tryAttack(target, now) || dirty;
    } else {
      dirty = monster.pursue(target, now) || dirty;
    }
    markDirty(entity, dirty);
    return;
  }

  const distanceFromSpawn = euclideanDistance(monster, monster.spawn);
  if (distanceFromSpawn > 0.5) {
    monster.state.mode = 'returning';
    dirty = monster.returnToSpawn(now) || dirty;
    markDirty(entity, dirty);
    return;
  }

  monster.state.mode = 'patrolling';
  dirty = monster.patrol(now) || dirty;
  markDirty(entity, dirty);
};

const registerMeleeBehaviour = ({ world, entity, monster }) => {
  entity.addComponent('behaviour', { type: 'melee' });
  if (!entity.hasComponent('lifecycle')) {
    entity.addComponent('lifecycle', { dirty: false });
  }
  if (!entity.hasComponent('monster')) {
    entity.addComponent('monster', { ref: monster });
  }

  const system = createMeleeBehaviourSystem(entity, monster);
  world.addSystem(system);
  return system;
};

export default registerMeleeBehaviour;
