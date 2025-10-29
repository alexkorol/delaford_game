/** @vitest-environment node */

import { describe, expect, it } from 'vitest';

import { normaliseInventoryItem } from '@/core/inventory/normalise.js';
import { createFootprint, rotateOrientation, getItemDimensions } from '@/core/inventory/footprint.js';
import { canPlaceItem } from '@/core/inventory/collision.js';
import { applyStacking, canStackWith, isStackableItem } from '@/core/inventory/stacking.js';
import { DEFAULT_GRID, ORIENTATION_DEFAULT, ORIENTATION_ROTATED } from '@/core/inventory/constants.js';

const mockItem = (overrides = {}) => ({
  id: 'mock-item',
  slot: 0,
  size: { width: 2, height: 1 },
  graphics: { tileset: 'weapons', column: 0, row: 0 },
  ...overrides,
});

describe('inventory footprint utilities', () => {
  it('builds a footprint for a given item and position', () => {
    const item = mockItem();
    const footprint = createFootprint({ x: 2, y: 3 }, item, ORIENTATION_DEFAULT);
    expect(footprint).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ]);
  });

  it('swaps width and height when rotated', () => {
    const item = mockItem({ size: { width: 1, height: 3 } });
    const rotated = getItemDimensions(item, ORIENTATION_ROTATED);
    expect(rotated).toEqual({ width: 3, height: 1 });
  });
});

describe('inventory normalisation', () => {
  it('derives slot coordinates and preserves uuid', () => {
    const item = mockItem({ uuid: 'abc-123', slot: 5 });
    const normalised = normaliseInventoryItem(item, DEFAULT_GRID);
    expect(normalised.uuid).toBe('abc-123');
    expect(normalised.position).toEqual({ x: 5 % DEFAULT_GRID.columns, y: Math.floor(5 / DEFAULT_GRID.columns) });
    expect(normalised.baseSize).toEqual({ width: 2, height: 1 });
  });
});

describe('collision detection', () => {
  it('detects collisions against occupied cells', () => {
    const active = mockItem({ uuid: 'moving', position: { x: 0, y: 0 } });
    const blocking = mockItem({ uuid: 'blocking', position: { x: 1, y: 0 } });
    const result = canPlaceItem([
      active,
      blocking,
    ], { x: 1, y: 0 }, active, DEFAULT_GRID, ORIENTATION_DEFAULT);

    expect(result.valid).toBe(false);
    expect(result.blockers).toContain('blocking');
  });

  it('allows placement when rotated inside bounds', () => {
    const active = mockItem({ uuid: 'moving', size: { width: 1, height: 3 } });
    const rotated = rotateOrientation(ORIENTATION_DEFAULT);
    const result = canPlaceItem([active], { x: 0, y: 0 }, active, DEFAULT_GRID, rotated);
    expect(result.valid).toBe(true);
  });
});

describe('stacking utilities', () => {
  it('identifies stackable items via flags or qty', () => {
    expect(isStackableItem({ stackable: true })).toBe(true);
    expect(isStackableItem({ qty: 5 })).toBe(true);
    expect(isStackableItem({})).toBe(false);
  });

  it('merges quantities within the max stack threshold', () => {
    const source = { id: 'potion', qty: 5, stackable: true, maxStack: 10 };
    const target = { id: 'potion', qty: 4, stackable: true, maxStack: 10 };
    expect(canStackWith(source, target)).toBe(true);

    const outcome = applyStacking(source, target);
    expect(outcome).toEqual({ sourceRemainder: 0, targetQty: 9 });
  });

  it('returns remainder when exceeding max stack', () => {
    const source = { id: 'potion', qty: 12, stackable: true, maxStack: 10 };
    const target = { id: 'potion', qty: 4, stackable: true, maxStack: 10 };
    const outcome = applyStacking(source, target);
    expect(outcome).toEqual({ sourceRemainder: 6, targetQty: 10 });
  });
});
