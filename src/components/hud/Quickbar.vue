<template>
  <nav class="quickbar" aria-label="Quick actions">
    <button
      v-for="(slot, index) in slots"
      :key="slot.id || index"
      :class="['quickbar__slot', { 'quickbar__slot--active': index === activeIndex }]"
      type="button"
      :title="slot.label"
      @click="$emit('slot-activate', slot, index)"
    >
      <span class="quickbar__icon">
        <span v-if="slot.icon" aria-hidden="true">{{ slot.icon }}</span>
      </span>
      <span class="quickbar__key">{{ slot.hotkey }}</span>
    </button>
  </nav>
</template>

<script>
export default {
  name: 'Quickbar',
  props: {
    slots: {
      type: Array,
      default: () => [],
    },
    activeIndex: {
      type: Number,
      default: -1,
    },
  },
};
</script>

<style lang="scss" scoped>
.quickbar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(48px, 1fr));
  gap: clamp(6px, 1vw, 10px);
  width: clamp(320px, 50vw, 520px);
  padding: clamp(6px, 1vw, 10px);
  border-radius: 16px;
  background: rgba(20, 20, 24, 0.85);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
}

.quickbar__slot {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(4px, 1vw, 6px);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(68, 68, 68, 0.8), rgba(38, 38, 38, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f4f4f4;
  font-family: "GameFont", sans-serif;
  cursor: pointer;
  transition: transform 120ms ease-out, box-shadow 120ms ease-out, border-color 120ms ease-out;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 12px 16px rgba(0, 0, 0, 0.45);
  }

  &:focus-visible {
    outline: 3px solid rgba(255, 255, 255, 0.85);
    outline-offset: 3px;
  }
}

.quickbar__slot--active {
  box-shadow: 0 0 0 2px rgba(255, 214, 102, 0.6), 0 14px 20px rgba(0, 0, 0, 0.45);
  border-color: rgba(255, 214, 102, 0.8);
}

.quickbar__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: clamp(26px, 3vw, 32px);
  height: clamp(26px, 3vw, 32px);
  margin-bottom: 0.25em;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.35);
  font-size: clamp(12px, 2vw, 16px);
}

.quickbar__key {
  font-size: clamp(12px, 1.5vw, 14px);
  letter-spacing: 0.05em;
}
</style>
