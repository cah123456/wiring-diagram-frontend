import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import type {
  DiagramDetail,
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  Rotation,
  SymbolType,
  WireKind,
} from '../types/diagram'
import { getSymbol } from '../data/symbols'
import { createId, blankDocument, cloneDocument, normalizeDocument } from '../utils/document'
import { getNodeBounds, getNodePorts } from '../utils/geometry'
import { saveDiagram } from '../api/diagrams'

export type EditorMode = 'select' | 'wire' | 'pan' | 'text'
export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'

interface HistoryTransaction {
  label: string
  before: DiagramDocument
}

interface Clipboard {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

const HISTORY_LIMIT = 80

export const useEditorStore = defineStore('editor', () => {
  const diagramId = ref<number | null>(null)
  const diagramName = ref('')
  const voltageLevel = ref('')
  const doc = ref<DiagramDocument>(blankDocument())
  const savedAt = ref('')
  const savedJson = ref(JSON.stringify(doc.value))
  const loading = ref(false)
  const saving = ref(false)
  const mode = ref<EditorMode>('select')
  const wireKind = ref<WireKind>('main')
  const selectedNodeIds = ref<string[]>([])
  const selectedEdgeIds = ref<string[]>([])
  const zoom = ref(0.7)
  const pan = ref({ x: 80, y: 60 })
  const pointer = ref({ x: 0, y: 0 })
  const viewportSize = ref({ width: 1000, height: 700 })
  const past = ref<DiagramDocument[]>([])
  const future = ref<DiagramDocument[]>([])
  const transaction = ref<HistoryTransaction | null>(null)
  const clipboard = ref<Clipboard | null>(null)
  const lastAction = ref('')

  const selectedNodes = computed(() =>
    doc.value.nodes.filter((node) => selectedNodeIds.value.includes(node.id)),
  )
  const selectedEdges = computed(() =>
    doc.value.edges.filter((edge) => selectedEdgeIds.value.includes(edge.id)),
  )
  const selectionCount = computed(
    () => selectedNodeIds.value.length + selectedEdgeIds.value.length,
  )
  const dirty = computed(() => JSON.stringify(doc.value) !== savedJson.value)
  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)
  const selectionKind = computed<'node' | 'edge' | 'multi' | 'none'>(() => {
    if (selectedNodeIds.value.length === 1 && selectedEdgeIds.value.length === 0) return 'node'
    if (selectedEdgeIds.value.length === 1 && selectedNodeIds.value.length === 0) return 'edge'
    if (selectionCount.value > 1) return 'multi'
    return 'none'
  })
  const currentMode = computed(() => mode.value)

  const snapshot = (): DiagramDocument => cloneDocument(doc.value)

  const cleanSelection = () => {
    const nodeIds = new Set(doc.value.nodes.map((node) => node.id))
    const edgeIds = new Set(doc.value.edges.map((edge) => edge.id))
    selectedNodeIds.value = selectedNodeIds.value.filter((id) => nodeIds.has(id))
    selectedEdgeIds.value = selectedEdgeIds.value.filter((id) => edgeIds.has(id))
  }

  const beginChange = (label = '编辑图纸') => {
    if (transaction.value) return
    transaction.value = { label, before: snapshot() }
  }

  const endChange = () => {
    if (!transaction.value) return
    const before = transaction.value.before
    const label = transaction.value.label
    transaction.value = null
    if (JSON.stringify(before) === JSON.stringify(doc.value)) return
    past.value.push(before)
    if (past.value.length > HISTORY_LIMIT) past.value.shift()
    future.value = []
    lastAction.value = label
  }

  const mutate = (label: string, mutator: () => void) => {
    beginChange(label)
    mutator()
    endChange()
  }

  const undo = () => {
    if (transaction.value) endChange()
    const previous = past.value.pop()
    if (!previous) return
    future.value.unshift(snapshot())
    doc.value = cloneDocument(previous)
    cleanSelection()
    lastAction.value = '撤销'
  }

  const redo = () => {
    if (transaction.value) endChange()
    const next = future.value.shift()
    if (!next) return
    past.value.push(snapshot())
    doc.value = cloneDocument(next)
    cleanSelection()
    lastAction.value = '重做'
  }

  const setMode = (next: EditorMode) => {
    mode.value = next
    if (next !== 'select') {
      selectedNodeIds.value = []
      selectedEdgeIds.value = []
    }
  }

  const setWireKind = (kind: WireKind) => {
    wireKind.value = kind
    mode.value = 'wire'
    selectedNodeIds.value = []
    selectedEdgeIds.value = []
  }

  const selectNode = (id: string, additive = false) => {
    if (additive) {
      if (selectedNodeIds.value.includes(id)) {
        selectedNodeIds.value = selectedNodeIds.value.filter((nodeId) => nodeId !== id)
      } else {
        selectedNodeIds.value = [...selectedNodeIds.value, id]
      }
      selectedEdgeIds.value = []
      return
    }
    selectedNodeIds.value = [id]
    selectedEdgeIds.value = []
  }

  const toggleNode = (id: string) => {
    if (selectedNodeIds.value.includes(id)) {
      selectedNodeIds.value = selectedNodeIds.value.filter((nodeId) => nodeId !== id)
    } else {
      selectedNodeIds.value = [...selectedNodeIds.value, id]
    }
    selectedEdgeIds.value = []
  }

  const selectNodes = (ids: string[], additive = false) => {
    if (additive) {
      selectedNodeIds.value = Array.from(new Set([...selectedNodeIds.value, ...ids]))
    } else {
      selectedNodeIds.value = [...ids]
      selectedEdgeIds.value = []
    }
  }

  const selectEdge = (id: string, additive = false) => {
    if (additive) {
      selectedEdgeIds.value = [...new Set([...selectedEdgeIds.value, id])]
    } else {
      selectedEdgeIds.value = [id]
      selectedNodeIds.value = []
    }
  }

  const clearSelection = () => {
    selectedNodeIds.value = []
    selectedEdgeIds.value = []
  }

  const addNode = (type: SymbolType, x: number, y: number): DiagramNode => {
    const node = createNodeAt(type, x, y)
    mutate(`添加${node.label || '元素'}`, () => {
      doc.value.nodes.push(node)
    })
    selectedNodeIds.value = [node.id]
    selectedEdgeIds.value = []
    mode.value = 'select'
    return node
  }

  const addNodeAtViewportCenter = (type: SymbolType): DiagramNode => {
    const worldX = (viewportSize.value.width / 2 - pan.value.x) / zoom.value
    const worldY = (viewportSize.value.height / 2 - pan.value.y) / zoom.value
    const grid = doc.value.settings.gridSize
    const x = doc.value.settings.snapToGrid ? Math.round(worldX / grid) * grid : worldX
    const y = doc.value.settings.snapToGrid ? Math.round(worldY / grid) * grid : worldY
    return addNode(type, x, y)
  }

  const createNodeAt = (type: SymbolType, x: number, y: number): DiagramNode => {
    const def = getSymbol(type)
    const tag = nextTagFor(type)
    return {
      id: createId(type),
      type,
      x,
      y,
      width: def.width,
      height: def.height,
      rotation: 0,
      label: type === 'text' || type === 'junction' ? '' : tag,
      name: '',
      props: type === 'text' ? { text: '说明文字' } : {},
      showLabel: type !== 'junction',
      locked: false,
    }
  }

  const nextTagFor = (type: SymbolType): string => {
    const prefix = getSymbol(type).code
    const pattern = new RegExp(`^${prefix}(\\d+)$`)
    let highest = 0
    for (const node of doc.value.nodes) {
      const match = node.label.match(pattern)
      if (match) highest = Math.max(highest, Number(match[1]))
    }
    return `${prefix}${highest + 1}`
  }

  const addEdge = (
    from: { nodeId: string; portId: string },
    to: { nodeId: string; portId: string },
    kind: WireKind = wireKind.value,
  ): DiagramEdge | null => {
    if (from.nodeId === to.nodeId && from.portId === to.portId) return null
    const duplicate = doc.value.edges.some(
      (edge) =>
        (edge.from.nodeId === from.nodeId &&
          edge.from.portId === from.portId &&
          edge.to.nodeId === to.nodeId &&
          edge.to.portId === to.portId) ||
        (edge.from.nodeId === to.nodeId &&
          edge.from.portId === to.portId &&
          edge.to.nodeId === from.nodeId &&
          edge.to.portId === from.portId),
    )
    if (duplicate) {
      ElMessage.info('这两个端口已经连接')
      return null
    }
    const edge: DiagramEdge = {
      id: createId('wire'),
      from: { ...from },
      to: { ...to },
      kind,
      label: '',
    }
    mutate('连接导线', () => {
      doc.value.edges.push(edge)
    })
    selectedEdgeIds.value = [edge.id]
    selectedNodeIds.value = []
    return edge
  }

  const updateNodeSilent = (id: string, patch: Partial<DiagramNode>) => {
    const node = doc.value.nodes.find((item) => item.id === id)
    if (!node) return
    Object.assign(node, patch)
  }

  const updateNode = (id: string, patch: Partial<DiagramNode>, label = '修改设备属性') => {
    mutate(label, () => updateNodeSilent(id, patch))
  }

  const updateNodesSilent = (ids: string[], patcher: (node: DiagramNode) => void) => {
    for (const node of doc.value.nodes) {
      if (ids.includes(node.id)) patcher(node)
    }
  }

  const updateEdgeSilent = (id: string, patch: Partial<DiagramEdge>) => {
    const edge = doc.value.edges.find((item) => item.id === id)
    if (!edge) return
    Object.assign(edge, patch)
  }

  const updateEdge = (id: string, patch: Partial<DiagramEdge>, label = '修改导线属性') => {
    mutate(label, () => updateEdgeSilent(id, patch))
  }

  const deleteSelected = () => {
    if (selectionCount.value === 0) return
    mutate('删除选中元素', () => {
      const lockedIds = new Set(
        doc.value.nodes.filter((node) => node.locked && selectedNodeIds.value.includes(node.id)).map((node) => node.id),
      )
      const nodeIds = new Set(selectedNodeIds.value.filter((id) => !lockedIds.has(id)))
      const edgeIds = new Set(selectedEdgeIds.value)
      doc.value.nodes = doc.value.nodes.filter((node) => !nodeIds.has(node.id))
      doc.value.edges = doc.value.edges.filter(
        (edge) =>
          !edgeIds.has(edge.id) &&
          !nodeIds.has(edge.from.nodeId) &&
          !nodeIds.has(edge.to.nodeId),
      )
    })
    clearSelection()
  }

  const rotateSelected = (delta = 90) => {
    if (selectedNodeIds.value.length === 0) return
    mutate('旋转设备', () => {
      updateNodesSilent(selectedNodeIds.value, (node) => {
        if (node.locked) return
        const next = ((node.rotation + delta + 360) % 360) as Rotation
        node.rotation = next
      })
    })
  }

  const flipSelected = () => {
    if (selectedNodeIds.value.length === 0) return
    mutate('翻转设备', () => {
      updateNodesSilent(selectedNodeIds.value, (node) => {
        if (node.locked) return
        node.rotation = ((node.rotation + 180) % 360) as Rotation
      })
    })
  }

  const nudgeSelected = (dx: number, dy: number, record = true) => {
    if (selectedNodeIds.value.length === 0) return
    const apply = () => {
      for (const node of doc.value.nodes) {
        if (!selectedNodeIds.value.includes(node.id) || node.locked) continue
        node.x += dx
        node.y += dy
      }
    }
    if (record) {
      mutate('移动设备', apply)
    } else {
      apply()
    }
  }

  const copySelected = () => {
    const nodes = selectedNodes.value.map((node) => cloneNode(node))
    if (nodes.length === 0) return
    const nodeIds = new Set(nodes.map((node) => node.id))
    const edges = doc.value.edges
      .filter((edge) => nodeIds.has(edge.from.nodeId) && nodeIds.has(edge.to.nodeId))
      .map((edge) => JSON.parse(JSON.stringify(edge)) as DiagramEdge)
    clipboard.value = { nodes, edges }
    ElMessage.success(`已复制 ${nodes.length} 个设备`)
  }

  const duplicateSelected = () => {
    if (selectedNodeIds.value.length === 0) return
    copySelected()
    pasteClipboard(30, 30)
  }

  const pasteClipboard = (offsetX = 30, offsetY = 30) => {
    if (!clipboard.value || clipboard.value.nodes.length === 0) return
    const idMap = new Map<string, string>()
    const pastedNodes: DiagramNode[] = []
    mutate('粘贴设备', () => {
      for (const source of clipboard.value!.nodes) {
        const newId = createId(source.type)
        idMap.set(source.id, newId)
        const tag = source.type === 'text' || source.type === 'junction' ? '' : nextTagFor(source.type)
        const node: DiagramNode = {
          ...cloneNode(source),
          id: newId,
          x: source.x + offsetX,
          y: source.y + offsetY,
          label: tag,
        }
        doc.value.nodes.push(node)
        pastedNodes.push(node)
      }
      for (const source of clipboard.value!.edges) {
        const fromNode = idMap.get(source.from.nodeId)
        const toNode = idMap.get(source.to.nodeId)
        if (!fromNode || !toNode) continue
        doc.value.edges.push({
          ...JSON.parse(JSON.stringify(source)),
          id: createId('wire'),
          from: { nodeId: fromNode, portId: source.from.portId },
          to: { nodeId: toNode, portId: source.to.portId },
        })
      }
    })
    selectedNodeIds.value = pastedNodes.map((node) => node.id)
    selectedEdgeIds.value = []
  }

  const cloneNode = (node: DiagramNode): DiagramNode => ({
    ...node,
    props: { ...node.props },
  })

  const alignSelected = (align: AlignMode) => {
    if (selectedNodeIds.value.length < 2) return
    const nodes = selectedNodes.value.filter((node) => !node.locked)
    if (nodes.length < 2) return
    const bounds = nodes.map((node) => ({ node, bound: getNodeBounds(node) }))
    const targetMinX = Math.min(...bounds.map((item) => item.bound.minX))
    const targetMaxX = Math.max(...bounds.map((item) => item.bound.maxX))
    const targetMinY = Math.min(...bounds.map((item) => item.bound.minY))
    const targetMaxY = Math.max(...bounds.map((item) => item.bound.maxY))
    const centerX = (targetMinX + targetMaxX) / 2
    const centerY = (targetMinY + targetMaxY) / 2

    mutate('对齐设备', () => {
      for (const { node, bound } of bounds) {
        if (align === 'left') node.x += targetMinX - bound.minX
        if (align === 'right') node.x += targetMaxX - bound.maxX
        if (align === 'hcenter') node.x += centerX - (bound.minX + bound.maxX) / 2
        if (align === 'top') node.y += targetMinY - bound.minY
        if (align === 'bottom') node.y += targetMaxY - bound.maxY
        if (align === 'vcenter') node.y += centerY - (bound.minY + bound.maxY) / 2
      }
    })
  }

  const distributeSelected = (axis: 'horizontal' | 'vertical') => {
    if (selectedNodeIds.value.length < 3) return
    const nodes = selectedNodes.value.filter((node) => !node.locked)
    if (nodes.length < 3) return
    const sorted = [...nodes].sort((a, b) =>
      axis === 'horizontal' ? a.x - b.x : a.y - b.y,
    )
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const gap = axis === 'horizontal'
      ? (last.x - first.x) / (sorted.length - 1)
      : (last.y - first.y) / (sorted.length - 1)
    mutate('分布设备', () => {
      sorted.forEach((node, index) => {
        if (axis === 'horizontal') node.x = first.x + gap * index
        else node.y = first.y + gap * index
      })
    })
  }

  const resetNodeSize = (id: string) => {
    const node = doc.value.nodes.find((item) => item.id === id)
    if (!node) return
    const def = getSymbol(node.type)
    updateNode(id, { width: def.width, height: def.height }, '重置设备尺寸')
  }

  const updateSettings = (patch: Partial<DiagramDocument['settings']>) => {
    mutate('修改画布设置', () => {
      Object.assign(doc.value.settings, patch)
    })
  }

  const updateMetaSilent = (patch: Partial<DiagramDocument['meta']>) => {
    Object.assign(doc.value.meta, patch)
  }

  const updateMeta = (patch: Partial<DiagramDocument['meta']>) => {
    mutate('修改图签信息', () => updateMetaSilent(patch))
  }

  const updatePaper = (patch: Partial<DiagramDocument['paper']>) => {
    mutate('修改图纸幅面', () => {
      Object.assign(doc.value.paper, patch)
    })
  }

  const replaceDocument = (next: DiagramDocument, label = '生成接线图') => {
    mutate(label, () => {
      doc.value = normalizeDocument(next)
    })
    clearSelection()
  }

  const setViewport = (nextZoom: number, nextPan: { x: number; y: number }) => {
    zoom.value = nextZoom
    pan.value = nextPan
  }

  const setViewportSize = (width: number, height: number) => {
    viewportSize.value = { width, height }
  }

  const fitView = (viewportWidth: number, viewportHeight: number, padding = 56) => {
    const availableWidth = Math.max(viewportWidth - padding * 2, 100)
    const availableHeight = Math.max(viewportHeight - padding * 2, 100)
    const nextZoom = Math.min(
      availableWidth / doc.value.paper.width,
      availableHeight / doc.value.paper.height,
      2.5,
    )
    zoom.value = Math.max(nextZoom, 0.15)
    pan.value = {
      x: (viewportWidth - doc.value.paper.width * zoom.value) / 2,
      y: (viewportHeight - doc.value.paper.height * zoom.value) / 2,
    }
  }

  const loadDocument = (detail: DiagramDetail) => {
    diagramId.value = detail.id
    diagramName.value = detail.name
    voltageLevel.value = detail.voltageLevel ?? ''
    doc.value = normalizeDocument(detail.document)
    savedAt.value = detail.updatedAt
    savedJson.value = JSON.stringify(doc.value)
    past.value = []
    future.value = []
    clipboard.value = null
    transaction.value = null
    lastAction.value = ''
    clearSelection()
    mode.value = 'select'
    wireKind.value = 'main'
  }

  const startNewDocument = (document: DiagramDocument, name: string) => {
    diagramId.value = null
    diagramName.value = name
    voltageLevel.value = document.meta.voltageLevel
    doc.value = normalizeDocument(document)
    savedJson.value = JSON.stringify(doc.value)
    savedAt.value = ''
    past.value = []
    future.value = []
    clearSelection()
    mode.value = 'select'
    wireKind.value = 'main'
  }

  const attachDiagramDetail = (detail: DiagramDetail) => {
    diagramId.value = detail.id
    diagramName.value = detail.name
    voltageLevel.value = detail.voltageLevel ?? ''
    savedAt.value = detail.updatedAt
    savedJson.value = JSON.stringify(doc.value)
    past.value = []
    future.value = []
  }

  const save = async (thumbnail?: string) => {
    if (!diagramId.value) throw new Error('图纸尚未创建')
    saving.value = true
    const submitted = cloneDocument(doc.value)
    const submittedJson = JSON.stringify(submitted)
    try {
      const detail = await saveDiagram(diagramId.value, {
        document: submitted,
        thumbnail,
      })
      savedAt.value = detail.updatedAt
      diagramName.value = detail.name
      voltageLevel.value = detail.voltageLevel ?? ''
      // Keep the editor dirty if the user changed the drawing while the request was in flight.
      savedJson.value = submittedJson
      return detail
    } finally {
      saving.value = false
    }
  }

  /** 将低压进线 / 出线组合回路拆成可独立编辑的单元，保留外部接线与回路名称。 */
  const explodeComposite = (id: string): boolean => {
    const source = doc.value.nodes.find((item) => item.id === id)
    if (!source || (source.type !== 'lvIncoming' && source.type !== 'lvOutgoing')) return false
    if (source.locked) {
      ElMessage.info('设备已锁定，请先解锁后再拆分')
      return false
    }

    const incoming = source.type === 'lvIncoming'
    const hasBreaker = source.props.includeBreaker !== 'false'
    const partTypes: SymbolType[] = incoming
      ? ['flowArrowLeft', ...(hasBreaker ? (['systemBreaker'] as SymbolType[]) : []), 'ctGroup']
      : [
          'drawoutLeft',
          ...(hasBreaker ? (['systemBreaker'] as SymbolType[]) : []),
          'drawoutRight',
          'ctGroup',
          'flowArrow',
        ]

    const gap = 14
    const radians = (source.rotation * Math.PI) / 180
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    const toWorld = (localX: number, localY: number) => ({
      x: source.x + localX * cos - localY * sin,
      y: source.y + localX * sin + localY * cos,
    })

    const parts: DiagramNode[] = []
    let cursor = -source.width / 2
    for (const type of partTypes) {
      const def = getSymbol(type)
      const center = toWorld(cursor + def.width / 2, 0)
      const isBreaker = type === 'systemBreaker'
      parts.push({
        id: createId(type),
        type,
        x: center.x,
        y: center.y,
        width: def.width,
        height: def.height,
        rotation: source.rotation,
        label: isBreaker ? source.label : '',
        name: '',
        props: {},
        color: isBreaker ? source.props.accentColor : source.color,
        showLabel: isBreaker ? source.showLabel : true,
        locked: false,
      })
      cursor += def.width + gap
    }

    const bounds = parts.map(getNodeBounds)
    const minX = Math.min(...bounds.map((item) => item.minX))
    const minY = Math.min(...bounds.map((item) => item.minY))
    const maxX = Math.max(...bounds.map((item) => item.maxX))
    const maxY = Math.max(...bounds.map((item) => item.maxY))

    const name = source.name.trim()
    let nameNode: DiagramNode | null = null
    if (name && source.showLabel) {
      const width = Math.min(520, Math.max(120, Math.ceil(name.length * 14 + 16)))
      const isBottom = getSymbol(source.type).labelPlacement === 'bottom'
      const x = isBottom ? (minX + maxX) / 2 : maxX + 11 + width / 2
      const y = isBottom ? maxY + 38 : (minY + maxY) / 2
      nameNode = {
        id: createId('text'),
        type: 'text',
        x,
        y,
        width,
        height: 28,
        rotation: 0,
        label: '',
        name: '',
        props: { text: name, fontSize: '12' },
        showLabel: true,
        locked: false,
      }
    }

    const internalEdges: DiagramEdge[] = []
    for (let index = 0; index < parts.length - 1; index += 1) {
      internalEdges.push({
        id: createId('wire'),
        from: { nodeId: parts[index].id, portId: 'right' },
        to: { nodeId: parts[index + 1].id, portId: 'left' },
        kind: 'main',
        label: '',
        color: source.color,
      })
    }

    const first = parts[0]
    const last = parts[parts.length - 1]
    mutate('拆分组合回路', () => {
      for (const edge of doc.value.edges) {
        if (edge.from.nodeId === source.id) {
          const onRight = edge.from.portId === 'right'
          edge.from = {
            nodeId: onRight ? last.id : first.id,
            portId: onRight ? 'right' : 'left',
          }
        }
        if (edge.to.nodeId === source.id) {
          const onRight = edge.to.portId === 'right'
          edge.to = {
            nodeId: onRight ? last.id : first.id,
            portId: onRight ? 'right' : 'left',
          }
        }
      }
      doc.value.nodes = doc.value.nodes.filter((item) => item.id !== source.id)
      doc.value.nodes.push(...parts)
      if (nameNode) doc.value.nodes.push(nameNode)
      doc.value.edges.push(...internalEdges)
    })

    selectedNodeIds.value = [...parts.map((item) => item.id), ...(nameNode ? [nameNode.id] : [])]
    selectedEdgeIds.value = []
    mode.value = 'select'
    return true
  }

  const getSelectedNodeBounds = () => {
    if (selectedNodes.value.length === 0) return null
    const bounds = selectedNodes.value.map(getNodeBounds)
    return {
      minX: Math.min(...bounds.map((bound) => bound.minX)),
      minY: Math.min(...bounds.map((bound) => bound.minY)),
      maxX: Math.max(...bounds.map((bound) => bound.maxX)),
      maxY: Math.max(...bounds.map((bound) => bound.maxY)),
    }
  }

  const getPortsForNode = (nodeId: string) => {
    const node = doc.value.nodes.find((item) => item.id === nodeId)
    return node ? getNodePorts(node) : []
  }

  return {
    diagramId,
    diagramName,
    voltageLevel,
    doc,
    savedAt,
    loading,
    saving,
    mode,
    wireKind,
    setWireKind,
    selectedNodeIds,
    selectedEdgeIds,
    selectedNodes,
    selectedEdges,
    selectionCount,
    selectionKind,
    dirty,
    canUndo,
    canRedo,
    zoom,
    pan,
    pointer,
    viewportSize,
    past,
    future,
    lastAction,
    currentMode,
    beginChange,
    endChange,
    mutate,
    undo,
    redo,
    setMode,
    selectNode,
    toggleNode,
    selectNodes,
    selectEdge,
    clearSelection,
    addNode,
    addNodeAtViewportCenter,
    addEdge,
    explodeComposite,
    updateNode,
    updateNodeSilent,
    updateNodesSilent,
    updateEdge,
    updateEdgeSilent,
    deleteSelected,
    rotateSelected,
    flipSelected,
    nudgeSelected,
    copySelected,
    duplicateSelected,
    pasteClipboard,
    alignSelected,
    distributeSelected,
    resetNodeSize,
    updateSettings,
    updateMeta,
    updateMetaSilent,
    updatePaper,
    replaceDocument,
    setViewport,
    setViewportSize,
    fitView,
    loadDocument,
    startNewDocument,
    attachDiagramDetail,
    save,
    getSelectedNodeBounds,
    getPortsForNode,
    cleanSelection,
  }
})
