const clone = (value) => {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(clone);
  }
  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, entry]) => {
      acc[key] = clone(entry);
      return acc;
    }, {});
  }
  return value;
};

export const createSkillDefinition = (definition = {}) => {
  if (!definition.id || typeof definition.id !== 'string') {
    throw new Error('Skill definitions require a string `id`.');
  }

  const activation = definition.activation || 'press';
  const animation = definition.animation ? {
    state: definition.animation.state || null,
    duration: Number.isFinite(definition.animation.duration)
      ? definition.animation.duration
      : undefined,
    holdState: definition.animation.holdState || null,
  } : null;

  const quickbar = definition.quickbar ? {
    slot: Number.isFinite(definition.quickbar.slot)
      ? definition.quickbar.slot
      : null,
    hotkey: definition.quickbar.hotkey || null,
    binding: definition.quickbar.binding || definition.id,
    sortOrder: Number.isFinite(definition.quickbar.sortOrder)
      ? definition.quickbar.sortOrder
      : (Number.isFinite(definition.quickbar.slot) ? definition.quickbar.slot : 0),
    group: definition.quickbar.group || null,
  } : null;

  return Object.freeze({
    id: definition.id,
    name: definition.name || definition.label || definition.id,
    label: definition.label || definition.name || definition.id,
    icon: definition.icon || '',
    description: definition.description || '',
    category: definition.category || 'general',
    activation,
    cooldown: Number.isFinite(definition.cooldown) ? definition.cooldown : 0,
    resourceCost: clone(definition.resourceCost || {}),
    animation,
    modifiers: clone(definition.modifiers || {}),
    behaviour: clone(definition.behaviour || {}),
    tags: Array.isArray(definition.tags) ? [...definition.tags] : [],
    quickbar,
  });
};

export const createQuickbarSlot = (descriptor = {}, resolveSkill) => {
  const slotIndex = Number.isFinite(descriptor.slotIndex)
    ? descriptor.slotIndex
    : 0;
  const baseId = descriptor.id || `slot-${slotIndex + 1}`;
  const hotkey = descriptor.hotkey || `${slotIndex + 1}`;
  const skill = descriptor.skillId && typeof resolveSkill === 'function'
    ? resolveSkill(descriptor.skillId)
    : null;

  return {
    id: baseId,
    slotIndex,
    hotkey,
    label: skill ? skill.label : `Empty Slot ${slotIndex + 1}`,
    icon: skill ? skill.icon : '',
    skillId: skill ? skill.id : null,
    skill,
    binding: descriptor.binding || (skill && skill.quickbar ? skill.quickbar.binding : null),
  };
};

export default {
  createSkillDefinition,
  createQuickbarSlot,
};
