<template>
  <div
    class="wrapper game-container"
    @click.right.prevent="handleRightClick"
  >
    <PaneHost
      ref="paneHostRef"
      class="game-container__stage"
      :layout-mode="layoutMode"
      :game="game"
      :registry="paneRegistry"
      :left-pane="defaultLeftPane"
      :right-pane="defaultRightPane"
      :overlay-pane="activeOverlayDescriptor"
      @overlay-close="$emit('overlay-close')"
    >
      <div class="game-container__center">
        <div
          class="game-container__world-shell"
          :style="worldShellStyle"
        >
          <GameCanvas ref="canvasRef" :game="game" />
          <GameHUD
            :player-id="playerId"
            :party="party"
            :party-invites="partyInvites"
            :party-loading="partyLoading"
            :party-status-message="partyStatusMessage"
            :player-vitals="playerVitals"
            :quick-slots="quickSlots"
            :quickbar-active-index="quickbarActiveIndex"
            @quick-slot="handleQuickSlot"
            @request-remap="handleQuickbarRemap"
            @party-create="$emit('party-create')"
            @party-leave="$emit('party-leave')"
            @party-toggle-ready="$emit('party-toggle-ready')"
            @party-start-instance="$emit('party-start-instance')"
            @party-return-to-town="$emit('party-return-to-town')"
            @party-invite="$emit('party-invite', $event)"
            @party-accept-invite="$emit('party-accept-invite', $event)"
            @party-decline-invite="$emit('party-decline-invite', $event)"
          />
        </div>

        <div
          class="chat-shell"
          :class="chatShellClasses"
        >
          <button
            v-if="!isDesktop"
            type="button"
            class="chat-shell__toggle"
            @click="$emit('toggle-chat')"
          >
            <span class="chat-shell__toggle-label">
              {{ chatToggleLabel }}
            </span>
            <span
              v-if="chatUnreadCount > 0"
              class="chat-shell__badge"
            >
              {{ chatUnreadCount }}
            </span>
          </button>

          <Chatbox
            ref="chatboxRef"
            :game="game"
            :layout-mode="layoutMode"
            :pinned="chatPinned"
            :collapsed="!chatExpanded"
            :unread-count="chatUnreadCount"
            :auto-hide-seconds="chatAutoHideSeconds"
            @message-appended="$emit('chat-message', $event)"
            @toggle-pin="$emit('toggle-chat-pin')"
            @hover-state="$emit('chat-hover', $event)"
            @countdown-complete="$emit('chat-countdown-complete')"
          />
        </div>
      </div>
    </PaneHost>

    <ContextMenu :game="game" />
  </div>
</template>

<script>
import { computed, ref, toRefs } from 'vue';
import PaneHost from '../ui/panes/PaneHost.vue';
import GameCanvas from '../GameCanvas.vue';
import Chatbox from '../Chatbox.vue';
import ContextMenu from '../sub/ContextMenu.vue';
import GameHUD from './GameHUD.vue';

export default {
  name: 'GameContainer',
  components: {
    PaneHost,
    GameCanvas,
    Chatbox,
    ContextMenu,
    GameHUD,
  },
  props: {
    game: {
      type: Object,
      required: true,
    },
    layoutMode: {
      type: String,
      default: 'desktop',
    },
    paneRegistry: {
      type: Object,
      default: () => ({}),
    },
    defaultLeftPane: {
      type: String,
      default: null,
    },
    defaultRightPane: {
      type: String,
      default: null,
    },
    activeOverlayDescriptor: {
      type: Object,
      default: () => ({ id: null, title: '' }),
    },
    worldShellStyle: {
      type: Object,
      default: () => ({}),
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
    isDesktop: {
      type: Boolean,
      default: false,
    },
    chatShellClasses: {
      type: Object,
      default: () => ({}),
    },
    chatToggleLabel: {
      type: String,
      default: '',
    },
    chatUnreadCount: {
      type: Number,
      default: 0,
    },
    chatPinned: {
      type: Boolean,
      default: false,
    },
    chatExpanded: {
      type: Boolean,
      default: false,
    },
    chatAutoHideSeconds: {
      type: Number,
      default: 0,
    },
  },
  emits: [
    'right-click',
    'overlay-close',
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
    'toggle-chat',
    'toggle-chat-pin',
    'chat-hover',
    'chat-countdown-complete',
    'chat-message',
  ],
  setup(props, { emit, expose }) {
    const paneHostRef = ref(null);
    const chatboxRef = ref(null);
    const canvasRef = ref(null);
    const { game } = toRefs(props);

    const playerId = computed(() => (game.value && game.value.player ? game.value.player.uuid : null));

    const handleRightClick = (event) => {
      emit('right-click', event);
    };

    const handleQuickSlot = (slot, index) => {
      emit('quick-slot', slot, index);
    };

    const handleQuickbarRemap = (slot, index) => {
      emit('request-remap', slot, index);
    };

    const triggerSkill = (skillId, options = {}) => {
      if (!skillId) {
        return false;
      }

      const canvasComponent = canvasRef.value;
      if (canvasComponent && typeof canvasComponent.dispatchSkill === 'function') {
        canvasComponent.dispatchSkill(skillId, options);
        return true;
      }

      return false;
    };

    expose({ paneHostRef, chatboxRef, canvasRef, triggerSkill });

    return {
      paneHostRef,
      chatboxRef,
      canvasRef,
      playerId,
      handleRightClick,
      handleQuickSlot,
      handleQuickbarRemap,
      triggerSkill,
    };
  },
};
</script>

<style scoped lang="scss">
@use '@/assets/scss/abstracts/tokens' as *;

.game-container {
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
  align-items: stretch;
  position: relative;
  padding: clamp(1rem, 2.5vw, 3rem);
  width: 100%;
  min-height: 0;
  box-sizing: border-box;
  background: radial-gradient(circle at top, rgba(30, 36, 58, 0.92), rgba(10, 12, 22, 0.96));
  overflow: auto;
}

.game-container__stage {
  display: flex;
  flex: 1 1 auto;
}

.game-container__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  position: relative;
  gap: clamp(var(--space-lg), 3vw, var(--space-2xl));
}

.game-container__world-shell {
  --world-shell-padding: clamp(var(--space-lg), 3vw, var(--space-2xl));

  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--world-shell-padding);
  gap: clamp(var(--space-lg), 2vw, var(--space-xl));
  width: min(100%, var(--world-display-width, 100%));
  max-width: min(96vw, var(--world-display-width, 1200px));
  margin: 0 auto;
  border-radius: var(--radius-lg);
  background: rgba(8, 10, 20, 0.65);
  box-shadow: 0 32px 60px rgba(0, 0, 0, 0.55);
}

.game-container__world-shell::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(255, 255, 255, 0.06);
  pointer-events: none;
}

.game-container__world-shell::before {
  content: '';
  display: block;
  width: min(100%, var(--world-display-width, 100%));
  aspect-ratio: var(--map-aspect-ratio, 16 / 9);
}

.game-container__world-shell :deep(canvas) {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: var(--world-display-width, 100%);
  height: var(--world-display-height, auto);
  max-width: 100%;
  border-radius: var(--radius-md);
  outline: none;
}

.chat-shell {
  position: relative;
  display: flex;
  justify-content: flex-end;
  width: min(var(--world-display-width, 100%), 100%);
  margin: clamp(var(--space-lg), 3vw, var(--space-2xl)) auto 0;
  pointer-events: auto;
}

.chat-shell--desktop {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: clamp(var(--space-lg), 4vw, var(--space-2xl));
  padding: 0 clamp(var(--space-lg), 3vw, var(--space-2xl));
  width: min(var(--world-display-width, 100%), 100%);
  pointer-events: none;
}

.chat-shell--desktop :deep(.chatbox) {
  pointer-events: auto;
}

.chat-shell__toggle {
  position: absolute;
  right: clamp(var(--space-md), 4vw, var(--space-xl));
  bottom: clamp(var(--space-lg), 4vw, var(--space-2xl));
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: 999px;
  background: rgba(12, 16, 28, 0.82);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-subtle);
  cursor: pointer;
  box-shadow: var(--shadow-soft);
  z-index: 45;
}

.chat-shell--desktop .chat-shell__toggle {
  display: none;
}

.chat-shell--expanded:not(.chat-shell--desktop) .chat-shell__toggle {
  opacity: 0;
  pointer-events: none;
}

.chat-shell__toggle-label {
  font-size: var(--font-size-sm);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chat-shell__badge {
  min-width: 22px;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--color-accent);
  color: #020307;
  font-weight: 600;
  font-size: 0.75em;
  text-align: center;
}

@media (width <= 639px) {
  .game-container__center {
    gap: var(--space-lg);
  }

  .game-container__world-shell {
    --world-shell-padding: var(--space-md);

    max-width: 100%;
  }

  .chat-shell {
    position: relative;
    width: 100%;
    padding-bottom: var(--space-xl);
  }

  .chat-shell__toggle {
    right: var(--space-md);
    bottom: var(--space-md);
  }
}
</style>
