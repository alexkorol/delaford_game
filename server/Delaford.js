import { general, wearableItems, smithing } from '#server/core/data/items/index.js';

import Authentication from '#server/player/authentication.js';
import Handler from '#server/player/handler.js';
import Item from '#server/core/item.js';
import Map from '#server/core/map.js';
import NPC from '#server/core/npc.js';
import Monster from '#server/core/monster.js';
import Socket from '#server/socket.js';
import * as emoji from 'node-emoji';
import { v4 as uuid } from 'uuid';
import world from '#server/core/world.js';
import { partyService } from '#server/player/handlers/party.js';

class Delaford {
  constructor(server) {
    // Port setting
    world.socket = new Socket(server);

    // Start the game server
    console.log(`${emoji.get('rocket')}  Starting game server...`);

    // Load the map and spawn the default entities
    this.constructor.loadMap();
    this.loadEntities();
  }

  /**
   * Load the new map after the game starts
   */
  static loadMap() {
    console.log(`${emoji.get('european_castle')}  Creating a new map...`);
    world.map = new Map('surface');
  }

  /**
   * Load default entities before the start of game world
   */
  loadEntities() {
    NPC.load(this);
    Monster.load(this);
  }

  /**
   * Create the new server with the port
   */
  start() {
    setInterval(() => {
      NPC.movement();
    }, 2000);

    setInterval(() => {
      Monster.tick();
    }, 600);

    setInterval(() => {
      Item.check();
      Item.resourcesCheck();
    }, 1000);

    // Bind the websocket connection to the `this` context
    world.socket.ws.on('connection', this.connection.bind(this));
  }

  /**
   * Log the user out and save the player profile
   *
   * @param {WebSocket} ws The socket connection of the player
   * @param {boolean} logout Whether the connection was via player or interruption
   */
  static async close(ws, logout = false) {
    const player = world.removePlayerBySocket(ws.id);

    if (player) {
      // Logout the player out and save the profile
      try {
        await player.update();
        await Authentication.logout(player.token);

        console.log(`${emoji.get('red_circle')}  Player ${player.username} left the game`);

        // If the user did not logout,
        // then we remove them from list
        if (!logout) {
          world.clients = world.clients.filter(c => c.id !== ws.id);
        }

        // Remove from any parties the player was in
        partyService.removePlayer(player.uuid);

        // Tell the clients someone left
        const scenePlayers = world.getScenePlayers(player.sceneId);
        Socket.broadcast('player:left', ws.id, scenePlayers);
      } catch (err) {
        console.log(err);
      }
    }
  }

  /**
   * Connect all incoming websocket calls to their approrpriate methods
   *
   * @param {WebSocket} ws The websocket connection
   */
  connection(ws) {
    // Assign UUID to every connection
    ws.id = uuid();

    // Add player to server's player list
    console.log(`${emoji.get('computer')}  A client (${ws.id.substring(0, 5)}...) connected.`);
    world.clients.push(ws);

    // Only return needed values for client
    const allItems = [...wearableItems, ...general, ...smithing].map((i) => {
      const item = {
        name: i.name,
        id: i.id,
        graphics: i.graphics,
      };

      return item;
    });

    // Send player server items
    Socket.emit('server:send:items', {
      player: { socket_id: ws.id },
      items: allItems,
    });

    ws.on('message', async (msg) => {
      const data = JSON.parse(msg);

      // Client-sent events from WebSocket
      // are processed through this method
      Handler[data.event](data, ws, this);
    });

    ws.on('error', e => console.log(e, `${ws.id} has left`));
    ws.on('close', () => this.constructor.close(ws));
  }
}

export default Delaford;
