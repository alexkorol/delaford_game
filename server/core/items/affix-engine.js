import { brands, bonds } from './affix-data/index.js';

const structuredCloneSafe = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const ensureNumber = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);

const resolveItemTags = (item) => {
  const tags = new Set();

  if (!item || typeof item !== 'object') {
    return tags;
  }

  if (item.type) {
    tags.add(item.type);
  }

  if (item.slot) {
    tags.add(`slot:${item.slot}`);
  }

  if (item.wearable) {
    tags.add(`wearable:${item.wearable}`);
  }

  if (Array.isArray(item.affixTags)) {
    item.affixTags.forEach((tag) => tags.add(tag));
  }

  return tags;
};

const isRangeDescriptor = (value) => (
  value
  && typeof value === 'object'
  && Object.prototype.hasOwnProperty.call(value, 'min')
  && Object.prototype.hasOwnProperty.call(value, 'max')
);

const rollInRange = (range, rng) => {
  const minimum = ensureNumber(range.min, range.max);
  const maximum = ensureNumber(range.max, range.min);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    return 0;
  }

  const min = Math.min(minimum, maximum);
  const max = Math.max(minimum, maximum);
  const random = rng();
  return Math.floor((random * ((max - min) + 1)) + min);
};

const rollStatBlock = (stats, rng) => {
  if (!stats || typeof stats !== 'object') {
    return {};
  }

  return Object.entries(stats).reduce((acc, [key, value]) => {
    if (isRangeDescriptor(value)) {
      acc[key] = rollInRange(value, rng);
      return acc;
    }

    if (value && typeof value === 'object') {
      acc[key] = rollStatBlock(value, rng);
      return acc;
    }

    acc[key] = ensureNumber(value);
    return acc;
  }, {});
};

const mergeStatBlocks = (target, addition) => {
  const output = target || {};
  if (!addition || typeof addition !== 'object') {
    return output;
  }

  Object.entries(addition).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Number.isFinite(value)) {
      if (!output[key]) {
        output[key] = {};
      }
      output[key] = mergeStatBlocks(output[key], value);
      return;
    }

    const current = ensureNumber(output[key]);
    output[key] = current + ensureNumber(value);
  });

  return output;
};

const cloneAndMergeStats = (baseStats, affixTotals) => {
  const cloned = structuredCloneSafe(baseStats || {});

  const apply = (target, addition) => {
    Object.entries(addition).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Number.isFinite(value)) {
        if (!target[key]) {
          target[key] = {};
        }
        apply(target[key], value);
        return;
      }

      const current = ensureNumber(target[key]);
      target[key] = current + ensureNumber(value);
    });
  };

  apply(cloned, affixTotals || {});
  return cloned;
};

const filterEligibleTiers = (tiers, itemLevel) => {
  if (!Array.isArray(tiers)) {
    return [];
  }

  return tiers.filter((tier) => {
    const requiredLevel = ensureNumber(tier.level, 1);
    return itemLevel >= requiredLevel;
  });
};

const chooseTier = (tiers, itemLevel, rng) => {
  const eligible = filterEligibleTiers(tiers, itemLevel);
  if (!eligible.length) {
    return null;
  }

  const totalWeight = eligible.reduce((sum, tier) => sum + ensureNumber(tier.weight, 1), 0);
  if (totalWeight <= 0) {
    return eligible[0];
  }

  let threshold = rng() * totalWeight;
  for (let index = 0; index < eligible.length; index += 1) {
    const tier = eligible[index];
    threshold -= ensureNumber(tier.weight, 1);
    if (threshold <= 0) {
      return tier;
    }
  }

  return eligible[eligible.length - 1];
};

const chooseAffix = (collection, tags, itemLevel, rng) => {
  if (!Array.isArray(collection) || !collection.length) {
    return null;
  }

  const candidates = collection.filter((affix) => {
    if (!Array.isArray(affix.tags) || !affix.tags.length) {
      return true;
    }
    return affix.tags.some((tag) => tags.has(tag));
  });

  const expanded = candidates
    .map((affix) => {
      const tier = chooseTier(affix.tiers, itemLevel, rng);
      if (!tier) {
        return null;
      }

      return {
        affix,
        tier,
        weight: ensureNumber(affix.weight, 1) * ensureNumber(tier.weight, 1),
      };
    })
    .filter(Boolean);

  if (!expanded.length) {
    return null;
  }

  const totalWeight = expanded.reduce((sum, entry) => sum + ensureNumber(entry.weight, 1), 0);
  let threshold = rng() * totalWeight;

  for (let index = 0; index < expanded.length; index += 1) {
    const entry = expanded[index];
    threshold -= ensureNumber(entry.weight, 1);
    if (threshold <= 0) {
      const values = rollStatBlock(entry.tier.stats, rng);
      return {
        id: entry.affix.id,
        kind: entry.affix.kind,
        name: entry.affix.name,
        description: entry.affix.description,
        tier: entry.tier.tier,
        level: entry.tier.level,
        values,
      };
    }
  }

  const fallback = expanded[expanded.length - 1];
  return {
    id: fallback.affix.id,
    kind: fallback.affix.kind,
    name: fallback.affix.name,
    description: fallback.affix.description,
    tier: fallback.tier.tier,
    level: fallback.tier.level,
    values: rollStatBlock(fallback.tier.stats, rng),
  };
};

const aggregateAffixValues = (affixes) => {
  const totals = {};
  if (!affixes) {
    return totals;
  }

  ['brand', 'bond'].forEach((key) => {
    const affix = affixes[key];
    if (affix && affix.values) {
      mergeStatBlocks(totals, affix.values);
    }
  });

  return totals;
};

const resolveItemLevel = (item) => {
  if (!item || typeof item !== 'object') {
    return 1;
  }

  if (Number.isFinite(item.level)) {
    return item.level;
  }

  if (item.requires && Number.isFinite(item.requires.level)) {
    return item.requires.level;
  }

  if (Number.isFinite(item.affixLevel)) {
    return item.affixLevel;
  }

  return 1;
};

const rollAffixes = (item, options = {}) => {
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;
  const tags = resolveItemTags(item);
  const level = resolveItemLevel(item);

  const brand = chooseAffix(brands, tags, level, rng);
  const bond = chooseAffix(bonds, tags, level, rng);

  const affixes = { brand, bond };
  const totals = aggregateAffixValues(affixes);

  return {
    affixes,
    totals,
  };
};

export {
  rollAffixes,
  cloneAndMergeStats,
  structuredCloneSafe,
};
