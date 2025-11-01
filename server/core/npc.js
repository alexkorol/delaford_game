import Socket from '#server/socket.js';
import * as emoji from 'node-emoji';
import createNPCAIController from '#server/core/systems/controllers/npc-ai-controller.js';
import createNpcMovementHandler from '#server/core/entities/npc/movement-handler.js';
import npcs from './data/npcs.js';
import world from './world.js';

const buildNpcComponents = (npc) => ({
  identity: {
    id: npc.id,
    uuid: npc.uuid || npc.id,
    type: 'npc',
    name: npc.name,
  },
  transform: {
    ref: npc,
    sceneId: npc.sceneId || world.defaultTownId,
    x: npc.x || 0,
    y: npc.y || 0,
    facing: npc.facing || null,
    animation: npc.animation || null,
  },
  'movement-state': {
    handler: npc.movement,
    actor: npc,
  },
  'movement-intent': {
    queue: [],
  },
  'action-queue': {
    queue: [],
  },
  networking: {
    broadcast: Socket.broadcast.bind(Socket),
    events: {
      movement: 'npc:movement',
    },
    broadcastKey: () => `npc:${npc.sceneId || world.defaultTownId}`,
    movementPayload: () => {
      const scene = world.getScene(npc.sceneId);
      return Array.isArray(scene?.npcs) ? scene.npcs : [];
    },
    movementMeta: () => {
      const scene = world.getScene(npc.sceneId);
      const npcsInScene = Array.isArray(scene?.npcs) ? scene.npcs : [];
      return {
        movements: npcsInScene.map(entry => ({
          id: entry.id,
          uuid: entry.uuid || null,
          movementStep: entry.movementStep,
        })),
        animations: npcsInScene.map(entry => ({
          id: entry.id,
          uuid: entry.uuid || null,
          animation: entry.animation || null,
        })),
        sentAt: Date.now(),
      };
    },
    movementSignature: () => {
      const scene = world.getScene(npc.sceneId);
      const npcsInScene = Array.isArray(scene?.npcs) ? scene.npcs : [];
      return npcsInScene.map(entry => [
        entry.uuid || entry.id || 'npc',
        entry.movementStep ? entry.movementStep.sequence : 'step:none',
        entry.x ?? 'x:none',
        entry.y ?? 'y:none',
        entry.facing || 'facing:none',
        entry.animation ? entry.animation.sequence : 'anim:none',
      ].join(':')).join('|');
    },
    resolveRecipients: () => null,
    forceBroadcast: true,
  },
  lifecycle: {
    state: 'active',
    dirty: true,
  },
});

class NPC {
  constructor(data) {
    this.movement = createNpcMovementHandler(this);
    this.id = data.id;
    this.uuid = data.uuid || data.id;
    this.name = data.name;

    // Examine text
    this.examine = data.examine;

    // What actions can be performed on them?
    this.actions = data.actions;

    // Where they will spawn on world restarts
    this.spawn = {
      x: data.spawn.x,
      y: data.spawn.y,
    };

    // Where are they right now?
    this.x = data.spawn.x;
    this.y = data.spawn.y;

    // How far they can walk from spawn location
    this.range = data.spawn.range;

    // When they last performed an action
    this.lastAction = 0;

    // What column they are on in tileset
    this.column = data.graphic.column;

    this.movementStep = {
      sequence: 0,
      startedAt: Date.now(),
      duration: 0,
      direction: null,
      blocked: false,
    };

    this.facing = this.movement.resolveFacing(null);
    this.animation = this.createInitialAnimation();

    this.sceneId = data.sceneId || world.defaultTownId;

    this.__ecsComponents = buildNpcComponents(this);
    const ecsRecord = world.registerActorEntity(this, {
      sceneId: this.sceneId,
      components: this.__ecsComponents,
    });
    this.ecs = ecsRecord || null;
    const ecsWorld = ecsRecord ? ecsRecord.world : world.getSceneWorld(this.sceneId);
    this.controller = createNPCAIController(this, {
      world: ecsWorld,
      worldRef: world,
    });
    if (this.controller) {
      const controllerId = this.uuid || this.id;
      const originalDestroy = typeof this.controller.destroy === 'function'
        ? this.controller.destroy.bind(this.controller)
        : null;
      this.controller.destroy = (...args) => {
        NPC.controllers.delete(controllerId);
        if (originalDestroy) {
          return originalDestroy(...args);
        }
        return undefined;
      };
      NPC.controllers.set(controllerId, this.controller);
    }
  }

  resolveFacing(direction, fallback) {
    return this.movement.resolveFacing(direction, fallback);
  }

  setFacing(direction) {
    return this.movement.setFacing(direction);
  }

  createInitialAnimation(overrides = {}) {
    return this.movement.createInitialAnimation(overrides);
  }

  setAnimationState(state, options = {}) {
    return this.movement.setAnimationState(state, options);
  }

  /**
   * Load the NPCs into the game world
   *
   * @param {this} context The server context
   */
  static load(context) {
    npcs.forEach((npc) => {
      world.addNpc(new NPC(npc));
    }, context);

    console.log(`${emoji.get('walking')}  Loading NPCs...`);
  }

  /**
   * Simulate NPC movement every cycle
   */
  static movement() {
    const now = Date.now();
    NPC.controllers.forEach((controller, id) => {
      if (!controller || typeof controller.update !== 'function') {
        return;
      }
      try {
        controller.update(now, { worldRef: world });
      } catch (error) {
        console.error(`[npc] controller update failed for ${id}`, error);
      }
    });
  }
}

export default NPC;

NPC.controllers = new Map();
