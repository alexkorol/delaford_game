import UI from '#shared/ui.js';

const smeltActionStrategy = {
  actionIds: ['player:resource:smelt:furnace:action', 'player:resource:smelt:anvil:action'],
  description: 'Process resources using furnace or anvil panes.',
  canExecute: ({ menu, selectedItemData }) => (
    (menu.clickedOn('furnaceSlot') || menu.clickedOn('anvilSlot'))
      && Boolean(selectedItemData)
  ),
  execute: ({ action, menu, miscData, selectedItemData }) => {
    if (!selectedItemData || !menu.canDoAction(selectedItemData.actions, action)) {
      return [];
    }

    const color = UI.getContextSubjectColor(selectedItemData.context);

    return [{
      label: `${action.name} <span style='color:${color}'>${selectedItemData.name}</span>`,
      action,
      type: 'item',
      miscData,
      uuid: selectedItemData.uuid,
      id: selectedItemData.id,
    }];
  },
};

export default smeltActionStrategy;
