<template>
  <section
    class="pane-card"
    :class="{ 'pane-card--compressed': compressed }"
    :aria-label="ariaLabel"
  >
    <header class="pane-card__header">
      <h2 class="pane-card__title">{{ title }}</h2>
      <div class="pane-card__actions">
        <slot name="actions" />
        <button
          v-if="dismissible"
          class="pane-card__dismiss"
          type="button"
          @click="$emit('dismiss')"
        >
          <span class="sr-only">Close</span>
          ×
        </button>
      </div>
    </header>
    <div class="pane-card__body">
      <slot />
    </div>
  </section>
</template>

<script>
export default {
  name: 'PaneCard',
  props: {
    title: {
      type: String,
      default: '',
    },
    compressed: {
      type: Boolean,
      default: false,
    },
    dismissible: {
      type: Boolean,
      default: false,
    },
    ariaLabel: {
      type: String,
      default: '',
    },
  },
  emits: ['dismiss'],
};
</script>

<style lang="scss" scoped>
@use '@/assets/scss/abstracts/tokens' as *;

.pane-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: var(--radius-lg);
  background: linear-gradient(145deg, rgba(18, 21, 32, 0.92), rgba(12, 14, 22, 0.88));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 22px 40px rgba(0, 0, 0, 0.45);
  color: #f8f8f8;
  overflow: hidden;
}

.pane-card--compressed {
  border-radius: var(--radius-md);
}

.pane-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  gap: var(--space-md);
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.pane-card__title {
  font-family: 'GameFont', sans-serif;
  font-size: clamp(14px, 1.4vw, 18px);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0;
}

.pane-card__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.pane-card__dismiss {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(0, 0, 0, 0.35);
  color: inherit;
  border-radius: var(--radius-sm);
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 160ms ease-out, background 160ms ease-out;

  &:hover {
    border-color: rgba(255, 255, 255, 0.45);
    background: rgba(0, 0, 0, 0.55);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.85);
    outline-offset: 2px;
  }
}

.pane-card__body {
  padding: var(--space-lg);
  overflow: auto;
  max-height: min(72vh, 640px);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
