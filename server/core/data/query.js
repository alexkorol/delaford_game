import { general, wearableItems, smithing } from '#server/core/data/items/index.js';

import { foregroundObjects } from '#server/core/data/foreground/index.js';

class Query {
  /**
   * Obtains the full information of a foreground object by its ID
   *
   * @param {integer} id The ID of the foreground item
   * @returns {object}
   */
  static getForegroundData(id) {
    const item = foregroundObjects.find(t => t.id === id);
    if (!item) return undefined;
    return { ...item, context: 'action' };
  }

  /**
   * Obtain the full information of an item by its ID on the server-side
   *
   * @param {integer} id The ID of the item
   * @returns {object}
   */
  static getItemData(id) {
    const allItems = [...wearableItems, ...general, ...smithing];
    return allItems
      .map((t) => {
        const clone = JSON.parse(JSON.stringify(t));
        clone.context = 'item';
        return clone;
      })
      .find(item => item.id === id);
  }
}

export default Query;
