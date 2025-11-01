import { createSceneWorld, registerWorldSystems } from '../world-factory.js';

const ensureComponentQueue = (entity, componentName, key = 'queue') => {
  const component = entity.getComponent(componentName);
  if (!component) {
    return null;
  }
  if (!Array.isArray(component[key])) {
    component[key] = [];
  }
  return component[key];
};

const enqueueAction = (entity, action = {}) => {
  if (!action || typeof action !== 'object') {
    return null;
  }
  const queue = ensureComponentQueue(entity, 'action-queue');
  if (!queue) {
    return null;
  }
  queue.push({ ...action });
  return action;
};

const enqueueMovementIntent = (entity, intent = {}) => {
  if (!intent || typeof intent !== 'object') {
    return null;
  }
  const movement = entity.getComponent('movement-intent');
  if (!movement) {
    return null;
  }
  const queue = ensureComponentQueue(entity, 'movement-intent');
  const payload = { ...intent };
  if (!payload.type && payload.method) {
    payload.type = payload.method;
  }
  queue.push(payload);
  return payload;
};

const dispatchBehaviourScript = ({ entity, world, now, delta }) => {
  const behaviour = entity.getComponent('behaviour-config');
  if (!behaviour) {
    return;
  }

  const queue = ensureComponentQueue(entity, 'action-queue');
  if (!queue) {
    return;
  }

  if (typeof behaviour.script === 'function') {
    try {
      const outcome = behaviour.script({ entity, world, now, delta });
      const actions = Array.isArray(outcome) ? outcome : (outcome ? [outcome] : []);
      actions.filter(Boolean).forEach(action => queue.push({ ...action }));
    } catch (error) {
      console.error('[controller] behaviour.script failed', error);
    }
  }

  if (Array.isArray(behaviour.routine) && behaviour.routine.length > 0) {
    const state = behaviour.state || (behaviour.state = { index: 0, lastRunAt: 0 });
    const interval = Number.isFinite(behaviour.intervalMs) ? behaviour.intervalMs : 0;
    if (!state.lastRunAt || now - state.lastRunAt >= interval) {
      const step = behaviour.routine[state.index % behaviour.routine.length];
      if (step) {
        queue.push({ ...step });
      }
      state.index = (state.index + 1) % behaviour.routine.length;
      state.lastRunAt = now;
    }
  }
};

const buildControllerEntity = ({
  world,
  id,
  transform,
  movementState,
  movementIntent,
  actionQueue,
  behaviour,
}) => {
  const entity = world.createEntity(id);
  entity.addComponent('transform', transform || {});
  entity.addComponent('movement-state', movementState || {});
  entity.addComponent('movement-intent', movementIntent || { queue: [] });
  entity.addComponent('action-queue', actionQueue || { queue: [] });
  if (behaviour) {
    entity.addComponent('behaviour-config', behaviour);
  }
  world.addEntity(entity);
  return entity;
};

const createControllerWorld = (options = {}) => {
  if (options.world) {
    registerWorldSystems(options.world, options.systemOptions);
    return options.world;
  }
  const world = createSceneWorld(options.worldOptions || {});
  registerWorldSystems(world, options.systemOptions);
  return world;
};

export {
  ensureComponentQueue,
  enqueueAction,
  enqueueMovementIntent,
  dispatchBehaviourScript,
  buildControllerEntity,
  createControllerWorld,
};
