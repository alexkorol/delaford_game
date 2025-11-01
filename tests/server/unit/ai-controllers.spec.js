import { describe, it, expect, vi } from 'vitest';
import createPlayerAIController from '#server/core/systems/controllers/player-ai-controller.js';
import createNPCAIController from '#server/core/systems/controllers/npc-ai-controller.js';
import createMonsterAIController from '#server/core/entities/monster/ai-controller.js';

const buildBehaviourScript = (direction) => () => ({
  type: 'move',
  intent: { type: 'move', direction },
});

describe('AI controllers', () => {
  it('processes scripted movement for players and allows manual intents', () => {
    const movement = {
      move: vi.fn(() => true),
    };
    const player = {
      uuid: 'player-1',
      id: 'player-1',
      sceneId: 'scene-player',
      x: 0,
      y: 0,
      facing: 'south',
      animation: null,
      movement,
      behaviour: { script: buildBehaviourScript('east') },
    };

    const controller = createPlayerAIController(player);
    controller.update(1_000);

    expect(movement.move).toHaveBeenNthCalledWith(1, 'east', {});

    controller.enqueueMovement('north');
    controller.update(2_000);

    expect(movement.move).toHaveBeenNthCalledWith(2, 'north', {});
  });

  it('schedules random movement for NPCs and respects behaviour overrides', () => {
    const movement = {
      performRandomMovement: vi.fn(() => true),
    };

    const npc = {
      uuid: 'npc-1',
      id: 'npc-1',
      sceneId: 'scene-npc',
      x: 0,
      y: 0,
      facing: 'north',
      animation: null,
      movement,
    };

    const controller = createNPCAIController(npc, {
      behaviour: { type: 'random-walk', intervalMs: 0 },
      worldRef: { id: 'overworld' },
    });

    controller.update(500, { worldRef: { id: 'overworld' } });

    expect(movement.performRandomMovement).toHaveBeenCalledWith({ id: 'overworld' });
  });

  it('flags lifecycle changes for monsters when combat resolves', () => {
    const monster = {
      uuid: 'monster-1',
      sceneId: 'scene-monster',
      behaviour: {
        type: 'melee',
        attack: { intervalMs: 0, windupMs: 0, damageMultiplier: 1 },
        aggressionRange: 1,
      },
      state: {
        mode: 'idle',
        targetId: null,
        lastDecisionAt: 0,
        lastStepAt: 0,
        lastAttackAt: 0,
        lastBroadcastAt: 0,
        pendingAttack: { resolveAt: 0 },
        patrolTarget: { x: 0, y: 0 },
        respawnAt: null,
      },
      spawn: { x: 0, y: 0 },
      isAlive: true,
      resolvePendingAttack: vi.fn(() => {
        monster.state.pendingAttack = null;
        return true;
      }),
      resolveTarget: vi.fn(() => null),
      tryAttack: vi.fn(() => false),
      pursue: vi.fn(() => false),
      returnToSpawn: vi.fn(() => false),
      patrol: vi.fn(() => false),
      respawnNow: vi.fn(() => true),
      setFacing: vi.fn(),
      setAnimationState: vi.fn(),
    };

    const controller = createMonsterAIController(monster);
    const dirty = controller.update(1_000);

    expect(monster.resolvePendingAttack).toHaveBeenCalledWith(1_000);
    expect(dirty).toBe(true);

    const secondDirty = controller.update(2_000);
    expect(secondDirty).toBe(false);
  });
});
