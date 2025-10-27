import { DEFAULT_FACING_DIRECTION } from '@shared/combat.js';

const FALLBACK_FRAME_DURATION = 120;

class SpriteAnimator {
  constructor(config = {}) {
    this.config = config || {};
    this.state = config.defaultState || 'idle';
    this.direction = config.defaultDirection || DEFAULT_FACING_DIRECTION;
    this.sequence = 0;
    this.startedAt = Date.now();
    this.duration = 0;
    this.speed = 1;
    this.skillId = null;
    this.frameIndex = 0;
    this.elapsedMs = 0;
    this.holdState = null;
    this.holdApplied = false;
    this.localState = false;
  }

  clone() {
    const animator = new SpriteAnimator(this.config);
    animator.applyServerState(this.toJSON());
    return animator;
  }

  getStateConfig(state = this.state) {
    if (!this.config || !this.config.states) {
      return null;
    }
    return this.config.states[state] || null;
  }

  getFrameSequence(stateConfig = this.getStateConfig()) {
    if (!stateConfig || !Array.isArray(stateConfig.frames) || !stateConfig.frames.length) {
      return [0];
    }
    return stateConfig.frames;
  }

  getFrameDurationMs(stateConfig = this.getStateConfig()) {
    if (!stateConfig) {
      return FALLBACK_FRAME_DURATION;
    }
    const duration = Number(stateConfig.frameDuration);
    if (Number.isFinite(duration) && duration > 0) {
      return duration;
    }
    return FALLBACK_FRAME_DURATION;
  }

  resolveRow(stateConfig = this.getStateConfig(), direction = this.direction) {
    if (stateConfig && stateConfig.rows) {
      const value = stateConfig.rows[direction];
      if (Number.isFinite(value)) {
        return value;
      }
    }

    const fallbackState = this.config && this.config.states
      ? this.config.states[this.config.defaultState]
      : null;

    if (fallbackState && fallbackState.rows) {
      const fallbackValue = fallbackState.rows[direction];
      if (Number.isFinite(fallbackValue)) {
        return fallbackValue;
      }
    }

    return 0;
  }

  getCurrentFrame() {
    const stateConfig = this.getStateConfig();
    const frames = this.getFrameSequence(stateConfig);
    const safeIndex = Math.min(Math.max(this.frameIndex, 0), frames.length - 1);
    return {
      state: this.state,
      direction: this.direction,
      column: frames[safeIndex] || 0,
      row: this.resolveRow(stateConfig, this.direction),
    };
  }

  update(deltaSeconds = 0) {
    const stateConfig = this.getStateConfig();
    if (!stateConfig) {
      return this.getCurrentFrame();
    }

    const frames = this.getFrameSequence(stateConfig);
    if (!frames.length) {
      return this.getCurrentFrame();
    }

    const frameDurationMs = this.getFrameDurationMs(stateConfig) / Math.max(this.speed || 1, 0.001);
    const deltaMs = Math.max(0, deltaSeconds * 1000);
    this.elapsedMs += deltaMs;

    let advanced = false;
    while (this.elapsedMs >= frameDurationMs && frameDurationMs > 0) {
      this.elapsedMs -= frameDurationMs;
      advanced = true;
      if (this.frameIndex + 1 < frames.length) {
        this.frameIndex += 1;
      } else if (stateConfig.loop !== false) {
        this.frameIndex = 0;
      } else {
        this.frameIndex = frames.length - 1;
        this.elapsedMs = 0;
        break;
      }
    }

    if (this.localState && this.duration > 0) {
      const elapsed = Date.now() - this.startedAt;
      if (elapsed >= this.duration && this.holdState && !this.holdApplied) {
        this.setState(this.holdState, {
          direction: this.direction,
          local: true,
        });
        this.holdApplied = true;
      }
    }

    if (!advanced && !this.localState && this.duration > 0) {
      const elapsed = Date.now() - this.startedAt;
      if (elapsed >= this.duration && this.holdState && !this.holdApplied) {
        this.holdApplied = true;
      }
    }

    return this.getCurrentFrame();
  }

  setState(state, options = {}) {
    const stateConfig = this.getStateConfig(state) || this.getStateConfig(this.config.defaultState) || null;
    const resolvedState = stateConfig ? state : this.state;
    const direction = options.direction || this.direction || DEFAULT_FACING_DIRECTION;

    const baseSequence = Math.floor(Number.isFinite(this.sequence) ? this.sequence : 0);
    let sequence = options.sequence;
    if (!Number.isFinite(sequence)) {
      sequence = options.local ? baseSequence + 0.5 : baseSequence + 1;
    }

    this.state = resolvedState;
    this.direction = direction;
    this.sequence = sequence;
    this.startedAt = Number.isFinite(options.startedAt) ? options.startedAt : Date.now();
    this.duration = Number.isFinite(options.duration)
      ? options.duration
      : (stateConfig && Number.isFinite(stateConfig.duration) ? stateConfig.duration : 0);
    this.speed = Number.isFinite(options.speed) ? options.speed : 1;
    this.skillId = options.skillId || null;
    this.holdState = options.holdState !== undefined
      ? options.holdState
      : (stateConfig ? stateConfig.holdState || null : null);
    this.holdApplied = false;
    this.localState = Boolean(options.local);
    this.frameIndex = 0;
    this.elapsedMs = 0;

    return this.getCurrentFrame();
  }

  applyServerState(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      return false;
    }

    const incomingSequence = Number.isFinite(snapshot.sequence) ? snapshot.sequence : null;
    const currentFloor = Math.floor(Number.isFinite(this.sequence) ? this.sequence : 0);
    if (incomingSequence !== null && incomingSequence < currentFloor) {
      return false;
    }

    const state = snapshot.state || this.config.defaultState || this.state;
    const direction = snapshot.direction || this.direction || DEFAULT_FACING_DIRECTION;
    const stateConfig = this.getStateConfig(state) || this.getStateConfig(this.config.defaultState) || null;

    this.state = stateConfig ? state : this.state;
    this.direction = direction;
    this.sequence = incomingSequence !== null ? incomingSequence : this.sequence;
    this.startedAt = Number.isFinite(snapshot.startedAt) ? snapshot.startedAt : Date.now();
    this.duration = Number.isFinite(snapshot.duration)
      ? snapshot.duration
      : (stateConfig && Number.isFinite(stateConfig.duration) ? stateConfig.duration : 0);
    this.speed = Number.isFinite(snapshot.speed) ? snapshot.speed : 1;
    this.skillId = snapshot.skillId || null;
    this.holdState = snapshot.holdState !== undefined
      ? snapshot.holdState
      : (stateConfig ? stateConfig.holdState || null : null);
    this.holdApplied = false;
    this.localState = false;
    this.frameIndex = 0;
    this.elapsedMs = 0;

    return true;
  }

  toJSON() {
    return {
      state: this.state,
      direction: this.direction,
      sequence: this.sequence,
      startedAt: this.startedAt,
      duration: this.duration,
      speed: this.speed,
      skillId: this.skillId,
      holdState: this.holdState,
    };
  }
}

export default SpriteAnimator;
