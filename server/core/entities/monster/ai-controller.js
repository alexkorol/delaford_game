import { createWorld } from '../../systems/ecs/factory.js';
import behaviourRegistry, { resolveBehaviour } from './behaviours/index.js';

const createMonsterAIController = (monster) => {
  const world = createWorld();
  const entity = world.createEntity(monster.uuid);

  entity.addComponent('monster', { ref: monster });
  entity.addComponent('state', monster.state);
  entity.addComponent('lifecycle', { dirty: false });
  entity.addComponent('behaviour-config', monster.behaviour || {});
  world.addEntity(entity);

  const behaviourType = monster.behaviour && monster.behaviour.type
    ? monster.behaviour.type
    : 'melee';
  const register = resolveBehaviour(behaviourType);
  register({ world, entity, monster });

  let lastUpdateAt = null;

  return {
    update(now = Date.now()) {
      const delta = lastUpdateAt === null ? 0 : now - lastUpdateAt;
      lastUpdateAt = now;
      world.update(delta, { now });
      const lifecycle = entity.getComponent('lifecycle');
      const dirty = lifecycle ? Boolean(lifecycle.dirty) : false;
      if (lifecycle) {
        lifecycle.dirty = false;
      }
      return dirty;
    },
    setBehaviour(type) {
      if (!type || !behaviourRegistry[type]) {
        return;
      }
      entity.addComponent('behaviour-config', monster.behaviour || {});
      world.systems.length = 0;
      behaviourRegistry[type]({ world, entity, monster });
    },
  };
};

export default createMonsterAIController;
