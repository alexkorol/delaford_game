<template>
  <div
    class="world-drop-zone"
    :class="{ 'world-drop-zone--active': isActive }"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
  >
    <span>Drop items here to place on the ground</span>
  </div>
</template>

<script>
import { inject, computed } from 'vue';

export default {
  name: 'WorldDropZone',
  setup() {
    const inventoryStore = inject('inventoryDragStore', null);

    const isActive = computed(() => (
      inventoryStore
      && inventoryStore.dragState.value?.hoverTarget?.type === 'world-drop'
    ));

    const handlePointerEnter = () => {
      if (!inventoryStore || !inventoryStore.isDragging.value) {
        return;
      }

      inventoryStore.setHoverTarget({ type: 'world-drop' });
    };

    const handlePointerLeave = () => {
      if (!inventoryStore || !inventoryStore.isDragging.value) {
        return;
      }

      inventoryStore.clearHoverTarget();
    };

    return {
      isActive,
      handlePointerEnter,
      handlePointerLeave,
    };
  },
};
</script>

<style lang="scss" scoped>
.world-drop-zone {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.world-drop-zone--active {
  background: rgba(255, 138, 101, 0.18);
  border-color: rgba(255, 138, 101, 0.65);
}
</style>
