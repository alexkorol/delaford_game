import bus from '@/core/utilities/bus.js';
import { ABILITIES } from '@/core/config/combat/abilities.js';

const normaliseKey = (value, fallback = 'general') => {
  if (!value) {
    return fallback;
  }

  return String(value).toLowerCase();
};

const abilityLookup = ABILITIES.reduce((acc, ability) => {
  acc[ability.id] = ability;
  return acc;
}, {});

const effectLookup = ABILITIES.reduce((acc, ability) => {
  (ability.effects || []).forEach((effect) => {
    if (!effect || !effect.id) {
      return;
    }

    acc[effect.id] = {
      abilityId: ability.id,
      abilityName: ability.name,
      damageType: effect.damageType || null,
      category: ability.category || 'general',
    };
  });
  return acc;
}, {});

const DAMAGE_TYPE_CUES = {
  physical: {
    sound: 'combat.hit.physical',
    particle: 'impact-sparks',
    className: 'is-physical',
  },
  fire: {
    sound: 'combat.hit.fire',
    particle: 'ember-burst',
    className: 'is-fire',
  },
  poison: {
    sound: 'combat.hit.poison',
    particle: 'spore-cloud',
    className: 'is-poison',
  },
  frost: {
    sound: 'combat.hit.frost',
    particle: 'frost-shard',
    className: 'is-frost',
  },
  arcane: {
    sound: 'combat.hit.arcane',
    particle: 'arcane-flare',
    className: 'is-arcane',
  },
  heal: {
    sound: 'combat.heal',
    particle: 'healing-motes',
    className: 'is-heal',
  },
  general: {
    sound: 'combat.hit',
    particle: 'impact-generic',
    className: 'is-generic',
  },
};

const ABILITY_CATEGORY_CUES = {
  active: {
    sound: 'ability.cast.active',
    particle: 'ability-active',
    className: 'is-active',
  },
  passive: {
    sound: 'ability.cast.passive',
    particle: 'ability-passive',
    className: 'is-passive',
  },
  ultimate: {
    sound: 'ability.cast.ultimate',
    particle: 'ability-ultimate',
    className: 'is-ultimate',
  },
  general: {
    sound: 'ability.cast',
    particle: 'ability-general',
    className: 'is-general',
  },
};

export const resolveAbilityCategory = (abilityId) => {
  const ability = abilityLookup[abilityId];
  return ability?.category || 'general';
};

export const getAbilityDefinition = (abilityId) => abilityLookup[abilityId] || null;

export const resolveAbilityPrimaryDamageType = (abilityId) => {
  const ability = abilityLookup[abilityId];
  if (!ability) {
    return null;
  }

  const effectWithDamage = (ability.effects || []).find((effect) => effect.damageType);
  return effectWithDamage?.damageType || null;
};

export const resolveEffectMetadata = (effectId) => effectLookup[effectId] || null;

export const resolveDamageCue = (damageType, fallback = 'general') => {
  const key = normaliseKey(damageType, fallback);
  return DAMAGE_TYPE_CUES[key] || DAMAGE_TYPE_CUES[fallback] || DAMAGE_TYPE_CUES.general;
};

export const resolveAbilityCue = (abilityId) => {
  const category = resolveAbilityCategory(abilityId);
  const key = normaliseKey(category, 'general');
  const cue = ABILITY_CATEGORY_CUES[key] || ABILITY_CATEGORY_CUES.general;
  return { ...cue, category };
};

export const triggerSoundCue = (soundId) => {
  if (!soundId) {
    return;
  }

  bus.$emit('AUDIO:PLAY', { soundId });
};

export const triggerParticleCue = (options = {}) => {
  if (!options || !options.particle) {
    return;
  }

  bus.$emit('FX:PARTICLE', {
    particle: options.particle,
    entityId: options.entityId || null,
    category: options.category || null,
    damageType: options.damageType || null,
  });
};

export default {
  getAbilityDefinition,
  resolveAbilityCategory,
  resolveAbilityPrimaryDamageType,
  resolveEffectMetadata,
  resolveDamageCue,
  resolveAbilityCue,
  triggerSoundCue,
  triggerParticleCue,
};
