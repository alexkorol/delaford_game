import { useUiStore } from './ui.js';

export const createLegacyStore = () => {
  const uiStore = useUiStore();

  const getterMap = {
    account: () => uiStore.account,
    action: () => uiStore.action,
    guestAccount: () => uiStore.guestAccount,
    rememberMe: () => uiStore.rememberMe,
    flowerOfLifeState: () => uiStore.flowerOfLifeState,
    flowerOfLifeAllocated: () => uiStore.flowerOfLifeAllocated,
  };

  const getters = new Proxy({}, {
    get(_target, prop) {
      if (prop in getterMap) {
        return getterMap[prop]();
      }
      return undefined;
    },
  });

  const dispatch = (action, payload) => {
    switch (action) {
      case 'setAction':
        return uiStore.setAction(payload);
      case 'setGuestAccount':
        return uiStore.setGuestAccount(payload);
      case 'setRememberMe':
        return uiStore.setRememberMe(payload);
      case 'rememberDevAccount':
        return uiStore.rememberDevAccount(payload);
      case 'allocateFlowerNode':
        return uiStore.allocateFlowerNode(payload);
      case 'refundFlowerNode':
        return uiStore.refundFlowerNode(payload);
      case 'resetFlowerOfLife':
        return uiStore.resetFlowerOfLife(payload);
      case 'setFlowerManualMilestone':
        return uiStore.setFlowerManualMilestone(payload);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  };

  const legacyState = uiStore.$state;

  return {
    get state() {
      return legacyState;
    },
    get getters() {
      return getters;
    },
    dispatch,
  };
};
