import { socketBroadcastMock } from '../mocks/socket.js';
import { axiosPostMock } from '../mocks/axios.js';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import createSceneWorld from '#server/core/systems/world-factory.js';
import Socket from '#server/socket.js';
import axios from 'axios';

describe('scene tick integration', () => {
  beforeEach(() => {
    socketBroadcastMock.mockClear();
    axiosPostMock.mockClear();
  });

  it('applies movement, combat, and persistence effects across entity types', () => {
    const world = createSceneWorld({ worldOptions: { context: { sceneId: 'integration-test' } } });
    const combatLog = [];

    const playerTransform = { x: 0, y: 0, facing: 'south' };
    const playerMovement = {
      move: vi.fn(() => {
        playerTransform.x += 1;
        return true;
      }),
    };

    const playerEntity = world.createEntity('player:1');
    playerEntity.addComponent('transform', playerTransform);
    playerEntity.addComponent('movement-state', { handler: playerMovement });
    playerEntity.addComponent('movement-intent', { queue: [] });
    playerEntity.addComponent('action-queue', {
      queue: [
        {
          type: 'move',
          intent: { type: 'move', direction: 'east' },
        },
      ],
    });
    playerEntity.addComponent('identity', { type: 'player', id: 'player:1', uuid: 'player:1' });
    playerEntity.addComponent('networking', { broadcast: Socket.broadcast, broadcastKey: 'player:1' });
    playerEntity.addComponent('lifecycle', { dirty: true });
    playerEntity.addComponent('persistence', {
      dirty: true,
      cooldownMs: 0,
      save: ({ entity }) => axios.post('/players', {
        id: entity.getComponent('identity').id,
        position: { x: playerTransform.x, y: playerTransform.y },
      }),
    });
    world.addEntity(playerEntity);

    const npcTransform = { x: 2, y: 2, facing: 'north' };
    const npcMovement = {
      move: vi.fn(() => {
        npcTransform.y -= 1;
        return true;
      }),
    };

    const npcEntity = world.createEntity('npc:1');
    npcEntity.addComponent('transform', npcTransform);
    npcEntity.addComponent('movement-state', { handler: npcMovement });
    npcEntity.addComponent('movement-intent', { queue: [] });
    npcEntity.addComponent('action-queue', {
      queue: [
        {
          type: 'move',
          intent: { type: 'move', direction: 'south' },
        },
      ],
    });
    npcEntity.addComponent('identity', { type: 'npc', id: 'npc:1', uuid: 'npc:1' });
    npcEntity.addComponent('networking', { broadcast: Socket.broadcast, broadcastKey: 'npc:1' });
    world.addEntity(npcEntity);

    const monsterTransform = { x: -1, y: 0, facing: 'west' };
    const monsterMovement = {
      move: vi.fn(() => {
        monsterTransform.x -= 1;
        return true;
      }),
    };

    const monsterEntity = world.createEntity('monster:1');
    monsterEntity.addComponent('transform', monsterTransform);
    monsterEntity.addComponent('movement-state', { handler: monsterMovement });
    monsterEntity.addComponent('movement-intent', { queue: [] });
    monsterEntity.addComponent('action-queue', {
      queue: [
        {
          type: 'move',
          intent: { type: 'move', direction: 'west' },
        },
        {
          type: 'ai',
          execute: ({ entity }) => {
            combatLog.push({ entity: entity.id, target: 'player:1', damage: 5 });
            const lifecycle = entity.getComponent('lifecycle');
            if (lifecycle) {
              lifecycle.dirty = true;
            }
            return true;
          },
        },
      ],
    });
    monsterEntity.addComponent('identity', { type: 'monster', id: 'monster:1', uuid: 'monster:1' });
    monsterEntity.addComponent('networking', { broadcast: Socket.broadcast, broadcastKey: 'monster:1' });
    monsterEntity.addComponent('lifecycle', { dirty: false });
    world.addEntity(monsterEntity);

    world.update(16, { now: 1_000 });
    world.update(16, { now: 1_016 });

    expect(playerMovement.move).toHaveBeenCalledWith('east', {});
    expect(playerTransform.x).toBe(1);
    expect(npcMovement.move).toHaveBeenCalledWith('south', {});
    expect(npcTransform.y).toBe(1);
    expect(monsterMovement.move).toHaveBeenCalledWith('west', {});
    expect(monsterTransform.x).toBe(-2);

    expect(combatLog).toContainEqual({ entity: 'monster:1', target: 'player:1', damage: 5 });

    const events = socketBroadcastMock.mock.calls.map(call => call[0]);
    expect(events).toContain('player:movement');
    expect(events).toContain('npc:movement');
    expect(events).toContain('monster:movement');

    expect(axiosPostMock).toHaveBeenCalledWith('/players', {
      id: 'player:1',
      position: { x: 1, y: 0 },
    });
    expect(axiosPostMock).toHaveBeenCalledTimes(1);

    const persistence = playerEntity.getComponent('persistence');
    expect(persistence.dirty).toBe(false);
    expect(playerEntity.getComponent('lifecycle').dirty).toBe(false);
  });
});
