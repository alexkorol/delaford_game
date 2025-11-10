<template>
  <div
    v-if="resolvedEntity"
    class="combat-health-bar"
    :class="healthBarClasses"
  >
    <div class="combat-health-bar__label">
      <slot name="label">
        {{ resolvedEntity.name || 'Unknown' }}
      </slot>
      <span v-if="showValues" class="combat-health-bar__values">
        {{ currentHealth }} / {{ maxHealth }}
      </span>
    </div>
    <div class="combat-health-bar__track">
      <div
        class="combat-health-bar__fill"
        :style="{ width: fillPercentage }"
      />
    </div>
  </div>
  <div v-else class="combat-health-bar combat-health-bar--placeholder">
    <div class="combat-health-bar__label">
      <slot name="placeholder-label">No entity</slot>
    </div>
    <div class="combat-health-bar__track">
      <div class="combat-health-bar__fill combat-health-bar__fill--empty" />
    </div>
  </div>
</template>

<script>
import { mapStores } from 'pinia';

import { useCombatStore } from '@/stores/combat.js';

export default {
  name: 'CombatHealthBar',
  props: {
    entityId: {
      type: [String, Number],
      default: null,
    },
    entity: {
      type: Object,
      default: null,
    },
    showValues: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      subscriptionEnsured: false,
    };
  },
  computed: {
    ...mapStores(useCombatStore),
    resolvedEntityId() {
      if (this.entity && this.entity.id) {
        return this.entity.id;
      }

      return this.entityId;
    },
    entityFromStore() {
      if (!this.resolvedEntityId) {
        return null;
      }

      return this.combatStore.entities[this.resolvedEntityId] || null;
    },
    resolvedEntity() {
      return this.entity || this.entityFromStore;
    },
    health() {
      if (!this.resolvedEntity) {
        return { current: 0, max: 1 };
      }

      const candidate = this.resolvedEntity.health
        || this.resolvedEntity.resources?.health
        || this.resolvedEntity.stats?.resources?.health
        || this.resolvedEntity.stats?.health
        || null;

      if (!candidate) {
        const current = Number(this.resolvedEntity?.healthCurrent ?? 0);
        const max = Number(this.resolvedEntity?.healthMax ?? 1);
        return {
          current: Number.isFinite(current) ? current : 0,
          max: Number.isFinite(max) && max > 0 ? max : 1,
        };
      }

      if (typeof candidate === 'number') {
        const max = Number(candidate) || 1;
        return { current: max, max };
      }

      const current = Number(candidate.current ?? candidate.value ?? 0);
      const max = Number(candidate.max ?? candidate.maximum ?? candidate.capacity ?? 1);
      return {
        current: Number.isFinite(current) ? current : 0,
        max: Number.isFinite(max) && max > 0 ? max : 1,
      };
    },
    currentHealth() {
      return Math.max(0, Math.round(this.health.current));
    },
    maxHealth() {
      return Math.max(1, Math.round(this.health.max));
    },
    fillRatio() {
      if (!this.maxHealth) {
        return 0;
      }

      return Math.min(1, Math.max(0, this.currentHealth / this.maxHealth));
    },
    fillPercentage() {
      return `${Math.round(this.fillRatio * 100)}%`;
    },
    healthBarClasses() {
      const percent = this.fillRatio * 100;
      if (percent <= 20) {
        return ['combat-health-bar--critical'];
      }
      if (percent <= 50) {
        return ['combat-health-bar--wounded'];
      }
      return ['combat-health-bar--healthy'];
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

.combat-health-bar {
  display: grid;
  gap: var(--space-2xs);
  width: min(100%, 320px);
  padding: var(--space-2xs) var(--space-xs);
  border-radius: var(--radius-md);
  background: rgba(12, 18, 24, 0.65);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(4px);
  color: var(--surface-text-strong);
}

.combat-health-bar__label {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.combat-health-bar__values {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.combat-health-bar__track {
  position: relative;
  height: var(--space-sm);
  border-radius: var(--radius-pill);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
}

.combat-health-bar__fill {
  height: 100%;
  transition: width 120ms ease-in;
  background: linear-gradient(90deg, rgba(220, 68, 68, 0.9), rgba(255, 136, 136, 0.9));
  box-shadow: 0 0 12px rgba(255, 64, 64, 0.45);
}

.combat-health-bar__fill--empty {
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
}

.combat-health-bar--healthy .combat-health-bar__fill {
  background: linear-gradient(90deg, rgba(68, 176, 104, 0.9), rgba(136, 232, 168, 0.9));
  box-shadow: 0 0 12px rgba(72, 208, 124, 0.45);
}

.combat-health-bar--wounded .combat-health-bar__fill {
  background: linear-gradient(90deg, rgba(232, 168, 64, 0.9), rgba(255, 212, 136, 0.9));
  box-shadow: 0 0 12px rgba(232, 168, 64, 0.45);
}

.combat-health-bar--critical .combat-health-bar__fill {
  background: linear-gradient(90deg, rgba(220, 68, 68, 0.9), rgba(255, 120, 120, 0.9));
  box-shadow: 0 0 12px rgba(220, 68, 68, 0.6);
}

.combat-health-bar--placeholder {
  opacity: 0.6;
}
</style>
