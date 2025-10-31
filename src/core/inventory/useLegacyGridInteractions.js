import { onBeforeUnmount, onMounted } from 'vue';

import ClientUI from '@/core/utilities/client-ui.js';
import bus from '@/core/utilities/bus.js';
import UI from '@shared/ui.js';
import { useUiStore } from '@/stores/ui.js';

export const useLegacyGridInteractions = () => {
  const uiStore = useUiStore();

  onMounted(() => {
    bus.$on('game:context-menu:first-only', ClientUI.displayFirstAction);
  });

  onBeforeUnmount(() => {
    bus.$off('game:context-menu:first-only', ClientUI.displayFirstAction);
  });

  const emitSelectAction = (event) => {
    if (!event) {
      return;
    }

    bus.$emit('canvas:select-action', {
      event,
      item: uiStore.action?.object,
    });
  };

  const emitContextMenu = (event, slot, options = {}) => {
    if (!event) {
      return;
    }

    const { firstOnly = false } = options;
    const coordinates = UI.getViewportCoordinates(event);
    const payload = {
      event,
      coordinates,
      slot,
      target: event.target,
    };

    if (!firstOnly) {
      event.preventDefault();
      bus.$emit('PLAYER:MENU', payload);
      return;
    }

    bus.$emit('PLAYER:MENU', {
      ...payload,
      firstOnly: true,
    });
  };

  return {
    emitSelectAction,
    emitContextMenu,
  };
};

export default useLegacyGridInteractions;
