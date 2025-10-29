import { DEFAULT_GRID } from './constants.js';
import { createFootprint, getItemDimensions } from './footprint.js';

const cellKey = ({ x, y }) => `${x},${y}`;

export const buildOccupancyMap = (items, grid = DEFAULT_GRID) => {
  const occupancy = new Map();

  items.forEach((item) => {
    const { position, orientation, uuid } = item;
    const footprint = createFootprint(position, item, orientation);
    footprint.forEach((cell) => {
      if (cell.x < 0 || cell.y < 0 || cell.x >= grid.columns || cell.y >= grid.rows) {
        return;
      }

      occupancy.set(cellKey(cell), uuid);
    });
  });

  return occupancy;
};

export const getItemAtCell = (items, cell) => {
  if (!cell) {
    return null;
  }

  return items.find((item) => (
    createFootprint(item.position, item, item.orientation)
      .some(({ x, y }) => x === cell.x && y === cell.y)
  )) || null;
};

export const clampFootprintWithinGrid = (position, item, grid = DEFAULT_GRID, orientation) => {
  if (!position) {
    return null;
  }

  const { width, height } = getItemDimensions(item, orientation ?? item.orientation);
  const maxX = grid.columns - width;
  const maxY = grid.rows - height;

  if (position.x < 0 || position.y < 0 || position.x > maxX || position.y > maxY) {
    return {
      x: Math.max(0, Math.min(maxX, position.x)),
      y: Math.max(0, Math.min(maxY, position.y)),
    };
  }

  return position;
};

export const findBlockingItems = (items, candidatePosition, activeItem, grid = DEFAULT_GRID, orientation) => {
  if (!candidatePosition) {
    return [];
  }

  const footprint = createFootprint(candidatePosition, activeItem, orientation ?? activeItem.orientation);
  const blockers = new Set();

  for (let index = 0; index < footprint.length; index += 1) {
    const cell = footprint[index];

    if (cell.x < 0 || cell.y < 0 || cell.x >= grid.columns || cell.y >= grid.rows) {
      blockers.add('out-of-bounds');
      continue;
    }

    const occupant = getItemAtCell(items, cell);
    if (occupant && occupant.uuid !== activeItem.uuid) {
      blockers.add(occupant.uuid);
    }
  }

  return Array.from(blockers);
};

export const canPlaceItem = (items, candidatePosition, activeItem, grid = DEFAULT_GRID, orientation) => {
  const blockers = findBlockingItems(items, candidatePosition, activeItem, grid, orientation);
  const isOutOfBounds = blockers.includes('out-of-bounds');

  return {
    valid: blockers.length === 0,
    isOutOfBounds,
    blockers: blockers.filter((entry) => entry !== 'out-of-bounds'),
  };
};
