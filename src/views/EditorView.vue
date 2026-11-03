<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-vue-next'
import BrandMark from '../components/BrandMark.vue'
import CanvasStage from '../components/editor/CanvasStage.vue'
import CanvasToolbar from '../components/editor/CanvasToolbar.vue'
import EditorTopBar from '../components/editor/EditorTopBar.vue'
import InspectorPanel from '../components/editor/InspectorPanel.vue'
import StatusBar from '../components/editor/StatusBar.vue'
import SymbolPalette from '../components/editor/SymbolPalette.vue'
import VersionDrawer from '../components/editor/VersionDrawer.vue'
import StandardsDrawer from '../components/StandardsDrawer.vue'
import { getDiagram } from '../api/diagrams'
import { getApiError } from '../api/http'
import { useEditorStore } from '../stores/editor'
import type { DiagramDetail } from '../types/diagram'
import { exportPng, exportSvg, renderThumbnail } from '../utils/exporter'

interface StageApi {
  fitView: () => void
  zoomIn: () => void
  zoomOut: () => void
  zoomReset: () => void
}

const route = useRoute()
const router = useRouter()
const store = useEditorStore()

const stageRef = useTemplateRef<StageApi>('stageRef')

const loading = ref(true)
const loadError = ref('')
const versionsOpen = ref(false)
const standardsOpen = ref(false)

let loadRequest = 0
let saveInFlight = false

const diagramId = () => Number(route.params.id)

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], .el-input, .el-select, .el-textarea',
    ),
  )
}

const hasBlockingOverlay = (): boolean =>
  Array.from(document.querySelectorAll<HTMLElement>('.el-overlay')).some(
    (overlay) => getComputedStyle(overlay).display !== 'none',
  )

const fitStage = async () => {
  await nextTick()
  requestAnimationFrame(() => {
    requestAnimationFrame(() => stageRef.value?.fitView())
  })
}

const loadDiagram = async () => {
  const id = diagramId()
  const request = ++loadRequest

  if (!Number.isFinite(id) || id <= 0) {
    loading.value = false
    loadError.value = '图纸编号无效，无法打开该图纸。'
    return
  }

  loading.value = true
  loadError.value = ''
  let succeeded = false
  try {
    const detail = await getDiagram(id)
    if (request !== loadRequest) return
    store.loadDocument(detail)
    succeeded = true
  } catch (error) {
    if (request !== loadRequest) return
    loadError.value = getApiError(error)
  } finally {
    if (request === loadRequest) loading.value = false
  }

  if (succeeded) await fitStage()
}

const isConflictError = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 409

const saveCurrent = async () => {
  if (!store.diagramId || store.saving || saveInFlight) return
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  await nextTick()
  if (!store.dirty) return

  saveInFlight = true
  let thumbnail: string | undefined
  try {
    thumbnail = await renderThumbnail(store.doc)
  } catch (error) {
    console.warn('生成图纸缩略图失败，将仅保存图纸数据。', error)
  }

  const note = store.lastAction
    ? `编辑保存 · ${store.lastAction}`
    : `编辑保存 · ${store.doc.nodes.length} 台设备 / ${store.doc.edges.length} 条导线`

  try {
    const detail = await store.save(thumbnail, note)
    ElMessage.success(`图纸已保存 · R${detail.revision}`)
  } catch (error) {
    if (isConflictError(error)) {
      try {
        await ElMessageBox.confirm(
          '服务端已存在更新版本，当前本地修改无法直接保存。可以加载服务端最新版本，或留在当前页面复制需要保留的内容。',
          '保存冲突',
          {
            confirmButtonText: '加载最新版本',
            cancelButtonText: '留在当前页',
            type: 'warning',
          },
        )
        await loadDiagram()
      } catch {
        // Keep the local unsaved document when the user cancels.
      }
    } else {
      ElMessage.error(getApiError(error))
    }
  } finally {
    saveInFlight = false
  }
}

const handleExport = async (format: 'svg' | 'png') => {
  const name = store.diagramName || store.doc.meta.title || '接线图'
  try {
    if (format === 'svg') {
      exportSvg(store.doc, name)
      ElMessage.success('SVG 矢量图已导出')
      return
    }

    const notice = ElMessage({
      message: '正在生成 PNG，请稍候…',
      type: 'info',
      duration: 0,
    })
    try {
      await exportPng(store.doc, name)
    } finally {
      notice.close()
    }
    ElMessage.success('PNG 位图已导出')
  } catch (error) {
    ElMessage.error(getApiError(error))
  }
}

const handleRestored = async (detail: DiagramDetail) => {
  store.loadDocument(detail)
  await fitStage()
}

const goBack = () => {
  void router.push('/')
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.isComposing || hasBlockingOverlay()) return
  const key = event.key.toLowerCase()
  const mod = event.ctrlKey || event.metaKey

  if (mod && key === 's') {
    event.preventDefault()
    void saveCurrent()
    return
  }

  if (isTypingTarget(event.target)) return

  if (mod && key === 'z') {
    event.preventDefault()
    if (event.shiftKey) store.redo()
    else store.undo()
    return
  }
  if (mod && key === 'y') {
    event.preventDefault()
    store.redo()
    return
  }
  if (mod && key === 'a') {
    event.preventDefault()
    store.selectNodes(store.doc.nodes.map((node) => node.id))
    return
  }
  if (mod && key === 'c') {
    event.preventDefault()
    store.copySelected()
    return
  }
  if (mod && key === 'v') {
    event.preventDefault()
    store.pasteClipboard()
    return
  }
  if (mod && key === 'd') {
    event.preventDefault()
    store.duplicateSelected()
    return
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (store.selectionCount === 0) return
    event.preventDefault()
    store.deleteSelected()
    return
  }

  if (event.code === 'Digit1' && event.shiftKey) {
    event.preventDefault()
    stageRef.value?.fitView()
    return
  }

  if (event.key === 'Escape') {
    store.clearSelection()
    store.setMode('select')
    return
  }

  if (mod || event.altKey) return

  if (key === 'v') {
    store.setMode('select')
  } else if (key === 'w') {
    store.setMode('wire')
  } else if (key === 'h') {
    store.setMode('pan')
  } else if (key === 'r') {
    store.rotateSelected(90)
  }
}

const onBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!store.dirty) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(async () => {
  if (!store.dirty) return true
  if (store.saving) {
    ElMessage.warning('正在保存图纸，请稍候再离开。')
    return false
  }
  try {
    await ElMessageBox.confirm(
      '当前图纸有尚未保存的修改，离开后这些修改将丢失。',
      '放弃未保存的修改？',
      {
        confirmButtonText: '放弃并离开',
        cancelButtonText: '留在此页',
        type: 'warning',
      },
    )
    return true
  } catch {
    return false
  }
})

watch(
  () => route.params.id,
  (next, previous) => {
    if (next !== previous) void loadDiagram()
  },
)

watch(
  () => store.diagramName,
  (name) => {
    document.title = name ? `${name} · GRIDLINE` : 'GRIDLINE · 开关柜接线图设计器'
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('beforeunload', onBeforeUnload)
  void loadDiagram()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  document.title = 'GRIDLINE · 开关柜接线图设计器'
})
</script>

<template>
  <div class="editor-view">
    <div v-if="loading" class="editor-screen">
      <BrandMark />
      <LoaderCircle :size="22" class="spinning screen-spinner" />
      <p>正在载入接线图…</p>
    </div>

    <div v-else-if="loadError" class="editor-screen error-screen">
      <BrandMark />
      <div class="error-card">
        <span class="error-icon">
          <AlertTriangle :size="22" />
        </span>
        <span class="error-eyebrow">DIAGRAM UNAVAILABLE</span>
        <h1>无法打开图纸</h1>
        <p>{{ loadError }}</p>
        <div class="error-actions">
          <button type="button" class="primary-button" @click="loadDiagram">
            <RefreshCw :size="13" />重新加载
          </button>
          <button type="button" class="plain-button" @click="goBack">返回图纸库</button>
        </div>
      </div>
    </div>

    <template v-else>
      <EditorTopBar
        @back="goBack"
        @save="saveCurrent"
        @export="handleExport"
        @versions="versionsOpen = true"
        @standards="standardsOpen = true"
      />

      <div class="editor-body">
        <SymbolPalette />

        <main class="workspace">
          <div class="canvas-wrap">
            <CanvasStage ref="stageRef" />
            <CanvasToolbar />
          </div>
          <StatusBar
            @zoom-in="stageRef?.zoomIn()"
            @zoom-out="stageRef?.zoomOut()"
            @zoom-reset="stageRef?.zoomReset()"
            @fit="stageRef?.fitView()"
          />
        </main>

        <InspectorPanel />
      </div>

      <VersionDrawer v-model="versionsOpen" @restored="handleRestored" />
      <StandardsDrawer v-model="standardsOpen" />
    </template>
  </div>
</template>

<style scoped>
.editor-view {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
}

.editor-body {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
}

.workspace {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.canvas-wrap {
  position: relative;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.editor-screen {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 13px;
  background:
    radial-gradient(circle at 30% 20%, rgba(11, 117, 108, 0.06), transparent 40%),
    radial-gradient(circle at 70% 80%, rgba(216, 149, 45, 0.05), transparent 42%),
    var(--surface);
}

.editor-screen > p {
  margin: 0;
  color: #93a3a5;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
}

.screen-spinner {
  margin-top: 20px;
  color: var(--accent);
}

.error-screen {
  gap: 30px;
}

.error-card {
  position: relative;
  width: min(430px, calc(100vw - 48px));
  padding: 30px 32px 27px;
  text-align: center;
  background: #fff;
  border: 1px solid #e3ebe9;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(23, 48, 52, 0.09);
}

.error-icon {
  display: grid;
  width: 46px;
  height: 46px;
  margin: 0 auto 14px;
  place-items: center;
  color: #a16a36;
  background: var(--warm-soft);
  border-radius: 50%;
}

.error-eyebrow {
  color: #a8b3b4;
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.14em;
}

.error-card h1 {
  margin: 5px 0 8px;
  color: var(--ink);
  font-size: 20px;
  font-weight: 650;
}

.error-card p {
  margin: 0;
  color: #7d8f92;
  font-size: 12px;
  line-height: 1.7;
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 22px;
}

.primary-button,
.plain-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 11px;
  border-radius: 5px;
  cursor: pointer;
}

.primary-button {
  color: #fff;
  background: var(--accent);
  border: 1px solid var(--accent);
}

.primary-button:hover {
  background: var(--accent-strong);
}

.plain-button {
  color: #677b7f;
  background: transparent;
  border: 1px solid #dde6e4;
}

.plain-button:hover {
  color: var(--ink);
  background: #f6f9f8;
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
