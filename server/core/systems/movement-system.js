const MOVEMENT_COMPONENTS = ['transform', 'movement-state', 'movement-intent'];

const toArray = (value) => (Array.isArray(value) ? value : (value ? [value] : []));

const ensureQueue = (component, key = 'queue') => {
  if (!component[key] || !Array.isArray(component[key])) {
    component[key] = [];
  }
  return component[key];
};

const defaultMethodForType = (type) => {
  switch (type) {
    case 'step':
      return 'step';
    case 'move':
    case 'walk':
      return 'move';
    case 'path':
    case 'walk-path':
      return 'walkPath';
    case 'stop':
    case 'halt':
      return 'stopMovement';
    case 'cancel-path':
      return 'cancelPathfinding';
    default:
      return null;
  }
};

const synchroniseTransform = (transform, movementState) => {
  if (!transform || !transform.ref) {
    return;
  }

  const actor = transform.ref;
  transform.sceneId = actor.sceneId ?? transform.sceneId ?? null;
  transform.x = actor.x ?? transform.x ?? 0;
  transform.y = actor.y ?? transform.y ?? 0;
  transform.facing = actor.facing ?? transform.facing ?? null;
  transform.animation = actor.animation ?? transform.animation ?? null;
  transform.movementStep = actor.movementStep ?? transform.movementStep ?? null;

  if (movementState) {
    movementState.blocked = Boolean(actor.movementStep && actor.movementStep.blocked);
  }
};

const invokeHandler = ({ handler, intent, context, movementState }) => {
  if (!handler || !intent) {
    return { consumed: true, result: null };
  }

  const method = intent.method
    || defaultMethodForType(intent.type)
    || (typeof intent.type === 'string' && handler[intent.type] ? intent.type : null);

  if (!method || typeof handler[method] !== 'function') {
    return { consumed: true, result: null };
  }

  let args = [];
  if (Array.isArray(intent.args)) {
    args = intent.args;
  } else {
    switch (method) {
      case 'step':
        args = [intent.direction, context.now];
        break;
      case 'move':
        args = [intent.direction, intent.options || intent.meta || {}];
        break;
      case 'walkPath':
        if (intent.args && Array.isArray(intent.args)) {
          args = intent.args;
        } else {
          args = [intent.playerIndex ?? movementState?.playerIndex ?? 0];
        }
        break;
      case 'stopMovement':
        args = [intent.data || intent.meta || {}];
        break;
      case 'cancelPathfinding':
        args = [];
        break;
      default:
        args = intent.args ? toArray(intent.args) : [];
        break;
    }
  }

  const result = handler[method](...args);

  if (typeof intent.after === 'function') {
    try {
      intent.after({ result, intent, handler, context, movementState });
    } catch (error) {
      console.error('[movement-system] intent.after failed', error);
    }
  }

  const consumed = intent.persist ? result !== false : intent.consumeOnFalse !== false || result !== false;

  return { consumed, result };
};

const processEntityMovement = (entity, world, delta, context) => {
  const transform = entity.getComponent('transform');
  const movementState = entity.getComponent('movement-state');
  const intentComponent = entity.getComponent('movement-intent');

  if (!transform || !movementState || !intentComponent) {
    return;
  }

  const queue = ensureQueue(intentComponent);
  if (!intentComponent.current && queue.length) {
    intentComponent.current = queue.shift();
  }

  const intent = intentComponent.current;
  if (!intent) {
    synchroniseTransform(transform, movementState);
    return;
  }

  const handler = movementState.handler
    || transform.ref?.movement
    || movementState.controller
    || null;

  const { consumed } = invokeHandler({
    handler,
    intent,
    context,
    movementState,
  });

  movementState.lastIntentAt = context.now;
  movementState.lastIntentType = intent.type || intent.method || null;

  synchroniseTransform(transform, movementState);

  if (!consumed) {
    if (intent.requeueOnFail) {
      queue.unshift(intent);
      intentComponent.current = null;
    }
    return;
  }

  if (typeof intent.onComplete === 'function') {
    try {
      intent.onComplete({ entity, world, intent, context, movementState });
    } catch (error) {
      console.error('[movement-system] intent.onComplete failed', error);
    }
  }

  intentComponent.last = intent;
  intentComponent.current = null;
};

const createMovementSystem = (options = {}) => {
  const systemContext = {
    id: options.id || 'movement-system',
  };

  return (world, delta, context = {}) => {
    const now = Number.isFinite(context.now) ? context.now : Date.now();
    const runtimeContext = { ...context, now, system: systemContext };
    const entities = world.query(MOVEMENT_COMPONENTS);
    entities.forEach((entity) => {
      processEntityMovement(entity, world, delta, runtimeContext);
    });
  };
};

export { createMovementSystem as default, createMovementSystem, MOVEMENT_COMPONENTS };
