// Player event handler

import bus from '../../utilities/bus';
import MovementController from '../../utilities/movement-controller';
import { now } from '../../config/movement';

export default {
  /**
   * A player logins into the game
   */
  'player:login': async (data, context) => {
    context.startGame(data.data);
  },

  /**
   * A player logins into the game
   */
  'player:login-error': (data) => {
    bus.$emit('player:login-error', data.data);
  },

  /**
   * When a player moves.
   */
  'player:movement': (message, context) => {
    const eventData = message.data || {};
    const meta = message.meta || {};

    if (eventData.inventory && eventData.inventory.slots) {
      eventData.inventory = eventData.inventory.slots;
    }

    if (!eventData.movementStep && meta.movementStep) {
      eventData.movementStep = meta.movementStep;
    }

    context.playerMovement(eventData, meta);
  },
  /**
   * A player saying something
   */
  'player:say': (data) => {
    bus.$emit('player:say', data.data);
  },

  /**
   * A player recieves new players
   */
  'player:joined': (data, context) => {
    setTimeout(() => {
      if (context.game.player) {
        const existingPlayers = new Map(
          (context.game.map.players || []).map((player) => [player.uuid, player]),
        );

        const meta = data.meta || {};
        let movementEntries = [];
        if (Array.isArray(meta.players)) {
          movementEntries = meta.players;
        } else if (Array.isArray(meta.movements)) {
          movementEntries = meta.movements;
        }

        const movementLookup = new Map(
          movementEntries
            .map((entry) => {
              const key = entry && (entry.uuid || entry.id);
              if (!key) {
                return null;
              }
              return [key, entry.movementStep || null];
            })
            .filter((entry) => entry !== null),
        );

        context.game.map.players = data.data
          .filter((p) => p.socket_id !== context.game.player.socket_id)
          .map((player) => {
            const existing = existingPlayers.get(player.uuid);
            const controller = existing && existing.movement
              ? existing.movement
              : new MovementController().initialise(player.x, player.y);
            const step = player.movementStep
              || movementLookup.get(player.uuid)
              || null;

            if (step) {
              controller.applyServerStep(player.x, player.y, step, {
                sentAt: meta.sentAt || null,
                receivedAt: now(),
              });
            } else {
              controller.hardSync(player.x, player.y);
            }

            return {
              ...player,
              movement: controller,
            };
          });
      }
    }, 1000);
  },

  /**
   * A player leaves the game
   */
  'player:left': (data, context) => {
    const playerIndex = context.game.map.players.findIndex((p) => data.data === p.socket_id);
    context.game.map.players.splice(playerIndex, 1);
  },

  /**
   * A player equips an item
   */
  'player:equippedAnItem': (data, context) => {
    if (data.data.uuid === context.game.player.uuid) {
      context.game.player.inventory = data.data.inventory.slots;
      context.game.player.wear = data.data.wear;
      context.game.player.combat = data.data.combat;
    }
  },

  /**
   * The player stopped moving
   */
  'player:stopped': () => {
    bus.$emit('canvas:getMouse');
  },

  /**
   * A player unequips an item
   */
  'player:unequippedAnItem': (data, context) => {
    if (data.data.uuid === context.game.player.uuid) {
      context.game.player.inventory = data.data.inventory.slots;
      context.game.player.wear = data.data.wear;
      context.game.player.combat = data.data.combat;
    }
  },
};
