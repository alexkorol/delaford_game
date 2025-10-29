import { armor, jewelry, weapons } from '#server/core/data/respawn/index.js';

import MapUtils from '#shared/map-utils.js';
import PF from 'pathfinding';
import config from '#server/config.js';
import { createRequire } from 'node:module';
import ItemFactory from './items/factory.js';
import { Shop } from './functions/index.js';
import world from './world.js';

const require = createRequire(import.meta.url);
const surfaceMap = require('#server/maps/layers/surface.json');

const DEFAULT_INSTANCE_ROOM_COUNT = 6;
const DEFAULT_CORRIDOR_WIDTH = 3;

class Map {
  constructor(level) {
    // Getters & Setters
    this.players = [];
    this.level = level;

    this.background = world.map.background;
    this.foreground = world.map.foreground;

    this.setUp();
  }

  static createSeededGenerator(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  static normaliseSeed(seed) {
    if (Number.isFinite(seed)) {
      return Math.abs(Math.floor(seed)) || Date.now();
    }

    if (typeof seed === 'string') {
      let hash = 0;
      for (let i = 0; i < seed.length; i += 1) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash) || Date.now();
    }

    return Date.now();
  }

  static carveRoom(background, foreground, width, height, x, y, tileId) {
    for (let row = y; row < y + height; row += 1) {
      for (let col = x; col < x + width; col += 1) {
        const index = (row * surfaceMap.width) + col;
        background[index] = tileId;
        foreground[index] = 0;
      }
    }
  }

  static carveCorridor(background, foreground, from, to, corridorWidth, tileId) {
    const minX = Math.min(from.x, to.x);
    const maxX = Math.max(from.x, to.x);
    const minY = Math.min(from.y, to.y);
    const maxY = Math.max(from.y, to.y);

    const carveColumn = (xCoord) => {
      for (let row = minY; row <= maxY; row += 1) {
        for (let offset = -Math.floor(corridorWidth / 2); offset <= Math.floor(corridorWidth / 2); offset += 1) {
          const col = xCoord + offset;
          if (col < 0 || col >= surfaceMap.width || row < 0 || row >= surfaceMap.height) {
            continue;
          }

          const index = (row * surfaceMap.width) + col;
          background[index] = tileId;
          foreground[index] = 0;
        }
      }
    };

    const carveRow = (yCoord) => {
      for (let col = minX; col <= maxX; col += 1) {
        for (let offset = -Math.floor(corridorWidth / 2); offset <= Math.floor(corridorWidth / 2); offset += 1) {
          const row = yCoord + offset;
          if (col < 0 || col >= surfaceMap.width || row < 0 || row >= surfaceMap.height) {
            continue;
          }

          const index = (row * surfaceMap.width) + col;
          background[index] = tileId;
          foreground[index] = 0;
        }
      }
    };

    carveRow(from.y);
    carveColumn(to.x);
  }

  static async generateInstance(options = {}) {
    const template = options.template || 'dungeon';
    const seed = Map.normaliseSeed(options.seed);
    const layers = await Map.fetchMap('surface');
    const background = [...layers[0].data];
    const foreground = [...layers[1].data];

    const width = surfaceMap.width || config.map.size.x;
    const height = surfaceMap.height || config.map.size.y;
    const centerIndex = (Math.floor(height / 2) * width) + Math.floor(width / 2);
    const baseTile = background[centerIndex] || 1;
    const rng = Map.createSeededGenerator(seed);

    const rooms = Math.max(1, options.rooms || DEFAULT_INSTANCE_ROOM_COUNT);
    const carvedRooms = [];

    for (let index = 0; index < rooms; index += 1) {
      const roomWidth = Math.max(6, Math.floor(rng() * 12) + 6);
      const roomHeight = Math.max(6, Math.floor(rng() * 12) + 6);
      const marginX = Math.max(2, Math.floor(width * 0.05));
      const marginY = Math.max(2, Math.floor(height * 0.05));
      const originX = Math.min(
        width - roomWidth - 1,
        Math.max(marginX, Math.floor(rng() * (width - roomWidth - marginX))),
      );
      const originY = Math.min(
        height - roomHeight - 1,
        Math.max(marginY, Math.floor(rng() * (height - roomHeight - marginY))),
      );

      Map.carveRoom(background, foreground, roomWidth, roomHeight, originX, originY, baseTile);

      const center = {
        x: Math.floor(originX + (roomWidth / 2)),
        y: Math.floor(originY + (roomHeight / 2)),
      };
      carvedRooms.push(center);
    }

    if (carvedRooms.length > 1) {
      const corridorWidth = Math.max(2, options.corridorWidth || DEFAULT_CORRIDOR_WIDTH);
      const anchor = carvedRooms[0];
      carvedRooms.slice(1).forEach((roomCenter) => {
        Map.carveCorridor(background, foreground, anchor, roomCenter, corridorWidth, baseTile);
      });
    }

    return {
      map: {
        background,
        foreground,
      },
      metadata: {
        seed,
        template,
        spawnPoints: carvedRooms,
      },
      respawns: {
        items: [],
        monsters: [],
        resources: [],
      },
      items: [],
      npcs: [],
      monsters: [],
    };
  }

  /**
   * Load map tile data
   *
   * @returns {array}
   */
  static async load() {
    const data = await Map.fetchMap('surface');

    return data;
  }

  /**
   * Resolve a promise to find the path
   *
   * @param {integer} x The x-axis coord on where user clicked on game-gap
   * @param {integer} y The y-axis coord on where user clicked on game-gap
   */
  static findQuickestPath(x, y, playerIndex) {
    const player = world.players[playerIndex];
    return new Promise((resolve) => {
      if (!player || !player.path || !player.path.grid) {
        resolve([]);
        return;
      }

      const defaultCenter = {
        x: Math.floor(config.map.viewport.x / 2),
        y: Math.floor(config.map.viewport.y / 2),
      };
      const center = player.path.center || defaultCenter;
      const grid = typeof player.path.grid.clone === 'function'
        ? player.path.grid.clone()
        : player.path.grid;

      /**
       * Get location of all 4 spots, check tile if blocked
       * Get direction based off player and where to check first
       */

      const path = player.path.finder.findPath(center.x, center.y, x, y, grid);
      resolve(path);
    });
  }

  /**
   * Find a path and set that path in motion
   *
   * @param {string} uuidPath The unique user-id indentifying who is moving
   * @param {integer} x The x-axis coord on where user clicked on game-gap
   * @param {integer} y The y-axis coord on where user clicked on game-gap
   */
  static async findPath(uuidPath, x, y, location) {
    const playerIndex = world.players.findIndex(p => p.uuid === uuidPath);

    if (world.players[playerIndex].moving) {
      world.players[playerIndex].path.current.interrupted = true;
    }

    // The player's x-y on map (always 7,5)
    // to where they clicked on the map
    const path = await Map.findQuickestPath(x, y, playerIndex);

    // Since we are performing an action on a resource or tile,
    // let's end the path one step so we don't step on it.
    // (For example, mining block, tree, door, etc.)
    if (location === 'edge') {
      path.pop();
    }

    // If the tile we clicked on
    // can be walked on, continue ->
    if (world.players[playerIndex].path.current.walkable && path.length && path.length >= 1) {
      world.players[playerIndex].path.current.path.walking = path;
      world.players[playerIndex].path.current.step = 0;
      world.players[playerIndex].path.current.interrupted = false;

      // We start moving the player along their path
      world.players[playerIndex].walkPath(playerIndex);
    }
  }

  /**
   * Set up the map
   */
  async setUp() {
    // Load the board
    const board = await Map.load();

    // Set background and foreground tile data
    this.background = board[0].data;
    this.foreground = board[1].data;

    // Set items on map
    const itemsOnMap = [
      ...armor,
      ...jewelry,
      ...weapons,
    ];

    // Spawn items on the map
    world.items = Map.readyItems(itemsOnMap);

    // Set the respawns accordingly
    world.respawns = {
      items: itemsOnMap.map((item) => ({
        ...item,
        pickedUp: false,
      })),
      monsters: [],
      resources: [],
    };

    // Load shops
    world.shops = Shop.load();

    // Add a timestamp to all dropped items
    world.items = world.items.map((i) => {
      i.timestamp = Date.now();
      return i;
    });
  }

  /**
   * Add a UUID and mark items as respawns to all respawned items
   *
   * @param {array} items List of respawned items
   * @returns {array}
   */
  static readyItems(items) {
    return items.map((definition) => {
      const location = { x: definition.x, y: definition.y };
      const baseItem = ItemFactory.createById(definition.id);

      if (!baseItem) {
        return ItemFactory.toWorldInstance({ id: definition.id }, location, {
          respawn: true,
        });
      }

      const worldItem = ItemFactory.toWorldInstance(baseItem, location, {
        respawn: true,
      });

      worldItem.respawnIn = definition.respawnIn;
      return worldItem;
    });
  }

  /**
   * Loads the map from an external JSON file
   *
   * @param {string} level The level of the map
   * @returns {array}
   */
  static fetchMap(level) {
    const mapToLoad = {
      surface: surfaceMap,
    };

    return new Promise((resolve, reject) => {
      if (!mapToLoad[level]) {
        reject(new Error(`Unknown map level: ${level}`));
        return;
      }

      resolve(mapToLoad[level].layers);
    });
  }

  /**
   * Get the blocked/non-blocked tile-matrix of their viewport
   *
   * @param {object} player The player asking
   */
  static getMatrix(player, options = {}) {
    const { x, y } = player;
    const { size } = config.map;
    const defaultViewport = player.path && player.path.viewport
      ? player.path.viewport
      : config.map.viewport;

    return new Promise((resolve) => {
      const requestedViewport = options.viewport || defaultViewport;
      const viewport = {
        x: Math.max(
          0,
          Math.min(
            typeof requestedViewport.x === 'number' ? requestedViewport.x : defaultViewport.x,
            size.x - 1,
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            typeof requestedViewport.y === 'number' ? requestedViewport.y : defaultViewport.y,
            size.y - 1,
          ),
        ),
      };

      const requestedCenter = options.center || null;
      const center = {
        x: requestedCenter && typeof requestedCenter.x === 'number'
          ? requestedCenter.x
          : Math.floor(viewport.x / 2),
        y: requestedCenter && typeof requestedCenter.y === 'number'
          ? requestedCenter.y
          : Math.floor(viewport.y / 2),
      };

      const tileCrop = {
        x: x - center.x,
        y: y - center.y,
      };

      const matrix = [];

      // Drawing the map row by column.
      for (let column = 0; column <= viewport.y; column += 1) {
        const grid = [];
        for (let row = 0; row <= viewport.x; row += 1) {
          const worldColumn = column + tileCrop.y;
          const worldRow = row + tileCrop.x;

          if (
            worldColumn < 0
            || worldRow < 0
            || worldColumn >= size.y
            || worldRow >= size.x
          ) {
            grid.push(1);
          } else {
            const onTile = (worldColumn * size.x) + worldRow;
            const scene = world.getSceneForPlayer(player);
            const activeMap = scene && scene.map ? scene.map : world.map;
            const tiles = {
              background: activeMap.background[onTile] - 1,
              foreground: (activeMap.foreground[onTile] - 1) - 252,
            };

            // Push the block/non-blocked tile to the
            // grid so that the pathfinder can use it
            // 0 - walkable; 1 - blocked
            grid.push(MapUtils.gridWalkable(
              tiles,
              player,
              onTile,
              row,
              column,
              activeMap,
            ));
          }
        }

        // Push blocked/non-blocked array for pathfinding
        matrix.push(grid);
      }

      // The new walkable/non-walkable grid
      resolve({
        grid: new PF.Grid(matrix),
        viewport,
        center,
      });
    });
  }
}

export default Map;
