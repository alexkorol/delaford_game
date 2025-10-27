import { defineStore } from 'pinia';
import {
  FLOWER_OF_LIFE_DEFAULT_PROGRESS,
  FLOWER_OF_LIFE_NODE_MAP,
  FLOWER_OF_LIFE_DEPENDENT_MAP,
} from '@shared/passives/flower-of-life.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

const createFlowerOfLifeState = () => clone(FLOWER_OF_LIFE_DEFAULT_PROGRESS);

export const useUiStore = defineStore('ui', {
  state: () => ({
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
  }),
  getters: {
    account: (state) => state.account,
    action: (state) => state.action,
    guestAccount: (state) => state.guestAccount,
    rememberMe: (state) => state.rememberMe,
    flowerOfLifeState: (state) => {
      if (!state.passives.flowerOfLife) {
        state.passives.flowerOfLife = createFlowerOfLifeState();
      }
      return state.passives.flowerOfLife;
    },
    flowerOfLifeAllocated: (state) => {
      if (!state.passives.flowerOfLife) {
        state.passives.flowerOfLife = createFlowerOfLifeState();
      }
      return state.passives.flowerOfLife.allocatedNodes;
    },
  },
  actions: {
    setAction(payload) {
      this.action = {
        label: payload.label,
        object: payload.object,
      };
    },
    setGuestAccount(payload) {
      this.guestAccount = payload;
    },
    setRememberMe(payload) {
      this.rememberMe = payload;
    },
    rememberDevAccount(payload) {
      this.account.username = payload.username;
      this.account.password = payload.password;
    },
    ensureFlowerState() {
      if (!this.passives.flowerOfLife) {
        this.passives.flowerOfLife = createFlowerOfLifeState();
      }
      return this.passives.flowerOfLife;
    },
    resetFlowerOfLife(timestamp = Date.now()) {
      this.passives.flowerOfLife = {
        ...createFlowerOfLifeState(),
        lastResetAt: timestamp,
      };
    },
    allocateFlowerNode({ nodeId }) {
      if (!nodeId || !FLOWER_OF_LIFE_NODE_MAP[nodeId]) {
        return false;
      }
      const flower = this.ensureFlowerState();
      if (flower.allocatedNodes.includes(nodeId)) {
        return false;
      }
      const node = FLOWER_OF_LIFE_NODE_MAP[nodeId];
      if (Array.isArray(node.requires)) {
        const missing = node.requires.some((req) => !flower.allocatedNodes.includes(req));
        if (missing) {
          return false;
        }
      }
      flower.allocatedNodes.push(nodeId);
      return true;
    },
    refundFlowerNode({ nodeId }) {
      const flower = this.ensureFlowerState();
      if (!nodeId || !flower.allocatedNodes.includes(nodeId)) {
        return false;
      }
      const dependents = FLOWER_OF_LIFE_DEPENDENT_MAP[nodeId] || [];
      if (dependents.some((dep) => flower.allocatedNodes.includes(dep))) {
        return false;
      }
      flower.allocatedNodes = flower.allocatedNodes.filter((id) => id !== nodeId);
      return true;
    },
    setFlowerManualMilestone({ gateId, value }) {
      const flower = this.ensureFlowerState();
      if (!flower.manualMilestones) {
        flower.manualMilestones = {};
      }
      flower.manualMilestones[gateId] = Boolean(value);
    },
  },
  persist: {
    paths: ['account', 'guestAccount', 'rememberMe', 'passives.flowerOfLife'],
  },
});
