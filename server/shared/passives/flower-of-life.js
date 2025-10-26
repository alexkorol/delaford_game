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
];

const FLOWER_OF_LIFE_CONNECTIONS = [
  { id: 'heart-vigor', from: 'heart-of-bloom', to: 'petal-of-vigor' },
  { id: 'heart-precision', from: 'heart-of-bloom', to: 'petal-of-precision' },
  { id: 'heart-celerity', from: 'heart-of-bloom', to: 'petal-of-celerity' },
  { id: 'heart-resilience', from: 'heart-of-bloom', to: 'petal-of-resilience' },
  { id: 'heart-focus', from: 'heart-of-bloom', to: 'petal-of-focus' },
  { id: 'heart-prowess', from: 'heart-of-bloom', to: 'petal-of-prowess' },
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
  FLOWER_OF_LIFE_DEPENDENT_MAP,
  FLOWER_OF_LIFE_DEFAULT_PROGRESS,
  evaluateGate,
  computeAvailablePetalCount,
  sumAllocatedCost,
};

export default {
  FLOWER_OF_LIFE_LAYOUT,
  FLOWER_OF_LIFE_NODES,
  FLOWER_OF_LIFE_CONNECTIONS,
  FLOWER_OF_LIFE_PETAL_GATES,
  FLOWER_OF_LIFE_NODE_MAP,
  FLOWER_OF_LIFE_DEPENDENT_MAP,
  FLOWER_OF_LIFE_DEFAULT_PROGRESS,
  evaluateGate,
  computeAvailablePetalCount,
  sumAllocatedCost,
};
