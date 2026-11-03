<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Cable,
  ChevronDown,
  Copy,
  Crosshair,
  Grid3X3,
  Info,
  Lock,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  Ungroup,
  Unlock,
} from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { getSymbol } from '../../data/symbols'
import { WIRE_KINDS } from '../../data/wireStyles'
import { useEditorStore } from '../../stores/editor'
import type { AlignMode } from '../../stores/editor'
import type { DiagramDocument, DiagramNode, Rotation, WireKind } from '../../types/diagram'
import { paperFor } from '../../utils/document'
import ColorField from './ColorField.vue'

const store = useEditorStore()

const openPanels = ref<Record<string, boolean>>({
  meta: true,
  paper: true,
  canvas: true,
  'node-basic': true,
  'node-transform': true,
})

const togglePanel = (key: string) => {
  openPanels.value[key] = !openPanels.value[key]
}

const node = computed<DiagramNode | null>(() =>
  store.selectionKind === 'node' ? (store.selectedNodes[0] ?? null) : null,
)
const edge = computed(() =>
  store.selectionKind === 'edge' ? (store.selectedEdges[0] ?? null) : null,
)
const multi = computed(() => store.selectionCount > 1)

const DEFAULT_SYMBOL_COLOR = '#26363e'
const ACCENT_DEFAULT = '#c53b32'

const nodeDef = computed(() => (node.value ? getSymbol(node.value.type) : null))
const nodeGlyph = computed(() => {
  if (!nodeDef.value) return ''
  return node.value?.props.includeBreaker === 'false' && nodeDef.value.glyphNoBreaker
    ? nodeDef.value.glyphNoBreaker
    : nodeDef.value.glyph
})
const effectiveSymbolColor = computed(
  () => node.value?.color ?? nodeDef.value?.defaultColor ?? DEFAULT_SYMBOL_COLOR,
)
const isComposite = computed(
  () => node.value?.type === 'lvIncoming' || node.value?.type === 'lvOutgoing',
)
const hasBreaker = computed(() => node.value?.props.includeBreaker !== 'false')

const updateNode = (patch: Partial<DiagramNode>, label = '修改设备属性') => {
  if (!node.value) return
  store.updateNode(node.value.id, patch, label)
}

const textEditing = ref(false)

const beginTextEditing = (label: string) => {
  if (textEditing.value) return
  textEditing.value = true
  store.beginChange(label)
}

const endTextEditing = () => {
  if (!textEditing.value) return
  textEditing.value = false
  store.endChange()
}

const editNodeText = (field: 'label' | 'name', value: string) => {
  if (!node.value) return
  beginTextEditing(field === 'label' ? '修改设备代号' : '修改设备名称')
  store.updateNodeSilent(node.value.id, { [field]: value })
}

const DEFAULT_TEXT_SIZE = 16

const textFontSize = computed(() => {
  const parsed = Number(node.value?.props.fontSize)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TEXT_SIZE
})

const textBoxHeight = (content: string, size: number): number => {
  const lines = Math.max(1, content.split('\n').slice(0, 3).length)
  return Math.max(28, Math.round(lines * size * 1.25 + 8))
}

const editNodeAnnotation = (value: string) => {
  if (!node.value) return
  beginTextEditing('修改标注文字')
  store.updateNodeSilent(node.value.id, {
    props: { ...node.value.props, text: value },
    height: textBoxHeight(value, textFontSize.value),
  })
}

const setTextFontSize = (value: number | undefined) => {
  if (!node.value || node.value.type !== 'text' || value == null || !Number.isFinite(value)) return
  const size = Math.min(72, Math.max(10, Math.round(value)))
  const content = node.value.props.text || node.value.label || ''
  updateNode(
    {
      props: { ...node.value.props, fontSize: String(size) },
      height: textBoxHeight(content, size),
    },
    '调整文字大小',
  )
}

const editEdgeLabel = (value: string) => {
  if (!edge.value) return
  beginTextEditing('修改导线标注')
  store.updateEdgeSilent(edge.value.id, { label: value })
}

const editMetaText = (field: keyof DiagramDocument['meta'], value: string) => {
  beginTextEditing('修改图签信息')
  store.updateMetaSilent({ [field]: value })
}

const updateNodeNumber = (
  field: 'x' | 'y' | 'width' | 'height',
  value: number | undefined,
  min?: number,
  max?: number,
) => {
  if (!node.value || value == null || !Number.isFinite(value)) return
  const next = Math.min(max ?? value, Math.max(min ?? value, value))
  if (Math.abs(node.value[field] - next) < 0.01) return
  updateNode(
    { [field]: next } as Partial<DiagramNode>,
    field === 'x' || field === 'y' ? '移动设备' : '调整设备尺寸',
  )
}

const setRotation = (rotation: Rotation) => {
  updateNode({ rotation }, '旋转设备')
}

const toggleLock = () => {
  if (!node.value) return
  updateNode({ locked: !node.value.locked }, node.value.locked ? '解锁设备' : '锁定设备')
}

const setNodeColor = (value: string) => {
  updateNode({ color: value }, '修改设备颜色')
}

const resetNodeColor = () => {
  updateNode({ color: undefined }, '恢复设备默认颜色')
}

const setAccentColor = (value: string) => {
  if (!node.value) return
  updateNode({ props: { ...node.value.props, accentColor: value } }, '修改断路器颜色')
}

const resetAccentColor = () => {
  if (!node.value) return
  const props = { ...node.value.props }
  delete props.accentColor
  updateNode({ props }, '恢复断路器默认颜色')
}

const setIncludeBreaker = (value: boolean) => {
  if (!node.value) return
  const props = { ...node.value.props }
  if (value) delete props.includeBreaker
  else props.includeBreaker = 'false'
  updateNode({ props }, value ? '显示组合回路断路器' : '隐藏组合回路断路器')
}

const splitComposite = () => {
  if (!node.value) return
  if (store.explodeComposite(node.value.id)) {
    ElMessage.success('已拆分为独立元件，可单独调整或删除断路器')
  }
}

const multiColor = computed(() => store.selectedNodes.find((item) => item.color)?.color)
const multiFallbackColor = computed(() => {
  if (store.selectedNodes.length === 0) return DEFAULT_SYMBOL_COLOR
  const defaults = new Set(
    store.selectedNodes.map((item) => getSymbol(item.type).defaultColor ?? DEFAULT_SYMBOL_COLOR),
  )
  return defaults.size === 1 ? [...defaults][0] : DEFAULT_SYMBOL_COLOR
})

const applyMultiColor = (value: string) => {
  if (store.selectedNodeIds.length === 0) return
  store.mutate('批量修改设备颜色', () => {
    store.updateNodesSilent(store.selectedNodeIds, (item) => {
      item.color = value
    })
  })
}

const resetMultiColor = () => {
  if (store.selectedNodeIds.length === 0) return
  store.mutate('恢复设备默认颜色', () => {
    store.updateNodesSilent(store.selectedNodeIds, (item) => {
      item.color = undefined
    })
  })
}

const setPaper = (size: 'A3' | 'A4' | null, orientation: 'landscape' | 'portrait' | null) => {
  store.updatePaper(
    paperFor(size ?? store.doc.paper.size, orientation ?? store.doc.paper.orientation),
  )
}

const updateEdge = (patch: Parameters<typeof store.updateEdge>[1], label = '修改导线属性') => {
  if (!edge.value) return
  store.updateEdge(edge.value.id, patch, label)
}

const edgeBaseColor = computed(() =>
  edge.value ? WIRE_KINDS[edge.value.kind]?.color ?? '#26363e' : '#26363e',
)

const setEdgeColor = (value: string) => {
  updateEdge({ color: value }, '修改导线颜色')
}

const resetEdgeColor = () => {
  updateEdge({ color: undefined }, '恢复导线默认颜色')
}

const alignOptions: Array<{ mode: AlignMode; label: string }> = [
  { mode: 'left', label: '左' },
  { mode: 'hcenter', label: '水平中' },
  { mode: 'right', label: '右' },
  { mode: 'top', label: '上' },
  { mode: 'vcenter', label: '垂直中' },
  { mode: 'bottom', label: '下' },
]

const wireKinds = Object.values(WIRE_KINDS)

const formatSavedAt = computed(() => {
  if (!store.savedAt) return '尚未保存'
  const date = new Date(store.savedAt)
  if (Number.isNaN(date.getTime())) return store.savedAt
  return date.toLocaleString('zh-CN', { hour12: false })
})
</script>

<template>
  <aside class="inspector-panel">
    <div class="inspector-scroll scroll-thin">
      <!-- Single node -->
      <template v-if="node && nodeDef">
        <header class="selection-head">
          <div class="selection-thumb">
            <span v-if="node.type === 'text'" class="text-thumb">Aa</span>
            <svg
              v-else
              :viewBox="`0 0 ${nodeDef.width} ${nodeDef.height}`"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <g v-html="nodeGlyph" />
            </svg>
          </div>
          <div class="selection-title">
            <span class="eyebrow">已选设备</span>
            <h2>{{ nodeDef.name }}</h2>
            <p class="mono">{{ nodeDef.code }} · {{ nodeDef.standard }}</p>
          </div>
        </header>

        <section class="panel-section">
          <button type="button" class="panel-head" @click="togglePanel('node-basic')">
            <span><SlidersHorizontal :size="13" />基本属性</span>
            <ChevronDown :size="13" :class="{ rotated: !openPanels['node-basic'] }" />
          </button>
          <div v-show="openPanels['node-basic']" class="panel-body">
            <label class="field">
              <span class="field-label">设备代号 / 位号</span>
              <el-input
                :model-value="node.label"
                placeholder="如 QF1"
                @update:model-value="editNodeText('label', $event)"
                @blur="endTextEditing"
              />
            </label>
            <label class="field">
              <span class="field-label">设备名称 / 用途</span>
              <el-input
                :model-value="node.name"
                placeholder="如 进线断路器"
                @update:model-value="editNodeText('name', $event)"
                @blur="endTextEditing"
              />
            </label>
            <label v-if="node.type === 'text'" class="field">
              <span class="field-label">标注内容</span>
              <el-input
                :model-value="node.props.text || ''"
                type="textarea"
                :rows="3"
                resize="none"
                maxlength="120"
                show-word-limit
                @update:model-value="editNodeAnnotation"
                @blur="endTextEditing"
              />
            </label>

            <label v-if="node.type === 'text'" class="field">
              <span class="field-label">文字大小（px）</span>
              <el-input-number
                :model-value="textFontSize"
                :min="10"
                :max="72"
                :step="1"
                controls-position="right"
                @change="setTextFontSize($event)"
              />
            </label>

            <ColorField
              :label="node.type === 'text' ? '文字颜色' : '符号颜色'"
              :model-value="node.color"
              :fallback="effectiveSymbolColor"
              :hint="node.type === 'text' ? '默认文字墨色' : '默认符号墨色'"
              @change="setNodeColor"
              @reset="resetNodeColor"
            />

            <div v-if="isComposite" class="switch-row">
              <span>包含断路器</span>
              <el-switch
                :model-value="hasBreaker"
                size="small"
                title="关闭后隐藏组合回路中的 × 断路器，适合无进线开关或直供出线"
                @change="setIncludeBreaker(Boolean($event))"
              />
            </div>
            <p v-if="isComposite && !hasBreaker" class="switch-hint">
              已隐藏断路器，适合无进线开关或直供出线；可随时重新开启。
            </p>

            <ColorField
              v-if="isComposite && hasBreaker"
              label="断路器颜色"
              :model-value="node.props.accentColor"
              :fallback="ACCENT_DEFAULT"
              hint="组合回路中 × 断路器部分"
              @change="setAccentColor"
              @reset="resetAccentColor"
            />

            <button
              v-if="isComposite"
              type="button"
              class="wide-action split-action"
              title="拆成方向箭头、插接、断路器、CT 等独立单元"
              @click="splitComposite"
            >
              <Ungroup :size="12" />
              拆分为独立元件
            </button>

            <div v-if="node.type !== 'text'" class="switch-row">
              <span>显示本设备代号与名称</span>
              <el-switch
                :model-value="node.showLabel"
                size="small"
                :disabled="!store.doc.settings.showLabels"
                :title="
                  store.doc.settings.showLabels
                    ? '控制本设备标注'
                    : '设备标注已全局隐藏，可在顶部工具栏开启'
                "
                @change="updateNode({ showLabel: Boolean($event) }, '切换设备标注')"
              />
            </div>
            <p
              v-if="node.type !== 'text' && !store.doc.settings.showLabels"
              class="switch-hint"
            >
              设备标注已全局隐藏，可在顶部工具栏的标注按钮中开启。
            </p>
            <div class="switch-row">
              <span>{{ node.locked ? '设备已锁定' : '锁定设备位置' }}</span>
              <button
                type="button"
                class="icon-action"
                :class="{ active: node.locked }"
                :title="node.locked ? '解锁' : '锁定'"
                @click="toggleLock"
              >
                <Lock v-if="node.locked" :size="13" />
                <Unlock v-else :size="13" />
              </button>
            </div>
          </div>
        </section>

        <section class="panel-section">
          <button type="button" class="panel-head" @click="togglePanel('node-transform')">
            <span><Crosshair :size="13" />位置与方向</span>
            <ChevronDown :size="13" :class="{ rotated: !openPanels['node-transform'] }" />
          </button>
          <div v-show="openPanels['node-transform']" class="panel-body">
            <div class="field-grid two">
              <label class="field compact">
                <span class="field-label">X 坐标</span>
                <el-input-number
                  :model-value="Math.round(node.x)"
                  :controls="false"
                  @change="updateNodeNumber('x', $event)"
                />
              </label>
              <label class="field compact">
                <span class="field-label">Y 坐标</span>
                <el-input-number
                  :model-value="Math.round(node.y)"
                  :controls="false"
                  @change="updateNodeNumber('y', $event)"
                />
              </label>
            </div>

            <span class="field-label">旋转角度</span>
            <div class="segmented">
              <button
                v-for="angle in [0, 90, 180, 270] as Rotation[]"
                :key="angle"
                type="button"
                :class="{ active: node.rotation === angle }"
                @click="setRotation(angle)"
              >
                {{ angle }}°
              </button>
            </div>
            <button type="button" class="wide-action" @click="store.rotateSelected(90)">
              <RotateCw :size="12" />
              顺时针旋转 90°
            </button>

            <div class="field-grid two size-grid">
              <label class="field compact">
                <span class="field-label">宽度</span>
                <el-input-number
                  :model-value="Math.round(node.width)"
                  :min="8"
                  :max="2400"
                  :controls="false"
                  @change="updateNodeNumber('width', $event, 8, 2400)"
                />
              </label>
              <label class="field compact">
                <span class="field-label">高度</span>
                <el-input-number
                  :model-value="Math.round(node.height)"
                  :min="8"
                  :max="2400"
                  :controls="false"
                  @change="updateNodeNumber('height', $event, 8, 2400)"
                />
              </label>
            </div>
            <button type="button" class="wide-action subtle" @click="store.resetNodeSize(node.id)">
              <RotateCcw :size="12" />
              恢复标准比例
            </button>
          </div>
        </section>

        <section class="panel-section standard-note">
          <Info :size="13" />
          <p>
            图形依据 {{ nodeDef.standard }} 绘制。工程出图前请按项目电压等级、绝缘配合及当地供电规范复核。
          </p>
        </section>

        <div class="action-row">
          <button type="button" class="secondary-action" @click="store.duplicateSelected()">
            <Copy :size="13" />复制
          </button>
          <button type="button" class="danger-action" @click="store.deleteSelected()">
            <Trash2 :size="13" />删除
          </button>
        </div>
      </template>

      <!-- Single edge -->
      <template v-else-if="edge">
        <header class="selection-head edge-head">
          <div class="selection-thumb edge-thumb">
            <Cable :size="20" />
          </div>
          <div class="selection-title">
            <span class="eyebrow">已选导线</span>
            <h2>{{ WIRE_KINDS[edge.kind]?.name || '导线' }}</h2>
            <p class="mono">ORTHOGONAL · {{ edge.kind.toUpperCase() }}</p>
          </div>
        </header>

        <section class="panel-section">
          <div class="panel-body">
            <span class="field-label">导线类型</span>
            <div class="wire-kind-grid">
              <button
                v-for="kind in wireKinds"
                :key="kind.kind"
                type="button"
                class="wire-kind"
                :class="{ active: edge.kind === kind.kind }"
                @click="updateEdge({ kind: kind.kind as WireKind, color: undefined }, '修改导线类型')"
              >
                <span
                  class="kind-line"
                  :style="{
                    background: kind.color,
                    height: `${Math.min(kind.width, 4)}px`,
                    opacity: kind.dash ? 0.75 : 1,
                  }"
                />
                <span>{{ kind.name }}</span>
              </button>
            </div>
            <p class="field-hint">{{ WIRE_KINDS[edge.kind]?.description }}</p>

            <label class="field">
              <span class="field-label">导线标注</span>
              <el-input
                :model-value="edge.label"
                placeholder="如 YJV-8.7/15-3×240"
                @update:model-value="editEdgeLabel"
                @blur="endTextEditing"
              />
            </label>

            <div class="switch-row">
              <span>虚线表示</span>
              <el-switch
                :model-value="Boolean(edge.dashed)"
                size="small"
                @change="updateEdge({ dashed: Boolean($event) })"
              />
            </div>
            <div class="switch-row">
              <span>显示方向箭头</span>
              <el-switch
                :model-value="Boolean(edge.arrow)"
                size="small"
                @change="updateEdge({ arrow: Boolean($event) })"
              />
            </div>

            <ColorField
              label="线条颜色"
              :model-value="edge.color"
              :fallback="edgeBaseColor"
              hint="按回路类型自动配色"
              @change="setEdgeColor"
              @reset="resetEdgeColor"
            />

            <div class="switch-row">
              <span>起点 / 终点</span>
              <span class="endpoint mono">{{ edge.from.portId }} → {{ edge.to.portId }}</span>
            </div>
          </div>
        </section>

        <div class="action-row single">
          <button type="button" class="danger-action" @click="store.deleteSelected()">
            <Trash2 :size="13" />删除导线
          </button>
        </div>
      </template>

      <!-- Multi selection -->
      <template v-else-if="multi">
        <header class="selection-head">
          <div class="selection-thumb multi-thumb">{{ store.selectionCount }}</div>
          <div class="selection-title">
            <span class="eyebrow">多项选择</span>
            <h2>批量调整</h2>
            <p>{{ store.selectedNodeIds.length }} 台设备 / {{ store.selectedEdgeIds.length }} 条导线</p>
          </div>
        </header>

        <section class="panel-section">
          <div class="panel-body">
            <span class="field-label">对齐方式</span>
            <div class="align-grid">
              <button
                v-for="option in alignOptions"
                :key="option.mode"
                type="button"
                :disabled="store.selectedNodeIds.length < 2"
                @click="store.alignSelected(option.mode)"
              >
                {{ option.label }}
              </button>
            </div>
            <span class="field-label">等间距分布</span>
            <div class="field-grid two">
              <button
                type="button"
                class="wide-action"
                :disabled="store.selectedNodeIds.length < 3"
                @click="store.distributeSelected('horizontal')"
              >
                水平分布
              </button>
              <button
                type="button"
                class="wide-action"
                :disabled="store.selectedNodeIds.length < 3"
                @click="store.distributeSelected('vertical')"
              >
                垂直分布
              </button>
            </div>
            <button type="button" class="wide-action subtle" @click="store.rotateSelected(90)">
              <RotateCw :size="12" />全部旋转 90°
            </button>

            <ColorField
              v-if="store.selectedNodeIds.length > 0"
              label="设备颜色"
              :model-value="multiColor"
              :fallback="multiFallbackColor"
              hint="统一设置所选设备颜色"
              @change="applyMultiColor"
              @reset="resetMultiColor"
            />
          </div>
        </section>

        <div class="action-row">
          <button type="button" class="secondary-action" @click="store.copySelected()">
            <Copy :size="13" />复制
          </button>
          <button type="button" class="danger-action" @click="store.deleteSelected()">
            <Trash2 :size="13" />删除
          </button>
        </div>
      </template>

      <!-- Diagram properties -->
      <template v-else>
        <header class="selection-head diagram-head">
          <div class="selection-thumb diagram-thumb">
            <Grid3X3 :size="19" />
          </div>
          <div class="selection-title">
            <span class="eyebrow">图纸设置</span>
            <h2>{{ store.doc.meta.title || '未命名接线图' }}</h2>
            <p class="mono">{{ store.diagramCode || 'UNSAVED' }} · R{{ store.revision }}</p>
          </div>
        </header>

        <section class="overview-strip">
          <div>
            <strong>{{ store.doc.nodes.length }}</strong>
            <span>设备</span>
          </div>
          <div>
            <strong>{{ store.doc.edges.length }}</strong>
            <span>导线</span>
          </div>
          <div>
            <strong>{{ store.doc.settings.gridSize }}</strong>
            <span>栅格</span>
          </div>
        </section>

        <section class="panel-section">
          <button type="button" class="panel-head" @click="togglePanel('meta')">
            <span><Info :size="13" />图签信息</span>
            <ChevronDown :size="13" :class="{ rotated: !openPanels.meta }" />
          </button>
          <div v-show="openPanels.meta" class="panel-body">
            <label class="field">
              <span class="field-label">图纸标题</span>
              <el-input
                :model-value="store.doc.meta.title"
                placeholder="如 10kV 配电室一次接线图"
                @update:model-value="editMetaText('title', $event)"
                @blur="endTextEditing"
              />
            </label>
            <div class="field-grid two">
              <label class="field compact">
                <span class="field-label">图号</span>
                <el-input
                  :model-value="store.doc.meta.drawingNo"
                  placeholder="WD-001"
                  @update:model-value="editMetaText('drawingNo', $event)"
                  @blur="endTextEditing"
                />
              </label>
              <label class="field compact">
                <span class="field-label">电压等级</span>
                <el-input
                  :model-value="store.doc.meta.voltageLevel"
                  placeholder="10kV"
                  @update:model-value="editMetaText('voltageLevel', $event)"
                  @blur="endTextEditing"
                />
              </label>
            </div>
            <label class="field">
              <span class="field-label">工程名称</span>
              <el-input
                :model-value="store.doc.meta.project"
                placeholder="项目 / 配电室名称"
                @update:model-value="editMetaText('project', $event)"
                @blur="endTextEditing"
              />
            </label>
            <div class="field-grid two">
              <label class="field compact">
                <span class="field-label">设计</span>
                <el-input
                  :model-value="store.doc.meta.designer"
                  @update:model-value="editMetaText('designer', $event)"
                  @blur="endTextEditing"
                />
              </label>
              <label class="field compact">
                <span class="field-label">校核</span>
                <el-input
                  :model-value="store.doc.meta.checker"
                  @update:model-value="editMetaText('checker', $event)"
                  @blur="endTextEditing"
                />
              </label>
            </div>
            <div class="field-grid two">
              <label class="field compact">
                <span class="field-label">日期</span>
                <el-input
                  :model-value="store.doc.meta.date"
                  placeholder="YYYY-MM-DD"
                  @update:model-value="editMetaText('date', $event)"
                  @blur="endTextEditing"
                />
              </label>
              <label class="field compact">
                <span class="field-label">比例</span>
                <el-input
                  :model-value="store.doc.meta.scale"
                  placeholder="NTS"
                  @update:model-value="editMetaText('scale', $event)"
                  @blur="endTextEditing"
                />
              </label>
            </div>
            <label class="field">
              <span class="field-label">设计单位</span>
              <el-input
                :model-value="store.doc.meta.company"
                placeholder="公司 / 设计院名称"
                @update:model-value="editMetaText('company', $event)"
                @blur="endTextEditing"
              />
            </label>
            <p class="save-meta">
              最近保存 {{ formatSavedAt }} · 版本 R{{ store.revision }}
            </p>
          </div>
        </section>

        <section class="panel-section">
          <button type="button" class="panel-head" @click="togglePanel('paper')">
            <span><Grid3X3 :size="13" />幅面与图框</span>
            <ChevronDown :size="13" :class="{ rotated: !openPanels.paper }" />
          </button>
          <div v-show="openPanels.paper" class="panel-body">
            <span class="field-label">图纸幅面</span>
            <div class="segmented paper-segmented">
              <button
                v-for="size in (['A3', 'A4'] as const)"
                :key="size"
                type="button"
                :class="{ active: store.doc.paper.size === size }"
                @click="setPaper(size, null)"
              >
                {{ size }}
              </button>
            </div>
            <span class="field-label">方向</span>
            <div class="segmented">
              <button
                type="button"
                :class="{ active: store.doc.paper.orientation === 'landscape' }"
                @click="setPaper(null, 'landscape')"
              >
                横向
              </button>
              <button
                type="button"
                :class="{ active: store.doc.paper.orientation === 'portrait' }"
                @click="setPaper(null, 'portrait')"
              >
                纵向
              </button>
            </div>
            <p class="field-hint">
              {{ store.doc.paper.width }} × {{ store.doc.paper.height }} 画布单位
            </p>
            <div class="switch-row">
              <span>显示标准图框与图签</span>
              <el-switch
                :model-value="store.doc.settings.showTitleBlock"
                size="small"
                @change="store.updateSettings({ showTitleBlock: Boolean($event) })"
              />
            </div>
          </div>
        </section>

        <section class="panel-section">
          <button type="button" class="panel-head" @click="togglePanel('canvas')">
            <span><SlidersHorizontal :size="13" />画布与栅格</span>
            <ChevronDown :size="13" :class="{ rotated: !openPanels.canvas }" />
          </button>
          <div v-show="openPanels.canvas" class="panel-body">
            <label class="field">
              <span class="field-label">栅格尺寸</span>
              <el-select
                :model-value="store.doc.settings.gridSize"
                size="small"
                @change="store.updateSettings({ gridSize: Number($event) })"
              >
                <el-option :value="10" label="10 单位 · 精细" />
                <el-option :value="20" label="20 单位 · 标准" />
                <el-option :value="25" label="25 单位" />
                <el-option :value="40" label="40 单位 · 宽松" />
              </el-select>
            </label>
            <div class="switch-row">
              <span>显示栅格</span>
              <el-switch
                :model-value="store.doc.settings.showGrid"
                size="small"
                @change="store.updateSettings({ showGrid: Boolean($event) })"
              />
            </div>
            <div class="switch-row">
              <span>拖动时吸附栅格</span>
              <el-switch
                :model-value="store.doc.settings.snapToGrid"
                size="small"
                @change="store.updateSettings({ snapToGrid: Boolean($event) })"
              />
            </div>
          </div>
        </section>

        <section class="panel-section standard-note">
          <Info :size="13" />
          <p>
            图形符号参照 GB/T 4728（IEC 60617）绘制，设备代号按常用工程习惯配置。实际工程须结合项目规范复核。
          </p>
        </section>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.inspector-panel {
  display: flex;
  width: 288px;
  flex: 0 0 288px;
  min-height: 0;
  flex-direction: column;
  background: #fbfcfc;
  border-left: 1px solid var(--line);
}

.inspector-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-x: hidden;
  overflow-y: auto;
}

.selection-head {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 16px 16px 13px;
  background: linear-gradient(180deg, #ffffff, #fbfcfc);
  border-bottom: 1px solid #eef2f1;
}

.selection-thumb {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  place-items: center;
  color: var(--ink);
  background: #f4f8f7;
  border: 1px solid #e3ecea;
  border-radius: 7px;
}

.selection-thumb svg {
  width: 31px;
  height: 31px;
  overflow: visible;
}

.text-thumb {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 19px;
  font-weight: 600;
}

.edge-thumb {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: #d2e8e4;
}

.multi-thumb {
  color: #fff;
  font-family: var(--font-mono);
  font-size: 17px;
  font-weight: 600;
  background: var(--ink);
  border-color: var(--ink);
}

.diagram-thumb {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: #d2e8e4;
}

.selection-title {
  min-width: 0;
  padding-top: 1px;
}

.eyebrow {
  display: block;
  margin-bottom: 1px;
  color: #a0aeaf;
  font-family: var(--font-mono);
  font-size: 8.5px;
  font-weight: 500;
  letter-spacing: 0.13em;
}

.selection-title h2 {
  margin: 0;
  overflow: hidden;
  color: var(--ink);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-title p {
  margin: 2px 0 0;
  overflow: hidden;
  color: #93a3a5;
  font-size: 9px;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 12px 15px;
  background: #f5f8f7;
  border: 1px solid #ebf0ef;
  border-radius: 6px;
}

.overview-strip div {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
}

.overview-strip div + div {
  border-left: 1px solid #e7eeec;
}

.overview-strip strong {
  color: #35484e;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
}

.overview-strip span {
  margin-top: 2px;
  color: #9aa9aa;
  font-size: 9px;
}

.panel-section {
  border-bottom: 1px solid #eef2f1;
}

.panel-head {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 11px 16px;
  color: #5c7075;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.panel-head > span {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.panel-head > svg {
  color: #a5b3b4;
  transition: transform 0.18s;
}

.panel-head > svg.rotated {
  transform: rotate(-90deg);
}

.panel-head:hover {
  color: var(--ink);
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 0 16px 14px;
}

.field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  color: #849497;
  font-size: 10px;
  font-weight: 500;
}

.field-hint {
  margin: -1px 0 0;
  color: #a0aeaf;
  font-size: 9.5px;
  line-height: 1.45;
}

.field-grid {
  display: grid;
  gap: 8px;
}

.field-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.size-grid {
  margin-top: 2px;
}

.switch-row {
  display: flex;
  min-height: 22px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #667a7e;
  font-size: 11px;
}

.switch-hint {
  margin: -2px 0 2px;
  color: #97a6a8;
  font-size: 10px;
  line-height: 1.45;
}

.icon-action {
  display: grid;
  width: 24px;
  height: 22px;
  place-items: center;
  color: #8d9d9f;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
}

.icon-action:hover {
  color: var(--ink);
  background: #f1f5f4;
}

.icon-action.active {
  color: var(--warm);
  background: var(--warm-soft);
}

.segmented {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: #f1f5f4;
  border-radius: 5px;
}

.segmented button {
  flex: 1;
  padding: 4px 2px;
  color: #7a8c90;
  font-size: 10px;
  background: transparent;
  border: 0;
  border-radius: 3px;
  cursor: pointer;
}

.segmented button:hover {
  color: var(--ink);
}

.segmented button.active {
  color: var(--accent);
  font-weight: 600;
  background: #fff;
  box-shadow: 0 1px 2px rgba(20, 45, 48, 0.07);
}

.paper-segmented button {
  font-family: var(--font-mono);
}

.wide-action {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 8px;
  color: #61767a;
  font-size: 10.5px;
  background: #f7faf9;
  border: 1px solid #e5ecea;
  border-radius: 4px;
  cursor: pointer;
}

.wide-action:hover:not(:disabled) {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: #d3e6e2;
}

.wide-action.subtle {
  background: transparent;
  border-color: transparent;
}

.split-action {
  justify-content: flex-start;
  padding-left: 9px;
  color: #526b70;
  border-style: dashed;
}

.wide-action:disabled {
  color: #bdc8c8;
  cursor: not-allowed;
}

.standard-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 12px 14px;
  padding: 10px;
  color: #8a9a9c;
  background: #f6f9f8;
  border: 1px solid #edf2f1;
  border-radius: 5px;
}

.standard-note svg {
  flex: 0 0 auto;
  margin-top: 1px;
  color: #a3b3b3;
}

.standard-note p {
  margin: 0;
  font-size: 9.5px;
  line-height: 1.55;
}

.action-row {
  display: flex;
  gap: 7px;
  padding: 12px 16px 20px;
}

.action-row.single {
  display: block;
}

.secondary-action,
.danger-action {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 8px;
  font-size: 10.5px;
  border-radius: 5px;
  cursor: pointer;
}

.action-row.single .danger-action {
  width: 100%;
}

.secondary-action {
  color: #607478;
  background: #fff;
  border: 1px solid #dfe8e6;
}

.secondary-action:hover {
  color: var(--accent);
  border-color: #bcd8d3;
}

.danger-action {
  color: #a25045;
  background: #fff;
  border: 1px solid #ecd6d2;
}

.danger-action:hover {
  color: #8f3d32;
  background: var(--danger-soft);
  border-color: #e3bdb7;
}

.wire-kind-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}

.wire-kind {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 7px;
  color: #6b7e82;
  font-size: 10px;
  text-align: left;
  background: #fff;
  border: 1px solid #e4ebe9;
  border-radius: 4px;
  cursor: pointer;
}

.wire-kind:hover {
  border-color: #bdd7d3;
}

.wire-kind.active {
  color: var(--ink);
  background: #f4f9f8;
  border-color: #9bc8c1;
  box-shadow: 0 0 0 1px rgba(11, 117, 108, 0.06);
}

.kind-line {
  width: 19px;
  flex: 0 0 19px;
  border-radius: 2px;
}

.endpoint {
  padding: 2px 5px;
  color: #78908f;
  font-size: 9px;
  background: #f3f7f6;
  border-radius: 3px;
}

.align-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.align-grid button {
  padding: 6px 2px;
  color: #677b7f;
  font-size: 10px;
  background: #fff;
  border: 1px solid #e3eae9;
  border-radius: 4px;
  cursor: pointer;
}

.align-grid button:hover:not(:disabled) {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: #cbe1dd;
}

.align-grid button:disabled {
  color: #bdc8c8;
  cursor: not-allowed;
}

.save-meta {
  margin: 3px 0 0;
  color: #a4b1b2;
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.inspector-panel :deep(.el-input__wrapper) {
  min-height: 28px;
  padding: 1px 8px;
  border-radius: 5px;
}

.inspector-panel :deep(.el-input__inner) {
  height: 26px;
  font-size: 11.5px;
}

.inspector-panel :deep(.el-textarea__inner) {
  padding: 6px 8px;
  font-size: 11.5px;
  border-radius: 5px;
}

.inspector-panel :deep(.el-input-number) {
  width: 100%;
}

.inspector-panel :deep(.el-input-number .el-input__inner) {
  text-align: left;
}

.inspector-panel :deep(.el-select__wrapper) {
  min-height: 28px;
  font-size: 11.5px;
  border-radius: 5px;
}

.inspector-panel :deep(.el-switch) {
  --el-switch-on-color: var(--accent);
  --el-switch-off-color: #cdd8d6;
}
</style>
