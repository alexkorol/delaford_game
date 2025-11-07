import UI from '@shared/ui.js';
import { getItemDefinition } from '../config/combat/index.js';

const ensureSlot = (item, fallbackSlot) => {
  if (item && typeof item.slot === 'number') {
    return item.slot;
  }

  return fallbackSlot;
};

const ensureUuid = (item, slot, prefix = 'item') => {
  if (item?.uuid) {
    return item.uuid;
  }

  if (item?.instanceId) {
    return item.instanceId;
  }

  const itemId = item?.id || prefix;
  return `${itemId}-${slot}`;
};

const resolveQuantityColumn = (qty, graphics = {}) => {
  if (!graphics.quantityLevel || !Array.isArray(graphics.quantityLevel)) {
    return typeof graphics.column === 'number' ? graphics.column : 0;
  }

  if (!qty || qty <= 0) {
    return 0;
  }

  let index = graphics.quantityLevel.findIndex((level) => level > qty);
  index = (index === -1 ? graphics.quantityLevel.length : index) - 1;
  return Math.max(index, 0);
};

const cloneGraphics = (sourceGraphics = {}, qty) => {
  const graphics = { ...sourceGraphics };
  graphics.column = resolveQuantityColumn(qty, graphics);
  graphics.tileset = graphics.tileset || 'weapons';
  graphics.row = typeof graphics.row === 'number' ? graphics.row : 0;
  return graphics;
};

export const adaptLegacyGridItem = (source, slotIndex, options = {}) => {
  const slot = typeof options.slot === 'number' ? options.slot : ensureSlot(source, slotIndex);
  const itemId = options.id || source?.id || source;
  const qty = typeof options.qty === 'number' ? options.qty : (typeof source?.qty === 'number' ? source.qty : 1);
  const itemData = itemId ? (getItemDefinition(itemId) || UI.getItemData(itemId)) : null;
  const graphicsSource = options.graphics || source?.graphics || itemData?.graphics || {};

  const graphics = cloneGraphics(graphicsSource, qty);

  const stackableHint = options.stackable
    ?? source?.stackable
    ?? itemData?.stackable
    ?? (graphicsSource.quantityLevel ? true : undefined);
  const stackable = typeof stackableHint === 'boolean' ? stackableHint : qty > 1;
  const locked = options.locked ?? source?.locked ?? false;

  return {
    ...source,
    id: itemId,
    slot,
    qty,
    uuid: options.uuid || ensureUuid(source, slot, options.uuidPrefix || itemId || 'item'),
    graphics,
    stackable,
    isLocked: locked ? 'locked-item' : source?.isLocked || '',
    name: options.name || source?.name || itemData?.name,
    maxStack: source?.maxStack ?? itemData?.maxStack,
    metadata: options.metadata || source?.metadata || null,
  };
};

export const adaptLegacyGridItems = (items = [], options = {}) => (
  items.map((item, index) => adaptLegacyGridItem(item, index, typeof options === 'function' ? options(item, index) : options))
);
