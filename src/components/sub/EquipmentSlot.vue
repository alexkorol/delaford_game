<template>
  <div
    v-tippy
    :title="tooltip"
    :class="rootClasses"
    @click.left="handleSelect"
    @contextmenu.prevent="emitContext($event, false)"
    @mouseover="emitContext($event, true)"
  >
    <div
      v-if="isFilled"
      :class="['wearSlot', backgroundClass]"
      :style="backgroundStyle"
    />
  </div>
</template>

<script>
import bus from '../../core/utilities/bus.js';

export default {
  name: 'EquipmentSlot',
  props: {
    slotId: {
      type: String,
      required: true,
    },
    wear: {
      type: Object,
      required: true,
    },
    images: {
      type: Object,
      required: true,
    },
  },
  computed: {
    isFilled() {
      return this.wear && this.wear[this.slotId];
    },
    item() {
      return this.isFilled ? this.wear[this.slotId] : null;
    },
    tooltip() {
      if (this.item && Object.hasOwnProperty.call(this.item, 'name')) {
        return this.item.name;
      }

      return '';
    },
    rootClasses() {
      return [
        'slot',
        this.slotId,
        { wearSlot: this.isFilled },
      ];
    },
    backgroundClass() {
      if (!this.item) {
        return '';
      }

      switch (this.slotId) {
      case 'necklace':
      case 'ring':
        return 'jewelryEquipped';
      case 'armor':
      case 'feet':
      case 'left_hand':
      case 'back':
      case 'gloves':
      case 'head':
        return 'armorEquipped';
      default:
        return 'swordEquipped';
      }
    },
    backgroundStyle() {
      if (!this.item) {
        return {};
      }

      const { column = 0, row = 0, tileset = 'weapons' } = this.item.graphics || {};
      return {
        backgroundImage: `url(${this.getTilesetSrc(tileset)})`,
        backgroundPosition: `left -${column * 32}px top -${row * 32}px`,
      };
    },
  },
  methods: {
    handleSelect(event) {
      bus.$emit('canvas:select-action', {
        event,
        item: this.$store.getters.action.object,
      });
    },
    emitContext(event, firstOnly) {
      if (!this.item) {
        return;
      }

      this.$emit('open-context-menu', event, this.slotId, firstOnly);
    },
    getTilesetSrc(tileset) {
      if (!this.images) {
        return '';
      }

      switch (tileset) {
      case 'general':
        return this.images.generalImage ? this.images.generalImage.src : '';
      case 'jewelry':
        return this.images.jewelryImage ? this.images.jewelryImage.src : '';
      case 'armor':
        return this.images.armorImage ? this.images.armorImage.src : '';
      default:
        return this.images.weaponsImage ? this.images.weaponsImage.src : '';
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.slot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  box-sizing: border-box;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.65);

  &.wearSlot {
    background: rgba(0, 0, 0, 0.4);
  }

  .wearSlot {
    width: 40px;
    height: 40px;
    background-repeat: no-repeat;
  }
}

.slot.head {
  background-image: url(../../assets/graphics/ui/client/slots/wear/head.png);
}

.slot.back {
  background-image: url(../../assets/graphics/ui/client/slots/wear/back.png);
}

.slot.necklace {
  background-image: url(../../assets/graphics/ui/client/slots/wear/necklace.png);
}

.slot.arrows {
  background-image: url(../../assets/graphics/ui/client/slots/wear/arrows.png);
  border-style: dashed;
}

.slot.right_hand {
  background-image: url(../../assets/graphics/ui/client/slots/wear/right_hand.png);
}

.slot.left_hand {
  background-image: url(../../assets/graphics/ui/client/slots/wear/left_hand.png);
}

.slot.armor {
  background-image: url(../../assets/graphics/ui/client/slots/wear/torso.png);
}

.slot.gloves {
  background-image: url(../../assets/graphics/ui/client/slots/wear/gloves.png);
}

.slot.feet {
  background-image: url(../../assets/graphics/ui/client/slots/wear/feet.png);
}

.slot.ring {
  background-image: url(../../assets/graphics/ui/client/slots/wear/ring.png);
}

.wearSlot.jewelryEquipped {
  background-image: url(../../assets/graphics/items/jewelry.png);
}

.wearSlot.swordEquipped {
  background-image: url(../../assets/graphics/items/weapons.png);
}

.wearSlot.armorEquipped {
  background-image: url(../../assets/graphics/items/armor.png);
}
</style>
