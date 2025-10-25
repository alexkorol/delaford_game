import Query from '@server/core/data/query';
import UI from 'shared/ui';
import world from '@server/core/world';
import ItemFactory from '@server/core/items/factory';

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
  add(itemId, qty = 1, options = {}) {
    // TODO
    // Drop items on floor if no space (functionality in shop)
    return new Promise((resolve) => {
      const baseItem = Query.getItemData(itemId) || { id: itemId };
      const stackable = !!baseItem.stackable;
      const rounds = stackable ? 1 : qty; // How many times to iterate on inventory?
      const { existingItem = null, uuid: incomingUuid = null } = options;
      const player = world.players[this.playerIndex];
      const playerUuid = player ? player.uuid : null;

      for (let index = 0; index < rounds; index += 1) {
        const openSlot = UI.getOpenSlot(this.slots);
        if (openSlot === false && openSlot !== 0) {
          continue;
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
          continue;
        }

        instance.slot = openSlot;
        instance.context = 'item';

        if (stackable) {
          instance.qty = qty;
        }

        this.slots.push(instance);
      }

      resolve(200);
    });
  }
}
