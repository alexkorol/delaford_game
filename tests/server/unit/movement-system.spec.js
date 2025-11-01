import { describe, it, expect, beforeEach, vi } from 'vitest';
import createMovementSystem from '#server/core/systems/movement-system.js';
import { createWorld } from '#server/core/systems/ecs/factory.js';
import { socketBroadcastMock } from '../mocks/socket.js';

const buildEntity = (world, { id, type, handler }) => {
  const entity = world.createEntity(id);
  const transform = {
    x: 0,
    y: 0,
    facing: 'south',
    movementStep: { sequence: 1, startedAt: 0, direction: 'east' },
  };

  entity.addComponent('transform', transform);
  entity.addComponent('movement-state', { handler, playerIndex: 0 });
  entity.addComponent('movement-intent', { queue: [{ type: 'move', direction: 'east' }], current: null });
  entity.addComponent('identity', { type, id, uuid: `${id}:uuid` });
  entity.addComponent('networking', { broadcast: vi.fn(), broadcastKey: id });
  world.addEntity(entity);
  return entity;
};

describe('movement system', () => {
  let world;
  let movementSystem;

  beforeEach(() => {
    world = createWorld();
    movementSystem = createMovementSystem();
  });

  it.each([
    ['player'],
    ['npc'],
    ['monster'],
  ])('processes movement intents and broadcasts updates for %s entities', (type) => {
    const handler = { move: vi.fn(() => true) };
    const entity = buildEntity(world, { id: `${type}:1`, type, handler });

    movementSystem(world, 16, { now: 1_000 });

    expect(handler.move).toHaveBeenCalledWith('east', {});

    const movementState = entity.getComponent('movement-state');
    expect(movementState.lastIntentType).toBe('move');

    const intentComponent = entity.getComponent('movement-intent');
    expect(intentComponent.current).toBeNull();
    expect(intentComponent.queue).toHaveLength(0);
    expect(intentComponent.last).toMatchObject({ type: 'move', direction: 'east' });

    const broadcast = entity.getComponent('networking').broadcast;
    expect(broadcast).toHaveBeenCalledTimes(1);
    const [event, payload, recipients, options] = broadcast.mock.calls[0];
    expect(event).toBe(`${type}:movement`);
    expect(payload).toMatchObject({
      type,
      uuid: `${type}:1:uuid`,
      x: 0,
      y: 0,
      facing: 'south',
    });
    expect(recipients).toBeNull();
    expect(typeof options.meta.sentAt).toBe('number');
  });

  it('does not re-broadcast movement when the signature is unchanged', () => {
    const handler = { move: vi.fn(() => true) };
    const entity = buildEntity(world, { id: 'player:cache', type: 'player', handler });
    const networking = entity.getComponent('networking');
    networking.broadcast = vi.fn((...args) => socketBroadcastMock(...args));

    movementSystem(world, 16, { now: 2_000 });
    movementSystem(world, 16, { now: 2_016 });

    expect(handler.move).toHaveBeenCalledTimes(1);
    expect(networking.broadcast).toHaveBeenCalledTimes(1);
    expect(socketBroadcastMock).toHaveBeenCalledTimes(1);
  });

  it('requeues intents when handlers indicate failure with requeueOnFail', () => {
    const handler = { move: vi.fn(() => false) };
    const entity = buildEntity(world, { id: 'npc:retry', type: 'npc', handler });
    const intentComponent = entity.getComponent('movement-intent');
    intentComponent.queue = [];
    intentComponent.current = {
      type: 'move',
      direction: 'north',
      requeueOnFail: true,
      consumeOnFalse: false,
    };

    movementSystem(world, 16, { now: 3_000 });

    expect(handler.move).toHaveBeenCalledWith('north', {});
    expect(intentComponent.current).toBeNull();
    expect(intentComponent.queue[0]).toMatchObject({ type: 'move', direction: 'north' });
  });
});
