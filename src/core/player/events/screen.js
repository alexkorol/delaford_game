import bus from '../../utilities/bus.js';

export default {
  /**
   * The bank updates
   */
  'core:bank:refresh': (data, context) => {
    context.game.player.bank = data.data.data;
  },

  'core:pane:close': () => {
    bus.$emit('screen:close');
  },
};
