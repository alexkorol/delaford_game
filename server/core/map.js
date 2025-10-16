import { armor, jewelry, weapons } from '@server/core/data/respawn';

import MapUtils from 'shared/map-utils';
import PF from 'pathfinding';
import config from '@server/config';
import surfaceMap from '@server/maps/layers/surface.json';
import { v4 as uuid } from 'uuid';
import { Shop } from './functions';
import world from './world';

class Map {
  constructor(level) {
    // Getters & Setters
    this.players = [];
    this.level = level;

    this.background = world.map.background;
    this.foreground = world.map.foreground;

    this.setUp();
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
      items: itemsOnMap.map((i) => {
        i.pickedUp = false;
        return i;
      }),
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
    return items.map((i) => {
      i.uuid = uuid();
      i.respawn = true;
      return i;
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

    return new Promise((resolve) => {
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
            const tiles = {
              background: world.map.background[onTile] - 1,
              foreground: (world.map.foreground[onTile] - 1) - 252,
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

module.exports = Map;
