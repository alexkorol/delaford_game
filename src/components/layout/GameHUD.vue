<template>
  <div class="hud-shell">
    <div class="hud-shell__row">
      <HudOrb
        class="hud-shell__orb hud-shell__orb--left"
        variant="hp"
        label="HP"
        :current="playerVitals.hp.current"
        :max="playerVitals.hp.max"
      />
      <Quickbar
        class="hud-shell__quickbar"
        :slots="quickSlots"
        :active-index="quickbarActiveIndex"
        @slot-activate="handleSlotActivate"
        @request-remap="handleRequestRemap"
      />
      <HudOrb
        class="hud-shell__orb hud-shell__orb--right"
        variant="mp"
        label="MP"
        :current="playerVitals.mp.current"
        :max="playerVitals.mp.max"
      />
    </div>
  </div>
</template>

<script>
import Quickbar from '../hud/Quickbar.vue';
import HudOrb from '../hud/HudOrb.vue';

export default {
  name: 'GameHUD',
  components: {
    Quickbar,
    HudOrb,
  },
  props: {
    playerVitals: {
      type: Object,
      required: true,
    },
    quickSlots: {
      type: Array,
      default: () => [],
    },
    quickbarActiveIndex: {
      type: Number,
      default: null,
    },
  },
  emits: [
    'quick-slot',
    'request-remap',
  ],
  methods: {
    handleSlotActivate(slot, index) {
      this.$emit('quick-slot', slot, index);
    },
    handleRequestRemap(slot, index) {
      this.$emit('request-remap', slot, index);
    },
  },
};
</script>

<style scoped lang="scss">
@use '@/assets/scss/abstracts/tokens' as *;

.hud-shell {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: center;
  padding: 0 clamp(var(--space-md), 2vw, var(--space-xl));
  pointer-events: none;
}

.hud-shell__row {
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: clamp(var(--space-md), 2vw, var(--space-xl));
  padding: calc(var(--space-sm) * 1.25) var(--space-lg);
  border-radius: var(--radius-lg);
  background: rgba(18, 24, 48, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.55);
  pointer-events: auto;
}

.hud-shell__orb {
  flex: 0 0 auto;
  filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.55));
}

.hud-shell__quickbar {
  flex: 1 1 auto;
  margin: 0 var(--space-md);
  align-self: center;
}

@media (width <= 1279px) {
  .hud-shell__row {
    gap: clamp(var(--space-sm), 2vw, var(--space-lg));
  }
}

@media (width <= 767px) {
  .hud-shell__row {
    flex-direction: column;
    align-items: stretch;
  }

  .hud-shell__orb {
    align-self: center;
  }

  .hud-shell__quickbar {
    margin: var(--space-sm) 0 0;
  }
}
</style>
