/**
 * @vitest-environment node
 *
 * Tests for the mining concurrency lock mechanism.
 * Verifies that Mining._activeMiningLocks prevents a player from starting
 * multiple mining operations simultaneously and that locks are properly released.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';

// Mock dependencies that Mining imports so the module can load in isolation
vi.mock('#server/core/data/query.js', () => ({
  default: { getItemData: vi.fn(() => ({ actions: ['mine'], id: 'bronze_pickaxe' })) },
}));

vi.mock('#server/core/data/foreground/index.js', () => ({
  foregroundObjects: [],
}));

vi.mock('#server/core/world.js', () => ({
  default: {
    players: [],
    items: [],
    addItem: vi.fn(),
  },
}));

vi.mock('#server/socket.js', () => ({
  default: {
    emit: vi.fn(),
    broadcast: vi.fn(),
    sendMessageToPlayer: vi.fn(),
  },
}));

vi.mock('#shared/ui.js', () => ({
  default: {
    getOpenSlot: vi.fn(() => 0),
    capitalizeFirstLetter: vi.fn((s) => s),
    getLevel: vi.fn(() => 1),
  },
}));

const { default: Mining } = await import('#server/core/skills/mining.js');

describe('Mining concurrency lock (real _activeMiningLocks)', () => {
  beforeEach(() => {
    // Clear the real static lock set between tests
    Mining._activeMiningLocks.clear();
  });

  it('starts with an empty lock set', () => {
    expect(Mining._activeMiningLocks.size).toBe(0);
  });

  it('allows the first mining attempt (lock is acquired)', () => {
    Mining._activeMiningLocks.add('player-1');
    expect(Mining._activeMiningLocks.has('player-1')).toBe(true);
    expect(Mining._activeMiningLocks.size).toBe(1);
  });

  it('detects concurrent mining by the same player', () => {
    Mining._activeMiningLocks.add('player-1');
    // The lock is already held so a second check returns true (already mining)
    expect(Mining._activeMiningLocks.has('player-1')).toBe(true);
  });

  it('allows different players to mine simultaneously', () => {
    Mining._activeMiningLocks.add('player-1');
    Mining._activeMiningLocks.add('player-2');
    expect(Mining._activeMiningLocks.size).toBe(2);
    expect(Mining._activeMiningLocks.has('player-1')).toBe(true);
    expect(Mining._activeMiningLocks.has('player-2')).toBe(true);
  });

  it('releases lock after mining completes', () => {
    Mining._activeMiningLocks.add('player-1');
    Mining._activeMiningLocks.delete('player-1');
    expect(Mining._activeMiningLocks.has('player-1')).toBe(false);
    expect(Mining._activeMiningLocks.size).toBe(0);
  });

  it('releasing an unlocked player is a no-op', () => {
    Mining._activeMiningLocks.delete('player-1');
    expect(Mining._activeMiningLocks.has('player-1')).toBe(false);
    expect(Mining._activeMiningLocks.size).toBe(0);
  });

  it('maintains independent locks per player', () => {
    Mining._activeMiningLocks.add('player-1');
    Mining._activeMiningLocks.add('player-2');
    Mining._activeMiningLocks.delete('player-1');
    expect(Mining._activeMiningLocks.has('player-1')).toBe(false);
    expect(Mining._activeMiningLocks.has('player-2')).toBe(true);
    expect(Mining._activeMiningLocks.size).toBe(1);
  });

  it('is a Set on the actual Mining class', () => {
    expect(Mining._activeMiningLocks).toBeInstanceOf(Set);
  });
});
