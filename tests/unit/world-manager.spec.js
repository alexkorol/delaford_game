import { beforeEach, describe, expect, it } from 'vitest';

import world from '#server/core/world.js';

const resetWorldCollections = () => {
  const town = world.getDefaultTown();
  town.npcs = [];
  town.items = [];
  town.respawns = {
    items: [],
    monsters: [],
    resources: [],
  };
};

describe('WorldManager collection helpers', () => {
  beforeEach(() => {
    resetWorldCollections();
  });

  it('adds NPCs to the default scene', () => {
    const npc = { uuid: 'npc-1', id: 'npc:1' };

    const inserted = world.addNpc(npc);

    expect(inserted).toBe(npc);
    expect(world.npcs).toContain(npc);
  });

  it('removes NPCs by identifier', () => {
    const npcA = { uuid: 'npc-a', id: 'npc:a' };
    const npcB = { uuid: 'npc-b', id: 'npc:b' };
    world.addNpc(npcA);
    world.addNpc(npcB);

    const removed = world.removeNpc({ uuid: 'npc-a' });

    expect(removed).toEqual(npcA);
    expect(world.npcs).toEqual([npcB]);
  });

  it('adds and removes items using predicates', () => {
    const itemA = { uuid: 'item-a', id: 'item:a' };
    const itemB = { uuid: 'item-b', id: 'item:b' };
    world.addItem(itemA);
    world.addItem(itemB);

    const removed = world.removeItem(entry => entry.id === 'item:b');

    expect(removed).toEqual(itemB);
    expect(world.items).toEqual([itemA]);
  });

  it('removes resource respawns by index', () => {
    const town = world.getDefaultTown();
    const resourceA = { uuid: 'res-a' };
    const resourceB = { uuid: 'res-b' };
    town.respawns.resources = [resourceA, resourceB];

    const removed = world.removeResourceRespawn(0);

    expect(removed).toEqual(resourceA);
    expect(town.respawns.resources).toEqual([resourceB]);
  });
});
