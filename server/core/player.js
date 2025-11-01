import PF from 'pathfinding';
import UI from '#shared/ui.js';
import axios from 'axios';
import config from '#server/config.js';
import * as emoji from 'node-emoji';
import Socket from '#server/socket.js';
import createPlayerAIController from '#server/core/systems/controllers/player-ai-controller.js';
import world from './world.js';
import createPlayerCombatController from '#server/core/entities/player/combat-controller.js';
import createPlayerInventoryManager, { constructWear } from '#server/core/entities/player/inventory-manager.js';
import createPlayerMovementHandler, {
  broadcastAnimation as broadcastPlayerAnimation,
  broadcastMovement as broadcastPlayerMovement,
  directionDelta as movementDirectionDelta,
  queueEmpty as movementQueueEmpty,
} from '#server/core/entities/player/movement-handler.js';
import createPlayerStatsManager, {
  broadcastStats as broadcastPlayerStats,
} from '#server/core/entities/player/stats-manager.js';

const buildPlayerComponents = (player) => ({
  identity: {
    uuid: player.uuid,
    type: 'player',
    name: player.username,
  },
  transform: {
    ref: player,
    sceneId: player.sceneId || world.defaultTownId,
    x: player.x || 0,
    y: player.y || 0,
    facing: player.facing || null,
    animation: player.animation || null,
  },
  'movement-state': {
    handler: player.movement,
    actor: player,
    playerIndex: null,
  },
  'movement-intent': {
    queue: [],
  },
  'action-queue': {
    queue: [],
  },
  lifecycle: {
    state: 'active',
    dirty: true,
  },
  networking: {
    socketId: player.socket_id,
    emit: Socket.emit.bind(Socket),
    broadcast: Socket.broadcast.bind(Socket),
  },
  persistence: {
    save: () => player.update(),
  },
  'inventory-manager': {
    ref: player.inventoryManager,
    actor: player,
  },
  'combat-controller': {
    ref: player.combatController,
    actor: player,
  },
  'stats-manager': {
    ref: player.statsManager,
    actor: player,
  },
});

class Player {
  constructor(data, token, socketId) {
    this.movement = createPlayerMovementHandler(this);
    this.statsManager = createPlayerStatsManager(this);
    this.combatController = createPlayerCombatController(this, this.movement);
    this.inventoryManager = createPlayerInventoryManager(this);

    // Main statistics
    this.username = data.username;
    this.x = data.x;
    this.y = data.y;
    this.level = data.level;
    this.skills = data.skills;

    this.buildInitialStats(data);

    // A player's bank
    this.bank = data.bank;

    // Worn items statistics
    this.combat = {
      attack: {
        stab: 0,
        slash: 0,
        crush: 0,
        range: 0,
      },
      defense: {
        stab: 0,
        slash: 0,
        crush: 0,
        range: 0,
      },
      stance: 'neutral',
      globalCooldown: 0,
      sequence: 0,
      lastSkill: null,
      inputHistory: [],
    };

    // Authentication
    this.moving = false;
    this.token = token;
    this.uuid = data.uuid;
    this.socket_id = socketId;
    this.sceneId = data.sceneId || world.defaultTownId;

    // Tabs
    this.friend_list = data.friend_list;
    this.wear = Player.constructWear(data.wear);

    this.refreshDerivedStats();

    // Pathfinding
    this.path = {
      grid: null, // a 0/1 grid of blocked tiles
      viewport: {
        x: config.map.viewport.x,
        y: config.map.viewport.y,
      },
      center: {
        x: Math.floor(config.map.viewport.x / 2),
        y: Math.floor(config.map.viewport.y / 2),
      },
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
        walkId: 0,
      },
    };

    // What action are they performing at the moment?
    this.action = false;

    // Socket for Player
    // this.socket = new PlayerSocket(this.socket_id);

    // Pathway blocked
    this.blocked = {
      foreground: null,
      background: null,
    };

    // Action queue
    this.queue = [];

    this.movementStep = {
      sequence: 0,
      startedAt: Date.now(),
      duration: 0,
      walkId: 0,
      stepIndex: 0,
      steps: 0,
      direction: null,
      blocked: false,
      interrupted: false,
    };

    // Player inventory
    this.inventory = this.inventoryManager.initializeInventory(data.inventory, this.socket_id);

    this.facing = this.movement.resolveFacing(null);
    this.animation = this.createInitialAnimation();
    Object.defineProperty(this, 'animationTimer', {
      value: null,
      writable: true,
      configurable: true,
      enumerable: false,
    });

    // Fix Skill Levels according to XP on Player constructor
    const skillsName = ['attack', 'defence', 'mining', 'smithing', 'fishing', 'cooking'];
    skillsName.forEach((skillName) => {
      const skill = this.skills[skillName];
      skill.exp = skill.exp > 0 ? skill.exp : 0;
      skill.level = UI.getLevel(skill.exp);
    });

    this.__ecsComponents = buildPlayerComponents(this);
    const ecsRecord = world.registerActorEntity(this, {
      sceneId: this.sceneId,
      components: this.__ecsComponents,
    });
    this.ecs = ecsRecord || null;
    const ecsWorld = ecsRecord ? ecsRecord.world : world.getSceneWorld(this.sceneId);
    this.controller = createPlayerAIController(this, {
      world: ecsWorld,
      systemOptions: {},
    });

    console.log(
      `${emoji.get('high_brightness')}  Player ${this.username} (lvl ${this.level}) logged in. (${
        this.x
      }, ${this.y})`,
    );
  }

  buildInitialStats(data = {}) {
    return this.statsManager.buildInitialStats(data);
  }

  getEquipmentAttributeTotals() {
    return this.statsManager.getEquipmentAttributeTotals();
  }

  refreshDerivedStats(overrides = {}) {
    return this.statsManager.refreshDerivedStats(overrides);
  }

  applyDamage(amount, options = {}) {
    return this.statsManager.applyDamage(amount, options);
  }

  applyHealing(amount, options = {}) {
    return this.statsManager.applyHealing(amount, options);
  }

  tryRespawn(options = {}) {
    return this.statsManager.tryRespawn(options);
  }

  /**
   * Make up correct object format for Vue component WEAR
   * as it is abstracted from the database
   *
   * @param {string} data The array of wear objects
   */
  static constructWear(data) {
    return constructWear(data);
  }

  createInitialAnimation(overrides = {}) {
    return this.movement.createInitialAnimation(overrides);
  }

  resolveFacing(direction, fallback) {
    return this.movement.resolveFacing(direction, fallback);
  }

  setFacing(direction) {
    return this.movement.setFacing(direction);
  }

  clearAnimationTimer() {
    return this.movement.clearAnimationTimer();
  }

  setAnimationState(state, options = {}) {
    return this.movement.setAnimationState(state, options);
  }

  recordSkillInput(skillId, data = {}) {
    return this.combatController.recordSkillInput(skillId, data);
  }

  /**
   * Move the player in a direction per a tile
   *
   * @param {string} direction The direction which the player is moving
   * @param {boolean} pathfind Whether pathfinding is being used to move player
   */
  move(direction, options = {}) {
    return this.movement.move(direction, options);
  }

  registerMovementStep(step = {}) {
    return this.movement.registerMovementStep(step);
  }

  cancelPathfinding() {
    return this.movement.cancelPathfinding();
  }

  static directionDelta(direction) {
    return movementDirectionDelta(direction);
  }

  canMoveTo(tileX, tileY) {
    return this.movement.canMoveTo(tileX, tileY);
  }

  /**
   * Walk the player after a path is found
   *
   * @param {object} path The information to be used of the pathfind
   * @param {object} map The map object associated with player
   */
  walkPath(playerIndex) {
    return this.movement.walkPath(playerIndex);
  }

  /**
   * When player stops moving during pathfinding walking
   *
   * @param {object} data The player object
   */
  stopMovement(data) {
    return this.movement.stopMovement(data);
  }

  static broadcastMovement(player, players = null) {
    return broadcastPlayerMovement(player, players);
  }

  static broadcastAnimation(player, players = null) {
    return broadcastPlayerAnimation(player, players);
  }

  static broadcastStats(player, players = null) {
    return broadcastPlayerStats(player, players);
  }

  /**
   * Checks to see if player can continue walking
   *
   * @param map {object} The map object being passed
   * @param direction {string} The direction player is going
   * @returns {boolean}
   */
  isBlocked(direction, delta = null) {
    return this.movement.isBlocked(direction, delta);
  }

  /**
   * Is the background layer blocked?
   *
   * @returns {boolean}
   */
  backgroundBlocked() {
    return this.movement.backgroundBlocked();
  }

  /**
   * Is the foreground layer blocked?
   *
   * @returns {boolean}
   */
  foregroundBlocked() {
    return this.movement.foregroundBlocked();
  }

  /**
   * Player will perform an action
   *
   * @param {string} item Action to do
   */
  do(item) {
    console.log(this.x, this.y, `Doing ${item}`);
  }

  /**
   * Checks if player queue is  empty
   *
   * @returns {boolean}
   */
  static queueEmpty(playerIndex) {
    return movementQueueEmpty(playerIndex);
  }

  /**
   * Update the player profile in the database
   *
   * @return void
   */
  update() {
    const url = `${process.env.SITE_URL}/api/auth/update`;

    // Set correct bearer token
    const reqConfig = {
      headers: { Authorization: `Bearer ${this.token}` },
    };

    // Find player on server via their token
    const getPlayer = world.players.find(p => p.token === this.token);

    // Get player data
    const playerData = {
      x: getPlayer.x,
      y: getPlayer.y,
      username: getPlayer.username,
      hp_current: getPlayer.hp.current,
      hp_max: getPlayer.hp.max,
    };

    // Get inventory data
    const inventoryData = getPlayer.inventory.slots;

    // Get bank data
    const bankData = getPlayer.bank;

    // Get skills data
    const skillsData = getPlayer.skills;

    // Get wearable data
    const wearData = getPlayer.wear;

    Object.keys(wearData).forEach((property) => {
      if (Object.prototype.hasOwnProperty.call(wearData, property)) {
        wearData[property] = wearData[property] === null ? null : wearData[property].id;
      }
    });

    // We are not looking at arrows for the time being -- remove them.
    if (Object.prototype.hasOwnProperty.call(wearData, 'arrows')) {
      delete wearData.arrows;
    }

    const data = {
      uuid: this.uuid,
      playerData,
      inventoryData,
      wearData,
      skillsData,
      bankData,
    };

    return new Promise((resolve) => {
      axios.post(url, data, reqConfig).then((r) => {
        resolve(r.data);
      });
    });
  }
}

export default Player;
