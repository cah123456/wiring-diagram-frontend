<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { SYMBOLS } from '../../data/symbols'
import { WIRE_KINDS } from '../../data/wireStyles'
import { useEditorStore } from '../../stores/editor'
import type { DiagramEdge, DiagramNode, Point, PortDirection, SymbolType } from '../../types/diagram'
import type { NodePortLayout } from '../../utils/geometry'
import {
  boundsFromPoints,
  boundsIntersect,
  clamp,
  distance,
  getBusbarPortId,
  getNodeBounds,
  getNodePorts,
  orthogonalRoute,
  rotateVector,
  roundedPath,
  snapValue,
} from '../../utils/geometry'
import { readSymbolDrag, SYMBOL_DRAG_TYPE } from '../../utils/dnd'
import SymbolNode from './SymbolNode.vue'
import WireEdge from './WireEdge.vue'
import TitleBlockGraphic from './TitleBlockGraphic.vue'

interface PortEntry {
  node: DiagramNode
  port: NodePortLayout
}

interface PanInteraction {
  kind: 'pan'
  pointerId: number
  startClient: Point
  startPan: Point
}

interface NodeInteraction {
  kind: 'nodes'
  pointerId: number
  startWorld: Point
  initial: Array<{ id: string; x: number; y: number }>
  anchorId: string
  moved: boolean
}

interface ResizeInteraction {
  kind: 'resize'
  pointerId: number
  nodeId: string
  /** 固定不动的另一端，拖动时只改变长度和中心位置。 */
  fixed: Point
  /** 从固定端指向被拖动端点的单位向量。 */
  direction: Point
  moved: boolean
}

interface MarqueeInteraction {
  kind: 'marquee'
  pointerId: number
  start: Point
  current: Point
  additive: boolean
}

interface WireInteraction {
  kind: 'wire'
  pointerId: number
  start: Point
  startDir: PortDirection
  startNodeId: string
  startPortId: string
  current: Point
  moved: boolean
}

type Interaction =
  | PanInteraction
  | NodeInteraction
  | ResizeInteraction
  | MarqueeInteraction
  | WireInteraction

interface MovingNode {
  node: DiagramNode
  x: number
  y: number
}

interface SnapGuide {
  x: number
  y: number
  kind: 'port' | 'busbar'
}

const store = useEditorStore()

const shellRef = ref<HTMLDivElement>()
const stageRef = ref<SVGSVGElement>()
const hoveredNodeId = ref('')
const spacePressed = ref(false)
const dragActive = ref(false)
const interaction = ref<Interaction | null>(null)
const dragSnap = ref<SnapGuide | null>(null)

let resizeObserver: ResizeObserver | null = null
let didInitialFit = false

const MIN_ZOOM = 0.15
const MAX_ZOOM = 4
const PORT_HIT_PIXELS = 16
const NODE_SNAP_PIXELS = 12
const BODY_SNAP_PIXELS = 12
const MIN_RESIZE_LENGTH = 40

const nodeLookup = computed(() => new Map(store.doc.nodes.map((node) => [node.id, node])))
const canvasTransform = computed(
  () => `translate(${store.pan.x} ${store.pan.y}) scale(${store.zoom})`,
)
const resizeTarget = computed<DiagramNode | null>(() => {
  if (store.mode !== 'select' || store.selectedNodeIds.length !== 1) return null
  const node = nodeLookup.value.get(store.selectedNodeIds[0])
  if (!node || node.locked || !SYMBOLS[node.type]?.resizable) return null
  return node
})
const resizeHandles = computed(() => {
  const node = resizeTarget.value
  if (!node) return []
  const axis = rotateVector({ x: 1, y: 0 }, node.rotation)
  const half = node.width / 2
  return [
    { side: 'left' as const, x: node.x - axis.x * half, y: node.y - axis.y * half },
    { side: 'right' as const, x: node.x + axis.x * half, y: node.y + axis.y * half },
  ]
})

const nodePorts = computed(() =>
  store.doc.nodes.map((node) => ({ node, ports: getNodePorts(node) })),
)
const allPorts = computed<PortEntry[]>(() =>
  nodePorts.value.flatMap((entry) => entry.ports.map((port) => ({ node: entry.node, port }))),
)

const wiring = computed<WireInteraction | null>(() =>
  interaction.value?.kind === 'wire' ? interaction.value : null,
)

const portNodes = computed(() => {
  const showAll = store.mode === 'wire' || wiring.value !== null
  const selected = new Set(store.selectedNodeIds)
  return nodePorts.value.filter(
    (entry) =>
      entry.ports.length > 0 &&
      (showAll || selected.has(entry.node.id) || entry.node.id === hoveredNodeId.value),
  )
})

const nearestPort = (point: Point, excludeNodeId = ''): PortEntry | null => {
  const threshold = PORT_HIT_PIXELS / Math.max(store.zoom, MIN_ZOOM)
  let result: PortEntry | null = null
  let resultDistance = threshold
  for (const entry of allPorts.value) {
    if (excludeNodeId && entry.node.id === excludeNodeId) continue
    const distanceToPort = distance(point, { x: entry.port.x, y: entry.port.y })
    if (distanceToPort <= resultDistance) {
      result = entry
      resultDistance = distanceToPort
    }
  }
  return result
}

/**
 * 连线落点吸附：
 * 1) 优先吸附到最近的可连接端口；
 * 2) 否则落在设备 / 母线本体上时，自动取该设备最近的端口；
 * 3) 母线按落点所在的上下边与 x 坐标映射到母线端口。
 */
const snapPortForPoint = (point: Point, excludeNodeId = ''): PortEntry | null => {
  const direct = nearestPort(point, excludeNodeId)
  if (direct) return direct

  const bodyThreshold = BODY_SNAP_PIXELS / Math.max(store.zoom, MIN_ZOOM)
  const nodes = store.doc.nodes
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index]
    if (node.id === excludeNodeId) continue
    const def = SYMBOLS[node.type]
    if (!def || def.portMode === 'none') continue
    const bounds = getNodeBounds(node)
    if (
      point.x < bounds.minX - bodyThreshold ||
      point.x > bounds.maxX + bodyThreshold ||
      point.y < bounds.minY - bodyThreshold ||
      point.y > bounds.maxY + bodyThreshold
    ) {
      continue
    }

    if (def.portMode === 'busbar') {
      const side = point.y <= (bounds.minY + bounds.maxY) / 2 ? 'top' : 'bottom'
      const portId = getBusbarPortId(node, side, point.x)
      const port = getNodePorts(node).find((item) => item.id === portId)
      if (port) return { node, port }
    }

    const ports = getNodePorts(node)
    if (ports.length === 0) continue
    let closest = ports[0]
    let closestDistance = Infinity
    for (const port of ports) {
      const portDistance = distance(point, { x: port.x, y: port.y })
      if (portDistance < closestDistance) {
        closest = port
        closestDistance = portDistance
      }
    }
    return { node, port: closest }
  }
  return null
}

const portForNodePoint = (node: DiagramNode, point: Point): NodePortLayout | null => {
  const def = SYMBOLS[node.type]
  const ports = getNodePorts(node)
  if (ports.length === 0) return null
  if (def?.portMode === 'busbar') {
    const bounds = getNodeBounds(node)
    const side = point.y <= (bounds.minY + bounds.maxY) / 2 ? 'top' : 'bottom'
    const portId = getBusbarPortId(node, side, point.x)
    return ports.find((port) => port.id === portId) ?? ports[0]
  }
  let closest = ports[0]
  let closestDistance = Infinity
  for (const port of ports) {
    const portDistance = distance(point, { x: port.x, y: port.y })
    if (portDistance < closestDistance) {
      closest = port
      closestDistance = portDistance
    }
  }
  return closest
}

const directionsOpposite = (a: PortDirection, b: PortDirection): boolean =>
  (a === 'up' && b === 'down') ||
  (a === 'down' && b === 'up') ||
  (a === 'left' && b === 'right') ||
  (a === 'right' && b === 'left')

/**
 * 拖动设备时计算吸附偏移：设备端口吸附到其它设备端口，或吸附到母线上下边。
 */
const resolveNodeSnap = (
  moving: MovingNode[],
  stationary: DiagramNode[],
): { dx: number; dy: number; guide: SnapGuide | null } => {
  if (moving.length === 0) return { dx: 0, dy: 0, guide: null }
  const threshold = NODE_SNAP_PIXELS / Math.max(store.zoom, MIN_ZOOM)
  const busbars = stationary
    .filter((node) => SYMBOLS[node.type]?.portMode === 'busbar')
    .map((node) => {
      const bounds = getNodeBounds(node)
      const ports = getNodePorts(node)
      const surfaceA = ports.find((port) => port.id === 'top-0')
      const surfaceB = ports.find((port) => port.id === 'bottom-0')
      return {
        node,
        bounds,
        // 吸附到导体表面而不是节点外框，避免高节点（如通用汇流排）出现断口。
        surfaceMinY: surfaceA && surfaceB ? Math.min(surfaceA.y, surfaceB.y) : bounds.minY,
        surfaceMaxY: surfaceA && surfaceB ? Math.max(surfaceA.y, surfaceB.y) : bounds.maxY,
      }
    })
  const devicePorts = stationary
    .filter((node) => SYMBOLS[node.type]?.portMode !== 'busbar')
    .flatMap((node) => getNodePorts(node).map((port) => ({ node, port })))

  let best: { dx: number; dy: number; score: number; guide: SnapGuide } | null = null

  for (const item of moving) {
    const temp: DiagramNode = { ...item.node, x: item.x, y: item.y }
    for (const port of getNodePorts(temp)) {
      for (const target of devicePorts) {
        const dx = target.port.x - port.x
        const dy = target.port.y - port.y
        const gap = Math.hypot(dx, dy)
        if (gap > threshold) continue
        const score = directionsOpposite(port.dir, target.port.dir) ? gap : gap * 1.3
        if (!best || score < best.score) {
          best = {
            dx,
            dy,
            score,
            guide: { x: target.port.x, y: target.port.y, kind: 'port' },
          }
        }
      }

      if (port.dir !== 'up' && port.dir !== 'down') continue
      for (const busbar of busbars) {
        const bounds = busbar.bounds
        if (port.x < bounds.minX - threshold || port.x > bounds.maxX + threshold) continue
        if (busbar.surfaceMaxY - busbar.surfaceMinY < 0.1) continue
        const edges: Array<{ y: number; side: 'top' | 'bottom' }> = [
          { y: busbar.surfaceMinY, side: 'top' },
          { y: busbar.surfaceMaxY, side: 'bottom' },
        ]
        for (const edge of edges) {
          if (port.dir === 'down' && edge.side !== 'top') continue
          if (port.dir === 'up' && edge.side !== 'bottom') continue
          const dy = edge.y - port.y
          if (Math.abs(dy) > threshold) continue
          const score = Math.abs(dy) * 0.9
          if (!best || score < best.score) {
            best = {
              dx: 0,
              dy,
              score,
              guide: { x: port.x, y: edge.y, kind: 'busbar' },
            }
          }
        }
      }
    }
  }

  return best
    ? { dx: best.dx, dy: best.dy, guide: best.guide }
    : { dx: 0, dy: 0, guide: null }
}

const wireTarget = computed<PortEntry | null>(() => {
  const active = wiring.value
  if (!active) return null
  return snapPortForPoint(active.current, active.startNodeId)
})

const wirePreviewStyle = computed(() => {
  const def = WIRE_KINDS[store.wireKind] ?? WIRE_KINDS.main
  return { color: def.color, width: def.width, dash: def.dash }
})

const inferEndDirection = (start: Point, end: Point): PortDirection => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'left' : 'right'
  return dy >= 0 ? 'up' : 'down'
}

const wirePreview = computed(() => {
  const active = wiring.value
  if (!active) return null
  const target = wireTarget.value
  const end = target
    ? { x: target.port.x, y: target.port.y }
    : { x: active.current.x, y: active.current.y }
  const endDir = target ? target.port.dir : inferEndDirection(active.start, end)
  const points = orthogonalRoute(active.start, active.startDir, end, endDir)
  return {
    path: roundedPath(points, 6),
    end,
    targetNodeId: target?.node.id ?? '',
    targetPortId: target?.port.id ?? '',
  }
})

const marqueeRect = computed(() => {
  const active = interaction.value
  if (!active || active.kind !== 'marquee') return null
  const bounds = boundsFromPoints(active.start, active.current)
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  }
})

const cursorState = computed(() => {
  if (interaction.value?.kind === 'pan') return 'is-panning'
  if (spacePressed.value || store.mode === 'pan') return 'is-pannable'
  if (store.mode === 'wire' || interaction.value?.kind === 'wire') return 'is-wiring'
  return 'is-selecting'
})

const isStartPort = (nodeId: string, portId: string): boolean => {
  const active = wiring.value
  return !!active && active.startNodeId === nodeId && active.startPortId === portId
}

const isTargetPort = (nodeId: string, portId: string): boolean =>
  wirePreview.value?.targetNodeId === nodeId && wirePreview.value?.targetPortId === portId

const clientToWorld = (event: { clientX: number; clientY: number }): Point => {
  const rect = stageRef.value?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }
  return {
    x: (event.clientX - rect.left - store.pan.x) / store.zoom,
    y: (event.clientY - rect.top - store.pan.y) / store.zoom,
  }
}

/**
 * 画布 pointerdown 会 preventDefault，输入框不会自然失焦。
 * 在切换选择前主动 blur，让 el-input-number 的 change 和文本编辑事务正常提交。
 */
const commitPendingInput = () => {
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return
  if (
    active.closest(
      'input, textarea, select, [contenteditable="true"], .el-input-number, .el-select',
    )
  ) {
    active.blur()
  }
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], .el-select'),
  )
}

const attachWindowListeners = () => {
  window.addEventListener('pointermove', onWindowPointerMove)
  window.addEventListener('pointerup', onWindowPointerUp)
  window.addEventListener('pointercancel', onWindowPointerCancel)
}

const detachWindowListeners = () => {
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', onWindowPointerUp)
  window.removeEventListener('pointercancel', onWindowPointerCancel)
}

const finishInteraction = () => {
  detachWindowListeners()
  interaction.value = null
  dragSnap.value = null
}

const onWindowPointerMove = (event: PointerEvent) => {
  const active = interaction.value
  if (!active || event.pointerId !== active.pointerId) return

  if (active.kind === 'pan') {
    store.setViewport(store.zoom, {
      x: active.startPan.x + event.clientX - active.startClient.x,
      y: active.startPan.y + event.clientY - active.startClient.y,
    })
    return
  }

  const world = clientToWorld(event)
  if (active.kind === 'nodes') {
    let dx = world.x - active.startWorld.x
    let dy = world.y - active.startWorld.y
    if (Math.hypot(dx * store.zoom, dy * store.zoom) > 1.5) active.moved = true
    const grid = store.doc.settings.gridSize
    const snap = store.doc.settings.snapToGrid
    if (snap) {
      // 只吸附锚点（被按下的节点），整组共享同一个位移，避免相对位置漂移。
      const anchor =
        active.initial.find((item) => item.id === active.anchorId) ?? active.initial[0]
      dx = snapValue(anchor.x + dx, grid) - anchor.x
      dy = snapValue(anchor.y + dy, grid) - anchor.y
    }
    const movedIds = new Set(active.initial.map((item) => item.id))
    const positions: MovingNode[] = []
    for (const item of active.initial) {
      const node = nodeLookup.value.get(item.id)
      if (!node) continue
      positions.push({ node, x: item.x + dx, y: item.y + dy })
    }
    const stationary = store.doc.nodes.filter((node) => !movedIds.has(node.id))
    const adjustment = resolveNodeSnap(positions, stationary)
    dragSnap.value = adjustment.guide
    for (const item of positions) {
      store.updateNodeSilent(item.node.id, {
        x: item.x + adjustment.dx,
        y: item.y + adjustment.dy,
      })
    }
    return
  }

  if (active.kind === 'resize') {
    const node = nodeLookup.value.get(active.nodeId)
    if (!node) return
    const fixed = active.fixed
    const direction = active.direction
    const rawLength =
      (world.x - fixed.x) * direction.x + (world.y - fixed.y) * direction.y
    let length = Math.max(MIN_RESIZE_LENGTH, rawLength)
    if (store.doc.settings.snapToGrid) {
      const grid = store.doc.settings.gridSize
      const end = {
        x: fixed.x + direction.x * length,
        y: fixed.y + direction.y * length,
      }
      if (Math.abs(direction.x) > Math.abs(direction.y)) {
        end.x = snapValue(end.x, grid)
      } else {
        end.y = snapValue(end.y, grid)
      }
      length = Math.max(
        MIN_RESIZE_LENGTH,
        (end.x - fixed.x) * direction.x + (end.y - fixed.y) * direction.y,
      )
    }
    active.moved = true
    store.updateNodeSilent(node.id, {
      x: fixed.x + (direction.x * length) / 2,
      y: fixed.y + (direction.y * length) / 2,
      width: length,
    })
    return
  }

  active.current = world
  if (active.kind === 'wire' && distance(active.start, world) * store.zoom > 2) {
    active.moved = true
  }
}

const onWindowPointerUp = (event: PointerEvent) => {
  const active = interaction.value
  if (!active || event.pointerId !== active.pointerId) return

  if (active.kind === 'nodes' || active.kind === 'resize') {
    store.endChange()
  } else if (active.kind === 'marquee') {
    const bounds = boundsFromPoints(active.start, active.current)
    const ids = store.doc.nodes
      .filter((node) => boundsIntersect(getNodeBounds(node), bounds))
      .map((node) => node.id)
    if (ids.length > 0) {
      store.selectNodes(ids, active.additive)
    } else if (!active.additive) {
      store.clearSelection()
    }
  } else if (active.kind === 'wire') {
    const target = snapPortForPoint(active.current, active.startNodeId)
    if (target) {
      store.addEdge(
        { nodeId: active.startNodeId, portId: active.startPortId },
        { nodeId: target.node.id, portId: target.port.id },
      )
    }
  }

  finishInteraction()
}

const onWindowPointerCancel = () => {
  const kind = interaction.value?.kind
  if (kind === 'nodes' || kind === 'resize') store.endChange()
  finishInteraction()
}

const beginPan = (event: PointerEvent) => {
  commitPendingInput()
  event.preventDefault()
  interaction.value = {
    kind: 'pan',
    pointerId: event.pointerId,
    startClient: { x: event.clientX, y: event.clientY },
    startPan: { ...store.pan },
  }
  attachWindowListeners()
}

const onStagePointerMove = (event: PointerEvent) => {
  store.pointer = clientToWorld(event)
}

const onStagePointerDown = (event: PointerEvent) => {
  if (event.button === 1 || store.mode === 'pan' || spacePressed.value) {
    beginPan(event)
    return
  }
  if (event.button !== 0) return

  commitPendingInput()
  event.preventDefault()
  if (!event.shiftKey) store.clearSelection()
  interaction.value = {
    kind: 'marquee',
    pointerId: event.pointerId,
    start: clientToWorld(event),
    current: clientToWorld(event),
    additive: event.shiftKey,
  }
  attachWindowListeners()
}

const onNodePointerDown = (event: PointerEvent, node: DiagramNode) => {
  if (spacePressed.value || store.mode === 'pan') return
  if (event.button !== 0) return

  commitPendingInput()
  event.stopPropagation()
  event.preventDefault()

  if (store.mode === 'wire') {
    const closest = portForNodePoint(node, clientToWorld(event))
    if (closest) beginWire(node, closest, event.pointerId)
    return
  }

  const additive = event.shiftKey
  const wasSelected = store.selectedNodeIds.includes(node.id)

  if (additive) {
    store.toggleNode(node.id)
    if (!store.selectedNodeIds.includes(node.id)) return
  } else if (!wasSelected) {
    store.selectNode(node.id)
  }

  const movable = store.selectedNodes.filter((item) => !item.locked)
  if (movable.length === 0) return

  store.beginChange('移动设备')
  interaction.value = {
    kind: 'nodes',
    pointerId: event.pointerId,
    startWorld: clientToWorld(event),
    initial: movable.map((item) => ({ id: item.id, x: item.x, y: item.y })),
    anchorId: movable.some((item) => item.id === node.id) ? node.id : movable[0].id,
    moved: false,
  }
  attachWindowListeners()
}

/**
 * 拖动条状图形的左右端点调整长度；另一端保持不动，旋转后沿图形自身轴向伸缩。
 */
const onResizePointerDown = (event: PointerEvent, side: 'left' | 'right') => {
  const node = resizeTarget.value
  if (!node) return
  if (event.button !== 0 || spacePressed.value || store.mode !== 'select') return

  commitPendingInput()
  event.stopPropagation()
  event.preventDefault()

  const axis = rotateVector({ x: 1, y: 0 }, node.rotation)
  const half = node.width / 2
  const dragged = side === 'right' ? 1 : -1
  const fixed = {
    x: node.x - axis.x * half * dragged,
    y: node.y - axis.y * half * dragged,
  }
  const direction = { x: axis.x * dragged, y: axis.y * dragged }

  store.selectNode(node.id)
  store.beginChange('调整设备长度')
  interaction.value = {
    kind: 'resize',
    pointerId: event.pointerId,
    nodeId: node.id,
    fixed,
    direction,
    moved: false,
  }
  attachWindowListeners()
}

const onEdgePointerDown = (event: PointerEvent, edge: DiagramEdge) => {
  if (event.button !== 0) return
  commitPendingInput()
  store.selectEdge(edge.id, event.shiftKey)
}

const beginWire = (node: DiagramNode, port: NodePortLayout, pointerId: number) => {
  interaction.value = {
    kind: 'wire',
    pointerId,
    start: { x: port.x, y: port.y },
    startDir: port.dir,
    startNodeId: node.id,
    startPortId: port.id,
    current: { x: port.x, y: port.y },
    moved: false,
  }
  attachWindowListeners()
}

const onPortPointerDown = (event: PointerEvent, node: DiagramNode, port: NodePortLayout) => {
  if (event.button !== 0) return
  if (spacePressed.value || store.mode === 'pan') return
  commitPendingInput()
  event.stopPropagation()
  event.preventDefault()
  beginWire(node, port, event.pointerId)
}

const onNodeEnter = (nodeId: string) => {
  hoveredNodeId.value = nodeId
}

const onNodeLeave = (nodeId: string) => {
  if (hoveredNodeId.value === nodeId) hoveredNodeId.value = ''
}

const applyZoom = (nextZoom: number, anchor: Point) => {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
  const worldX = (anchor.x - store.pan.x) / store.zoom
  const worldY = (anchor.y - store.pan.y) / store.zoom
  store.setViewport(zoom, {
    x: anchor.x - worldX * zoom,
    y: anchor.y - worldY * zoom,
  })
}

const onWheel = (event: WheelEvent) => {
  const rect = stageRef.value?.getBoundingClientRect()
  if (!rect) return
  const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
  const factor = Math.exp(-delta * 0.0014)
  applyZoom(store.zoom * factor, {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  })
}

const fitView = () => {
  if (store.viewportSize.width < 20 || store.viewportSize.height < 20) return
  store.fitView(store.viewportSize.width, store.viewportSize.height, 56)
}

const zoomIn = () => {
  applyZoom(store.zoom * 1.2, {
    x: store.viewportSize.width / 2,
    y: store.viewportSize.height / 2,
  })
}

const zoomOut = () => {
  applyZoom(store.zoom / 1.2, {
    x: store.viewportSize.width / 2,
    y: store.viewportSize.height / 2,
  })
}

const zoomReset = () => {
  const zoom = 1
  store.setViewport(zoom, {
    x: (store.viewportSize.width - store.doc.paper.width * zoom) / 2,
    y: (store.viewportSize.height - store.doc.paper.height * zoom) / 2,
  })
}

const hasSymbolDrag = (event: DragEvent): boolean => {
  const types = event.dataTransfer?.types
  if (!types) return false
  return Array.from(types).includes(SYMBOL_DRAG_TYPE) || Array.from(types).includes('text/plain')
}

const onDragEnter = (event: DragEvent) => {
  if (!hasSymbolDrag(event)) return
  dragActive.value = true
}

const onDragOver = (event: DragEvent) => {
  if (!hasSymbolDrag(event)) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  dragActive.value = true
}

const onDragLeave = (event: DragEvent) => {
  const next = event.relatedTarget
  if (!(next instanceof Node) || !shellRef.value?.contains(next)) {
    dragActive.value = false
  }
}

const onDrop = (event: DragEvent) => {
  commitPendingInput()
  event.preventDefault()
  dragActive.value = false
  const payload = readSymbolDrag(event)
  if (!payload) return
  if (!Object.prototype.hasOwnProperty.call(SYMBOLS, payload.type)) return
  const world = clientToWorld(event)
  const grid = store.doc.settings.gridSize
  const snap = store.doc.settings.snapToGrid
  const type = payload.type as SymbolType
  const def = SYMBOLS[type]
  const x = snap ? snapValue(world.x, grid) : world.x
  const y = snap ? snapValue(world.y, grid) : world.y
  const preview: DiagramNode = {
    id: 'drop-preview',
    type,
    x,
    y,
    width: def.width,
    height: def.height,
    rotation: 0,
    label: '',
    name: '',
    props: {},
    showLabel: true,
    locked: false,
  }
  const adjustment = resolveNodeSnap([{ node: preview, x, y }], store.doc.nodes)
  store.addNode(type, x + adjustment.dx, y + adjustment.dy)
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.code === 'Escape') {
    if (interaction.value?.kind === 'wire' || interaction.value?.kind === 'marquee') {
      finishInteraction()
    }
    return
  }
  if (event.code !== 'Space' || isTypingTarget(event.target)) return
  if (interaction.value?.kind === 'nodes') return
  if (!spacePressed.value) spacePressed.value = true
  event.preventDefault()
}

const onKeyUp = (event: KeyboardEvent) => {
  if (event.code !== 'Space') return
  spacePressed.value = false
}

const onWindowBlur = () => {
  spacePressed.value = false
  if (interaction.value?.kind === 'nodes') store.endChange()
  finishInteraction()
}

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (!rect) return
    store.setViewportSize(rect.width, rect.height)
    if (!didInitialFit && rect.width > 80 && rect.height > 80) {
      didInitialFit = true
      requestAnimationFrame(fitView)
    }
  })
  if (shellRef.value) resizeObserver.observe(shellRef.value)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onWindowBlur)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  detachWindowListeners()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onWindowBlur)
})

watch(
  () => [store.doc.paper.width, store.doc.paper.height],
  () => {
    if (!didInitialFit) return
    requestAnimationFrame(fitView)
  },
)

defineExpose({ fitView, zoomIn, zoomOut, zoomReset })
</script>

<template>
  <div
    ref="shellRef"
    class="canvas-stage"
    :class="[cursorState, { 'is-drag-over': dragActive }]"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @contextmenu.prevent
  >
    <svg
      ref="stageRef"
      class="stage-svg"
      @pointerdown="onStagePointerDown"
      @pointermove="onStagePointerMove"
      @wheel.prevent="onWheel"
    >
      <defs>
        <pattern
          id="canvas-grid"
          :width="store.doc.settings.gridSize"
          :height="store.doc.settings.gridSize"
          patternUnits="userSpaceOnUse"
        >
          <path
            :d="`M ${store.doc.settings.gridSize} 0 L 0 0 0 ${store.doc.settings.gridSize}`"
            fill="none"
            stroke="#e3eae9"
            stroke-width="0.8"
          />
        </pattern>
        <marker
          id="wire-arrow"
          markerWidth="8"
          markerHeight="7"
          refX="7"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 8 3.5 L 0 7 z" fill="context-stroke" />
        </marker>
      </defs>

      <g class="diagram-world" :transform="canvasTransform">
        <rect
          class="paper-sheet"
          :width="store.doc.paper.width"
          :height="store.doc.paper.height"
          rx="1"
        />
        <rect
          v-if="store.doc.settings.showGrid"
          :width="store.doc.paper.width"
          :height="store.doc.paper.height"
          fill="url(#canvas-grid)"
          pointer-events="none"
        />

        <g pointer-events="none">
          <TitleBlockGraphic
            :paper="store.doc.paper"
            :meta="store.doc.meta"
            :show-title-block="store.doc.settings.showTitleBlock"
          />
        </g>

        <g class="edge-layer">
          <WireEdge
            v-for="edge in store.doc.edges"
            :key="edge.id"
            :edge="edge"
            :node-lookup="nodeLookup"
            :selected="store.selectedEdgeIds.includes(edge.id)"
            @pointerdown="onEdgePointerDown"
          />
        </g>

        <g class="node-layer">
          <SymbolNode
            v-for="node in store.doc.nodes"
            :key="node.id"
            :node="node"
            :selected="store.selectedNodeIds.includes(node.id)"
            :show-device-labels="store.doc.settings.showLabels"
            @pointerdown="onNodePointerDown"
            @enter="onNodeEnter"
            @leave="onNodeLeave"
          />
        </g>

        <g
          v-if="store.doc.nodes.length === 0"
          class="empty-guide"
          :transform="`translate(${store.doc.paper.width / 2} ${store.doc.paper.height / 2 - 26})`"
          pointer-events="none"
        >
          <rect x="-218" y="-92" width="436" height="184" rx="10" />
          <text class="empty-title" y="-16">从左侧符号库拖入设备开始绘制</text>
          <text class="empty-sub" y="14">或使用「配置生成」快速建立单母线一次接线图</text>
          <text class="empty-meta" y="52">GRIDLINE · GB/T 4728 / IEC 60617</text>
        </g>

        <g class="ports-layer">
          <g v-for="entry in portNodes" :key="entry.node.id" class="node-ports">
            <g
              v-for="port in entry.ports"
              :key="port.id"
              class="wire-port"
              :class="{
                'is-start': isStartPort(entry.node.id, port.id),
                'is-target': isTargetPort(entry.node.id, port.id),
              }"
              :transform="`translate(${port.x} ${port.y})`"
              @pointerdown="onPortPointerDown($event, entry.node, port)"
            >
              <circle class="port-hit" r="8" />
              <circle class="port-dot" r="2.6" />
              <circle class="port-ring" r="5.5" />
              <title>{{ entry.node.label || entry.node.name }} · {{ port.label || port.id }}</title>
            </g>
          </g>
        </g>

        <g
          v-if="resizeTarget"
          class="resize-layer"
          :class="resizeTarget.rotation % 180 === 0 ? 'is-horizontal' : 'is-vertical'"
        >
          <g
            v-for="handle in resizeHandles"
            :key="handle.side"
            class="resize-handle"
            :transform="`translate(${handle.x} ${handle.y})`"
            @pointerdown="onResizePointerDown($event, handle.side)"
          >
            <circle class="resize-hit" r="9" />
            <circle class="resize-dot" r="3.6" />
            <title>拖动调整长度</title>
          </g>
        </g>

        <g v-if="wirePreview" class="wire-preview" pointer-events="none">
          <path
            :d="wirePreview.path"
            fill="none"
            :stroke="wirePreviewStyle.color"
            :stroke-width="wirePreviewStyle.width"
            :stroke-dasharray="wirePreviewStyle.dash || '5 4'"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            :cx="wirePreview.end.x"
            :cy="wirePreview.end.y"
            r="3.4"
            :stroke="wirePreviewStyle.color"
          />
        </g>

        <g v-if="dragSnap" class="snap-guide" pointer-events="none">
          <circle class="snap-guide-halo" :cx="dragSnap.x" :cy="dragSnap.y" r="9" />
          <circle class="snap-guide-dot" :cx="dragSnap.x" :cy="dragSnap.y" r="3.2" />
        </g>

        <rect
          v-if="marqueeRect"
          class="marquee-box"
          :x="marqueeRect.x"
          :y="marqueeRect.y"
          :width="marqueeRect.width"
          :height="marqueeRect.height"
          pointer-events="none"
        />
      </g>
    </svg>

    <Transition name="drop-hint">
      <div v-if="dragActive" class="drop-hint">
        <span class="drop-cross">+</span>
        <span>松开以放置设备</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.canvas-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--canvas);
  background-image:
    radial-gradient(circle at 24% 18%, rgba(255, 255, 255, 0.5), transparent 36%),
    radial-gradient(circle at 80% 82%, rgba(143, 169, 166, 0.16), transparent 44%);
  outline: none;
  touch-action: none;
}

.stage-svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.canvas-stage.is-selecting .stage-svg {
  cursor: default;
}

.canvas-stage.is-wiring .stage-svg {
  cursor: crosshair;
}

.canvas-stage.is-pannable .stage-svg,
.canvas-stage.is-panning .stage-svg {
  cursor: grab;
}

.canvas-stage.is-panning .stage-svg {
  cursor: grabbing;
}

.canvas-stage.is-wiring :deep(.symbol-node) {
  cursor: crosshair;
}

.canvas-stage.is-pannable :deep(.symbol-node),
.canvas-stage.is-panning :deep(.symbol-node) {
  cursor: grab;
}

.paper-sheet {
  fill: var(--paper);
  pointer-events: none;
  filter: drop-shadow(0 16px 32px rgba(23, 45, 52, 0.16))
    drop-shadow(0 2px 4px rgba(23, 45, 52, 0.08));
}

.empty-guide rect {
  fill: rgba(250, 252, 251, 0.62);
  stroke: #cbd9d6;
  stroke-width: 1;
  stroke-dasharray: 5 5;
}

.empty-guide text {
  font-family: var(--font-sans);
  text-anchor: middle;
}

.empty-title {
  fill: #6f8387;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.empty-sub {
  fill: #9aa9ab;
  font-size: 12.5px;
}

.empty-meta {
  fill: #b3c0c0;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
}

.wire-port {
  cursor: crosshair;
}

.resize-layer {
  pointer-events: none;
}

.resize-handle {
  pointer-events: all;
}

.resize-layer.is-horizontal .resize-handle {
  cursor: ew-resize;
}

.resize-layer.is-vertical .resize-handle {
  cursor: ns-resize;
}

.resize-hit {
  fill: transparent;
  pointer-events: all;
}

.resize-dot {
  fill: #fff;
  stroke: #0b756c;
  stroke-width: 1.4;
  pointer-events: none;
  transition:
    fill 0.12s,
    stroke 0.12s;
}

.resize-handle:hover .resize-dot {
  fill: #0b756c;
  stroke: #fff;
}

.port-hit {
  fill: transparent;
  pointer-events: all;
}

.port-dot {
  fill: #fff;
  stroke: #5d9690;
  stroke-width: 1.3;
  pointer-events: none;
}

.port-ring {
  fill: none;
  stroke: #0b756c;
  stroke-width: 1.2;
  opacity: 0;
  pointer-events: none;
  transform-origin: center;
  transition:
    opacity 0.12s,
    r 0.12s;
}

.wire-port:hover .port-dot,
.wire-port.is-start .port-dot,
.wire-port.is-target .port-dot {
  fill: #0b756c;
  stroke: #fff;
}

.wire-port:hover .port-ring,
.wire-port.is-start .port-ring,
.wire-port.is-target .port-ring {
  opacity: 0.65;
}

.wire-port.is-target .port-ring {
  opacity: 1;
  stroke-width: 2;
  animation: target-pulse 1.1s ease-out infinite;
}

.wire-port.is-target .port-dot {
  r: 4;
  fill: #fff;
  stroke: #0b756c;
  stroke-width: 2.2;
}

@keyframes target-pulse {
  0% {
    r: 5;
    opacity: 0.9;
  }
  100% {
    r: 11;
    opacity: 0;
  }
}

.wire-preview circle {
  fill: #fff;
  stroke-width: 1.5;
}

.snap-guide-halo {
  fill: none;
  stroke: #0b756c;
  stroke-width: 1.4;
  stroke-dasharray: 3 2;
  opacity: 0.9;
}

.snap-guide-dot {
  fill: #0b756c;
  stroke: #fff;
  stroke-width: 1.4;
}

.marquee-box {
  fill: rgba(11, 117, 108, 0.06);
  stroke: #0b756c;
  stroke-width: 1;
  stroke-dasharray: 4 3;
}

.drop-hint {
  position: absolute;
  inset: 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: rgba(232, 244, 241, 0.6);
  border: 1.5px dashed rgba(11, 117, 108, 0.5);
  border-radius: 12px;
  pointer-events: none;
  backdrop-filter: blur(1px);
}

.drop-cross {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  font-size: 28px;
  font-weight: 300;
  background: #fff;
  border: 1px solid rgba(11, 117, 108, 0.24);
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(11, 117, 108, 0.12);
}

.drop-hint-enter-active,
.drop-hint-leave-active {
  transition: opacity 0.14s ease;
}

.drop-hint-enter-from,
.drop-hint-leave-to {
  opacity: 0;
}
</style>
