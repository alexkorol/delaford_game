<template>
  <div class="hud-shell">
    <PartyPanel
      v-if="playerId"
      class="hud-shell__party"
      :player-id="playerId"
      :party="party"
      :invites="partyInvites"
      :loading="partyLoading"
      :status-message="partyStatusMessage"
      @create="$emit('party-create')"
      @leave="$emit('party-leave')"
      @toggle-ready="$emit('party-toggle-ready')"
      @start-instance="$emit('party-start-instance')"
      @return-to-town="$emit('party-return-to-town')"
      @invite="$emit('party-invite', $event)"
      @accept-invite="$emit('party-accept-invite', $event)"
      @decline-invite="$emit('party-decline-invite', $event)"
    />
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
import PartyPanel from '../ui/world/PartyPanel.vue';

export default {
  name: 'GameHUD',
  components: {
    Quickbar,
    HudOrb,
    PartyPanel,
  },
  props: {
    playerId: {
      type: String,
      default: null,
    },
    party: {
      type: Object,
      default: null,
    },
    partyInvites: {
      type: Array,
      default: () => [],
    },
    partyLoading: {
      type: Object,
      default: () => ({ active: false, state: null }),
    },
    partyStatusMessage: {
      type: String,
      default: '',
    },
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
    'party-create',
    'party-leave',
    'party-toggle-ready',
    'party-start-instance',
    'party-return-to-town',
    'party-invite',
    'party-accept-invite',
    'party-decline-invite',
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
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: clamp(var(--space-lg), 4vw, var(--space-2xl));
  width: min(var(--world-display-width, 100%), 100%);
  max-width: min(96vw, var(--world-display-width, 1200px));
  padding: 0 clamp(var(--space-lg), 3vw, var(--space-2xl));
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: center;
  pointer-events: none;
}

.hud-shell__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: flex-end;
  gap: clamp(var(--space-md), 2vw, var(--space-xl));
  pointer-events: auto;
}

.hud-shell__party {
  margin-bottom: var(--space-sm);
  width: min(100%, 320px);
  pointer-events: auto;
}

.hud-shell__orb {
  filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.55));
}

.hud-shell__orb--left {
  grid-area: left;
}

.hud-shell__orb--right {
  grid-area: right;
}

.hud-shell__quickbar {
  grid-area: bar;
  transform: translateY(18px);
}

@media (width <= 1279px) {
  .hud-shell__row {
    gap: clamp(var(--space-sm), 2vw, var(--space-lg));
  }

  .hud-shell__quickbar {
    transform: translateY(12px);
  }
}

@media (width <= 639px) {
  .hud-shell {
    position: static;
    transform: none;
    width: 100%;
    max-width: 100%;
    padding: 0;
    margin-top: var(--space-lg);
  }

  .hud-shell__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas:
      'left right'
      'bar bar';
    width: 100%;
  }

  .hud-shell__quickbar {
    transform: none;
  }
}
</style>
