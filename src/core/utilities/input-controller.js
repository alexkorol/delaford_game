import InputMapper from '../input/input-mapper.js';
import { DEFAULT_INPUT_LAYOUTS } from '../input/input-layout.js';

const DEFAULT_LAYOUT_ID = 'keyboard-wasd-mouse';

const resolveLayoutOption = (options = {}) => {
  if (options.layoutJson) {
    return options.layoutJson;
  }

  if (options.layoutId && DEFAULT_INPUT_LAYOUTS[options.layoutId]) {
    return DEFAULT_INPUT_LAYOUTS[options.layoutId];
  }

  if (options.layout) {
    return options.layout;
  }

  return null;
};

class InputController {
  constructor(options = {}) {
    this.onMove = typeof options.onMove === 'function' ? options.onMove : null;
    this.onStop = typeof options.onStop === 'function' ? options.onStop : null;
    this.onSkill = typeof options.onSkill === 'function' ? options.onSkill : null;
    this.onAction = typeof options.onAction === 'function' ? options.onAction : null;

    const layoutDescriptor = resolveLayoutOption(options);
    this.mapper = new InputMapper(layoutDescriptor || DEFAULT_INPUT_LAYOUTS[DEFAULT_LAYOUT_ID]);

    this.activeDirection = null;
    this.lastMovementSource = 'keyboard';
    this.repeatTimeout = null;
    this.repeatInterval = null;
  }

  destroy() {
    this.clearRepeat();
    if (this.mapper && typeof this.mapper.destroy === 'function') {
      this.mapper.destroy();
    }
    this.activeDirection = null;
    this.lastMovementSource = 'keyboard';
  }

  setLayout(layout) {
    if (!this.mapper) {
      this.mapper = new InputMapper(layout || DEFAULT_INPUT_LAYOUTS[DEFAULT_LAYOUT_ID]);
      return;
    }
    this.mapper.applyLayout(layout);
    this.resetMovementState();
  }

  setLayoutById(layoutId) {
    if (DEFAULT_INPUT_LAYOUTS[layoutId]) {
      this.setLayout(DEFAULT_INPUT_LAYOUTS[layoutId]);
    }
  }

  loadLayoutFromJSON(layoutJson) {
    this.setLayout(layoutJson);
  }

  getActiveLayout() {
    return this.mapper ? this.mapper.layout : null;
  }

  handleKeyDown(event) {
    if (!this.mapper) {
      return false;
    }

    const result = this.mapper.handleKeyboardEvent('down', event.key, { repeat: Boolean(event?.repeat) });
    return this.applyMapperResult(result, event);
  }

  handleKeyUp(event) {
    if (!this.mapper) {
      return false;
    }

    const result = this.mapper.handleKeyboardEvent('up', event.key, { repeat: Boolean(event?.repeat) });
    return this.applyMapperResult(result, event);
  }

  handleButtonDown(button, options = {}) {
    if (!this.mapper) {
      return false;
    }

    const result = this.mapper.handleButtonEvent('down', button, options);
    return this.applyMapperResult(result, options.event || null);
  }

  handleButtonUp(button, options = {}) {
    if (!this.mapper) {
      return false;
    }

    const result = this.mapper.handleButtonEvent('up', button, options);
    return this.applyMapperResult(result, options.event || null);
  }

  handleAnalogMove(vector = {}, options = {}) {
    if (!this.mapper) {
      return false;
    }

    const result = this.mapper.handleAnalogEvent(vector, options);
    return this.applyMapperResult(result, options.event || null);
  }

  applyMapperResult(result, originalEvent) {
    if (!result) {
      return false;
    }

    let handled = Boolean(result.handled);

    if (result.movementChanged) {
      this.applyMovement(result.movementDirection, {
        source: result.movementSource,
      });
      handled = true;
    } else if (result.movementDirection && result.movementDirection === this.activeDirection) {
      this.ensureRepeat();
    } else if (!result.movementDirection && this.activeDirection && result.eventType === 'down') {
      this.applyMovement(null, { source: result.movementSource });
      handled = true;
    }

    if (Array.isArray(result.actions) && result.actions.length) {
      result.actions.forEach((action) => {
        this.dispatchAction(action, originalEvent);
      });
      handled = true;
    }

    return handled;
  }

  applyMovement(direction, meta = {}) {
    if (!direction) {
      if (this.activeDirection && typeof this.onStop === 'function') {
        this.onStop(this.activeDirection, { source: this.lastMovementSource });
      }
      this.activeDirection = null;
      this.lastMovementSource = meta.source || this.lastMovementSource || 'keyboard';
      this.clearRepeat();
      return;
    }

    if (direction !== this.activeDirection) {
      this.activeDirection = direction;
      this.lastMovementSource = meta.source || this.lastMovementSource || 'keyboard';
      if (typeof this.onMove === 'function') {
        this.onMove(direction, { initial: true, source: this.lastMovementSource });
      }
      this.restartRepeat();
      return;
    }

    this.ensureRepeat();
  }

  dispatchAction(action, event) {
    if (!action) {
      return;
    }

    if (action.type === 'ability' && action.abilityId) {
      if (typeof this.onSkill === 'function') {
        this.onSkill({
          skillId: action.abilityId,
          abilityId: action.abilityId,
          phase: action.phase || 'start',
          trigger: action.trigger,
          source: action.source,
          input: action.inputId,
          repeat: action.repeat,
          event,
        });
      }
      return;
    }

    if (typeof this.onAction === 'function') {
      this.onAction({ ...action }, event);
    }
  }

  restartRepeat() {
    this.clearRepeat();
    if (!this.activeDirection) {
      return;
    }

    const repeat = this.mapper ? this.mapper.getMovementRepeat() : { initialDelayMs: 150, repeatDelayMs: 110 };
    const initialDelay = Math.max(0, Number(repeat.initialDelayMs) || 0);
    const repeatDelay = Math.max(0, Number(repeat.repeatDelayMs) || 0);

    this.repeatTimeout = setTimeout(() => {
      if (!this.activeDirection) {
        return;
      }

      if (typeof this.onMove === 'function') {
        this.onMove(this.activeDirection, { repeated: true, source: this.lastMovementSource });
      }

      if (repeatDelay <= 0) {
        return;
      }

      this.repeatInterval = setInterval(() => {
        if (!this.activeDirection) {
          this.clearRepeat();
          return;
        }
        if (typeof this.onMove === 'function') {
          this.onMove(this.activeDirection, { repeated: true, source: this.lastMovementSource });
        }
      }, repeatDelay);
    }, initialDelay);
  }

  ensureRepeat() {
    if (this.repeatTimeout !== null || this.repeatInterval !== null) {
      return;
    }
    this.restartRepeat();
  }

  clearRepeat() {
    if (this.repeatTimeout !== null) {
      clearTimeout(this.repeatTimeout);
      this.repeatTimeout = null;
    }

    if (this.repeatInterval !== null) {
      clearInterval(this.repeatInterval);
      this.repeatInterval = null;
    }
  }

  resetMovementState() {
    this.clearRepeat();
    this.activeDirection = null;
    this.lastMovementSource = 'keyboard';
  }
}

export default InputController;
