<template>
  <div class="game">
    <div
      class="first-action"
      v-html="action"
    />
    <div
      v-if="current !== false"
      :style="getPaneDimensions"
      class="pane"
    >
      <component
        :is="current"
        :game="game"
        :data="screenData"
      />
    </div>
    <canvas
      id="game-map"
      tabindex="0"
      class="main-canvas gameMap"
      height="352"
      width="512"
      @mouseenter="onGame = true"
      @mouseleave="onGame = false"
      @mousemove="mouseSelection"
      @click.left="leftClick"
      @click.right="rightClick"
      @keydown.prevent="handleKeyDown"
      @keyup.prevent="handleKeyUp"
    />
  </div>
</template>

<script>
import UI from 'shared/ui';
import config from 'root/config';
import Client from '../core/client';
import ClientUI from '../core/utilities/client-ui';
import bus from '../core/utilities/bus';
import Socket from '../core/utilities/socket';

export default {
  name: 'Game',
  props: {
    game: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      mouse: false,
      onGame: false,
      current: false,
      screenData: false,
      tileX: 0,
      tileY: 0,
      event: false,
      lastDirection: null,
      movementRepeatId: null,
      movementRepeatDelay: 175,
    };
  },
  computed: {
    getPaneDimensions() {
      switch (this.current) {
      default:
        return '';
      case 'furnace':
        return 'width:70%;height:40%';
      }
    },
    currentAction() {
      return this.$store.getters.action.object;
    },
    action() {
      return this.$store.getters.action.label;
    },
    otherPlayers() {
      return this.game.players.filter(
        (p) => p.socket_id !== this.game.player.socket_id,
      );
    },
  },
  watch: {
    current(newVal) {
      if (typeof newVal === 'boolean') {
        Socket.emit('player:pane:close', {
          id: this.game.player.uuid,
        });
      }
    },
  },
  created() {
    this.keyState = new Set();
    bus.$on('canvas:getMouse', () => this.mouseSelection());
    bus.$on('open:screen', this.openScreen);
    bus.$on('screen:close', this.closePane);
    bus.$on('game:context-menu:first-only', ClientUI.displayFirstAction);
    bus.$on('canvas:reset-context-menu', () => this.mouseSelection());
  },
  beforeDestroy() {
    this.clearMovementRepeat();
  },
  methods: {
    getViewportSnapshot() {
      const fallbackViewport = {
        x: config.map.viewport.x,
        y: config.map.viewport.y,
      };
      const fallbackCenter = {
        x: config.map.player.x,
        y: config.map.player.y,
      };

      if (!this.game || !this.game.map || !this.game.map.config) {
        return {
          viewport: { ...fallbackViewport },
          center: { ...fallbackCenter },
        };
      }

      const viewport = this.game.map.config.map.viewport || fallbackViewport;
      const center = this.game.map.config.map.player || fallbackCenter;

      return {
        viewport: {
          x: viewport.x,
          y: viewport.y,
        },
        center: {
          x: center.x,
          y: center.y,
        },
      };
    },
    getWorldCoordinates(local) {
      if (!local) {
        return null;
      }

      const snapshot = this.getViewportSnapshot();
      if (this.game && this.game.map && typeof this.game.map.getViewportMetrics === 'function') {
        const metrics = this.game.map.getViewportMetrics();
        if (metrics && metrics.tileCrop) {
          return {
            x: metrics.tileCrop.x + local.x,
            y: metrics.tileCrop.y + local.y,
          };
        }
      }

      if (this.game && this.game.player) {
        return {
          x: this.game.player.x - snapshot.center.x + local.x,
          y: this.game.player.y - snapshot.center.y + local.y,
        };
      }

      return {
        x: snapshot.center.x + local.x,
        y: snapshot.center.y + local.y,
      };
    },
    /**
     * Close the context-menu
     */
    closePane() {
      this.current = false;
    },
    /**
     * Open the context-menu
     *
     * @param {object} incoming The data returned from the context-menu
     */
    openScreen(incoming) {
      this.current = incoming.data.screen;
      this.screenData = incoming.data.payload;
      console.log(this.screenData);
      bus.$emit('pane:data', this.screenData);
    },
    /**
     * Right-click brings up context-menu
     *
     * @param {event} event The mouse-click event
     */
    rightClick(event) {
      const coordinates = this.resolveViewportCoordinates(event);
      const snapshot = this.getViewportSnapshot();
      const world = this.getWorldCoordinates(coordinates);

      const data = {
        event,
        coordinates,
        target: event.target,
        world,
        viewport: snapshot.viewport,
        center: snapshot.center,
      };

      event.preventDefault();
      bus.$emit('PLAYER:MENU', data);
    },

    /**
     * Player clicks on game-map
     *
     * @param {event} event The mouse-click event
     */
    leftClick(event) {
      bus.$emit('screen:close');
      bus.$emit('canvas:select-action', {
        event,
        item: this.currentAction,
      });
    },

    /**
     * Player hovering over game-map
     *
     * @param {MouseEvent} event
     */
    mouseSelection(event) {
      if (event) {
        this.event = event;
      }

      if (!this.onGame) return;
      const mouseEvent = this.event || this.mouse;
      // Save latest mouse data
      this.mouse = mouseEvent;

      const coordinates = this.resolveViewportCoordinates(mouseEvent);
      const snapshot = this.getViewportSnapshot();
      const world = this.getWorldCoordinates(coordinates);
      const hoveredSquare = {
        x: coordinates.x,
        y: coordinates.y,
      };

      const data = { x: hoveredSquare.x, y: hoveredSquare.y };
      if (
        this.game.map
        && typeof this.game.map.setMouseCoordinates === 'function'
      ) {
        if (hoveredSquare.x >= 0 && hoveredSquare.y >= 0) {
          bus.$emit('DRAW:MOUSE', data);
        }

        // eslint-disable-next-line
        if (
          !event
          || ((this.tileX !== hoveredSquare.x || this.tileY !== hoveredSquare.y)
            && this.event
            && this.event.target)
        ) {
          this.tileX = hoveredSquare.x;
          this.tileY = hoveredSquare.y;

          bus.$emit('PLAYER:MENU', {
            coordinates: hoveredSquare,
            event: this.event,
            target: this.event.target,
            firstOnly: true,
            world,
            viewport: snapshot.viewport,
            center: snapshot.center,
          });
        }
      }
    },

    resolveViewportCoordinates(event) {
      if (!event) {
        return { x: 0, y: 0 };
      }

      const { tile } = config.map.tileset;
      const camera = this.game.map && this.game.map.camera
        ? this.game.map.camera
        : { offsetX: 0, offsetY: 0 };
      const viewport = this.game.map && this.game.map.config
        ? this.game.map.config.map.viewport
        : { x: 0, y: 0 };

      const canvasElement = (this.game && this.game.map && this.game.map.canvas)
        ? this.game.map.canvas
        : event.target;
      const bufferCanvas = (this.game && this.game.map && this.game.map.bufferCanvas)
        ? this.game.map.bufferCanvas
        : null;
      const rect = canvasElement && typeof canvasElement.getBoundingClientRect === 'function'
        ? canvasElement.getBoundingClientRect()
        : { width: tile.width, height: tile.height };
      const internalWidth = bufferCanvas && typeof bufferCanvas.width === 'number'
        ? bufferCanvas.width
        : tile.width * (viewport.x || 1);
      const internalHeight = bufferCanvas && typeof bufferCanvas.height === 'number'
        ? bufferCanvas.height
        : tile.height * (viewport.y || 1);

      const position = UI.getMousePos(event);

      const scaleX = rect && rect.width ? internalWidth / rect.width : 1;
      const scaleY = rect && rect.height ? internalHeight / rect.height : 1;

      const canvasX = position.x * scaleX;
      const canvasY = position.y * scaleY;

      const tileX = Math.floor((canvasX + camera.offsetX) / tile.width);
      const tileY = Math.floor((canvasY + camera.offsetY) / tile.height);

      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

      return {
        x: clamp(tileX, 0, Math.max(viewport.x - 1, 0)),
        y: clamp(tileY, 0, Math.max(viewport.y - 1, 0)),
      };
    },

    handleKeyDown(event) {
      const key = this.normalizeKey(event.key);
      if (!this.isMovementKey(key)) {
        return;
      }

      if (!this.keyState.has(key)) {
        this.keyState.add(key);
        this.sendMovementFromKeys();
      }
    },
    handleKeyUp(event) {
      const key = this.normalizeKey(event.key);
      if (!this.isMovementKey(key)) {
        return;
      }

      if (this.keyState.has(key)) {
        this.keyState.delete(key);
        this.sendMovementFromKeys();
      }
    },
    normalizeKey(key) {
      if (key.length === 1) {
        return key.toLowerCase();
      }
      return key;
    },
    isMovementKey(key) {
      return [
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        'w',
        'a',
        's',
        'd',
      ].includes(key);
    },
    sendMovementFromKeys() {
      const direction = this.getDirectionFromKeys();
      if (!direction) {
        this.lastDirection = null;
        this.clearMovementRepeat();
        return;
      }

      if (direction === this.lastDirection) {
        this.ensureMovementRepeat();
        return;
      }

      this.lastDirection = direction;
      this.dispatchMovement(direction);
      this.ensureMovementRepeat();
    },
    getDirectionFromKeys() {
      const keySet = this.keyState;
      const has = (keys) => keys.some((key) => keySet.has(key));

      const up = has(['arrowup', 'w']);
      const down = has(['arrowdown', 's']);
      const left = has(['arrowleft', 'a']);
      const right = has(['arrowright', 'd']);

      if (up && down) return null;
      if (left && right) return null;

      if (up && right) return 'up-right';
      if (down && right) return 'down-right';
      if (up && left) return 'up-left';
      if (down && left) return 'down-left';
      if (up) return 'up';
      if (down) return 'down';
      if (left) return 'left';
      if (right) return 'right';

      return null;
    },
    dispatchMovement(direction) {
      if (!this.game || !this.game.player || !direction) {
        return;
      }

      Client.move({
        id: this.game.player.uuid,
        direction,
      });
    },
    ensureMovementRepeat() {
      if (this.movementRepeatId !== null) {
        return;
      }

      this.movementRepeatId = setInterval(() => {
        const direction = this.getDirectionFromKeys();
        if (!direction) {
          this.clearMovementRepeat();
          return;
        }

        this.dispatchMovement(direction);
      }, this.movementRepeatDelay);
    },
    clearMovementRepeat() {
      if (this.movementRepeatId !== null) {
        clearInterval(this.movementRepeatId);
        this.movementRepeatId = null;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
/** Main canvas **/
div.game {
  position: relative;
  display: block;
  width: var(--map-display-width, var(--map-native-width, auto));
  min-width: var(--map-display-width, var(--map-native-width, auto));
  height: var(--map-display-height, var(--map-native-height, auto));
  min-height: var(--map-display-height, var(--map-native-height, auto));
  max-width: none;
  max-height: none;
  background: transparent;
  overflow: hidden;

  canvas.main-canvas {
    width: 100%;
    height: 100%;
    background: #fff;
    outline: none;
    cursor: pointer;
    image-rendering: pixelated;
    display: block;
  }

  .first-action {
    position: absolute;
    z-index: 9;
    left: 0.5em;
    top: 0.5em;
    font-size: 0.75em;
    text-align: left;
    font-family: "GameFont", sans-serif;
    text-shadow: 1px 1px 0 #000;
    color: #fff;
  }

  .pane {
    z-index: 5;
    width: 90%;
    height: 90%;
    margin: 0;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    div {
      height: 100%;
      width: 100%;
      box-sizing: border-box;
    }
  }

  #context-menu {
    position: absolute;
  }
}
</style>
