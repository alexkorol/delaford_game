<template>
  <div class="furnaceView">
    <pane-header text="Furnace" />
    <p>
      Select the bar you want to smelt
    </p>
    <InventoryGrid
      class="furnaceGrid"
      :images="game.map.images"
      :columns="gridColumns"
      :rows="gridRows"
      :items="barItems"
      :draggable="false"
      @item-click="handleItemClick"
      @item-contextmenu="handleItemContextMenu"
      @item-hover="handleItemHover"
    />
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
</script>

<style lang="scss" scoped>
@use 'sass:color';

$color: #706559;
$background_color: #ededed;
$default_color: #383838;

p {
  font-size: .6em;
  margin: 1em 0;
}

.furnaceGrid {
  margin: 0 auto;
  width: fit-content;
}

.furnaceView {
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
    padding: .5em;
  }
}
</style>
