import {
  buildControllerEntity,
  createControllerWorld,
  dispatchBehaviourScript,
  enqueueAction,
} from './base-controller.js';

const DEFAULT_RANDOM_MOVE_INTERVAL = 4_000;

const enqueueRandomMovement = (entity, worldRef) => {
  enqueueAction(entity, {
    type: 'move',
    intent: {
      type: 'method',
      method: 'performRandomMovement',
      args: [worldRef],
    },
    meta: { source: 'npc-random' },
  });
};

const ensureRandomMovementSchedule = ({ entity, now, behaviour, worldRef }) => {
  if (!behaviour || behaviour.type === 'random-walk' || !behaviour.type) {
    const state = behaviour && (behaviour.state || (behaviour.state = {}));
    const interval = behaviour && Number.isFinite(behaviour.intervalMs)
      ? behaviour.intervalMs
      : DEFAULT_RANDOM_MOVE_INTERVAL;
    if (!state || !state.lastRandomMove || now - state.lastRandomMove >= interval) {
      enqueueRandomMovement(entity, worldRef);
      if (state) {
        state.lastRandomMove = now;
      }
    }
  }
};

const createNPCAIController = (npc, options = {}) => {
  if (!npc) {
    throw new Error('NPC reference is required for NPCAIController');
  }

  const world = createControllerWorld({
    world: options.world,
    worldOptions: {
      context: {
        actorType: 'npc',
        sceneId: npc.sceneId || options.sceneId || null,
        controller: 'npc-ai',
      },
    },
    systemOptions: options.systemOptions || {},
  });

  const entityId = options.entityId || npc.uuid || npc.id || `npc:${Date.now()}`;
  const entity = buildControllerEntity({
    world,
    id: entityId,
    transform: {
      ref: npc,
      sceneId: npc.sceneId || options.sceneId || null,
      x: npc.x || 0,
      y: npc.y || 0,
      facing: npc.facing || null,
      animation: npc.animation || null,
    },
    movementState: {
      handler: npc.movement,
      actor: npc,
    },
    movementIntent: { queue: [] },
    actionQueue: { queue: [] },
    behaviour: options.behaviour || {
      type: 'random-walk',
      intervalMs: options.intervalMs || DEFAULT_RANDOM_MOVE_INTERVAL,
    },
  });

  const behaviourComponent = entity.getComponent('behaviour-config');
  if (behaviourComponent && !behaviourComponent.type) {
    behaviourComponent.type = 'random-walk';
  }

  let lastUpdateAt = null;

  const controller = {
    world,
    entity,
    enqueueAction: action => enqueueAction(entity, action),
    update(now = Date.now(), context = {}) {
      const delta = lastUpdateAt === null ? 0 : now - lastUpdateAt;
      lastUpdateAt = now;
      const behaviour = entity.getComponent('behaviour-config');
      const worldRef = context.worldRef || options.worldRef || null;
      ensureRandomMovementSchedule({ entity, now, behaviour, worldRef });
      dispatchBehaviourScript({ entity, world, now, delta });
      world.update(delta, { ...context, now, actor: npc });
    },
    destroy() {
      if (world && typeof world.removeEntity === 'function') {
        world.removeEntity(entity.id);
      }
    },
  };

  return controller;
};

export default createNPCAIController;
