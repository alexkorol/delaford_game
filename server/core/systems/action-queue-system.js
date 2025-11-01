const ensureQueue = (component, key = 'queue') => {
  if (!component[key] || !Array.isArray(component[key])) {
    component[key] = [];
  }
  return component[key];
};

const normaliseIntent = (action) => {
  if (!action) {
    return null;
  }

  if (action.intent) {
    return { ...action.intent };
  }

  if (Array.isArray(action.intents) && action.intents.length) {
    return action.intents.map(intent => ({ ...intent }));
  }

  if (action.type && action.type.startsWith('move:')) {
    const [, direction] = action.type.split(':');
    return { type: 'move', direction };
  }

  return { ...action };
};

const defaultMovementDispatcher = ({ entity, action }) => {
  const intentComponent = entity.getComponent('movement-intent');
  if (!intentComponent) {
    return false;
  }

  const queue = ensureQueue(intentComponent);
  const intent = normaliseIntent(action);
  if (!intent) {
    return false;
  }

  const intents = Array.isArray(intent) ? intent : [intent];
  intents.filter(Boolean).forEach((entry) => {
    const payload = { ...entry };
    if (!payload.type && typeof action.intentType === 'string') {
      payload.type = action.intentType;
    }
    if (!payload.meta && action.meta) {
      payload.meta = { ...action.meta };
    }
    queue.push(payload);
  });

  return true;
};

const defaultAIDispatcher = ({ action, entity, world, context }) => {
  if (typeof action.execute === 'function') {
    return action.execute({ action, entity, world, context }) !== false;
  }
  if (typeof action.run === 'function') {
    return action.run({ action, entity, world, context }) !== false;
  }
  if (typeof action.handler === 'function') {
    return action.handler({ action, entity, world, context }) !== false;
  }
  return false;
};

const DEFAULT_DISPATCHERS = Object.freeze({
  move: defaultMovementDispatcher,
  step: defaultMovementDispatcher,
  walk: defaultMovementDispatcher,
  skill: null,
  ai: defaultAIDispatcher,
});

const createActionQueueSystem = (options = {}) => {
  const dispatchers = {
    ...DEFAULT_DISPATCHERS,
    ...options.dispatchers,
  };

  return (world, delta, context = {}) => {
    const entities = world.query('action-queue');
    entities.forEach((entity) => {
      const actionComponent = entity.getComponent('action-queue');
      if (!actionComponent || actionComponent.suspended) {
        return;
      }

      const queue = ensureQueue(actionComponent);
      if (!queue.length) {
        actionComponent.active = null;
        return;
      }

      const action = queue.shift();
      const dispatcher = dispatchers[action.type] || dispatchers.default;

      if (!dispatcher) {
        actionComponent.active = null;
        return;
      }

      actionComponent.active = action;
      const handled = dispatcher({
        world,
        delta,
        context,
        entity,
        action,
      });

      if (handled === 'defer') {
        actionComponent.active = null;
        queue.unshift(action);
        return;
      }

      if (handled && handled.requeue) {
        queue.unshift(handled.requeue);
      }

      actionComponent.active = null;
      actionComponent.lastProcessedAt = context.now || Date.now();
    });
  };
};

export { createActionQueueSystem as default, createActionQueueSystem };
