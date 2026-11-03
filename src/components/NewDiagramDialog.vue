<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowRight, Check, Layers3, Plus, Trash2 } from 'lucide-vue-next'
import type { BayConfig, BayKind, DiagramDetail } from '../types/diagram'
import { BAY_OPTIONS, generateDiagram } from '../utils/generator'
import { blankDocument, createId } from '../utils/document'
import { createDiagram } from '../api/diagrams'
import { getApiError } from '../api/http'

const props = withDefaults(
  defineProps<{
    initialMode?: 'blank' | 'config'
    initialBays?: BayConfig[]
    initialName?: string
    initialVoltage?: string
  }>(),
  {
    initialMode: 'config',
    initialVoltage: '10kV',
    initialName: '',
  },
)

const emit = defineEmits<{
  created: [detail: DiagramDetail]
}>()

const visible = defineModel<boolean>({ required: true })
const mode = ref<'blank' | 'config'>('config')
const name = ref('')
const voltageLevel = ref('10kV')
const description = ref('')
const bays = ref<BayConfig[]>([])
const includeEarthSwitch = ref(true)
const includeArrester = ref(false)
const creating = ref(false)

const defaultBays = (): BayConfig[] => [
  { key: createId('bay'), type: 'incoming', count: 1 },
  { key: createId('bay'), type: 'pt', count: 1 },
  { key: createId('bay'), type: 'outgoing', count: 2 },
]

const resetForm = () => {
  mode.value = props.initialMode
  voltageLevel.value = props.initialVoltage || '10kV'
  name.value = props.initialName || `${voltageLevel.value} 配电室一次接线图`
  description.value = ''
  bays.value = props.initialBays?.length
    ? props.initialBays.map((bay) => ({ ...bay, key: createId('bay') }))
    : defaultBays()
  includeEarthSwitch.value = true
  includeArrester.value = false
}

watch(visible, (open) => {
  if (open) resetForm()
})

const totalBays = computed(() => bays.value.reduce((sum, bay) => sum + bay.count, 0))
const canAddBay = computed(() => bays.value.length < 6 && totalBays.value < 5)

const bayLabel = (kind: BayKind) =>
  BAY_OPTIONS.find((option) => option.value === kind)?.label ?? kind

const addBay = () => {
  if (!canAddBay.value) return
  const remaining = Math.max(1, 5 - totalBays.value)
  bays.value.push({ key: createId('bay'), type: 'outgoing', count: Math.min(1, remaining) })
}

const removeBay = (key: string) => {
  if (bays.value.length <= 1) return
  bays.value = bays.value.filter((bay) => bay.key !== key)
}

const normalizeCounts = () => {
  let remaining = 5
  for (const bay of bays.value) {
    bay.count = Math.max(1, Math.min(bay.count, remaining))
    remaining -= bay.count
    if (remaining <= 0) remaining = 0
  }
}

const submit = async () => {
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    ElMessage.warning('请填写图纸名称')
    return
  }
  if (mode.value === 'config') {
    if (totalBays.value < 1) {
      ElMessage.warning('请至少配置一个开关柜间隔')
      return
    }
    if (totalBays.value > 5) {
      ElMessage.warning('自动生成最多支持 5 面柜，更多间隔可在编辑器中手动添加')
      return
    }
  }

  creating.value = true
  try {
    let document
    if (mode.value === 'blank') {
      document = blankDocument(trimmedName)
      document.meta.voltageLevel = voltageLevel.value
    } else {
      normalizeCounts()
      document = generateDiagram({
        title: trimmedName,
        voltageLevel: voltageLevel.value,
        description: description.value.trim(),
        bays: bays.value,
        includeEarthSwitch: includeEarthSwitch.value,
        includeArrester: includeArrester.value,
      })
    }

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

const modeName = computed(() => (mode.value === 'blank' ? '空白画布' : '按柜列生成'))
</script>

<template>
  <el-dialog
    v-model="visible"
    width="760px"
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
          <p>选择空白画布，或按开关柜柜列配置自动生成初始图。</p>
        </div>
      </div>
    </template>

    <div class="dialog-body scroll-thin">
      <div class="mode-switch" role="tablist">
        <button
          type="button"
          :class="{ active: mode === 'config' }"
          @click="mode = 'config'"
        >
          <span class="mode-index">01</span>
          <span>
            <strong>按柜列配置生成</strong>
            <small>自动生成母线、间隔和常用设备</small>
          </span>
          <Check v-if="mode === 'config'" :size="15" />
        </button>
        <button
          type="button"
          :class="{ active: mode === 'blank' }"
          @click="mode = 'blank'"
        >
          <span class="mode-index">02</span>
          <span>
            <strong>从空白画布开始</strong>
            <small>A3 图框与标题栏，自由拖拽绘制</small>
          </span>
          <Check v-if="mode === 'blank'" :size="15" />
        </button>
      </div>

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

      <section v-if="mode === 'config'" class="config-section">
        <div class="section-head">
          <div>
            <h4>柜列配置</h4>
            <p>按 10kV 单母线柜列自动排布，最多 5 面柜。</p>
          </div>
          <span class="bay-counter" :class="{ warning: totalBays > 5 }">
            {{ totalBays }} / 5 面柜
          </span>
        </div>

        <div class="bay-table">
          <div class="bay-table-head">
            <span>柜型</span>
            <span>数量</span>
            <span />
          </div>
          <div v-for="(bay, index) in bays" :key="bay.key" class="bay-row">
            <span class="row-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <el-select v-model="bay.type" class="bay-type">
              <el-option
                v-for="option in BAY_OPTIONS"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              >
                <div class="bay-option">
                  <strong>{{ option.label }}</strong>
                  <small>{{ option.description }}</small>
                </div>
              </el-option>
            </el-select>
            <el-input-number v-model="bay.count" :min="1" :max="5" size="default" />
            <el-button
              text
              class="remove-button"
              :disabled="bays.length <= 1"
              @click="removeBay(bay.key)"
            >
              <Trash2 :size="15" />
            </el-button>
            <span class="bay-hint">{{ bayLabel(bay.type) }} × {{ bay.count }}</span>
          </div>
        </div>

        <button type="button" class="add-bay" :disabled="!canAddBay" @click="addBay">
          <Plus :size="14" />
          添加柜型
          <span v-if="!canAddBay">已达 5 面上限</span>
        </button>

        <div class="options-row">
          <label class="check-option">
            <el-checkbox v-model="includeEarthSwitch">配置检修接地开关</el-checkbox>
          </label>
          <label class="check-option">
            <el-checkbox v-model="includeArrester">配置避雷器</el-checkbox>
          </label>
          <span class="option-note">生成后仍可自由拖拽、增删设备和导线</span>
        </div>
      </section>

      <section v-else class="blank-hint">
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
        <span class="mode-summary">模式 · {{ modeName }}</span>
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

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin: 6px 0 20px;
}

.mode-switch button {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px 14px;
  color: var(--ink-soft);
  background: #fbfcfc;
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.mode-switch button:hover {
  border-color: #a9c8c4;
}

.mode-switch button.active {
  color: var(--ink);
  background: #f0f8f6;
  border-color: #79b8b0;
  box-shadow: 0 0 0 2px rgba(11, 117, 108, 0.07);
}

.mode-switch button > span:nth-child(2) {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.mode-switch strong {
  font-size: 12.5px;
  font-weight: 600;
}

.mode-switch small {
  color: var(--muted);
  font-size: 10.5px;
}

.mode-switch svg {
  color: var(--accent);
}

.mode-index {
  color: #a7b5b6;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
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

.config-section {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-head h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.section-head p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 10.5px;
}

.bay-counter {
  padding: 3px 8px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
}

.bay-counter.warning {
  color: #a46116;
  background: var(--warm-soft);
}

.bay-table {
  overflow: hidden;
  background: #fbfcfc;
  border: 1px solid var(--line);
  border-radius: 8px;
}

.bay-table-head {
  display: grid;
  grid-template-columns: 34px 1fr 136px 32px;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  color: var(--muted);
  background: #f5f8f7;
  border-bottom: 1px solid #e7eeed;
  font-size: 10px;
  letter-spacing: 0.02em;
}

.bay-table-head span:first-child {
  grid-column: span 2;
}

.bay-row {
  position: relative;
  display: grid;
  grid-template-columns: 34px 1fr 136px 32px;
  gap: 10px;
  align-items: center;
  padding: 9px 12px;
  border-bottom: 1px solid #edf2f1;
}

.bay-row:last-child {
  border-bottom: 0;
}

.row-index {
  color: #a8b6b7;
  font-family: var(--font-mono);
  font-size: 10px;
}

.bay-hint {
  position: absolute;
  right: 52px;
  bottom: 2px;
  color: #a3b0b1;
  font-size: 9px;
  pointer-events: none;
}

.remove-button {
  color: #9caaaa;
}

.remove-button:hover {
  color: var(--danger);
}

.add-bay {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 9px;
  padding: 8px;
  color: var(--accent);
  background: transparent;
  border: 1px dashed #b9d0cd;
  border-radius: 7px;
  cursor: pointer;
  font-size: 11px;
  transition: background 0.18s;
}

.add-bay:hover:not(:disabled) {
  background: #f2f9f7;
}

.add-bay:disabled {
  color: #a7b2b2;
  border-color: #dde5e4;
  cursor: not-allowed;
}

.add-bay span {
  margin-left: 4px;
  color: #a1acad;
  font-size: 9.5px;
}

.options-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 14px;
}

.check-option {
  display: flex;
  align-items: center;
}

.option-note {
  margin-left: auto;
  color: var(--muted);
  font-size: 10px;
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

.bay-option {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px 0;
}

.bay-option strong {
  font-size: 12px;
  font-weight: 500;
}

.bay-option small {
  color: var(--muted);
  font-size: 10px;
}

@media (max-width: 760px) {
  .mode-switch,
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

  .bay-table-head {
    display: none;
  }

  .bay-row {
    grid-template-columns: 24px 1fr 105px 30px;
  }

  .option-note {
    margin-left: 0;
  }
}
</style>
