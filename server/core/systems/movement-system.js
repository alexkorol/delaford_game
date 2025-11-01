const MOVEMENT_COMPONENTS = ['transform', 'movement-state', 'movement-intent'];

const defaultMovementSignature = (transform) => {
  if (!transform) {
    return 'transform:none';
  }

  const movementStep = transform.movementStep || {};
  const animation = transform.animation || {};

  return [
    transform.sceneId || 'scene:none',
    Number.isFinite(transform.x) ? transform.x : 'x:none',
    Number.isFinite(transform.y) ? transform.y : 'y:none',
    transform.facing || 'facing:none',
    movementStep.sequence ?? 'step:none',
    movementStep.startedAt ?? 'stepStarted:none',
    movementStep.direction || 'stepDir:none',
    animation.sequence ?? 'anim:none',
    animation.state || 'animState:none',
  ].join('|');
};

const buildDefaultMovementMeta = (transform) => {
  const meta = { sentAt: Date.now() };
  if (transform && transform.movementStep) {
    meta.movementStep = transform.movementStep;
  }
  if (transform && transform.animation) {
    meta.animation = transform.animation;
  }
  return meta;
};

const defaultMovementPayload = ({ transform, identity }) => {
  if (transform && transform.ref) {
    return transform.ref;
  }

  if (identity) {
    return {
      id: identity.id || identity.uuid || null,
      uuid: identity.uuid || identity.id || null,
      type: identity.type || 'entity',
      x: transform?.x ?? null,
      y: transform?.y ?? null,
      facing: transform?.facing ?? null,
    };
  }

  return transform || null;
};

const resolveMovementEvent = ({ identity, networking }) => {
  if (networking && networking.events && networking.events.movement) {
    return networking.events.movement;
  }
  if (networking && networking.movementEvent) {
    return networking.movementEvent;
  }
  if (identity && identity.type) {
    return `${identity.type}:movement`;
  }
  return 'entity:movement';
};

const resolveBroadcastKey = ({ entity, networking, identity }) => {
  const customKey = networking && networking.broadcastKey;
  if (typeof customKey === 'function') {
    return customKey({ entity, identity });
  }
  if (typeof customKey === 'string') {
    return customKey;
  }
  return entity.id || identity?.uuid || identity?.id || `entity:${Date.now()}`;
};

const resolveMovementSignature = ({ entity, transform, networking, identity }) => {
  if (networking && typeof networking.movementSignature === 'function') {
    return networking.movementSignature({ entity, transform, identity });
  }
  return defaultMovementSignature(transform);
};

const resolveMovementPayload = ({ entity, transform, networking, identity, world, context }) => {
  if (networking && typeof networking.movementPayload === 'function') {
    return networking.movementPayload({ entity, transform, identity, world, context });
  }
  return defaultMovementPayload({ transform, identity });
};

const resolveMovementMeta = ({ entity, transform, networking, identity, world, context }) => {
  if (networking && typeof networking.movementMeta === 'function') {
    return networking.movementMeta({ entity, transform, identity, world, context }) || {};
  }
  return buildDefaultMovementMeta(transform);
};

const resolveRecipients = ({ networking, entity, identity, transform, world, context }) => {
  if (networking && typeof networking.resolveRecipients === 'function') {
    return networking.resolveRecipients({ entity, identity, transform, world, context });
  }
  return null;
};

const handleNetworking = ({
  entity,
  world,
  context,
  movementCache,
}) => {
  const transform = entity.getComponent('transform');
  const networking = entity.getComponent('networking');
  if (!networking || typeof networking.broadcast !== 'function') {
    return;
  }

  const identity = entity.getComponent('identity') || null;
  const key = resolveBroadcastKey({ entity, networking, identity });
  const signature = resolveMovementSignature({
    entity,
    transform,
    networking,
    identity,
  });

  const lastSignature = movementCache.get(key);
  const forceBroadcast = Boolean(networking.forceBroadcast);
  if (!forceBroadcast && lastSignature === signature) {
    return;
  }

  const payload = resolveMovementPayload({
    entity,
    transform,
    networking,
    identity,
    world,
    context,
  });

  if (payload === null || payload === undefined) {
    movementCache.set(key, signature);
    networking.forceBroadcast = false;
    return;
  }

  const recipients = resolveRecipients({
    networking,
    entity,
    identity,
    transform,
    world,
    context,
  });

  const event = resolveMovementEvent({ identity, networking });
  const meta = resolveMovementMeta({
    entity,
    transform,
    networking,
    identity,
    world,
    context,
  });

  networking.broadcast(event, payload, recipients, { meta });
  movementCache.set(key, signature);
  networking.forceBroadcast = false;
};

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

  const movementCache = new Map();

  return (world, delta, context = {}) => {
    const now = Number.isFinite(context.now) ? context.now : Date.now();
    const runtimeContext = { ...context, now, system: systemContext };
    const entities = world.query(MOVEMENT_COMPONENTS);
    entities.forEach((entity) => {
      processEntityMovement(entity, world, delta, runtimeContext);
      handleNetworking({
        entity,
        world,
        context: runtimeContext,
        movementCache,
      });
    });
  };
};

export { createMovementSystem as default, createMovementSystem, MOVEMENT_COMPONENTS };
