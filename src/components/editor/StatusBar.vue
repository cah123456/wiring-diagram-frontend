<script setup lang="ts">
import { computed } from 'vue'
import { Maximize2, Minus, Magnet, Plus } from 'lucide-vue-next'
import { getSymbol } from '../../data/symbols'
import { WIRE_KINDS } from '../../data/wireStyles'
import { useEditorStore } from '../../stores/editor'

const emit = defineEmits<{
  zoomIn: []
  zoomOut: []
  fit: []
  zoomReset: []
}>()

const store = useEditorStore()

const selectionText = computed(() => {
  if (store.selectedNodeIds.length === 1 && store.selectedEdgeIds.length === 0) {
    const node = store.selectedNodes[0]
    if (!node) return '就绪'
    const def = getSymbol(node.type)
    return `已选 ${node.label || node.name || def.name} · ${def.name}`
  }
  if (store.selectedEdgeIds.length === 1 && store.selectedNodeIds.length === 0) {
    const edge = store.selectedEdges[0]
    if (!edge) return '就绪'
    return `已选导线 · ${WIRE_KINDS[edge.kind]?.name ?? '主回路'}`
  }
  if (store.selectionCount > 1) {
    return `已选 ${store.selectionCount} 项`
  }
  return '就绪'
})

const formatCoordinate = (value: number) => {
  const rounded = Math.round(value)
  const sign = rounded < 0 ? '−' : ''
  return `${sign}${String(Math.abs(rounded)).padStart(4, '0')}`
}

const zoomPercent = computed(() => `${Math.round(store.zoom * 100)}%`)
</script>

<template>
  <footer class="status-bar no-select">
    <div class="status-group">
      <span class="coord mono">
        X&nbsp;{{ formatCoordinate(store.pointer.x) }}
        <span class="coord-sep">/</span>
        Y&nbsp;{{ formatCoordinate(store.pointer.y) }}
      </span>
      <span class="status-divider" />
      <span class="selection-status">{{ selectionText }}</span>
      <span v-if="store.lastAction" class="last-action">· {{ store.lastAction }}</span>
    </div>

    <div class="status-group">
      <span class="meta-chip" :class="{ active: store.doc.settings.snapToGrid }">
        <Magnet :size="11" />
        吸附{{ store.doc.settings.snapToGrid ? '开' : '关' }}
      </span>
      <span class="meta-chip">栅格 {{ store.doc.settings.gridSize }}</span>
      <span class="meta-chip">{{ store.doc.paper.size }} · {{ store.doc.paper.width }}×{{ store.doc.paper.height }}</span>

      <span class="status-divider" />

      <div class="zoom-control">
        <button type="button" title="缩小" @click="emit('zoomOut')">
          <Minus :size="12" />
        </button>
        <button type="button" class="zoom-value mono" title="重置为 100%" @click="emit('zoomReset')">
          {{ zoomPercent }}
        </button>
        <button type="button" title="放大" @click="emit('zoomIn')">
          <Plus :size="12" />
        </button>
        <button type="button" title="适应画布 (Shift+1)" @click="emit('fit')">
          <Maximize2 :size="12" />
        </button>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  height: 28px;
  flex: 0 0 28px;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  color: #728488;
  font-size: 11px;
  background: #fbfcfc;
  border-top: 1px solid var(--line);
}

.status-group {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.coord {
  color: #52676d;
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  white-space: pre;
}

.coord-sep {
  padding: 0 4px;
  color: #c0cccc;
}

.selection-status {
  overflow: hidden;
  color: #697c81;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.last-action {
  color: #9aabac;
  white-space: nowrap;
}

.status-divider {
  width: 1px;
  height: 12px;
  background: #e1e8e7;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.meta-chip.active {
  color: var(--accent);
}

.zoom-control {
  display: flex;
  align-items: center;
  gap: 1px;
}

.zoom-control button {
  display: grid;
  width: 22px;
  height: 20px;
  place-items: center;
  color: #6b7e82;
  background: transparent;
  border: 0;
  border-radius: 3px;
  cursor: pointer;
}

.zoom-control button:hover {
  color: var(--ink);
  background: #eef3f2;
}

.zoom-control .zoom-value {
  width: 42px;
  color: #52666b;
  font-size: 10.5px;
}
</style>
