<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { FileClock, History, LoaderCircle, RotateCcw, X } from 'lucide-vue-next'
import { getVersion, listVersions, restoreVersion } from '../../api/diagrams'
import { getApiError } from '../../api/http'
import { useEditorStore } from '../../stores/editor'
import type { DiagramDetail, VersionSummary } from '../../types/diagram'

const visible = defineModel<boolean>({ default: false })

const emit = defineEmits<{
  restored: [detail: DiagramDetail]
}>()

const store = useEditorStore()

const versions = ref<VersionSummary[]>([])
const loading = ref(false)
const loadError = ref('')
const restoringId = ref<number | null>(null)

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

const currentVersion = computed(() =>
  versions.value.find((version) => version.revision === store.revision),
)

const load = async () => {
  if (!store.diagramId) {
    versions.value = []
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    versions.value = await listVersions(store.diagramId)
  } catch (error) {
    loadError.value = getApiError(error)
  } finally {
    loading.value = false
  }
}

watch(
  () => [visible.value, store.revision, store.diagramId] as const,
  ([open]) => {
    if (open) void load()
  },
  { immediate: true },
)

const close = () => {
  visible.value = false
}

const restore = async (version: VersionSummary) => {
  if (!store.diagramId || version.revision === store.revision) return
  try {
    await ElMessageBox.confirm(
      `将把图纸恢复到 R${version.revision}。当前未保存的修改会被覆盖，恢复后会生成新的版本记录。`,
      '恢复历史版本',
      {
        confirmButtonText: '确认恢复',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--primary',
      },
    )
  } catch {
    return
  }

  restoringId.value = version.id
  try {
    const detail = await restoreVersion(store.diagramId, version.id, store.revision)
    emit('restored', detail)
    ElMessage.success(`已恢复到 R${version.revision}，当前版本为 R${detail.revision}`)
    close()
  } catch (error) {
    ElMessage.error(getApiError(error))
  } finally {
    restoringId.value = null
  }
}

const previewVersion = async (version: VersionSummary) => {
  if (!store.diagramId) return
  try {
    const detail = await getVersion(store.diagramId, version.id)
    ElMessage.info(
      `R${detail.revision} · ${detail.document.nodes.length} 个设备 / ${detail.document.edges.length} 条导线`,
    )
  } catch (error) {
    ElMessage.error(getApiError(error))
  }
}
</script>

<template>
  <el-drawer
    v-model="visible"
    direction="rtl"
    size="400px"
    :with-header="false"
    :body-style="{ padding: '0', overflow: 'hidden' }"
    class="version-drawer"
    append-to-body
  >
    <div class="drawer-shell">
      <header class="drawer-head">
        <div class="head-icon">
          <History :size="17" />
        </div>
        <div class="head-copy">
          <span class="eyebrow">REVISION HISTORY</span>
          <h2>版本历史</h2>
          <p>{{ store.diagramName }} · 当前 R{{ store.revision }}</p>
        </div>
        <button type="button" class="close-button" title="关闭" @click="close">
          <X :size="16" />
        </button>
      </header>

      <div class="version-summary">
        <div>
          <span class="summary-value mono">{{ versions.length }}</span>
          <span class="summary-label">历史版本</span>
        </div>
        <div>
          <span class="summary-value mono">R{{ store.revision }}</span>
          <span class="summary-label">当前修订</span>
        </div>
        <div>
          <span class="summary-value mono">{{ currentVersion ? '同步' : '—' }}</span>
          <span class="summary-label">数据状态</span>
        </div>
      </div>

      <div class="drawer-body scroll-thin">
        <div v-if="loading" class="drawer-state">
          <LoaderCircle :size="20" class="spinning" />
          <p>正在读取版本记录…</p>
        </div>

        <div v-else-if="loadError" class="drawer-state error-state">
          <FileClock :size="22" />
          <p>{{ loadError }}</p>
          <button type="button" @click="load">重新加载</button>
        </div>

        <div v-else-if="versions.length === 0" class="drawer-state">
          <FileClock :size="22" />
          <p>暂无版本记录</p>
          <span>保存图纸后会自动生成版本快照</span>
        </div>

        <ol v-else class="version-list">
          <li
            v-for="version in versions"
            :key="version.id"
            class="version-item"
            :class="{ current: version.revision === store.revision }"
          >
            <span class="timeline-dot" />
            <article class="version-card">
              <header>
                <div class="version-heading">
                  <strong class="mono">R{{ version.revision }}</strong>
                  <span v-if="version.revision === store.revision" class="current-badge">当前</span>
                </div>
                <time class="mono">{{ formatDate(version.createdAt) }}</time>
              </header>
              <p class="change-note">
                {{ version.changeNote || (version.revision === 1 ? '创建图纸初始版本' : '保存图纸快照') }}
              </p>
              <div class="version-actions">
                <button
                  type="button"
                  class="detail-button"
                  @click="previewVersion(version)"
                >
                  查看概要
                </button>
                <button
                  v-if="version.revision !== store.revision"
                  type="button"
                  class="restore-button"
                  :disabled="restoringId !== null"
                  @click="restore(version)"
                >
                  <LoaderCircle v-if="restoringId === version.id" :size="11" class="spinning" />
                  <RotateCcw v-else :size="11" />
                  {{ restoringId === version.id ? '恢复中' : '恢复此版本' }}
                </button>
                <span v-else class="current-note">正在编辑</span>
              </div>
            </article>
          </li>
        </ol>
      </div>

      <footer class="drawer-foot">
        每次保存自动生成快照，最多保留并显示最近 50 个版本。恢复历史也会生成新版本，不会丢失当前记录。
      </footer>
    </div>
  </el-drawer>
</template>

<style scoped>
.version-drawer :deep(.el-drawer__body) {
  padding: 0;
}

.drawer-shell {
  display: flex;
  height: 100%;
  flex-direction: column;
  background: #fbfcfc;
}

.drawer-head {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  gap: 11px;
  padding: 20px 18px 16px;
  background: #fff;
  border-bottom: 1px solid var(--line);
}

.head-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 8px;
}

.head-copy {
  min-width: 0;
  flex: 1;
}

.eyebrow {
  display: block;
  color: #a3b0b1;
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
}

.head-copy h2 {
  margin: 1px 0 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 650;
}

.head-copy p {
  margin: 2px 0 0;
  overflow: hidden;
  color: #93a3a5;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-button {
  display: grid;
  width: 27px;
  height: 27px;
  flex: 0 0 27px;
  place-items: center;
  color: #91a1a3;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  cursor: pointer;
}

.close-button:hover {
  color: var(--ink);
  background: #f3f6f5;
  border-color: #e6edeb;
}

.version-summary {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(3, 1fr);
  margin: 14px 18px 4px;
  background: #fff;
  border: 1px solid #e9efed;
  border-radius: 7px;
}

.version-summary div {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 9px 4px 8px;
}

.version-summary div + div {
  border-left: 1px solid #eef2f1;
}

.summary-value {
  color: #3e555a;
  font-size: 13px;
  font-weight: 600;
}

.summary-label {
  margin-top: 1px;
  color: #9dabad;
  font-size: 8.5px;
}

.drawer-body {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 10px 18px 20px;
}

.drawer-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 60px 20px;
  color: #92a2a4;
  text-align: center;
}

.drawer-state p {
  margin: 0;
  font-size: 11.5px;
}

.drawer-state span {
  color: #abb7b8;
  font-size: 9.5px;
}

.drawer-state button {
  margin-top: 6px;
  padding: 5px 12px;
  color: var(--accent);
  font-size: 10px;
  background: var(--accent-soft);
  border: 0;
  border-radius: 4px;
  cursor: pointer;
}

.error-state {
  color: #a46b62;
}

.version-list {
  position: relative;
  margin: 0;
  padding: 0;
  list-style: none;
}

.version-list::before {
  position: absolute;
  top: 12px;
  bottom: 18px;
  left: 5px;
  width: 1px;
  content: '';
  background: #e3eae8;
}

.version-item {
  position: relative;
  padding: 5px 0 9px 22px;
}

.timeline-dot {
  position: absolute;
  top: 14px;
  left: 1px;
  z-index: 1;
  width: 9px;
  height: 9px;
  background: #fff;
  border: 1.5px solid #c1d1ce;
  border-radius: 50%;
}

.version-item.current .timeline-dot {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(11, 117, 108, 0.12);
}

.version-card {
  padding: 10px 11px;
  background: #fff;
  border: 1px solid #e8eeec;
  border-radius: 6px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.version-card:hover {
  border-color: #cfdfdc;
  box-shadow: 0 3px 12px rgba(23, 48, 52, 0.05);
}

.version-item.current .version-card {
  background: #fbfefd;
  border-color: #bdd9d4;
}

.version-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.version-heading {
  display: flex;
  align-items: center;
  gap: 6px;
}

.version-heading strong {
  color: #354b51;
  font-size: 12px;
  font-weight: 650;
}

.current-badge {
  padding: 1px 5px;
  color: var(--accent);
  font-size: 8px;
  font-weight: 600;
  background: var(--accent-soft);
  border-radius: 3px;
}

.version-card time {
  color: #a2b0b1;
  font-size: 8px;
}

.change-note {
  margin: 5px 0 8px;
  color: #74878b;
  font-size: 10px;
  line-height: 1.5;
}

.version-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-button {
  padding: 3px 0;
  color: #91a2a3;
  font-size: 9px;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.detail-button:hover {
  color: var(--ink);
  text-decoration: underline;
}

.restore-button {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 4px 7px;
  color: var(--accent);
  font-size: 9px;
  background: #f0f8f6;
  border: 1px solid #d9ebe7;
  border-radius: 3px;
  cursor: pointer;
}

.restore-button:hover:not(:disabled) {
  color: #fff;
  background: var(--accent);
  border-color: var(--accent);
}

.restore-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.current-note {
  margin-left: auto;
  color: #a3b1b2;
  font-size: 8.5px;
}

.drawer-foot {
  flex: 0 0 auto;
  padding: 11px 18px 14px;
  color: #9daaac;
  font-size: 8.5px;
  line-height: 1.55;
  background: #fff;
  border-top: 1px solid var(--line);
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
