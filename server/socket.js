import WebSocket from 'ws';
import world from '#server/core/world.js';

/**
 * IDEA: Create seperate socket classes,
 * one for server and one for player???
 */

class Socket {
  constructor(server) {
    this.ws = new WebSocket.Server({ server });
    this.clients = world.clients;
  }

  /**
   * Emit an event to a single client
   *
   * @param {string} event The type of event being emitted
   * @param {object} data The data associated with the event
   */
  static emit(event, data, options = {}) {
    if (!data.player.socket_id) {
      console.log(event, 'No player socket ID connected.');
    }

    // Find player wanting the emit request
    const player = world.clients.find(p => p.id === data.player.socket_id);

    // Send the player back their needed data
    const payload = {
      event,
      data,
    };

    if (options.meta || options.includeTimestamp) {
      const meta = {
        sentAt: Date.now(),
        ...(options.meta || {}),
      };

      payload.meta = meta;
    }

    player.send(JSON.stringify(payload));
  }

  /**
   * Broadcast an event to all clients connected in-game
   *
   * @param {string} event The type of event I am broadcasting
   * @param {object} data Data associated with the event
   */
  static broadcast(event, data, players, options = {}) {
    const meta = {
      sentAt: Date.now(),
      ...(options.meta || {}),
    };

    const payload = {
      event,
      data,
      meta,
    };

    const serializedPayload = JSON.stringify(payload);
    const allowedSocketIds = players ? new Set(players.map(player => player.socket_id)) : null;
    const disconnectedClientIds = [];

    world.clients.forEach(client => {
      if (client.readyState === WebSocket.CLOSED) {
        disconnectedClientIds.push(client.id);
        return;
      }

      if (allowedSocketIds && !allowedSocketIds.has(client.id)) {
        return;
      }

      const sender = world.players.find(p => p.socket_id === client.id);

      if (!world.players.length || !sender) {
        return;
      }

      if (client.readyState === WebSocket.OPEN) {
        client.send(serializedPayload);
      }
    });

    if (disconnectedClientIds.length) {
      const disconnectedSet = new Set(disconnectedClientIds);
      world.clients = world.clients.filter(client => !disconnectedSet.has(client.id));
    }
  }

  static sendMessageToPlayer(playerIndex, message) {
    this.emit('game:send:message', {
      player: { socket_id: world.players[playerIndex].socket_id },
      text: message,
    });
  }
}

export default Socket;
