import terrainTileset from '../assets/tiles/terrain.png';
import objectsTileset from '../assets/tiles/objects.png';

import npcImage from '../assets/graphics/actors/npcs.png';
import playerImage from '../assets/graphics/actors/players/human.png';
import weaponsImage from '../assets/graphics/items/weapons.png';
import armorImage from '../assets/graphics/items/armor.png';
import jewelryImage from '../assets/graphics/items/jewelry.png';
import generalImage from '../assets/graphics/items/general.png';

import bus from './utilities/bus.js';

import Socket from './utilities/socket.js';
import MovementController from './utilities/movement-controller.js';
import SpriteAnimator from './utilities/sprite-animator.js';
import { PLAYER_SPRITE_CONFIG } from './config/animation.js';
import { DEFAULT_FACING_DIRECTION } from '@shared/combat.js';
import { createCharacterState, syncShortcuts } from '@shared/stats/index.js';
import { DEFAULT_MOVE_DURATION_MS, now } from './config/movement.js';
import { hydrateMonsters, getAbilityDefinition } from './config/combat/index.js';
import AbilityManager, { ensureCombatState } from './ability-manager.js';

import Map from './map.js';

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

const resolveFacingDirection = (direction, fallback = DEFAULT_FACING_DIRECTION) => {
  if (!direction) {
    return fallback;
  }

  const mapping = {
    'up-right': 'right',
    'down-right': 'right',
    'up-left': 'left',
    'down-left': 'left',
  };

  const normalised = mapping[direction] || direction;
  if (['up', 'down', 'left', 'right'].includes(normalised)) {
    return normalised;
  }

  return fallback;
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
    // The map payload received from server
    this.map = data.map;
    this.background = data.map.background;
    this.foreground = data.map.foreground;

    // Entities on map
    const playerData = { ...data.player };
    playerData.inventory = playerData.inventory.slots;
    playerData.movement = new MovementController().initialise(playerData.x, playerData.y);
    playerData.animation = playerData.animation
      || this.createInitialAnimation({
        direction: resolveFacingDirection(
          playerData.animation && playerData.animation.direction,
        ),
      });
    playerData.animationController = new SpriteAnimator(PLAYER_SPRITE_CONFIG);
    playerData.animationController.applyServerState(playerData.animation);

    const attributeSources = playerData.stats && playerData.stats.attributes
      ? playerData.stats.attributes.sources
      : playerData.attributes;
    const resourceOverrides = playerData.stats && playerData.stats.resources
      ? playerData.stats.resources
      : {
        health: playerData.hp || playerData.health || {},
        mana: playerData.mana || playerData.mp || {},
      };
    const lifecycle = playerData.stats && playerData.stats.lifecycle
      ? playerData.stats.lifecycle
      : playerData.lifecycle || {};

    const statsState = createCharacterState({
      level: playerData.level,
      attributes: attributeSources || {},
      resources: resourceOverrides || {},
      lifecycle,
    });

    syncShortcuts(statsState, playerData);
    ensureCombatState(playerData);

    this.player = playerData;
    this.players = [];
    this.droppedItems = data.droppedItems;
    this.npcs = data.npcs;
    this.monsters = hydrateMonsters(data.monsters || []);
    this.monsters.forEach((monster) => ensureCombatState(monster));
    this.abilityManager = new AbilityManager({
      resolveAbility: getAbilityDefinition,
      bus,
    });
    this.abilityManager.registerEntity(this.player);
    this.monsters.forEach((monster) => this.abilityManager.registerEntity(monster));
    this.sceneId = (data.scene && data.scene.id) || data.sceneId || null;
    this.sceneMetadata = data.scene && data.scene.metadata ? data.scene.metadata : {};
    this.cachedImages = null;

    // Tell client to draw mouse on canvas
    bus.$on('DRAW:MOUSE', ({ x, y }) => {
      if (this.map && typeof this.map.setMouseCoordinates === 'function') {
        this.map.setMouseCoordinates(x, y);
      }
    });
  }

  /**
   * Build the local Map based on data from server
   */
  async buildMap() {
    const images = await this.ensureAssets();

    const data = {
      droppedItems: this.droppedItems,
      map: this.map,
      npcs: this.npcs,
      monsters: this.monsters,
      player: this.player,
    };

    this.map = new Map(data, images);
    this.monsters = this.map.monsters;
    this.syncCombatants();
    return 200;
  }

  /**
   * Start loading assets from server
   */
  async ensureAssets() {
    if (this.cachedImages) {
      return this.cachedImages;
    }

    this.cachedImages = await Promise.all(this.loadAssets());
    return this.cachedImages;
  }

  async start(force = false) {
    if (force) {
      this.cachedImages = await Promise.all(this.loadAssets());
      return this.cachedImages;
    }

    return this.ensureAssets();
  }

  /**
   * Start building the map itself
   */
  async setUp() {
    const images = await this.ensureAssets();
    this.map.setImages(images);
    this.map.setPlayer(this.player);
    this.map.setNPCs(this.npcs);
    this.map.setMonsters(this.monsters);
    this.monsters = this.map.monsters;
    this.map.setDroppedItems(this.droppedItems);
    this.syncCombatants();
  }

  async loadScene(scenePayload, playerState = {}) {
    if (!scenePayload || !scenePayload.map) {
      return;
    }

    if (playerState && typeof playerState.x === 'number') {
      this.player.x = playerState.x;
    }
    if (playerState && typeof playerState.y === 'number') {
      this.player.y = playerState.y;
    }
    if (playerState && typeof playerState.sceneId === 'string') {
      this.sceneId = playerState.sceneId;
    }

    if (scenePayload.metadata) {
      this.sceneMetadata = scenePayload.metadata;
    }

    this.droppedItems = scenePayload.droppedItems || [];
    this.npcs = scenePayload.npcs || [];
    this.monsters = hydrateMonsters(scenePayload.monsters || []);
    this.monsters.forEach((monster) => ensureCombatState(monster));

    if (!this.player.movement) {
      this.player.movement = new MovementController().initialise(this.player.x, this.player.y);
    } else if (typeof this.player.movement.hardSync === 'function') {
      this.player.movement.hardSync(this.player.x, this.player.y);
    }

    this.players = [];

    const images = await this.ensureAssets();

    if (this.map && typeof this.map.destroy === 'function') {
      this.map.destroy();
    }

    const data = {
      droppedItems: this.droppedItems,
      map: scenePayload.map,
      npcs: this.npcs,
      monsters: this.monsters,
      player: this.player,
    };

    this.map = new Map(data, images);
    this.background = scenePayload.map.background;
    this.foreground = scenePayload.map.foreground;
    this.monsters = this.map.monsters;
    this.syncCombatants();
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

  createInitialAnimation(overrides = {}) {
    const defaultDirection = PLAYER_SPRITE_CONFIG.defaultDirection || DEFAULT_FACING_DIRECTION;
    return {
      state: overrides.state || PLAYER_SPRITE_CONFIG.defaultState || 'idle',
      direction: resolveFacingDirection(overrides.direction, defaultDirection),
      sequence: Number.isFinite(overrides.sequence) ? overrides.sequence : 0,
      startedAt: Number.isFinite(overrides.startedAt) ? overrides.startedAt : now(),
      duration: Number.isFinite(overrides.duration) ? overrides.duration : 0,
      speed: Number.isFinite(overrides.speed) ? overrides.speed : 1,
      skillId: overrides.skillId || null,
      holdState: overrides.holdState || null,
    };
  }

  ensureAnimationController(actor) {
    if (!actor) {
      return null;
    }

    if (!actor.animation) {
      actor.animation = this.createInitialAnimation();
    }

    if (!actor.animationController || !(actor.animationController instanceof SpriteAnimator)) {
      actor.animationController = new SpriteAnimator(PLAYER_SPRITE_CONFIG);
    }

    actor.animationController.applyServerState(actor.animation);
    return actor.animationController;
  }

  resolveFacing(direction, fallback = DEFAULT_FACING_DIRECTION) {
    return resolveFacingDirection(direction, fallback);
  }

  updateActorAnimation(actor, animation, options = {}) {
    if (!actor) {
      return;
    }

    const controller = this.ensureAnimationController(actor);
    if (!controller) {
      return;
    }

    if (!animation) {
      if (options.forceSync) {
        actor.animation = { ...controller.toJSON() };
      }
      return;
    }

    const payload = { ...animation };
    payload.direction = this.resolveFacing(
      payload.direction || (actor.animation && actor.animation.direction),
      this.resolveFacing(null),
    );

    const applied = controller.applyServerState(payload);
    if (applied !== false || options.forceSync) {
      actor.animation = { ...controller.toJSON() };
    }
  }

  setLocalAnimation(state, options = {}) {
    const actor = options.actor || this.getOptimisticActor();
    if (!actor) {
      return;
    }

    const controller = this.ensureAnimationController(actor);
    if (!controller) {
      return;
    }

    const direction = this.resolveFacing(
      options.direction || (actor.animation && actor.animation.direction),
    );

    controller.setState(state, {
      direction,
      duration: options.duration,
      speed: options.speed,
      skillId: options.skillId,
      local: true,
    });

    actor.animation = { ...controller.toJSON() };
  }

  setLocalIdle(direction = null) {
    const actor = this.getOptimisticActor();
    if (!actor) {
      return;
    }

    const facing = this.resolveFacing(direction || (actor.animation && actor.animation.direction));
    this.setLocalAnimation('idle', { actor, direction: facing });
  }

  getFacingDirection(actor = this.getOptimisticActor()) {
    if (actor && actor.animation && actor.animation.direction) {
      return actor.animation.direction;
    }
    return this.resolveFacing(null);
  }

  getOptimisticActor() {
    if (this.map && this.map.player) {
      return this.map.player;
    }
    return this.player;
  }

  getPlayerSocketIdentity() {
    if (!this.player) {
      return {};
    }

    const socketId = this.player.socket_id
      || this.player.socketId
      || this.player.uuid
      || null;

    if (!socketId) {
      return {};
    }

    return { socket_id: socketId };
  }

  normaliseTilePayload(tile = {}) {
    if (!tile || typeof tile !== 'object') {
      return {};
    }

    const payload = {};

    if (Number.isFinite(tile.x)) {
      payload.x = tile.x;
    }

    if (Number.isFinite(tile.y)) {
      payload.y = tile.y;
    }

    if (tile.world && Number.isFinite(tile.world.x) && Number.isFinite(tile.world.y)) {
      payload.world = { x: tile.world.x, y: tile.world.y };
    }

    if (tile.viewport && Number.isFinite(tile.viewport.x) && Number.isFinite(tile.viewport.y)) {
      payload.viewport = { x: tile.viewport.x, y: tile.viewport.y };
    }

    if (tile.center && Number.isFinite(tile.center.x) && Number.isFinite(tile.center.y)) {
      payload.center = { x: tile.center.x, y: tile.center.y };
    }

    return payload;
  }

  createQueueItem(actionItem = {}, tile = {}) {
    const itemMeta = {};

    if (actionItem && typeof actionItem.uuid !== 'undefined') {
      itemMeta.uuid = actionItem.uuid;
    }

    if (actionItem && typeof actionItem.id !== 'undefined') {
      itemMeta.id = actionItem.id;
    }

    const queueItem = {
      item: itemMeta,
      tile: { ...tile },
      action: actionItem && actionItem.action ? { ...actionItem.action } : {},
      queueable: Boolean(actionItem && actionItem.action && actionItem.action.queueable),
    };

    if (actionItem && Object.prototype.hasOwnProperty.call(actionItem, 'at')) {
      queueItem.at = actionItem.at;
    } else {
      queueItem.at = false;
    }

    if (actionItem && actionItem.coordinates) {
      queueItem.coordinates = { ...actionItem.coordinates };
    } else {
      queueItem.coordinates = false;
    }

    if (tile && tile.world) {
      queueItem.world = { ...tile.world };
    }

    return queueItem;
  }

  isWalkAction(item = {}) {
    if (!item || !item.action) {
      return false;
    }

    const actionId = typeof item.action.actionId === 'string'
      ? item.action.actionId.toLowerCase()
      : '';
    const actionName = typeof item.action.name === 'string'
      ? item.action.name.toLowerCase()
      : '';

    return actionId === 'player:walk-here' || actionName === 'walk here';
  }

  recordPendingWalk(tile = {}) {
    const actor = this.getOptimisticActor();
    if (!actor) {
      return;
    }

    const resolved = {};
    if (tile.world && Number.isFinite(tile.world.x) && Number.isFinite(tile.world.y)) {
      resolved.x = tile.world.x;
      resolved.y = tile.world.y;
    } else if (Number.isFinite(tile.x) && Number.isFinite(tile.y)) {
      const baseActor = this.player || actor;
      const center = tile.center && Number.isFinite(tile.center.x) && Number.isFinite(tile.center.y)
        ? tile.center
        : null;

      if (center && Number.isFinite(baseActor.x) && Number.isFinite(baseActor.y)) {
        resolved.x = baseActor.x - center.x + tile.x;
        resolved.y = baseActor.y - center.y + tile.y;
      }
    }

    if (Number.isFinite(resolved.x) && Number.isFinite(resolved.y)) {
      actor.optimisticTarget = { x: resolved.x, y: resolved.y };
    }

    actor.lastMouseCommandAt = now();
  }

  requestContextMenu(options = {}) {
    if (!this.player) {
      return false;
    }

    const tile = this.normaliseTilePayload(options.tile || {});
    const payload = {
      miscData: options.miscData || {},
      tile,
      player: this.getPlayerSocketIdentity(),
    };

    if (options.viewport && Number.isFinite(options.viewport.x) && Number.isFinite(options.viewport.y)) {
      payload.viewport = { x: options.viewport.x, y: options.viewport.y };
    }

    if (options.center && Number.isFinite(options.center.x) && Number.isFinite(options.center.y)) {
      payload.center = { x: options.center.x, y: options.center.y };
    }

    Socket.emit('player:context-menu:build', payload);
    return true;
  }

  performActionAt(actionItem, tilePayload = {}, options = {}) {
    if (!this.player || !actionItem) {
      return false;
    }

    const tile = this.normaliseTilePayload(tilePayload);
    const queueItem = options.queueItem || this.createQueueItem(actionItem, tile);

    const payload = {
      data: {
        item: actionItem,
        tile,
      },
      queueItem,
      player: this.getPlayerSocketIdentity(),
    };

    Socket.emit('player:context-menu:action', payload);

    if (options.expectWalk || this.isWalkAction(actionItem)) {
      this.recordPendingWalk(tile);
    }

    if (queueItem && queueItem.queueable) {
      const actor = this.getOptimisticActor();
      if (actor) {
        actor.pendingQueuedAction = {
          issuedAt: now(),
          actionId: queueItem.action && queueItem.action.actionId,
          tile: queueItem.tile ? { ...queueItem.tile } : null,
        };
      }
    }

    return true;
  }

  walkTo(actionItem, tilePayload = {}, options = {}) {
    return this.performActionAt(actionItem, tilePayload, { ...options, expectWalk: true });
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

    const facing = this.resolveFacing(direction, this.getFacingDirection(actor));

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
    actor.optimisticFacing = facing;

    this.setLocalAnimation('run', { actor, direction: facing, duration: step.duration });

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
      this.setLocalIdle();
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
    } else if (!controller.isMoving()) {
      this.setLocalIdle(actor.optimisticFacing || this.getFacingDirection(actor));
    }
  }

  update(deltaSeconds) {
    if (this.abilityManager) {
      this.abilityManager.update(deltaSeconds);
    }
  }

  syncCombatants() {
    if (!this.abilityManager) {
      return;
    }

    if (this.player) {
      ensureCombatState(this.player);
      this.abilityManager.registerEntity(this.player);
    }

    if (Array.isArray(this.monsters)) {
      this.monsters.forEach((monster) => {
        ensureCombatState(monster);
        this.abilityManager.registerEntity(monster);
      });
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
    this.setLocalIdle();
  }
}

export default Client;
