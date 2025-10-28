import { v4 as uuid } from 'uuid';
import world from '#server/core/world.js';
import Map from '#server/core/map.js';
import Socket from '#server/socket.js';
import Monster from '#server/core/monster.js';
import UI from '#shared/ui.js';

const INVITE_DURATION_MS = 60 * 1000;

const getPlayerBySocket = (socketId) => world.players.find(p => p.socket_id === socketId);
const getPlayerByUuid = (playerUuid) => world.players.find(p => p.uuid === playerUuid);
const getPlayerByUsername = (username) => {
  if (!username) {
    return null;
  }

  const normalised = username.toLowerCase();
  return world.players.find((p) => {
    if (!p.username) {
      return false;
    }

    return p.username.toLowerCase() === normalised;
  }) || null;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

class PartyService {
  constructor() {
    this.parties = new Map();
    this.playerIndex = new Map();
  }

  getParty(partyId) {
    return this.parties.get(partyId) || null;
  }

  getPartyForPlayer(playerUuid) {
    const partyId = this.playerIndex.get(playerUuid);
    if (!partyId) {
      return null;
    }

    return this.getParty(partyId);
  }

  createParty(leader) {
    if (!leader) {
      return null;
    }

    this.removePlayer(leader.uuid);

    const id = uuid();
    const party = {
      id,
      leaderId: leader.uuid,
      members: new Map(),
      invites: new Map(),
      ready: new Set(),
      sceneId: null,
      state: 'lobby',
      metadata: {
        template: 'dungeon',
        seed: null,
        instanceRewards: null,
        completedAt: null,
      },
    };

    this.parties.set(id, party);
    this.addMember(party, leader);
    return party;
  }

  addMember(party, player) {
    if (!party || !player) {
      return;
    }

    const member = {
      uuid: player.uuid,
      username: player.username,
      ready: false,
    };

    party.members.set(player.uuid, member);
    party.ready.delete(player.uuid);
    this.playerIndex.set(player.uuid, party.id);
  }

  removePlayer(playerUuid) {
    if (!playerUuid) {
      return null;
    }

    const partyId = this.playerIndex.get(playerUuid);
    if (!partyId) {
      return null;
    }

    const party = this.parties.get(partyId);
    this.playerIndex.delete(playerUuid);

    if (!party) {
      return null;
    }

    party.members.delete(playerUuid);
    party.ready.delete(playerUuid);
    party.invites.delete(playerUuid);

    if (party.leaderId === playerUuid) {
      const [nextLeader] = party.members.keys();
      party.leaderId = nextLeader || null;
    }

    if (party.members.size === 0) {
      if (party.sceneId) {
        world.destroyInstance(party.id);
      }
      this.parties.delete(partyId);
      return null;
    }

    return party;
  }

  toggleReady(party, playerUuid) {
    if (!party || !playerUuid || !party.members.has(playerUuid)) {
      return;
    }

    const member = party.members.get(playerUuid);
    const nextReadyState = !member.ready;
    member.ready = nextReadyState;

    if (nextReadyState) {
      party.ready.add(playerUuid);
    } else {
      party.ready.delete(playerUuid);
    }
  }

  clearReadyState(party) {
    if (!party) {
      return;
    }

    party.ready.clear();
    party.members.forEach((member) => {
      // eslint-disable-next-line no-param-reassign
      member.ready = false;
    });
  }

  areAllReady(party) {
    if (!party) {
      return false;
    }
    return party.members.size > 0 && party.ready.size === party.members.size;
  }

  sendError(player, message) {
    if (!player) {
      return;
    }

    Socket.emit('party:error', {
      player: { socket_id: player.socket_id },
      error: { message },
    });
  }

  getPartySnapshot(party) {
    if (!party) {
      return null;
    }

    const members = Array.from(party.members.values()).map((entry) => {
      const player = getPlayerByUuid(entry.uuid);
      return {
        uuid: entry.uuid,
        username: entry.username,
        ready: entry.ready,
        sceneId: player ? player.sceneId : null,
      };
    });

    return {
      id: party.id,
      leaderId: party.leaderId,
      members,
      sceneId: party.sceneId,
      state: party.state,
      metadata: clone(party.metadata),
    };
  }

  forEachMember(party, iterator) {
    if (!party || typeof iterator !== 'function') {
      return;
    }

    party.members.forEach((member) => {
      const player = getPlayerByUuid(member.uuid);
      if (player) {
        iterator(player, member);
      }
    });
  }

  sendPartyUpdate(party, options = {}) {
    if (!party) {
      return;
    }

    const snapshot = this.getPartySnapshot(party);
    this.forEachMember(party, (player) => {
      Socket.emit('party:update', {
        player: { socket_id: player.socket_id },
        party: snapshot,
        meta: options.meta || {},
      });
    });
  }

  buildScenePayload(scene) {
    if (!scene) {
      return null;
    }

    return {
      id: scene.id,
      type: scene.type,
      map: scene.map,
      npcs: scene.npcs,
      monsters: Array.isArray(scene.monsters)
        ? scene.monsters.map((monster) => (monster && typeof monster.toJSON === 'function'
          ? monster.toJSON()
          : monster))
        : [],
      droppedItems: scene.items,
      metadata: clone(scene.metadata || {}),
    };
  }

  sendSceneTransition(party, scene) {
    if (!party || !scene) {
      return;
    }

    const snapshot = this.getPartySnapshot(party);
    this.forEachMember(party, (player) => {
      Socket.emit('party:scene:transition', {
        player: { socket_id: player.socket_id },
        scene: this.buildScenePayload(scene),
        party: snapshot,
        playerState: {
          uuid: player.uuid,
          x: player.x,
          y: player.y,
          sceneId: player.sceneId,
        },
      });
    });
  }

  sendLoadingState(party, state) {
    const snapshot = this.getPartySnapshot(party);
    this.forEachMember(party, (player) => {
      Socket.emit('party:loading', {
        player: { socket_id: player.socket_id },
        state,
        party: snapshot,
      });
    });
  }

  ensureInstanceCleanup(party) {
    if (!party || !party.sceneId) {
      return;
    }

    world.destroyInstance(party.id);
    party.sceneId = null;
    party.state = 'lobby';
    party.metadata.seed = null;
    party.metadata.instanceRewards = null;
    party.metadata.completedAt = null;
  }

  async startInstance(party, initiator) {
    if (!party) {
      return;
    }

    if (party.state === 'instance') {
      this.sendError(initiator, 'Party is already inside an instance.');
      return;
    }

    this.sendLoadingState(party, 'enter-instance');

    try {
      const generation = await Map.generateInstance({
        seed: Date.now(),
        template: party.metadata.template,
      });

      const scene = world.createInstance(party.id, {
        map: generation.map,
        npcs: generation.npcs,
        monsters: generation.monsters,
        items: generation.items,
        respawns: generation.respawns,
        metadata: generation.metadata,
      });

      const monsterInstances = Array.isArray(generation.monsters)
        ? generation.monsters.map((definition, index) => new Monster({
          ...definition,
          sceneId: scene.id,
          instanceId: `${scene.id}:${definition.id || index}`,
        }))
        : [];
      scene.monsters = monsterInstances;

      party.sceneId = scene.id;
      party.state = 'instance';
      party.metadata.seed = generation.metadata.seed;
      party.metadata.instanceRewards = generation.metadata && generation.metadata.rewards
        ? { ...generation.metadata.rewards }
        : null;
      party.metadata.completedAt = null;

      const spawnPoints = Array.isArray(generation.metadata.spawnPoints)
        && generation.metadata.spawnPoints.length
        ? generation.metadata.spawnPoints
        : null;

      let spawnIndex = 0;
      this.forEachMember(party, (player) => {
        const spawn = spawnPoints && spawnPoints.length
          ? spawnPoints[spawnIndex % spawnPoints.length]
          : { x: player.x, y: player.y };
        spawnIndex += 1;

        if (spawn && typeof spawn.x === 'number' && typeof spawn.y === 'number') {
          player.x = spawn.x;
          player.y = spawn.y;
        }
        world.assignPlayerToScene(player, scene.id);
        if (player.path) {
          player.path.grid = null;
        }
      });

      this.clearReadyState(party);
      this.sendPartyUpdate(party);
      this.sendSceneTransition(party, scene);
      this.sendLoadingState(party, 'idle');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to start party instance', error);
      this.sendError(initiator, 'Failed to prepare the instance. Please try again.');
      this.sendLoadingState(party, 'idle');
    }
  }

  returnToTown(party) {
    if (!party) {
      return;
    }

    const town = world.getDefaultTown();
    party.state = 'lobby';
    party.sceneId = null;
    party.metadata.seed = null;
    party.metadata.instanceRewards = null;
    party.metadata.completedAt = null;
    this.clearReadyState(party);

    this.forEachMember(party, (player) => {
      world.assignPlayerToScene(player, town.id);
      if (player.path) {
        player.path.grid = null;
      }
    });

    this.sendPartyUpdate(party);
    this.sendSceneTransition(party, town);
    this.sendLoadingState(party, 'idle');
    world.destroyInstance(party.id);
  }

  async distributeInstanceRewards(party, rewardsConfig = {}) {
    if (!party) {
      return [];
    }

    const members = [];
    this.forEachMember(party, (player) => {
      if (player) {
        members.push(player);
      }
    });

    const coinsPerPlayer = Number.isFinite(rewardsConfig.coinsPerPlayer)
      ? Math.max(0, Math.floor(rewardsConfig.coinsPerPlayer))
      : 0;

    const experienceConfig = rewardsConfig.experience && typeof rewardsConfig.experience === 'object'
      ? {
        skill: rewardsConfig.experience.skill,
        amount: Number.isFinite(rewardsConfig.experience.amount)
          ? Math.max(0, Math.floor(rewardsConfig.experience.amount))
          : 0,
      }
      : null;

    const rewards = await Promise.all(members.map(async (player) => {
      const entry = {
        uuid: player.uuid,
        username: player.username,
        coins: 0,
      };

      if (coinsPerPlayer > 0 && player.inventory && typeof player.inventory.add === 'function') {
        await player.inventory.add('coins', coinsPerPlayer);
        Socket.emit('core:refresh:inventory', {
          player: { socket_id: player.socket_id },
          data: player.inventory.slots,
        });
        entry.coins = coinsPerPlayer;
      }

      if (experienceConfig && experienceConfig.skill && experienceConfig.amount > 0) {
        const skillId = experienceConfig.skill;
        const amount = experienceConfig.amount;
        if (player.skills && player.skills[skillId]) {
          player.skills[skillId].exp += amount;
          player.skills[skillId].level = UI.getLevel(player.skills[skillId].exp);
          Socket.emit('resource:skills:update', {
            player: { socket_id: player.socket_id },
            data: player.skills,
          });
          entry.experience = { skill: skillId, amount };
        }
      }

      return entry;
    }));

    return rewards.filter(Boolean);
  }

  sendInstanceComplete(party, rewards = [], message = null) {
    if (!party) {
      return;
    }

    const snapshot = this.getPartySnapshot(party);
    this.forEachMember(party, (player) => {
      Socket.emit('party:instance:complete', {
        player: { socket_id: player.socket_id },
        rewards,
        party: snapshot,
        message,
      });
    });
  }

  async completeInstance(party, options = {}) {
    if (!party || party.state !== 'instance') {
      return false;
    }

    if (party.metadata.completedAt) {
      return false;
    }

    const scene = options.scene || world.getInstance(party.id) || world.getScene(party.sceneId);
    party.metadata.completedAt = Date.now();
    party.state = 'instance-complete';

    this.sendPartyUpdate(party, { meta: { state: 'instance-complete' } });
    this.sendLoadingState(party, 'distribute-rewards');

    const rewardsConfig = options.rewards
      || (party.metadata && party.metadata.instanceRewards)
      || (scene && scene.metadata && scene.metadata.rewards)
      || {};

    const rewards = await this.distributeInstanceRewards(party, rewardsConfig);

    const completionMessage = options.message || 'Instance cleared! Rewards distributed.';
    this.sendInstanceComplete(party, rewards, completionMessage);
    this.sendLoadingState(party, 'return-instance');
    this.returnToTown(party);
    return true;
  }

  async evaluateInstances() {
    const parties = Array.from(this.parties.values()).filter((party) => party && party.state === 'instance');
    const evaluations = parties.map(async (party) => {
      const scene = world.getScene(party.sceneId);
      if (!scene || !Array.isArray(scene.monsters) || scene.monsters.length === 0) {
        return;
      }

      const alive = scene.monsters.some((monster) => monster && monster.isAlive);
      if (!alive) {
        await this.completeInstance(party, { scene, reason: 'monsters-cleared' });
      }
    });

    await Promise.all(evaluations);
  }

  invitePlayer(party, inviter, target) {
    if (!party || !inviter || !target) {
      return;
    }

    const expiresAt = Date.now() + INVITE_DURATION_MS;
    party.invites.set(target.uuid, {
      invitedBy: inviter.uuid,
      expiresAt,
    });

    Socket.emit('party:invited', {
      player: { socket_id: target.socket_id },
      invite: {
        partyId: party.id,
        leaderId: party.leaderId,
        invitedBy: inviter.username,
        expiresAt,
      },
    });
  }

  acceptInvite(party, player) {
    if (!party || !player) {
      return false;
    }

    const record = party.invites.get(player.uuid);
    if (!record) {
      return false;
    }

    if (record.expiresAt && record.expiresAt < Date.now()) {
      party.invites.delete(player.uuid);
      return false;
    }

    party.invites.delete(player.uuid);
    this.addMember(party, player);
    return true;
  }
}

export const partyService = new PartyService();

const PartyHandlers = {
  'party:create': (_payload, ws) => {
    const player = getPlayerBySocket(ws.id);
    if (!player) {
      return;
    }

    const party = partyService.getPartyForPlayer(player.uuid) || partyService.createParty(player);
    partyService.sendPartyUpdate(party);
  },
  'party:leave': (_payload, ws) => {
    const player = getPlayerBySocket(ws.id);
    if (!player) {
      return;
    }

    const party = partyService.getPartyForPlayer(player.uuid);
    if (!party) {
      return;
    }

    const updatedParty = partyService.removePlayer(player.uuid);
    world.assignPlayerToScene(player, world.defaultTownId);
    if (player.path) {
      player.path.grid = null;
    }

    Socket.emit('party:update', {
      player: { socket_id: player.socket_id },
      party: null,
    });

    const town = world.getDefaultTown();
    Socket.emit('party:scene:transition', {
      player: { socket_id: player.socket_id },
      scene: partyService.buildScenePayload(town),
      party: null,
    });

    if (updatedParty) {
      partyService.sendPartyUpdate(updatedParty);
    }
  },
  'party:invite': (payload, ws) => {
    const player = getPlayerBySocket(ws.id);
    if (!player) {
      return;
    }

    const party = partyService.getPartyForPlayer(player.uuid);
    if (!party) {
      partyService.sendError(player, 'You need a party before inviting players.');
      return;
    }

    if (party.leaderId !== player.uuid) {
      partyService.sendError(player, 'Only the party leader can invite players.');
      return;
    }

    const targetName = payload && payload.data && payload.data.username;
    const targetPlayer = getPlayerByUsername(targetName);
    if (!targetPlayer) {
      partyService.sendError(player, 'That player is not online.');
      return;
    }

    if (partyService.getPartyForPlayer(targetPlayer.uuid)) {
      partyService.sendError(player, 'That player is already in a party.');
      return;
    }

    partyService.invitePlayer(party, player, targetPlayer);
  },
  'party:invite:accept': (payload, ws) => {
    const player = getPlayerBySocket(ws.id);
    if (!player) {
      return;
    }

    const partyId = payload && payload.data && payload.data.partyId;
    const party = partyService.getParty(partyId);
    if (!party) {
      partyService.sendError(player, 'That party no longer exists.');
      return;
    }

    const joined = partyService.acceptInvite(party, player);
    if (!joined) {
      partyService.sendError(player, 'The invitation has expired or is invalid.');
      return;
    }

    partyService.sendPartyUpdate(party);
    Socket.emit('party:update', {
      player: { socket_id: player.socket_id },
      party: partyService.getPartySnapshot(party),
    });
  },
  'party:invite:decline': (payload, ws) => {
    const player = getPlayerBySocket(ws.id);
    if (!player) {
      return;
    }

    const partyId = payload && payload.data && payload.data.partyId;
    const party = partyService.getParty(partyId);
    if (!party) {
      return;
    }

    party.invites.delete(player.uuid);
  },
  'party:ready': (_payload, ws) => {
    const player = getPlayerBySocket(ws.id);
    if (!player) {
      return;
    }

    const party = partyService.getPartyForPlayer(player.uuid);
    if (!party) {
      return;
    }

    partyService.toggleReady(party, player.uuid);
    partyService.sendPartyUpdate(party);
  },
  'party:startInstance': async (_payload, ws) => {
    const player = getPlayerBySocket(ws.id);
    if (!player) {
      return;
    }

    const party = partyService.getPartyForPlayer(player.uuid);
    if (!party) {
      partyService.sendError(player, 'You are not in a party.');
      return;
    }

    if (party.leaderId !== player.uuid) {
      partyService.sendError(player, 'Only the party leader can start an instance.');
      return;
    }

    if (!partyService.areAllReady(party)) {
      partyService.sendError(player, 'All party members must be ready.');
      return;
    }

    await partyService.startInstance(party, player);
  },
  'party:returnToTown': (_payload, ws) => {
    const player = getPlayerBySocket(ws.id);
    if (!player) {
      return;
    }

    const party = partyService.getPartyForPlayer(player.uuid);
    if (!party) {
      return;
    }

    if (party.leaderId !== player.uuid) {
      partyService.sendError(player, 'Only the party leader can disband an instance.');
      return;
    }

    partyService.returnToTown(party);
  },
};

export default PartyHandlers;
