import weapons from './weapons.js';
import armor from './armor.js';
import jewelry from './jewelry.js';
import general from './general.js';

import smithing from './skills/smithing.js';

const wearableItems = [...weapons, ...armor, ...jewelry];

export {
  armor, weapons, jewelry, general, smithing, wearableItems,
};
