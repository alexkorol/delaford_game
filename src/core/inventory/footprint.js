import { ORIENTATION_DEFAULT, ORIENTATION_ROTATED } from './constants.js';
import { normaliseSize } from './grid-math.js';

export const getItemBaseSize = (item) => normaliseSize(
  item?.baseSize || item?.size || item?.dimensions || item?.graphicSize || 1,
);

export const getItemDimensions = (item, orientation = ORIENTATION_DEFAULT) => {
  const baseSize = getItemBaseSize(item);

  if (orientation === ORIENTATION_ROTATED) {
    return {
      width: baseSize.height,
      height: baseSize.width,
    };
  }

  return { ...baseSize };
};

export const createFootprint = (position, item, orientation = ORIENTATION_DEFAULT) => {
  if (!position) {
    return [];
  }

  const { x, y } = position;
  const { width, height } = getItemDimensions(item, orientation);

  const footprint = [];
  for (let offsetY = 0; offsetY < height; offsetY += 1) {
    for (let offsetX = 0; offsetX < width; offsetX += 1) {
      footprint.push({ x: x + offsetX, y: y + offsetY });
    }
  }

  return footprint;
};

export const rotateOrientation = (orientation = ORIENTATION_DEFAULT) => (
  orientation === ORIENTATION_ROTATED ? ORIENTATION_DEFAULT : ORIENTATION_ROTATED
);

export const canRotateItem = (item) => {
  const { width, height } = getItemBaseSize(item);
  return width !== height;
};
