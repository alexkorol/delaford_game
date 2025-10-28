import Inventory from '#server/core/utilities/common/player/inventory.js';
import { wearableItems } from '#server/core/data/items/index.js';
import { v4 as uuid } from 'uuid';

export const constructWear = (data) => {
  const wearData = { ...data };
  delete wearData.arrows;

  Object.keys(wearData).forEach((property) => {
    if (!Object.prototype.hasOwnProperty.call(wearData, property)) {
      return;
    }

    if (wearData[property] !== null) {
      const id = wearData[property];
      const { name, graphics } = wearableItems.find(db => db.id === id);
      wearData[property] = {
        uuid: uuid(),
        graphics,
        name,
        id,
      };
    }
  });

  return wearData;
};

const createPlayerInventoryManager = (player) => ({
  initializeInventory: (inventoryData, socketId) => new Inventory(inventoryData, socketId),
});

export default createPlayerInventoryManager;
