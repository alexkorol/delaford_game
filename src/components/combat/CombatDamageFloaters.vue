<template>
  <div class="combat-damage-floaters">
    <transition-group name="combat-damage-floater" tag="div">
      <div
        v-for="floater in floaters"
        :key="floater.id"
        class="combat-damage-floater"
        :class="floater.classes"
        :style="floater.style"
      >
        <span class="combat-damage-floater__value">{{ floater.value }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { mapStores } from 'pinia';

import { useCombatStore } from '@/stores/combat.js';
import {
  resolveDamageCue,
  resolveEffectMetadata,
  resolveAbilityCue,
  resolveAbilityPrimaryDamageType,
  triggerSoundCue,
  triggerParticleCue,
} from './fx.js';

const isPositiveNumber = (value) => Number.isFinite(value) && value !== 0;

export default {
  name: 'CombatDamageFloaters',
  props: {
    entityId: {
      type: [String, Number],
      default: null,
    },
    lifespanMs: {
      type: Number,
      default: 1400,
    },
  },
  data() {
    return {
      subscriptionEnsured: false,
      lastTimestamp: 0,
      floaters: [],
      timeouts: new Map(),
    };
  },
  computed: {
    ...mapStores(useCombatStore),
  },
  watch: {
    'combatStore.log': {
      handler(log) {
        this.ensureSubscription();
        this.processLog(log);
      },
      deep: true,
      immediate: true,
    },
    entityId() {
      this.reset();
    },
  },
  beforeUnmount() {
    this.reset();
  },
  methods: {
    ensureSubscription() {
      if (this.subscriptionEnsured) {
        return;
      }

      if (this.combatStore && typeof this.combatStore.ensureSubscriptions === 'function') {
        this.combatStore.ensureSubscriptions();
        this.subscriptionEnsured = true;
      }
    },
    processLog(log) {
      if (!Array.isArray(log)) {
        return;
      }

      log.forEach((event) => {
        if (!event) {
          return;
        }

        const timestamp = event.timestamp || Date.now();
        if (timestamp <= this.lastTimestamp) {
          return;
        }

        this.handleEvent(event);
        this.lastTimestamp = Math.max(this.lastTimestamp, timestamp);
      });
    },
    handleEvent(event) {
      if (!event || !event.kind) {
        return;
      }

      if (!this.matchesEntityFilter(event)) {
        return;
      }

      switch (event.kind) {
      case 'damage':
      case 'effect-damage':
        this.spawnDamageFloater(event, { damageType: this.resolveDamageType(event) });
        break;
      case 'effect-tick':
        if (event.tickType === 'damage') {
          this.spawnDamageFloater(event, { damageType: this.resolveDamageType(event) });
        } else if (event.tickType === 'heal') {
          this.spawnHealFloater(event);
        }
        break;
      case 'heal':
      case 'effect-heal':
        this.spawnHealFloater(event);
        break;
      case 'ai-action':
        if (event.action === 'cast' && event.abilityId) {
          this.handleAbilityCue(event);
        }
        break;
      case 'attack':
        if (isPositiveNumber(event.damage)) {
          this.spawnDamageFloater(
            { ...event, amount: event.damage },
            { damageType: event.damageType },
          );
        }
        break;
      default:
        break;
      }
    },
    matchesEntityFilter(event) {
      if (!this.entityId) {
        return true;
      }

      const filterId = String(this.entityId);
      const candidates = [
        event.targetId,
        event.sourceId,
        event.entityId,
        event.attackerId,
        event.defenderId,
      ];

      return candidates.some((candidate) => candidate != null && String(candidate) === filterId);
    },
    resolveDamageType(event) {
      if (event.damageType) {
        return event.damageType;
      }

      if (event.effectId) {
        const metadata = resolveEffectMetadata(event.effectId);
        if (metadata?.damageType) {
          return metadata.damageType;
        }

        if (metadata?.abilityId) {
          return resolveAbilityPrimaryDamageType(metadata.abilityId);
        }
      }

      if (event.abilityId) {
        return resolveAbilityPrimaryDamageType(event.abilityId);
      }

      return 'physical';
    },
    spawnDamageFloater(event, options = {}) {
      const amount = Math.abs(Number(event.amount ?? event.damage ?? 0));
      if (!isPositiveNumber(amount)) {
        return;
      }

      const damageType = options.damageType || 'physical';
      const cue = resolveDamageCue(damageType, 'general');
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const floater = {
        id,
        value: `-${Math.round(amount)}`,
        classes: ['combat-damage-floater--damage', cue.className],
        style: this.generateFloaterStyle(),
      };

      this.floaters.push(floater);
      triggerSoundCue(cue.sound);
      triggerParticleCue({
        particle: cue.particle,
        entityId: this.entityId || event.targetId || event.defenderId || null,
        damageType,
      });
      this.scheduleRemoval(id);
    },
    spawnHealFloater(event) {
      const amount = Math.abs(Number(event.amount ?? 0));
      if (!isPositiveNumber(amount)) {
        return;
      }

      const cue = resolveDamageCue('heal', 'heal');
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const floater = {
        id,
        value: `+${Math.round(amount)}`,
        classes: ['combat-damage-floater--heal', cue.className],
        style: this.generateFloaterStyle(),
      };

      this.floaters.push(floater);
      triggerSoundCue(cue.sound);
      triggerParticleCue({
        particle: cue.particle,
        entityId: this.entityId || event.targetId || null,
        damageType: 'heal',
      });
      this.scheduleRemoval(id);
    },
    handleAbilityCue(event) {
      const cue = resolveAbilityCue(event.abilityId);
      triggerSoundCue(cue.sound);
      triggerParticleCue({
        particle: cue.particle,
        entityId: this.entityId || event.sourceId || null,
        category: cue.category,
        damageType: this.resolveDamageType(event) || null,
      });
    },
    scheduleRemoval(id) {
      const timer = setTimeout(() => {
        this.removeFloater(id);
      }, this.lifespanMs);
      this.timeouts.set(id, timer);
    },
    removeFloater(id) {
      this.floaters = this.floaters.filter((floater) => floater.id !== id);
      const timer = this.timeouts.get(id);
      if (timer) {
        clearTimeout(timer);
        this.timeouts.delete(id);
      }
    },
    clearTimers() {
      this.timeouts.forEach((timer) => clearTimeout(timer));
      this.timeouts.clear();
    },
    reset() {
      this.clearTimers();
      this.floaters = [];
      this.lastTimestamp = 0;
    },
    generateFloaterStyle() {
      const horizontalOffset = (Math.random() - 0.5) * 40;
      const verticalOffset = Math.random() * -20;
      return {
        '--floater-translate-x': `${horizontalOffset.toFixed(2)}px`,
        '--floater-translate-y': `${verticalOffset.toFixed(2)}px`,
      };
    },
  },
};
</script>

<style scoped lang="scss">
@use '@/assets/scss/abstracts/tokens' as *;

.combat-damage-floaters {
  position: relative;
  width: 0;
  height: 0;
  pointer-events: none;
}

.combat-damage-floater {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(
    calc(-50% + var(--floater-translate-x, 0px)),
    calc(-48px + var(--floater-translate-y, 0px))
  );
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  font-size: var(--font-size-md);
  text-shadow: 0 0 12px rgba(0, 0, 0, 0.5);
  will-change: transform, opacity;
  opacity: 0;
}

.combat-damage-floater-enter-active,
.combat-damage-floater-leave-active {
  transition: transform 0.9s ease-out, opacity 0.9s ease-in;
}

.combat-damage-floater-enter-from,
.combat-damage-floater-leave-to {
  transform: translate(calc(-50% + var(--floater-translate-x, 0px)), 12px);
  opacity: 0;
}

.combat-damage-floater-enter-to,
.combat-damage-floater-leave-from {
  opacity: 1;
}

.combat-damage-floater__value {
  display: inline-block;
  padding: 0 var(--space-2xs);
}

.combat-damage-floater--damage {
  color: rgba(255, 128, 96, 0.95);
}

.combat-damage-floater--heal {
  color: rgba(120, 232, 160, 0.95);
}

.is-fire.combat-damage-floater--damage {
  color: rgba(255, 156, 96, 0.95);
  text-shadow: 0 0 14px rgba(255, 96, 0, 0.6);
}

.is-poison.combat-damage-floater--damage {
  color: rgba(160, 255, 160, 0.95);
  text-shadow: 0 0 14px rgba(120, 232, 120, 0.5);
}

.is-arcane.combat-damage-floater--damage {
  color: rgba(200, 180, 255, 0.95);
  text-shadow: 0 0 14px rgba(160, 120, 255, 0.55);
}

.is-frost.combat-damage-floater--damage {
  color: rgba(160, 220, 255, 0.95);
  text-shadow: 0 0 14px rgba(120, 180, 255, 0.55);
}

.is-heal.combat-damage-floater--heal {
  color: rgba(144, 255, 196, 0.95);
  text-shadow: 0 0 14px rgba(120, 255, 200, 0.45);
}
</style>
