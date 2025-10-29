import UI from '#shared/ui.js';

const miningRockStrategy = {
  actionIds: ['player:resource:mining:rock'],
  description: 'Mine a resource node located at the clicked tile.',
  canExecute: ({ foregroundData, menu, action }) => (
    Boolean(foregroundData)
      && menu.canDoAction(foregroundData, action)
  ),
  execute: ({ action, foregroundData, coordinates }) => {
    if (!foregroundData) {
      return [];
    }

    const color = UI.getContextSubjectColor(foregroundData.context);
    return [{
      label: `${action.name} <span style='color:${color}'>${foregroundData.name}</span>`,
      action,
      type: 'mine',
      coordinates: coordinates.map,
      at: {
        x: coordinates.viewport.x,
        y: coordinates.viewport.y,
      },
      id: foregroundData.id,
    }];
  },
};

export default miningRockStrategy;
