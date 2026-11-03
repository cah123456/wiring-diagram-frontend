<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowRight,
  BookOpen,
  Boxes,
  CircleDot,
  Clock3,
  Copy,
  FilePlus2,
  MoreHorizontal,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Workflow,
} from 'lucide-vue-next'
import BrandMark from '../components/BrandMark.vue'
import DiagramThumb from '../components/DiagramThumb.vue'
import NewDiagramDialog from '../components/NewDiagramDialog.vue'
import StandardsDrawer from '../components/StandardsDrawer.vue'
import {
  deleteDiagram,
  duplicateDiagram,
  getDiagramStats,
  listDiagrams,
  updateDiagramMeta,
} from '../api/diagrams'
import { getApiError } from '../api/http'
import type { BayConfig, DiagramDetail, DiagramStats, DiagramSummary } from '../types/diagram'
import { createId } from '../utils/document'

const router = useRouter()

const diagrams = ref<DiagramSummary[]>([])
const stats = ref<DiagramStats>({
  diagramCount: 0,
  nodeCount: 0,
  edgeCount: 0,
  updatedRecently: 0,
})
const loading = ref(false)
const error = ref('')
const apiOnline = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(0)
const totalPages = ref(0)
const refreshing = ref(false)
const standardsOpen = ref(false)
const newDialogOpen = ref(false)
const busyId = ref<number | null>(null)

const initialMode = ref<'blank' | 'config'>('config')
const initialBays = ref<BayConfig[]>([])
const initialName = ref('')

let searchTimer: number | undefined

interface StartTemplate {
  key: string
  title: string
  description: string
  icon: Component
  mode: 'blank' | 'config'
  bays: BayConfig[]
  name: string
}

const templates: StartTemplate[] = [
  {
    key: 'blank',
    title: '空白 A3 图框',
    description: '从零开始，自由布置设备与导线',
    icon: FilePlus2,
    mode: 'blank',
    bays: [],
    name: '',
  },
  {
    key: 'distribution',
    title: '10kV 配电柜列',
    description: '进线 + PT + 两面馈线，一键生成',
    icon: Workflow,
    mode: 'config',
    bays: [
      { key: 'distribution-incoming', type: 'incoming', count: 1 },
      { key: 'distribution-pt', type: 'pt', count: 1 },
      { key: 'distribution-outgoing', type: 'outgoing', count: 2 },
    ],
    name: '10kV 配电室一次接线图',
  },
  {
    key: 'incoming',
    title: '双电源进线',
    description: '双进线 + PT 柜的单母线系统',
    icon: Boxes,
    mode: 'config',
    bays: [
      { key: 'incoming-main', type: 'incoming', count: 2 },
      { key: 'incoming-pt', type: 'pt', count: 1 },
    ],
    name: '双电源进线一次接线图',
  },
  {
    key: 'capacitor',
    title: '无功补偿间隔',
    description: '进线 + 电容器柜，快速建立示例',
    icon: Sparkles,
    mode: 'config',
    bays: [
      { key: 'capacitor-incoming', type: 'incoming', count: 1 },
      { key: 'capacitor-bank', type: 'capacitor', count: 1 },
      { key: 'capacitor-outgoing', type: 'outgoing', count: 1 },
    ],
    name: '10kV 无功补偿接线图',
  },
]

const serviceText = computed(() => (apiOnline.value ? '数据库已连接' : '服务未连接'))

const formatRelative = (value: string): string => {
  if (!value) return '—'
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Math.max(0, Date.now() - then)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚更新'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < day * 7) return `${Math.floor(diff / day)} 天前`
  const date = new Date(value)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

const formatNumber = (value: number): string => new Intl.NumberFormat('zh-CN').format(value)

const loadDiagrams = async (showSkeleton = false) => {
  if (showSkeleton) loading.value = true
  error.value = ''
  try {
    const result = await listDiagrams({
      keyword: keyword.value.trim(),
      page: page.value - 1,
      size: pageSize,
    })
    diagrams.value = result.items
    total.value = result.total
    totalPages.value = result.totalPages
    apiOnline.value = true
  } catch (loadError) {
    apiOnline.value = false
    error.value = getApiError(loadError)
    diagrams.value = []
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    stats.value = await getDiagramStats()
    apiOnline.value = true
  } catch {
    apiOnline.value = false
  }
}

const refresh = async () => {
  refreshing.value = true
  await Promise.all([loadDiagrams(), loadStats()])
  window.setTimeout(() => {
    refreshing.value = false
  }, 280)
}

const openEditor = (id: number) => {
  router.push({ name: 'editor', params: { id } })
}

const openNewDialog = (
  mode: 'blank' | 'config' = 'config',
  bays: BayConfig[] = [],
  name = '',
) => {
  initialMode.value = mode
  initialBays.value = bays.map((bay) => ({ ...bay, key: createId('bay') }))
  initialName.value = name
  newDialogOpen.value = true
}

const useTemplate = (template: (typeof templates)[number]) => {
  openNewDialog(template.mode, template.bays, template.name)
}

const handleCreated = (detail: DiagramDetail) => {
  openEditor(detail.id)
}

const handleCardCommand = async (command: string, diagram: DiagramSummary) => {
  if (command === 'open') {
    openEditor(diagram.id)
    return
  }
  if (command === 'duplicate') {
    busyId.value = diagram.id
    try {
      const copy = await duplicateDiagram(diagram.id)
      ElMessage.success(`已复制为「${copy.name}」`)
      await refresh()
    } catch (duplicateError) {
      ElMessage.error(getApiError(duplicateError))
    } finally {
      busyId.value = null
    }
    return
  }
  if (command === 'rename') {
    try {
      const result = await ElMessageBox.prompt('输入新的图纸名称', '重命名图纸', {
        inputValue: diagram.name,
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputValidator: (value) => {
          if (!value?.trim()) return '图纸名称不能为空'
          if (value.trim().length > 120) return '图纸名称不能超过 120 个字符'
          return true
        },
      })
      await updateDiagramMeta(diagram.id, {
        name: result.value.trim(),
        voltageLevel: diagram.voltageLevel,
        description: diagram.description,
      })
      ElMessage.success('名称已更新')
      await refresh()
    } catch (renameError) {
      if (renameError !== 'cancel' && renameError !== 'close') {
        ElMessage.error(getApiError(renameError))
      }
    }
    return
  }
  if (command === 'delete') {
    try {
      await ElMessageBox.confirm(
        `确认删除「${diagram.name}」？删除后无法在图纸库中恢复。`,
        '删除图纸',
        {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          confirmButtonClass: 'el-button--danger',
        },
      )
      await deleteDiagram(diagram.id)
      ElMessage.success('图纸已删除')
      if (diagrams.value.length === 1 && page.value > 1) page.value -= 1
      await refresh()
    } catch (deleteError) {
      if (deleteError !== 'cancel' && deleteError !== 'close') {
        ElMessage.error(getApiError(deleteError))
      }
    }
  }
}

watch(keyword, () => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    page.value = 1
    loadDiagrams(true)
  }, 320)
})

watch(page, () => {
  loadDiagrams(true)
})

onMounted(async () => {
  await Promise.all([loadDiagrams(true), loadStats()])
})
</script>

<template>
  <div class="dashboard">
    <header class="app-header">
      <div class="header-inner">
        <BrandMark />
        <nav class="main-nav">
          <a class="active" href="/">图纸库</a>
          <button type="button" @click="standardsOpen = true">符号规范</button>
        </nav>
        <div class="header-actions">
          <span class="service-status" :class="{ offline: !apiOnline }">
            <i />
            {{ serviceText }}
          </span>
          <el-button class="header-new" type="primary" @click="openNewDialog()">
            <Plus :size="16" :stroke-width="2" />
            新建图纸
          </el-button>
        </div>
      </div>
    </header>

    <main class="dash-scroll scroll-thin">
      <div class="dash-container">
        <section class="hero">
          <div class="hero-grid" aria-hidden="true" />
          <div class="hero-copy">
            <div class="eyebrow">
              <span>SWITCHGEAR SCHEMATIC STUDIO</span>
              <i />
              <span>GB/T 4728</span>
            </div>
            <h1>
              把一次系统，
              <br />
              <em>画成一张可维护的图。</em>
            </h1>
            <p class="hero-desc">
              拖放断路器、互感器、接地开关等标准符号，连接端口自动生成正交导线。
              保存图纸、追溯版本，随时回到画布继续编辑。
            </p>
            <div class="hero-actions">
              <el-button size="large" class="hero-primary" @click="openNewDialog()">
                新建接线图
                <ArrowRight :size="16" />
              </el-button>
              <button type="button" class="hero-secondary" @click="useTemplate(templates[1]!)">
                查看柜列模板
              </button>
            </div>
          </div>

          <div class="hero-visual">
            <div class="sheet-wrap">
              <div class="sheet-head">
                <span>10kV 配电室 · 一次系统</span>
                <span class="sheet-status"><i /> EDITING</span>
              </div>
              <svg viewBox="0 0 500 284" class="hero-schematic">
                <defs>
                  <pattern id="heroGrid" width="18" height="18" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.55" fill="#d8e2e0" />
                  </pattern>
                </defs>
                <rect width="500" height="284" fill="#fcfdfd" />
                <rect width="500" height="284" fill="url(#heroGrid)" />
                <g stroke="#26383e" stroke-width="1.6" fill="none" stroke-linecap="round">
                  <path d="M54 56H446" stroke-width="5" />
                  <path d="M126 56V74M250 56V74M374 56V74" />
                  <rect x="116" y="74" width="20" height="26" rx="1" fill="#fff" />
                  <path d="M119 78L133 96M133 78L119 96" stroke-width="1.2" />
                  <path d="M126 100V119" />
                  <circle cx="126" cy="129" r="10" />
                  <path d="M126 139V160M111 160H141" />
                  <path d="M117 166H135M120 172H132" />
                  <rect x="240" y="74" width="20" height="26" rx="1" fill="#fff" />
                  <path d="M243 78L257 96M257 78L243 96" stroke-width="1.2" />
                  <path d="M250 100V119" />
                  <circle cx="250" cy="129" r="10" />
                  <path d="M250 139V160" />
                  <path d="M234 160H266M229 166H271M234 172H266" />
                  <rect x="364" y="74" width="20" height="26" rx="1" fill="#fff" />
                  <path d="M367 78L381 96M381 78L367 96" stroke-width="1.2" />
                  <path d="M374 100V119" />
                  <path d="M360 119H388M374 119V140" />
                  <circle cx="374" cy="150" r="10" />
                  <path d="M374 160V176" />
                  <path d="M366 176H382M363 181H385" />
                  <path d="M54 56V268M446 56V268" stroke="#c8d4d2" stroke-width="0.8" stroke-dasharray="4 5" />
                </g>
                <g class="hero-label" fill="#26383e" font-family="'Cascadia Mono', Consolas, monospace" font-size="8">
                  <text x="56" y="49">BUS-10kV / I</text>
                  <text x="126" y="89" text-anchor="middle" font-size="7">QF1</text>
                  <text x="250" y="89" text-anchor="middle" font-size="7">QF2</text>
                  <text x="374" y="89" text-anchor="middle" font-size="7">QF3</text>
                  <text x="139" y="133">TA1</text>
                  <text x="263" y="133">TA2</text>
                </g>
                <g transform="translate(102 66)">
                  <rect width="49" height="82" fill="none" stroke="#0b756c" stroke-width="1.2" stroke-dasharray="4 3" />
                  <rect x="-7" y="-4.5" width="7" height="7" fill="#fff" stroke="#0b756c" stroke-width="1" />
                  <rect x="49" y="-4.5" width="7" height="7" fill="#fff" stroke="#0b756c" stroke-width="1" />
                  <rect x="-7" y="79.5" width="7" height="7" fill="#fff" stroke="#0b756c" stroke-width="1" />
                  <rect x="49" y="79.5" width="7" height="7" fill="#fff" stroke="#0b756c" stroke-width="1" />
                </g>
                <g fill="#8b9a9e" font-family="'Cascadia Mono', Consolas, monospace" font-size="7">
                  <text x="126" y="196" text-anchor="middle">FEEDER 01</text>
                  <text x="250" y="196" text-anchor="middle">FEEDER 02</text>
                  <text x="374" y="196" text-anchor="middle">PT</text>
                </g>
                <g transform="translate(339 224)">
                  <rect width="127" height="42" fill="#fff" stroke="#c7d4d2" stroke-width="0.8" />
                  <path d="M0 14H127M0 28H127M91 0V42" stroke="#dbe4e3" stroke-width="0.7" />
                  <text x="5" y="9" fill="#8b9a9e" font-size="4.7" font-family="sans-serif">开关柜一次系统图</text>
                  <text x="5" y="23" fill="#5f7075" font-size="5.4" font-family="sans-serif">10kV 配电室</text>
                  <text x="5" y="37" fill="#8b9a9e" font-size="4.4" font-family="sans-serif">SCHEMATIC · A3</text>
                  <text x="97" y="23" fill="#5f7075" font-size="4.4" font-family="sans-serif">REV. 01</text>
                </g>
              </svg>
              <div class="sheet-foot">
                <span><span class="live-dot" /> 自动排版</span>
                <span>拖拽端口 · 连接导线 · 属性编辑</span>
              </div>
            </div>
            <div class="floating-badge">
              <CircleDot :size="14" />
              正交布线
            </div>
          </div>
        </section>

        <section class="metrics">
          <div class="metric-main">
            <span class="metric-icon"><Workflow :size="17" /></span>
            <div>
              <span class="metric-label">图纸总数</span>
              <strong>{{ formatNumber(stats.diagramCount) }}</strong>
            </div>
          </div>
          <div class="metric">
            <span class="metric-label">已绘制设备</span>
            <strong>{{ formatNumber(stats.nodeCount) }}</strong>
            <span class="metric-foot">个节点</span>
          </div>
          <div class="metric">
            <span class="metric-label">导线连接</span>
            <strong>{{ formatNumber(stats.edgeCount) }}</strong>
            <span class="metric-foot">条回路</span>
          </div>
          <div class="metric">
            <span class="metric-label">近 7 日更新</span>
            <strong>{{ formatNumber(stats.updatedRecently) }}</strong>
            <span class="metric-foot">张图纸</span>
          </div>
          <button type="button" class="standards-link" @click="standardsOpen = true">
            <BookOpen :size="16" />
            <span>
              <b>符号与制图约定</b>
              <small>GB/T 4728 · IEC 60617</small>
            </span>
            <ArrowRight :size="14" />
          </button>
        </section>

        <section class="quickstart">
          <div class="section-head">
            <div>
              <span class="section-kicker">START FAST</span>
              <h2>快速开始</h2>
            </div>
            <p>从常用开关柜配置开始，进入画布再按项目调整。</p>
          </div>
          <div class="template-grid">
            <button
              v-for="(template, index) in templates"
              :key="template.key"
              type="button"
              class="template-card"
              @click="useTemplate(template)"
            >
              <span class="template-index">0{{ index + 1 }}</span>
              <span class="template-icon">
                <component :is="template.icon" :size="19" :stroke-width="1.7" />
              </span>
              <span class="template-copy">
                <strong>{{ template.title }}</strong>
                <small>{{ template.description }}</small>
              </span>
              <ArrowRight :size="15" class="template-arrow" />
            </button>
          </div>
        </section>

        <section class="library">
          <div class="section-head library-head">
            <div>
              <span class="section-kicker">DRAWING LIBRARY</span>
              <h2>所有图纸 <span class="count">{{ total }}</span></h2>
            </div>
            <div class="library-tools">
              <el-input
                v-model="keyword"
                class="search-input"
                placeholder="搜索图纸名称或编号"
                clearable
              >
                <template #prefix>
                  <Search :size="14" />
                </template>
              </el-input>
              <el-tooltip content="刷新图纸列表" placement="top">
                <button type="button" class="icon-button" @click="refresh">
                  <RefreshCw :size="15" :class="{ spinning: refreshing }" />
                </button>
              </el-tooltip>
            </div>
          </div>

          <div v-if="error" class="error-panel">
            <div>
              <strong>无法加载图纸库</strong>
              <p>{{ error }}</p>
            </div>
            <el-button @click="refresh">重新连接</el-button>
          </div>

          <div v-if="loading" class="library-grid">
            <div v-for="index in 4" :key="index" class="skeleton-card">
              <div class="skeleton-thumb" />
              <div class="skeleton-lines">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>

          <div v-else-if="diagrams.length > 0" class="library-grid">
            <article
              v-for="diagram in diagrams"
              :key="diagram.id"
              class="diagram-card"
              :class="{ busy: busyId === diagram.id }"
              tabindex="0"
              @click="openEditor(diagram.id)"
              @keydown.enter="openEditor(diagram.id)"
            >
              <DiagramThumb
                :thumbnail="diagram.thumbnail"
                :code="diagram.code"
                :voltage-level="diagram.voltageLevel"
              />
              <div class="card-body">
                <div class="card-title-row">
                  <div class="card-title-copy">
                    <span class="card-code">{{ diagram.code }}</span>
                    <h3>{{ diagram.name }}</h3>
                  </div>
                  <el-dropdown
                    trigger="click"
                    placement="bottom-end"
                    @command="(command: string) => handleCardCommand(command, diagram)"
                  >
                    <button
                      type="button"
                      class="card-menu"
                      aria-label="图纸操作"
                      @click.stop
                    >
                      <MoreHorizontal :size="17" />
                    </button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="open">
                          <PencilLine :size="14" /> 打开编辑
                        </el-dropdown-item>
                        <el-dropdown-item command="rename">
                          <PencilLine :size="14" /> 重命名
                        </el-dropdown-item>
                        <el-dropdown-item command="duplicate">
                          <Copy :size="14" /> 创建副本
                        </el-dropdown-item>
                        <el-dropdown-item command="delete" divided class="danger-item">
                          <Trash2 :size="14" /> 删除图纸
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
                <p class="card-desc">
                  {{ diagram.description || '暂无说明，打开画布继续编辑。' }}
                </p>
                <div class="card-meta">
                  <span><Boxes :size="12" /> {{ diagram.nodeCount }} 设备</span>
                  <span><Workflow :size="12" /> {{ diagram.edgeCount }} 导线</span>
                  <span><Clock3 :size="12" /> {{ formatRelative(diagram.updatedAt) }}</span>
                </div>
                <div class="card-footer">
                  <span class="revision">R{{ diagram.revision }}</span>
                  <span>继续编辑 <ArrowRight :size="13" /></span>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="empty-state">
            <div class="empty-diagram">
              <svg viewBox="0 0 220 130" aria-hidden="true">
                <g stroke="#9db3b0" fill="none" stroke-width="1.2" stroke-linecap="round">
                  <path d="M30 34H190" stroke-width="3" />
                  <path d="M70 34V50M110 34V50M150 34V50" />
                  <rect x="60" y="50" width="20" height="20" rx="1" />
                  <path d="M63 53L77 67M77 53L63 67" />
                  <rect x="100" y="50" width="20" height="20" rx="1" />
                  <path d="M103 53L117 67M117 53L103 67" />
                  <circle cx="150" cy="62" r="9" />
                  <path d="M70 70V92M110 70V92M150 71V92" />
                  <path d="M61 92H79M57 97H83M61 102H79" />
                  <path d="M101 92H119M97 97H123" />
                  <path d="M141 92H159M137 97H163" />
                </g>
                <text x="110" y="120" text-anchor="middle" fill="#9aa9a9" font-size="8" font-family="sans-serif">
                  NO DRAWINGS YET
                </text>
              </svg>
            </div>
            <h3>{{ keyword ? '没有找到匹配的图纸' : '还没有接线图' }}</h3>
            <p>
              {{
                keyword
                  ? '换一个关键词试试，或清除搜索条件。'
                  : '从空白画布开始，或使用柜列模板快速生成第一张图纸。'
              }}
            </p>
            <el-button v-if="!keyword" type="primary" @click="openNewDialog()">
              <Plus :size="15" /> 新建第一张图纸
            </el-button>
            <el-button v-else @click="keyword = ''">清除搜索</el-button>
          </div>

          <div v-if="totalPages > 1" class="pagination-row">
            <span>共 {{ total }} 张图纸</span>
            <el-pagination
              v-model:current-page="page"
              :page-size="pageSize"
              :total="total"
              layout="prev, pager, next"
              background
            />
          </div>
        </section>

        <footer class="dash-footer">
          <span>GRIDLINE · 开关柜一次系统接线工具</span>
          <span>符号参照 GB/T 4728 / IEC 60617 · 工程出图前请按项目标准复核</span>
        </footer>
      </div>
    </main>

    <NewDiagramDialog
      v-model="newDialogOpen"
      :initial-mode="initialMode"
      :initial-bays="initialBays"
      :initial-name="initialName"
      @created="handleCreated"
    />
    <StandardsDrawer v-model="standardsOpen" />
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background:
    radial-gradient(circle at 10% 0%, rgba(17, 110, 98, 0.05), transparent 32%),
    var(--surface);
}

.app-header {
  position: relative;
  z-index: 3;
  flex: none;
  background: rgba(250, 252, 251, 0.9);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(14px);
}

.header-inner {
  display: flex;
  min-height: 68px;
  max-width: 1400px;
  align-items: center;
  gap: 44px;
  margin: 0 auto;
  padding: 0 32px;
}

.main-nav {
  display: flex;
  align-self: stretch;
  align-items: center;
  gap: 6px;
}

.main-nav a,
.main-nav button {
  position: relative;
  padding: 8px 12px;
  color: var(--ink-soft);
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12.5px;
  transition:
    color 0.18s,
    background 0.18s;
}

.main-nav a:hover,
.main-nav button:hover {
  color: var(--ink);
  background: #f0f5f4;
}

.main-nav .active {
  color: var(--ink);
  font-weight: 600;
}

.main-nav .active::after {
  position: absolute;
  right: 12px;
  bottom: 5px;
  left: 12px;
  height: 2px;
  background: var(--accent);
  border-radius: 2px;
  content: '';
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-left: auto;
}

.service-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #5d746f;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.02em;
}

.service-status i {
  width: 6px;
  height: 6px;
  background: #2a9d78;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(42, 157, 120, 0.12);
}

.service-status.offline {
  color: #9d655e;
}

.service-status.offline i {
  background: #c95e50;
  box-shadow: 0 0 0 3px rgba(201, 94, 80, 0.12);
}

.header-new {
  height: 34px;
  gap: 5px;
  padding: 0 15px;
  font-size: 12px;
}

.dash-scroll {
  flex: 1;
  overflow-y: auto;
}

.dash-container {
  width: min(1400px, calc(100% - 64px));
  margin: 0 auto;
  padding: 28px 0 28px;
}

.hero {
  position: relative;
  display: grid;
  min-height: 326px;
  overflow: hidden;
  grid-template-columns: minmax(0, 1.08fr) minmax(380px, 0.92fr);
  gap: 30px;
  padding: 40px 42px;
  color: #f1f8f6;
  background:
    radial-gradient(circle at 78% -20%, rgba(102, 184, 170, 0.22), transparent 42%),
    linear-gradient(122deg, #10242b 0%, #152e34 52%, #12272d 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(19, 43, 49, 0.17);
}

.hero::after {
  position: absolute;
  top: -100px;
  right: -80px;
  width: 430px;
  height: 430px;
  background: radial-gradient(circle, rgba(224, 169, 74, 0.1), transparent 66%);
  content: '';
  pointer-events: none;
}

.hero-grid {
  position: absolute;
  inset: 0;
  opacity: 0.2;
  background-image:
    linear-gradient(rgba(163, 210, 202, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(163, 210, 202, 0.18) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: linear-gradient(90deg, #000, transparent 72%);
  pointer-events: none;
}

.hero-copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 17px;
  color: rgba(183, 221, 214, 0.62);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.11em;
}

.eyebrow i {
  width: 22px;
  height: 1px;
  background: rgba(201, 230, 224, 0.28);
}

.hero h1 {
  max-width: 560px;
  margin: 0;
  font-size: clamp(32px, 3.6vw, 46px);
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1.24;
}

.hero h1 em {
  color: #9ed8cc;
  font-style: normal;
}

.hero-desc {
  max-width: 530px;
  margin: 19px 0 0;
  color: rgba(221, 238, 235, 0.62);
  font-size: 12.5px;
  line-height: 1.9;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 26px;
}

.hero-primary {
  display: inline-flex;
  height: 41px;
  align-items: center;
  gap: 16px;
  padding: 0 17px;
  color: #12262c;
  background: #e9f2ef;
  border: 0;
  border-radius: 6px;
  font-weight: 600;
}

.hero-primary:hover,
.hero-primary:focus {
  color: #12262c;
  background: #ffffff;
}

.hero-secondary {
  padding: 8px 0;
  color: rgba(226, 241, 238, 0.74);
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(194, 225, 219, 0.3);
  cursor: pointer;
  font-size: 12px;
  transition: color 0.18s;
}

.hero-secondary:hover {
  color: #fff;
}

.hero-visual {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1200px;
}

.sheet-wrap {
  position: relative;
  width: 100%;
  max-width: 490px;
  overflow: hidden;
  color: var(--ink);
  background: #fff;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 7px;
  box-shadow:
    0 26px 60px rgba(3, 16, 20, 0.38),
    0 0 0 7px rgba(255, 255, 255, 0.03);
  transform: rotate(-0.8deg);
}

.sheet-head,
.sheet-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #63757a;
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.04em;
}

.sheet-head {
  padding: 8px 12px 6px;
  border-bottom: 1px solid #eef3f2;
}

.sheet-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #548b7f;
}

.sheet-status i,
.live-dot {
  display: inline-block;
  width: 4px;
  height: 4px;
  background: #3aa17f;
  border-radius: 50%;
}

.hero-schematic {
  display: block;
  width: 100%;
  height: auto;
}

.sheet-foot {
  padding: 6px 12px 8px;
  border-top: 1px solid #eef3f2;
}

.sheet-foot > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.floating-badge {
  position: absolute;
  right: -9px;
  bottom: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  color: #d9ece8;
  background: rgba(24, 50, 56, 0.92);
  border: 1px solid rgba(160, 211, 202, 0.24);
  border-radius: 5px;
  box-shadow: 0 8px 24px rgba(3, 16, 20, 0.3);
  font-size: 9.5px;
  backdrop-filter: blur(8px);
}

.metrics {
  display: grid;
  grid-template-columns: 1.25fr 1fr 1fr 1fr 1.35fr;
  margin-top: 14px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
}

.metric,
.metric-main,
.standards-link {
  min-width: 0;
  padding: 16px 20px;
  border-right: 1px solid var(--line);
}

.metric-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.metric-icon {
  display: grid;
  width: 35px;
  height: 35px;
  flex: none;
  place-items: center;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 7px;
}

.metric-label {
  display: block;
  margin-bottom: 3px;
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.02em;
}

.metric strong,
.metric-main strong {
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 23px;
  font-weight: 600;
  letter-spacing: -0.03em;
}

.metric-foot {
  margin-left: 5px;
  color: #a0adae;
  font-size: 9px;
}

.standards-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  color: var(--ink-soft);
  background: #fbfcfc;
  border: 0;
  border-radius: 0 9px 9px 0;
  cursor: pointer;
  text-align: left;
  transition: background 0.18s;
}

.standards-link:hover {
  background: #f5f9f8;
}

.standards-link > svg:first-child {
  flex: none;
  color: var(--warm);
}

.standards-link > span {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.standards-link b {
  font-size: 11px;
  font-weight: 600;
}

.standards-link small {
  margin-top: 2px;
  overflow: hidden;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.standards-link > svg:last-child {
  color: #a3b0b0;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.quickstart {
  margin-top: 30px;
}

.section-kicker {
  display: block;
  margin-bottom: 5px;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.13em;
}

.section-head h2 {
  margin: 0;
  color: var(--ink);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.section-head > p {
  margin: 0 0 2px;
  color: var(--muted);
  font-size: 11px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 13px;
}

.template-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
  padding: 14px;
  color: var(--ink);
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 9px;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.2s;
}

.template-card:hover {
  border-color: #aecfc9;
  box-shadow: 0 8px 24px rgba(25, 65, 65, 0.07);
  transform: translateY(-1px);
}

.template-index {
  position: absolute;
  top: 6px;
  right: 8px;
  color: #dfe7e6;
  font-family: var(--font-mono);
  font-size: 8px;
}

.template-icon {
  display: grid;
  width: 35px;
  height: 35px;
  flex: none;
  place-items: center;
  color: var(--accent);
  background: #eef6f4;
  border-radius: 7px;
}

.template-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.template-copy strong {
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-copy small {
  overflow: hidden;
  color: var(--muted);
  font-size: 9.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-arrow {
  flex: none;
  color: #b1bebd;
  transition: transform 0.18s;
}

.template-card:hover .template-arrow {
  color: var(--accent);
  transform: translateX(2px);
}

.library {
  margin-top: 34px;
}

.library-head {
  align-items: center;
}

.count {
  display: inline-grid;
  min-width: 22px;
  height: 19px;
  margin-left: 5px;
  padding: 0 5px;
  place-items: center;
  color: var(--muted);
  background: #eef3f2;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  vertical-align: 2px;
}

.library-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  width: 240px;
}

.search-input :deep(.el-input__wrapper) {
  background: #fff;
}

.search-input :deep(.el-input__prefix) {
  color: #95a5a5;
}

.icon-button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: var(--ink-soft);
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.18s;
}

.icon-button:hover {
  border-color: #aecbc6;
}

.spinning {
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.diagram-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  outline: none;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}

.diagram-card:hover,
.diagram-card:focus-visible {
  border-color: #b5d2cd;
  box-shadow: 0 16px 38px rgba(22, 61, 67, 0.1);
  transform: translateY(-2px);
}

.diagram-card.busy {
  opacity: 0.55;
  pointer-events: none;
}

.card-body {
  padding: 13px 15px 0;
}

.card-title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.card-title-copy {
  min-width: 0;
  flex: 1;
}

.card-code {
  display: block;
  margin-bottom: 3px;
  color: #95a4a4;
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.06em;
}

.card-title-copy h3 {
  overflow: hidden;
  margin: 0;
  color: var(--ink);
  font-size: 13.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-menu {
  display: grid;
  width: 26px;
  height: 26px;
  flex: none;
  place-items: center;
  color: #91a0a0;
  background: transparent;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
}

.card-menu:hover {
  color: var(--ink);
  background: #f2f6f5;
}

.card-desc {
  overflow: hidden;
  margin: 7px 0 0;
  color: var(--muted);
  font-size: 10.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  gap: 13px;
  margin-top: 11px;
  padding-bottom: 12px;
  color: #8e9d9e;
  font-size: 9.5px;
}

.card-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 -15px;
  padding: 8px 15px;
  color: #819191;
  background: #fafcfb;
  border-top: 1px solid #eef3f2;
  font-size: 9.5px;
}

.card-footer > span:last-child {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--accent);
  opacity: 0;
  transition: opacity 0.2s;
}

.diagram-card:hover .card-footer > span:last-child {
  opacity: 1;
}

.revision {
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.danger-item {
  color: var(--danger) !important;
}

.empty-state {
  display: flex;
  align-items: center;
  flex-direction: column;
  margin-top: 14px;
  padding: 56px 20px;
  background:
    linear-gradient(#fbfcfc, #fbfcfc) padding-box,
    repeating-linear-gradient(45deg, #dbe5e3 0, #dbe5e3 1px, transparent 1px, transparent 9px) border-box;
  border: 1px solid transparent;
  border-radius: 10px;
  text-align: center;
}

.empty-diagram {
  width: 190px;
  opacity: 0.8;
}

.empty-state h3 {
  margin: 12px 0 5px;
  font-size: 16px;
  font-weight: 600;
}

.empty-state p {
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 11.5px;
}

.error-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 14px;
  padding: 18px 20px;
  background: var(--danger-soft);
  border: 1px solid #ebcbc5;
  border-radius: 9px;
}

.error-panel strong {
  font-size: 12.5px;
}

.error-panel p {
  margin: 2px 0 0;
  color: #835950;
  font-size: 11px;
}

.skeleton-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
}

.skeleton-thumb,
.skeleton-lines span {
  background: linear-gradient(90deg, #f0f4f3 25%, #f8faf9 50%, #f0f4f3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-thumb {
  aspect-ratio: 16 / 9.5;
}

.skeleton-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
}

.skeleton-lines span {
  height: 8px;
  border-radius: 4px;
}

.skeleton-lines span:nth-child(2) {
  width: 70%;
}

.skeleton-lines span:nth-child(3) {
  width: 42%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  color: var(--muted);
  font-size: 10px;
}

.dash-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-top: 36px;
  padding-top: 14px;
  color: #9ba8a8;
  border-top: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.02em;
}

@media (max-width: 1180px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .hero-visual {
    display: none;
  }

  .metrics {
    grid-template-columns: 1.2fr 1fr 1fr;
  }

  .standards-link {
    display: none;
  }

  .metric-main,
  .metric {
    border-bottom: 0;
  }

  .metrics > :nth-child(3) {
    border-right: 0;
  }

  .library-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .header-inner {
    gap: 20px;
    padding: 0 18px;
  }

  .main-nav,
  .service-status {
    display: none;
  }

  .dash-container {
    width: calc(100% - 32px);
  }

  .hero {
    padding: 28px 24px;
  }

  .hero h1 {
    font-size: 30px;
  }

  .metrics {
    grid-template-columns: 1fr 1fr;
  }

  .metric:nth-child(2n) {
    border-right: 0;
  }

  .metric-main {
    grid-column: span 2;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .metrics > :nth-child(3) {
    border-right: 1px solid var(--line);
  }

  .library-grid,
  .template-grid {
    grid-template-columns: 1fr;
  }

  .section-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .library-head {
    align-items: stretch;
  }

  .library-tools {
    width: 100%;
  }

  .search-input {
    flex: 1;
    width: auto;
  }

  .dash-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }
}
</style>
