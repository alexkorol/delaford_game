<template>
  <div
    v-if="loaded"
    class="inventory-pane"
  >
    <EquipmentRagdoll
      :game="game"
      class="inventory-pane__ragdoll"
    />

    <div class="inventory-pane__grid">
      <item-grid
        :images="game.map.images"
        :items="items"
        :slots="totalSlots"
        screen="inventory"
      />
    </div>
  </div>
</template>

<script>
import bus from '../../core/utilities/bus.js';
import EquipmentRagdoll from '../inventory/EquipmentRagdoll.vue';

const INVENTORY_COLUMNS = 12;
const INVENTORY_ROWS = 7;

export default {
  name: 'InventoryPane',
  components: {
    EquipmentRagdoll,
  },
  props: {
    game: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      loaded: false,
    };
  },
  computed: {
    items() {
      return this.game.player.inventory;
    },
    totalSlots() {
      return INVENTORY_COLUMNS * INVENTORY_ROWS;
    },
  },
  created() {
    bus.$on('game:images:loaded', this.imagesLoaded);
    if (this.game && this.game.map && this.game.map.images && Object.keys(this.game.map.images).length) {
      this.loaded = true;
    }
  },
  beforeUnmount() {
    bus.$off('game:images:loaded', this.imagesLoaded);
  },
  methods: {
    imagesLoaded() {
      this.loaded = true;
    },
  },
};
</script>

<style lang="scss" scoped>
.inventory-pane {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: start;
  width: 100%;
  box-sizing: border-box;

  &__ragdoll {
    min-width: 190px;
  }

  &__grid {
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.35);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.65);
  }
}
</style>
