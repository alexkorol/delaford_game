import actionEvents from './handlers/actions';
import socketEvents from './handlers/socket-events';
import partyEvents from './handlers/party';

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
