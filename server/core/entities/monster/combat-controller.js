import world from '#server/core/world.js';
import { DEFAULT_FACING_DIRECTION } from '#shared/combat.js';
import { DEFAULT_BEHAVIOUR } from '#server/core/entities/monster/stats-manager.js';
import { manhattanDistance, resolveDirection } from '#server/core/entities/monster/movement-handler.js';
import UI from '#shared/ui.js';

const rollDamage = (monster) => {
  const archetype = monster.archetype || {};
  const rarity = monster.rarity || {};
  const totals = monster.stats && monster.stats.attributes ? monster.stats.attributes.total : {};

  let min = archetype.damage && Number.isFinite(archetype.damage.baseMin)
    ? archetype.damage.baseMin
    : 1;
  let max = archetype.damage && Number.isFinite(archetype.damage.baseMax)
    ? archetype.damage.baseMax
    : min + 2;

  if (archetype.damage && Number.isFinite(archetype.damage.scalingPerStrength)) {
    const strength = totals.strength || 0;
    min += strength * (archetype.damage.scalingPerStrength * 0.5);
    max += strength * archetype.damage.scalingPerStrength;
  }

  if (archetype.damage && Number.isFinite(archetype.damage.scalingPerDexterity)) {
    const dexterity = totals.dexterity || 0;
    min += dexterity * (archetype.damage.scalingPerDexterity * 0.35);
    max += dexterity * archetype.damage.scalingPerDexterity;
  }

  if (archetype.damage && Number.isFinite(archetype.damage.scalingPerIntelligence)) {
    const intelligence = totals.intelligence || 0;
    min += intelligence * (archetype.damage.scalingPerIntelligence * 0.4);
    max += intelligence * archetype.damage.scalingPerIntelligence;
  }

  const damageMultiplier = (monster.behaviour && monster.behaviour.attack && monster.behaviour.attack.damageMultiplier)
    ? monster.behaviour.attack.damageMultiplier
    : 1;
  const rarityMultiplier = rarity.damageMultiplier || 1;

  min *= damageMultiplier * rarityMultiplier;
  max *= damageMultiplier * rarityMultiplier;

  const rolled = UI.getRandomInt(Math.max(1, Math.floor(min)), Math.max(1, Math.ceil(max)));
  return Math.max(1, rolled);
};

const resolveTarget = (monster, now = Date.now()) => {
  const scenePlayers = world.getScenePlayers(monster.sceneId);
  if (!scenePlayers.length) {
    monster.state.targetId = null;
    return null;
  }

  const aggressionRange = monster.behaviour.aggressionRange || DEFAULT_BEHAVIOUR.aggressionRange;
  const pursuitRange = monster.behaviour.pursuitRange || aggressionRange + 2;

  const currentTarget = monster.state.targetId
    ? scenePlayers.find(player => player && player.uuid === monster.state.targetId)
    : null;

  if (currentTarget && currentTarget.stats && currentTarget.stats.resources.health.current > 0) {
    const distance = manhattanDistance(monster, currentTarget);
    if (distance <= pursuitRange) {
      return currentTarget;
    }
  }

  const viable = scenePlayers
    .filter((player) => {
      if (!player || !player.stats || !player.stats.resources) {
        return false;
      }
      if (player.stats.resources.health.current <= 0) {
        return false;
      }
      const distance = manhattanDistance(monster, player);
      return distance <= aggressionRange;
    })
    .sort((a, b) => manhattanDistance(monster, a) - manhattanDistance(monster, b));

  const nextTarget = viable[0] || null;

  monster.state.targetId = nextTarget ? nextTarget.uuid : null;
  if (!nextTarget) {
    monster.state.mode = 'idle';
    monster.state.pendingAttack = null;
  }
  return nextTarget;
};

const tryAttack = (monster, target, now = Date.now()) => {
  if (!target || !monster.isAlive) {
    return false;
  }

  const attack = monster.behaviour.attack || DEFAULT_BEHAVIOUR.attack;
  const sinceLastAttack = now - (monster.state.lastAttackAt || 0);

  if (monster.state.pendingAttack && now >= monster.state.pendingAttack.resolveAt) {
    monster.combatController.resolvePendingAttack(now);
  }

  if (monster.state.pendingAttack) {
    return false;
  }

  if (sinceLastAttack < attack.intervalMs) {
    return false;
  }

  const distance = manhattanDistance(monster, target);
  if (distance > 1) {
    return false;
  }

  const direction = resolveDirection(monster, target) || monster.facing || DEFAULT_FACING_DIRECTION;
  monster.setFacing(direction);

  const damage = rollDamage(monster);
  const resolveAt = now + attack.windupMs;

  monster.setAnimationState('attack', {
    direction,
    duration: attack.windupMs,
    startedAt: now,
    holdState: 'idle',
    skillId: 'monster:attack',
  });

  monster.state.pendingAttack = {
    targetId: target.uuid,
    resolveAt,
    damage,
  };

  monster.state.lastAttackAt = now;
  return true;
};

const resolvePendingAttack = (monster, now = Date.now()) => {
  const payload = monster.state.pendingAttack;
  if (!payload) {
    return false;
  }

  const scenePlayers = world.getScenePlayers(monster.sceneId);
  const target = scenePlayers.find(player => player.uuid === payload.targetId);
  monster.state.pendingAttack = null;

  if (!target) {
    return false;
  }

  const distance = manhattanDistance(monster, target);
  if (distance > 1) {
    return false;
  }

  const nowTs = now;
  const result = target.applyDamage(payload.damage, { allowCheatDeath: true, now: nowTs });

  if (result) {
    target.setAnimationState('hurt', { direction: target.facing, startedAt: nowTs });
    // Stats broadcast handled by player logic
    if (result.type === 'death' || result.type === 'permadeath') {
      monster.state.mode = 'idle';
      monster.state.targetId = null;
    }
  }

  return result ? { target, result } : false;
};

const createMonsterCombatController = (monster) => ({
  rollDamage: () => rollDamage(monster),
  resolveTarget: now => resolveTarget(monster, now),
  tryAttack: (target, now) => tryAttack(monster, target, now),
  resolvePendingAttack: now => resolvePendingAttack(monster, now),
});

export default createMonsterCombatController;
