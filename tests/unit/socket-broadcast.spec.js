import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import Socket from '#server/socket.js';
import world from '#server/core/world.js';

const createClient = ({ id, readyState }) => ({
  id,
  readyState,
  send: vi.fn(),
});

describe('Socket.broadcast', () => {
  const originalClients = world.clients;
  const originalPlayers = [...world.players];
  const originalGlobalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    globalThis.WebSocket = undefined;
    world.clients = [];
    world._players = [];
  });

  afterEach(() => {
    world.clients = originalClients;
    world._players = [...originalPlayers];
    globalThis.WebSocket = originalGlobalWebSocket;
  });

  it('sends a single payload to connected clients and removes closed ones', () => {
    const openClient = createClient({ id: 'open', readyState: WebSocket.OPEN });
    const closedClient = createClient({ id: 'closed', readyState: WebSocket.CLOSED });

    world.clients = [openClient, closedClient];
    world._players = [
      { socket_id: 'open' },
      { socket_id: 'closed' },
    ];

    const players = [
      { socket_id: 'open' },
      { socket_id: 'closed' },
    ];

    Socket.broadcast('game:update', { foo: 'bar' }, players);

    expect(openClient.send).toHaveBeenCalledTimes(1);
    const [payloadString] = openClient.send.mock.calls[0];
    const payload = JSON.parse(payloadString);

    expect(payload.event).toBe('game:update');
    expect(payload.data).toEqual({ foo: 'bar' });
    expect(typeof payload.meta.sentAt).toBe('number');

    expect(closedClient.send).not.toHaveBeenCalled();
    expect(world.clients).toEqual([openClient]);
  });

  it('ignores clients outside of the provided player list while pruning closed sockets', () => {
    const targetedClient = createClient({ id: 'target', readyState: WebSocket.OPEN });
    const ignoredClient = createClient({ id: 'ignored', readyState: WebSocket.OPEN });
    const closedClient = createClient({ id: 'closed', readyState: WebSocket.CLOSED });

    world.clients = [targetedClient, ignoredClient, closedClient];
    world._players = [
      { socket_id: 'target' },
      { socket_id: 'ignored' },
      { socket_id: 'closed' },
    ];

    const players = [
      { socket_id: 'target' },
    ];

    Socket.broadcast('game:event', { value: 42 }, players);

    expect(targetedClient.send).toHaveBeenCalledTimes(1);
    expect(ignoredClient.send).not.toHaveBeenCalled();
    expect(closedClient.send).not.toHaveBeenCalled();

    expect(world.clients).toEqual([targetedClient, ignoredClient]);
  });

  it('emits directly to a connected client when provided with a matching socket id', () => {
    const client = createClient({ id: 'emit-target', readyState: WebSocket.OPEN });

    world.clients = [client];

    const data = {
      player: { socket_id: 'emit-target' },
      payload: { example: true },
    };

    Socket.emit('game:emit', data);

    expect(client.send).toHaveBeenCalledTimes(1);
    const [payloadString] = client.send.mock.calls[0];
    const payload = JSON.parse(payloadString);

    expect(payload.event).toBe('game:emit');
    expect(payload.data).toEqual(data);
    expect(payload.meta).toBeUndefined();
  });
});
