<template>
  <div
    class="pane-host"
    :class="[`pane-host--${layoutMode}`]"
  >
    <transition
      name="pane-slide"
      appear
    >
      <aside
        v-if="showLeftPane"
        key="left"
        class="pane-host__side pane-host__side--left"
      >
        <PaneCard
          :title="leftPaneTitle"
          :aria-label="`${leftPaneTitle} panel`"
          :compressed="layoutMode !== 'desktop'"
        >
          <component
            :is="leftPaneComponent"
            v-if="leftPaneComponent"
            :game="game"
          />
        </PaneCard>
      </aside>
    </transition>

    <div class="pane-host__center">
      <slot />
    </div>

    <transition
      name="pane-slide"
      appear
    >
      <aside
        v-if="showRightPane"
        key="right"
        class="pane-host__side pane-host__side--right"
      >
        <PaneCard
          :title="rightPaneTitle"
          :aria-label="`${rightPaneTitle} panel`"
          :compressed="layoutMode !== 'desktop'"
        >
          <component
            :is="rightPaneComponent"
            v-if="rightPaneComponent"
            :game="game"
          />
        </PaneCard>
      </aside>
    </transition>

    <transition name="pane-overlay">
      <div
        v-if="showOverlay"
        class="pane-host__overlay"
        role="dialog"
        aria-modal="true"
        @click.self="$emit('overlay-close')"
      >
        <PaneCard
          ref="overlayCard"
          class="pane-host__overlay-card"
          :title="overlayTitle"
          :dismissible="true"
          :aria-label="`${overlayTitle} overlay`"
          @dismiss="$emit('overlay-close')"
        >
          <component
            :is="overlayComponent"
            v-if="overlayComponent"
            :game="game"
            v-bind="overlayPane && overlayPane.props ? overlayPane.props : {}"
          />
        </PaneCard>
      </div>
    </transition>
  </div>
</template>

<script>
import PaneCard from './PaneCard.vue';

export default {
  name: 'PaneHost',
  components: {
    PaneCard,
  },
  props: {
    layoutMode: {
      type: String,
      default: 'desktop',
    },
    game: {
      type: Object,
      required: true,
    },
    registry: {
      type: Object,
      default: () => ({}),
    },
    leftPane: {
      type: String,
      default: null,
    },
    rightPane: {
      type: String,
      default: null,
    },
    overlayPane: {
      type: Object,
      default: () => ({ id: null, title: '', props: {} }),
    },
  },
  emits: ['overlay-close'],
  computed: {
    paneRegistry() {
      return this.registry || {};
    },
    leftPaneEntry() {
      if (!this.leftPane) {
        return null;
      }
      return this.paneRegistry[this.leftPane] || null;
    },
    rightPaneEntry() {
      if (!this.rightPane) {
        return null;
      }
      return this.paneRegistry[this.rightPane] || null;
    },
    overlayPaneEntry() {
      if (!this.overlayPane || !this.overlayPane.id) {
        return null;
      }
      return this.paneRegistry[this.overlayPane.id] || null;
    },
    leftPaneComponent() {
      return this.leftPaneEntry && this.leftPaneEntry.component;
    },
    rightPaneComponent() {
      return this.rightPaneEntry && this.rightPaneEntry.component;
    },
    overlayComponent() {
      return this.overlayPaneEntry && this.overlayPaneEntry.component;
    },
    leftPaneTitle() {
      if (!this.leftPaneEntry) {
        return '';
      }
      return this.leftPaneEntry.title || this.capitalise(this.leftPane);
    },
    rightPaneTitle() {
      if (!this.rightPaneEntry) {
        return '';
      }
      return this.rightPaneEntry.title || this.capitalise(this.rightPane);
    },
    overlayTitle() {
      if (!this.overlayPaneEntry) {
        return '';
      }
      if (this.overlayPane && this.overlayPane.title) {
        return this.overlayPane.title;
      }
      return this.overlayPaneEntry.title || this.capitalise(this.overlayPane.id);
    },
    showLeftPane() {
      if (!this.leftPaneComponent) {
        return false;
      }
      return this.layoutMode === 'desktop';
    },
    showRightPane() {
      if (!this.rightPaneComponent) {
        return false;
      }
      return this.layoutMode === 'desktop';
    },
    showOverlay() {
      if (!this.overlayComponent) {
        return false;
      }
      if (this.layoutMode === 'desktop' && this.overlayPane && (this.overlayPane.id === this.leftPane || this.overlayPane.id === this.rightPane)) {
        return false;
      }
      return true;
    },
  },
  methods: {
    capitalise(value) {
      if (typeof value !== 'string') {
        return '';
      }
      return value.charAt(0).toUpperCase() + value.slice(1);
    },
  },
};
</script>

<style lang="scss" scoped>
@use '@/assets/scss/abstracts/tokens' as *;
@use '@/assets/scss/abstracts/breakpoints' as *;

.pane-host {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--space-lg);
  width: 100%;
  height: 100%;
  align-items: stretch;
  transition: grid-template-columns 160ms ease-out, gap 160ms ease-out;

  &--tablet,
  &--mobile {
    grid-template-columns: minmax(0, 1fr);
  }
}

.pane-host__side {
  display: flex;
  flex-direction: column;
  min-width: clamp(240px, 18vw, 320px);
  pointer-events: auto;

  &--left {
    align-items: stretch;
  }

  &--right {
    align-items: stretch;
  }
}

.pane-host__center {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xl);
  width: 100%;
}

.pane-host__overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 12, 18, 0.65);
  backdrop-filter: blur(12px);
  display: grid;
  align-items: center;
  justify-items: center;
  padding: var(--space-2xl) var(--space-lg);
  z-index: 40;
}

.pane-host__overlay-card {
  max-width: min(720px, 94vw);
  width: 100%;
}

@include media('<=tablet') {
  .pane-host__side {
    min-width: min(420px, 90vw);
  }
}

@include media('<=mobile') {
  .pane-host__overlay {
    padding: var(--space-lg) var(--space-md);
  }

  .pane-host__side {
    min-width: 100%;
  }
}

.pane-slide-enter-active,
.pane-slide-leave-active {
  transition: opacity 180ms ease-out, transform 180ms ease-out;
}

.pane-slide-enter-from,
.pane-slide-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.pane-overlay-enter-active,
.pane-overlay-leave-active {
  transition: opacity 200ms ease-out;
}

.pane-overlay-enter-from,
.pane-overlay-leave-to {
  opacity: 0;
}
</style>
