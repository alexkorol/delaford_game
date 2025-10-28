import UI from '#shared/ui.js';
import Query from '#server/core/data/query.js';

const unequipStrategy = {
  actionIds: ['item:unequip'],
  description: 'Unequip an item from the equipment screen.',
  canExecute: ({ menu, miscData }) => (
    menu.clickedOn('wearSlot')
      && menu.isFromInventory()
      && menu.player.wear
      && Boolean(menu.player.wear[miscData.slot])
  ),
  execute: ({ action, menu, miscData }) => {
    const wearSlot = menu.player.wear && menu.player.wear[miscData.slot];
    if (!wearSlot) {
      return [];
    }

    const baseData = Query.getItemData(wearSlot.id);
    if (!baseData || !menu.canDoAction(baseData.actions, action)) {
      return [];
    }

    const {
      name, context, id, uuid,
    } = baseData;
    const color = UI.getContextSubjectColor(context);

    return [{
      label: `${action.name} <span style='color:${color}'>${name}</span>`,
      action,
      type: 'item',
      miscData,
      id,
      uuid,
    }];
  },
};

export default unequipStrategy;
