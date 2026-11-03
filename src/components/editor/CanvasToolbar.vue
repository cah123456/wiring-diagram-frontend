<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Cable,
  Check,
  ChevronDown,
  Grid3X3,
  Hand,
  Magnet,
  Maximize2,
  MousePointer2,
  Redo2,
  RotateCw,
  Tags,
  Trash2,
  Undo2,
} from 'lucide-vue-next'
import { WIRE_KINDS } from '../../data/wireStyles'
import { useEditorStore } from '../../stores/editor'
import type { EditorMode } from '../../stores/editor'
import type { WireKind } from '../../types/diagram'

const store = useEditorStore()

const setMode = (mode: EditorMode) => store.setMode(mode)

const wireKinds = Object.values(WIRE_KINDS)
const currentWireKind = computed(() => WIRE_KINDS[store.wireKind])
const wireMenuOpen = ref(false)
const wireTool = ref<HTMLElement | null>(null)

const toggleWireMenu = () => {
  wireMenuOpen.value = !wireMenuOpen.value
}

const pickWireKind = (kind: WireKind) => {
  store.setWireKind(kind)
  wireMenuOpen.value = false
}

const handlePointerDown = (event: PointerEvent) => {
  if (!wireMenuOpen.value) return
  if (event.target instanceof Node && wireTool.value?.contains(event.target)) return
  wireMenuOpen.value = false
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') wireMenuOpen.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown)
  document.removeEventListener('keydown', handleKeydown)
})

const fit = () => {
  store.fitView(store.viewportSize.width, store.viewportSize.height, 72)
}

const toolButton = (mode: EditorMode) => ({
  class: { active: store.mode === mode },
  title:
    mode === 'select'
      ? '选择 / 移动 (V)'
      : mode === 'wire'
        ? '连接导线 (W)'
        : '平移画布 (H)',
  onClick: () => setMode(mode),
})
</script>

<template>
  <div class="canvas-toolbar no-select" role="toolbar" aria-label="画布工具">
    <button type="button" class="tool-button" v-bind="toolButton('select')">
      <MousePointer2 :size="16" />
    </button>

    <div ref="wireTool" class="wire-tool">
      <button
        type="button"
        class="tool-button"
        :class="{ active: store.mode === 'wire' }"
        :title="`连接导线 (W) — 当前线型：${currentWireKind.name}`"
        @click="setMode('wire')"
      >
        <Cable :size="17" />
      </button>
      <button
        type="button"
        class="wire-kind-button"
        :class="{ active: store.mode === 'wire' }"
        :title="`连接线型：${currentWireKind.name} — ${currentWireKind.description}`"
        :aria-expanded="wireMenuOpen"
        aria-haspopup="menu"
        @click="toggleWireMenu"
      >
        <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true">
          <line
            x1="1"
            y1="5"
            x2="15"
            y2="5"
            :stroke="currentWireKind.color"
            :stroke-width="currentWireKind.width"
            :stroke-dasharray="currentWireKind.dash || undefined"
            stroke-linecap="round"
          />
        </svg>
        <span>{{ currentWireKind.name }}</span>
        <ChevronDown :size="10" />
      </button>

      <div v-if="wireMenuOpen" class="wire-menu" role="menu" aria-label="连接线型">
        <p class="wire-menu-title">连接导线类型</p>
        <button
          v-for="wire in wireKinds"
          :key="wire.kind"
          type="button"
          class="wire-option"
          :class="{ active: store.wireKind === wire.kind }"
          role="menuitemradio"
          :aria-checked="store.wireKind === wire.kind"
          @click="pickWireKind(wire.kind)"
        >
          <svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true">
            <line
              x1="1"
              y1="6"
              x2="25"
              y2="6"
              :stroke="wire.color"
              :stroke-width="wire.width"
              :stroke-dasharray="wire.dash || undefined"
              stroke-linecap="round"
            />
          </svg>
          <span class="wire-option-text">
            <span class="wire-option-name">{{ wire.name }}</span>
            <span class="wire-option-desc">{{ wire.description }}</span>
          </span>
          <Check v-if="store.wireKind === wire.kind" :size="12" class="wire-option-check" />
        </button>
        <p class="wire-menu-foot">选择线型后，从设备端口或母线开始连线</p>
      </div>
    </div>

    <button type="button" class="tool-button" v-bind="toolButton('pan')">
      <Hand :size="16" />
    </button>

    <span class="divider" />

    <button
      type="button"
      class="tool-button"
      title="撤销 (Ctrl+Z)"
      :disabled="!store.canUndo"
      @click="store.undo()"
    >
      <Undo2 :size="16" />
    </button>
    <button
      type="button"
      class="tool-button"
      title="重做 (Ctrl+Shift+Z)"
      :disabled="!store.canRedo"
      @click="store.redo()"
    >
      <Redo2 :size="16" />
    </button>

    <span class="divider" />

    <button
      type="button"
      class="tool-button"
      title="顺时针旋转 90°"
      :disabled="store.selectedNodeIds.length === 0"
      @click="store.rotateSelected(90)"
    >
      <RotateCw :size="15" />
    </button>
    <button
      type="button"
      class="tool-button danger"
      title="删除选中元素 (Delete)"
      :disabled="store.selectionCount === 0"
      @click="store.deleteSelected()"
    >
      <Trash2 :size="15" />
    </button>

    <span class="divider" />

    <button
      type="button"
      class="tool-button"
      :class="{ active: store.doc.settings.showGrid }"
      title="显示 / 隐藏栅格"
      @click="store.updateSettings({ showGrid: !store.doc.settings.showGrid })"
    >
      <Grid3X3 :size="15" />
    </button>
    <button
      type="button"
      class="tool-button"
      :class="{ active: store.doc.settings.snapToGrid }"
      title="对齐到栅格"
      @click="store.updateSettings({ snapToGrid: !store.doc.settings.snapToGrid })"
    >
      <Magnet :size="15" />
    </button>
    <button
      type="button"
      class="tool-button"
      :class="{ active: store.doc.settings.showLabels }"
      title="显示 / 隐藏设备代号与名称（文字标注不受影响）"
      @click="store.updateSettings({ showLabels: !store.doc.settings.showLabels })"
    >
      <Tags :size="15" />
    </button>
    <button type="button" class="tool-button" title="适应画布" @click="fit">
      <Maximize2 :size="15" />
    </button>
  </div>
</template>

<style scoped>
.canvas-toolbar {
  position: absolute;
  z-index: 5;
  top: 14px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 5px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #d7e1df;
  border-radius: 8px;
  box-shadow:
    0 8px 28px rgba(17, 48, 54, 0.1),
    0 1px 2px rgba(17, 48, 54, 0.05);
  transform: translateX(-50%);
  backdrop-filter: blur(12px);
}

.tool-button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: #5f7176;
  background: transparent;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}

.tool-button:hover:not(:disabled) {
  color: var(--ink);
  background: #f0f5f4;
}

.tool-button.active {
  color: var(--accent);
  background: var(--accent-soft);
}

.tool-button.danger:hover:not(:disabled) {
  color: var(--danger);
  background: var(--danger-soft);
}

.tool-button:disabled {
  color: #c5cece;
  cursor: not-allowed;
}

.divider {
  width: 1px;
  height: 18px;
  margin: 0 3px;
  background: #e4ebea;
}

.wire-tool {
  position: relative;
  display: flex;
  align-items: center;
}

.wire-kind-button {
  display: flex;
  height: 30px;
  align-items: center;
  gap: 4px;
  padding: 0 5px 0 4px;
  color: #6b7e82;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  background: transparent;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}

.wire-kind-button:hover {
  color: var(--ink);
  background: #f0f5f4;
}

.wire-kind-button.active {
  color: var(--accent);
  background: var(--accent-soft);
}

.wire-kind-button svg {
  flex: 0 0 auto;
  overflow: visible;
}

.wire-menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 10px);
  left: 50%;
  width: 252px;
  padding: 8px;
  background: #fff;
  border: 1px solid #d7e1df;
  border-radius: 8px;
  box-shadow:
    0 14px 36px rgba(17, 48, 54, 0.16),
    0 2px 4px rgba(17, 48, 54, 0.06);
  transform: translateX(-50%);
}

.wire-menu-title {
  margin: 2px 4px 6px;
  color: #849497;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
}

.wire-option {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  padding: 7px 8px;
  color: #3b4d53;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.wire-option:hover {
  background: #f3f7f6;
}

.wire-option.active {
  background: var(--accent-soft);
}

.wire-option svg {
  flex: 0 0 auto;
  overflow: visible;
}

.wire-option-text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.wire-option-name {
  font-size: 11.5px;
  font-weight: 600;
}

.wire-option-desc {
  color: #93a3a5;
  font-size: 9.5px;
  line-height: 1.35;
}

.wire-option-check {
  flex: 0 0 auto;
  color: var(--accent);
}

.wire-menu-foot {
  margin: 5px 4px 0;
  padding-top: 6px;
  color: #a0aeaf;
  font-size: 9px;
  line-height: 1.4;
  border-top: 1px solid #eef2f1;
}
</style>
