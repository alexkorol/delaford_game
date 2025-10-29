import { DEFAULT_SKILL_IDS } from '../combat.js';
import { createSkillDefinition, createQuickbarSlot } from './schema.js';

const SKILL_DEFINITIONS = [
  createSkillDefinition({
    id: DEFAULT_SKILL_IDS.primary,
    name: 'Blade Sweep',
    label: 'Blade Sweep',
    icon: '⚔️',
    category: 'combat',
    description: 'Deliver a quick melee strike in front of you.',
    animation: { state: 'attack', duration: 420, holdState: 'idle' },
    quickbar: { slot: 0, hotkey: '1', binding: DEFAULT_SKILL_IDS.primary, group: 'combat' },
    modifiers: { globalCooldownMs: 350 },
    tags: ['starter', 'melee'],
  }),
  createSkillDefinition({
    id: DEFAULT_SKILL_IDS.dash,
    name: 'Phantom Step',
    label: 'Phantom Step',
    icon: '💨',
    category: 'mobility',
    description: 'Dash a short distance in the direction you are facing.',
    animation: { state: 'dash', duration: 320, holdState: 'run' },
    quickbar: { slot: 1, hotkey: '2', binding: DEFAULT_SKILL_IDS.dash, group: 'movement' },
    behaviour: { movement: { distance: 3 } },
    cooldown: 8,
    tags: ['movement'],
  }),
  createSkillDefinition({
    id: DEFAULT_SKILL_IDS.ability1,
    name: 'Ember Volley',
    label: 'Ember Volley',
    icon: '🔥',
    category: 'combat',
    description: 'Launch a spread of searing bolts that damages foes at range.',
    animation: { state: 'attack', duration: 520, holdState: 'idle' },
    quickbar: { slot: 2, hotkey: '3', group: 'ability' },
    behaviour: { projectile: { range: 5, travelTimeMs: 280 } },
    cooldown: 6,
    resourceCost: { mana: 12 },
    tags: ['ranged', 'burst'],
  }),
  createSkillDefinition({
    id: DEFAULT_SKILL_IDS.ability2,
    name: 'Frost Nova',
    label: 'Frost Nova',
    icon: '❄️',
    category: 'control',
    description: 'Shatter the ground around you, slowing nearby enemies.',
    animation: { state: 'attack', duration: 600, holdState: 'idle' },
    quickbar: { slot: 3, hotkey: '4', group: 'ability' },
    behaviour: { area: { radius: 2, slowMultiplier: 0.6, durationMs: 5000 } },
    cooldown: 12,
    resourceCost: { mana: 20 },
    tags: ['area', 'crowd-control'],
  }),
  createSkillDefinition({
    id: DEFAULT_SKILL_IDS.ability3,
    name: 'Stoneguard',
    label: 'Stoneguard',
    icon: '🛡️',
    category: 'defence',
    description: 'Reinforce yourself with stone, increasing defences temporarily.',
    animation: { state: 'attack', duration: 400, holdState: 'idle' },
    quickbar: { slot: 4, hotkey: '5', group: 'ability' },
    behaviour: { buff: { armourBonus: 12, durationMs: 6000 } },
    cooldown: 18,
    resourceCost: { mana: 10 },
    tags: ['buff'],
  }),
  createSkillDefinition({
    id: DEFAULT_SKILL_IDS.ability4,
    name: 'Celestial Mend',
    label: 'Celestial Mend',
    icon: '✨',
    category: 'support',
    description: 'Channel radiant energy to heal an ally or yourself.',
    animation: { state: 'attack', duration: 520, holdState: 'idle' },
    quickbar: { slot: 5, hotkey: '6', group: 'support' },
    behaviour: { heal: { base: 18, scaling: 'intelligence', range: 5 } },
    cooldown: 20,
    resourceCost: { mana: 22 },
    tags: ['support', 'healing'],
  }),
];

const SKILL_REGISTRY = new Map(SKILL_DEFINITIONS.map((skill) => [skill.id, skill]));

export const getSkillDefinition = (skillId) => {
  if (!skillId) {
    return null;
  }
  return SKILL_REGISTRY.get(skillId) || null;
};

const QUICKBAR_TEMPLATE = [
  { slotIndex: 0, hotkey: '1', skillId: DEFAULT_SKILL_IDS.primary },
  { slotIndex: 1, hotkey: '2', skillId: DEFAULT_SKILL_IDS.dash },
  { slotIndex: 2, hotkey: '3', skillId: DEFAULT_SKILL_IDS.ability1 },
  { slotIndex: 3, hotkey: '4', skillId: DEFAULT_SKILL_IDS.ability2 },
  { slotIndex: 4, hotkey: '5', skillId: DEFAULT_SKILL_IDS.ability3 },
  { slotIndex: 5, hotkey: '6', skillId: DEFAULT_SKILL_IDS.ability4 },
  { slotIndex: 6, hotkey: '7', skillId: null },
  { slotIndex: 7, hotkey: '8', skillId: null },
];

export const createQuickbarSlots = () => QUICKBAR_TEMPLATE.map(
  (descriptor) => createQuickbarSlot(descriptor, getSkillDefinition),
);

export const getSkillExecutionProfile = (skillId) => {
  const skill = getSkillDefinition(skillId);
  if (!skill) {
    return null;
  }

  const animation = skill.animation || {};
  return {
    skill,
    animationState: animation.state || 'attack',
    duration: animation.duration,
    holdState: animation.holdState,
    modifiers: skill.modifiers || {},
  };
};

export const listSkills = () => [...SKILL_DEFINITIONS];
export const listQuickbarTemplate = () => QUICKBAR_TEMPLATE.map((entry) => ({ ...entry }));

export default {
  listSkills,
  listQuickbarTemplate,
  createQuickbarSlots,
  getSkillDefinition,
  getSkillExecutionProfile,
};
