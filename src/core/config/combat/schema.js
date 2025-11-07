/**
 * @typedef {'physical'|'fire'|'ice'|'lightning'|'poison'|'shadow'|'holy'|'arcane'} DamageType
 */

/**
 * @typedef {'damage'|'heal'|'buff'|'debuff'|'control'} EffectKind
 */

/**
 * @typedef {Object} Effect
 * @property {string} id Identifier for the effect instance.
 * @property {EffectKind} type Category of outcome the effect produces.
 * @property {number} magnitude Relative strength of the effect.
 * @property {number} [duration] Duration in milliseconds that the effect persists.
 * @property {DamageType} [damageType] Elemental alignment of damage or mitigation.
 * @property {string} [stat] Identifier of the stat that is influenced (attack, defense, etc.).
 * @property {string} [description] Human readable summary displayed to players.
 */

/**
 * @typedef {'active'|'passive'} AbilityCategory
 */

/**
 * @typedef {Object} AbilityDefinition
 * @property {string} id Unique id of the ability.
 * @property {string} name Display name shown in tooltips.
 * @property {string} description Rich text description of the effect.
 * @property {AbilityCategory} category Whether the ability must be triggered or is always-on.
 * @property {number} [cooldown] Cooldown period in milliseconds.
 * @property {Record<string, number>} [resourceCost] Resource costs keyed by resource id.
 * @property {Effect[]} effects The list of effects applied when the ability resolves.
 * @property {string[]} [tags] Optional list of semantic tags that help group abilities.
 */

/**
 * @typedef {'melee'|'ranged'|'magic'} WeaponClass
 */

/**
 * @typedef {Object} WeaponDefinition
 * @property {string} id Unique weapon identifier.
 * @property {string} name Localised name used in UI.
 * @property {string} description Tooltip text describing the weapon.
 * @property {WeaponClass} weaponClass Category of the weapon.
 * @property {DamageType} damageType Dominant elemental damage type.
 * @property {[number, number]} damageRange Minimum and maximum base damage.
 * @property {number} attackSpeed Milliseconds between primary attacks.
 * @property {number} weight Weight rating that impacts encumbrance.
 * @property {boolean} [twoHanded=false] Indicates if the weapon consumes both hands.
 * @property {number} [range] Maximum tiles the weapon can target.
 * @property {string[]} [abilityIds] Ability ids unlocked while the weapon is equipped.
 * @property {Object} graphics Tileset metadata for rendering (tileset, column, row, quantityLevel).
 * @property {boolean} [stackable=false] Whether the weapon can stack in inventory.
 * @property {number} [maxStack=1] Maximum quantity per inventory stack when stackable.
 * @property {string} [rarity='common'] Rarity tier for drop tables.
 */

/**
 * @typedef {Object} SpellDefinition
 * @property {string} id Unique spell identifier.
 * @property {string} name Display name.
 * @property {string} description Tooltip shown to players.
 * @property {DamageType} damageType Elemental alignment of the spell.
 * @property {number} castTime Casting time in milliseconds.
 * @property {number} cooldown Cooldown in milliseconds.
 * @property {Record<string, number>} resourceCost Resources consumed (mana, energy, etc.).
 * @property {number} [range] Maximum targeting range.
 * @property {string[]} [abilityIds] Ids of abilities or modifiers triggered by the spell.
 * @property {Effect[]} effects The effects produced on hit or completion.
 * @property {boolean} [itemizable=false] When true the spell can exist as an inventory item.
 * @property {Object} graphics Tileset metadata for rendering.
 * @property {boolean} [stackable=false] Whether the spell item stacks in inventory.
 * @property {number} [maxStack=1] Maximum quantity per stack for spell tomes or scrolls.
 */

/**
 * @typedef {Object} LootTableEntry
 * @property {string} itemId Item identifier awarded.
 * @property {number} chance Drop chance between 0 and 1.
 * @property {[number, number]} [quantityRange] Range of quantities granted.
 */

/**
 * @typedef {Object} StatBlock
 * @property {number} health Maximum health pool.
 * @property {number} [mana] Maximum mana pool.
 * @property {number} attack Attack rating for melee/ranged strikes.
 * @property {number} defense Damage mitigation rating.
 * @property {number} speed Tiles moved per second or initiative modifier.
 */

/**
 * @typedef {Object} MonsterDefinition
 * @property {string} id Unique monster identifier.
 * @property {string} name Monster name.
 * @property {number} level Intended encounter level.
 * @property {string} behavior Behavioral profile (aggressive, defensive, etc.).
 * @property {DamageType[]} [resistances] Damage types that are resisted.
 * @property {DamageType[]} [weaknesses] Damage types that deal extra damage.
 * @property {StatBlock} stats Baseline stats for scaling calculations.
 * @property {string[]} [abilityIds] Abilities the monster can execute.
 * @property {LootTableEntry[]} [lootTable] Loot rolled on defeat.
 * @property {Object} graphics Tileset metadata for the sprite sheet.
 * @property {string} [description] Optional lore text displayed on inspection.
 */

export default {};
