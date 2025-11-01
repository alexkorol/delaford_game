const EXPECTED_COMPONENTS = Object.freeze({
  /**
   * Tracks positional data, velocity, and pathing state required by movement and navigation systems.
   */
  movement: 'Position, velocity, and navigation intent for spatial updates.',
  /**
   * Governs spawn/despawn lifecycle, health, and dirty flags that drive replication and cleanup.
   */
  lifecycle: 'Spawn/despawn state, health, and dirty flags for world sync.',
  /**
   * AI behaviour selector such as behaviour trees or finite state machines.
   */
  behaviour: 'Behaviour trees, state machines, or scripts controlling decisions.',
  /**
   * Queue of pending actions that systems consume each tick.
   */
  actionQueue: 'Ordered actions awaiting execution by gameplay systems.',
  /**
   * Networking handles that bind entities to sessions, channels, or replication layers.
   */
  networking: 'Handles for broadcasting state changes to connected clients.',
});

const createEntity = (id) => ({
  id,
  components: new Map(),
  addComponent(type, data) {
    this.components.set(type, data);
    return this;
  },
  getComponent(type) {
    return this.components.get(type);
  },
  hasComponent(type) {
    return this.components.has(type);
  },
  removeComponent(type) {
    this.components.delete(type);
    return this;
  },
});

const createWorld = (options = {}) => {
  const entities = new Map();
  const systems = [];
  const worldContext = {
    lastUpdateAt: null,
    expectedComponents: EXPECTED_COMPONENTS,
    ...options.context,
  };

  return {
    entities,
    systems,
    context: worldContext,
    createEntity(id) {
      const entity = createEntity(id);
      entities.set(id, entity);
      return entity;
    },
    addEntity(entity) {
      if (entity && entity.id) {
        entities.set(entity.id, entity);
      }
      return entity;
    },
    removeEntity(id) {
      entities.delete(id);
    },
    addSystem(system) {
      if (typeof system === 'function') {
        systems.push(system);
      }
      return system;
    },
    update(delta, context = {}) {
      systems.forEach((system) => {
        system(this, delta, { ...worldContext, ...context });
      });
    },
    query(...componentTypes) {
      const required = componentTypes.flat().filter(Boolean);
      if (!required.length) {
        return Array.from(entities.values());
      }
      return Array.from(entities.values()).filter((entity) => (
        required.every((type) => entity.hasComponent(type))
      ));
    },
  };
};

export { createWorld, createEntity, EXPECTED_COMPONENTS };

export default {
  createWorld,
  createEntity,
  EXPECTED_COMPONENTS,
};
