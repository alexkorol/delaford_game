import {
  DEFAULT_INPUT_LAYOUTS,
  normaliseInputLayout,
  normaliseInputKey,
  parseInputLayout,
} from './input-layout.js';

const DEFAULT_LAYOUT_ID = 'keyboard-wasd-mouse';

const normaliseButtonId = (rawButton) => {
  if (rawButton === null || rawButton === undefined) {
    return '';
  }
  return `${rawButton}`.toLowerCase();
};

const setsEqual = (a, b) => {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

class InputMapper {
  constructor(layout = null) {
    this.layoutId = DEFAULT_LAYOUT_ID;
    this.layout = normaliseInputLayout(DEFAULT_INPUT_LAYOUTS[DEFAULT_LAYOUT_ID], DEFAULT_LAYOUT_ID);
    this.keyBindings = new Map();
    this.buttonBindings = new Map();
    this.bindingState = new Map();
    this.movementBindings = clone(this.layout.movement);
    this.diagonalBindings = [...this.layout.diagonals];
    this.movementRepeat = { ...this.layout.repeat };
    this.activeMovementKeys = new Set();
    this.stickDirections = new Map();
    this.analogDirections = new Set();
    this.lastDirection = null;
    this.analogConfig = Array.isArray(this.layout.analogs) ? [...this.layout.analogs] : [];

    this.applyLayout(layout || DEFAULT_INPUT_LAYOUTS[DEFAULT_LAYOUT_ID]);
  }

  applyLayout(layoutDescriptor) {
    const parsed = parseInputLayout(layoutDescriptor);
    const layoutId = parsed && typeof parsed.id === 'string' ? parsed.id : DEFAULT_LAYOUT_ID;
    const fallback = DEFAULT_INPUT_LAYOUTS[layoutId] ? layoutId : DEFAULT_LAYOUT_ID;
    this.layout = normaliseInputLayout(parsed || DEFAULT_INPUT_LAYOUTS[fallback], fallback);
    this.layoutId = this.layout.id || fallback;

    this.rebuildBindings();
    this.resetState();
  }

  rebuildBindings() {
    this.keyBindings.clear();
    this.buttonBindings.clear();
    this.bindingState.clear();
    this.movementBindings = clone(this.layout.movement);
    this.diagonalBindings = [...this.layout.diagonals];
    this.movementRepeat = { ...this.layout.repeat };
    this.analogConfig = Array.isArray(this.layout.analogs) ? [...this.layout.analogs] : [];

    this.layout.actions.forEach((action, index) => {
      const bindingKey = `${action.actionType}:${action.id}:${index}`;
      const state = new Set();
      this.bindingState.set(bindingKey, state);

      const descriptor = {
        ...action,
        bindingKey,
      };

      (action.inputs.keys || []).forEach((key) => {
        const normalisedKey = normaliseInputKey(key);
        if (!normalisedKey) {
          return;
        }
        const list = this.keyBindings.get(normalisedKey) || [];
        list.push({ ...descriptor, source: 'keyboard' });
        this.keyBindings.set(normalisedKey, list);
      });

      (action.inputs.buttons || []).forEach((button) => {
        const buttonId = normaliseButtonId(button);
        if (!buttonId) {
          return;
        }
        const list = this.buttonBindings.get(buttonId) || [];
        list.push({ ...descriptor, source: 'gamepad' });
        this.buttonBindings.set(buttonId, list);
      });
    });
  }

  resetState() {
    this.activeMovementKeys.clear();
    this.stickDirections.clear();
    this.analogDirections.clear();
    this.lastDirection = null;
    this.bindingState.forEach((state) => state.clear());
  }

  destroy() {
    this.resetState();
  }

  getMovementRepeat() {
    return { ...this.movementRepeat };
  }

  handleKeyboardEvent(eventType, rawKey, options = {}) {
    const key = normaliseInputKey(rawKey);
    if (!key) {
      return null;
    }

    const actions = [];
    let movementChanged = false;

    if (eventType === 'down') {
      this.activeMovementKeys.add(key);
      const bindings = this.keyBindings.get(key) || [];
      actions.push(...this.triggerBindings(bindings, 'down', {
        inputId: key,
        repeat: Boolean(options.repeat),
      }));
    } else if (eventType === 'up') {
      this.activeMovementKeys.delete(key);
      const bindings = this.keyBindings.get(key) || [];
      actions.push(...this.triggerBindings(bindings, 'up', {
        inputId: key,
        repeat: Boolean(options.repeat),
      }));
    }

    const direction = this.computeMovementDirection();
    if (direction !== this.lastDirection) {
      movementChanged = true;
      this.lastDirection = direction;
    }

    return {
      handled: actions.length > 0 || movementChanged,
      actions,
      movementDirection: direction,
      movementChanged,
      movementSource: 'keyboard',
      eventType,
    };
  }

  handleButtonEvent(eventType, rawButton, options = {}) {
    const button = normaliseButtonId(rawButton);
    if (!button) {
      return null;
    }

    const bindings = this.buttonBindings.get(button) || [];
    const actions = this.triggerBindings(bindings, eventType === 'down' ? 'down' : 'up', {
      inputId: button,
      repeat: Boolean(options.repeat),
    });

    return {
      handled: actions.length > 0,
      actions,
      movementDirection: this.lastDirection,
      movementChanged: false,
      movementSource: 'gamepad',
      eventType,
    };
  }

  handleAnalogEvent(vector = {}, options = {}) {
    const id = typeof options.id === 'string' && options.id ? options.id : 'left';
    const config = this.analogConfig.find((entry) => entry.id === id && entry.controls === 'movement');
    if (!config) {
      return {
        handled: false,
        actions: [],
        movementDirection: this.lastDirection,
        movementChanged: false,
        movementSource: 'analog',
        eventType: 'analog',
      };
    }

    const deadzone = Number.isFinite(options.deadzone) ? Math.max(0, Math.min(options.deadzone, 0.99)) : config.deadzone;
    const x = Number.isFinite(vector.x) ? vector.x : 0;
    const y = Number.isFinite(vector.y) ? vector.y : 0;

    const directions = new Set();
    if (y < -deadzone) {
      directions.add('up');
    } else if (y > deadzone) {
      directions.add('down');
    }

    if (x < -deadzone) {
      directions.add('left');
    } else if (x > deadzone) {
      directions.add('right');
    }

    const existing = this.stickDirections.get(id) || new Set();
    if (!setsEqual(existing, directions)) {
      this.stickDirections.set(id, directions);
      this.refreshAnalogDirections();
      const direction = this.computeMovementDirection();
      const movementChanged = direction !== this.lastDirection;
      if (movementChanged) {
        this.lastDirection = direction;
      }

      return {
        handled: movementChanged,
        actions: [],
        movementDirection: direction,
        movementChanged,
        movementSource: 'analog',
        eventType: 'analog',
      };
    }

    return {
      handled: false,
      actions: [],
      movementDirection: this.lastDirection,
      movementChanged: false,
      movementSource: 'analog',
      eventType: 'analog',
    };
  }

  refreshAnalogDirections() {
    const aggregate = new Set();
    this.stickDirections.forEach((directions) => {
      directions.forEach((direction) => aggregate.add(direction));
    });
    this.analogDirections = aggregate;
  }

  triggerBindings(bindings, phase, context = {}) {
    if (!Array.isArray(bindings) || !bindings.length) {
      return [];
    }

    const actions = [];

    bindings.forEach((binding) => {
      const state = this.bindingState.get(binding.bindingKey);
      if (!state) {
        return;
      }

      const inputId = context.inputId || binding.id;

      if (phase === 'down') {
        if (binding.trigger === 'press') {
          if (context.repeat || state.has(inputId)) {
            return;
          }
          state.add(inputId);
          actions.push(this.createAction(binding, 'start', inputId, context));
          return;
        }

        if (binding.trigger === 'hold') {
          if (state.has(inputId)) {
            return;
          }
          state.add(inputId);
          actions.push(this.createAction(binding, 'start', inputId, context));
          return;
        }

        if (binding.trigger === 'toggle') {
          const active = state.has('toggle');
          state.clear();
          if (!active) {
            state.add('toggle');
            actions.push(this.createAction(binding, 'start', inputId, context));
          } else {
            actions.push(this.createAction(binding, 'end', inputId, context));
          }
        }

        return;
      }

      if (binding.trigger === 'hold' && state.has(inputId)) {
        state.delete(inputId);
        actions.push(this.createAction(binding, 'end', inputId, context));
      } else if (binding.trigger === 'press' && state.has(inputId)) {
        state.delete(inputId);
      }
    });

    return actions;
  }

  createAction(binding, phase, inputId, context = {}) {
    const payload = {
      type: binding.actionType,
      abilityId: binding.abilityId || null,
      actionId: binding.actionId || null,
      trigger: binding.trigger,
      phase,
      source: binding.source,
      inputId,
      repeat: Boolean(context.repeat),
      bindingId: binding.bindingKey,
      label: binding.label || null,
    };

    return payload;
  }

  computeMovementDirection() {
    const hasDirection = (direction) => {
      const keys = this.movementBindings[direction] || [];
      const keyboardActive = keys.some((key) => this.activeMovementKeys.has(key));
      if (keyboardActive) {
        return true;
      }
      return this.analogDirections.has(direction);
    };

    const up = hasDirection('up');
    const down = hasDirection('down');
    const left = hasDirection('left');
    const right = hasDirection('right');

    if ((up && down) || (left && right)) {
      return null;
    }

    for (let i = 0; i < this.diagonalBindings.length; i += 1) {
      const [vertical, horizontal, diagonal] = this.diagonalBindings[i];
      if (vertical === 'up' && horizontal === 'right' && up && right) {
        return diagonal;
      }
      if (vertical === 'down' && horizontal === 'right' && down && right) {
        return diagonal;
      }
      if (vertical === 'up' && horizontal === 'left' && up && left) {
        return diagonal;
      }
      if (vertical === 'down' && horizontal === 'left' && down && left) {
        return diagonal;
      }
    }

    if (up) return 'up';
    if (down) return 'down';
    if (left) return 'left';
    if (right) return 'right';

    return null;
  }
}

export default InputMapper;
