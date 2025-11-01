import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Inventory from '#server/core/utilities/common/player/inventory.js';
import world from '#server/core/world.js';
import UI from '#shared/ui.js';
import ItemFactory from '#server/core/items/factory.js';
import Query from '#server/core/data/query.js';

describe('Inventory.add', () => {
  let inventorySlots;
  let inventory;

  beforeEach(() => {
    inventorySlots = [];
    world._players = [{
      socket_id: 'socket-1',
      uuid: 'player-1',
    }];
    inventory = new Inventory(inventorySlots, 'socket-1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    world._players = [];
  });

  it('adds items when an open slot exists', async () => {
    vi.spyOn(Query, 'getItemData').mockReturnValue({ id: 'test-item', stackable: false });
    vi.spyOn(UI, 'getOpenSlot').mockReturnValue(5);
    vi.spyOn(ItemFactory, 'createById').mockImplementation((id, options) => ({
      id,
      uuid: options?.uuid || 'generated-1',
    }));

    const result = await inventory.add('test-item', 1);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.reason).toBeNull();
    expect(result.added).toHaveLength(1);
    expect(inventorySlots).toHaveLength(1);
    expect(inventorySlots[0].slot).toBe(5);
  });

  it('reports failure when no slots are available', async () => {
    vi.spyOn(Query, 'getItemData').mockReturnValue({ id: 'test-item', stackable: false });
    vi.spyOn(UI, 'getOpenSlot').mockReturnValue(false);

    const result = await inventory.add('test-item', 2);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('inventory_full');
    expect(result.remaining).toBe(2);
    expect(result.added).toHaveLength(0);
    expect(inventorySlots).toHaveLength(0);
  });

  it('tracks remaining quantity when only partial additions succeed', async () => {
    vi.spyOn(Query, 'getItemData').mockReturnValue({ id: 'test-item', stackable: false });
    const getOpenSlot = vi.spyOn(UI, 'getOpenSlot');
    getOpenSlot
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1)
      .mockReturnValue(false);

    let created = 0;
    vi.spyOn(ItemFactory, 'createById').mockImplementation(() => ({
      id: 'test-item',
      uuid: `generated-${created += 1}`,
    }));

    const result = await inventory.add('test-item', 3);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('inventory_full');
    expect(result.remaining).toBe(1);
    expect(result.added).toHaveLength(2);
    expect(inventorySlots).toHaveLength(2);
    expect(inventorySlots.map(item => item.slot)).toEqual([0, 1]);
  });
});
