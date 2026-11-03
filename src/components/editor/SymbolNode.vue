<script setup lang="ts">
import { computed } from 'vue'
import { Lock } from 'lucide-vue-next'
import { getSymbol } from '../../data/symbols'
import type { DiagramNode } from '../../types/diagram'
import { getNodeLabelLines } from '../../utils/labels'

const props = defineProps<{
  node: DiagramNode
  selected: boolean
  showDeviceLabels: boolean
}>()

const emit = defineEmits<{
  pointerdown: [event: PointerEvent, node: DiagramNode]
  enter: [nodeId: string]
  leave: [nodeId: string]
}>()

const def = computed(() => getSymbol(props.node.type))
const labels = computed(() =>
  props.node.type === 'text' || props.showDeviceLabels ? getNodeLabelLines(props.node) : [],
)
const glyphTransform = computed(() => {
  const node = props.node
  return `rotate(${node.rotation}) translate(${-node.width / 2} ${-node.height / 2}) scale(${
    node.width / def.value.width
  } ${node.height / def.value.height})`
})
const glyph = computed(() =>
  props.node.props.includeBreaker === 'false' && def.value.glyphNoBreaker
    ? def.value.glyphNoBreaker
    : def.value.glyph,
)

const outlineTransform = computed(() => `rotate(${props.node.rotation})`)
const nodeStyle = computed(() => {
  const style: Record<string, string> = {}
  const ink = props.node.color || def.value.defaultColor
  if (ink) style['--sym-ink'] = ink
  const accent = props.node.props.accentColor
  if (accent) style['--sym-accent'] = accent
  return Object.keys(style).length > 0 ? style : undefined
})
</script>

<template>
  <g
    class="symbol-node"
    :class="{
      selected,
      locked: node.locked,
      'is-text': node.type === 'text',
      'is-junction': node.type === 'junction',
    }"
    :transform="`translate(${node.x} ${node.y})`"
    :style="nodeStyle"
    role="button"
    :aria-label="`${def.name} ${node.label}`"
    @pointerdown="emit('pointerdown', $event, node)"
    @pointerenter="emit('enter', node.id)"
    @pointerleave="emit('leave', node.id)"
  >
    <rect
      class="node-hit-box"
      :x="-node.width / 2 - 3"
      :y="-node.height / 2 - 3"
      :width="node.width + 6"
      :height="node.height + 6"
      :transform="outlineTransform"
      rx="2"
    />
    <rect
      v-if="node.type !== 'text'"
      class="hover-outline"
      :x="-node.width / 2 - 5"
      :y="-node.height / 2 - 5"
      :width="node.width + 10"
      :height="node.height + 10"
      :transform="outlineTransform"
      rx="1"
    />
    <rect
      v-if="selected"
      class="selected-outline"
      :x="-node.width / 2 - 5"
      :y="-node.height / 2 - 5"
      :width="node.width + 10"
      :height="node.height + 10"
      :transform="outlineTransform"
      rx="1"
    />
    <rect
      v-if="node.type === 'text'"
      class="text-hit-box"
      :x="-node.width / 2"
      :y="-node.height / 2"
      :width="node.width"
      :height="node.height"
      rx="3"
    />

    <g class="symbol-graphic" :transform="glyphTransform">
      <g v-html="glyph" />
    </g>

    <g class="node-labels" :class="{ selected }">
      <text
        v-for="(line, index) in labels"
        :key="index"
        :x="line.x - node.x"
        :y="line.y - node.y"
        :font-size="line.size"
        :font-weight="line.weight"
        :text-anchor="line.anchor"
        :fill="node.color || (selected ? '#0b756c' : line.color)"
        :class="{ mono: line.mono }"
        dominant-baseline="central"
      >
        {{ line.text }}
      </text>
    </g>

    <g v-if="node.locked" class="lock-indicator" :transform="`translate(${node.width / 2 + 7} ${node.height / 2 + 6})`">
      <circle r="8" />
      <Lock :size="9" :stroke-width="2" x="-4.5" y="-4.5" />
    </g>
  </g>
</template>

<style scoped>
.symbol-node {
  --sym-ink: #26363e;
  cursor: move;
  outline: none;
}

.symbol-node.is-junction {
  cursor: move;
}

.symbol-node.is-text {
  cursor: move;
}

.symbol-node.selected {
  --sym-ink: #0b756c;
}

.hover-outline {
  fill: none;
  stroke: #89b8b2;
  stroke-width: 1;
  stroke-dasharray: 3 4;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s;
}

.symbol-node:hover .hover-outline {
  opacity: 1;
}

.selected-outline {
  fill: rgba(11, 117, 108, 0.035);
  stroke: #0b756c;
  stroke-width: 1.2;
  stroke-dasharray: 5 3;
  pointer-events: none;
}

.node-hit-box {
  fill: transparent;
  stroke: none;
  pointer-events: all;
}

.text-hit-box {
  fill: transparent;
  stroke: transparent;
  stroke-width: 1;
  pointer-events: none;
  transition: stroke 0.15s;
}

.symbol-node:hover .text-hit-box {
  stroke: #a8c8c4;
  stroke-dasharray: 3 4;
}

.symbol-node.selected .text-hit-box {
  stroke: #0b756c;
  stroke-dasharray: 4 3;
}

.symbol-graphic {
  pointer-events: none;
}

.node-labels {
  pointer-events: none;
}

.node-labels text {
  font-family: var(--font-sans);
  paint-order: stroke;
  stroke: rgba(255, 255, 255, 0.85);
  stroke-width: 2.5px;
  stroke-linejoin: round;
}

.node-labels text.mono {
  font-family: var(--font-mono);
  letter-spacing: 0.01em;
}

.lock-indicator {
  pointer-events: none;
}

.lock-indicator circle {
  fill: #fff;
  stroke: #d2dcda;
  stroke-width: 0.8;
}

.lock-indicator :deep(svg) {
  color: #849694;
}
</style>
