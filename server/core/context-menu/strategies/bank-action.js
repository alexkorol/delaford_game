import UI from '#shared/ui.js';

const quantities = [1, 5, 10, 'All'];

const bankActionStrategy = {
  actionIds: ['player:screen:bank:action'],
  description: 'Transfer items between bank and inventory in set quantities.',
  canExecute: ({ menu, selectedItemData }) => (
    (menu.clickedOn('bankSlot') || menu.clickedOn('inventorySlot'))
      && Boolean(selectedItemData)
  ),
  execute: ({ action, menu, selectedItemData }) => {
    if (!selectedItemData || !menu.canDoAction(selectedItemData.actions, action)) {
      return [];
    }

    const color = UI.getContextSubjectColor(selectedItemData.context);

    return quantities.map((quantity) => ({
      label: `${action.name}-${quantity.toString()} <span style='color:${color}'>${selectedItemData.name}</span>`,
      params: { quantity },
      action,
      examine: selectedItemData.examine,
      type: 'item',
      id: selectedItemData.id,
    }));
  },
};

export default bankActionStrategy;
