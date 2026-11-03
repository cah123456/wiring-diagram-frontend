<script setup lang="ts">
import { computed } from 'vue'
import type { DiagramEdge, DiagramNode } from '../../types/diagram'
import { getEdgeStyle } from '../../data/wireStyles'
import { getEdgeRoute } from '../../utils/edges'

const props = defineProps<{
  edge: DiagramEdge
  nodeLookup: Map<string, DiagramNode>
  selected: boolean
}>()

const emit = defineEmits<{
  pointerdown: [event: PointerEvent, edge: DiagramEdge]
}>()

const route = computed(() => getEdgeRoute(props.edge, props.nodeLookup))
const style = computed(() => getEdgeStyle(props.edge))
</script>

<template>
  <g
    v-if="route"
    class="wire-edge"
    :class="{ selected }"
    @pointerdown.stop="emit('pointerdown', $event, edge)"
  >
    <path
      v-if="selected"
      :d="route.path"
      fill="none"
      stroke="#0b756c"
      stroke-width="8"
      stroke-opacity="0.14"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      class="wire-hit"
      :d="route.path"
      fill="none"
      stroke="transparent"
      stroke-width="14"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      :d="route.path"
      fill="none"
      :stroke="style.color"
      :stroke-width="style.width"
      :stroke-dasharray="style.dash || undefined"
      stroke-linecap="round"
      stroke-linejoin="round"
      :marker-end="edge.arrow ? 'url(#wire-arrow)' : undefined"
      class="wire-visible"
    />
    <g v-if="selected" class="endpoint-marks">
      <circle :cx="route.points[0]!.x" :cy="route.points[0]!.y" r="3" />
      <circle
        :cx="route.points[route.points.length - 1]!.x"
        :cy="route.points[route.points.length - 1]!.y"
        r="3"
      />
    </g>
    <text
      v-if="edge.label"
      class="wire-label"
      :x="route.labelPosition.x"
      :y="route.labelPosition.y - 8"
      text-anchor="middle"
    >
      {{ edge.label }}
    </text>
  </g>
</template>

<style scoped>
.wire-edge {
  cursor: pointer;
}

.wire-hit {
  pointer-events: stroke;
}

.wire-visible {
  transition: stroke 0.15s;
}

.endpoint-marks circle {
  fill: #fff;
  stroke: #0b756c;
  stroke-width: 1.4;
}

.wire-label {
  fill: #4f6168;
  font-family: var(--font-mono);
  font-size: 9.5px;
  paint-order: stroke;
  stroke: rgba(255, 255, 255, 0.94);
  stroke-width: 4px;
  stroke-linejoin: round;
  pointer-events: none;
  user-select: none;
}
</style>
