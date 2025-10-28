import Socket from '#server/socket.js';
import world from '#server/core/world.js';
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
} from '#shared/stats/index.js';

const clone = (value) => {
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
};

const getEquipmentAttributeTotals = (player) => {
  const totals = createAttributeMap(0);

  if (!player.wear) {
    return totals;
  }

  Object.values(player.wear).forEach((item) => {
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
};

const buildInitialStats = (player, data = {}) => {
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

  player.stats = createCharacterState({
    level: player.level,
    attributes: attributeSources,
    resources: resourceOverrides,
    lifecycle,
  });

  syncShortcuts(player.stats, player);
  return player.stats;
};

const refreshDerivedStats = (player, overrides = {}) => {
  if (!player.stats) {
    buildInitialStats(player, {});
  }

  const existingSources = (player.stats && player.stats.attributes && player.stats.attributes.sources) || {};

  const baseSource = overrides.base || existingSources.base || {};
  const bonusSource = overrides.bonuses || existingSources.bonuses || {};
  const equipmentSource = overrides.equipment || getEquipmentAttributeTotals(player);

  const aggregated = aggregateAttributes({
    base: baseSource,
    bonuses: bonusSource,
    equipment: equipmentSource,
  });

  const healthOverride = {
    current: player.hp && player.hp.current !== undefined ? player.hp.current : undefined,
    max: player.hp && player.hp.max !== undefined ? player.hp.max : undefined,
  };
  if (healthOverride.current === 0) {
    healthOverride.allowZero = true;
  }

  const manaOverride = {
    current: player.mana && player.mana.current !== undefined ? player.mana.current : undefined,
    max: player.mana && player.mana.max !== undefined ? player.mana.max : undefined,
  };

  const resources = computeResources(
    { level: player.level, attributes: aggregated.total },
    { health: healthOverride, mana: manaOverride },
  );

  player.stats.level = player.level;
  player.stats.attributes = aggregated;
  player.stats.resources = resources;

  syncShortcuts(player.stats, player);
  return player.stats;
};

const applyDamage = (player, amount, options = {}) => {
  if (!player.stats) {
    buildInitialStats(player, {});
  }

  const result = applyStatDamage(player.stats, amount, options);
  syncShortcuts(player.stats, player);
  return result;
};

const applyHealing = (player, amount, options = {}) => {
  if (!player.stats) {
    buildInitialStats(player, {});
  }

  const result = applyStatHealing(player.stats, amount, options);
  syncShortcuts(player.stats, player);
  return result;
};

const tryRespawn = (player, options = {}) => {
  if (!player.stats) {
    buildInitialStats(player, {});
  }

  const result = tryStatRespawn(player.stats, options);
  syncShortcuts(player.stats, player);
  return result;
};

export const broadcastStats = (player, players = null) => {
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
};

const createPlayerStatsManager = (player) => ({
  buildInitialStats: data => buildInitialStats(player, data),
  refreshDerivedStats: overrides => refreshDerivedStats(player, overrides),
  applyDamage: (amount, options) => applyDamage(player, amount, options),
  applyHealing: (amount, options) => applyHealing(player, amount, options),
  tryRespawn: options => tryRespawn(player, options),
  getEquipmentAttributeTotals: () => getEquipmentAttributeTotals(player),
});

export default createPlayerStatsManager;
