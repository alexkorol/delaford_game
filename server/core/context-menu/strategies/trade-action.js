import UI from '#shared/ui.js';

const quantities = [1, 5, 10, 50];

const tradeActionStrategy = {
  actionIds: ['player:screen:npc:trade:action'],
  description: 'Buy or sell items with shopkeepers in fixed quantities.',
  canExecute: ({ menu, selectedItemData }) => (
    (menu.clickedOn('shopSlot') || menu.clickedOn('inventorySlot'))
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

export default tradeActionStrategy;
