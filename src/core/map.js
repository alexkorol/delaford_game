import PF from 'pathfinding';
import UI from 'shared/ui';
import config from 'root/config';
import blockedMouse from '@/assets/graphics/ui/mouse/blocked.png';
import moveToMouse from '@/assets/graphics/ui/mouse/moveTo.png';
import bus from './utilities/bus';
import MovementController, { centerOfTile } from './utilities/movement-controller';
import SpriteAnimator from './utilities/sprite-animator';
import { PLAYER_SPRITE_CONFIG } from './config/animation';
import { now } from './config/movement';

const INITIAL_VIEWPORT = {
  x: config.map.viewport.x,
  y: config.map.viewport.y,
};
const INITIAL_CENTER = {
  x: Math.floor(INITIAL_VIEWPORT.x / 2),
  y: Math.floor(INITIAL_VIEWPORT.y / 2),
};

class Map {
  constructor(data, images) {
    this.foreground = data.map.foreground;
    this.background = data.map.background;

    this.images = [];
    this.npcs = [];
    this.config = config;
    this.defaultViewport = { ...INITIAL_VIEWPORT };
    this.defaultCenter = { ...INITIAL_CENTER };
    this.minViewport = { x: 5, y: 4 };

    this.droppedItems = [];
    this.players = [];
    this.player = null;

    this.path = {
      grid: null, // a 0/1 grid of blocked tiles
      finder: new PF.DijkstraFinder({
        diagonalMovement: PF.DiagonalMovement.IfAtMostOneObstacle,
      }),
      current: {
        name: '',
        length: 0, // Number of steps in current path
        path: {
          walking: [], // Current path walking
          set: [], // Current path from last walk-loop
        },
        step: 0, // Steps player has taken to walk
        walkable: false, // Did we click on a blocked tile?
        interrupted: false, // Did we click-to-walk elsewhere while walking current loop?
      },
    };

    // Mouse type and coordinates
    this.mouse = {
      x: null,
      y: null,
      type: null,
      selection: new Image(),
    };

    // Canvas
    this.scale = 2;
    this.canvas = document.querySelector('.main-canvas');
    this.context = this.canvas.getContext('2d');
    this.bufferCanvas = document.createElement('canvas');
    this.bufferContext = this.bufferCanvas.getContext('2d');
    this.resizeRaf = null;
    this.configureCanvas = this.configureCanvas.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.delta = {
      elapsed: 0,
    };

    this.camera = {
      offsetX: 0,
      offsetY: 0,
    };

    // Setup map
    this.setImages(images);
    this.setPlayer(data.player);
    this.setNPCs(data.npcs);
    this.setDroppedItems(data.droppedItems);
  }

  ensureAnimation(actor) {
    if (!actor) {
      return null;
    }

    if (!actor.animation) {
      actor.animation = {
        state: PLAYER_SPRITE_CONFIG.defaultState || 'idle',
        direction: PLAYER_SPRITE_CONFIG.defaultDirection || 'down',
        sequence: 0,
        startedAt: now(),
        duration: 0,
        speed: 1,
        skillId: null,
        holdState: null,
      };
    }

    if (!actor.animationController || !(actor.animationController instanceof SpriteAnimator)) {
      actor.animationController = new SpriteAnimator(PLAYER_SPRITE_CONFIG);
    }

    actor.animationController.applyServerState(actor.animation);
    return actor.animationController;
  }

  getViewportMetrics() {
    const { viewport, tileset } = this.config.map;
    return {
      viewport,
      tileSize: tileset.tile.width,
      tileCrop: {
        x: this.player.x - Math.floor(0.5 * viewport.x),
        y: this.player.y - Math.floor(0.5 * viewport.y),
      },
    };
  }

  worldToScreen(position, metrics = null) {
    const viewportMetrics = metrics || this.getViewportMetrics();
    const { tileSize, tileCrop } = viewportMetrics;

    return {
      x: Math.round(position.x - (tileCrop.x * tileSize) - this.camera.offsetX),
      y: Math.round(position.y - (tileCrop.y * tileSize) - this.camera.offsetY),
    };
  }

  update(deltaSeconds) {
    this.delta.elapsed += deltaSeconds;

    const { tileset } = this.config.map;
    const tileSize = tileset.tile.width;

    if (this.player && this.player.movement) {
      const renderPosition = this.player.movement.update();
      const tileCenter = centerOfTile(this.player.x, this.player.y, tileSize);

      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
      const offsetX = clamp(renderPosition.x - tileCenter.x, -tileSize, tileSize);
      const offsetY = clamp(renderPosition.y - tileCenter.y, -tileSize, tileSize);

      this.camera.offsetX = offsetX;
      this.camera.offsetY = offsetY;

      if (this.player.animationController) {
        this.player.animationController.update(deltaSeconds);
        this.player.animation = { ...this.player.animationController.toJSON() };
      } else {
        this.ensureAnimation(this.player);
      }
    } else {
      this.camera.offsetX = 0;
      this.camera.offsetY = 0;
    }

    if (Array.isArray(this.players)) {
      this.players.forEach((player) => {
        if (player.movement) {
          player.movement.update();
        }

        if (player.animationController) {
          player.animationController.update(deltaSeconds);
          player.animation = { ...player.animationController.toJSON() };
        } else {
          this.ensureAnimation(player);
        }
      });
    }

    if (Array.isArray(this.npcs)) {
      this.npcs.forEach((npc) => {
        if (npc.movement) {
          npc.movement.update();
        }

        if (npc.animationController) {
          npc.animationController.update(deltaSeconds);
          npc.animation = { ...npc.animationController.toJSON() };
        } else {
          this.ensureAnimation(npc);
        }
      });
    }
  }

  /**
   * Set the player
   *
   * @param {object} player The player themselves
   */
  setPlayer(player, meta = {}) {
    const existing = this.player || null;
    const controller = existing && existing.movement
      ? existing.movement
      : new MovementController().initialise(player.x, player.y);

    const step = player.movementStep || null;
    if (step) {
      controller.applyServerStep(player.x, player.y, step, {
        sentAt: meta.sentAt || null,
        receivedAt: now(),
      });
    } else {
      controller.hardSync(player.x, player.y);
    }

    const animator = player.animationController
      || (existing && existing.animationController)
      || null;

    this.player = {
      ...(existing || {}),
      ...player,
      movement: controller,
      animationController: animator,
    };

    this.ensureAnimation(this.player);
  }

  /**
   * The NPCs of the map
   *
   * @param {object} npcs The world NPCS
   */
  setNPCs(npcs, meta = {}) {
    const existing = new window.Map(
      this.npcs
        .map((npc) => {
          const key = npc && (npc.uuid || npc.id);
          if (!key) {
            return null;
          }
          return [key, npc];
        })
        .filter((entry) => entry !== null),
    );

    const movementEntries = Array.isArray(meta.movements) ? meta.movements : [];
    const movementLookup = new window.Map(
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

    const animationEntries = Array.isArray(meta.animations) ? meta.animations : [];
    const animationLookup = new window.Map(
      animationEntries
        .map((entry) => {
          const key = entry && (entry.uuid || entry.id);
          if (!key) {
            return null;
          }
          return [key, entry.animation || null];
        })
        .filter((entry) => entry !== null),
    );

    this.npcs = (npcs || []).map((npc) => {
      const key = npc && (npc.uuid || npc.id);
      const previous = key ? existing.get(key) : null;
      const controller = previous && previous.movement
        ? previous.movement
        : new MovementController().initialise(npc.x, npc.y);

      const step = npc.movementStep || movementLookup.get(key) || null;
      const animation = npc.animation
        || animationLookup.get(key)
        || (previous && previous.animation)
        || null;

      if (step) {
        controller.applyServerStep(npc.x, npc.y, step, {
          sentAt: meta.sentAt || null,
          receivedAt: now(),
        });
      } else {
        controller.hardSync(npc.x, npc.y);
      }

      const animator = npc.animationController
        || (previous && previous.animationController)
        || null;

      const updated = {
        ...npc,
        movement: controller,
        animationController: animator,
        animation,
      };

      this.ensureAnimation(updated);
      return updated;
    });
  }

  /**
   * The items dropped on the map
   *
   * @param {object} items The items dropped on the map
   */
  setDroppedItems(items) {
    this.droppedItems = items;
  }

  /**
   * Set the images that was downloaded
   *
   * @param {Image} images Images of the player and terrain
   */
  setImages(images) {
    let normalized = [];
    if (Array.isArray(images)) {
      normalized = images;
    } else if (images && typeof images === 'object') {
      normalized = Object.values(images);
    }

    if (normalized.length < 8) {
      console.warn('[Map] setImages received unexpected payload; falling back to placeholders.', normalized);
    }

    const fallback = (index) => normalized[index] || new Image();

    const playerImage = fallback(0);
    const npcsImage = fallback(1);
    const objectImage = fallback(2);
    const terrainImage = fallback(3);
    const weaponsImage = fallback(4);
    const armorImage = fallback(5);
    const jewelryImage = fallback(6);
    const generalImage = fallback(7);

    // Image and data
    this.images = {
      playerImage,
      npcsImage,
      objectImage,
      terrainImage,
      weaponsImage,
      armorImage,
      jewelryImage,
      generalImage,
    };

    // Tell client images are loaded
    bus.$emit('game:images:loaded');

    // Set image and config
    this.build();
  }

  /**
   * Starts to setup board canvas
   *
   * @param {array} board The tile index of the board
   * @param {array} images The image board assets
   */
  build() {
    const terrain = this.images.terrainImage;
    const objects = this.images.objectImage;

    this.config.map.tileset.width = terrain.width;
    this.config.map.tileset.height = terrain.height;

    this.config.map.objects.width = objects.width;
    this.config.map.objects.height = objects.height;

    this.setUpCanvas();
  }

  /**
   * Sets canvas dimensions and constructs it
   */
  setUpCanvas() {
    this.configureCanvas();
    window.removeEventListener('resize', this.handleResize);
    window.addEventListener('resize', this.handleResize, { passive: true });
    this.handleResize();
  }

  /**
   * Configure the canvas paramters correctly
   */
  configureCanvas() {
    if (!this.canvas || !this.context) {
      return;
    }

    const { tileset } = this.config.map;
    const viewportConfig = this.config.map.viewport;
    const container = this.canvas ? this.canvas.parentElement : null;
    const tileWidth = tileset.tile.width;
    const tileHeight = tileset.tile.height;

    const viewportX = this.defaultViewport.x;
    const viewportY = this.defaultViewport.y;

    viewportConfig.x = viewportX;
    viewportConfig.y = viewportY;

    this.config.map.player.x = Math.floor(viewportX / 2);
    this.config.map.player.y = Math.floor(viewportY / 2);

    const nativeWidth = tileWidth * viewportX;
    const nativeHeight = tileHeight * viewportY;
    const scale = this.scale || 1;
    const displayWidth = nativeWidth * scale;
    const displayHeight = nativeHeight * scale;

    this.bufferCanvas.width = nativeWidth;
    this.bufferCanvas.height = nativeHeight;

    this.canvas.width = displayWidth;
    this.canvas.height = displayHeight;
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
    this.canvas.style.maxWidth = `${displayWidth}px`;
    this.canvas.style.maxHeight = `${displayHeight}px`;

    if (container) {
      container.style.setProperty('--map-native-width', `${nativeWidth}px`);
      container.style.setProperty('--map-native-height', `${nativeHeight}px`);
      container.style.setProperty('--map-display-width', `${displayWidth}px`);
      container.style.setProperty('--map-display-height', `${displayHeight}px`);
      container.style.setProperty('--map-aspect-ratio', `${nativeWidth} / ${nativeHeight}`);
    }

    this.context.imageSmoothingEnabled = false;
    this.bufferContext.imageSmoothingEnabled = false;
  }

  handleResize() {
    if (this.resizeRaf) {
      window.cancelAnimationFrame(this.resizeRaf);
    }

    this.resizeRaf = window.requestAnimationFrame(() => {
      this.resizeRaf = null;
      this.configureCanvas();
    });
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize);
    if (this.resizeRaf) {
      window.cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = null;
    }
    if (this.canvas) {
      this.canvas.style.width = '';
      this.canvas.style.height = '';
      this.canvas.style.maxWidth = '';
      this.canvas.style.maxHeight = '';
      const container = this.canvas.parentElement;
      if (container) {
        container.style.removeProperty('--map-native-width');
        container.style.removeProperty('--map-native-height');
        container.style.removeProperty('--map-display-width');
        container.style.removeProperty('--map-display-height');
        container.style.removeProperty('--map-aspect-ratio');
      }
    }
    this.config.map.viewport.x = this.defaultViewport.x;
    this.config.map.viewport.y = this.defaultViewport.y;
    this.config.map.player.x = this.defaultCenter.x;
    this.config.map.player.y = this.defaultCenter.y;
  }

  /**
   * Paint the map based on player's position
   */
  drawMap() {
    const ctx = this.bufferContext || this.context;
    const targetCanvas = this.bufferCanvas || this.canvas;
    if (!ctx || !targetCanvas) {
      return;
    }

    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    const {
      viewport,
      tileSize,
      tileCrop,
    } = this.getViewportMetrics();

    const { tileset, size, objects } = this.config.map;
    const { offsetX, offsetY } = this.camera;

    const divider = {
      background: tileset.width / tileSize,
      foreground: objects.width / tileSize,
    };

    for (let column = -1; column <= viewport.y + 1; column += 1) {
      for (let row = -1; row <= viewport.x + 1; row += 1) {
        const worldColumn = column + tileCrop.y;
        const worldRow = row + tileCrop.x;

        if (worldColumn >= 0 && worldColumn < size.y && worldRow >= 0 && worldRow < size.x) {
          const tileToFind = (worldColumn * size.x) + worldRow;
          const backgroundIndex = this.background[tileToFind];
          const foregroundIndex = this.foreground[tileToFind];

          if (backgroundIndex !== undefined) {
            const backgroundTile = backgroundIndex - 1;
            const foregroundTile = (foregroundIndex - 1) - 252;

            const sourceBackground = {
              x: Math.floor(backgroundTile % divider.background) * tileSize,
              y: Math.floor(backgroundTile / divider.background) * tileSize,
            };

            const sourceForeground = {
              x: Math.floor(foregroundTile % divider.foreground) * tileSize,
              y: Math.floor(foregroundTile / divider.foreground) * tileSize,
            };

            const drawX = Math.round((row * tileSize) - offsetX);
            const drawY = Math.round((column * tileSize) - offsetY);

            ctx.drawImage(
              this.images.terrainImage,
              sourceBackground.x,
              sourceBackground.y,
              tileSize,
              tileSize,
              drawX,
              drawY,
              tileSize,
              tileSize,
            );

            if (foregroundTile > -1) {
              ctx.drawImage(
                this.images.objectImage,
                sourceForeground.x,
                sourceForeground.y,
                tileSize,
                tileSize,
                drawX,
                drawY,
                tileSize,
                tileSize,
              );
            }
          }
        }
      }
    }
  }

  /**
   * Draw dropped items on the map
   */
  drawItems() {
    const ctx = this.bufferContext || this.context;
    if (!ctx) {
      return;
    }

    // Filter out NPCs in viewport
    const nearbyItems = this.droppedItems.filter((item) => {
      const foundItems = (this.player.x <= (8 + item.x))
        && (this.player.x >= (item.x - 8))
        && (this.player.y <= (6 + item.y))
        && (this.player.y >= (item.y - 6));
      return foundItems;
    });

    const metrics = this.getViewportMetrics();
    const { tileSize } = metrics;

    // Get relative X,Y coordinates to paint on viewport
    nearbyItems.forEach((item) => {
      const itemCenter = centerOfTile(item.x, item.y, tileSize);
      const topLeft = {
        x: itemCenter.x - (tileSize / 2),
        y: itemCenter.y - (tileSize / 2),
      };
      const screenPosition = this.worldToScreen(topLeft, metrics);

      // Get item information and get proper quantity index for graphic
      const info = UI.getItemData(item.id);
      let qtyIndex = 0;
      if (item.qty > 1 && info.graphics.quantityLevel) {
        const qLevels = info.graphics.quantityLevel;
        while (qtyIndex < qLevels.length - 1 && qLevels[qtyIndex] < item.qty) {
          qtyIndex += 1;
        }
      }

      // Get the correct tileset to draw upon
      const itemTileset = () => {
        switch (info.graphics.tileset) {
        case 'general':
          return this.images.generalImage;
        case 'jewelry':
          return this.images.jewelryImage;
        case 'armor':
          return this.images.armorImage;
        default:
        case 'weapons':
          return this.images.weaponsImage;
        }
      };

      ctx.drawImage(
        itemTileset(),
        ((info.graphics.column + qtyIndex) * 32), // Number in Item tileset
        (info.graphics.row * 32), // Y-axis of tileset
        tileSize,
        tileSize,
        screenPosition.x,
        screenPosition.y,
        tileSize,
        tileSize,
      );
    }, this);
  }

  /**
   * Draw the player on the board
   */
  drawPlayer() {
    const ctx = this.bufferContext || this.context;
    if (!ctx) {
      return;
    }

    const center = this.getViewportCenter();
    const tileSize = this.config.map.tileset.tile.width;
    const drawX = Math.round(center.x - (tileSize / 2));
    const drawY = Math.round(center.y - (tileSize / 2));

    const animator = this.ensureAnimation(this.player);
    const frame = animator ? animator.getCurrentFrame() : { column: 0, row: 0 };
    const sourceX = frame.column * tileSize;
    const sourceY = frame.row * tileSize;

    ctx.drawImage(
      this.images.playerImage,
      sourceX,
      sourceY,
      tileSize,
      tileSize,
      drawX,
      drawY,
      tileSize,
      tileSize,
    );
  }

  /**
   * Draw the other players on the screen
   */
  drawPlayers() {
    const ctx = this.bufferContext || this.context;
    if (!ctx) {
      return;
    }

    // Filter out nearby players
    const nearbyPlayers = this.players.filter((player) => {
      const foundPlayers = (this.player.x <= (8 + player.x))
        && (this.player.x >= (player.x - 8))
        && (this.player.y <= (6 + player.y))
        && (this.player.y >= (player.y - 6));

      return foundPlayers;
    });

    const metrics = this.getViewportMetrics();
    const { tileSize } = metrics;

    nearbyPlayers.forEach((player) => {
      const centerPosition = player.movement
        ? player.movement.getPosition()
        : centerOfTile(player.x, player.y, tileSize);

      const topLeft = {
        x: centerPosition.x - (tileSize / 2),
        y: centerPosition.y - (tileSize / 2),
      };

      const screenPosition = this.worldToScreen(topLeft, metrics);

      const animator = this.ensureAnimation(player);
      const frame = animator ? animator.getCurrentFrame() : { column: 0, row: 0 };
      const sourceX = frame.column * tileSize;
      const sourceY = frame.row * tileSize;

      ctx.drawImage(
        this.images.playerImage,
        sourceX,
        sourceY,
        tileSize,
        tileSize,
        screenPosition.x,
        screenPosition.y,
        tileSize,
        tileSize,
      );
    });
  }

  /**
   * Draw the NPCs on the game viewport canvas
   */
  drawNPCs() {
    const ctx = this.bufferContext || this.context;
    if (!ctx) {
      return;
    }

    // Filter out NPCs in viewport
    const nearbyNPCs = this.npcs.filter((npc) => {
      const foundNPCs = (this.player.x <= (8 + npc.x))
        && (this.player.x >= (npc.x - 8))
        && (this.player.y <= (6 + npc.y))
        && (this.player.y >= (npc.y - 6));

      return foundNPCs;
    });

    const metrics = this.getViewportMetrics();
    const { tileSize } = metrics;

    nearbyNPCs.forEach((npc) => {
      const centerPosition = npc.movement
        ? npc.movement.getPosition()
        : centerOfTile(npc.x, npc.y, tileSize);

      const topLeft = {
        x: centerPosition.x - (tileSize / 2),
        y: centerPosition.y - (tileSize / 2),
      };

      const screenPosition = this.worldToScreen(topLeft, metrics);

      const animator = this.ensureAnimation(npc);
      const frame = animator ? animator.getCurrentFrame() : null;
      const fallbackColumn = Number.isFinite(npc.column) ? npc.column : 0;
      const sourceX = frame ? frame.column * tileSize : (fallbackColumn * tileSize);
      const sourceY = frame ? frame.row * tileSize : 0;

      ctx.drawImage(
        this.images.npcsImage,
        sourceX,
        sourceY,
        tileSize,
        tileSize,
        screenPosition.x,
        screenPosition.y,
        tileSize,
        tileSize,
      );
    });
  }

  /**
   * Set the coordinates to where the mouse currently is (if on canvas)
   *
   * @param {integer} x Mouse's x-axis on the canvas viewport
   * @param {integer} y Mouses's y-axus on the canvas viewport
   */
  setMouseCoordinates(x, y) {
    // eslint-disable-next-line
    let data = {
      mouse: {
        type: [moveToMouse, blockedMouse], // To add: Use, Attack
        current: 0,
      },
    };

    const tile = {
      background: UI.getTileOverMouse(
        this.background,
        this.player.x,
        this.player.y,
        x,
        y,
      ),
      foreground: UI.getTileOverMouse(
        this.foreground,
        this.player.x,
        this.player.y,
        x,
        y,
      ) - 252,
    };

    let isWalkable = UI.tileWalkable(tile.background);
    if (tile.foreground > -1) {
      isWalkable = UI.tileWalkable(tile.foreground, 'foreground');
    }

    this.path.current.walkable = isWalkable;

    if (!isWalkable) {
      data.mouse.current = 1;
    }

    this.mouse.x = x;
    this.mouse.y = y;
    this.mouse.type = data.mouse.current;
    this.mouse.selection.src = data.mouse.type[data.mouse.current];
  }

  /**
   * Draw the mouse selection on the canvas's viewport
   */
  drawMouse() {
    const ctx = this.bufferContext || this.context;
    if (!ctx) {
      return;
    }
    if (this.mouse.x === null || this.mouse.y === null) {
      return;
    }

    const metrics = this.getViewportMetrics();
    const { tileSize, tileCrop } = metrics;

    const topLeft = {
      x: (this.mouse.x + tileCrop.x) * tileSize,
      y: (this.mouse.y + tileCrop.y) * tileSize,
    };

    const screenPosition = this.worldToScreen(topLeft, metrics);

    ctx.drawImage(
      this.mouse.selection,
      screenPosition.x,
      screenPosition.y,
      tileSize,
      tileSize,
    );
  }

  getViewportCenter() {
    const { viewport, tileSize } = this.getViewportMetrics();

    return {
      x: Math.floor(viewport.x / 2) * tileSize + (tileSize / 2),
      y: Math.floor(viewport.y / 2) * tileSize + (tileSize / 2),
    };
  }
}

export default Map;
