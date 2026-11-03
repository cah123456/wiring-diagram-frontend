<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  LoaderCircle,
  Pencil,
  Save,
} from 'lucide-vue-next'
import BrandMark from '../BrandMark.vue'
import { updateDiagramMeta } from '../../api/diagrams'
import { getApiError } from '../../api/http'
import { useEditorStore } from '../../stores/editor'

const emit = defineEmits<{
  back: []
  save: []
  export: [format: 'svg' | 'png']
  standards: []
}>()

const store = useEditorStore()

const editingName = ref(false)
const nameDraft = ref('')
const nameInput = ref<HTMLInputElement>()
const renaming = ref(false)

const savedLabel = computed(() => {
  if (store.dirty) return '有未保存的修改'
  if (!store.savedAt) return '尚未保存'
  const date = new Date(store.savedAt)
  if (Number.isNaN(date.getTime())) return '已保存'
  return `已保存 ${date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`
})

const saveDisabled = computed(
  () => !store.diagramId || store.saving || !store.dirty,
)

const beginRename = async () => {
  if (renaming.value) return
  nameDraft.value = store.diagramName
  editingName.value = true
  await nextTick()
  nameInput.value?.focus()
  nameInput.value?.select()
}

const cancelRename = () => {
  editingName.value = false
  nameDraft.value = store.diagramName
}

const commitRename = async () => {
  if (!editingName.value) return
  const name = nameDraft.value.trim()
  if (!store.diagramId || !name || name === store.diagramName) {
    cancelRename()
    return
  }

  renaming.value = true
  try {
    const detail = await updateDiagramMeta(store.diagramId, {
      name,
      voltageLevel: store.voltageLevel || undefined,
    })
    store.diagramName = detail.name
    editingName.value = false
    ElMessage.success('图纸名称已更新')
  } catch (error) {
    ElMessage.error(getApiError(error))
    nameInput.value?.focus()
  } finally {
    renaming.value = false
  }
}

const handleExport = (command: string | number | object) => {
  if (command === 'svg' || command === 'png') emit('export', command)
}
</script>

<template>
  <header class="editor-topbar">
    <div class="topbar-left">
      <button type="button" class="back-button" title="返回图纸库" @click="emit('back')">
        <ArrowLeft :size="15" />
        <span>图纸库</span>
      </button>
      <span class="topbar-divider" />
      <BrandMark compact class="brand-mini" />

      <div class="document-title">
        <div class="title-row">
          <form class="name-form" @submit.prevent="commitRename">
            <input
              v-if="editingName"
              ref="nameInput"
              v-model="nameDraft"
              class="name-input"
              maxlength="120"
              :disabled="renaming"
              @blur="commitRename"
              @keydown.esc.prevent="cancelRename"
            />
            <button
              v-else
              type="button"
              class="name-display"
              title="点击修改图纸名称"
              @click="beginRename"
            >
              {{ store.diagramName || '未命名接线图' }}
            </button>
          </form>
          <button
            v-if="!editingName"
            type="button"
            class="rename-button"
            title="修改图纸名称"
            @click="beginRename"
          >
            <Pencil :size="11" />
          </button>
          <span v-if="store.voltageLevel" class="voltage-chip mono">{{ store.voltageLevel }}</span>
        </div>
        <div class="document-meta">
          <span class="save-state" :class="{ dirty: store.dirty }">
            <span class="state-dot" />
            {{ savedLabel }}
          </span>
        </div>
      </div>
    </div>

    <div class="topbar-right">
      <button
        type="button"
        class="toolbar-button icon-only"
        title="符号与制图规范"
        @click="emit('standards')"
      >
        <BookOpen :size="14" />
        <span>规范</span>
      </button>

      <el-dropdown trigger="click" placement="bottom-end" @command="handleExport">
        <button type="button" class="toolbar-button">
          <Download :size="14" />
          <span>导出</span>
          <ChevronDown :size="11" class="chevron" />
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="svg">
              导出 SVG 矢量图
              <span class="menu-hint mono">.svg</span>
            </el-dropdown-item>
            <el-dropdown-item command="png">
              导出 PNG 位图
              <span class="menu-hint mono">.png</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <button
        type="button"
        class="save-button"
        :class="{ saved: !store.dirty && !store.saving }"
        :disabled="saveDisabled"
        title="保存图纸 (Ctrl+S)"
        @click="emit('save')"
      >
        <LoaderCircle v-if="store.saving" :size="14" class="spinning" />
        <Check v-else-if="!store.dirty && !store.saving" :size="14" />
        <Save v-else :size="14" />
        <span>{{ store.saving ? '保存中' : !store.dirty && store.diagramId ? '已保存' : '保存图纸' }}</span>
        <span class="save-shortcut mono">Ctrl+S</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.editor-topbar {
  display: flex;
  height: 54px;
  flex: 0 0 54px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 14px 0 10px;
  background: #fff;
  border-bottom: 1px solid var(--line);
  box-shadow: 0 1px 0 rgba(23, 40, 47, 0.02);
}

.topbar-left,
.topbar-right {
  display: flex;
  min-width: 0;
  align-items: center;
}

.topbar-left {
  gap: 10px;
}

.topbar-right {
  flex: 0 0 auto;
  gap: 6px;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  color: #708387;
  font-size: 11px;
  white-space: nowrap;
  background: transparent;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
}

.back-button:hover {
  color: var(--ink);
  background: #f2f6f5;
}

.topbar-divider {
  width: 1px;
  height: 22px;
  background: #e7edec;
}

.brand-mini {
  flex: 0 0 auto;
}

.brand-mini :deep(.brand-symbol) {
  width: 29px;
  height: 29px;
}

.document-title {
  min-width: 0;
  padding-left: 1px;
}

.title-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
}

.name-form {
  min-width: 0;
  margin: 0;
}

.name-display,
.name-input {
  display: block;
  max-width: min(390px, 34vw);
  overflow: hidden;
  color: var(--ink);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name-display {
  padding: 0;
  background: transparent;
  border: 0;
  cursor: text;
}

.name-display:hover {
  color: var(--accent-strong);
}

.name-input {
  width: min(390px, 34vw);
  padding: 0 3px;
  background: #f5f9f8;
  border: 1px solid #9ac8c2;
  border-radius: 3px;
  outline: none;
}

.rename-button {
  display: grid;
  width: 19px;
  height: 19px;
  flex: 0 0 19px;
  place-items: center;
  color: #afbcbd;
  background: transparent;
  border: 0;
  border-radius: 3px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s;
}

.title-row:hover .rename-button {
  opacity: 1;
}

.rename-button:hover {
  color: var(--accent);
  background: var(--accent-soft);
}

.voltage-chip {
  flex: 0 0 auto;
  padding: 2px 5px;
  color: var(--accent);
  font-size: 8.5px;
  line-height: 1.3;
  background: var(--accent-soft);
  border-radius: 3px;
}

.document-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 1px;
  color: #9aa9aa;
  font-size: 9px;
}

.save-state {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.state-dot {
  width: 4px;
  height: 4px;
  background: #91b9a8;
  border-radius: 50%;
}

.save-state.dirty {
  color: #a67a27;
}

.save-state.dirty .state-dot {
  background: var(--warm);
}

.toolbar-button {
  display: flex;
  height: 30px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  color: #61767a;
  font-size: 11px;
  white-space: nowrap;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  cursor: pointer;
}

.toolbar-button:hover {
  color: var(--ink);
  background: #f5f8f7;
  border-color: #e8eeed;
}

.chevron {
  margin-left: -1px;
  color: #a2b0b1;
}

.save-button {
  display: flex;
  height: 32px;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
  padding: 0 11px;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  background: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 5px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(11, 117, 108, 0.18);
  transition:
    background 0.15s,
    box-shadow 0.15s;
}

.save-button:hover:not(:disabled) {
  background: var(--accent-strong);
  box-shadow: 0 3px 8px rgba(11, 117, 108, 0.24);
}

.save-button:disabled {
  cursor: default;
}

.save-button.saved,
.save-button.saved:disabled {
  color: #748788;
  background: #f4f7f6;
  border-color: #e4ebe9;
  box-shadow: none;
}

.save-shortcut {
  margin-left: 2px;
  padding-left: 7px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 8.5px;
  border-left: 1px solid rgba(255, 255, 255, 0.22);
}

.save-button.saved .save-shortcut {
  color: #acb9b9;
  border-color: #dce6e4;
}

.spinning {
  animation: spin 0.9s linear infinite;
}

.menu-hint {
  margin-left: 18px;
  color: #a7b3b4;
  font-size: 9px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 920px) {
  .back-button span,
  .toolbar-button span,
  .save-shortcut,
  .voltage-chip {
    display: none;
  }

  .name-display,
  .name-input {
    max-width: 200px;
  }
}
</style>
