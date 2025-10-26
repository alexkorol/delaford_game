import Vue from 'vue';
import Vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate';
import {
  FLOWER_OF_LIFE_DEFAULT_PROGRESS,
  FLOWER_OF_LIFE_NODE_MAP,
  FLOWER_OF_LIFE_DEPENDENT_MAP,
} from 'shared/passives/flower-of-life';

Vue.use(Vuex);

const clone = (value) => JSON.parse(JSON.stringify(value));

const createFlowerOfLifeState = () => clone(FLOWER_OF_LIFE_DEFAULT_PROGRESS);

const ensureFlowerState = (state) => {
  if (!state.passives) {
    Vue.set(state, 'passives', { flowerOfLife: createFlowerOfLifeState() });
  } else if (!state.passives.flowerOfLife) {
    Vue.set(state.passives, 'flowerOfLife', createFlowerOfLifeState());
  }

  return state.passives.flowerOfLife;
};

export default new Vuex.Store({
  plugins: [createPersistedState()],
  state: {
    account: {
      username: '',
      password: '',
    },
    guestAccount: false,
    rememberMe: false,
    action: {
      label: '',
      object: '',
    },
    passives: {
      flowerOfLife: createFlowerOfLifeState(),
    },
  },
  getters: {
    account: (state) => state.account,
    action: (state) => state.action,
    guestAccount: (state) => state.guestAccount,
    rememberMe: (state) => state.rememberMe,
    flowerOfLifeState: (state) => ensureFlowerState(state),
    flowerOfLifeAllocated: (state) => ensureFlowerState(state).allocatedNodes,
  },
  mutations: {
    REMEMBER_DEV_ACCOUNT: (state, payload) => {
      state.account.username = payload.username;
      state.account.password = payload.password;
    },
    SET_ACTION: (state, payload) => {
      state.action.label = payload.label;
      state.action.object = payload.object;
    },
    SET_REMEMBER_ME: (state, payload) => {
      state.rememberMe = payload;
    },
    SET_GUEST_ACCOUNT: (state, payload) => {
      state.guestAccount = payload;
    },
    RESET_FLOWER_OF_LIFE: (state, timestamp) => {
      const next = createFlowerOfLifeState();
      next.lastResetAt = timestamp || Date.now();
      if (!state.passives) {
        Vue.set(state, 'passives', { flowerOfLife: next });
        return;
      }
      Vue.set(state.passives, 'flowerOfLife', next);
    },
    ALLOCATE_FLOWER_OF_LIFE_NODE: (state, nodeId) => {
      const flower = ensureFlowerState(state);
      if (!flower.allocatedNodes.includes(nodeId)) {
        flower.allocatedNodes.push(nodeId);
      }
    },
    REFUND_FLOWER_OF_LIFE_NODE: (state, nodeId) => {
      const flower = ensureFlowerState(state);
      const updated = flower.allocatedNodes.filter(id => id !== nodeId);
      Vue.set(flower, 'allocatedNodes', updated);
    },
    SET_FLOWER_OF_LIFE_MANUAL_MILESTONE: (state, { gateId, value }) => {
      const flower = ensureFlowerState(state);
      if (!flower.manualMilestones) {
        Vue.set(flower, 'manualMilestones', {});
      }
      Vue.set(flower.manualMilestones, gateId, Boolean(value));
    },
  },
  actions: {
    setAction: (context, payload) => {
      context.commit('SET_ACTION', payload);
    },
    setGuestAccount: (context, payload) => {
      context.commit('SET_GUEST_ACCOUNT', payload);
    },
    setRememberMe: (context, payload) => {
      context.commit('SET_REMEMBER_ME', payload);
    },
    rememberDevAccount: (context, payload) => {
      context.commit('REMEMBER_DEV_ACCOUNT', payload);
    },
    allocateFlowerNode: ({ state, commit }, { nodeId }) => {
      if (!nodeId || !FLOWER_OF_LIFE_NODE_MAP[nodeId]) {
        return false;
      }

      const flower = ensureFlowerState(state);
      if (flower.allocatedNodes.includes(nodeId)) {
        return false;
      }

      const node = FLOWER_OF_LIFE_NODE_MAP[nodeId];
      if (Array.isArray(node.requires)) {
        const missing = node.requires.some(req => !flower.allocatedNodes.includes(req));
        if (missing) {
          return false;
        }
      }

      commit('ALLOCATE_FLOWER_OF_LIFE_NODE', nodeId);
      return true;
    },
    refundFlowerNode: ({ state, commit }, { nodeId }) => {
      const flower = ensureFlowerState(state);
      if (!nodeId || !flower.allocatedNodes.includes(nodeId)) {
        return false;
      }

      const dependents = FLOWER_OF_LIFE_DEPENDENT_MAP[nodeId] || [];
      const blocked = dependents.some(dep => flower.allocatedNodes.includes(dep));
      if (blocked) {
        return false;
      }

      commit('REFUND_FLOWER_OF_LIFE_NODE', nodeId);
      return true;
    },
    resetFlowerOfLife: ({ commit }) => {
      commit('RESET_FLOWER_OF_LIFE', Date.now());
    },
    setFlowerManualMilestone: ({ commit }, payload) => {
      commit('SET_FLOWER_OF_LIFE_MANUAL_MILESTONE', payload);
    },
  },
});
