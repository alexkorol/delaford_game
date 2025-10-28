import { DEFAULT_GRID } from './constants.js';

export const coordsFromIndex = (index, columns = DEFAULT_GRID.columns) => ({
  x: index % columns,
  y: Math.floor(index / columns),
});

export const indexFromCoords = (x, y, columns = DEFAULT_GRID.columns) => (y * columns) + x;

export const normaliseSize = (size) => {
  if (!size) {
    return { width: 1, height: 1 };
  }

  if (Array.isArray(size)) {
    const [width = 1, height = 1] = size;
    return { width, height };
  }

  if (typeof size === 'object') {
    const { width = 1, height = 1 } = size;
    return { width, height };
  }

  const parsed = Number(size);
  if (Number.isFinite(parsed) && parsed > 0) {
    return { width: parsed, height: 1 };
  }

  return { width: 1, height: 1 };
};

export const clampCoords = (x, y, grid = DEFAULT_GRID) => ({
  x: Math.max(0, Math.min(grid.columns - 1, x)),
  y: Math.max(0, Math.min(grid.rows - 1, y)),
});
