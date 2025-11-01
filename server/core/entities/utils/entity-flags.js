const getEntityFromActor = (actor) => {
  if (!actor || typeof actor !== 'object') {
    return null;
  }

  if (actor.entity && typeof actor.entity.getComponent === 'function') {
    return actor.entity;
  }

  if (actor.ecs && actor.ecs.entity && typeof actor.ecs.entity.getComponent === 'function') {
    return actor.ecs.entity;
  }

  return null;
};

const markActorStateDirty = (actor, options = {}) => {
  const entity = getEntityFromActor(actor);
  if (!entity) {
    return false;
  }

  let flagged = false;

  const lifecycle = entity.getComponent('lifecycle');
  if (lifecycle) {
    lifecycle.dirty = true;
    lifecycle.lastDirtyAt = Date.now();
    flagged = true;
  }

  const persistence = entity.getComponent('persistence');
  if (persistence) {
    persistence.dirty = true;
    flagged = true;
  }

  if (options.forceBroadcast) {
    const networking = entity.getComponent('networking');
    if (networking) {
      networking.forceBroadcast = true;
      flagged = true;
    }
  }

  return flagged;
};

export { markActorStateDirty };

export default { markActorStateDirty };
