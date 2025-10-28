const walkHereStrategy = {
  actionIds: ['player:walk-here'],
  description: 'Move the player to the clicked tile.',
  canExecute: () => true,
  execute: ({ action }) => [{
    action,
    label: action.name,
  }],
};

export default walkHereStrategy;
