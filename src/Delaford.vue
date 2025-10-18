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
          To register an account, please visit <a href="https://delaford.com/register">this page</a> to get started and then come back.
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
      <div
        class="game-stage"
        :class="gameStageClasses"
        :style="gameStageStyle"
      >
        <transition name="pane-side">
          <aside
            v-if="shouldShowDesktopPane"
            ref="desktopPane"
            :class="['side-pane', `side-pane--${panePosition}`]"
          >
            <header class="side-pane__header">
              <h2 class="side-pane__title">
                {{ paneTitle }}
              </h2>
              <button
                type="button"
                class="side-pane__close"
                @click="closePane"
              >
                X
              </button>
            </header>
            <div class="side-pane__body">
              <component
                :is="activePaneComponent"
                v-if="activePaneComponent"
                :game="game"
              />
            </div>
          </aside>
        </transition>

        <div
          class="world-shell"
          :style="worldShellStyle"
        >
          <GameCanvas :game="game" />

          <div class="hud-layer">
            <HudOrb
              variant="hp"
              label="HP"
              :current="playerVitals.hp.current"
              :max="playerVitals.hp.max"
              @activate="requestPane('stats')"
            />
            <Quickbar
              :slots="quickSlots"
              :active-index="quickbarActiveIndex"
              @slot-activate="handleQuickSlot"
            />
            <HudOrb
              variant="mp"
              label="MP"
              :current="playerVitals.mp.current"
              :max="playerVitals.mp.max"
              @activate="requestPane('inventory')"
            />
          </div>
          <div class="chat-layer">
            <div
              class="chat-toggle"
              :class="chatToggleClasses"
            >
              <button
                type="button"
                class="chat-toggle__button"
                @click="toggleChat"
              >
                {{ chatToggleLabel }}
              </button>
              <div class="chat-toggle__preview">
                <span class="chat-toggle__text">{{ chatPreviewText }}</span>
                <span
                  v-if="chatUnreadCount > 0"
                  class="chat-toggle__badge"
                >
                  {{ chatUnreadCount }}
                </span>
              </div>
              <button
                type="button"
                class="chat-toggle__pin"
                @click="toggleChatPin"
              >
                {{ layout.chat.isPinned ? 'Unpin' : 'Pin' }}
              </button>
            </div>

            <transition name="chat-overlay">
              <div
                v-if="chatExpanded"
                class="chat-overlay"
                @mouseenter="cancelChatAutohide"
                @mouseleave="scheduleChatAutoHide"
              >
                <Chatbox
                  ref="chatbox"
                  :game="game"
                  @message-appended="handleChatMessage"
                  @mouseenter.native="cancelChatAutohide"
                  @focusin.native="cancelChatAutohide"
                  @mouseleave.native="scheduleChatAutoHide"
                  @focusout.native="scheduleChatAutoHide"
                />
              </div>
            </transition>
          </div>
        </div>

        <transition name="pane-overlay">
          <div
            v-if="shouldShowOverlayPane"
            class="floating-pane"
            @click.self="closePane"
          >
            <div
              ref="overlayPane"
              class="floating-pane__card"
            >
              <header class="floating-pane__header">
                <h2 class="floating-pane__title">
                  {{ paneTitle }}
                </h2>
                <button
                  type="button"
                  class="floating-pane__close"
                  @click="closePane"
                >
                  Close
                </button>
              </header>
              <div class="floating-pane__body">
                <component
                  :is="activePaneComponent"
                  v-if="activePaneComponent"
                  :game="game"
                />
              </div>
            </div>
          </div>
        </transition>
      </div>

      <context-menu :game="game" />
    </div>
    <!-- End Game wrapper -->
  </div>
</template>

<script>
// Vue components
import config from 'root/config';
import GameCanvas from './components/GameCanvas.vue';
import Chatbox from './components/Chatbox.vue';
import Quickbar from './components/hud/Quickbar.vue';
import HudOrb from './components/hud/HudOrb.vue';
import StatsPane from './components/slots/Stats.vue';
import InventoryPane from './components/slots/Inventory.vue';
import WearPane from './components/slots/Wear.vue';
import FriendListPane from './components/slots/FriendList.vue';
import SettingsPane from './components/slots/Settings.vue';
import LogoutPane from './components/slots/Logout.vue';
import QuestsPane from './components/slots/Quests.vue';

// Sub Vue components
import ContextMenu from './components/sub/ContextMenu.vue';
import AudioMainMenu from './components/sub/AudioMainMenu.vue';
import Login from './components/ui/Login.vue';

// Core assets
import Client from './core/client';
import Engine from './core/engine';
import bus from './core/utilities/bus';
import Event from './core/player/events';
import MovementController from './core/utilities/movement-controller';
import { DEFAULT_MOVE_DURATION_MS } from './core/config/movement';

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
  stats: StatsPane,
  inventory: InventoryPane,
  wear: WearPane,
  friendlist: FriendListPane,
  settings: SettingsPane,
  logout: LogoutPane,
  quests: QuestsPane,
};

const paneTitles = {
  stats: 'Stats',
  inventory: 'Inventory',
  wear: 'Equipment',
  friendlist: 'Friends',
  settings: 'Settings',
  logout: 'Logout',
  quests: 'Quests',
};

const panePositions = {
  stats: 'left',
  inventory: 'right',
  wear: 'right',
  friendlist: 'right',
  settings: 'right',
  logout: 'right',
  quests: 'right',
};

const DEFAULT_CHAT_PREVIEW = 'Welcome to Delaford.';

export default {
  name: 'Delaford',
  components: {
    GameCanvas,
    Chatbox,
    Quickbar,
    HudOrb,
    ContextMenu,
    Login,
    AudioMainMenu,
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
      chatHideTimeout: null,
      quickbarActiveIndex: null,
      quickbarFlashTimeout: null,
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
      const hpSource = player.hp || player.health || stats.hp;
      const mpSource = player.mp || player.mana || stats.mp;

      return {
        hp: normaliseMeter(hpSource, stats.hp && stats.hp.max ? stats.hp.max : 0),
        mp: normaliseMeter(mpSource, stats.mp && stats.mp.max ? stats.mp.max : 0),
      };
    },
    chatExpanded() {
      return this.layout.chat.isOpen || this.layout.chat.isPinned;
    },
    chatPreviewText() {
      const preview = this.layout.chat.preview || '';
      if (preview.length > 80) {
        return `${preview.slice(0, 77)}...`;
      }
      return preview;
    },
    chatUnreadCount() {
      return this.layout.chat.unreadCount;
    },
    chatToggleLabel() {
      return this.chatExpanded ? 'Hide chat' : 'Show chat';
    },
    chatToggleClasses() {
      return {
        'chat-toggle--open': this.chatExpanded,
        'chat-toggle--pinned': this.layout.chat.isPinned,
        'chat-toggle--unread': this.chatUnreadCount > 0,
      };
    },
    hasActivePane() {
      return Boolean(this.layout.activePane);
    },
    activePaneComponent() {
      const key = this.layout.activePane;
      return key ? paneRegistry[key] || null : null;
    },
    paneTitle() {
      const key = this.layout.activePane;
      return key ? paneTitles[key] || '' : '';
    },
    panePosition() {
      const key = this.layout.activePane;
      return key ? panePositions[key] || 'right' : 'right';
    },
    gameStageClasses() {
      const classes = [`mode-${this.layoutMode}`];
      if (this.hasActivePane) {
        classes.push('pane-active');
        classes.push(`pane-${this.panePosition}`);
      } else {
        classes.push('pane-inactive');
      }
      return classes;
    },
    gameStageStyle() {
      if (this.layoutMode !== 'desktop') {
        return {};
      }
      const paneWidth = 'clamp(280px, 22vw, 360px)';
      if (!this.hasActivePane) {
        return {
          gridTemplateColumns: 'minmax(0, 1fr)',
          justifyItems: 'center',
        };
      }
      if (this.panePosition === 'left') {
        return {
          gridTemplateColumns: `${paneWidth} minmax(0, 1fr)`,
          justifyItems: 'stretch',
        };
      }
      return {
        gridTemplateColumns: `minmax(0, 1fr) ${paneWidth}`,
        justifyItems: 'stretch',
      };
    },
    worldShellStyle() {
      const runtimeConfig = this.game && this.game.map && this.game.map.config
        ? this.game.map.config.map
        : this.config.map;
      const { tile } = runtimeConfig.tileset;
      const { viewport } = runtimeConfig;
      const width = tile.width * viewport.x;
      const height = tile.height * viewport.y;
      return {
        '--map-aspect-ratio': `${width} / ${height}`,
        '--world-internal-width': `${width}px`,
        '--world-internal-height': `${height}px`,
      };
    },
    shouldShowDesktopPane() {
      return this.isDesktop && !!this.activePaneComponent;
    },
    shouldShowOverlayPane() {
      return !this.isDesktop && !!this.activePaneComponent;
    },
  },
  watch: {
    shouldShowOverlayPane(isOverlay) {
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

    bus.$on('show-sidebar', this.showSidebar);

    // On logout, let's do a few things...
    bus.$on('player:logout', this.logout);
    bus.$on('go:main', this.cancelLogin);
  },
  mounted() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onViewportResize, { passive: true });
      window.addEventListener('keydown', this.handleGlobalKeydown);
    }
  },
  beforeDestroy() {
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
      if (this.chatHideTimeout) {
        window.clearTimeout(this.chatHideTimeout);
        this.chatHideTimeout = null;
      }
      if (this.quickbarFlashTimeout) {
        window.clearTimeout(this.quickbarFlashTimeout);
        this.quickbarFlashTimeout = null;
      }
    }

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

    requestPane(pane) {
      if (!pane) {
        return;
      }
      this.openPane(pane);
    },

    openPane(pane) {
      bus.$emit('contextmenu:close');
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
      if (typeof window === 'undefined') {
        return;
      }

      if (!this.layout.chat.isOpen || this.layout.chat.isPinned) {
        return;
      }

      this.cancelChatAutohide();
      this.chatHideTimeout = window.setTimeout(() => {
        this.layout.chat.isOpen = false;
        this.chatHideTimeout = null;
      }, 8000);
    },

    cancelChatAutohide() {
      if (typeof window === 'undefined') {
        return;
      }
      if (this.chatHideTimeout) {
        window.clearTimeout(this.chatHideTimeout);
        this.chatHideTimeout = null;
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

        const input = root.querySelector('input.typing');
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
      const focusTargets = [
        this.$refs.desktopPane,
        this.$refs.overlayPane,
      ];

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
    playerMovement(data) {
      if (!this.game || !this.game.player) {
        return;
      }

      const payload = { ...data };
      if (payload.inventory && payload.inventory.slots) {
        payload.inventory = payload.inventory.slots;
      }

      const { player } = this.game;
      const isLocalPlayer = player.uuid === payload.uuid;

      if (isLocalPlayer) {
        if (!player.movement) {
          player.movement = new MovementController().initialise(player.x, player.y);
        }

        const previousX = player.x;
        const previousY = player.y;
        const moved = previousX !== payload.x || previousY !== payload.y;

        if (moved) {
          const distance = Math.hypot(payload.x - previousX, payload.y - previousY) || 1;
          player.movement.startMove(payload.x, payload.y, {
            duration: DEFAULT_MOVE_DURATION_MS * distance,
          });
        } else {
          player.movement.hardSync(payload.x, payload.y);
        }

        Object.assign(player, payload);
        this.game.map.player = player;
      } else {
        const playerIndex = this.game.map.players.findIndex((p) => p.uuid === payload.uuid);

        if (playerIndex === -1) {
          const newcomer = {
            ...payload,
            movement: new MovementController().initialise(payload.x, payload.y),
          };
          this.game.map.players.push(newcomer);
          return;
        }

        const existing = this.game.map.players[playerIndex] || {};
        const controller = existing.movement
          || new MovementController().initialise(payload.x, payload.y);

        const previousX = typeof existing.x === 'number' ? existing.x : payload.x;
        const previousY = typeof existing.y === 'number' ? existing.y : payload.y;
        const moved = previousX !== payload.x || previousY !== payload.y;

        if (moved) {
          const distance = Math.hypot(payload.x - previousX, payload.y - previousY) || 1;
          controller.startMove(payload.x, payload.y, {
            duration: DEFAULT_MOVE_DURATION_MS * distance,
          });
        } else {
          controller.hardSync(payload.x, payload.y);
        }

        const updated = { ...existing, ...payload, movement: controller };
        this.$set(this.game.map.players, playerIndex, updated);
      }
    },

    /**
     * On NPC movement, update NPCs
     */
    npcMovement(data) {
      if (!this.game || !this.game.map) {
        return;
      }

      const existing = new Map(
        (this.game.map.npcs || []).map((npc, index) => {
          const key = npc && (npc.uuid || `${npc.id}-${index}`);
          return [key, npc];
        }),
      );

      const updated = (data || []).map((npc, index) => {
        const key = npc && (npc.uuid || `${npc.id}-${index}`);
        const previous = existing.get(key);

        const controller = previous && previous.movement
          ? previous.movement
          : new MovementController().initialise(npc.x, npc.y);

        const previousX = previous ? previous.x : npc.x;
        const previousY = previous ? previous.y : npc.y;
        const moved = previous && (previousX !== npc.x || previousY !== npc.y);

        if (moved) {
          const distance = Math.hypot(npc.x - previousX, npc.y - previousY) || 1;
          controller.startMove(npc.x, npc.y, {
            duration: DEFAULT_MOVE_DURATION_MS * distance,
          });
        } else {
          controller.hardSync(npc.x, npc.y);
        }

        return {
          ...npc,
          movement: controller,
        };
      });

      this.game.map.npcs = updated;
      this.game.npcs = updated;
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
@use 'sass:color';

#app {
  font-family: "Roboto Slab", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #fff;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: 100vh;
  width: 100%;
  overflow: hidden;

  img.logo {
    margin-bottom: 1em;
  }

  div.wrapper {
    width: 100%;
    box-sizing: border-box;
  }

  div.login__screen {
    width: 692px;
    position: relative;
    border: 5px solid #ababab;
    box-sizing: border-box;
    display: flex;
    height: 505px;
    margin: auto;
    align-content: center;
    justify-content: center;
    background-image: url("./assets/bg-screen.png");

    div.server__down {
      font-size: 0.85em;
    }

    div.bg {
      background-color: rgba(0, 0, 0, 0.5);
      padding: 1em 0;
      border-radius: 5px;
      display: inline-flex;
      justify-content: space-around;
    }

    div.button_group {
      width: 100%;
      display: inline-flex;
      justify-content: space-around;

      button {
        background: #dedede;
        border: 2px solid color.adjust(#dedede, $lightness: -10%);
        font-size: 1.5em;
        cursor: pointer;
      }
    }
  }

  div.game__wrapper {
    flex: 1 1 auto;
    display: flex;
    justify-content: center;
    align-items: stretch;
    padding: clamp(1rem, 3vw, 2.5rem);
    width: 100%;
    height: 100%;
    min-height: 0;
    box-sizing: border-box;
    background: radial-gradient(circle at top, rgba(37, 29, 41, 0.95), rgba(18, 14, 20, 0.95));
  }

  div.game-stage {
    position: relative;
    flex: 1 1 auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: stretch;
    justify-items: center;
    gap: clamp(1rem, 3vw, 2rem);
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  div.game-stage.mode-desktop {
    align-items: stretch;
  }

  div.game-stage.mode-desktop.pane-active {
    justify-items: stretch;
  }

  aside.side-pane {
    position: relative;
    display: flex;
    flex-direction: column;
    width: clamp(280px, 22vw, 360px);
    align-self: stretch;
    max-height: 100%;
    border-radius: 18px;
    background: rgba(20, 20, 26, 0.95);
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.55);
    overflow: hidden;
    z-index: 3;
  }

  aside.side-pane.side-pane--left {
    grid-column: 1;
    justify-self: start;
  }

  aside.side-pane.side-pane--right {
    grid-column: 2;
    justify-self: end;
  }

  .side-pane__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: rgba(12, 12, 16, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .side-pane__title {
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin: 0;
  }

  .side-pane__close {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.75);
    font-size: 1.15rem;
    cursor: pointer;
    transition: color 120ms ease;

    &:hover {
      color: #fff;
    }
  }

  .side-pane__body {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 1rem;
  }

  div.world-shell {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: min(100%, max(var(--world-internal-width, 512px), clamp(320px, 90vw, 1080px)));
    max-width: 100%;
    aspect-ratio: var(--map-aspect-ratio, 16 / 10);
    border-radius: 18px;
    background: rgba(12, 12, 16, 0.4);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.6);
    overflow: hidden;
    grid-column: 1;
  }

  div.game-stage.mode-desktop.pane-left div.world-shell {
    grid-column: 2;
  }

  div.world-shell::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.15), transparent 40%, rgba(0, 0, 0, 0.45));
    pointer-events: none;
    z-index: 1;
  }

  div.world-shell > :deep(.game) {
    position: relative;
    z-index: 0;
    width: 100%;
    height: 100%;
  }

  div.hud-layer {
    position: absolute;
    z-index: 2;
    left: 50%;
    bottom: clamp(0.85rem, 1.8vw, 1.8rem);
    transform: translateX(-50%);
    width: min(100%, clamp(420px, 58vw, 680px));
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: clamp(0.55rem, 1.2vw, 1.25rem);
    align-items: flex-end;
    pointer-events: none;
  }

  div.hud-layer > * {
    pointer-events: auto;
  }

  div.chat-layer {
    position: absolute;
    z-index: 3;
    left: 50%;
    bottom: calc(clamp(0.85rem, 1.8vw, 1.8rem) + clamp(72px, 12vw, 92px));
    transform: translateX(-50%);
    width: min(100%, clamp(440px, 62vw, 720px));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    pointer-events: none;
  }

  .chat-toggle {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 48px;
    padding: 0.5rem 0.75rem;
    border-radius: 16px;
    background: rgba(16, 16, 20, 0.9);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.48);
    pointer-events: auto;
  }

  .chat-toggle--open {
    background: rgba(16, 16, 20, 0.95);
  }

  .chat-toggle--unread {
    box-shadow: 0 0 0 2px rgba(255, 214, 102, 0.65), 0 16px 28px rgba(0, 0, 0, 0.55);
  }

  .chat-toggle--pinned {
    border: 1px solid rgba(255, 214, 102, 0.35);
  }

  .chat-toggle__button,
  .chat-toggle__pin {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    padding: 0.4rem 0.9rem;
    color: #fff;
    font-size: 0.85rem;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: background 140ms ease, transform 140ms ease;
  }

  .chat-toggle__button:hover,
  .chat-toggle__pin:hover {
    background: rgba(255, 255, 255, 0.18);
    transform: translateY(-1px);
  }

  .chat-toggle__preview {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow: hidden;
    text-align: left;
  }

  .chat-toggle__text {
    flex: 1 1 auto;
    font-family: "ChatFont", sans-serif;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chat-toggle__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.75rem;
    height: 1.75rem;
    border-radius: 999px;
    background: rgba(255, 214, 102, 0.9);
    color: #171313;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .chat-overlay {
    width: 100%;
    pointer-events: auto;
    background: rgba(18, 18, 24, 0.92);
    border-radius: 18px;
    box-shadow: 0 22px 40px rgba(0, 0, 0, 0.6);
    padding: 0.75rem;
  }

  .chat-overlay :deep(.chatbox) {
    background: transparent;
    box-shadow: none;
    padding: 0;
  }

  .chat-overlay :deep(#chat) {
    height: clamp(160px, 24vh, 220px);
    background: rgba(236, 236, 240, 0.95);
    border-radius: 12px;
  }

  .chat-overlay :deep(input.typing) {
    margin-top: 0.5rem;
    border-radius: 12px;
    border: 1px solid rgba(40, 40, 44, 0.25);
  }

  .chat-overlay :deep(input.typing:focus) {
    border-color: rgba(255, 214, 102, 0.6);
    box-shadow: 0 0 0 2px rgba(255, 214, 102, 0.3);
  }

  .floating-pane {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(10, 8, 12, 0.75);
    backdrop-filter: blur(4px);
    z-index: 90;
    padding: clamp(1rem, 4vw, 2.5rem);
  }

  .floating-pane__card {
    width: min(640px, 92vw);
    max-height: min(520px, 82vh);
    background: rgba(24, 24, 30, 0.96);
    border-radius: 24px 24px 12px 12px;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.65);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .floating-pane__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .floating-pane__title {
    margin: 0;
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .floating-pane__close {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 999px;
    padding: 0.35rem 0.85rem;
    color: #fff;
    font-size: 0.85rem;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: background 140ms ease, transform 140ms ease;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
    }
  }

  .floating-pane__body {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 1rem 1.25rem;
  }

  .pane-side-enter-active,
  .pane-side-leave-active {
    transition: opacity 150ms ease, transform 150ms ease;
  }

  .pane-side-enter-from,
  .pane-side-leave-to {
    opacity: 0;
    transform: translateX(-16px);
  }

  .game-stage.pane-right .pane-side-enter-from,
  .game-stage.pane-right .pane-side-leave-to {
    transform: translateX(16px);
  }

  .pane-overlay-enter-active,
  .pane-overlay-leave-active {
    transition: opacity 180ms ease;
  }

  .pane-overlay-enter-from,
  .pane-overlay-leave-to {
    opacity: 0;
  }

  .chat-overlay-enter-active,
  .chat-overlay-leave-active {
    transition: opacity 150ms ease, transform 150ms ease;
  }

  .chat-overlay-enter-from,
  .chat-overlay-leave-to {
    opacity: 0;
    transform: translateY(8px);
  }

  @media (width <= 1024px) {
    div.game-stage {
      gap: clamp(0.75rem, 3vw, 1.5rem);
    }

    div.world-shell {
      width: min(100%, max(var(--world-internal-width, 512px), clamp(300px, 92vw, 880px)));
    }

    div.chat-layer {
      width: min(100%, clamp(400px, 88vw, 640px));
    }
  }

  @media (width <= 768px) {
    div.game__wrapper {
      padding: clamp(0.75rem, 4vw, 1.5rem);
    }

    div.world-shell {
      width: 100%;
      border-radius: 14px;
    }

    div.hud-layer {
      width: min(100%, clamp(340px, 78vw, 560px));
    }

    .floating-pane {
      align-items: center;
    }

    div.chat-layer {
      position: fixed;
      bottom: clamp(0.9rem, 6vw, 2rem);
      width: min(94vw, 420px);
    }

    .chat-overlay :deep(#chat) {
      height: clamp(220px, 40vh, 360px);
    }
  }
}
</style>
