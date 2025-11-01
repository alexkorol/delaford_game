const shouldPersist = ({ persistence, lifecycle }) => {
  if (!persistence) {
    return false;
  }

  if (persistence.dirty) {
    return true;
  }

  if (lifecycle && lifecycle.dirty) {
    return true;
  }

  return false;
};

const ensurePromise = (result) => {
  if (!result) {
    return null;
  }

  if (typeof result.then === 'function') {
    return result;
  }

  return null;
};

const createPersistenceSystem = (options = {}) => {
  const defaultCooldown = Number.isFinite(options.defaultCooldownMs)
    ? options.defaultCooldownMs
    : 5_000;

  return (world, _delta, context = {}) => {
    const entities = world.query('persistence');
    const now = Number.isFinite(context.now) ? context.now : Date.now();

    entities.forEach((entity) => {
      const persistence = entity.getComponent('persistence');
      if (!persistence || typeof persistence.save !== 'function') {
        return;
      }

      const lifecycle = entity.getComponent('lifecycle');
      if (!shouldPersist({ persistence, lifecycle })) {
        return;
      }

      const cooldown = Number.isFinite(persistence.cooldownMs)
        ? persistence.cooldownMs
        : defaultCooldown;

      const lastSavedAt = Number.isFinite(persistence.lastSaveAt)
        ? persistence.lastSaveAt
        : 0;

      if (cooldown && (now - lastSavedAt) < cooldown) {
        return;
      }

      try {
        const result = persistence.save({ entity, world, context, now });
        persistence.lastSaveAt = now;

        const deferred = ensurePromise(result);
        if (deferred) {
          deferred.catch((error) => {
            console.error('[persistence-system] save failed', error);
          });
        }
      } catch (error) {
        console.error('[persistence-system] save threw synchronously', error);
      } finally {
        if (persistence.autoClearDirty !== false) {
          persistence.dirty = false;
        }
        if (lifecycle) {
          lifecycle.dirty = false;
        }
      }
    });
  };
};

export { createPersistenceSystem as default, createPersistenceSystem };
