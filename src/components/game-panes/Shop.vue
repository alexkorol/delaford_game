<template>
  <PaneCard
    class="shop-pane"
    :title="data.name || 'Shop'"
    :aria-label="`${data.name || 'Shop'} panel`"
    dismissible
    @dismiss="closePane"
  >
    <InventoryGrid
      class="shop-pane__grid"
      :images="game.map.images"
      :columns="gridColumns"
      :rows="gridRows"
      :items="shopItems"
      :draggable="false"
      @item-click="handleItemClick"
      @item-contextmenu="handleItemContextMenu"
      @item-hover="handleItemHover"
    />
  </PaneCard>
</template>

<script setup>
import { computed } from 'vue';

import PaneCard from '@/components/ui/panes/PaneCard.vue';
import InventoryGrid from '@/components/inventory/InventoryGrid.vue';
import { adaptLegacyGridItem } from '@/core/inventory/legacy-adapter.js';
import useLegacyGridInteractions from '@/core/inventory/useLegacyGridInteractions.js';
import bus from '@/core/utilities/bus.js';

const props = defineProps({
  game: {
    type: Object,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },
});

const GRID_COLUMNS = 11;
const TOTAL_SLOTS = 200;
const gridColumns = GRID_COLUMNS;
const gridRows = Math.ceil(TOTAL_SLOTS / GRID_COLUMNS);

const { emitSelectAction, emitContextMenu } = useLegacyGridInteractions();

const shopItems = computed(() => (
  (props.data?.inventory || []).map((item, index) => adaptLegacyGridItem(item, index, { uuidPrefix: 'shop' }))
));

const handleItemClick = ({ event }) => {
  emitSelectAction(event);
};

const handleItemContextMenu = ({ event, item }) => {
  emitContextMenu(event, item.slot);
};

const handleItemHover = ({ event, item }) => {
  emitContextMenu(event, item.slot, { firstOnly: true });
};

const closePane = () => {
  bus.$emit('screen:close');
};
</script>

<style lang="scss" scoped>
@use '@/assets/scss/abstracts/tokens' as *;

.shop-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.shop-pane__grid {
  margin: 0 auto;
  width: fit-content;
  max-width: 100%;
}
</style>
