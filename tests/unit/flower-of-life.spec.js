import { describe, expect, it } from 'vitest';
import {
  FLOWER_OF_LIFE_NODES,
  FLOWER_OF_LIFE_CONNECTIONS,
  FLOWER_OF_LIFE_PETAL_GATES,
  FLOWER_OF_LIFE_NODE_MAP,
  FLOWER_OF_LIFE_NODE_BONUS_MAP,
  FLOWER_OF_LIFE_DEPENDENT_MAP,
  computeFlowerStatBonuses,
  computeFlowerAttributeBonuses,
} from '../../server/shared/passives/flower-of-life.js';
import { ATTRIBUTE_IDS, createAttributeMap } from '../../server/shared/stats/index.js';

describe('flower-of-life data integrity', () => {
  it('has unique node identifiers', () => {
    const ids = FLOWER_OF_LIFE_NODES.map(node => node.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('only references valid nodes in requirements', () => {
    FLOWER_OF_LIFE_NODES.forEach((node) => {
      (node.requires || []).forEach((requirement) => {
        expect(FLOWER_OF_LIFE_NODE_MAP[requirement]).toBeTruthy();
      });
    });
  });

  it('only references valid nodes in connections', () => {
    FLOWER_OF_LIFE_CONNECTIONS.forEach((connection) => {
      expect(FLOWER_OF_LIFE_NODE_MAP[connection.from]).toBeTruthy();
      expect(FLOWER_OF_LIFE_NODE_MAP[connection.to]).toBeTruthy();
      expect(connection.from).not.toBe(connection.to);
    });
  });

  it('has unique petal gate identifiers', () => {
    const gateIds = FLOWER_OF_LIFE_PETAL_GATES.map(gate => gate.id);
    const uniqueGateIds = new Set(gateIds);
    expect(uniqueGateIds.size).toBe(gateIds.length);
  });

  it('generates dependent mappings to existing nodes', () => {
    Object.entries(FLOWER_OF_LIFE_DEPENDENT_MAP).forEach(([dependency, dependents]) => {
      expect(FLOWER_OF_LIFE_NODE_MAP[dependency]).toBeTruthy();
      dependents.forEach((dependentId) => {
        expect(FLOWER_OF_LIFE_NODE_MAP[dependentId]).toBeTruthy();
      });
    });
  });

  it('aggregates attribute bonuses for allocated nodes', () => {
    const allocated = Object.keys(FLOWER_OF_LIFE_NODE_BONUS_MAP);
    const { attributes, modifiers } = computeFlowerStatBonuses({ allocatedNodes: allocated });

    const expectedAttributes = createAttributeMap(0);
    const expectedModifiers = {};

    allocated.forEach((nodeId) => {
      const bonuses = FLOWER_OF_LIFE_NODE_BONUS_MAP[nodeId];
      if (bonuses.attributes) {
        ATTRIBUTE_IDS.forEach((attributeId) => {
          const value = Number(bonuses.attributes[attributeId]);
          if (Number.isFinite(value)) {
            expectedAttributes[attributeId] += value;
          }
        });
      }
      if (bonuses.modifiers) {
        Object.entries(bonuses.modifiers).forEach(([key, value]) => {
          const amount = Number(value);
          if (Number.isFinite(amount)) {
            expectedModifiers[key] = (expectedModifiers[key] || 0) + amount;
          }
        });
      }
    });

    expect(attributes).toEqual(expectedAttributes);
    expect(modifiers).toEqual(expectedModifiers);
  });

  it('returns zeroed attributes when no nodes are allocated', () => {
    const attributes = computeFlowerAttributeBonuses({ allocatedNodes: [] });
    const expected = createAttributeMap(0);
    expect(attributes).toEqual(expected);
  });
});
