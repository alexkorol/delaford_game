<template>
  <div class="equipment-ragdoll">
    <svg class="equipment-ragdoll__skeleton">
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
          :images="images"
          @open-context-menu="showContextMenu"
        />
      </div>

      <div class="row">
        <equipment-slot
          slot-id="back"
          :wear="wear"
          :images="images"
          @open-context-menu="showContextMenu"
        />
        <equipment-slot
          slot-id="necklace"
          :wear="wear"
          :images="images"
          @open-context-menu="showContextMenu"
        />
        <div class="slot arrows" />
      </div>

      <div class="row">
        <equipment-slot
          slot-id="right_hand"
          :wear="wear"
          :images="images"
          @open-context-menu="showContextMenu"
        />
        <equipment-slot
          slot-id="armor"
          :wear="wear"
          :images="images"
          @open-context-menu="showContextMenu"
        />
        <equipment-slot
          slot-id="left_hand"
          :wear="wear"
          :images="images"
          @open-context-menu="showContextMenu"
        />
      </div>

      <div class="row">
        <equipment-slot
          slot-id="gloves"
          :wear="wear"
          :images="images"
          @open-context-menu="showContextMenu"
        />
        <equipment-slot
          slot-id="feet"
          :wear="wear"
          :images="images"
          @open-context-menu="showContextMenu"
        />
        <equipment-slot
          slot-id="ring"
          :wear="wear"
          :images="images"
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
  },
  computed: {
    wear() {
      return this.game.player.wear;
    },
    images() {
      return this.game.map.images;
    },
  },
  created() {
    bus.$on('game:context-menu:first-only', ClientUI.displayFirstAction);
  },
  beforeDestroy() {
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
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid color.adjust(#1e1e1e, $lightness: 10%);
  border-radius: 6px;
  font-family: 'GameFont', serif;

  &__skeleton {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    width: 160px;
    height: 200px;
    stroke: rgba(255, 255, 255, 0.15);
  }

  &__slots {
    position: relative;
    display: grid;
    grid-auto-rows: minmax(40px, auto);
    gap: 8px;
    padding-top: 6px;
    z-index: 1;
  }
}

.row {
  display: grid;
  grid-auto-flow: column;
  justify-content: center;
  gap: 10px;
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
