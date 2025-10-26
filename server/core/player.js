import MapUtils from 'shared/map-utils';
import PF from 'pathfinding';
import Socket from '@server/socket';
import UI from 'shared/ui';
import axios from 'axios';
import config from '@server/config';
import * as emoji from 'node-emoji';
import playerEvent from '@server/player/handlers/actions';
import { v4 as uuid } from 'uuid';
import {
  ATTRIBUTE_IDS,
  createAttributeMap,
  createCharacterState,
  aggregateAttributes,
  computeResources,
  applyDamage as applyStatDamage,
  applyHealing as applyStatHealing,
  tryRespawn as tryStatRespawn,
  syncShortcuts,
  toClientPayload as statsToClientPayload,
} from 'shared/stats';
import Inventory from './utilities/common/player/inventory';
import { wearableItems } from './data/items';
import world from './world';
import {
  DEFAULT_FACING_DIRECTION,
  DEFAULT_ANIMATION_DURATIONS,
  DEFAULT_ANIMATION_HOLDS,
  GLOBAL_COOLDOWN_MS,
} from 'shared/combat';

const BASE_MOVE_DURATION = 150; // ms per cardinal tile step (matches legacy timing)

function clone(value) {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(clone);
  }

  return Object.entries(value).reduce((acc, [key, entry]) => {
    acc[key] = clone(entry);
    return acc;
  }, {});
}

const computeStepDuration = (deltaX, deltaY, baseDuration = BASE_MOVE_DURATION) => {
  const diagonal = Math.abs(deltaX) === 1 && Math.abs(deltaY) === 1;
  const multiplier = diagonal ? Math.SQRT2 : 1;
  return Math.round(baseDuration * multiplier);
};

class Player {
  constructor(data, token, socketId) {
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
    this.inventory = new Inventory(data.inventory, this.socket_id);

    this.facing = DEFAULT_FACING_DIRECTION;
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

    console.log(
      `${emoji.get('high_brightness')}  Player ${this.username} (lvl ${this.level}) logged in. (${
        this.x
      }, ${this.y})`,
    );
  }

  buildInitialStats(data = {}) {
    const attributeSources = {
      base: data.attributes && data.attributes.base
        ? data.attributes.base
        : data.baseAttributes,
      bonuses: data.attributes && data.attributes.bonuses
        ? data.attributes.bonuses
        : data.attributeBonuses,
      equipment: data.attributes && data.attributes.equipment
        ? data.attributes.equipment
        : data.equipmentAttributes,
    };

    const resourceOverrides = {
      health: (data.resources && data.resources.health) || data.hp || {},
      mana: (data.resources && data.resources.mana) || data.mana || {},
    };

    const lifecycle = data.lifecycle || {};

    this.stats = createCharacterState({
      level: this.level,
      attributes: attributeSources,
      resources: resourceOverrides,
      lifecycle,
    });

    syncShortcuts(this.stats, this);
    return this.stats;
  }

  getEquipmentAttributeTotals() {
    const totals = createAttributeMap(0);

    if (!this.wear) {
      return totals;
    }

    Object.values(this.wear).forEach((item) => {
      if (!item || !item.attributes) {
        return;
      }

      ATTRIBUTE_IDS.forEach((attributeId) => {
        const value = Number(item.attributes[attributeId]);
        if (Number.isFinite(value)) {
          totals[attributeId] += value;
        }
      });
    });

    return totals;
  }

  refreshDerivedStats(overrides = {}) {
    if (!this.stats) {
      this.buildInitialStats({});
    }

    const existingSources = (this.stats && this.stats.attributes && this.stats.attributes.sources) || {};

    const baseSource = overrides.base || existingSources.base || {};
    const bonusSource = overrides.bonuses || existingSources.bonuses || {};
    const equipmentSource = overrides.equipment || this.getEquipmentAttributeTotals();

    const aggregated = aggregateAttributes({
      base: baseSource,
      bonuses: bonusSource,
      equipment: equipmentSource,
    });

    const healthOverride = {
      current: this.hp && this.hp.current !== undefined ? this.hp.current : undefined,
      max: this.hp && this.hp.max !== undefined ? this.hp.max : undefined,
    };
    if (healthOverride.current === 0) {
      healthOverride.allowZero = true;
    }

    const manaOverride = {
      current: this.mana && this.mana.current !== undefined ? this.mana.current : undefined,
      max: this.mana && this.mana.max !== undefined ? this.mana.max : undefined,
    };

    const resources = computeResources(
      { level: this.level, attributes: aggregated.total },
      { health: healthOverride, mana: manaOverride },
    );

    this.stats.level = this.level;
    this.stats.attributes = aggregated;
    this.stats.resources = resources;

    syncShortcuts(this.stats, this);
    return this.stats;
  }

  applyDamage(amount, options = {}) {
    if (!this.stats) {
      this.buildInitialStats({});
    }

    const result = applyStatDamage(this.stats, amount, options);
    syncShortcuts(this.stats, this);
    return result;
  }

  applyHealing(amount, options = {}) {
    if (!this.stats) {
      this.buildInitialStats({});
    }

    const result = applyStatHealing(this.stats, amount, options);
    syncShortcuts(this.stats, this);
    return result;
  }

  tryRespawn(options = {}) {
    if (!this.stats) {
      this.buildInitialStats({});
    }

    const result = tryStatRespawn(this.stats, options);
    syncShortcuts(this.stats, this);
    return result;
  }

  /**
   * Make up correct object format for Vue component WEAR
   * as it is abstracted from the database
   *
   * @param {string} data The array of wear objects
   */
  static constructWear(data) {
    const wearData = data;
    // Do not load arrows for now
    delete wearData.arrows;

    // Go through every wear slot
    // and map from database to Vue object
    Object.keys(wearData).forEach((property) => {
      if (Object.prototype.hasOwnProperty.call(wearData, property)) {
        if (wearData[property] !== null) {
          const id = wearData[property];
          const { name, graphics } = wearableItems.find(db => db.id === id);
          wearData[property] = {
            uuid: uuid(),
            graphics,
            name,
            id,
          };
        }
      }
    });

    return data;
  }

  createInitialAnimation(overrides = {}) {
    const direction = this.resolveFacing(overrides.direction, DEFAULT_FACING_DIRECTION);
    return {
      state: overrides.state || 'idle',
      direction,
      sequence: Number.isFinite(overrides.sequence) ? overrides.sequence : 0,
      startedAt: Number.isFinite(overrides.startedAt) ? overrides.startedAt : Date.now(),
      duration: Number.isFinite(overrides.duration) ? overrides.duration : 0,
      speed: Number.isFinite(overrides.speed) ? overrides.speed : 1,
      skillId: overrides.skillId || null,
      holdState: overrides.holdState || null,
    };
  }

  resolveFacing(direction, fallback = DEFAULT_FACING_DIRECTION) {
    if (!direction) {
      return fallback;
    }

    const mapping = {
      'up-right': 'right',
      'down-right': 'right',
      'up-left': 'left',
      'down-left': 'left',
    };

    const candidate = mapping[direction] || direction;
    if (['up', 'down', 'left', 'right'].includes(candidate)) {
      return candidate;
    }

    return fallback;
  }

  setFacing(direction) {
    this.facing = this.resolveFacing(direction, this.facing || DEFAULT_FACING_DIRECTION);
    return this.facing;
  }

  clearAnimationTimer() {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
  }

  setAnimationState(state, options = {}) {
    const resolvedState = state || 'idle';
    const direction = this.resolveFacing(options.direction, this.facing || DEFAULT_FACING_DIRECTION);
    const nowTs = Number.isFinite(options.startedAt) ? options.startedAt : Date.now();
    const previousSequence = this.animation && typeof this.animation.sequence === 'number'
      ? this.animation.sequence
      : 0;
    const sequence = Number.isFinite(options.sequence) ? options.sequence : previousSequence + 1;
    const duration = Number.isFinite(options.duration)
      ? options.duration
      : (DEFAULT_ANIMATION_DURATIONS[resolvedState] || 0);
    const holdState = options.holdState !== undefined
      ? options.holdState
      : (DEFAULT_ANIMATION_HOLDS[resolvedState] || null);

    this.animation = {
      state: resolvedState,
      direction,
      sequence,
      startedAt: nowTs,
      duration,
      speed: Number.isFinite(options.speed) ? options.speed : 1,
      skillId: options.skillId || null,
      holdState,
    };

    this.clearAnimationTimer();

    if (holdState && duration > 0 && options.autoHold !== false) {
      this.animationTimer = setTimeout(() => {
        if (!this.animation || this.animation.sequence !== sequence) {
          return;
        }

        this.setAnimationState(holdState, {
          direction,
          sequence: sequence + 0.1,
          startedAt: Date.now(),
          duration: DEFAULT_ANIMATION_DURATIONS[holdState] || 0,
          holdState: DEFAULT_ANIMATION_HOLDS[holdState] || null,
          autoHold: false,
        });
        Player.broadcastAnimation(this);
      }, duration);
    }

    return this.animation;
  }

  recordSkillInput(skillId, data = {}) {
    if (!skillId) {
      return false;
    }

    const nowTs = Date.now();
    if (this.combat.globalCooldown && this.combat.globalCooldown > nowTs) {
      return false;
    }

    const direction = this.resolveFacing(data.direction, this.facing);
    this.setFacing(direction);

    const currentSequence = Number.isFinite(this.combat.sequence) ? this.combat.sequence : 0;
    this.combat.sequence = currentSequence + 1;
    this.combat.globalCooldown = nowTs + GLOBAL_COOLDOWN_MS;
    this.combat.lastSkill = {
      id: skillId,
      usedAt: nowTs,
      direction,
      modifiers: data.modifiers || {},
      sequence: this.combat.sequence,
    };

    const windowStart = nowTs - 3000;
    const history = Array.isArray(this.combat.inputHistory) ? this.combat.inputHistory : [];
    this.combat.inputHistory = [
      ...history.filter((entry) => entry && entry.usedAt && entry.usedAt >= windowStart),
      this.combat.lastSkill,
    ];

    const animationState = data.animationState || 'attack';
    const duration = data.duration !== undefined
      ? data.duration
      : (DEFAULT_ANIMATION_DURATIONS[animationState] || DEFAULT_ANIMATION_DURATIONS.attack);
    const holdState = data.holdState !== undefined
      ? data.holdState
      : (DEFAULT_ANIMATION_HOLDS[animationState] || DEFAULT_ANIMATION_HOLDS.attack);

    this.setAnimationState(animationState, {
      direction,
      duration,
      skillId,
      holdState,
    });

    return true;
  }

  /**
   * Move the player in a direction per a tile
   *
   * @param {string} direction The direction which the player is moving
   * @param {boolean} pathfind Whether pathfinding is being used to move player
   */
  move(direction, options = {}) {
    const context = typeof options === 'boolean' ? { pathfind: options } : options;
    const {
      pathfind = false,
      duration: durationOverride = null,
      walkId = null,
      stepIndex = null,
      steps = null,
      startedAt = Date.now(),
    } = context || {};

    if (!pathfind) {
      this.cancelPathfinding();
    }

    if (pathfind) {
      this.moving = true;
    }

    const delta = Player.directionDelta(direction);
    const facing = this.setFacing(direction);

    if (!delta) {
      console.log('Nothing happened');
      return false;
    }

    const attemptedWalkId = pathfind ? walkId : null;
    const duration = typeof durationOverride === 'number'
      ? durationOverride
      : computeStepDuration(delta.x, delta.y);

    if (this.isBlocked(direction, delta)) {
      this.registerMovementStep({
        duration: 0,
        walkId: attemptedWalkId,
        stepIndex,
        steps,
        startedAt,
        direction,
        blocked: true,
      });
      this.setAnimationState('idle', { direction: facing });
      return false;
    }

    this.x += delta.x;
    this.y += delta.y;

    this.registerMovementStep({
      duration,
      walkId: attemptedWalkId,
      stepIndex,
      steps,
      startedAt,
      direction,
      blocked: false,
    });
    this.setAnimationState('run', { direction: facing, duration });

    return true;
  }

  registerMovementStep(step = {}) {
    const currentSequence = this.movementStep && typeof this.movementStep.sequence === 'number'
      ? this.movementStep.sequence
      : 0;

    const interruption = step.interrupted !== undefined
      ? step.interrupted
      : Boolean(this.path && this.path.current && this.path.current.interrupted);

    this.movementStep = {
      sequence: currentSequence + 1,
      startedAt: typeof step.startedAt === 'number' ? step.startedAt : Date.now(),
      duration: typeof step.duration === 'number' ? step.duration : 0,
      walkId: step.walkId ?? null,
      stepIndex: step.stepIndex ?? null,
      steps: step.steps ?? null,
      direction: step.direction || null,
      blocked: Boolean(step.blocked),
      interrupted: interruption,
    };

    return this.movementStep;
  }

  cancelPathfinding() {
    const { path } = this;
    if (!path || !path.current) {
      return;
    }

    if (typeof path.current.walkId === 'number') {
      path.current.walkId += 1;
    } else {
      path.current.walkId = 1;
    }

    path.current.path.walking = [];
    path.current.path.set = [];
    path.current.length = 0;
    path.current.step = 0;
    path.current.walkable = false;
    path.current.interrupted = true;

    this.moving = false;
    this.queue = [];
    this.action = false;
    this.setAnimationState('idle', { direction: this.facing });
  }

  static directionDelta(direction) {
    const mapping = {
      right: { x: 1, y: 0 },
      left: { x: -1, y: 0 },
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      'up-right': { x: 1, y: -1 },
      'down-right': { x: 1, y: 1 },
      'up-left': { x: -1, y: -1 },
      'down-left': { x: -1, y: 1 },
    };

    return mapping[direction] || null;
  }

  canMoveTo(tileX, tileY) {
    const { size } = config.map;

    if (tileX < 0 || tileY < 0 || tileX >= size.x || tileY >= size.y) {
      return false;
    }

    const tileIndex = (tileY * size.x) + tileX;
    const scene = world.getSceneForPlayer(this);
    const mapLayers = scene && scene.map ? scene.map : world.map;
    const steppedOn = {
      background: mapLayers.background[tileIndex] - 1,
      foreground: mapLayers.foreground[tileIndex] - 1,
    };

    const tiles = {
      background: steppedOn.background,
      foreground: steppedOn.foreground - 252,
    };

    return MapUtils.gridWalkable(tiles, this, tileIndex, 0, 0, mapLayers) === 0;
  }

  /**
   * Walk the player after a path is found
   *
   * @param {object} path The information to be used of the pathfind
   * @param {object} map The map object associated with player
   */
  walkPath(playerIndex) {
    const player = world.players[playerIndex];
    const { path } = player;
    const baseSpeed = BASE_MOVE_DURATION; // Base delay per cardinal step in ms

    if (!path || !path.current || !Array.isArray(path.current.path.walking)) {
      return;
    }

    if (path.current.path.walking.length <= 1) {
      if (!Player.queueEmpty(playerIndex)) {
        const todo = world.players[playerIndex].queue[0];

        playerEvent[todo.action.actionId]({
          todo,
          playerIndex,
        });

        this.queue.shift();
      }

      this.stopMovement({ player: { socket_id: player.socket_id } });
      return;
    }

    path.current.walkId = (path.current.walkId || 0) + 1;
    const activeWalkId = path.current.walkId;
    path.current.interrupted = false;

    const scheduleNextStep = () => {
      if (path.current.walkId !== activeWalkId) {
        return;
      }

      if (path.current.step + 1 >= path.current.path.walking.length) {
        if (!Player.queueEmpty(playerIndex)) {
          const todo = world.players[playerIndex].queue[0];

          playerEvent[todo.action.actionId]({
            todo,
            playerIndex,
          });

          this.queue.shift();
        }

        this.stopMovement({ player: { socket_id: world.players[playerIndex].socket_id } });
        return;
      }

      const currentIndex = path.current.step;
      const currentCoordinates = {
        x: path.current.path.walking[currentIndex][0],
        y: path.current.path.walking[currentIndex][1],
      };
      const nextCoordinates = {
        x: path.current.path.walking[currentIndex + 1][0],
        y: path.current.path.walking[currentIndex + 1][1],
      };

      const movement = UI.getMovementDirection({
        current: currentCoordinates,
        next: nextCoordinates,
      });

      const deltaX = Math.abs(nextCoordinates.x - currentCoordinates.x);
      const deltaY = Math.abs(nextCoordinates.y - currentCoordinates.y);
      const stepDuration = computeStepDuration(deltaX, deltaY, baseSpeed);
      const totalSteps = Math.max(0, path.current.path.walking.length - 1);

      setTimeout(() => {
        if (path.current.walkId !== activeWalkId) {
          return;
        }

        const stepStartedAt = Date.now();
        this.move(movement, {
          pathfind: true,
          duration: stepDuration,
          walkId: activeWalkId,
          stepIndex: currentIndex + 1,
          steps: totalSteps,
          startedAt: stepStartedAt,
          direction: movement,
        });

        const playerChanging = world.players[playerIndex];
        Player.broadcastMovement(playerChanging);

        path.current.step += 1;
        scheduleNextStep();
      }, stepDuration);
    };

    scheduleNextStep();
  }

  /**
   * When player stops moving during pathfinding walking
   *
   * @param {object} data The player object
   */
  stopMovement(data) {
    Socket.emit('player:stopped', { player: data.player });
    this.moving = false;
    this.setAnimationState('idle', { direction: this.facing });
    Player.broadcastAnimation(this);
  }

  static broadcastMovement(player, players = null) {
    if (!player) {
      return;
    }

    const meta = {};
    if (player.movementStep) {
      meta.movementStep = player.movementStep;
    }
    if (player.animation) {
      meta.animation = player.animation;
    }
    const recipients = players || world.getScenePlayers(player.sceneId);
    Socket.broadcast('player:movement', player, recipients, { meta });
  }

  static broadcastAnimation(player, players = null) {
    if (!player || !player.animation) {
      return;
    }

    const recipients = players || world.getScenePlayers(player.sceneId);
    Socket.broadcast('player:animation', {
      playerId: player.uuid,
      animation: player.animation,
    }, recipients);
  }

  static broadcastStats(player, players = null) {
    if (!player || !player.stats) {
      return;
    }

    const recipients = players || world.getScenePlayers(player.sceneId);
    const payload = {
      playerId: player.uuid,
      stats: statsToClientPayload(player.stats),
      resources: {
        health: clone(player.stats.resources.health),
        mana: clone(player.stats.resources.mana),
      },
      lifecycle: clone(player.stats.lifecycle),
    };

    Socket.broadcast('player:stats:update', payload, recipients);
  }

  /**
   * Checks to see if player can continue walking
   *
   * @param map {object} The map object being passed
   * @param direction {string} The direction player is going
   * @returns {boolean}
   */
  isBlocked(direction, delta = null) {
    const vector = delta || Player.directionDelta(direction);

    if (!vector) {
      return true;
    }

    const targetX = this.x + vector.x;
    const targetY = this.y + vector.y;

    if (!this.canMoveTo(targetX, targetY)) {
      return true;
    }

    if (vector.x !== 0 && vector.y !== 0) {
      const horizontal = this.canMoveTo(this.x + vector.x, this.y);
      const vertical = this.canMoveTo(this.x, this.y + vector.y);

      if (!horizontal && !vertical) {
        return true;
      }
    }

    return false;
  }

  /**
   * Is the background layer blocked?
   *
   * @returns {boolean}
   */
  backgroundBlocked() {
    return this.blocked.background === true;
  }

  /**
   * Is the foreground layer blocked?
   *
   * @returns {boolean}
   */
  foregroundBlocked() {
    return this.blocked.foreground === true;
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
    return world.players[playerIndex].queue.length === 0;
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

module.exports = Player;
