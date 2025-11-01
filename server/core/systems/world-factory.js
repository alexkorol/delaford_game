import { createWorld } from './ecs/factory.js';
import createActionQueueSystem from './action-queue-system.js';
import createMovementSystem from './movement-system.js';

const ensureRegistry = (world) => {
  if (!world.context) {
    world.context = {};
  }
  if (!world.context.__systemRegistry) {
    world.context.__systemRegistry = new Map();
  } else if (!(world.context.__systemRegistry instanceof Map)) {
    const entries = Array.isArray(world.context.__systemRegistry)
      ? world.context.__systemRegistry
      : [];
    world.context.__systemRegistry = new Map(entries);
  }
  return world.context.__systemRegistry;
};

const registerWorldSystems = (world, options = {}) => {
  if (!world || typeof world.addSystem !== 'function') {
    return world;
  }

  const registry = ensureRegistry(world);

  if (!options.skipActionQueue && !registry.has('action-queue')) {
    const system = options.actionQueueSystem
      || createActionQueueSystem(options.actionQueueOptions || {});
    world.addSystem(system);
    registry.set('action-queue', system);
  }

  if (!options.skipMovement && !registry.has('movement')) {
    const system = options.movementSystem
      || createMovementSystem(options.movementOptions || {});
    world.addSystem(system);
    registry.set('movement', system);
  }

  const extraSystems = options.additionalSystems || options.systems || [];
  if (Array.isArray(extraSystems)) {
    extraSystems.forEach((entry) => {
      if (!entry) {
        return;
      }
      if (typeof entry === 'function') {
        if (!registry.has(entry)) {
          world.addSystem(entry);
          registry.set(entry, entry);
        }
        return;
      }
      const key = entry.key || entry.id;
      const { system } = entry;
      if (typeof system !== 'function') {
        return;
      }
      if (key && registry.has(key)) {
        return;
      }
      world.addSystem(system);
      if (key) {
        registry.set(key, system);
      } else {
        registry.set(system, system);
      }
    });
  }

  return world;
};

const createSceneWorld = (options = {}) => {
  const world = createWorld(options.worldOptions || options);
  if (options.autoRegister !== false) {
    registerWorldSystems(world, options.systemOptions || options);
  }
  return world;
};

export { createSceneWorld, registerWorldSystems };

export default createSceneWorld;
