<template>
  <PaneCard
    class="furnace-pane"
    title="Furnace"
    aria-label="Furnace panel"
    dismissible
    @dismiss="closePane"
  >
    <p class="furnace-pane__intro">
      Select the bar you want to smelt
    </p>
    <InventoryGrid
      class="furnace-pane__grid"
      :images="game.map.images"
      :columns="gridColumns"
      :rows="gridRows"
      :items="barItems"
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

const GRID_COLUMNS = 6;
const TOTAL_SLOTS = 6;
const gridColumns = GRID_COLUMNS;
const gridRows = Math.max(1, Math.ceil(TOTAL_SLOTS / GRID_COLUMNS));

const smithingLevel = computed(() => props.game?.player?.skills?.smithing?.level ?? 1);

const barLevelMap = {
  'bronze-bar': 1,
  'iron-bar': 19,
  'silver-bar': 25,
  'steel-bar': 40,
  'gold-bar': 47,
  'jatite-bar': 55,
};

const { emitSelectAction, emitContextMenu } = useLegacyGridInteractions();

const barItems = computed(() => (
  (props.data?.items || []).map((id, index) => adaptLegacyGridItem({ id }, index, {
    uuidPrefix: 'furnace',
    qty: 1,
    locked: (barLevelMap[id] || 0) > smithingLevel.value,
  }))
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

.furnace-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  text-align: center;
}

.furnace-pane__intro {
  margin: 0;
  font-size: clamp(13px, 1.2vw, 15px);
  color: rgba(255, 255, 255, 0.78);
  letter-spacing: 0.04em;
}

.furnace-pane__grid {
  margin: 0 auto;
  width: fit-content;
  max-width: 100%;
}
</style>
