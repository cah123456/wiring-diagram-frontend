import { getSymbol } from '../data/symbols'
import type {
  BayKind,
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  GeneratorConfig,
  SymbolType,
  WireKind,
} from '../types/diagram'
import { blankDocument, createId, createNode } from './document'
import { getBusbarPortId } from './geometry'

interface BayDefinition {
  kind: BayKind
  title: string
  shortName: string
  chain: SymbolType[]
  endpointText: string
  supportsAccessories: boolean
}

const BAY_DEFINITIONS: Record<BayKind, BayDefinition> = {
  incoming: {
    kind: 'incoming',
    title: '进线柜',
    shortName: '进线',
    chain: ['drawoutBreaker', 'ct', 'cable'],
    endpointText: '进线电缆',
    supportsAccessories: true,
  },
  outgoing: {
    kind: 'outgoing',
    title: '馈线柜',
    shortName: '馈线',
    chain: ['drawoutBreaker', 'ct', 'cable'],
    endpointText: '出线电缆',
    supportsAccessories: true,
  },
  busTie: {
    kind: 'busTie',
    title: '母联柜',
    shortName: '母联',
    chain: ['drawoutBreaker', 'ct', 'cable'],
    endpointText: '联络回路',
    supportsAccessories: true,
  },
  pt: {
    kind: 'pt',
    title: 'PT 柜',
    shortName: 'PT',
    chain: ['fuse', 'pt'],
    endpointText: '电压互感器',
    supportsAccessories: false,
  },
  capacitor: {
    kind: 'capacitor',
    title: '电容器柜',
    shortName: '电容',
    chain: ['drawoutBreaker', 'ct', 'capacitor'],
    endpointText: '电容器组',
    supportsAccessories: true,
  },
  transformer: {
    kind: 'transformer',
    title: '站用变柜',
    shortName: '站用变',
    chain: ['drawoutBreaker', 'transformer', 'cable'],
    endpointText: '低压侧出线',
    supportsAccessories: true,
  },
}

const BAY_SPACING = 280
const CHAIN_TOP = 205
const CHAIN_GAP = 22
const MAX_BAYS = 5

interface GeneratorBay {
  definition: BayDefinition
  index: number
}

const flattenBays = (config: GeneratorConfig): GeneratorBay[] => {
  const result: GeneratorBay[] = []
  let index = 0
  for (const row of config.bays) {
    const definition = BAY_DEFINITIONS[row.type]
    if (!definition) continue
    for (let i = 0; i < row.count; i += 1) {
      if (result.length >= MAX_BAYS) break
      result.push({ definition, index })
      index += 1
    }
  }
  return result
}

const makeNode = (
  nodes: DiagramNode[],
  type: SymbolType,
  x: number,
  y: number,
  label: string,
): DiagramNode => {
  const node = createNode(type, x, y, nodes)
  node.label = type === 'text' || type === 'junction' ? '' : label
  node.name = ''
  if (type === 'text') {
    node.props.text = label
    node.width = 230
    node.height = 42
  }
  nodes.push(node)
  return node
}

const connect = (
  edges: DiagramEdge[],
  from: DiagramNode,
  fromPort: string,
  to: DiagramNode,
  toPort: string,
  kind: WireKind = 'main',
  label = '',
) => {
  edges.push({
    id: createId('wire'),
    from: { nodeId: from.id, portId: fromPort },
    to: { nodeId: to.id, portId: toPort },
    kind,
    label,
  })
}

const tagFor = (type: SymbolType, bayNumber: number): string => {
  switch (type) {
    case 'drawoutBreaker':
    case 'breaker':
      return `QF${bayNumber}`
    case 'ct':
      return `TA${bayNumber}`
    case 'cable':
      return `W${bayNumber}`
    case 'fuse':
      return `FU${bayNumber}`
    case 'pt':
      return `TV${bayNumber}`
    case 'capacitor':
      return `C${bayNumber}`
    case 'transformer':
      return `T${bayNumber}`
    case 'earthingSwitch':
      return `QE${bayNumber}`
    case 'arrester':
      return `FV${bayNumber}`
    default:
      return ''
  }
}

export const generateDiagram = (config: GeneratorConfig): DiagramDocument => {
  const doc = blankDocument(config.title || '开关柜一次接线图')
  doc.meta.title = config.title || '开关柜一次接线图'
  doc.meta.voltageLevel = config.voltageLevel
  doc.meta.designer = ''
  doc.meta.company = ''
  doc.meta.scale = 'NTS'

  const bays = flattenBays(config)
  if (bays.length === 0) return doc

  const paperWidth = doc.paper.width
  const centerX = paperWidth / 2
  const startX = centerX - ((bays.length - 1) * BAY_SPACING) / 2
  const busbarWidth = Math.min(paperWidth - 160, (bays.length - 1) * BAY_SPACING + 460)
  const busbarNode = makeNode(
    doc.nodes,
    'busbar',
    centerX,
    150,
    'WB1',
  )
  busbarNode.width = busbarWidth
  busbarNode.name = `${config.voltageLevel || '10kV'} I段母线`

  const captions: { x: number; caption: string }[] = []
  let globalBottom = 0

  bays.forEach(({ definition }, bayIndex) => {
    const x = startX + bayIndex * BAY_SPACING
    const bayNumber = bayIndex + 1
    const needsBranch =
      definition.supportsAccessories && (config.includeEarthSwitch || config.includeArrester)
    const sequence: SymbolType[] = [...definition.chain]
    if (needsBranch && sequence.length >= 2) {
      sequence.splice(sequence.length - 1, 0, 'junction')
    }

    const positioned: DiagramNode[] = []
    let cursor = CHAIN_TOP
    for (const type of sequence) {
      const def = getSymbol(type)
      const y = cursor + def.height / 2
      const node = makeNode(doc.nodes, type, x, y, tagFor(type, bayNumber))
      positioned.push(node)
      cursor = y + def.height / 2 + CHAIN_GAP
    }
    globalBottom = Math.max(globalBottom, cursor)

    const junction = positioned.find((node) => node.type === 'junction')

    for (let i = 1; i < positioned.length; i += 1) {
      connect(doc.edges, positioned[i - 1], 'bottom', positioned[i], 'top', 'main')
    }

    const first = positioned[0]
    if (first) {
      connect(
        doc.edges,
        busbarNode,
        getBusbarPortId(busbarNode, 'bottom', x),
        first,
        'top',
        'main',
      )
    }

    if (junction) {
      const earthOffset = 122
      if (config.includeEarthSwitch) {
        const earthDef = getSymbol('earthingSwitch')
        const earth = makeNode(
          doc.nodes,
          'earthingSwitch',
          x + earthOffset,
          junction.y + earthDef.height / 2 - 54,
          tagFor('earthingSwitch', bayNumber),
        )
        connect(doc.edges, junction, 'right', earth, 'left', 'earth', '')
        globalBottom = Math.max(globalBottom, earth.y + earth.height / 2)
      }
      if (config.includeArrester) {
        const arresterDef = getSymbol('arrester')
        const arrester = makeNode(
          doc.nodes,
          'arrester',
          x - earthOffset,
          junction.y + arresterDef.height / 2 - 44,
          tagFor('arrester', bayNumber),
        )
        connect(doc.edges, junction, 'left', arrester, 'right', 'main')
        globalBottom = Math.max(globalBottom, arrester.y + arrester.height / 2)
      }
    }

    captions.push({
      x,
      caption: `${String(bayNumber).padStart(2, '0')}# ${definition.title}`,
    })
  })

  const captionY = Math.min(Math.max(globalBottom + 44, 810), 902)
  for (const item of captions) {
    makeNode(doc.nodes, 'text', item.x, captionY, item.caption)
  }

  const legendY = Math.min(captionY + 66, 944)
  makeNode(
    doc.nodes,
    'text',
    286,
    legendY,
    '一次系统单线图 · 符号依据 GB/T 4728 常用画法绘制',
  )

  return doc
}

export const BAY_OPTIONS: {
  value: BayKind
  label: string
  description: string
}[] = [
  { value: 'incoming', label: '进线柜', description: '主电源进线，断路器 + CT + 电缆' },
  { value: 'outgoing', label: '馈线柜', description: '负荷馈出，断路器 + CT + 电缆' },
  { value: 'pt', label: 'PT 柜', description: '母线电压测量，熔断器 + 电压互感器' },
  { value: 'capacitor', label: '电容器柜', description: '无功补偿，断路器 + CT + 电容器' },
  { value: 'transformer', label: '站用变柜', description: '站用电源，断路器 + 干式变压器' },
]

export const bayName = (kind: BayKind): string => BAY_DEFINITIONS[kind]?.title ?? kind
