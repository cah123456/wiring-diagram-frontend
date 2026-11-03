import type { DiagramEdge, WireKind } from '../types/diagram'

export interface WireKindDef {
  kind: WireKind
  name: string
  shortName: string
  color: string
  width: number
  dash: string
  description: string
}

export const WIRE_KINDS: Record<WireKind, WireKindDef> = {
  main: {
    kind: 'main',
    name: '主回路',
    shortName: '主回路',
    color: '#26363e',
    width: 2.6,
    dash: '',
    description: '一次主接线、负荷电流回路',
  },
  control: {
    kind: 'control',
    name: '控制回路',
    shortName: '控制',
    color: '#2b6f8f',
    width: 2,
    dash: '',
    description: '二次控制、信号及测量回路',
  },
  earth: {
    kind: 'earth',
    name: '接地线',
    shortName: '接地',
    color: '#16825d',
    width: 2,
    dash: '7 4',
    description: '保护接地、工作接地',
  },
  bus: {
    kind: 'bus',
    name: '母线连接',
    shortName: '母线',
    color: '#1b2a31',
    width: 5,
    dash: '',
    description: '母线之间的等电位连接，粗实线',
  },
}

export const getEdgeStyle = (edge: DiagramEdge) => {
  const base = WIRE_KINDS[edge.kind] ?? WIRE_KINDS.main
  return {
    color: edge.color || base.color,
    width: base.width,
    dash: edge.dashed === undefined ? base.dash : edge.dashed ? '7 4' : '',
  }
}
