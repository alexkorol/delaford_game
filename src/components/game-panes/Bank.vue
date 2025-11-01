<template>
  <PaneCard
    class="bank-pane"
    title="Bank of Delaford"
    aria-label="Bank of Delaford panel"
    dismissible
    @dismiss="closePane"
  >
    <InventoryGrid
      class="bank-pane__grid"
      :images="game.map.images"
      :columns="gridColumns"
      :rows="gridRows"
      :items="bankItems"
      :draggable="false"
      @item-click="handleItemClick"
      @item-contextmenu="handleItemContextMenu"
      @item-hover="handleItemHover"
    />
  </PaneCard>
</template>

<script setup>
import { computed, onMounted } from 'vue';

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
});

const GRID_COLUMNS = 11;
const TOTAL_SLOTS = 200;
const gridColumns = GRID_COLUMNS;
const gridRows = Math.ceil(TOTAL_SLOTS / GRID_COLUMNS);

const { emitSelectAction, emitContextMenu } = useLegacyGridInteractions();

const bankItems = computed(() => (
  (props.game?.player?.bank || []).map((item, index) => adaptLegacyGridItem(item, index, { uuidPrefix: 'bank' }))
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

onMounted(() => {
  const INVENTORY = 1;
  bus.$emit('show-sidebar', INVENTORY);
});

const closePane = () => {
  bus.$emit('screen:close');
};
</script>

<style lang="scss" scoped>
@use '@/assets/scss/abstracts/tokens' as *;

.bank-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.bank-pane__grid {
  margin: 0 auto;
  width: fit-content;
  max-width: 100%;
}
</style>
