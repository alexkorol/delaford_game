import bus from './utilities/bus';

class Engine {
  constructor(game) {
    this.game = game;

    this.maxFps = 20;
    this.fps = {
      current: 0,
      accumulator: 0,
      lastSample: 0,
    };

    this.frame = {
      lastTimestamp: 0,
    };

    // Bind context to same method as
    // we will be calling it out-of-context
    this.loop = this.loop.bind(this);

    bus.$on('SETTINGS:FPS', s => this.change('fps', s));
  }

  change(setting, val) {
    switch (setting) {
    case 'fps':
      this.maxFps = val;
      break;

    default:
      break;
    }
  }

  /**
   * The main game loop
   *
   * @param {decimal} timestamp The timestamp of when last called
   */
  loop(timestamp) {
    const minFrameMs = 1000 / this.maxFps;
    if (this.frame.lastTimestamp && timestamp < this.frame.lastTimestamp + minFrameMs) {
      requestAnimationFrame(this.loop);
      return;
    }

    const deltaMs = this.frame.lastTimestamp ? timestamp - this.frame.lastTimestamp : minFrameMs;
    this.frame.lastTimestamp = timestamp;

    const deltaSeconds = deltaMs / 1000;

    this.sampleFps(deltaMs);

    // Paint the map
    this.paintCanvas(deltaSeconds);

    // and back to the top...
    requestAnimationFrame(this.loop);
  }

  /**
   * Kicks off the main game loop
   */
  start() {
    this.loop();
  }

  /**
   * Draw the new game map
   */
  paintCanvas(deltaSeconds) {
    if (typeof this.game.map.update === 'function') {
      this.game.map.update(deltaSeconds);
    }

    // Draw the tile map
    this.game.map.drawMap();

    // Draw dropped items
    this.game.map.drawItems();

    // Draw the NPCs
    this.game.map.drawNPCs();

    // Draw other players
    this.game.map.drawPlayers();

    // Draw the player
    this.game.map.drawPlayer();

    // Draw the mouse selection
    this.game.map.drawMouse();
  }

  sampleFps(deltaMs) {
    this.fps.accumulator += deltaMs;
    if (this.fps.accumulator >= 1000) {
      this.fps.current = 1000 / deltaMs;
      this.fps.accumulator = 0;
      this.fps.lastSample = Date.now();
    }
  }
}

export default Engine;
