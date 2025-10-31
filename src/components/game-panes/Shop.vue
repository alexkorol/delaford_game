<template>
  <div class="shopView">
    <pane-header :text="data.name" />
    <InventoryGrid
      :images="game.map.images"
      :columns="gridColumns"
      :rows="gridRows"
      :items="shopItems"
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
</script>

<style lang="scss" scoped>
@use 'sass:color';

$color: #706559;
$background_color: #ededed;
$default_color: #383838;

.shopView {
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
