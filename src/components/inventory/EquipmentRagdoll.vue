<template>
  <div class="equipment-ragdoll">
    <svg class="equipment-ragdoll__skeleton" viewBox="0 0 160 200" preserveAspectRatio="xMidYMid meet">
      <line x1="77" x2="77" y1="25" y2="190" />
      <line x1="25" x2="25" y1="130" y2="190" />
      <line x1="130" x2="130" y1="130" y2="190" />
      <line x1="137" x2="27" y1="145" y2="145" />
      <line x1="132" x2="27" y1="93" y2="93" />
    </svg>

    <div class="equipment-ragdoll__slots">
      <div class="row">
        <equipment-slot
          slot-id="head"
          :wear="wear"
          :images="resolvedImages"
          @open-context-menu="showContextMenu"
        />
      </div>

      <div class="row">
        <equipment-slot
          slot-id="back"
          :wear="wear"
          :images="resolvedImages"
          @open-context-menu="showContextMenu"
        />
        <equipment-slot
          slot-id="necklace"
          :wear="wear"
          :images="resolvedImages"
          @open-context-menu="showContextMenu"
        />
        <div class="slot arrows" />
      </div>

      <div class="row">
        <equipment-slot
          slot-id="right_hand"
          :wear="wear"
          :images="resolvedImages"
          @open-context-menu="showContextMenu"
        />
        <equipment-slot
          slot-id="armor"
          :wear="wear"
          :images="resolvedImages"
          @open-context-menu="showContextMenu"
        />
        <equipment-slot
          slot-id="left_hand"
          :wear="wear"
          :images="resolvedImages"
          @open-context-menu="showContextMenu"
        />
      </div>

      <div class="row">
        <equipment-slot
          slot-id="gloves"
          :wear="wear"
          :images="resolvedImages"
          @open-context-menu="showContextMenu"
        />
        <equipment-slot
          slot-id="feet"
          :wear="wear"
          :images="resolvedImages"
          @open-context-menu="showContextMenu"
        />
        <equipment-slot
          slot-id="ring"
          :wear="wear"
          :images="resolvedImages"
          @open-context-menu="showContextMenu"
        />
      </div>
    </div>
  </div>
</template>

<script>
import UI from '@shared/ui.js';
import bus from '../../core/utilities/bus.js';
import ClientUI from '../../core/utilities/client-ui.js';
import EquipmentSlot from '../sub/EquipmentSlot.vue';

export default {
  name: 'EquipmentRagdoll',
  components: {
    EquipmentSlot,
  },
  props: {
    game: {
      type: Object,
      required: true,
    },
    images: {
      type: Object,
      default: () => ({}),
    },
  },
  computed: {
    wear() {
      return (this.game && this.game.player && this.game.player.wear) ? this.game.player.wear : {};
    },
    resolvedImages() {
      if (this.images && Object.keys(this.images).length) {
        return this.images;
      }
      return (this.game && this.game.map && this.game.map.images) ? this.game.map.images : {};
    },
  },
  created() {
    bus.$on('game:context-menu:first-only', ClientUI.displayFirstAction);
  },
  beforeUnmount() {
    bus.$off('game:context-menu:first-only', ClientUI.displayFirstAction);
  },
  methods: {
    showContextMenu(event, slot, firstOnly = false) {
      const coordinates = UI.getViewportCoordinates(event);

      const data = {
        event,
        coordinates,
        slot,
        target: event.target,
      };

      if (!firstOnly) {
        event.preventDefault();
        bus.$emit('PLAYER:MENU', data);
      }

      if (firstOnly && event && event.target) {
        bus.$emit('PLAYER:MENU', {
          coordinates,
          event,
          slot,
          target: event.target,
          firstOnly: true,
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
@use 'sass:color';

.equipment-ragdoll {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto;
  justify-items: center;
  padding: var(--space-sm) var(--space-md);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid color.adjust(#1e1e1e, $lightness: 10%);
  border-radius: var(--radius-sm);
  font-family: 'GameFont', serif;

  &__skeleton {
    position: absolute;
    top: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 160px;
    height: auto;
    aspect-ratio: 160 / 200;
    stroke: rgba(255, 255, 255, 0.15);
  }

  &__slots {
    position: relative;
    display: grid;
    grid-auto-rows: minmax(40px, auto);
    gap: var(--space-sm);
    padding-top: var(--space-xs);
    z-index: 1;
  }
}

.row {
  display: grid;
  grid-auto-flow: column;
  justify-content: center;
  gap: var(--space-sm);
}

.slot {
  width: 48px;
  height: 48px;
  background-color: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.8);
}

.slot.arrows {
  background: rgba(0, 0, 0, 0.25);
  border-style: dashed;
}
</style>
