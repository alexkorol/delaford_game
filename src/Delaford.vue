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
      <div class="left">
        <!-- Main canvas -->
        <GameCanvas :game="game" />

        <!-- Chatbox -->
        <Chatbox :game="game" />
      </div>
      <div
        class="right"
        @click="sidebarClicked"
      >
        <!-- Player overview -->
        <Info :game="game" />

        <!-- Slots (Stats, Wear, Inventory, etc.) -->
        <Slots
          ref="sidebarSlots"
          :game="game"
        />
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
import Slots from './components/Slots.vue';
import Info from './components/Info.vue';

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

export default {
  name: 'Delaford',
  components: {
    GameCanvas, Chatbox, Info, Slots, ContextMenu, Login, AudioMainMenu,
  },
  data() {
    return {
      config,
      loaded: false,
      game: { exit: true },
      screen: 'login',
    };
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
  beforeDestroy() {
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
      this.$refs.sidebarSlots.selected = 1;
    },

    /**
      * Cancel login
      */

    cancelLogin() {
      this.screen = 'main';
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
    sidebarClicked() {
      bus.$emit('contextmenu:close');
    },
    showSidebar(selectedSlot) {
      this.$refs.sidebarSlots.selected = selectedSlot;
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
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(16.25rem, 22vw, 22.5rem);
    grid-template-rows: minmax(0, 1fr);
    gap: clamp(1rem, 2vw, 1.5rem);
    padding: clamp(0.5rem, 1vw, 1rem);
    width: 100%;
    height: 100%;
    min-height: 0;
    align-items: stretch;
    align-content: stretch;
    align-self: stretch;
    box-sizing: border-box;
    background-color: rgba(0, 0, 0, 0.25);
    border-radius: 12px;

    div.left {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 0;
      min-width: 0;
      height: 100%;
      align-items: stretch;
      justify-content: flex-start;
      overflow: auto;
      width: 100%;
    }

    div.right {
      display: flex;
      flex-direction: column;
      position: relative;
      justify-content: flex-end;
      background-color: rgba(0, 0, 0, 0.35);
      padding: 1rem;
      border-radius: 8px;
      overflow-y: auto;
      min-height: 0;
      max-height: 100%;
      flex: 0 0 auto;

      div.content {
        background-color: #c7c7c7;
        height: 100px;
        font-size: 12px;
      }
    }
  }

  /* stylelint-disable media-feature-range-notation */
  @media (width <= 1440px) {
    div.game__wrapper {
      grid-template-columns: minmax(0, 1fr) clamp(15rem, 26vw, 20rem);
    }
  }

  @media (width <= 1200px) {
    div.game__wrapper {
      grid-template-columns: minmax(0, 1fr);
      grid-auto-rows: auto;

      div.right {
        order: 2;
        margin-top: 1rem;
      }
    }
  }
  /* stylelint-enable media-feature-range-notation */
}
</style>
