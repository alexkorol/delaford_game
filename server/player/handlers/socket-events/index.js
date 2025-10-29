/**
 * Events from socket.
 * for example: (login, logout, queue. etc.)
 */
import { createRequire } from 'node:module';
import Authentication from '#server/player/authentication.js';
import Player from '#server/core/player.js';
import Socket from '#server/socket.js';
import config from '#server/config.js';
import world from '#server/core/world.js';

const require = createRequire(import.meta.url);
const playerGuest = require('#server/core/data/helpers/player.json');

export default {
  /**
   * A player logins into the game
   */
  'player:login': async (data, ws) => {
    try {
      if (!data.data.useGuestAccount) {
        const { player, token } = await Authentication.login(data);
        Authentication.addPlayer(new Player(player, token, ws.id));
      } else {
        Authentication.addPlayer(new Player(playerGuest, 'none', ws.id));
      }
    } catch (error) {
      console.log(error);
      console.log(`${data.data.username} logged in with a bad password.`);

      Socket.emit('player:login-error', {
        data: JSON.stringify(error),
        player: { socket_id: ws.id },
      });
    }
  },

  /**
   * A player logs out of the game
   */
  'player:logout': async (data, ws, context) => {
    context.constructor.close(ws, true);
  },

  /**
   * A player sends a chat message to everyone
   */
  'player:say': ({ data }) => {
    const { id, said } = data;
    const { viewport } = config.map;

    const speaker = world.players.find(p => p.socket_id === id);
    if (!speaker) {
      return;
    }

    const { username, x, y } = speaker;
    
    // Put a limit on the length of a player message to 50 characters.
    const text = said.length > 50 ? said.substring(0, 50) : said;

    // Get viewport values based on player and viewport x, y
    const viewportValues = {
      minX: x - Math.floor(0.5 * viewport.x),
      minY: y - Math.floor(0.5 * viewport.y),
      maxX: x + Math.floor(0.5 * viewport.x),
      maxY: y + Math.floor(0.5 * viewport.y),
    };

    // Get nearby Players
    const scenePlayers = world.getScenePlayers(speaker.sceneId);
    const nearbyPlayers = scenePlayers.filter((p) => {
      const playerInX = p.x >= viewportValues.minX && p.x <= viewportValues.maxX;
      const playerInY = p.y >= viewportValues.minY && p.y <= viewportValues.maxY;
      return playerInX && playerInY;
    });

    Socket.broadcast('player:say', {
      username,
      type: 'chat',
      text,
    }, nearbyPlayers);
  },

  /**
   * A player moves to a new tile via keyboard
   */
  'player:move': (data) => {
    const playerIndex = world.players.findIndex(player => player.uuid === data.data.id);
    const player = world.players[playerIndex];
    const startedAt = Date.now();
    player.move(data.data.direction, { startedAt, direction: data.data.direction });

    Player.broadcastMovement(player);
  },

  'player:skill:trigger': (data) => {
    const payload = data.data || {};
    const playerIndex = world.players.findIndex(player => player.uuid === payload.id);
    if (playerIndex === -1) {
      return;
    }

    const player = world.players[playerIndex];
    const triggered = player.recordSkillInput(payload.skillId, {
      direction: payload.direction,
      modifiers: payload.modifiers,
      animationState: payload.animationState,
      duration: payload.duration,
      holdState: payload.holdState,
    });

    if (!triggered) {
      return;
    }

    Player.broadcastAnimation(player);
    Socket.broadcast('player:combat:update', {
      playerId: player.uuid,
      combat: player.combat,
      animation: player.animation,
    });
  },

  /**
   * Queue up an player action to executed they reach their destination
   */
  'player:queueAction': (data) => {
    const playerIndex = world.players.findIndex(p => p.socket_id === data.player.socket_id);

    world.players[playerIndex].queue.push(data);
    world.players[playerIndex].action = data.actionToQueue;
  },

  'player:pane:close': (data) => {
    const playerIndex = world.players.findIndex(p => p.uuid === data.data.id);

    world.players[playerIndex].currentPane = false;
  },
};
