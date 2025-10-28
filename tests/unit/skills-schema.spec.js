import { describe, it, expect } from 'vitest';

import {
  createSkillDefinition,
  createQuickbarSlot,
} from '../../server/shared/skills/schema.js';

describe('skill schema', () => {
  it('creates an immutable skill definition with cloned data', () => {
    const base = {
      id: 'arcane:blast',
      name: 'Arcane Blast',
      description: 'Channelled burst of arcane energy.',
      cooldown: 12,
      resourceCost: { mana: 24 },
      modifiers: { damage: { type: 'arcane', amount: 32 } },
      behaviour: { type: 'projectile', speed: 6 },
      tags: ['magic', 'burst'],
      quickbar: { slot: 2, binding: 'skills.arcaneBlast', group: 'offense' },
    };

    const definition = createSkillDefinition(base);

    expect(Object.isFrozen(definition)).toBe(true);
    expect(definition.id).toBe('arcane:blast');
    expect(definition.name).toBe('Arcane Blast');
    expect(definition.cooldown).toBe(12);
    expect(definition.resourceCost).not.toBe(base.resourceCost);
    expect(definition.modifiers).not.toBe(base.modifiers);
    expect(definition.behaviour).not.toBe(base.behaviour);
    expect(definition.tags).not.toBe(base.tags);
    expect(definition.quickbar).not.toBe(base.quickbar);
    expect(definition.quickbar).toEqual({
      slot: 2,
      hotkey: null,
      binding: 'skills.arcaneBlast',
      sortOrder: 2,
      group: 'offense',
    });
  });

  it('resolves quickbar slots from skill definitions', () => {
    const skill = createSkillDefinition({
      id: 'guard:dash',
      label: 'Dash',
      icon: 'dash.png',
      quickbar: {
        slot: 0,
        hotkey: 'Q',
        binding: 'skills.dash',
      },
    });

    const slot = createQuickbarSlot(
      { slotIndex: 0, hotkey: 'Q', skillId: 'guard:dash' },
      (skillId) => (skillId === skill.id ? skill : null),
    );

    expect(slot.id).toBe('slot-1');
    expect(slot.label).toBe('Dash');
    expect(slot.icon).toBe('dash.png');
    expect(slot.hotkey).toBe('Q');
    expect(slot.skillId).toBe('guard:dash');
    expect(slot.binding).toBe('skills.dash');
  });

  it('allows explicit quickbar bindings to override skill defaults', () => {
    const skill = createSkillDefinition({
      id: 'guardian:taunt',
      quickbar: {
        slot: 3,
        binding: 'skills.taunt',
      },
    });

    const slot = createQuickbarSlot(
      {
        id: 'party-slot',
        slotIndex: 3,
        hotkey: 'R',
        skillId: 'guardian:taunt',
        binding: 'party.callout',
      },
      (skillId) => (skillId === skill.id ? skill : null),
    );

    expect(slot.id).toBe('party-slot');
    expect(slot.hotkey).toBe('R');
    expect(slot.binding).toBe('party.callout');
    expect(slot.label).toBe('guardian:taunt');
  });
});
