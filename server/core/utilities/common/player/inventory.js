import Query from '#server/core/data/query.js';
import UI from '#shared/ui.js';
import world from '#server/core/world.js';
import ItemFactory from '#server/core/items/factory.js';

export default class Inventory {
  constructor(slots, socketId) {
    this.slots = slots;
    this.socketId = socketId;
    this.playerIndex = world.players.findIndex(p => p.socket_id === this.socketId);
  }

  /**
   * Adds item to player's inventory
   *
   * @param {string} itemId - The ID of the item
   * @param {integer} qty - The number of quantity for that item
   */
  async add(itemId, qty = 1, options = {}) {
    const baseItem = Query.getItemData(itemId) || { id: itemId };
    const stackable = !!baseItem.stackable;
    const rounds = stackable ? 1 : qty; // How many times to iterate on inventory?
    const { existingItem = null, uuid: incomingUuid = null } = options;
    const player = world.players[this.playerIndex];
    const playerUuid = player ? player.uuid : null;

    const result = {
      success: false,
      added: [],
      requestedQuantity: qty,
      remaining: qty,
      reason: null,
    };

    for (let index = 0; index < rounds; index += 1) {
      const openSlot = UI.getOpenSlot(this.slots);
      if (openSlot === false && openSlot !== 0) {
        result.reason = result.reason || 'inventory_full';
        break;
      }

      let instance = null;

      if (existingItem) {
        instance = ItemFactory.adoptExisting(existingItem, {
          uuid: incomingUuid,
          quantity: stackable ? qty : existingItem.qty || 1,
          bindTo: playerUuid,
          baseItem,
        });
      } else {
        instance = ItemFactory.createById(itemId, {
          uuid: incomingUuid,
          quantity: stackable ? qty : 1,
          bindTo: playerUuid,
        });
      }

      if (!instance) {
        result.reason = result.reason || 'item_creation_failed';
        continue;
      }

      instance.slot = openSlot;
      instance.context = 'item';

      if (stackable) {
        instance.qty = qty;
        result.remaining = 0;
      } else {
        result.remaining = Math.max(0, result.remaining - 1);
      }

      this.slots.push(instance);
      result.added.push(instance);
    }

    if (!result.added.length && !result.reason) {
      result.reason = 'no_items_added';
    }

    result.success = result.remaining === 0 && result.added.length > 0;
    return result;
  }
}
