export default [
  {
    id: 'soldier-brand',
    kind: 'brand',
    name: "Soldier's",
    description: 'Favoured by disciplined fighters. Increases melee accuracy and fortitude.',
    tags: ['weapon', 'armor'],
    tiers: [
      {
        tier: 1,
        level: 1,
        weight: 60,
        stats: {
          attack: { stab: { min: 1, max: 2 }, slash: { min: 1, max: 2 }, crush: { min: 1, max: 2 } },
          defense: { stab: { min: 1, max: 1 }, slash: { min: 1, max: 1 }, crush: { min: 1, max: 1 } },
        },
      },
      {
        tier: 2,
        level: 10,
        weight: 35,
        stats: {
          attack: { stab: { min: 2, max: 4 }, slash: { min: 2, max: 4 }, crush: { min: 2, max: 4 } },
          defense: { stab: { min: 1, max: 2 }, slash: { min: 1, max: 2 }, crush: { min: 1, max: 2 } },
        },
      },
      {
        tier: 3,
        level: 20,
        weight: 15,
        stats: {
          attack: { stab: { min: 4, max: 6 }, slash: { min: 4, max: 6 }, crush: { min: 4, max: 6 } },
          defense: { stab: { min: 2, max: 3 }, slash: { min: 2, max: 3 }, crush: { min: 2, max: 3 } },
        },
      },
    ],
  },
  {
    id: 'ranger-brand',
    kind: 'brand',
    name: "Ranger's",
    description: 'Enhances ranged prowess and agility.',
    tags: ['weapon', 'jewelry'],
    tiers: [
      {
        tier: 1,
        level: 1,
        weight: 55,
        stats: {
          attack: { range: { min: 2, max: 4 } },
          defense: { range: { min: 1, max: 2 } },
        },
      },
      {
        tier: 2,
        level: 12,
        weight: 30,
        stats: {
          attack: { range: { min: 4, max: 6 } },
          defense: { range: { min: 2, max: 3 } },
        },
      },
      {
        tier: 3,
        level: 22,
        weight: 15,
        stats: {
          attack: { range: { min: 6, max: 8 } },
          defense: { range: { min: 3, max: 4 } },
        },
      },
    ],
  },
  {
    id: 'battlemage-brand',
    kind: 'brand',
    name: "Battlemage's",
    description: 'A rare attunement that balances the physical and the arcane.',
    tags: ['weapon', 'armor', 'jewelry'],
    tiers: [
      {
        tier: 1,
        level: 5,
        weight: 45,
        stats: {
          attack: { stab: { min: 1, max: 2 }, slash: { min: 1, max: 2 }, range: { min: 1, max: 2 } },
          defense: { stab: { min: 1, max: 2 }, slash: { min: 1, max: 2 }, range: { min: 1, max: 2 } },
        },
      },
      {
        tier: 2,
        level: 16,
        weight: 35,
        stats: {
          attack: { stab: { min: 2, max: 3 }, slash: { min: 2, max: 3 }, crush: { min: 2, max: 3 }, range: { min: 2, max: 3 } },
          defense: { stab: { min: 2, max: 3 }, slash: { min: 2, max: 3 }, range: { min: 2, max: 3 } },
        },
      },
      {
        tier: 3,
        level: 28,
        weight: 20,
        stats: {
          attack: { stab: { min: 3, max: 5 }, slash: { min: 3, max: 5 }, crush: { min: 3, max: 5 }, range: { min: 3, max: 5 } },
          defense: { stab: { min: 3, max: 4 }, slash: { min: 3, max: 4 }, range: { min: 3, max: 4 } },
        },
      },
    ],
  },
];
