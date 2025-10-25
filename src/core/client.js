import terrainTileset from '../assets/tiles/terrain.png';
import objectsTileset from '../assets/tiles/objects.png';

import npcImage from '../assets/graphics/actors/npcs.png';
import playerImage from '../assets/graphics/actors/players/human.png';
import weaponsImage from '../assets/graphics/items/weapons.png';
import armorImage from '../assets/graphics/items/armor.png';
import jewelryImage from '../assets/graphics/items/jewelry.png';
import generalImage from '../assets/graphics/items/general.png';

import bus from './utilities/bus';

import Socket from './utilities/socket';
import MovementController from './utilities/movement-controller';
import { DEFAULT_MOVE_DURATION_MS, now } from './config/movement';

import Map from './map';

const directionDeltas = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  'up-right': { x: 1, y: -1 },
  'down-right': { x: 1, y: 1 },
  'up-left': { x: -1, y: -1 },
  'down-left': { x: -1, y: 1 },
};

const computeDurationFromDelta = (deltaX, deltaY) => {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX === 0 && absY === 0) {
    return 0;
  }

  const diagonal = absX === 1 && absY === 1;
  const multiplier = diagonal ? Math.SQRT2 : 1;
  return Math.round(DEFAULT_MOVE_DURATION_MS * multiplier);
};

class Client {
  constructor(data) {
    // The map object
    this.map = data.map;
    this.background = data.map.background;
    this.foreground = data.map.foreground;

    // Entities on map
    const playerData = { ...data.player };
    playerData.inventory = playerData.inventory.slots;
    playerData.movement = new MovementController().initialise(playerData.x, playerData.y);

    this.player = playerData;
    this.players = [];
    this.droppedItems = data.droppedItems;
    this.npcs = data.npcs;

    // Tell client to draw mouse on canvas
    bus.$on('DRAW:MOUSE', ({ x, y }) => this.map.setMouseCoordinates(x, y));
  }

  /**
   * Build the local Map based on data from server
   */
  async buildMap() {
    const images = await this.start();

    const data = {
      droppedItems: this.droppedItems,
      map: this.map,
      npcs: this.npcs,
      player: this.player,
    };

    this.map = new Map(data, images);
    return 200;
  }

  /**
   * Start loading assets from server
   */
  async start() {
    return Promise.all(this.loadAssets());
  }

  /**
   * Start building the map itself
   */
  async setUp() {
    const images = await this.start();
    this.map.setImages(images);
    this.map.setPlayer(this.player);
    this.map.setNPCs(this.npcs);
    this.map.setDroppedItems(this.droppedItems);
  }

  /**
 * Load assets by passing them through
 * a new instance of Image() and resolve the array
 *
 * @return {array}
 */
  loadAssets() {
    const assets = [
      playerImage,
      npcImage,
      objectsTileset,
      terrainTileset,
      weaponsImage,
      armorImage,
      jewelryImage,
      generalImage,
    ];

    const images = Object.values(assets).map((asset) => this.constructor.uploadImage(asset));

    return images;
  }

  /**
   * New up an Image() and sets the source to image
   *
   * @param {string} path The path of the asset
   */
  static uploadImage(path) {
    const asset = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(403);
      image.src = path;
    });

    return asset;
  }

  getOptimisticActor() {
    if (this.map && this.map.player) {
      return this.map.player;
    }
    return this.player;
  }

  move(direction, options = {}) {
    if (!direction || !this.player) {
      return;
    }

    const payload = {
      id: this.player.uuid,
      direction,
    };

    Socket.emit('player:move', payload);

    if (options.optimistic === false) {
      return;
    }

    this.applyOptimisticMovement(direction);
  }

  applyOptimisticMovement(direction) {
    const delta = directionDeltas[direction];
    if (!delta) {
      return;
    }

    const actor = this.getOptimisticActor();
    if (!actor) {
      return;
    }

    if (!actor.movement) {
      actor.movement = new MovementController().initialise(actor.x, actor.y);
      if (this.map && this.map.player === actor) {
        this.map.player.movement = actor.movement;
      }
    }

    if (!Array.isArray(actor.optimisticQueue)) {
      actor.optimisticQueue = [];
    }

    const basePosition = actor.optimisticQueue.length > 0
      ? actor.optimisticQueue[actor.optimisticQueue.length - 1]
      : actor.optimisticPosition || { x: actor.x, y: actor.y };

    const baseX = typeof basePosition.x === 'number' ? basePosition.x : actor.x;
    const baseY = typeof basePosition.y === 'number' ? basePosition.y : actor.y;

    const targetX = baseX + delta.x;
    const targetY = baseY + delta.y;

    const step = {
      x: targetX,
      y: targetY,
      direction,
      duration: computeDurationFromDelta(delta.x, delta.y),
      issuedAt: now(),
      started: false,
    };

    actor.optimisticQueue.push(step);
    actor.optimisticPosition = { x: targetX, y: targetY };
    actor.optimisticTarget = { x: targetX, y: targetY };

    this.startNextOptimisticStep(actor);
  }

  startNextOptimisticStep(actor = this.getOptimisticActor()) {
    const subject = actor;

    if (!subject || !subject.movement) {
      return;
    }

    if (!Array.isArray(subject.optimisticQueue) || subject.optimisticQueue.length === 0) {
      return;
    }

    const controller = subject.movement;
    if (controller.isMoving()) {
      return;
    }

    const step = subject.optimisticQueue[0];
    if (step.started) {
      return;
    }
    controller.startMove(step.x, step.y, { duration: step.duration });
    step.started = true;
  }

  advanceOptimisticMovement() {
    const actor = this.getOptimisticActor();
    if (!actor || !actor.movement) {
      return;
    }

    if (actor.optimisticScheduler) {
      clearTimeout(actor.optimisticScheduler);
      actor.optimisticScheduler = null;
    }

    if (!Array.isArray(actor.optimisticQueue) || actor.optimisticQueue.length === 0) {
      return;
    }

    const controller = actor.movement;

    if (!controller.isMoving()) {
      this.startNextOptimisticStep(actor);
    }

    const activeStep = actor.optimisticQueue[0];
    if (activeStep && !activeStep.started && !controller.isMoving()) {
      this.startNextOptimisticStep(actor);
    }

    if (controller.isMoving() && activeStep && activeStep.started) {
      const delay = Math.max(16, Math.max(0, (controller.lastUpdate + controller.eta) - now()));
      actor.optimisticScheduler = setTimeout(() => {
        actor.optimisticScheduler = null;
        this.advanceOptimisticMovement();
      }, delay);
    }
  }

  resetOptimisticMovement() {
    const actor = this.getOptimisticActor();
    if (!actor) {
      return;
    }

    if (actor.optimisticScheduler) {
      clearTimeout(actor.optimisticScheduler);
      actor.optimisticScheduler = null;
    }

    actor.optimisticPosition = { x: actor.x, y: actor.y };
    actor.optimisticTarget = null;
  }
}

export default Client;
