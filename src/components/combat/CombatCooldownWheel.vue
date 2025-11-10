<template>
  <div class="combat-cooldown-wheel" :class="wheelClasses">
    <svg class="combat-cooldown-wheel__svg" viewBox="0 0 36 36">
      <circle
        class="combat-cooldown-wheel__bg"
        cx="18"
        cy="18"
        r="16"
      />
      <circle
        class="combat-cooldown-wheel__progress"
        cx="18"
        cy="18"
        r="16"
        :stroke-dasharray="dashArray"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <div class="combat-cooldown-wheel__content">
      <slot name="icon">
        <span class="combat-cooldown-wheel__label">{{ displayLabel }}</span>
      </slot>
      <span v-if="isCoolingDown" class="combat-cooldown-wheel__timer">{{ remainingSeconds }}</span>
    </div>
  </div>
</template>

<script>
import { mapStores } from 'pinia';

import { useCombatStore } from '@/stores/combat.js';
import { resolveAbilityCue, getAbilityDefinition } from './fx.js';

const formatSeconds = (ms) => {
  const seconds = Math.ceil(ms / 1000);
  return `${seconds}`;
};

export default {
  name: 'CombatCooldownWheel',
  props: {
    entityId: {
      type: [String, Number],
      required: true,
    },
    abilityId: {
      type: String,
      required: true,
    },
    abilityLabel: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      subscriptionEnsured: false,
    };
  },
  computed: {
    ...mapStores(useCombatStore),
    entity() {
      return this.combatStore.entities[this.entityId] || null;
    },
    abilityCooldown() {
      if (!this.entity) {
        return null;
      }

      const cooldowns = this.entity.cooldowns?.abilities
        || this.entity.combatState?.cooldowns?.abilities
        || {};

      const entry = cooldowns[this.abilityId];
      if (!entry) {
        return { duration: 0, remaining: 0 };
      }

      return {
        duration: Number(entry.duration ?? entry.total ?? 0),
        remaining: Number(entry.remaining ?? entry.time ?? 0),
      };
    },
    durationMs() {
      return Math.max(0, this.abilityCooldown?.duration || 0);
    },
    remainingMs() {
      return Math.max(0, Math.min(this.abilityCooldown?.remaining || 0, this.durationMs));
    },
    progress() {
      if (!this.durationMs) {
        return 0;
      }

      return Math.max(0, Math.min(1, this.remainingMs / this.durationMs));
    },
    dashArray() {
      const circumference = 2 * Math.PI * 16;
      return `${circumference}`;
    },
    dashOffset() {
      const circumference = 2 * Math.PI * 16;
      return `${(1 - this.progress) * circumference}`;
    },
    remainingSeconds() {
      if (!this.remainingMs) {
        return '';
      }

      return formatSeconds(this.remainingMs);
    },
    isCoolingDown() {
      return this.remainingMs > 0;
    },
    wheelCue() {
      return resolveAbilityCue(this.abilityId);
    },
    wheelClasses() {
      return ['combat-cooldown-wheel--active', this.wheelCue.className];
    },
    displayLabel() {
      if (this.abilityLabel) {
        return this.abilityLabel;
      }

      const ability = getAbilityDefinition(this.abilityId);
      return ability?.name || this.abilityId;
    },
  },
  watch: {
    combatStore: {
      handler() {
        this.ensureSubscription();
      },
      immediate: true,
    },
  },
  mounted() {
    this.ensureSubscription();
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
  },
};
</script>

<style scoped lang="scss">
@use '@/assets/scss/abstracts/tokens' as *;

.combat-cooldown-wheel {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: var(--size, 56px);
  height: var(--size, 56px);
  color: var(--surface-text-strong);
}

.combat-cooldown-wheel__svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.combat-cooldown-wheel__bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 3;
}

.combat-cooldown-wheel__progress {
  fill: none;
  stroke: rgba(255, 255, 255, 0.85);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 140ms ease-out;
}

.combat-cooldown-wheel__content {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  gap: var(--space-4xs);
  pointer-events: none;
}

.combat-cooldown-wheel__label {
  font-size: var(--font-size-2xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.combat-cooldown-wheel__timer {
  font-size: var(--font-size-xs);
  font-variant-numeric: tabular-nums;
}

.combat-cooldown-wheel--active.is-active .combat-cooldown-wheel__progress {
  stroke: rgba(80, 200, 255, 0.9);
}

.combat-cooldown-wheel--active.is-passive .combat-cooldown-wheel__progress {
  stroke: rgba(200, 160, 255, 0.9);
}

.combat-cooldown-wheel--active.is-ultimate .combat-cooldown-wheel__progress {
  stroke: rgba(255, 160, 80, 0.9);
}

.combat-cooldown-wheel--active.is-general .combat-cooldown-wheel__progress {
  stroke: rgba(255, 255, 255, 0.85);
}
</style>
