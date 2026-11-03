export type Rotation = 0 | 90 | 180 | 270

export type PortDirection = 'up' | 'down' | 'left' | 'right'

export type SymbolType =
  // 母线与线路
  | 'busbar'
  | 'busbarSection'
  | 'genericBar'
  // 低压配电系统图
  | 'lvIncoming'
  | 'lvOutgoing'
  | 'drawoutContact'
  | 'drawoutLeft'
  | 'drawoutRight'
  | 'ctGroup'
  | 'flowArrow'
  | 'flowArrowLeft'
  | 'systemBreaker'
  | 'acb'
  | 'mccb'
  | 'rcbo'
  | 'spd'
  | 'busway'
  | 'neutralBar'
  | 'peBar'
  // 一次开关与保护
  | 'breaker'
  | 'drawoutBreaker'
  | 'loadSwitch'
  | 'disconnector'
  | 'earthingSwitch'
  | 'threePositionSwitch'
  | 'fuse'
  | 'switchFuse'
  | 'contactor'
  | 'ats'
  | 'arrester'
  // 互感器
  | 'ct'
  | 'pt'
  | 'zeroSeqCT'
  // 变压与补偿
  | 'transformer'
  | 'transformer3w'
  | 'groundingTransformer'
  | 'reactor'
  | 'arcSuppressionCoil'
  | 'capacitor'
  | 'capacitorBank'
  // 电源与负荷
  | 'generator'
  | 'motor'
  | 'cable'
  | 'cableJoint'
  // 二次控制
  | 'terminal'
  | 'terminalBlock'
  | 'contactNO'
  | 'contactNC'
  | 'contactChangeover'
  | 'contactDelayNO'
  | 'contactDelayNC'
  | 'relayCoil'
  | 'timeRelayCoil'
  | 'pushButtonNO'
  | 'pushButtonNC'
  | 'emergencyStop'
  | 'selectorSwitch'
  | 'limitSwitch'
  | 'pressureSwitch'
  | 'temperatureSwitch'
  | 'thermalRelay'
  | 'mcb'
  | 'secondaryFuse'
  | 'link'
  | 'plug'
  // 二次测量
  | 'signalLamp'
  | 'buzzer'
  | 'resistor'
  | 'variableResistor'
  | 'potentiometer'
  | 'diode'
  | 'led'
  | 'thyristor'
  | 'capacitorSecondary'
  | 'inductor'
  | 'varistor'
  | 'ammeter'
  | 'voltmeter'
  | 'wattmeter'
  | 'energyMeter'
  | 'frequencyMeter'
  | 'powerFactorMeter'
  // 辅助标注
  | 'junction'
  | 'text'
  | 'ground'
  | 'cabinet'

export type WireKind = 'main' | 'control' | 'earth' | 'bus'

export interface Point {
  x: number
  y: number
}

export interface DiagramNode {
  id: string
  type: SymbolType
  x: number
  y: number
  width: number
  height: number
  rotation: Rotation
  label: string
  name: string
  props: Record<string, string>
  color?: string
  showLabel: boolean
  locked: boolean
}

export interface PortRef {
  nodeId: string
  portId: string
}

export interface DiagramEdge {
  id: string
  from: PortRef
  to: PortRef
  kind: WireKind
  label: string
  color?: string
  dashed?: boolean
  arrow?: boolean
}

export interface PaperSettings {
  size: 'A3' | 'A4'
  orientation: 'landscape' | 'portrait'
  width: number
  height: number
}

export interface CanvasSettings {
  gridSize: number
  snapToGrid: boolean
  showGrid: boolean
  showTitleBlock: boolean
  /** 全局显示设备的代号与名称；文字标注不受此开关影响。 */
  showLabels: boolean
}

export interface DrawingMeta {
  title: string
  drawingNo: string
  project: string
  voltageLevel: string
  designer: string
  checker: string
  date: string
  company: string
  scale: string
}

export interface DiagramDocument {
  schemaVersion: number
  paper: PaperSettings
  settings: CanvasSettings
  meta: DrawingMeta
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

export interface DiagramSummary {
  id: number
  name: string
  voltageLevel?: string
  description?: string
  nodeCount: number
  edgeCount: number
  thumbnail?: string
  createdAt: string
  updatedAt: string
}

export interface DiagramDetail extends Omit<DiagramSummary, 'nodeCount' | 'edgeCount'> {
  document: DiagramDocument
}

export interface DiagramStats {
  diagramCount: number
  nodeCount: number
  edgeCount: number
  updatedRecently: number
}

/** 后端 MyBatis-Plus IPage 的分页返回结构。 */
export interface PageVO<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}
