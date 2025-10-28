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

const createWorld = () => {
  const entities = new Map();
  const systems = [];
  const worldContext = {
    lastUpdateAt: null,
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
        system(this, delta, context);
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

export { createWorld, createEntity };

export default {
  createWorld,
  createEntity,
};
