<template>
  <div class="flower-tree">
    <svg
      class="flower-tree__svg"
      :viewBox="`0 0 ${viewBox} ${viewBox}`"
      role="presentation"
    >
      <g class="flower-tree__connections">
        <line
          v-for="connection in connections"
          :key="connection.id"
          :x1="connection.from.x"
          :y1="connection.from.y"
          :x2="connection.to.x"
          :y2="connection.to.y"
          :class="connectionClass(connection)"
        />
      </g>

      <g class="flower-tree__nodes">
        <g
          v-for="node in nodes"
          :key="node.id"
          :class="nodeClass(node)"
          :transform="`translate(${node.x}, ${node.y})`"
        >
          <circle
            class="flower-tree__node-hitbox"
            :r="node.displayRadius + 14"
            @click="() => onNodeClick(node)"
            @mouseenter="() => onNodeHover(node)"
            @mouseleave="onNodeLeave"
          />
          <circle
            class="flower-tree__node-bg"
            :r="node.displayRadius"
          />
          <circle
            class="flower-tree__node-core"
            :r="node.displayRadius - 4"
          />
          <text
            class="flower-tree__node-label"
            dominant-baseline="middle"
            text-anchor="middle"
            :y="node.displayRadius + 18"
          >
            {{ node.shortLabel }}
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<script>
export default {
  name: 'FlowerOfLifeTree',
  props: {
    nodes: {
      type: Array,
      default: () => [],
    },
    connections: {
      type: Array,
      default: () => [],
    },
    viewBox: {
      type: Number,
      default: 640,
    },
    selectedId: {
      type: String,
      default: null,
    },
  },
  methods: {
    onNodeClick(node) {
      this.$emit('select', node.id);
    },
    onNodeHover(node) {
      this.$emit('hover', node.id);
    },
    onNodeLeave() {
      this.$emit('hover', null);
    },
    nodeClass(node) {
      return {
        'flower-tree__node': true,
        'flower-tree__node--allocated': node.allocated,
        'flower-tree__node--available': node.available,
        'flower-tree__node--locked': node.locked,
        'flower-tree__node--selected': node.id === this.selectedId,
        'flower-tree__node--keystone': node.type === 'keystone',
        'flower-tree__node--major': node.type === 'major',
        'flower-tree__node--notable': node.type === 'notable',
      };
    },
    connectionClass(connection) {
      return {
        'flower-tree__connection': true,
        'flower-tree__connection--active': connection.active,
        'flower-tree__connection--reachable': connection.reachable,
      };
    },
  },
};
</script>

<style lang="scss" scoped>
.flower-tree {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.6) 70%);
  border-radius: 50%;
  position: relative;
  overflow: hidden;
}

.flower-tree__svg {
  width: 100%;
  height: 100%;
}

.flower-tree__connections line {
  stroke: rgba(255, 255, 255, 0.25);
  stroke-width: 3;
  transition: stroke 0.2s ease, stroke-width 0.2s ease;
}

.flower-tree__connection--active {
  stroke: #ffe082;
  stroke-width: 4;
}

.flower-tree__connection--reachable:not(.flower-tree__connection--active) {
  stroke: rgba(255, 224, 130, 0.6);
}

.flower-tree__nodes {
  cursor: pointer;
}

.flower-tree__node {
  transition: transform 0.2s ease, filter 0.2s ease;
}

.flower-tree__node-hitbox {
  fill: transparent;
}

.flower-tree__node-bg {
  fill: rgba(15, 15, 30, 0.9);
  stroke: rgba(255, 255, 255, 0.25);
  stroke-width: 2;
  transition: stroke 0.2s ease, fill 0.2s ease;
}

.flower-tree__node-core {
  fill: rgba(255, 255, 255, 0.05);
  transition: fill 0.2s ease;
}

.flower-tree__node-label {
  fill: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  pointer-events: none;
}

.flower-tree__node--allocated .flower-tree__node-bg {
  stroke: #ffa726;
  fill: rgba(255, 171, 64, 0.4);
}

.flower-tree__node--allocated .flower-tree__node-core {
  fill: rgba(255, 213, 79, 0.35);
}

.flower-tree__node--available:not(.flower-tree__node--allocated) .flower-tree__node-bg {
  stroke: #8bc34a;
  fill: rgba(139, 195, 74, 0.25);
}

.flower-tree__node--available:not(.flower-tree__node--allocated) .flower-tree__node-core {
  fill: rgba(139, 195, 74, 0.3);
}

.flower-tree__node--locked .flower-tree__node-bg {
  stroke: rgba(255, 255, 255, 0.15);
  fill: rgba(0, 0, 0, 0.35);
}

.flower-tree__node--selected {
  filter: drop-shadow(0 0 8px rgba(255, 215, 64, 0.6));
}

.flower-tree__node--keystone .flower-tree__node-bg {
  stroke-width: 3;
}

.flower-tree__node--major .flower-tree__node-bg {
  stroke-dasharray: 8 4;
}

.flower-tree__node:hover .flower-tree__node-bg,
.flower-tree__node--available .flower-tree__node-bg {
  stroke-width: 3;
}
</style>
