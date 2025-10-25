export default [
  {
    id: 'warding-bond',
    kind: 'bond',
    name: 'of Warding',
    description: 'Anchors the wearer with protective wards.',
    tags: ['armor', 'jewelry'],
    tiers: [
      {
        tier: 1,
        level: 1,
        weight: 60,
        stats: {
          defense: {
            stab: { min: 2, max: 3 },
            slash: { min: 2, max: 3 },
            crush: { min: 2, max: 3 },
            range: { min: 1, max: 2 },
          },
        },
      },
      {
        tier: 2,
        level: 14,
        weight: 30,
        stats: {
          defense: {
            stab: { min: 3, max: 5 },
            slash: { min: 3, max: 5 },
            crush: { min: 3, max: 5 },
            range: { min: 2, max: 3 },
          },
        },
      },
      {
        tier: 3,
        level: 26,
        weight: 15,
        stats: {
          defense: {
            stab: { min: 5, max: 7 },
            slash: { min: 5, max: 7 },
            crush: { min: 5, max: 7 },
            range: { min: 3, max: 4 },
          },
        },
      },
    ],
  },
  {
    id: 'ferocity-bond',
    kind: 'bond',
    name: 'of Ferocity',
    description: 'Leaves faint echoes of battles fought, spurring the wielder onwards.',
    tags: ['weapon', 'armor'],
    tiers: [
      {
        tier: 1,
        level: 1,
        weight: 55,
        stats: {
          attack: {
            stab: { min: 1, max: 2 },
            slash: { min: 1, max: 2 },
            crush: { min: 1, max: 2 },
          },
        },
      },
      {
        tier: 2,
        level: 15,
        weight: 32,
        stats: {
          attack: {
            stab: { min: 2, max: 3 },
            slash: { min: 2, max: 3 },
            crush: { min: 2, max: 3 },
            range: { min: 1, max: 2 },
          },
        },
      },
      {
        tier: 3,
        level: 27,
        weight: 18,
        stats: {
          attack: {
            stab: { min: 3, max: 4 },
            slash: { min: 3, max: 4 },
            crush: { min: 3, max: 4 },
            range: { min: 2, max: 3 },
          },
        },
      },
    ],
  },
  {
    id: 'focus-bond',
    kind: 'bond',
    name: 'of Focus',
    description: 'Calms restless spirits, sharpening awareness.',
    tags: ['weapon', 'jewelry'],
    tiers: [
      {
        tier: 1,
        level: 3,
        weight: 50,
        stats: {
          attack: { range: { min: 1, max: 2 } },
          defense: { range: { min: 1, max: 1 } },
        },
      },
      {
        tier: 2,
        level: 18,
        weight: 32,
        stats: {
          attack: { range: { min: 2, max: 4 } },
          defense: { range: { min: 1, max: 2 } },
        },
      },
      {
        tier: 3,
        level: 30,
        weight: 18,
        stats: {
          attack: { range: { min: 3, max: 5 } },
          defense: { range: { min: 2, max: 3 } },
        },
      },
    ],
  },
];
