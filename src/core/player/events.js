import playerEvents from './events/player.js';
import itemEvents from './events/item.js';
import resourceEvents from './events/resource.js';
import npcEvents from './events/npc.js';
import monsterEvents from './events/monster.js';
import worldEvents from './events/world.js';
import screenEvents from './events/screen.js';
import partyEvents from './events/party.js';
import { applyItemCatalogToWindow } from '../config/combat/index.js';

/**
 * A global event handler [CLIENT SIDE] (RPC)
 *
 * @param {object} data The incoming event and data associated
 * @param {object} ws The Socket connection to incoming client
 * @param {object} context The server context
 */

// Seed the client-side catalog with local configuration so that item lookups
// succeed before the server sends its authoritative payload.
applyItemCatalogToWindow();

// These are events that come from the server that
// will manipulate and change the client accordingly.
const handler = {
  ...playerEvents,
  ...itemEvents,
  ...resourceEvents,
  ...npcEvents,
  ...monsterEvents,
  ...worldEvents,
  ...screenEvents,
  ...partyEvents,

  /**
   * Receive the data from the client upon browser open
   */
  'server:send:items': (data) => {
    const payload = data && data.data && Array.isArray(data.data.items)
      ? data.data.items
      : [];
    applyItemCatalogToWindow(payload);
  },
};

export default handler;
