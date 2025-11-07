import { defineStore } from 'pinia';
import bus from '../core/utilities/bus.js';

const clone = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Map) {
    return new Map(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => clone(entry));
  }

  return Object.entries(value).reduce((acc, [key, val]) => {
    acc[key] = clone(val);
    return acc;
  }, {});
};

const appendEvent = (events, event, max = 50) => {
  const next = [...events, event];
  if (next.length > max) {
    return next.slice(next.length - max);
  }
  return next;
};

export const useCombatStore = defineStore('combat', {
  state: () => ({
    log: [],
    entities: {},
    _subscribed: false,
    _eventHandler: null,
    _entityHandler: null,
  }),
  actions: {
    ensureSubscriptions() {
      if (this._subscribed) {
        return;
      }

      const handleEvent = (event) => {
        this.recordEvent(event);
      };

      const handleEntityUpdate = ({ entity }) => {
        if (entity && entity.id) {
          this.upsertEntity(entity);
        }
      };

      bus.$on('COMBAT:EVENT', handleEvent);
      bus.$on('COMBAT:ENTITY_UPDATED', handleEntityUpdate);

      this._eventHandler = handleEvent;
      this._entityHandler = handleEntityUpdate;
      this._subscribed = true;
    },
    dispose() {
      if (!this._subscribed) {
        return;
      }

      if (this._eventHandler) {
        bus.$off('COMBAT:EVENT', this._eventHandler);
      }
      if (this._entityHandler) {
        bus.$off('COMBAT:ENTITY_UPDATED', this._entityHandler);
      }

      this._eventHandler = null;
      this._entityHandler = null;
      this._subscribed = false;
    },
    clearLog() {
      this.log = [];
    },
    recordEvent(event) {
      const entry = {
        ...event,
        timestamp: event?.timestamp || Date.now(),
      };
      this.log = appendEvent(this.log, entry);
    },
    upsertEntity(entity) {
      if (!entity || !entity.id) {
        return;
      }

      const existing = this.entities[entity.id] || {};
      this.entities[entity.id] = {
        ...existing,
        ...clone(entity),
        health: clone(entity.health) || existing.health || null,
        stats: clone(entity.stats) || existing.stats || {},
        modifiers: clone(entity.modifiers) || existing.modifiers || {},
        resistances: entity.resistances instanceof Map
          ? new Map(entity.resistances)
          : clone(entity.resistances) || existing.resistances || new Map(),
      };
    },
  },
});

export default useCombatStore;
