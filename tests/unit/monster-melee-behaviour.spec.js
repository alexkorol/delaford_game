import { describe, it, expect, vi, beforeEach } from 'vitest';

import registerMeleeBehaviour from '../../server/core/entities/monster/behaviours/melee.js';
import { createWorld } from '../../server/core/entities/ai/ecs-lite.js';

describe('melee behaviour registration', () => {
  let world;
  let entity;
  let monster;

  beforeEach(() => {
    world = createWorld();
    entity = world.createEntity('monster-1');

    monster = {
      id: 'monster-1',
      x: 0,
      y: 0,
      spawn: { x: 0, y: 0 },
      state: {
        mode: null,
        pendingAttack: null,
        respawnAt: null,
      },
      behaviour: {},
      isAlive: true,
      respawn: { delayMs: 5_000 },
      respawnNow: vi.fn(),
      resolvePendingAttack: vi.fn(() => false),
      resolveTarget: vi.fn(() => null),
      tryAttack: vi.fn(() => false),
      pursue: vi.fn(() => false),
      returnToSpawn: vi.fn(() => false),
      patrol: vi.fn(() => true),
    };
  });

  it('adds expected components and registers world system', () => {
    const system = registerMeleeBehaviour({ world, entity, monster });

    expect(system).toBeTypeOf('function');
    expect(world.systems).toContain(system);

    const behaviourComponent = entity.getComponent('behaviour');
    const lifecycleComponent = entity.getComponent('lifecycle');
    const monsterComponent = entity.getComponent('monster');

    expect(behaviourComponent).toEqual({ type: 'melee' });
    expect(lifecycleComponent).toEqual({ dirty: false });
    expect(monsterComponent).toEqual({ ref: monster });
  });

  it('marks lifecycle dirty when patrol updates', () => {
    registerMeleeBehaviour({ world, entity, monster });

    world.update(16, { now: 1_000 });

    expect(monster.patrol).toHaveBeenCalled();
    const lifecycleComponent = entity.getComponent('lifecycle');
    expect(lifecycleComponent.dirty).toBe(true);
    expect(monster.state.mode).toBe('patrolling');
  });

  it('resolves pending attacks before continuing behaviour', () => {
    monster.state.pendingAttack = { resolveAt: 500 };
    monster.resolvePendingAttack.mockReturnValueOnce(true);
    monster.patrol.mockReturnValueOnce(false);

    registerMeleeBehaviour({ world, entity, monster });

    world.update(16, { now: 1_000 });

    expect(monster.resolvePendingAttack).toHaveBeenCalledWith(1_000);
    expect(monster.patrol).toHaveBeenCalled();
    const lifecycleComponent = entity.getComponent('lifecycle');
    expect(lifecycleComponent.dirty).toBe(true);
  });

  it('queues respawn when the monster is dead', () => {
    monster.isAlive = false;

    registerMeleeBehaviour({ world, entity, monster });

    world.update(16, { now: 10_000 });

    const lifecycleComponent = entity.getComponent('lifecycle');
    expect(monster.respawnNow).not.toHaveBeenCalled();
    expect(monster.state.respawnAt).toBe(15_000);
    expect(lifecycleComponent.dirty).toBe(true);
  });
});
