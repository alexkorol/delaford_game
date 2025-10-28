<template>
  <div
    ref="gridRef"
    class="inventory-grid"
    :style="gridStyle"
    @pointermove.prevent="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <div
      v-for="slotIndex in totalSlots"
      :key="slotIndex"
      class="inventory-grid__cell"
    />

    <transition-group name="inventory-item">
      <div
        v-for="item in items"
        :key="item.uuid"
        :class="['inventory-item', { 'inventory-item--dragging': isItemDragging(item.uuid) }]"
        :style="itemStyle(item)"
        @pointerdown.prevent="beginPointerDrag($event, item)"
      >
        <div
          class="inventory-item__sprite"
          :style="itemSpriteStyle(item)"
        />
        <span
          v-if="item.stackable && item.qty > 1"
          class="inventory-item__quantity"
        >{{ item.qty }}</span>
      </div>
    </transition-group>

    <div
      v-if="ghostPlacement"
      class="inventory-grid__ghost"
      :class="ghostClasses"
      :style="ghostStyle"
    />
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';

import { CELL_GAP_PX, CELL_SIZE_PX } from '@/core/inventory/constants.js';
import { coordsFromIndex } from '@/core/inventory/grid-math.js';
import { getItemDimensions } from '@/core/inventory/footprint.js';
import { useInventoryStore } from '@/stores/inventory.js';

export default {
  name: 'InventoryGrid',
  emits: ['commit'],
  props: {
    images: {
      type: Object,
      required: true,
    },
    columns: {
      type: Number,
      required: true,
    },
    rows: {
      type: Number,
      required: true,
    },
  },
  setup(props, { emit }) {
    const gridRef = ref(null);
    const inventoryStore = useInventoryStore();
    const {
      items,
      dragState,
      isDragging,
      activeItem,
    } = storeToRefs(inventoryStore);

    const gridStyle = computed(() => ({
      '--cell-size': `${CELL_SIZE_PX}px`,
      '--cell-gap': `${CELL_GAP_PX}px`,
      gridTemplateColumns: `repeat(${props.columns}, var(--cell-size))`,
      gridAutoRows: 'var(--cell-size)',
    }));

    const totalSlots = computed(() => props.columns * props.rows);

    const pointerCellFromEvent = (event) => {
      const element = gridRef.value;
      if (!element) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      const cellSize = CELL_SIZE_PX + CELL_GAP_PX;
      const x = Math.floor(offsetX / cellSize);
      const y = Math.floor(offsetY / cellSize);

      if (x < 0 || y < 0 || x >= props.columns || y >= props.rows) {
        return null;
      }

      return { x, y };
    };

    const handlePointerMove = (event) => {
      if (!isDragging.value) {
        return;
      }

      const pointerCell = pointerCellFromEvent(event);
      if (!pointerCell) {
        return;
      }

      inventoryStore.updatePointerCell(pointerCell);
    };

    const handlePointerLeave = () => {
      if (!isDragging.value) {
        return;
      }

      inventoryStore.clearHoverTarget();
    };

    const handlePointerUp = (event) => {
      if (!isDragging.value) {
        return;
      }

      const pointerCell = pointerCellFromEvent(event);
      if (pointerCell) {
        inventoryStore.updatePointerCell(pointerCell);
      }

      const result = inventoryStore.commitDrop();
      emit('commit', result);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    const beginPointerDrag = (event, item) => {
      const cell = pointerCellFromEvent(event) || coordsFromIndex(item.slot, props.columns);
      const offset = {
        x: cell.x - item.position.x,
        y: cell.y - item.position.y,
      };

      inventoryStore.beginDrag(item.uuid, 'inventory', { pointerOffset: offset });
      window.addEventListener('pointerup', handlePointerUp);
    };

    const handleKeyUp = (event) => {
      if (!isDragging.value) {
        return;
      }

      if (event.key?.toLowerCase() === 'r') {
        inventoryStore.rotateActiveItem();
      }
    };

    onMounted(() => {
      window.addEventListener('keyup', handleKeyUp);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keyup', handleKeyUp);
    });

    const itemStyle = (item) => {
      const { width, height } = getItemDimensions(item, item.orientation);
      return {
        gridColumnStart: item.position.x + 1,
        gridColumnEnd: `span ${width}`,
        gridRowStart: item.position.y + 1,
        gridRowEnd: `span ${height}`,
      };
    };

    const backgroundSrc = (tileset) => {
      if (!props.images) {
        return '';
      }

      switch (tileset) {
      case 'general':
        return props.images.generalImage ? props.images.generalImage.src : '';
      case 'jewelry':
        return props.images.jewelryImage ? props.images.jewelryImage.src : '';
      case 'armor':
        return props.images.armorImage ? props.images.armorImage.src : '';
      default:
        return props.images.weaponsImage ? props.images.weaponsImage.src : '';
      }
    };

    const itemSpriteStyle = (item) => {
      const { graphics = {} } = item;
      const { tileset = 'weapons', column = 0, row = 0 } = graphics;

      return {
        backgroundImage: `url(${backgroundSrc(tileset)})`,
        backgroundPosition: `left -${column * 32}px top -${row * 32}px`,
      };
    };

    const isItemDragging = (uuid) => inventoryStore.dragState.value.activeItemId === uuid;

    const ghostPlacement = computed(() => {
      if (!dragState.value.ghostPosition) {
        return null;
      }

      const item = activeItem.value;
      if (!item) {
        return null;
      }

      return {
        position: dragState.value.ghostPosition,
        orientation: dragState.value.orientation,
        valid: dragState.value.hoverTarget?.valid,
      };
    });

    const ghostClasses = computed(() => ({
      'inventory-grid__ghost--invalid': ghostPlacement.value && ghostPlacement.value.valid === false,
    }));

    const ghostStyle = computed(() => {
      if (!ghostPlacement.value) {
        return {};
      }

      const item = activeItem.value;
      if (!item) {
        return {};
      }

      const { width, height } = getItemDimensions(item, ghostPlacement.value.orientation);

      return {
        gridColumnStart: ghostPlacement.value.position.x + 1,
        gridColumnEnd: `span ${width}`,
        gridRowStart: ghostPlacement.value.position.y + 1,
        gridRowEnd: `span ${height}`,
      };
    });

    return {
      gridRef,
      items,
      dragState,
      gridStyle,
      totalSlots,
      handlePointerMove,
      handlePointerLeave,
      beginPointerDrag,
      itemStyle,
      itemSpriteStyle,
      isItemDragging,
      ghostPlacement,
      ghostClasses,
      ghostStyle,
    };
  },
};
</script>

<style lang="scss" scoped>
.inventory-grid {
  position: relative;
  display: grid;
  gap: var(--cell-gap);
  padding: var(--cell-gap);
  background: rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.65);
  user-select: none;
}

.inventory-grid__cell {
  width: var(--cell-size);
  height: var(--cell-size);
  background: rgba(0, 0, 0, 0.1);
  border: 1px dashed rgba(255, 255, 255, 0.05);
  box-sizing: border-box;
}

.inventory-item {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  width: 100%;
  height: 100%;
  cursor: grab;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.45);
  border-radius: 4px;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.7);
  transition: transform 0.12s ease;
}

.inventory-item--dragging {
  opacity: 0.45;
  cursor: grabbing;
}

.inventory-item__sprite {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-repeat: no-repeat;
}

.inventory-item__quantity {
  position: relative;
  margin: 4px;
  padding: 2px 4px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 3px;
  font-size: 12px;
  color: #ffe28a;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.6);
}

.inventory-grid__ghost {
  pointer-events: none;
  border: 2px dashed rgba(255, 255, 255, 0.35);
  background: rgba(0, 255, 153, 0.08);
}

.inventory-grid__ghost--invalid {
  border-color: rgba(255, 82, 82, 0.65);
  background: rgba(255, 82, 82, 0.12);
}

.inventory-item-enter-active,
.inventory-item-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.inventory-item-enter-from,
.inventory-item-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
