<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowRight, Layers3 } from 'lucide-vue-next'
import type { DiagramDetail } from '../types/diagram'
import { blankDocument } from '../utils/document'
import { createDiagram } from '../api/diagrams'
import { getApiError } from '../api/http'

const props = withDefaults(
  defineProps<{
    initialName?: string
    initialVoltage?: string
  }>(),
  {
    initialVoltage: '10kV',
    initialName: '',
  },
)

const emit = defineEmits<{
  created: [detail: DiagramDetail]
}>()

const visible = defineModel<boolean>({ required: true })
const name = ref('')
const voltageLevel = ref('10kV')
const description = ref('')
const creating = ref(false)

const resetForm = () => {
  voltageLevel.value = props.initialVoltage || '10kV'
  name.value = props.initialName || `${voltageLevel.value} 配电室一次接线图`
  description.value = ''
}

watch(visible, (open) => {
  if (open) resetForm()
})

const submit = async () => {
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    ElMessage.warning('请填写图纸名称')
    return
  }

  creating.value = true
  try {
    const document = blankDocument(trimmedName)
    document.meta.voltageLevel = voltageLevel.value
    const detail = await createDiagram({
      name: trimmedName,
      voltageLevel: voltageLevel.value,
      description: description.value.trim(),
      document,
    })
    ElMessage.success('图纸已创建')
    visible.value = false
    emit('created', detail)
  } catch (error) {
    ElMessage.error(getApiError(error))
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="560px"
    class="new-diagram-dialog"
    :close-on-click-modal="!creating"
    :close-on-press-escape="!creating"
    :show-close="!creating"
    align-center
  >
    <template #header>
      <div class="dialog-head">
        <div class="head-icon">
          <Layers3 :size="19" :stroke-width="1.7" />
        </div>
        <div>
          <h3>新建接线图</h3>
          <p>创建后直接从空白画布开始绘制。</p>
        </div>
      </div>
    </template>

    <div class="dialog-body scroll-thin">
      <div class="form-grid">
        <label class="field span-2">
          <span>图纸名称 <b>*</b></span>
          <el-input
            v-model="name"
            maxlength="120"
            show-word-limit
            placeholder="例如：1#配电室 10kV 一次系统接线图"
          />
        </label>
        <label class="field">
          <span>电压等级</span>
          <el-select v-model="voltageLevel" filterable allow-create default-first-option>
            <el-option label="10kV" value="10kV" />
            <el-option label="35kV" value="35kV" />
            <el-option label="6kV" value="6kV" />
            <el-option label="0.4kV" value="0.4kV" />
          </el-select>
        </label>
        <label class="field">
          <span>说明</span>
          <el-input v-model="description" maxlength="500" placeholder="选填，便于图纸检索" />
        </label>
      </div>

      <section class="blank-hint">
        <div class="blank-sheet">
          <span />
          <span />
          <span />
          <i>1600 × 1131</i>
        </div>
        <div>
          <h4>标准 A3 横向图框</h4>
          <p>
            画布已内置标题栏、对齐网格与设备图例。进入编辑器后，从左侧符号库拖入设备，
            在设备端口之间拖拽导线即可完成接线。
          </p>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <span class="mode-summary">空白画布 · A3 横向</span>
        <div>
          <el-button :disabled="creating" @click="visible = false">取消</el-button>
          <el-button type="primary" :loading="creating" @click="submit">
            创建并进入编辑器
            <ArrowRight v-if="!creating" :size="15" style="margin-left: 6px" />
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-head {
  display: flex;
  gap: 13px;
  align-items: flex-start;
}

.head-icon {
  display: grid;
  width: 39px;
  height: 39px;
  flex: none;
  place-items: center;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 9px;
}

.dialog-head h3 {
  margin: 1px 0 4px;
  color: var(--ink);
  font-size: 18px;
  font-weight: 650;
}

.dialog-head p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.dialog-body {
  max-height: min(64vh, 680px);
  overflow-y: auto;
  padding-right: 4px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 6px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field > span {
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 500;
}

.field > span b {
  color: var(--danger);
}

.span-2 {
  grid-column: span 2;
}

.blank-hint {
  display: flex;
  gap: 22px;
  align-items: center;
  margin-top: 22px;
  padding: 22px;
  background: #fbfcfc;
  border: 1px solid var(--line);
  border-radius: 10px;
}

.blank-sheet {
  position: relative;
  width: 190px;
  height: 120px;
  flex: none;
  background: #fff;
  border: 1px solid #d3dedd;
  box-shadow: 0 8px 20px rgba(20, 42, 49, 0.08);
}

.blank-sheet span {
  position: absolute;
  background: #e4eceb;
}

.blank-sheet span:nth-child(1) {
  top: 0;
  bottom: 0;
  left: 12px;
  width: 1px;
}

.blank-sheet span:nth-child(2) {
  top: 12px;
  right: 0;
  left: 0;
  height: 1px;
}

.blank-sheet span:nth-child(3) {
  right: 8px;
  bottom: 8px;
  width: 54px;
  height: 34px;
  background: #f4f8f7;
  border: 1px solid #dce6e4;
}

.blank-sheet i {
  position: absolute;
  bottom: 4px;
  left: 15px;
  color: #abb7b7;
  font-family: var(--font-mono);
  font-size: 7px;
  font-style: normal;
}

.blank-hint h4 {
  margin: 0 0 5px;
  font-size: 13px;
  font-weight: 600;
}

.blank-hint p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 11.5px;
  line-height: 1.8;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mode-summary {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
}

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: auto;
  }

  .blank-hint {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
