import world from '#server/core/world.js';

class PlayerSocket {
  constructor(socketId) {
    this.client = world.clients.find(p => p.id === socketId) || null;
  }

  emit(event, data) {
    if (!this.client || typeof this.client.send !== 'function') {
      return;
    }

    this.client.send(JSON.stringify({
      event,
      data,
    }));
  }
}

export default PlayerSocket;
