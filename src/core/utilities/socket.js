class Socket {
  static queue = [];

  static waitForOpen = false;

  static socketsWithListeners = new WeakSet();

  static flushQueue = () => {
    if (!window.ws || window.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    Socket.waitForOpen = false;

    while (Socket.queue.length > 0) {
      const message = Socket.queue.shift();
      window.ws.send(message);
    }
  };

  static ensureListeners() {
    if (!window.ws) {
      return;
    }

    if (!Socket.socketsWithListeners) {
      Socket.socketsWithListeners = new WeakSet();
    }

    if (Socket.socketsWithListeners.has(window.ws)) {
      return;
    }

    const socket = window.ws;
    socket.addEventListener('open', Socket.flushQueue);
    socket.addEventListener('close', () => {
      Socket.waitForOpen = false;
      if (Socket.socketsWithListeners) {
        Socket.socketsWithListeners.delete(socket);
      }
    });
    Socket.socketsWithListeners.add(socket);
  }

  /**
   * Send an event to the server
   *
   * @param {string} event The event to send out
   * @param {object} data The data regarding the event
   */
  static emit(event, data) {
    const payload = JSON.stringify({
      event,
      data,
    });

    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      window.ws.send(payload);
      return;
    }

    Socket.queue.push(payload);
    Socket.waitForOpen = true;

    if (window.ws) {
      Socket.ensureListeners();
      Socket.flushQueue();
    }
  }
}

export default Socket;
