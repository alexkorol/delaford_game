<template>
  <PaneCard
    class="anvil-pane"
    title="Anvil"
    aria-label="Anvil panel"
    dismissible
    @dismiss="closePane"
  >
    <p class="anvil-pane__intro">What would you like to make?</p>
    <InventoryGrid
      class="anvil-pane__grid"
      :images="game.map.images"
      :columns="gridColumns"
      :rows="gridRows"
      :items="smeltItems"
      :draggable="false"
      :cell-size="80"
      @item-click="handleItemClick"
      @item-contextmenu="handleItemContextMenu"
      @item-hover="handleItemHover"
    >
      <template #item-footer="{ item }">
        <div class="anvil-pane__name">{{ formatDisplayName(item.name) }}</div>
        <div
          class="anvil-pane__bars"
          :class="{
            'anvil-pane__bars--ready': item.metadata?.hasBars && item.metadata?.hasLevel,
            'anvil-pane__bars--bars': !item.metadata?.hasBars,
            'anvil-pane__bars--level': !item.metadata?.hasLevel
          }"
        >
          {{ item.metadata?.barsNeeded }} bar{{ item.metadata?.barsNeeded === 1 ? '' : 's' }}
        </div>
      </template>
    </InventoryGrid>
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

const GRID_COLUMNS = 5;
const TOTAL_SLOTS = 15;
const gridColumns = GRID_COLUMNS;
const gridRows = Math.max(1, Math.ceil(TOTAL_SLOTS / GRID_COLUMNS));

const smithingLevel = computed(() => props.game?.player?.skills?.smithing?.level ?? 1);
const barToForge = computed(() => props.data?.bar);

const barsInInventory = computed(() => {
  const target = barToForge.value;
  if (!target) {
    return 0;
  }

  return (props.game?.player?.inventory || []).filter((item) => item.id === `${target}-bar`).length;
});

const { emitSelectAction, emitContextMenu } = useLegacyGridInteractions();

const smeltItems = computed(() => (
  (props.data?.items || []).map((entry, index) => {
    const hasBars = entry.bars <= barsInInventory.value;
    const hasLevel = entry.level <= smithingLevel.value;

    return adaptLegacyGridItem({ id: entry.item }, index, {
      uuidPrefix: 'anvil',
      qty: 1,
      locked: !hasLevel,
      metadata: {
        barsNeeded: entry.bars,
        hasBars,
        hasLevel,
      },
    });
  })
));

const formatDisplayName = (name) => (name ? name.split(' ').slice(1).join(' ') || name : '');

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

.anvil-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  text-align: center;
}

.anvil-pane__intro {
  margin: 0;
  font-size: clamp(13px, 1.2vw, 15px);
  color: rgba(255, 255, 255, 0.78);
  letter-spacing: 0.04em;
}

.anvil-pane__grid {
  margin: 0 auto;
  width: fit-content;
  max-width: 100%;

  :deep(.inventory-item) {
    align-items: center;
    text-align: center;
    padding: var(--space-sm) var(--space-md);
    width: 75px;
  }

  :deep(.inventory-item__body) {
    width: 100%;
    height: 32px;
  }
}

.anvil-pane__name {
  font-size: clamp(11px, 1vw, 13px);
  margin-top: var(--space-xs);
  color: rgba(255, 255, 255, 0.85);
  text-transform: capitalize;
}

.anvil-pane__bars {
  font-size: clamp(10px, 0.95vw, 12px);
  margin-top: var(--space-xs);
  letter-spacing: 0.04em;
}

.anvil-pane__bars--level {
  color: #f66;
}

.anvil-pane__bars--bars {
  color: #ffb85c;
}

.anvil-pane__bars--ready {
  color: #3dff8a;
}
</style>
