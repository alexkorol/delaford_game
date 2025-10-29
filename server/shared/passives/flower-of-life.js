const ATTRIBUTE_IDS = ['strength', 'dexterity', 'intelligence'];

const FLOWER_OF_LIFE_LAYOUT = {
  viewBox: 640,
  center: 320,
  ringSpacing: 120,
  radii: {
    keystone: 38,
    notable: 30,
    major: 30,
    minor: 24,
    default: 26,
  },
};

const FLOWER_OF_LIFE_NODES = [
  {
    id: 'heart-of-bloom',
    label: 'Heart of Bloom',
    summary: 'Awaken the Flower and gain +5 to all attributes.',
    description: 'The living core of Delaford\'s Flower of Life. Binding to it channels latent anima into your form.',
    type: 'keystone',
    ring: 0,
    angle: 0,
    cost: 1,
    requires: [],
    gates: [
      { id: 'heart-of-bloom-level', type: 'level', level: 1 },
      { id: 'heart-of-bloom-seed', type: 'quest', questId: 'seed-of-life' },
    ],
    rewards: ['+5 Strength', '+5 Dexterity', '+5 Intelligence'],
    statBonuses: {
      attributes: { strength: 5, dexterity: 5, intelligence: 5 },
    },
  },
  {
    id: 'sprout-of-might',
    label: 'Sprout of Might',
    summary: '+4 Strength.',
    description: 'Draw raw power from the flower\'s inner coils.',
    type: 'minor',
    ring: 1,
    angle: 0,
    cost: 1,
    requires: ['heart-of-bloom'],
    gates: [],
    rewards: ['+4 Strength'],
    statBonuses: {
      attributes: { strength: 4 },
    },
  },
  {
    id: 'sprout-of-alacrity',
    label: 'Sprout of Alacrity',
    summary: '+4 Dexterity.',
    description: 'Let quicksilver sap race along your veins.',
    type: 'minor',
    ring: 1,
    angle: 60,
    cost: 1,
    requires: ['heart-of-bloom'],
    gates: [],
    rewards: ['+4 Dexterity'],
    statBonuses: {
      attributes: { dexterity: 4 },
    },
  },
  {
    id: 'sprout-of-sapience',
    label: 'Sprout of Sapience',
    summary: '+4 Intelligence.',
    description: 'Sip the flower\'s insight to sharpen your mind.',
    type: 'minor',
    ring: 1,
    angle: 120,
    cost: 1,
    requires: ['heart-of-bloom'],
    gates: [],
    rewards: ['+4 Intelligence'],
    statBonuses: {
      attributes: { intelligence: 4 },
    },
  },
  {
    id: 'sprout-of-fortitude',
    label: 'Sprout of Fortitude',
    summary: '+3 Strength and +1 Intelligence.',
    description: 'Temper brawn with a trace of foresight.',
    type: 'minor',
    ring: 1,
    angle: 180,
    cost: 1,
    requires: ['heart-of-bloom'],
    gates: [],
    rewards: ['+3 Strength', '+1 Intelligence'],
    statBonuses: {
      attributes: { strength: 3, intelligence: 1 },
    },
  },
  {
    id: 'sprout-of-balance',
    label: 'Sprout of Balance',
    summary: '+2 Dexterity and +2 Intelligence.',
    description: 'Hold poise between motion and mind.',
    type: 'minor',
    ring: 1,
    angle: 240,
    cost: 1,
    requires: ['heart-of-bloom'],
    gates: [],
    rewards: ['+2 Dexterity', '+2 Intelligence'],
    statBonuses: {
      attributes: { dexterity: 2, intelligence: 2 },
    },
  },
  {
    id: 'sprout-of-tempo',
    label: 'Sprout of Tempo',
    summary: '+1 Strength and +3 Dexterity.',
    description: 'Sync every motion to the blossom\'s cadence.',
    type: 'minor',
    ring: 1,
    angle: 300,
    cost: 1,
    requires: ['heart-of-bloom'],
    gates: [],
    rewards: ['+1 Strength', '+3 Dexterity'],
    statBonuses: {
      attributes: { strength: 1, dexterity: 3 },
    },
  },
  {
    id: 'petal-of-vigor',
    label: 'Petal of Vigor',
    summary: '+12% maximum life.',
    description: 'Every pulse of the flower reinforces your vitality.',
    type: 'notable',
    ring: 1,
    angle: 90,
    cost: 1,
    requires: ['heart-of-bloom'],
    gates: [
      { id: 'petal-of-vigor-level', type: 'level', level: 3 },
    ],
    rewards: ['+12% maximum life'],
  },
  {
    id: 'petal-of-precision',
    label: 'Petal of Precision',
    summary: '+6% critical strike chance.',
    description: 'Focus the blossom\'s geometry into razor focus.',
    type: 'notable',
    ring: 1,
    angle: 30,
    cost: 1,
    requires: ['heart-of-bloom'],
    gates: [
      { id: 'petal-of-precision-level', type: 'level', level: 3 },
    ],
    rewards: ['+6% critical strike chance'],
  },
  {
    id: 'petal-of-celerity',
    label: 'Petal of Celerity',
    summary: '+8% movement speed.',
    description: 'Let the flower\'s rhythm guide each stride.',
    type: 'notable',
    ring: 1,
    angle: 330,
    cost: 1,
    requires: ['heart-of-bloom'],
    gates: [
      { id: 'petal-of-celerity-level', type: 'level', level: 3 },
    ],
    rewards: ['+8% movement speed'],
  },
  {
    id: 'petal-of-resilience',
    label: 'Petal of Resilience',
    summary: '+15% to all resistances.',
    description: 'Crystalline petals weave a ward against the elements.',
    type: 'notable',
    ring: 1,
    angle: 270,
    cost: 1,
    requires: ['heart-of-bloom'],
    gates: [
      { id: 'petal-of-resilience-level', type: 'level', level: 3 },
    ],
    rewards: ['+15% to all resistances'],
  },
  {
    id: 'petal-of-focus',
    label: 'Petal of Focus',
    summary: '+18% maximum mana.',
    description: 'Drink deep from the well of conscious intention.',
    type: 'notable',
    ring: 1,
    angle: 210,
    cost: 1,
    requires: ['heart-of-bloom'],
    gates: [
      { id: 'petal-of-focus-level', type: 'level', level: 3 },
    ],
    rewards: ['+18% maximum mana'],
  },
  {
    id: 'petal-of-prowess',
    label: 'Petal of Prowess',
    summary: '+12% attack and spell power.',
    description: 'Direct the lattice into raw offensive intent.',
    type: 'notable',
    ring: 1,
    angle: 150,
    cost: 1,
    requires: ['heart-of-bloom'],
    gates: [
      { id: 'petal-of-prowess-level', type: 'level', level: 3 },
    ],
    rewards: ['+12% attack damage', '+12% spell power'],
  },
  {
    id: 'petal-of-harmony',
    label: 'Petal of Harmony',
    summary: '+5 to all attributes and empower supporting blooms.',
    description: 'Align major blooms so every petal resonates in concert.',
    type: 'notable',
    ring: 2.35,
    angle: 30,
    cost: 2,
    requires: ['bloom-channel', 'bloom-reach'],
    gates: [
      { id: 'petal-of-harmony-level', type: 'level', level: 16 },
    ],
    rewards: ['+5 to all attributes', '+10% area damage for channelled skills'],
    statBonuses: {
      attributes: { strength: 5, dexterity: 5, intelligence: 5 },
      modifiers: {
        'area-damage-percent': 10,
      },
    },
  },
  {
    id: 'petal-of-flowstate',
    label: 'Petal of Flowstate',
    summary: '+6 Dexterity, +6 Intelligence, and mana flow.',
    description: 'Channel bloom currents into effortless motion and thought.',
    type: 'notable',
    ring: 2.35,
    angle: 330,
    cost: 2,
    requires: ['bloom-channel', 'bloom-surge'],
    gates: [
      { id: 'petal-of-flowstate-level', type: 'level', level: 18 },
    ],
    rewards: ['+6 Dexterity', '+6 Intelligence', '+15% mana regeneration rate'],
    statBonuses: {
      attributes: { dexterity: 6, intelligence: 6 },
      modifiers: {
        'mana-regen-percent': 15,
      },
    },
  },
  {
    id: 'petal-of-aegis',
    label: 'Petal of Aegis',
    summary: '+6 Strength, +6 Dexterity, and bolstered ward.',
    description: 'Fortify the barrier between bloom and blade.',
    type: 'notable',
    ring: 2.35,
    angle: 210,
    cost: 2,
    requires: ['bloom-anchor', 'bloom-ward'],
    gates: [
      { id: 'petal-of-aegis-level', type: 'level', level: 18 },
    ],
    rewards: ['+6 Strength', '+6 Dexterity', '+150 ward'],
    statBonuses: {
      attributes: { strength: 6, dexterity: 6 },
      modifiers: {
        'ward-flat': 150,
      },
    },
  },
  {
    id: 'bloom-channel',
    label: 'Channel Bloom',
    summary: '+1 additional support rune socket.',
    description: 'Carve a resonant pathway through the lattice, empowering linked magic.',
    type: 'major',
    ring: 2,
    angle: 60,
    cost: 2,
    requires: ['petal-of-vigor', 'petal-of-precision'],
    gates: [
      { id: 'bloom-channel-level', type: 'level', level: 10 },
    ],
    rewards: ['+1 support rune socket'],
  },
  {
    id: 'bloom-reach',
    label: 'Bloom Reach',
    summary: '+20% area of effect.',
    description: 'Extend the lattice outward, bathing foes in radiant force.',
    type: 'major',
    ring: 2,
    angle: 0,
    cost: 2,
    requires: ['petal-of-precision', 'petal-of-celerity'],
    gates: [
      { id: 'bloom-reach-level', type: 'level', level: 10 },
    ],
    rewards: ['+20% area of effect'],
  },
  {
    id: 'bloom-ward',
    label: 'Bloom Ward',
    summary: '+600 ward and refreshes 50% faster.',
    description: 'Encircle yourself in petals that absorb the unthinkable.',
    type: 'major',
    ring: 2,
    angle: 300,
    cost: 2,
    requires: ['petal-of-celerity', 'petal-of-resilience'],
    gates: [
      { id: 'bloom-ward-level', type: 'level', level: 12 },
    ],
    rewards: ['+600 ward', 'Ward recharge delay -50%'],
  },
  {
    id: 'bloom-anchor',
    label: 'Bloom Anchor',
    summary: 'Cannot be stunned while above 70% life.',
    description: 'Anchor your spirit to the flower\'s rhythm and shrug off disruption.',
    type: 'major',
    ring: 2,
    angle: 240,
    cost: 2,
    requires: ['petal-of-resilience', 'petal-of-focus'],
    gates: [
      { id: 'bloom-anchor-level', type: 'level', level: 12 },
    ],
    rewards: ['Cannot be stunned above 70% life'],
  },
  {
    id: 'bloom-surge',
    label: 'Bloom Surge',
    summary: '+30% spell haste after spending mana.',
    description: 'Every expenditure of mana triggers a cascade of flow.',
    type: 'major',
    ring: 2,
    angle: 180,
    cost: 2,
    requires: ['petal-of-focus', 'petal-of-prowess'],
    gates: [
      { id: 'bloom-surge-level', type: 'level', level: 14 },
    ],
    rewards: ['+30% spell haste for 4s after spending mana'],
  },
  {
    id: 'bloom-fury',
    label: 'Bloom Fury',
    summary: '+25% ramping damage while stationary.',
    description: 'Root yourself in the flower and unleash inevitable devastation.',
    type: 'major',
    ring: 2,
    angle: 120,
    cost: 2,
    requires: ['petal-of-prowess', 'petal-of-vigor'],
    gates: [
      { id: 'bloom-fury-level', type: 'level', level: 14 },
    ],
    rewards: ['+25% damage per second while stationary (max +125%)'],
  },
  {
    id: 'lotus-of-transcendence',
    label: 'Lotus of Transcendence',
    summary: '+12 to all attributes and empower minors.',
    description: 'Bloom into a higher rhythm where every sprout surges.',
    type: 'keystone',
    ring: 3,
    angle: 30,
    cost: 3,
    requires: ['petal-of-harmony', 'petal-of-flowstate'],
    gates: [
      { id: 'lotus-of-transcendence-level', type: 'level', level: 25 },
    ],
    rewards: ['+12 to all attributes', 'Flower minor nodes grant +25% additional bonuses'],
    statBonuses: {
      attributes: { strength: 12, dexterity: 12, intelligence: 12 },
      modifiers: {
        'minor-bonus-percent': 25,
      },
    },
  },
  {
    id: 'lotus-of-bastion',
    label: 'Lotus of Bastion',
    summary: '+14 Strength, +10 Dexterity, +10 Intelligence.',
    description: 'A hardened blossom that shields the devoted.',
    type: 'keystone',
    ring: 3,
    angle: 210,
    cost: 3,
    requires: ['petal-of-aegis', 'bloom-fury'],
    gates: [
      { id: 'lotus-of-bastion-level', type: 'level', level: 26 },
    ],
    rewards: ['+14 Strength', '+10 Dexterity', '+10 Intelligence', '+400 ward'],
    statBonuses: {
      attributes: { strength: 14, dexterity: 10, intelligence: 10 },
      modifiers: {
        'ward-flat': 400,
      },
    },
  },
];

const FLOWER_OF_LIFE_CONNECTIONS = [
  { id: 'heart-vigor', from: 'heart-of-bloom', to: 'petal-of-vigor' },
  { id: 'heart-precision', from: 'heart-of-bloom', to: 'petal-of-precision' },
  { id: 'heart-celerity', from: 'heart-of-bloom', to: 'petal-of-celerity' },
  { id: 'heart-resilience', from: 'heart-of-bloom', to: 'petal-of-resilience' },
  { id: 'heart-focus', from: 'heart-of-bloom', to: 'petal-of-focus' },
  { id: 'heart-prowess', from: 'heart-of-bloom', to: 'petal-of-prowess' },
  { id: 'heart-might', from: 'heart-of-bloom', to: 'sprout-of-might' },
  { id: 'heart-alacrity', from: 'heart-of-bloom', to: 'sprout-of-alacrity' },
  { id: 'heart-sapience', from: 'heart-of-bloom', to: 'sprout-of-sapience' },
  { id: 'heart-fortitude', from: 'heart-of-bloom', to: 'sprout-of-fortitude' },
  { id: 'heart-balance', from: 'heart-of-bloom', to: 'sprout-of-balance' },
  { id: 'heart-tempo', from: 'heart-of-bloom', to: 'sprout-of-tempo' },
  { id: 'sprout-might-precision', from: 'sprout-of-might', to: 'petal-of-precision' },
  { id: 'sprout-might-celerity', from: 'sprout-of-might', to: 'petal-of-celerity' },
  { id: 'sprout-alacrity-vigor', from: 'sprout-of-alacrity', to: 'petal-of-vigor' },
  { id: 'sprout-alacrity-precision', from: 'sprout-of-alacrity', to: 'petal-of-precision' },
  { id: 'sprout-sapience-vigor', from: 'sprout-of-sapience', to: 'petal-of-vigor' },
  { id: 'sprout-sapience-prowess', from: 'sprout-of-sapience', to: 'petal-of-prowess' },
  { id: 'sprout-fortitude-prowess', from: 'sprout-of-fortitude', to: 'petal-of-prowess' },
  { id: 'sprout-fortitude-focus', from: 'sprout-of-fortitude', to: 'petal-of-focus' },
  { id: 'sprout-balance-focus', from: 'sprout-of-balance', to: 'petal-of-focus' },
  { id: 'sprout-balance-resilience', from: 'sprout-of-balance', to: 'petal-of-resilience' },
  { id: 'sprout-tempo-resilience', from: 'sprout-of-tempo', to: 'petal-of-resilience' },
  { id: 'sprout-tempo-celerity', from: 'sprout-of-tempo', to: 'petal-of-celerity' },
  { id: 'vigor-precision', from: 'petal-of-vigor', to: 'petal-of-precision' },
  { id: 'precision-celerity', from: 'petal-of-precision', to: 'petal-of-celerity' },
  { id: 'celerity-resilience', from: 'petal-of-celerity', to: 'petal-of-resilience' },
  { id: 'resilience-focus', from: 'petal-of-resilience', to: 'petal-of-focus' },
  { id: 'focus-prowess', from: 'petal-of-focus', to: 'petal-of-prowess' },
  { id: 'prowess-vigor', from: 'petal-of-prowess', to: 'petal-of-vigor' },
  { id: 'vigor-channel', from: 'petal-of-vigor', to: 'bloom-channel' },
  { id: 'precision-channel', from: 'petal-of-precision', to: 'bloom-channel' },
  { id: 'precision-reach', from: 'petal-of-precision', to: 'bloom-reach' },
  { id: 'celerity-reach', from: 'petal-of-celerity', to: 'bloom-reach' },
  { id: 'celerity-ward', from: 'petal-of-celerity', to: 'bloom-ward' },
  { id: 'resilience-ward', from: 'petal-of-resilience', to: 'bloom-ward' },
  { id: 'resilience-anchor', from: 'petal-of-resilience', to: 'bloom-anchor' },
  { id: 'focus-anchor', from: 'petal-of-focus', to: 'bloom-anchor' },
  { id: 'focus-surge', from: 'petal-of-focus', to: 'bloom-surge' },
  { id: 'prowess-surge', from: 'petal-of-prowess', to: 'bloom-surge' },
  { id: 'prowess-fury', from: 'petal-of-prowess', to: 'bloom-fury' },
  { id: 'vigor-fury', from: 'petal-of-vigor', to: 'bloom-fury' },
  { id: 'channel-harmony', from: 'bloom-channel', to: 'petal-of-harmony' },
  { id: 'reach-harmony', from: 'bloom-reach', to: 'petal-of-harmony' },
  { id: 'channel-flowstate', from: 'bloom-channel', to: 'petal-of-flowstate' },
  { id: 'surge-flowstate', from: 'bloom-surge', to: 'petal-of-flowstate' },
  { id: 'ward-aegis', from: 'bloom-ward', to: 'petal-of-aegis' },
  { id: 'anchor-aegis', from: 'bloom-anchor', to: 'petal-of-aegis' },
  { id: 'harmony-transcendence', from: 'petal-of-harmony', to: 'lotus-of-transcendence' },
  { id: 'flowstate-transcendence', from: 'petal-of-flowstate', to: 'lotus-of-transcendence' },
  { id: 'aegis-bastion', from: 'petal-of-aegis', to: 'lotus-of-bastion' },
  { id: 'fury-bastion', from: 'bloom-fury', to: 'lotus-of-bastion' },
];

const FLOWER_OF_LIFE_PETAL_GATES = [
  {
    id: 'seed-of-life',
    label: 'Awaken the Seed',
    description: 'Complete the prologue questline that binds you to the Flower.',
    type: 'quest',
    questId: 'seed-of-life',
    reward: 1,
  },
  {
    id: 'level-5',
    label: 'Reach Level 5',
    description: 'Level requirement milestone.',
    type: 'level',
    level: 5,
    reward: 1,
  },
  {
    id: 'level-10',
    label: 'Reach Level 10',
    description: 'Level requirement milestone.',
    type: 'level',
    level: 10,
    reward: 1,
  },
  {
    id: 'level-15',
    label: 'Reach Level 15',
    description: 'Level requirement milestone.',
    type: 'level',
    level: 15,
    reward: 1,
  },
  {
    id: 'level-20',
    label: 'Reach Level 20',
    description: 'Level requirement milestone.',
    type: 'level',
    level: 20,
    reward: 1,
  },
  {
    id: 'ritual-of-bloom',
    label: 'Complete a Bloom Ritual',
    description: 'Major story or encounter reward that grants an extra petal.',
    type: 'manual',
    progressKey: 'rituals',
    min: 1,
    reward: 1,
  },
];

const FLOWER_OF_LIFE_NODE_MAP = FLOWER_OF_LIFE_NODES.reduce((acc, node) => {
  acc[node.id] = node;
  return acc;
}, {});

const FLOWER_OF_LIFE_NODE_BONUS_MAP = FLOWER_OF_LIFE_NODES.reduce((acc, node) => {
  if (!node.statBonuses) {
    return acc;
  }

  const normalised = normaliseNodeBonuses(node.statBonuses);
  if (normalised) {
    acc[node.id] = normalised;
  }

  return acc;
}, {});

const FLOWER_OF_LIFE_DEPENDENT_MAP = FLOWER_OF_LIFE_NODES.reduce((acc, node) => {
  if (!Array.isArray(node.requires)) {
    return acc;
  }

  node.requires.forEach((dependencyId) => {
    if (!acc[dependencyId]) {
      acc[dependencyId] = [];
    }
    if (!acc[dependencyId].includes(node.id)) {
      acc[dependencyId].push(node.id);
    }
  });

  return acc;
}, {});

const FLOWER_OF_LIFE_DEFAULT_PROGRESS = {
  allocatedNodes: [],
  manualMilestones: {},
  counters: {},
  bonusPetals: 0,
  lastResetAt: null,
};

function createAttributeMap(initial = 0) {
  return ATTRIBUTE_IDS.reduce((acc, key) => {
    acc[key] = initial;
    return acc;
  }, {});
}

function normaliseNodeBonuses(bonuses = {}) {
  if (!bonuses || typeof bonuses !== 'object') {
    return null;
  }

  const result = {};

  if (bonuses.attributes) {
    const attributes = createAttributeMap(0);
    let hasAttributeBonus = false;
    ATTRIBUTE_IDS.forEach((attribute) => {
      const value = Number(bonuses.attributes[attribute]);
      if (Number.isFinite(value) && value !== 0) {
        attributes[attribute] = value;
        hasAttributeBonus = true;
      }
    });
    if (hasAttributeBonus) {
      result.attributes = attributes;
    }
  }

  if (bonuses.modifiers && typeof bonuses.modifiers === 'object') {
    const modifiers = {};
    Object.entries(bonuses.modifiers).forEach(([key, value]) => {
      const number = Number(value);
      if (Number.isFinite(number) && number !== 0) {
        modifiers[key] = number;
      }
    });
    if (Object.keys(modifiers).length > 0) {
      result.modifiers = modifiers;
    }
  }

  if (Object.keys(result).length === 0) {
    return null;
  }

  return result;
}

function getAllocatedNodeIds(progress = FLOWER_OF_LIFE_DEFAULT_PROGRESS) {
  if (!progress) {
    return [];
  }

  if (Array.isArray(progress)) {
    return progress;
  }

  if (progress instanceof Set) {
    return Array.from(progress);
  }

  if (typeof progress === 'object') {
    if (Array.isArray(progress.allocatedNodes)) {
      return progress.allocatedNodes;
    }
    if (Array.isArray(progress.nodes)) {
      return progress.nodes;
    }
    if (Array.isArray(progress.nodeIds)) {
      return progress.nodeIds;
    }
  }

  return [];
}

function sumModifiers(target, additions) {
  const result = { ...target };
  Object.entries(additions).forEach(([key, value]) => {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return;
    }
    if (!result[key]) {
      result[key] = 0;
    }
    result[key] += number;
  });
  return result;
}

function computeFlowerStatBonuses(progress = FLOWER_OF_LIFE_DEFAULT_PROGRESS) {
  const allocated = getAllocatedNodeIds(progress);
  const attributes = createAttributeMap(0);
  let modifiers = {};

  allocated.forEach((nodeId) => {
    const bonuses = FLOWER_OF_LIFE_NODE_BONUS_MAP[nodeId];
    if (!bonuses) {
      return;
    }

    if (bonuses.attributes) {
      ATTRIBUTE_IDS.forEach((attribute) => {
        const value = Number(bonuses.attributes[attribute]);
        if (Number.isFinite(value)) {
          attributes[attribute] += value;
        }
      });
    }

    if (bonuses.modifiers) {
      modifiers = sumModifiers(modifiers, bonuses.modifiers);
    }
  });

  return { attributes, modifiers };
}

function computeFlowerAttributeBonuses(progress = FLOWER_OF_LIFE_DEFAULT_PROGRESS) {
  return computeFlowerStatBonuses(progress).attributes;
}

function normalisePlayerLevel(player = {}) {
  const level = Number(player.level);
  if (Number.isFinite(level) && level > 0) {
    return level;
  }

  const statsLevel = Number(player.stats && player.stats.level);
  if (Number.isFinite(statsLevel) && statsLevel > 0) {
    return statsLevel;
  }

  return 1;
}

function toArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (value instanceof Set) {
    return Array.from(value);
  }
  if (typeof value === 'object') {
    return Object.keys(value).filter(key => Boolean(value[key]));
  }
  return [value];
}

function hasQuestCompletion(player = {}, questId) {
  if (!questId) {
    return false;
  }
  const questKey = String(questId).toLowerCase();
  const sources = [
    player.quests && player.quests.completed,
    player.questsCompleted,
    player.completedQuests,
    player.progression && player.progression.quests && player.progression.quests.completed,
    player.progress && player.progress.quests && player.progress.quests.completed,
  ];

  return sources.some((source) => {
    const list = toArray(source).map(entry => String(entry).toLowerCase());
    return list.includes(questKey);
  });
}

function evaluateGate(gate = {}, context = {}) {
  const { player = {}, progress = FLOWER_OF_LIFE_DEFAULT_PROGRESS } = context;
  const result = {
    id: gate.id,
    achieved: true,
    manual: false,
    manualComplete: false,
    reason: null,
    type: gate.type || 'static',
    reward: gate.reward || 0,
  };

  if (!gate || !gate.type) {
    return result;
  }

  switch (gate.type) {
    case 'level': {
      const requiredLevel = Number(gate.level) || 1;
      const level = normalisePlayerLevel(player);
      const achieved = level >= requiredLevel;
      result.achieved = achieved;
      result.requiredLevel = requiredLevel;
      result.currentLevel = level;
      if (!achieved) {
        result.reason = `Reach level ${requiredLevel}`;
      }
      break;
    }
    case 'quest': {
      const questId = gate.questId || gate.quest || gate.id;
      const manualComplete = Boolean(progress.manualMilestones && progress.manualMilestones[gate.id]);
      const completed = hasQuestCompletion(player, questId) || manualComplete;
      result.achieved = completed;
      result.manual = !hasQuestCompletion(player, questId);
      result.manualComplete = manualComplete;
      if (!completed) {
        result.reason = 'Complete the quest';
      }
      break;
    }
    case 'manual': {
      const key = gate.progressKey || gate.key || gate.id;
      const min = Number.isFinite(gate.min) ? gate.min : 1;
      const counterValue = (progress.counters && Number(progress.counters[key])) || 0;
      const manualComplete = Boolean(progress.manualMilestones && progress.manualMilestones[gate.id]);
      const achieved = manualComplete || counterValue >= min;
      result.achieved = achieved;
      result.manual = true;
      result.manualComplete = manualComplete;
      result.counterValue = counterValue;
      result.requiredCount = min;
      if (!achieved) {
        result.reason = `Mark completion (${counterValue}/${min})`;
      }
      break;
    }
    default: {
      const manualComplete = Boolean(progress.manualMilestones && progress.manualMilestones[gate.id]);
      result.achieved = manualComplete;
      result.manual = true;
      result.manualComplete = manualComplete;
      if (!manualComplete) {
        result.reason = 'Mark completion';
      }
      break;
    }
  }

  return result;
}

function computeAvailablePetalCount(player = {}, progress = FLOWER_OF_LIFE_DEFAULT_PROGRESS) {
  const gates = FLOWER_OF_LIFE_PETAL_GATES.map((gate) => {
    const evaluation = evaluateGate(gate, { player, progress });
    return {
      ...gate,
      evaluation,
    };
  });

  const totalFromGates = gates.reduce((sum, gate) => (
    gate.evaluation.achieved ? sum + (gate.reward || 0) : sum
  ), 0);

  const bonus = Number(progress.bonusPetals) || 0;

  return {
    total: totalFromGates + Math.max(0, bonus),
    gates,
    bonusPetals: Math.max(0, bonus),
  };
}

function sumAllocatedCost(nodeIds = []) {
  return nodeIds.reduce((sum, nodeId) => {
    const node = FLOWER_OF_LIFE_NODE_MAP[nodeId];
    if (!node) {
      return sum;
    }
    return sum + Math.max(0, Number(node.cost) || 0);
  }, 0);
}

export {
  FLOWER_OF_LIFE_LAYOUT,
  FLOWER_OF_LIFE_NODES,
  FLOWER_OF_LIFE_CONNECTIONS,
  FLOWER_OF_LIFE_PETAL_GATES,
  FLOWER_OF_LIFE_NODE_MAP,
  FLOWER_OF_LIFE_NODE_BONUS_MAP,
  FLOWER_OF_LIFE_DEPENDENT_MAP,
  FLOWER_OF_LIFE_DEFAULT_PROGRESS,
  evaluateGate,
  computeFlowerAttributeBonuses,
  computeFlowerStatBonuses,
  computeAvailablePetalCount,
  sumAllocatedCost,
};

export default {
  FLOWER_OF_LIFE_LAYOUT,
  FLOWER_OF_LIFE_NODES,
  FLOWER_OF_LIFE_CONNECTIONS,
  FLOWER_OF_LIFE_PETAL_GATES,
  FLOWER_OF_LIFE_NODE_MAP,
  FLOWER_OF_LIFE_NODE_BONUS_MAP,
  FLOWER_OF_LIFE_DEPENDENT_MAP,
  FLOWER_OF_LIFE_DEFAULT_PROGRESS,
  evaluateGate,
  computeFlowerAttributeBonuses,
  computeFlowerStatBonuses,
  computeAvailablePetalCount,
  sumAllocatedCost,
};
