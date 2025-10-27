export const registerGlobalComponents = (app) => {
  const panes = import.meta.glob('../components/game-panes/**/*.vue', { eager: true });
  const util = import.meta.glob('../components/util/**/*.vue', { eager: true });

  [...Object.entries(panes), ...Object.entries(util)].forEach(([path, module]) => {
    const component = module.default ?? module;
    const segments = path.split('/');
    const filename = segments[segments.length - 1];
    const name = filename.replace(/\.vue$/, '');
    app.component(name, component);
  });
};
