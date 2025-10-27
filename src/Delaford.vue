<template>
  <div id="app">
    <!-- Login screen -->
    <div
      v-show="!loaded || game.exit"
      class="wrapper login__screen"
    >
      <AudioMainMenu />
      <div
        v-if="screen === 'server-down'"
        class="bg server__down"
      >
        The game server is down. Please check the website for more information.
      </div>
      <div
        v-else
        class="bg"
      >
        <div
          v-if="screen === 'register'"
          class="register"
        >
          <p class="register__intro">
            To register an account, please visit
            <a href="https://delaford.com/register">this page</a>
            to get started and then come back. Once you have an account ID, reserve your in-world identity below.
          </p>
          <CharacterCreate />
        </div>
        <div
          v-if="screen === 'login'"
          class="login"
        >
          <img
            class="logo"
            src="./assets/logo.png"
            alt="Logo"
          >

          <Login />
        </div>
        <div v-if="screen === 'main'">
          <img
            class="logo"
            src="./assets/logo.png"
            alt="Logo"
          >

          <div class="button_group">
            <button
              class="login"
              @click="screen = 'login'"
            >
              Login
            </button>

            <button
              class="register"
              @click="screen = 'register'"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Game wrapper -->
    <div
      v-show="loaded && game.map"
      class="wrapper game__wrapper"
      @click.right="nothing"
    >
      <PaneHost
        ref="paneHost"
        class="game-stage"
        :layout-mode="layoutMode"
        :game="game"
        :registry="paneRegistryMap"
        :left-pane="defaultLeftPane"
        :right-pane="defaultRightPane"
        :overlay-pane="activeOverlayDescriptor"
        @overlay-close="closePane"
      >
        <div class="center-stack">
          <div
            class="world-shell"
            :style="worldShellStyle"
          >
            <GameCanvas :game="game" />

            <div class="hud-shell">
              <PartyPanel
                v-if="game && game.player"
                class="hud-shell__party"
                :player-id="game.player.uuid"
                :party="party"
                :invites="partyInvites"
                :loading="partyLoading"
                :status-message="partyStatusMessage"
                @create="handlePartyCreate"
                @leave="handlePartyLeave"
                @toggle-ready="handlePartyReadyToggle"
                @start-instance="handlePartyStartInstance"
                @return-to-town="handlePartyReturnToTown"
                @invite="handlePartyInviteRequest"
                @accept-invite="handlePartyAcceptInvite"
                @decline-invite="handlePartyDeclineInvite"
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
                  @slot-activate="handleQuickSlot"
                  @request-remap="handleQuickbarRemap"
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
          </div>

          <div
            class="chat-shell"
            :class="chatShellClasses"
          >
            <button
              v-if="!isDesktop"
              type="button"
              class="chat-shell__toggle"
              @click="toggleChat"
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
              ref="chatbox"
              :game="game"
              :layout-mode="layoutMode"
              :pinned="layout.chat.isPinned"
              :collapsed="!chatExpanded"
              :unread-count="chatUnreadCount"
              :auto-hide-seconds="chatAutoHideSeconds"
              @message-appended="handleChatMessage"
              @toggle-pin="toggleChatPin"
              @hover-state="handleChatHover"
              @countdown-complete="closeChat"
            />
          </div>
        </div>
      </PaneHost>

      <context-menu :game="game" />
    </div>
    <!-- End Game wrapper -->
  </div>
</template>

<script>
// Vue components
import config from '@server/config.js';
import GameCanvas from './components/GameCanvas.vue';
import Chatbox from './components/Chatbox.vue';
import Quickbar from './components/hud/Quickbar.vue';
import HudOrb from './components/hud/HudOrb.vue';
import PaneHost from './components/ui/panes/PaneHost.vue';
import StatsPane from './components/slots/Stats.vue';
import InventoryPane from './components/slots/Inventory.vue';
import WearPane from './components/slots/Wear.vue';
import FriendListPane from './components/slots/FriendList.vue';
import SettingsPane from './components/slots/Settings.vue';
import LogoutPane from './components/slots/Logout.vue';
import QuestsPane from './components/slots/Quests.vue';
import FlowerOfLifePane from './components/passives/FlowerOfLifePane.vue';
import PartyPanel from './components/ui/world/PartyPanel.vue';

// Sub Vue components
import ContextMenu from './components/sub/ContextMenu.vue';
import AudioMainMenu from './components/sub/AudioMainMenu.vue';
import Login from './components/ui/Login.vue';
import CharacterCreate from './components/ui/auth/CharacterCreate.vue';

// Core assets
import Client from './core/client.js';
import Engine from './core/engine.js';
import bus from './core/utilities/bus.js';
import Event from './core/player/events.js';
import MovementController from './core/utilities/movement-controller.js';
import { now } from './core/config/movement.js';
import Socket from './core/utilities/socket.js';

const createDefaultQuickSlots = () => Array.from(
  { length: 8 },
  (_value, index) => ({
    id: `slot-${index + 1}`,
    label: `Empty Slot ${index + 1}`,
    hotkey: `${index + 1}`,
    icon: '',
  }),
);

const paneRegistry = {
  stats: { component: StatsPane, title: 'Stats', slot: 'left' },
  inventory: { component: InventoryPane, title: 'Inventory', slot: 'right' },
  wear: { component: WearPane, title: 'Equipment' },
  friendlist: { component: FriendListPane, title: 'Friends' },
  settings: { component: SettingsPane, title: 'Settings' },
  logout: { component: LogoutPane, title: 'Logout' },
  quests: { component: QuestsPane, title: 'Quests' },
  flowerOfLife: { component: FlowerOfLifePane, title: 'Flower of Life' },
};

const defaultPaneAssignments = {
  left: 'stats',
  right: 'inventory',
};

const DEFAULT_CHAT_PREVIEW = 'Welcome to Delaford.';
const DEFAULT_CHAT_AUTOHIDE_SECONDS = 8;

export default {
  name: 'Delaford',
  components: {
    GameCanvas,
    Chatbox,
    Quickbar,
    HudOrb,
    PaneHost,
    ContextMenu,
    Login,
    AudioMainMenu,
    CharacterCreate,
    PartyPanel,
  },
  data() {
    return {
      config,
      loaded: false,
      game: { exit: true },
      screen: 'login',
      layout: {
        activePane: null,
        chat: {
          isPinned: false,
          isOpen: false,
          unreadCount: 0,
          preview: DEFAULT_CHAT_PREVIEW,
        },
      },
      quickSlots: createDefaultQuickSlots(),
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
      viewportResizeRaf: null,
      bodyOverflowBackup: '',
      quickbarActiveIndex: null,
      quickbarFlashTimeout: null,
      party: null,
      partyInvites: [],
      partyLoading: { active: false, state: null },
      partyStatusMessage: '',
      partyStatusTimeout: null,
    };
  },
  computed: {
    layoutMode() {
      if (this.viewportWidth < 768) {
        return 'mobile';
      }
      if (this.viewportWidth < 1200) {
        return 'tablet';
      }
      return 'desktop';
    },
    isDesktop() {
      return this.layoutMode === 'desktop';
    },
    playerVitals() {
      const fallback = {
        hp: { current: 0, max: 0 },
        mp: { current: 0, max: 0 },
      };
      const player = this.game && this.game.player;
      if (!player) {
        return fallback;
      }

      const firstDefined = (candidates, defaultValue) => {
        for (let index = 0; index < candidates.length; index += 1) {
          const value = candidates[index];
          if (value !== undefined && value !== null) {
            return value;
          }
        }
        return defaultValue;
      };

      const normaliseMeter = (meter, fallbackMax) => {
        if (!meter || typeof meter !== 'object') {
          return { current: 0, max: fallbackMax || 0 };
        }

        const currentSource = firstDefined([meter.current, meter.value, meter.amount], 0);
        const maxSource = firstDefined([meter.max, meter.maximum, meter.capacity, fallbackMax], fallbackMax || 0);

        const current = Number(currentSource);
        const max = Number(maxSource);

        return {
          current: Number.isFinite(current) ? current : 0,
          max: Number.isFinite(max) ? max : 0,
        };
      };

      const stats = player.stats || {};
      const resources = stats.resources || {};
      const hpSource = player.hp || player.health || resources.health || stats.hp;
      const mpSource = player.mp || player.mana || resources.mana || stats.mp;

      const hpMax = resources.health && Number.isFinite(resources.health.max)
        ? resources.health.max
        : stats.hp && stats.hp.max
          ? stats.hp.max
          : 0;

      const mpMax = resources.mana && Number.isFinite(resources.mana.max)
        ? resources.mana.max
        : stats.mp && stats.mp.max
          ? stats.mp.max
          : 0;

      return {
        hp: normaliseMeter(hpSource, hpMax),
        mp: normaliseMeter(mpSource, mpMax),
      };
    },
    chatExpanded() {
      return this.layout.chat.isOpen || this.layout.chat.isPinned;
    },
    chatUnreadCount() {
      return this.layout.chat.unreadCount;
    },
    chatToggleLabel() {
      return this.chatExpanded ? 'Hide chat' : 'Show chat';
    },
    chatAutoHideSeconds() {
      return this.isDesktop ? 0 : DEFAULT_CHAT_AUTOHIDE_SECONDS;
    },
    paneRegistryMap() {
      return paneRegistry;
    },
    defaultLeftPane() {
      return defaultPaneAssignments.left;
    },
    defaultRightPane() {
      return defaultPaneAssignments.right;
    },
    activeOverlayDescriptor() {
      const id = this.layout.activePane;
      if (!id || !paneRegistry[id]) {
        return { id: null, title: '' };
      }
      const entry = paneRegistry[id];
      return {
        id,
        title: entry.title || '',
      };
    },
    isOverlayBlocking() {
      const { id } = this.activeOverlayDescriptor;
      if (!id) {
        return false;
      }
      if (this.isDesktop && [this.defaultLeftPane, this.defaultRightPane].includes(id)) {
        return false;
      }
      return true;
    },
    chatShellClasses() {
      return {
        'chat-shell--desktop': this.isDesktop,
        'chat-shell--expanded': this.chatExpanded,
        'chat-shell--pinned': this.layout.chat.isPinned,
      };
    },
    worldShellStyle() {
      const mapInstance = this.game && this.game.map ? this.game.map : null;
      const runtimeConfig = mapInstance && mapInstance.config
        ? mapInstance.config.map
        : this.config.map;
      const { tile } = runtimeConfig.tileset;
      const { viewport } = runtimeConfig;
      const width = tile.width * viewport.x;
      const height = tile.height * viewport.y;
      const scale = mapInstance && typeof mapInstance.scale === 'number' ? mapInstance.scale : 1;
      const displayWidth = width * scale;
      const displayHeight = height * scale;
      return {
        '--map-aspect-ratio': `${width} / ${height}`,
        '--world-internal-width': `${width}px`,
        '--world-internal-height': `${height}px`,
        '--world-display-width': `${displayWidth}px`,
        '--world-display-height': `${displayHeight}px`,
      };
    },
  },
  watch: {
    isOverlayBlocking(isOverlay) {
      if (typeof document === 'undefined') {
        return;
      }

      if (isOverlay) {
        if (!this.bodyOverflowBackup) {
          this.bodyOverflowBackup = document.body.style.overflow;
        }
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = this.bodyOverflowBackup || '';
        this.bodyOverflowBackup = '';
      }
    },
    layoutMode(newMode, oldMode) {
      if (newMode === oldMode) {
        return;
      }
      if (newMode === 'desktop') {
        this.layout.chat.isOpen = true;
        if (!this.layout.chat.isPinned) {
          this.cancelChatAutohide();
        }
      } else if (!this.layout.chat.isPinned) {
        this.layout.chat.isOpen = false;
        this.cancelChatAutohide();
      }
    },
  },
  /**
   * WebSocket event handler
   */
  created() {
    const context = this;

    // Reload window upon Socket close
    window.ws.onclose = () => setTimeout(() => window.location.reload(), 1000);

    window.ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      const eventName = data.event;

      const canRefresh = ['world', 'player', 'item'].some((e) => eventName.split(':').includes(e));
      // Did the game canvas change that we need
      // to refresh the first context action?
      if (data && eventName && canRefresh) {
        bus.$emit('canvas:reset-context-menu');
      }

      if (eventName !== undefined) {
        if (!Event[eventName]) {
          bus.$emit(eventName, data);
        } else {
          Event[eventName](data, context);
        }
      } else {
        console.log(data);
      }
    };

    // On server connection error,
    // show the appropriate screen
    window.ws.onerror = () => {
      this.screen = 'server-down';
    };

    this.handleFlowerPaneOpen = () => {
      this.openPane('flowerOfLife');
    };

    bus.$on('show-sidebar', this.showSidebar);
    bus.$on('flower-of-life:open', this.handleFlowerPaneOpen);

    // On logout, let's do a few things...
    bus.$on('player:logout', this.logout);
    bus.$on('go:main', this.cancelLogin);
  },
  mounted() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onViewportResize, { passive: true });
      window.addEventListener('keydown', this.handleGlobalKeydown);
    }

    if (this.isDesktop) {
      this.layout.chat.isOpen = true;
    }
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onViewportResize);
      window.removeEventListener('keydown', this.handleGlobalKeydown);
      if (this.viewportResizeRaf) {
        window.cancelAnimationFrame(this.viewportResizeRaf);
        this.viewportResizeRaf = null;
      }
    }

    if (typeof document !== 'undefined') {
      document.body.style.overflow = this.bodyOverflowBackup || '';
      this.bodyOverflowBackup = '';
    }

    if (typeof window !== 'undefined') {
      if (this.quickbarFlashTimeout) {
        window.clearTimeout(this.quickbarFlashTimeout);
        this.quickbarFlashTimeout = null;
      }
    }

    if (this.partyStatusTimeout) {
      clearTimeout(this.partyStatusTimeout);
      this.partyStatusTimeout = null;
    }

    bus.$off('flower-of-life:open', this.handleFlowerPaneOpen);

    if (this.game && this.game.map && typeof this.game.map.destroy === 'function') {
      this.game.map.destroy();
    }
  },
  methods: {
    /**
     * Logout player
     */
    logout() {
      if (this.game && this.game.map && typeof this.game.map.destroy === 'function') {
        this.game.map.destroy();
      }
      this.screen = 'login';
      this.game = { exit: true };
      this.layout.activePane = null;
      this.resetChatState();
      this.party = null;
      this.partyInvites = [];
      this.partyLoading = { active: false, state: null };
      this.partyStatusMessage = '';
      if (this.partyStatusTimeout) {
        clearTimeout(this.partyStatusTimeout);
        this.partyStatusTimeout = null;
      }
    },

    /**
      * Cancel login
      */

    cancelLogin() {
      this.screen = 'main';
      this.layout.activePane = null;
      this.resetChatState();
    },

    resetChatState() {
      this.cancelChatAutohide();
      this.layout.chat.isOpen = false;
      this.layout.chat.isPinned = false;
      this.layout.chat.unreadCount = 0;
      this.layout.chat.preview = DEFAULT_CHAT_PREVIEW;
    },

    onViewportResize() {
      if (typeof window === 'undefined') {
        return;
      }

      if (this.viewportResizeRaf) {
        window.cancelAnimationFrame(this.viewportResizeRaf);
      }

      this.viewportResizeRaf = window.requestAnimationFrame(() => {
        this.viewportResizeRaf = null;
        this.viewportWidth = window.innerWidth;
      });
    },

    handleQuickSlot(slot, index) {
      if (!slot) {
        return;
      }

      bus.$emit('quickbar:activate', {
        slot,
        index,
        game: this.game,
      });
      this.flashQuickbarSlot(index);
    },

    handleQuickbarRemap(slot, index) {
      bus.$emit('quickbar:remap', {
        slot,
        index,
        game: this.game,
      });
    },

    requestPane(pane) {
      if (!pane) {
        return;
      }
      this.openPane(pane);
    },

    openPane(pane) {
      bus.$emit('contextmenu:close');
      if (this.isDesktop && ['stats', 'inventory'].includes(pane)) {
        this.layout.activePane = null;
        return;
      }
      if (this.layout.activePane === pane) {
        this.closePane();
        return;
      }

      this.layout.activePane = pane;
      this.$nextTick(() => {
        this.focusActivePane();
      });
    },

    closePane() {
      this.layout.activePane = null;
    },

    flashQuickbarSlot(index) {
      if (typeof window === 'undefined') {
        this.quickbarActiveIndex = index;
        return;
      }

      this.quickbarActiveIndex = index;
      if (this.quickbarFlashTimeout) {
        window.clearTimeout(this.quickbarFlashTimeout);
      }
      this.quickbarFlashTimeout = window.setTimeout(() => {
        this.quickbarActiveIndex = null;
        this.quickbarFlashTimeout = null;
      }, 200);
    },

    handleChatMessage(message = {}) {
      const preview = this.formatChatPreview(message);
      if (preview) {
        this.layout.chat.preview = preview;
      }

      if (!this.chatExpanded) {
        this.layout.chat.unreadCount += 1;
      } else {
        this.layout.chat.unreadCount = 0;
        if (!this.layout.chat.isPinned) {
          this.scheduleChatAutoHide();
        }
      }
    },

    handleChatHover(isHovering) {
      if (isHovering) {
        this.cancelChatAutohide();
      } else {
        this.scheduleChatAutoHide();
      }
    },

    formatChatPreview(message) {
      if (!message || !message.text) {
        return this.layout.chat.preview;
      }

      const text = String(message.text).trim();
      if (!text) {
        return this.layout.chat.preview;
      }

      if (message.type === 'chat' && message.username) {
        return `${message.username}: ${text}`;
      }

      return text;
    },

    toggleChat() {
      if (this.chatExpanded) {
        this.closeChat();
      } else {
        this.openChat();
      }
    },

    toggleChatPin() {
      this.layout.chat.isPinned = !this.layout.chat.isPinned;
      if (this.layout.chat.isPinned) {
        if (!this.layout.chat.isOpen) {
          this.openChat();
        } else {
          this.cancelChatAutohide();
        }
      } else if (this.layout.chat.isOpen) {
        this.scheduleChatAutoHide();
      }
    },

    openChat() {
      this.layout.chat.isOpen = true;
      this.layout.chat.unreadCount = 0;
      this.cancelChatAutohide();
      this.focusChatInput();
      if (!this.layout.chat.isPinned) {
        this.scheduleChatAutoHide();
      }
    },

    closeChat() {
      if (this.layout.chat.isPinned) {
        return;
      }
      this.layout.chat.isOpen = false;
      this.cancelChatAutohide();
    },

    scheduleChatAutoHide() {
      if (!this.layout.chat.isOpen || this.layout.chat.isPinned) {
        return;
      }
      if (this.chatAutoHideSeconds <= 0) {
        return;
      }

      const chatComponent = this.$refs.chatbox;
      if (chatComponent && typeof chatComponent.startCountdown === 'function') {
        chatComponent.startCountdown();
      }
    },

    cancelChatAutohide() {
      const chatComponent = this.$refs.chatbox;
      if (chatComponent && typeof chatComponent.stopCountdown === 'function') {
        chatComponent.stopCountdown();
      }
    },

    focusChatInput() {
      this.$nextTick(() => {
        const chatComponent = this.$refs.chatbox;
        if (!chatComponent) {
          return;
        }

        const root = chatComponent.$el || chatComponent;
        if (!root || typeof root.querySelector !== 'function') {
          return;
        }

        const input = root.querySelector('.chatbox__input');
        if (input && typeof input.focus === 'function') {
          input.focus();
        }
      });
    },

    activateQuickSlot(index) {
      const slot = this.quickSlots[index];
      if (!slot) {
        return;
      }
      this.handleQuickSlot(slot, index);
    },

    shouldIgnoreHotkeys(event) {
      const target = event && event.target;
      if (!target) {
        return false;
      }

      if (target.isContentEditable) {
        return true;
      }

      const { tagName } = target;
      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);
    },

    focusActivePane() {
      const paneHost = this.$refs.paneHost;
      if (!paneHost || !paneHost.$refs) {
        return;
      }

      const focusTargets = [];
      if (paneHost.$refs.overlayCard) {
        focusTargets.push(paneHost.$refs.overlayCard);
      }

      const selectors = [
        'button',
        '[href]',
        'input',
        'select',
        'textarea',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      const getHostElement = (targetRef) => {
        if (!targetRef) {
          return null;
        }
        const candidate = Array.isArray(targetRef) ? targetRef[0] : targetRef;
        if (candidate instanceof HTMLElement) {
          return candidate;
        }
        if (candidate && candidate.$el instanceof HTMLElement) {
          return candidate.$el;
        }
        return null;
      };

      for (let i = 0; i < focusTargets.length; i += 1) {
        const element = getHostElement(focusTargets[i]);
        if (element) {
          const focusable = element.querySelector(selectors);
          if (focusable && typeof focusable.focus === 'function') {
            focusable.focus();
            break;
          }
        }
      }
    },

    handleGlobalKeydown(event) {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === 'Escape' || event.key === 'Esc') {
        if (this.layout.activePane) {
          event.stopPropagation();
          this.closePane();
          return;
        }

        if (this.chatExpanded && !this.layout.chat.isPinned) {
          event.stopPropagation();
          this.closeChat();
        }
        return;
      }

      if (/^[1-8]$/.test(event.key)) {
        if (this.shouldIgnoreHotkeys(event)) {
          return;
        }
        const slotIndex = Number(event.key) - 1;
        this.activateQuickSlot(slotIndex);
        event.preventDefault();
        return;
      }

      if (event.key === '/' && !this.shouldIgnoreHotkeys(event)) {
        this.openChat();
        event.preventDefault();
      }
    },

    /**
     * Player movement, do something
     */
    playerMovement(data, meta = {}) {
      if (!this.game || !this.game.player) {
        return;
      }

      const payload = { ...data };
      if (payload.inventory && payload.inventory.slots) {
        payload.inventory = payload.inventory.slots;
      }

      const { player } = this.game;
      const isLocalPlayer = player.uuid === payload.uuid;

      const step = payload.movementStep || null;
      const stepSequence = step && typeof step.sequence === 'number' ? step.sequence : null;
      const animationMeta = meta.animation || payload.animation || null;

      const messageMeta = {
        sentAt: typeof meta.sentAt === 'number' ? meta.sentAt : null,
        receivedAt: now(),
      };

      const processEntity = (entity, controller) => {
        const lastSequence = typeof entity.lastMovementSequence === 'number'
          ? entity.lastMovementSequence
          : null;

        if (lastSequence !== null && stepSequence !== null && stepSequence <= lastSequence) {
          return { controller, accepted: false };
        }

        const applied = controller.applyServerStep(payload.x, payload.y, step, messageMeta);

        if (stepSequence !== null) {
          entity.lastMovementSequence = stepSequence;
        }

        return { controller, accepted: applied !== false };
      };

      if (isLocalPlayer) {
        if (!player.movement) {
          player.movement = new MovementController().initialise(player.x, player.y);
        }

        const { controller, accepted } = processEntity(player, player.movement);

        if (!accepted) {
          return;
        }

        if (accepted) {
          if (!Array.isArray(player.optimisticQueue)) {
            player.optimisticQueue = [];
          }

          if (player.optimisticQueue.length) {
            const matchIndex = player.optimisticQueue.findIndex((entry) => (
              entry.x === payload.x && entry.y === payload.y
            ));

            if (matchIndex !== -1) {
              player.optimisticQueue.splice(0, matchIndex + 1);
            } else if (step && step.blocked) {
              player.optimisticQueue = [];
              if (typeof this.game.resetOptimisticMovement === 'function') {
                this.game.resetOptimisticMovement();
              }
            }
          }

          player.optimisticTarget = null;
          player.optimisticPosition = { x: payload.x, y: payload.y };

          if (typeof this.game.advanceOptimisticMovement === 'function') {
            this.game.advanceOptimisticMovement();
          }
        }

        Object.assign(player, payload, {
          movement: controller,
        });
        if (animationMeta) {
          this.game.updateActorAnimation(player, animationMeta);
        } else {
          this.game.ensureAnimationController(player);
        }
        this.game.map.player = player;
      } else {
        const playerIndex = this.game.map.players.findIndex((p) => p.uuid === payload.uuid);

        if (playerIndex === -1) {
          const newcomerController = new MovementController().initialise(payload.x, payload.y);
          newcomerController.applyServerStep(payload.x, payload.y, step, messageMeta);

          const newcomer = {
            ...payload,
            movement: newcomerController,
            lastMovementSequence: stepSequence,
          };
          this.game.updateActorAnimation(newcomer, animationMeta || payload.animation);
          this.game.map.players.push(newcomer);
          return;
        }

        const existing = this.game.map.players[playerIndex] || {};
        const controller = existing.movement
          || new MovementController().initialise(payload.x, payload.y);
        const { accepted } = processEntity(existing, controller);

        if (!accepted) {
          return;
        }

        const updated = {
          ...existing,
          ...payload,
          movement: controller,
          lastMovementSequence: stepSequence !== null
            ? stepSequence
            : existing.lastMovementSequence,
          animationController: existing.animationController,
        };
        if (animationMeta) {
          this.game.updateActorAnimation(updated, animationMeta);
        } else {
          this.game.ensureAnimationController(updated);
        }
        this.$set(this.game.map.players, playerIndex, updated);
      }
    },

    /**
     * On NPC movement, update NPCs
     */
    npcMovement(data, meta = {}) {
      if (!this.game || !this.game.map) {
        return;
      }

      this.game.map.setNPCs(data, meta);
      this.game.npcs = this.game.map.npcs;
    },

    monsterState(data, meta = {}) {
      if (!this.game || !this.game.map) {
        return;
      }

      this.game.map.setMonsters(data, meta);
      this.game.monsters = this.game.map.monsters;
    },

    pruneExpiredInvites() {
      const now = Date.now();
      this.partyInvites = this.partyInvites.filter((invite) => !invite.expiresAt || invite.expiresAt > now);
    },

    setPartyStatusMessage(message, duration = 4000) {
      if (this.partyStatusTimeout) {
        clearTimeout(this.partyStatusTimeout);
        this.partyStatusTimeout = null;
      }

      this.partyStatusMessage = message || '';

      if (message) {
        this.partyStatusTimeout = setTimeout(() => {
          this.partyStatusMessage = '';
          this.partyStatusTimeout = null;
        }, duration);
      }
    },

    handlePartyCreate() {
      Socket.emit('party:create');
    },

    handlePartyLeave() {
      Socket.emit('party:leave');
      this.party = null;
      this.partyLoading = { active: false, state: null };
      this.partyInvites = [];
      this.setPartyStatusMessage('');
    },

    handlePartyReadyToggle() {
      Socket.emit('party:ready');
    },

    handlePartyStartInstance() {
      Socket.emit('party:startInstance');
    },

    handlePartyReturnToTown() {
      Socket.emit('party:returnToTown');
    },

    handlePartyInviteRequest(payload) {
      const username = payload && payload.username ? payload.username.trim() : '';
      if (!username) {
        return;
      }

      Socket.emit('party:invite', { username });
    },

    handlePartyAcceptInvite(invite) {
      if (!invite || !invite.partyId) {
        return;
      }

      Socket.emit('party:invite:accept', { partyId: invite.partyId });
      this.partyInvites = this.partyInvites.filter((entry) => entry.partyId !== invite.partyId);
    },

    handlePartyDeclineInvite(invite) {
      if (!invite || !invite.partyId) {
        return;
      }

      Socket.emit('party:invite:decline', { partyId: invite.partyId });
      this.partyInvites = this.partyInvites.filter((entry) => entry.partyId !== invite.partyId);
    },

    handlePartyUpdate(party, meta = {}) {
      this.pruneExpiredInvites();
      this.party = party;
      if (party) {
        this.partyInvites = this.partyInvites.filter((invite) => invite.partyId !== party.id);
      }

      if (!party || party.state !== 'instance') {
        this.partyLoading = { active: false, state: null };
      }
    },

    handlePartyInvite(invite) {
      if (!invite || !invite.partyId) {
        return;
      }

      this.pruneExpiredInvites();
      const now = Date.now();
      const expiresAt = invite.expiresAt || (now + 60000);
      const filtered = this.partyInvites.filter((entry) => entry.partyId !== invite.partyId);
      this.partyInvites = [...filtered, { ...invite, expiresAt }];
      this.setPartyStatusMessage(`Party invite from ${invite.invitedBy || 'Unknown'}`);
    },

    handlePartyLoading(state) {
      const active = Boolean(state && state !== 'idle');
      this.partyLoading = { active, state };
      if (active) {
        this.setPartyStatusMessage('');
      }
    },

    async handlePartySceneTransition(scene, playerState = {}, partySnapshot = null) {
      if (!scene || !this.game) {
        return;
      }

      await this.game.loadScene(scene, playerState);

      if (partySnapshot) {
        this.party = partySnapshot;
      }

      this.partyLoading = { active: false, state: null };
    },

    handlePartyError(error = {}) {
      if (!error || !error.message) {
        return;
      }

      this.setPartyStatusMessage(error.message);
    },

    /**
     * Start the whole game
     */
    async startGame(data) {
      // Stop the main menu music
      bus.$emit('music:stop');

      // Start the Client
      this.game = new Client(data);
      await this.game.buildMap();
      this.game.monsters = this.game.map.monsters;

      // Start game engine
      const engine = new Engine(this.game);
      engine.start();

      // Focus on game.
      setTimeout(() => {
        window.focusOnGame();
      }, 250);

      // Clear login procedure
      bus.$emit('login:done');

      // Show the game canvas
      this.loaded = true;

      // Set screen to 'game' for chatbox reset
      this.screen = 'game';
      this.resetChatState();
    },
    /**
     * A click-handler event that does nothing, really.
     *
     * @param {MouseEvent} event The mouse event
     */
    nothing(event) {
      // Make right-click system for
      // rest of the game view.
      event.preventDefault();
    },
    showSidebar(selectedSlot) {
      const slotMap = {
        0: 'stats',
        1: 'inventory',
        2: 'wear',
        3: 'friendlist',
        4: 'settings',
        5: 'logout',
        6: 'quests',
      };

      const pane = slotMap[selectedSlot];
      if (pane) {
        this.openPane(pane);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
@use '@/assets/scss/abstracts/tokens' as *;
@use '@/assets/scss/abstracts/breakpoints' as *;
@use '@/assets/scss/abstracts/mixins' as *;

#app {
  font-family: 'Roboto Slab', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background: radial-gradient(circle at top, rgba(25, 32, 48, 0.92), rgba(8, 10, 18, 0.98));
  overflow: hidden;

  img.logo {
    margin-bottom: var(--space-md);
  }

  .wrapper {
    width: 100%;
    box-sizing: border-box;
  }

  .login__screen {
    width: min(720px, 94vw);
    position: relative;
    border: 4px solid rgba(255, 255, 255, 0.12);
    box-sizing: border-box;
    display: flex;
    height: auto;
    min-height: 520px;
    margin: auto;
    align-content: center;
    justify-content: center;
    background-image: url('./assets/bg-screen.png');
    background-size: cover;
    background-position: center;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.55);

    .server__down {
      font-size: 0.85em;
    }

    .bg {
      background-color: rgba(0, 0, 0, 0.55);
      padding: var(--space-lg) var(--space-xl);
      display: inline-flex;
      flex-direction: column;
      gap: var(--space-lg);
      width: 100%;

      .register__intro {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.85);
        text-align: center;

        a {
          color: #f3b15b;
          text-decoration: underline;
        }
      }
    }

    .button_group {
      display: inline-flex;
      justify-content: space-around;
      gap: var(--space-lg);

      button {
        background: rgba(220, 220, 220, 0.92);
        border: 2px solid rgba(255, 255, 255, 0.18);
        font-size: 1.4rem;
        cursor: pointer;
        padding: var(--space-sm) var(--space-lg);
      }
    }
  }

  .game__wrapper {
    flex: 1 1 auto;
    display: flex;
    justify-content: center;
    align-items: stretch;
    padding: clamp(1rem, 3vw, 2.5rem);
    width: 100%;
    height: 100%;
    min-height: 0;
    box-sizing: border-box;
    background: radial-gradient(circle at top, rgba(30, 36, 58, 0.92), rgba(10, 12, 22, 0.96));
    overflow: auto;
  }

  .game-stage {
    position: relative;
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .center-stack {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xl);
    width: 100%;
    min-height: 100%;
  }

  .world-shell {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
    background: rgba(8, 10, 20, 0.65);
    box-shadow: 0 32px 60px rgba(0, 0, 0, 0.55);
  }

  .world-shell::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid rgba(255, 255, 255, 0.06);
    pointer-events: none;
  }

  .world-shell canvas {
    border-radius: var(--radius-md);
    outline: none;
  }

  .hud-shell {
    position: absolute;
    left: 50%;
    bottom: calc(var(--space-xl) * -0.25);
    transform: translateX(-50%);
    width: 100%;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .hud-shell__row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas: 'left bar right';
    align-items: center;
    gap: var(--space-lg);
    pointer-events: auto;
  }

  .hud-shell__party {
    margin-bottom: var(--space-sm);
    max-width: 320px;
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

  .chat-shell {
    position: relative;
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }

  .chat-shell--desktop {
    position: absolute;
    right: var(--space-xl);
    bottom: var(--space-2xl);
    width: auto;
    pointer-events: none;

    .chatbox {
      pointer-events: auto;
    }
  }

  .chat-shell--expanded:not(.chat-shell--desktop) .chat-shell__toggle {
    opacity: 0;
    pointer-events: none;
  }

  .chat-shell__toggle {
    position: fixed;
    right: var(--space-md);
    bottom: var(--space-2xl);
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
}

@include media('<=tablet') {
  #app {
    .hud-shell__row {
      gap: var(--space-md);
    }

    .hud-shell__quickbar {
      transform: translateY(12px);
    }
  }
}

@include media('<=mobile') {
  #app {
    .world-shell {
      padding: var(--space-md);
    }

    .hud-shell {
      position: static;
      transform: none;
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

    .chat-shell__toggle {
      bottom: var(--space-xl);
    }
  }
}
</style>

