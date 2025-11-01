import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import actions from '#server/player/handlers/actions/index.js';
import world from '#server/core/world.js';
import Socket from '#server/socket.js';

const handler = actions['player:inventory-drop'];

const resetWorldState = () => {
  const players = world.players;
  if (Array.isArray(players)) {
    players.length = 0;
  }

  const defaultTown = world.getDefaultTown();
  if (defaultTown && Array.isArray(defaultTown.players)) {
    defaultTown.players.length = 0;
  }

  world.items = [];
};

describe('player:inventory-drop handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetWorldState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores requests that omit the inventory slot reference', () => {
    const movementSpy = vi.spyOn(world, 'requestActorMovementBroadcast');
    const broadcastSpy = vi.spyOn(Socket, 'broadcast').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    handler({ id: 'player:missing-slot', data: {} });

    expect(movementSpy).not.toHaveBeenCalled();
    expect(broadcastSpy).not.toHaveBeenCalled();
    expect(world.items).toHaveLength(0);
  });

  it('bails out when the referenced slot does not exist on the server', () => {
    const player = {
      uuid: 'player:server-only',
      socket_id: 'socket:server-only',
      x: 12,
      y: 34,
      inventory: {
        slots: [
          { slot: 3, id: 'bronze-sword', qty: 1, uuid: 'bronze-sword:uuid' },
        ],
      },
    };

    world.players.push(player);
    world.getDefaultTown().players.push(player);

    const movementSpy = vi.spyOn(world, 'requestActorMovementBroadcast');
    const broadcastSpy = vi.spyOn(Socket, 'broadcast').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    handler({
      id: player.uuid,
      data: { miscData: { slot: 99 } },
    });

    expect(player.inventory.slots).toHaveLength(1);
    expect(movementSpy).not.toHaveBeenCalled();
    expect(broadcastSpy).not.toHaveBeenCalled();
    expect(world.items).toHaveLength(0);
  });

  it('drops the trusted server item and rejects forged client payloads', () => {
    const serverItem = {
      slot: 7,
      id: 'iron-dagger',
      qty: 2,
      uuid: 'iron-dagger:uuid',
      name: 'Iron Dagger',
    };

    const player = {
      uuid: 'player:tamper-test',
      socket_id: 'socket:tamper-test',
      x: 99,
      y: 42,
      inventory: {
        slots: [structuredClone(serverItem)],
      },
    };

    world.players.push(player);
    world.getDefaultTown().players.push(player);

    const movementSpy = vi.spyOn(world, 'requestActorMovementBroadcast').mockReturnValue(true);
    const broadcastSpy = vi.spyOn(Socket, 'broadcast').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    handler({
      id: player.uuid,
      data: { miscData: { slot: serverItem.slot } },
      item: { id: 'mythic-sword', qty: 999, uuid: 'client:uuid' },
      player: {
        inventory: {
          slots: [
            {
              slot: serverItem.slot,
              id: 'mythic-sword',
              qty: 999,
              uuid: 'client:uuid',
            },
          ],
        },
      },
    });

    expect(movementSpy).toHaveBeenCalledWith(player);
    expect(broadcastSpy).toHaveBeenCalledTimes(1);
    expect(player.inventory.slots).toHaveLength(0);
    expect(world.items).toHaveLength(1);

    const [dropped] = world.items;
    expect(dropped.id).toBe(serverItem.id);
    expect(dropped.qty).toBe(serverItem.qty);
    expect(dropped.slot).toBeUndefined();
    expect(dropped.uuid).toBeTruthy();
  });
});
