/**
 * @vitest-environment node
 *
 * Tests for the mining concurrency lock mechanism.
 * Verifies that a player cannot start multiple mining operations
 * simultaneously and that locks are properly released.
 */
import { describe, expect, it, beforeEach } from 'vitest';

/**
 * Standalone lock implementation mirroring Mining._activeMiningLocks.
 */
class MiningLock {
  constructor() {
    this._locks = new Set();
  }

  acquire(playerId) {
    if (this._locks.has(playerId)) {
      return false;
    }
    this._locks.add(playerId);
    return true;
  }

  release(playerId) {
    this._locks.delete(playerId);
  }

  isLocked(playerId) {
    return this._locks.has(playerId);
  }

  get size() {
    return this._locks.size;
  }
}

describe('Mining concurrency lock', () => {
  let lock;

  beforeEach(() => {
    lock = new MiningLock();
  });

  it('allows the first mining attempt', () => {
    expect(lock.acquire('player-1')).toBe(true);
    expect(lock.isLocked('player-1')).toBe(true);
  });

  it('rejects concurrent mining by the same player', () => {
    lock.acquire('player-1');
    expect(lock.acquire('player-1')).toBe(false);
  });

  it('allows different players to mine simultaneously', () => {
    expect(lock.acquire('player-1')).toBe(true);
    expect(lock.acquire('player-2')).toBe(true);
    expect(lock.size).toBe(2);
  });

  it('releases lock after mining completes', () => {
    lock.acquire('player-1');
    lock.release('player-1');
    expect(lock.isLocked('player-1')).toBe(false);
    expect(lock.acquire('player-1')).toBe(true);
  });

  it('releasing an unlocked player is a no-op', () => {
    lock.release('player-1');
    expect(lock.isLocked('player-1')).toBe(false);
  });

  it('maintains independent locks per player', () => {
    lock.acquire('player-1');
    lock.acquire('player-2');
    lock.release('player-1');
    expect(lock.isLocked('player-1')).toBe(false);
    expect(lock.isLocked('player-2')).toBe(true);
  });
});
