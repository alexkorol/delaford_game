<template>
  <button
    class="hud-orb"
    :class="variant"
    type="button"
    :aria-label="`${label}: ${displayValue}`"
    @click="$emit('activate')"
  >
    <span class="hud-orb__label">{{ label }}</span>
    <span
      v-if="showMeter"
      class="hud-orb__value"
    >
      {{ displayValue }}
    </span>
  </button>
</template>

<script>
export default {
  name: 'HudOrb',
  props: {
    variant: {
      type: String,
      default: 'neutral',
    },
    label: {
      type: String,
      required: true,
    },
    current: {
      type: Number,
      default: 0,
    },
    max: {
      type: Number,
      default: 0,
    },
  },
  computed: {
    showMeter() {
      return Number.isFinite(this.max) && this.max > 0;
    },
    displayValue() {
      if (!this.showMeter) {
        return Math.round(this.current);
      }

      const current = Math.max(0, Math.round(this.current));
      const max = Math.max(0, Math.round(this.max));
      return `${current} / ${max}`;
    },
  },
};
</script>

<style lang="scss" scoped>
.hud-orb {
  --orb-diameter: clamp(60px, 8vw, 88px);

  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: var(--orb-diameter);
  height: var(--orb-diameter);
  border-radius: 50%;
  border: 3px solid rgba(0, 0, 0, 0.65);
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.35), rgba(0, 0, 0, 0.65));
  color: #fff;
  font-family: "GameFont", sans-serif;
  text-shadow: 1px 1px 0 #000;
  cursor: pointer;
  padding: 0.5rem;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.45);
  transition: transform 120ms ease-out, box-shadow 120ms ease-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.65);
  }

  &:focus-visible {
    outline: 3px solid rgba(255, 255, 255, 0.8);
    outline-offset: 3px;
  }

  &__label {
    font-size: clamp(12px, 1.4vw, 16px);
    letter-spacing: 0.06em;
  }

  &__value {
    margin-top: 0.15em;
    font-size: clamp(11px, 1.2vw, 14px);
  }

  &.hp {
    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.45), rgba(176, 10, 10, 0.9));
  }

  &.mp {
    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.45), rgba(38, 86, 214, 0.9));
  }
}
</style>
