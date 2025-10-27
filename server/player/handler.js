import actionEvents from './handlers/actions/index.js';
import socketEvents from './handlers/socket-events/index.js';
import partyEvents from './handlers/party.js';

/**
 * A global event handler (RPC)
 *
 * @param {object} data The incoming event and data associated
 * @param {object} ws The Socket connection to incoming client
 * @param {object} context The server context
 */
const Handler = {
  // Events like player login, say, queue action, etc.
  ...socketEvents,
  // Items from the context-menu.
  ...actionEvents,
  // Party lifecycle and instancing events
  ...partyEvents,
};

export default Handler;
