import UI from '#shared/ui.js';

const equipStrategy = {
  actionIds: ['item:equip'],
  description: 'Equip an item from the player inventory.',
  canExecute: ({ menu, selectedItemData }) => (
    menu.clickedOn('inventorySlot')
      && menu.isFromInventory()
      && Boolean(selectedItemData)
  ),
  execute: ({ action, menu, dynamicItem, miscData, selectedItemData }) => {
    if (!selectedItemData || !menu.canDoAction(selectedItemData.actions, action)) {
      return [];
    }

    const displayName = dynamicItem && dynamicItem.name ? dynamicItem.name : selectedItemData.name;
    const referenceUuid = dynamicItem && dynamicItem.uuid ? dynamicItem.uuid : selectedItemData.uuid;
    const referenceId = dynamicItem && dynamicItem.id ? dynamicItem.id : selectedItemData.id;
    const color = UI.getContextSubjectColor(selectedItemData.context);

    return [{
      label: `${action.name} <span style='color:${color}'>${displayName}</span>`,
      action,
      type: 'item',
      miscData,
      uuid: referenceUuid,
      id: referenceId,
    }];
  },
};

export default equipStrategy;
