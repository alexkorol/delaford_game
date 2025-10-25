import world from '@server/core/world';
import { wearableItems } from '../data/items';

class Wear {
  /**
   * Get the attack value from this item
   *
   * @param {object} item The item being assessed
   * @returns {integer}
   */
  static getAttack(item) {
    if (item && item.stats && item.stats.attack) {
      return item.stats.attack;
    }

    const fullItem = wearableItems.find(i => i.id === item.id);
    return fullItem && fullItem.stats ? fullItem.stats.attack : {
      stab: 0,
      slash: 0,
      crush: 0,
      range: 0,
    };
  }

  /**
   * Get the defense value from this item
   *
   * @param {object} item The item being assessed
   * @returns {integer}
   */
  static getDefense(item) {
    if (item && item.stats && item.stats.defense) {
      return item.stats.defense;
    }

    const fullItem = wearableItems.find(i => i.id === item.id);
    return fullItem && fullItem.stats ? fullItem.stats.defense : {
      stab: 0,
      slash: 0,
      crush: 0,
      range: 0,
    };
  }

  /**
   * Update a player's combat attack and defense
   */
  static updateCombat(playerIndex) {
    const stats = {
      attack: {
        stab: 0,
        slash: 0,
        crush: 0,
        range: 0,
      },
      defense: {
        stab: 0,
        slash: 0,
        crush: 0,
        range: 0,
      },
    };

    // Go through each wear item and add up its value
    Object.keys(world.players[playerIndex].wear).forEach((key) => {
      const val = world.players[playerIndex].wear[key];
      if (val !== null && val.uuid && val.id) {
        const attack = this.getAttack(val);
        const defense = this.getDefense(val);

        stats.attack.stab += attack.stab || 0;
        stats.attack.slash += attack.slash || 0;
        stats.attack.crush += attack.crush || 0;
        stats.attack.range += attack.range || 0;

        stats.defense.stab += defense.stab || 0;
        stats.defense.slash += defense.slash || 0;
        stats.defense.crush += defense.crush || 0;
        stats.defense.range += defense.range || 0;
      }
    });

    return stats;
  }
}

module.exports = Wear;
