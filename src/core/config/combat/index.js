import ABILITIES from './abilities.js';
import MONSTERS from './monsters.js';
import SPELLS from './spells.js';
import WEAPONS from './weapons.js';

/** @typedef {import('./schema.js').AbilityDefinition} AbilityDefinition */
/** @typedef {import('./schema.js').MonsterDefinition} MonsterDefinition */
/** @typedef {import('./schema.js').SpellDefinition} SpellDefinition */
/** @typedef {import('./schema.js').WeaponDefinition} WeaponDefinition */

const toMap = (collection = []) => new Map(collection.map((entry) => [entry.id, entry]));

const abilityMap = toMap(ABILITIES);
const weaponMap = toMap(WEAPONS);
const spellMap = toMap(SPELLS);
const monsterMap = toMap(MONSTERS);

let cachedItemMap = new Map();
let cachedCatalog = [];

const cloneGraphics = (graphics = {}) => ({
  ...graphics,
  quantityLevel: Array.isArray(graphics.quantityLevel)
    ? [...graphics.quantityLevel]
    : graphics.quantityLevel,
});

const cloneItem = (item) => ({
  ...item,
  abilityIds: Array.isArray(item.abilityIds) ? [...item.abilityIds] : item.abilityIds,
  graphics: cloneGraphics(item.graphics || {}),
});

const buildBaseItemDescriptors = () => {
  const weaponItems = WEAPONS.map((weapon) => ({
    id: weapon.id,
    name: weapon.name,
    description: weapon.description,
    type: 'weapon',
    slot: 'weapon',
    stackable: weapon.stackable ?? false,
    maxStack: weapon.maxStack ?? 1,
    graphics: cloneGraphics({
      tileset: 'weapons',
      column: 0,
      row: 0,
      ...weapon.graphics,
    }),
    abilityIds: Array.isArray(weapon.abilityIds) ? [...weapon.abilityIds] : [],
    damageType: weapon.damageType,
    rarity: weapon.rarity || 'common',
    weaponClass: weapon.weaponClass,
  }));

  const spellItems = SPELLS.filter((spell) => spell.itemizable).map((spell) => ({
    id: spell.id,
    name: spell.name,
    description: spell.description,
    type: 'spell',
    slot: 'spellbook',
    stackable: spell.stackable ?? false,
    maxStack: spell.maxStack ?? 1,
    graphics: cloneGraphics({
      tileset: 'general',
      column: 0,
      row: 0,
      ...spell.graphics,
    }),
    abilityIds: Array.isArray(spell.abilityIds) ? [...spell.abilityIds] : [],
    damageType: spell.damageType,
    rarity: spell.rarity || 'uncommon',
  }));

  return [...weaponItems, ...spellItems];
};

const BASE_ITEM_DESCRIPTORS = buildBaseItemDescriptors();

const refreshItemCache = (itemsMap) => {
  cachedItemMap = new Map(itemsMap);
  cachedCatalog = Array.from(cachedItemMap.values()).map((item) => cloneItem(item));
};

refreshItemCache(new Map(BASE_ITEM_DESCRIPTORS.map((item) => [item.id, cloneItem(item)])));

export const getAbilityDefinition = (id) => abilityMap.get(id) || null;
export const getWeaponDefinition = (id) => weaponMap.get(id) || null;
export const getSpellDefinition = (id) => spellMap.get(id) || null;
export const getMonsterDefinition = (id) => monsterMap.get(id) || null;

export const listAbilities = () => [...abilityMap.values()].map((ability) => ({ ...ability }));
export const listWeapons = () => [...weaponMap.values()].map((weapon) => ({ ...weapon, graphics: cloneGraphics(weapon.graphics || {}) }));
export const listSpells = () => [...spellMap.values()].map((spell) => ({ ...spell, graphics: cloneGraphics(spell.graphics || {}) }));
export const listMonsters = () => [...monsterMap.values()].map((monster) => ({ ...monster, graphics: cloneGraphics(monster.graphics || {}) }));

const toAbilityId = (ability) => {
  if (!ability) {
    return '';
  }

  const value = typeof ability === 'string' ? ability : ability.id;
  return typeof value === 'string' ? value.trim() : '';
};

export const hydrateMonster = (monster) => {
  if (!monster || typeof monster !== 'object') {
    return monster;
  }

  const base = monster.id ? monsterMap.get(monster.id) : null;
  const abilityIds = Array.isArray(monster.abilityIds)
    ? monster.abilityIds.map((entry) => toAbilityId(entry)).filter(Boolean)
    : Array.isArray(base?.abilityIds)
      ? base.abilityIds.map((entry) => toAbilityId(entry)).filter(Boolean)
      : [];

  const resolvedAbilities = abilityIds
    .map((abilityId) => abilityMap.get(abilityId))
    .filter((ability) => ability);

  return {
    ...(base ? { ...base } : {}),
    ...monster,
    abilityIds,
    abilityDefinitions: resolvedAbilities.map((ability) => ({ ...ability })),
    stats: {
      ...(base?.stats || {}),
      ...(monster.stats || {}),
    },
    graphics: cloneGraphics({
      ...(base?.graphics || {}),
      ...(monster.graphics || {}),
    }),
    lootTable: Array.isArray(monster.lootTable)
      ? monster.lootTable.map((entry) => ({ ...entry }))
      : Array.isArray(base?.lootTable)
        ? base.lootTable.map((entry) => ({ ...entry }))
        : [],
  };
};

export const hydrateMonsters = (monsters = []) => monsters.map((monster) => hydrateMonster(monster));

export const buildItemCatalog = (serverItems = []) => {
  const descriptorMap = new Map(BASE_ITEM_DESCRIPTORS.map((item) => [item.id, cloneItem(item)]));

  serverItems.forEach((item) => {
    if (!item || !item.id) {
      return;
    }

    const existing = descriptorMap.get(item.id);
    if (existing) {
      descriptorMap.set(item.id, {
        ...existing,
        ...item,
        graphics: cloneGraphics({
          ...(existing.graphics || {}),
          ...(item.graphics || {}),
        }),
      });
      return;
    }

    descriptorMap.set(item.id, cloneItem(item));
  });

  refreshItemCache(descriptorMap);

  return cachedCatalog.map((item) => cloneItem(item));
};

export const getItemDefinition = (id) => {
  const item = cachedItemMap.get(id);
  return item ? cloneItem(item) : null;
};

export const applyItemCatalogToWindow = (serverItems = []) => {
  const catalog = buildItemCatalog(serverItems);
  if (typeof window !== 'undefined') {
    window.allItems = catalog.map((item) => cloneItem(item));
  }
  return catalog;
};

if (typeof window !== 'undefined' && !Array.isArray(window.allItems)) {
  applyItemCatalogToWindow();
}

export default {
  abilities: ABILITIES,
  monsters: MONSTERS,
  spells: SPELLS,
  weapons: WEAPONS,
  applyItemCatalogToWindow,
  buildItemCatalog,
  getAbilityDefinition,
  getItemDefinition,
  getMonsterDefinition,
  getSpellDefinition,
  getWeaponDefinition,
  hydrateMonster,
  hydrateMonsters,
  listAbilities,
  listMonsters,
  listSpells,
  listWeapons,
};
