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
import { performance } from 'node:perf_hooks';
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

    this.loopHandle = null;
    this.loopLastTick = 0;
    this.loopInterval = Number(process.env.GAME_LOOP_INTERVAL_MS) || 100;
    this.schedulerLogInterval = Number(process.env.GAME_LOOP_LOG_INTERVAL_MS) || 10000;
    this.schedulerStats = { tickCount: 0, totalDelta: 0, maxDelta: 0, lastLog: performance.now() };
    this.periodicTasks = [];
    this.handleConnection = this.connection.bind(this);
    this.loopActive = false;
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
    this.registerPeriodicTasks();
    this.startGameLoop();

    // Bind the websocket connection to the `this` context
    if (world.socket?.ws) {
      if (typeof world.socket.ws.on === 'function') {
        world.socket.ws.on('connection', this.handleConnection);
      }
    }
  }

  stopGameLoop() {
    this.loopActive = false;

    if (this.loopHandle) {
      clearTimeout(this.loopHandle);
      this.loopHandle = null;
    }
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

  registerPeriodicTasks() {
    if (this.periodicTasks.length > 0) {
      return;
    }

    this.addPeriodicTask('npc:movement', 2000, () => NPC.movement());
    this.addPeriodicTask('monster:tick', 600, () => Monster.tick());
    this.addPeriodicTask('items:tick', 1000, () => {
      Item.check();
      Item.resourcesCheck();
    });
    this.addPeriodicTask('party:instances', 1500, () => partyService.evaluateInstances());
  }

  addPeriodicTask(name, interval, handler) {
    this.periodicTasks.push({
      name,
      interval,
      handler,
      accumulator: 0,
    });
  }

  startGameLoop() {
    if (this.loopHandle) {
      return;
    }

    this.loopActive = true;
    this.loopLastTick = performance.now();

    const tick = () => {
      const now = performance.now();
      const delta = now - this.loopLastTick;
      this.loopLastTick = now;

      this.updatePeriodicTasks(delta);
      this.tickSceneWorlds(delta);
      this.logSchedulerStats(delta, now);

      if (!this.loopActive) {
        return;
      }

      this.loopHandle = setTimeout(tick, this.loopInterval);
    };

    this.loopHandle = setTimeout(tick, this.loopInterval);
  }

  tickSceneWorlds(delta) {
    const now = Date.now();
    world.forEachScene((scene) => {
      const sceneWorld = world.getSceneWorld(scene.id);
      if (!sceneWorld || typeof sceneWorld.update !== 'function') {
        return;
      }
      sceneWorld.update(delta, { now, scene });
    });
  }

  updatePeriodicTasks(delta) {
    this.periodicTasks.forEach((task) => {
      task.accumulator += delta;

      if (task.accumulator < task.interval) {
        return;
      }

      const executions = Math.floor(task.accumulator / task.interval);
      task.accumulator -= executions * task.interval;

      for (let i = 0; i < executions; i += 1) {
        try {
          const result = task.handler(delta);

          if (result && typeof result.then === 'function') {
            result.catch((err) => console.error(`[Scheduler] Task ${task.name} rejected`, err));
          }
        } catch (err) {
          console.error(`[Scheduler] Task ${task.name} failed`, err);
        }
      }
    });
  }

  logSchedulerStats(delta, now) {
    this.schedulerStats.tickCount += 1;
    this.schedulerStats.totalDelta += delta;
    this.schedulerStats.maxDelta = Math.max(this.schedulerStats.maxDelta, delta);

    if ((now - this.schedulerStats.lastLog) < this.schedulerLogInterval) {
      return;
    }

    const averageDelta = this.schedulerStats.totalDelta / this.schedulerStats.tickCount;
    const cadence = 1000 / Math.max(averageDelta, 0.0001);

    console.log(
      `${emoji.get('alarm_clock')}  Scheduler cadence: avg ${averageDelta.toFixed(2)}ms/tick (${cadence.toFixed(2)} Hz), `
      + `max ${this.schedulerStats.maxDelta.toFixed(2)}ms over ${this.schedulerStats.tickCount} ticks.`,
    );

    this.schedulerStats.tickCount = 0;
    this.schedulerStats.totalDelta = 0;
    this.schedulerStats.maxDelta = 0;
    this.schedulerStats.lastLog = now;
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

  shutdown() {
    this.stopGameLoop();
    this.periodicTasks = [];

    if (world.socket?.ws) {
      const listener = this.handleConnection;
      if (listener) {
        if (typeof world.socket.ws.off === 'function') {
          world.socket.ws.off('connection', listener);
        } else if (typeof world.socket.ws.removeListener === 'function') {
          world.socket.ws.removeListener('connection', listener);
        }
      }
    }

    if (world.socket && typeof world.socket.close === 'function') {
      world.socket.close();
    }

    this.handleConnection = null;
  }
}

export default Delaford;
