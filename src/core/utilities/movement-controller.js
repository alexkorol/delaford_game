import {
  TILE_SIZE,
  DEFAULT_MOVE_DURATION_MS,
  DEFAULT_ENTITY_SPEED,
  MOVEMENT_EPSILON,
  now,
} from '../config/movement';

const clonePoint = ({ x, y }) => ({ x, y });

const centerOfTile = (tileX, tileY, tileSize = TILE_SIZE) => ({
  x: (tileX + 0.5) * tileSize,
  y: (tileY + 0.5) * tileSize,
});

/**
 * Tracks interpolated positions for any map entity.
 * Rendering code will read {@link render} and {@link getPosition}
 * while networking hooks call {@link hardSync} and {@link startMove}.
 */
class MovementController {
  constructor(options = {}) {
    const {
      tileSize = TILE_SIZE,
      moveDuration = DEFAULT_MOVE_DURATION_MS,
      speed = DEFAULT_ENTITY_SPEED,
    } = options;

    this.tileSize = tileSize;
    this.moveDuration = moveDuration;
    this.speed = speed;

    this.tile = { x: 0, y: 0 };
    this.previous = { x: 0, y: 0 };
    this.render = { x: 0, y: 0 };
    this.next = { x: 0, y: 0 };
    this.lastUpdate = 0;
    this.eta = 0;
  }

  /**
   * Initialise controller with an absolute tile.
   */
  initialise(tileX, tileY, timestamp = now()) {
    const center = centerOfTile(tileX, tileY, this.tileSize);
    this.tile = { x: tileX, y: tileY };
    this.previous = clonePoint(center);
    this.render = clonePoint(center);
    this.next = clonePoint(center);
    this.lastUpdate = timestamp;
    this.eta = 0;
    return this;
  }

  /**
   * Force the controller to a tile, clearing any ongoing interpolation.
   */
  hardSync(tileX, tileY, timestamp = now()) {
    return this.initialise(tileX, tileY, timestamp);
  }

  /**
   * Start interpolating towards a new tile target.
   */
  startMove(nextTileX, nextTileY, { timestamp = now(), duration = this.moveDuration } = {}) {
    const start = this.getPosition(timestamp);
    const destination = centerOfTile(nextTileX, nextTileY, this.tileSize);

    this.previous = clonePoint(start);
    this.render = clonePoint(start);
    this.next = clonePoint(destination);

    this.tile = { x: nextTileX, y: nextTileY };
    this.lastUpdate = timestamp;
    this.eta = duration;

    if (duration <= MOVEMENT_EPSILON) {
      this.complete();
    }

    return this;
  }

  /**
   * Compute the current interpolated position without mutating state.
   */
  getPosition(timestamp = now()) {
    if (this.eta <= MOVEMENT_EPSILON) {
      return clonePoint(this.render);
    }

    const alpha = Math.min(1, Math.max(0, (timestamp - this.lastUpdate) / this.eta));
    return {
      x: this.previous.x + ((this.next.x - this.previous.x) * alpha),
      y: this.previous.y + ((this.next.y - this.previous.y) * alpha),
    };
  }

  /**
   * Advance interpolation state to the supplied timestamp,
   * updating {@link render} and settling when eta expires.
   */
  update(timestamp = now()) {
    const position = this.getPosition(timestamp);
    this.render = clonePoint(position);

    if (this.eta > MOVEMENT_EPSILON && timestamp >= this.lastUpdate + this.eta) {
      this.complete();
    }

    return clonePoint(this.render);
  }

  /**
   * Cancels the current interpolation but keeps the latest render position.
   */
  cancel(timestamp = now()) {
    const position = this.getPosition(timestamp);
    this.previous = clonePoint(position);
    this.render = clonePoint(position);
    this.next = clonePoint(position);
    this.eta = 0;
    this.lastUpdate = timestamp;
    return this;
  }

  /**
   * True if the controller is currently interpolating between tiles.
   */
  isMoving(timestamp = now()) {
    if (this.eta <= MOVEMENT_EPSILON) {
      return false;
    }
    return timestamp < this.lastUpdate + this.eta;
  }

  complete() {
    this.previous = clonePoint(this.next);
    this.render = clonePoint(this.next);
    this.eta = 0;
    this.lastUpdate = now();
  }
}

export { centerOfTile };
export default MovementController;
