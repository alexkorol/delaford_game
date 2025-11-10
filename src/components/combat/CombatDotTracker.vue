<template>
  <div class="combat-dot-tracker">
    <transition-group
      name="combat-dot-track"
      tag="ul"
      class="combat-dot-tracker__list"
    >
      <li
        v-for="dot in dots"
        :key="dot.id"
        class="combat-dot-tracker__entry"
        :class="dot.classes"
      >
        <div class="combat-dot-tracker__meta">
          <span class="combat-dot-tracker__name">{{ dot.name }}</span>
          <span class="combat-dot-tracker__stacks" v-if="dot.stacks > 1">
            ×{{ dot.stacks }}
          </span>
        </div>
        <div class="combat-dot-tracker__bar">
          <div
            class="combat-dot-tracker__fill"
            :style="{ width: dot.progress }"
          />
        </div>
        <span class="combat-dot-tracker__timer">{{ dot.remaining }}</span>
      </li>
    </transition-group>
    <div
      v-if="!dots.length"
      class="combat-dot-tracker__empty"
    >
      <slot name="empty">No active damage over time effects</slot>
    </div>
  </div>
</template>

<script>
import { mapStores } from 'pinia';

import { useCombatStore } from '@/stores/combat.js';
import { resolveEffectMetadata, resolveDamageCue } from './fx.js';

const formatSeconds = (ms) => {
  const seconds = Math.max(0, Math.round(ms / 100) / 10);
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
};

const normaliseEffectName = (effect) => effect?.name || effect?.description || effect?.id || 'Effect';

export default {
  name: 'CombatDotTracker',
  props: {
    entityId: {
      type: [String, Number],
      required: true,
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
    activeEffects() {
      if (!this.entity) {
        return [];
      }

      const effects = Array.isArray(this.entity.activeEffects)
        ? this.entity.activeEffects
        : Array.isArray(this.entity.combatState?.activeEffects)
          ? this.entity.combatState.activeEffects
          : [];

      return effects.filter((effect) => effect && effect.type === 'damage');
    },
    dots() {
      return this.activeEffects.map((effect) => {
        const metadata = resolveEffectMetadata(effect.id) || {};
        const totalMs = Number(
          effect.totalDurationMs
          ?? effect.durationMs
          ?? effect.duration
          ?? effect.remaining
          ?? 0,
        );
        const remainingMs = Number(
          effect.remainingDurationMs
          ?? effect.remaining
          ?? effect.timeRemaining
          ?? 0,
        );
        const tickInterval = Number(effect.tickIntervalMs ?? effect.tickInterval ?? 0);
        const stacks = Number.isFinite(effect.stacks) ? Math.max(1, Math.round(effect.stacks)) : 1;
        const boundedRemaining = Number.isFinite(remainingMs) ? remainingMs : 0;
        const total = Number.isFinite(totalMs) ? totalMs : boundedRemaining;
        const remaining = total > 0 ? Math.min(boundedRemaining, total) : boundedRemaining;
        const progress = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
        const damageType = effect.damageType || metadata.damageType || 'general';
        const cue = resolveDamageCue(damageType, 'general');

        const displayRemaining = Math.max(0, remaining);

        return {
          id: effect.instanceId || `${effect.targetId || this.entityId}:${effect.id}`,
          name: normaliseEffectName(effect),
          progress: `${Math.round(progress * 100)}%`,
          remaining: formatSeconds(displayRemaining),
          stacks,
          tickInterval,
          classes: [cue.className],
        };
      });
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

.combat-dot-tracker {
  width: min(280px, 100%);
  padding: var(--space-xs);
  border-radius: var(--radius-md);
  background: rgba(10, 14, 20, 0.7);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(6px);
  color: var(--surface-text-strong);
}

.combat-dot-tracker__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2xs);
}

.combat-dot-tracker__entry {
  display: grid;
  gap: var(--space-3xs);
  padding: var(--space-3xs) var(--space-2xs);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.04);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.combat-dot-tracker__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3xs);
  justify-content: space-between;
  font-size: var(--font-size-xs);
  text-transform: uppercase;
}

.combat-dot-tracker__name {
  font-weight: 600;
}

.combat-dot-tracker__stacks {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.65);
}

.combat-dot-tracker__bar {
  position: relative;
  height: var(--space-2xs);
  border-radius: var(--radius-pill);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
}

.combat-dot-tracker__fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 136, 0, 0.85), rgba(255, 198, 0, 0.7));
  transition: width 160ms ease-out;
}

.combat-dot-tracker__timer {
  justify-self: end;
  font-size: var(--font-size-2xs);
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.6);
}

.combat-dot-tracker__empty {
  font-size: var(--font-size-xs);
  text-align: center;
  padding: var(--space-2xs) 0;
  color: rgba(255, 255, 255, 0.5);
}

.combat-dot-track-enter-active,
.combat-dot-track-leave-active {
  transition: all 160ms ease;
}

.combat-dot-track-enter-from,
.combat-dot-track-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.is-fire .combat-dot-tracker__fill {
  background: linear-gradient(90deg, rgba(255, 96, 0, 0.9), rgba(255, 196, 120, 0.7));
  box-shadow: 0 0 10px rgba(255, 128, 0, 0.45);
}

.is-poison .combat-dot-tracker__fill {
  background: linear-gradient(90deg, rgba(120, 232, 120, 0.9), rgba(180, 255, 180, 0.65));
  box-shadow: 0 0 10px rgba(120, 232, 120, 0.4);
}

.is-physical .combat-dot-tracker__fill {
  background: linear-gradient(90deg, rgba(200, 200, 200, 0.9), rgba(255, 255, 255, 0.6));
  box-shadow: 0 0 10px rgba(200, 200, 200, 0.4);
}

.is-generic .combat-dot-tracker__fill {
  background: linear-gradient(90deg, rgba(180, 180, 180, 0.9), rgba(240, 240, 240, 0.65));
}
</style>
