import { getSymbol, SYMBOLS } from '../data/symbols'
import type {
  CanvasSettings,
  DiagramDocument,
  DiagramNode,
  DrawingMeta,
  PaperSettings,
  Rotation,
  SymbolType,
} from '../types/diagram'

export const PAPER_PRESETS = {
  A3: { landscape: { width: 1600, height: 1131 }, portrait: { width: 1131, height: 1600 } },
  A4: { landscape: { width: 1200, height: 848 }, portrait: { width: 848, height: 1200 } },
} as const

export const createId = (prefix = 'el'): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export const today = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const defaultMeta = (title = '未命名接线图'): DrawingMeta => ({
  title,
  drawingNo: '',
  project: '',
  voltageLevel: '',
  designer: '',
  checker: '',
  date: today(),
  company: '',
  scale: 'NTS',
})

export const defaultSettings = (): CanvasSettings => ({
  gridSize: 20,
  snapToGrid: true,
  showGrid: true,
  showTitleBlock: true,
  showLabels: false,
})

export const paperFor = (
  size: PaperSettings['size'] = 'A3',
  orientation: PaperSettings['orientation'] = 'landscape',
): PaperSettings => {
  const dimensions = PAPER_PRESETS[size][orientation]
  return { size, orientation, width: dimensions.width, height: dimensions.height }
}

export const blankDocument = (title = '未命名接线图'): DiagramDocument => ({
  schemaVersion: 1,
  paper: paperFor('A3', 'landscape'),
  settings: defaultSettings(),
  meta: defaultMeta(title),
  nodes: [],
  edges: [],
})

export const nextTag = (nodes: DiagramNode[], type: SymbolType): string => {
  const def = getSymbol(type)
  const pattern = new RegExp(`^${def.code}(\\d+)$`)
  let highest = 0
  for (const node of nodes) {
    const match = node.label.match(pattern)
    if (match) {
      highest = Math.max(highest, Number(match[1]))
    }
  }
  return `${def.code}${highest + 1}`
}

export const createNode = (
  type: SymbolType,
  x: number,
  y: number,
  existingNodes: DiagramNode[] = [],
): DiagramNode => {
  const def = getSymbol(type)
  const label = type === 'text' ? '' : type === 'junction' ? '' : nextTag(existingNodes, type)
  return {
    id: createId(type),
    type,
    x,
    y,
    width: def.width,
    height: def.height,
    rotation: 0,
    label,
    name: type === 'text' ? '' : '',
    props: type === 'text' ? { text: '说明文字' } : {},
    showLabel: type !== 'junction',
    locked: false,
  }
}

const isRotation = (value: unknown): value is Rotation =>
  value === 0 || value === 90 || value === 180 || value === 270

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

export const normalizeDocument = (input: unknown): DiagramDocument => {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const paperInput = source.paper && typeof source.paper === 'object'
    ? (source.paper as Record<string, unknown>)
    : {}
  const settingsInput = source.settings && typeof source.settings === 'object'
    ? (source.settings as Record<string, unknown>)
    : {}
  const metaInput = source.meta && typeof source.meta === 'object'
    ? (source.meta as Record<string, unknown>)
    : {}
  const rawNodes = Array.isArray(source.nodes) ? source.nodes : []
  const rawEdges = Array.isArray(source.edges) ? source.edges : []

  const nodes = rawNodes
    .filter((node): node is Record<string, unknown> => !!node && typeof node === 'object')
    .map((node): DiagramNode | null => {
      const type = node.type as SymbolType
      if (!SYMBOLS[type]) return null
      const def = getSymbol(type)
      const props =
        node.props && typeof node.props === 'object'
          ? Object.fromEntries(
              Object.entries(node.props as Record<string, unknown>).map(([key, value]) => [
                key,
                String(value ?? ''),
              ]),
            )
          : {}
      return {
        id: asString(node.id) || createId(type),
        type,
        x: Number(node.x) || 0,
        y: Number(node.y) || 0,
        width: Number(node.width) > 0 ? Number(node.width) : def.width,
        height: Number(node.height) > 0 ? Number(node.height) : def.height,
        rotation: isRotation(node.rotation) ? node.rotation : 0,
        label: asString(node.label),
        name: asString(node.name),
        props,
        color: asString(node.color) || undefined,
        showLabel: asBoolean(node.showLabel, type !== 'junction'),
        locked: asBoolean(node.locked, false),
      }
    })
    .filter((node): node is DiagramNode => node !== null)

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = rawEdges
    .filter((edge): edge is Record<string, unknown> => !!edge && typeof edge === 'object')
    .map((edge) => {
      const from = edge.from && typeof edge.from === 'object'
        ? (edge.from as Record<string, unknown>)
        : {}
      const to = edge.to && typeof edge.to === 'object'
        ? (edge.to as Record<string, unknown>)
        : {}
      const kind = ['main', 'control', 'earth', 'bus'].includes(String(edge.kind))
        ? (edge.kind as 'main' | 'control' | 'earth' | 'bus')
        : 'main'
      if (!nodeIds.has(asString(from.nodeId)) || !nodeIds.has(asString(to.nodeId))) {
        return null
      }
      return {
        id: asString(edge.id) || createId('wire'),
        from: { nodeId: asString(from.nodeId), portId: asString(from.portId, 'bottom') },
        to: { nodeId: asString(to.nodeId), portId: asString(to.portId, 'top') },
        kind,
        label: asString(edge.label),
        color: asString(edge.color) || undefined,
        dashed: typeof edge.dashed === 'boolean' ? edge.dashed : undefined,
        arrow: asBoolean(edge.arrow, false),
      }
    })
    .filter((edge): edge is NonNullable<typeof edge> => edge !== null)

  const orientation: PaperSettings['orientation'] =
    paperInput.orientation === 'portrait' ? 'portrait' : 'landscape'
  const size: PaperSettings['size'] = paperInput.size === 'A4' ? 'A4' : 'A3'
  const preferredPaper = paperFor(size, orientation)

  return {
    schemaVersion: 1,
    paper: {
      size,
      orientation,
      width: Number(paperInput.width) > 0 ? Number(paperInput.width) : preferredPaper.width,
      height: Number(paperInput.height) > 0 ? Number(paperInput.height) : preferredPaper.height,
    },
    settings: {
      gridSize: Number(settingsInput.gridSize) > 0 ? Number(settingsInput.gridSize) : 20,
      snapToGrid: asBoolean(settingsInput.snapToGrid, true),
      showGrid: asBoolean(settingsInput.showGrid, true),
      showTitleBlock: asBoolean(settingsInput.showTitleBlock, true),
      // 旧图纸没有该字段时保持原有“显示标注”的行为。
      showLabels: asBoolean(settingsInput.showLabels, true),
    },
    meta: {
      ...defaultMeta(),
      title: asString(metaInput.title, '未命名接线图'),
      drawingNo: asString(metaInput.drawingNo),
      project: asString(metaInput.project),
      voltageLevel: asString(metaInput.voltageLevel),
      designer: asString(metaInput.designer),
      checker: asString(metaInput.checker),
      date: asString(metaInput.date, today()),
      company: asString(metaInput.company),
      scale: asString(metaInput.scale, 'NTS'),
    },
    nodes,
    edges,
  }
}

export const cloneDocument = (doc: DiagramDocument): DiagramDocument =>
  JSON.parse(JSON.stringify(doc)) as DiagramDocument

export const clampNodeSize = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback
  return Math.min(Math.max(value, 8), 2400)
}
