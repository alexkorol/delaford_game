import Socket from '#server/socket.js';
import UI from '#shared/ui.js';
import world from '#server/core/world.js';
import ItemFactory from '#server/core/items/factory.js';

export default class Skill {
  constructor(playerIndex) {
    this.playerIndex = playerIndex;
  }

  /**
   * Update a player's experience in a certain skill
   *
   * @param {integer} expToAdd The experience to add to current skill experience
   */
  updateExperience(expToAdd) {
    const currentExperience = world.players[this.playerIndex].skills[this.columnId].exp;
    const updatedExperience = currentExperience + expToAdd;
    const didUserLevelUp = Skill.didUserLevelUp(currentExperience, updatedExperience);

    if (didUserLevelUp) {
      world.players[this.playerIndex].skills[this.columnId].level += 1;
      Socket.sendMessageToPlayer(this.playerIndex, `You have gained a ${UI.capitalizeFirstLetter(this.columnId)} level!`);
    }

    world.players[this.playerIndex].skills[this.columnId].exp = updatedExperience;
  }

  /**
   * Calculate whether a player has leveled up between experience gains
   *
   * @param {integer} currentExp The current experience points
   * @param {integer} updatedExp The updated experience points after action
   * @return {boolean}
   */
  static didUserLevelUp(currentExp, updatedExp) {
    const a = UI.getLevel(currentExp);
    const b = UI.getLevel(updatedExp);
    return a !== b;
  }

  /**
   * Tell the user to add resource to their inventory
   * or drop on ground based on inventory availability
   *
   * @param {object} getItem The resource we are gathering
   */
  async extractResource(getItem) {
    const player = world.players[this.playerIndex];
    if (!player || !player.inventory) {
      return;
    }

    const addition = await player.inventory.add(getItem.resources, 1);

    if (addition.success) {
      Socket.emit('core:refresh:inventory', {
        player: { socket_id: player.socket_id },
        data: player.inventory.slots,
      });
      return;
    }

    const baseItem = ItemFactory.createById(getItem.id);
    if (baseItem) {
      const dropped = ItemFactory.toWorldInstance(
        baseItem,
        {
          x: Number.isFinite(player.x) ? player.x : 0,
          y: Number.isFinite(player.y) ? player.y : 0,
        },
        { timestamp: Date.now() },
      );

      world.addItem(dropped);
      Socket.broadcast('world:itemDropped', world.items);
    }

    Socket.sendMessageToPlayer(
      this.playerIndex,
      'Your inventory is full. The resource drops to the ground.',
    );
  }
}
