<template>
  <div class="anvilView">
    <pane-header text="Anvil" />
    <p>What would you like to make?</p>
    <InventoryGrid
      class="anvilGrid"
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
        <div class="anvilGrid__name">{{ formatDisplayName(item.name) }}</div>
        <div
          class="anvilGrid__bars"
          :class="{
            canSmith: item.metadata?.hasBars && item.metadata?.hasLevel,
            notEnoughBars: !item.metadata?.hasBars,
            levelNeeded: !item.metadata?.hasLevel
          }"
        >
          {{ item.metadata?.barsNeeded }} bar{{ item.metadata?.barsNeeded === 1 ? '' : 's' }}
        </div>
      </template>
    </InventoryGrid>
  </div>
</template>

<script setup>
import { computed } from 'vue';

import InventoryGrid from '../inventory/InventoryGrid.vue';
import { adaptLegacyGridItem } from '@/core/inventory/legacy-adapter.js';
import useLegacyGridInteractions from '@/core/inventory/useLegacyGridInteractions.js';

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
</script>

<style lang="scss" scoped>
@use 'sass:color';

$color: #706559;
$background_color: #ededed;
$default_color: #383838;

p {
  font-size: 0.6em;
  margin: 1em 0;
}

.anvilGrid {
  margin: 0 auto;
  width: fit-content;

  :deep(.inventory-item) {
    align-items: center;
    text-align: center;
    padding: 8px 10px;
    width: 75px;
  }

  :deep(.inventory-item__body) {
    width: 100%;
    height: 32px;
  }
}

.anvilGrid__name {
  font-size: 0.55em;
  margin-top: 0.5em;
}

.anvilGrid__bars {
  font-size: 0.5em;
  margin-top: 0.6em;
}

.levelNeeded {
  color: #901313 !important;
}

.notEnoughBars {
  color: #ffb42a;
}

.canSmith {
  color: #14ff14;
}

.anvilView {
  background-color: $color;
  font-family: "GameFont", serif;
  border: 5px solid color.adjust($color, $lightness: -10%);

  .header {
    background: color.adjust($color, $lightness: 10%);
    height: 30px;

    .close {
      float: right;
      width: 30px;
      box-sizing: border-box;
      height: 30px;
      background-color: color.adjust(red, $lightness: -10%);
      color: white;
      font-size: 1em;
      padding: 5px 2px 5px 5px;
    }
  }

  .main {
    padding: 0.5em;
  }
}
</style>
