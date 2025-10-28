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
      <InventoryGrid
        :images="game.map.images"
        :columns="grid.columns"
        :rows="grid.rows"
        @commit="handleInventoryCommit"
      />

      <WorldDropZone />
      <ContainerStack />
    </div>
  </div>
</template>

<script>
import { watch } from 'vue';

import bus from '../../core/utilities/bus.js';
import { useInventoryStore } from '@/stores/inventory.js';
import EquipmentRagdoll from '../inventory/EquipmentRagdoll.vue';
import InventoryGrid from '../inventory/InventoryGrid.vue';
import WorldDropZone from '../inventory/WorldDropZone.vue';
import ContainerStack from '../inventory/ContainerStack.vue';

const INVENTORY_COLUMNS = 12;
const INVENTORY_ROWS = 7;

export default {
  name: 'InventoryPane',
  components: {
    EquipmentRagdoll,
    InventoryGrid,
    WorldDropZone,
    ContainerStack,
  },
  props: {
    game: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const inventoryStore = useInventoryStore();

    watch(() => props.game?.player?.inventory, (items) => {
      inventoryStore.setInventoryItems(items || []);
    }, { immediate: true, deep: true });

    watch(() => props.game?.player?.wear, (wear) => {
      inventoryStore.setEquipment(wear || {});
    }, { immediate: true, deep: true });

    return {
      inventoryStore,
    };
  },
  provide() {
    return {
      inventoryDragStore: this.inventoryStore,
    };
  },
  data() {
    return {
      loaded: false,
      grid: {
        columns: INVENTORY_COLUMNS,
        rows: INVENTORY_ROWS,
      },
    };
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
    handleInventoryCommit(result) {
      if (!result || result.cancelled) {
        return;
      }

      bus.$emit('inventory:interaction', {
        source: 'inventory-pane',
        result,
      });
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
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}
</style>
