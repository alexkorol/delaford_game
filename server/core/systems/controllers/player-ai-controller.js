import {
  buildControllerEntity,
  createControllerWorld,
  dispatchBehaviourScript,
  enqueueAction,
} from './base-controller.js';

const normaliseMovementIntent = (direction, meta = {}) => {
  if (direction && typeof direction === 'object') {
    return { ...direction };
  }
  return {
    type: meta.type || 'move',
    direction,
    options: meta.options || {},
    method: meta.method,
    args: meta.args,
    data: meta.data,
    meta: meta.meta,
  };
};

const enqueueMovementAction = (entity, direction, meta = {}) => {
  const intent = normaliseMovementIntent(direction, meta);
  enqueueAction(entity, {
    type: 'move',
    intent,
    meta: meta.meta || intent.meta || {},
    intentType: intent.type,
  });
  return intent;
};

const enqueuePathAction = (entity, path, meta = {}) => {
  const args = meta.args || [];
  if (!Array.isArray(args) || !args.length) {
    args.push(meta.playerIndex ?? null);
    if (path !== undefined) {
      args.push(path);
    }
  }
  const intent = {
    type: 'walk-path',
    method: 'walkPath',
    args,
    meta: meta.meta || {},
  };
  enqueueAction(entity, {
    type: 'move',
    intent,
    intentType: 'walk-path',
    meta: intent.meta,
  });
  return intent;
};

const createPlayerAIController = (player, options = {}) => {
  if (!player) {
    throw new Error('Player reference is required for PlayerAIController');
  }

  const world = createControllerWorld({
    world: options.world,
    worldOptions: {
      context: {
        actorType: 'player',
        sceneId: player.sceneId || null,
        controller: 'player-ai',
      },
    },
    systemOptions: options.systemOptions || {},
  });

  const entityId = options.entityId || player.uuid || player.id || `player:${Date.now()}`;
  const entity = buildControllerEntity({
    world,
    id: entityId,
    transform: {
      ref: player,
      sceneId: player.sceneId || null,
      x: player.x || 0,
      y: player.y || 0,
      facing: player.facing || null,
      animation: player.animation || null,
    },
    movementState: {
      handler: player.movement,
      actor: player,
      playerIndex: options.playerIndex ?? null,
    },
    movementIntent: { queue: [] },
    actionQueue: { queue: [] },
    behaviour: options.behaviour || player.behaviour || null,
  });

  let lastUpdateAt = null;

  const controller = {
    world,
    entity,
    enqueueAction: action => enqueueAction(entity, action),
    enqueueMovement: (direction, meta) => enqueueMovementAction(entity, direction, meta),
    enqueuePath: (path, meta) => enqueuePathAction(entity, path, meta),
    update(now = Date.now(), context = {}) {
      const delta = lastUpdateAt === null ? 0 : now - lastUpdateAt;
      lastUpdateAt = now;
      dispatchBehaviourScript({ entity, world, now, delta });
      world.update(delta, { ...context, now, actor: player });
    },
    destroy() {
      if (world && typeof world.removeEntity === 'function') {
        world.removeEntity(entity.id);
      }
    },
  };

  return controller;
};

export default createPlayerAIController;
