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
        v-for="item in displayItems"
        :key="item.uuid"
        :class="itemClasses(item)"
        :style="itemStyle(item)"
        v-on="buildItemListeners(item)"
      >
        <div class="inventory-item__body">
          <div
            class="inventory-item__sprite"
            :style="itemSpriteStyle(item)"
          />
          <span
            v-if="item.stackable && item.qty > 1"
            class="inventory-item__quantity"
          >{{ item.qty }}</span>
        </div>
        <div class="inventory-item__footer">
          <slot
            name="item-footer"
            :item="item"
          />
        </div>
      </div>
    </transition-group>

    <div
      v-if="showGhost"
      class="inventory-grid__ghost"
      :class="ghostClasses"
      :style="ghostStyle"
    />
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { CELL_GAP_PX, CELL_SIZE_PX, ORIENTATION_DEFAULT } from '@/core/inventory/constants.js';
import { coordsFromIndex } from '@/core/inventory/grid-math.js';
import { getItemDimensions } from '@/core/inventory/footprint.js';
import { normaliseInventoryItem } from '@/core/inventory/normalise.js';
import { useInventoryStore } from '@/stores/inventory.js';

const DEFAULT_DRAG_STATE = Object.freeze({
  activeItemId: null,
  ghostPosition: null,
  orientation: ORIENTATION_DEFAULT,
  hoverTarget: null,
});

export default {
  name: 'InventoryGrid',
  emits: ['commit', 'item-click', 'item-contextmenu', 'item-hover', 'item-leave', 'item-pointerdown'],
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
    items: {
      type: Array,
      default: null,
    },
    draggable: {
      type: Boolean,
      default: true,
    },
    cellSize: {
      type: Number,
      default: CELL_SIZE_PX,
    },
  },
  setup(props, { emit }) {
    const gridRef = ref(null);
    const inventoryStore = useInventoryStore();
    const {
      items: storeItems,
      dragState: storeDragState,
      isDragging: storeIsDragging,
      activeItem: storeActiveItem,
    } = storeToRefs(inventoryStore);

    const usesStore = computed(() => props.items === null);

    const externalItems = ref([]);
    const externalOrientation = ref(new Map());

    const gridStyle = computed(() => ({
      '--cell-size': `${props.cellSize}px`,
      '--cell-gap': `${CELL_GAP_PX}px`,
      gridTemplateColumns: `repeat(${props.columns}, var(--cell-size))`,
      gridAutoRows: 'var(--cell-size)',
    }));

    const totalSlots = computed(() => props.columns * props.rows);

    const refreshExternalItems = (list = []) => {
      const snapshot = new Map(externalOrientation.value);
      const gridSpec = { columns: props.columns, rows: props.rows };

      const normalised = list.map((entry, index) => {
        const slot = typeof entry?.slot === 'number' ? entry.slot : index;
        const base = {
          ...entry,
          slot,
          uuid: entry?.uuid || entry?.instanceId || `${entry?.id || 'item'}-${slot}`,
        };
        const mapped = normaliseInventoryItem(base, gridSpec, snapshot);
        snapshot.set(mapped.uuid, mapped.orientation);
        return mapped;
      });

      externalOrientation.value = snapshot;
      externalItems.value = normalised;
    };

    watch(() => props.items, (list) => {
      if (!usesStore.value) {
        refreshExternalItems(list || []);
      }
    }, { immediate: true, deep: true });

    watch([() => props.columns, () => props.rows], () => {
      if (!usesStore.value) {
        refreshExternalItems(props.items || []);
      }
    });

    const displayItems = computed(() => (usesStore.value ? storeItems.value : externalItems.value));
    const dragState = computed(() => (usesStore.value ? storeDragState.value : DEFAULT_DRAG_STATE));
    const isDragging = computed(() => (usesStore.value ? storeIsDragging.value : false));
    const activeItem = computed(() => (usesStore.value ? storeActiveItem.value : null));

    const pointerCellFromEvent = (event) => {
      const element = gridRef.value;
      if (!element) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      const cellSize = props.cellSize + CELL_GAP_PX;
      const x = Math.floor(offsetX / cellSize);
      const y = Math.floor(offsetY / cellSize);

      if (x < 0 || y < 0 || x >= props.columns || y >= props.rows) {
        return null;
      }

      return { x, y };
    };

    const handlePointerMove = (event) => {
      if (!props.draggable || !usesStore.value || !isDragging.value) {
        return;
      }

      const pointerCell = pointerCellFromEvent(event);
      if (!pointerCell) {
        return;
      }

      inventoryStore.updatePointerCell(pointerCell);
    };

    const handlePointerLeave = () => {
      if (!props.draggable || !usesStore.value || !isDragging.value) {
        return;
      }

      inventoryStore.clearHoverTarget();
    };

    const handlePointerUp = (event) => {
      if (!props.draggable || !usesStore.value || !isDragging.value) {
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

    const startDrag = (event, item) => {
      if (!props.draggable || !usesStore.value) {
        return;
      }

      const cell = pointerCellFromEvent(event) || coordsFromIndex(item.slot, props.columns);
      const offset = {
        x: cell.x - item.position.x,
        y: cell.y - item.position.y,
      };

      inventoryStore.beginDrag(item.uuid, 'inventory', { pointerOffset: offset });
      window.addEventListener('pointerup', handlePointerUp);
    };

    const handleKeyUp = (event) => {
      if (!props.draggable || !usesStore.value || !isDragging.value) {
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

    const isItemDragging = (uuid) => dragState.value?.activeItemId === uuid;

    const ghostPlacement = computed(() => {
      if (!props.draggable || !usesStore.value || !dragState.value.ghostPosition) {
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

    const showGhost = computed(() => ghostPlacement.value !== null);

    const handleItemClick = (event, item) => {
      emit('item-click', { event, item });
    };

    const handleItemContextMenu = (event, item) => {
      event.preventDefault();
      emit('item-contextmenu', { event, item });
    };

    const handleItemPointerEnter = (event, item) => {
      emit('item-hover', { event, item });
    };

    const handleItemPointerLeave = (event, item) => {
      emit('item-leave', { event, item });
    };

    const handleItemPointerDown = (event, item) => {
      emit('item-pointerdown', { event, item });
      if (!props.draggable || !usesStore.value) {
        return;
      }

      event.preventDefault();
      startDrag(event, item);
    };

    const buildItemListeners = (item) => ({
      pointerdown: (event) => handleItemPointerDown(event, item),
      click: (event) => handleItemClick(event, item),
      contextmenu: (event) => handleItemContextMenu(event, item),
      pointerenter: (event) => handleItemPointerEnter(event, item),
      pointerleave: (event) => handleItemPointerLeave(event, item),
    });

    const itemClasses = (item) => ([
      'inventory-item',
      {
        'inventory-item--dragging': isItemDragging(item.uuid),
        'inventory-item--locked': Boolean(item.isLocked),
      },
    ]);

    return {
      gridRef,
      gridStyle,
      totalSlots,
      displayItems,
      itemStyle,
      itemSpriteStyle,
      isItemDragging,
      ghostPlacement,
      ghostClasses,
      ghostStyle,
      showGhost,
      buildItemListeners,
      itemClasses,
      handlePointerMove,
      handlePointerLeave,
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
  flex-direction: column;
  justify-content: flex-end;
  width: 100%;
  height: 100%;
  cursor: grab;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.45);
  border-radius: 4px;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.7);
  transition: transform 0.12s ease;
  overflow: visible;
}

.inventory-item--dragging {
  opacity: 0.45;
  cursor: grabbing;
}

.inventory-item__body {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
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
  position: absolute;
  right: 4px;
  bottom: 4px;
  margin: 0;
  padding: 2px 4px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 3px;
  font-size: 12px;
  color: #ffe28a;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.6);
}

.inventory-item__footer {
  margin-top: 6px;
  font-size: 12px;
  color: #f0f0f0;
  text-align: center;
  pointer-events: none;
}

.inventory-item__footer:empty {
  display: none;
}

.inventory-item--locked .inventory-item__body {
  filter: contrast(0.35);
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
