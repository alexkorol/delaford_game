import UI from '#shared/ui.js';

const openScreenStrategy = {
  actionIds: ['player:screen:bank', 'player:screen:npc:trade'],
  description: 'Open banking or trading panes from world interactions.',
  canExecute: ({ menu, foregroundData, npcs }) => (
    menu.isFromGameCanvas()
      && (Boolean(foregroundData) || (Array.isArray(npcs) && npcs.length > 0))
  ),
  execute: ({ action, menu, foregroundData, npcs }) => {
    if (!menu.isFromGameCanvas()) {
      return [];
    }

    const results = [];

    if (foregroundData && menu.canDoAction(foregroundData.actions, action)) {
      const fgColor = UI.getContextSubjectColor(foregroundData.context);
      results.push({
        label: `${action.name} <span style='color:${fgColor}'>${foregroundData.name}</span>`,
        action,
        examine: foregroundData.examine,
        type: 'foreground',
        id: foregroundData.id,
      });
    }

    if (Array.isArray(npcs)) {
      npcs.forEach((npc) => {
        if (!menu.canDoAction(npc.actions, action)) {
          return;
        }
        const color = UI.getContextSubjectColor(npc.context);
        results.push({
          label: `${action.name} <span style='color:${color}'>${npc.name}</span>`,
          action,
          examine: npc.examine,
          type: 'npc',
          id: npc.id,
        });
      });
    }

    return results;
  },
};

export default openScreenStrategy;
