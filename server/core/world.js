const DEFAULT_TOWN_ID = 'town:delaford';

class WorldScene {
  constructor({
    id,
    type = 'town',
    name = '',
    persistent = false,
    map = null,
    npcs = null,
    items = null,
    respawns = null,
    monsters = null,
    metadata = null,
  }) {
    this.id = id;
    this.type = type;
    this.name = name || id;
    this.persistent = Boolean(persistent);
    this.map = map || { foreground: [], background: [] };
    this.npcs = npcs || [];
    this.items = items || [];
    this.respawns = respawns || {
      items: [],
      monsters: [],
      resources: [],
    };
    this.monsters = monsters || [];
    this.players = [];
    this.metadata = metadata || {};
  }
}

class WorldManager {
  constructor() {
    this.socket = {};
    this.clients = [];
    this._players = [];
    this.towns = new Map();
    this.instances = new Map();
    this.scenes = new Map();

    const townScene = new WorldScene({
      id: DEFAULT_TOWN_ID,
      type: 'town',
      name: 'Delaford',
      persistent: true,
    });

    this.towns.set(townScene.id, townScene);
    this.registerScene(townScene);
    this.defaultTownId = townScene.id;
  }

  registerScene(scene) {
    if (!scene || !scene.id) {
      return;
    }
    this.scenes.set(scene.id, scene);
  }

  getScene(sceneId) {
    if (!sceneId) {
      return this.getDefaultTown();
    }
    return this.scenes.get(sceneId) || this.getDefaultTown();
  }

  getDefaultTown() {
    return this.towns.get(this.defaultTownId);
  }

  get players() {
    return this._players;
  }

  addPlayer(player, sceneId = this.defaultTownId) {
    if (!player) {
      return;
    }

    if (!player.sceneId) {
      player.sceneId = sceneId;
    }

    const existingIndex = this._players.findIndex(p => p.uuid === player.uuid);
    if (existingIndex !== -1) {
      this._players.splice(existingIndex, 1, player);
    } else {
      this._players.push(player);
    }

    this.assignPlayerToScene(player, player.sceneId || sceneId);
  }

  assignPlayerToScene(player, sceneId) {
    if (!player) {
      return;
    }

    const nextScene = this.getScene(sceneId);
    const previousScene = this.getScene(player.sceneId);

    if (previousScene && previousScene.players) {
      previousScene.players = previousScene.players.filter(p => p.uuid !== player.uuid);
    }

    if (!nextScene.players.find(p => p.uuid === player.uuid)) {
      nextScene.players.push(player);
    }

    player.sceneId = nextScene.id;
  }

  removePlayer(player) {
    if (!player) {
      return;
    }

    const index = this._players.findIndex(p => p.uuid === player.uuid);
    if (index !== -1) {
      this._players.splice(index, 1);
    }

    const scene = this.getScene(player.sceneId);
    if (scene && scene.players) {
      scene.players = scene.players.filter(p => p.uuid !== player.uuid);
    }
  }

  removePlayerBySocket(socketId) {
    if (!socketId) {
      return null;
    }

    const player = this._players.find(p => p.socket_id === socketId);
    if (player) {
      this.removePlayer(player);
    }

    return player || null;
  }

  getSceneForPlayer(player) {
    if (!player) {
      return this.getDefaultTown();
    }

    return this.getScene(player.sceneId);
  }

  getScenePlayers(sceneId) {
    const scene = this.getScene(sceneId);
    return scene && Array.isArray(scene.players) ? scene.players : [];
  }

  get map() {
    return this.getDefaultTown().map;
  }

  set map(value) {
    const town = this.getDefaultTown();
    town.map = value || { foreground: [], background: [] };
  }

  get npcs() {
    return this.getDefaultTown().npcs;
  }

  set npcs(value) {
    const town = this.getDefaultTown();
    town.npcs = value || [];
  }

  get items() {
    return this.getDefaultTown().items;
  }

  set items(value) {
    const town = this.getDefaultTown();
    town.items = value || [];
  }

  get respawns() {
    return this.getDefaultTown().respawns;
  }

  set respawns(value) {
    const town = this.getDefaultTown();
    town.respawns = value || {
      items: [],
      monsters: [],
      resources: [],
    };
  }

  get monsters() {
    return this.getDefaultTown().monsters;
  }

  set monsters(value) {
    const town = this.getDefaultTown();
    town.monsters = value || [];
  }

  ensureTown(id, options = {}) {
    if (!id) {
      return this.getDefaultTown();
    }

    if (!this.towns.has(id)) {
      const town = new WorldScene({
        id,
        type: 'town',
        name: options.name || id,
        persistent: options.persistent !== undefined ? options.persistent : true,
        map: options.map,
        npcs: options.npcs,
        items: options.items,
        respawns: options.respawns,
        monsters: options.monsters,
        metadata: options.metadata,
      });

      this.towns.set(id, town);
      this.registerScene(town);
    }

    return this.towns.get(id);
  }

  createInstance(partyId, options = {}) {
    if (!partyId) {
      throw new Error('Cannot create instance without party ID.');
    }

    const instanceId = `instance:${partyId}`;
    const metadata = {
      partyId,
      seed: options.seed || Date.now(),
      template: options.template || 'dungeon',
      ...(options.metadata || {}),
    };

    const scene = new WorldScene({
      id: instanceId,
      type: 'instance',
      name: options.name || `Party ${partyId}`,
      persistent: false,
      map: options.map,
      npcs: options.npcs,
      items: options.items,
      respawns: options.respawns,
      monsters: options.monsters,
      metadata,
    });

    this.instances.set(partyId, scene);
    this.registerScene(scene);
    return scene;
  }

  getInstance(partyId) {
    if (!partyId) {
      return null;
    }

    return this.instances.get(partyId) || null;
  }

  destroyInstance(partyId) {
    if (!partyId) {
      return;
    }

    const scene = this.instances.get(partyId);
    if (!scene) {
      return;
    }

    scene.players = [];
    this.instances.delete(partyId);
    this.scenes.delete(scene.id);
  }

  applyTownMutation(townId, updater) {
    const town = this.ensureTown(townId);
    if (!town || typeof updater !== 'function') {
      return town;
    }

    const updated = updater(town);
    if (updated && updated !== town) {
      this.towns.set(townId, updated);
      this.registerScene(updated);
    }

    return this.towns.get(townId);
  }
}

const worldManager = new WorldManager();

export default worldManager;
export { WorldScene, DEFAULT_TOWN_ID };
