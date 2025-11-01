import { describe, it, expect, beforeEach, vi } from 'vitest';
import createActionQueueSystem from '#server/core/systems/action-queue-system.js';
import { createWorld } from '#server/core/systems/ecs/factory.js';

const buildEntity = (world, id, type) => {
  const entity = world.createEntity(id);
  entity.addComponent('identity', { type, id, uuid: `${id}:uuid` });
  entity.addComponent('movement-intent', { queue: [] });
  entity.addComponent('action-queue', { queue: [] });
  world.addEntity(entity);
  return entity;
};

describe('action queue system', () => {
  let world;
  let actionQueueSystem;

  beforeEach(() => {
    world = createWorld();
    actionQueueSystem = createActionQueueSystem();
  });

  it.each([
    ['player'],
    ['npc'],
    ['monster'],
  ])('dispatches movement actions for %s entities', (type) => {
    const entity = buildEntity(world, `${type}:queue`, type);
    const actionComponent = entity.getComponent('action-queue');
    actionComponent.queue.push({
      type: 'move',
      intent: { type: 'move', direction: 'west', meta: { reason: 'test' } },
      meta: { reason: 'test' },
    });

    actionQueueSystem(world, 16, { now: 10_000 });

    const movementIntent = entity.getComponent('movement-intent');
    expect(movementIntent.queue).toHaveLength(1);
    expect(movementIntent.queue[0]).toMatchObject({ type: 'move', direction: 'west', meta: { reason: 'test' } });

    expect(actionComponent.queue).toHaveLength(0);
    expect(actionComponent.active).toBeNull();
    expect(actionComponent.lastProcessedAt).toBe(10_000);
  });

  it('executes AI actions and clears active state', () => {
    const entity = buildEntity(world, 'monster:ai', 'monster');
    const execute = vi.fn(() => true);
    entity.getComponent('action-queue').queue.push({ type: 'ai', execute });

    actionQueueSystem(world, 33, { now: 20_000, actor: { id: 'monster:ai' } });

    expect(execute).toHaveBeenCalledWith({
      action: expect.objectContaining({ type: 'ai' }),
      entity,
      world,
      context: expect.objectContaining({ now: 20_000 }),
    });
    expect(entity.getComponent('action-queue').active).toBeNull();
  });

  it('requeues deferred actions when dispatcher returns "defer"', () => {
    const entity = buildEntity(world, 'npc:defer', 'npc');
    const deferredAction = { type: 'move', intent: { type: 'move', direction: 'north' } };
    entity.getComponent('action-queue').queue.push(deferredAction);

    const customSystem = createActionQueueSystem({
      dispatchers: {
        move: () => 'defer',
      },
    });

    customSystem(world, 16, { now: 30_000 });

    const actionComponent = entity.getComponent('action-queue');
    expect(actionComponent.active).toBeNull();
    expect(actionComponent.queue[0]).toBe(deferredAction);
  });
});
