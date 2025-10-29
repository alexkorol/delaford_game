const cancelStrategy = {
  actionIds: ['Cancel'],
  description: 'Close the context menu without performing an action.',
  canExecute: () => false,
  execute: () => [],
};

export default cancelStrategy;
