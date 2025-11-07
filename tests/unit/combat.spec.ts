import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import CombatEngine from '../../src/core/combat-engine.js';
import { useCombatStore } from '../../src/stores/combat.js';

const HERO = {
  id: 'hero',
  kind: 'player',
  name: 'Heroic Adventurer',
  stats: {
    attack: 35,
    defense: 15,
    health: 150,
  },
  health: {
    current: 150,
    max: 150,
  },
};

const BASE_MONSTER = {
  id: 'training-dummy',
  kind: 'monster',
  name: 'Training Dummy',
  stats: {
    attack: 8,
    defense: 10,
    health: 120,
  },
  health: {
    current: 120,
    max: 120,
  },
};

describe('CombatEngine', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('resolves attack rolls using attack and defense values', () => {
    const engine = new CombatEngine({ random: () => 0.1 });
    engine.registerEntity(HERO);
    engine.registerEntity(BASE_MONSTER);

    const hit = engine.performAttack({
      attackerId: HERO.id,
      defenderId: BASE_MONSTER.id,
      damageType: 'physical',
      baseDamage: 30,
    });

    expect(hit.hit).toBe(true);
    expect(hit.damage).toBeGreaterThan(0);
    const defenderAfterHit = engine.getEntity(BASE_MONSTER.id);
    expect(defenderAfterHit?.health.current).toBeLessThan(defenderAfterHit?.health.max);

    const missEngine = new CombatEngine({ random: () => 0.99 });
    missEngine.registerEntity(HERO);
    missEngine.registerEntity(BASE_MONSTER);
    const miss = missEngine.performAttack({
      attackerId: HERO.id,
      defenderId: BASE_MONSTER.id,
      damageType: 'physical',
      baseDamage: 30,
    });

    expect(miss.hit).toBe(false);
    expect(miss.kind).toBe('miss');
    const defenderAfterMiss = missEngine.getEntity(BASE_MONSTER.id);
    expect(defenderAfterMiss?.health.current).toBe(defenderAfterMiss?.health.max);
  });

  it('applies resistance and weakness mitigation per damage type', () => {
    const neutralEngine = new CombatEngine({ random: () => 0.1 });
    neutralEngine.registerEntity(HERO);
    neutralEngine.registerEntity({ ...BASE_MONSTER, id: 'neutral-dummy' });
    const neutral = neutralEngine.performAttack({
      attackerId: HERO.id,
      defenderId: 'neutral-dummy',
      damageType: 'fire',
      baseDamage: 40,
    }).damage;

    const resistedEngine = new CombatEngine({ random: () => 0.1 });
    resistedEngine.registerEntity(HERO);
    resistedEngine.registerEntity({
      ...BASE_MONSTER,
      id: 'resisted-dummy',
      resistances: { fire: 0.5 },
    });
    const resisted = resistedEngine.performAttack({
      attackerId: HERO.id,
      defenderId: 'resisted-dummy',
      damageType: 'fire',
      baseDamage: 40,
    }).damage;

    const weakEngine = new CombatEngine({ random: () => 0.1 });
    weakEngine.registerEntity(HERO);
    weakEngine.registerEntity({
      ...BASE_MONSTER,
      id: 'weak-dummy',
      resistances: { fire: -0.25 },
    });
    const weak = weakEngine.performAttack({
      attackerId: HERO.id,
      defenderId: 'weak-dummy',
      damageType: 'fire',
      baseDamage: 40,
    }).damage;

    const templatedEngine = new CombatEngine({ random: () => 0.1 });
    templatedEngine.registerEntity(HERO);
    templatedEngine.registerEntity({
      ...BASE_MONSTER,
      id: 'templated-dummy',
      resistances: ['fire'],
    });
    const templated = templatedEngine.performAttack({
      attackerId: HERO.id,
      defenderId: 'templated-dummy',
      damageType: 'fire',
      baseDamage: 40,
    }).damage;

    expect(resisted).toBeLessThan(neutral);
    expect(weak).toBeGreaterThan(neutral);
    expect(templated).toBeLessThan(neutral);
    expect(Math.abs(weak - resisted)).toBeGreaterThan(0);
  });

  it('ticks damage over time effects and clears them when expired', () => {
    const engine = new CombatEngine({ random: () => 0.1 });
    engine.registerEntity(HERO);
    engine.registerEntity({ ...BASE_MONSTER, id: 'dot-target' });

    engine.applyEffect({
      effect: {
        id: 'burning-ember',
        type: 'damage',
        magnitude: 6,
        duration: 3000,
        damageType: 'fire',
        tickInterval: 1000,
      },
      sourceId: HERO.id,
      targetId: 'dot-target',
      stacking: 'refresh',
    });

    const beforeTicks = engine.getEntity('dot-target');
    expect(beforeTicks?.health.current).toBe(120);

    engine.advanceTime(1000);
    const afterFirstTick = engine.getEntity('dot-target');
    expect(afterFirstTick?.health.current).toBeLessThan(120);

    engine.advanceTime(2000);
    const afterExpiry = engine.getEntity('dot-target');
    expect(afterExpiry?.health.current).toBeLessThan(afterFirstTick?.health.current);
    expect(engine.listActiveEffects('dot-target')).toHaveLength(0);
  });

  it('supports stacking damage over time effects up to the defined cap', () => {
    const engine = new CombatEngine({ random: () => 0.1 });
    engine.registerEntity(HERO);
    engine.registerEntity({ ...BASE_MONSTER, id: 'stack-target' });

    const effect = {
      id: 'poison-sting',
      type: 'damage',
      magnitude: 5,
      duration: 4000,
      damageType: 'poison',
      tickInterval: 1000,
    };

    engine.applyEffect({ effect, sourceId: HERO.id, targetId: 'stack-target', stacking: 'stack', maxStacks: 3 });
    engine.advanceTime(1000);
    const afterFirstTick = engine.getEntity('stack-target');

    engine.applyEffect({ effect, sourceId: HERO.id, targetId: 'stack-target', stacking: 'stack', maxStacks: 3 });
    engine.advanceTime(1000);
    const afterSecondTick = engine.getEntity('stack-target');

    engine.applyEffect({ effect, sourceId: HERO.id, targetId: 'stack-target', stacking: 'stack', maxStacks: 3 });
    engine.advanceTime(1000);
    const afterThirdTick = engine.getEntity('stack-target');

    expect(afterSecondTick?.health.current).toBeLessThan(afterFirstTick?.health.current);
    expect(afterThirdTick?.health.current).toBeLessThan(afterSecondTick?.health.current);
    expect(engine.listActiveEffects('stack-target')[0]?.stacks).toBeLessThanOrEqual(3);
  });

  it('publishes combat events that update the combat store', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useCombatStore();
    store.ensureSubscriptions();

    const engine = new CombatEngine({ random: () => 0.1 });
    engine.registerEntity(HERO);
    engine.registerEntity({ ...BASE_MONSTER, id: 'store-target' });

    const result = engine.performAttack({
      attackerId: HERO.id,
      defenderId: 'store-target',
      damageType: 'physical',
      baseDamage: 28,
    });

    expect(result.hit).toBe(true);
    expect(store.log.length).toBeGreaterThan(0);
    expect(store.entities['store-target']).toBeDefined();
    expect(store.entities['store-target'].health.current).toBe(
      engine.getEntity('store-target')?.health.current,
    );

    store.dispose();
  });
});
