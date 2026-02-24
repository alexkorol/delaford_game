import world from '#server/core/world.js';

class PlayerSocket {
  constructor(socketId) {
    this.client = world.clients.find(p => p.id === socketId);
  }

  emit(event, data) {
    if (!this.client) {
      return;
    }
    // Send the player back their needed data
    this.client.send(JSON.stringify({
      event,
      data,
    }));
  }
}

export default PlayerSocket;
